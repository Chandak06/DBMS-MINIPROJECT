# Shared local MongoDB over ZeroTier

Run one MongoDB service on the same host as shared MySQL. Both applications connect directly to it; no MongoDB service or database copy is needed on the teammate laptop. The host must remain awake, with both services and ZeroTier running. College Wi-Fi can still block ZeroTier itself; this setup removes the requirement for direct Atlas connectivity, not all network restrictions.

## Move existing Atlas data safely

1. Stop both apps and continuous workers. With the original Atlas environment still active, run `npm run db:sync` and check that `pendingOutbox` is zero. Preserve the MySQL database and its outbox history.
2. Back up the existing environment, Atlas documents using BSON-preserving tools/Extended JSON, and the actual local `mongod.cfg`. Store these backups outside version control. Keep a trusted copy of administrator credentials privately.
3. Copy to a **fresh local MongoDB database**, retaining document `_id`s, BSON types, dates and audit events. Preserve the older local database rather than merging unrelated histories. Create the model's collection validators and indexes using `setupMongo` in `database/mongodb/model.mjs`; copying documents alone is insufficient.
4. Verify every copied document and all collection counts, validators and indexes. Check that Atlas did not change during copying. Leave Atlas intact for rollback. If copying fails, keep the apps stopped and investigate; do not reset the MySQL outbox or silently switch to incomplete local data.
5. Create local administrator and database-scoped application users. Verify authentication before exposing the private interface. Enable authorization, bind only to loopback and the host ZeroTier IP, and use the scoped firewall rule below.
6. Update only the two Mongo environment values on each laptop. Start a new process for the health command; compare both SQL and Mongo fingerprints. Restart the apps/worker only after verifying the destination.

The existing host migration uses MongoDB database `campus_lost_found_shared` to preserve its older local `campus_lost_found` database. A MongoDB database name can differ from the MySQL database name. Both laptops must use the exact same Mongo name and authSource. Private migration reports, BSON backups, configuration backups and generated credentials stay under ignored `artifacts/local/`; none belong in GitHub.

## Host service and accounts

Inspect the Windows service's actual executable/config path in Administrator PowerShell:

```powershell
Get-CimInstance Win32_Service -Filter "Name='MongoDB'" | Select-Object PathName
Get-Service MongoDB
```

Create a local-only administrator through a trusted local session, then an application user on the selected project database. Use a hidden password prompt, never a password command-line argument. The app needs `readWrite`; schema setup and full health inspection also use `dbAdmin`, limited to this database. Do not give the teammate the administrator account. Authentication restrictions can limit the administrator to loopback and the application account to the two intended devices' source addresses.

Back up the actual configuration before editing these sections (substitute the real host address):

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,<HOST_ZEROTIER_IPV4>
security:
  authorization: enabled
```

Keep the existing storage/log/service settings. Do not create duplicate YAML sections or use `bindIpAll`/wildcard bindings. Restart the MongoDB service and check its listeners. Confirm authenticated reads succeed and anonymous reads of an application collection fail; a successful unauthenticated `ping` alone does not test authorization. See MongoDB's [access control instructions](https://www.mongodb.com/docs/manual/tutorial/enable-authentication/) and [configuration reference](https://www.mongodb.com/docs/manual/reference/configuration-options/).

In Administrator PowerShell, use actual verified addresses and interface name:

```powershell
$mongoAdapter = '<EXACT_ZEROTIER_INTERFACE_ALIAS>'
New-NetFirewallRule -DisplayName 'Campus MongoDB - teammate only' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 27017 `
  -LocalAddress '<HOST_ZEROTIER_IPV4>' -RemoteAddress '<TEAMMATE_ZEROTIER_IPV4>' `
  -InterfaceAlias ([System.Management.Automation.WildcardPattern]::Escape($mongoAdapter)) `
  -Profile Any -ErrorAction Stop
Restart-Service MongoDB -ErrorAction Stop
Get-NetTCPConnection -State Listen -LocalPort 27017
```

The escape handles brackets in ZeroTier adapter names. Review existing broad allow rules: a narrower rule does not override them. Keep Windows Firewall enabled and do not forward 27017 on the router. Private ZeroTier traffic is encrypted; for another transport, configure verified TLS rather than disabling certificate verification.

## Both laptops' private environment

Replace the placeholders and percent-encode credentials. Keep each existing `.env.local`; do not overwrite MySQL settings or session secrets.

Host:

```dotenv
MONGODB_URI=mongodb://campus_app:ENCODED_PASSWORD@127.0.0.1:27017/campus_lost_found_shared?authSource=campus_lost_found_shared&directConnection=true
MONGODB_DATABASE=campus_lost_found_shared
```

Teammate: same values, changing only `127.0.0.1` to `<HOST_ZEROTIER_IPV4>`. Share only the application credentials through a private channel. Do not publish complete URIs, credentials or database backups in commits, screenshots or chat. Start new app processes after editing the environment.

On the teammate:

```powershell
Test-NetConnection -ComputerName '<HOST_ZEROTIER_IPV4>' -Port 27017
npm run db:health -- --team
```

Compare `mysqlFingerprint`, `mongoFingerprint`, database names and collection/record counts with the host's report. Matching counts alone do not establish database identity. While changes are paused and the queue drained, both reports should be `HEALTHY` with `pendingOutbox: 0` and no orphan documents. Test suites still use their separate audit MongoDB on port 27018; do not point them at the shared application database.

## Daily use and rollback

Host: keep MySQL80, MongoDB and ZeroTier running; keep **one** `npm run db:worker` alive. Both developers run their own `npm run dev`. The worker delivers SQL outbox events to MongoDB, including reports, explanations and audit changes. It is needed for both local MongoDB and Atlas. Refresh pages to see another user's changes.

If the worker stops, queued writes remain in MySQL. Restart it against the intended shared environment. Do not use direct database edits as a substitute for app writes; they may bypass the outbox.

Atlas is retained as a pre-cutover backup, not kept in parallel sync after cutover. To roll back after local writes have occurred, pause both apps/workers, reconcile/export those new local changes, and verify the Atlas destination before switching either environment back. Restoring the old URI alone would miss local-only writes because processed outbox events are not automatically replayed to a different server. Never blindly mark processed events pending or erase either database.
