import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SetupStep } from './components/SetupStep';
import { TaskStep } from './components/TaskStep';
import { FeedbackStep } from './components/FeedbackStep';
import { DashboardView } from './components/DashboardView';
import { StudentEvidenceView } from './components/StudentEvidenceView';
import { ToddleLinkManagerModal } from './components/ToddleLinkManagerModal';
import { TaskMeta, GeneratedTask, StudentResponseItem, TaskFeedback, ATLTaskLog, AssignedTask, ATLCategoryKey } from './types';
import {
  subscribeToTaskLogs,
  saveTaskLogToFirestore,
  updateTaskLogReflectionInFirestore,
  deleteTaskLogFromFirestore,
  subscribeToAssignedTasks,
  saveAssignedTaskToFirestore,
  deleteAssignedTaskFromFirestore
} from './lib/firebase';
import { generateTaskClient, evaluateTaskClient } from './lib/geminiClient';
import { resolveFormativeScore } from './lib/scoreUtils';
import { resolveStudentByToken, getStudentEvidenceToken, findCanonicalStudent, buildStudentEvidenceRoster } from './lib/evidenceUtils';
import { SAMPLE_LOGS, SAMPLE_ASSIGNED_TASKS } from './data/atlData';

function extractStudentPortalInfoFromUrl() {
  if (typeof window === 'undefined') return { isStudentMode: false, name: '', year: '3', token: '' };
  try {
    const searchStr = window.location.search;
    const hashStr = window.location.hash;
    const searchParams = new URLSearchParams(searchStr);
    
    let hashParams = new URLSearchParams();
    if (hashStr && hashStr.includes('?')) {
      hashParams = new URLSearchParams(hashStr.substring(hashStr.indexOf('?')));
    } else if (hashStr && (hashStr.includes('student=') || hashStr.includes('token=') || hashStr.includes('evidenceToken='))) {
      hashParams = new URLSearchParams(hashStr.replace(/^[#/]+/, ''));
    }

    const token = searchParams.get('evidenceToken') || searchParams.get('token') || searchParams.get('studentToken') ||
                  hashParams.get('evidenceToken') || hashParams.get('token') || hashParams.get('studentToken');
    const view = searchParams.get('view') || hashParams.get('view');
    const directStudentName = searchParams.get('student') || searchParams.get('studentName') || searchParams.get('studentId') ||
                              hashParams.get('student') || hashParams.get('studentName') || hashParams.get('studentId');
    const directYear = searchParams.get('year') || searchParams.get('mypYear') || searchParams.get('class') || searchParams.get('grade') ||
                       hashParams.get('year') || hashParams.get('mypYear') || hashParams.get('class') || hashParams.get('grade');

    if (token || directStudentName || view === 'evidence' || view === 'student') {
      const studentNameCandidate = directStudentName ? decodeURIComponent(directStudentName).trim() : '';
      const yearCandidate = directYear ? directYear.replace(/\D/g, '') || '3' : '3';
      const effectiveToken = token || (studentNameCandidate ? getStudentEvidenceToken(studentNameCandidate, yearCandidate) : '');

      if (studentNameCandidate || effectiveToken) {
        const canonical = findCanonicalStudent(studentNameCandidate || effectiveToken, yearCandidate);
        return {
          isStudentMode: true,
          name: canonical.canonicalName,
          year: canonical.mypYear,
          token: canonical.canonicalToken
        };
      }
    }
  } catch (e) {
    console.error('Error parsing student info from URL:', e);
  }
  return { isStudentMode: false, name: '', year: '3', token: '' };
}

export default function App() {
  const initialPortalState = useMemo(() => extractStudentPortalInfoFromUrl(), []);

  // Navigation & Tabs: 'student' (Student Tasks Portal), 'workbench' (Teacher Studio), 'dashboard' (Year Analytics)
  const [activeTab, setActiveTab] = useState<'student' | 'workbench' | 'dashboard'>(() => {
    return initialPortalState.isStudentMode ? 'student' : 'student';
  });
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Standalone Evidence Portal Mode State (for direct Toddle / LMS links with clean isolated UI)
  const [isEvidenceMode, setIsEvidenceMode] = useState<boolean>(() => initialPortalState.isStudentMode);
  const [evidenceToken, setEvidenceToken] = useState<string>(() => initialPortalState.token);
  const [evidenceStudentName, setEvidenceStudentName] = useState<string>(() => initialPortalState.name);
  const [evidenceMypYear, setEvidenceMypYear] = useState<string>(() => initialPortalState.year);

  // Global Toddle Manager Modal State
  const [showGlobalToddleModal, setShowGlobalToddleModal] = useState<boolean>(false);

  // Global Academic Year State
  const [academicYear, setAcademicYear] = useState<string>('2025-2026');

  // Task Configuration Form State
  const [meta, setMeta] = useState<TaskMeta>({
    subject: '',
    topic: '',
    year: '3',
    category: 'Communication',
    cluster: 'Communication',
    iduSubject: null,
  });

  const [studentName, setStudentName] = useState<string>('');
  const [term, setTerm] = useState<string>('Term 1');

  // Custom Student / Teacher Gemini API Key State
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('user_gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });

  const handleSaveApiKey = (key: string) => {
    const trimmed = key.trim();
    setCustomApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem('user_gemini_api_key', trimmed);
      } else {
        localStorage.removeItem('user_gemini_api_key');
      }
    } catch (e) {
      console.error('Failed to update user_gemini_api_key in localStorage:', e);
    }
  };

  // Task & Feedback State
  const [task, setTask] = useState<GeneratedTask | null>(null);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<TaskFeedback | null>(null);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);

  // Loading & Error States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Task Logs Database State (Firestore with local fallback)
  const [logs, setLogs] = useState<ATLTaskLog[]>(() => {
    try {
      const saved = localStorage.getItem('atl_workbench_logs_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: ATLTaskLog) => ({
            ...l,
            formativeScore: typeof l.formativeScore === 'number' ? l.formativeScore : resolveFormativeScore(l),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse logs from localStorage:', e);
    }
    return SAMPLE_LOGS;
  });

  // Assigned Common Tasks State (Firestore with fallback sample tasks)
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(SAMPLE_ASSIGNED_TASKS);

  // Subscribe to real-time Firestore database updates for logs & assigned tasks
  useEffect(() => {
    const unsubscribeLogs = subscribeToTaskLogs((firestoreLogs) => {
      if (firestoreLogs && firestoreLogs.length > 0) {
        setLogs(firestoreLogs);
        try {
          localStorage.setItem('atl_workbench_logs_v2', JSON.stringify(firestoreLogs));
        } catch (e) {
          console.error('Failed to cache logs in localStorage:', e);
        }
      } else {
        setLogs((prev) => (prev.length > 0 ? prev : SAMPLE_LOGS));
      }
    });

    const unsubscribeAssigned = subscribeToAssignedTasks((tasks) => {
      const active = (tasks || []).filter((t) => t.active !== false);
      if (active.length > 0) {
        setAssignedTasks(active);
      } else {
        setAssignedTasks(SAMPLE_ASSIGNED_TASKS);
      }
    });

    return () => {
      unsubscribeLogs();
      unsubscribeAssigned();
    };
  }, []);

  // Compute distinct canonical student names for portal switching
  const availableStudentNames = useMemo(() => {
    const roster = buildStudentEvidenceRoster(logs, academicYear);
    return roster.map((r) => r.studentName).sort();
  }, [logs, academicYear]);

  // Detect standalone student evidence portal from URL query parameter or hash
  useEffect(() => {
    const parseUrlToken = () => {
      try {
        const searchStr = window.location.search;
        const hashStr = window.location.hash;
        const searchParams = new URLSearchParams(searchStr);
        
        // Also support parameters inside URL hash (e.g., /#/?student=... or #token=...)
        let hashParams = new URLSearchParams();
        if (hashStr && hashStr.includes('?')) {
          hashParams = new URLSearchParams(hashStr.substring(hashStr.indexOf('?')));
        } else if (hashStr && (hashStr.includes('student=') || hashStr.includes('token=') || hashStr.includes('evidenceToken='))) {
          hashParams = new URLSearchParams(hashStr.replace(/^[#/]+/, ''));
        }

        const token = searchParams.get('evidenceToken') || searchParams.get('token') || searchParams.get('studentToken') ||
                      hashParams.get('evidenceToken') || hashParams.get('token') || hashParams.get('studentToken');
        const view = searchParams.get('view') || hashParams.get('view');
        const directStudentName = searchParams.get('student') || searchParams.get('studentName') || searchParams.get('studentId') ||
                                  hashParams.get('student') || hashParams.get('studentName') || hashParams.get('studentId');
        const directYear = searchParams.get('year') || searchParams.get('mypYear') || searchParams.get('class') || searchParams.get('grade') ||
                           hashParams.get('year') || hashParams.get('mypYear') || hashParams.get('class') || hashParams.get('grade');

        if (token || directStudentName || view === 'evidence') {
          const studentNameCandidate = directStudentName ? decodeURIComponent(directStudentName).trim() : '';
          const yearCandidate = directYear ? directYear.replace(/\D/g, '') || '3' : '3';
          const effectiveToken = token || (studentNameCandidate ? getStudentEvidenceToken(studentNameCandidate, yearCandidate) : '');

          if (studentNameCandidate || effectiveToken) {
            const canonical = findCanonicalStudent(studentNameCandidate || effectiveToken, yearCandidate);
            setEvidenceToken(canonical.canonicalToken);
            setEvidenceStudentName(canonical.canonicalName);
            setEvidenceMypYear(canonical.mypYear);
            setIsEvidenceMode(true);
          }
        }
      } catch (e) {
        console.error('Error parsing URL evidence token:', e);
      }
    };

    parseUrlToken();

    window.addEventListener('popstate', parseUrlToken);
    window.addEventListener('hashchange', parseUrlToken);
    return () => {
      window.removeEventListener('popstate', parseUrlToken);
      window.removeEventListener('hashchange', parseUrlToken);
    };
  }, [logs]);

  // Open standalone student evidence portal
  const handleOpenStudentEvidencePortal = (name: string, token: string, mypYear?: string) => {
    const canonical = findCanonicalStudent(name || token, mypYear);
    setEvidenceToken(canonical.canonicalToken);
    setEvidenceStudentName(canonical.canonicalName);
    setEvidenceMypYear(canonical.mypYear);
    setIsEvidenceMode(true);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('student', canonical.canonicalName);
      url.searchParams.set('year', canonical.mypYear);
      url.searchParams.set('token', canonical.canonicalToken);
      url.searchParams.delete('evidenceToken');
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.error('Failed to update URL search params:', e);
    }
  };

  // Switch student in evidence portal
  const handleSelectStudentInEvidencePortal = (name: string) => {
    const canonical = findCanonicalStudent(name);
    handleOpenStudentEvidencePortal(canonical.canonicalName, canonical.canonicalToken, canonical.mypYear);
  };

  // Return from standalone portal back to main app
  const handleBackFromEvidencePortal = () => {
    setIsEvidenceMode(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('evidenceToken');
      url.searchParams.delete('token');
      url.searchParams.delete('studentToken');
      url.searchParams.delete('view');
      url.searchParams.delete('student');
      url.searchParams.delete('studentName');
      url.searchParams.delete('studentId');
      url.searchParams.delete('year');
      url.searchParams.delete('mypYear');
      url.searchParams.delete('class');
      url.searchParams.delete('grade');
      window.history.pushState({}, '', url.pathname || '/');
    } catch (e) {
      console.error('Failed to clear URL search params:', e);
    }
  };

  // Handle Launching a Teacher Assigned Task
  const handleSelectAssignedTask = (assignedTask: AssignedTask) => {
    setErrorMessage(null);
    if (!studentName.trim()) {
      setErrorMessage('Please enter your Student or Class Name above before starting the assigned task.');
      return;
    }

    const exactTitle = assignedTask.title || assignedTask.task?.title || assignedTask.topic;

    setMeta({
      title: exactTitle,
      taskTitle: exactTitle,
      subject: assignedTask.subject,
      topic: assignedTask.topic,
      year: assignedTask.mypYear,
      category: assignedTask.category,
      cluster: assignedTask.cluster,
      iduSubject: null,
      criteria: assignedTask.criteria || assignedTask.task?.target_criteria,
      strands: assignedTask.strands || assignedTask.task?.target_strands,
      assignedTaskId: assignedTask.id,
      dueDate: assignedTask.dueDate,
      assignedTeacherName: assignedTask.teacherName,
    });
    setTask({
      ...assignedTask.task,
      title: exactTitle,
    });
    setResponses({});
    setStep(2);
  };

  // Handle Teacher Creating & Publishing an Assigned Task
  const handleCreateAssignedTask = async (taskData: {
    teacherName: string;
    subject: string;
    topic: string;
    title?: string;
    mypYear: string;
    category: ATLCategoryKey;
    cluster: string;
    iduSubject?: string | null;
    criteria?: string[];
    strands?: string[];
    dueDate?: string;
    dueDaysPeriod?: number;
  }) => {
    const exactTitle = taskData.title?.trim() || taskData.topic.trim();

    const taskMeta: TaskMeta = {
      title: exactTitle,
      taskTitle: exactTitle,
      subject: taskData.subject,
      topic: taskData.topic,
      year: taskData.mypYear,
      category: taskData.category,
      cluster: taskData.cluster,
      iduSubject: taskData.iduSubject || null,
      criteria: taskData.criteria,
      strands: taskData.strands,
      dueDate: taskData.dueDate,
    };

    const generatedTask = await generateTaskClient(taskMeta, false, customApiKey);
    generatedTask.title = exactTitle;

    const newAssignedTask: AssignedTask = {
      id: 'assigned-' + Date.now(),
      title: exactTitle,
      subject: taskData.subject,
      topic: taskData.topic,
      mypYear: taskData.mypYear,
      category: taskData.category,
      cluster: taskData.cluster,
      task: {
        ...generatedTask,
        title: exactTitle,
      },
      teacherName: taskData.teacherName || 'Teacher',
      createdAt: new Date().toISOString(),
      academicYear,
      term,
      active: true,
      criteria: taskData.criteria || generatedTask.target_criteria,
      strands: taskData.strands || generatedTask.target_strands,
      dueDate: taskData.dueDate,
      dueDaysPeriod: taskData.dueDaysPeriod,
    };

    await saveAssignedTaskToFirestore(newAssignedTask);
  };

  // Handle Deleting an Assigned Task
  const handleDeleteAssignedTask = async (taskId: string) => {
    await deleteAssignedTaskFromFirestore(taskId);
  };

  // Handle Task Generation
  const handleGenerateTask = async (autoCluster: boolean) => {
    setErrorMessage(null);

    if (!studentName.trim()) {
      setErrorMessage('Please enter a student or class name so progress can be logged against your details.');
      return;
    }
    if (!meta.subject) {
      setErrorMessage('Please select a subject group.');
      return;
    }
    if (!meta.topic.trim()) {
      setErrorMessage('Please type a curriculum topic.');
      return;
    }

    const exactTitle = meta.taskTitle?.trim() || meta.title?.trim() || meta.topic.trim();
    const updatedMeta: TaskMeta = {
      ...meta,
      title: exactTitle,
      taskTitle: exactTitle,
      assignedTaskId: undefined,
      dueDate: undefined,
      assignedTeacherName: undefined,
    };

    // Reset any assigned task properties for a fresh custom task
    setMeta(updatedMeta);

    setIsGenerating(true);

    try {
      const generatedTask = await generateTaskClient(updatedMeta, autoCluster, customApiKey);
      generatedTask.title = exactTitle;
      setTask(generatedTask);
      setResponses({});
      setStep(2);
    } catch (err: any) {
      console.error('Error generating task:', err);
      setErrorMessage(err?.message || 'Failed to generate task.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Student Task Submission & AI Evaluation
  const handleSubmitTask = async (formattedResponses: StudentResponseItem[]) => {
    setErrorMessage(null);

    const hasAnyResponse = formattedResponses.some((r) => r.response.trim().length > 0);
    if (!hasAnyResponse) {
      setErrorMessage('Please type a response to at least one part before submitting for feedback.');
      return;
    }

    if (!task) return;

    setIsEvaluating(true);

    try {
      const fbData = await evaluateTaskClient(task, meta, formattedResponses, customApiKey);
      const computedScore = typeof fbData.formativeScore === 'number'
        ? fbData.formativeScore
        : resolveFormativeScore({ ...fbData, responses: formattedResponses });

      fbData.formativeScore = computedScore;
      setFeedback(fbData);

      // Calculate Submission Timing Status
      let submissionStatus: 'on_time' | 'overdue' | 'not_applicable' = 'not_applicable';
      let daysOverdue = 0;

      if (meta.dueDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr <= meta.dueDate) {
          submissionStatus = 'on_time';
        } else {
          submissionStatus = 'overdue';
          const submissionDate = new Date();
          const dueDateTime = new Date(meta.dueDate);
          dueDateTime.setHours(23, 59, 59, 999);
          const diffMs = Math.max(0, submissionDate.getTime() - dueDateTime.getTime());
          daysOverdue = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      // Auto Log to Academic Year Tracker & Firestore Cloud Database
      const newLogId = 'log-' + Date.now();
      setCurrentLogId(newLogId);

      const exactTitle = meta.taskTitle || meta.title || task.title || meta.topic;
      const canonical = findCanonicalStudent(studentName.trim() || 'Anonymous', meta.year);

      const newLog: ATLTaskLog = {
        id: newLogId,
        date: new Date().toISOString().split('T')[0],
        academicYear,
        term,
        studentName: canonical.canonicalName,
        studentId: canonical.studentId,
        evidenceToken: canonical.canonicalToken,
        classSection: canonical.classSection,
        subject: meta.subject,
        topic: meta.topic,
        mypYear: canonical.mypYear,
        category: meta.category,
        cluster: task.chosen_cluster || meta.cluster,
        level: fbData.level,
        formativeScore: computedScore,
        taskTitle: exactTitle,
        skillIndicators: task.skill_indicators,
        responses: formattedResponses,
        feedback: fbData,
        criteria: meta.criteria || task.target_criteria,
        strands: meta.strands || task.target_strands,
        assignedTaskId: meta.assignedTaskId,
        dueDate: meta.dueDate,
        submissionStatus,
        daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
      };

      setLogs((prev) => [newLog, ...prev]);
      saveTaskLogToFirestore(newLog).catch((e) => {
        console.error('Failed to sync new log to Firestore:', e);
      });

      setStep(3);
    } catch (err: any) {
      console.error('Error evaluating task:', err);
      setErrorMessage(err?.message || 'Failed to evaluate task.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle Saving Student Post-Task Reflection
  const handleSaveReflection = async (logId: string, reflectionText: string) => {
    try {
      await updateTaskLogReflectionInFirestore(logId, reflectionText);
      setLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, studentReflection: reflectionText } : log))
      );
    } catch (e) {
      console.error('Failed to update reflection in Firestore:', e);
      throw e;
    }
  };

  // Delete Log
  const handleDeleteLog = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await deleteTaskLogFromFirestore(id);
    } catch (e) {
      console.error('Failed to delete log from Firestore:', e);
    }
  };

  // Clear All Logs
  const handleResetSampleLogs = async () => {
    if (window.confirm('Are you sure you want to clear all recorded task analytics logs?')) {
      const currentLogs = [...logs];
      setLogs([]);
      for (const log of currentLogs) {
        try {
          await deleteTaskLogFromFirestore(log.id);
        } catch (e) {
          console.error('Error deleting log from Firestore:', e);
        }
      }
    }
  };

  // Teacher Password Authorization State for Analytics Dashboard
  const [isAnalyticsUnlocked, setIsAnalyticsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('atl_analytics_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Save direct task log from student evidence portal
  const handleSaveDirectTaskLog = async (newLog: ATLTaskLog) => {
    const canonical = findCanonicalStudent(newLog.studentName, newLog.mypYear);
    const normalizedLog: ATLTaskLog = {
      ...newLog,
      studentName: canonical.canonicalName,
      studentId: newLog.studentId || canonical.studentId,
      evidenceToken: canonical.canonicalToken,
      mypYear: canonical.mypYear,
      classSection: newLog.classSection || canonical.classSection
    };
    setLogs((prev) => [normalizedLog, ...prev]);
    try {
      await saveTaskLogToFirestore(normalizedLog);
    } catch (e) {
      console.error('Failed to save task log to Firestore:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      {/* If in standalone evidence portal mode, show dedicated StudentEvidenceView */}
      {isEvidenceMode ? (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          <StudentEvidenceView
            studentName={evidenceStudentName || 'Student'}
            mypYear={evidenceMypYear}
            evidenceToken={evidenceToken || getStudentEvidenceToken(evidenceStudentName || 'Student', evidenceMypYear)}
            logs={logs}
            academicYear={academicYear}
            assignedTasks={assignedTasks}
            onBackToWorkbench={handleBackFromEvidencePortal}
            availableStudents={availableStudentNames}
            onSelectStudent={handleSelectStudentInEvidencePortal}
            onSaveTaskLog={handleSaveDirectTaskLog}
            onSaveReflection={handleSaveReflection}
            customApiKey={customApiKey}
          />
        </div>
      ) : (
        <>
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            academicYear={academicYear}
            setAcademicYear={setAcademicYear}
            totalLogsCount={logs.length}
            activeTasksCount={assignedTasks.length}
            customApiKey={customApiKey}
            onSaveApiKey={handleSaveApiKey}
            isAnalyticsUnlocked={isAnalyticsUnlocked}
            onOpenToddleManager={() => setShowGlobalToddleModal(true)}
          />

          {/* Main Content Area */}
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
            {activeTab === 'student' && (
              <StudentEvidenceView
                studentName={evidenceStudentName || studentName || 'Student'}
                mypYear={evidenceMypYear || meta.year || '3'}
                evidenceToken={evidenceToken || getStudentEvidenceToken(evidenceStudentName || studentName || 'Student', evidenceMypYear || meta.year || '3')}
                logs={logs}
                academicYear={academicYear}
                assignedTasks={assignedTasks}
                onBackToWorkbench={() => setActiveTab('workbench')}
                availableStudents={availableStudentNames}
                onSelectStudent={handleSelectStudentInEvidencePortal}
                onSaveTaskLog={handleSaveDirectTaskLog}
                onSaveReflection={handleSaveReflection}
                customApiKey={customApiKey}
              />
            )}

            {activeTab === 'workbench' && (
              <div>
                {/* Step Indicators */}
                <div className="mx-auto mb-8 flex max-w-xl items-center justify-between gap-3 print:hidden">
                  <div className="flex-1">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        step >= 1 ? 'bg-indigo-600 shadow-xs' : 'bg-slate-200'
                      }`}
                    />
                    <span className={`mt-1.5 block text-center text-[10px] font-bold uppercase tracking-wider ${
                      step === 1 ? 'text-indigo-600' : 'text-slate-400'
                    }`}>1. Task Config</span>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        step >= 2 ? 'bg-indigo-600 shadow-xs' : 'bg-slate-200'
                      }`}
                    />
                    <span className={`mt-1.5 block text-center text-[10px] font-bold uppercase tracking-wider ${
                      step === 2 ? 'text-indigo-600' : 'text-slate-400'
                    }`}>2. Student Work</span>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        step >= 3 ? 'bg-emerald-600 shadow-xs' : 'bg-slate-200'
                      }`}
                    />
                    <span className={`mt-1.5 block text-center text-[10px] font-bold uppercase tracking-wider ${
                      step === 3 ? 'text-emerald-600' : 'text-slate-400'
                    }`}>3. Evaluation</span>
                  </div>
                </div>

                {/* Workbench Views */}
                <div className="mx-auto max-w-4xl">
                  {step === 1 && (
                    <SetupStep
                      meta={meta}
                      setMeta={setMeta}
                      studentName={studentName}
                      setStudentName={setStudentName}
                      term={term}
                      setTerm={setTerm}
                      onGenerate={handleGenerateTask}
                      isLoading={isGenerating}
                      errorMessage={errorMessage}
                      assignedTasks={assignedTasks}
                      onSelectAssignedTask={handleSelectAssignedTask}
                      onDeleteAssignedTask={handleDeleteAssignedTask}
                    />
                  )}

                  {step === 2 && task && (
                    <TaskStep
                      task={task}
                      meta={meta}
                      studentName={studentName}
                      responses={responses}
                      setResponses={setResponses}
                      onBack={() => setStep(1)}
                      onSubmit={handleSubmitTask}
                      isLoading={isEvaluating}
                      errorMessage={errorMessage}
                    />
                  )}

                  {step === 3 && feedback && task && (
                    <FeedbackStep
                      feedback={feedback}
                      task={task}
                      meta={meta}
                      studentName={studentName}
                      responses={Object.entries(responses).map(([idx, resp]) => ({
                        label: task.parts[Number(idx)]?.label || String.fromCharCode(65 + Number(idx)),
                        prompt: task.parts[Number(idx)]?.prompt || '',
                        response: resp,
                      }))}
                      onNewTask={() => setStep(1)}
                      onGoToDashboard={() => setActiveTab('dashboard')}
                      currentLogId={currentLogId}
                      logs={logs}
                      onSaveReflection={handleSaveReflection}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                logs={logs}
                academicYear={academicYear}
                setAcademicYear={setAcademicYear}
                onDeleteLog={handleDeleteLog}
                onResetSampleLogs={handleResetSampleLogs}
                isUnlocked={isAnalyticsUnlocked}
                setIsUnlocked={setIsAnalyticsUnlocked}
                assignedTasks={assignedTasks}
                onCreateAssignedTask={handleCreateAssignedTask}
                onDeleteAssignedTask={handleDeleteAssignedTask}
                onOpenStudentPortal={handleOpenStudentEvidencePortal}
              />
            )}
          </main>
        </>
      )}

      {/* Global Toddle & LMS Standalone Evidence Link Manager Modal */}
      {showGlobalToddleModal && (
        <ToddleLinkManagerModal
          logs={logs}
          academicYear={academicYear}
          onClose={() => setShowGlobalToddleModal(false)}
          onOpenStudentPortal={handleOpenStudentEvidencePortal}
        />
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs font-medium text-slate-500 print:hidden">
        <p>IB MYP Approaches to Learning (ATL) Workbench & Analytics Engine • Bento Grid Design Edition</p>
      </footer>
    </div>
  );
}
