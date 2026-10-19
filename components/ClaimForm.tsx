"use client";
import { useState,FormEvent } from "react";
import { useRouter } from "next/navigation";
export function ClaimForm({foundId}:{foundId:number}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError("");const form=new FormData(e.currentTarget);
  try {
   const r=await fetch("/api/claims",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({foundId,claimDescription:form.get("claimDescription"),claimRemarks:form.get("claimRemarks")})});
   const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to submit claim");
   router.push("/claims/"+b.claimId);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to submit claim");}finally{setBusy(false);}
 }
 return <form className="card stack" onSubmit={submit}><label>Proof of ownership<textarea name="claimDescription" minLength={10} maxLength={3000} required placeholder="Describe a serial number, contents or distinguishing mark that staff can verify."/></label><label>Collection notes<textarea name="claimRemarks" maxLength={3000}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?"Submitting...":"Submit ownership claim"}</button></form>;
}
