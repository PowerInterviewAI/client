/** 0 for an empty list, so the very first suggestion still counts as newly arrived */
export function newestTimestamp(items: { timestamp: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.timestamp), 0);
}
