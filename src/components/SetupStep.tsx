import React, { useState, useEffect } from 'react';
import { ATL_DATA } from '../data/atlData';
import { ATLCategoryKey, TaskMeta } from '../types';
import { Sparkles, HelpCircle, Layers, Link as LinkIcon, User } from 'lucide-react';

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
}

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
}) => {
  const [autoCluster, setAutoCluster] = useState(false);
  const [iduToggle, setIduToggle] = useState(false);

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
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Step 1 • Task Configuration</span>
      </div>

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
    </div>
  );
};
