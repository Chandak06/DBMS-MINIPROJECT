import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/permissions";
import { mysqlPool } from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";
import { CreateRecordForm } from "@/components/CreateRecordForm";
export default async function Page() {
 const user=await requireSession();if(!isStaffOrAdmin(user.role))notFound();
 const [[campuses],[departments],[categories],[locations]]=await Promise.all([
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM CAMPUS ORDER BY campus_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM DEPARTMENT ORDER BY department_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM CATEGORY ORDER BY category_name"),
  mysqlPool.query<RowDataPacket[]>("SELECT * FROM LOCATION ORDER BY location_name")
 ]);
 const campusOptions=campuses.map(c=>({value:c.campus_id,label:c.campus_name})),departmentOptions=departments.map(d=>({value:d.department_id,label:d.department_name}));
 let users:RowDataPacket[]=[];if(user.role==="ADMIN"){[users]=await mysqlPool.query<RowDataPacket[]>("SELECT user_id,email,role FROM `USER` ORDER BY user_id LIMIT 500");}
 return <main className="container stack"><div><p className="eyebrow">Campus administration</p><h1>Reference data{user.role==="ADMIN"?" and users":""}</h1><p className="muted">Maintain the campus, department, category and location choices used in reports.</p></div>
 <div className="grid grid-2"><CreateRecordForm title="Add campus" endpoint="/api/campuses" fields={[{name:"campusName",label:"Campus name",required:true},{name:"street",label:"Street"},{name:"city",label:"City"},{name:"state",label:"State"},{name:"postalCode",label:"Postal code"}]}/>
 <CreateRecordForm title="Add department" endpoint="/api/departments" fields={[{name:"departmentName",label:"Department name",required:true},{name:"campusId",label:"Campus",options:campusOptions,required:true}]}/>
 <CreateRecordForm title="Add category" endpoint="/api/categories" fields={[{name:"categoryName",label:"Category name",required:true},{name:"description",label:"Description"}]}/>
 <CreateRecordForm title="Add location" endpoint="/api/locations" fields={[{name:"locationName",label:"Location name",required:true},{name:"campusId",label:"Campus",options:campusOptions,required:true},{name:"building",label:"Building"},{name:"floor",label:"Floor"},{name:"area",label:"Area"},{name:"type",label:"Location type"}]}/></div>
 <section className="card"><h2>Current campus data</h2><div className="grid grid-2">{[["Campuses",campuses.map(c=>c.campus_name)],["Departments",departments.map(d=>d.department_name)],["Categories",categories.map(c=>c.category_name)],["Locations",locations.map(l=>l.location_name)]].map(([title,items])=><div key={String(title)}><h3>{String(title)}</h3><p>{(items as string[]).join(", ")||"None yet"}</p></div>)}</div></section>
 {user.role==="ADMIN"&&<><CreateRecordForm title="Register a Google account" endpoint="/api/admin/users" fields={[{name:"firstName",label:"First name",required:true},{name:"lastName",label:"Last name",required:true},{name:"email",label:"Google email",type:"email",required:true},{name:"role",label:"Role",required:true,options:["STUDENT","STAFF","ADMIN"].map(r=>({value:r,label:r}))},{name:"departmentId",label:"Department",options:departmentOptions,required:true}]}/><section className="card table-wrap"><h2>Registered users</h2><table><thead><tr><th>ID</th><th>Email</th><th>Role</th></tr></thead><tbody>{users.map(u=><tr key={u.user_id}><td>{u.user_id}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody></table></section></>}
 </main>;
}
