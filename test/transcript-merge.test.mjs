/**
 * `mergeAdjacentTranscripts` collapses the fragments the ASR emits when a speaker pauses inside a
 * sentence, and what it puts between them depends on the language: a space is a word boundary in
 * English and a visible defect in the middle of a Japanese sentence.
 *
 * The separator therefore has to come from the transcript being appended, not from the interview
 * language as it stands now. The caller rebuilds the whole session's `cleaned` array on every
 * ingest, so a single reading of the current setting rewrites history: switch to Japanese an hour
 * into an English interview and every block merged so far loses its spaces - on screen, and in
 * the transcript the next suggestion request carries, where it becomes a question nobody asked.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('transcript-merge');

  const { mergeAdjacentTranscripts } = await loadMain('services/transcript.service.js');
  const { Speaker } = await loadMain('types/app-state.js');
  const { Language } = await loadMain('types/language.js');
  const { TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS } = await loadMain('consts.js');

  const other = (text, timestamp, language = Language.English) => ({
    timestamp,
    text,
    isFinal: true,
    speaker: Speaker.Other,
    endTimestamp: timestamp,
    language,
  });
  const self = (text, timestamp, language = Language.English) => ({
    ...other(text, timestamp, language),
    speaker: Speaker.Self,
  });

  const near = TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS;
  const far = TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS + 1;

  check('an empty transcript merges to nothing', mergeAdjacentTranscripts([]).length === 0);

  const single = mergeAdjacentTranscripts([other('Tell me about Kafka.', 1000)]);
  check('a lone transcript is passed through', single.length === 1);
  check('and its text is untouched', single[0].text === 'Tell me about Kafka.');

  // Copied rather than mutated in place: the inputs are the service's own stored transcripts, and
  // this runs again from scratch on every ingest.
  const inputs = [other('Tell me', 1000), other('about Kafka.', 1000 + near)];
  const merged = mergeAdjacentTranscripts(inputs);
  check('two nearby blocks from one speaker merge', merged.length === 1);
  check('English merges with a space', merged[0].text === 'Tell me about Kafka.');
  check('the merged block runs to the later end', merged[0].endTimestamp === 1000 + near);
  check('the stored transcripts are not mutated', inputs[0].text === 'Tell me');

  check(
    'a gap longer than the window keeps the blocks apart',
    mergeAdjacentTranscripts([other('Tell me', 1000), other('about Kafka.', 1000 + far)]).length ===
      2
  );
  check(
    'a change of speaker keeps the blocks apart',
    mergeAdjacentTranscripts([other('Tell me', 1000), self('about Kafka.', 1000 + near)]).length ===
      2
  );

  // The three scripts the backend also treats as unspaced, and the reason the field exists.
  for (const [name, language, joined] of [
    ['Japanese', Language.Japanese, '経験について教えてください。'],
    ['Chinese', Language.Chinese, '请介绍一下你的经验。'],
    ['Thai', Language.Thai, 'ช่วยเล่าประสบการณ์หน่อย'],
  ]) {
    const halves = [
      other(joined.slice(0, 4), 1000, language),
      other(joined.slice(4), 1000 + near, language),
    ];
    check(`${name} merges with no separator`, mergeAdjacentTranscripts(halves)[0].text === joined);
  }

  // The whole point. The first two blocks were spoken in English and stay English however the
  // picker moves afterwards.
  const switched = mergeAdjacentTranscripts([
    other('Tell me', 1000),
    other('about Kafka.', 1000 + near),
    other('経験は', 1000 + 2 * near, Language.Japanese),
    other('どうですか。', 1000 + 3 * near, Language.Japanese),
  ]);
  check('a session that switched language merges into one run', switched.length === 1);
  check(
    'the English half keeps its spaces after a switch to Japanese',
    switched[0].text.startsWith('Tell me about Kafka.')
  );
  check(
    'the Japanese half is joined without spaces',
    switched[0].text.endsWith('経験はどうですか。')
  );

  // The reverse direction, where the bug inserts spaces into text that never had them rather
  // than removing them.
  const back = mergeAdjacentTranscripts([
    other('経験は', 1000, Language.Japanese),
    other('どうですか。', 1000 + near, Language.Japanese),
    other('And', 1000 + 2 * near),
    other('after that?', 1000 + 3 * near),
  ]);
  check(
    'the Japanese half keeps its lack of spaces after a switch to English',
    back[0].text.startsWith('経験はどうですか。')
  );
  check('the English half is joined with spaces', back[0].text.endsWith('And after that?'));

  return failures;
}
