"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function DemoLogin() {
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function login(role:string) {
  setBusy(true);setError("");
  try {
   const r=await fetch("/api/auth/demo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role})});
   const b=await r.json();if(!r.ok)throw new Error(b.error||"Sign-in failed");
   router.push("/dashboard");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Sign-in failed");}finally{setBusy(false);}
 }
 return <div className="stack"><h2>Local demo</h2><p className="muted small">Explore each role using the seeded demo accounts.</p><div className="actions">{["STUDENT","STAFF","ADMIN"].map(role=><button className="button secondary" key={role} disabled={busy} onClick={()=>login(role)}>{role[0]+role.slice(1).toLowerCase()}</button>)}</div>{error&&<p className="error" role="alert">{error}</p>}</div>;
}
