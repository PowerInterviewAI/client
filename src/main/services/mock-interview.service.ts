import { MockInterviewApi } from '../api/mock-interview.js';
import { MOCK_ANSWER_SILENCE_MS, MOCK_MAX_FOLLOW_UPS_PER_QUESTION } from '../consts.js';
import { configStore } from '../store/config.store.js';
import { Language, TTS_LANGUAGES } from '../types/language.js';
import {
  EvaluateMockTurnRequest,
  GenerateMockQuestionRequest,
  GenerateMockReportRequest,
  MockAnswer,
  MockCurrentQuestion,
  MockInterviewSessionState,
  MockInterviewSetup,
  MockInterviewState,
  MockQuestionKind,
  MockTurnAction,
} from '../types/mock-interview.js';
import { splitIntoSpeechChunks } from '../utils/speech-chunks.js';
import { transcriptSeparator } from '../utils/transcript-join.js';
import { appStateService } from './app-state.service.js';

function initialSession(): MockInterviewSessionState {
  return {
    state: MockInterviewState.Idle,
    setup: null,
    currentQuestion: null,
    questionNumber: 0,
    answers: [],
    currentAnswerText: '',
    report: null,
    reportError: null,
    error: null,
  };
}

/**
 * The mock interview's state machine and in-memory session.
 *
 * Mirrors the terminal-state invariant `use-assistant-service.ts` documents for `RunningState`:
 * whatever fails on the way, the state always lands on `Idle` or `Finished`, and no control is
 * left permanently disabled. `sessionSeq` is the generation token that makes that safe against
 * overlapping async calls - the same shape `switchSeq` gives `AudioWsStream` in the renderer - so
 * a response for a session that has since ended or restarted is discarded rather than applied.
 *
 * Fully ephemeral: nothing here is written to Mongo or to disk. It never calls `transcriptService`
 * or `appStateService`'s `transcripts`/`liveSuggestions` keys, so a mock session cannot flip
 * `hasHistory` or enter the live transcript export.
 */
class MockInterviewService {
  private api = new MockInterviewApi();
  private session: MockInterviewSessionState = initialSession();
  private sessionSeq = 0;
  private followUpCount = 0;
  private finalAnswerText = '';
  private silenceTimer: NodeJS.Timeout | null = null;
  /** Captured at `start()` and fixed for the session - see the docstring on `start`. */
  private language: Language = Language.English;

  isActive(): boolean {
    return (
      this.session.state !== MockInterviewState.Idle &&
      this.session.state !== MockInterviewState.Finished
    );
  }

  private broadcast(): void {
    appStateService.updateState({ mockInterview: { ...this.session } });
  }

  private setState(state: MockInterviewState): void {
    this.session = { ...this.session, state };
  }

  /**
   * Start a new session.
   *
   * The language is read once, here, and held for the rest of the session rather than re-read
   * from `configStore` on every request: it selects the TTS voice as well as the question
   * generation language, so switching it mid-session would leave a voice reading questions in a
   * language it was never chosen for. The setup screen is the only place it is chosen.
   */
  async start(setup: MockInterviewSetup): Promise<void> {
    if (this.isActive()) return;

    const seq = ++this.sessionSeq;
    this.followUpCount = 0;
    this.finalAnswerText = '';
    this.language = configStore.getConfig().language;
    this.session = { ...initialSession(), setup, state: MockInterviewState.Starting };
    this.broadcast();

    try {
      this.setState(MockInterviewState.Generating);
      this.broadcast();
      await this.generateNextQuestion(seq, /* isFollowUp */ false);

      // generateNextQuestion fails forward to Scoring (and, with nothing yet answered, straight
      // to Idle) rather than throwing - the right behaviour mid-session, where a skip or a
      // "next" already has a report's worth of progress to fall back on. The very first question
      // has none: landing back on Idle here is not a graceful degradation, it is Start doing
      // nothing with no explanation, so this is the one call site that turns that silence into
      // an error the setup screen can show.
      if (seq === this.sessionSeq && this.session.state === MockInterviewState.Idle) {
        throw new Error('Failed to generate the first question. Please try again.');
      }
    } catch (error) {
      if (seq !== this.sessionSeq) return;
      this.session = {
        ...initialSession(),
        error: error instanceof Error ? error.message : 'Failed to start the mock interview',
      };
      this.broadcast();
      throw error;
    }
  }

  /**
   * Fetch and install the next question, advancing `questionNumber` unless it is a follow-up.
   *
   * Shared by session start, "next", and skip - all three want the same thing: ask the backend
   * for a question given what has been asked so far, then decide whether it can be spoken.
   */
  private async generateNextQuestion(seq: number, isFollowUp: boolean): Promise<void> {
    if (!this.session.setup) return;

    const interviewConfig = appStateService.getState().interviewConfig;
    const conf = configStore.getConfig();

    const request: GenerateMockQuestionRequest = {
      config: conf.llmConf,
      language: this.language,
      setup: this.session.setup,
      profile_data: interviewConfig.profileData,
      context: interviewConfig.context,
      history: this.session.answers.map((a) => ({ question: a.question, answer: a.answer })),
    };

    let attempt = 0;
    // One retry, then fall through to scoring with whatever answers exist - a session that
    // cannot get a single further question generated is unrecoverable by retrying forever, and
    // the answers already given are worth a report more than an endless spinner is worth trying.
    for (;;) {
      try {
        const response = await this.api.generateQuestion(request);
        if (seq !== this.sessionSeq) return;
        if (response.error || !response.data) {
          throw new Error(response.error?.message || 'Failed to generate the next question');
        }
        this.installQuestion(response.data.text, response.data.kind, isFollowUp);
        return;
      } catch {
        if (seq !== this.sessionSeq) return;
        attempt += 1;
        if (attempt > 1) {
          await this.finishToScoring(seq);
          return;
        }
      }
    }
  }

  /**
   * Silence backstop for "Done answering" - a candidate who stops talking for
   * `MOCK_ANSWER_SILENCE_MS` without pressing the button is treated as finished. Armed only from
   * `ingestAnswer`, once real speech has actually arrived, so a pause to think before answering
   * never auto-submits an empty answer.
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private armSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      void this.answerFinished();
    }, MOCK_ANSWER_SILENCE_MS);
  }

  private installQuestion(text: string, kind: MockQuestionKind, isFollowUp: boolean): void {
    this.clearSilenceTimer();
    const hasAudio = TTS_LANGUAGES.has(this.language);
    const question: MockCurrentQuestion = {
      text,
      kind,
      hasAudio,
      isFollowUp,
      chunks: hasAudio ? splitIntoSpeechChunks(text, this.language) : [],
    };

    this.finalAnswerText = '';
    if (!isFollowUp) {
      this.followUpCount = 0;
      this.session = { ...this.session, questionNumber: this.session.questionNumber + 1 };
    }

    this.session = {
      ...this.session,
      currentQuestion: question,
      currentAnswerText: '',
      state: hasAudio ? MockInterviewState.Speaking : MockInterviewState.Listening,
    };
    this.broadcast();
  }

  /** One chunk's audio, by index into the current question's `chunks`. Null if Aura has no voice. */
  async synthesizeChunk(index: number): Promise<ArrayBuffer | null> {
    const chunk = this.session.currentQuestion?.chunks[index];
    if (!chunk) return null;
    return this.api.speak({ text: chunk, language: this.language });
  }

  /** Playback of every chunk finished normally. */
  async speechFinished(): Promise<void> {
    if (this.session.state !== MockInterviewState.Speaking) return;
    this.setState(MockInterviewState.Listening);
    this.broadcast();
  }

  /**
   * Playback failed - decode error, missing audio device, or a `synthesizeChunk` that itself
   * failed. Falls through to the text-only path for this question rather than stranding the
   * session: `hasAudio` flips to false so the renderer's "I'm ready" control appears in place of
   * the state it was waiting on the audio to reach.
   */
  async speechFailed(): Promise<void> {
    if (this.session.state !== MockInterviewState.Speaking) return;
    if (this.session.currentQuestion) {
      this.session = {
        ...this.session,
        currentQuestion: { ...this.session.currentQuestion, hasAudio: false },
      };
    }
    this.setState(MockInterviewState.Listening);
    this.broadcast();
  }

  /** A partial or final transcript segment of the answer in progress. */
  ingestAnswer(type: 'partial' | 'final', text: string): void {
    if (this.session.state !== MockInterviewState.Listening) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const sep = this.finalAnswerText ? transcriptSeparator(this.language) : '';

    if (type === 'final') {
      this.finalAnswerText = `${this.finalAnswerText}${sep}${trimmed}`;
      this.session = { ...this.session, currentAnswerText: this.finalAnswerText };
    } else {
      const partialSep = this.finalAnswerText ? transcriptSeparator(this.language) : '';
      this.session = {
        ...this.session,
        currentAnswerText: `${this.finalAnswerText}${partialSep}${trimmed}`,
      };
    }
    this.armSilenceTimer();
    this.broadcast();
  }

  /** "Done answering" - evaluate the turn and advance. */
  async answerFinished(): Promise<void> {
    if (this.session.state !== MockInterviewState.Listening || !this.session.currentQuestion) {
      return;
    }
    this.clearSilenceTimer();
    const seq = this.sessionSeq;
    const question = this.session.currentQuestion;
    const answerText = this.finalAnswerText.trim();

    const answer: MockAnswer = {
      question: question.text,
      kind: question.kind,
      answer: answerText,
      skipped: false,
    };
    this.session = { ...this.session, answers: [...this.session.answers, answer] };
    this.setState(MockInterviewState.Evaluating);
    this.broadcast();

    let action: MockTurnAction = MockTurnAction.Next;
    let followUpQuestion = '';
    try {
      const conf = configStore.getConfig();
      const request: EvaluateMockTurnRequest = {
        config: conf.llmConf,
        language: this.language,
        question: question.text,
        answer: answerText,
        kind: question.kind,
        follow_up_count: this.followUpCount,
      };
      const response = await this.api.evaluateTurn(request);
      if (seq !== this.sessionSeq) return;
      if (response.data) {
        action = response.data.action;
        followUpQuestion = response.data.follow_up_question;
      }
    } catch {
      // Fails forward to NEXT - a stalled session is worse than moving on one question early.
      action = MockTurnAction.Next;
    }
    if (seq !== this.sessionSeq) return;

    if (
      action === MockTurnAction.FollowUp &&
      this.followUpCount < MOCK_MAX_FOLLOW_UPS_PER_QUESTION &&
      followUpQuestion
    ) {
      this.followUpCount += 1;
      this.installQuestion(followUpQuestion, question.kind, /* isFollowUp */ true);
      return;
    }

    if (action === MockTurnAction.Finish) {
      await this.finishToScoring(seq);
      return;
    }

    await this.advanceOrScore(seq);
  }

  /** Skip the current question without an answer - always moves on, never follows up. */
  async skipQuestion(): Promise<void> {
    if (
      this.session.state !== MockInterviewState.Listening &&
      this.session.state !== MockInterviewState.Speaking
    ) {
      return;
    }
    this.clearSilenceTimer();
    const seq = this.sessionSeq;
    const question = this.session.currentQuestion;
    if (question) {
      const answer: MockAnswer = {
        question: question.text,
        kind: question.kind,
        answer: '',
        skipped: true,
      };
      this.session = { ...this.session, answers: [...this.session.answers, answer] };
    }
    await this.advanceOrScore(seq);
  }

  private async advanceOrScore(seq: number): Promise<void> {
    if (!this.session.setup) return;
    if (this.session.questionNumber >= this.session.setup.question_count) {
      await this.finishToScoring(seq);
      return;
    }
    this.setState(MockInterviewState.Generating);
    this.broadcast();
    await this.generateNextQuestion(seq, /* isFollowUp */ false);
  }

  private hasRealAnswers(): boolean {
    return this.session.answers.some((a) => !a.skipped && a.answer.trim().length > 0);
  }

  private async finishToScoring(seq: number): Promise<void> {
    if (seq !== this.sessionSeq) return;

    // The mock analogue of the export guard: a billed report call over a session with no real
    // answers would produce a document scoring an interview that did not happen.
    if (!this.hasRealAnswers()) {
      this.session = { ...initialSession() };
      this.broadcast();
      return;
    }

    this.setState(MockInterviewState.Scoring);
    this.broadcast();

    if (!this.session.setup) return;
    try {
      const interviewConfig = appStateService.getState().interviewConfig;
      const conf = configStore.getConfig();
      const request: GenerateMockReportRequest = {
        config: conf.llmConf,
        language: this.language,
        setup: this.session.setup,
        profile_data: interviewConfig.profileData,
        context: interviewConfig.context,
        questions: this.session.answers.map((a) => ({ question: a.question, answer: a.answer })),
      };
      const response = await this.api.generateReport(request);
      if (seq !== this.sessionSeq) return;
      if (response.error || !response.data) {
        throw new Error(response.error?.message || 'Failed to score the interview');
      }
      this.session = {
        ...this.session,
        report: response.data,
        reportError: null,
        state: MockInterviewState.Finished,
      };
    } catch (error) {
      if (seq !== this.sessionSeq) return;
      this.session = {
        ...this.session,
        report: null,
        reportError: error instanceof Error ? error.message : 'Failed to score the interview',
        state: MockInterviewState.Finished,
      };
    }
    this.broadcast();
  }

  /**
   * End the session from any point. Scores whatever was answered so far, the same as reaching
   * the last question naturally - the answers already given are worth a report, not a discard.
   */
  async endSession(): Promise<void> {
    if (!this.isActive()) return;
    this.clearSilenceTimer();
    const seq = ++this.sessionSeq;
    this.setState(MockInterviewState.Stopping);
    this.broadcast();

    if (!this.hasRealAnswers()) {
      this.session = { ...initialSession() };
      this.broadcast();
      return;
    }
    await this.finishToScoring(seq);
  }

  /**
   * Clear a finished (or never-started) session back to Idle.
   *
   * Called by both report-screen exits - "Practise again" and "Done" - so a finished session
   * cannot linger with `hasMockContent` still true after the user has moved past it, and so
   * "Practise again" never scores a new session's answers against the previous one's.
   */
  clear(): void {
    this.clearSilenceTimer();
    this.sessionSeq += 1;
    this.followUpCount = 0;
    this.finalAnswerText = '';
    this.session = initialSession();
    this.broadcast();
  }

  getState(): MockInterviewSessionState {
    return { ...this.session };
  }
}

export const mockInterviewService = new MockInterviewService();
