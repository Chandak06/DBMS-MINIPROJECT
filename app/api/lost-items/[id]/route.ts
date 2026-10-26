import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { getReport,updateReport,deleteReport } from "@/lib/report-service";
import { positiveId } from "@/lib/errors";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context) { return withUser(async user=>NextResponse.json({item:await getReport("lost",positiveId((await params).id),user)})); }
export async function PATCH(request:Request,{params}:Context) { return withUser(async user=>NextResponse.json(await updateReport("lost",positiveId((await params).id),await request.json().catch(()=>({})),user))); }
export async function DELETE(_request:Request,{params}:Context) { return withUser(async user=>{await deleteReport("lost",positiveId((await params).id),user);return NextResponse.json({ok:true});}); }
