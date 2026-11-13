import { randomBytes,scrypt,timingSafeEqual } from "node:crypto";
const N=131072,r=8,p=1,keyLength=64;
let active=0;
export function validPassword(value){return typeof value==="string"&&value.length>=12&&value.length<=128&&!value.includes("\0")&&Buffer.byteLength(value,"utf8")<=512;}
async function derive(password,salt){
 if(active>=2)throw Object.assign(new Error("Authentication is busy. Retry shortly."),{code:"AUTH_BUSY"});
 active++;
 try{return await new Promise((resolve,reject)=>scrypt(password,salt,keyLength,{N,r,p,maxmem:256*1024*1024},(error,key)=>error?reject(error):resolve(key)));}
 finally{active--;}
}
export async function hashPassword(password){
 if(!validPassword(password))throw new Error("Use a password of 12–128 characters without NUL characters.");
 const salt=randomBytes(16).toString("hex"),key=await derive(password,salt);
 return `scrypt$${N}$${r}$${p}$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password,hash){
 if(typeof password!=="string"||password.length>128||Buffer.byteLength(password,"utf8")>512)return false;
 const parts=String(hash||"").split("$");
 if(parts.length!==6||parts[0]!=="scrypt"||parts[1]!==String(N)||parts[2]!==String(r)||parts[3]!==String(p)||!/^[a-f0-9]{32}$/.test(parts[4])||!/^[a-f0-9]{128}$/.test(parts[5]))return false;
 const key=await derive(password,parts[4]);return timingSafeEqual(key,Buffer.from(parts[5],"hex"));
}
export const DUMMY_HASH=`scrypt$${N}$${r}$${p}$${"0".repeat(32)}$${"0".repeat(128)}`;
