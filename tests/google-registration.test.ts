import { beforeEach,it,expect,vi } from "vitest";
import { NextRequest } from "next/server";
const mocked=vi.hoisted(()=>({execute:vi.fn(),profile:vi.fn(),token:vi.fn(),audit:vi.fn(),enqueue:vi.fn()}));
vi.mock("@/lib/mysql",()=>({mysqlPool:{execute:mocked.execute}}));
vi.mock("@/lib/transaction",()=>({transaction:async(work:(c:unknown)=>Promise<unknown>)=>work({execute:mocked.execute})}));
vi.mock("@/lib/auth",()=>({SESSION_COOKIE:"clf_session",createSessionToken:mocked.token}));
vi.mock("@/lib/audit",()=>({tryWriteAuditEvent:mocked.audit,enqueueAuditEvent:mocked.enqueue}));
vi.mock("@/lib/google-oauth",()=>({GOOGLE_OAUTH_STATE_COOKIE:"state",exchangeGoogleCode:async()=>"mock-provider-token",fetchGoogleUser:mocked.profile}));
import { GET } from "@/app/api/auth/google/callback/route";
const request=()=>new NextRequest("http://localhost:3000/api/auth/google/callback?code=verified&state=ok&role=ADMIN",{headers:{Cookie:"state=ok"}});
beforeEach(()=>{vi.clearAllMocks();mocked.token.mockResolvedValue("signed-test-token");mocked.audit.mockResolvedValue(undefined);mocked.enqueue.mockResolvedValue(undefined);mocked.profile.mockResolvedValue({email:"new@campus.test",emailVerified:true,firstName:"New",lastName:"Student"});});
it("new verified users register as Student regardless of a URL role",async()=>{
 mocked.execute.mockImplementation(async(sql:string)=>sql.includes("SELECT user_id FROM")?[[{user_id:10}]]:[[{user_id:10,email:"new@campus.test",role:"STUDENT"}]]);
 mocked.execute.mockResolvedValueOnce([[]]);
 const response=await GET(request());expect(response.status).toBe(307);
 expect(mocked.execute).toHaveBeenCalledWith(expect.stringContaining("VALUES (?,?,?,'STUDENT')"),["New","Student","new@campus.test"]);
 expect(mocked.token).toHaveBeenCalledWith({userId:10,email:"new@campus.test",role:"STUDENT"});
});
it("existing Staff identity retains its SQL role",async()=>{
 mocked.execute.mockResolvedValue([[{user_id:2,email:"new@campus.test",role:"STAFF"}]]);
 await GET(request());expect(mocked.execute).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO"),expect.anything());expect(mocked.token).toHaveBeenCalledWith(expect.objectContaining({role:"STAFF"}));
});
it("unverified Google email cannot register or log in",async()=>{
 mocked.profile.mockResolvedValue({email:"new@campus.test",emailVerified:false});const response=await GET(request());expect(response.headers.get("location")).toContain("EMAIL_NOT_VERIFIED");expect(mocked.execute).not.toHaveBeenCalled();expect(mocked.token).not.toHaveBeenCalled();
});
