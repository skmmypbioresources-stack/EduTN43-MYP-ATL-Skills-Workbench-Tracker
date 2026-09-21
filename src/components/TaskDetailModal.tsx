import React, { useState } from 'react';
import { ATLTaskLog, TaskImageAttachment } from '../types';
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
  TrendingUp
} from 'lucide-react';
import { ImageZoomLightbox } from './ImageZoomLightbox';
import { ScientificGraphStimulus } from './ScientificGraphStimulus';
import { isTaskLogGraded, getTaskEffectiveScore } from '../lib/scoreUtils';
import {
  getScientificDatasetForTopic,
  generateStimulusImagesForTopic,
  determinePrimaryCriterion,
  getFallbackStimulusImage,
  buildATLSkillGuideAndIntro
} from '../lib/scientificDatasetGenerator';

interface TaskDetailModalProps {
  log: ATLTaskLog;
  isOpen: boolean;
  onClose: () => void;
  onOpenGrading?: () => void;
  onGradeClick?: () => void;
  isTeacherView?: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  log,
  isOpen,
  onClose,
  onOpenGrading,
  onGradeClick,
  isTeacherView = false
}) => {
  if (!isOpen) return null;

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const gradingHandler = onGradeClick || onOpenGrading;

  const evaluation = log.teacherEvaluation;
  const badge = evaluation?.badgeAwarded || log.badgeAwarded;

  const effectiveTopic = log.topic || log.originalTask?.topic || 'Cell Biology';
  const effectiveSubject = log.subject || log.originalTask?.subject || 'Biology';
  const effectiveCriterion = log.criteria?.[0] || 'Criterion C';

  const stimulusImages: TaskImageAttachment[] =
    (log.stimulusImages && log.stimulusImages.length > 0)
      ? log.stimulusImages
      : (log.originalTask?.stimulusImages && log.originalTask.stimulusImages.length > 0)
      ? log.originalTask.stimulusImages
      : generateStimulusImagesForTopic(effectiveTopic, effectiveSubject);

  const scientificDataset =
    log.originalTask?.scientific_dataset ||
    (log as any).scientific_dataset ||
    getScientificDatasetForTopic(effectiveTopic, determinePrimaryCriterion(log.criteria || [effectiveCriterion]), effectiveSubject);

  const studentAttachments: TaskImageAttachment[] =
    log.studentAttachments ||
    log.responses?.flatMap((r) => r.attachments || []) ||
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
  const resolvedAtlIntro = rawAtlIntro || derivedAtl.atlPedagogicalIntro;
  const resolvedAtlGuide = rawAtlGuide || derivedAtl.atl_skill_guide;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Complete Task Record
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                MYP {log.mypYear} • {log.subject}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {log.academicYear || '2026-2027'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-2">
              {log.taskTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Student: <span className="font-semibold text-slate-200">{log.studentName}</span>
              {log.classSection && ` • Class: ${log.classSection}`}
              {log.date && ` • Submitted: ${log.date}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Print / Save PDF"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 divide-y divide-slate-100">
          {/* Assessment & Badge Summary Card */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {isGraded ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                    {score}
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Teacher Evaluated Grade
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-extrabold text-slate-900">
                        Criterion Grade {score}/8
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
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
                      Formative Assessment
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-extrabold text-slate-900">
                        Awaiting Teacher Grading
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Pending Teacher Review
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Digital Badge Awarded if present */}
              {badge && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-orange-400/10 border border-amber-300 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      Awarded Digital Badge
                    </span>
                    <span className="font-black text-slate-900 text-sm block">
                      {badge.name}
                    </span>
                    {badge.awardedBy && (
                      <span className="text-[11px] text-slate-600 block">
                        by {badge.awardedBy}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* If work is submitted but pending teacher grading, explain clearly */}
            {!isGraded && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold">Student has written and submitted this task for teacher correction.</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    No automatic grade is given. The student portfolio only displays the formative grade and developmental level that the teacher personally awards or selects upon review.
                  </p>
                  {gradingHandler && (
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={gradingHandler}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Award Grade & Level Now</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Teacher Feedback & Corrections */}
            {(evaluation?.feedback || log.feedback?.summary) && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-800 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Teacher Feedback & Evaluation Notes:
                </span>
                <p className="leading-relaxed">
                  {evaluation?.feedback || log.feedback?.summary}
                </p>
                {evaluation?.gradedBy && (
                  <p className="text-xs text-slate-400 pt-1">
                    Graded by {evaluation.gradedBy} on {evaluation.gradedAt || 'Recent'}
                  </p>
                )}
              </div>
            )}

            {/* Strengths & Next Steps */}
            {((evaluation?.strengths && evaluation.strengths.length > 0) ||
              (log.feedback?.strengths && log.feedback.strengths.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-emerald-900 block uppercase tracking-wider">
                    Key Strengths:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                    {(evaluation?.strengths || log.feedback?.strengths || []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-amber-900 block uppercase tracking-wider">
                    Next Steps:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                    {(evaluation?.nextSteps || log.feedback?.next_steps || []).map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {isTeacherView && onOpenGrading && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={onOpenGrading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  Edit Grade, Feedback & Badge
                </button>
              </div>
            )}
          </div>

          {/* SECTION 1: Entire Original Question Attached */}
          <div className="pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Original Question & Instructions
              </h3>
            </div>

            {/* Approaches to Learning (ATL) Pedagogical Purpose & Explicit Skill Modelling */}
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                      Approaches to Learning (ATL) Focus • Named & Taught on Purpose
                    </span>
                    <h4 className="text-sm font-black text-indigo-950">
                      Targeted Skill: {resolvedAtlGuide?.skill_name || log.cluster || 'Critical Thinking'} ({log.category || 'Thinking'})
                    </h4>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100/90 text-indigo-900 px-2.5 py-0.5 text-xs font-black">
                  <Target className="h-3 w-3 text-indigo-700" />
                  <span>Explicit Skill Modelling</span>
                </span>
              </div>

              {/* Student-Facing Pedagogical Intro */}
              <div className="rounded-xl bg-white border border-indigo-100 p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium shadow-2xs">
                <p className="font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                  <MessageSquareQuote className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>Why This ATL Skill Matters & How It Is Developed:</span>
                </p>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {resolvedAtlIntro}
                </p>
              </div>

              {/* 3 Pillars: What You Are Doing, How It Is Tested, What Is Being Developed */}
              {resolvedAtlGuide && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-0.5">
                  <div className="rounded-xl bg-white border border-indigo-100 p-3 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-indigo-600" />
                      1. What You Are Doing
                    </span>
                    <p className="text-xs text-slate-700 leading-snug">
                      {resolvedAtlGuide.what_you_are_doing}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white border border-indigo-100 p-3 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block flex items-center gap-1">
                      <Target className="h-3 w-3 text-indigo-600" />
                      2. How It Is Tested (CER)
                    </span>
                    <p className="text-xs text-slate-700 leading-snug">
                      {resolvedAtlGuide.how_it_is_tested}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white border border-indigo-100 p-3 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-indigo-600" />
                      3. What Is Being Developed
                    </span>
                    <p className="text-xs text-slate-700 leading-snug">
                      {resolvedAtlGuide.what_is_being_developed}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {log.originalTask?.context && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                <span className="font-bold text-slate-900 block mb-1 text-xs uppercase tracking-wider">
                  Question Prompt / Scenario:
                </span>
                {log.originalTask.context}
              </div>
            )}

            {/* Scientific Graph & Dataset Stimulus */}
            {scientificDataset && (
              <div className="rounded-2xl border border-indigo-100 overflow-hidden bg-white shadow-xs">
                <ScientificGraphStimulus dataset={scientificDataset} />
              </div>
            )}

            {/* Stimulus Images if any */}
            {stimulusImages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  Attached Question Images / Diagrams ({stimulusImages.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stimulusImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setPreviewImage(img.url)}
                    >
                      <div className="relative w-full h-44 bg-slate-900/5 flex items-center justify-center overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.caption || `Diagram ${idx + 1}`}
                          onError={(e) => {
                            e.currentTarget.src = getFallbackStimulusImage(log.taskTitle || 'Biology', log.subject || 'Biology');
                          }}
                          className="w-full h-full object-contain group-hover:scale-102 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-bold shadow-lg">
                            <ZoomIn className="w-4 h-4 text-indigo-400" />
                            <span>Zoom & Fit Full Page</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(img.url);
                          }}
                          className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 hover:bg-indigo-600 text-white text-[10px] font-semibold shadow-xs transition-colors cursor-pointer"
                          title="Fit Full Page"
                        >
                          <ZoomIn className="w-3 h-3" />
                          <span>Zoom</span>
                        </button>
                      </div>
                      <div className="p-2 bg-white text-xs text-slate-700 truncate font-medium flex items-center justify-between border-t border-slate-100">
                        <span>{img.caption || img.name || `Diagram ${idx + 1}`}</span>
                        <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5">
                          <ZoomIn className="w-3 h-3" />
                          <span>Full Page</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Parts & Prompts */}
            {((log.originalTask?.parts && log.originalTask.parts.length > 0) || (log.responses && log.responses.length > 0)) && (
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Structured Question Prompts:
                </span>
                <div className="space-y-2">
                  {(log.originalTask?.parts || log.responses || []).map((p: any, idx: number) => {
                    const promptText = p.prompt || (p.label ? `Part ${p.label}` : `Question ${idx + 1}`);
                    return (
                      <div key={idx} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px]">
                            Part {p.label || String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-bold text-slate-800">
                            {idx === 0 ? 'Scientific Claim & Empirical Evidence' : 'Mechanistic Reasoning & Scientific Evaluation'}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium pl-2 leading-relaxed">
                          {promptText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Student Submitted Work */}
          <div className="pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Student's Submitted Work & Answers
              </h3>
            </div>

            <div className="space-y-3">
              {log.responses && log.responses.length > 0 ? (
                log.responses.map((resp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                        Part {resp.label || String.fromCharCode(65 + idx)}
                      </span>
                      {resp.prompt && (
                        <p className="text-xs text-slate-600 italic flex-1 ml-2">
                          "{resp.prompt}"
                        </p>
                      )}
                    </div>
                    {resp.claim || resp.evidence || resp.reasoning ? (
                      <div className="space-y-2 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
                        <div className="text-[11px] font-black text-indigo-900 flex items-center gap-1.5 pb-1 border-b border-indigo-100/80">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>CER Scientific Argumentation Breakdown</span>
                        </div>
                        {resp.claim && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">C</span>
                              <span>Claim:</span>
                            </span>
                            <p className="text-xs text-slate-800 font-medium pl-4 bg-white/80 p-2 rounded-lg border border-blue-100">
                              {resp.claim}
                            </p>
                          </div>
                        )}
                        {resp.evidence && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">E</span>
                              <span>Evidence:</span>
                            </span>
                            <p className="text-xs text-slate-800 font-medium pl-4 bg-white/80 p-2 rounded-lg border border-emerald-100">
                              {resp.evidence}
                            </p>
                          </div>
                        )}
                        {resp.reasoning && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold">R</span>
                              <span>Reasoning:</span>
                            </span>
                            <p className="text-xs text-slate-800 font-medium pl-4 bg-white/80 p-2 rounded-lg border border-purple-100">
                              {resp.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                        {resp.response?.trim() ? resp.response : (
                          <span className="text-slate-400 italic">No response provided.</span>
                        )}
                      </div>
                    )}

                    {resp.attachments && resp.attachments.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {resp.attachments.map((att, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => setPreviewImage(att.url)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-indigo-50"
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
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-700">
                  {log.studentResponse || 'No recorded responses.'}
                </div>
              )}
            </div>

            {/* General student work attachments */}
            {studentAttachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Student Attached Files & Photos ({studentAttachments.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {studentAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImage(att.url)}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-1 hover:border-indigo-400 transition-all shadow-sm"
                    >
                      <img
                        src={att.url}
                        alt={att.name || `Work photo ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-xl"
                      />
                      <span className="text-xs text-slate-600 truncate block p-1">
                        {att.name || `Work photo ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Student Reflection */}
            {log.studentReflection && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-sm text-slate-800">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1">
                  Student Metacognitive Reflection:
                </span>
                <p className="italic text-slate-700">"{log.studentReflection}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            ID: <span className="font-mono text-slate-400">{log.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {gradingHandler && (
              <button
                type="button"
                onClick={gradingHandler}
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Grade / Award Badge</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
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
