import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getMatch } from "@/lib/match-service";
import { matchEvidence } from "@/lib/match-evidence";
import { RULE_WEIGHTS } from "@/lib/matching";
import { isStaffOrAdmin } from "@/lib/permissions";
import { DecisionForm } from "@/components/DecisionForm";
import { ActionButton } from "@/components/ActionButton";
import { formatDate } from "@/lib/dates";
export default async function Page({params}:{params:Promise<{id:string}>}) {
 const user=await requireSession(),id=Number((await params).id);if(!Number.isSafeInteger(id)||id<=0)notFound();
 let m;try{m=await getMatch(user,id);}catch{notFound();}
 const {evidence,mongoAvailable,syncState}=await matchEvidence(id);
 const stale=m.lost_revision!==m.current_lost_revision||m.found_revision!==m.current_found_revision;
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">Candidate #{id}</p><h1>Match comparison</h1><span className={"badge "+m.status.toLowerCase()}>{m.status}</span></div><Link className="button secondary" href="/matches">Back to matches</Link></div>
 {stale&&<p className="notice">Report details changed after this score was calculated. Regenerate this candidate before acceptance.</p>}
 {!mongoAvailable&&<p className="notice">MongoDB is unavailable. Saved comparison details are shown from the durable recovery snapshot where available.</p>}
 {syncState!=="SYNCED"&&<p className="notice">{syncState==="FAILED"?"The comparison document needs Admin synchronization attention.":"The comparison document is queued for synchronization."}</p>}
 <div className="grid grid-2"><section className="card"><h2>Lost item</h2><Link href={"/lost-items/"+m.lost_id}>{m.lost_name}</Link><p className="muted">Report #{m.lost_id} · {m.lost_status}</p></section><section className="card"><h2>Found item</h2><Link href={"/found-items/"+m.found_id}>{m.found_name}</Link><p className="muted">Report #{m.found_id} · {m.found_status}</p></section></div>
 <section className="card stack"><div className="stat">{(Number(m.similarity_score)*100).toFixed(1)}%</div><p className="muted">{evidence?.explanation||"No saved match explanation is currently available."}</p>
 {evidence?.rule_scores&&<div className="table-wrap"><table><thead><tr><th>Comparison</th><th>Similarity</th><th>Weight</th><th>Contribution</th></tr></thead><tbody>{Object.entries(RULE_WEIGHTS).map(([key,weight])=><tr key={key}><td>{key}</td><td>{(Number(evidence!.rule_scores[key]||0)*100).toFixed(0)}%</td><td>{(weight*100).toFixed(0)}%</td><td>{(Number(evidence!.rule_scores[key]||0)*weight*100).toFixed(1)}%</td></tr>)}</tbody></table></div>}
 <p><strong>Matched tags:</strong> {(evidence?.matched_tags||[]).join(", ")||"None"}</p><p className="small muted">Method {m.match_method} · generated {formatDate(m.matched_at)}</p>
 {m.review_remarks&&<p><strong>Review notes:</strong> {m.review_remarks}</p>}</section>
 {isStaffOrAdmin(user.role)&&m.status==="PENDING"&&<>{stale&&<ActionButton endpoint="/api/matches/generate" body={{lostId:m.lost_id}} label="Regenerate candidate"/>}<DecisionForm kind="match" endpoint={"/api/matches/"+id}/></>}
 {m.status==="ACCEPTED"&&m.owner_id===user.userId&&m.found_status==="MATCHED"&&<Link className="button" href={"/claims/new?foundId="+m.found_id}>Submit proof of ownership</Link>}</main>;
}
