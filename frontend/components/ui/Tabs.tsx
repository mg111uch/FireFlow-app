'use client';

import React from 'react';
import { ReactNode } from 'react';

export interface Tab {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const hasIcons = tabs.some(tab => tab.icon !== undefined);

  return (
    <div className="flex border-b border-gray-300 mb-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`w-1/2 py-2 px-4 text-lg font-semibold ${
            activeTab === tab.value 
              ? 'border-b-2 border-blue-500 text-blue-500' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => onChange(tab.value)}
        >
          {hasIcons && tab.icon ? (
            <span className="flex items-center justify-center">
              {tab.icon}
            </span>
          ) : (
            tab.label
          )}
        </button>
      ))}
    </div>
  );
}
