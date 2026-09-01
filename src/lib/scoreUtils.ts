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
  const resolvedLevel = level || 'Applying';
  if (typeof score === 'number' && score >= 1 && score <= 8) {
    return `${score}/8 — ${resolvedLevel}`;
  }
  return resolvedLevel;
}
