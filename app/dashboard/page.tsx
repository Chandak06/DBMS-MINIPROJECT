import { requireSession } from "@/lib/auth";
import { StaffDashboard,StudentDashboard } from "@/components/Dashboards";
import { AdminDashboard } from "@/components/AdminDashboard";
export default async function Page(){const user=await requireSession();return user.role==="ADMIN"?<AdminDashboard/>:user.role==="STAFF"?<StaffDashboard user={user}/>:<StudentDashboard user={user}/>;}
