'use client';

import { useEffect, useRef } from 'react';

interface SlashCommand {
  command: string;
  description: string;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'dir';
  children?: FileEntry[];
  truncated?: boolean;
}

export function flattenFileTree(entries: FileEntry[], prefix = ''): string[] {
  const result: string[] = [];
  for (const e of entries) {
    const path = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.type === 'file') {
      result.push(path);
    }
    if (e.children) {
      result.push(...flattenFileTree(e.children, path));
    }
  }
  return result;
}

export function FileMentionDropdown({
  files,
  selectedIndex,
  onInsert,
  onSelectIndex,
}: {
  files: string[];
  selectedIndex: number;
  onInsert: (file: string) => void;
  onSelectIndex: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (files.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40"
    >
      <div className="border-b border-zinc-800 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        Files
      </div>
      <div className="max-h-48 overflow-y-auto">
        {files.map((fp, i) => (
          <button
            key={fp}
            data-idx={i}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onInsert(fp);
            }}
            onMouseEnter={() => onSelectIndex(i)}
            className={`flex w-full items-center gap-2 px-4 py-2 text-left font-mono text-xs transition-colors ${
              i === selectedIndex
                ? 'bg-zinc-700/80 text-zinc-100'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <svg className="h-3 w-3 shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {fp}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SlashDropdown({
  commands,
  selectedIndex,
  onSelect,
  onSelectIndex,
}: {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: string) => void;
  onSelectIndex: (index: number) => void;
}) {
  if (commands.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40">
      {commands.map((cmd, i) => (
        <button
          key={cmd.command}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(cmd.command);
          }}
          onMouseEnter={() => onSelectIndex(i)}
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
  );
}
