import { hashPassword,validPassword } from "./password.mjs";
import { normalizeEmail,normalizeDomain,normalizeLocalFormat,validInstitutionCode,matchesCollegeEmail } from "./college-email.mjs";
export function collegeInput(input){
 const institutionCode=String(input.institutionCode??"").trim().toUpperCase();
 if(!validInstitutionCode(institutionCode))throw new Error("Institution code must be 2–12 letters.");
 const domains={STUDENT:normalizeDomain(input.studentDomain),STAFF:normalizeDomain(input.staffDomain),ADMIN:normalizeDomain(input.adminDomain)};
 if(new Set(Object.values(domains)).size!==3)throw new Error("Student, Staff and Admin must use separate email domains.");
 const formats={STUDENT:normalizeLocalFormat(input.studentLocalFormat),STAFF:normalizeLocalFormat(input.staffLocalFormat),ADMIN:normalizeLocalFormat(input.adminLocalFormat)};
 return {institutionCode,domains,formats};
}
export async function registerCollege(connection,campusId,input){
 const {institutionCode,domains,formats}=collegeInput(input);
 const [[campus]]=await connection.execute("SELECT campus_id FROM CAMPUS WHERE campus_id=? FOR UPDATE",[campusId]);
 if(!campus)throw new Error("Campus not found");
 for(const [role,domain]of Object.entries(domains)){
  const [existing]=await connection.execute("SELECT domain_name FROM COLLEGE_EMAIL_DOMAIN WHERE campus_id=? AND account_type=?",[campusId,role]);
  if(existing.length)await connection.execute("UPDATE COLLEGE_EMAIL_DOMAIN SET domain_name=?,local_part_format=? WHERE campus_id=? AND account_type=?",[domain,formats[role],campusId,role]);
  else await connection.execute("INSERT INTO COLLEGE_EMAIL_DOMAIN(domain_name,campus_id,account_type,local_part_format) VALUES (?,?,?,?)",[domain,campusId,role,formats[role]]);
 }
 await connection.execute("UPDATE CAMPUS SET institution_code=?,registration_enabled=TRUE WHERE campus_id=?",[institutionCode,campusId]);
 await connection.execute("UPDATE USER u JOIN DEPARTMENT d ON d.department_id=u.department_id SET u.credential_version=u.credential_version+1 WHERE d.campus_id=?",[campusId]);
}
export async function provisionAccount(connection,input,{allowAdmin=false}={}){
 const email=normalizeEmail(input.email),role=input.role;
 if(!["STUDENT","STAFF",...(allowAdmin?["ADMIN"]:[])].includes(role))throw new Error("This account role cannot be provisioned here.");
 if(!validPassword(input.password))throw new Error("Password must have 12–128 characters.");
 if(!input.firstName?.trim()||input.firstName.length>80||!input.lastName?.trim()||input.lastName.length>80)throw new Error("Valid first and last names are required.");
 const [policies]=await connection.execute(`SELECT d.department_id,c.institution_code,c.registration_enabled,ed.domain_name,ed.local_part_format
  FROM DEPARTMENT d JOIN CAMPUS c ON c.campus_id=d.campus_id JOIN COLLEGE_EMAIL_DOMAIN ed ON ed.campus_id=c.campus_id AND ed.account_type=?
  WHERE d.department_id=?`,[role,input.departmentId]);
 const policy=policies[0];
 if(!policy?.registration_enabled||!matchesCollegeEmail(email,role,policy.institution_code,policy.domain_name,policy.local_part_format))throw new Error("Email must match the role format of the department's registered college.");
 const [existing]=await connection.execute("SELECT user_id,role,auth_enabled,password_hash FROM USER WHERE email=? FOR UPDATE",[email]);
 if(existing.length){
  if(allowAdmin&&role==="ADMIN"&&existing[0].role==="ADMIN"&&existing[0].auth_enabled&&existing[0].password_hash)return {status:"already-exists",userId:existing[0].user_id};
  throw new Error("Email already exists. No credentials or role were changed.");
 }
 const passwordHash=await hashPassword(input.password);
 const [r]=await connection.execute("INSERT INTO USER(first_name,last_name,email,role,department_id,password_hash,auth_enabled) VALUES (?,?,?,?,?,?,TRUE)",[input.firstName.trim(),input.lastName.trim(),email,role,input.departmentId,passwordHash]);
 return {status:"created",userId:r.insertId};
}
export function adminProvisioningInput(env){
 const mode=env.NODE_ENV||"development";
 if(!["development","test"].includes(mode)||env.ADMIN_PROVISION_CONFIRM!==mode)throw new Error("Run on a trusted development/test system with matching ADMIN_PROVISION_CONFIRM. Production provisioning is disabled.");
 const campusId=Number(env.ADMIN_CAMPUS_ID);
 if(!Number.isSafeInteger(campusId)||campusId<1)throw new Error("Set ADMIN_CAMPUS_ID to an existing campus.");
 const registration=collegeInput({institutionCode:env.COLLEGE_CODE,studentDomain:env.STUDENT_EMAIL_DOMAIN,staffDomain:env.STAFF_EMAIL_DOMAIN,adminDomain:env.ADMIN_EMAIL_DOMAIN,studentLocalFormat:env.STUDENT_LOCAL_FORMAT,staffLocalFormat:env.STAFF_LOCAL_FORMAT,adminLocalFormat:env.ADMIN_LOCAL_FORMAT});
 const email=normalizeEmail(env.ADMIN_EMAIL);
 if(!matchesCollegeEmail(email,"ADMIN",registration.institutionCode,registration.domains.ADMIN,registration.formats.ADMIN)||!validPassword(env.ADMIN_PASSWORD))throw new Error("Set a matching Admin college email and a 12–128 character password. Credentials were not printed.");
 const campusName=env.COLLEGE_NAME?.trim();if(campusName&&(campusName.length<2||campusName.length>120))throw new Error("College name must have 2–120 characters.");
 return {campusId,campusName,email,password:env.ADMIN_PASSWORD,firstName:(env.ADMIN_FIRST_NAME||"College").trim(),lastName:(env.ADMIN_LAST_NAME||"Administrator").trim(),registration};
}
