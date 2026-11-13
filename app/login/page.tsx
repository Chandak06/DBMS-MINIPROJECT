import {redirect} from "next/navigation";
import {getSession} from "@/lib/auth";
import {LoginForm,type CollegeEmailGuide} from "@/components/LoginForm";
import {mysqlPool} from "@/lib/mysql";
import type {RowDataPacket} from "mysql2";
export default async function Page(){
 if(await getSession())redirect("/dashboard");
 const [rows]=await mysqlPool.query<RowDataPacket[]>("SELECT c.campus_id,c.campus_name,e.domain_name,e.local_part_format FROM CAMPUS c JOIN COLLEGE_EMAIL_DOMAIN e ON e.campus_id=c.campus_id AND e.account_type='STUDENT' WHERE c.registration_enabled=TRUE ORDER BY c.campus_name LIMIT 500").catch(()=>[[]]);
 return <main className="auth-shell"><LoginForm colleges={rows as CollegeEmailGuide[]}/></main>;
}
