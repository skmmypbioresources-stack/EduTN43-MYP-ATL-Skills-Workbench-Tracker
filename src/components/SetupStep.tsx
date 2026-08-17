import React, { useState, useEffect, useMemo } from 'react';
import { ATL_DATA } from '../data/atlData';
import { ATLCategoryKey, TaskMeta, AssignedTask } from '../types';
import { MYPCriteriaSelector } from './MYPCriteriaSelector';
import {
  Sparkles,
  HelpCircle,
  Layers,
  Link as LinkIcon,
  User,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  Trash2,
  ShieldAlert,
  Target,
  GraduationCap,
  Filter,
  UserCheck,
  Check,
  School,
  BookOpen
} from 'lucide-react';

interface SetupStepProps {
  meta: TaskMeta;
  setMeta: React.Dispatch<React.SetStateAction<TaskMeta>>;
  studentName: string;
  setStudentName: (name: string) => void;
  term: string;
  setTerm: (term: string) => void;
  onGenerate: (autoCluster: boolean) => void;
  isLoading: boolean;
  errorMessage: string | null;
  assignedTasks?: AssignedTask[];
  onSelectAssignedTask?: (task: AssignedTask) => void;
  onDeleteAssignedTask?: (taskId: string) => void;
}

const normalizeMypYear = (year: string): string => {
  const clean = String(year || '').trim().toLowerCase();
  if (clean.includes('1') || clean.includes('6')) return '1';
  if (clean.includes('2') || clean.includes('7')) return '2';
  if (clean.includes('3') || clean.includes('8')) return '3';
  if (clean.includes('4') || clean.includes('9')) return '4';
  if (clean.includes('5') || clean.includes('10')) return '5';
  return clean || '3';
};

const formatClassLabel = (year: string) => {
  const norm = normalizeMypYear(year);
  switch (norm) {
    case '1': return 'MYP 1 (Grade 6)';
    case '2': return 'MYP 2 (Grade 7)';
    case '3': return 'MYP 3 (Grade 8)';
    case '4': return 'MYP 4 (Grade 9)';
    case '5': return 'MYP 5 (Grade 10)';
    default: return `MYP ${year}`;
  }
};

const formatShortClassTag = (year: string) => {
  const norm = normalizeMypYear(year);
  switch (norm) {
    case '1': return 'MYP 1 (Gr 6)';
    case '2': return 'MYP 2 (Gr 7)';
    case '3': return 'MYP 3 (Gr 8)';
    case '4': return 'MYP 4 (Gr 9)';
    case '5': return 'MYP 5 (Gr 10)';
    default: return `MYP ${year}`;
  }
};

export const SetupStep: React.FC<SetupStepProps> = ({
  meta,
  setMeta,
  studentName,
  setStudentName,
  term,
  setTerm,
  onGenerate,
  isLoading,
  errorMessage,
  assignedTasks = [],
  onSelectAssignedTask,
  onDeleteAssignedTask,
}) => {
  const [autoCluster, setAutoCluster] = useState(false);
  const [iduToggle, setIduToggle] = useState(false);

  // Assigned Tasks Teacher & Class Filter State
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('my_class'); // 'my_class' | 'All' | '1' | '2' | '3' | '4' | '5'

  // Delete Authorization Password State (Password: DELETETASK)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<AssignedTask | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const promptDeleteTask = (task: AssignedTask) => {
    setTaskToDelete(task);
    setDeletePasswordInput('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePasswordInput.trim() !== 'DELETETASK') {
      setDeleteError('Incorrect delete password. Password DELETETASK is required to delete assigned tasks.');
      return;
    }

    if (taskToDelete && onDeleteAssignedTask) {
      onDeleteAssignedTask(taskToDelete.id);
    }

    setShowDeleteModal(false);
    setTaskToDelete(null);
    setDeletePasswordInput('');
    setDeleteError(null);
  };

  // Distinct list of teachers who have created assigned tasks
  const distinctTeachers = useMemo(() => {
    const list = Array.from(
      new Set(assignedTasks.map((t) => (t.teacherName?.trim() ? t.teacherName.trim() : 'General Teacher')))
    ).sort();
    return list;
  }, [assignedTasks]);

  // Hierarchical Organization: Teacher -> Class -> Tasks
  const organizedTasks = useMemo(() => {
    // 1. Filter by Teacher
    const filteredByTeacher = assignedTasks.filter((t) => {
      const tTeacher = t.teacherName?.trim() || 'General Teacher';
      if (selectedTeacherFilter === 'All') return true;
      return tTeacher === selectedTeacherFilter;
    });

    // 2. Filter by Class
    const effectiveClassTarget =
      selectedClassFilter === 'my_class' ? normalizeMypYear(meta.year) : selectedClassFilter;

    const filtered = filteredByTeacher.filter((t) => {
      if (effectiveClassTarget === 'All') return true;
      return normalizeMypYear(t.mypYear) === effectiveClassTarget;
    });

    // 3. Group by Teacher, then by Class
    const grouped: Record<string, Record<string, AssignedTask[]>> = {};

    filtered.forEach((task) => {
      const teacherKey = task.teacherName?.trim() || 'General Teacher';
      const classKey = normalizeMypYear(task.mypYear);

      if (!grouped[teacherKey]) {
        grouped[teacherKey] = {};
      }
      if (!grouped[teacherKey][classKey]) {
        grouped[teacherKey][classKey] = [];
      }
      grouped[teacherKey][classKey].push(task);
    });

    return {
      grouped,
      totalMatching: filtered.length,
      effectiveClassTarget,
    };
  }, [assignedTasks, selectedTeacherFilter, selectedClassFilter, meta.year]);

  // Update clusters when category changes
  const categoryData = ATL_DATA[meta.category];
  const clusters = Object.keys(categoryData?.clusters || {});

  useEffect(() => {
    if (!clusters.includes(meta.cluster) && clusters.length > 0) {
      setMeta((prev) => ({ ...prev, cluster: clusters[0] }));
    }
  }, [meta.category]);

  const currentClusterData = categoryData?.clusters[meta.cluster];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value as ATLCategoryKey;
    const newClusters = Object.keys(ATL_DATA[newCat].clusters);
    setMeta((prev) => ({
      ...prev,
      category: newCat,
      cluster: newClusters[0] || '',
    }));
  };

  const handleIduToggle = (checked: boolean) => {
    setIduToggle(checked);
    if (!checked) {
      setMeta((prev) => ({ ...prev, iduSubject: null }));
    } else {
      setMeta((prev) => ({ ...prev, iduSubject: 'Sciences' }));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Specimen Tag */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Step 1 • Task Configuration</span>
        </div>
      </div>

      {/* Teacher Assigned Common Tasks Callout (Organized by Teacher -> Class) */}
      {assignedTasks && assignedTasks.length > 0 && (
        <div className="mb-8 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 p-5 sm:p-6 shadow-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-4 pb-3.5 border-b border-indigo-100/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Teacher Assigned Common Tasks</span>
                  <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    {assignedTasks.length} Published
                  </span>
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Organized by Teacher & Class so students see only their class work
                </p>
              </div>
            </div>

            {/* Quick Filter Controls: Select Teacher & Class */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Teacher Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                <UserCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Teacher:</span>
                <select
                  value={selectedTeacherFilter}
                  onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                  className="font-bold text-indigo-900 bg-transparent focus:outline-none cursor-pointer text-xs"
                >
                  <option value="All">All Teachers ({distinctTeachers.length})</option>
                  {distinctTeachers.map((tName) => (
                    <option key={tName} value={tName}>
                      {tName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class / Grade Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class:</span>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="font-bold text-indigo-900 bg-transparent focus:outline-none cursor-pointer text-xs"
                >
                  <option value="my_class">My Class ({formatShortClassTag(meta.year)})</option>
                  <option value="All">All Classes (MYP 1 - 5)</option>
                  <option value="1">MYP 1 (Grade 6)</option>
                  <option value="2">MYP 2 (Grade 7)</option>
                  <option value="3">MYP 3 (Grade 8)</option>
                  <option value="4">MYP 4 (Grade 9)</option>
                  <option value="5">MYP 5 (Grade 10)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hierarchical Tree of Teacher -> Class -> Tasks */}
          {organizedTasks.totalMatching === 0 ? (
            <div className="rounded-xl border border-dashed border-indigo-200 bg-white/80 p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-2">
                <School className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                No assigned tasks found for{' '}
                <span className="text-indigo-600">
                  {selectedTeacherFilter !== 'All' ? `Teacher: ${selectedTeacherFilter}` : 'any teacher'}
                </span>{' '}
                in{' '}
                <span className="text-indigo-600">
                  {selectedClassFilter === 'my_class'
                    ? formatClassLabel(meta.year)
                    : selectedClassFilter === 'All'
                    ? 'all classes'
                    : formatClassLabel(selectedClassFilter)}
                </span>
                .
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Choose another teacher/class above, or switch filter to "All Classes" to browse available tasks.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacherFilter('All');
                    setSelectedClassFilter('All');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <Filter className="h-3 w-3" />
                  <span>Show All Assigned Tasks ({assignedTasks.length})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(organizedTasks.grouped).map(([teacherName, classGroups]) => (
                <div
                  key={teacherName}
                  className="rounded-xl border border-indigo-100/90 bg-white/90 p-4 shadow-2xs"
                >
                  {/* Teacher Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <UserCheck className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Teacher: {teacherName}
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {Object.values(classGroups).reduce((acc, curr) => acc + curr.length, 0)}{' '}
                      {Object.values(classGroups).reduce((acc, curr) => acc + curr.length, 0) === 1 ? 'Task' : 'Tasks'} Assigned
                    </span>
                  </div>

                  {/* Classes Handled by this Teacher */}
                  <div className="space-y-4">
                    {Object.entries(classGroups).map(([classYear, tasks]) => (
                      <div key={classYear} className="space-y-2">
                        {/* Class Subheader */}
                        <div className="flex items-center gap-2 px-1">
                          <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3 text-indigo-600" />
                            {formatClassLabel(classYear)}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            ({tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} for this class)
                          </span>
                        </div>

                        {/* Task Cards inside this Class */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {tasks.map((at) => (
                            <div
                              key={at.id}
                              className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[10px] font-bold">
                                  <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-indigo-700">
                                    {at.subject}
                                  </span>
                                  <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-600">
                                    {at.category}
                                  </span>
                                  {at.task?.idu_note && (
                                    <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-purple-700 flex items-center gap-1">
                                      <Layers className="h-3 w-3 text-purple-600" /> IDU
                                    </span>
                                  )}
                                  {(at.criteria || at.task?.target_criteria) &&
                                    (at.criteria || at.task?.target_criteria)!.length > 0 && (
                                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 flex items-center gap-1">
                                        <Target className="h-3 w-3 text-emerald-600" />
                                        {(at.criteria || at.task?.target_criteria)!
                                          .map((c) => c.replace('Criterion ', ''))
                                          .join(', ')}
                                      </span>
                                    )}
                                </div>

                                <h4 className="text-xs font-bold text-slate-800 line-clamp-2">
                                  {at.title || at.task?.title || at.topic}
                                </h4>
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                                  {at.topic} ({at.cluster})
                                </p>
                              </div>

                              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSelectAssignedTask) {
                                      onSelectAssignedTask(at);
                                    }
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition-all cursor-pointer"
                                >
                                  <span>Start Class Task</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>

                                {onDeleteAssignedTask && (
                                  <button
                                    type="button"
                                    onClick={() => promptDeleteTask(at)}
                                    className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer"
                                    title="Delete this assigned common task"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3.5 text-center">
            <span className="text-[11px] text-slate-500 font-medium">
              Or fill out the form below to generate an independent custom task
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Student Name & Academic Term (for tracking) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="student-name-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Student / Class Name <span className="text-amber-600">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="student-name-input"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Alex Rivera or MYP 3 Science Class"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">Used to log growth records in the Academic Year Tracker.</p>
          </div>

          <div>
            <label htmlFor="academic-term-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Academic Term
            </label>
            <select
              id="academic-term-select"
              value={term}
              onChange={(e) => setTerm(e.target.value as any)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            >
              <option value="Term 1">Term 1 (July – December)</option>
              <option value="Term 2">Term 2 (January – May)</option>
            </select>
          </div>
        </div>

        {/* Subject & Topic */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="subject-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Subject Group <span className="text-amber-600">*</span>
            </label>
            <select
              id="subject-select"
              value={meta.subject}
              onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            >
              <option value="">Select a subject…</option>
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
            <label htmlFor="myp-year-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              MYP Year
            </label>
            <select
              id="myp-year-select"
              value={meta.year}
              onChange={(e) => setMeta({ ...meta, year: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            >
              <option value="1">MYP 1 (Grade 6)</option>
              <option value="2">MYP 2 (Grade 7)</option>
              <option value="3">MYP 3 (Grade 8)</option>
              <option value="4">MYP 4 (Grade 9)</option>
              <option value="5">MYP 5 (Grade 10)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="topic-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Curriculum Topic <span className="text-amber-600">*</span>
          </label>
          <input
            id="topic-input"
            type="text"
            value={meta.topic}
            onChange={(e) => setMeta({ ...meta, topic: e.target.value })}
            placeholder="e.g. cell organelles, plate tectonics, ratio & proportion..."
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
          />
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            Type any specific unit or topic — the task content will be anchored directly inside this topic.
          </p>
        </div>

        <div className="border-t border-slate-200 my-2"></div>

        {/* ATL Category & Cluster */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="atl-category-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ATL Category
            </label>
            <select
              id="atl-category-select"
              value={meta.category}
              onChange={handleCategoryChange}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            >
              <option value="Communication">Communication</option>
              <option value="Social">Social</option>
              <option value="Self-management">Self-management</option>
              <option value="Research">Research</option>
              <option value="Thinking">Thinking</option>
            </select>
          </div>

          <div>
            <label htmlFor="atl-cluster-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Skill Cluster
            </label>
            <select
              id="atl-cluster-select"
              value={meta.cluster}
              disabled={autoCluster}
              onChange={(e) => setMeta({ ...meta, cluster: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            >
              {clusters.map((cl) => (
                <option key={cl} value={cl}>
                  {cl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cluster Indicators Box */}
        {!autoCluster && currentClusterData && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <div className="font-bold text-slate-800 mb-1.5">{currentClusterData.description}</div>
            <ul className="list-disc pl-4 space-y-1">
              {currentClusterData.indicators.slice(0, 5).map((ind, i) => (
                <li key={i}>{ind}</li>
              ))}
              {currentClusterData.indicators.length > 5 && (
                <li className="italic text-slate-400">+ {currentClusterData.indicators.length - 5} more cluster indicators</li>
              )}
            </ul>
          </div>
        )}

        {/* Auto Cluster Toggle */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <div>
            <div className="text-sm font-bold text-slate-800">Auto-pick skill cluster</div>
            <div className="text-xs text-slate-500 font-medium">Let AI choose the strongest-fit cluster within {meta.category} for this topic.</div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              id="auto-cluster-toggle"
              type="checkbox"
              checked={autoCluster}
              onChange={(e) => setAutoCluster(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-xs after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full"></div>
          </label>
        </div>

        {/* IDU Connection Toggle */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <div>
            <div className="text-sm font-bold text-slate-800">Interdisciplinary connection (IDU)</div>
            <div className="text-xs text-slate-500 font-medium">Require students to synthesize concepts with a secondary MYP subject group.</div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              id="idu-toggle"
              type="checkbox"
              checked={iduToggle}
              onChange={(e) => handleIduToggle(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-xs after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full"></div>
          </label>
        </div>

        {iduToggle && (
          <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <label htmlFor="idu-subject-select" className="block text-xs font-bold text-indigo-900 uppercase tracking-wider">
              Secondary Subject Group
            </label>
            <select
              id="idu-subject-select"
              value={meta.iduSubject || ''}
              onChange={(e) => setMeta({ ...meta, iduSubject: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
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

        {/* MYP Assessment Criteria & Strands Selector */}
        <div className="border-t border-slate-200 pt-4">
          <MYPCriteriaSelector
            selectedCriteria={meta.criteria || []}
            selectedStrands={meta.strands || []}
            onChange={(crit, str) => setMeta({ ...meta, criteria: crit, strands: str })}
          />
        </div>

        {/* Error message display */}
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Generate Button */}
        <button
          id="generate-task-btn"
          onClick={() => onGenerate(autoCluster)}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Generating Subject Task…</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generate ATL Task</span>
            </>
          )}
        </button>
      </div>

      {/* Delete Password Authorization Modal for Assigned Task */}
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
                  <p className="text-xs text-rose-600 font-semibold">Delete Assigned Common Task</p>
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
                You are about to delete assigned common task:
                <div className="font-bold text-slate-900 mt-1 text-sm">
                  {taskToDelete?.title || `${taskToDelete?.subject} - ${taskToDelete?.topic}`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Subject: {taskToDelete?.subject} • Grade: MYP {taskToDelete?.mypYear} ({taskToDelete?.category})
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
    </div>
  );
};
