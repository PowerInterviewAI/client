'use client'

import { Card } from '@/components/ui/card'
import { Loader2, Zap, PauseCircle } from 'lucide-react'
import { Suggestion, SuggestionState } from '@/types/suggestion'

interface SuggestionsPanelProps {
  suggestions?: Suggestion[]
}

export default function SuggestionsPanel({
  suggestions = [],
}: SuggestionsPanelProps) {
  const hasSuggestions = suggestions.length > 0

  return (
    <Card className="flex flex-col h-full bg-card p-0 overflow-hidden">
      <div className="border-b border-border p-4 shrink-0">
        <h3 className="font-semibold text-foreground text-sm">Interview Suggestions</h3>
        <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
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
              <div
                key={idx}
                className="flex gap-3 pb-3 border-b border-border/40 last:border-0"
              >
                <Zap className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Question: {s.last_question}
                  </div>

                  {/* State‑specific rendering */}
                  {s.state === SuggestionState.PENDING && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Preparing to generate…</span>
                    </div>
                  )}

                  {s.state === SuggestionState.LOADING && (
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {s.answer}
                      <div className="text-xs text-muted-foreground mt-1">
                        (streaming… more content may arrive)
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
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <div className="text-xs text-muted-foreground">
          {hasSuggestions ? (
            <span>
              Last generated:{" "}
              {new Date(
                Math.max(...suggestions.map(s => s.timestamp))
              ).toLocaleString()}
            </span>
          ) : (
            <span>No generation yet</span>
          )}
        </div>
      </div>
    </Card>
  )
}
