/**
 * The language an interview runs in: what the ASR transcribes and what suggestions come back in.
 *
 * ISO 639-1 codes, mirroring `Language` in the backend's `app/schemas/language.py`. The set is
 * exactly the six languages AssemblyAI's `universal-streaming-multilingual` model supports, and
 * deliberately no wider: offering a language the transcription cannot deliver produces confident
 * answers to a question that was never asked, which is worse than not offering it.
 *
 * `src/renderer/types/language.ts` carries the same enum plus the display metadata the picker
 * needs, the way `SuggestionMode` is mirrored across the two processes.
 */
export enum Language {
  English = 'en',
  Spanish = 'es',
  German = 'de',
  French = 'fr',
  Portuguese = 'pt',
  Italian = 'it',
}

export const DEFAULT_LANGUAGE = Language.English;

const LANGUAGE_CODES = new Set<string>(Object.values(Language));

/**
 * Map a stored or incoming value onto the enum, falling back to English.
 *
 * The config store holds whatever was written to disk, which may be a language a later build
 * removed or an older build never knew. Sending that through unchecked puts an unknown code on
 * the ASR URL and in every request body, where the backend can only fall back anyway - so it
 * resolves here, once, at the point the value leaves the store.
 */
export function resolveLanguage(raw: string | null | undefined): Language {
  if (!raw) return DEFAULT_LANGUAGE;

  const normalized = raw.trim().toLowerCase();
  return LANGUAGE_CODES.has(normalized) ? (normalized as Language) : DEFAULT_LANGUAGE;
}
