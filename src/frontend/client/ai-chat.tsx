/* @jsxImportSource react */
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";

const AiChat = () => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isLoading } = useChat({
    connection: fetchServerSentEvents("/api/ai/chat"),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput("");
  };

  return (
    <div style={styles.container}>
      {/* Messages area */}
      <div ref={scrollRef} style={styles.messagesArea}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              <i className="fa-solid fa-robot" />
            </div>
            <div style={styles.emptyTitle}>Halo! Ada yang bisa dibantu?</div>
            <div style={styles.emptySub}>
              Ketik pesan untuk mulai percakapan dengan AI assistant.
            </div>
          </div>
        )}
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";
          return (
            <div
              key={message.id}
              style={{
                ...styles.messageRow,
                justifyContent: isAssistant ? "flex-start" : "flex-end",
              }}
            >
              {isAssistant && (
                <div style={styles.botAvatar}>
                  <i className="fa-solid fa-robot" style={{ fontSize: "12px" }} />
                </div>
              )}
              <div
                style={{
                  ...styles.messageBubble,
                  ...(isAssistant ? styles.assistantBubble : styles.userBubble),
                }}
              >
                {message.parts.map((part, idx) => {
                  if (part.type === "thinking") {
                    return (
                      <div key={idx} style={styles.thinking}>
                        💭 {(part as any).content}
                      </div>
                    );
                  }
                  if (part.type === "text") {
                    return (
                      <div
                        key={idx}
                        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      >
                        {(part as any).content}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.botAvatar}>
              <i className="fa-solid fa-robot" style={{ fontSize: "12px" }} />
            </div>
            <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
              <div style={styles.typingDots}>
                <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                <span style={{ ...styles.dot, animationDelay: "150ms" }} />
                <span style={{ ...styles.dot, animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} style={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pesan..."
          className="input"
          style={styles.textInput}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="btn primary"
          style={styles.sendBtn}
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 200px)",
    minHeight: "400px",
    background: "#fff",
    border: "1px solid rgba(199,196,216,0.35)",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 14px 36px rgba(17,24,39,0.06)",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "rgba(70,69,85,0.55)",
  },
  emptyIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #3525cd, #4f46e5)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: "24px",
    boxShadow: "0 14px 30px rgba(53,37,205,0.18)",
  },
  emptyTitle: {
    fontWeight: 800,
    fontSize: "18px",
    letterSpacing: "-0.02em",
    color: "#151c27",
    marginTop: "4px",
  },
  emptySub: {
    fontSize: "13px",
    fontWeight: 500,
    color: "rgba(70,69,85,0.65)",
  },
  messageRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-end",
  },
  botAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #3525cd, #4f46e5)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: "16px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  userBubble: {
    background: "linear-gradient(135deg, #3525cd, #4f46e5)",
    color: "#fff",
    borderBottomRightRadius: "4px",
    boxShadow: "0 8px 22px rgba(53,37,205,0.16)",
  },
  assistantBubble: {
    background: "rgba(226,232,248,0.55)",
    color: "#151c27",
    borderBottomLeftRadius: "4px",
    border: "1px solid rgba(199,196,216,0.35)",
  },
  thinking: {
    fontSize: "12px",
    color: "rgba(70,69,85,0.65)",
    fontStyle: "italic",
    marginBottom: "6px",
  },
  typingDots: {
    display: "flex",
    gap: "4px",
    padding: "4px 0",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "999px",
    background: "rgba(53,37,205,0.45)",
    display: "inline-block",
    animation: "dotPulse 1s ease-in-out infinite",
  },
  inputForm: {
    display: "flex",
    gap: "10px",
    padding: "14px 16px",
    borderTop: "1px solid rgba(199,196,216,0.35)",
    background: "rgba(248,250,252,0.8)",
  },
  textInput: {
    flex: 1,
    border: "1px solid rgba(199,196,216,0.5)",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
  },
  sendBtn: {
    display: "grid",
    placeItems: "center",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    padding: 0,
    fontSize: "15px",
    cursor: "pointer",
    flexShrink: 0,
  },
};

// ─── Mount ────────────────────────────────────────────────────────────────────

const root = document.getElementById("ai-chat-root");
if (root) {
  // Inject typing animation keyframes
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes dotPulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1.2); }
    }
  `;
  document.head.appendChild(styleEl);

  createRoot(root).render(<AiChat />);
}
