'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { services } from '@/lib/services-data';

export interface Shortcut {
  id: string;
  label: string;
  link: string;
  iconIndex: number;
}

const STORAGE_KEY = 'serviceShortcuts';
const MAX_SHORTCUTS = 5;

const DEFAULT_ICONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStoredShortcuts(): Shortcut[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveShortcuts(shortcuts: Shortcut[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
}

interface ShortcutsContextType {
  shortcuts: Shortcut[];
  isLoaded: boolean;
  addShortcut: (label: string, link: string, iconIndex?: number) => void;
  removeShortcut: (id: string) => void;
  updateShortcut: (id: string, updates: Partial<Shortcut>) => void;
  getAvailableSubservices: () => { label: string; link: string }[];
  maxShortcuts: number;
  availableIcons: string[];
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setShortcuts(getStoredShortcuts());
    setIsLoaded(true);
  }, []);

  const addShortcut = useCallback((label: string, link: string, iconIndex: number = 0) => {
    setShortcuts((prev) => {
      if (prev.length >= MAX_SHORTCUTS) return prev;
      const newShortcut: Shortcut = {
        id: generateId(),
        label,
        link,
        iconIndex: iconIndex % DEFAULT_ICONS.length,
      };
      const updated = [...prev, newShortcut];
      saveShortcuts(updated);
      return updated;
    });
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveShortcuts(updated);
      return updated;
    });
  }, []);

  const updateShortcut = useCallback((id: string, updates: Partial<Shortcut>) => {
    setShortcuts((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveShortcuts(updated);
      return updated;
    });
  }, []);

  const getAvailableSubservices = useCallback(() => {
    const all: { label: string; link: string }[] = [];
    services.forEach((service) => {
      service.subservices.forEach((subservice) => {
        const slugName = encodeURIComponent(subservice.name.toLowerCase().replace(/\s+/g, '-'));
        all.push({
          label: subservice.name,
          link: `/services/${service.slug}/${slugName}`,
        });
      });
    });
    return all;
  }, []);

  return (
    <ShortcutsContext.Provider
      value={{
        shortcuts,
        isLoaded,
        addShortcut,
        removeShortcut,
        updateShortcut,
        getAvailableSubservices,
        maxShortcuts: MAX_SHORTCUTS,
        availableIcons: DEFAULT_ICONS,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcutsContext() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcutsContext must be used within ShortcutsProvider');
  }
  return context;
}