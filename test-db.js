import { db } from "./src/backend/config/db.js";
import { aiChats } from "./src/backend/config/schema.js";
import { desc } from "drizzle-orm";

async function main() {
  const latest = await db.select().from(aiChats).orderBy(desc(aiChats.createdAt)).limit(1);
  console.log("DB Content:", JSON.stringify(latest[0].content));
  process.exit(0);
}
main();
