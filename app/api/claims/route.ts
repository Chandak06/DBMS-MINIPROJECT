import { NextRequest,NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { createClaim,listClaims } from "@/lib/claim-service";
export async function GET(request:NextRequest) {
 return withUser(async user=>NextResponse.json({claims:await listClaims(user,request.nextUrl.searchParams.get("status")||"")}));
}
export async function POST(request:Request) {
 return withUser(async user=>NextResponse.json({claimId:await createClaim(user,await request.json().catch(()=>({})))},{status:201}));
}
