export function normalizeEmail(value:unknown):string;
export function normalizeDomain(value:unknown):string;
export function validInstitutionCode(value:unknown):boolean;
export function normalizeLocalFormat(value:unknown):string;
export function matchesLocalFormat(local:string,format?:string):boolean;
export function matchesCollegeEmail(email:string,role:string,code:string,domain:string,format?:string):boolean;
