'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_KEY } from "@/lib/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({apiKey:API_KEY});

const RATE_LIMIT_MS = 10000;
const STORAGE_KEY = 'gemini_last_request_time';

export function getLastRequestTime(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function setLastRequestTime(time: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, time.toString());
}

export function getTimeUntilNextRequest(): number {
  const lastRequestTime = getLastRequestTime();
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const remaining = RATE_LIMIT_MS - timeSinceLastRequest;
  return remaining > 0 ? remaining : 0;
}

export function useGemini() {
  const [waitTime, setWaitTime] = useState(0);
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    const updateWaitTime = () => {
      const remaining = getTimeUntilNextRequest();
      setWaitTime(remaining);
      setIsReady(remaining === 0);
    };

    updateWaitTime();
    const interval = setInterval(updateWaitTime, 100);

    return () => clearInterval(interval);
  }, []);

  const rateLimit = useCallback(async () => {
    const now = Date.now();
    const lastRequestTime = getLastRequestTime();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_MS) {
      const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    setLastRequestTime(Date.now());
  }, []);

  const callGemini = useCallback(async (prompt: string): Promise<string> => {
    await rateLimit();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    return response.text || "";
  }, [rateLimit]);

  return {
    waitTime,
    isReady,
    rateLimit,
    callGemini,
  };
}
