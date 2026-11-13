import {createInterface} from "node:readline/promises";
import {stdin,stdout} from "node:process";
async function hiddenPassword(label="Admin password (12-128 characters; hidden): "){
 if(!stdin.isTTY||typeof stdin.setRawMode!=="function")throw new Error("Hidden password entry requires a terminal");
 stdout.write(label);stdin.setRawMode(true);stdin.resume();
 return new Promise((resolve,reject)=>{
  let value="";
  const finish=(error)=>{stdin.off("data",read);stdin.setRawMode(false);stdin.pause();stdout.write("\n");if(error)reject(error);else resolve(value);};
  function read(chunk){for(const char of chunk.toString("utf8")){
   if(char==="\u0003"){finish(new Error("Cancelled"));return;}
   if(char==="\r"||char==="\n"){finish();return;}
   if(char==="\u007f"||char==="\b")value=Array.from(value).slice(0,-1).join("");
   else if(char>=" "&&Array.from(value).length<128)value+=char;
  }}
  stdin.on("data",read);
 });
}
export async function promptAdminInput(env){
 if(!stdin.isTTY||env.ADMIN_PASSWORD)return;
 const mode=env.NODE_ENV||"development";
 if(!["development","test"].includes(mode))throw new Error("Provisioning refused outside development/test");
 const rl=createInterface({input:stdin,output:stdout});
 try{
  stdout.write("Trusted local Admin setup. No existing password/account is reset.\n");
  env.ADMIN_PROVISION_CONFIRM=await rl.question(`Type ${mode} to authorize provisioning in your configured database: `);
  if(env.ADMIN_PROVISION_CONFIRM!==mode)throw new Error("Confirmation did not match");
  for(const [key,label,fallback]of [["ADMIN_CAMPUS_ID","Existing campus ID","1"],["COLLEGE_NAME","College/campus name",""],["COLLEGE_CODE","College code (2-12 letters)",""],["STUDENT_EMAIL_DOMAIN","Student domain (e.g. students.example.edu)",""],["STUDENT_LOCAL_FORMAT","Student ID format (e.g. S{digits:6}; {id} accepts your college's IDs)","{id}"],["STAFF_EMAIL_DOMAIN","Staff domain (e.g. staff.example.edu)",""],["STAFF_LOCAL_FORMAT","Staff ID format (e.g. EMP{digits:4})","{id}"],["ADMIN_EMAIL_DOMAIN","Admin domain (e.g. admin.example.edu)",""],["ADMIN_LOCAL_FORMAT","Admin ID format (e.g. admin or {id})","{id}"],["ADMIN_EMAIL","Administrator email on the registered Admin domain",""]]){
   const suggested=env[key]||fallback;
   const answer=(await rl.question(`${label}${suggested?` [${suggested}]`:""}: `)).trim()||suggested;
   if(!answer)throw new Error(`${label} is required`);env[key]=answer;
  }
 }finally{rl.close();}
 const password=await hiddenPassword();
 if(password!==await hiddenPassword("Confirm Admin password (hidden): "))throw new Error("Passwords did not match");
 env.ADMIN_PASSWORD=password;
}
