import { readFile,writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
let source=await readFile(".env.local","utf8").catch(()=>readFile(".env.example","utf8"));
function setDefault(key,value,placeholders=[]) {
 const pattern=new RegExp("^"+key+"=(.*)$","m"),match=source.match(pattern);
 if(!match) source+="\n"+key+"="+value+"\n";
 else if(!match[1].trim()||placeholders.includes(match[1].trim())) source=source.replace(pattern,key+"="+value);
}
setDefault("SESSION_SECRET",randomBytes(48).toString("hex"),["replace_with_a_long_random_secret_value"]);
await writeFile(".env.local",source,"utf8");
console.log("Local defaults configured; database credentials preserved. Secrets were not printed.");

