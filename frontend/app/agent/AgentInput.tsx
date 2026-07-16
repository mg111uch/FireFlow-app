'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAgent } from '@/context/AgentContext';
import { useAuth } from '@/context/AuthContext';
import { AGENT_API_URL } from '@/lib/config';
import { SendIcon } from '@/lib/icons';
import axios from 'axios';
import { flattenFileTree, FileMentionDropdown, SlashDropdown } from './InputDropdowns';
import type { FileEntry } from './InputDropdowns';

const SLASH_COMMANDS = [
  { command: '/new', description: 'Start a new session' },
  { command: '/argu', description: 'Explore an argument \u2014 /argu explore <topic>' },
  { command: '/auto', description: 'Run auto research \u2014 /auto <goal>' },
];

export default function AgentInput() {
  const { sendMessage, sendCancel, connected, isBusy } = useAgent();
  const { token } = useAuth();
  const [input, setInput] = useState('');
  const [slashOpen, setSlashOpen] = useState(false);
  const [atMentionOpen, setAtMentionOpen] = useState(false);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    axios.get(`${AGENT_API_URL}/api/files/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      const tree = res.data?.tree;
      if (tree?.children) {
        setFilePaths(flattenFileTree(tree.children));
      }
    }).catch(() => {});
  }, [token]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const getFilteredCommands = (text: string) => {
    const match = text.match(/^\/(\w*)$/);
    if (!match) return [];
    const partial = '/' + match[1].toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.command.startsWith(partial));
  };

  const getAtQuery = (text: string): string | null => {
    const caretPos = textareaRef.current?.selectionStart ?? text.length;
    const beforeCaret = text.slice(0, caretPos);
    const atMatch = beforeCaret.match(/@([\w/.-]*)$/);
    return atMatch ? atMatch[1] : null;
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

  const updateAtMentionState = (text: string) => {
    const query = getAtQuery(text);
    if (query !== null && filePaths.length > 0) {
      const filtered = query
        ? filePaths.filter((p) => p.toLowerCase().includes(query.toLowerCase()))
        : filePaths;
      setFilteredFiles(filtered.slice(0, 20));
      setAtMentionOpen(filtered.length > 0);
      setSelectedIndex((prev) => Math.min(prev, filtered.length - 1));
    } else {
      setAtMentionOpen(false);
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

  const insertAtText = (text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const caretPos = el.selectionStart ?? input.length;
    const beforeCaret = input.slice(0, caretPos);
    const afterCaret = input.slice(caretPos);
    const atMatch = beforeCaret.match(/^(.*)@[\w/.-]*$/);
    if (atMatch) {
      const newInput = atMatch[1] + text + ' ' + afterCaret;
      setInput(newInput);
      el.value = newInput;
      const newPos = atMatch[1].length + text.length + 1;
      el.setSelectionRange(newPos, newPos);
    }
    setAtMentionOpen(false);
    resizeTextarea();
    el.focus();
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
    updateAtMentionState(text);
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

    if (atMentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          insertAtText(filteredFiles[selectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setAtMentionOpen(false);
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
    setAtMentionOpen(false);
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
          {atMentionOpen && (
            <FileMentionDropdown
              files={filteredFiles}
              selectedIndex={selectedIndex}
              onInsert={insertAtText}
              onSelectIndex={setSelectedIndex}
            />
          )}
          {slashOpen && (
            <SlashDropdown
              commands={filteredCommands}
              selectedIndex={selectedIndex}
              onSelect={selectCommand}
              onSelectIndex={setSelectedIndex}
            />
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

            {isBusy ? (
              <button
                type="button"
                onClick={sendCancel}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white transition-colors hover:bg-red-500"
                aria-label="Stop generation"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!connected || !input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
                aria-label="Send message"
              >
                <span className="scale-75">
                  <SendIcon />
                </span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
