"use client";
import { useState,FormEvent } from "react";
import { useRouter } from "next/navigation";
export function DecisionForm({endpoint,kind}:{endpoint:string;kind:"match"|"claim"}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError("");
  const form=new FormData(e.currentTarget);
  try {
   const response=await fetch(endpoint,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:form.get("status"),remarks:form.get("remarks")})});
   const body=await response.json();if(!response.ok)throw new Error(body.error||"Decision failed");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Decision failed");}finally{setBusy(false);}
 }
 return <form className="card stack" onSubmit={submit}><h2>{kind==="match"?"Review this candidate":"Verify ownership"}</h2>
 <p className="muted">{kind==="match"?"Check the item details before accepting this match.":"Verify the claimant's evidence before arranging the handover."}</p>
 <label>Decision<select name="status"><option value={kind==="match"?"ACCEPTED":"APPROVED"}>{kind==="match"?"Accept match":"Approve claim and close reports"}</option><option value="REJECTED">Reject</option></select></label>
 <label>Verification notes<textarea name="remarks" required minLength={3} maxLength={3000}/></label>
 {error&&<p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?"Saving...":"Save decision"}</button></form>;
}
