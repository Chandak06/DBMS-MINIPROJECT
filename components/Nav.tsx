"use client";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
export function Nav({role,email}:{role:string;email:string}) {
 const router=useRouter(),path=usePathname();
 async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.push("/login");router.refresh();}
 const links=[["Dashboard","/dashboard"],["Lost items","/lost-items"],["Found items","/found-items"],["Matches","/matches"],["Claims","/claims"],["Inbox","/notifications"],["Profile","/profile"]];
 return <nav className="nav"><div className="nav-inner"><Link className="nav-brand" href="/dashboard"><span className="brand-icon">↗</span> Campus Lost & Found</Link><div className="nav-links">{links.map(([label,url])=><Link key={url} className={"nav-link "+(path===url||path.startsWith(url+"/")?"active":"")} href={url}>{label}</Link>)}</div><div className="nav-account"><span className="small muted" title={email}>{email}</span><span className="badge">{role}</span><button className="button secondary small" onClick={logout}>Sign out</button></div></div></nav>;
}
