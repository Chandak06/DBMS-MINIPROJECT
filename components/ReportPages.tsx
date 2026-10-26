import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getReport,getDetails,listReports,reportConfig,type Kind } from "@/lib/report-service";
import { mysqlPool } from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";
import { isStaffOrAdmin } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";
import { documentSyncState } from "@/lib/outbox";
import { AppError } from "@/lib/errors";
import { detailSnapshots } from "@/lib/detail-snapshots";
import { ItemForm } from "./ItemForm";
import { ActionButton } from "./ActionButton";
export type PageQuery=Record<string,string|string[]|undefined>;
async function referenceOptions() {
 const [[categories],[locations]]=await Promise.all([
  mysqlPool.query<RowDataPacket[]>("SELECT category_id,category_name FROM CATEGORY ORDER BY category_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT location_id,location_name FROM LOCATION ORDER BY location_name")
 ]);
 return {categories:categories.map(c=>({id:Number(c.category_id),name:String(c.category_name)})),locations:locations.map(l=>({id:Number(l.location_id),name:String(l.location_name)}))};
}
export async function ReportList({kind,searchParams}:{kind:Kind;searchParams:Promise<PageQuery>}) {
 const user=await requireSession(),query=await searchParams,params=new URLSearchParams();
 for(const [key,value] of Object.entries(query))if(typeof value==="string")params.set(key,value);
 const items=await listReports(kind,user,params),options=await referenceOptions(),c=reportConfig(kind);
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">Campus reports</p><h1>{kind==="lost"&&!isStaffOrAdmin(user.role)?"My lost reports":kind==="lost"?"Lost reports":"Found items"}</h1><p className="muted">{kind==="lost"?"Describe what you lost and follow its recovery.":"Browse found items or report something you found."}</p></div><Link className="button" href={"/"+kind+"-items/new"}>Report {kind} item</Link></div>
 <form className="card form-grid"><label>Search<input name="q" defaultValue={params.get("q")||""} placeholder="Name, description or brand"/></label>
 <label>Status<select name="status" defaultValue={params.get("status")||""}><option value="">All statuses</option><option>OPEN</option><option>MATCHED</option><option>CLOSED</option></select></label>
 <label>Category<select name="categoryId" defaultValue={params.get("categoryId")||""}><option value="">All categories</option>{options.categories.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
 <label>Location<select name="locationId" defaultValue={params.get("locationId")||""}><option value="">All locations</option>{options.locations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
 {kind==="found"&&<label>Reporter<select name="mine" defaultValue={params.get("mine")||""}><option value="">Everyone</option><option value="1">My reports</option></select></label>}
 <div className="actions"><button className="button">Apply filters</button><Link className="button secondary" href={"/"+kind+"-items"}>Clear</Link></div></form>
 <section className="card table-wrap">{!items.length?<p className="muted">No reports match these filters.</p>:<table><thead><tr><th>Item</th><th>Category</th><th>Location</th><th>{kind==="lost"?"Lost":"Found"} at (IST)</th><th>Status</th></tr></thead><tbody>{items.map(i=><tr key={i[c.id]}><td><Link href={"/"+kind+"-items/"+i[c.id]}><strong>{i.item_name}</strong></Link><p className="muted small">#{i[c.id]} · {[i.color,i.brand].filter(Boolean).join(" / ")}</p></td><td>{i.category_name}</td><td>{i.location_name}</td><td>{formatDate(i[c.date])}</td><td><span className={"badge "+i.status.toLowerCase()}>{i.status}</span></td></tr>)}</tbody></table>}</section><p className="muted small">Showing up to 500 reports. Narrow the filters to find older reports.</p></main>;
}
export async function ReportEditor({kind,id}:{kind:Kind;id?:number}) {
 const user=await requireSession(),options=await referenceOptions();
 let initial:Record<string,unknown>={},details={};
 if(id) {
  try {initial=await getReport(kind,id,user);}catch(e){if(e instanceof AppError&&e.status===404)notFound();throw e;}
  if(initial.reported_by!==user.userId||initial.status!=="OPEN")notFound();
  details=(await detailSnapshots(reportConfig(kind).collection,[id])).get(id)||{};
 }
 return <main className="container stack"><div><p className="eyebrow">{id?"Update your report":"Campus reports"}</p><h1>{id?"Edit":"Report"} {kind} item</h1></div><ItemForm kind={kind} {...options} initial={initial} details={details}/></main>;
}
export async function ReportDetail({kind,id,sync}:{kind:Kind;id:number;sync?:string}) {
 const user=await requireSession(),c=reportConfig(kind);
 let item:RowDataPacket;
 try {item=await getReport(kind,id,user);}catch{notFound();}
 let details:Record<string,unknown>|null=null,detailsUnavailable=false;
 try {details=await getDetails(kind,id,user);}catch{detailsUnavailable=true;}
 const owns=item.reported_by===user.userId;
 const syncState=await documentSyncState(c.collection,id);
 const [matches]=await mysqlPool.execute<RowDataPacket[]>("SELECT m.match_id,m.found_id,m.status,li.reported_by FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id WHERE m."+c.id+"=? AND (li.reported_by=? OR ?=1) ORDER BY m.similarity_score DESC",[id,user.userId,isStaffOrAdmin(user.role)?1:0]);
 const accepted=matches.find(m=>m.status==="ACCEPTED"&&m.reported_by===user.userId);
 let claimId:number|undefined;
 if(kind==="found"&&accepted) {const [claims]=await mysqlPool.execute<RowDataPacket[]>("SELECT claim_id FROM CLAIM WHERE found_id=? AND submitted_by=?",[id,user.userId]);claimId=claims[0]?.claim_id;}
 return <main className="container stack"><div className="page-header"><div><p className="eyebrow">{kind} report #{id}</p><h1>{item.item_name}</h1><span className={"badge "+item.status.toLowerCase()}>{item.status}</span></div><Link className="button secondary" href={"/"+kind+"-items"}>Back to reports</Link></div>
 {syncState!=="SYNCED"&&<p className="notice">The main report is saved. {syncState==="FAILED"?"Its document write requires Admin attention; the saved payload is retained.":"Its extra details are queued for synchronization and safe retry."}</p>}
 {detailsUnavailable&&<p className="notice">MongoDB details are currently unavailable. The relational report remains accessible.</p>}
 <section className="card stack"><div className="form-grid"><div><p className="muted">Category</p><strong>{item.category_name}</strong></div><div><p className="muted">Location</p><strong>{item.location_name}{item.building?", "+item.building:""}</strong></div><div><p className="muted">Date and time (IST)</p><strong>{formatDate(item[c.date])}</strong></div><div><p className="muted">Color and brand</p><strong>{[item.color,item.brand].filter(Boolean).join(" / ")||"Not specified"}</strong></div></div>
 <h2>Description</h2><p className="preserve">{item.description||"No description provided."}</p>
 {(owns||isStaffOrAdmin(user.role))&&item.remarks&&<div><h3>Private remarks</h3><p className="preserve">{item.remarks}</p></div>}
 <div className="actions">{(Array.isArray(details?.tags)?details.tags:[]).map((tag,index)=><span className="badge" key={index}>{String(tag)}</span>)}</div>
 {Array.isArray(details?.search_keywords)&&details.search_keywords.length>0&&<p><strong>Search keywords:</strong> {details.search_keywords.map(String).join(", ")}</p>}
 {(owns||isStaffOrAdmin(user.role))&&details?.extra_attributes&&<div><h3>Extra attributes</h3><pre>{JSON.stringify(details.extra_attributes,null,2)}</pre></div>}
 {Array.isArray(details?.media)&&details.media.length>0&&<div className="actions">{details.media.map((m,index)=>{const media=m as {url:string;caption?:string};return /^https?:\/\//.test(media.url)?<a key={index} className="button secondary" href={media.url} target="_blank" rel="noreferrer">{media.caption||"View image "+(index+1)}</a>:null;})}</div>}
 </section>
 {owns&&item.status==="OPEN"&&<section className="card"><h2>Manage report</h2><div className="actions"><Link className="button" href={"/"+kind+"-items/"+id+"/edit"}>Edit report</Link><ActionButton endpoint={"/api/"+kind+"-items/"+id} method="PATCH" body={{status:"CLOSED"}} label="Close report"/><ActionButton endpoint={"/api/"+kind+"-items/"+id} method="DELETE" label="Delete report" className="button danger" redirectTo={"/"+kind+"-items"}/></div></section>}
 {isStaffOrAdmin(user.role)&&kind==="lost"&&item.status==="OPEN"&&<ActionButton endpoint="/api/matches/generate" body={{lostId:id}} label="Find matching items"/>}
 {!!matches.length&&<section className="card stack"><h2>Related matches</h2>{matches.map(m=><Link key={m.match_id} href={"/matches/"+m.match_id}>Match #{m.match_id} <span className="badge">{m.status}</span></Link>)}</section>}
 {kind==="found"&&accepted&&(claimId?<Link className="button" href={"/claims/"+claimId}>View your claim</Link>:item.status==="MATCHED"&&<Link className="button" href={"/claims/new?foundId="+id}>Claim this item</Link>)}
 </main>;
}
