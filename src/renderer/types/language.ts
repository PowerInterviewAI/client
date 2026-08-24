/**
 * Mirrors `Language` in src/main/types/language.ts, which mirrors the backend enum in turn.
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

export interface LanguageOption {
  code: Language;
  /** English name, for a user who has not found their language in the list yet. */
  name: string;
  /** Endonym. Someone whose app is in the wrong language recognises this one first. */
  nativeName: string;
  /** Two letters for the control bar, so the current language is readable without opening it. */
  short: string;
}

/**
 * Display order is the order of the enum, not alphabetical by either name: alphabetical differs
 * per naming column, so one of the two would always read as scrambled.
 */
export const LANGUAGES: readonly LanguageOption[] = [
  { code: Language.English, name: 'English', nativeName: 'English', short: 'EN' },
  { code: Language.Spanish, name: 'Spanish', nativeName: 'Español', short: 'ES' },
  { code: Language.German, name: 'German', nativeName: 'Deutsch', short: 'DE' },
  { code: Language.French, name: 'French', nativeName: 'Français', short: 'FR' },
  { code: Language.Portuguese, name: 'Portuguese', nativeName: 'Português', short: 'PT' },
  { code: Language.Italian, name: 'Italian', nativeName: 'Italiano', short: 'IT' },
];

const BY_CODE = new Map<string, LanguageOption>(LANGUAGES.map((option) => [option.code, option]));

/** The option for a stored code, falling back to English for one this build does not know. */
export function getLanguageOption(code: string | null | undefined): LanguageOption {
  return (code ? BY_CODE.get(code) : undefined) ?? BY_CODE.get(DEFAULT_LANGUAGE)!;
}
