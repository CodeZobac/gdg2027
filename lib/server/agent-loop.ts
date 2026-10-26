/** Shared model transport types for the chat and presentation agents. */
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
export type GenerateRequest = { model: string; messages: ChatMessage[]; tools: unknown[]; tool_choice: "required" | "none"; max_tokens: number };
export type Generate = (request: GenerateRequest) => Promise<ChatMessage>;
