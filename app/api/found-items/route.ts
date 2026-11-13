import { NextRequest,NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { listReports,createReport } from "@/lib/report-service";
export async function GET(request:NextRequest) { return withUser(async user=>NextResponse.json({items:await listReports("found",user,request.nextUrl.searchParams)})); }
export async function POST(request:Request) { return withUser(async user=>NextResponse.json(await createReport("found",await request.json().catch(()=>({})),user),{status:201})); }
