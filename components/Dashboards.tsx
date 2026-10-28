import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { mysqlPool } from "@/lib/mysql";
import { formatDate } from "@/lib/dates";
import type { SessionUser } from "@/lib/types";
import { ActionButton } from "./ActionButton";
export async function StudentDashboard({user}:{user:SessionUser}) {
 const [[summary],[recent],[claims],[matches],[found]]=await Promise.all([
  mysqlPool.execute<RowDataPacket[]>("SELECT * FROM vw_user_lost_summary WHERE user_id=?",[user.userId]),
  mysqlPool.execute<RowDataPacket[]>("SELECT lost_id,item_name,status,lost_datetime FROM LOST_ITEM WHERE reported_by=? ORDER BY created_at DESC LIMIT 5",[user.userId]),
  mysqlPool.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM CLAIM WHERE submitted_by=? AND status='PENDING'",[user.userId]),
  mysqlPool.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id WHERE li.reported_by=? AND m.status='ACCEPTED' AND li.status='MATCHED'",[user.userId]),
  mysqlPool.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM FOUND_ITEM WHERE reported_by=?",[user.userId])
 ]);
 const s=summary[0]||{};
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">Your campus recovery desk</p><h1>Welcome, {s.full_name||"student"}</h1><p className="muted">Keep track of what you lost and help others recover their belongings.</p></div><div className="actions"><Link className="button" href="/lost-items/new">Report lost item</Link><Link className="button secondary" href="/found-items/new">Report found item</Link></div></div>
 <section className="grid grid-3">{[["Open reports",s.open_reports,"/lost-items?status=OPEN"],["Ready to claim",matches[0]?.n,"/matches?status=ACCEPTED"],["Closed reports",s.closed_reports,"/lost-items?status=CLOSED"],["Pending claims",claims[0]?.n,"/claims"],["Unread notifications",s.unread_notifications,"/notifications"],["Items you found",found[0]?.n,"/found-items?mine=1"]].map(([label,value,href])=><Link className="card metric" href={String(href)} key={String(label)}><span className="muted">{String(label)}</span><div className="stat">{Number(value||0)}</div><span className="small">View details â†’</span></Link>)}</section>
 <section className="card table-wrap"><h2>Recent lost reports</h2>{!recent.length?<p className="muted">No reports yet. Start by describing the item you lost.</p>:<table><thead><tr><th>Item</th><th>Lost at (IST)</th><th>Status</th></tr></thead><tbody>{recent.map(r=><tr key={r.lost_id}><td><Link href={"/lost-items/"+r.lost_id}>{r.item_name}</Link></td><td>{formatDate(r.lost_datetime)}</td><td><span className={"badge "+r.status.toLowerCase()}>{r.status}</span></td></tr>)}</tbody></table>}</section>
 <section className="card"><h2>How recovery works</h2><ol className="flow"><li>Report the item with identifying details.</li><li>Staff compare possible matches.</li><li>Submit proof of ownership for an accepted match.</li><li>Collect the verified item at the campus desk.</li></ol></section></main>;
}
export async function StaffDashboard({user}:{user:SessionUser}) {
 const campus=user.role==="ADMIN"?null:user.campusId??-1;
 const [[counts],[categories],[pendingMatches],[pendingClaims]]=await Promise.all([
  mysqlPool.execute<RowDataPacket[]>(`SELECT
  (SELECT COUNT(*) FROM LOST_ITEM i JOIN LOCATION l ON l.location_id=i.location_id WHERE i.status='OPEN' AND (? IS NULL OR l.campus_id=?)) lost_open,
  (SELECT COUNT(*) FROM FOUND_ITEM i JOIN LOCATION l ON l.location_id=i.location_id WHERE i.status='OPEN' AND (? IS NULL OR l.campus_id=?)) found_open,
  (SELECT COUNT(*) FROM \`MATCH\` m JOIN LOST_ITEM i ON i.lost_id=m.lost_id JOIN LOCATION l ON l.location_id=i.location_id WHERE m.status='PENDING' AND (? IS NULL OR l.campus_id=?)) matches_pending,
  (SELECT COUNT(*) FROM CLAIM c JOIN FOUND_ITEM i ON i.found_id=c.found_id JOIN LOCATION l ON l.location_id=i.location_id WHERE c.status='PENDING' AND (? IS NULL OR l.campus_id=?)) claims_pending,
  (SELECT COUNT(*) FROM CLAIM c JOIN FOUND_ITEM i ON i.found_id=c.found_id JOIN LOCATION l ON l.location_id=i.location_id WHERE c.status='APPROVED' AND (? IS NULL OR l.campus_id=?)) recovered`,Array(10).fill(campus)),
  mysqlPool.execute<RowDataPacket[]>("SELECT * FROM vw_campus_recovery_dashboard WHERE (? IS NULL OR campus_id=?) ORDER BY recovered_items DESC,category_name",[campus,campus]),
  mysqlPool.execute<RowDataPacket[]>("SELECT * FROM vw_ranked_match_candidates WHERE (? IS NULL OR campus_id=?) ORDER BY similarity_score DESC,match_id LIMIT 5",[campus,campus]),
  mysqlPool.execute<RowDataPacket[]>("SELECT cl.claim_id,fi.item_name FROM CLAIM cl JOIN FOUND_ITEM fi ON fi.found_id=cl.found_id JOIN LOCATION l ON l.location_id=fi.location_id WHERE cl.status='PENDING' AND (? IS NULL OR l.campus_id=?) ORDER BY cl.created_at LIMIT 5",[campus,campus])
 ]);
 const c=counts[0];
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">Campus recovery operations</p><h1>Staff dashboard</h1><p className="muted">Review ranked matches, verify claims, and keep the recovery desk moving.</p></div><div className="actions"><ActionButton endpoint="/api/matches/generate" label="Generate matches"/><Link className="button secondary" href="/reference-data">View campus data</Link></div></div>
 <section className="grid grid-3">{[["Open lost reports",c.lost_open,"/lost-items"],["Open found reports",c.found_open,"/found-items"],["Matches to review",c.matches_pending,"/matches?status=PENDING"],["Claims to verify",c.claims_pending,"/claims?status=PENDING"],["Items recovered",c.recovered,"/claims?status=APPROVED"]].map(([label,value,href])=><Link className="card metric" href={String(href)} key={String(label)}><span className="muted">{String(label)}</span><div className="stat">{Number(value||0)}</div></Link>)}</section>
 <div className="grid grid-2"><section className="card stack"><h2>Highest ranked candidates</h2>{!pendingMatches.length?<p className="muted">No candidates awaiting review.</p>:pendingMatches.map(m=><Link className="queue-row" href={"/matches/"+m.match_id} key={m.match_id}><div><strong>{m.lost_name}</strong><p className="small muted">Found: {m.found_name} · Candidate rank {m.candidate_rank}</p></div><span className="badge">{(Number(m.similarity_score)*100).toFixed(0)}%</span></Link>)}</section>
 <section className="card stack"><h2>Ownership claims</h2>{!pendingClaims.length?<p className="muted">No claims awaiting verification.</p>:pendingClaims.map(cl=><Link className="queue-row" href={"/claims/"+cl.claim_id} key={cl.claim_id}><strong>{cl.item_name}</strong><span className="badge">Claim #{cl.claim_id}</span></Link>)}</section></div>
 <section className="card table-wrap"><h2>Recovery by category</h2><table><thead><tr><th>Category</th><th>Lost reports</th><th>Found reports</th><th>Recovered</th></tr></thead><tbody>{categories.map(r=><tr key={r.campus_id+":"+r.category_id}><td>{r.campus_name} / {r.category_name}</td><td>{r.lost_reports}</td><td>{r.found_reports}</td><td>{r.recovered_items}</td></tr>)}</tbody></table></section>
</main>;
}
