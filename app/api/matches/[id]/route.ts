import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { getMatch,reviewMatch } from "@/lib/match-service";
import { getMongoDb } from "@/lib/mongo";
import { positiveId,AppError } from "@/lib/errors";
import { matchReviewSchema } from "@/lib/validations";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context) {
 return withUser(async user=>{
  const id=positiveId((await params).id),match=await getMatch(user,id);
  const db=await getMongoDb(),evidence=await db.collection("match_evidence").findOne({match_id:id},{projection:{_id:0}});
  return NextResponse.json({match,evidence});
 });
}
export async function PATCH(request:Request,{params}:Context) {
 return withUser(async user=>{
  const parsed=matchReviewSchema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success) throw new AppError("Supply a decision and review remarks");
  await reviewMatch(user,positiveId((await params).id),parsed.data.status,parsed.data.remarks);
  return NextResponse.json({ok:true});
 });
}
