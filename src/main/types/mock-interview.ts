/**
 * Mock Interview types (main process)
 *
 * Mirrors the backend's app/schemas/mock_interview.py the way llm.ts mirrors
 * app/schemas/suggestion.py: same field names, same enum values, so a request built here needs no
 * translation layer at the API boundary.
 */

import type { LiveSuggestion } from './app-state.js';
import { Language } from './language.js';
import { LLMRequest } from './llm.js';

export enum MockSeniority {
  Junior = 'junior',
  Mid = 'mid',
  Senior = 'senior',
  Staff = 'staff',
}

export enum MockDifficulty {
  Easy = 'easy',
  Standard = 'standard',
  Hard = 'hard',
}

export enum MockQuestionKind {
  Behavioral = 'behavioral',
  Technical = 'technical',
  Situational = 'situational',
  Closing = 'closing',
}

/**
 * What the interviewer does after hearing an answer.
 *
 * `Finish` is reserved for a closing-question answer - the backend prompt is told never to
 * choose it for an ordinary question, so the interview cannot end itself early on a misread.
 */
export enum MockTurnAction {
  FollowUp = 'follow_up',
  Next = 'next',
  Finish = 'finish',
}

/**
 * The session lifecycle. Mirrors `RunningState`'s invariant: every non-terminal state must be
 * reachable from `Idle` and must be able to reach `Idle` or `Finished` however it fails.
 *
 * `Speaking` is skipped entirely for a language with no Aura voice (or when synthesis fails for a
 * voiced one) - the session goes straight from `Generating` to `Listening`, with the renderer's
 * `I'm ready` control standing in for the audio's `ended` event.
 */
export enum MockInterviewState {
  Idle = 'idle',
  Starting = 'starting',
  Generating = 'generating',
  Speaking = 'speaking',
  Listening = 'listening',
  Evaluating = 'evaluating',
  Scoring = 'scoring',
  Finished = 'finished',
  Stopping = 'stopping',
}

export interface MockInterviewSetup {
  role: string;
  seniority: MockSeniority;
  difficulty: MockDifficulty;
  question_count: number;
}

export interface MockQuestion {
  text: string;
  kind: MockQuestionKind;
}

export interface MockQuestionScore {
  question: string;
  answer: string;
  score: number;
  justification: string;
  stronger_answer: string;
}

export interface MockReport {
  overall_score: number;
  strengths: string[];
  gaps: string[];
  questions: MockQuestionScore[];
}

export interface MockTurnDecision {
  action: MockTurnAction;
  follow_up_question: string;
}

interface MockQuestionHistoryEntry {
  question: string;
  answer: string;
}

export interface GenerateMockQuestionRequest extends LLMRequest {
  setup: MockInterviewSetup;
  profile_data: string;
  context: string;
  history: MockQuestionHistoryEntry[];
}

export interface EvaluateMockTurnRequest extends LLMRequest {
  question: string;
  answer: string;
  kind: MockQuestionKind;
  follow_up_count: number;
}

export interface GenerateMockReportRequest extends LLMRequest {
  setup: MockInterviewSetup;
  profile_data: string;
  context: string;
  questions: MockQuestionHistoryEntry[];
}

export interface SpeakRequest {
  text: string;
  language: Language;
}

/** One answered (or skipped) turn, kept for the report and the export. */
export interface MockAnswer {
  question: string;
  kind: MockQuestionKind;
  /** Empty when the question was skipped rather than answered. */
  answer: string;
  skipped: boolean;
}

/** The live text of the question on screen, plus whether it is spoken or read. */
export interface MockCurrentQuestion {
  text: string;
  kind: MockQuestionKind;
  /** False when the language has no Aura voice, or synthesis failed for one that does. */
  hasAudio: boolean;
  /** True once this question has had at least one follow-up. */
  isFollowUp: boolean;
  /**
   * Sentence-level chunks of `text`, computed once in main so the renderer never needs the
   * language-aware splitting rules. Empty when `hasAudio` is false. The renderer asks for one
   * chunk's audio at a time by index, with a lookahead of one, so time-to-first-audio is the
   * first sentence rather than the whole question.
   */
  chunks: string[];
}

export interface MockInterviewSessionState {
  state: MockInterviewState;
  setup: MockInterviewSetup | null;
  currentQuestion: MockCurrentQuestion | null;
  /** How many questions (not follow-ups) have been asked so far, 1-indexed for display. */
  questionNumber: number;
  /** Every question-and-answer turn asked, follow-ups included as their own entries. */
  answers: MockAnswer[];
  /** The partial/final transcript of the answer currently being given. */
  currentAnswerText: string;
  /**
   * What the live assistant would have suggested for each question, on by default - practising
   * with it is one of the two things this feature is for, the other being the interview itself.
   * See `mockLiveSuggestionsEnabled` in `RuntimeConfig`. One entry per question asked (follow-ups
   * included), oldest first, in the same shape the live panel already renders.
   */
  liveHints: LiveSuggestion[];
  report: MockReport | null;
  /** Set when report generation failed - the transcript is still shown and still exportable. */
  reportError: string | null;
  error: string | null;
}

/**
 * Whether a session is actively running - contending for the microphone, holding an ASR socket,
 * and mutually exclusive with the live assistant and action suggestions.
 *
 * `Idle` (never started, or cleared) and `Finished` (viewing the report, mic and socket already
 * released) are both "not active": the report can sit on screen indefinitely without blocking the
 * live assistant, since nothing audio-related is still running by the time it is shown.
 *
 * Exported so main (`appStateService.getState().mockInterview`) and the renderer (`appState`,
 * built from the same mirrored shape) can both ask the same question without duplicating the two
 * states that count as active.
 */
export function isMockInterviewSessionActive(session: MockInterviewSessionState | null): boolean {
  if (!session) return false;
  return session.state !== MockInterviewState.Idle && session.state !== MockInterviewState.Finished;
}
