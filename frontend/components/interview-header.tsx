export default function InterviewHeader() {
  return (
    <div className="border-b border-border bg-card px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
          <h1 className="text-xl font-semibold text-foreground">Power Interview</h1>
        </div>
        <div className="text-sm text-muted-foreground">Interview Session</div>
      </div>
    </div>
  )
}
