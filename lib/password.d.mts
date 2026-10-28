export function validPassword(value:unknown):boolean;
export function hashPassword(password:string):Promise<string>;
export function verifyPassword(password:string,hash:string|null):Promise<boolean>;
export const DUMMY_HASH:string;
