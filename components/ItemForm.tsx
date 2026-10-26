"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
type Option={id:number;name:string};
type Details={tags?:string[];search_keywords?:string[];extra_attributes?:Record<string,unknown>;media?:{url:string;type:string;caption?:string}[]};
export function ItemForm({kind,categories,locations,initial={},details={}}:{
 kind:"lost"|"found";categories:Option[];locations:Option[];initial?:Record<string,unknown>;details?:Details;
}) {
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const id=Number(initial[kind+"_id"]),edit=Boolean(id);
 const text=(key:string)=>String(initial[key]??"");
 function localTime(s:string) {
  if(!s)return "";
  const d=new Date(s.replace(" ","T")+(/[zZ]|[+-]\d{2}:\d{2}$/.test(s)?"":"Z"));
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
 }
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError("");
  const form=new FormData(e.currentTarget);
  try {
   const enrichment={
    tags:String(form.get("tags")||"").split(",").map(t=>t.trim()).filter(Boolean),
    searchKeywords:String(form.get("searchKeywords")||"").split(",").map(t=>t.trim()).filter(Boolean),
    extraAttributes:JSON.parse(String(form.get("extraAttributes")||"{}")),
    media:String(form.get("media")||"").split("\n").map(t=>t.trim()).filter(Boolean).map(url=>({url,type:"image"}))
   };
   const payload={itemName:form.get("itemName"),description:form.get("description"),[kind+"Datetime"]:new Date(String(form.get("datetime"))).toISOString(),
    color:form.get("color"),brand:form.get("brand"),remarks:form.get("remarks"),categoryId:form.get("categoryId"),locationId:form.get("locationId"),...enrichment};
   const endpoint="/api/"+kind+"-items"+(edit?"/"+id:"");
   const r=await fetch(endpoint,{method:edit?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to save report");
   const savedId=edit?id:b[kind+"Id"];
   let synced=b.enrichmentSaved!==false;
   router.push("/"+kind+"-items/"+savedId+(synced?"":"?sync=pending"));router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save report");}finally{setBusy(false);}
 }
 return <form className="card stack" onSubmit={submit}><div className="form-grid">
 <label>Item name<input name="itemName" required minLength={2} maxLength={150} defaultValue={text("item_name")}/></label>
 <label>{kind==="lost"?"Lost":"Found"} date and time<input type="datetime-local" name="datetime" required defaultValue={localTime(text(kind+"_datetime"))}/></label>
 <label>Category<select name="categoryId" required defaultValue={text("category_id")}><option value="" disabled>Select a category</option>{categories.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
 <label>Location<select name="locationId" required defaultValue={text("location_id")}><option value="" disabled>Select a location</option>{locations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
 <label>Color<input name="color" maxLength={60} defaultValue={text("color")}/></label><label>Brand<input name="brand" maxLength={100} defaultValue={text("brand")}/></label>
 </div>
 <label>Description<textarea name="description" maxLength={3000} defaultValue={text("description")}/></label>
 <div className="form-grid"><label>Tags<input name="tags" placeholder="wallet, leather, black" defaultValue={(details.tags||[]).join(", ")}/></label><label>Search keywords<input name="searchKeywords" placeholder="zipper, card slot" defaultValue={(details.search_keywords||[]).join(", ")}/></label></div>
 <label>Extra item attributes as JSON<textarea name="extraAttributes" defaultValue={JSON.stringify(details.extra_attributes||{},null,2)} placeholder={'{"material":"leather"}'}/><span className="small muted">For example, material, serial number or identifying marks. Found item attributes stay private to the reporter and staff.</span></label>
 <label>Image links, one per line<textarea name="media" defaultValue={(details.media||[]).map(m=>m.url).join("\n")} placeholder="https://example.com/item-photo.jpg"/></label>
 <label>Private remarks<textarea name="remarks" maxLength={3000} defaultValue={text("remarks")}/></label>
 {error&&<p className="error" role="alert">{error}</p>}
 <div className="actions"><button className="button" disabled={busy}>{busy?"Saving...":edit?"Update report":"Report "+kind+" item"}</button><button type="button" className="button secondary" onClick={()=>router.back()}>Cancel</button></div></form>;
}
