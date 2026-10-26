"use client";
import { useState } from "react";
import { ActionButton } from "./ActionButton";
export function RoleForm({id,role}:{id:number;role:string}) {
 const [selected,setSelected]=useState(role);
 return <div className="actions"><select aria-label={"Role for user "+id} value={selected} onChange={e=>setSelected(e.target.value)}>{["STUDENT","STAFF","ADMIN"].map(r=><option key={r}>{r}</option>)}</select><ActionButton endpoint={"/api/admin/users/"+id} method="PATCH" body={{role:selected}} label="Save role"/></div>;
}
