import React, { useState, useEffect, useMemo } from 'react';
import { AssignedTask, GeneratedTask, TaskPart, ATLTaskLog } from '../types';
import {
  X,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  AlertTriangle,
  FileText,
  Target,
  Calendar,
  Users,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';

interface EditAssignedTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AssignedTask | null;
  studentLogs: ATLTaskLog[];
  onSaveTask: (taskId: string, partial: Partial<AssignedTask>) => Promise<void>;
  onUpdateTaskLog?: (logId: string, partial: Partial<ATLTaskLog>) => Promise<void>;
}

export const EditAssignedTaskModal: React.FC<EditAssignedTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  studentLogs,
  onSaveTask,
  onUpdateTaskLog,
}) => {
  if (!isOpen || !task) return null;

  // Task basic details
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [mypYear, setMypYear] = useState<string>('3');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [criteria, setCriteria] = useState<string[]>([]);
  const [strands, setStrands] = useState<string[]>([]);

  // Questions / Parts
  const [parts, setParts] = useState<TaskPart[]>([]);
  const [deletedQuestions, setDeletedQuestions] = useState<Array<{ label: string; prompt: string }>>([]);

  // Submissions Sync Toggle
  const [syncWithSubmissions, setSyncWithSubmissions] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || task.task?.title || task.topic || '');
      setSubject(task.subject || 'Sciences');
      setTopic(task.topic || '');
      setMypYear(task.mypYear || '3');
      setAcademicYear(task.academicYear || '2026-2027');
      setDueDate(task.dueDate || '');

      const initialCriteria = task.criteria || task.task?.target_criteria || ['Criterion A'];
      setCriteria([...initialCriteria]);

      const initialStrands = task.strands || task.task?.target_strands || [];
      setStrands([...initialStrands]);

      const initialParts: TaskPart[] = task.task?.parts && task.task.parts.length > 0
        ? JSON.parse(JSON.stringify(task.task.parts))
        : [
            {
              label: 'A',
              prompt: task.task?.customQuestionText || 'Describe and explain the biological concept...',
              placeholder: 'Write your response here...',
            }
          ];

      setParts(initialParts);
      setDeletedQuestions([]);
      setSaveSuccessMsg(null);
      setErrorMessage(null);
    }
  }, [task, isOpen]);

  // Find all student submissions linked to this assigned task
  const matchingSubmissions = useMemo(() => {
    if (!task) return [];
    const taskTitle = (task.title || task.task?.title || task.topic || '').trim().toLowerCase();
    const taskTopic = (task.topic || '').trim().toLowerCase();
    return studentLogs.filter((l) => {
      if (l.assignedTaskId && l.assignedTaskId === task.id) return true;
      if (taskTitle && l.taskTitle && l.taskTitle.trim().toLowerCase() === taskTitle) return true;
      if (taskTopic && l.topic && l.topic.trim().toLowerCase() === taskTopic && l.subject === task.subject) return true;
      return false;
    });
  }, [task, studentLogs]);

  // Toggle criteria
  const handleToggleCriterion = (criterionKey: string) => {
    setCriteria((prev) => {
      if (prev.includes(criterionKey)) {
        if (prev.length === 1) return prev; // Keep at least one criterion
        return prev.filter((c) => c !== criterionKey);
      } else {
        return [...prev, criterionKey];
      }
    });
  };

  // Update a question field
  const handleUpdatePart = (index: number, field: keyof TaskPart, value: string) => {
    setParts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Delete a question part
  const handleDeletePart = (index: number) => {
    if (parts.length <= 1) {
      setErrorMessage('A task must have at least one question.');
      return;
    }

    const partToDelete = parts[index];
    setDeletedQuestions((prev) => [
      ...prev,
      { label: partToDelete.label, prompt: partToDelete.prompt }
    ]);

    setParts((prev) => {
      const remaining = prev.filter((_, i) => i !== index);
      // Auto-renumber standard letter labels if desired (A, B, C...)
      return remaining.map((p, i) => {
        // If label was a single letter, keep sequential letters
        if (/^[A-Z]$/.test(p.label.trim())) {
          return { ...p, label: String.fromCharCode(65 + i) };
        }
        return p;
      });
    });
  };

  // Add a new question part
  const handleAddPart = () => {
    const nextLabel = String.fromCharCode(65 + parts.length);
    setParts((prev) => [
      ...prev,
      {
        label: nextLabel,
        prompt: 'Formulate a detailed explanation or response to address this inquiry...',
        placeholder: 'Based on the scientific evidence, state your claim...',
        criterion_assessed: criteria[0] || 'Criterion A'
      }
    ]);
  };

  // Move part up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setParts((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Move part down
  const handleMoveDown = (index: number) => {
    if (index === parts.length - 1) return;
    setParts((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a task title.');
      return;
    }
    if (parts.length === 0) {
      setErrorMessage('Task must have at least one question.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Build updated task object
      const updatedGeneratedTask: GeneratedTask = {
        ...task.task,
        title: title.trim(),
        subject,
        topic: topic.trim(),
        target_criteria: criteria,
        target_strands: strands,
        parts: parts,
      };

      // If Criterion C is not selected, permanently nullify the scientific dataset so it is never shown
      if (!criteria.includes('Criterion C')) {
        (updatedGeneratedTask as any).scientific_dataset = null;
      }

      const updatedAssignedTask: Partial<AssignedTask> = {
        title: title.trim(),
        subject,
        topic: topic.trim(),
        mypYear,
        academicYear,
        dueDate: dueDate || undefined,
        criteria,
        strands,
        task: updatedGeneratedTask,
        ...(!criteria.includes('Criterion C') ? { scientific_dataset: null as any } : {})
      };

      // 2. Save assigned task
      await onSaveTask(task.id, updatedAssignedTask);

      // 3. If requested, sync and purge deleted questions from existing student submissions
      let syncedCount = 0;
      if (syncWithSubmissions && onUpdateTaskLog && matchingSubmissions.length > 0) {
        // Collect all deleted question prompts & labels
        const deletedPrompts = deletedQuestions.map((dq) => dq.prompt.trim().toLowerCase()).filter(Boolean);
        const deletedLabels = deletedQuestions.map((dq) => dq.label.trim().toLowerCase()).filter(Boolean);

        // Also note which prompts are active in remaining parts
        const activePrompts = new Set(parts.map((p) => p.prompt.trim().toLowerCase()).filter(Boolean));

        for (const sub of matchingSubmissions) {
          const originalResponses = sub.responses || [];

          // Filter out responses that matched a deleted question or index >= parts.length
          const filteredResponses = originalResponses.filter((resp, rIdx) => {
            const respPrompt = (resp.prompt || '').trim().toLowerCase();
            const respLabel = (resp.label || '').trim().toLowerCase();

            // If prompt matches an explicitly deleted question, remove it!
            if (respPrompt && deletedPrompts.some(dp => respPrompt.includes(dp) || dp.includes(respPrompt))) {
              return false;
            }

            // If prompt is not in active prompts, but matches a deleted label, remove it!
            if (respLabel && deletedLabels.includes(respLabel) && !activePrompts.has(respPrompt)) {
              return false;
            }

            // If the student submission has more response items than current parts, drop the excess
            if (rIdx >= parts.length) {
              return false;
            }

            return true;
          });

          // Always synchronize updatedGeneratedTask into sub.originalTask and clean unwanted questions!
          await onUpdateTaskLog(sub.id, {
            responses: filteredResponses,
            originalTask: updatedGeneratedTask,
            criteria: criteria,
            taskTitle: title.trim(),
            ...(!criteria.includes('Criterion C') ? { scientific_dataset: null as any } : {})
          });
          syncedCount++;
        }
      }

      setSaveSuccessMsg(
        `Task updated successfully!${syncedCount > 0 ? ` ${syncedCount} student submission(s) updated and purged of unwanted questions.` : ''}`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update assigned task:', err);
      setErrorMessage(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit Assigned Task & Manage Questions
              </h3>
              <p className="text-xs text-slate-500">
                Modify task details, delete unwanted questions (e.g. accidental Criterion C), and update student submissions.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{saveSuccessMsg}</span>
            </div>
          )}

          {/* General Metadata Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-indigo-600" />
              <span>Task Configuration & Criteria</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                  placeholder="Task Title"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topic / Conceptual Context
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                  placeholder="e.g. Enzyme Catalysis & Denaturation"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target MYP Year / Class
                </label>
                <select
                  value={mypYear}
                  onChange={(e) => setMypYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none cursor-pointer"
                >
                  <option value="All">All MYP Classes (Whole School)</option>
                  <option value="1">MYP 1 (Grade 6)</option>
                  <option value="2">MYP 2 (Grade 7)</option>
                  <option value="3">MYP 3 (Grade 8)</option>
                  <option value="4">MYP 4 (Grade 9)</option>
                  <option value="5">MYP 5 (Grade 10)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Criteria Checkboxes */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Assessed MYP Criteria (Check/Uncheck to adjust)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { id: 'Criterion A', label: 'Criterion A: Knowing & Understanding' },
                  { id: 'Criterion B', label: 'Criterion B: Inquiring & Designing' },
                  { id: 'Criterion C', label: 'Criterion C: Processing & Evaluating' },
                  { id: 'Criterion D', label: 'Criterion D: Reflecting on the Impacts of Science' },
                ].map((c) => {
                  const isChecked = criteria.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleToggleCriterion(c.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`flex h-4 w-4 items-center justify-center rounded-md border ${
                        isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
              {!criteria.includes('Criterion C') && task.criteria?.includes('Criterion C') && (
                <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Criterion C was unchecked! Any questions below assessing data evaluation or graphs can now be deleted using the red trash button.
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Questions / Task Parts Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span>Task Questions / Parts ({parts.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Delete any unwanted questions with the red button or edit prompt wording.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPart}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Question Part</span>
              </button>
            </div>

            {/* List of Questions */}
            <div className="space-y-3">
              {parts.map((part, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        Part {part.label || String.fromCharCode(65 + index)}
                      </span>
                      {part.criterion_assessed && (
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {part.criterion_assessed}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === parts.length - 1}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Question Button */}
                      <button
                        type="button"
                        onClick={() => handleDeletePart(index)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer ml-1 shadow-2xs"
                        title="Delete this question from the task"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>Delete Question</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Question Prompt
                    </label>
                    <textarea
                      rows={3}
                      value={part.prompt}
                      onChange={(e) => handleUpdatePart(index, 'prompt', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none leading-relaxed"
                      placeholder="Enter question prompt..."
                    />
                  </div>

                  {/* Placeholder / Sentence Starter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Student Sentence Starter / Scaffold Placeholder (Optional)
                    </label>
                    <input
                      type="text"
                      value={part.placeholder || ''}
                      onChange={(e) => handleUpdatePart(index, 'placeholder', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      placeholder="e.g. As temperature increased, the reaction rate..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Deleted Questions Alert & Undo Notice */}
            {deletedQuestions.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{deletedQuestions.length} Question(s) Pending Deletion</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  When you save, the deleted question(s) will be permanently removed from this assigned task.
                </p>
              </div>
            )}
          </div>

          {/* Student Submissions Synchronization Card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-indigo-950">
                    Existing Student Submissions ({matchingSubmissions.length} found)
                  </h5>
                  <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                    {matchingSubmissions.length > 0
                      ? `${matchingSubmissions.length} student(s) have already submitted answers for this task.`
                      : 'No students have submitted work for this task yet.'}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={syncWithSubmissions}
                  onChange={(e) => setSyncWithSubmissions(e.target.checked)}
                  className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-900 select-none">
                  Sync & Purge from Submissions
                </span>
              </label>
            </div>

            {syncWithSubmissions && matchingSubmissions.length > 0 && (
              <div className="rounded-lg bg-white/80 border border-indigo-100 p-2.5 text-[11px] text-indigo-900">
                <span className="font-bold">Automatic Clean-up:</span> Any questions you deleted above will be automatically removed from all {matchingSubmissions.length} student submissions upon saving. Student evidence portals, reports, and grading views will reflect only the updated questions.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Changes…</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes & Update Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
