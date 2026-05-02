import { sessions, getOrCreateSession } from "../session/session-manager.js";
import { SESSION_STATUS } from "../utils/types.js";

export const UNSEND_WINDOW_MS = 48 * 60 * 60 * 1000;
export const HISTORY_ACTION_TYPES = new Set(["message", "broadcast", "status"]);
export type HistoryActionType = "message" | "broadcast" | "status";

export const toHistoryActionType = (value: string): HistoryActionType => {
  if (!HISTORY_ACTION_TYPES.has(value)) return "message";
  return value as HistoryActionType;
};

export const historyBasePath = (actionType: HistoryActionType) => {
  if (actionType === "broadcast") return "/admin/broadcast";
  if (actionType === "status") return "/admin/status";
  return "/admin/message";
};

export const historyPathWithSession = (actionType: HistoryActionType, sessionId?: string) => {
  const base = historyBasePath(actionType);
  const sid = String(sessionId ?? "").trim();
  if (!sid) return base;
  return `${base}?sessionId=${encodeURIComponent(sid)}`;
};

export const collectMessageIds = (payload: any): string[] => {
  const direct = Array.isArray(payload?.sentMessageIds) ? payload.sentMessageIds : [];
  const nested = Array.isArray(payload?.sentItems)
    ? payload.sentItems.flatMap((item: any) =>
        Array.isArray(item?.messageIds) ? item.messageIds : [],
      )
    : [];
  return Array.from(
    new Set(
      [...direct, ...nested]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean),
    ),
  );
};

export const isWithinUnsendWindow = (createdAtIso?: string | null) => {
  const ts = Date.parse(String(createdAtIso ?? ""));
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= UNSEND_WINDOW_MS;
};

export const unsendByMessageIds = async (sessionId: string, messageIds: string[]) => {
  const sessionData = sessions.get(sessionId) ?? getOrCreateSession(sessionId);
  if (sessionData.status !== SESSION_STATUS.READY) {
    throw new Error(`not_ready:${sessionData.status}`);
  }
  let revoked = 0;
  for (const id of messageIds) {
    const msg = await sessionData.client.getMessageById(id);
    if (!msg) continue;
    await msg.delete(true);
    revoked++;
  }
  return revoked;
};

export const jsonToCsv = (rows: Record<string, any>[]) => {
  if (!rows.length) return "id,createdAt,sessionId,target,message,status,error\r\n";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => esc(row[h])).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
};
