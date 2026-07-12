'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AgentProvider, useAgent } from '@/context/AgentContext';
import AgentChat from '@/components/agent/AgentChat';
import { AGENT_API_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { SendIcon } from '@/lib/icons';
import axios from 'axios';
import type { ProviderInfo, ProvidersResponse, ProviderCatalogEntry } from '@/lib/agent';

interface SlashCommand {
  command: string;
  description: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/new', description: 'Start a new session' },
  { command: '/argu', description: 'Explore an argument — /argu explore <topic>' },
  { command: '/auto', description: 'Run auto research — /auto <goal>' },
];

function AgentHeader() {
  const { token } = useAuth();
  const { connected, sessionActive, isBusy } = useAgent();
  const [active, setActive] = useState<ProviderInfo | null>(null);
  const [catalog, setCatalog] = useState<Record<string, ProviderCatalogEntry>>({});
  const [open, setOpen] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canChangeModel = !sessionActive && !isBusy;

  const fetchProviders = useCallback(() => {
    if (!token) return;
    axios
      .get(`${AGENT_API_URL}/api/providers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data: ProvidersResponse = res.data;
        setActive(data.active);
        setCatalog(data.catalog);
      })
      .catch(() => {});
  }, [token]);

  // Refresh only the model catalog without clobbering the locally-selected active model
  const refreshCatalog = useCallback(() => {
    if (!token) return;
    axios
      .get(`${AGENT_API_URL}/api/providers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data: ProvidersResponse = res.data;
        setCatalog(data.catalog);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // After /new, refresh the model catalog but keep the user's selected model
  useEffect(() => {
    if (!sessionActive) {
      refreshCatalog();
    }
  }, [sessionActive, refreshCatalog]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const switchProvider = async (p: ProviderInfo) => {
    if (!token || !canChangeModel) return;
    setSwitchError(null);
    try {
      const res = await axios.post(
        `${AGENT_API_URL}/api/switch-provider`,
        { provider: p.provider, model: p.model },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.error) {
        setSwitchError(res.data.error);
        return;
      }
      setActive(res.data?.active ?? p);
      setOpen(false);
    } catch (err: unknown) {
      const detail =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Failed to switch model';
      setSwitchError(detail);
    }
  };

  return (
    <header className="z-10 shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              connected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : 'bg-amber-400 animate-pulse'
            }`}
            title={connected ? 'Connected' : 'Connecting'}
          />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium tracking-tight text-zinc-100">
              Coding Agent
            </h1>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              disabled={!canChangeModel}
              onClick={() => canChangeModel && setOpen(!open)}
              title={
                canChangeModel
                  ? 'Change model'
                  : 'Model locked for this session — use /new to start a new session'
              }
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
                canChangeModel
                  ? 'border-zinc-700/80 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
                  : 'cursor-not-allowed border-zinc-800 bg-zinc-900/50 text-zinc-500 opacity-70'
              }`}
            >
              <span className="max-w-[11rem] truncate">
                {active ? `${active.provider} · ${active.model}` : 'loading…'}
              </span>
              <svg
                className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          {switchError && (
            <p className="absolute right-0 top-full mt-1 max-w-[14rem] text-[10px] text-red-400">
              {switchError}
            </p>
          )}
          {open && canChangeModel && (
            <div className="absolute right-0 z-20 mt-2 max-h-72 w-60 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40">
              <p className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Model
              </p>
              {Object.keys(catalog).length === 0 && (
                <p className="px-3 py-3 text-xs text-zinc-500">
                  No providers registered. Set API keys on the agent server.
                </p>
              )}
              {Object.entries(catalog).map(([providerName, entry]) => (
                <div key={providerName}>
                  <p className="border-b border-zinc-800/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                    {providerName}
                  </p>
                  {entry.models.map((model) => {
                    const isActive =
                      active?.provider === providerName && active?.model === model;
                    return (
                      <button
                        key={`${providerName}/${model}`}
                        type="button"
                        onClick={() => switchProvider({ provider: providerName, model })}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 pl-6 text-left text-xs font-mono transition-colors hover:bg-zinc-800 ${
                          isActive ? 'bg-zinc-800 text-sky-400' : 'text-zinc-300'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            isActive ? 'bg-sky-400' : 'bg-zinc-600'
                          }`}
                        />
                        {model}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function AgentInput() {
  const { sendMessage, connected, isBusy } = useAgent();
  const [input, setInput] = useState('');
  const [slashOpen, setSlashOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    if (!slashOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setSlashOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [slashOpen]);

  const getFilteredCommands = (text: string): SlashCommand[] => {
    const match = text.match(/^\/(\w*)$/);
    if (!match) return [];
    const partial = '/' + match[1].toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.command.startsWith(partial));
  };

  const updateSlashState = (text: string) => {
    const filtered = getFilteredCommands(text);
    if (filtered.length > 0) {
      setSlashOpen(true);
      setSelectedIndex((prev) => Math.min(prev, filtered.length - 1));
    } else {
      setSlashOpen(false);
    }
  };

  const submit = () => {
    if (!input.trim() || !connected || isBusy) return;
    sendMessage(input.trim());
    setInput('');
    setSlashOpen(false);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const selectCommand = (cmd: string) => {
    const newText = cmd + ' ';
    setInput(newText);
    setSlashOpen(false);
    if (textareaRef.current) {
      textareaRef.current.value = newText;
    }
    resizeTextarea();
    textareaRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    updateSlashState(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const filtered = getFilteredCommands(input);
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const filtered = getFilteredCommands(input);
        if (filtered[selectedIndex]) {
          selectCommand(filtered[selectedIndex].command);
        }
        return;
      }
      if (e.key === 'Escape') {
        setSlashOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleScroll = () => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const filteredCommands = getFilteredCommands(input);

  return (
    <div className="z-10 shrink-0 border-t border-zinc-800/60 bg-zinc-950/95 pb-4 pt-3 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4">
        <div
          className={`relative rounded-2xl border bg-zinc-900/90 shadow-lg shadow-black/30 backdrop-blur-sm transition-colors ${
            connected
              ? 'border-zinc-700/80 focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/30'
              : 'border-zinc-800 opacity-80'
          }`}
        >
          {slashOpen && filteredCommands.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40"
            >
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.command}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCommand(cmd.command);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIndex
                      ? 'bg-zinc-700/80 text-zinc-100'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="font-mono text-sm font-semibold text-sky-400">
                    {cmd.command}
                  </span>
                  <span className="text-xs text-zinc-500">{cmd.description}</span>
                </button>
              ))}
            </div>
          )}

          <div
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-4 pb-2 pt-3.5 text-sm leading-relaxed"
            aria-hidden="true"
          >
            {input ? (
              (() => {
                const match = input.match(/^(\/\w+)(.*)$/);
                if (match) {
                  return (
                    <>
                      <strong className="font-semibold text-zinc-100">{match[1]}</strong>
                      <span className="text-zinc-100">{match[2]}</span>
                    </>
                  );
                }
                return <span className="text-zinc-100">{input}</span>;
              })()
            ) : (
              <span className="text-zinc-500">
                {connected
                  ? 'Ask the agent to build, fix, or explore\u2026'
                  : 'Connecting to agent\u2026'}
              </span>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            placeholder=""
            disabled={!connected || isBusy}
            rows={1}
            className="relative max-h-40 min-h-[48px] w-full resize-none bg-transparent px-4 pb-2 pt-3.5 text-sm leading-relaxed text-transparent caret-zinc-100 outline-none disabled:cursor-not-allowed"
          />

          <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-0.5">
            <p className="hidden text-[11px] text-zinc-600 sm:block">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-400">
                Enter
              </kbd>{' '}
              send {'\u00b7'}{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-400">
                Shift+Enter
              </kbd>{' '}
              newline
            </p>
            <p className="text-[11px] text-zinc-600 sm:hidden">
              {connected ? (isBusy ? 'Busy' : 'Ready') : 'Offline'}
            </p>

            <button
              type="submit"
              disabled={!connected || !input.trim() || isBusy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
              aria-label="Send message"
            >
              <span className="scale-75">
                <SendIcon />
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function AgentPage() {
  return (
    <AgentProvider>
      {/*
        Flex column under site nav (-mt-16 + pt-16): header and input are in-flow
        (not position:fixed) so the first message never slides under "Coding Agent".
      */}
      <div className="flex h-screen flex-col bg-zinc-950 -mt-16 pt-16 -mb-20">
        <AgentHeader />
        <div className="min-h-0 flex-1">
          <AgentChat />
        </div>
        <AgentInput />
      </div>
    </AgentProvider>
  );
}
