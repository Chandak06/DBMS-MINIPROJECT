"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
export function ManualMatchForm() {
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);
  try {
   const r=await fetch("/api/matches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lostId:f.get("lostId"),foundId:f.get("foundId")})});
   const b=await r.json();if(!r.ok)throw new Error(b.error);if(!b.matchIds.length)throw new Error("Pair already has a decision. Reviewed matches are retained.");
   router.push("/matches/"+b.matchIds[0]);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to pair reports");}finally{setBusy(false);}
 }
 return <form className="card form-grid" onSubmit={submit}><label>Lost report ID<input name="lostId" type="number" min={1} required/></label><label>Found report ID<input name="foundId" type="number" min={1} required/></label><button className="button" disabled={busy}>Create manual candidate</button>{error&&<p className="error" role="alert">{error}</p>}</form>;
}
