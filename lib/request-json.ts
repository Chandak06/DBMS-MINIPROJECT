import { AppError } from "./errors";
export async function smallJson(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new AppError("JSON body required");
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw new AppError("Request body too large",413);}chunks.push(value);}}
 finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new AppError("Invalid JSON body");}
}
