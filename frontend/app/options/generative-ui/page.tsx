'use client';

import React, { useState } from 'react';
import { useGemini } from '@/hooks/useGemini';
import { examplePrompts } from './examplePrompts';
import { GenericElement, parseGeminiResponse } from './utils';
import { renderGenericElement } from './ElementRenderer';
import { ComponentEditor } from './ComponentEditor';

function formatWaitTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${seconds}s`;
}

function RateLimitStatus({ isReady, waitTime }: { isReady: boolean; waitTime: number }) {
  const statusColor = isReady ? 'bg-green-500' : 'bg-red-500';
  const statusTextColor = isReady ? 'text-green-500' : 'text-red-500';
  const statusText = isReady ? 'Ready' : 'Wait ' + formatWaitTime(waitTime);

  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm text-gray-400">Rate Limit Status:</span>
      <div className="flex items-center gap-2">
        <span className={'w-3 h-3 rounded-full ' + statusColor}></span>
        <span className={statusTextColor}>{statusText}</span>
      </div>
    </div>
  );
}

function GeneratedUI({ components, onComponentClick, onAddComponent }: { 
  components: GenericElement[]; 
  onComponentClick: (index: number) => void; 
  onAddComponent: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2 pl-2">
        <h2 className="text-xl font-semibold">Generated UI</h2>
        <button
          onClick={onAddComponent}
          className="bg-green-600 text-white px-4 py-1 rounded-md hover:bg-green-700 text-sm"
        >
          + Add Component
        </button>
      </div>
      <div className="bg-gray-100 p-6 rounded-md">
        {components.map((comp, index) => 
          renderGenericElement(comp, index, () => onComponentClick(index))
        )}
      </div>
      <p className="text-sm text-gray-500 mt-2 pl-2">Click on any element to edit it</p>
    </div>
  );
}

function TextResult({ text }: { text: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 pl-2">Result</h2>
      <div>
        {text}
      </div>
    </div>
  );
}

export default function GenerativeUIPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedUI, setGeneratedUI] = useState<string | null>(null);
  const [parsedComponents, setParsedComponents] = useState<GenericElement[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const { waitTime, isReady, rateLimit, callGemini } = useGemini();

  const handleGenerate = async () => {
    if (!prompt.trim() || !isReady) return;
    
    setLoading(true);
    
    try {
      await rateLimit();
      const result = await callGemini(prompt);
      const parsed = parseGeminiResponse(result);
      
      if (parsed.success && parsed.components) {
        setParsedComponents(parsed.components);
        setGeneratedUI(null);
      } else {
        setGeneratedUI(parsed.rawText || result);
        setParsedComponents(null);
      }
    } catch (error) {
      console.error('Error generating UI:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentClick = (index: number) => setEditingIndex(index);

  const handleComponentSave = (updated: GenericElement) => {
    if (parsedComponents && editingIndex !== null) {
      const newComponents = [...parsedComponents];
      newComponents[editingIndex] = updated;
      setParsedComponents(newComponents);
    }
    setEditingIndex(null);
  };

  const handleDeleteComponent = () => {
    if (parsedComponents && editingIndex !== null) {
      setParsedComponents(parsedComponents.filter((_, i) => i !== editingIndex));
    }
    setEditingIndex(null);
  };

  const handleAddComponent = () => {
    if (parsedComponents) {
      const newComponent: GenericElement = { tag: 'div', className: 'p-4', children: 'New Element' };
      setParsedComponents([...parsedComponents, newComponent]);
      setEditingIndex(parsedComponents.length);
    }
  };

  const buttonText = loading ? 'Generating...' : (isReady ? 'Generate UI' : `Wait ${Math.ceil(waitTime / 1000)}s`);

  return (
    <div className="container mx-auto pt-2">
      <h1 className="text-2xl font-bold ml-2 mb-2">Generative UI</h1>
      
      <div className="bg-gray-900 rounded-lg p-2 mb-2">
        <RateLimitStatus isReady={isReady} waitTime={waitTime} />

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the UI you want to create (e.g., A login form with email and password fields)"
          className="w-full h-32 p-3 bg-gray-800 text-white border border-gray-700 rounded-md mb-4 focus:outline-none focus:border-blue-500"
        />
        
        <div className="flex gap-2">
          <select
            onChange={(e) => {
              const selected = examplePrompts.find(p => p.name === e.target.value);
              if (selected) setPrompt(selected.prompt);
              e.target.value = '';
            }}
            className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>Load Example</option>
            {examplePrompts.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || !isReady}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonText}
          </button>
        </div>
      </div>

      {parsedComponents && (
        <GeneratedUI 
          components={parsedComponents} 
          onComponentClick={handleComponentClick}
          onAddComponent={handleAddComponent}
        />
      )}

      {generatedUI && !parsedComponents && <TextResult text={generatedUI} />}

      {editingIndex !== null && parsedComponents && (
        <ComponentEditor
          component={parsedComponents[editingIndex]}
          onSave={handleComponentSave}
          onClose={() => setEditingIndex(null)}
        />
      )}
      
      {editingIndex !== null && parsedComponents && (
        <button
          onClick={handleDeleteComponent}
          className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 shadow-lg"
        >
          Delete Component
        </button>
      )}
    </div>
  );
}
