import { DigitalBadge, ATLTaskLog, SkillLevel } from '../types';

export const TEACHER_PRESET_BADGES: Omit<DigitalBadge, 'id' | 'earnedAt' | 'awardedBy'>[] = [
  {
    name: 'Critical Thinker Extraordinaire',
    category: 'teacher_awarded',
    icon: 'Brain',
    description: 'Demonstrated exceptional analytical depth, logical reasoning, and nuanced critique.',
    criteria: 'Criterion A / Critical Thinking excellence',
    color: 'indigo',
  },
  {
    name: 'Scientific Inquiry Star',
    category: 'teacher_awarded',
    icon: 'Sparkles',
    description: 'Formulated an insightful hypothesis, evaluated experimental variables, or extracted rich empirical patterns.',
    criteria: 'Criterion B/C Inquiring & Designing',
    color: 'emerald',
  },
  {
    name: 'Criterion Mastery (Level 7-8)',
    category: 'mastery',
    icon: 'Trophy',
    description: 'Achieved top-band MYP Criterion marks demonstrating comprehensive subject and ATL mastery.',
    criteria: 'Formative Score 7 or 8',
    color: 'amber',
  },
  {
    name: 'Creative Problem Solver',
    category: 'teacher_awarded',
    icon: 'Target',
    description: 'Developed innovative ideas, generated alternative perspectives, and connected cross-disciplinary concepts.',
    criteria: 'Creative Thinking & Transfer',
    color: 'purple',
  },
  {
    name: 'Reflective Scholar',
    category: 'teacher_awarded',
    icon: 'Award',
    description: 'Showcased outstanding metacognition, honest self-assessment, and actionable goals for future growth.',
    criteria: 'Reflective Thinking & Metacognition',
    color: 'rose',
  },
  {
    name: 'Exemplary Effort & Growth',
    category: 'achievement',
    icon: 'Flame',
    description: 'Invested thorough effort, displayed remarkable resilience, and demonstrated tremendous skill progression.',
    criteria: 'Diligence & Skill Growth',
    color: 'amber',
  },
  {
    name: 'Articulate Communicator',
    category: 'teacher_awarded',
    icon: 'Star',
    description: 'Structured arguments with crystal clarity, precision terminology, and compelling academic presentation.',
    criteria: 'Communication Skills',
    color: 'sky',
  },
];

/**
 * Automatically calculates milestone badges earned by a student across their task logs
 */
export function calculateStudentMilestoneBadges(logs: ATLTaskLog[], studentName?: string): DigitalBadge[] {
  const name = studentName || logs[0]?.studentName || 'Student';
  const studentLogs = studentName
    ? logs.filter((l) => l.studentName?.trim().toLowerCase() === studentName.trim().toLowerCase())
    : logs;

  const badges: DigitalBadge[] = [];

  // 1. First Task Apprentice
  if (studentLogs.length >= 1) {
    badges.push({
      id: `milestone-first-step-${name}`,
      name: 'First Step Apprentice',
      category: 'achievement',
      icon: 'Award',
      description: 'Completed and submitted your first verified MYP ATL Task log.',
      criteria: '1 Completed Task',
      earnedAt: studentLogs[studentLogs.length - 1].date,
      awardedBy: 'ATL System',
      color: 'sky',
    });
  }

  // 2. Active Explorer (3+ tasks)
  if (studentLogs.length >= 3) {
    badges.push({
      id: `milestone-active-explorer-${name}`,
      name: 'ATL Explorer',
      category: 'achievement',
      icon: 'Flame',
      description: 'Maintained consistent engagement across 3 or more ATL assessment tasks.',
      criteria: '3 Completed Tasks',
      earnedAt: studentLogs[0].date,
      awardedBy: 'ATL System',
      color: 'amber',
    });
  }

  // 3. High Mastery (At least two Level 7 or 8 / Extending scores)
  const highScores = studentLogs.filter(
    (l) => (l.formativeScore && l.formativeScore >= 7) || l.level === 'Extending' || (l.teacherEvaluation?.formativeScore ?? 0) >= 7
  );
  if (highScores.length >= 1) {
    badges.push({
      id: `milestone-high-mastery-${name}`,
      name: 'High Flyer (Level 7-8)',
      category: 'mastery',
      icon: 'Trophy',
      description: 'Reached top-tier Extending / Level 7-8 on an assessed MYP ATL challenge.',
      criteria: 'Formative Score >= 7',
      earnedAt: highScores[0].date,
      awardedBy: 'ATL System',
      color: 'emerald',
    });
  }

  // 4. Dedicated Reflective Learner (logs with reflection text)
  const reflectedLogs = studentLogs.filter(
    (l) => (l.studentReflection && l.studentReflection.trim().length > 15) ||
           (l.metacognitiveReflection && l.metacognitiveReflection.trim().length > 15)
  );
  if (reflectedLogs.length >= 2) {
    badges.push({
      id: `milestone-reflective-learner-${name}`,
      name: 'Metacognitive Pioneer',
      category: 'achievement',
      icon: 'Brain',
      description: 'Authored rich, meaningful self-evaluations and next steps on multiple tasks.',
      criteria: '2+ Metacognitive Reflections',
      earnedAt: reflectedLogs[0].date,
      awardedBy: 'ATL System',
      color: 'purple',
    });
  }

  // 5. Gather all explicitly awarded badges by teachers on any log
  studentLogs.forEach((l) => {
    if (l.badgeAwarded) {
      // avoid duplicates by ID
      if (!badges.some((b) => b.id === l.badgeAwarded?.id)) {
        badges.push(l.badgeAwarded);
      }
    } else if (l.teacherEvaluation?.badgeAwarded) {
      if (!badges.some((b) => b.id === l.teacherEvaluation?.badgeAwarded?.id)) {
        badges.push(l.teacherEvaluation.badgeAwarded);
      }
    }
  });

  return badges;
}
