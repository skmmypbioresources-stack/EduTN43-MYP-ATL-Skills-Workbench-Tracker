import React, { useState, useMemo } from 'react';
import { AssignedTask, ATLTaskLog } from '../types';
import {
  X,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Trash2,
  AlertCircle,
  Search,
  Sparkles,
  Layers,
  Award,
  Filter
} from 'lucide-react';
import { isTaskLogGraded, getTaskEffectiveScore } from '../lib/scoreUtils';

interface TaskSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AssignedTask | null;
  studentLogs: ATLTaskLog[];
  onOpenTaskDetail: (log: ATLTaskLog) => void;
  onDeleteLog?: (logId: string) => Promise<void> | void;
  onUpdateTaskLog?: (logId: string, partial: Partial<ATLTaskLog>) => Promise<void>;
}

export const TaskSubmissionsModal: React.FC<TaskSubmissionsModalProps> = ({
  isOpen,
  onClose,
  task,
  studentLogs,
  onOpenTaskDetail,
  onDeleteLog,
  onUpdateTaskLog,
}) => {
  if (!isOpen || !task) return null;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cleaningLogId, setCleaningLogId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Retrieve submissions for this assigned task
  const matchingSubmissions = useMemo(() => {
    const taskTitle = (task.title || task.task?.title || task.topic || '').trim().toLowerCase();
    const taskTopic = (task.topic || '').trim().toLowerCase();
    return studentLogs.filter((l) => {
      if (l.assignedTaskId && l.assignedTaskId === task.id) return true;
      if (taskTitle && l.taskTitle && l.taskTitle.trim().toLowerCase() === taskTitle) return true;
      if (taskTopic && l.topic && l.topic.trim().toLowerCase() === taskTopic && l.subject === task.subject) return true;
      return false;
    });
  }, [task, studentLogs]);

  // Filter by search query
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return matchingSubmissions;
    const q = searchQuery.toLowerCase().trim();
    return matchingSubmissions.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.classSection && s.classSection.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.includes(q))
    );
  }, [matchingSubmissions, searchQuery]);

  // Current assigned task parts
  const activeTaskParts = task.task?.parts || [];

  // Clean / Sync a single student's submission to match active task parts
  const handleCleanSubmissionQuestions = async (log: ATLTaskLog) => {
    if (!onUpdateTaskLog || activeTaskParts.length === 0) return;
    setCleaningLogId(log.id);

    try {
      const activePrompts = new Set(activeTaskParts.map((p) => p.prompt.trim().toLowerCase()));
      const activeLabels = new Set(activeTaskParts.map((p) => p.label.trim().toLowerCase()));

      const originalResponses = log.responses || [];
      const cleanedResponses = originalResponses.filter((resp) => {
        const respPrompt = (resp.prompt || '').trim().toLowerCase();
        const respLabel = (resp.label || '').trim().toLowerCase();
        // Keep if matches an active prompt or an active label
        return (respPrompt && activePrompts.has(respPrompt)) || (respLabel && activeLabels.has(respLabel));
      });

      await onUpdateTaskLog(log.id, {
        responses: cleanedResponses,
        originalTask: task.task,
        criteria: task.criteria || task.task?.target_criteria,
      });

      setSuccessToast(`Synchronized questions for ${log.studentName}`);
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (err) {
      console.error('Failed to clean submission questions:', err);
    } finally {
      setCleaningLogId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Student Submissions ({matchingSubmissions.length})
              </h3>
              <p className="text-xs text-slate-500">
                {task.title || task.topic} · {task.subject} · MYP {task.mypYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header & Search */}
        <div className="border-b border-slate-200 px-6 py-3 bg-white flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Assigned Questions: <strong className="text-slate-800">{activeTaskParts.length} Parts</strong>
          </div>
        </div>

        {/* Toast */}
        {successToast && (
          <div className="mx-6 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* List of Submissions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {matchingSubmissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="h-10 w-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">No student submissions recorded yet.</p>
              <p className="text-xs text-slate-400">
                When students complete this task in their evidence portal, their responses will appear here.
              </p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No students found matching "{searchQuery}".
            </div>
          ) : (
            filteredSubmissions.map((log) => {
              const graded = isTaskLogGraded(log);
              const score = getTaskEffectiveScore(log);
              const responseCount = (log.responses || []).length;
              const hasMismatch = responseCount !== activeTaskParts.length;

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {log.studentName}
                      </span>
                      {log.classSection && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                          {log.classSection}
                        </span>
                      )}
                      {graded ? (
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Score: {score}/8
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Pending Review
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Submitted: {log.date ? log.date.substring(0, 10) : 'Recent'}</span>
                      <span>·</span>
                      <span className={hasMismatch ? 'font-bold text-amber-700' : 'text-slate-600'}>
                        {responseCount} questions answered {hasMismatch && `(${activeTaskParts.length} active in task)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasMismatch && onUpdateTaskLog && (
                      <button
                        type="button"
                        onClick={() => handleCleanSubmissionQuestions(log)}
                        disabled={cleaningLogId === log.id}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Remove responses to questions no longer in this task"
                      >
                        {cleaningLogId === log.id ? 'Syncing...' : 'Sync Questions'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenTaskDetail(log);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Work</span>
                    </button>

                    {onDeleteLog && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete submission for ${log.studentName}?`)) {
                            onDeleteLog(log.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Submission Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
