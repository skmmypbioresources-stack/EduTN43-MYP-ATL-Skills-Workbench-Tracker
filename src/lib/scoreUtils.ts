import { SkillLevel, TaskFeedback, ATLTaskLog } from '../types';

/**
 * Safely resolves or calculates a formative score out of 8.
 * Developing -> 1–4
 * Applying -> 5–6
 * Extending -> 7–8
 *
 * If a score (1..8) is already provided, it is preserved.
 * If missing, it computes a nuanced, evidence-based score based on the response depth, feedback strengths, next steps, and performance level.
 */
export function resolveFormativeScore(
  input: {
    formativeScore?: number;
    level?: SkillLevel | string;
    feedback?: { formativeScore?: number; level?: SkillLevel | string; strengths?: string[]; next_steps?: string[]; summary?: string };
    responses?: Array<{ response?: string }>;
    strengths?: string[];
    next_steps?: string[];
    summary?: string;
  } | null | undefined
): number {
  if (!input) return 5;

  // 1. If formativeScore already exists directly on object
  if (typeof input.formativeScore === 'number' && input.formativeScore >= 1 && input.formativeScore <= 8) {
    return Math.round(input.formativeScore);
  }

  // 2. If formativeScore exists inside nested feedback
  if (input.feedback && typeof input.feedback.formativeScore === 'number' && input.feedback.formativeScore >= 1 && input.feedback.formativeScore <= 8) {
    return Math.round(input.feedback.formativeScore);
  }

  const level = input.level || input.feedback?.level || 'Applying';
  const strengthsCount = input.strengths?.length || input.feedback?.strengths?.length || 0;
  const nextStepsCount = input.next_steps?.length || input.feedback?.next_steps?.length || 0;

  // Measure total responses word count / substance
  let totalWords = 0;
  let filledParts = 0;
  if (input.responses && Array.isArray(input.responses)) {
    input.responses.forEach((r) => {
      const words = r.response ? r.response.trim().split(/\s+/).filter(Boolean).length : 0;
      if (words > 3) filledParts += 1;
      totalWords += words;
    });
  }

  if (level === 'Extending') {
    // 7 or 8 / 8
    // 8 is strictly reserved for exceptional, exhaustive submissions (at least 3 parts filled with >= 120 words total and 2+ solid strengths)
    if (filledParts >= 3 && totalWords >= 120 && strengthsCount >= 2) {
      return 8;
    }
    // Standard Extending is 7/8
    return 7;
  }

  if (level === 'Applying') {
    // 5 or 6 / 8
    // 6 for solid applying with consistent answers (>= 60 words and 2+ filled parts); 5 for standard sound competence
    if (filledParts >= 2 && totalWords >= 60 && strengthsCount >= 2) {
      return 6;
    }
    return 5;
  }

  // Developing: 1 - 4 / 8
  // 4 for developing with partial explanations; 3 for basic recall with gaps; 2 for minimal attempt; 1 for empty or fragmented
  if (totalWords >= 45 && filledParts >= 2) {
    return 4;
  }
  if (totalWords >= 20 && filledParts >= 1) {
    return 3;
  }
  if (totalWords > 0) {
    return 2;
  }
  return 1;
}

/**
 * Helper to format Score + Level label cleanly (e.g. "6/8 — Applying")
 */
export function formatScoreAndLevel(score?: number, level?: string): string {
  if (typeof score === 'number' && score >= 1 && score <= 8) {
    const resolvedLevel = level || 'Applying';
    return `${score}/8 — ${resolvedLevel}`;
  }
  return 'Pending Teacher Review';
}

/**
 * Determines whether a student task log has actually been evaluated/graded by a teacher.
 * If submitted for teacher correction and grade, or status is pending_review, it is NOT graded.
 */
export function isTaskLogGraded(log: Partial<ATLTaskLog> | null | undefined): boolean {
  if (!log) return false;

  // If status is explicitly pending_review, it is awaiting teacher correction and grade
  if (log.status === 'pending_review') {
    return false;
  }

  // 1. If teacher has explicitly awarded a score via evaluation
  if (
    log.teacherEvaluation &&
    (typeof log.teacherEvaluation.formativeScore === 'number' || typeof (log.teacherEvaluation as any).score === 'number')
  ) {
    return true;
  }

  // 2. If status is explicitly marked as graded
  if (log.status === 'graded' && typeof log.formativeScore === 'number') {
    return true;
  }

  // 3. If the feedback summary is pending submission, it is awaiting teacher review
  if (
    log.feedback?.summary === 'Work submitted for teacher review and grading.' ||
    log.feedback?.summary?.includes('submitted for teacher review')
  ) {
    return false;
  }

  // Legacy logs that had an explicit teacher evaluation
  if (log.teacherEvaluation) {
    return true;
  }

  return false;
}

/**
 * Safely extracts the valid numerical grade (1-8) ONLY if the task has been evaluated by a teacher.
 * Returns undefined if the task has not been officially graded yet.
 */
export function getTaskEffectiveScore(log: Partial<ATLTaskLog> | null | undefined): number | undefined {
  if (!log || !isTaskLogGraded(log)) {
    return undefined;
  }

  if (log.teacherEvaluation) {
    if (typeof log.teacherEvaluation.formativeScore === 'number') {
      return log.teacherEvaluation.formativeScore;
    }
    if (typeof (log.teacherEvaluation as any).score === 'number') {
      return (log.teacherEvaluation as any).score;
    }
  }

  if (log.status === 'graded' && typeof log.formativeScore === 'number') {
    return log.formativeScore;
  }

  return undefined;
}

/**
 * Retrieves AI suggested score (if student ran AI formative guidance), distinct from the official teacher grade.
 */
export function getTaskAiSuggestedScore(log: Partial<ATLTaskLog> | null | undefined): number | undefined {
  if (!log) return undefined;
  if (typeof log.aiSuggestedScore === 'number') return log.aiSuggestedScore;
  if (log.status === 'pending_review' && typeof log.feedback?.formativeScore === 'number') {
    return log.feedback.formativeScore;
  }
  return undefined;
}

/**
 * Retrieves AI suggested level (if student ran AI formative guidance), distinct from the official teacher level.
 */
export function getTaskAiSuggestedLevel(log: Partial<ATLTaskLog> | null | undefined): SkillLevel | undefined {
  if (!log) return undefined;
  if (log.aiSuggestedLevel) return log.aiSuggestedLevel;
  if (log.status === 'pending_review' && log.feedback?.level) {
    return log.feedback.level as SkillLevel;
  }
  return undefined;
}
