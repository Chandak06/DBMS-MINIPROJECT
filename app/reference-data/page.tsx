import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { isStaffOrAdmin,canManageReferenceData } from "@/lib/permissions";
import { mysqlPool } from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";
import { CreateRecordForm } from "@/components/CreateRecordForm";
const roles=["STUDENT","STAFF","ADMIN"] as const;
function emailFields(policies:RowDataPacket[]=[]) {
 return roles.flatMap(role=>{
  const policy=policies.find(p=>p.account_type===role),prefix=role.toLowerCase();
  return [{name:prefix+"Domain",label:role+" email domain",required:true,defaultValue:policy?.domain_name||""},{name:prefix+"LocalFormat",label:role+" email ID format",required:true,defaultValue:policy?.local_part_format||"{id}"}];
 });
}
export default async function Page() {
 const user=await requireSession();if(!isStaffOrAdmin(user.role))notFound();
 const [[campuses],[departments],[categories],[locations],[policies]]=await Promise.all([
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM CAMPUS ORDER BY campus_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM DEPARTMENT ORDER BY department_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM CATEGORY ORDER BY category_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM LOCATION ORDER BY location_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM COLLEGE_EMAIL_DOMAIN ORDER BY campus_id,account_type")
 ]);
 const campusOptions=campuses.map(c=>({value:c.campus_id,label:c.campus_name})),departmentOptions=departments.map(d=>({value:d.department_id,label:d.department_name}));
 return <main className="container stack"><div><p className="eyebrow">Campus administration</p><h1>Registered colleges and reference data</h1><p className="muted">{canManageReferenceData(user.role)?"Maintain the campus, department, category and location choices used in reports.":"Read-only campus information for daily operations. Ask an Admin to correct master data."}</p></div>
 <section className="card"><h2>College email policy</h2><p>Each college chooses three different domains and the email ID format before @. Use <code>{"{id}"}</code> for its assigned usernames, <code>{"{letters}"}</code>, <code>{"{digits}"}</code> or <code>{"{alnum}"}</code> for variable parts, and a count for fixed lengths. For example, <code>{"S{digits:6}@students.example.edu"}</code> or <code>{"{letters}.{letters}@staff.example.edu"}</code>. Literal prefixes are optional. Registering a format does not create any account.</p></section>
 {canManageReferenceData(user.role)&&<div className="grid grid-2"><CreateRecordForm title="Register college/campus" endpoint="/api/campuses" fields={[{name:"campusName",label:"College/campus name",required:true},{name:"institutionCode",label:"College code (2-12 letters)",required:true},...emailFields(),{name:"street",label:"Street"},{name:"city",label:"City"},{name:"state",label:"State"},{name:"postalCode",label:"Postal code"}]}/>
 <CreateRecordForm title="Add department" endpoint="/api/departments" fields={[{name:"departmentName",label:"Department name",required:true},{name:"campusId",label:"Campus",options:campusOptions,required:true}]}/>
 <CreateRecordForm title="Add category" endpoint="/api/categories" fields={[{name:"categoryName",label:"Category name",required:true},{name:"description",label:"Description"}]}/>
 <CreateRecordForm title="Add location" endpoint="/api/locations" fields={[{name:"locationName",label:"Location name",required:true},{name:"campusId",label:"Campus",options:campusOptions,required:true},{name:"building",label:"Building"},{name:"floor",label:"Floor"},{name:"area",label:"Area"},{name:"type",label:"Location type"}]}/></div>}
 <section className="card"><h2>Current campus data</h2><div className="grid grid-2">{[["Campuses",campuses.map(c=>c.campus_name)],["Departments",departments.map(d=>d.department_name)],["Categories",categories.map(c=>c.category_name)],["Locations",locations.map(l=>l.location_name)]].map(([title,items])=><div key={String(title)}><h3>{String(title)}</h3><p>{(items as string[]).join(", ")||"None yet"}</p></div>)}</div></section>

 {user.role==="ADMIN"&&campuses.map(c=><section className="card stack" key={c.campus_id}><h2>{c.campus_name} (#{c.campus_id})</h2><p>{c.registration_enabled?"Registered for college-email login":"Not registered: users cannot sign in"}</p><CreateRecordForm title="Register or update college email policy" endpoint={"/api/campuses/"+c.campus_id} method="PATCH" fields={[{name:"institutionCode",label:"College code",required:true,defaultValue:c.institution_code||""},...emailFields(policies.filter(p=>p.campus_id===c.campus_id))]}/></section>)}
 </main>;
}
