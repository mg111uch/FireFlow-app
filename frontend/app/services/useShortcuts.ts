'use client';

import { useState, useEffect, useCallback } from 'react';
import { services } from '@/lib/services-data';
import { useShortcutsContext } from './ShortcutsContext';

export interface Shortcut {
  id: string;
  label: string;
  link: string;
  iconIndex: number;
}

const MAX_SHORTCUTS = 5;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useShortcuts() {
  const context = useShortcutsContext();
  const { shortcuts, addShortcut, removeShortcut, updateShortcut } = context;

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

  return {
    ...context,
    shortcuts: context.shortcuts,
    isLoaded: context.isLoaded,
    addShortcut: context.addShortcut,
    removeShortcut: context.removeShortcut,
    updateShortcut: context.updateShortcut,
    getAvailableSubservices,
    maxShortcuts: MAX_SHORTCUTS,
    availableIcons: context.availableIcons,
  };
}