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

export type ScientificGraphType = 'line' | 'bar' | 'scatter' | 'histogram' | 'pie';

export interface ScientificDataset {
  graph_type: ScientificGraphType;
  title: string;
  global_context?: string;
  description?: string;
  x_axis_label: string;
  y_axis_label: string;
  source_label?: string; // e.g. "Simulated Scientific Dataset"
  data: Array<Record<string, any>>;
  x_key: string;
  y_key?: string;
  y_keys?: string[];
  series_labels?: Record<string, string>;
  unit_x?: string;
  unit_y?: string;
}

export interface TaskPart {
  label: string;
  prompt: string;
  placeholder?: string;
}

export interface GeneratedTask {
  title: string;
  chosen_cluster: string;
  global_context?: string;
  context: string;
  atl_focus_explainer: string;
  skill_indicators?: string[];
  scientific_dataset?: ScientificDataset;
  idu_note?: string;
  target_criteria?: string[];
  target_strands?: string[];
  parts: TaskPart[];
  estimated_minutes: number;
}

export interface TaskMeta {
  title?: string;
  taskTitle?: string;
  subject: string;
  topic: string;
  year: string;
  category: ATLCategoryKey;
  cluster: string;
  iduSubject?: string | null;
  criteria?: string[];
  strands?: string[];
  assignedTaskId?: string;
  dueDate?: string; // YYYY-MM-DD
  assignedTeacherName?: string;
}

export type SkillLevel = 'Developing' | 'Applying' | 'Extending';

export interface TaskFeedback {
  level: SkillLevel;
  formativeScore?: number; // Numerical formative score out of 8 (1-8)
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
  formativeScore?: number; // Numerical formative score out of 8 (1-8)
  taskTitle: string;
  skillIndicators?: string[];
  responses: StudentResponseItem[];
  feedback: TaskFeedback;
  studentReflection?: string;
  attemptNumber?: number;
  criteria?: string[];
  strands?: string[];
  assignedTaskId?: string;
  dueDate?: string; // YYYY-MM-DD
  submissionStatus?: 'on_time' | 'overdue' | 'not_applicable';
  daysOverdue?: number;
  evidenceToken?: string; // Unique persistent evidence portal token
}

export interface StudentRecord {
  id: string; // 4-digit student ID e.g. "8654"
  name: string;
  mypYear: string;
  classSection?: string; // e.g. "MYP 1A", "MYP 2C", "MYP 3"
  subject?: string;
  gender?: 'Male' | 'Female' | string;
}

export interface StudentEvidenceRosterItem {
  studentId?: string;
  studentName: string;
  mypYear: string;
  classSection?: string;
  subject?: string;
  gender?: string;
  logsCount: number;
  evidenceToken: string;
  evidenceUrl: string;
  averageScore: number;
  latestActivityDate: string;
  topCluster: string;
  masteryDistribution: {
    extending: number;
    applying: number;
    developing: number;
  };
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
  criteria?: string[];
  strands?: string[];
  dueDate?: string; // YYYY-MM-DD
  dueDaysPeriod?: number; // Days window if configured via preset
  targetStudentNames?: string[]; // Specific students if not assigned to entire class
}

