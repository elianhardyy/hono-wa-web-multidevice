import type { FC } from "hono/jsx";
import { AdminLayout, PageHeader } from "./ui.js";
import { HistoryChatPrompt } from "../../components/HistoryChatPrompt.js";

export type AiChatHistory = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  model: string | null;
  createdAt: Date;
};

type LayoutBase = {
  appName: string;
  username: string;
  appDescription?: string;
  logoUrl?: string;
  avatarUrl?: string;
  role?: "admin" | "user";
  history?: AiChatHistory[];
};

export const AiPage: FC<LayoutBase> = (props) => (
  <AdminLayout
    appName={props.appName}
    username={props.username}
    appDescription={props.appDescription}
    logoUrl={props.logoUrl}
    avatarUrl={props.avatarUrl}
    role={props.role}
    active="ai"
  >
    <PageHeader
      title="AI Assistant"
      subtitle="Chat dengan AI assistant berbasis Gemini"
    />
    <div style="margin-top: 18px;">
      <div id="ai-chat-root">
        <div
          class="card"
          style="display:flex; align-items:center; justify-content:center; min-height:400px; gap:12px; flex-direction:column;"
        >
          <div class="spinner" />
          <div class="muted" style="font-size: 13px;">
            Memuat AI Chat...
          </div>
        </div>
      </div>
    </div>
    <HistoryChatPrompt history={props.history || []} />

    <script type="module" src="/assets/ai-chat.js" />
  </AdminLayout>
);
