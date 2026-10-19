import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-route";
import { generateMatches } from "@/lib/match-service";
import { matchGenerateSchema } from "@/lib/validations";
import { AppError } from "@/lib/errors";
export async function POST(request:Request) {
 return withUser(async user=>{
  const parsed=matchGenerateSchema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success) throw new AppError("Invalid matching request");
  return NextResponse.json(await generateMatches(user,parsed.data.lostId));
 });
}
