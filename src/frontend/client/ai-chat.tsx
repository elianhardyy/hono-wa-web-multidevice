/* @jsxImportSource react */
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";

const ThinkingBlock = ({ content, isStreaming }: { content: string; isStreaming?: boolean }) => {
  const [isOpen, setIsOpen] = useState(isStreaming);

  useEffect(() => {
    setIsOpen(!!isStreaming);
  }, [isStreaming]);

  return (
    <div style={styles.thinkingContainer}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.thinkingHeader}
      >
        <i className="fa-solid fa-brain" style={{ marginRight: "6px", fontSize: "11px" }} />
        <span style={{ flex: 1 }}>{isStreaming ? "Thinking..." : "Thinking Process"}</span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: "10px", opacity: 0.7 }} />
      </div>
      {isOpen && (
        <div style={styles.thinkingContent}>
          {content}
        </div>
      )}
    </div>
  );
};

const AiChat = () => {
  const parseContent = (content: string) => {
    if (content.startsWith("[IMAGE]")) {
      return [{ type: "image", url: content.replace("[IMAGE]", "") }];
    }

    // Find the LAST </thinking> tag — everything before it is the "thinking area"
    const lastThinkingEnd = content.lastIndexOf("</thinking>");
    if (lastThinkingEnd === -1) {
      // No thinking tags — plain text
      return [{ type: "text", content }];
    }

    // Extract ALL thinking content from all <thinking> blocks before the last </thinking>
    const thinkingArea = content.substring(0, lastThinkingEnd + "</thinking>".length);
    const answerText = content.substring(lastThinkingEnd + "</thinking>".length).trim();

    // Merge all <thinking>...</thinking> blocks into one
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
    let thinkingContent = "";
    let match;
    while ((match = thinkingRegex.exec(thinkingArea)) !== null) {
      thinkingContent += match[1];
    }

    const parts: any[] = [];
    if (thinkingContent) parts.push({ type: "thinking", content: thinkingContent });
    if (answerText) parts.push({ type: "text", content: answerText });
    if (parts.length === 0) parts.push({ type: "text", content });
    return parts;
  };

  const rootEl = document.getElementById("ai-chat-root");
  const initialHistory = JSON.parse(rootEl?.dataset.history || "[]").map((h: any) => {
    const parts: any[] = [];
    // Reasoning is now stored in a separate column
    if (h.reasoning) {
      parts.push({ type: "thinking", content: h.reasoning });
    }
    // Content is the plain answer
    if (h.content) {
      // Still parse for [IMAGE] prefix and legacy <thinking> tags in old data
      const contentParts = parseContent(h.content);
      parts.push(...contentParts);
    }
    return {
      id: h.id,
      role: h.role,
      createdAt: h.createdAt,
      parts: parts.length > 0 ? parts : [{ type: "text", content: "" }],
    };
  }).reverse(); // Reverse because it was desc in DB

  const [input, setInput] = useState("");
  const [isImageMode, setIsImageMode] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [historyCleared, setHistoryCleared] = useState(false);
  const [conversationId, setConversationId] = useState(() => "conv-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9));
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isLoading: isChatLoading } = useChat({
    connection: fetchServerSentEvents("/api/ai/chat"),
    body: { conversationId },
  });

  // Normalize a raw message (from useChat or history) into our {id, role, createdAt, parts} format
  const normalizeMessage = (m: any) => {
    // If already normalized (has our custom parts with type=thinking/text/image with content field), use directly
    if (m.parts && Array.isArray(m.parts) && m.parts.length > 0 && m.parts[0].content !== undefined) {
      return m;
    }

    // Debug: log TanStack message structure (remove after debugging)
    if (m.role === "assistant") {
      console.log("[normalizeMessage] TanStack msg keys:", Object.keys(m));
      if (m.parts) console.log("[normalizeMessage] parts sample:", JSON.stringify(m.parts.slice(0, 3)));
      if (m.content) console.log("[normalizeMessage] content type:", typeof m.content, typeof m.content === "string" ? m.content.substring(0, 50) : JSON.stringify(m.content)?.substring(0, 50));
    }

    // TanStack AI live message — parts array with {type, text} format
    if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
      const normalized: any[] = [];
      let thinkingText = "";
      let textContent = "";
      for (const p of m.parts) {
        const pType = String(p.type || "");
        // TanStack parts use 'text' property, not 'content'
        const pText = p.text ?? p.content ?? "";
        const isReasoning = pType === "reasoning" || pType === "thinking" || pType.toLowerCase().includes("reason");
        const isText = pType === "text" || pType === "text-delta";
        
        if (isReasoning && pText) {
          thinkingText += pText;
        } else if (isText && pText) {
          textContent += pText;
        }
      }
      
      // Only use this path if we found reasoning - otherwise fall through to content string
      if (thinkingText) {
        if (thinkingText) normalized.push({ type: "thinking", content: thinkingText });
        if (textContent) normalized.push({ type: "text", content: textContent });
        return { id: m.id, role: m.role, createdAt: m.createdAt || new Date().toISOString(), parts: normalized };
      }
      
      // Parts exist but no reasoning found — only use text parts
      if (textContent) {
        return { id: m.id, role: m.role, createdAt: m.createdAt || new Date().toISOString(), parts: [{ type: "text", content: textContent }] };
      }
    }

    // Fallback: extract full string content
    let text = "";
    if (m.content && typeof m.content === "string") {
      text = m.content;
    } else if (Array.isArray(m.content)) {
      // Only take text-type parts, ignore reasoning parts
      text = m.content
        .filter((p: any) => {
          const t = String(p.type || "");
          return t === "text" || t === "text-delta" || !t;
        })
        .map((p: any) => p.text || p.content || "")
        .join("");
    }

    return {
      id: m.id,
      role: m.role,
      createdAt: m.createdAt || new Date().toISOString(),
      parts: parseContent(text),
    };
  };

  // Combine history, remote messages, and local image messages
  // Deduplicate: only show initialHistory messages that predate TanStack's live messages
  // TanStack replays the full thread in its own `messages`, so we only need history for context older than that
  const oldestLiveTime = messages.length > 0
    ? Math.min(...messages.map((m: any) => new Date(m.createdAt || Date.now()).getTime()))
    : Infinity;

  const filteredHistory = messages.length > 0
    ? initialHistory.filter((h: any) => new Date(h.createdAt || 0).getTime() < oldestLiveTime)
    : initialHistory;

  const displayHistory = historyCleared ? [] : filteredHistory;

  const allMessages = [
    ...displayHistory,
    ...messages.map(normalizeMessage),
    ...localMessages,
  ].sort((a, b) => {
    const timeA = new Date(a.createdAt || Date.now()).getTime();
    const timeB = new Date(b.createdAt || Date.now()).getTime();
    return timeA - timeB;
  });

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Hari Ini";
    if (d.toDateString() === yesterday.toDateString()) return "Kemarin";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages, isChatLoading, imageGenerating]);

  const handleImageGeneration = async (prompt: string) => {
    setImageGenerating(true);
    // Add user message locally
    const userMsg = {
      id: "local-" + Date.now(),
      role: "user",
      parts: [{ type: "text", content: prompt }],
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId }),
      });
      const data = await res.json();

      if (data.success && data.images && data.images.length > 0) {
        const img = data.images[0];
        const imageUrl = img.b64Json ? `data:image/png;base64,${img.b64Json}` : img.url;
        
        const assistantMsg = {
          id: "local-" + (Date.now() + 1),
          role: "assistant",
          parts: [{ type: "image", url: imageUrl }],
          createdAt: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || "Gagal generate gambar");
      }
    } catch (err: any) {
      const errorMsg = {
        id: "local-" + (Date.now() + 1),
        role: "assistant",
        parts: [{ type: "text", content: "⚠️ Error: " + err.message }],
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, errorMsg]);
    } finally {
      setImageGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isChatLoading || imageGenerating) return;

    if (isImageMode) {
      handleImageGeneration(trimmed);
    } else {
      sendMessage(trimmed);
    }
    setInput("");
  };

  const handleClearHistory = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus seluruh riwayat chat? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }

    try {
      const res = await fetch("/api/ai/history", { method: "DELETE" });
      if (res.ok) {
        setHistoryCleared(true);
        setLocalMessages([]);
        // Force new conversation ID to clear TanStack's current session messages
        setConversationId("conv-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9));
      } else {
        alert("Gagal menghapus riwayat.");
      }
    } catch (err) {
      console.error("Error clearing history:", err);
      alert("Terjadi kesalahan saat menghapus riwayat.");
    }
  };

  const isLoading = isChatLoading || imageGenerating;

  return (
    <div style={styles.container}>
      {/* Header with Mode Toggle */}
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @media (max-width: 640px) {
          #ai-chat-header {
            flex-direction: column !important;
            gap: 12px !important;
            padding: 12px !important;
          }
          #ai-chat-header-main {
            width: 100% !important;
            position: static !important;
          }
          #ai-chat-mode-tabs {
            width: 100% !important;
          }
          #ai-chat-mode-tabs button {
            flex: 1 !important;
          }
        }
      `}</style>
      <div id="ai-chat-header" style={styles.header}>
        {/* Row for Title and Delete Button on Mobile */}
        <div id="ai-chat-header-main" style={styles.headerMainRow}>
          <div id="ai-chat-header-top" style={styles.headerLeft}>
            <div style={styles.statusDot} />
            <span style={styles.headerTitle}>AI Assistant</span>
          </div>
          
          <div id="ai-chat-delete-container" style={styles.headerRight}>
            <button
              onClick={handleClearHistory}
              style={{
                ...styles.modeBtn,
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
              title="Hapus Semua Riwayat"
            >
              <i className="fa-solid fa-trash-can" />
            </button>
          </div>
        </div>

        <div id="ai-chat-mode-tabs" style={styles.modeTabs}>
          <button
            onClick={() => setIsImageMode(false)}
            style={{
              ...styles.modeBtn,
              ...(isImageMode ? {} : styles.modeBtnActive),
            }}
          >
            <i className="fa-solid fa-message" style={{ marginRight: "6px" }} />
            Chat
          </button>
          <button
            onClick={() => setIsImageMode(true)}
            style={{
              ...styles.modeBtn,
              ...(isImageMode ? styles.modeBtnActive : {}),
            }}
          >
            <i className="fa-solid fa-image" style={{ marginRight: "6px" }} />
            Generate Image
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} style={styles.messagesArea}>
        {allMessages.length === 0 && !isLoading && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              <i className={isImageMode ? "fa-solid fa-wand-magic-sparkles" : "fa-solid fa-robot"} />
            </div>
            <div style={styles.emptyTitle}>
              {isImageMode ? "Bikin Gambar Apa Hari Ini?" : "Halo! Ada yang bisa dibantu?"}
            </div>
            <div style={styles.emptySub}>
              {isImageMode 
                ? "Masukkan prompt deskriptif untuk membuat gambar keren." 
                : "Ketik pesan untuk mulai percakapan dengan AI assistant."}
            </div>
          </div>
        )}
        {allMessages.map((message, index) => {
          const isAssistant = message.role === "assistant";
          const prevMessage = allMessages[index - 1];
          const currentDate = new Date(message.createdAt || Date.now()).toDateString();
          const prevDate = prevMessage ? new Date(prevMessage.createdAt || Date.now()).toDateString() : null;
          const showDateSeparator = currentDate !== prevDate;

          return (
            <React.Fragment key={message.id}>
              {showDateSeparator && (
                <div style={styles.dateSeparator}>
                  <div style={styles.dateSeparatorInner}>{formatDateLabel(message.createdAt || new Date().toISOString())}</div>
                </div>
              )}
              <div
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
                  <div style={styles.bubbleContent}>
                    {message.parts.map((part: any, idx: number) => {
                      if (part.type === "thinking") {
                        const isStreaming = index === allMessages.length - 1 && isChatLoading;
                        return (
                          <ThinkingBlock 
                            key={idx} 
                            content={part.content} 
                            isStreaming={isStreaming} 
                          />
                        );
                      }
                      if (part.type === "text") {
                        return (
                          <div
                            key={idx}
                            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                          >
                            {part.content}
                          </div>
                        );
                      }
                      if (part.type === "image") {
                        return (
                          <div key={idx} style={styles.imageContainer}>
                            <img src={part.url} style={styles.image} alt="Generated" />
                            <a 
                              href={part.url} 
                              download="generated-image.png" 
                              style={styles.downloadBtn}
                              title="Download Image"
                            >
                              <i className="fa-solid fa-download" />
                            </a>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <div style={{
                    ...styles.messageTime,
                    color: isAssistant ? "#94a3b8" : "rgba(255,255,255,0.7)"
                  }}>
                    {formatTime(message.createdAt || new Date().toISOString())}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {isLoading && (
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
              {imageGenerating && (
                <div style={{ fontSize: "11px", marginTop: "4px", color: "#64748b", fontWeight: 500 }}>
                  Generating your masterpiece...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} style={styles.inputForm}>
        <div style={styles.inputWrapper}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isImageMode ? "Deskripsikan gambar yang ingin dibuat..." : "Ketik pesan..."}
            style={styles.textInput}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              ...styles.sendBtn,
              opacity: (!input.trim() || isLoading) ? 0.6 : 1,
              background: isImageMode ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : "linear-gradient(135deg, #3b82f6, #2563eb)",
            }}
          >
            {isLoading ? (
              <div className="spinner-small" style={{ width: "18px", height: "18px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <i className={isImageMode ? "fa-solid fa-wand-magic-sparkles" : "fa-solid fa-paper-plane"} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 240px)",
    minHeight: "500px",
    background: "#ffffff",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    position: "relative",
  },
  header: {
    padding: "10px 24px",
    background: "#fff",
    borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    position: "relative",
    minHeight: "60px",
  },
  headerMainRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    padding: "0 24px",
    pointerEvents: "none",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    pointerEvents: "auto",
  },
  headerRight: {
    pointerEvents: "auto",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    background: "#10b981",
    borderRadius: "50%",
    boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: "16px",
    color: "#1e293b",
    letterSpacing: "-0.01em",
  },
  modeTabs: {
    display: "flex",
    background: "#f1f5f9",
    padding: "4px",
    borderRadius: "12px",
    gap: "4px",
  },
  modeBtn: {
    border: "none",
    background: "none",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
  },
  modeBtnActive: {
    background: "#fff",
    color: "#1e293b",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    background: "linear-gradient(to bottom, #ffffff, #f8fafc)",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    textAlign: "center",
    padding: "40px",
  },
  emptyIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: "32px",
    boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)",
    marginBottom: "8px",
  },
  emptyTitle: {
    fontWeight: 800,
    fontSize: "20px",
    color: "#0f172a",
  },
  emptySub: {
    fontSize: "14px",
    color: "#64748b",
    maxWidth: "280px",
    lineHeight: "1.5",
  },
  messageRow: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
    width: "100%",
  },
  botAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #1e293b, #334155)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    flexShrink: 0,
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: "8px 12px 6px 14px",
    borderRadius: "18px",
    fontSize: "14.5px",
    lineHeight: "1.5",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  bubbleContent: {
    flex: 1,
  },
  messageTime: {
    fontSize: "10.5px",
    alignSelf: "flex-end",
    marginTop: "2px",
    fontWeight: 500,
  },
  dateSeparator: {
    display: "flex",
    justifyContent: "center",
    margin: "12px 0 20px 0",
  },
  dateSeparatorInner: {
    background: "#e1f3fb",
    padding: "5px 16px",
    borderRadius: "10px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#54656f",
    boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },
  userBubble: {
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#ffffff",
    borderBottomRightRadius: "4px",
    boxShadow: "0 10px 25px rgba(37, 99, 235, 0.15)",
  },
  assistantBubble: {
    background: "#ffffff",
    color: "#1e293b",
    borderBottomLeftRadius: "4px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
  },
  thinkingContainer: {
    marginBottom: "12px",
    borderRadius: "10px",
    overflow: "hidden",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    background: "#f8fafc",
  },
  thinkingHeader: {
    padding: "6px 12px",
    display: "flex",
    alignItems: "center",
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    cursor: "pointer",
    userSelect: "none",
    background: "#f1f5f9",
    transition: "all 0.2s ease",
  },
  thinkingContent: {
    padding: "10px 12px",
    fontSize: "12px",
    color: "#475569",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    borderTop: "1px solid rgba(226, 232, 240, 0.5)",
    background: "#fff",
  },
  imageContainer: {
    position: "relative",
    marginTop: "4px",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },
  image: {
    width: "100%",
    maxHeight: "400px",
    display: "block",
    objectFit: "cover",
  },
  downloadBtn: {
    position: "absolute",
    top: "10px",
    right: "10px",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(4px)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    textDecoration: "none",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },
  typingDots: {
    display: "flex",
    gap: "4px",
    padding: "4px 0",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#94a3b8",
    animation: "dotPulse 1s ease-in-out infinite",
  },
  inputForm: {
    padding: "20px 24px",
    borderTop: "1px solid #e2e8f0",
    background: "#fff",
  },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "6px 6px 6px 16px",
    transition: "all 0.2s ease",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
  },
  textInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "10px 0",
    fontSize: "15px",
    color: "#1e293b",
    outline: "none",
  },
  sendBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "none",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
};

// ─── Mount ────────────────────────────────────────────────────────────────────

const root = document.getElementById("ai-chat-root");
if (root) {
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes dotPulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1.2); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .message-area::-webkit-scrollbar {
      width: 6px;
    }
    .message-area::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 10px;
    }
    .input-wrapper:focus-within {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
    }
  `;
  document.head.appendChild(styleEl);

  createRoot(root).render(<AiChat />);
}
