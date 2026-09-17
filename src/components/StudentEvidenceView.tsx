import React, { useState, useMemo, useEffect } from 'react';
import {
  ATLTaskLog,
  ATLCategoryKey,
  AssignedTask,
  GeneratedTask,
  StudentResponseItem,
  TaskImageAttachment,
  DigitalBadge,
  TeacherEvaluation
} from '../types';
import { ATL_DATA, ALL_CLUSTERS, SAMPLE_ASSIGNED_TASKS } from '../data/atlData';
import { exportToWordDoc, exportToPdf, resolveSkillIndicators } from '../lib/exportUtils';
import {
  copyToClipboard,
  getStudentEvidenceUrl,
  getStudentEvidenceToken,
  generateStudentUniqueId,
  getCustomStudents,
  findCanonicalStudent,
  isSameStudent
} from '../lib/evidenceUtils';
import { evaluateTaskClient, generateTaskClient } from '../lib/geminiClient';
import { resolveFormativeScore } from '../lib/scoreUtils';
import { calculateStudentMilestoneBadges } from '../lib/badgeUtils';
import { compressImage } from '../utils/imageOptimizer';
import { TaskDetailModal } from './TaskDetailModal';
import { TeacherGradingModal } from './TeacherGradingModal';
import { DigitalBadgesGallery } from './DigitalBadgesGallery';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  MessageSquareQuote,
  Printer,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  UserCheck,
  ArrowLeft,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  Send,
  Play,
  RotateCcw,
  BarChart3,
  CheckSquare,
  ListTodo,
  Trophy,
  Image as ImageIcon,
  Upload,
  Trash2,
  Paperclip,
  Eye,
  X
} from 'lucide-react';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

interface StudentEvidenceViewProps {
  studentName: string;
  mypYear?: string;
  evidenceToken: string;
  logs: ATLTaskLog[];
  academicYear: string;
  assignedTasks?: AssignedTask[];
  onBackToWorkbench?: () => void;
  availableStudents?: string[];
  onSelectStudent?: (name: string) => void;
  onSaveTaskLog?: (newLog: ATLTaskLog) => Promise<void>;
  onUpdateTaskLog?: (logId: string, partial: Partial<ATLTaskLog>) => Promise<void>;
  onSaveReflection?: (logId: string, reflection: string) => Promise<void>;
  customApiKey?: string;
}

const normalizeMypYear = (year?: string): string => {
  const clean = String(year || '').trim().toLowerCase();
  if (clean.includes('1') || clean.includes('6')) return '1';
  if (clean.includes('2') || clean.includes('7')) return '2';
  if (clean.includes('3') || clean.includes('8')) return '3';
  if (clean.includes('4') || clean.includes('9')) return '4';
  if (clean.includes('5') || clean.includes('10')) return '5';
  return clean || '3';
};

const formatClassLabel = (yearKey?: string): string => {
  const norm = normalizeMypYear(yearKey);
  switch (norm) {
    case '1': return 'MYP 1 (Grade 6)';
    case '2': return 'MYP 2 (Grade 7)';
    case '3': return 'MYP 3 (Grade 8)';
    case '4': return 'MYP 4 (Grade 9)';
    case '5': return 'MYP 5 (Grade 10)';
    default: return `MYP ${norm}`;
  }
};

const CATEGORY_COLORS: Record<ATLCategoryKey, string> = {
  Thinking: '#4f46e5',
  Research: '#0284c7',
  Communication: '#16a34a',
  Social: '#d97706',
  'Self-management': '#9333ea'
};

export const StudentEvidenceView: React.FC<StudentEvidenceViewProps> = ({
  studentName,
  mypYear,
  evidenceToken,
  logs,
  academicYear,
  assignedTasks = [],
  onBackToWorkbench,
  availableStudents = [],
  onSelectStudent,
  onSaveTaskLog,
  onUpdateTaskLog,
  onSaveReflection,
  customApiKey
}) => {
  // Navigation within student folder: 'assigned' | 'analytics' | 'portfolio' | 'badges'
  const [activeTab, setActiveTab] = useState<'assigned' | 'analytics' | 'portfolio' | 'badges'>('assigned');

  // Local Student Name & Class state (allows student to enter / update their name and class)
  const [currentStudentName, setCurrentStudentName] = useState<string>(() => {
    return studentName && studentName !== 'Student' ? studentName : '';
  });
  const [currentMypYear, setCurrentMypYear] = useState<string>(() => {
    return mypYear || '3';
  });
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [taskPendingName, setTaskPendingName] = useState<AssignedTask | null>(null);
  const [tempNameInput, setTempNameInput] = useState<string>('');
  const [tempClassInput, setTempClassInput] = useState<string>(() => mypYear || '3');

  // Keep currentMypYear in sync if mypYear prop changes
  useEffect(() => {
    if (mypYear) {
      setCurrentMypYear(mypYear);
      setTempClassInput(mypYear);
    }
  }, [mypYear]);

  // Filter States for Evidence Portfolio
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showAllSchoolTasks, setShowAllSchoolTasks] = useState<boolean>(false);

  // Modals for Task Detail, Grading, and Image Preview
  const [detailModalLog, setDetailModalLog] = useState<ATLTaskLog | null>(null);
  const [gradingModalLog, setGradingModalLog] = useState<ATLTaskLog | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Active Task Solving State & Student Attachments
  const [activeSolvingTask, setActiveSolvingTask] = useState<AssignedTask | null>(null);
  const [customPracticeTask, setCustomPracticeTask] = useState<GeneratedTask | null>(null);
  const [studentAttachments, setStudentAttachments] = useState<Record<number, TaskImageAttachment[]>>({});
  const [practiceMeta, setPracticeMeta] = useState<{
    subject: string;
    topic: string;
    category: ATLCategoryKey;
    cluster: string;
  }>({
    subject: 'Sciences',
    topic: 'Cell Biology & Transport',
    category: 'Thinking',
    cluster: 'Critical thinking'
  });
  const [isGeneratingPractice, setIsGeneratingPractice] = useState<boolean>(false);
  const [studentResponses, setStudentResponses] = useState<Record<number, string>>({});
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<any | null>(null);
  const [metacognitiveReflection, setMetacognitiveReflection] = useState<string>('');
  const [isSavingLog, setIsSavingLog] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canonical student identity resolution
  const canonicalStudent = useMemo(() => {
    return findCanonicalStudent(
      currentStudentName || studentName || evidenceToken,
      currentMypYear || mypYear
    );
  }, [currentStudentName, studentName, evidenceToken, currentMypYear, mypYear]);

  const effectiveStudentName = canonicalStudent.canonicalName;
  const effectiveMypYear = canonicalStudent.mypYear;
  const effectiveToken = canonicalStudent.canonicalToken;
  const studentId = canonicalStudent.studentId;
  const studentSubject = canonicalStudent.subject;
  const studentClassSection = canonicalStudent.classSection;
  const evidenceUrl = useMemo(() => {
    return getStudentEvidenceUrl(effectiveToken, effectiveStudentName, effectiveMypYear);
  }, [effectiveToken, effectiveStudentName, effectiveMypYear]);

  // Filter logs for this specific student and academic year using robust canonical matching
  const studentLogs = useMemo(() => {
    return logs.filter((log) => {
      const isStudentMatch =
        isSameStudent(log.studentName || '', effectiveStudentName, log.mypYear, effectiveMypYear) ||
        (studentId && log.studentId && log.studentId === studentId) ||
        (log.evidenceToken && log.evidenceToken.toLowerCase() === effectiveToken.toLowerCase());

      const matchYear = !academicYear || !log.academicYear || log.academicYear === academicYear;
      return isStudentMatch && matchYear;
    });
  }, [logs, effectiveStudentName, effectiveMypYear, effectiveToken, studentId, academicYear]);

  // Compute all earned badges for this student (Teacher Awarded + Milestones & Mastery)
  const allEarnedBadges = useMemo(() => {
    const teacherBadges: DigitalBadge[] = [];
    studentLogs.forEach((log) => {
      const badge = log.teacherEvaluation?.badgeAwarded || log.badgeAwarded;
      if (badge && !teacherBadges.some((b) => b.id === badge.id)) {
        teacherBadges.push({
          ...badge,
          taskLogId: log.id,
          taskTitle: log.taskTitle || log.topic,
          earnedAt: badge.earnedAt || log.date || 'Recent'
        });
      }
    });

    const milestoneBadges = calculateStudentMilestoneBadges(studentLogs);
    const combined = [...teacherBadges];
    milestoneBadges.forEach((mb) => {
      if (!combined.some((b) => b.id === mb.id)) {
        combined.push(mb);
      }
    });
    return combined;
  }, [studentLogs]);

  // Handle student photo/diagram file attachment upload with automatic client-side compression
  const handleStudentAttachmentUpload = async (partIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.75,
        targetMaxBytes: 250 * 1024
      });
      const newAtt: TaskImageAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        url: dataUrl,
        name: file.name,
        caption: file.name.replace(/\.[^/.]+$/, '')
      };
      setStudentAttachments((prev) => ({
        ...prev,
        [partIndex]: [...(prev[partIndex] || []), newAtt]
      }));
    } catch (err) {
      console.error('Failed to compress student upload:', err);
    }
  };

  // Relevant Assigned Tasks for this student - Class matching with whole school, targeted student & custom task support
  const relevantAssignedTasks = useMemo(() => {
    const cleanStudentYear = normalizeMypYear(effectiveMypYear);
    const pool = (assignedTasks && assignedTasks.length > 0) ? assignedTasks : SAMPLE_ASSIGNED_TASKS;

    // If student/teacher chose to view all school tasks across all cohorts:
    if (showAllSchoolTasks) {
      return pool.filter((t) => t.active !== false);
    }

    const matched = pool.filter((t) => {
      if (t.active === false) return false;

      const hasSpecificTargetStudents = Array.isArray(t.targetStudentNames) && t.targetStudentNames.length > 0;

      // 1. If targeted to specific students:
      if (hasSpecificTargetStudents) {
        return t.targetStudentNames!.some((n) =>
          isSameStudent(n, effectiveStudentName, t.mypYear, effectiveMypYear) ||
          (studentId && n.includes(studentId)) ||
          n.trim().toLowerCase() === effectiveStudentName.trim().toLowerCase()
        );
      }

      // 2. Class / Whole School matching (for tasks without specific individual targets):
      const cleanTaskYear = t.mypYear ? normalizeMypYear(t.mypYear) : '';
      const isClassMatch =
        t.mypYear === 'All' ||
        !t.mypYear ||
        cleanTaskYear === cleanStudentYear ||
        cleanTaskYear === '';

      return isClassMatch;
    });

    if (matched.length === 0) {
      // Fallback: If no tasks for this specific class, show active non-targeted tasks across the school
      const generalTasks = pool.filter((t) => {
        if (t.active === false) return false;
        const hasSpecific = Array.isArray(t.targetStudentNames) && t.targetStudentNames.length > 0;
        return !hasSpecific;
      });
      if (generalTasks.length > 0) {
        return generalTasks;
      }
      return SAMPLE_ASSIGNED_TASKS.filter((st) => st.active !== false);
    }

    return matched;
  }, [assignedTasks, effectiveMypYear, effectiveStudentName, studentId, showAllSchoolTasks]);

  // Check completion status for assigned tasks
  const assignedTasksWithStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return relevantAssignedTasks.map((task) => {
      // Check if student has submitted log for this assignedTaskId or matching title
      const completedLog = studentLogs.find(
        (l) => (l.assignedTaskId && l.assignedTaskId === task.id) ||
               (l.taskTitle && l.taskTitle.toLowerCase() === task.title.toLowerCase())
      );

      let dueStatus: 'completed' | 'due_soon' | 'overdue' | 'open' = 'open';
      let daysDiff = 0;

      if (completedLog) {
        dueStatus = 'completed';
      } else if (task.dueDate) {
        const due = new Date(task.dueDate);
        const cur = new Date(today);
        const diffTime = due.getTime() - cur.getTime();
        daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) {
          dueStatus = 'overdue';
        } else if (daysDiff <= 3) {
          dueStatus = 'due_soon';
        }
      }

      return {
        ...task,
        isCompleted: !!completedLog,
        completedLog,
        dueStatus,
        daysDiff
      };
    });
  }, [relevantAssignedTasks, studentLogs]);

  const pendingAssignedCount = useMemo(() => {
    return assignedTasksWithStatus.filter((t) => !t.isCompleted).length;
  }, [assignedTasksWithStatus]);

  // Filtered Evidence Logs for Portfolio
  const filteredEvidenceLogs = useMemo(() => {
    return studentLogs.filter((log) => {
      const matchSubject = selectedSubject === 'All' || log.subject === selectedSubject;
      const matchCategory = selectedCategory === 'All' || log.category === selectedCategory;
      const matchTerm = selectedTerm === 'All' || log.term === selectedTerm || (log.term && log.term.startsWith(selectedTerm));
      const matchSearch = !searchQuery ||
        (log.topic && log.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.taskTitle && log.taskTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.cluster && log.cluster.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.feedback?.summary && log.feedback.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.subject && log.subject.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSubject && matchCategory && matchTerm && matchSearch;
    });
  }, [studentLogs, selectedSubject, selectedCategory, selectedTerm, searchQuery]);

  // Overall Performance Statistics
  const stats = useMemo(() => {
    const total = studentLogs.length;
    let scoreSum = 0;
    let validScoreCount = 0;
    const levelCounts = { Extending: 0, Applying: 0, Developing: 0 };
    const clusterSet = new Set<string>();
    const subjectSet = new Set<string>();

    studentLogs.forEach((l) => {
      const score = typeof l.formativeScore === 'number'
        ? l.formativeScore
        : (l.feedback && typeof l.feedback.formativeScore === 'number' ? l.feedback.formativeScore : resolveFormativeScore(l));

      if (score > 0) {
        scoreSum += score;
        validScoreCount += 1;
      }

      if (l.level === 'Extending') levelCounts.Extending += 1;
      else if (l.level === 'Applying') levelCounts.Applying += 1;
      else levelCounts.Developing += 1;

      if (l.cluster) clusterSet.add(l.cluster);
      if (l.subject) subjectSet.add(l.subject);
    });

    const averageScore = validScoreCount > 0 ? (scoreSum / validScoreCount).toFixed(1) : '0.0';

    return {
      total,
      averageScore,
      levelCounts,
      uniqueClustersCount: clusterSet.size,
      uniqueSubjectsCount: subjectSet.size,
    };
  }, [studentLogs]);

  // Category Analytics Data for Charts
  const categoryChartData = useMemo(() => {
    const categories: ATLCategoryKey[] = ['Thinking', 'Research', 'Communication', 'Social', 'Self-management'];
    return categories.map((cat) => {
      const catLogs = studentLogs.filter((l) => l.category === cat);
      let sum = 0;
      let count = 0;
      catLogs.forEach((l) => {
        const score = typeof l.formativeScore === 'number'
          ? l.formativeScore
          : (l.feedback && typeof l.feedback.formativeScore === 'number' ? l.feedback.formativeScore : resolveFormativeScore(l));
        if (score > 0) {
          sum += score;
          count += 1;
        }
      });
      const avg = count > 0 ? Number((sum / count).toFixed(1)) : 0;
      return {
        category: cat,
        count: catLogs.length,
        averageScore: avg,
        color: CATEGORY_COLORS[cat]
      };
    });
  }, [studentLogs]);

  // Chronological Score Progression Data (filtering evaluated tasks with scores)
  const scoreProgressionData = useMemo(() => {
    const evaluatedLogs = studentLogs.filter(
      (log) =>
        log.status !== 'pending_review' &&
        (typeof log.formativeScore === 'number' ||
          (log.feedback && typeof log.feedback.formativeScore === 'number') ||
          log.teacherEvaluation)
    );
    const sorted = [...evaluatedLogs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return sorted.map((log, idx) => {
      const score =
        typeof log.formativeScore === 'number'
          ? log.formativeScore
          : log.feedback && typeof log.feedback.formativeScore === 'number'
          ? log.feedback.formativeScore
          : resolveFormativeScore(log);

      const prevScore =
        idx > 0
          ? typeof sorted[idx - 1].formativeScore === 'number'
            ? sorted[idx - 1].formativeScore!
            : resolveFormativeScore(sorted[idx - 1])
          : null;

      const diff = prevScore !== null ? Number((score - prevScore).toFixed(1)) : null;

      return {
        id: log.id,
        taskNumber: `Task ${idx + 1}`,
        date: log.date ? log.date.split('T')[0] : `Task ${idx + 1}`,
        score: score || 0,
        diff,
        title: log.taskTitle || log.topic,
        level: log.level || 'Applying',
        cluster: log.cluster,
        subject: log.subject,
        teacherName: log.teacherEvaluation?.gradedBy || 'Teacher',
        feedback: log.teacherEvaluation?.feedback || log.feedback?.summary || '',
        badge: log.badgeAwarded || log.teacherEvaluation?.badgeAwarded
      };
    });
  }, [studentLogs]);

  // 5 ATL Categories Radar Chart Data
  const radarChartData = useMemo(() => {
    return categoryChartData.map((c) => ({
      category: c.category,
      score: c.averageScore > 0 ? c.averageScore : (c.count > 0 ? 4 : 0),
      fullMark: 8
    }));
  }, [categoryChartData]);

  // Handle Copy Link
  const handleCopyLink = async () => {
    const success = await copyToClipboard(evidenceUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyToken = async () => {
    const success = await copyToClipboard(effectiveToken);
    if (success) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    }
  };

  // Start Solving an Assigned Task
  const handleStartAssignedTask = (task: AssignedTask) => {
    if (!currentStudentName.trim() || currentStudentName.trim().toLowerCase() === 'student') {
      setTaskPendingName(task);
      setTempNameInput(currentStudentName === 'Student' ? '' : currentStudentName);
      setShowNameModal(true);
      return;
    }

    startSolvingWithTask(task);
  };

  const startSolvingWithTask = (task: AssignedTask) => {
    setActiveSolvingTask(task);
    setCustomPracticeTask(null);
    setStudentResponses({});
    setEvaluationFeedback(null);
    setMetacognitiveReflection('');
    setErrorMessage(null);
    setSavedSuccessMsg(null);
  };

  const handleConfirmStudentNameAndStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = tempNameInput.trim() || 'Student';
    const finalClass = tempClassInput || currentMypYear || '3';
    setCurrentStudentName(finalName);
    setCurrentMypYear(finalClass);
    setShowNameModal(false);
    if (onSelectStudent) {
      onSelectStudent(finalName);
    }
    if (taskPendingName) {
      startSolvingWithTask(taskPendingName);
      setTaskPendingName(null);
    }
  };

  // Submit Current Task for Evaluation
  const handleSubmitTaskForEvaluation = async () => {
    const currentTask = activeSolvingTask ? activeSolvingTask.task : customPracticeTask;
    if (!currentTask) return;

    // Check if at least one prompt is answered
    const hasResponse = Object.values(studentResponses).some((r) => typeof r === 'string' && r.trim().length > 0);
    if (!hasResponse) {
      setErrorMessage('Please write your response for at least one question before submitting.');
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const responseItems: StudentResponseItem[] = Object.entries(studentResponses).map(([idx, text]) => ({
        label: currentTask.parts[Number(idx)]?.label || String.fromCharCode(65 + Number(idx)),
        prompt: currentTask.parts[Number(idx)]?.prompt || '',
        response: typeof text === 'string' ? text : ''
      }));

      const feedback = await evaluateTaskClient(
        currentTask,
        {
          title: currentTask.title,
          taskTitle: currentTask.title,
          subject: activeSolvingTask?.subject || practiceMeta.subject,
          topic: activeSolvingTask?.topic || practiceMeta.topic,
          year: effectiveMypYear,
          category: activeSolvingTask?.category || practiceMeta.category,
          cluster: activeSolvingTask?.cluster || practiceMeta.cluster
        },
        responseItems,
        customApiKey
      );

      setEvaluationFeedback(feedback);
    } catch (err: any) {
      console.error('Failed to evaluate task:', err);
      setErrorMessage(err.message || 'Evaluation failed. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Save Evaluated Task to Student Evidence Portfolio
  const handleSaveEvaluatedTask = async () => {
    const currentTask = activeSolvingTask ? activeSolvingTask.task : customPracticeTask;
    if (!currentTask || !evaluationFeedback || !onSaveTaskLog) return;

    setIsSavingLog(true);
    setErrorMessage(null);

    try {
      const responseItems: StudentResponseItem[] = Object.entries(studentResponses).map(([idx, text]) => ({
        label: currentTask.parts[Number(idx)]?.label || String.fromCharCode(65 + Number(idx)),
        prompt: currentTask.parts[Number(idx)]?.prompt || '',
        response: typeof text === 'string' ? text : '',
        attachments: studentAttachments[Number(idx)] || []
      }));

      const allAttachments = Object.values(studentAttachments).flat();

      const newLog: ATLTaskLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        date: new Date().toISOString().split('T')[0],
        academicYear,
        term: activeSolvingTask?.term || 'Term 1',
        studentName: effectiveStudentName,
        subject: activeSolvingTask?.subject || practiceMeta.subject,
        topic: activeSolvingTask?.topic || practiceMeta.topic,
        mypYear: effectiveMypYear,
        category: activeSolvingTask?.category || practiceMeta.category,
        cluster: activeSolvingTask?.cluster || practiceMeta.cluster,
        level: evaluationFeedback.level,
        formativeScore: evaluationFeedback.formativeScore || resolveFormativeScore({ feedback: evaluationFeedback, level: evaluationFeedback.level } as any),
        taskTitle: currentTask.title,
        skillIndicators: currentTask.skill_indicators || resolveSkillIndicators({
          studentName: effectiveStudentName,
          subject: activeSolvingTask?.subject || practiceMeta.subject,
          topic: activeSolvingTask?.topic || practiceMeta.topic,
          mypYear: effectiveMypYear,
          academicYear,
          term: activeSolvingTask?.term || 'Term 1',
          category: activeSolvingTask?.category || practiceMeta.category,
          cluster: activeSolvingTask?.cluster || practiceMeta.cluster,
          level: evaluationFeedback.level,
          taskTitle: currentTask.title,
          responses: responseItems,
          feedback: evaluationFeedback
        }),
        responses: responseItems,
        originalTask: currentTask,
        stimulusImages: currentTask.stimulusImages || [],
        studentAttachments: allAttachments,
        feedback: evaluationFeedback,
        studentReflection: metacognitiveReflection || undefined,
        assignedTaskId: activeSolvingTask?.id,
        dueDate: activeSolvingTask?.dueDate,
        evidenceToken: effectiveToken
      };

      await onSaveTaskLog(newLog);
      setSavedSuccessMsg('Task submitted and recorded in your Evidence Portfolio & Teacher Analytics!');
      setTimeout(() => {
        setActiveSolvingTask(null);
        setCustomPracticeTask(null);
        setActiveTab('portfolio');
        setSavedSuccessMsg(null);
      }, 1800);
    } catch (err: any) {
      console.error('Failed to save task to portfolio:', err);
      setErrorMessage(err.message || 'Failed to save to portfolio.');
    } finally {
      setIsSavingLog(false);
    }
  };

  // Submit Directly for Teacher Review & Grading
  const handleSubmitDirectToTeacher = async () => {
    const currentTask = activeSolvingTask ? activeSolvingTask.task : customPracticeTask;
    if (!currentTask || !onSaveTaskLog) return;

    const hasResponse =
      Object.values(studentResponses).some((r) => typeof r === 'string' && r.trim().length > 0) ||
      Object.values(studentAttachments).some((arr) => arr.length > 0);

    if (!hasResponse) {
      setErrorMessage('Please provide a response or attach work before submitting.');
      return;
    }

    setIsSavingLog(true);
    setErrorMessage(null);

    try {
      const responseItems: StudentResponseItem[] = Object.entries(studentResponses).map(([idx, text]) => ({
        label: currentTask.parts[Number(idx)]?.label || String.fromCharCode(65 + Number(idx)),
        prompt: currentTask.parts[Number(idx)]?.prompt || '',
        response: typeof text === 'string' ? text : '',
        attachments: studentAttachments[Number(idx)] || []
      }));

      const allAttachments = Object.values(studentAttachments).flat();

      const newLog: ATLTaskLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        date: new Date().toISOString().split('T')[0],
        academicYear,
        term: activeSolvingTask?.term || 'Term 1',
        studentName: effectiveStudentName,
        subject: activeSolvingTask?.subject || practiceMeta.subject,
        topic: activeSolvingTask?.topic || practiceMeta.topic,
        mypYear: effectiveMypYear,
        category: activeSolvingTask?.category || practiceMeta.category,
        cluster: activeSolvingTask?.cluster || practiceMeta.cluster,
        level: 'Applying',
        formativeScore: 5,
        taskTitle: currentTask.title,
        skillIndicators: currentTask.skill_indicators || [
          'Demonstrates understanding of concepts',
          'Applies structured ATL approaches to inquiry'
        ],
        responses: responseItems,
        originalTask: currentTask,
        stimulusImages: currentTask.stimulusImages || [],
        studentAttachments: allAttachments,
        feedback: {
          formativeScore: 5,
          level: 'Applying',
          summary: 'Work submitted for teacher review and grading.',
          strengths: ['Submitted on time', 'Provided answers and evidence'],
          next_steps: ['Awaiting teacher feedback and evaluation.'],
          rubric_matrix: []
        },
        assignedTaskId: activeSolvingTask?.id,
        dueDate: activeSolvingTask?.dueDate,
        evidenceToken: effectiveToken
      };

      await onSaveTaskLog(newLog);
      setSavedSuccessMsg('Work submitted successfully! Your teacher can now review, correct, and grade your task.');
      setTimeout(() => {
        setActiveSolvingTask(null);
        setCustomPracticeTask(null);
        setActiveTab('portfolio');
        setSavedSuccessMsg(null);
      }, 1800);
    } catch (err: any) {
      console.error('Failed to submit to teacher:', err);
      setErrorMessage(err.message || 'Failed to submit work.');
    } finally {
      setIsSavingLog(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner & Personal Link Showcase */}
      <div className="rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-gradient-to-bl from-indigo-100/60 via-purple-50/40 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
          <div className="space-y-3">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Class-Isolated Student Portal</span>
              </span>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-800 shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-semibold text-blue-700">Class:</span>
                <select
                  value={normalizeMypYear(effectiveMypYear)}
                  onChange={(e) => {
                    setCurrentMypYear(e.target.value);
                    setTempClassInput(e.target.value);
                  }}
                  className="bg-transparent text-xs font-black text-blue-900 focus:outline-none cursor-pointer pr-1"
                  title="Switch MYP Class to only see tasks assigned to your grade"
                >
                  <option value="1">MYP 1 (Grade 6)</option>
                  <option value="2">MYP 2 (Grade 7 - 2C)</option>
                  <option value="3">MYP 3 (Grade 8)</option>
                  <option value="4">MYP 4 (Grade 9)</option>
                  <option value="5">MYP 5 (Grade 10)</option>
                </select>
                {studentClassSection && studentClassSection !== `MYP ${normalizeMypYear(effectiveMypYear)}` && (
                  <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.2 rounded-full">
                    {studentClassSection}
                  </span>
                )}
              </div>
              {studentSubject && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                  <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                  <span>{studentSubject}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-bold text-blue-900 font-mono shadow-2xs">
                ID: {studentId}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>AY {academicYear}</span>
              </span>
            </div>

            {/* Student Name */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-black text-xl shrink-0 shadow-md">
                {effectiveStudentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                    {effectiveStudentName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setTempNameInput(effectiveStudentName === 'Student' ? '' : effectiveStudentName);
                      setShowNameModal(true);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-2xs cursor-pointer"
                    title="Change or set your full name"
                  >
                    Edit Name
                  </button>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-100/80 text-blue-800 font-mono">
                    ATL Portal
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Your personal Approaches to Learning (ATL) hub, task assignments, and evidence portfolio.
                </p>
              </div>
            </div>

            {/* Direct Link Box with 1-Click Copy */}
            <div className="pt-2 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Personal Link:</span>
                  <input
                    type="text"
                    readOnly
                    value={evidenceUrl}
                    className="w-full bg-transparent font-mono text-[11px] text-indigo-700 font-medium focus:outline-none select-all truncate"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white shadow-emerald-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                    }`}
                    title="Copy your personal portal link to bookmark or attach to Toddle"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy My Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-2xs"
                    title="Open your personal folder in a dedicated browser tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Open in New Tab</span>
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                💡 Tip: Save this link in your browser bookmarks or Toddle student portfolio to quickly jump back to your assignments.
              </p>
            </div>
          </div>

          {/* Quick KPI summary */}
          <div className="flex flex-col items-end justify-center gap-2 shrink-0">
            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">Average Score</div>
                <div className="text-lg font-black text-indigo-700">
                  {stats.total > 0 ? `${stats.averageScore}/8` : 'N/A'}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">Completed</div>
                <div className="text-lg font-black text-emerald-700">
                  {stats.total} Tasks
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('assigned');
              setActiveSolvingTask(null);
              setCustomPracticeTask(null);
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'assigned'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            <span>Tasks Published by Teacher</span>
            {pendingAssignedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'assigned' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingAssignedCount} Pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('portfolio');
              setActiveSolvingTask(null);
              setCustomPracticeTask(null);
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'portfolio'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>My Completed Submissions ({studentLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('analytics');
              setActiveSolvingTask(null);
              setCustomPracticeTask(null);
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>My ATL Growth & Trajectory</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('badges');
              setActiveSolvingTask(null);
              setCustomPracticeTask(null);
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'badges'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Digital Badges & Achievements</span>
            {allEarnedBadges.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'badges' ? 'bg-white text-amber-900' : 'bg-amber-100 text-amber-800'
              }`}>
                {allEarnedBadges.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUCCESS OR ERROR NOTIFICATIONS */}
      {savedSuccessMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVE TASK SOLVING WORKBENCH (When a student is doing an assigned task or practice) */}
      {/* ========================================================================= */}
      {(activeSolvingTask || customPracticeTask) ? (
        <div className="rounded-3xl border border-indigo-200 bg-white p-6 sm:p-8 shadow-md space-y-6">
          {/* Header of Active Task */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="rounded-full bg-indigo-100 text-indigo-800 px-2.5 py-0.5 text-[11px] font-bold">
                  {activeSolvingTask?.subject || practiceMeta.subject} • {activeSolvingTask?.topic || practiceMeta.topic}
                </span>
                <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[11px] font-bold">
                  {activeSolvingTask?.category || practiceMeta.category} ({activeSolvingTask?.cluster || practiceMeta.cluster})
                </span>
                {activeSolvingTask?.dueDate && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-600" />
                    <span>Due: {activeSolvingTask.dueDate}</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {(activeSolvingTask ? activeSolvingTask.task : customPracticeTask)?.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSolvingTask(null);
                setCustomPracticeTask(null);
                setEvaluationFeedback(null);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Tasks</span>
            </button>
          </div>

          {/* Stimulus / Context */}
          <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800">
              Context & Stimulus
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
              {(activeSolvingTask ? activeSolvingTask.task : customPracticeTask)?.context}
            </p>

            {/* Stimulus Images / Question Diagrams (ChatGPT or Teacher generated) */}
            {((activeSolvingTask ? activeSolvingTask.task : customPracticeTask)?.stimulusImages || []).length > 0 && (
              <div className="pt-2 border-t border-indigo-100/80 space-y-2">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                  Attached Question Diagrams, Charts & Images ({((activeSolvingTask ? activeSolvingTask.task : customPracticeTask)?.stimulusImages || []).length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {((activeSolvingTask ? activeSolvingTask.task : customPracticeTask)?.stimulusImages || []).map((img, i) => (
                    <div
                      key={img.id || i}
                      onClick={() => setPreviewModalImage(img.url)}
                      className="group cursor-pointer rounded-xl border border-indigo-200 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all"
                    >
                      <img
                        src={img.url}
                        alt={img.caption || `Diagram ${i + 1}`}
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="p-2 text-xs font-medium text-slate-700 bg-white truncate">
                        {img.caption || img.name || `Diagram ${i + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-indigo-100/80 text-[11px] text-indigo-700 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>ATL Focus: {(activeSolvingTask ? activeSolvingTask.task : customPracticeTask)?.atl_focus_explainer}</span>
            </div>
          </div>

          {/* Prompts & Response Inputs */}
          {!evaluationFeedback && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Your Answers & Evidence</span>
              </h3>

              {(activeSolvingTask ? activeSolvingTask.task : customPracticeTask)?.parts.map((part, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <label className="text-xs sm:text-sm font-bold text-slate-800">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold mr-2 text-xs">
                        Part {part.label || String.fromCharCode(65 + idx)}
                      </span>
                      {part.prompt}
                    </label>
                  </div>

                  <textarea
                    rows={4}
                    value={studentResponses[idx] || ''}
                    onChange={(e) => setStudentResponses({ ...studentResponses, [idx]: e.target.value })}
                    placeholder={part.placeholder || 'Type your detailed explanation or answer here...'}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-800 font-normal focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                  />

                  {/* Student Attachments for this Question Part */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Attach Photo of Work / Graph</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              handleStudentAttachmentUpload(idx, f);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-slate-400">Upload handwritten work, diagrams, or charts</span>
                    </div>

                    <div className="text-right text-[10px] text-slate-400 font-medium">
                      Word count: {(studentResponses[idx] || '').trim().split(/\s+/).filter(Boolean).length} words
                    </div>
                  </div>

                  {/* Thumbnails of attached work */}
                  {(studentAttachments[idx] || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(studentAttachments[idx] || []).map((att, attIdx) => (
                        <div
                          key={att.id || attIdx}
                          className="relative rounded-xl border border-indigo-200 bg-indigo-50/40 p-1 flex items-center gap-2 pr-2 shadow-2xs"
                        >
                          <img
                            src={att.url}
                            alt={att.name || 'Student work'}
                            onClick={() => setPreviewModalImage(att.url)}
                            className="w-10 h-10 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          />
                          <span className="text-xs font-semibold text-slate-700 max-w-[140px] truncate">
                            {att.name || 'Work photo'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentAttachments((prev) => ({
                                ...prev,
                                [idx]: (prev[idx] || []).filter((_, i) => i !== attIdx)
                              }));
                            }}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSubmitDirectToTeacher}
                  disabled={isSavingLog}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-4 w-4 text-indigo-600" />
                  <span>Submit Directly to Teacher</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitTaskForEvaluation}
                  disabled={isEvaluating}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isEvaluating ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin text-white" />
                      <span>Evaluating with Formative AI Rubric...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>Submit & Evaluate with AI Rubric</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Evaluation Results & Metacognitive Reflection */}
          {evaluationFeedback && (
            <div className="space-y-6 pt-4 border-t border-slate-200 animate-in fade-in">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-xs">
                      {evaluationFeedback.formativeScore || 7}/8
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Formative Attainment</span>
                      <h3 className="text-lg font-black text-slate-900">
                        {evaluationFeedback.level} Level
                      </h3>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>AI Formative Evaluation Complete</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  {evaluationFeedback.summary}
                </p>

                {/* Strengths & Next Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl bg-white p-4 border border-indigo-100 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Key Demonstrated Strengths</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {evaluationFeedback.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-white p-4 border border-indigo-100 space-y-2">
                    <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-amber-600" />
                      <span>Actionable Next Steps for Growth</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {evaluationFeedback.next_steps?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Metacognitive Reflection Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquareQuote className="h-4 w-4 text-indigo-600" />
                  <span>Student Metacognitive Reflection</span>
                </label>
                <p className="text-xs text-slate-500">
                  How did you apply this ATL skill during this task? What strategy will you use to improve next time?
                </p>
                <textarea
                  rows={3}
                  value={metacognitiveReflection}
                  onChange={(e) => setMetacognitiveReflection(e.target.value)}
                  placeholder="I applied critical thinking by analyzing the evidence before concluding..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEvaluationFeedback(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Edit Answers
                </button>

                <button
                  type="button"
                  onClick={handleSaveEvaluatedTask}
                  disabled={isSavingLog}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingLog ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" />
                      <span>Saving to Portfolio...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save to My Evidence Portfolio</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: ASSIGNED TASKS & TO-DO LIST */}
          {/* ========================================================================= */}
          {activeTab === 'assigned' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-indigo-600" />
                    <span>My Assigned Tasks ({assignedTasksWithStatus.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {showAllSchoolTasks ? (
                      <span>Displaying all active tasks published across all MYP classes and whole school.</span>
                    ) : (
                      <>
                        Showing tasks published for <strong className="text-indigo-700">{formatClassLabel(effectiveMypYear)}</strong> & personal assignments.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllSchoolTasks((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      showAllSchoolTasks
                        ? 'border-purple-300 bg-purple-100 text-purple-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-purple-600" />
                    <span>{showAllSchoolTasks ? 'Showing All Classes' : 'View All School Tasks'}</span>
                  </button>
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-800 shrink-0">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span>Class: {formatClassLabel(effectiveMypYear)}</span>
                  </div>
                </div>
              </div>

              {assignedTasksWithStatus.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
                  <CheckSquare className="mx-auto h-10 w-10 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-800">All caught up! No pending assignments.</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Your teacher has not assigned any new common tasks right now. Once your teacher publishes a task for your class, it will appear here automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('portfolio')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer mt-2"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    <span>View Completed Portfolio ({studentLogs.length})</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedTasksWithStatus.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-3xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                        task.isCompleted
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : task.dueStatus === 'overdue'
                          ? 'border-rose-200 bg-rose-50/30'
                          : 'border-indigo-100 bg-white hover:border-indigo-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Status Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">
                              {task.subject}
                            </span>
                            {Array.isArray(task.targetStudentNames) && task.targetStudentNames.length > 0 && (
                              <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-black flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-amber-600" />
                                <span>Assigned Personally to You</span>
                              </span>
                            )}
                            {task.mypYear === 'All' && (
                              <span className="rounded-md bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold">
                                All MYP Classes
                              </span>
                            )}
                            {(task.sourceType === 'chatgpt_custom' || task.task?.sourceType === 'chatgpt_custom') && (
                              <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                                ChatGPT / Teacher Task
                              </span>
                            )}
                            {((task.stimulusImages && task.stimulusImages.length > 0) || (task.task?.stimulusImages && task.task.stimulusImages.length > 0)) && (
                              <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                                <span>📊</span> Diagram
                              </span>
                            )}
                          </div>

                          {task.isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Completed • Score: {task.completedLog?.formativeScore || 7}/8</span>
                            </span>
                          ) : task.dueStatus === 'overdue' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[10px] font-bold">
                              <AlertCircle className="h-3 w-3 text-rose-600" />
                              <span>Overdue ({Math.abs(task.daysDiff)} days)</span>
                            </span>
                          ) : task.dueStatus === 'due_soon' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span>Due in {task.daysDiff} days</span>
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-bold">
                              {task.dueDate ? `Due: ${task.dueDate}` : 'Open Assignment'}
                            </span>
                          )}
                        </div>

                        {/* Title & Topic */}
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {task.title}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Topic: {task.topic} • {task.category} ({task.cluster})
                          </p>
                        </div>

                        {/* Teacher & Criteria */}
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                          <span>Teacher: <strong>{task.teacherName || 'Subject Teacher'}</strong></span>
                          <span>•</span>
                          <span>Est. Time: <strong>{task.task?.estimated_minutes || 15} mins</strong></span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {task.isCompleted ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('portfolio');
                                setSearchQuery(task.title);
                              }}
                              className="flex-1 rounded-xl border border-emerald-200 bg-white py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors text-center cursor-pointer shadow-2xs"
                            >
                              View Submission & Feedback
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartAssignedTask(task)}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Re-attempt task"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartAssignedTask(task)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-2xs cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Start Task Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MY ATL GROWTH & ANALYTICS GRAPHS */}
          {/* ========================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tasks</span>
                  <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Logged evidence entries</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Formative Average</span>
                  <div className="text-2xl font-black text-indigo-700">{stats.averageScore}/8</div>
                  <div className="text-[10px] text-slate-500 font-medium">1–8 Formative rubric scale</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Extending Mastery</span>
                  <div className="text-2xl font-black text-emerald-600">{stats.levelCounts.Extending}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Level 7–8 achievements</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skill Clusters</span>
                  <div className="text-2xl font-black text-purple-600">{stats.uniqueClustersCount} / 10</div>
                  <div className="text-[10px] text-slate-500 font-medium">Clusters covered with evidence</div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 5 ATL Categories Mastery Bar Chart */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">5 ATL Categories Attainment</h3>
                      <p className="text-xs text-slate-500 font-medium">Average formative score (/8) per ATL category</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height={256} minWidth={100} minHeight={256}>
                      <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="category"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                                  <div className="font-bold text-slate-900">{data.category}</div>
                                  <div className="text-indigo-700 font-semibold mt-0.5">
                                    Average: {data.averageScore}/8 ({data.count} tasks)
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="averageScore" radius={[6, 6, 0, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 5 ATL Categories Radar Profile */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">ATL Skill Categories Radar Profile</h3>
                      <p className="text-xs text-slate-500 font-medium">Holistic balance across all 5 ATL skill domains</p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height={256} minWidth={100} minHeight={256}>
                      <RadarChart data={radarChartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis domain={[0, 8]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Radar name="Formative Attainment" dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.35} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                                  <div className="font-bold text-slate-900">{data.category}</div>
                                  <div className="text-indigo-700 font-bold mt-1">
                                    Attainment: {data.score}/8
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Chronological Score Progression Line Chart (Full Width) */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Longitudinal ATL Score Progression Over Time</h3>
                    <p className="text-xs text-slate-500 font-medium">Tracking formative scores (1–8 IB Rubric) chronologically across assignments</p>
                  </div>
                  {scoreProgressionData.length === 1 && (
                    <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      Baseline Score: {scoreProgressionData[0].score}/8 ({scoreProgressionData[0].level})
                    </span>
                  )}
                </div>

                {scoreProgressionData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl">
                    <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No evaluated tasks recorded yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">Complete an assigned task in Tab 1 to plot your learning growth trajectory</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height={256} minWidth={100} minHeight={256}>
                        <LineChart data={scoreProgressionData} margin={{ top: 15, right: 20, left: -10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="taskNumber" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                          <YAxis domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} tick={{ fill: '#64748b', fontSize: 11 }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                                    <div className="font-bold text-slate-900">{data.title}</div>
                                    <div className="text-slate-500 text-[10px]">{data.date} • {data.cluster}</div>
                                    <div className="inline-flex items-center gap-1.5 font-bold text-indigo-700 pt-1">
                                      <span>Formative Score: {data.score}/8</span>
                                      <span className="rounded bg-indigo-50 border border-indigo-100 text-[10px] px-1.5 py-0.5 text-indigo-800">
                                        {data.level}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            dot={{ fill: '#4f46e5', r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 8, fill: '#4338ca' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {scoreProgressionData.length === 1 && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center text-xs text-slate-600 font-medium">
                        Baseline attainment benchmark established at <strong>{scoreProgressionData[0].score}/8 ({scoreProgressionData[0].level})</strong> for {scoreProgressionData[0].title}. As subsequent tasks are evaluated, your continuous progression line will plot automatically across academic terms.
                      </div>
                    )}

                    {/* Formative Progress & Results Breakdown Table */}
                    {scoreProgressionData.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Evaluated Results & Progress Trajectory ({scoreProgressionData.length})</span>
                          <span className="text-[10px] text-slate-400">Chronological learning journey</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                <th className="py-2 px-2">Task</th>
                                <th className="py-2 px-2">Topic & Cluster</th>
                                <th className="py-2 px-2">Teacher Result</th>
                                <th className="py-2 px-2">Progress Delta</th>
                                <th className="py-2 px-2">Teacher Comments & Badge</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {scoreProgressionData.map((item, i) => (
                                <tr key={item.id || i} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                    <div className="font-bold text-slate-800">{item.taskNumber}</div>
                                    <div className="text-[10px] text-slate-400">{item.date}</div>
                                  </td>
                                  <td className="py-2.5 px-2">
                                    <div className="font-bold text-slate-900">{item.title}</div>
                                    <div className="text-[10px] text-slate-500">{item.cluster} • {item.subject}</div>
                                  </td>
                                  <td className="py-2.5 px-2 whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800">
                                      <span className="font-black text-xs">{item.score}/8</span>
                                      <span className="text-[10px] font-bold uppercase">{item.level}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 whitespace-nowrap">
                                    {item.diff === null ? (
                                      <span className="text-[11px] text-slate-400 font-bold">Baseline</span>
                                    ) : item.diff > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                        +{item.diff} Growth
                                      </span>
                                    ) : item.diff === 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                        Consistent
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                        {item.diff} Refine
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2">
                                    {item.feedback ? (
                                      <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                                        "{item.feedback}"
                                      </p>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Feedback recorded</span>
                                    )}
                                    {item.badge && (
                                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                        <Award className="w-3 h-3 text-purple-600" />
                                        <span>Badge: {item.badge.name}</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 10 ATL Skill Cluster Badges Matrix */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  ATL Skill Clusters Mastery Matrix (10 Clusters)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {ALL_CLUSTERS.map((clusterItem) => {
                    const clusterName = typeof clusterItem === 'string' ? clusterItem : clusterItem.name;
                    const clusterLogs = studentLogs.filter((l) => l.cluster === clusterName);
                    const count = clusterLogs.length;
                    const hasExtending = clusterLogs.some((l) => l.level === 'Extending');
                    const hasApplying = clusterLogs.some((l) => l.level === 'Applying');

                    let badgeColor = 'bg-slate-50 border-slate-200 text-slate-400';
                    let statusLabel = 'Not logged yet';

                    if (hasExtending) {
                      badgeColor = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                      statusLabel = 'Extending (7-8)';
                    } else if (hasApplying) {
                      badgeColor = 'bg-indigo-50 border-indigo-200 text-indigo-800';
                      statusLabel = 'Applying (4-6)';
                    } else if (count > 0) {
                      badgeColor = 'bg-amber-50 border-amber-200 text-amber-800';
                      statusLabel = 'Developing (1-3)';
                    }

                    return (
                      <div
                        key={clusterName}
                        className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2 ${badgeColor}`}
                      >
                        <div>
                          <div className="text-xs font-bold leading-snug">{clusterName}</div>
                          <div className="text-[10px] font-semibold opacity-80 mt-0.5">{statusLabel}</div>
                        </div>
                        <div className="text-[10px] font-bold">
                          {count} {count === 1 ? 'task' : 'tasks'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: COMPLETED EVIDENCE PORTFOLIO */}
          {/* ========================================================================= */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Filter Toolbar & Export Actions */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="All">All Subjects</option>
                      <option value="Sciences">Sciences</option>
                      <option value="Individuals & Societies">Individuals & Societies</option>
                      <option value="Language & Literature">Language & Literature</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Design">Design</option>
                      <option value="Arts">Arts</option>
                      <option value="Physical & Health Education">Physical & Health Education</option>
                      <option value="Language Acquisition">Language Acquisition</option>
                    </select>

                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="All">All Categories</option>
                      <option value="Thinking">Thinking</option>
                      <option value="Research">Research</option>
                      <option value="Communication">Communication</option>
                      <option value="Social">Social</option>
                      <option value="Self-management">Self-management</option>
                    </select>

                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="All">All Terms</option>
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                    </select>
                  </div>

                  {/* Portfolio Exports */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-500" />
                      <span>Print Portfolio</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your completed tasks, topics, reflections, or feedback..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Tasks List */}
              {filteredEvidenceLogs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-700">No completed tasks match your search</h3>
                  <p className="text-xs text-slate-400">Complete an assigned task or try a practice task to build your portfolio.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvidenceLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const score = typeof log.formativeScore === 'number'
                      ? log.formativeScore
                      : (log.feedback?.formativeScore || resolveFormativeScore(log));

                    return (
                      <div
                        key={log.id}
                        className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs hover:border-indigo-200 transition-all space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                                {log.subject} • {log.term || 'Term 1'}
                              </span>
                              <span className="rounded-md bg-purple-50 border border-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">
                                {log.category} ({log.cluster})
                              </span>
                              <span className="text-slate-400 text-[11px] font-medium">
                                {log.date ? log.date.split('T')[0] : 'Recent'}
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                              {log.taskTitle || log.topic}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Topic: {log.topic}
                            </p>
                          </div>

                          {/* Score & Attainment Badge */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {(log.teacherEvaluation?.badgeAwarded || log.badgeAwarded) && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-orange-400/15 border border-amber-300 text-amber-900 font-bold text-xs shadow-2xs">
                                <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{(log.teacherEvaluation?.badgeAwarded || log.badgeAwarded)?.name}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 border border-indigo-100 px-3.5 py-1.5">
                              <div className="text-xl font-black text-indigo-700">{score}/8</div>
                              <div className="text-left">
                                <div className="text-[10px] font-bold text-indigo-800 uppercase">{log.level}</div>
                                <div className="text-[9px] text-indigo-600">Formative</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Summary */}
                        {log.feedback?.summary && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium leading-relaxed">
                            {log.feedback.summary}
                          </p>
                        )}

                        {/* Metacognitive Reflection if logged */}
                        {log.studentReflection && (
                          <div className="rounded-2xl bg-amber-50/60 border border-amber-200/60 p-3.5 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-amber-800 flex items-center gap-1">
                              <MessageSquareQuote className="h-3 w-3" />
                              <span>Your Metacognitive Reflection:</span>
                            </span>
                            <p className="text-xs text-slate-700 italic font-medium">
                              "{log.studentReflection}"
                            </p>
                          </div>
                        )}

                        {/* Expanded Details: Responses, Strengths, Next Steps */}
                        {isExpanded && (
                          <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in">
                            {/* Student Submitted Answers */}
                            {log.responses && log.responses.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  Your Submitted Work
                                </h4>
                                {log.responses.map((resp, rIdx) => (
                                  <div key={rIdx} className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5">
                                    <div className="font-bold text-slate-800">
                                      Part {resp.label}: {resp.prompt}
                                    </div>
                                    <div className="text-slate-700 whitespace-pre-wrap font-normal">
                                      {resp.response || '(No response provided)'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Strengths & Next Steps */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              {log.feedback?.strengths && (
                                <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-3 space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span>Key Strengths:</span>
                                  </span>
                                  <ul className="text-xs text-slate-700 space-y-1">
                                    {log.feedback.strengths.map((s, idx) => (
                                      <li key={idx}>• {s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {log.feedback?.next_steps && (
                                <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-3 space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-amber-800 flex items-center gap-1">
                                    <Target className="h-3 w-3 text-amber-600" />
                                    <span>Actionable Next Steps:</span>
                                  </span>
                                  <ul className="text-xs text-slate-700 space-y-1">
                                    {log.feedback.next_steps.map((n, idx) => (
                                      <li key={idx}>• {n}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Export Single Log Report */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => exportToWordDoc({
                                  studentName: log.studentName,
                                  subject: log.subject,
                                  topic: log.topic,
                                  mypYear: log.mypYear,
                                  academicYear: log.academicYear,
                                  term: log.term,
                                  category: log.category,
                                  cluster: log.cluster,
                                  level: log.level,
                                  formativeScore: score,
                                  taskTitle: log.taskTitle,
                                  responses: log.responses,
                                  feedback: log.feedback,
                                  studentReflection: log.studentReflection
                                })}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                              >
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Export Word Doc</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => exportToPdf({
                                  studentName: log.studentName,
                                  subject: log.subject,
                                  topic: log.topic,
                                  mypYear: log.mypYear,
                                  academicYear: log.academicYear,
                                  term: log.term,
                                  category: log.category,
                                  cluster: log.cluster,
                                  level: log.level,
                                  formativeScore: score,
                                  taskTitle: log.taskTitle,
                                  responses: log.responses,
                                  feedback: log.feedback,
                                  studentReflection: log.studentReflection
                                })}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                              >
                                <Download className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Export PDF</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailModalLog(log)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
                              title="View full task, questions, attached diagrams, and student work"
                            >
                              <Eye className="h-3.5 w-3.5 text-indigo-600" />
                              <span>View Complete Task</span>
                            </button>

                            {onUpdateTaskLog && (
                              <button
                                type="button"
                                onClick={() => setGradingModalLog(log)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                                title="Teacher evaluation, corrections, and badge awarding"
                              >
                                <Award className="h-3.5 w-3.5 text-amber-600" />
                                <span>Teacher Grade & Badge</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide' : 'Quick Preview'}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: DIGITAL BADGES GALLERY */}
          {/* ========================================================================= */}
          {activeTab === 'badges' && (
            <div className="animate-in fade-in space-y-6">
              <DigitalBadgesGallery
                badges={allEarnedBadges}
                studentName={effectiveStudentName}
                onViewTaskByBadge={(badgeId) => {
                  const log = studentLogs.find(
                    (l) =>
                      l.id === badgeId ||
                      l.teacherEvaluation?.badgeAwarded?.id === badgeId ||
                      l.badgeAwarded?.id === badgeId
                  );
                  if (log) {
                    setDetailModalLog(log);
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* STUDENT NAME CONFIRMATION / ENTRY MODAL */}
      {/* ========================================================================= */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Enter Your Full Name</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {taskPendingName ? `To start: "${taskPendingName.title}"` : 'Personalize your ATL work portal'}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmStudentNameAndStart} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Student Name (e.g. Maya Chen)
                </label>
                <input
                  type="text"
                  value={tempNameInput}
                  onChange={(e) => setTempNameInput(e.target.value)}
                  placeholder="Enter your first and last name..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Your MYP Class / Grade Level
                </label>
                <select
                  value={normalizeMypYear(tempClassInput)}
                  onChange={(e) => setTempClassInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                >
                  <option value="1">MYP 1 (Grade 6)</option>
                  <option value="2">MYP 2 (Grade 7)</option>
                  <option value="3">MYP 3 (Grade 8)</option>
                  <option value="4">MYP 4 (Grade 9)</option>
                  <option value="5">MYP 5 (Grade 10)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  You will only see tasks published for this selected class. Other class tasks are hidden.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNameModal(false);
                    setTaskPendingName(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                >
                  {taskPendingName ? 'Start Doing Task Now' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL TASK DETAIL MODAL (Questions, Context, Attached Images, Work, Grade) */}
      {/* ========================================================================= */}
      {detailModalLog && (
        <TaskDetailModal
          isOpen={!!detailModalLog}
          onClose={() => setDetailModalLog(null)}
          log={detailModalLog}
          onGradeClick={
            onUpdateTaskLog
              ? () => {
                  const targetLog = detailModalLog;
                  setDetailModalLog(null);
                  setGradingModalLog(targetLog);
                }
              : undefined
          }
        />
      )}

      {/* ========================================================================= */}
      {/* TEACHER GRADING, CORRECTION & BADGE AWARDING MODAL */}
      {/* ========================================================================= */}
      {gradingModalLog && (
        <TeacherGradingModal
          isOpen={!!gradingModalLog}
          onClose={() => setGradingModalLog(null)}
          log={gradingModalLog}
          onSaveGrade={async (evalData, badge) => {
            if (gradingModalLog && onUpdateTaskLog) {
              await onUpdateTaskLog(gradingModalLog.id, {
                formativeScore: evalData.score,
                level: evalData.level,
                feedback: {
                  formativeScore: evalData.score,
                  level: evalData.level,
                  summary: evalData.overallFeedback,
                  strengths: evalData.strengths,
                  next_steps: evalData.nextSteps,
                  rubric_matrix: evalData.rubricMatrix
                },
                teacherEvaluation: {
                  ...evalData,
                  badgeAwarded: badge
                },
                badgeAwarded: badge || gradingModalLog.badgeAwarded
              });
            }
            setGradingModalLog(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* IMAGE PREVIEW LIGHTBOX */}
      {/* ========================================================================= */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewModalImage}
              alt="Preview"
              className="w-auto h-auto max-h-[82vh] max-w-full mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
