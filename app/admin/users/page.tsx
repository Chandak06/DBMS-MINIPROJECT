import type { RowDataPacket } from "mysql2";
import { requirePagePermission } from "@/lib/page-permission";
import { mysqlPool } from "@/lib/mysql";
import { CreateRecordForm } from "@/components/CreateRecordForm";
import { RoleForm } from "@/components/RoleForm";
export default async function Page() {
 const actor=await requirePagePermission("users.manage");
 const [[users],[departments]]=await Promise.all([mysqlPool.query<RowDataPacket[]>("SELECT user_id,email,role FROM USER ORDER BY user_id LIMIT 500"),mysqlPool.query<RowDataPacket[]>("SELECT department_id,department_name FROM DEPARTMENT ORDER BY department_name")]);
 return <main className="container stack"><div><p className="eyebrow">Admin · Access management</p><h1>Users and roles</h1><p className="muted">New Google registrations always start as Student. Role assignments take effect on the next request. Your own role cannot be changed here.</p></div>
 <CreateRecordForm title="Register account" endpoint="/api/admin/users" fields={[{name:"firstName",label:"First name",required:true},{name:"lastName",label:"Last name",required:true},{name:"email",label:"Google email",type:"email",required:true},{name:"role",label:"Role",required:true,options:["STUDENT","STAFF","ADMIN"].map(r=>({value:r,label:r}))},{name:"departmentId",label:"Department",required:true,options:departments.map(d=>({value:d.department_id,label:d.department_name}))}]}/>
 <section className="card table-wrap"><table><thead><tr><th>ID</th><th>Email</th><th>Role</th></tr></thead><tbody>{users.map(u=><tr key={u.user_id}><td>{u.user_id}</td><td>{u.email}</td><td>{u.user_id===actor.userId?<span className="badge">ADMIN · your account</span>:<RoleForm id={u.user_id} role={u.role}/>}</td></tr>)}</tbody></table></section></main>;
}
