export type ATLCategoryKey = 'Communication' | 'Social' | 'Self-management' | 'Research' | 'Thinking';

export interface ATLClusterData {
  description: string;
  indicators: string[];
}

export interface ATLCategoryData {
  color: string; // theme color key
  bgSoft: string;
  borderColor: string;
  textColor: string;
  clusters: Record<string, ATLClusterData>;
}

export interface TaskPart {
  label: string;
  prompt: string;
  placeholder?: string;
}

export interface GeneratedTask {
  title: string;
  chosen_cluster: string;
  context: string;
  atl_focus_explainer: string;
  idu_note?: string;
  parts: TaskPart[];
  estimated_minutes: number;
}

export interface TaskMeta {
  subject: string;
  topic: string;
  year: string;
  category: ATLCategoryKey;
  cluster: string;
  iduSubject?: string | null;
}

export type SkillLevel = 'Developing' | 'Applying' | 'Extending';

export interface TaskFeedback {
  level: SkillLevel;
  summary: string;
  strengths: string[];
  next_steps: string[];
}

export interface StudentResponseItem {
  label: string;
  prompt: string;
  response: string;
}

export interface ATLTaskLog {
  id: string;
  date: string; // ISO string or YYYY-MM-DD
  academicYear: string; // e.g. "2025-2026"
  term: 'Term 1' | 'Term 2' | string;
  studentName: string;
  subject: string;
  topic: string;
  mypYear: string;
  category: ATLCategoryKey;
  cluster: string;
  level: SkillLevel;
  taskTitle: string;
  responses: StudentResponseItem[];
  feedback: TaskFeedback;
  studentReflection?: string;
  attemptNumber?: number;
}

export interface AssignedTask {
  id: string;
  title: string;
  subject: string;
  topic: string;
  mypYear: string;
  category: ATLCategoryKey;
  cluster: string;
  task: GeneratedTask;
  teacherName?: string;
  createdAt: string; // ISO String
  academicYear: string;
  term: string;
  active: boolean;
}

