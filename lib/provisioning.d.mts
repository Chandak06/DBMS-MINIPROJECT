import type {PoolConnection,Connection} from "mysql2/promise";
type Sql=PoolConnection|Connection;
export interface CollegeRegistration {institutionCode:string;studentDomain:string;staffDomain:string;adminDomain:string;studentLocalFormat?:string;staffLocalFormat?:string;adminLocalFormat?:string}
interface Policy {institutionCode:string;domains:Record<"STUDENT"|"STAFF"|"ADMIN",string>;formats:Record<"STUDENT"|"STAFF"|"ADMIN",string>}
export function collegeInput(input:CollegeRegistration):Policy;
export function registerCollege(connection:Sql,campusId:number,input:CollegeRegistration):Promise<void>;
export function provisionAccount(connection:Sql,input:{email:string;role:string;password:string;firstName:string;lastName:string;departmentId:number},options?:{allowAdmin?:boolean}):Promise<{status:string;userId:number}>;
export function adminProvisioningInput(env:Record<string,string|undefined>):{campusId:number;campusName?:string;email:string;password:string;firstName:string;lastName:string;registration:Policy};
