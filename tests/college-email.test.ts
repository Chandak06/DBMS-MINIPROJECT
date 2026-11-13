import {describe,it,expect} from "vitest";
import {matchesCollegeEmail,matchesLocalFormat,normalizeLocalFormat,normalizeEmail,normalizeDomain} from "@/lib/college-email.mjs";
import {adminProvisioningInput,collegeInput} from "@/lib/provisioning.mjs";
describe("registered-college identity rules",()=>{
 it("normalizes college email case",()=>expect(normalizeEmail(" S100001@students.example.edu ")).toBe("s100001@students.example.edu"));
 for(const [role,email,domain,format]of [["STUDENT","S100001@students.example.edu","students.example.edu","S{digits:6}"],["STAFF","first.last@faculty.other.edu","faculty.other.edu","{letters}.{letters}"],["ADMIN","principal@office.other.edu","office.other.edu","principal"]])it("recognizes the configured "+role+" format",()=>expect(matchesCollegeEmail(email,role,"COL",domain,format)).toBe(true));
 for(const email of ["s100001@gmail.com","s100001@students.example.edu.attacker.com","s100001@staff.example.edu","wrong@students.example.edu","s123@students.example.edu","s100001@sub.students.example.edu"])it("rejects a college email mismatch: "+email,()=>expect(matchesCollegeEmail(email,"STUDENT","COL","students.example.edu","S{digits:6}")).toBe(false));
 for(const [local,format]of [["2026-cs-01","{digits:4}-{letters:2}-{digits:2}"],["A001","{letters}{digits:3}"],["roll_24-17","{id}"],["alice.smith","{letters}.{letters}"],["numeric42","{alnum}"],["1","{digits}"]])it("supports institution-defined IDs "+local,()=>expect(matchesLocalFormat(local,format)).toBe(true));
 for(const local of [".leading","trailing.","double..dot","a@b","has space","x".repeat(65)])it("rejects malformed email ID "+local,()=>expect(matchesLocalFormat(local,"{id}")).toBe(false));
 for(const format of [".*","{digits:0}","{digits:65}","{unknown}","{letters:2,9}","{id}@example.edu",""])it("rejects unsafe/unsupported format "+format,()=>expect(()=>normalizeLocalFormat(format)).toThrow());
 it("does not require a hardcoded institution prefix",()=>expect(matchesCollegeEmail("24cs007@learners.another.edu","STUDENT","OTHER","learners.another.edu")).toBe(true));
 it("rejects invalid roles",()=>expect(matchesCollegeEmail("admin@admin.example.edu","OWNER","COL","admin.example.edu")).toBe(false));
 for(const value of ["*.example.edu","https://students.example.edu","@students.example.edu","localhost","students.example.edu/path","a..example.edu"])it("rejects domain shortcuts: "+value,()=>expect(()=>normalizeDomain(value)).toThrow());
 it("requires distinct role domains",()=>expect(()=>collegeInput({institutionCode:"COL",studentDomain:"students.example.edu",staffDomain:"students.example.edu",adminDomain:"admin.example.edu"})).toThrow());
 const env={NODE_ENV:"test",ADMIN_PROVISION_CONFIRM:"test",ADMIN_CAMPUS_ID:"1",COLLEGE_CODE:"COL",STUDENT_EMAIL_DOMAIN:"students.example.edu",STUDENT_LOCAL_FORMAT:"S{digits:6}",STAFF_EMAIL_DOMAIN:"staff.example.edu",ADMIN_EMAIL_DOMAIN:"admin.example.edu",ADMIN_EMAIL:"admin@admin.example.edu",ADMIN_PASSWORD:"Unit test password 123!"};
 it("validates trusted bootstrap input",()=>expect(adminProvisioningInput(env).campusId).toBe(1));
 for(const overrides of [{NODE_ENV:"production",ADMIN_PROVISION_CONFIRM:"production"},{ADMIN_PROVISION_CONFIRM:""},{ADMIN_EMAIL:"staff@staff.example.edu"},{ADMIN_PASSWORD:"short"},{ADMIN_CAMPUS_ID:"0"},{STUDENT_LOCAL_FORMAT:".*"}])it("refuses unsafe bootstrap input "+Object.keys(overrides).join(","),()=>expect(()=>adminProvisioningInput({...env,...overrides})).toThrow());
});
