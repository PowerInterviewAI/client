/**
 * Mock Interview types (renderer)
 *
 * Mirrors `src/main/types/mock-interview.ts` the way `types/language.ts` mirrors its main
 * counterpart - same enum values, so the broadcast state needs no translation at the IPC boundary.
 */

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

export interface MockAnswer {
  question: string;
  kind: MockQuestionKind;
  answer: string;
  skipped: boolean;
}

export interface MockCurrentQuestion {
  text: string;
  kind: MockQuestionKind;
  hasAudio: boolean;
  isFollowUp: boolean;
  chunks: string[];
}

export interface MockInterviewSessionState {
  state: MockInterviewState;
  setup: MockInterviewSetup | null;
  currentQuestion: MockCurrentQuestion | null;
  questionNumber: number;
  answers: MockAnswer[];
  currentAnswerText: string;
  report: MockReport | null;
  reportError: string | null;
  error: string | null;
}

/** Same predicate as the main-process one, over the mirrored shape - see that docstring. */
export function isMockInterviewSessionActive(session: MockInterviewSessionState | null): boolean {
  if (!session) return false;
  return session.state !== MockInterviewState.Idle && session.state !== MockInterviewState.Finished;
}
