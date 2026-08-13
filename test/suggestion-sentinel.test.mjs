/**
 * The backend answers a pure-backchannel question with NO_SUGGESTION_NEEDED, and the live service
 * matches that string to drop the card instead of showing it. The match is the whole mechanism:
 * miss it and the sentinel itself is what the candidate reads mid-interview.
 *
 * Professional mode is what put pressure on it. That prompt asks for a bold headline on line 1, so
 * a model carrying the format over to the sentinel emits it wrapped in **, and a bare-string match
 * fails. Prefix matching also has to keep working, since this runs on every streamed chunk.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('suggestion-sentinel');

  const { isNoSuggestionSentinel } = await loadMain('utils/suggestion-sentinel.js');

  check('matches the bare sentinel', isNoSuggestionSentinel('NO_SUGGESTION_NEEDED'));
  check('matches a partial sentinel mid-stream', isNoSuggestionSentinel('NO_SUGGESTION'));
  check('matches the first chunk of one', isNoSuggestionSentinel('NO'));

  check('matches a bolded sentinel', isNoSuggestionSentinel('**NO_SUGGESTION_NEEDED**'));
  check('matches a bolded partial', isNoSuggestionSentinel('**NO_SUGG'));
  check('matches a bulleted sentinel', isNoSuggestionSentinel('- NO_SUGGESTION_NEEDED'));
  check('matches a trailing newline', isNoSuggestionSentinel('NO_SUGGESTION_NEEDED\n'));

  check('an empty answer is not the sentinel', !isNoSuggestionSentinel(''));
  check('bare emphasis alone is not the sentinel', !isNoSuggestionSentinel('**'));

  // The other half: a real answer must never be swallowed, in either mode.
  check(
    'a professional headline is kept',
    !isNoSuggestionSentinel('**Cut p99 from 1.8s to 210ms on the orders API**')
  );
  check('a partial professional headline is kept', !isNoSuggestionSentinel('**Cut'));
  check('a prose answer is kept', !isNoSuggestionSentinel('No, I owned the migration end to end.'));
  check('a prose answer starting mid-word is kept', !isNoSuggestionSentinel('Nothing'));

  return failures;
}
