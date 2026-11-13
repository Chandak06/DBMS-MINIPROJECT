import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/permissions";
import { StaffDashboard } from "@/components/Dashboards";
export default async function Page(){const user=await requireSession();if(!isStaffOrAdmin(user.role))notFound();return <StaffDashboard user={user}/>;}
