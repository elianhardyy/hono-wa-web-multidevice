import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { createOpenaiChat } from "@tanstack/ai-openai"; // Instal jika perlu
import { createAnthropicChat } from "@tanstack/ai-anthropic"; // Instal jika perlu
import type { Context } from "hono";
import type { ToolDefinition } from "@tanstack/ai";
import { db } from "../config/db.js";
import { aiChats } from "../config/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";


//const DEFAULT_MODEL = "gemini-2.0-flash";
//const DEFAULT_MODEL = "gpt-3.5-turbo";
const DEFAULT_MODEL = "claude-opus-4-6 ";


const getAdapter = (modelName: string) => {
  if (modelName.startsWith("gpt") || modelName.includes("openai")) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
    return createOpenaiChat(modelName as any, apiKey);
  }

  if (modelName.startsWith("claude") || modelName.includes("anthropic")) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    return createAnthropicChat(modelName as any, apiKey);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return createGeminiChat(modelName as any, apiKey);
};


type MessageRole = "user" | "assistant" | "tool";

export type AiChatMessage = {
  role: MessageRole;
  content: string;
};

export type AiChatOptions = {
  messages: Array<AiChatMessage>;
  conversationId?: string;
  model?: string;
  tools?: Array<ToolDefinition<any, any, any>>;
};


export const handleAiChat = async (c: Context): Promise<Response> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let body: AiChatOptions;
  try {
    body = await c.req.json<AiChatOptions>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { messages, conversationId, model, tools } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: "messages is required and must be a non-empty array" }, 400);
  }

  try {
    const modelName = model ?? DEFAULT_MODEL;
    const stream = chat({
      adapter: getAdapter(modelName),
      messages,
      ...(tools && tools.length > 0 ? { tools } : {}),
      ...(conversationId ? { conversationId } : {}),
    });

    return toServerSentEventsResponse(stream);
  } catch (error) {
    console.error("[ai.service] chat error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      500,
    );
  }
};

export const createAiChatStream = (opts: {
  messages: Array<AiChatMessage>;
  model?: string;
  tools?: Array<ToolDefinition<any, any, any>>;
  conversationId?: string;
}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const modelName = opts.model ?? DEFAULT_MODEL;

  return chat({
    adapter: getAdapter(modelName),
    messages: opts.messages,
    ...(opts.tools && opts.tools.length > 0 ? { tools: opts.tools } : {}),
    ...(opts.conversationId ? { conversationId: opts.conversationId } : {}),
  });
};


export const saveAiChatMessage = async (data: {
  userId: string;
  conversationId: string;
  role: string;
  content: string;
  model?: string;
}) => {
  return db.insert(aiChats).values({
    id: uuidv4(),
    userId: data.userId,
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    model: data.model ?? DEFAULT_MODEL,
    createdAt: new Date(),
  });
};


export const getAiChatHistory = async (userId: string, limit = 50) => {
  return db
    .select()
    .from(aiChats)
    .where(eq(aiChats.userId, userId))
    .orderBy(desc(aiChats.createdAt))
    .limit(limit);
};
