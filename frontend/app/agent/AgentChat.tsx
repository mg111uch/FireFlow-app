'use client';

import { useState, useRef, useEffect } from 'react';
import { useAgent } from '@/context/AgentContext';
import type { AgentMessage, ToolCall } from '@/lib/agent';
import QuestionPanel from './QuestionPanel';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!text}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Copy message"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function messageCopyText(message: AgentMessage): string {
  const parts: string[] = [];
  if (message.content) parts.push(message.content);
  if (message.toolCalls?.length) {
    for (const tc of message.toolCalls) {
      parts.push(`[tool: ${tc.tool}]\ninput: ${tc.input}${tc.result ? `\nresult: ${tc.result}` : ''}`);
    }
  }
  return parts.join('\n\n').trim();
}

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const done = !!toolCall.result;

  const isPathTool =
    toolCall.tool === 'read_file' || toolCall.tool === 'list_files' ||
    toolCall.tool === 'edit_file' || toolCall.tool === 'write_to_file';

  let inlineValue: string | null = null;
  if (toolCall.input) {
    if (isPathTool) {
      try {
        const parsed = JSON.parse(toolCall.input);
        inlineValue = parsed?.path ?? null;
      } catch {
        inlineValue = null;
      }
    } else {
      inlineValue = toolCall.input;
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-zinc-800/60"
      >
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs">
          <span className="shrink-0 truncate text-zinc-300">{toolCall.tool}</span>
          {inlineValue && (
            <span className="flex min-w-0 flex-1 items-center gap-1 text-zinc-500">
              <span className="text-zinc-600">·</span>
              <span
                className="min-w-0 flex-1 truncate text-zinc-400"
                style={{ direction: 'rtl', textAlign: 'left' }}
              >
                {inlineValue}
              </span>
            </span>
          )}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-zinc-800 px-3 py-2.5">
          {(toolCall.tool === 'edit_file' || toolCall.tool === 'write_to_file' || toolCall.tool === 'execute_command') && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Input
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-400">
                {toolCall.input || '—'}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Result
              </p>
              <pre className="max-h-36 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-400">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBlock({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user';
  const copyText = messageCopyText(message);
  const showBody =
    !!message.content ||
    (message.toolCalls && message.toolCalls.length > 0) ||
    message.isThinking ||
    message.isStreaming;

  if (isUser) {
    return (
      <div className="mb-5 flex flex-col items-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-sky-500/20 bg-sky-600/15 px-4 py-2.5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">
            {message.content}
          </p>
        </div>
        <div className="mt-1.5 pr-0.5">
          <CopyButton text={copyText} />
        </div>
      </div>
    );
  }

  const showThinking =
    !!message.isThinking && !message.content && !(message.toolCalls?.length);

  return (
    <div className="mb-6">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-medium text-zinc-500">Agent</span>
        {showThinking && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-sky-400/90">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            Thinking…
          </span>
        )}
        {message.isStreaming && !showThinking && (
          <span className="text-[10px] text-sky-400/80">streaming</span>
        )}
      </div>
      <div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className={`space-y-1.5 ${message.content ? 'mb-3' : ''}`}>
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={`${tc.step}-${tc.tool}`} toolCall={tc} />
            ))}
          </div>
        )}

        {message.content && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">
            {message.content}
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-sky-400 align-middle" />
            )}
          </p>
        )}

        {showBody && !showThinking && (
          <div className="mt-1.5">
            <CopyButton text={copyText} />
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Explain this repo structure',
  'Find and fix a bug',
  'Add a new feature',
  'Write tests for a module',
];


export default function AgentChat() {
  const { messages, error, currentToolCall, connected, sendMessage, pendingQuestions, submitQuestionAnswer } = useAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, currentToolCall]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl space-y-1">
        {!connected && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200/90">
            Connecting to agent server…
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center px-4 pt-8 text-center sm:pt-12">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <svg
                className="h-6 w-6 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium tracking-tight text-zinc-100">
              What should we work on?
            </h2>
            <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
              Describe a coding task. The agent can read files, run tools, and iterate with you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  disabled={!connected}
                  onClick={() => sendMessage(text)}
                  className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text}
                </button>
              ))}
            </div>

          </div>
        )}

        {messages.map((msg) => (
          <MessageBlock key={msg.id} message={msg} />
        ))}

        {pendingQuestions && (
          <QuestionPanel
            questions={pendingQuestions}
            onSubmit={submitQuestionAnswer}
          />
        )}

        {currentToolCall && !currentToolCall.result && (
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300/90">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              Running <span className="font-mono">{currentToolCall.tool}</span>…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>
    </div>
  );
}
