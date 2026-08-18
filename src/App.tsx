import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SetupStep } from './components/SetupStep';
import { TaskStep } from './components/TaskStep';
import { FeedbackStep } from './components/FeedbackStep';
import { DashboardView } from './components/DashboardView';
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
import { SAMPLE_LOGS } from './data/atlData';

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'workbench' | 'dashboard'>('workbench');
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse logs from localStorage:', e);
    }
    return SAMPLE_LOGS;
  });

  // Assigned Common Tasks State (Firestore)
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);

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
      setAssignedTasks(tasks.filter((t) => t.active !== false));
    });

    return () => {
      unsubscribeLogs();
      unsubscribeAssigned();
    };
  }, []);

  // Handle Launching a Teacher Assigned Task
  const handleSelectAssignedTask = (assignedTask: AssignedTask) => {
    setErrorMessage(null);
    if (!studentName.trim()) {
      setErrorMessage('Please enter your Student or Class Name above before starting the assigned task.');
      return;
    }

    setMeta({
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
    setTask(assignedTask.task);
    setResponses({});
    setStep(2);
  };

  // Handle Teacher Creating & Publishing an Assigned Task
  const handleCreateAssignedTask = async (taskData: {
    teacherName: string;
    subject: string;
    topic: string;
    mypYear: string;
    category: ATLCategoryKey;
    cluster: string;
    iduSubject?: string | null;
    criteria?: string[];
    strands?: string[];
    dueDate?: string;
    dueDaysPeriod?: number;
  }) => {
    const taskMeta: TaskMeta = {
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

    const newAssignedTask: AssignedTask = {
      id: 'assigned-' + Date.now(),
      title: generatedTask.title || `${taskData.subject} - ${taskData.topic}`,
      subject: taskData.subject,
      topic: taskData.topic,
      mypYear: taskData.mypYear,
      category: taskData.category,
      cluster: taskData.cluster,
      task: generatedTask,
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

    // Reset any assigned task properties for a fresh custom task
    setMeta((prev) => ({
      ...prev,
      assignedTaskId: undefined,
      dueDate: undefined,
      assignedTeacherName: undefined,
    }));

    setIsGenerating(true);

    try {
      const generatedTask = await generateTaskClient(meta, autoCluster, customApiKey);
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

      const newLog: ATLTaskLog = {
        id: newLogId,
        date: new Date().toISOString().split('T')[0],
        academicYear,
        term,
        studentName: studentName.trim() || 'Anonymous',
        subject: meta.subject,
        topic: meta.topic,
        mypYear: meta.year,
        category: meta.category,
        cluster: task.chosen_cluster || meta.cluster,
        level: fbData.level,
        taskTitle: task.title,
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
        totalLogsCount={logs.length}
        customApiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
        isAnalyticsUnlocked={isAnalyticsUnlocked}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {activeTab === 'workbench' ? (
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
        ) : (
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
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs font-medium text-slate-500 print:hidden">
        <p>IB MYP Approaches to Learning (ATL) Workbench & Analytics Engine • Bento Grid Design Edition</p>
      </footer>
    </div>
  );
}
