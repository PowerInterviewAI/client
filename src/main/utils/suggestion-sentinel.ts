import { LIVE_SUGGESTION_NO_SUGGESTION } from '../consts.js';

/**
 * Whether a streamed live answer is the "no suggestion needed" sentinel, or is still a prefix of
 * one.
 *
 * Prefix-matched because it runs on every chunk: a sentinel that only matched once complete would
 * flash a half-written NO_SUGGESTION_NEEDED card into the panel first.
 *
 * Markdown emphasis is stripped before the comparison. Professional mode asks the model for a bold
 * headline on line 1, so a model that carries that format over to the sentinel emits
 * `**NO_SUGGESTION_NEEDED**`; a bare-string match would leave that sitting in the panel as a card.
 * The prompt asks for it bare, but the fallback costs one regex and the failure is visible
 * mid-interview.
 */
export function isNoSuggestionSentinel(answer: string): boolean {
  const bare = answer.replace(/^[\s*`#>-]+/, '').replace(/[\s*`]+$/, '');

  return bare.length > 0 && LIVE_SUGGESTION_NO_SUGGESTION.startsWith(bare);
}
