import { Card } from '@/components/ui/card'
import { Transcript } from '@/types/transcript'

interface TranscriptionPanelProps {
  transcripts: Transcript[]
}

export default function TranscriptPanel({ transcripts }: TranscriptionPanelProps) {
  return (
    <Card className="flex flex-col h-full bg-card p-0 overflow-hidden">
      <div className="border-b border-border px-4 pt-4 pb-2 flex-shrink-0">
        <h3 className="font-semibold text-foreground text-xs">Transcription</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {transcripts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <p className="text-sm text-muted-foreground">No transcripts yet</p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {transcripts.map((item, idx) => (
              <div key={idx} className="space-y-1 pb-2 border-b border-border/50 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary">{item.speaker}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-foreground/75 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
