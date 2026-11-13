import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { mysqlPool } from "@/lib/mysql";
export async function AdminDashboard() {
 const [[c]]=await mysqlPool.query<RowDataPacket[]>(`SELECT
 (SELECT COUNT(*) FROM USER) users,(SELECT COUNT(*) FROM USER WHERE role='STAFF') staff,
 (SELECT COUNT(*) FROM CLAIM WHERE status='APPROVED') recovered,
 (SELECT COUNT(*) FROM MONGO_OUTBOX WHERE processed_at IS NULL) pending,
 (SELECT COUNT(*) FROM MONGO_OUTBOX WHERE processed_at IS NULL AND failure_kind IN ('PERMANENT','EXHAUSTED')) failed`);
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">System administration</p><h1>Admin dashboard</h1><p className="muted">Manage access, campus data, synchronization and audit records.</p></div><Link className="button secondary" href="/staff">Supervise operations</Link></div>
 <section className="grid grid-3">{[["Registered users",c.users,"/admin/users"],["Staff accounts",c.staff,"/admin/users"],["Recoveries",c.recovered,"/claims?status=APPROVED"],["Pending document writes",c.pending,"/admin/sync"],["Failed document writes",c.failed,"/admin/sync"]].map(([label,value,href])=><Link className="card metric" key={String(label)} href={String(href)}><span className="muted">{String(label)}</span><div className="stat">{Number(value)}</div></Link>)}</section>
 <section className="grid grid-2">{[["College accounts","Provision college accounts and enable or disable access.","/admin/users"],["Campus master data","Maintain campuses, departments, categories and locations.","/reference-data"],["Database synchronization","Inspect retryable and permanent failures and request safe retries.","/admin/sync"],["Audit records","Inspect administrative and operational events.","/admin/audit"]].map(([title,text,href])=><Link className="card stack" href={href} key={href}><h2>{title}</h2><p className="muted">{text}</p></Link>)}</section></main>;
}
