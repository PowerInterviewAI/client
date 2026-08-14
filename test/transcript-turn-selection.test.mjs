/**
 * `selectTrailingOtherTurn` decides how much of `cleaned` counts as "the interviewer's last turn"
 * for classification. It has to span every trailing Other entry since the candidate last spoke,
 * not just the most recently merged block.
 *
 * A pause longer than TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS keeps two interviewer blocks separate in
 * `cleaned` even with no candidate turn between them - "Tell me about your Kafka work." <pause>
 * "Okay?" arrives as two Other entries, not one. Classifying only the last one reads a real
 * question as pure backchannel and silently drops it: no request, no card, nothing recoverable.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('transcript-turn-selection');

  const { selectTrailingOtherTurn } = await loadMain('services/transcript.service.js');
  const { classifyInterviewerTurn, TurnVerdict } = await loadMain('utils/interviewer-turn.js');
  const { Speaker } = await loadMain('types/app-state.js');

  const other = (text, timestamp) => ({
    timestamp,
    text,
    isFinal: true,
    speaker: Speaker.Other,
    endTimestamp: timestamp,
  });
  const self = (text, timestamp) => ({ ...other(text, timestamp), speaker: Speaker.Self });

  check('empty transcript selects nothing', selectTrailingOtherTurn([]).length === 0);

  check(
    'a single Other block is selected whole',
    selectTrailingOtherTurn([other('Tell me about your Kafka work.', 1000)]).length === 1
  );

  const twoSeparateBlocks = [
    other('Tell me about your Kafka work.', 1000),
    other('Okay?', 10_000), // beyond TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS, so a separate entry
  ];
  const trailing = selectTrailingOtherTurn(twoSeparateBlocks);
  check('two separated interviewer blocks are both selected', trailing.length === 2);
  check(
    'selected blocks stay in speaking order',
    trailing[0].text === 'Tell me about your Kafka work.' && trailing[1].text === 'Okay?'
  );

  const stopsAtTheCandidatesTurn = [
    other('How did you handle retries?', 1000),
    self('I used exponential backoff.', 2000),
    other('Okay.', 3000),
  ];
  const afterSelf = selectTrailingOtherTurn(stopsAtTheCandidatesTurn);
  check(
    'selection stops at the candidate turn, not the whole transcript',
    afterSelf.length === 1 && afterSelf[0].text === 'Okay.'
  );

  check(
    'a transcript ending on the candidate selects nothing',
    selectTrailingOtherTurn([other('How did you handle retries?', 1000), self('Sure.', 2000)])
      .length === 0
  );

  // The regression this file exists to pin: a question followed, after a long pause, by a
  // one-word acknowledgement. Classifying the last block alone reads "Right." as pure backchannel
  // and drops the question that came before it - the exact silent failure the whole gate exists
  // to avoid.
  const questionThenAck = [other('Tell me about your Kafka work.', 1000), other('Right.', 10_000)];
  const lastBlockOnly = classifyInterviewerTurn(questionThenAck.at(-1).text);
  check(
    'the last block alone misreads this as backchannel (documents the bug)',
    lastBlockOnly === TurnVerdict.Skip
  );

  const wholeTurn = selectTrailingOtherTurn(questionThenAck)
    .map((t) => t.text)
    .join(' ');
  check(
    'the concatenated turn keeps the question and is answered',
    classifyInterviewerTurn(wholeTurn) === TurnVerdict.Answer
  );

  return failures;
}
