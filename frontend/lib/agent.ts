export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  /** True while waiting for LLM / tools before any text */
  isThinking?: boolean;
}

export interface ToolCall {
  tool: string;
  input: string;
  result?: string;
  step: number;
}

export interface AgentState {
  connected: boolean;
  user: { id: number; username: string } | null;
  messages: AgentMessage[];
  currentToolCall: ToolCall | null;
  error: string | null;
}

export interface WsConnected {
  type: 'connected';
  user: { id: number; username: string };
}

export interface WsStatus {
  type: 'status';
  status: 'thinking' | 'tool' | string;
  step: number;
}

export interface WsStreamChunk {
  type: 'stream_chunk';
  content: string;
  step: number;
}

export interface WsToolCall {
  type: 'tool_call';
  tool: string;
  input: string;
  step: number;
}

export interface WsToolResult {
  type: 'tool_result';
  tool: string;
  input?: string;
  result: string;
  step: number;
}

export interface WsFinal {
  type: 'final';
  content: string;
  step: number;
}

export interface WsError {
  type: 'error';
  message: string;
}

export interface WsReset {
  type: 'reset';
  status: string;
}

export interface WsPing {
  type: 'ping';
}

export interface WsQuestion {
  type: 'question';
  questions: AgentQuestion[];
  step: number;
}

export interface AgentQuestion {
  question: string;
  options?: string[];
}

export type WsMessage =
  | WsConnected
  | WsStatus
  | WsStreamChunk
  | WsToolCall
  | WsToolResult
  | WsFinal
  | WsError
  | WsReset
  | WsPing
  | WsQuestion;

export interface ProviderInfo {
  provider: string;
  model: string;
}

export interface ProviderCatalogEntry {
  provider: string;
  models: string[];
  default_model?: string;
}

export interface ProvidersResponse {
  active: ProviderInfo;
  catalog: Record<string, ProviderCatalogEntry>;
  registered: ProviderInfo[];
}

export function formatToolInput(input: unknown): string {
  if (typeof input === 'string') return input;
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input ?? '');
  }
}
