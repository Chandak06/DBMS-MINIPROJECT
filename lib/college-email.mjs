export function normalizeEmail(value){return String(value??"").trim().toLowerCase();}
export function normalizeDomain(value){
 const domain=String(value??"").trim().toLowerCase();
 if(domain.length>190||!domain.includes(".")||!/^[a-z]{2,63}$/.test(domain.split(".").at(-1))||!domain.split(".").every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))throw new Error("Use an exact college email domain without @, wildcards or a URL.");
 return domain;
}
export function validInstitutionCode(value){return typeof value==="string"&&/^[A-Z]{2,12}$/.test(value);}
function formatParts(value){
 const format=String(value??"{id}").trim();
 if(!format||format.length>120)throw new Error("Email ID format must have 1–120 characters.");
 const parts=[];let position=0;
 for(const match of format.matchAll(/\{(id|letters|digits|alnum)(?::([1-9][0-9]?))?\}|([a-z0-9._+-]+)/gi)){
  if(match.index!==position)throw new Error("Use literal letters/numbers and {id}, {letters}, {digits}, {alnum}, optionally with a count such as {digits:6}.");
  if(match[3])parts.push({literal:match[3].toLowerCase()});
  else{const count=match[2]?Number(match[2]):null;if(count>64)throw new Error("Email token counts cannot exceed 64.");parts.push({kind:match[1].toLowerCase(),count});}
  position=match.index+match[0].length;
 }
 if(position!==format.length)throw new Error("Invalid college email ID format.");
 return {format,parts};
}
export function normalizeLocalFormat(value){return formatParts(value).format;}
export function matchesLocalFormat(local,format="{id}"){
 // Bounded dynamic matching avoids executing administrator-supplied regexes.
 if(!/^[a-z0-9_+-](?:[a-z0-9._+-]{0,62}[a-z0-9_+-])?$/i.test(local)||local.includes(".."))return false;
 let parts;try{parts=formatParts(format).parts;}catch{return false;}
 let positions=new Set([0]);local=local.toLowerCase();
 for(const part of parts){
  const next=new Set();
  for(const start of positions){
   if(part.literal){if(local.startsWith(part.literal,start))next.add(start+part.literal.length);continue;}
   const allowed={id:/^[a-z0-9._+-]$/,letters:/^[a-z]$/,digits:/^[0-9]$/,alnum:/^[a-z0-9]$/}[part.kind];
   for(let end=start;end<local.length&&(part.count===null||end-start<part.count);end++){
    if(!allowed.test(local[end]))break;
    if(part.count===null||end-start+1===part.count)next.add(end+1);
   }
  }
  positions=next;if(!positions.size)return false;
 }
 return positions.has(local.length);
}
export function matchesCollegeEmail(email,role,code,domain,format="{id}"){
 const normalized=normalizeEmail(email),parts=normalized.split("@");
 if(parts.length!==2||!validInstitutionCode(code)||parts[1]!==String(domain).toLowerCase())return false;
 return ["STUDENT","STAFF","ADMIN"].includes(role)&&matchesLocalFormat(parts[0],format);
}
