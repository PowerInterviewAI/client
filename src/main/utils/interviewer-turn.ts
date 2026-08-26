/**
 * Deterministic first stage of the "does this interviewer turn need an answer?" gate.
 *
 * The `NO_SUGGESTION_NEEDED` sentinel is the last stage, not the first. By the time it fires the
 * request has already uploaded the profile, the context and up to 60 transcripts, engaged the
 * model, and rendered a pending card that then has to be retracted on screen. A turn that is only
 * "mhm" costs exactly what a real question costs. This runs in-process on the merged turn text, in
 * microseconds, before any of that.
 *
 * Precision, not recall, is what this stage optimises for. A missed filler costs one request; a
 * skipped question costs the candidate the answer they were waiting for, and fails silently
 * mid-interview. So `Skip` is returned only when the backchannel lexicon consumes the turn
 * *entirely*; anything it does not fully consume falls through for the model to judge.
 */

export enum TurnVerdict {
  /** Pure backchannel or non-speech. No request, no card. */
  Skip = 'skip',
  /** A complete question or directive. Generate now, without waiting for the turn to settle. */
  Answer = 'answer',
  /** Could be either, or could be half a sentence. Let the turn settle, then generate. */
  Uncertain = 'uncertain',
}

/** Transcribed non-speech events: `[laugh]`, `(inaudible)`, `<noise>`. */
const NON_LEXICAL = /[[(<][^\])>]*[\])>]/g;

const TERMINAL_PUNCTUATION = /[.!?]["')\]]*\s*$/;

/**
 * Question marks that are not `?`.
 *
 * Japanese and Chinese use the fullwidth form, Arabic and Persian the mirrored one, Greek the
 * semicolon. They are folded to `?` in `normalize` so the completeness check below reads them the
 * same way it reads an English one - which is worth doing because it is the difference between
 * answering a finished question immediately and making it wait out the settle timer first.
 */
const FOREIGN_QUESTION_MARKS = /[？؟;]/g;

/**
 * Any letter, in any script.
 *
 * `normalize` reduces a turn to ASCII, which is right for an English lexicon and wrong as a test
 * for whether anything was said: a Japanese question reduces to nothing at all. This tells the
 * two apart.
 */
const ANY_LETTER = /\p{L}/u;

/**
 * Question and directive openers. Only consulted together with terminal punctuation, so this does
 * not have to distinguish "how" mid-sentence from "how" as an opener.
 */
const CUE =
  /\b(what|why|how|when|where|who|which|whose|whom|tell me|walk me|walk us|describe|explain|elaborate|give me|talk about|talk me|share|show me|can you|could you|would you|will you|do you|did you|does|are you|is there|was there|have you|had you|were you|should|suppose|imagine|let's|lets|i'd like|i would like|i want you|go ahead and)\b/;

/**
 * Phrases that carry no question and no content. Matched only from the *front* of the turn and
 * repeatedly, so "yeah, okay, got it" is consumed while "okay, so how does that scale?" keeps its
 * question. A turn is skipped when this consumes all of it.
 */
const BACKCHANNEL_PHRASES = [
  'that makes a lot of sense',
  'that makes sense',
  'makes a lot of sense',
  'makes sense',
  'that sounds good',
  'that sounds great',
  'sounds good',
  'sounds great',
  'thank you so much',
  'thank you very much',
  'thanks a lot',
  'thank you',
  'thanks',
  'fair enough',
  'of course',
  'no worries',
  'no problem',
  'very good',
  'very nice',
  'very interesting',
  'really interesting',
  'all right',
  'alright',
  'got it',
  'gotcha',
  'i see',
  'i get it',
  'i understand',
  'understood',
  'noted',
  'uh huh',
  'mm hmm',
  'mhm',
  'mmhmm',
  'hmm',
  'hm',
  'mm',
  'um',
  'uh',
  'er',
  'ah',
  'oh',
  'okay',
  'ok',
  'yeah',
  'yep',
  'yup',
  'yes',
  'right',
  'sure',
  'exactly',
  'true',
  'correct',
  'great',
  'good',
  'nice',
  'cool',
  'perfect',
  'awesome',
  'excellent',
  'wonderful',
  'lovely',
  'interesting',
  'wow',
  'definitely',
  'absolutely',
  'indeed',
  'haha',
  'hehe',
  // Connectives an interviewer opens on. Harmless to strip from the front, and stripping them is
  // what lets "and yeah, okay" reduce to nothing.
  'so',
  'and',
  'but',
  'well',
  'now',
  'then',
  'also',
] as const;

// Longest first, so "got it" is never consumed one word at a time by a shorter entry.
const BACKCHANNEL_WORDS: string[][] = BACKCHANNEL_PHRASES.map((phrase) => phrase.split(' ')).sort(
  (a, b) => b.length - a.length
);

/**
 * Lowercase, drop non-speech events and every punctuation mark except `?`.
 *
 * The question mark is kept because it is the single strongest completeness signal available: the
 * ASR session runs with `format_turns`, so a finished question reliably arrives punctuated.
 * Apostrophes are kept so "let's" and "i'd" still match the cue list.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(NON_LEXICAL, ' ')
    .replace(/[‘’]/g, "'")
    .replace(FOREIGN_QUESTION_MARKS, '?')
    .replace(/[^a-z0-9'?\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingBackchannel(words: string[]): string[] {
  let index = 0;

  while (index < words.length) {
    const phrase = BACKCHANNEL_WORDS.find(
      (candidate) =>
        index + candidate.length <= words.length &&
        candidate.every((word, offset) => words[index + offset] === word)
    );
    if (!phrase) break;
    index += phrase.length;
  }

  return words.slice(index);
}

/**
 * Classify one merged interviewer turn.
 *
 * @param rawText The interviewer's turn as it will be shown, punctuation intact.
 */
export function classifyInterviewerTurn(rawText: string): TurnVerdict {
  const raw = String(rawText ?? '').trim();
  if (!raw) return TurnVerdict.Skip;

  const normalized = normalize(raw);
  if (!normalized) {
    // Empty means one of two very different things, and the lexicon cannot tell them apart on
    // its own. `[laugh]` and `(inaudible)` really were non-speech and are correctly dropped. A
    // Japanese, Chinese, Thai, Russian, Arabic, Korean, Greek, Hebrew or Hindi question also
    // reduces to nothing here, because `normalize` keeps only ASCII - and dropping *that* is a
    // question silently answered with nothing, mid-interview, which is the one failure this
    // classifier is built to never produce.
    //
    // So the test is whether any letters survived the non-speech markers. If they did, this is a
    // language the lexicon cannot read rather than an absence of speech, and it goes to
    // `Uncertain` - which defers to the backend gate, the one stage that can actually read it.
    const withoutNonSpeech = raw.replace(NON_LEXICAL, ' ');
    return ANY_LETTER.test(withoutNonSpeech) ? TurnVerdict.Uncertain : TurnVerdict.Skip;
  }

  const core = stripLeadingBackchannel(normalized.split(' '));
  if (core.length === 0) return TurnVerdict.Skip;

  const coreText = core.join(' ');

  if (coreText.endsWith('?')) return TurnVerdict.Answer;

  // A directive rather than a question ("Walk me through the migration."). Terminal punctuation is
  // required as well: without it the turn is most likely a fragment the speaker is still finishing,
  // and answering half a question is worse than waiting out the settle window.
  if (TERMINAL_PUNCTUATION.test(raw) && CUE.test(coreText)) return TurnVerdict.Answer;

  return TurnVerdict.Uncertain;
}
