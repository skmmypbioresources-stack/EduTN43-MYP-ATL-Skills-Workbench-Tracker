import React, { useState } from 'react';
import { GeneratedTask, TaskMeta, StudentResponseItem } from '../types';
import { ArrowLeft, Send, Clock, BookOpen, Layers, ShieldAlert, Target } from 'lucide-react';

interface TaskStepProps {
  task: GeneratedTask;
  meta: TaskMeta;
  studentName: string;
  responses: Record<number, string>;
  setResponses: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onBack: () => void;
  onSubmit: (finalResponses: StudentResponseItem[]) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export const TaskStep: React.FC<TaskStepProps> = ({
  task,
  meta,
  studentName,
  responses,
  setResponses,
  onBack,
  onSubmit,
  isLoading,
  errorMessage,
}) => {
  const [preventPaste, setPreventPaste] = useState(true);

  const handleInputChange = (index: number, val: string) => {
    setResponses((prev) => ({ ...prev, [index]: val }));
  };

  const handleSubmitClick = () => {
    const formatted: StudentResponseItem[] = task.parts.map((p, i) => ({
      label: p.label || String.fromCharCode(65 + i),
      prompt: p.prompt,
      response: (responses[i] || '').trim(),
    }));
    onSubmit(formatted);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Step Badge */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
        <Clock className="h-3.5 w-3.5" />
        <span>Step 2 • Student Task Execution</span>
      </div>

      {/* Task Header */}
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {task.title}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 font-bold">{meta.subject}</span>
        <span>•</span>
        <span className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-1">{meta.topic}</span>
        <span>•</span>
        <span className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-1">MYP Year {meta.year}</span>
        <span>•</span>
        <span className="flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-1 font-bold">
          <Clock className="h-3.5 w-3.5" />
          ~{task.estimated_minutes || 15} min
        </span>
        <span>•</span>
        <span className="font-bold text-slate-800">Student: {studentName || 'Anonymous'}</span>
      </div>

      {/* Framing & Context Box */}
      <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-sm leading-relaxed text-indigo-950 font-medium shadow-2xs">
        {task.context}
      </div>

      {/* Target MYP Criteria & Strands Box */}
      {((task.target_criteria && task.target_criteria.length > 0) || (meta.criteria && meta.criteria.length > 0)) && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1">
            <Target className="h-4 w-4 text-emerald-600" />
            <span className="uppercase tracking-wider">Target MYP Assessment Criteria & Strands:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(task.target_criteria || meta.criteria)!.map((crit, cIdx) => (
              <span key={cIdx} className="rounded-md bg-white border border-emerald-200 px-2 py-0.5 text-xs font-extrabold text-emerald-800 shadow-2xs">
                {crit}
              </span>
            ))}
          </div>
          {(task.target_strands || meta.strands) && (task.target_strands || meta.strands)!.length > 0 && (
            <div className="mt-2 text-[11px] text-emerald-800 border-t border-emerald-200/60 pt-2 space-y-0.5">
              <span className="font-bold text-emerald-900">Focused Strands: </span>
              {(task.target_strands || meta.strands)!.join(' • ')}
            </div>
          )}
        </div>
      )}

      {/* ATL Focus Box */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <span className="font-bold text-slate-800 uppercase tracking-wider">ATL Skill Focus: </span>
        {task.atl_focus_explainer}
      </div>

      {/* IDU Link Note */}
      {task.idu_note && (
        <div className="mt-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-3.5 text-xs text-indigo-900">
          <span className="font-bold text-indigo-700 uppercase tracking-wider">IDU Synthesis: </span>
          {task.idu_note}
        </div>
      )}

      {/* Paste restriction toggle */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-indigo-600" />
          <span className="font-medium">Formative Mode: Direct typing requirement (prevents external copy-pasting)</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
          <input
            id="prevent-paste-checkbox"
            type="checkbox"
            checked={preventPaste}
            onChange={(e) => setPreventPaste(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-0"
          />
          <span>Lock Clipboard</span>
        </label>
      </div>

      {/* Task Parts */}
      <div className="mt-6 space-y-5">
        {task.parts.map((part, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-indigo-200 transition-colors">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-2xs">
                {part.label || String.fromCharCode(65 + idx)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 leading-snug">{part.prompt}</p>

                <textarea
                  id={`part-input-${idx}`}
                  value={responses[idx] || ''}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onPaste={(e) => {
                    if (preventPaste) {
                      e.preventDefault();
                      alert('Direct typing is required for this task to practice authentic skill articulation.');
                    }
                  }}
                  onDrop={(e) => {
                    if (preventPaste) e.preventDefault();
                  }}
                  placeholder={part.placeholder || 'Type your response here...'}
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <button
          id="back-to-config-btn"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <button
          id="submit-feedback-btn"
          onClick={handleSubmitClick}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Evaluating Work…</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Submit for Skill Feedback</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
