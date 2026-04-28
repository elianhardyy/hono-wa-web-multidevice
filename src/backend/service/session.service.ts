import { db as ormDb } from "../config/db.js";
import { waSessions } from "../config/schema.js";
import { and, eq } from "drizzle-orm";
import type { User } from "../utils/auth.js";

export const isSessionAllowedForUser = async (user: User, sessionId: string) => {
  if (user.role === "admin") return true;
  const result = await ormDb
    .select()
    .from(waSessions)
    .where(and(eq(waSessions.userId, user.id), eq(waSessions.sessionId, sessionId)))
    .limit(1);
  return result.length > 0;
};
