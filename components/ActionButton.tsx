"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ActionButton({endpoint,label,method="POST",body={},className="button",redirectTo}:{
 endpoint:string;label:string;method?:string;body?:Record<string,unknown>;className?:string;redirectTo?:string;
}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function run() {
  setBusy(true);setError("");setMessage("");
  try {
   const response=await fetch(endpoint,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Request failed");
   setMessage(result.matchIds ? result.matchIds.length+" candidates saved from "+result.candidateCount+" comparisons." : "Done.");
   if(redirectTo)router.push(redirectTo);
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}
 }
 return <div className="stack"><button type="button" className={className} onClick={run} disabled={busy}>{busy?"Working...":label}</button>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}</div>;
}
