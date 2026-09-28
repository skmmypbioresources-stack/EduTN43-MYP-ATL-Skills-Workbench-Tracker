import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { StudentEvidenceView } from './components/StudentEvidenceView';
import { ToddleLinkManagerModal } from './components/ToddleLinkManagerModal';
import { TaskMeta, ATLTaskLog, AssignedTask, ATLCategoryKey, GeneratedTask, DEFAULT_ACADEMIC_YEAR } from './types';
import {
  subscribeToTaskLogs,
  saveTaskLogToFirestore,
  updateTaskLogInFirestore,
  updateTaskLogReflectionInFirestore,
  deleteTaskLogFromFirestore,
  subscribeToAssignedTasks,
  saveAssignedTaskToFirestore,
  updateAssignedTaskInFirestore,
  deleteAssignedTaskFromFirestore,
  isQuotaExceededError,
  getFirestoreUpgradeUrl
} from './lib/firebase';
import { generateTaskClient } from './lib/geminiClient';
import { isTaskLogGraded, getTaskEffectiveScore } from './lib/scoreUtils';
import { getStudentEvidenceToken, findCanonicalStudent, buildStudentEvidenceRoster } from './lib/evidenceUtils';
import {
  cacheTaskLogsLocally,
  cacheAssignedTasksLocally,
  cleanBloatedLocalStorageIfNecessary,
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  saveToIndexedDB,
  getFromIndexedDB
} from './lib/safeStorage';
import { SAMPLE_LOGS, SAMPLE_ASSIGNED_TASKS } from './data/atlData';

export const isSampleDataCleared = (): boolean => {
  try {
    return safeGetLocalStorageItem('atl_sample_data_cleared') === 'true';
  } catch {
    return false;
  }
};

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

  // Firestore Daily Free Read Quota Exceeded State
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);
  const [dismissQuotaBanner, setDismissQuotaBanner] = useState<boolean>(false);

  // Global Academic Year State - Defaults to 2026-2027
  const [academicYear, setAcademicYearState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('myp_atl_academic_year');
      return saved || DEFAULT_ACADEMIC_YEAR;
    } catch {
      return DEFAULT_ACADEMIC_YEAR;
    }
  });

  const setAcademicYear = (year: string) => {
    setAcademicYearState(year);
    try {
      localStorage.setItem('myp_atl_academic_year', year);
    } catch (e) {
      console.warn('Failed to save academic year to localStorage:', e);
    }
  };

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

  const [isCleanMode, setIsCleanMode] = useState<boolean>(() => isSampleDataCleared());

  // Task Logs Database State (Firestore with local fallback)
  const [logs, setLogs] = useState<ATLTaskLog[]>(() => {
    try {
      const saved = safeGetLocalStorageItem('atl_workbench_logs_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) {
            return parsed.map((l: ATLTaskLog) => {
              const graded = isTaskLogGraded(l);
              return {
                ...l,
                formativeScore: graded ? getTaskEffectiveScore(l) : undefined,
                level: graded ? l.level : undefined,
              };
            });
          }
          if (isSampleDataCleared()) return [];
        }
      }
    } catch {
      // Graceful fallback
    }
    return isSampleDataCleared() ? [] : SAMPLE_LOGS;
  });

  // Assigned Common Tasks State (Firestore with fallback sample tasks and localStorage caching)
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(() => {
    try {
      const saved = safeGetLocalStorageItem('atl_assigned_tasks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) {
            return parsed.filter((t) => t.active !== false);
          }
          if (isSampleDataCleared()) return [];
        }
      }
    } catch {
      // Graceful fallback
    }
    return isSampleDataCleared() ? [] : SAMPLE_ASSIGNED_TASKS;
  });

  // Prune any oversized previous cache and hydrate full data from IndexedDB if initial state was empty
  useEffect(() => {
    cleanBloatedLocalStorageIfNecessary();

    getFromIndexedDB<ATLTaskLog[]>('atl_workbench_logs_v2').then((idbLogs) => {
      if (idbLogs && Array.isArray(idbLogs) && idbLogs.length > 0) {
        setLogs((prev) => {
          if (prev === SAMPLE_LOGS || prev.length === 0) {
            return idbLogs.map((l: ATLTaskLog) => {
              const graded = isTaskLogGraded(l);
              return {
                ...l,
                formativeScore: graded ? getTaskEffectiveScore(l) : undefined,
                level: graded ? l.level : undefined,
              };
            });
          }
          return prev;
        });
      }
    });

    getFromIndexedDB<AssignedTask[]>('atl_assigned_tasks_v2').then((idbTasks) => {
      if (idbTasks && Array.isArray(idbTasks) && idbTasks.length > 0) {
        setAssignedTasks((prev) => {
          if (prev === SAMPLE_ASSIGNED_TASKS || prev.length === 0) {
            return idbTasks.filter((t) => t.active !== false);
          }
          return prev;
        });
      }
    });
  }, []);

  // Subscribe to real-time Firestore database updates for logs & assigned tasks
  useEffect(() => {
    const unsubscribeLogs = subscribeToTaskLogs(
      (firestoreLogs) => {
        if (firestoreLogs && firestoreLogs.length > 0) {
          setLogs(firestoreLogs);
          cacheTaskLogsLocally(firestoreLogs);
        } else {
          setLogs((prev) => {
            if (isSampleDataCleared()) {
              return prev === SAMPLE_LOGS ? [] : prev;
            }
            return prev.length > 0 ? prev : SAMPLE_LOGS;
          });
        }
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          setIsQuotaExceeded(true);
        }
        // Seamlessly hydrate from IndexedDB offline storage
        getFromIndexedDB<ATLTaskLog[]>('atl_workbench_logs_v2').then((idbLogs) => {
          if (idbLogs && Array.isArray(idbLogs)) {
            setLogs(idbLogs);
          }
        });
      }
    );

    const unsubscribeAssigned = subscribeToAssignedTasks(
      (tasks) => {
        const active = (tasks || []).filter((t) => t.active !== false);
        if (active.length > 0) {
          setAssignedTasks(active);
          cacheAssignedTasksLocally(active);
        } else {
          setAssignedTasks((prev) => {
            if (isSampleDataCleared()) {
              return prev === SAMPLE_ASSIGNED_TASKS ? [] : prev;
            }
            return prev.length > 0 ? prev : SAMPLE_ASSIGNED_TASKS;
          });
        }
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          setIsQuotaExceeded(true);
        }
        // Seamlessly hydrate assigned tasks from IndexedDB offline storage
        getFromIndexedDB<AssignedTask[]>('atl_assigned_tasks_v2').then((idbTasks) => {
          if (idbTasks && Array.isArray(idbTasks)) {
            setAssignedTasks(idbTasks.filter((t) => t.active !== false));
          }
        });
      }
    );

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'atl_assigned_tasks_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAssignedTasks(parsed);
          }
        } catch (err) {
          console.warn('Failed to sync assigned tasks from storage event:', err);
        }
      }
      if (e.key === 'atl_workbench_logs_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLogs(parsed);
          }
        } catch (err) {
          console.warn('Failed to sync logs from storage event:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribeLogs();
      unsubscribeAssigned();
      window.removeEventListener('storage', handleStorageChange);
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
    academicYear?: string;
    iduSubject?: string | null;
    criteria?: string[];
    strands?: string[];
    dueDate?: string;
    dueDaysPeriod?: number;
    cerFramework?: boolean;
    finalTask?: GeneratedTask;
    customInstructions?: string;
    targetStudentNames?: string[];
  }) => {
    const exactTitle = taskData.title?.trim() || taskData.topic.trim();

    let taskToAssign: GeneratedTask;

    if (taskData.finalTask) {
      taskToAssign = {
        ...taskData.finalTask,
        title: exactTitle,
      };
    } else {
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
        customInstructions: taskData.customInstructions,
      };

      const generatedTask = await generateTaskClient(taskMeta, false, customApiKey);
      generatedTask.title = exactTitle;
      taskToAssign = generatedTask;
    }

    const newAssignedTask: AssignedTask = {
      id: 'assigned-' + Date.now(),
      title: exactTitle,
      subject: taskData.subject,
      topic: taskData.topic,
      mypYear: taskData.mypYear,
      category: taskData.category,
      cluster: taskData.cluster,
      task: {
        ...taskToAssign,
        title: exactTitle,
      },
      teacherName: taskData.teacherName || 'Teacher',
      createdAt: new Date().toISOString(),
      academicYear: taskData.academicYear || academicYear || DEFAULT_ACADEMIC_YEAR,
      term: 'Term 1',
      active: true,
      isArchived: false,
      cerFramework: taskData.cerFramework !== undefined ? taskData.cerFramework : ((taskToAssign as any).cerFramework !== undefined ? (taskToAssign as any).cerFramework : true),
      criteria: taskData.criteria || taskToAssign.target_criteria,
      strands: taskData.strands || taskToAssign.target_strands,
      dueDate: taskData.dueDate,
      dueDaysPeriod: taskData.dueDaysPeriod,
      targetStudentNames: taskData.targetStudentNames,
      stimulusImages: taskToAssign.stimulusImages || [],
      sourceType: taskToAssign.sourceType || 'manual'
    };

    // Optimistically update React state and local storage safely
    setAssignedTasks((prev) => {
      const updated = [newAssignedTask, ...prev.filter((t) => t.id !== newAssignedTask.id)];
      cacheAssignedTasksLocally(updated);
      return updated;
    });

    try {
      await saveAssignedTaskToFirestore(newAssignedTask);
    } catch (err) {
      console.error('Firestore save failed, task safely preserved in local state:', err);
    }
  };

  // Handle Deleting an Assigned Task
  const handleDeleteAssignedTask = async (taskId: string) => {
    safeSetLocalStorageItem('atl_sample_data_cleared', 'true');
    setIsCleanMode(true);
    setAssignedTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      cacheAssignedTasksLocally(updated);
      saveToIndexedDB('atl_assigned_tasks_v2', updated);
      return updated;
    });
    try {
      await deleteAssignedTaskFromFirestore(taskId);
    } catch (err) {
      console.error('Failed to delete assigned task from Firestore:', err);
    }
  };

  // Handle Updating an Assigned Task (e.g. changing Academic Year)
  const handleUpdateAssignedTask = async (taskId: string, partial: Partial<AssignedTask>) => {
    setAssignedTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, ...partial } : t));
      cacheAssignedTasksLocally(updated);
      saveToIndexedDB('atl_assigned_tasks_v2', updated);
      return updated;
    });
    try {
      await updateAssignedTaskInFirestore(taskId, partial);
    } catch (err) {
      console.error('Failed to update assigned task in Firestore:', err);
    }
  };

  // Handle Saving Student Post-Task Reflection
  const handleSaveReflection = async (logId: string, reflectionText: string) => {
    try {
      await updateTaskLogReflectionInFirestore(logId, reflectionText);
      setLogs((prev) => {
        const updated = prev.map((log) => (log.id === logId ? { ...log, studentReflection: reflectionText } : log));
        cacheTaskLogsLocally(updated);
        saveToIndexedDB('atl_workbench_logs_v2', updated);
        return updated;
      });
    } catch (e) {
      console.error('Failed to update reflection in Firestore:', e);
      throw e;
    }
  };

  // Delete Log
  const handleDeleteLog = async (id: string) => {
    safeSetLocalStorageItem('atl_sample_data_cleared', 'true');
    setIsCleanMode(true);
    setLogs((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      cacheTaskLogsLocally(updated);
      saveToIndexedDB('atl_workbench_logs_v2', updated);
      return updated;
    });
    try {
      await deleteTaskLogFromFirestore(id);
    } catch (e) {
      console.error('Failed to delete log from Firestore:', e);
    }
  };

  // Clear All Prefilled / Sample Data (Clean Mode)
  const handleClearSampleData = async () => {
    safeSetLocalStorageItem('atl_sample_data_cleared', 'true');
    setIsCleanMode(true);

    const userTasks = assignedTasks.filter((t) => !t.id.startsWith('sample-assigned-'));
    setAssignedTasks(userTasks);
    cacheAssignedTasksLocally(userTasks);
    await saveToIndexedDB('atl_assigned_tasks_v2', userTasks);

    const userLogs = logs.filter((l) => !l.id.startsWith('log-'));
    setLogs(userLogs);
    cacheTaskLogsLocally(userLogs);
    await saveToIndexedDB('atl_workbench_logs_v2', userLogs);

    for (const t of assignedTasks) {
      if (t.id.startsWith('sample-assigned-')) {
        try {
          await deleteAssignedTaskFromFirestore(t.id);
        } catch {}
      }
    }
    for (const l of logs) {
      if (l.id.startsWith('log-')) {
        try {
          await deleteTaskLogFromFirestore(l.id);
        } catch {}
      }
    }
  };

  // Optional: Restore Sample Demo Data
  const handleRestoreSampleData = async () => {
    try {
      localStorage.removeItem('atl_sample_data_cleared');
      setIsCleanMode(false);

      setLogs(SAMPLE_LOGS);
      cacheTaskLogsLocally(SAMPLE_LOGS);
      await saveToIndexedDB('atl_workbench_logs_v2', SAMPLE_LOGS);

      setAssignedTasks(SAMPLE_ASSIGNED_TASKS);
      cacheAssignedTasksLocally(SAMPLE_ASSIGNED_TASKS);
      await saveToIndexedDB('atl_assigned_tasks_v2', SAMPLE_ASSIGNED_TASKS);
    } catch (e) {
      console.error('Failed to restore sample data:', e);
    }
  };

  // Clear All Logs
  const handleResetSampleLogs = async () => {
    if (window.confirm('Are you sure you want to clear all recorded task analytics logs?')) {
      safeSetLocalStorageItem('atl_sample_data_cleared', 'true');
      setIsCleanMode(true);
      const currentLogs = [...logs];
      setLogs([]);
      cacheTaskLogsLocally([]);
      await saveToIndexedDB('atl_workbench_logs_v2', []);
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

  // Update a task log with teacher evaluation, score, or digital badge
  const handleUpdateTaskLog = async (logId: string, partial: Partial<ATLTaskLog>) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === logId ? { ...log, ...partial } : log))
    );
    try {
      await updateTaskLogInFirestore(logId, partial);
    } catch (e) {
      console.error('Failed to update task log in Firestore:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      {/* Firestore Daily Free Quota Exceeded Notification Banner */}
      {isQuotaExceeded && !dismissQuotaBanner && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Firestore Daily Free Quota Limit Reached:</strong> The workbench has seamlessly switched to high-speed offline/local cache mode. All student tasks, reflections, submissions, and teacher evaluations are safely preserved locally. Free tier read quota resets daily at 00:00 PST.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getFirestoreUpgradeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors"
            >
              <span>View Quota / Upgrade</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setDismissQuotaBanner(true)}
              className="p-1 text-amber-700 hover:text-amber-950 rounded-md hover:bg-amber-500/20 transition-colors"
              title="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
            onUpdateTaskLog={handleUpdateTaskLog}
            onSaveReflection={handleSaveReflection}
            customApiKey={customApiKey}
            onDeleteLog={handleDeleteLog}
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
                onUpdateTaskLog={handleUpdateTaskLog}
                onSaveReflection={handleSaveReflection}
                customApiKey={customApiKey}
                onDeleteLog={handleDeleteLog}
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
                onUpdateAssignedTask={handleUpdateAssignedTask}
                onDeleteAssignedTask={handleDeleteAssignedTask}
                onOpenStudentPortal={handleOpenStudentEvidencePortal}
                onUpdateTaskLog={handleUpdateTaskLog}
                customApiKey={customApiKey}
                isCleanMode={isCleanMode}
                onClearSampleData={handleClearSampleData}
                onRestoreSampleData={handleRestoreSampleData}
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
