import { Card } from '@/components/ui/card';
import { Speaker, Transcript } from '@/types/transcript';
import { useEffect, useRef, useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface TranscriptionPanelProps {
  transcripts: Transcript[];
  username: string;
  style?: React.CSSProperties;
}

export default function TranscriptPanel({ transcripts, username, style }: TranscriptionPanelProps) {
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
    // run once to set initial state
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll when 'transcripts' changes only if autoScroll is enabled
  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, autoScroll]);

  return (
    <Card className="relative flex flex-col h-full bg-card p-0" style={style}>
      <div className="border-b border-border px-4 pt-4 pb-2 shrink-0 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-foreground text-xs">Transcription</h3>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={autoScroll}
            onCheckedChange={(v) => setAutoScroll(v === true)}
            className="h-4 w-4 rounded border-border bg-background"
            aria-label="Enable auto-scroll"
          />
          <span className="select-none">Auto-scroll</span>
        </label>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto mb-2">
        {transcripts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-4">
            <p className="text-sm text-muted-foreground">No transcripts yet</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {transcripts.map((item, idx) => (
              <div key={idx} className="space-y-1 pb-1 border-b border-border/50 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary">
                    {item.speaker === Speaker.SELF ? username : 'Interviewer'}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-foreground/80 leading-relaxed text-wrap">
                  {item.text}
                </div>
              </div>
            ))}
            {/* This invisible div acts as scroll target */}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Scroll to End Button */}
      {transcripts.length > 0 && showScrollButton && (
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
            <p>Scroll to latest suggestion</p>
          </TooltipContent>
        </Tooltip>
      )}
    </Card>
  );
}
