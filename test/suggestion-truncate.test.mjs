/**
 * `truncateMiddle` bounds the interviewer's question to the width the suggestion cards budget
 * for it, and both panels called their own copy of it.
 *
 * Neither copy honoured the bound. Both reserved three characters for the separator and then
 * spliced in thirteen, so every truncated question came back ten characters over the limit the
 * caller had asked for - invisible on one line, and wrong for anything that reuses the helper to
 * size something. The interesting half is which ten: the tail is what the caller is trying to
 * keep (a question's actual ask is usually at the end of it), so the fix has to stay inside the
 * budget without paying for it out of the tail alone.
 *
 * Loaded straight from the renderer source the way suggestion-emphasis.test.mjs is; the module
 * has no imports and no runtime-only type syntax, so Node's type stripping handles it.
 */
import { createChecker } from './helpers.mjs';

const SOURCE = new URL('../src/renderer/lib/suggestions.ts', import.meta.url);

export async function run() {
  const { check, failures } = createChecker('suggestion-truncate');

  let truncateMiddle;
  try {
    ({ truncateMiddle } = await import(SOURCE.href));
  } catch (e) {
    if (/TypeScript|strip|Unknown file extension/i.test(String(e))) {
      console.log('  skip  runtime cannot load TypeScript sources');
      return failures;
    }
    throw e;
  }

  const trunc = truncateMiddle;

  check(
    'a short string is returned untouched',
    trunc('Tell me about Kafka.', 256) === 'Tell me about Kafka.'
  );
  check('a string exactly at the limit is untouched', trunc('a'.repeat(64), 64) === 'a'.repeat(64));

  // The bug this file exists for. 256 in, 266 out.
  const long = 'q'.repeat(1000);
  check('the result never exceeds the requested length', trunc(long, 256).length === 256);
  check(
    'and holds at other lengths too',
    [10, 33, 64, 100, 257].every((n) => trunc(long, n).length === n)
  );

  check(
    'the head is kept from the start',
    trunc('abcdefghijklmnopqrstuvwxyz', 15).startsWith('abcde')
  );
  check('the tail is kept from the end', trunc('abcdefghijklmnopqrstuvwxyz', 15).endsWith('vwxyz'));
  check('the middle is marked as dropped', trunc('abcdefghijklmnopqrstuvwxyz', 15).includes('...'));

  // A question is truncated to keep its ask, which lives at the end. An odd budget has to leave
  // that half intact rather than rounding it away.
  check(
    'an odd budget still keeps a tail',
    [11, 13, 15, 21].every((n) => {
      const out = trunc(long, n);
      return out.length === n && out.endsWith('q');
    })
  );

  // Degenerate budgets: no separator fits, so there is nothing to signal with, but the contract
  // that the result fits still holds rather than the function returning a longer string.
  check(
    'a budget too small for the separator still bounds the result',
    [0, 1, 3, 5].every((n) => trunc(long, n).length === n)
  );

  return failures;
}
