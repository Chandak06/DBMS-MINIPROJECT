import { NextRequest,NextResponse } from "next/server";
import { withUser,withPermission } from "@/lib/api-route";
import { generateMatches,listMatches } from "@/lib/match-service";
import { matchCreateSchema } from "@/lib/validations";
import { AppError } from "@/lib/errors";
export async function GET(request:NextRequest) {
 return withUser(async user=>NextResponse.json({matches:await listMatches(user,request.nextUrl.searchParams.get("status")||"")}));
}
export async function POST(request:Request) {
 return withPermission("matches.manage",async user=>{
  const parsed=matchCreateSchema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success) throw new AppError("Supply valid lostId and foundId");
  return NextResponse.json(await generateMatches(user,parsed.data.lostId,parsed.data.foundId),{status:201});
 });
}
