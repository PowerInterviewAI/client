'use client';

import { Card } from '@/components/ui/card';
import { Suggestion, SuggestionState } from '@/types/suggestion';
import { Loader2, PauseCircle, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SuggestionsPanelProps {
  suggestions?: Suggestion[];
}

export default function SuggestionsPanel({ suggestions = [] }: SuggestionsPanelProps) {
  const hasSuggestions = suggestions.length > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to end when suggestions change only if autoScroll is enabled
  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [suggestions, autoScroll]);

  // If user enables autoScroll, jump to end immediately
  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  return (
    <Card className="relative flex flex-col h-full bg-card p-0">
      <div className="border-b border-border p-4 shrink-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Interview Suggestions</h3>
            <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations</p>
          </div>

          {/* Auto-scroll checkbox */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-0"
                aria-label="Enable auto-scroll"
              />
              <span className="text-xs text-muted-foreground">Auto-scroll</span>
            </label>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto mb-2">
        {/* Empty state */}
        {!hasSuggestions && (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate suggestions to get started
              </p>
            </div>
          </div>
        )}

        {/* Suggestions list */}
        {hasSuggestions && (
          <div className="p-4 space-y-3">
            {suggestions.map((s, idx) => (
              <div key={idx} className="flex gap-3 pb-3 border-b border-border/40 last:border-0">
                <Zap className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Question: {s.last_question}</div>

                  {/* State‑specific rendering */}
                  {s.state === SuggestionState.PENDING && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  )}

                  {s.state === SuggestionState.LOADING && (
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {s.answer}
                      <div className="text-xs text-muted-foreground mt-1">
                        (streaming... more content may arrive)
                      </div>
                    </div>
                  )}

                  {s.state === SuggestionState.SUCCESS && (
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {s.answer}
                    </div>
                  )}

                  {s.state === SuggestionState.STOPPED && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <PauseCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Generation stopped</span>
                    </div>
                  )}

                  {s.state === SuggestionState.ERROR && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mt-1">
                      <p className="text-xs text-destructive">Failed to generate</p>
                    </div>
                  )}

                  {s.state === SuggestionState.IDLE && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Idle — no generation yet
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Invisible scroll target */}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Scroll to End Button */}
      {hasSuggestions && showScrollButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Scroll to latest transcript</p>
          </TooltipContent>
        </Tooltip>
      )}
    </Card>
  );
}
