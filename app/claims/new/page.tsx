import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getReport } from "@/lib/report-service";
import { mysqlPool } from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";
import { ClaimForm } from "@/components/ClaimForm";
import Link from "next/link";
export default async function Page({searchParams}:{searchParams:Promise<{foundId?:string}>}) {
 const user=await requireSession(),id=Number((await searchParams).foundId);if(!Number.isSafeInteger(id)||id<=0)notFound();
 const item=await getReport("found",id,user);
 const [matches]=await mysqlPool.execute<RowDataPacket[]>("SELECT 1 FROM `MATCH` m JOIN LOST_ITEM li ON li.lost_id=m.lost_id WHERE m.found_id=? AND m.status='ACCEPTED' AND li.reported_by=? AND li.status='MATCHED'",[id,user.userId]);
 if(!matches.length||item.status!=="MATCHED")return <main className="container card"><h1>Claim unavailable</h1><p>You need an accepted match for your own lost report before claiming this item.</p><Link className="button" href="/matches">View matches</Link></main>;
 const [claims]=await mysqlPool.execute<RowDataPacket[]>("SELECT claim_id FROM CLAIM WHERE found_id=? AND submitted_by=?",[id,user.userId]);
 return <main className="container stack"><h1>Claim {item.item_name}</h1><p className="muted">Describe information that only the owner would know. Staff will check it at the collection desk.</p>{claims[0]?<Link className="button" href={"/claims/"+claims[0].claim_id}>View your existing claim</Link>:<ClaimForm foundId={id}/>}</main>;
}
