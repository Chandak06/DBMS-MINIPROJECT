# College email authentication and trusted Admin provisioning

Current design: 28 October 2026. Google OAuth and role-only demo sign-in are retired; their former endpoints return 410. There is no public account or Admin registration endpoint.

## Registration boundary

An Admin registers a campus/college code and three distinct exact email domains. COLLEGE_EMAIL_DOMAIN links each domain to CAMPUS and one account type. The domain primary key prevents another college claiming an already registered domain; UNIQUE(campus_id,account_type) permits one domain per role per college. Accounts use their existing DEPARTMENT -> CAMPUS relationship; no redundant campus_id is stored in USER.

There is no fixed institutional prefix or SRN convention. The Admin specifies each role's exact domain and email ID template (the part before @). For example, College A may use `S{digits:6}@students.example.edu`, `EMP{digits:4}@staff.example.edu` and `admin@admin.example.edu`; College B may choose `{digits:4}-{letters:2}-{digits:2}@learners.other.edu`, `{letters}.{letters}@faculty.other.edu` and `principal@office.other.edu`. College code is reference metadata and does not force a username prefix.

Templates accept literal letters/numbers/dot/underscore/plus/hyphen and `{id}`, `{letters}`, `{digits}`, `{alnum}` tokens. `{digits:6}` means exactly six digits; an uncounted token means one or more matching characters. `{id}` accepts the college's assigned ASCII usernames. Local IDs are bounded to 64 characters with no leading/trailing or repeated dots. Templates use bounded dynamic matching; administrator-supplied regular expressions are never executed. The policy defaults to `{id}` for compatibility, with the exact role domain still mandatory. The Admin form and CLI explicitly show the format. The public login page lists enabled colleges' Student formats, without listing account identities.

Matching is case-insensitive. A suffix attack or unregistered subdomain cannot match the registered role domain.

An Admin provisions Students/Staff through the account page; the email must match its account category and registered department's college. An email format is not proof of ownership, so public self-provisioning is not allowed. An actual college mailbox must be assigned/confirmed by college administration; the application does not create it or claim to verify it through email delivery.

## Trusted first-Admin script

`npm run seed:admin` runs the native Node script scripts/provision-admin.mjs. On the trusted laptop it prompts for the existing campus, college/domain policy, Admin email and a hidden password. Input stays in the local process. Passwords are never command-line arguments, Git content or log output. Interactive use asks for matching development/test confirmation. Noninteractive use must set NODE_ENV and matching ADMIN_PROVISION_CONFIRM explicitly. It refuses production before connecting.

The configured MySQL database is authoritative. The script registers an unregistered campus, uses an existing department (or creates an administration department if none exists), optionally names the previously unregistered placeholder campus, and inserts an Admin and durable audit event in one SQL transaction. Repeats preserve an already provisioned Admin, including its password. Existing non-Admin/disabled/passwordless accounts are not silently promoted/reactivated/reset. A conflicting registered domain policy is not overwritten. SQL unique email/domain keys and transactions protect against duplicates.

Existing legacy Google/demo rows, reports and relationships remain intact. Their password_hash is initially NULL and auth_enabled is false. They cannot sign in, and old cookies lack the required credential version. Provision new correctly formatted college accounts rather than deleting historical rows or silently migrating their identities.

## Passwords and sessions

Passwords have 12–128 characters and are not trimmed. Native Node scrypt uses N=131072, r=8, p=1, a random 16-byte salt and a 64-byte key. The encoded hash includes the parameters; verification uses timingSafeEqual. At most two expensive derivations run per process. Login bodies are limited to 16 KiB and role fields are rejected. Password hashes never leave the server or enter audit payloads.

Five failed attempts lock a known account for 15 minutes in MySQL. Unknown accounts use a dummy derivation. Login checks the enabled account, registered college, role-specific email policy and password. Successful login issues an HttpOnly, SameSite=Lax, eight-hour HS256 cookie; Secure is set for HTTPS installations. SESSION_SECRET stays private.

Each protected request refreshes identity, role, enabled status, college registration and credential_version from SQL. Role claims in a cookie cannot elevate access. Password changes, Admin password reset, account disablement and college domain/ID-format changes revoke previous versions. Even a correct password is refused if its email no longer matches the college's active format. Staff records are scoped to the signed-in college. API guards run before report/claim mutations; Admin can supervise across colleges.

## Role boundaries

Students alone submit/manage reports and ownership claims. Staff review college reports, generate/review matches, verify claims and record returns. Admin manages college/domain registration, Student/Staff account access, master data, audit and synchronization. Admin has no report submission controls.

POST /api/admin/users accepts only STUDENT/STAFF; PATCH /api/admin/users/:id accepts only enabled/disabled state. Neither accepts an Admin role assignment. Admin accounts cannot be enabled/disabled/reset through those web endpoints. Staff/Student email categories are not changed by a role selector; provision a distinct appropriately formatted account instead.

## Recovery and limits

Users can change their own password from Profile. Admin can reset Student/Staff credentials without learning their previous password. A forgotten Admin password requires a separate trusted recovery decision; the bootstrap command deliberately does not reset it. Registering a college does not configure or certify its mail server. Serve externally only with HTTPS, restricted DB credentials and authorized college administrators.

Sources: [Node scrypt API](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Hashing, authorization and bootstrap behavior are exercised by unit/integration tests; this is not external college-directory verification.
