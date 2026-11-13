import { afterEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

afterEach(()=>vi.unstubAllEnvs());
function check(url:string,origin?:string,extra:Record<string,string>={}) {
  const headers={host:new URL(url).host,...(origin?{origin}:{}),...extra};
  return middleware(new NextRequest(url,{method:"POST",headers}));
}
describe("mutation origin protection",()=>{
  for(const host of ["localhost","127.0.0.1","[::1]"]){
    for(const port of [3000,3001,3100]){
      it(`accepts the browser's same-origin loopback request at ${host}:${port}`,()=>{
        vi.stubEnv("APP_BASE_URL","http://localhost:3000");
        const origin=`http://${host}:${port}`;
        expect(check(origin+"/api/auth/login",origin).headers.get("x-middleware-next")).toBe("1");
      });
    }
  }
  it("keeps the configured origin allowed behind a proxy",()=>{
    vi.stubEnv("APP_BASE_URL","https://campus.example");
    expect(check("http://127.0.0.1:3000/api/claims","https://campus.example").headers.get("x-middleware-next")).toBe("1");
  });
  for(const origin of ["https://untrusted.example","http://localhost:4444","http://127.0.0.1:3002","http://localhost.attacker.example:3001","null","not-a-url"]){
    it("rejects unrelated or malformed origin "+origin,()=>{
      vi.stubEnv("APP_BASE_URL","http://localhost:3000");
      expect(check("http://127.0.0.1:3001/api/auth/login",origin).status).toBe(403);
    });
  }
  it("does not allow the local exception for a deployed configuration",()=>{
    vi.stubEnv("APP_BASE_URL","https://campus.example");
    expect(check("http://127.0.0.1:3001/api/auth/login","http://127.0.0.1:3001").status).toBe(403);
  });
  it("rejects a same-origin-looking request marked cross-site",()=>{
    vi.stubEnv("APP_BASE_URL","http://localhost:3000");
    expect(check("http://127.0.0.1:3001/api/auth/login","http://127.0.0.1:3001",{"sec-fetch-site":"cross-site"}).status).toBe(403);
  });
  it("does not trust forwarded-host to expand the allowlist",()=>{
    vi.stubEnv("APP_BASE_URL","http://localhost:3000");
    expect(check("http://untrusted.example/api/auth/login","http://127.0.0.1:3001",{"x-forwarded-host":"127.0.0.1:3001"}).status).toBe(403);
  });
  it("fails closed for invalid configuration",()=>{
    vi.stubEnv("APP_BASE_URL","invalid");
    expect(check("http://127.0.0.1:3001/api/auth/login","http://127.0.0.1:3001").status).toBe(403);
  });
  it("preserves headerless CLI access with authentication still enforced by routes",()=>{
    vi.stubEnv("APP_BASE_URL","http://localhost:3000");
    expect(check("http://127.0.0.1:3001/api/auth/me").headers.get("x-middleware-next")).toBe("1");
  });
});
