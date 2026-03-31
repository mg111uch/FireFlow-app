'use client';

import React from 'react';
import Link from 'next/link';
import { useShortcutsContext } from './ShortcutsContext';

interface ShortcutBarProps {
  onEditClick: () => void;
}

export default function ShortcutBar({ onEditClick }: ShortcutBarProps) {
  const { shortcuts, isLoaded } = useShortcutsContext();

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-700">
      
      {shortcuts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.id}
              href={shortcut.link}
              className="flex flex-col items-center justify-center bg-gray-900 hover:bg-gray-800 p-3 rounded-lg transition-colors min-w-[70px]"
            >
              <div className="w-10 h-10 bg-gray-700 flex items-center justify-center text-white font-bold rounded mb-2">
                {shortcut.iconIndex + 1}
              </div>
              <span className="text-xs text-gray-300 text-center">{shortcut.label}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex justify-center mt-3">
        <button
          onClick={onEditClick}
          className="flex items-center gap-2 text-sm text-gray-300 bg-gray-700 rounded-full pl-4 pr-4 pt-1 pb-1"
        >
          Add Shortcuts
          <span className="text-lg">&#9881;</span>
        </button>
      </div>
    </div>
  );
}