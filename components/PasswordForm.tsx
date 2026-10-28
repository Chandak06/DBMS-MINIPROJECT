"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
export function PasswordForm(){
 const router=useRouter(),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);
 try{const r=await fetch("/api/users/me/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:f.get("currentPassword"),newPassword:f.get("newPassword")})});const d=await r.json();if(!r.ok)throw new Error(d.error);router.push("/login");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Password change failed");}finally{setBusy(false);}}
 return <form className="card stack" onSubmit={submit}><h2>Change password</h2><label>Current password<input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128}/></label><label>New password (12-128 characters)<input type="password" name="newPassword" autoComplete="new-password" minLength={12} maxLength={128} required/></label><p className="muted">Changing your password signs out your previous sessions.</p>{error&&<p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?"Updating...":"Change password"}</button></form>;
}
