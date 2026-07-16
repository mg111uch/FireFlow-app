'use client';

import { AgentProvider } from '@/context/AgentContext';
import AgentHeader from './AgentHeader';
import AgentChat from './AgentChat';
import AgentInput from './AgentInput';

export default function AgentPage() {
  return (
    <AgentProvider>
      <div className="flex h-screen flex-col bg-zinc-950 -mt-16 pt-16 -mb-20">
        <AgentHeader />
        <div className="min-h-0 flex-1">
          <AgentChat />
        </div>
        <AgentInput />
      </div>
    </AgentProvider>
  );
}
