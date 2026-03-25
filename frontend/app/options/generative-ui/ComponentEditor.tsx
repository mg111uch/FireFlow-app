'use client';

import React, { useState } from 'react';
import { GenericElement } from './utils';

interface ComponentEditorProps {
  component: GenericElement;
  onSave: (updated: GenericElement) => void;
  onClose: () => void;
}

export function ComponentEditor({ component, onSave, onClose }: ComponentEditorProps) {
  const [tag, setTag] = useState(component.tag || component.type || '');
  const [className, setClassName] = useState(component.className || component.class || '');
  const [children, setChildren] = useState(
    typeof component.children === 'string' ? component.children : 
    typeof component.text === 'string' ? component.text :
    typeof component.content === 'string' ? component.content : ''
  );
  const [propsStr, setPropsStr] = useState(
    component.props ? JSON.stringify(component.props, null, 2) : ''
  );

  const handleSave = () => {
    const updated: GenericElement = {
      ...component,
      tag,
      className,
    };
    
    if (children.trim()) {
      updated.children = children;
    } else {
      delete updated.children;
    }
    
    if (propsStr.trim()) {
      try {
        updated.props = JSON.parse(propsStr);
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Component</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="div, button, input, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name (Tailwind)</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="bg-blue-600 text-white px-4 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Children / Text</label>
            <textarea
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Button text or nested elements"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Props (JSON)</label>
            <textarea
              value={propsStr}
              onChange={(e) => setPropsStr(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"type": "email", "placeholder": "Enter email"}'
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
