/**
 * The deterministic half of the suggestion gate. It decides, before any request is built, whether
 * an interviewer turn is pure backchannel ("mhm", "yeah, got it") and can be dropped outright.
 *
 * Both directions matter, and they fail differently. A filler that slips through costs one wasted
 * request and a card that flashes and vanishes - annoying, visible, recoverable. A question
 * classified as filler produces *nothing at all*, mid-interview, with no error anywhere. That
 * asymmetry is why Skip is only returned when the lexicon consumes the whole turn, and why the
 * "never skipped" half of this file is the larger one.
 *
 * The third verdict is the turn-splitting case: an ASR final is an acoustic endpoint, so a
 * half-finished question must land on Uncertain and wait rather than be answered as it stands.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('interviewer-turn');

  const { classifyInterviewerTurn, TurnVerdict } = await loadMain('utils/interviewer-turn.js');

  const skips = (text) => classifyInterviewerTurn(text) === TurnVerdict.Skip;
  const answers = (text) => classifyInterviewerTurn(text) === TurnVerdict.Answer;
  const waits = (text) => classifyInterviewerTurn(text) === TurnVerdict.Uncertain;

  // Skipped: nothing here for the candidate to answer.
  check('single backchannel token', skips('Okay.'));
  check('acknowledgement phrase', skips('Got it.'));
  check('stacked backchannels', skips('Yeah, yeah, got it.'));
  check('praise plus thanks', skips('Great, thanks.'));
  check('hyphenated non-word', skips('Mm-hmm.'));
  check('connective plus filler', skips('And yeah, okay.'));
  check('agreement', skips('Right, exactly.'));
  check('non-speech event only', skips('[laugh]'));
  check('non-speech with filler', skips('(inaudible) uh'));
  check('empty turn', skips(''));
  check('whitespace turn', skips('   '));
  check('closing acknowledgement', skips('Perfect, makes sense.'));

  // Answered immediately: a completed question or directive, so the settle wait is skipped and the
  // candidate loses no time.
  check('bare question', answers('Why?'));
  check('wh question', answers('How did you handle retries?'));
  check('question behind a backchannel', answers('Okay, so how does that scale?'));
  check('punctuated directive', answers('Tell me about your Kafka work.'));
  check('directive behind a connective', answers('So walk me through the migration.'));
  check('polite request', answers('Could you describe the architecture?'));
  check('backchannel that is really a prompt', answers('Okay?'));

  // The critical half: a real question must never be read as filler, however it opens.
  check('question opening on praise is not skipped', !skips('Nice, and how did you test it?'));
  check('question opening on thanks is not skipped', !skips('Thanks. What broke first?'));
  check('short unpunctuated question is not skipped', !skips('Why Kafka'));
  check('directive is not skipped', !skips('Walk me through it.'));
  check('statement with content is not skipped', !skips('Your role there.'));
  check('closing signal is not skipped', !skips('Thank you for your time today.'));
  check('one content word is not skipped', !skips('Kafka.'));

  // Fragments: an ASR final that lands mid-sentence has to wait for its continuation rather than
  // be answered as a whole question. Terminal punctuation is what separates the two.
  check('unterminated directive waits', waits('So tell me about'));
  check('unterminated clause waits', waits('And the part where you'));
  check('terminated statement with no cue waits', waits('Your role there.'));

  return failures;
}
