// ─────────────────────────────────────────────────────────────────────────────
// webhook.ts — Service untuk mengirim event WhatsApp ke URL webhook eksternal
// URL webhook dikonfigurasi via environment variable WEBHOOK_URL
// ─────────────────────────────────────────────────────────────────────────────

export type WebhookEvent =
  | "message.received"
  | "message.sent"
  | "session.ready"
  | "session.qr"
  | "session.disconnected";

export type WebhookPayload = {
  event: WebhookEvent;
  sessionId: string;
  timestamp: string;
  data: Record<string, any>;
};

const getWebhookUrl = (): string | null => process.env.WEBHOOK_URL ?? null;

export const sendWebhook = async (payload: WebhookPayload): Promise<void> => {
  const url = getWebhookUrl();
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.WEBHOOK_SECRET
          ? { "X-Webhook-Secret": process.env.WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(
        `[webhook] Pengiriman gagal — event: ${payload.event}, ` +
          `session: ${payload.sessionId}, HTTP ${res.status}`,
      );
    } else {
      console.log(
        `[webhook] ✓ Terkirim — event: ${payload.event}, session: ${payload.sessionId}`,
      );
    }
  } catch (err: any) {
    console.error(
      `[webhook] Error saat kirim — event: ${payload.event}:`,
      err?.message ?? err,
    );
  }
};

export const webhookMessageReceived = (
  sessionId: string,
  msg: {
    from: string;
    to: string;
    body: string;
    type: string;
    isGroup: boolean;
    groupId?: string;
    timestamp: number;
    messageId: string;
  },
) =>
  sendWebhook({
    event: "message.received",
    sessionId,
    timestamp: new Date().toISOString(),
    data: msg,
  });

export const webhookSessionReady = (sessionId: string) =>
  sendWebhook({
    event: "session.ready",
    sessionId,
    timestamp: new Date().toISOString(),
    data: { status: "ready" },
  });

export const webhookSessionQR = (sessionId: string, qr: string) =>
  sendWebhook({
    event: "session.qr",
    sessionId,
    timestamp: new Date().toISOString(),
    data: { qr },
  });

export const webhookSessionDisconnected = (sessionId: string, reason: string) =>
  sendWebhook({
    event: "session.disconnected",
    sessionId,
    timestamp: new Date().toISOString(),
    data: { reason },
  });
