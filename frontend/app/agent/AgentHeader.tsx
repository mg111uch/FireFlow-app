'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAgent } from '@/context/AgentContext';
import { AGENT_API_URL } from '@/lib/config';
import axios from 'axios';
import type { ProviderInfo, ProvidersResponse, ProviderCatalogEntry } from '@/lib/agent';

export default function AgentHeader() {
  const { token } = useAuth();
  const { connected, sessionActive, isBusy, llmCallActive } = useAgent();
  const canChangeModel = !sessionActive && !isBusy;
  const [active, setActive] = useState<ProviderInfo | null>(null);
  const [catalog, setCatalog] = useState<Record<string, ProviderCatalogEntry>>({});
  const [open, setOpen] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

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
    if (!token) return;
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
                ? `bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] ${llmCallActive ? 'animate-pulse' : ''}`
                : 'bg-amber-400 animate-pulse'
            }`}
            title={connected ? (llmCallActive ? 'LLM call…' : 'Connected') : 'Connecting'}
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
                : 'Model locked for this session \u2014 use /new to start a new session'
            }
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
              canChangeModel
                ? 'border-zinc-700/80 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
                : 'cursor-not-allowed border-zinc-800 bg-zinc-900/50 text-zinc-500 opacity-70'
            }`}
          >
            <span className="max-w-[11rem] truncate">
              {active ? `${active.provider} · ${active.model}` : 'loading\u2026'}
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
