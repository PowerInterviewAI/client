/**
 * Datetime utility functions
 */

export class DateTimeUtil {
  /**
   * Get current timestamp in milliseconds
   */
  static now(): number {
    return Date.now();
  }

  /**
   * Get current ISO string
   */
  static nowISO(): string {
    return new Date().toISOString();
  }

  /**
   * Format date to readable string
   */
  static format(date: Date, format: 'short' | 'long' | 'iso' = 'short'): string {
    switch (format) {
      case 'iso':
        return date.toISOString();
      case 'long':
        return date.toLocaleString();
      case 'short':
      default:
        return date.toLocaleDateString();
    }
  }

  /**
   * Parse ISO string to Date
   */
  static parseISO(iso: string): Date {
    return new Date(iso);
  }

  /**
   * Get timestamp from Date
   */
  static timestamp(date: Date): number {
    return date.getTime();
  }

  /**
   * Add milliseconds to date
   */
  static addTime(date: Date, ms: number): Date {
    return new Date(date.getTime() + ms);
  }

  /**
   * Check if date is in past
   */
  static isPast(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * Check if date is in future
   */
  static isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }
}
