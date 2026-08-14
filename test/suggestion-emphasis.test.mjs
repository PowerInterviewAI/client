/**
 * The prompts now ask for `**bold**` on the words an answer turns on, and live answers are
 * re-rendered on every streamed chunk. So every emphasized span exists for a few frames as an
 * opening `**` with no closing pair, which Markdown renders as literal asterisks on the card the
 * candidate is reading mid-question. `stripDanglingEmphasis` drops that one unmatched marker.
 *
 * Both halves matter. Miss a dangling marker and the asterisks are on screen; strip one too many
 * and a finished answer loses emphasis it had earned, or a list marker turns into a paragraph.
 *
 * This is the one renderer module in a main-process harness. It has no imports and no runtime-only
 * type syntax, so Node's type stripping loads it directly - available by default from Node 22.18.
 * Older runtimes report the check as skipped rather than failing it; CI runs `node-version: 22`.
 */
import { createChecker } from './helpers.mjs';

const SOURCE = new URL('../src/renderer/lib/suggestions.ts', import.meta.url);

export async function run() {
  const { check, failures } = createChecker('suggestion-emphasis');

  let stripDanglingEmphasis;
  try {
    ({ stripDanglingEmphasis } = await import(SOURCE.href));
  } catch (e) {
    if (/TypeScript|strip|Unknown file extension/i.test(String(e))) {
      console.log('  skip  runtime cannot load TypeScript sources');
      return failures;
    }
    throw e;
  }

  const strip = stripDanglingEmphasis;

  check(
    'an unopened bold run loses its marker',
    strip('I owned the **checkout') === 'I owned the checkout'
  );
  check(
    'a closed bold run is kept',
    strip('I owned the **checkout**') === 'I owned the **checkout**'
  );
  check(
    'only the dangling marker goes',
    strip('**Go** at **40k rps**, then the **p99') === '**Go** at **40k rps**, then the p99'
  );

  check(
    'an unopened italic run loses its marker',
    strip('it held *only on reads') === 'it held only on reads'
  );
  check(
    'a closed italic run is kept',
    strip('it held *only on reads*') === 'it held *only on reads*'
  );

  check(
    'a closed bold run survives a dangling italic',
    strip('**Fix:** I added a *batch loader') === '**Fix:** I added a batch loader'
  );

  check(
    'a list marker is not emphasis',
    strip('* first point\n* second point') === '* first point\n* second point'
  );
  check(
    'an indented list marker is not emphasis',
    strip('- point\n  * sub point') === '- point\n  * sub point'
  );
  check(
    'a dangling run after a list marker still goes',
    strip('* point with a **term') === '* point with a term'
  );

  check(
    'plain prose is untouched',
    strip('No, I owned the migration end to end.') === 'No, I owned the migration end to end.'
  );
  check('an empty answer is untouched', strip('') === '');
  check('the bare sentinel is untouched', strip('NO_SUGGESTION_NEEDED') === 'NO_SUGGESTION_NEEDED');

  return failures;
}
