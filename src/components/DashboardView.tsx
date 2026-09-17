import React, { useState, useMemo } from 'react';
import {
  ATLTaskLog,
  ATLCategoryKey,
  AssignedTask,
  GeneratedTask,
  TaskPart,
  TaskMeta,
  AVAILABLE_ACADEMIC_YEARS,
  DEFAULT_ACADEMIC_YEAR
} from '../types';
import { exportToWordDoc, exportToPdf, exportToCsvSpreadsheet, getAvailableMonthsFromLogs } from '../lib/exportUtils';
import { ATL_DATA, ALL_CLUSTERS, ALL_STUDENTS_ROSTER } from '../data/atlData';
import { MYPCriteriaSelector } from './MYPCriteriaSelector';
import { ToddleLinkManagerModal } from './ToddleLinkManagerModal';
import { getStudentEvidenceToken, getStudentEvidenceUrl, copyToClipboard, findCanonicalStudent, isSameStudent } from '../lib/evidenceUtils';
import { generateTaskClient, refineTaskClient } from '../lib/geminiClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  BookOpen,
  Layers,
  Search,
  Trash2,
  Eye,
  FileText,
  Download,
  GraduationCap,
  School,
  ChevronRight,
  UserCheck,
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Key,
  EyeOff,
  ShieldAlert,
  Check,
  ClipboardList,
  Plus,
  Send,
  RefreshCw,
  MessageSquareQuote,
  FileSpreadsheet,
  Target,
  Filter,
  Calendar,
  Clock,
  Archive,
  FolderArchive,
  AlertCircle,
  Timer,
  CheckCircle,
  ArrowLeft,
  ChevronDown,
  Share2,
  Copy,
  ExternalLink,
  Link,
  Sliders,
  Wand2,
  Edit3,
  HelpCircle,
  Trophy,
} from 'lucide-react';
import { CustomTaskCreatorModal } from './CustomTaskCreatorModal';
import { TaskAssignmentModal } from './TaskAssignmentModal';
import { TaskDetailModal } from './TaskDetailModal';
import { TeacherGradingModal } from './TeacherGradingModal';

interface DashboardViewProps {
  logs: ATLTaskLog[];
  academicYear: string;
  setAcademicYear: (year: string) => void;
  onDeleteLog: (id: string) => void;
  onResetSampleLogs: () => void;
  isUnlocked: boolean;
  setIsUnlocked: (unlocked: boolean) => void;
  assignedTasks?: AssignedTask[];
  onCreateAssignedTask?: (taskData: {
    teacherName: string;
    subject: string;
    topic: string;
    mypYear: string;
    category: ATLCategoryKey;
    cluster: string;
    academicYear?: string;
    iduSubject?: string | null;
    criteria?: string[];
    strands?: string[];
    dueDate?: string;
    dueDaysPeriod?: number;
    finalTask?: GeneratedTask;
    customInstructions?: string;
    targetStudentNames?: string[];
  }) => Promise<void>;
  onUpdateAssignedTask?: (taskId: string, partial: Partial<AssignedTask>) => Promise<void>;
  onDeleteAssignedTask?: (taskId: string) => Promise<void>;
  onOpenStudentPortal?: (studentName: string, evidenceToken: string, mypYear?: string) => void;
  onUpdateTaskLog?: (logId: string, partial: Partial<ATLTaskLog>) => Promise<void>;
  customApiKey?: string;
}

// Helpers for MYP Class Normalization & Formatting
const normalizeMypYear = (yearStr: string | undefined): string => {
  if (!yearStr) return '3';
  const clean = String(yearStr).replace(/^MYP\s*/i, '').trim();
  return clean || '3';
};

const formatClassLabel = (yearKey: string): string => {
  const clean = normalizeMypYear(yearKey);
  switch (clean) {
    case '1':
      return 'MYP 1 (Grade 6 · Ages 11–12)';
    case '2':
      return 'MYP 2 (Grade 7 · Ages 12–13)';
    case '3':
      return 'MYP 3 (Grade 8 · Ages 13–14)';
    case '4':
      return 'MYP 4 (Grade 9 · Ages 14–15)';
    case '5':
      return 'MYP 5 (Grade 10 · Ages 15–16)';
    default:
      return `MYP ${clean}`;
  }
};

const formatShortClassTag = (yearKey: string): string => {
  const clean = normalizeMypYear(yearKey);
  return `MYP ${clean}`;
};

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateDueDateFromPeriod = (days: number): string => {
  const target = new Date();
  target.setDate(target.getDate() + days);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isTaskPastDue = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  return dueDate < getTodayDateString();
};

const getDueDateInfo = (dueDate?: string) => {
  if (!dueDate) {
    return {
      label: 'Open Task',
      fullDate: null,
      isOverdue: false,
      isUrgent: false,
      daysLeft: null,
      daysPast: null,
    };
  }
  const today = getTodayDateString();
  if (dueDate < today) {
    const dueTime = new Date(dueDate).getTime();
    const todayTime = new Date(today).getTime();
    const daysPast = Math.max(1, Math.round((todayTime - dueTime) / (1000 * 60 * 60 * 24)));
    return {
      label: `Past Due (${daysPast}d ago)`,
      fullDate: dueDate,
      isOverdue: true,
      isUrgent: false,
      daysLeft: null,
      daysPast,
    };
  }
  if (dueDate === today) {
    return {
      label: 'Due Today (11:59 PM)',
      fullDate: dueDate,
      isOverdue: false,
      isUrgent: true,
      daysLeft: 0,
      daysPast: null,
    };
  }
  const dueTime = new Date(dueDate).getTime();
  const todayTime = new Date(today).getTime();
  const daysLeft = Math.max(1, Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24)));
  return {
    label: `${daysLeft}d left (${dueDate})`,
    fullDate: dueDate,
    isOverdue: false,
    isUrgent: daysLeft <= 2,
    daysLeft,
    daysPast: null,
  };
};

const MYP_CLASS_KEYS = ['1', '2', '3', '4', '5'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  logs,
  academicYear,
  onDeleteLog,
  onResetSampleLogs,
  isUnlocked,
  setIsUnlocked,
  assignedTasks = [],
  onCreateAssignedTask,
  onUpdateAssignedTask,
  onDeleteAssignedTask,
  onOpenStudentPortal,
  onUpdateTaskLog,
  customApiKey,
}) => {
  // Toddle Link Manager Modal State
  const [showToddleManagerModal, setShowToddleManagerModal] = useState<boolean>(false);
  const [copiedProfileToken, setCopiedProfileToken] = useState<boolean>(false);

  // ChatGPT & Custom Questions Task Creator Modal State
  const [showCustomCreatorModal, setShowCustomCreatorModal] = useState<boolean>(false);
  const [taskToReassign, setTaskToReassign] = useState<AssignedTask | null>(null);
  const [taskDetailLog, setTaskDetailLog] = useState<ATLTaskLog | null>(null);
  const [teacherGradingLog, setTeacherGradingLog] = useState<ATLTaskLog | null>(null);

  // Assigned Tasks Creator & Preview State
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignModalStep, setAssignModalStep] = useState<'configure' | 'preview'>('configure');
  const [previewTask, setPreviewTask] = useState<GeneratedTask | null>(null);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isRefiningTask, setIsRefiningTask] = useState<boolean>(false);
  const [refineInstructionInput, setRefineInstructionInput] = useState<string>('');
  const [activeRefiningPartIndex, setActiveRefiningPartIndex] = useState<number | null>(null);
  const [partRefineInput, setPartRefineInput] = useState<string>('');
  const [refineFeedbackMsg, setRefineFeedbackMsg] = useState<string | null>(null);

  const [newTeacherName, setNewTeacherName] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('Sciences');
  const [newTopic, setNewTopic] = useState<string>('');
  const [newMypYear, setNewMypYear] = useState<string>('3');
  const [newTaskAcademicYear, setNewTaskAcademicYear] = useState<string>(academicYear || DEFAULT_ACADEMIC_YEAR);
  const [newCategory, setNewCategory] = useState<ATLCategoryKey>('Thinking');
  const [newCluster, setNewCluster] = useState<string>('Critical thinking');
  const [newIduToggle, setNewIduToggle] = useState<boolean>(false);
  const [newIduSubject, setNewIduSubject] = useState<string>('Sciences');
  const [newSelectedCriteria, setNewSelectedCriteria] = useState<string[]>([]);
  const [newSelectedStrands, setNewSelectedStrands] = useState<string[]>([]);
  const [isPublishingTask, setIsPublishingTask] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Keep newTaskAcademicYear in sync with currently selected global academicYear
  React.useEffect(() => {
    if (academicYear) {
      setNewTaskAcademicYear(academicYear);
    }
  }, [academicYear, showAssignModal]);

  // Due Date settings for newly assigned tasks
  const [newDueDateType, setNewDueDateType] = useState<'period' | 'custom' | 'none'>('period');
  const [newDuePeriodDays, setNewDuePeriodDays] = useState<number>(7);
  const [newCustomDueDate, setNewCustomDueDate] = useState<string>(() => calculateDueDateFromPeriod(7));

  // Update cluster when newCategory changes
  React.useEffect(() => {
    const availableClusters = Object.keys(ATL_DATA[newCategory]?.clusters || {});
    if (availableClusters.length > 0 && !availableClusters.includes(newCluster)) {
      setNewCluster(availableClusters[0]);
    }
  }, [newCategory]);

  // Generate Task Preview (Step 1 -> Step 2)
  const handleGenerateAndPreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTopic.trim()) {
      setPublishError('Please enter a curriculum topic or title for the task.');
      return;
    }

    setIsGeneratingPreview(true);
    setPublishError(null);
    setPublishSuccess(null);
    setRefineFeedbackMsg(null);

    const exactTitle = newTopic.trim();
    const taskMeta: TaskMeta = {
      title: exactTitle,
      taskTitle: exactTitle,
      subject: newSubject,
      topic: newTopic.trim(),
      year: newMypYear,
      category: newCategory,
      cluster: newCluster,
      iduSubject: newIduToggle ? newIduSubject : null,
      criteria: newSelectedCriteria,
      strands: newSelectedStrands,
      customInstructions: customInstructions.trim() || undefined,
    };

    try {
      const generated = await generateTaskClient(taskMeta, false, customApiKey);
      generated.title = exactTitle;
      setPreviewTask(generated);
      setAssignModalStep('preview');
    } catch (err: any) {
      console.error('Failed to generate task preview:', err);
      setPublishError(err?.message || 'Failed to generate task preview. Please try again.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // 1-Click AI Difficulty Calibration (Simplify vs Elevate)
  const handleCalibrateDifficulty = async (direction: 'simplify' | 'elevate') => {
    if (!previewTask) return;
    setIsRefiningTask(true);
    setPublishError(null);
    setRefineFeedbackMsg(null);

    const taskMeta: TaskMeta = {
      title: previewTask.title,
      subject: newSubject,
      topic: newTopic.trim(),
      year: newMypYear,
      category: newCategory,
      cluster: newCluster,
    };

    const instruction = direction === 'simplify'
      ? `Simplify and scaffold this task for MYP Year ${newMypYear} students (Ages ${newMypYear === '1' ? '11-12' : newMypYear === '2' ? '12-13' : newMypYear === '3' ? '13-14' : '14-16'}). Moderate scientific vocabulary, break down complex prompts into guided sub-steps, and provide supportive sentence starters in placeholders.`
      : `Elevate scientific rigor and higher-order inquiry for MYP Year ${newMypYear}. Enhance critical thinking, demand deeper mechanistic reasoning, require critique of experimental validity and confounding variables, and justify conclusions using quantitative/biological principles.`;

    try {
      const revised = await refineTaskClient(previewTask, instruction, taskMeta, undefined, customApiKey);
      setPreviewTask(revised);
      setRefineFeedbackMsg(direction === 'simplify' ? '✨ Task simplified with additional age-appropriate scaffolding!' : '✨ Scientific rigor elevated to higher-order inquiry!');
      setTimeout(() => setRefineFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to calibrate difficulty:', err);
      setPublishError(err?.message || 'Failed to adjust difficulty with AI.');
    } finally {
      setIsRefiningTask(false);
    }
  };

  // Custom AI Revision across the entire task
  const handleApplyCustomRefine = async (customInstruction: string) => {
    if (!previewTask || !customInstruction.trim()) return;
    setIsRefiningTask(true);
    setPublishError(null);
    setRefineFeedbackMsg(null);

    const taskMeta: TaskMeta = {
      title: previewTask.title,
      subject: newSubject,
      topic: newTopic.trim(),
      year: newMypYear,
      category: newCategory,
      cluster: newCluster,
    };

    try {
      const revised = await refineTaskClient(previewTask, customInstruction.trim(), taskMeta, undefined, customApiKey);
      setPreviewTask(revised);
      setRefineInstructionInput('');
      setRefineFeedbackMsg('✨ AI successfully applied your customization to the task!');
      setTimeout(() => setRefineFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to apply custom revision:', err);
      setPublishError(err?.message || 'Failed to apply revision.');
    } finally {
      setIsRefiningTask(false);
    }
  };

  // Surgical single-part AI regeneration
  const handleRegeneratePart = async (partIndex: number, specificInstruction?: string) => {
    if (!previewTask || !previewTask.parts || !previewTask.parts[partIndex]) return;
    setActiveRefiningPartIndex(partIndex);
    setPublishError(null);
    setRefineFeedbackMsg(null);

    const taskMeta: TaskMeta = {
      title: previewTask.title,
      subject: newSubject,
      topic: newTopic.trim(),
      year: newMypYear,
      category: newCategory,
      cluster: newCluster,
    };

    const instruction = specificInstruction?.trim() || `Regenerate Part ${partIndex + 1} with a fresh, engaging inquiry question aligned with MYP Year ${newMypYear} and the task scenario.`;

    try {
      const revised = await refineTaskClient(previewTask, instruction, taskMeta, partIndex, customApiKey);
      setPreviewTask(revised);
      setPartRefineInput('');
      setActiveRefiningPartIndex(null);
      setRefineFeedbackMsg(`✨ Question Part ${String.fromCharCode(65 + partIndex)} successfully updated!`);
      setTimeout(() => setRefineFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to regenerate part:', err);
      setPublishError(err?.message || 'Failed to regenerate question part.');
      setActiveRefiningPartIndex(null);
    }
  };

  // Direct edits to task title & context
  const handleUpdateTaskTitle = (title: string) => {
    if (!previewTask) return;
    setPreviewTask({ ...previewTask, title });
  };

  const handleUpdateTaskContext = (context: string) => {
    if (!previewTask) return;
    setPreviewTask({ ...previewTask, context });
  };

  const handleUpdatePartField = (partIndex: number, field: keyof TaskPart, value: string) => {
    if (!previewTask || !previewTask.parts[partIndex]) return;
    const updatedParts = [...previewTask.parts];
    updatedParts[partIndex] = {
      ...updatedParts[partIndex],
      [field]: value,
    };
    setPreviewTask({ ...previewTask, parts: updatedParts });
  };

  // Publish & Assign Final Task (from Step 2 Preview)
  const handlePublishFinalTask = async () => {
    if (!previewTask) return;
    if (!onCreateAssignedTask) return;

    setIsPublishingTask(true);
    setPublishError(null);
    setPublishSuccess(null);

    // Compute effective due date
    let effectiveDueDate: string | undefined = undefined;
    if (newDueDateType === 'period') {
      effectiveDueDate = calculateDueDateFromPeriod(newDuePeriodDays);
    } else if (newDueDateType === 'custom') {
      effectiveDueDate = newCustomDueDate;
    }

    try {
      await onCreateAssignedTask({
        teacherName: newTeacherName.trim(),
        subject: newSubject,
        topic: previewTask.title || newTopic.trim(),
        mypYear: newMypYear,
        category: newCategory,
        cluster: newCluster,
        academicYear: newTaskAcademicYear || academicYear || DEFAULT_ACADEMIC_YEAR,
        iduSubject: newIduToggle ? newIduSubject : null,
        criteria: newSelectedCriteria,
        strands: newSelectedStrands,
        dueDate: effectiveDueDate,
        dueDaysPeriod: newDueDateType === 'period' ? newDuePeriodDays : undefined,
        finalTask: previewTask,
        customInstructions: customInstructions.trim() || undefined,
      });

      setPublishSuccess('Task successfully published and assigned to all students!');
      setTimeout(() => {
        setPublishSuccess(null);
        setShowAssignModal(false);
        setAssignModalStep('configure');
        setPreviewTask(null);
        setNewTopic('');
        setCustomInstructions('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to publish assigned task:', err);
      setPublishError(err?.message || 'Failed to publish task.');
    } finally {
      setIsPublishingTask(false);
    }
  };
  // Teacher Password Authorization State
  const [teacherPassword, setTeacherPassword] = useState<string>(() => {
    try {
      return localStorage.getItem('atl_teacher_password') || 'mypteacher';
    } catch (e) {
      return 'mypteacher';
    }
  });

  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [currentPassInput, setCurrentPassInput] = useState<string>('');
  const [newPassInput, setNewPassInput] = useState<string>('');
  const [confirmPassInput, setConfirmPassInput] = useState<string>('');
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState<boolean>(false);

  // Delete Authorization Password State (Password: DELETETASK)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteActionType, setDeleteActionType] = useState<'log' | 'assignedTask' | 'resetLogs' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title?: string } | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Monthly Report Spreadsheet Export Modal State
  const [showMonthlyExportModal, setShowMonthlyExportModal] = useState<boolean>(false);
  const [selectedExportMonth, setSelectedExportMonth] = useState<string>('ALL');
  const [selectedExportClass, setSelectedExportClass] = useState<string>('ALL');
  const [selectedExportSubject, setSelectedExportSubject] = useState<string>('ALL');

  // Teacher, Class & Academic Year Filters for Published Common Tasks Panel
  const [assignedTeacherFilter, setAssignedTeacherFilter] = useState<string>('All');
  const [assignedClassFilter, setAssignedClassFilter] = useState<string>('All');
  const [assignedAcademicYearFilter, setAssignedAcademicYearFilter] = useState<string>('All');

  const distinctAssignedTeachers = useMemo(() => {
    return Array.from(
      new Set(assignedTasks.map((t) => (t.teacherName?.trim() ? t.teacherName.trim() : 'General Teacher')))
    ).sort();
  }, [assignedTasks]);

  // Check how many tasks currently belong to 2025-2026
  const tasksIn2025_2026 = useMemo(() => {
    return assignedTasks.filter((t) => (t.academicYear || DEFAULT_ACADEMIC_YEAR) === '2025-2026');
  }, [assignedTasks]);

  const [isMigratingTasks, setIsMigratingTasks] = useState<boolean>(false);
  const handleMigrateAllTasksTo2026 = async () => {
    if (!onUpdateAssignedTask || tasksIn2025_2026.length === 0) return;
    setIsMigratingTasks(true);
    try {
      await Promise.all(
        tasksIn2025_2026.map((t) => onUpdateAssignedTask(t.id, { academicYear: DEFAULT_ACADEMIC_YEAR }))
      );
    } catch (err) {
      console.error('Failed to migrate tasks to 2026-2027:', err);
    } finally {
      setIsMigratingTasks(false);
    }
  };

  const organizedDashboardTasks = useMemo(() => {
    const filtered = assignedTasks.filter((t) => {
      const teacher = t.teacherName?.trim() || 'General Teacher';
      if (assignedTeacherFilter !== 'All' && teacher !== assignedTeacherFilter) return false;
      if (assignedClassFilter !== 'All' && normalizeMypYear(t.mypYear) !== assignedClassFilter) return false;
      const tYear = t.academicYear || DEFAULT_ACADEMIC_YEAR;
      if (assignedAcademicYearFilter !== 'All' && tYear !== assignedAcademicYearFilter) return false;
      return true;
    });

    const grouped: Record<string, Record<string, AssignedTask[]>> = {};
    filtered.forEach((task) => {
      const teacherKey = task.teacherName?.trim() || 'General Teacher';
      const classKey = normalizeMypYear(task.mypYear);
      if (!grouped[teacherKey]) grouped[teacherKey] = {};
      if (!grouped[teacherKey][classKey]) grouped[teacherKey][classKey] = [];
      grouped[teacherKey][classKey].push(task);
    });

    return {
      grouped,
      totalMatching: filtered.length,
    };
  }, [assignedTasks, assignedTeacherFilter, assignedClassFilter, assignedAcademicYearFilter]);

  const availableMonths = useMemo(() => {
    return getAvailableMonthsFromLogs(logs);
  }, [logs]);

  const monthlyFilteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedExportMonth !== 'ALL') {
        const ym = log.date ? log.date.substring(0, 7) : '';
        if (ym !== selectedExportMonth) return false;
      }
      if (selectedExportClass !== 'ALL') {
        if (log.mypYear !== selectedExportClass) return false;
      }
      if (selectedExportSubject !== 'ALL') {
        if (log.subject !== selectedExportSubject) return false;
      }
      return true;
    });
  }, [logs, selectedExportMonth, selectedExportClass, selectedExportSubject]);

  const promptDeleteLog = (logId: string, title?: string) => {
    setDeleteActionType('log');
    setItemToDelete({ id: logId, title: title || 'Student Evaluation Record' });
    setDeletePasswordInput('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const promptDeleteAssignedTask = (taskId: string, title?: string) => {
    setDeleteActionType('assignedTask');
    setItemToDelete({ id: taskId, title: title || 'Assigned Common Task' });
    setDeletePasswordInput('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const promptResetAnalytics = () => {
    setDeleteActionType('resetLogs');
    setItemToDelete({ id: 'all', title: 'All Year Analytics Student Task Logs & Evaluation Records' });
    setDeletePasswordInput('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePasswordInput.trim() !== 'DELETETASK') {
      setDeleteError('Incorrect delete password. Password DELETETASK is required to delete data.');
      return;
    }

    if (deleteActionType === 'log' && itemToDelete) {
      onDeleteLog(itemToDelete.id);
      if (selectedLogForModal?.id === itemToDelete.id) {
        setSelectedLogForModal(null);
      }
    } else if (deleteActionType === 'assignedTask' && itemToDelete && onDeleteAssignedTask) {
      onDeleteAssignedTask(itemToDelete.id);
    } else if (deleteActionType === 'resetLogs') {
      onResetSampleLogs();
    }

    setShowDeleteModal(false);
    setDeleteActionType(null);
    setItemToDelete(null);
    setDeletePasswordInput('');
    setDeleteError(null);
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassword.trim() === teacherPassword) {
      setIsUnlocked(true);
      setAuthError(null);
      setEnteredPassword('');
      try {
        sessionStorage.setItem('atl_analytics_unlocked', 'true');
      } catch (e) {}
    } else {
      setAuthError('Incorrect teacher password. Please try again.');
    }
  };

  const handleLockAnalytics = () => {
    setIsUnlocked(false);
    try {
      sessionStorage.removeItem('atl_analytics_unlocked');
    } catch (e) {}
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPassInput.trim() !== teacherPassword) {
      setChangePassError('Current password is incorrect.');
      return;
    }
    if (!newPassInput || newPassInput.trim().length < 3) {
      setChangePassError('New password must be at least 3 characters long.');
      return;
    }
    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setChangePassError('New passwords do not match.');
      return;
    }

    const trimmed = newPassInput.trim();
    setTeacherPassword(trimmed);
    try {
      localStorage.setItem('atl_teacher_password', trimmed);
    } catch (e) {}

    setChangePassSuccess(true);
    setChangePassError(null);
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setChangePassSuccess(false);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
    }, 1500);
  };

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedStudent, setSelectedStudent] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLogForModal, setSelectedLogForModal] = useState<ATLTaskLog | null>(null);

  // Group students by Class
  const studentsByClassMap = useMemo(() => {
    const map: Record<string, { name: string; logsCount: number; mypYear: string }[]> = {
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
    };

    const studentInfo: Record<string, { logsCount: number; mypYear: string; canonicalName: string }> = {};

    logs.forEach((log) => {
      if (log.academicYear === academicYear && log.studentName && log.studentName.trim()) {
        const rawName = log.studentName.trim();
        const normKey = rawName.toLowerCase();
        const official = ALL_STUDENTS_ROSTER.find((s) => s.name.toLowerCase() === normKey);
        const canonicalName = official ? official.name : rawName;
        const yearKey = normalizeMypYear(official?.mypYear || log.mypYear);

        if (!studentInfo[normKey]) {
          studentInfo[normKey] = { logsCount: 0, mypYear: yearKey, canonicalName };
        }
        studentInfo[normKey].logsCount += 1;
        studentInfo[normKey].mypYear = yearKey;
      }
    });

    Object.values(studentInfo).forEach((info) => {
      const yearKey = info.mypYear;
      if (!map[yearKey]) {
        map[yearKey] = [];
      }
      map[yearKey].push({ name: info.canonicalName, logsCount: info.logsCount, mypYear: yearKey });
    });

    // Sort student lists alphabetically and remove any duplicate names
    Object.keys(map).forEach((k) => {
      const seen = new Set<string>();
      const deduped: { name: string; logsCount: number; mypYear: string }[] = [];
      map[k].sort((a, b) => a.name.localeCompare(b.name)).forEach((st) => {
        if (!seen.has(st.name.toLowerCase())) {
          seen.add(st.name.toLowerCase());
          deduped.push(st);
        }
      });
      map[k] = deduped;
    });

    return map;
  }, [logs, academicYear]);

  // Dynamic list of available students based on selected class filter
  const availableStudentsForClass = useMemo(() => {
    if (selectedClass === 'All') {
      const all: string[] = [];
      MYP_CLASS_KEYS.forEach((ckey) => {
        const list = studentsByClassMap[ckey] || [];
        list.forEach((s) => all.push(s.name));
      });
      return Array.from(new Set(all)).sort();
    } else {
      return (studentsByClassMap[selectedClass] || []).map((s) => s.name);
    }
  }, [studentsByClassMap, selectedClass]);

  // Student progress report state
  const [reportStudent, setReportStudent] = useState<string>('');

  // Automatically pick the first available student if current selection is invalid
  React.useEffect(() => {
    if (availableStudentsForClass.length > 0 && (!reportStudent || !availableStudentsForClass.includes(reportStudent))) {
      setReportStudent(availableStudentsForClass[0]);
    }
  }, [availableStudentsForClass, reportStudent]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchYear = log.academicYear === academicYear;
      const matchTerm = selectedTerm === 'All' || log.term === selectedTerm || (log.term && log.term.startsWith(selectedTerm));
      const matchSubject = selectedSubject === 'All' || log.subject === selectedSubject;
      const matchStudent = selectedStudent === 'All' || log.studentName === selectedStudent;

      const logClassKey = normalizeMypYear(log.mypYear);
      const matchClass = selectedClass === 'All' || logClassKey === selectedClass;

      const matchSearch =
        !searchQuery ||
        log.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.cluster.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatClassLabel(log.mypYear).toLowerCase().includes(searchQuery.toLowerCase());

      return matchYear && matchTerm && matchSubject && matchStudent && matchClass && matchSearch;
    });
  }, [logs, academicYear, selectedTerm, selectedSubject, selectedStudent, selectedClass, searchQuery]);

  // 1. Skill Cluster Targeting Frequency Data
  const clusterFrequencyData = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_CLUSTERS.forEach((c) => {
      counts[c.name] = 0;
    });

    filteredLogs.forEach((log) => {
      if (counts[log.cluster] !== undefined) {
        counts[log.cluster] += 1;
      } else {
        counts[log.cluster] = 1;
      }
    });

    return ALL_CLUSTERS.map((c) => ({
      cluster: c.name,
      category: c.category,
      count: counts[c.name] || 0,
      fill: ATL_DATA[c.category as ATLCategoryKey]?.color || '#33627d',
    }));
  }, [filteredLogs]);

  // 2. Category Usage Breakdown Data
  const categoryFrequencyData = useMemo(() => {
    const catCounts: Record<ATLCategoryKey, number> = {
      Communication: 0,
      Social: 0,
      'Self-management': 0,
      Research: 0,
      Thinking: 0,
    };

    filteredLogs.forEach((log) => {
      if (catCounts[log.category] !== undefined) {
        catCounts[log.category] += 1;
      }
    });

    return (Object.keys(catCounts) as ATLCategoryKey[]).map((cat) => ({
      category: cat,
      count: catCounts[cat],
      color: ATL_DATA[cat].color,
    }));
  }, [filteredLogs]);

  // 3. Academic Term Trend Line
  const trendData = useMemo(() => {
    const terms = ['Term 1', 'Term 2'];
    return terms.map((t) => {
      const termLogs = filteredLogs.filter((l) => l.term && l.term.startsWith(t));
      const developing = termLogs.filter((l) => l.level === 'Developing').length;
      const applying = termLogs.filter((l) => l.level === 'Applying').length;
      const extending = termLogs.filter((l) => l.level === 'Extending').length;

      return {
        term: t === 'Term 1' ? 'Term 1 (July–Dec)' : 'Term 2 (Jan–May)',
        totalTasks: termLogs.length,
        Developing: developing,
        Applying: applying,
        Extending: extending,
      };
    });
  }, [filteredLogs]);

  // KPI Metrics Calculation
  const totalTasks = filteredLogs.length;
  const uniqueClustersTargeted = new Set(filteredLogs.map((l) => l.cluster)).size;
  const topCategory = categoryFrequencyData.reduce((prev, current) =>
    prev.count > current.count ? prev : current
  , categoryFrequencyData[0]);

  const levelDistribution = useMemo(() => {
    const counts = { Developing: 0, Applying: 0, Extending: 0 };
    filteredLogs.forEach((l) => {
      counts[l.level] += 1;
    });
    return counts;
  }, [filteredLogs]);

  // Individual Student Progress Report Data
  const studentLogs = useMemo(() => {
    if (!reportStudent) return [];
    return logs.filter((l) => {
      const matchYear = !academicYear || !l.academicYear || l.academicYear === academicYear;
      const matchStudent = isSameStudent(l.studentName || '', reportStudent, l.mypYear);
      return matchYear && matchStudent;
    });
  }, [logs, academicYear, reportStudent]);

  const studentClusterCoverage = useMemo(() => {
    const setClust = new Set(studentLogs.map((l) => l.cluster));
    return `${setClust.size} / 10 Clusters`;
  }, [studentLogs]);

  const studentClassTag = useMemo(() => {
    if (studentLogs.length > 0) {
      return formatClassLabel(studentLogs[0].mypYear);
    }
    return 'MYP Class';
  }, [studentLogs]);

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <div className="rounded-3xl border border-indigo-100 bg-white p-8 shadow-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-4">
            <Lock className="h-8 w-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Teacher Access Authorization</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Year Analytics Protected
          </h2>

          <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">
            Year Analytics contain student evaluation logs, MYP class progress matrices, and individual growth reports. Please enter the teacher password to view.
          </p>

          <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Teacher Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter teacher password..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all shadow-2xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              {authError && (
                <div className="mt-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              <Unlock className="h-4 w-4" />
              <span>Unlock Year Analytics</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Global Filter Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <School className="h-4 w-4" />
              <span>Class-by-Class Academic Year Analytics</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              ATL Skills Mastery Dashboard ({academicYear})
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Organized by MYP Class levels (Grade 6 to Grade 10) to easily analyze class growth, track targeted skill clusters, and generate student reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
              title="Create a common task and assign to all students"
            >
              <Plus className="h-4 w-4" />
              <span>Create & Assign Common Task</span>
            </button>

            <button
              onClick={() => setShowToddleManagerModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-800 hover:border-indigo-300 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
              title="Manage and copy student Toddle / LMS standalone evidence portal links and export roster"
            >
              <Share2 className="h-4 w-4 text-indigo-600" />
              <span>Toddle & LMS Links</span>
            </button>

            <button
              onClick={() => setShowMonthlyExportModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
              title="Download monthly or custom task evaluation report as an Excel spreadsheet (.csv)"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Monthly Excel Report</span>
            </button>

            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
              title="Change default or custom teacher password"
            >
              <Key className="h-3.5 w-3.5 text-indigo-600" />
              <span>Password Settings</span>
            </button>

            <button
              onClick={handleLockAnalytics}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs font-bold text-amber-800 hover:border-amber-300 hover:bg-amber-100 transition-all"
              title="Lock Year Analytics view"
            >
              <Lock className="h-3.5 w-3.5 text-amber-600" />
              <span>Lock Analytics</span>
            </button>

            <button
              onClick={promptResetAnalytics}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all cursor-pointer"
              title="Clear or reset task analytics logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Reset Analytics Data</span>
            </button>
          </div>
        </div>

        {/* Assigned Tasks Teacher Management Panel */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span>Published Common Class Tasks</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    {assignedTasks.length} Active
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Organized by Teacher and Class. Teachers can manage, delete, or keep tasks per class.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Teacher Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teacher:</span>
                <select
                  value={assignedTeacherFilter}
                  onChange={(e) => setAssignedTeacherFilter(e.target.value)}
                  className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer text-xs"
                >
                  <option value="All">All Teachers ({distinctAssignedTeachers.length})</option>
                  {distinctAssignedTeachers.map((tName) => (
                    <option key={tName} value={tName}>
                      {tName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class:</span>
                <select
                  value={assignedClassFilter}
                  onChange={(e) => setAssignedClassFilter(e.target.value)}
                  className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer text-xs"
                >
                  <option value="All">All Classes (MYP 1 - 5)</option>
                  <option value="1">MYP 1 (Grade 6)</option>
                  <option value="2">MYP 2 (Grade 7)</option>
                  <option value="3">MYP 3 (Grade 8)</option>
                  <option value="4">MYP 4 (Grade 9)</option>
                  <option value="5">MYP 5 (Grade 10)</option>
                </select>
              </div>

              <button
                onClick={() => setShowCustomCreatorModal(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
                title="Paste questions, stimuli, and attach diagrams from ChatGPT or create custom multi-part tasks"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>ChatGPT & Custom Questions</span>
              </button>

              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>AI Generator Task</span>
              </button>
            </div>
          </div>

          {assignedTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
              <p className="text-xs font-medium text-slate-500">
                No common tasks published yet. Click <strong className="text-indigo-600 font-bold">"Assign New Task"</strong> to create a shared task that appears on every student's portal.
              </p>
            </div>
          ) : organizedDashboardTasks.totalMatching === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
              <p className="text-xs font-semibold text-slate-600">
                No published tasks matching selected filter ({assignedTeacherFilter !== 'All' ? `Teacher: ${assignedTeacherFilter}` : ''} {assignedClassFilter !== 'All' ? `Class: ${formatClassLabel(assignedClassFilter)}` : ''}).
              </p>
              <button
                type="button"
                onClick={() => {
                  setAssignedTeacherFilter('All');
                  setAssignedClassFilter('All');
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Filter className="h-3 w-3" />
                <span>Show All Published Tasks</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(organizedDashboardTasks.grouped).map(([teacherName, classGroups]) => (
                <div key={teacherName} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
                  {/* Teacher Header */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                        <UserCheck className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Teacher: {teacherName}
                      </span>
                    </div>
                    <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {Object.values(classGroups).reduce((acc, curr) => acc + curr.length, 0)}{' '}
                      {Object.values(classGroups).reduce((acc, curr) => acc + curr.length, 0) === 1 ? 'Task' : 'Tasks'}
                    </span>
                  </div>

                  {/* Class Sub-sections */}
                  <div className="space-y-3">
                    {Object.entries(classGroups).map(([classYear, tasks]) => (
                      <div key={classYear} className="space-y-1.5">
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3 text-indigo-600" />
                            {formatClassLabel(classYear)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({tasks.length} {tasks.length === 1 ? 'task' : 'tasks'})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {tasks.map((at) => {
                            const dueInfo = getDueDateInfo(at.dueDate);

                            return (
                              <div
                                key={at.id}
                                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="rounded-md bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                                        {at.subject}
                                      </span>
                                      {at.task?.idu_note && (
                                        <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 flex items-center gap-1">
                                          <Layers className="h-3 w-3 text-purple-600" /> IDU
                                        </span>
                                      )}
                                      {(at.criteria || at.task?.target_criteria) &&
                                        (at.criteria || at.task?.target_criteria)!.length > 0 && (
                                          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                            <Target className="h-3 w-3 text-emerald-600" />
                                            {(at.criteria || at.task?.target_criteria)!
                                              .map((c) => c.replace('Criterion ', ''))
                                              .join(', ')}
                                          </span>
                                        )}
                                    </div>

                                    {/* Due Date Indicator */}
                                    {dueInfo.fullDate ? (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                                          dueInfo.isOverdue
                                            ? 'bg-amber-100 border border-amber-200 text-amber-800'
                                            : dueInfo.isUrgent
                                            ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                        }`}
                                      >
                                        <Clock className="h-2.5 w-2.5" />
                                        <span>{dueInfo.label}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 font-bold">Open Task</span>
                                    )}
                                  </div>

                                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                                    {at.title || at.task?.title || at.topic}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                    {at.topic} ({at.cluster})
                                  </p>

                                  {/* Target Audience / Student Assignment Info */}
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {Array.isArray(at.targetStudentNames) && at.targetStudentNames.length > 0 ? (
                                      <span
                                        className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                                        title={at.targetStudentNames.join(', ')}
                                      >
                                        <UserCheck className="h-2.5 w-2.5 text-amber-600" />
                                        <span>{at.targetStudentNames.length} Selected Students</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                        <Users className="h-2.5 w-2.5 text-slate-500" />
                                        <span>Whole Class ({at.mypYear === 'All' ? 'All MYP' : `MYP ${at.mypYear}`})</span>
                                      </span>
                                    )}
                                    {at.academicYear && (
                                      <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                                        {at.academicYear}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                                  <span className={`font-bold flex items-center gap-1 ${
                                    dueInfo.isOverdue ? 'text-amber-700' : 'text-emerald-700'
                                  }`}>
                                    {dueInfo.isOverdue ? (
                                      <>
                                        <FolderArchive className="h-3 w-3 text-amber-600" />
                                        <span>Archived (Past Due)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        <span>Active on Workbench</span>
                                      </>
                                    )}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setTaskToReassign(at)}
                                      className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                      title="Reassign to specific students or change class"
                                    >
                                      <Users className="h-3 w-3" />
                                      <span>Assign</span>
                                    </button>

                                    {onDeleteAssignedTask && (
                                      <button
                                        onClick={() => promptDeleteAssignedTask(at.id, at.title || at.topic)}
                                        className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-t border-slate-100 pt-5">
          {/* Class / MYP Year Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Class / Grade Level
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudent('All'); // Reset student filter on class change
              }}
              className="w-full rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-900 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            >
              <option value="All">All Classes (MYP 1 - 5)</option>
              <option value="1">MYP 1 (Grade 6)</option>
              <option value="2">MYP 2 (Grade 7)</option>
              <option value="3">MYP 3 (Grade 8)</option>
              <option value="4">MYP 4 (Grade 9)</option>
              <option value="5">MYP 5 (Grade 10)</option>
            </select>
          </div>

          {/* Academic Term */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Academic Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            >
              <option value="All">All Terms (Full Year)</option>
              <option value="Term 1">Term 1 (July – Dec)</option>
              <option value="Term 2">Term 2 (Jan – May)</option>
            </select>
          </div>

          {/* Subject Group */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Subject Group
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            >
              <option value="All">All Subject Groups</option>
              <option value="Sciences">Sciences</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Language and Literature">Language and Literature</option>
              <option value="Individuals and Societies">Individuals and Societies</option>
              <option value="Design">Design</option>
              <option value="Arts">Arts</option>
              <option value="Physical and Health Education">Physical & Health Education</option>
            </select>
          </div>

          {/* Student Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Student Name
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            >
              <option value="All">
                {selectedClass === 'All' ? 'All Students (All Classes)' : `All Students in ${formatShortClassTag(selectedClass)}`}
              </option>

              {selectedClass === 'All' ? (
                MYP_CLASS_KEYS.map((ckey) => {
                  const list = studentsByClassMap[ckey] || [];
                  if (list.length === 0) return null;
                  return (
                    <optgroup key={`filter-class-${ckey}`} label={formatClassLabel(ckey)}>
                      {list.map((st) => (
                        <option key={`filter-opt-${ckey}-${st.name}`} value={st.name}>
                          {st.name} ({st.logsCount} tasks)
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                (studentsByClassMap[selectedClass] || []).map((st) => (
                  <option key={`filter-single-${selectedClass}-${st.name}`} value={st.name}>
                    {st.name} ({st.logsCount} tasks)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Search Tasks
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Topic, skill, or student..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Class Level Selection Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4 text-indigo-600" />
          <span>Class View:</span>
        </span>

        <button
          onClick={() => {
            setSelectedClass('All');
            setSelectedStudent('All');
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            selectedClass === 'All'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>All Classes</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            selectedClass === 'All' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {logs.filter(l => l.academicYear === academicYear).length} tasks
          </span>
        </button>

        {MYP_CLASS_KEYS.map((ckey) => {
          const classStudents = studentsByClassMap[ckey] || [];
          const classLogsCount = logs.filter(
            (l) => l.academicYear === academicYear && normalizeMypYear(l.mypYear) === ckey
          ).length;

          return (
            <button
              key={ckey}
              onClick={() => {
                setSelectedClass(ckey);
                setSelectedStudent('All');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                selectedClass === ckey
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{formatClassLabel(ckey)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  selectedClass === ckey ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {classStudents.length} {classStudents.length === 1 ? 'student' : 'students'} • {classLogsCount} tasks
              </span>
            </button>
          );
        })}
      </div>

      {/* Class Overview Cards Grid (when viewing All Classes) */}
      {selectedClass === 'All' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              MYP Class Roster & Performance Overview
            </h3>
            <span className="text-xs font-semibold text-slate-400">Click any class card to filter dashboard</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {MYP_CLASS_KEYS.map((ckey) => {
              const students = studentsByClassMap[ckey] || [];
              const classLogs = logs.filter(
                (l) => l.academicYear === academicYear && normalizeMypYear(l.mypYear) === ckey
              );
              
              // Top cluster for this class
              const clustCounts: Record<string, number> = {};
              classLogs.forEach((l) => {
                clustCounts[l.cluster] = (clustCounts[l.cluster] || 0) + 1;
              });
              let topClust = 'None';
              let maxC = 0;
              Object.entries(clustCounts).forEach(([c, cnt]) => {
                if (cnt > maxC) {
                  maxC = cnt;
                  topClust = c;
                }
              });

              return (
                <div
                  key={ckey}
                  onClick={() => setSelectedClass(ckey)}
                  className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700">
                        {formatShortClassTag(ckey)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-slate-900">{formatClassLabel(ckey)}</h4>
                    
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Students:</span>
                        <strong className="text-slate-800">{students.length}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Tasks Logged:</span>
                        <strong className="text-slate-800">{classLogs.length}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Top ATL Skill:</span>
                        <strong className="text-indigo-600 truncate max-w-[110px]">{topClust}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700">
                    <span>View Class Analytics</span>
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Class Highlight Banner */}
      {selectedClass !== 'All' && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-3 text-white shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Active Class View</div>
              <h3 className="text-xl font-black text-indigo-950 tracking-tight">
                {formatClassLabel(selectedClass)}
              </h3>
              <p className="text-xs font-medium text-indigo-800 mt-0.5">
                Showing analytics for {(studentsByClassMap[selectedClass] || []).length} students and {filteredLogs.length} recorded ATL tasks in {academicYear}.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedClass('All')}
            className="self-start md:self-auto rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            Switch to All Classes View
          </button>
        </div>
      )}

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total ATL Tasks</span>
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{totalTasks}</div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {selectedClass === 'All' ? 'Targeted practice tasks across all classes' : `Tasks completed by ${formatShortClassTag(selectedClass)} students`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Clusters Covered</span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{uniqueClustersTargeted} / 10</div>
          <p className="mt-1 text-xs font-medium text-slate-500">Unique ATL skill clusters practiced</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Category</span>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 truncate">
            {topCategory?.category || 'None'}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">{topCategory?.count || 0} tasks explicitly targeted</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-violet-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mastery Spread</span>
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-700">{levelDistribution.Extending} Ext</span>
            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-700">{levelDistribution.Applying} App</span>
            <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-amber-700">{levelDistribution.Developing} Dev</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">Formative assessment result breakdown</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Frequency Bar Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                ATL Skill Cluster Usage Frequency
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                How many times each of the 10 MYP ATL skill clusters was targeted in {academicYear}
                {selectedClass !== 'All' ? ` for ${formatClassLabel(selectedClass)}` : ' across all classes'}
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterFrequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="cluster"
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="count" name="Times Targeted" radius={[6, 6, 0, 0]}>
                  {clusterFrequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown & Trend Velocity */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Academic Term Usage Trends
            </h3>
            <p className="text-xs font-medium text-slate-500 mb-4 mt-0.5">
              Volume of ATL task practice across terms in {academicYear}
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Line type="monotone" dataKey="totalTasks" name="Total Tasks" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Extending" name="Extending Level" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 10 ATL Clusters Coverage Heatmap Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">
          10 MYP ATL Clusters Coverage Matrix
        </h3>
        <p className="text-xs font-medium text-slate-500 mb-6 mt-0.5">
          Complete breakdown of target count, subject distribution, and active status for all 10 clusters in {academicYear}
          {selectedClass !== 'All' && ` (${formatClassLabel(selectedClass)})`}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {ALL_CLUSTERS.map((cl) => {
            const catData = ATL_DATA[cl.category as ATLCategoryKey];
            const clusterLogs = filteredLogs.filter((l) => l.cluster === cl.name);
            const count = clusterLogs.length;

            return (
              <div
                key={cl.name}
                className="rounded-2xl border p-4 transition-all shadow-2xs hover:shadow-xs"
                style={{
                  borderColor: count > 0 ? catData.borderColor : '#e2e8f0',
                  backgroundColor: count > 0 ? catData.bgSoft : '#f8fafc',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cl.category}
                  </span>
                  <span
                    className="text-xs font-extrabold rounded-full px-2.5 py-0.5"
                    style={{
                      backgroundColor: count > 0 ? catData.color : '#e2e8f0',
                      color: count > 0 ? '#ffffff' : '#64748b',
                    }}
                  >
                    {count} {count === 1 ? 'time' : 'times'}
                  </span>
                </div>

                <div className="mt-2 font-bold text-sm text-slate-900">{cl.name}</div>

                <div className="mt-3 w-full bg-white/80 rounded-full h-2 overflow-hidden border border-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(count * 25, 100)}%`,
                      backgroundColor: catData.color,
                    }}
                  />
                </div>

                <div className="mt-2 text-[11px] text-slate-500 font-medium">
                  {count > 0 ? (
                    <span>Last used in <strong className="text-slate-800">{clusterLogs[clusterLogs.length - 1].subject}</strong></span>
                  ) : (
                    <span className="italic text-slate-400">Not yet targeted in {selectedTerm === 'All' ? 'this year' : selectedTerm}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Class Student Roster Chips & Individual Progress Report */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <Users className="h-4 w-4" />
              <span>Class Roster & Progress Reports</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              Individual Student Growth Profiles
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Select a student to inspect their progress, view skill attainment history, or export a progress report card.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-500">Select Student:</label>
            <select
              value={reportStudent}
              onChange={(e) => setReportStudent(e.target.value)}
              disabled={availableStudentsForClass.length === 0}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none disabled:opacity-50"
            >
              {availableStudentsForClass.length === 0 ? (
                <option value="">No student records yet</option>
              ) : selectedClass === 'All' ? (
                MYP_CLASS_KEYS.map((ckey) => {
                  const list = studentsByClassMap[ckey] || [];
                  if (list.length === 0) return null;
                  return (
                    <optgroup key={`report-class-${ckey}`} label={formatClassLabel(ckey)}>
                      {list.map((s) => (
                        <option key={`report-opt-${ckey}-${s.name}`} value={s.name}>
                          {s.name} ({s.logsCount} tasks)
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                (studentsByClassMap[selectedClass] || []).map((s) => (
                  <option key={`report-single-${selectedClass}-${s.name}`} value={s.name}>
                    {s.name} ({s.logsCount} tasks)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Quick Clickable Student Chips for Current Class */}
        {availableStudentsForClass.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>
                {selectedClass === 'All'
                  ? 'All Class Rosters (Click student name to view profile):'
                  : `Roster for ${formatClassLabel(selectedClass)}:`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableStudentsForClass.map((stName) => {
                const isSelected = reportStudent === stName;
                const stLogs = logs.filter((l) => (!academicYear || !l.academicYear || l.academicYear === academicYear) && isSameStudent(l.studentName || '', stName, l.mypYear));
                const stClassTag = stLogs.length > 0 ? formatShortClassTag(stLogs[0].mypYear) : '';

                return (
                  <button
                    key={stName}
                    onClick={() => setReportStudent(stName)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <span>{stName}</span>
                    {stClassTag && (
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md font-black ${
                          isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {stClassTag}
                      </span>
                    )}
                    <span
                      className={`text-[10px] rounded-full px-1.5 py-0.2 font-extrabold ${
                        isSelected ? 'bg-indigo-800 text-white' : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {stLogs.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Student Progress Card Display */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">MYP Student Progress Card</span>
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                  {studentClassTag}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {reportStudent || 'No Student Selected'}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Academic Year {academicYear} • ATL Skills Development Log</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                {studentLogs.length} Tasks Logged
              </span>
              <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {studentClusterCoverage}
              </span>

              {reportStudent && (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    onClick={() => {
                      const canonical = findCanonicalStudent(reportStudent, studentClassTag);
                      const url = getStudentEvidenceUrl(canonical.canonicalToken, canonical.canonicalName, canonical.mypYear);
                      copyToClipboard(url);
                      setCopiedProfileToken(true);
                      setTimeout(() => setCopiedProfileToken(false), 2000);
                    }}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                      copiedProfileToken
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                    }`}
                    title="Copy unique standalone evidence portal URL for Toddle / LMS"
                  >
                    {copiedProfileToken ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied Toddle Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Toddle Link</span>
                      </>
                    )}
                  </button>

                  {onOpenStudentPortal && (
                    <button
                      onClick={() => {
                        const canonical = findCanonicalStudent(reportStudent, studentClassTag);
                        onOpenStudentPortal(canonical.canonicalName, canonical.canonicalToken, canonical.mypYear);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                      title="Preview this student's standalone evidence portal"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Open Portal</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {studentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-medium leading-relaxed">
              {availableStudentsForClass.length === 0 ? (
                <span>No student task logs recorded yet for {academicYear}. Start by filling in student details and completing tasks in the <strong>Task Workbench</strong> tab!</span>
              ) : (
                <span>No logged ATL tasks found for <strong>{reportStudent}</strong> in {academicYear}. Select another student or switch to the Task Workbench to log a new task.</span>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Targeted Skills History & Level Attainment
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 font-bold uppercase text-slate-400 text-[11px]">
                      <th className="py-2.5 px-3">Date & Term</th>
                      <th className="py-2.5 px-3">Subject & Topic</th>
                      <th className="py-2.5 px-3">ATL Category & Cluster</th>
                      <th className="py-2.5 px-3 text-center">Score & Level</th>
                      <th className="py-2.5 px-3">Key Feedback Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {studentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white transition-colors">
                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {log.date}
                          <div className="text-[10px] text-slate-400">{log.term}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{log.subject}</div>
                          <div className="text-slate-500 font-medium">{log.topic}</div>
                          {log.criteria && log.criteria.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {log.criteria.map((c, i) => (
                                <span key={i} className="inline-block rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                                  {c.replace('Criterion ', '')}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-indigo-700">{log.cluster}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{log.category}</div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              log.level === 'Extending'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : log.level === 'Applying'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}
                          >
                            <span className="font-extrabold">{log.formativeScore ? `${log.formativeScore}/8` : (log.feedback?.formativeScore ? `${log.feedback.formativeScore}/8` : '')}</span>
                            {(log.formativeScore || log.feedback?.formativeScore) && <span className="opacity-40">•</span>}
                            <span>{log.level}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs leading-snug font-medium">
                          {log.feedback.summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Log History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Academic Year Task History Log
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Showing {filteredLogs.length} logged student task evaluations for {academicYear}
              {selectedClass !== 'All' && ` (${formatClassLabel(selectedClass)})`}
            </p>
          </div>

          <button
            onClick={() => exportToCsvSpreadsheet(filteredLogs, `ATL_Task_Logs_${selectedClass === 'All' ? 'All_Classes' : 'MYP' + selectedClass}`)}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Export currently filtered history logs as Excel spreadsheet (.csv)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export History Spreadsheet (.csv)</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-bold uppercase text-slate-400 text-[11px]">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Timing / Due Date</th>
                <th className="py-3 px-3">Class / Grade</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Subject & Topic</th>
                <th className="py-3 px-3">ATL Skill Cluster</th>
                <th className="py-3 px-3 text-center">Score & Level</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    No tasks found matching current class or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                      {log.date}
                      <div className="text-[10px] text-slate-400">{log.term}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {log.submissionStatus === 'overdue' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-800">
                            <Timer className="h-3 w-3 text-amber-600" />
                            <span>Extended (+{log.daysOverdue || 1}d)</span>
                          </span>
                          {log.dueDate && (
                            <div className="text-[9px] text-slate-400 font-medium mt-0.5">Due: {log.dueDate}</div>
                          )}
                        </div>
                      ) : log.submissionStatus === 'on_time' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            <span>On-Time</span>
                          </span>
                          {log.dueDate && (
                            <div className="text-[9px] text-slate-400 font-medium mt-0.5">Due: {log.dueDate}</div>
                          )}
                        </div>
                      ) : log.dueDate ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          <span>Due: {log.dueDate}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Standard</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-1 text-[11px] font-extrabold text-indigo-700">
                        {formatShortClassTag(log.mypYear)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {log.studentName}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.subject}</div>
                      <div className="text-slate-500 font-medium">{log.topic}</div>
                      {log.criteria && log.criteria.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {log.criteria.map((c, i) => (
                            <span key={i} className="inline-block rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                              {c.replace('Criterion ', '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-indigo-700">{log.cluster}</span>
                      <div className="text-[10px] text-slate-400 font-medium">{log.category}</div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          log.level === 'Extending'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : log.level === 'Applying'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        <span className="font-extrabold">{log.formativeScore ? `${log.formativeScore}/8` : (log.feedback?.formativeScore ? `${log.feedback.formativeScore}/8` : '')}</span>
                        {(log.formativeScore || log.feedback?.formativeScore) && <span className="opacity-40">•</span>}
                        <span>{log.level}</span>
                      </span>

                      {(log.teacherEvaluation?.badgeAwarded || log.badgeAwarded) && (
                        <div
                          className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5"
                          title={(log.teacherEvaluation?.badgeAwarded || log.badgeAwarded)?.description}
                        >
                          <Trophy className="h-3 w-3 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[90px]">{(log.teacherEvaluation?.badgeAwarded || log.badgeAwarded)?.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setTaskDetailLog(log)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="View Full Task, Questions, Work & Evaluation"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {onUpdateTaskLog && (
                          <button
                            onClick={() => setTeacherGradingLog(log)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Teacher Grade, Correct & Award Badge"
                          >
                            <Award className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (onOpenStudentPortal) {
                              const canonical = findCanonicalStudent(log.studentName, log.mypYear);
                              onOpenStudentPortal(canonical.canonicalName, canonical.canonicalToken, canonical.mypYear);
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={`Open ${log.studentName}'s Student Portal / Evidence Folder`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => promptDeleteLog(log.id, `${log.studentName} (${log.subject} - ${log.topic})`)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-fadeIn">
            {/* Sticky Header with Back button */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/90 shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Log Entry Details
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                  {selectedLogForModal.taskTitle}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLogForModal(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Go Back"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLogForModal(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl font-medium text-slate-800 border border-slate-200/60">
                <div><strong className="text-slate-500">Student:</strong> {selectedLogForModal.studentName}</div>
                <div><strong className="text-slate-500">Class:</strong> {formatClassLabel(selectedLogForModal.mypYear)}</div>
                <div><strong className="text-slate-500">Date:</strong> {selectedLogForModal.date} ({selectedLogForModal.term})</div>
                <div><strong className="text-slate-500">Subject:</strong> {selectedLogForModal.subject}</div>
                <div><strong className="text-slate-500">ATL Cluster:</strong> {selectedLogForModal.cluster} ({selectedLogForModal.category})</div>
                <div>
                  <strong className="text-slate-500">Formative Score:</strong>{' '}
                  <span className="font-extrabold text-indigo-700">
                    {selectedLogForModal.formativeScore ? `${selectedLogForModal.formativeScore}/8` : (selectedLogForModal.feedback?.formativeScore ? `${selectedLogForModal.feedback.formativeScore}/8` : 'N/A')}
                  </span>
                </div>
                <div>
                  <strong className="text-slate-500">Demonstrated Level:</strong>{' '}
                  <span className="font-bold text-slate-900">{selectedLogForModal.level}</span>
                </div>
                {selectedLogForModal.dueDate && (
                  <div><strong className="text-slate-500">Task Due Date:</strong> {selectedLogForModal.dueDate}</div>
                )}
                {selectedLogForModal.submissionStatus && (
                  <div>
                    <strong className="text-slate-500">Submission Timing:</strong>{' '}
                    <span className={selectedLogForModal.submissionStatus === 'overdue' ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                      {selectedLogForModal.submissionStatus === 'overdue'
                        ? `Extended Submission (+${selectedLogForModal.daysOverdue || 1}d overdue)`
                        : 'Submitted On-Time'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Feedback Summary:</strong>
                <p className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-indigo-950 font-medium leading-relaxed">
                  {selectedLogForModal.feedback.summary}
                </p>
              </div>

              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Strengths:</strong>
                <ul className="list-disc pl-5 space-y-1 text-slate-800 font-medium">
                  {selectedLogForModal.feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Student Responses:</strong>
                <div className="space-y-2">
                  {selectedLogForModal.responses.map((r, i) => (
                    <div key={i} className="border border-slate-200 p-3 rounded-xl bg-white shadow-2xs">
                      <div className="font-bold text-indigo-700">{r.label}) {r.prompt}</div>
                      <div className="mt-1.5 text-slate-800 font-medium">{r.response}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Self-Reflection inside Modal */}
              {selectedLogForModal.studentReflection && (
                <div>
                  <strong className="block text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1.5">
                    <MessageSquareQuote className="h-4 w-4 text-emerald-600" />
                    Student Post-Task Self-Reflection:
                  </strong>
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-950 font-medium leading-relaxed">
                    "{selectedLogForModal.studentReflection}"
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50/95 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLogForModal(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  onClick={() =>
                    exportToWordDoc({
                      studentName: selectedLogForModal.studentName,
                      subject: selectedLogForModal.subject,
                      topic: selectedLogForModal.topic,
                      mypYear: selectedLogForModal.mypYear,
                      academicYear: selectedLogForModal.academicYear,
                      term: selectedLogForModal.term,
                      category: selectedLogForModal.category,
                      cluster: selectedLogForModal.cluster,
                      level: selectedLogForModal.level,
                      formativeScore: selectedLogForModal.formativeScore || selectedLogForModal.feedback?.formativeScore,
                      taskTitle: selectedLogForModal.taskTitle,
                      skillIndicators: selectedLogForModal.skillIndicators,
                      responses: selectedLogForModal.responses,
                      feedback: selectedLogForModal.feedback,
                      studentReflection: selectedLogForModal.studentReflection,
                      criteria: selectedLogForModal.criteria,
                      strands: selectedLogForModal.strands,
                    })
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Download Word</span>
                  <span className="sm:hidden">Word (.doc)</span>
                </button>

                <button
                  onClick={() =>
                    exportToPdf({
                      studentName: selectedLogForModal.studentName,
                      subject: selectedLogForModal.subject,
                      topic: selectedLogForModal.topic,
                      mypYear: selectedLogForModal.mypYear,
                      academicYear: selectedLogForModal.academicYear,
                      term: selectedLogForModal.term,
                      category: selectedLogForModal.category,
                      cluster: selectedLogForModal.cluster,
                      level: selectedLogForModal.level,
                      formativeScore: selectedLogForModal.formativeScore || selectedLogForModal.feedback?.formativeScore,
                      taskTitle: selectedLogForModal.taskTitle,
                      skillIndicators: selectedLogForModal.skillIndicators,
                      responses: selectedLogForModal.responses,
                      feedback: selectedLogForModal.feedback,
                      studentReflection: selectedLogForModal.studentReflection,
                      criteria: selectedLogForModal.criteria,
                      strands: selectedLogForModal.strands,
                    })
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Print PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              </div>

              <button
                onClick={() => promptDeleteLog(selectedLogForModal.id, `${selectedLogForModal.studentName} (${selectedLogForModal.subject} - ${selectedLogForModal.topic})`)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Teacher Password Settings</h3>
                  <p className="text-xs text-slate-500">Update password used to protect Year Analytics</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setChangePassError(null);
                  setChangePassSuccess(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="mt-4 space-y-4 text-xs">
              {changePassSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center font-bold text-emerald-800 flex flex-col items-center gap-2">
                  <Check className="h-6 w-6 text-emerald-600" />
                  <span>Teacher password updated successfully!</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassInput}
                      onChange={(e) => setCurrentPassInput(e.target.value)}
                      placeholder="Enter current password..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      placeholder="Enter new teacher password..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassInput}
                      onChange={(e) => setConfirmPassInput(e.target.value)}
                      placeholder="Confirm new password..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {changePassError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 font-bold text-rose-700 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{changePassError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowChangePasswordModal(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                    >
                      Save New Password
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Assign Common Task Modal - 2-Step Preview, Differentiation & Live Editing */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className={`w-full ${assignModalStep === 'preview' ? 'max-w-4xl' : 'max-w-xl'} max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-fadeIn transition-all`}>
            {/* Sticky Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-3.5 bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-xl ${assignModalStep === 'preview' ? 'bg-emerald-600' : 'bg-indigo-600'} p-2 text-white shadow-xs transition-colors`}>
                  {assignModalStep === 'preview' ? <Eye className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                      {assignModalStep === 'preview' ? 'Review & Calibrate Task Before Publishing' : 'Create & Personalize Common Task'}
                    </h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      assignModalStep === 'preview' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {assignModalStep === 'preview' ? 'Step 2: Preview & Refine' : 'Step 1: Parameters'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    {assignModalStep === 'preview'
                      ? 'Live edit any text, calibrate difficulty with AI, or regenerate specific questions before assigning.'
                      : 'Configure grade level, skill targets, and personalized teacher instructions.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {assignModalStep === 'preview' && (
                  <button
                    type="button"
                    onClick={() => setAssignModalStep('configure')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Back to Parameters"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Parameters</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignModalStep('configure');
                    setPreviewTask(null);
                    setPublishError(null);
                    setPublishSuccess(null);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {publishSuccess ? (
              <div className="p-8 flex-1 flex flex-col items-center justify-center">
                <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center font-bold text-emerald-800 flex flex-col items-center gap-3 shadow-2xs">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                    <Check className="h-8 w-8" />
                  </div>
                  <span className="text-base font-black">{publishSuccess}</span>
                  <p className="text-xs font-normal text-emerald-700 max-w-sm">
                    Students will now see this task organized under your teacher name and class on their portal.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setAssignModalStep('configure');
                      setPreviewTask(null);
                      setPublishSuccess(null);
                    }}
                    className="mt-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Done & Return to Dashboard
                  </button>
                </div>
              </div>
            ) : assignModalStep === 'configure' ? (
              /* STEP 1: CONFIGURE & DIFFERENTIATE */
              <form onSubmit={handleGenerateAndPreview} className="flex flex-col flex-1 overflow-hidden text-xs">
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {/* Teacher & Grade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Teacher / Instructor Name
                      </label>
                      <input
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="e.g. Ms. Smith (Science)"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Target Student Cohort / Age Group <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={newMypYear}
                        onChange={(e) => setNewMypYear(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="All">All MYP Classes (MYP 1–5 · Whole School)</option>
                        <option value="1">MYP 1 (Grade 6 · Ages 11–12)</option>
                        <option value="2">MYP 2 (Grade 7 · Ages 12–13)</option>
                        <option value="3">MYP 3 (Grade 8 · Ages 13–14)</option>
                        <option value="4">MYP 4 (Grade 9 · Ages 14–15)</option>
                        <option value="5">MYP 5 (Grade 10 · Ages 15–16)</option>
                      </select>
                    </div>
                  </div>

                  {/* Subject & Topic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Subject Group <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="Sciences">Sciences</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Language and Literature">Language and Literature</option>
                        <option value="Language Acquisition">Language Acquisition</option>
                        <option value="Individuals and Societies">Individuals and Societies</option>
                        <option value="Arts">Arts</option>
                        <option value="Physical and Health Education">Physical and Health Education</option>
                        <option value="Design">Design</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Task Title / Curriculum Topic <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="e.g. Cell Organelles: Build Your Own Analogy"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Teacher Personalization & Differentiation Instructions */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-indigo-600" />
                        <label className="text-xs font-bold text-indigo-950">
                          Specific Personalization Instructions (Age, Scaffolding, Ability)
                        </label>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                        Optional AI Guidance
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                      Instruct the AI on student reading levels, required scaffolds, sentence stems, or specific scientific scenarios.
                    </p>
                    <textarea
                      rows={3}
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder={`e.g. Tailor for ${formatClassLabel(newMypYear)}. Keep vocabulary accessible, break questions into guided steps, provide sentence starters in student placeholders, and focus on experimental control of variables.`}
                      className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none placeholder:text-slate-400"
                    />

                    {/* Quick suggestion pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider mr-1">Quick Presets:</span>
                      {[
                        { label: '👶 Simplify for younger students (Ages 11–12)', text: 'Simplify vocabulary for 11-12 year old beginners. Break complex questions into sub-steps and provide supportive sentence starters.' },
                        { label: '💬 Add ELL sentence starters', text: 'Include sentence starters and linguistic frames in student placeholders for English Language Learners.' },
                        { label: '🔬 Elevate higher-order critique', text: 'Elevate scientific rigor. Challenge students to critique methodology, analyze anomalous data, and evaluate validity.' },
                        { label: '🌱 Connect to real-world context', text: 'Anchor the scenario in a relatable everyday life or ecological context.' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCustomInstructions((prev) => prev ? `${prev} ${preset.text}` : preset.text)}
                          className="rounded-lg border border-indigo-200/80 bg-white/90 px-2 py-1 text-[10px] font-semibold text-indigo-900 hover:bg-indigo-100/60 transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ATL Category & Cluster */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        ATL Skill Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as ATLCategoryKey)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="Communication">Communication</option>
                        <option value="Social">Social</option>
                        <option value="Self-management">Self-management</option>
                        <option value="Research">Research</option>
                        <option value="Thinking">Thinking</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Skill Cluster
                      </label>
                      <select
                        value={newCluster}
                        onChange={(e) => setNewCluster(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors cursor-pointer"
                      >
                        {Object.keys(ATL_DATA[newCategory]?.clusters || {}).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* IDU Connection Toggle & Secondary Subject Option */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">Interdisciplinary connection (IDU)</div>
                        <div className="text-[11px] text-slate-500 font-medium">Require students to synthesize concepts with a secondary MYP subject group.</div>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={newIduToggle}
                          onChange={(e) => setNewIduToggle(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:top-0.5 after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-xs after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>

                    {newIduToggle && (
                      <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-1.5 animate-fadeIn">
                        <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                          Secondary Subject Group (IDU Partner)
                        </label>
                        <select
                          value={newIduSubject}
                          onChange={(e) => setNewIduSubject(e.target.value)}
                          className="w-full rounded-xl border border-indigo-200 bg-indigo-50/30 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none cursor-pointer"
                        >
                          <option value="Sciences">Sciences</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Language and Literature">Language and Literature</option>
                          <option value="Language Acquisition">Language Acquisition</option>
                          <option value="Individuals and Societies">Individuals and Societies</option>
                          <option value="Arts">Arts</option>
                          <option value="Physical and Health Education">Physical and Health Education</option>
                          <option value="Design">Design</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* MYP Assessment Criteria & Strands Selector */}
                  <div>
                    <MYPCriteriaSelector
                      selectedCriteria={newSelectedCriteria}
                      selectedStrands={newSelectedStrands}
                      onChange={(crit, str) => {
                        setNewSelectedCriteria(crit);
                        setNewSelectedStrands(str);
                      }}
                    />
                  </div>

                  {/* Submission Due Date & Period Settings */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <span>Submission Due Date & Automatic Archival</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Choose whether this task has a deadline or stays open indefinitely.
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Select Due Date / Deadline Mode
                      </label>
                      <select
                        value={newDueDateType}
                        onChange={(e) => setNewDueDateType(e.target.value as 'period' | 'custom' | 'none')}
                        className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-950 focus:border-indigo-600 focus:outline-none cursor-pointer shadow-2xs"
                      >
                        <option value="none">✨ No Due Date (Open Task - Active Indefinitely)</option>
                        <option value="period">⏱️ Submission Period (Active window e.g. 7 days, 14 days, 30 days)</option>
                        <option value="custom">📅 Specific Calendar Due Date (Pick exact deadline date)</option>
                      </select>
                    </div>

                    {newDueDateType === 'period' && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-2.5 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                            Submission Window Duration:
                          </label>
                          <select
                            value={newDuePeriodDays}
                            onChange={(e) => setNewDuePeriodDays(Number(e.target.value))}
                            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-900 focus:border-indigo-600 focus:outline-none cursor-pointer"
                          >
                            <option value={3}>3 Days</option>
                            <option value={5}>5 Days</option>
                            <option value={7}>7 Days (1 Week) - Standard</option>
                            <option value={10}>10 Days</option>
                            <option value={14}>14 Days (2 Weeks)</option>
                            <option value={21}>21 Days (3 Weeks)</option>
                            <option value={30}>30 Days (1 Month)</option>
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {[
                            { days: 3, label: '3d' },
                            { days: 5, label: '5d' },
                            { days: 7, label: '7d (1w)' },
                            { days: 10, label: '10d' },
                            { days: 14, label: '14d (2w)' },
                            { days: 21, label: '21d (3w)' },
                            { days: 30, label: '30d (1m)' },
                          ].map((opt) => (
                            <button
                              key={opt.days}
                              type="button"
                              onClick={() => setNewDuePeriodDays(opt.days)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                newDuePeriodDays === opt.days
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <div className="text-[11px] font-semibold text-indigo-900 pt-1.5 flex items-center gap-1.5 border-t border-indigo-200/60">
                          <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span>
                            Final Deadline will be:{' '}
                            <strong className="text-indigo-950 font-black">{calculateDueDateFromPeriod(newDuePeriodDays)} (11:59 PM)</strong>
                          </span>
                        </div>
                      </div>
                    )}

                    {newDueDateType === 'custom' && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-2.5 animate-fadeIn">
                        <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                          Pick Exact Calendar Deadline Date:
                        </label>
                        <input
                          type="date"
                          min={getTodayDateString()}
                          value={newCustomDueDate}
                          onChange={(e) => setNewCustomDueDate(e.target.value)}
                          className="w-full sm:w-auto rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-950 focus:border-indigo-600 focus:outline-none cursor-pointer"
                        />
                        <div className="text-[11px] font-semibold text-indigo-900 pt-1.5 flex items-center gap-1.5 border-t border-indigo-200/60">
                          <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span>
                            Deadline set to:{' '}
                            <strong className="text-indigo-950 font-black">{newCustomDueDate || 'Please select date'} (11:59 PM)</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {publishError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-bold text-rose-700 flex items-center gap-2 text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{publishError}</span>
                    </div>
                  )}
                </div>

                {/* Sticky Footer: Step 1 Actions */}
                <div className="shrink-0 border-t border-slate-200 bg-slate-50/95 px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    disabled={isGeneratingPreview}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                    <span>Cancel</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isGeneratingPreview || !newTopic.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingPreview ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Generating Preview…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate & Review Task →</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: PREVIEW, LIVE EDIT & AI CALIBRATION */
              <div className="flex flex-col flex-1 overflow-hidden text-xs">
                {/* Scrollable Preview & Edit Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                  {/* Status Banner */}
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 flex items-start gap-3 shadow-2xs">
                    <div className="rounded-xl bg-indigo-600 p-2 text-white shrink-0">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-indigo-950">
                        Generated Task Preview ({formatClassLabel(newMypYear)})
                      </h4>
                      <p className="text-[11px] text-indigo-900/80 leading-relaxed mt-0.5">
                        First review your task below. You can directly edit the title, context scenario, question prompts, and student sentence starters, or use the AI tools to calibrate difficulty. Once satisfied, click <strong>"Publish & Assign to Students"</strong> below.
                      </p>
                    </div>
                  </div>

                  {/* Feedback Flash Message */}
                  {refineFeedbackMsg && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-800 flex items-center gap-2 text-xs animate-fadeIn">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{refineFeedbackMsg}</span>
                    </div>
                  )}

                  {publishError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-bold text-rose-700 flex items-center gap-2 text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  {/* AI Calibration & Revision Toolbar */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">AI Difficulty Calibration & Custom Revision</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Instant adjustments without losing your task structure
                      </span>
                    </div>

                    {/* Quick Difficulty Calibrator Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={isRefiningTask}
                        onClick={() => handleCalibrateDifficulty('simplify')}
                        className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-left hover:bg-amber-100/70 transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50 group shadow-2xs"
                      >
                        <div className="rounded-lg bg-amber-500 text-white p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                          <Sliders className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-950">Too Hard? Simplify & Scaffold</div>
                          <div className="text-[10px] text-amber-800/80">Softens vocabulary & adds guided sub-steps for {newMypYear ? `MYP ${newMypYear}` : 'cohort'}</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={isRefiningTask}
                        onClick={() => handleCalibrateDifficulty('elevate')}
                        className="rounded-xl border border-purple-200 bg-purple-50/70 p-2.5 text-left hover:bg-purple-100/70 transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50 group shadow-2xs"
                      >
                        <div className="rounded-lg bg-purple-600 text-white p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-purple-950">Too Easy? Elevate Scientific Rigor</div>
                          <div className="text-[10px] text-purple-800/80">Enhances critical evaluation, experimental errors & depth</div>
                        </div>
                      </button>
                    </div>

                    {/* Custom instruction prompt bar */}
                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={refineInstructionInput}
                          onChange={(e) => setRefineInstructionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyCustomRefine(refineInstructionInput);
                            }
                          }}
                          placeholder="e.g. Change scenario context to a local river ecosystem, or make questions shorter..."
                          disabled={isRefiningTask}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isRefiningTask || !refineInstructionInput.trim()}
                        onClick={() => handleApplyCustomRefine(refineInstructionInput)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                      >
                        {isRefiningTask ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span>Applying…</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Apply AI Revision</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {previewTask && (
                    <div className="space-y-4">
                      {/* Editable Task Title */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Task Title (Live Editable)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Directly editable</span>
                        </div>
                        <input
                          type="text"
                          value={previewTask.title}
                          onChange={(e) => handleUpdateTaskTitle(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                        />
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                            {previewTask.subject || newSubject}
                          </span>
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">
                            {previewTask.atl_category || newCategory} • {previewTask.atl_cluster || newCluster}
                          </span>
                          {previewTask.idu_subject && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
                              IDU: {previewTask.idu_subject}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Editable Context / Scenario */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Inquiry Scenario & Context (Stimulus)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Directly editable</span>
                        </div>
                        <textarea
                          rows={4}
                          value={previewTask.context}
                          onChange={(e) => handleUpdateTaskContext(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                        />
                      </div>

                      {/* Dataset Display (if present) */}
                      {previewTask.dataset && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Scientific Stimulus Dataset ({previewTask.dataset.title})</span>
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-[11px] text-left">
                              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                  {previewTask.dataset.headers.map((h, i) => (
                                    <th key={i} className="px-3 py-2">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {previewTask.dataset.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-50/70">
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="px-3 py-1.5 text-slate-800">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Question Parts with Surgical Regeneration Tools */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Target className="h-4 w-4 text-indigo-600" />
                            <span>Task Question Parts ({previewTask.parts?.length || 0} Questions)</span>
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            Edit directly or click surgical tools to calibrate specific questions
                          </span>
                        </div>

                        {previewTask.parts?.map((part, pIdx) => {
                          const isRefiningThisPart = activeRefiningPartIndex === pIdx;
                          return (
                            <div key={pIdx} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                              {/* Part Header & Surgical Actions */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-2 py-1 text-xs font-black text-white">
                                    Part {String.fromCharCode(65 + pIdx)}
                                  </span>
                                  <span className="font-bold text-slate-800 text-xs">
                                    {part.label || `Question ${pIdx + 1}`}
                                  </span>
                                  {part.criterion_assessed && (
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                      Criterion {part.criterion_assessed}
                                    </span>
                                  )}
                                </div>

                                {/* Single Part AI Quick Actions */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isRefiningTask || activeRefiningPartIndex !== null}
                                    onClick={() => handleRegeneratePart(pIdx, `Make Part ${pIdx + 1} simpler with accessible language, extra scaffolding, and clear step-by-step guidance.`)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition-colors cursor-pointer disabled:opacity-40"
                                    title="Make this specific question simpler"
                                  >
                                    📉 Simpler
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isRefiningTask || activeRefiningPartIndex !== null}
                                    onClick={() => handleRegeneratePart(pIdx, `Elevate Part ${pIdx + 1} with higher-order inquiry, critical variable analysis, and justification.`)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-200 transition-colors cursor-pointer disabled:opacity-40"
                                    title="Make this specific question harder"
                                  >
                                    📈 Harder
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isRefiningTask || activeRefiningPartIndex !== null}
                                    onClick={() => handleRegeneratePart(pIdx)}
                                    className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                    title="Regenerate this specific question"
                                  >
                                    <RefreshCw className={`h-3 w-3 ${isRefiningThisPart ? 'animate-spin' : ''}`} />
                                    <span>{isRefiningThisPart ? 'Refining…' : 'Regenerate'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Editable Question Prompt */}
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                                  <span>Question Prompt</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Editable</span>
                                </label>
                                <textarea
                                  rows={3}
                                  value={part.prompt}
                                  onChange={(e) => handleUpdatePartField(pIdx, 'prompt', e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                                />
                              </div>

                              {/* Editable Student Scaffold / Sentence Starter */}
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                                  <span>Student Scaffold / Sentence Starter (Placeholder)</span>
                                  <span className="text-[10px] text-indigo-500 font-normal">Editable</span>
                                </label>
                                <input
                                  type="text"
                                  value={part.placeholder || ''}
                                  onChange={(e) => handleUpdatePartField(pIdx, 'placeholder', e.target.value)}
                                  placeholder="e.g. As temperature increased from 20°C to 40°C, the enzyme rate..."
                                  className="w-full rounded-xl border border-indigo-200/80 bg-indigo-50/30 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                                />
                              </div>

                              {/* Exemplar / Evaluation Guidance */}
                              {part.exemplar && (
                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-[11px] space-y-1">
                                  <div className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                                    Expected Scientific Response / Rubric Target:
                                  </div>
                                  <p className="text-slate-700 italic">{part.exemplar}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Footer: Step 2 Final Actions */}
                <div className="shrink-0 border-t border-slate-200 bg-slate-50/95 px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignModalStep('configure')}
                      disabled={isPublishingTask || isRefiningTask}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                      <span>Back to Parameters</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateAndPreview()}
                      disabled={isPublishingTask || isRefiningTask}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Regenerate the whole task from scratch"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                      <span>Re-roll Task</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePublishFinalTask}
                    disabled={isPublishingTask || isRefiningTask || !previewTask}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isPublishingTask ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Publishing to Student Portals…</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Publish & Assign Task to Students</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Delete Password Authorization Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-100 p-2.5 text-rose-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Authorization Required</h3>
                  <p className="text-xs text-rose-600 font-semibold">Protected Action in Year Analytics</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                  setDeletePasswordInput('');
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 text-slate-700 leading-relaxed font-medium">
                You are about to delete:
                <div className="font-bold text-slate-900 mt-1 text-sm">
                  {itemToDelete?.title || 'Selected Record'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Enter Delete Password <span className="text-rose-600">*</span>
                </label>
                <input
                  type="password"
                  value={deletePasswordInput}
                  onChange={(e) => {
                    setDeletePasswordInput(e.target.value);
                    if (deleteError) setDeleteError(null);
                  }}
                  placeholder="Enter delete password (DELETETASK)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-rose-600 focus:bg-white focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              {deleteError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 font-bold text-rose-700 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError(null);
                    setDeletePasswordInput('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 font-bold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Report Spreadsheet Export Modal */}
      {showMonthlyExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Monthly Excel Spreadsheet Report
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Export student ATL skill evaluations to Microsoft Excel or Google Sheets
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMonthlyExportModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Month
                  </label>
                  <select
                    value={selectedExportMonth}
                    onChange={(e) => setSelectedExportMonth(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="ALL">All Recorded Months</option>
                    {availableMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    MYP Class / Grade
                  </label>
                  <select
                    value={selectedExportClass}
                    onChange={(e) => setSelectedExportClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="ALL">All MYP Classes</option>
                    <option value="1">MYP 1 (Grade 6)</option>
                    <option value="2">MYP 2 (Grade 7)</option>
                    <option value="3">MYP 3 (Grade 8)</option>
                    <option value="4">MYP 4 (Grade 9)</option>
                    <option value="5">MYP 5 (Grade 10)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subject Group Filter
                </label>
                <select
                  value={selectedExportSubject}
                  onChange={(e) => setSelectedExportSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none transition-all"
                >
                  <option value="ALL">All Subject Groups</option>
                  <option value="Sciences">Sciences</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Language and Literature">Language and Literature</option>
                  <option value="Language Acquisition">Language Acquisition</option>
                  <option value="Individuals and Societies">Individuals and Societies</option>
                  <option value="Arts">Arts</option>
                  <option value="Physical and Health Education">Physical and Health Education</option>
                  <option value="Design">Design</option>
                </select>
              </div>

              {/* Export Metrics Summary Box */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Matching Tasks to Export:</span>
                  <span className="text-sm font-black bg-emerald-200/80 px-2.5 py-0.5 rounded-lg text-emerald-950">
                    {monthlyFilteredLogs.length} Logged Evaluations
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/50 text-[11px] text-emerald-800">
                  <div className="rounded-lg bg-white/80 p-2 text-center border border-emerald-100">
                    <div className="font-extrabold text-emerald-700">
                      {monthlyFilteredLogs.filter((l) => l.level === 'Extending').length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Extending</div>
                  </div>
                  <div className="rounded-lg bg-white/80 p-2 text-center border border-emerald-100">
                    <div className="font-extrabold text-indigo-700">
                      {monthlyFilteredLogs.filter((l) => l.level === 'Applying').length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Applying</div>
                  </div>
                  <div className="rounded-lg bg-white/80 p-2 text-center border border-emerald-100">
                    <div className="font-extrabold text-amber-700">
                      {monthlyFilteredLogs.filter((l) => l.level === 'Developing').length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Developing</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMonthlyExportModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={monthlyFilteredLogs.length === 0}
                  onClick={() => {
                    const monthName = selectedExportMonth === 'ALL' ? 'All_Months' : selectedExportMonth;
                    const className = selectedExportClass === 'ALL' ? 'All_Classes' : `MYP${selectedExportClass}`;
                    exportToCsvSpreadsheet(monthlyFilteredLogs, `ATL_Monthly_Report_${monthName}_${className}`);
                    setShowMonthlyExportModal(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Excel (.csv)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toddle & LMS Standalone Evidence Link Manager Modal */}
      {showToddleManagerModal && (
        <ToddleLinkManagerModal
          logs={logs}
          academicYear={academicYear}
          onClose={() => setShowToddleManagerModal(false)}
          onOpenStudentPortal={onOpenStudentPortal}
        />
      )}

      {/* ChatGPT & Custom Task Creator Modal */}
      <CustomTaskCreatorModal
        isOpen={showCustomCreatorModal}
        onClose={() => setShowCustomCreatorModal(false)}
        onCreateTask={async (data) => {
          if (onCreateAssignedTask) {
            await onCreateAssignedTask({
              teacherName: data.teacherName,
              subject: data.subject,
              topic: data.topic,
              mypYear: data.mypYear,
              category: data.category,
              cluster: data.cluster,
              academicYear: data.academicYear,
              dueDate: data.dueDate,
              finalTask: data.finalTask,
              targetStudentNames: data.targetStudentNames,
            });
          }
        }}
        defaultTeacherName={assignedTeacherFilter !== 'All' ? assignedTeacherFilter : ''}
        defaultMypYear={assignedClassFilter !== 'All' ? assignedClassFilter : 'All'}
        academicYear={academicYear}
      />

      {/* Task Reassignment & Individual Student Selector Modal */}
      {taskToReassign && (
        <TaskAssignmentModal
          isOpen={!!taskToReassign}
          onClose={() => setTaskToReassign(null)}
          task={taskToReassign}
          onSave={async (taskId, updates) => {
            if (onUpdateAssignedTask) {
              await onUpdateAssignedTask(taskId, updates);
            }
          }}
        />
      )}

      {/* Full Task Detail Viewer Modal */}
      {taskDetailLog && (
        <TaskDetailModal
          isOpen={!!taskDetailLog}
          onClose={() => setTaskDetailLog(null)}
          log={taskDetailLog}
          onGradeClick={
            onUpdateTaskLog
              ? () => {
                  const targetLog = taskDetailLog;
                  setTaskDetailLog(null);
                  setTeacherGradingLog(targetLog);
                }
              : undefined
          }
        />
      )}

      {/* Teacher Grading, Corrections & Badge Awarding Modal */}
      {teacherGradingLog && (
        <TeacherGradingModal
          isOpen={!!teacherGradingLog}
          onClose={() => setTeacherGradingLog(null)}
          log={teacherGradingLog}
          onSaveGrade={async (evalData, badge) => {
            if (teacherGradingLog && onUpdateTaskLog) {
              const effectiveScore = evalData.formativeScore ?? evalData.score ?? 5;
              await onUpdateTaskLog(teacherGradingLog.id, {
                formativeScore: effectiveScore,
                level: evalData.level,
                status: 'graded',
                feedback: {
                  formativeScore: effectiveScore,
                  level: evalData.level,
                  summary: evalData.feedback || evalData.overallFeedback || 'Teacher evaluation completed.',
                  strengths: evalData.strengths || [],
                  next_steps: evalData.nextSteps || [],
                  rubric_matrix: evalData.rubricMatrix || []
                },
                teacherEvaluation: {
                  ...evalData,
                  formativeScore: effectiveScore,
                  badgeAwarded: badge
                },
                badgeAwarded: badge || teacherGradingLog.badgeAwarded
              });
            }
            setTeacherGradingLog(null);
          }}
        />
      )}
    </div>
  );
};
