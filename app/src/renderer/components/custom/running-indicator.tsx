import { RunningState } from '@/types/app-state';

type Props = {
  runningState: RunningState;
  compact?: boolean;
  className?: string;
};

export function RunningIndicator({ runningState, compact = false, className = '' }: Props) {
  const indicatorConfig: Record<RunningState, { dotClass: string; label: string }> = {
    [RunningState.Idle]: { dotClass: 'bg-muted-foreground', label: 'Idle' },
    [RunningState.Starting]: { dotClass: 'bg-primary animate-pulse', label: 'Starting' },
    [RunningState.Running]: { dotClass: 'bg-destructive animate-pulse', label: 'Running' },
    [RunningState.Stopping]: { dotClass: 'bg-destructive animate-pulse', label: 'Stopping' },
  };

  const { dotClass, label } = indicatorConfig[runningState];

  if (compact) {
    return <span className={`inline-block h-3 w-3 rounded-full ${dotClass} ${className}`} />;
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1 w-24 rounded-md bg-muted/50 ${className}`}>
      <div className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default RunningIndicator;
