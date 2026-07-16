'use client';

import { useState } from 'react';
import type { AgentQuestion } from '@/lib/agent';

interface QuestionPanelProps {
  questions: AgentQuestion[];
  onSubmit: (answers: string[]) => void;
}

export default function QuestionPanel({ questions, onSubmit }: QuestionPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(
    () => questions.map(() => '')
  );
  const [customMode, setCustomMode] = useState<boolean[]>(
    () => questions.map(() => false)
  );
  const total = questions.length;
  const current = questions[currentIndex];
  const isLast = currentIndex === total - 1;

  const setAnswer = (value: string) => {
    const next = [...answers];
    next[currentIndex] = value;
    setAnswers(next);
  };

  const selectOption = (option: string) => {
    setAnswer(option);
    setCustomMode((prev) => {
      const next = [...prev];
      next[currentIndex] = false;
      return next;
    });
  };

  const enableCustom = () => {
    setCustomMode((prev) => {
      const next = [...prev];
      next[currentIndex] = true;
      return next;
    });
    setAnswer('');
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const hasAnswer = answers[currentIndex]?.trim().length > 0;
  const options = current.options || [];

  return (
    <div className="mb-4 rounded-xl border border-zinc-700/80 bg-zinc-900/80 p-4">
      {total > 1 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">
              Question {currentIndex + 1} of {total}
            </span>
          </div>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i === currentIndex
                    ? 'bg-sky-500'
                    : i < currentIndex
                      ? 'bg-sky-500/40'
                      : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <p className="mb-3 text-sm leading-relaxed text-zinc-200">
        {current.question}
      </p>

      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => selectOption(opt)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              answers[currentIndex] === opt && !customMode[currentIndex]
                ? 'border-sky-500/50 bg-sky-600/20 text-sky-300'
                : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            {opt}
          </button>
        ))}

        <button
          type="button"
          onClick={enableCustom}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
            customMode[currentIndex]
              ? 'border-sky-500/50 bg-sky-600/20 text-sky-300'
              : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'
          }`}
        >
          Custom answer…
        </button>

        {customMode[currentIndex] && (
          <textarea
            value={answers[currentIndex]}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer…"
            rows={2}
            className="mt-1 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-colors focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
          />
        )}
      </div>

      <div className="mt-4 flex justify-end">
        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasAnswer}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            Send Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasAnswer}
            className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
}
