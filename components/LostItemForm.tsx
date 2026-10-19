import { ItemForm } from "./ItemForm";
export function LostItemForm({categories,locations,initial}:{
 categories:{category_id:number;category_name:string}[];locations:{location_id:number;location_name:string}[];
 initial?:Record<string,unknown>;
}) {
 return <ItemForm kind="lost" categories={categories.map(c=>({id:c.category_id,name:c.category_name}))} locations={locations.map(l=>({id:l.location_id,name:l.location_name}))} initial={initial}/>;
}
