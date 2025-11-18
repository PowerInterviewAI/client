import { Card } from '@/components/ui/card'

export default function TranscriptPanel() {
  const transcripts = [
    { speaker: 'You', text: 'Can you tell me about your experience?', timestamp: '00:15' },
    { speaker: 'Candidate', text: 'Yes, I have 5 years of experience in full-stack development...', timestamp: '00:22' },
    { speaker: 'You', text: 'What technologies are you most familiar with?', timestamp: '00:45' },
    { speaker: 'Candidate', text: 'React, Node.js, TypeScript, and PostgreSQL are my main tech stack.', timestamp: '01:12' },
    { speaker: 'You', text: 'Tell me about a challenging project you worked on.', timestamp: '01:35' },
    { speaker: 'Candidate', text: 'We built a real-time collaboration platform that required...', timestamp: '02:00' },
  ]

  return (
    <Card className="flex flex-col h-full bg-card">
      <div className="border-b border-border px-3 py-2 flex-shrink-0">
        <h3 className="font-semibold text-foreground text-xs">Transcription</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">
          {transcripts.map((item, idx) => (
            <div key={idx} className="space-y-1 pb-2 border-b border-border/50 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-primary">{item.speaker}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{item.timestamp}</span>
              </div>
              <p className="text-xs text-foreground/75 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
