import { NextResponse } from "next/server";
import { loginAccount,finishLoginAudit } from "@/lib/auth-service";
import { createSessionToken,SESSION_COOKIE } from "@/lib/auth";
import { handleError } from "@/lib/errors";
import { smallJson } from "@/lib/request-json";
export async function POST(request:Request){
 try{
  const user=await loginAccount(await smallJson(request));const token=await createSessionToken(user);
  const response=NextResponse.json({user});
  response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,sameSite:"lax",secure:new URL(process.env.APP_BASE_URL||request.url).protocol==="https:",path:"/",maxAge:8*3600});
  await finishLoginAudit();return response;
 }catch(e){return handleError(e);}
}
