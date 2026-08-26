import { DEFAULT_LANGUAGE, Language } from '../types/language.js';

/**
 * The words the exported report needs that no model writes for it.
 *
 * The report is the one part of this app that is deliberately not in English. The summary comes
 * back in the interview language - the summarize prompt goes further than the other two and asks
 * for the section headings to be translated as well, on the grounds that a report is a document a
 * person reads rather than a format anything parses, so a half-translated one just looks
 * unfinished. Everything the client wraps around that summary was still English, which produced
 * exactly that document: a Spanish report under an English `# Transcripts`, every turn attributed
 * to an `Interviewer`.
 *
 * This is not app chrome, and the distinction is the whole reason the table exists. An English
 * button on a Spanish interview is an inconvenience to one person for one session; the report is
 * handed to someone who was not there, and may not read English at all.
 *
 * Five nouns, and no attempt at a general localisation layer. The rest of the document is the
 * candidate's name, timestamps and text that already arrived in the right language.
 */
export interface ExportLabels {
  /** Heading over the full transcript section. */
  transcripts: string;
  /** Heading over the suggestion section. */
  suggestions: string;
  /** Sub-heading over a single suggested answer. */
  suggestion: string;
  /** Attribution for every turn that is not the candidate's. */
  interviewer: string;
  /** Label on the export timestamp under the report title. */
  dateTime: string;
}

const LABELS: Record<Language, ExportLabels> = {
  [Language.English]: {
    transcripts: 'Transcripts',
    suggestions: 'Suggestions',
    suggestion: 'Suggestion',
    interviewer: 'Interviewer',
    dateTime: 'Date/Time',
  },
  [Language.Spanish]: {
    transcripts: 'Transcripciones',
    suggestions: 'Sugerencias',
    suggestion: 'Sugerencia',
    interviewer: 'Entrevistador',
    dateTime: 'Fecha y hora',
  },
  [Language.German]: {
    transcripts: 'Transkripte',
    suggestions: 'Vorschläge',
    suggestion: 'Vorschlag',
    interviewer: 'Interviewer',
    dateTime: 'Datum/Uhrzeit',
  },
  [Language.French]: {
    transcripts: 'Transcriptions',
    suggestions: 'Suggestions',
    suggestion: 'Suggestion',
    interviewer: 'Intervieweur',
    dateTime: 'Date/heure',
  },
  [Language.Portuguese]: {
    transcripts: 'Transcrições',
    suggestions: 'Sugestões',
    suggestion: 'Sugestão',
    interviewer: 'Entrevistador',
    dateTime: 'Data/hora',
  },
  [Language.Italian]: {
    transcripts: 'Trascrizioni',
    suggestions: 'Suggerimenti',
    suggestion: 'Suggerimento',
    interviewer: 'Intervistatore',
    dateTime: 'Data/ora',
  },
  [Language.Dutch]: {
    transcripts: 'Transcripties',
    suggestions: 'Suggesties',
    suggestion: 'Suggestie',
    interviewer: 'Interviewer',
    dateTime: 'Datum/tijd',
  },
  [Language.Polish]: {
    transcripts: 'Transkrypcje',
    suggestions: 'Sugestie',
    suggestion: 'Sugestia',
    interviewer: 'Prowadzący rozmowę',
    dateTime: 'Data/godzina',
  },
  [Language.Russian]: {
    transcripts: 'Расшифровки',
    suggestions: 'Подсказки',
    suggestion: 'Подсказка',
    interviewer: 'Интервьюер',
    dateTime: 'Дата и время',
  },
  [Language.Ukrainian]: {
    transcripts: 'Розшифровки',
    suggestions: 'Підказки',
    suggestion: 'Підказка',
    interviewer: 'Інтерв’юер',
    dateTime: 'Дата й час',
  },
  [Language.Czech]: {
    transcripts: 'Přepisy',
    suggestions: 'Návrhy',
    suggestion: 'Návrh',
    interviewer: 'Tazatel',
    dateTime: 'Datum a čas',
  },
  [Language.Romanian]: {
    transcripts: 'Transcrieri',
    suggestions: 'Sugestii',
    suggestion: 'Sugestie',
    interviewer: 'Intervievator',
    dateTime: 'Data și ora',
  },
  [Language.Greek]: {
    transcripts: 'Μεταγραφές',
    suggestions: 'Προτάσεις',
    suggestion: 'Πρόταση',
    interviewer: 'Συνεντευκτής',
    dateTime: 'Ημερομηνία/ώρα',
  },
  [Language.Hungarian]: {
    transcripts: 'Átiratok',
    suggestions: 'Javaslatok',
    suggestion: 'Javaslat',
    interviewer: 'Kérdező',
    dateTime: 'Dátum/idő',
  },
  [Language.Swedish]: {
    transcripts: 'Transkriptioner',
    suggestions: 'Förslag',
    suggestion: 'Förslag',
    interviewer: 'Intervjuare',
    dateTime: 'Datum/tid',
  },
  [Language.Danish]: {
    transcripts: 'Transskriptioner',
    suggestions: 'Forslag',
    suggestion: 'Forslag',
    interviewer: 'Interviewer',
    dateTime: 'Dato/klokkeslæt',
  },
  [Language.Norwegian]: {
    transcripts: 'Transkripsjoner',
    suggestions: 'Forslag',
    suggestion: 'Forslag',
    interviewer: 'Intervjuer',
    dateTime: 'Dato/tid',
  },
  [Language.Finnish]: {
    transcripts: 'Litteroinnit',
    suggestions: 'Ehdotukset',
    suggestion: 'Ehdotus',
    interviewer: 'Haastattelija',
    dateTime: 'Päivämäärä/aika',
  },
  [Language.Turkish]: {
    transcripts: 'Transkriptler',
    suggestions: 'Öneriler',
    suggestion: 'Öneri',
    interviewer: 'Görüşmeci',
    dateTime: 'Tarih/saat',
  },
  [Language.Hindi]: {
    transcripts: 'प्रतिलेख',
    suggestions: 'सुझाव',
    suggestion: 'सुझाव',
    interviewer: 'साक्षात्कारकर्ता',
    dateTime: 'दिनांक/समय',
  },
  [Language.Japanese]: {
    transcripts: '文字起こし',
    suggestions: '提案',
    suggestion: '提案',
    interviewer: '面接官',
    dateTime: '日時',
  },
  [Language.Korean]: {
    transcripts: '대화록',
    suggestions: '제안',
    suggestion: '제안',
    interviewer: '면접관',
    dateTime: '날짜/시간',
  },
  [Language.Chinese]: {
    transcripts: '转录文本',
    suggestions: '建议',
    suggestion: '建议',
    interviewer: '面试官',
    dateTime: '日期/时间',
  },
  [Language.Vietnamese]: {
    transcripts: 'Bản ghi',
    suggestions: 'Gợi ý',
    suggestion: 'Gợi ý',
    interviewer: 'Người phỏng vấn',
    dateTime: 'Ngày/giờ',
  },
  [Language.Thai]: {
    transcripts: 'บทถอดเสียง',
    suggestions: 'ข้อเสนอแนะ',
    suggestion: 'ข้อเสนอแนะ',
    interviewer: 'ผู้สัมภาษณ์',
    dateTime: 'วันที่/เวลา',
  },
  [Language.Indonesian]: {
    transcripts: 'Transkrip',
    suggestions: 'Saran',
    suggestion: 'Saran',
    interviewer: 'Pewawancara',
    dateTime: 'Tanggal/waktu',
  },
  [Language.Arabic]: {
    transcripts: 'النصوص',
    suggestions: 'الاقتراحات',
    suggestion: 'اقتراح',
    interviewer: 'المحاور',
    dateTime: 'التاريخ/الوقت',
  },
  [Language.Hebrew]: {
    transcripts: 'תמלולים',
    suggestions: 'הצעות',
    suggestion: 'הצעה',
    interviewer: 'המראיין',
    dateTime: 'תאריך/שעה',
  },
};

/**
 * The labels for a language, falling back to English for one this build does not know.
 *
 * `configStore.getConfig()` already resolves the stored code, so the fallback is a belt on top of
 * a brace - and the cheaper of the two failures either way: an English heading over a Spanish
 * report is worse than no report only if the export throws instead.
 */
export function getExportLabels(language: Language): ExportLabels {
  return LABELS[language] ?? LABELS[DEFAULT_LANGUAGE];
}
