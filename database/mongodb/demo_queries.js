// mongosh: run against the initialized project database.
// These domain queries only read records. Mongo CRUD uses a unique temporary
// collection so it cannot create orphan SQL-linked documents or alter reports.
db = db.getSiblingDB(process.env.MONGODB_DATABASE || "campus_lost_found");

// Member 1: document retrieval, text retrieval and multikey tag filter.
printjson(db.lost_item_details.find({}, { _id:0 }).limit(3).toArray());
printjson(db.lost_item_details.find({$text:{$search:"wallet leather"}},
 {_id:0,lost_id:1,tags:1,search_keywords:1}).toArray());
printjson(db.lost_item_details.find({tags:"leather"},{_id:0}).toArray());
printjson(db.audit_events.aggregate([
 {$match:{occurred_at:{$gte:new Date(Date.now()-30*24*60*60*1000)}}},
 {$group:{_id:"$event_type",event_count:{$sum:1},latest_event:{$max:"$occurred_at"}}},
 {$sort:{event_count:-1}}
]).toArray());

// Member 2: found details, evidence ranking, explainable rule scores.
printjson(db.found_item_details.find({tags:{$in:["wallet","headphones"]}},{_id:0}).toArray());
printjson(db.match_evidence.find({score:{$gte:0.8}},{_id:0}).sort({score:-1}).toArray());
printjson(db.match_evidence.aggregate([
 {$unwind:"$matched_tags"},{$group:{_id:"$matched_tags",occurrences:{$sum:1}}},
 {$sort:{occurrences:-1,_id:1}},{$limit:10}
]).toArray());
printjson(db.match_evidence.aggregate([
 {$group:{_id:null,candidates:{$sum:1},average_score:{$avg:"$score"},maximum_score:{$max:"$score"}}}
]).toArray());

// Isolated INSERT / UPDATE / FIND / DELETE demonstration.
const scratchName="demo_crud_"+new ObjectId().toHexString();
const scratch=db.getCollection(scratchName);
try {
 scratch.insertOne({label:"wallet",tags:["black"],state:"OPEN"});
 scratch.updateOne({label:"wallet"},{$set:{state:"CLOSED"},$addToSet:{tags:"leather"}});
 printjson(scratch.find({state:"CLOSED"},{_id:0}).toArray());
 printjson(scratch.deleteOne({label:"wallet"}));
} finally { scratch.drop(); }

