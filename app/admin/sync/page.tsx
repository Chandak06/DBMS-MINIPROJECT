import { requirePagePermission } from "@/lib/page-permission";
import { SyncPanel } from "@/components/SyncPanel";
export default async function Page() {await requirePagePermission("sync.manage");return <main className="container stack"><div><p className="eyebrow">Admin · Database health</p><h1>Synchronization management</h1><p className="muted">Pending payloads are retained in MySQL. Retries preserve document order and identifiers.</p></div><SyncPanel/></main>;}
