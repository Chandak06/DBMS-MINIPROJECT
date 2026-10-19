import { describe,it,expect } from "vitest";
import { compareItems,RULE_WEIGHTS,type MatchItem } from "@/lib/matching";
const item:MatchItem={item_name:"Black leather wallet",description:"Leather wallet with zipper",color:"Black",brand:"Fossil",category_id:2,location_id:1,campus_id:1,datetime:"2026-09-29 10:00:00",tags:["wallet","leather"]};
const found={...item,datetime:"2026-09-29 11:00:00"};
describe("weighted matching",()=>{
 it("weights sum to one",()=>expect(Object.values(RULE_WEIGHTS).reduce((a,b)=>a+b,0)).toBeCloseTo(1));
 it("ranks a near identical item highly",()=>expect(compareItems(item,found).score).toBeGreaterThan(.99));
 it("rejects a different category",()=>expect(compareItems(item,{...found,category_id:1}).eligible).toBe(false));
 it("rejects a different campus",()=>expect(compareItems(item,{...found,campus_id:2}).score).toBe(0));
 it("rejects found-before-lost dates",()=>expect(compareItems(item,{...found,datetime:"2026-09-28 11:00:00"}).eligible).toBe(false));
 it("rejects reports beyond fourteen days",()=>expect(compareItems(item,{...found,datetime:"2026-10-20 11:00:00"}).eligible).toBe(false));
 it("treats missing brand/color as unknown",()=>{const r=compareItems({...item,color:null,brand:null},{...found,color:null,brand:null});expect(r.ruleScores.color).toBe(0);expect(r.ruleScores.brand).toBe(0);});
 it("uses MongoDB tag overlap",()=>expect(compareItems(item,found).matchedTags).toEqual(["wallet","leather"]));
 it("normalizes case punctuation and repeated words",()=>expect(compareItems(item,{...found,item_name:"BLACK, leather wallet wallet!",color:" black "}).ruleScores.name).toBe(1));
 it("handles malformed dates without NaN scores",()=>expect(compareItems(item,{...found,datetime:"invalid"}).score).toBe(0));
 it("does not inflate scores with repeated tags",()=>expect(compareItems({...item,tags:["wallet","wallet"]},{...found,tags:["wallet"]}).ruleScores.tags).toBe(1));
});
