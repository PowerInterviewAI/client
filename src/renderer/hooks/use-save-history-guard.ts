import { create } from 'zustand';

import { useAppState } from './use-app-state';

/**
 * What is about to destroy the interview. Only the copy differs - the choice is the same one
 * every time, and phrasing it in terms of the action is what makes it answerable.
 */
export type SaveHistoryReason = 'clear' | 'start' | 'close';

interface SaveHistoryPromptStore {
  /** The action awaiting an answer, or null when nothing is being asked. */
  reason: SaveHistoryReason | null;
  resolve: ((proceed: boolean) => void) | null;

  /** Ask, unconditionally. Resolves true to go ahead with the action, false to abandon it. */
  prompt: (reason: SaveHistoryReason) => Promise<boolean>;
  /** Answer the open prompt and close it. */
  settle: (proceed: boolean) => void;
}

export const useSaveHistoryPrompt = create<SaveHistoryPromptStore>((set, get) => ({
  reason: null,
  resolve: null,

  prompt: (reason) => {
    // A second question arriving over the first abandons it rather than stacking. Leaving the
    // earlier promise unresolved would strand whichever caller is awaiting it - and for the
    // close prompt that caller is the one holding the window open.
    get().resolve?.(false);

    return new Promise<boolean>((resolve) => {
      set({ reason, resolve });
    });
  },

  settle: (proceed) => {
    const { resolve } = get();
    set({ reason: null, resolve: null });
    resolve?.(proceed);
  },
}));

/**
 * Ask before an action that drops the interview, but only when there is one to drop.
 *
 * `hasHistory` is derived in main and is false for the placeholder copy the panels are seeded
 * with, so a freshly launched app starts and clears without a question - which is the state
 * most Start presses happen in, and a confirmation there would be pure friction.
 */
export function useSaveHistoryGuard() {
  const { appState } = useAppState();
  const hasHistory = appState?.hasHistory ?? false;

  const confirmDiscard = async (reason: SaveHistoryReason): Promise<boolean> => {
    if (!hasHistory) return true;
    return useSaveHistoryPrompt.getState().prompt(reason);
  };

  return { hasHistory, confirmDiscard };
}
