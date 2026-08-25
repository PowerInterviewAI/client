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
  Dutch = 'nl',
  Polish = 'pl',
  Russian = 'ru',
  Ukrainian = 'uk',
  Czech = 'cs',
  Romanian = 'ro',
  Greek = 'el',
  Hungarian = 'hu',
  Swedish = 'sv',
  Danish = 'da',
  Norwegian = 'no',
  Finnish = 'fi',
  Turkish = 'tr',
  Hindi = 'hi',
  Japanese = 'ja',
  Korean = 'ko',
  Chinese = 'zh',
  Vietnamese = 'vi',
  Thai = 'th',
  Indonesian = 'id',
  Arabic = 'ar',
  Hebrew = 'he',
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
 *
 * `short` is the uppercased ISO code rather than anything derived from the name, which is what
 * keeps it two characters wide for every entry - the trigger reserves that much and no more, and
 * a three-letter label there would push the control out of the bar's rhythm.
 */
export const LANGUAGES: readonly LanguageOption[] = [
  { code: Language.English, name: 'English', nativeName: 'English', short: 'EN' },
  { code: Language.Spanish, name: 'Spanish', nativeName: 'Español', short: 'ES' },
  { code: Language.German, name: 'German', nativeName: 'Deutsch', short: 'DE' },
  { code: Language.French, name: 'French', nativeName: 'Français', short: 'FR' },
  { code: Language.Portuguese, name: 'Portuguese', nativeName: 'Português', short: 'PT' },
  { code: Language.Italian, name: 'Italian', nativeName: 'Italiano', short: 'IT' },
  { code: Language.Dutch, name: 'Dutch', nativeName: 'Nederlands', short: 'NL' },
  { code: Language.Polish, name: 'Polish', nativeName: 'Polski', short: 'PL' },
  { code: Language.Russian, name: 'Russian', nativeName: 'Русский', short: 'RU' },
  { code: Language.Ukrainian, name: 'Ukrainian', nativeName: 'Українська', short: 'UK' },
  { code: Language.Czech, name: 'Czech', nativeName: 'Čeština', short: 'CS' },
  { code: Language.Romanian, name: 'Romanian', nativeName: 'Română', short: 'RO' },
  { code: Language.Greek, name: 'Greek', nativeName: 'Ελληνικά', short: 'EL' },
  { code: Language.Hungarian, name: 'Hungarian', nativeName: 'Magyar', short: 'HU' },
  { code: Language.Swedish, name: 'Swedish', nativeName: 'Svenska', short: 'SV' },
  { code: Language.Danish, name: 'Danish', nativeName: 'Dansk', short: 'DA' },
  { code: Language.Norwegian, name: 'Norwegian', nativeName: 'Norsk', short: 'NO' },
  { code: Language.Finnish, name: 'Finnish', nativeName: 'Suomi', short: 'FI' },
  { code: Language.Turkish, name: 'Turkish', nativeName: 'Türkçe', short: 'TR' },
  { code: Language.Hindi, name: 'Hindi', nativeName: 'हिन्दी', short: 'HI' },
  { code: Language.Japanese, name: 'Japanese', nativeName: '日本語', short: 'JA' },
  { code: Language.Korean, name: 'Korean', nativeName: '한국어', short: 'KO' },
  { code: Language.Chinese, name: 'Chinese', nativeName: '中文', short: 'ZH' },
  { code: Language.Vietnamese, name: 'Vietnamese', nativeName: 'Tiếng Việt', short: 'VI' },
  { code: Language.Thai, name: 'Thai', nativeName: 'ไทย', short: 'TH' },
  { code: Language.Indonesian, name: 'Indonesian', nativeName: 'Bahasa Indonesia', short: 'ID' },
  { code: Language.Arabic, name: 'Arabic', nativeName: 'العربية', short: 'AR' },
  { code: Language.Hebrew, name: 'Hebrew', nativeName: 'עברית', short: 'HE' },
];

const BY_CODE = new Map<string, LanguageOption>(LANGUAGES.map((option) => [option.code, option]));

/** The option for a stored code, falling back to English for one this build does not know. */
export function getLanguageOption(code: string | null | undefined): LanguageOption {
  return (code ? BY_CODE.get(code) : undefined) ?? BY_CODE.get(DEFAULT_LANGUAGE)!;
}
