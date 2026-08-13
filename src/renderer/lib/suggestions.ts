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
