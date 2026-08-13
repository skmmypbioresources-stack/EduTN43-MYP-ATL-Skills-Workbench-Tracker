import React, { useState } from 'react';
import { TaskFeedback, TaskMeta, GeneratedTask, StudentResponseItem, SkillLevel, ATLTaskLog } from '../types';
import { CheckCircle2, Download, Printer, FileText, RefreshCw, BarChart3, Award, MessageSquareQuote, Send, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { exportToWordDoc, exportToPdf, ReportData } from '../lib/exportUtils';

interface FeedbackStepProps {
  feedback: TaskFeedback;
  task: GeneratedTask;
  meta: TaskMeta;
  studentName: string;
  responses: StudentResponseItem[];
  onNewTask: () => void;
  onGoToDashboard: () => void;
  currentLogId?: string | null;
  logs?: ATLTaskLog[];
  onSaveReflection?: (logId: string, reflectionText: string) => Promise<void>;
}

export const FeedbackStep: React.FC<FeedbackStepProps> = ({
  feedback,
  task,
  meta,
  studentName,
  responses,
  onNewTask,
  onGoToDashboard,
  currentLogId,
  logs = [],
  onSaveReflection,
}) => {
  const [reflectionText, setReflectionText] = useState<string>('');
  const [isSavingReflection, setIsSavingReflection] = useState<boolean>(false);
  const [reflectionSavedMessage, setReflectionSavedMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const clusterName = task.chosen_cluster || meta.cluster;

  // Filter student attempts for this specific ATL Skill Cluster
  const studentLogsForCluster = logs.filter(
    (l) =>
      l.studentName.trim().toLowerCase() === (studentName || '').trim().toLowerCase() &&
      l.cluster === clusterName
  );

  const attemptCount = Math.max(1, studentLogsForCluster.length);
  const pastLevels = studentLogsForCluster.slice(1).map((l) => l.level);

  const handleSaveReflectionClick = async () => {
    if (!reflectionText.trim()) return;
    if (!currentLogId || !onSaveReflection) return;
    setIsSavingReflection(true);
    setReflectionSavedMessage(null);
    try {
      await onSaveReflection(currentLogId, reflectionText.trim());
      setReflectionSavedMessage('Reflection saved to student record & Word report!');
      setTimeout(() => setReflectionSavedMessage(null), 3500);
    } catch (err) {
      console.error('Error saving reflection:', err);
    } finally {
      setIsSavingReflection(false);
    }
  };

  // SVG Semi-Circle Dial Gauge
  const levelOrder: SkillLevel[] = ['Developing', 'Applying', 'Extending'];
  const activeIndex = levelOrder.indexOf(feedback.level);

  const renderGaugeSVG = () => {
    const cx = 110, cy = 110, r = 85;
    const angles = [[180, 240], [240, 300], [300, 360]];

    const arcPath = (a1: number, a2: number) => {
      const x1 = cx + r * Math.cos((a1 * Math.PI) / 180);
      const y1 = cy + r * Math.sin((a1 * Math.PI) / 180);
      const x2 = cx + r * Math.cos((a2 * Math.PI) / 180);
      const y2 = cy + r * Math.sin((a2 * Math.PI) / 180);
      return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
    };

    const getSegColor = (idx: number) => {
      if (idx > activeIndex) return '#e2e8f0';
      if (feedback.level === 'Extending') return '#10b981';
      if (feedback.level === 'Applying') return '#6366f1';
      return '#f59e0b';
    };

    const activeAngle = angles[activeIndex][0] + (angles[activeIndex][1] - angles[activeIndex][0]) / 2;
    const needleX = cx + (r - 2) * Math.cos((activeAngle * Math.PI) / 180);
    const needleY = cy + (r - 2) * Math.sin((activeAngle * Math.PI) / 180);

    return (
      <svg viewBox="0 0 220 130" className="w-56 h-36">
        {angles.map((ang, i) => (
          <path
            key={i}
            d={arcPath(ang[0], ang[1])}
            stroke={getSegColor(i)}
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {/* Needle Circle Indicator */}
        <circle cx={needleX} cy={needleY} r="8" fill={getSegColor(activeIndex)} className="transition-all duration-500" />
        <circle cx={needleX} cy={needleY} r="3" fill="#ffffff" />
      </svg>
    );
  };

  const handlePrintPDF = async () => {
    setIsExportingPdf(true);
    try {
      const reportData: ReportData = {
        studentName: studentName || 'Student',
        subject: meta.subject,
        topic: meta.topic,
        mypYear: meta.year,
        academicYear: '2025-2026',
        term: 'Term 1',
        category: meta.category,
        cluster: clusterName,
        level: feedback.level,
        taskTitle: task.title,
        context: task.context,
        responses,
        feedback,
        studentReflection: reflectionText.trim() || undefined,
        attemptNumber: attemptCount,
        previousLevels: pastLevels,
        criteria: (task.target_criteria && task.target_criteria.length > 0) ? task.target_criteria : meta.criteria,
        strands: (task.target_strands && task.target_strands.length > 0) ? task.target_strands : meta.strands,
      };
      await exportToPdf(reportData);
    } catch (err) {
      console.error('PDF export error, falling back to window.print():', err);
      window.focus();
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadWordDoc = () => {
    exportToWordDoc({
      studentName: studentName || 'Student',
      subject: meta.subject,
      topic: meta.topic,
      mypYear: meta.year,
      academicYear: '2025-2026',
      term: 'Term 1',
      category: meta.category,
      cluster: clusterName,
      level: feedback.level,
      taskTitle: task.title,
      context: task.context,
      responses,
      feedback,
      studentReflection: reflectionText.trim() || undefined,
      attemptNumber: attemptCount,
      previousLevels: pastLevels,
      criteria: (task.target_criteria && task.target_criteria.length > 0) ? task.target_criteria : meta.criteria,
      strands: (task.target_strands && task.target_strands.length > 0) ? task.target_strands : meta.strands,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Printable Area Wrapper */}
      <div id="printable-feedback-report" className="printable-report">
        {/* Step Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 print:hidden">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Step 3 • ATL Skill Development & Reflection</span>
        </div>

        {/* Printable Document Title Header */}
        <div className="border-b border-slate-200 pb-4 mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
            <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">EduTN43</span>
            <span>• IB MYP Approaches to Learning (ATL) Skill Development Report</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5 sm:text-2xl">
            {task.title || 'ATL Task Assessment'}
          </h2>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
            <div><span className="font-semibold text-slate-500">Student:</span> <strong>{studentName || 'Anonymous'}</strong></div>
            <div><span className="font-semibold text-slate-500">Subject:</span> <strong>{meta.subject} (MYP {meta.year})</strong></div>
            <div><span className="font-semibold text-slate-500">Topic:</span> <strong>{meta.topic}</strong></div>
            <div><span className="font-semibold text-slate-500">Cluster:</span> <strong>{clusterName}</strong></div>
          </div>
        </div>

        {/* Dial Gauge & Skill Attempt Progression Badge */}
        <div className="my-6 flex flex-col items-center justify-center text-center">
          {renderGaugeSVG()}
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{feedback.level}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
            Demonstrated Level for {clusterName}
          </div>

          {/* Attempt Counter & Trajectory Pill */}
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-4 py-1.5 text-xs font-bold text-indigo-900 shadow-2xs">
            <TrendingUp className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>Attempt #{attemptCount} for {clusterName}</span>
            <span className="text-indigo-300">•</span>
            <span className="text-indigo-700 font-semibold">
              Skill Trajectory: {[...pastLevels, feedback.level].join(' ➔ ')}
            </span>
          </div>
        </div>

        {/* Recorded Confirmation */}
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-center text-xs font-bold text-emerald-900 flex items-center justify-center gap-2 print:hidden">
          <Award className="h-4 w-4 text-emerald-600" />
          <span>This task result & skill level have been logged into your Academic Year Progress Dashboard.</span>
        </div>

        {/* Feedback Sections */}
        <div className="space-y-6 border-t border-slate-200 pt-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ATL Skill Evaluation Overview
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
              {feedback.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Key Strengths Demonstrated
              </h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-800">
                {feedback.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 font-medium">
                    <span className="font-extrabold text-emerald-600">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Next Steps for Skill Progression
              </h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-800">
                {feedback.next_steps.map((ns, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 font-medium">
                    <span className="font-extrabold text-indigo-600">→</span>
                    <span>{ns}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Student Responses Review */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Task Questions & Student Submitted Answers
            </h3>
            <div className="space-y-3">
              {responses.map((r, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <div className="font-bold text-indigo-700">Question / Part {r.label}: {r.prompt}</div>
                  <div className="mt-2 whitespace-pre-wrap text-slate-800 font-medium bg-white p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-500 block mb-1">Student Answer:</strong>
                    {r.response || <span className="italic text-slate-400">(Left blank)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Post-Task Reflection Box */}
          <div className="border-t border-slate-200 pt-6 print:hidden">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <MessageSquareQuote className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Student Post-Task Self-Reflection
                </h3>
                <p className="text-[11px] text-slate-500">
                  Reflect on your strategy and how you will apply this ATL skill in future work
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Type your reflection here... (e.g. What strategy helped me demonstrate this skill? How can I develop this skill further next time?)"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {reflectionSavedMessage ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {reflectionSavedMessage}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Saved reflections appear on your Word Document export & teacher report.
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveReflectionClick}
                  disabled={!reflectionText.trim() || isSavingReflection || !currentLogId}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer print:hidden"
                >
                  {isSavingReflection ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Save Reflection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Display Saved Reflection in Printable Report */}
          {reflectionText.trim() && (
            <div className="hidden print:block border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Student Self-Reflection & Next Steps
              </h3>
              <p className="text-xs italic text-slate-800 bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                "{reflectionText.trim()}"
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400 font-medium">
            * Note: This is an AI-assisted indicator of MYP Approaches to Learning (ATL) skill performance for this specific task context. Use in tandem with teacher observation and dialogue.
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 print:hidden">
        <div className="flex items-center gap-2">
          {/* Print / Save PDF Button */}
          <button
            id="print-pdf-btn"
            onClick={handlePrintPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Download formatted PDF report document"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 text-slate-600" />
                <span>Print / Save PDF</span>
              </>
            )}
          </button>

          {/* Download Word Document Button */}
          <button
            id="download-word-btn"
            onClick={handleDownloadWordDoc}
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-blue-700 hover:bg-blue-100 transition-all shadow-2xs"
            title="Export complete report as a Microsoft Word document (.doc)"
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Export Word Doc</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="go-to-dashboard-btn"
            onClick={onGoToDashboard}
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-xs"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Academic Year Analytics</span>
          </button>

          <button
            id="start-new-task-btn"
            onClick={onNewTask}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition-all shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Start New Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};

