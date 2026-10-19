export function formatDate(value: unknown) {
 const raw=String(value??"");if(!raw)return "-";
 const date=new Date(raw.replace(" ","T")+(/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)?"":"Z"));
 if(Number.isNaN(date.getTime()))return raw;
 return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(date);
}
