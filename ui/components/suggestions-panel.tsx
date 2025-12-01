'use client';

import { Card } from '@/components/ui/card';
import { Suggestion, SuggestionState } from '@/types/suggestion';
import { Loader2, PauseCircle, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SuggestionsPanelProps {
  suggestions?: Suggestion[];
}

export default function SuggestionsPanel({ suggestions = [] }: SuggestionsPanelProps) {
  const hasSuggestions = suggestions.length > 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastItemRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);

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

  // update spacer height to equal container height so last element can be scrolled to top
  useEffect(() => {
    const container = containerRef.current;
    const spacer = spacerRef.current;
    const lastItem = lastItemRef.current;
    if (!container || !spacer) return;

    // function to sync spacer height
    const sync = () => {
      // set height equal to container inner height (clientHeight)
      spacer.style.height = `${container.clientHeight - (lastItem?.clientHeight ?? 0)}px`;
    };

    // initial sync
    sync();

    // watch for container resizes
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(sync);
      ro.observe(container);
    }

    // also sync whenever suggestions change (content size may change)
    // done implicitly because this effect runs on suggestions (see deps)
    return () => ro?.disconnect();
  }, [suggestions.length]); // re-run when number of suggestions changes

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

  return (
    <Card className="relative flex flex-col h-full bg-card p-0">
      {/* Header */}
      <div className="border-b border-border p-4 shrink-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Interview Suggestions</h3>
            <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={autoScroll}
              onCheckedChange={(v) => setAutoScroll(v === true)}
              className="h-4 w-4 rounded border-border bg-background text-primary"
              aria-label="Enable auto-scroll"
            />
            <span className="text-xs text-muted-foreground">Auto-scroll</span>
          </label>
        </div>
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

            {/* Spacer: ensures the last suggestion can be scrolled up to the top */}
            <div ref={spacerRef} aria-hidden />
          </div>
        )}
      </div>

      {/* Scroll to latest button */}
      {hasSuggestions && showScrollButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => scrollToLatest('smooth')}
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
            <p>Scroll to latest suggestion</p>
          </TooltipContent>
        </Tooltip>
      )}
    </Card>
  );
}
