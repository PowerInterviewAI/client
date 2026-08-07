import { ArrowDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Card } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-app-state';
import { useConfigStore } from '@/hooks/use-config-store';
import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import { Speaker, type Transcript } from '@/types/transcript';

import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';

// Every entry is from the same session, so the date carries no information and its width is
// what would push the speaker onto a line of its own.
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

interface TranscriptPanelProps {
  transcripts: Transcript[];
  isRunning?: boolean;
}

function TranscriptPanel({ transcripts, isRunning = false }: TranscriptPanelProps) {
  const { config, updateConfig } = useConfigStore();
  const { appState } = useAppState();
  const username = appState?.interviewConfig?.fullName ?? '';
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(() => config?.autoScrollTranscript ?? true);
  const isStealth = useIsStealthMode();

  useEffect(() => {
    if (typeof config?.autoScrollTranscript === 'boolean') {
      setAutoScroll(config.autoScrollTranscript);
    }
  }, [config?.autoScrollTranscript]);

  // Auto-scroll when 'transcripts' changes only if autoScroll is enabled
  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, autoScroll]);

  return (
    <Card className="relative flex flex-col w-full h-full bg-card p-0 rounded-md gap-1">
      <div className="px-2 py-1.5 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span
              className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0"
              aria-hidden="true"
            />
          )}
          <h3 className="font-semibold text-foreground text-xs">Transcription</h3>
        </div>

        {!isStealth && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={autoScroll}
              onCheckedChange={(v) => {
                const enabled = v === true;
                setAutoScroll(enabled);
                updateConfig({ autoScrollTranscript: enabled }).catch((e) =>
                  console.error('Failed to persist auto-scroll setting', e)
                );
              }}
              className="h-4 w-4 rounded border-border bg-background"
              aria-label="Enable auto-scroll"
            />
            <span className="select-none">Auto-scroll</span>
          </label>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {transcripts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-4">
            <p className="text-sm text-muted-foreground">No transcripts yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/50 px-2 py-1">
              {transcripts.map((item, idx) => {
                const speaker = item.speaker === Speaker.Self ? username : 'Interviewer';
                return (
                  // content-visibility skips style, layout and paint for rows scrolled out of
                  // view, which is the cost that grew with transcript length. Fixed row height
                  // (single-line, truncated) keeps contain-intrinsic-size accurate without
                  // measurement plumbing.
                  <div
                    key={idx}
                    className="flex items-baseline gap-2 py-1 max-w-3xl [content-visibility:auto] [contain-intrinsic-size:auto_1.5rem]"
                  >
                    {/* Fixed-width column so wrapped/adjacent rows keep a stable left edge
                        regardless of speaker name length; long names truncate rather than
                        pushing the text column around. */}
                    <span
                      className="w-20 shrink-0 truncate text-xs font-semibold text-primary"
                      title={speaker}
                    >
                      {speaker}
                    </span>
                    {/* Single-line with end truncation, not wrap: keeps every row the same
                        height (the density goal of the wide, short dock) and readable at any
                        window width. Full text on hover. */}
                    <p
                      className="flex-1 min-w-0 truncate text-sm text-foreground/90 leading-snug"
                      title={item.text}
                    >
                      {item.text}
                    </p>
                    <time
                      dateTime={new Date(item.timestamp).toISOString()}
                      className="text-xs text-muted-foreground tabular-nums shrink-0"
                    >
                      {timeFormat.format(item.timestamp)}
                    </time>
                  </div>
                );
              })}
            </div>
            {/* Kept out of the divided list, or it would take a divider of its own */}
            <div ref={endRef} />
          </>
        )}
      </div>

      {!autoScroll && (
        <Button
          size="icon-sm"
          className="absolute bottom-3 right-3 rounded-full shadow-md bg-blue-600 text-white hover:bg-blue-600/90"
          onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="size-4" />
        </Button>
      )}
    </Card>
  );
}

export default React.memo(TranscriptPanel);
