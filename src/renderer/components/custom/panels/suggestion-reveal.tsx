import React, { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

// how long a freshly generated suggestion takes to expand and push the older ones down
const SUGGESTION_REVEAL_MS = 450;

// how long the newest suggestion stays tinted after it lands
const SUGGESTION_FLASH_MS = 1400;

interface SuggestionRevealProps {
  animate: boolean;
  /** applied to the outer wrapper - put the row divider here so it travels with the expansion */
  className?: string;
  children: React.ReactNode;
}

type Phase = 'closed' | 'open' | 'done';

/**
 * Grows a newly added suggestion from zero height so everything below it slides
 * down instead of jumping. `grid-template-rows` is the only way to transition to
 * an unknown ("auto") height without measuring the content first.
 */
export default function SuggestionReveal({ animate, className, children }: SuggestionRevealProps) {
  // latched at mount: the parent stops flagging the item as new once it has been rendered once,
  // and the entrance must not be cut short by that
  const [entering] = useState(animate);
  const [phase, setPhase] = useState<Phase>(entering ? 'closed' : 'done');

  useEffect(() => {
    if (phase !== 'closed') return;

    // two frames: the collapsed row has to be painted before the transition can start from it
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('open'));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open') return;

    // once expanded, drop the clipping and the row transition so streamed text can grow freely
    const timer = window.setTimeout(() => setPhase('done'), SUGGESTION_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const settled = phase === 'done';

  return (
    <div
      className={cn(
        'grid',
        settled
          ? 'grid-rows-[1fr]'
          : 'transition-[grid-template-rows,opacity] ease-out motion-reduce:transition-none',
        phase === 'closed' ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        className
      )}
      style={settled ? undefined : { transitionDuration: `${SUGGESTION_REVEAL_MS}ms` }}
    >
      <div
        className={cn(!settled && 'overflow-hidden', entering && 'suggestion-flash')}
        style={entering ? { animationDuration: `${SUGGESTION_FLASH_MS}ms` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
