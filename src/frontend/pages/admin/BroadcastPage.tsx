import type { FC } from "hono/jsx";
import { AdminLayout, PageHeader } from "./ui.js";
import { SessionSelect } from "../../components/SessionSelect.js";

type LayoutBase = {
  appName: string;
  username: string;
  appDescription?: string;
  logoUrl?: string;
  avatarUrl?: string;
};

type WaSessionRow = {
  id: string;
  sessionId: string;
  createdAt: string;
  userId?: string;
  webhookUrl?: string | null;
};

type ActionLogRow = {
  id: string;
  sessionId: string;
  createdAt: string;
  success: boolean;
  payload: any;
  error?: string | null;
};

const UNSEND_WINDOW_MS = 48 * 60 * 60 * 1000;
const collectMessageIds = (payload: any): string[] => {
  const direct = Array.isArray(payload?.sentMessageIds)
    ? payload.sentMessageIds
    : [];
  const nested = Array.isArray(payload?.sentItems)
    ? payload.sentItems.flatMap((item: any) =>
        Array.isArray(item?.messageIds) ? item.messageIds : [],
      )
    : [];
  return Array.from(
    new Set(
      [...direct, ...nested].map((v) => String(v ?? "").trim()).filter(Boolean),
    ),
  );
};
const canUnsend = (row: ActionLogRow) =>
  collectMessageIds(row.payload).length > 0 &&
  Date.now() - new Date(row.createdAt).getTime() <= UNSEND_WINDOW_MS;

export const BroadcastPage: FC<
  LayoutBase & {
    waSessions: WaSessionRow[];
    selectedSessionId?: string;
    mediaMaxMb?: number;
    alert?: string;
    history?: ActionLogRow[];
  }
> = (props) => (
  <AdminLayout
    appName={props.appName}
    username={props.username}
    appDescription={props.appDescription}
    logoUrl={props.logoUrl}
    avatarUrl={props.avatarUrl}
    active="broadcast"
  >
    <PageHeader
      title="WhatsApp Action: Broadcast"
      subtitle="Kirim pesan ke banyak nomor (batch)"
    />
    {props.alert ? <div class="alert">{props.alert}</div> : null}
    <div class="grid">
      <div class="card" style="grid-column: span 12;">
        <form
          method="post"
          action="/admin/broadcast/send"
          encType="multipart/form-data"
        >
          <div class="formRow">
            <div class="label">Session</div>
            <SessionSelect
              sessions={props.waSessions}
              selected={props.selectedSessionId}
            />
          </div>
          <div class="formRow">
            <div class="label">Phones (pisahkan dengan newline atau koma)</div>
            <textarea class="textarea" name="phones" required />
          </div>
          <div class="formRow">
            <div class="label">Message (caption)</div>
            <textarea class="textarea" name="message" />
            <div class="muted" style="margin-top: 6px; font-size: 13px;">
              Boleh kosong jika mengirim media.
            </div>
          </div>
          <div class="formRow">
            <div class="label">Media URL (diutamakan)</div>
            <input
              class="input"
              name="mediaUrl"
              type="url"
              placeholder="https://..."
            />
            <div class="muted" style="margin-top: 6px; font-size: 13px;">
              Support: gambar, video, audio, document. Maks{" "}
              {String(props.mediaMaxMb ?? 10)}MB.
            </div>
          </div>
          <div class="formRow">
            <div class="label">Upload Media (optional)</div>
            <input
              class="input"
              name="media"
              type="file"
              accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,text/plain,application/*"
            />
          </div>
          <div class="formRow">
            <div class="label">Delay per nomor (detik)</div>
            <input
              class="input"
              name="delaySec"
              type="number"
              min="5"
              value="5"
            />
          </div>
          <div style="margin-top: 14px;" class="btnRow">
            <button class="btn primary" type="submit">
              Kirim Broadcast
            </button>
          </div>
        </form>
      </div>
      <div class="card" style="grid-column: span 12;">
        <div class="statLabel">History Broadcast</div>
        <div class="muted" style="margin-top: 8px; font-size: 13px;">
          Menampilkan {String((props.history ?? []).length)} data terbaru.
        </div>
        <form
          id="history-broadcast-bulk-form"
          method="post"
          action="/admin/history/delete-selected"
        >
          <input type="hidden" name="actionType" value="broadcast" />
          <input
            type="hidden"
            name="sessionId"
            value={props.selectedSessionId ?? ""}
          />
          <div class="btnRow" style="margin-top: 10px;">
            <button class="btn danger" type="submit">
              Delete Selected
            </button>
            <button
              class="btn danger"
              type="submit"
              formaction="/admin/history/delete-all"
            >
              Delete All
            </button>
            <a
              class="btn"
              href={`/admin/history/download.csv?actionType=broadcast&sessionId=${encodeURIComponent(props.selectedSessionId ?? "")}`}
            >
              Download CSV
            </a>
          </div>
        </form>
        <table class="table" style="margin-top: 12px;">
          <thead>
            <tr>
              <th>Pilih</th>
              <th>Waktu</th>
              <th>Session</th>
              <th>Total</th>
              <th>Delay</th>
              <th>Ringkas</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(props.history ?? []).map((h) => (
              <tr>
                <td class="muted">
                  <input
                    type="checkbox"
                    name="selectedIds"
                    value={h.id}
                    form="history-broadcast-bulk-form"
                  />
                </td>
                <td class="muted">{new Date(h.createdAt).toLocaleString()}</td>
                <td>{h.sessionId}</td>
                <td class="muted">
                  {String((h.payload?.phones ?? []).length)}
                </td>
                <td class="muted">
                  {h.payload?.delayMs
                    ? String(Math.floor(Number(h.payload.delayMs) / 1000))
                    : "-"}
                </td>
                <td class="muted">
                  <div style="max-width:360px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    {String(h.payload?.message ?? "-")}
                  </div>
                </td>
                <td class="muted">
                  {h.success
                    ? "sent"
                    : `failed${h.error ? `: ${h.error}` : ""}`}
                </td>
                <td>
                  <div class="btnRow">
                    <form method="post" action="/admin/history/resend">
                      <input
                        type="hidden"
                        name="actionType"
                        value="broadcast"
                      />
                      <input
                        type="hidden"
                        name="sessionId"
                        value={props.selectedSessionId ?? ""}
                      />
                      <input type="hidden" name="actionLogId" value={h.id} />
                      <button class="btn success" type="submit">
                        Resend
                      </button>
                    </form>
                    <form method="post" action="/admin/history/unsend">
                      <input
                        type="hidden"
                        name="actionType"
                        value="broadcast"
                      />
                      <input
                        type="hidden"
                        name="sessionId"
                        value={props.selectedSessionId ?? ""}
                      />
                      <input type="hidden" name="actionLogId" value={h.id} />
                      <button
                        class="btn warning"
                        type="submit"
                        disabled={!canUnsend(h)}
                      >
                        Unsend
                      </button>
                    </form>
                    <form method="post" action="/admin/history/delete">
                      <input
                        type="hidden"
                        name="actionType"
                        value="broadcast"
                      />
                      <input
                        type="hidden"
                        name="sessionId"
                        value={props.selectedSessionId ?? ""}
                      />
                      <input type="hidden" name="actionLogId" value={h.id} />
                      <button class="btn danger" type="submit">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
);
