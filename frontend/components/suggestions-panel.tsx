'use client'

import { Card } from '@/components/ui/card'
import { Loader2, Zap } from 'lucide-react'
import { SuggestionRecord, Suggestion, SuggestionState } from '@/types/suggestion'

interface SuggestionsPanelProps {
  suggestion?: Suggestion
  suggestionState: SuggestionState
}

export default function SuggestionsPanel({
  suggestion,
  suggestionState,
}: SuggestionsPanelProps) {
  // ensure newest-first ordering without mutating props
  const suggestions: SuggestionRecord[] = suggestion?.suggestions ?? []

  const isLoading = suggestionState === SuggestionState.LOADING
  const isError = suggestionState === SuggestionState.ERROR
  const isSuccess = suggestionState === SuggestionState.SUCCESS

  return (
    <Card className="flex flex-col h-full bg-card p-0 overflow-hidden">
      <div className="border-b border-border p-4 flex-shrink-0">
        <h3 className="font-semibold text-foreground text-sm">Interview Suggestions</h3>
        <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {suggestions.length === 0 && !isLoading && !isError && (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Generate suggestions to get started</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-40 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating suggestions...</span>
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

        {/* Suggestions list (render only when we have results and not loading) */}
        {suggestions.length > 0 && (isSuccess || !isLoading) && (
          <div className="p-4 space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex gap-3 pb-3 border-b border-border/40 last:border-0"
              >
                <Zap className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Score: <span className="text-foreground/80 font-medium">{suggestion.score}</span>
                  </div>
                  <div className="text-sm text-foreground/80 leading-relaxed">
                    {suggestion.content}
                  </div>
                  {suggestion.purpose && (
                    <div className="text-xs text-muted-foreground mt-2">Purpose: {suggestion.purpose}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 flex-shrink-0">
        <div className="text-xs text-muted-foreground">
          {suggestion ? (
            <span>Last generated: {new Date(suggestion.timestamp).toLocaleString()}</span>
          ) : (
            <span>No generation yet</span>
          )}
        </div>
      </div>
    </Card>
  )
}
