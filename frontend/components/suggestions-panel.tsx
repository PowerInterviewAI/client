'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Loader2 } from 'lucide-react'

export default function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSuggestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'Technical interview for a software engineer role',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-full bg-card p-0 overflow-hidden">
      <div className="border-b border-border p-4 flex-shrink-0">
        <h3 className="font-semibold text-foreground text-sm">Interview Suggestions</h3>
        <p className="text-xs text-muted-foreground mt-1">AI-powered recommendations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {suggestions.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Generate suggestions to get started</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="p-4 space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex gap-3 pb-3 border-b border-border/40 last:border-0">
                <Zap className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                <span className="text-sm text-foreground/80 leading-relaxed">{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 flex-shrink-0">
        <Button
          size="sm"
          className="px-4"
          variant="outline"
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isLoading ? 'Generating...' : 'Suggestions'}
        </Button>
      </div>
    </Card>
  )
}
