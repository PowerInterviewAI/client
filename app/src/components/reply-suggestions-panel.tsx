
import { Card } from '@/components/ui/card';
import { type ReplySuggestion, SuggestionState } from '@/types/suggestion';
import { Loader2, PauseCircle, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Checkbox } from './ui/checkbox';

interface SuggestionsPanelProps {
  suggestions?: ReplySuggestion[];
  style?: React.CSSProperties;
}

export default function ReplySuggestionsPanel({ suggestions = [], style }: SuggestionsPanelProps) {
  const hasItems = suggestions.length > 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastItemRef = useRef<HTMLDivElement | null>(null);

  const lastHotkeyAtRef = useRef<number>(0);
  const HOTKEY_SMOOTH_THRESHOLD = 150; // ms

  const [autoScroll, setAutoScroll] = useState(true);

  // helper: scroll last item into view at the bottom of container (conventional for newest)
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
    if (typeof window === 'undefined' || !window?.electronAPI?.onHotkeyScroll) return;

    const unsubscribe = window.electronAPI.onHotkeyScroll(
      (section: string, direction: 'up' | 'down') => {
        if (section !== '0') return; // only handle for interview suggestions section

        const container = containerRef.current;
        if (!container) return;

        const distance = Math.max(Math.round(container.clientHeight * 0.5), 100);
        const top = direction === 'up' ? -distance : distance;

        const now = Date.now();
        const dt = now - (lastHotkeyAtRef.current || 0);
        const behavior: ScrollBehavior = dt < HOTKEY_SMOOTH_THRESHOLD ? 'auto' : 'smooth';
        lastHotkeyAtRef.current = now;

        container.scrollBy({ top, behavior });
      },
    );

    return () => {
      try {
        if (typeof unsubscribe === 'function') unsubscribe();
      } catch (e) {
        console.error('Failed to unsubscribe from hotkey scroll events', e);
      }
    };
  }, [containerRef]);

  return (
    <Card
      className="relative flex flex-col w-full h-full bg-card p-0 transition-all duration-300 ease-in-out"
      style={style}
    >
      {/* Header */}
      <div className="border-b border-border px-4 pt-4 pb-2 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-foreground text-xs">Reply Suggestions</h3>
        </div>

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
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
            </div>
          </div>
        )}

        {hasItems && (
          <div className="p-4 space-y-3">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                ref={idx === suggestions.length - 1 ? lastItemRef : null}
                className="flex gap-3 pb-3 border-b border-border/40 last:border-0"
              >
                {idx === suggestions.length - 1 &&
                (s.state === SuggestionState.PENDING || s.state === SuggestionState.LOADING) ? (
                  <Loader2 className="h-4 w-4 mt-0.5 text-accent shrink-0 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>Interviewer:</strong> {s.last_question}
                  </div>

                  {(s.state === SuggestionState.LOADING || s.state === SuggestionState.SUCCESS) && (
                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      🪄 {s.answer}
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

      {/* scroll-to-latest button removed; auto-scroll still available via toggle */}
    </Card>
  );
}
