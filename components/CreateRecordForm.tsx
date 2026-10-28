"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
export type Field={name:string;label:string;type?:string;required?:boolean;defaultValue?:string;options?:{value:string|number;label:string}[]};
export function CreateRecordForm({title,endpoint,fields,method="POST"}:{title:string;endpoint:string;fields:Field[];method?:"POST"|"PATCH"}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError("");setSuccess("");const form=e.currentTarget;
  try {
   const response=await fetch(endpoint,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
   const body=await response.json();if(!response.ok)throw new Error(body.error||"Unable to save");
   form.reset();setSuccess("Saved successfully.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save");}finally{setBusy(false);}
 }
 return <form className="card stack" onSubmit={submit}><h2>{title}</h2><div className="form-grid">{fields.map(f=><label key={f.name}>{f.label}{f.options?<select name={f.name} required={f.required} defaultValue=""><option value="" disabled>Select</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input name={f.name} type={f.type||"text"} required={f.required} defaultValue={f.defaultValue} minLength={f.type==="password"?12:undefined} autoComplete={f.type==="password"?"new-password":undefined} maxLength={f.type==="email"?255:f.type==="password"?128:190}/>}</label>)}</div>{error&&<p className="error" role="alert">{error}</p>}{success&&<p className="success" role="status">{success}</p>}<button className="button" disabled={busy}>{busy?"Saving...":method==="PATCH"?"Save policy":"Create record"}</button></form>;
}
