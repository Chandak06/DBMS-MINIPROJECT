import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { listClaims } from "@/lib/claim-service";
import { isStaffOrAdmin } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { DecisionForm } from "@/components/DecisionForm";
export default async function Page({params}:{params:Promise<{id:string}>}) {
 const user=await requireSession(),id=Number((await params).id);if(!Number.isSafeInteger(id)||id<=0)notFound();
 const [c]=await listClaims(user,"",id);if(!c)notFound();
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">Claim #{id}</p><h1>{c.item_name}</h1><span className={"badge "+c.status.toLowerCase()}>{c.status}</span></div><Link className="button secondary" href="/claims">Back to claims</Link></div>
 <section className="card stack"><p><strong>Claimant:</strong> {c.claimant_name}</p><p><strong>Submitted:</strong> {formatDate(c.created_at)}</p><h2>Proof of ownership</h2><p className="preserve">{c.claim_description}</p>{c.claim_remarks&&<p className="preserve">{c.claim_remarks}</p>}<Link href={"/found-items/"+c.found_id}>View found report #{c.found_id}</Link>
 {c.processed_at&&<p><strong>Processed:</strong> {formatDate(c.processed_at)} by {c.processor_email}</p>}{c.processing_remarks&&<p className="preserve"><strong>Decision notes:</strong> {c.processing_remarks}</p>}</section>
 {c.status==="PENDING"&&isStaffOrAdmin(user.role)&&c.submitted_by!==user.userId&&<DecisionForm kind="claim" endpoint={"/api/claims/"+id}/>}
 {c.status==="APPROVED"&&<p className="notice">Ownership verified. Both reports are closed; follow the collection instructions in the decision notes.</p>}</main>;
}
