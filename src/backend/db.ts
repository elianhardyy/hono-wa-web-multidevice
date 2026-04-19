import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { appSettings, authSessions, users, waSessions } from "./schema.js";

const pool = new Pool({
  connectionString: "postgres://postgres:postgres@localhost:5432/honowa",
});

export const db = drizzle(pool);
export const appSchema = { appSettings, users, authSessions, waSessions };

export const getSetting = async (key: string): Promise<string | null> => {
  const result = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key));
  return result[0]?.value ?? null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key));

  if (existing.length > 0) {
    await db
      .update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value });
  }
};

export const ensureDefaultSettings = async () => {
  const appName = await getSetting("app_name");
  if (appName === null) await setSetting("app_name", "HonoWA");

  const maintenance = await getSetting("maintenance_mode");
  if (maintenance === null) await setSetting("maintenance_mode", "false");

  const description = await getSetting("app_description");
  if (description === null) {
    await setSetting(
      "app_description",
      "Kelola sesi WhatsApp, broadcast, dan status dengan kontrol akses pengguna.",
    );
  }

  const logoUrl = await getSetting("app_logo_url");
  if (logoUrl === null) await setSetting("app_logo_url", "");
};
