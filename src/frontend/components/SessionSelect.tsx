import type { FC } from "hono/jsx";

type WaSessionRow = {
  id: string;
  sessionId: string;
  createdAt: string;
  userId?: string;
  webhookUrl?: string | null;
};

export const SessionSelect: FC<{
  sessions: WaSessionRow[];
  selected?: string;
}> = (props) => (
  <select class="select" name="sessionId" required>
    <option value="" selected={!props.selected}>
      Pilih session...
    </option>
    {props.sessions.map((s) => (
      <option value={s.sessionId} selected={props.selected === s.sessionId}>
        {s.sessionId}
      </option>
    ))}
  </select>
);
