import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Speaker, Transcript } from '@/types/transcript'

interface TranscriptionPanelProps {
  transcripts: Transcript[]
}

export default function TranscriptPanel({ transcripts }: TranscriptionPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // Auto-scroll when 'transcripts' changes
  useEffect(() => {
    // Ensure the panel auto-scrolls only if the user is already near the bottom
    if (!containerRef.current) return

    const container = containerRef.current
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100

    if (isNearBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcripts])

  return (
    <Card className="relative flex flex-col h-full bg-card p-0 overflow-hidden">
      <div className="border-b border-border px-4 pt-4 pb-2 shrink-0">
        <h3 className="font-semibold text-foreground text-xs">Transcription</h3>
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
                  <span className="text-xs font-semibold text-primary">{item.speaker === Speaker.SELF ? "ME" : "Interviewer"}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <pre className="text-sm text-foreground/80 leading-relaxed text-wrap">{item.text}</pre>
              </div>
            ))}
            {/* This invisible div acts as scroll target */}
            <div ref={endRef} />
          </div>
        )}
      </div>
      {/* Scroll to End Button */}
      {transcripts.length > 0 && showScrollButton && (
        <button
          onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all"
          title="Scroll to latest suggestion"
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
  )
}