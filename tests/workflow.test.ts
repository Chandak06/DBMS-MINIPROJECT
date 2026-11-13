import { it,expect } from "vitest";
import { requireTransition } from "@/lib/workflow";
import { lostItemUpdateSchema } from "@/lib/validations";
it("partial report updates never invent empty detail fields",()=>{
 expect(lostItemUpdateSchema.parse({status:"CLOSED"})).toEqual({status:"CLOSED"});
 expect(lostItemUpdateSchema.parse({tags:["wallet"]})).toEqual({tags:["wallet"]});
});
it("keeps match and claim terminal states immutable",()=>{
 for(const status of ["ACCEPTED","REJECTED"])expect(()=>requireTransition("match",status,"ACCEPTED")).toThrow();
 for(const status of ["APPROVED","REJECTED"])expect(()=>requireTransition("claim",status,"REJECTED")).toThrow();
 expect(()=>requireTransition("claim","PENDING","APPROVED")).not.toThrow();
 expect(()=>requireTransition("report","MATCHED","OPEN")).toThrow();
});
