'use client';

interface StatusIndicatorProps {
  indicatorConfig: {
    dotClass: string;
    label: string;
  };
}

export function StatusIndicator({ indicatorConfig }: StatusIndicatorProps) {
  const { dotClass, label } = indicatorConfig;

  return (
    <div className="flex items-center gap-2 px-2 py-1 w-24 rounded-md bg-muted/50">
      <div className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
