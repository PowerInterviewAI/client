/**
 * Arabic and Hebrew are two of the 28 interview languages, and everything the app displays from a
 * session - the transcript, the interviewer's question, the answer - can arrive in either.
 *
 * The panels are laid out left-to-right. A right-to-left run inside them still reads
 * right-to-left, so the defect is not obvious from a screenshot unless you read the language:
 * what breaks is the neutral characters. Sentence-final punctuation takes the *paragraph's*
 * direction, not the run's, so a question mark ends up at the wrong end of the line, and a
 * technical answer - which the prompts deliberately keep product names and code in Latin script -
 * reorders around every switch of script.
 *
 * `dir="auto"` resolves the base direction from the first strong character of each block, which
 * is the unit the bidi algorithm works in. It is a no-op for the languages that shipped before
 * the picker: on Latin text it resolves to the `ltr` those blocks already inherited. That is also
 * why nothing here can be caught by a type checker, a linter or a snapshot taken in English.
 *
 * Source-level checks, like `audio-device-switch.test.mjs`: this is renderer code and the
 * renderer has no runtime harness in this directory.
 */
import { readFileSync } from 'node:fs';

import { codeOnly, createChecker } from './helpers.mjs';

const read = (path) => codeOnly(readFileSync(new URL(path, import.meta.url), 'utf8'));

export async function run() {
  const { check, failures } = createChecker('rtl-rendering');

  const markdown = read('../src/renderer/components/custom/safe-markdown.tsx');

  // Every block element a model answer can produce. A block without one inherits the panel's
  // direction, so the failure is per construct: an answer whose bullets are fine and whose
  // paragraphs are not.
  for (const tag of ['p', 'li', 'ul', 'ol', 'blockquote', 'th', 'td']) {
    check(
      `SafeMarkdown gives <${tag}> an automatic direction`,
      new RegExp(`<${tag}\\s+dir="auto"|<${tag}\\n\\s*dir="auto"`).test(markdown)
    );
  }

  // Headings are built by a factory and created with React.createElement, so the attribute goes
  // in the props object rather than into JSX.
  check(
    'headings are created with an automatic direction',
    /dir: 'auto'/.test(markdown) &&
      markdown.indexOf("dir: 'auto'") < markdown.indexOf('style: mergedStyle')
  );

  // The one place `auto` is wrong. Code is left-to-right in every language - the backend prompts
  // say so explicitly - and one RTL comment or string literal inside a fence is enough to flip
  // the block's resolved direction and reorder the brackets around it.
  check('block code is forced left-to-right rather than resolved', /dir="ltr"/.test(markdown));
  check(
    'and it is the <pre> that carries it',
    markdown.indexOf('dir="ltr"') > markdown.indexOf('MarkdownPre') &&
      markdown.indexOf('dir="ltr"') < markdown.indexOf('MarkdownCode')
  );

  // A single wrapper would be cheaper and wrong: `auto` resolves from the first strong character
  // it contains, so an answer opening on "React" would set the direction for every paragraph
  // under it.
  check(
    'the direction is not delegated to one wrapper around the whole answer',
    !/<div dir="auto">\s*<ReactMarkdown/.test(markdown)
  );

  const transcript = read('../src/renderer/components/custom/panels/transcript-panel.tsx');
  check(
    'a transcript line resolves its own direction',
    /<p\s*\n\s*dir="auto"/.test(transcript) || /<p dir="auto"/.test(transcript)
  );

  // Both panels render the interviewer's question above the answer, and it is the interviewer who
  // is most likely to be the one speaking the interview language.
  for (const panel of ['live', 'action']) {
    const source = read(`../src/renderer/components/custom/panels/${panel}-suggestions-panel.tsx`);
    check(
      `the ${panel} panel's question line resolves its own direction`,
      /dir="auto"/.test(source) && /title=\{s\.last_question\}/.test(source)
    );
  }

  return failures;
}
