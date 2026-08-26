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

  // Scripts the lexicon cannot read. `normalize` reduces a turn to ASCII, which is right for an
  // English backchannel list and catastrophic as a test for whether anything was said: every one
  // of these reduced to nothing, hit the "entirely non-speech" branch, and was dropped outright.
  // No request, no card, no error - a question silently answered with nothing, in about a third
  // of the languages the picker offers.
  check('japanese question is not skipped', !skips('あなたの経験について教えてください。'));
  check('chinese question is not skipped', !skips('请介绍一下你的项目'));
  check('thai question is not skipped', !skips('ช่วยเล่าเกี่ยวกับงานของคุณ'));
  check('russian question is not skipped', !skips('Расскажите о вашем опыте'));
  check('korean question is not skipped', !skips('경험에 대해 말씀해 주세요'));
  check('arabic question is not skipped', !skips('ما هي خبرتك'));
  check('hindi question is not skipped', !skips('अपने अनुभव के बारे में बताइए'));
  check('greek question is not skipped', !skips('Ποια είναι η εμπειρία σας;'));
  check('hebrew question is not skipped', !skips('ספר לי על הניסיון שלך'));

  // They go to the backend gate rather than being answered outright, because the lexicon has read
  // nothing and has no grounds to claim the turn is complete.
  check('unpunctuated japanese waits', waits('あなたの経験について教えてください'));
  check('unpunctuated russian waits', waits('Расскажите о вашем опыте'));

  // A question mark is a completeness signal in any script, and honouring the non-ASCII forms is
  // what saves those turns the settle-timer wait.
  check('fullwidth question mark answers', answers('あなたの経験は？'));
  check('chinese fullwidth question mark answers', answers('你的项目是什么？'));
  check('arabic question mark answers', answers('ما هي خبرتك؟'));

  // Mixed script, which is the same failure one layer further in. `normalize` blanks the
  // non-Latin half and leaves whatever loanword the interviewer opened with, so the lexicon eats
  // "OK", the core comes back empty and a real question is dropped - without ever reaching the
  // branch above, because the turn did not normalize to nothing. An interviewer opening on "OK"
  // or "Yes" is ordinary in every one of these languages, and Deepgram transcribes those in
  // Latin script.
  check('japanese question behind an OK is not skipped', !skips('OK、では次の質問です。'));
  check('japanese question behind a yes is not skipped', !skips('Yes、経験を教えてください。'));
  check('chinese question behind an OK is not skipped', !skips('OK，请介绍一下你的项目'));
  check('russian question behind an OK is not skipped', !skips('OK, расскажите о вашем опыте'));
  check('korean question behind an OK is not skipped', !skips('OK, 경험에 대해 말씀해 주세요'));
  check('greek question behind an OK is not skipped', !skips('OK, πείτε μου για την εμπειρία σας'));
  check('arabic question behind an OK is not skipped', !skips('OK، ما هي خبرتك'));
  check('hebrew question behind an OK is not skipped', !skips('OK, ספר לי על הניסיון שלך'));
  check('thai question behind an OK is not skipped', !skips('OK, ช่วยเล่าเกี่ยวกับงานของคุณ'));
  check('hindi question behind an OK is not skipped', !skips('OK, अपने अनुभव के बारे में बताइए'));

  // Non-speech markers are still not content, whatever script surrounds them.
  check('a marker beside non-latin text does not rescue a pure backchannel', skips('OK [laugh]'));

  // The other direction, and the reason the test is on script rather than on the codepoint being
  // non-ASCII. An accented Latin letter belongs to a word the lexicon does read: blanking the
  // umlaut in "Ähm" and matching "hm" is a correct consumption, and turning those into gate
  // calls would spend a request on every filler in seventeen Latin-script languages.
  check('german filler with an umlaut is still skipped', skips('Ähm.'));
  check('a latin-script backchannel run is still skipped', skips('Ähm, so, okay'));
  check('spanish accented text is unaffected', !skips('Sí, cuéntame sobre tu experiencia.'));
  check('turkish accented text is unaffected', !skips('Peki, çalışmanızı anlatır mısınız'));

  // The English half of that branch has to keep working: these really are non-speech.
  check('bare laugh marker still skipped', skips('[laugh]'));
  check('bare inaudible marker still skipped', skips('(inaudible)'));
  check('bare noise marker still skipped', skips('<noise>'));
  check('several markers still skipped', skips('[laugh] (inaudible)'));
  check('punctuation only still skipped', skips('...'));
  check('digits are not letters but are speech', !skips('2019'));

  return failures;
}
