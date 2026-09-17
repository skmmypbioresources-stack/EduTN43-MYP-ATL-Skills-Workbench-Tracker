import React, { useState, useEffect, useMemo } from 'react';
import { AssignedTask } from '../types';
import { getRosterForClass } from '../lib/evidenceUtils';
import {
  X,
  Users,
  UserCheck,
  Check,
  Search,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AssignedTask | null;
  onSave: (
    taskId: string,
    updates: {
      mypYear: string;
      targetStudentNames?: string[];
    }
  ) => Promise<void>;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
}) => {
  const [mypYear, setMypYear] = useState<string>('3');
  const [assignMode, setAssignMode] = useState<'class' | 'specific'>('class');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize state when task opens
  useEffect(() => {
    if (task) {
      const currentYear = task.mypYear || '3';
      setMypYear(currentYear);

      if (Array.isArray(task.targetStudentNames) && task.targetStudentNames.length > 0) {
        setAssignMode('specific');
        setSelectedStudents([...task.targetStudentNames]);
      } else {
        setAssignMode('class');
        setSelectedStudents([]);
      }
      setSearchQuery('');
      setErrorMsg(null);
    }
  }, [task, isOpen]);

  // Class roster for selected MYP year
  const availableRoster = useMemo(() => {
    return getRosterForClass(mypYear);
  }, [mypYear]);

  // Filter roster by search query
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return availableRoster;
    const q = searchQuery.toLowerCase().trim();
    return availableRoster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.id && s.id.toLowerCase().includes(q))
    );
  }, [availableRoster, searchQuery]);

  if (!isOpen || !task) return null;

  const handleToggleStudent = (studentName: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentName)
        ? prev.filter((n) => n !== studentName)
        : [...prev, studentName]
    );
  };

  const handleSelectAll = () => {
    const allNames = availableRoster.map((s) => s.name);
    setSelectedStudents(allNames);
  };

  const handleDeselectAll = () => {
    setSelectedStudents([]);
  };

  const handleSave = async () => {
    if (assignMode === 'specific' && selectedStudents.length === 0) {
      setErrorMsg('Please select at least one student or switch to "Whole Class".');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSave(task.id, {
        mypYear,
        targetStudentNames: assignMode === 'specific' ? selectedStudents : [],
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update assignment settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="task-assignment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn"
    >
      <div
        id="task-assignment-modal-card"
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                Manage Task Assignment & Visibility
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Choose which class or individual students see this task in Toddle links
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Task Info Pill */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold text-indigo-950 text-xs">
                {task.title || task.topic}
              </div>
              <div className="text-[11px] text-indigo-700 font-medium mt-0.5">
                {task.subject} • {task.category} ({task.cluster})
              </div>
            </div>
          </div>

          {/* Target Class Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
              <span>Target Class / MYP Grade Level</span>
            </label>
            <select
              value={mypYear}
              onChange={(e) => {
                setMypYear(e.target.value);
                // Clear selection if roster changes
                setSelectedStudents([]);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-colors cursor-pointer"
            >
              <option value="All">All MYP Classes (Whole School MYP 1–5)</option>
              <option value="1">MYP 1 (Grade 6 · Ages 11–12)</option>
              <option value="2">MYP 2 (Grade 7 · Ages 12–13)</option>
              <option value="3">MYP 3 (Grade 8 · Ages 13–14)</option>
              <option value="4">MYP 4 (Grade 9 · Ages 14–15)</option>
              <option value="5">MYP 5 (Grade 10 · Ages 15–16)</option>
            </select>
          </div>

          {/* Assignment Mode Toggle */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Assignment Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignMode('class')}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  assignMode === 'class'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    assignMode === 'class'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {assignMode === 'class' && <Check className="h-2.5 w-2.5" />}
                </div>
                <div>
                  <div className="font-bold text-xs">Entire Class</div>
                  <div className="text-[10px] text-slate-500">
                    All students in {mypYear === 'All' ? 'school' : `MYP ${mypYear}`}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAssignMode('specific')}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  assignMode === 'specific'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    assignMode === 'specific'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {assignMode === 'specific' && <Check className="h-2.5 w-2.5" />}
                </div>
                <div>
                  <div className="font-bold text-xs">Specific Students</div>
                  <div className="text-[10px] text-slate-500">
                    Hand-pick individual learners
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Student Multi-Select List (When 'specific' mode selected) */}
          {assignMode === 'specific' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  <span>
                    Select Students ({selectedStudents.length} of {availableRoster.length} selected)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter student name or ID..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Student Checkbox List */}
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-slate-200 bg-white p-2">
                {filteredRoster.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No students match your filter.
                  </div>
                ) : (
                  filteredRoster.map((s) => {
                    const isSelected = selectedStudents.includes(s.name);
                    return (
                      <label
                        key={s.id || s.name}
                        onClick={() => handleToggleStudent(s.name)}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/80 font-bold text-indigo-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 shrink-0" />
                          )}
                          <span>{s.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {s.id || 'ID'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Visibility Notice */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 flex items-start gap-2 text-[11px] text-blue-900 leading-relaxed">
            <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              {assignMode === 'class' ? (
                <span>
                  This task will appear for <strong>all students</strong> viewing their personal Toddle link for <strong>{mypYear === 'All' ? 'any MYP class' : `MYP ${mypYear}`}</strong>.
                </span>
              ) : (
                <span>
                  This task will appear <strong>exclusively</strong> for the <strong>{selectedStudents.length} chosen students</strong> when they open their personal Toddle link.
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-5 py-3 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving Assignment...' : 'Save Assignment Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
