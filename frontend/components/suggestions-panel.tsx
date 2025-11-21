'use client'

import { Card } from '@/components/ui/card'
import { Loader2, Zap } from 'lucide-react'
import { Suggestion, SuggestionState } from '@/types/suggestion'

interface SuggestionsPanelProps {
  suggestion?: Suggestion
  suggestionState: SuggestionState
}

export default function SuggestionsPanel({
  suggestion,
  suggestionState,
}: SuggestionsPanelProps) {
  const suggestedAnswer = suggestion?.answer ?? ""

  const isPending = suggestionState === SuggestionState.PENDING
  const isLoading = suggestionState === SuggestionState.LOADING
  const isError = suggestionState === SuggestionState.ERROR
  const isSuccess = suggestionState === SuggestionState.SUCCESS

  return (
    <Card className="flex flex-col h-full bg-card p-0 overflow-hidden">
      <div className="border-b border-border p-4 shrink-0">
        <h3 className="font-semibold text-foreground text-sm">Interview Suggestions</h3>
        <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Pending state (waiting to start streaming) */}
        {isPending && (
          <div className="flex items-center justify-center h-40 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Preparing to generate suggestions...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">Failed to generate suggestions</p>
            </div>
          </div>
        )}

        {/* Streaming (LOADING) or Success → show content */}
        {(isLoading || isSuccess) && suggestedAnswer.length > 0 && (
          <div className="p-4 space-y-3">
            <div className="flex gap-3 pb-3 border-b border-border/40 last:border-0">
              <Zap className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground mt-2">
                  Question: {suggestion?.last_question}
                </div>
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {suggestedAnswer}
                </div>
                {isLoading && (
                  <div className="text-xs text-muted-foreground mt-1">
                    (streaming… more content may arrive)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state (idle, no answer yet) */}
        {suggestedAnswer.length === 0 && !isLoading && !isError && !isPending && (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate suggestions to get started
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <div className="text-xs text-muted-foreground">
          {suggestion ? (
            <span>
              Last generated:{" "}
              {new Date(suggestion.timestamp).toLocaleString()}
            </span>
          ) : (
            <span>No generation yet</span>
          )}
        </div>
      </div>
    </Card>
  )
}
