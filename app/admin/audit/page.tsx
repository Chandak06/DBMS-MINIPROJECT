import { requirePagePermission } from "@/lib/page-permission";
import { getMongoDb } from "@/lib/mongo";
import { formatDate } from "@/lib/dates";
export default async function Page(){
 await requirePagePermission("audit.read");
 let events;
 try{events=await (await getMongoDb()).collection("audit_events").find({}).sort({occurred_at:-1,_id:-1}).limit(100).toArray();}
 catch{return <main className="container card"><h1>Audit records</h1><p className="error">MongoDB is unavailable. Committed audit events remain in the synchronization queue for replay.</p></main>;}
 return <main className="container stack"><div><p className="eyebrow">Admin · Security and activity</p><h1>Audit records</h1><p className="muted">Most recent 100 events. Staff cannot access this page.</p></div><section className="card table-wrap">{events.length?<table><thead><tr><th>Time (IST)</th><th>Actor</th><th>Event</th><th>Entity</th></tr></thead><tbody>{events.map(e=><tr key={String(e._id)}><td>{formatDate(e.occurred_at instanceof Date?e.occurred_at.toISOString():e.occurred_at)}</td><td>#{e.user_id}</td><td>{e.event_type}</td><td>{e.entity_type} #{e.entity_id}</td></tr>)}</tbody></table>:<p>No audit events yet.</p>}</section></main>;
}
