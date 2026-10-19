import { requireSession } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/permissions";
import { StaffDashboard,StudentDashboard } from "@/components/Dashboards";
export default async function Page(){const user=await requireSession();return isStaffOrAdmin(user.role)?<StaffDashboard user={user}/>:<StudentDashboard user={user}/>;}
