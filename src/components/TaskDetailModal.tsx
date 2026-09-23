import React, { useState } from 'react';
import { ATLTaskLog, TaskImageAttachment, TaskPart, StudentResponseItem } from '../types';
import {
  X,
  Award,
  Star,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Trophy,
  ExternalLink,
  Printer,
  ZoomIn,
  Clock,
  AlertCircle,
  MessageSquareQuote,
  Target,
  BookOpen,
  TrendingUp,
  Trash2,
  Maximize2,
  Minimize2,
  BarChart3
} from 'lucide-react';
import { ImageZoomLightbox } from './ImageZoomLightbox';
import { ScientificGraphStimulus } from './ScientificGraphStimulus';
import { isTaskLogGraded, getTaskEffectiveScore } from '../lib/scoreUtils';
import {
  generateStimulusImagesForTopic,
  determinePrimaryCriterion,
  getFallbackStimulusImage,
  buildATLSkillGuideAndIntro,
  getTaskBriefATLDescription
} from '../lib/scientificDatasetGenerator';

interface TaskDetailModalProps {
  log: ATLTaskLog;
  isOpen: boolean;
  onClose: () => void;
  onOpenGrading?: () => void;
  onGradeClick?: () => void;
  isTeacherView?: boolean;
  onUpdateLog?: (logId: string, partial: Partial<ATLTaskLog>) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  log,
  isOpen,
  onClose,
  onOpenGrading,
  onGradeClick,
  isTeacherView = false,
  onUpdateLog
}) => {
  if (!isOpen) return null;

  // Open in full view fitting page by default, with toggle to standard view
  const [isMaximized, setIsMaximized] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Synchronize local parts and responses
  const [currentResponses, setCurrentResponses] = useState<StudentResponseItem[]>(log.responses || []);
  const [currentParts, setCurrentParts] = useState<TaskPart[]>(log.originalTask?.parts || []);
  const [isDeletingPartIdx, setIsDeletingPartIdx] = useState<number | null>(null);

  // Dataset removal state
  const [isDatasetRemoved, setIsDatasetRemoved] = useState<boolean>(
    log.originalTask?.scientific_dataset === null ||
    (log as any).scientific_dataset === null ||
    (log as any).hasRemovedDataset === true
  );
  const [isRemovingDataset, setIsRemovingDataset] = useState(false);

  React.useEffect(() => {
    setCurrentResponses(log.responses || []);
    setCurrentParts(log.originalTask?.parts || []);
    setIsDatasetRemoved(
      log.originalTask?.scientific_dataset === null ||
      (log as any).scientific_dataset === null ||
      (log as any).hasRemovedDataset === true
    );
  }, [log]);

  const effectiveTopic = log.topic || log.originalTask?.topic || 'Science';
  const effectiveSubject = log.subject || log.originalTask?.subject || 'Science';
  const effectiveCriterion = log.criteria?.[0] || 'Criterion A';
  const primaryCriterion = determinePrimaryCriterion(log.criteria || [effectiveCriterion]);

  // Scientific dataset logic: ONLY display if Criterion C and dataset was explicitly created, and NOT removed or set to null
  const rawDataset = log.originalTask?.scientific_dataset || (log as any).scientific_dataset;
  const isExplicitlyNull = rawDataset === null || (log as any).scientific_dataset === null;

  const scientificDataset = (
    !isDatasetRemoved &&
    !isExplicitlyNull &&
    primaryCriterion === 'Criterion C' &&
    rawDataset &&
    typeof rawDataset === 'object' &&
    Array.isArray(rawDataset.dataPoints) &&
    rawDataset.dataPoints.length > 0
  ) ? rawDataset : undefined;

  // Handle deleting a question part from BOTH responses and originalTask.parts
  const handleDeleteQuestion = async (idx: number) => {
    const targetResp = currentResponses[idx];
    const targetPart = currentParts[idx];
    const partLabel = targetResp?.label || targetPart?.label || String.fromCharCode(65 + idx);

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete Question Part ${partLabel} from ${log.studentName}'s submission?\n\nThis will remove the question prompt and the student's recorded answer from this submission record.`
    );
    if (!confirmed) return;

    setIsDeletingPartIdx(idx);
    try {
      const updatedResponses = currentResponses.filter((_, i) => i !== idx);
      const updatedParts = currentParts.filter((_, i) => i !== idx);

      setCurrentResponses(updatedResponses);
      setCurrentParts(updatedParts);

      const updatedOriginalTask = log.originalTask ? {
        ...log.originalTask,
        parts: updatedParts
      } : undefined;

      if (onUpdateLog) {
        await onUpdateLog(log.id, {
          responses: updatedResponses,
          ...(updatedOriginalTask ? { originalTask: updatedOriginalTask } : {})
        });
      }
    } catch (err) {
      console.error('Failed to delete question part:', err);
      alert('Failed to delete question. Please check connection and try again.');
    } finally {
      setIsDeletingPartIdx(null);
    }
  };

  // Handle removing scientific dataset from this submission record
  const handleRemoveScientificDataset = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to remove the scientific graph and dataset stimulus from this student submission record?\n\nThis will permanently remove the graph and empirical data from this submission.'
    );
    if (!confirmed) return;

    setIsRemovingDataset(true);
    setIsDatasetRemoved(true);
    try {
      const updatedOriginal = log.originalTask ? {
        ...log.originalTask,
        scientific_dataset: null as any
      } : undefined;

      if (onUpdateLog) {
        await onUpdateLog(log.id, {
          ...(updatedOriginal ? { originalTask: updatedOriginal } : {}),
          scientific_dataset: null as any,
          hasRemovedDataset: true
        } as any);
      }
    } catch (err) {
      console.error('Failed to remove scientific dataset:', err);
      alert('Failed to remove dataset. Please try again.');
    } finally {
      setIsRemovingDataset(false);
    }
  };

  const gradingHandler = onGradeClick || onOpenGrading;
  const evaluation = log.teacherEvaluation;
  const badge = evaluation?.badgeAwarded || log.badgeAwarded;

  const stimulusImages: TaskImageAttachment[] =
    (log.stimulusImages && log.stimulusImages.length > 0)
      ? log.stimulusImages
      : (log.originalTask?.stimulusImages && log.originalTask.stimulusImages.length > 0)
      ? log.originalTask.stimulusImages
      : generateStimulusImagesForTopic(effectiveTopic, effectiveSubject);

  const studentAttachments: TaskImageAttachment[] =
    log.studentAttachments ||
    currentResponses.flatMap((r) => r.attachments || []) ||
    [];

  const isGraded = isTaskLogGraded(log);
  const score = isGraded ? getTaskEffectiveScore(log) : undefined;
  const level = isGraded ? (evaluation?.level ?? log.level ?? 'Applying') : undefined;

  const rawAtlIntro = log.atlPedagogicalIntro || log.originalTask?.atlPedagogicalIntro;
  const rawAtlGuide = log.atl_skill_guide || log.originalTask?.atl_skill_guide;
  const derivedAtl = buildATLSkillGuideAndIntro(
    log.cluster || 'Critical thinking',
    log.category || 'Thinking',
    effectiveTopic,
    determinePrimaryCriterion(log.criteria || [effectiveCriterion]),
    effectiveSubject
  );
  // Guarantee a concise, task-focused description without generic boilerplate essays
  const resolvedAtlIntro = getTaskBriefATLDescription(
    effectiveTopic,
    effectiveSubject,
    log.category || 'Thinking',
    log.cluster || 'Critical thinking',
    rawAtlIntro
  );
  const resolvedAtlGuide = rawAtlGuide || derivedAtl.atl_skill_guide;

  const handlePrint = () => {
    window.print();
  };

  // Active parts to show under Structured Question Prompts
  const activePromptList = currentParts.length > 0 ? currentParts : currentResponses;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-200 ${
        isMaximized ? 'p-1 sm:p-2.5 md:p-3 overflow-hidden' : 'p-3 sm:p-6 overflow-y-auto'
      }`}
    >
      <div
        className={`relative w-full bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized
            ? 'h-full max-w-[99vw] max-h-[99vh] rounded-2xl'
            : 'max-w-5xl rounded-3xl my-6 max-h-[92vh]'
        }`}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 sm:px-6 sm:py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Complete Task Record
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                MYP {log.mypYear} • {log.subject}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {log.academicYear || '2026-2027'}
              </span>
              {log.criteria && log.criteria.length > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  {log.criteria.join(', ')}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
              {log.taskTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Student: <strong className="text-slate-100 font-bold">{log.studentName}</strong></span>
              {log.classSection && <span>• Class: <strong className="text-slate-200">{log.classSection}</strong></span>}
              {log.date && <span>• Submitted: {log.date}</span>}
              {log.term && <span>• {log.term}</span>}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={isMaximized ? 'Compact Card View' : 'Full Page Fit View'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden md:inline">{isMaximized ? 'Fit Card' : 'Full View'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Print / Save PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Record"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Column Split in Full View, Stacking on small devices */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Stimulus, Context, Dataset & Question Prompts */}
            <div className="lg:col-span-6 xl:col-span-5 space-y-5">
              
              {/* Context / Scenario Card */}
              {log.originalTask?.context && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <span className="font-bold text-slate-900 block mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Question Prompt / Scientific Scenario</span>
                  </span>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {log.originalTask.context}
                  </div>
                </div>
              )}

              {/* Scientific Graph & Dataset Stimulus (Only for Criterion C if not removed) */}
              {scientificDataset && (
                <div className="rounded-2xl border border-indigo-200/80 overflow-hidden bg-white shadow-xs space-y-0">
                  <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        Criterion C Empirical Dataset Stimulus
                      </span>
                    </div>
                    {onUpdateLog && (
                      <button
                        type="button"
                        onClick={handleRemoveScientificDataset}
                        disabled={isRemovingDataset}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                        title="Remove this graph and scientific dataset from this student submission record"
                      >
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>Remove Graph</span>
                      </button>
                    )}
                  </div>
                  <div className="p-1">
                    <ScientificGraphStimulus dataset={scientificDataset} />
                  </div>
                </div>
              )}

              {/* Attached Question Images / Diagrams */}
              {stimulusImages.length > 0 && (
                <div className="space-y-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Attached Question Images / Diagrams ({stimulusImages.length})</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stimulusImages.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        className="group relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => setPreviewImage(img.url)}
                      >
                        <div className="relative w-full h-36 bg-slate-900/5 flex items-center justify-center overflow-hidden">
                          <img
                            src={img.url}
                            alt={img.caption || `Diagram ${idx + 1}`}
                            onError={(e) => {
                              e.currentTarget.src = getFallbackStimulusImage(log.taskTitle || 'Biology', log.subject || 'Biology');
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            type="button"
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Zoom</span>
                          </button>
                        </div>
                        <div className="p-2 bg-white text-[11px] text-slate-700 truncate font-medium flex items-center justify-between border-t border-slate-100">
                          <span className="truncate">{img.caption || img.name || `Diagram ${idx + 1}`}</span>
                          <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5 shrink-0 ml-1">
                            <ZoomIn className="w-3 h-3" />
                            <span>Inspect</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Question Prompts with Direct Per-Part Deletion */}
              {activePromptList && activePromptList.length > 0 && (
                <div className="space-y-3 bg-indigo-50/40 border border-indigo-100/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-indigo-600" />
                      <span>Structured Question Prompts ({activePromptList.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Assigned to Student
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activePromptList.map((p: any, idx: number) => {
                      const promptText = p.prompt || (p.label ? `Part ${p.label}` : `Question ${idx + 1}`);
                      const partLabel = p.label || String.fromCharCode(65 + idx);

                      return (
                        <div key={idx} className="rounded-xl border border-indigo-100 bg-white p-3.5 text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px]">
                                Part {partLabel}
                              </span>
                              <span className="font-bold text-slate-800">
                                {idx === 0 ? 'Claim & Scientific Evidence' : 'Reasoning & Evaluation'}
                              </span>
                            </div>

                            {onUpdateLog && (
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(idx)}
                                disabled={isDeletingPartIdx === idx}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                title={`Delete Question Part ${partLabel} from this submission`}
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>{isDeletingPartIdx === idx ? 'Deleting...' : 'Delete Part'}</span>
                              </button>
                            )}
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed">
                            {promptText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Approaches to Learning (ATL) Pedagogical Purpose */}
              {resolvedAtlIntro && (
                <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      <span>Targeted ATL Skill Focus & Pedagogical Context</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {log.category || 'Thinking'} • {log.cluster || 'Critical thinking'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {resolvedAtlIntro}
                  </p>
                  {resolvedAtlGuide?.skill_name && (
                    <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-950 flex items-center justify-between gap-2 flex-wrap">
                      <span>
                        <strong className="text-emerald-900 font-bold">Focus Area: </strong>
                        <span className="text-slate-700">{resolvedAtlGuide.skill_name}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Student Evaluation, Answers & Student Work */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-5">
              
              {/* Assessment & Formative Grade Card */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  {isGraded ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                        {score}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Formative Evaluated Score
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-base font-extrabold text-slate-900">
                            Score {score}/8
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                              level === 'Extending'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : level === 'Applying'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {level}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shadow-xs">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                          Teacher Review Status
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-base font-extrabold text-slate-900">
                            Awaiting Teacher Evaluation
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {gradingHandler && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={gradingHandler}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Open grading window with AI Grading Assistant"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>AI Grading Assistant</span>
                      </button>

                      <button
                        type="button"
                        onClick={gradingHandler}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>{isGraded ? 'Edit Official Grade' : 'Grade Submission'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Badge Awarded */}
                {badge && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                      🏆
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                        Digital Mastery Badge Awarded
                      </span>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {badge.name}
                      </p>
                      {badge.description && (
                        <p className="text-[11px] text-slate-600 truncate">
                          {badge.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Teacher Feedback / Qualitative Summary */}
                {evaluation?.feedback || log.feedback?.summary ? (
                  <div className="space-y-1.5 pt-2 border-t border-indigo-100/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Teacher Qualitative Feedback & Commendations:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/80 p-3 rounded-xl border border-indigo-50">
                      {evaluation?.feedback || log.feedback.summary}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* SECTION: Student Submitted Work & Answers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Student's Submitted Work & Answers
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {currentResponses.length} Answered Part(s)
                  </span>
                </div>

                <div className="space-y-3">
                  {currentResponses && currentResponses.length > 0 ? (
                    currentResponses.map((resp, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 shadow-2xs hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-md">
                              Part {resp.label || String.fromCharCode(65 + idx)}
                            </span>
                            {onUpdateLog && (
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(idx)}
                                disabled={isDeletingPartIdx === idx}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                                title="Delete this question and answer from student submission"
                              >
                                <Trash2 className="h-3 w-3 text-rose-600" />
                                <span>{isDeletingPartIdx === idx ? 'Deleting...' : 'Delete Question'}</span>
                              </button>
                            )}
                          </div>
                          {resp.prompt && (
                            <p className="text-xs text-slate-600 italic flex-1 ml-2 font-medium">
                              "{resp.prompt}"
                            </p>
                          )}
                        </div>

                        {/* CER Scientific Argumentation Breakdown */}
                        {resp.claim || resp.evidence || resp.reasoning ? (
                          <div className="space-y-2 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
                            <div className="text-[11px] font-black text-indigo-900 flex items-center gap-1.5 pb-1 border-b border-indigo-100/80">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>CER Scientific Argumentation Breakdown</span>
                            </div>
                            {resp.claim && (
                              <div className="text-xs text-slate-800">
                                <strong className="text-indigo-900 font-bold mr-1">Claim (C):</strong>
                                <span className="font-medium text-slate-700">{resp.claim}</span>
                              </div>
                            )}
                            {resp.evidence && (
                              <div className="text-xs text-slate-800">
                                <strong className="text-emerald-900 font-bold mr-1">Empirical Evidence (E):</strong>
                                <span className="font-medium text-slate-700">{resp.evidence}</span>
                              </div>
                            )}
                            {resp.reasoning && (
                              <div className="text-xs text-slate-800">
                                <strong className="text-purple-900 font-bold mr-1">Scientific Reasoning (R):</strong>
                                <span className="font-medium text-slate-700">{resp.reasoning}</span>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Direct Response Text */}
                        {resp.response && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                            {resp.response}
                          </div>
                        )}

                        {/* Part Attachments */}
                        {resp.attachments && resp.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {resp.attachments.map((att, aIdx) => (
                              <button
                                key={att.id || aIdx}
                                type="button"
                                onClick={() => setPreviewImage(att.url)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-indigo-50 transition-colors"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{att.name || att.caption || `Evidence File ${aIdx + 1}`}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs sm:text-sm text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700">No recorded questions or answers remain for this submission.</p>
                      <p className="text-slate-400">All questions have been cleared or removed by the teacher.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Work Attachments */}
              {studentAttachments.length > 0 && (
                <div className="space-y-2 pt-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Student Attached Files & Photos ({studentAttachments.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {studentAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(att.url)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-1 hover:border-indigo-400 transition-all shadow-2xs"
                      >
                        <img
                          src={att.url}
                          alt={att.name || `Work photo ${idx + 1}`}
                          className="w-full h-28 object-cover rounded-lg"
                        />
                        <span className="text-[11px] text-slate-600 truncate block p-1 font-medium">
                          {att.name || `Work photo ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Post-Task Reflection */}
              {log.studentReflection && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 space-y-1">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <MessageSquareQuote className="w-4 h-4 text-amber-700" />
                    <span>Student Metacognitive Self-Reflection:</span>
                  </span>
                  <p className="italic text-slate-700 font-medium">"{log.studentReflection}"</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 sm:px-6 sm:py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Submission ID: <span className="font-mono text-slate-600 font-bold">{log.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {gradingHandler && (
              <button
                type="button"
                onClick={gradingHandler}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>{isGraded ? 'Grade & Badge' : 'Grade Submission'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close Record
            </button>
          </div>
        </div>
      </div>

      {/* High-Resolution Zoom Lightbox */}
      <ImageZoomLightbox
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        title={log.taskTitle || 'Question Diagram & Stimulus'}
        caption="High-resolution view. Use toolbar to zoom in/out, fit to page, view 100% text, or drag to pan."
      />
    </div>
  );
};
