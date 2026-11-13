// Runtime implementation is a standalone Node CLI; exported helpers are tested directly.
export function safeHost(host:string):string;
export function mongoFingerprint(collections:{name:string;info?:{uuid?:unknown}}[],database:string):{value:string;basis:string}|undefined;
export function serverFingerprint(metadata:{uuid?:string;hostname?:string;serverId?:number;port?:number;version?:string},database:string):{value:string;basis:string};
export function policyProblems(campuses:{campus_id:number;institution_code:string;registration_enabled:number|boolean}[],domains:{campus_id:number;account_type:string;domain_name:string;local_part_format:string}[]):string[];
export function indexMatches(actual:{key:Record<string,number|string>;unique?:boolean;weights?:Record<string,number>;partialFilterExpression?:unknown}|undefined,keys:Record<string,number|string>,options:{unique?:boolean;partialFilterExpression?:unknown}):boolean;
export function teamSummary(result:{result:string;mysql:{fingerprint?:unknown;database:string;migrations?:unknown;records?:unknown;outbox?:{pending:number};[key:string]:unknown};mongo:{database:string;collections?:unknown;fingerprint?:unknown};[key:string]:unknown}):Record<string,unknown>;
export function checkSharedDatabases():Promise<Record<string,unknown>>;
