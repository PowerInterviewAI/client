'use client';

import { Card } from '@/components/ui/card';
import { Suggestion, SuggestionState } from '@/types/suggestion';
import { Loader2, PauseCircle, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SuggestionsPanelProps {
  suggestions?: Suggestion[];
  style?: React.CSSProperties;
}

export default function SuggestionsPanel({ suggestions = [], style }: SuggestionsPanelProps) {
  const hasSuggestions = suggestions.length > 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastItemRef = useRef<HTMLDivElement | null>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // show/hide scroll-to-latest button when user scrolls away from bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // helper: scroll last item to top of container
  const scrollToLatest = (behavior: ScrollBehavior = 'smooth') => {
    const last = lastItemRef.current;
    if (!last) return;
    last.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
  };

  // auto-scroll when suggestions change
  useEffect(() => {
    if (autoScroll) {
      // small delay can help if DOM hasn't fully laid out (optional)
      // but usually immediate call works because spacer is synced above
      scrollToLatest('smooth');
    }
  }, [suggestions, autoScroll]);

  // Listen for hotkey scroll events from Electron main process
  useEffect(() => {
    // eslint-disable-next-line
    // @ts-ignore
    if (typeof window === 'undefined' || !window?.electronAPI?.onHotkeyScroll) return;

    // eslint-disable-next-line
    // @ts-ignore
    const unsubscribe = window.electronAPI.onHotkeyScroll((direction: 'up' | 'down') => {
      const container = containerRef.current;
      if (!container) return;

      const distance = Math.max(Math.round(container.clientHeight * 0.9), 100);
      const top = direction === 'up' ? -distance : distance;
      container.scrollBy({ top, behavior: 'smooth' });
    });

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch (e) {
        console.error('Failed to unsubscribe from hotkey scroll events', e);
      }
    };
  }, [containerRef]);

  return (
    <Card className="relative flex flex-col h-full bg-card p-0" style={style}>
      {/* Header */}
      <div className="border-b border-border px-4 pt-4 pb-2 shrink-0 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-foreground text-xs">Suggestions</h3>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={autoScroll}
            onCheckedChange={(v) => setAutoScroll(v === true)}
            className="h-4 w-4 rounded border-border bg-background text-primary"
            aria-label="Enable auto-scroll"
          />
          <span className="text-xs text-muted-foreground">Auto-scroll</span>
        </label>
      </div>

      {/* Scrollable list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto mb-2">
        {!hasSuggestions && (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
            </div>
          </div>
        )}

        {hasSuggestions && (
          <div className="p-4 space-y-3">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                ref={idx === suggestions.length - 1 ? lastItemRef : null}
                className="flex gap-3 pb-3 border-b border-border/40 last:border-0"
              >
                <Zap className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">
                    <strong>Interviewer:</strong> {s.last_question}
                  </div>

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
                      <PauseCircle className="h-4 w-4" />
                      <span>Suggestion canceled</span>
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
          </div>
        )}
      </div>

      {/* Scroll to latest button */}
      {hasSuggestions && showScrollButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => scrollToLatest('smooth')}
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-all"
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
            <p>Scroll to latest suggestion</p>
          </TooltipContent>
        </Tooltip>
      )}
    </Card>
  );
}
