import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { getDetails,updateDetails } from "@/lib/report-service";
import { positiveId } from "@/lib/errors";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context) { return withUser(async user=>NextResponse.json({details:await getDetails("found",positiveId((await params).id),user)})); }
export async function PUT(request:Request,{params}:Context) { return withUser(async user=>NextResponse.json(await updateDetails("found",positiveId((await params).id),await request.json().catch(()=>({})),user))); }
export async function DELETE(_request:Request,{params}:Context) { return withUser(async user=>NextResponse.json(await updateDetails("found",positiveId((await params).id),{},user,true))); }
