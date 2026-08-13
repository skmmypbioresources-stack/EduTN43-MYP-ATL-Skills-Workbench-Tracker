import React, { useState, useMemo } from 'react';
import { ATLTaskLog, ATLCategoryKey, AssignedTask } from '../types';
import { exportToWordDoc, exportToPdf, exportToCsvSpreadsheet, getAvailableMonthsFromLogs } from '../lib/exportUtils';
import { ATL_DATA, ALL_CLUSTERS } from '../data/atlData';
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
} from 'lucide-react';

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
    iduSubject?: string | null;
  }) => Promise<void>;
  onDeleteAssignedTask?: (taskId: string) => Promise<void>;
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
      return 'MYP 1 (Grade 6)';
    case '2':
      return 'MYP 2 (Grade 7)';
    case '3':
      return 'MYP 3 (Grade 8)';
    case '4':
      return 'MYP 4 (Grade 9)';
    case '5':
      return 'MYP 5 (Grade 10)';
    default:
      return `MYP ${clean}`;
  }
};

const formatShortClassTag = (yearKey: string): string => {
  const clean = normalizeMypYear(yearKey);
  return `MYP ${clean}`;
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
  onDeleteAssignedTask,
}) => {
  // Assigned Tasks Creator State
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [newTeacherName, setNewTeacherName] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('Sciences');
  const [newTopic, setNewTopic] = useState<string>('');
  const [newMypYear, setNewMypYear] = useState<string>('3');
  const [newCategory, setNewCategory] = useState<ATLCategoryKey>('Thinking');
  const [newCluster, setNewCluster] = useState<string>('Critical thinking');
  const [newIduToggle, setNewIduToggle] = useState<boolean>(false);
  const [newIduSubject, setNewIduSubject] = useState<string>('Sciences');
  const [isPublishingTask, setIsPublishingTask] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Update cluster when newCategory changes
  React.useEffect(() => {
    const availableClusters = Object.keys(ATL_DATA[newCategory]?.clusters || {});
    if (availableClusters.length > 0 && !availableClusters.includes(newCluster)) {
      setNewCluster(availableClusters[0]);
    }
  }, [newCategory]);

  const handlePublishAssignedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) {
      setPublishError('Please enter a curriculum topic for the assigned task.');
      return;
    }

    if (!onCreateAssignedTask) return;

    setIsPublishingTask(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      await onCreateAssignedTask({
        teacherName: newTeacherName.trim(),
        subject: newSubject,
        topic: newTopic.trim(),
        mypYear: newMypYear,
        category: newCategory,
        cluster: newCluster,
        iduSubject: newIduToggle ? newIduSubject : null,
      });

      setPublishSuccess('Task generated and assigned to all students successfully!');
      setNewTopic('');
      setNewIduToggle(false);
      setTimeout(() => {
        setPublishSuccess(null);
        setShowAssignModal(false);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to publish assigned task:', err);
      setPublishError(err?.message || 'Failed to generate and assign task.');
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

    const studentInfo: Record<string, { logsCount: number; mypYear: string }> = {};

    logs.forEach((log) => {
      if (log.academicYear === academicYear && log.studentName && log.studentName.trim()) {
        const name = log.studentName.trim();
        const yearKey = normalizeMypYear(log.mypYear);

        if (!studentInfo[name]) {
          studentInfo[name] = { logsCount: 0, mypYear: yearKey };
        }
        studentInfo[name].logsCount += 1;
        studentInfo[name].mypYear = yearKey;
      }
    });

    Object.entries(studentInfo).forEach(([name, info]) => {
      const yearKey = info.mypYear;
      if (!map[yearKey]) {
        map[yearKey] = [];
      }
      map[yearKey].push({ name, logsCount: info.logsCount, mypYear: yearKey });
    });

    // Sort student lists alphabetically
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => a.name.localeCompare(b.name));
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
    return logs.filter((l) => l.academicYear === academicYear && l.studentName === reportStudent);
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
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Published Common Class Tasks ({assignedTasks.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Standardized AI tasks assigned by teachers for common student evaluation
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Assign New Task</span>
            </button>
          </div>

          {assignedTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
              <p className="text-xs font-medium text-slate-500">
                No common tasks published yet. Click <strong className="text-indigo-600 font-bold">"Assign New Task"</strong> to create a shared task that appears on every student's workbench.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignedTasks.map((at) => (
                <div
                  key={at.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                          {at.subject} • MYP {at.mypYear}
                        </span>
                        {at.task?.idu_note && (
                          <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 flex items-center gap-1">
                            <Layers className="h-3 w-3 text-purple-600" /> IDU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {at.teacherName ? `By ${at.teacherName}` : 'Teacher Task'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                      {at.title || at.task?.title || at.topic}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {at.topic} ({at.cluster})
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-600" /> Active on Workbench
                    </span>

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
                    <optgroup key={ckey} label={formatClassLabel(ckey)}>
                      {list.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name} ({st.logsCount} tasks)
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                (studentsByClassMap[selectedClass] || []).map((st) => (
                  <option key={st.name} value={st.name}>
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
                    <optgroup key={ckey} label={formatClassLabel(ckey)}>
                      {list.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.logsCount} tasks)
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                (studentsByClassMap[selectedClass] || []).map((s) => (
                  <option key={s.name} value={s.name}>
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
                const stLogs = logs.filter((l) => l.academicYear === academicYear && l.studentName === stName);
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

            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                {studentLogs.length} Tasks Logged
              </span>
              <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {studentClusterCoverage}
              </span>
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
                      <th className="py-2.5 px-3 text-center">Level Achieved</th>
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
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-indigo-700">{log.cluster}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{log.category}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              log.level === 'Extending'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : log.level === 'Applying'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}
                          >
                            {log.level}
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
                <th className="py-3 px-3">Class / Grade</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Subject & Topic</th>
                <th className="py-3 px-3">ATL Skill Cluster</th>
                <th className="py-3 px-3 text-center">Level</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    No tasks found matching current class or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-500 font-medium">
                      {log.date}
                      <div className="text-[10px] text-slate-400">{log.term}</div>
                    </td>
                    <td className="py-3 px-3">
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
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-indigo-700">{log.cluster}</span>
                      <div className="text-[10px] text-slate-400 font-medium">{log.category}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          log.level === 'Extending'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : log.level === 'Applying'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLogForModal(log)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => promptDeleteLog(log.id, `${log.studentName} (${log.subject} - ${log.topic})`)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Log Entry Details
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedLogForModal.taskTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl font-medium text-slate-800">
                <div><strong className="text-slate-500">Student:</strong> {selectedLogForModal.studentName}</div>
                <div><strong className="text-slate-500">Class:</strong> {formatClassLabel(selectedLogForModal.mypYear)}</div>
                <div><strong className="text-slate-500">Date:</strong> {selectedLogForModal.date} ({selectedLogForModal.term})</div>
                <div><strong className="text-slate-500">Subject:</strong> {selectedLogForModal.subject}</div>
                <div><strong className="text-slate-500">ATL Cluster:</strong> {selectedLogForModal.cluster} ({selectedLogForModal.category})</div>
                <div><strong className="text-slate-500">Level:</strong> {selectedLogForModal.level}</div>
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

              {/* Action Buttons inside Modal */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                        taskTitle: selectedLogForModal.taskTitle,
                        responses: selectedLogForModal.responses,
                        feedback: selectedLogForModal.feedback,
                        studentReflection: selectedLogForModal.studentReflection,
                      })
                    }
                    className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Download Word Doc (.doc)</span>
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
                        taskTitle: selectedLogForModal.taskTitle,
                        responses: selectedLogForModal.responses,
                        feedback: selectedLogForModal.feedback,
                        studentReflection: selectedLogForModal.studentReflection,
                      })
                    }
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>

                <button
                  onClick={() => promptDeleteLog(selectedLogForModal.id, `${selectedLogForModal.studentName} (${selectedLogForModal.subject} - ${selectedLogForModal.topic})`)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Record</span>
                </button>
              </div>
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

      {/* Assign Common Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-xs">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create & Assign Common Task</h3>
                  <p className="text-xs text-slate-500">Generates a shared task that appears on every student's workbench</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAssignModal(false);
                  setPublishError(null);
                  setPublishSuccess(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishAssignedTask} className="mt-4 space-y-4 text-xs">
              {publishSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center font-bold text-emerald-800 flex flex-col items-center gap-2">
                  <Check className="h-8 w-8 text-emerald-600" />
                  <span className="text-sm font-bold">{publishSuccess}</span>
                  <p className="text-xs font-normal text-emerald-700 mt-1">Students will now see this task on Step 1 of their workbench.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Teacher Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="e.g. Ms. Smith"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Grade / MYP Level <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={newMypYear}
                        onChange={(e) => setNewMypYear(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      >
                        <option value="1">MYP 1 (Grade 6)</option>
                        <option value="2">MYP 2 (Grade 7)</option>
                        <option value="3">MYP 3 (Grade 8)</option>
                        <option value="4">MYP 4 (Grade 9)</option>
                        <option value="5">MYP 5 (Grade 10)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Subject Group <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
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
                        Curriculum Topic <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="e.g. Mitosis & Cell Division"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        ATL Skill Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as ATLCategoryKey)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
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
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
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
                  <div className="border-t border-slate-100 pt-3 space-y-2">
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
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                        <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1">
                          Secondary Subject Group (IDU Partner)
                        </label>
                        <select
                          value={newIduSubject}
                          onChange={(e) => setNewIduSubject(e.target.value)}
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
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

                  {publishError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 font-bold text-rose-700 flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      disabled={isPublishingTask}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPublishingTask}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isPublishingTask ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <span>Generating & Publishing Task…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate & Assign Task</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
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
    </div>
  );
};
