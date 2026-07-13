'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AGENT_WS_URL } from '@/lib/config';
import type { AgentMessage, ToolCall, WsMessage } from '@/lib/agent';
import { formatToolInput } from '@/lib/agent';

interface AgentContextType {
  connected: boolean;
  messages: AgentMessage[];
  currentToolCall: ToolCall | null;
  error: string | null;
  isBusy: boolean;
  /** True after the first user message until /new (or reset) */
  sessionActive: boolean;
  sendMessage: (content: string) => void;
  resetConversation: () => void;
  sendCancel: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

function ensureAssistantStreaming(prev: AgentMessage[]): AgentMessage[] {
  const last = prev[prev.length - 1];
  if (last?.role === 'assistant' && last.isStreaming) {
    return prev;
  }
  return [
    ...prev,
    {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isThinking: true,
      toolCalls: [],
    },
  ];
}

function updateLastAssistant(
  prev: AgentMessage[],
  updater: (m: AgentMessage) => AgentMessage
): AgentMessage[] {
  const withAssistant = ensureAssistantStreaming(prev);
  const lastIdx = withAssistant.length - 1;
  return withAssistant.map((m, i) => (i === lastIdx ? updater(m) : m));
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRef = useRef(token);
  const mountedRef = useRef(true);

  tokenRef.current = token;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const connect = useCallback(() => {
    const t = tokenRef.current;
    if (!t) return;
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const wsUrl = `${AGENT_WS_URL}/ws/agent?token=${encodeURIComponent(t)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'connected':
            setConnected(true);
            break;

          case 'ping':
            break;

          case 'status':
            setMessages((prev) =>
              updateLastAssistant(prev, (m) => ({
                ...m,
                isStreaming: true,
                isThinking: data.status === 'thinking',
              }))
            );
            break;

          case 'tool_call': {
            const input = formatToolInput(data.input);
            const tc: ToolCall = {
              tool: data.tool,
              input,
              step: data.step,
            };
            setCurrentToolCall(tc);
            setMessages((prev) =>
              updateLastAssistant(prev, (m) => {
                const existing = m.toolCalls || [];
                const idx = existing.findIndex((c) => c.step === data.step);
                const toolCalls =
                  idx >= 0
                    ? existing.map((c, i) => (i === idx ? tc : c))
                    : [...existing, tc];
                return {
                  ...m,
                  isStreaming: true,
                  isThinking: false,
                  toolCalls,
                };
              })
            );
            break;
          }

          case 'tool_result': {
            const input = formatToolInput(data.input ?? '');
            setCurrentToolCall((prev) =>
              prev?.step === data.step
                ? { ...prev, result: data.result, input: input || prev.input }
                : prev
            );
            setMessages((prev) =>
              updateLastAssistant(prev, (m) => {
                const existing = m.toolCalls || [];
                const idx = existing.findIndex((c) => c.step === data.step);
                let toolCalls: ToolCall[];
                if (idx >= 0) {
                  toolCalls = existing.map((c, i) =>
                    i === idx
                      ? {
                          ...c,
                          result: data.result,
                          input: input || c.input,
                        }
                      : c
                  );
                } else {
                  toolCalls = [
                    ...existing,
                    {
                      tool: data.tool,
                      input,
                      result: data.result,
                      step: data.step,
                    },
                  ];
                }
                return {
                  ...m,
                  isStreaming: true,
                  isThinking: false,
                  toolCalls,
                };
              })
            );
            break;
          }

          case 'stream_chunk':
            setCurrentToolCall(null);
            setMessages((prev) =>
              updateLastAssistant(prev, (m) => ({
                ...m,
                content: m.content + data.content,
                isStreaming: true,
                isThinking: false,
              }))
            );
            break;

          case 'final':
            setCurrentToolCall(null);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.isStreaming) {
                return prev.map((m, i) =>
                  i === prev.length - 1
                    ? {
                        ...m,
                        content: data.content ? m.content + data.content : m.content,
                        isStreaming: false,
                        isThinking: false,
                      }
                    : m
                );
              }
              return [
                ...prev,
                {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: data.content || '',
                  timestamp: Date.now(),
                  toolCalls: [],
                  isStreaming: false,
                },
              ];
            });
            break;

          case 'error':
            setError(data.message);
            setCurrentToolCall(null);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && last.isStreaming) {
                return prev.map((m, i) =>
                  i === prev.length - 1
                    ? {
                        ...m,
                        content:
                          m.content +
                          (m.content ? '\n\n' : '') +
                          `Error: ${data.message}`,
                        isStreaming: false,
                        isThinking: false,
                      }
                    : m
                );
              }
              return prev;
            });
            break;

          case 'reset':
            setMessages([]);
            setCurrentToolCall(null);
            setError(null);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      const shouldReconnect = wsRef.current !== null;
      wsRef.current = null;
      if (mountedRef.current && shouldReconnect) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    connect();
    const currentWs = wsRef.current;

    return () => {
      wsRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (currentWs) {
        currentWs.close();
      }
    };
  }, [isAuthenticated, token, connect]);

  useEffect(() => {
    if (isAuthenticated && token && !wsRef.current) {
      const id = setTimeout(connect, 500);
      return () => clearTimeout(id);
    }
  }, [isAuthenticated, token, connect]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const slashMatch = content.match(/^\/(\w+)(?:\s+(.*))?$/);
    if (slashMatch) {
      const command = '/' + slashMatch[1].toLowerCase();
      const args = slashMatch[2] || '';

      // New session — clear UI + server conversation without starting a chat turn
      if (command === '/new' || command === '/clear' || command === '/reset' || command === '/session') {
        setCurrentToolCall(null);
        setError(null);
        setMessages([]);
        wsRef.current.send(JSON.stringify({ type: 'slash', command, args }));
        return;
      }

      const userMsg: AgentMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      const assistantPlaceholder: AgentMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        isThinking: true,
        toolCalls: [],
      };
      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setCurrentToolCall(null);
      setError(null);

      if (command === '/argu' || command === '/auto') {
        wsRef.current.send(JSON.stringify({ type: 'slash', command, args }));
        return;
      }
    }

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const assistantPlaceholder: AgentMessage = {
      id: `assistant-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isThinking: true,
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setCurrentToolCall(null);
    setError(null);

    wsRef.current.send(JSON.stringify({ type: 'chat', content }));
  }, []);

  const resetConversation = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setMessages([]);
    setCurrentToolCall(null);
    setError(null);
    wsRef.current.send(JSON.stringify({ type: 'reset' }));
  }, []);

  const sendCancel = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'cancel' }));
    setMessages((prev) =>
      prev.map((m) =>
        m.role === 'assistant' && m.isStreaming ? { ...m, isStreaming: false, isThinking: false } : m
      )
    );
    setCurrentToolCall(null);
  }, []);

  const isBusy =
    !!currentToolCall ||
    messages.some((m) => m.role === 'assistant' && m.isStreaming);

  const sessionActive = messages.some((m) => m.role === 'user');

  return (
    <AgentContext.Provider
      value={{
        connected,
        messages,
        currentToolCall,
        error,
        isBusy,
        sessionActive,
        sendMessage,
        resetConversation,
        sendCancel,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
