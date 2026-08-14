/** 0 for an empty list, so the very first suggestion still counts as newly arrived */
export function newestTimestamp(items: { timestamp: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.timestamp), 0);
}

/**
 * Turn single newlines into Markdown hard breaks.
 *
 * Markdown folds a single newline into a space, and prose answers used to render under
 * `whitespace-pre-wrap`, where every newline the model emitted was a line the candidate saw. Blank
 * lines are left alone - they already separate paragraphs.
 *
 * For prose only. Structural Markdown (lists, fenced code) carries its own line semantics and does
 * not want two spaces welded onto the end of every line.
 */
export function withHardBreaks(text: string): string {
  return text.replace(/([^\n])\n(?!\n)/g, '$1  \n');
}

/**
 * Drop the one emphasis marker an in-flight answer has opened but not yet closed.
 *
 * Answers stream a chunk at a time and are re-rendered on each one, so the prompts asking for
 * `**bold**` on the words that matter mean every emphasized span spends a few frames as a literal
 * `**` on screen before its closing pair arrives. Removing the unmatched marker renders the text
 * plain until it closes and then promotes it, which reads as the emphasis arriving late rather than
 * as punctuation the model failed to clean up.
 *
 * For live answers only - the prompt forbids code blocks there. Action suggestions carry code, where
 * an asterisk is a dereference or a glob and must survive verbatim.
 */
export function stripDanglingEmphasis(text: string): string {
  let out = text;

  const doubles = out.match(/\*\*/g);
  if (doubles && doubles.length % 2 === 1) {
    const at = out.lastIndexOf('**');
    out = out.slice(0, at) + out.slice(at + 2);
  }

  // Whatever `**` survives above is balanced, so a lone `*` is either an open italic or a list
  // marker. A marker sits at the start of its line with a space after it and opens a block rather
  // than a span, so it is neither counted nor stripped.
  const positions: number[] = [];
  for (const match of out.matchAll(/(?<!\*)\*(?!\*)/g)) {
    const at = match.index ?? 0;
    const lineStart = out.lastIndexOf('\n', at - 1) + 1;
    const isListMarker = /^[ \t]*$/.test(out.slice(lineStart, at)) && out[at + 1] === ' ';
    if (!isListMarker) positions.push(at);
  }

  if (positions.length % 2 === 1) {
    const at = positions[positions.length - 1];
    out = out.slice(0, at) + out.slice(at + 1);
  }

  return out;
}
