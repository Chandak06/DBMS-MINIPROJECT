import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listClaims } from "@/lib/claim-service";
import { isStaffOrAdmin } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
export default async function Page({searchParams}:{searchParams:Promise<{status?:string}>}) {
 const user=await requireSession(),params=await searchParams,claims=await listClaims(user,params.status||"");
 return <main className="container stack"><div><p className="eyebrow">Ownership verification</p><h1>{isStaffOrAdmin(user.role)?"Claim review":"My claims"}</h1><p className="muted">Submit a claim from an accepted match. Staff verify evidence before returning an item.</p></div>
 <form className="card actions"><label>Status<select name="status" defaultValue={params.status||""}><option value="">All</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select></label><button className="button">Filter</button></form>
 <section className="card table-wrap">{!claims.length?<p className="muted">No claims yet. Check your matches to start a recovery.</p>:<table><thead><tr><th>Claim</th><th>Item</th><th>Claimant</th><th>Submitted (IST)</th><th>Status</th></tr></thead><tbody>{claims.map(c=><tr key={c.claim_id}><td><Link href={"/claims/"+c.claim_id}>#{c.claim_id}</Link></td><td>{c.item_name}</td><td>{c.claimant_name}</td><td>{formatDate(c.created_at)}</td><td><span className={"badge "+c.status.toLowerCase()}>{c.status}</span></td></tr>)}</tbody></table>}</section></main>;
}
