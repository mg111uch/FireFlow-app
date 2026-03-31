'use client';

import React, { useState } from 'react';
import { useShortcutsContext } from './ShortcutsContext';

interface ShortcutSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutSettings({ isOpen, onClose }: ShortcutSettingsProps) {
  const {
    shortcuts,
    addShortcut,
    removeShortcut,
    getAvailableSubservices,
    maxShortcuts,
    availableIcons,
  } = useShortcutsContext();

  const [label, setLabel] = useState('');
  const [link, setLink] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [customLink, setCustomLink] = useState('');

  const subservices = getAvailableSubservices();
  const iconOptions = availableIcons.slice(0, 5);

  const handleSelectSubservice = (sub: { label: string; link: string }) => {
    setLabel(sub.label);
    setLink(sub.link);
    setShowForm(true);
  };

  const handleCustomLink = () => {
    if (!customLink.trim()) return;
    setLabel('');
    setLink(customLink);
    setShowForm(true);
  };

  const handleAddShortcut = () => {
    if (!label.trim() || !link.trim()) return;
    addShortcut(label.trim(), link.trim(), selectedIcon);
    setLabel('');
    setLink('');
    setSelectedIcon(0);
    setShowForm(false);
    setCustomLink('');
    onClose();
  };

  const handleCancel = () => {
    setLabel('');
    setLink('');
    setSelectedIcon(0);
    setShowForm(false);
    setCustomLink('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Manage Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {shortcuts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm text-gray-400 mb-2">Current Shortcuts ({shortcuts.length}/{maxShortcuts})</h3>
              <div className="space-y-2">
                {shortcuts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-900 flex items-center justify-center text-white text-xs font-bold rounded">
                        {s.iconIndex + 1}
                      </div>
                      <span className="text-white text-sm">{s.label}</span>
                    </div>
                    <button
                      onClick={() => removeShortcut(s.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showForm ? (
            <div className="space-y-4">
              <h3 className="text-sm text-gray-400">Add New Shortcut</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                  placeholder="Shortcut name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Link</label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                  placeholder="/services/..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedIcon(idx)}
                      className={`w-8 h-8 flex items-center justify-center font-bold text-sm transition-colors rounded ${
                        selectedIcon === idx
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddShortcut}
                  disabled={!label.trim() || !link.trim() || shortcuts.length >= maxShortcuts}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add Shortcut
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {shortcuts.length < maxShortcuts && (
                <>
                  <div className="mb-4">
                    <h3 className="text-sm text-gray-400 mb-2">Add from Subservices</h3>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {subservices.slice(0, 50).map((sub, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectSubservice(sub)}
                          className="w-full text-left px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2">Add Custom Link</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customLink}
                        onChange={(e) => setCustomLink(e.target.value)}
                        placeholder="/custom-path"
                        className="flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600"
                      />
                      <button
                        onClick={handleCustomLink}
                        disabled={!customLink.trim()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </>
              )}
              {shortcuts.length >= maxShortcuts && (
                <p className="text-center text-gray-400">Maximum {maxShortcuts} shortcuts reached.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}