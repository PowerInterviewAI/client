'use client';

import { Card } from '@/components/ui/card';
import { CodeSuggestion, SuggestionState } from '@/types/suggestion';
import { File, Loader2, PauseCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Checkbox } from './ui/checkbox';

interface CodeSuggestionsPanelProps {
  codeSuggestions?: CodeSuggestion[];
  style?: React.CSSProperties;
}

export default function CodeSuggestionsPanel({
  codeSuggestions = [],
  style,
}: CodeSuggestionsPanelProps) {
  const hasItems = codeSuggestions.length > 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastItemRef = useRef<HTMLDivElement | null>(null);

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

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToLatest = (behavior: ScrollBehavior = 'smooth') => {
    const last = lastItemRef.current;
    if (!last) return;
    last.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
  };

  useEffect(() => {
    if (autoScroll) scrollToLatest('smooth');
  }, [codeSuggestions, autoScroll]);

  return (
    <Card
      className="flex flex-col w-full h-full bg-card p-0 transition-all duration-300 ease-in-out"
      style={style}
    >
      {/* Header */}
      <div className="border-b border-border px-4 pt-4 pb-2 shrink-0 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-foreground text-xs">Code Suggestions</h3>

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

      {/* Scrollable Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto mb-2">
        {!hasItems && (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <p className="text-sm text-muted-foreground">No code suggestions yet</p>
            </div>
          </div>
        )}

        {hasItems && (
          <div className="p-4 space-y-3">
            {codeSuggestions.map((s, idx) => (
              <div
                key={idx}
                ref={idx === codeSuggestions.length - 1 ? lastItemRef : null}
                className="flex gap-3 pb-3 border-b border-border/40 last:border-0"
              >
                <div className="shrink-0">
                  {s.image_urls && s.image_urls.length > 0 ? (
                    <img
                      src={s.image_urls[0]}
                      className="h-12 w-16 object-cover rounded-md"
                      alt="thumb"
                    />
                  ) : (
                    <div className="h-12 w-16 flex items-center justify-center rounded-md bg-muted">
                      <File className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    <strong>Prompt:</strong> {s.user_prompt ?? '—'}
                  </div>

                  {s.state === SuggestionState.PENDING && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  )}

                  {s.state === SuggestionState.LOADING && (
                    <div className="text-sm text-foreground/80 leading-relaxed">
                      <div className="whitespace-pre-wrap text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {s.suggestion_content}
                        </ReactMarkdown>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">(streaming...)</div>
                    </div>
                  )}

                  {s.state === SuggestionState.SUCCESS && (
                    <div className="text-sm text-foreground/80 leading-relaxed">
                      <div className="whitespace-pre-wrap text-xs bg-muted p-2 rounded-md overflow-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {s.suggestion_content}
                        </ReactMarkdown>
                      </div>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasItems && showScrollButton && (
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
      )}
    </Card>
  );
}
