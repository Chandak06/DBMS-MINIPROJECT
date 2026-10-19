import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listMatches } from "@/lib/match-service";
import { isStaffOrAdmin } from "@/lib/permissions";
import { ActionButton } from "@/components/ActionButton";
import { ManualMatchForm } from "@/components/ManualMatchForm";
export default async function Page({searchParams}:{searchParams:Promise<{status?:string}>}) {
 const user=await requireSession(),params=await searchParams,matches=await listMatches(user,params.status||""),staff=isStaffOrAdmin(user.role);
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">Intelligent matching</p><h1>{staff?"Match review":"My matches"}</h1><p className="muted">Candidates are ranked using item details and MongoDB tags. A staff decision confirms the match.</p></div>{staff&&<ActionButton endpoint="/api/matches/generate" label="Generate candidates"/>}</div>
 <form className="card actions"><label>Status<select name="status" defaultValue={params.status||""}><option value="">All</option><option>PENDING</option><option>ACCEPTED</option><option>REJECTED</option></select></label><button className="button">Filter</button></form>
 <section className="card table-wrap">{!matches.length?<p className="muted">No matching candidates yet.</p>:<table><thead><tr><th>Match</th><th>Lost item</th><th>Found item</th><th>Score</th><th>Status</th></tr></thead><tbody>{matches.map(m=><tr key={m.match_id}><td><Link href={"/matches/"+m.match_id}>#{m.match_id}</Link></td><td>{m.lost_name} <span className="small muted">#{m.lost_id}</span></td><td>{m.found_name} <span className="small muted">#{m.found_id}</span></td><td>{(Number(m.similarity_score)*100).toFixed(1)}%<div className="small muted">{m.match_method}</div></td><td><span className={"badge "+m.status.toLowerCase()}>{m.status}</span>{m.lost_revision!==m.current_lost_revision||m.found_revision!==m.current_found_revision?<div className="small error">Details changed</div>:null}</td></tr>)}</tbody></table>}</section>
 {staff&&<><h2>Pair reports manually</h2><p className="muted">Use report IDs to compare a pair below the automatic score threshold. Category, campus and date rules still apply.</p><ManualMatchForm/></>}
 </main>;
}
