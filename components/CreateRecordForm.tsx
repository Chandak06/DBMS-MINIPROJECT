"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
export type Field={name:string;label:string;type?:string;required?:boolean;options?:{value:string|number;label:string}[]};
export function CreateRecordForm({title,endpoint,fields}:{title:string;endpoint:string;fields:Field[]}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError("");setSuccess("");const form=e.currentTarget;
  try {
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
   const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to save");
   form.reset();setSuccess("Record created.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save");}finally{setBusy(false);}
 }
 return <form className="card stack" onSubmit={submit}><h2>{title}</h2><div className="form-grid">{fields.map(f=><label key={f.name}>{f.label}{f.options?<select name={f.name} required={f.required} defaultValue=""><option value="" disabled>Select</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input name={f.name} type={f.type||"text"} required={f.required} maxLength={f.type==="email"?255:120}/>}</label>)}</div>{error&&<p className="error" role="alert">{error}</p>}{success&&<p className="success" role="status">{success}</p>}<button className="button" disabled={busy}>{busy?"Saving...":"Create record"}</button></form>;
}
