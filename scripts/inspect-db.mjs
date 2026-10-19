import { createSqlConnection } from "./db-config.mjs";
const c=await createSqlConnection();
try {
 const [columns]=await c.query("SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,EXTRA FROM information_schema.columns WHERE table_schema=DATABASE() AND (COLUMN_KEY='PRI' OR COLUMN_NAME IN ('lost_id','found_id','user_id','match_id','claim_id')) ORDER BY TABLE_NAME,ORDINAL_POSITION");
 console.log(JSON.stringify(columns,null,2));
 const [tables]=await c.query("SHOW TABLES");
 for(const t of tables){const name=Object.values(t)[0];const [[count]]=await c.query("SELECT COUNT(*) AS n FROM \x60"+name+"\x60");console.log(name+": "+count.n);}
}finally{await c.end();}
