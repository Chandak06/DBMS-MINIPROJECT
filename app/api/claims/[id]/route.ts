import { NextResponse } from "next/server";
import { withUser,withPermission } from "@/lib/api-route";
import { listClaims,processClaim } from "@/lib/claim-service";
import { positiveId,AppError } from "@/lib/errors";
import { claimProcessSchema } from "@/lib/validations";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context) {
 return withUser(async user=>{
  const claims=await listClaims(user,"",positiveId((await params).id));
  if(!claims[0]) throw new AppError("Claim not found",404);
  return NextResponse.json({claim:claims[0]});
 });
}
export async function PATCH(request:Request,{params}:Context) {
 return withPermission("claims.process",async user=>{
  const parsed=claimProcessSchema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success) throw new AppError("Supply a decision and processing remarks");
  await processClaim(user,positiveId((await params).id),parsed.data.status,parsed.data.remarks);
  return NextResponse.json({ok:true});
 });
}
