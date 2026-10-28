"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
export type CollegeEmailGuide={campus_id:number;campus_name:string;domain_name:string;local_part_format:string};
export function LoginForm({colleges=[]}:{colleges?:CollegeEmailGuide[]}){
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);
  try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.get("email"),password:form.get("password")})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Sign-in failed");router.push("/dashboard");router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Sign-in failed");}finally{setBusy(false);}
 }
 return <section className="card stack"><span className="brand-icon">↗</span><p className="eyebrow">Campus Lost &amp; Found</p><h1>Sign in with your college account</h1><p className="muted">Your Admin must register your college and its email format, then provision your account.</p><form className="stack" onSubmit={submit}><label>College email<input type="email" name="email" required maxLength={255} autoComplete="username" placeholder="Your registered college email"/></label><label>Password<input type="password" name="password" required maxLength={128} autoComplete="current-password"/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?"Signing in...":"Sign in"}</button></form>{colleges.length>0&&<details><summary>Registered college Student email formats</summary><ul>{colleges.map(c=><li key={c.campus_id}>{c.campus_name}: <code>{c.local_part_format}@{c.domain_name}</code></li>)}</ul><p className="small muted">Use your assigned ID in place of a format token. Staff and Admin use their separately registered domains.</p></details>}<p className="small muted">Forgot your password or need an account? Contact your college Admin. Admin accounts are created only on the trusted setup computer.</p></section>;
}
