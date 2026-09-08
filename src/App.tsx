import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { StudentEvidenceView } from './components/StudentEvidenceView';
import { ToddleLinkManagerModal } from './components/ToddleLinkManagerModal';
import { TaskMeta, ATLTaskLog, AssignedTask, ATLCategoryKey } from './types';
import {
  subscribeToTaskLogs,
  saveTaskLogToFirestore,
  updateTaskLogReflectionInFirestore,
  deleteTaskLogFromFirestore,
  subscribeToAssignedTasks,
  saveAssignedTaskToFirestore,
  deleteAssignedTaskFromFirestore
} from './lib/firebase';
import { generateTaskClient } from './lib/geminiClient';
import { resolveFormativeScore } from './lib/scoreUtils';
import { getStudentEvidenceToken, findCanonicalStudent, buildStudentEvidenceRoster } from './lib/evidenceUtils';
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

  // Navigation & Tabs: 'student' (Student Tasks Portal), 'dashboard' (Teacher Dashboard & Analytics)
  const [activeTab, setActiveTab] = useState<'student' | 'dashboard'>(() => {
    return initialPortalState.isStudentMode ? 'student' : 'student';
  });

  // Standalone Evidence Portal Mode State (for direct Toddle / LMS links with clean isolated UI)
  const [isEvidenceMode, setIsEvidenceMode] = useState<boolean>(() => initialPortalState.isStudentMode);
  const [evidenceToken, setEvidenceToken] = useState<string>(() => initialPortalState.token);
  const [evidenceStudentName, setEvidenceStudentName] = useState<string>(() => initialPortalState.name);
  const [evidenceMypYear, setEvidenceMypYear] = useState<string>(() => initialPortalState.year);

  // Global Toddle Manager Modal State
  const [showGlobalToddleModal, setShowGlobalToddleModal] = useState<boolean>(false);

  // Global Academic Year State
  const [academicYear, setAcademicYear] = useState<string>('2025-2026');

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
  }, []);

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
      term: 'Term 1',
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
                studentName={evidenceStudentName || 'Student'}
                mypYear={evidenceMypYear || '3'}
                evidenceToken={evidenceToken || getStudentEvidenceToken(evidenceStudentName || 'Student', evidenceMypYear || '3')}
                logs={logs}
                academicYear={academicYear}
                assignedTasks={assignedTasks}
                onBackToWorkbench={() => setActiveTab('dashboard')}
                availableStudents={availableStudentNames}
                onSelectStudent={handleSelectStudentInEvidencePortal}
                onSaveTaskLog={handleSaveDirectTaskLog}
                onSaveReflection={handleSaveReflection}
                customApiKey={customApiKey}
              />
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
