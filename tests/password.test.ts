import {it,expect} from "vitest";
import {hashPassword,verifyPassword,validPassword} from "@/lib/password.mjs";
it("stores salted hashes and verifies without storing a password",async()=>{
 const password="A sufficiently long college password 123!";
 const a=await hashPassword(password),b=await hashPassword(password);
 expect(a).not.toBe(b);expect(a).not.toContain(password);
 expect(await verifyPassword(password,a)).toBe(true);
 expect(await verifyPassword("An incorrect college password",a)).toBe(false);
 expect(await verifyPassword(password,"not-a-hash")).toBe(false);
});
it("does not trim passwords or accept short/NUL/oversized secrets",()=>{
 expect(validPassword("short")).toBe(false);expect(validPassword("a".repeat(129))).toBe(false);expect(validPassword("valid length\0password")).toBe(false);expect(validPassword("  a long password  ")).toBe(true);
});
