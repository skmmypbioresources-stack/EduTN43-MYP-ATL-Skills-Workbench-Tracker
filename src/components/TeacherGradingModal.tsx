import React, { useState } from 'react';
import {
  ATLTaskLog,
  TeacherEvaluation,
  DigitalBadge,
  SkillLevel,
  TaskImageAttachment,
  GeneratedTask,
  TaskFeedback,
  StudentResponseItem
} from '../types';
import { evaluateTaskClient } from '../lib/geminiClient';
import { TEACHER_PRESET_BADGES } from '../lib/badgeUtils';
import {
  X,
  Award,
  Star,
  Brain,
  Sparkles,
  Target,
  Flame,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Trophy,
  Save,
  Check,
  ZoomIn,
  RotateCcw,
  Edit3,
  CheckCheck
} from 'lucide-react';
import { ImageZoomLightbox } from './ImageZoomLightbox';
import { isTaskLogGraded, getTaskEffectiveScore, getTaskAiSuggestedScore, getTaskAiSuggestedLevel } from '../lib/scoreUtils';

interface TeacherGradingModalProps {
  log: ATLTaskLog;
  isOpen: boolean;
  onClose: () => void;
  onSaveEvaluation?: (
    logId: string,
    evaluation: TeacherEvaluation,
    badgeAwarded?: DigitalBadge
  ) => Promise<void>;
  onSaveGrade?: (
    evalData: TeacherEvaluation,
    badgeAwarded?: DigitalBadge
  ) => Promise<void>;
  teacherName?: string;
}

export const TeacherGradingModal: React.FC<TeacherGradingModalProps> = ({
  log,
  isOpen,
  onClose,
  onSaveEvaluation,
  onSaveGrade,
  teacherName = 'Teacher'
}) => {
  if (!isOpen) return null;

  const existingEval = log.teacherEvaluation;
  const isAlreadyGraded = isTaskLogGraded(log);
  const initialScore = isAlreadyGraded ? getTaskEffectiveScore(log) : undefined;
  const initialLevel: SkillLevel = existingEval?.level ?? log.level ?? 'Applying';
  const initialFeedback = existingEval?.feedback ?? (log.feedback?.summary === 'Work submitted for teacher review and grading.' ? '' : log.feedback?.summary ?? '');

  const aiSuggestedScore = getTaskAiSuggestedScore(log);
  const aiSuggestedLevel = getTaskAiSuggestedLevel(log);

  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);
  const [activeAiFeedback, setActiveAiFeedback] = useState<TaskFeedback | null>(
    log.feedback && log.feedback.rubric_matrix && log.feedback.rubric_matrix.length > 0
      ? (log.feedback as TaskFeedback)
      : null
  );

  const hasAiAssistance = Boolean(
    activeAiFeedback ||
    typeof aiSuggestedScore === 'number' ||
    (log.feedback && log.feedback.rubric_matrix && log.feedback.rubric_matrix.length > 0) ||
    (log.feedback?.summary && log.feedback.summary.includes('AI Formative Guidance'))
  );

  const effectiveAiSuggestedScore =
    typeof activeAiFeedback?.formativeScore === 'number'
      ? activeAiFeedback.formativeScore
      : aiSuggestedScore;

  const effectiveAiSuggestedLevel =
    activeAiFeedback?.level || aiSuggestedLevel;

  const [score, setScore] = useState<number | undefined>(initialScore);
  const [level, setLevel] = useState<SkillLevel>(initialLevel);
  const [feedback, setFeedback] = useState<string>(initialFeedback);
  const [strengthsText, setStrengthsText] = useState<string>(
    (existingEval?.strengths ?? log.feedback?.strengths ?? []).join('\n')
  );
  const [nextStepsText, setNextStepsText] = useState<string>(
    (existingEval?.nextSteps ?? log.feedback?.next_steps ?? []).join('\n')
  );
  const [aiAppliedNotice, setAiAppliedNotice] = useState<string | null>(null);

  // Selected Badge State
  const initialBadge = existingEval?.badgeAwarded ?? log.badgeAwarded;
  const [selectedBadgePreset, setSelectedBadgePreset] = useState<string>(
    initialBadge?.name ?? ''
  );
  const [isCustomBadge, setIsCustomBadge] = useState<boolean>(false);
  const [customBadgeName, setCustomBadgeName] = useState<string>('');
  const [customBadgeDesc, setCustomBadgeDesc] = useState<string>('');

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-sync level with standard IB MYP score brackets if adjusted
  const handleScoreChange = (newScore: number) => {
    setScore(newScore);
    if (newScore <= 3) {
      setLevel('Developing');
    } else if (newScore <= 6) {
      setLevel('Applying');
    } else {
      setLevel('Extending');
    }
  };

  const handleGenerateAiRecommendation = async () => {
    setIsGeneratingAi(true);
    setAiGenError(null);
    try {
      const effectiveResponses: StudentResponseItem[] =
        log.responses && log.responses.length > 0
          ? log.responses
          : (log.originalTask?.parts || []).map((p, i) => ({
              label: p.label || String.fromCharCode(65 + i),
              prompt: p.prompt,
              response: ''
            }));

      const taskForEval: GeneratedTask = log.originalTask || {
        title: log.taskTitle || 'Scientific Inquiry Task',
        context: log.originalTask?.context || '',
        chosen_cluster: log.cluster || 'Critical thinking',
        atl_focus_explainer: 'Formative ATL Inquiry Task',
        estimated_minutes: 30,
        parts:
          log.originalTask?.parts && log.originalTask.parts.length > 0
            ? log.originalTask.parts
            : effectiveResponses.map((r, i) => ({
                label: r.label || String.fromCharCode(65 + i),
                prompt: r.prompt || `Part ${r.label || String.fromCharCode(65 + i)}`,
                placeholder: ''
              })),
        target_criteria: log.criteria || ['Criterion A'],
        target_strands: log.originalTask?.target_strands || []
      };

      const meta = {
        title: log.taskTitle || 'Scientific Inquiry Task',
        taskTitle: log.taskTitle || 'Scientific Inquiry Task',
        subject: log.subject || 'Sciences',
        topic: log.topic || 'Science',
        year: log.mypYear || '4',
        category: log.category || 'Thinking',
        cluster: log.cluster || 'Critical thinking',
        criteria: log.criteria || ['Criterion A']
      };

      const generated = await evaluateTaskClient(taskForEval, meta, effectiveResponses);
      setActiveAiFeedback(generated);

      if (typeof generated.formativeScore === 'number') {
        handleScoreChange(generated.formativeScore);
      }
      if (generated.level) {
        setLevel(generated.level as SkillLevel);
      }
      if (generated.summary) {
        setFeedback(generated.summary);
      }
      if (generated.strengths && generated.strengths.length > 0) {
        setStrengthsText(generated.strengths.join('\n'));
      }
      if (generated.next_steps && generated.next_steps.length > 0) {
        setNextStepsText(generated.next_steps.join('\n'));
      }

      setAiAppliedNotice('AI assessment recommendation generated. Review, edit, and adjust the score and feedback below before saving.');
      setTimeout(() => setAiAppliedNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to generate AI grading recommendation:', err);
      setAiGenError(err.message || 'Failed to generate AI recommendation. You can still grade manually below.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const applyAiSuggestions = () => {
    const feedbackToUse = activeAiFeedback || log.feedback;
    const scoreToUse = typeof activeAiFeedback?.formativeScore === 'number' ? activeAiFeedback.formativeScore : aiSuggestedScore;
    const levelToUse = activeAiFeedback?.level || aiSuggestedLevel;

    if (typeof scoreToUse === 'number') {
      handleScoreChange(scoreToUse);
    }
    if (levelToUse) {
      setLevel(levelToUse as SkillLevel);
    }
    if (feedbackToUse?.summary && feedbackToUse.summary !== 'Work submitted for teacher review and grading.') {
      const cleanSummary = feedbackToUse.summary
        .replace(/^Work submitted for teacher review and grading\.\s*\(AI Formative Guidance generated:\s*/, '')
        .replace(/\)$/, '');
      setFeedback(cleanSummary);
    }
    if (feedbackToUse?.strengths && feedbackToUse.strengths.length > 0) {
      setStrengthsText(feedbackToUse.strengths.join('\n'));
    }
    if (feedbackToUse?.next_steps && feedbackToUse.next_steps.length > 0) {
      setNextStepsText(feedbackToUse.next_steps.join('\n'));
    }
    setAiAppliedNotice('AI suggested grade and commentary loaded. You can now modify any score or feedback.');
    setTimeout(() => setAiAppliedNotice(null), 4000);
  };

  const clearToManual = () => {
    setScore(undefined);
    setFeedback('');
    setStrengthsText('');
    setNextStepsText('');
    setAiAppliedNotice('Grade and comments cleared. Ready for your manual score.');
    setTimeout(() => setAiAppliedNotice(null), 3000);
  };

  const handleSave = async () => {
    if (score === undefined || score === null) {
      setSaveError('Please select a formative score (1–8) to award to this student before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const strengths = strengthsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const nextSteps = nextStepsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let badgeToAward: DigitalBadge | undefined = undefined;

      if (isCustomBadge && customBadgeName.trim().length > 0) {
        badgeToAward = {
          id: `badge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: customBadgeName.trim(),
          category: 'teacher_awarded',
          icon: 'Award',
          description: customBadgeDesc.trim() || 'Awarded by teacher for exceptional ATL inquiry.',
          earnedAt: new Date().toISOString().split('T')[0],
          awardedBy: teacherName,
          color: 'purple'
        };
      } else if (selectedBadgePreset) {
        const found = TEACHER_PRESET_BADGES.find((b) => b.name === selectedBadgePreset);
        if (found) {
          badgeToAward = {
            id: `badge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: found.name,
            category: found.category,
            icon: found.icon,
            description: found.description,
            criteria: found.criteria,
            earnedAt: new Date().toISOString().split('T')[0],
            awardedBy: teacherName,
            color: found.color
          };
        }
      }

      const evaluation: TeacherEvaluation = {
        formativeScore: score,
        level,
        feedback: feedback.trim(),
        strengths,
        nextSteps,
        gradedBy: teacherName,
        gradedAt: new Date().toISOString().split('T')[0],
        badgeAwarded: badgeToAward,
        rubricMatrix: activeAiFeedback?.rubric_matrix || existingEval?.rubricMatrix || log.feedback?.rubric_matrix
      };

      if (onSaveEvaluation) {
        await onSaveEvaluation(log.id, evaluation, badgeToAward);
      } else if (onSaveGrade) {
        await onSaveGrade(evaluation, badgeToAward);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save teacher evaluation:', err);
      setSaveError(err.message || 'Failed to save evaluation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Find all stimulus images from originalTask or log
  const stimulusImages: TaskImageAttachment[] =
    log.stimulusImages ||
    log.originalTask?.stimulusImages ||
    [];

  // Find all student attached files/photos
  const studentAttachments: TaskImageAttachment[] =
    log.studentAttachments ||
    log.responses?.flatMap((r) => r.attachments || []) ||
    [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 text-indigo-100">
                  Teacher Correction & Assessment
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  MYP {log.mypYear} • {log.subject}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                {log.studentName} — {log.taskTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 divide-y divide-slate-100">
          {/* Top Info Banner */}
          <div className="space-y-3 pb-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">ATL Cluster</span>
                <span className="font-semibold text-slate-800 text-sm">{log.cluster}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Academic Year</span>
                <span className="font-semibold text-slate-800 text-sm">{log.academicYear || '2026-2027'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Submitted Date</span>
                <span className="font-semibold text-slate-800 text-sm">{log.date || 'Recent'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block font-medium">Criteria Assessed</span>
                <span className="font-semibold text-indigo-700 text-sm">
                  {log.criteria?.join(', ') || 'Criterion A / ATL Focus'}
                </span>
              </div>
            </div>

            {/* Teacher Review Status Notice */}
            {!isAlreadyGraded ? (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold">Awaiting Teacher Grade:</span> When students submit work for teacher correction, no automated grade is assigned to their portfolio. The student's official grade and ATL level will reflect solely your evaluation below.
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Official Teacher Grade Recorded:</span> Currently awarded <span className="font-extrabold">{initialScore}/8 ({initialLevel})</span> by {existingEval?.gradedBy || 'Teacher'}. You can freely edit or override any values below.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearToManual}
                  className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold shrink-0 transition-colors"
                >
                  Reset / Regrade
                </button>
              </div>
            )}
          </div>

          {/* SECTION 1: The Original Question (ChatGPT / Attached Stimulus) */}
          <div className="pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">
                1. Original Question & Attached Stimulus
              </h3>
            </div>

            {log.originalTask?.context && (
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                <span className="font-bold text-indigo-900 block mb-1 text-xs uppercase tracking-wider">
                  Scenario / Question Prompt:
                </span>
                {log.originalTask.context}
              </div>
            )}

            {/* Stimulus Images if attached */}
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
                          alt={img.caption || `Stimulus ${idx + 1}`}
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
                        <span>{img.caption || img.name || `Diagram / Stimulus ${idx + 1}`}</span>
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
          </div>

          {/* SECTION 2: Student's Submitted Work */}
          <div className="pt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  2. Student's Submitted Responses & Work
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                {log.responses?.length || 0} response part(s)
              </span>
            </div>

            <div className="space-y-3">
              {log.responses && log.responses.length > 0 ? (
                log.responses.map((resp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                        Part {resp.label || String.fromCharCode(65 + idx)}
                      </span>
                      {resp.prompt && (
                        <p className="text-xs text-slate-600 italic flex-1 ml-2">
                          "{resp.prompt}"
                        </p>
                      )}
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                      {resp.response?.trim() ? resp.response : (
                        <span className="text-slate-400 italic">No text response provided.</span>
                      )}
                    </div>

                    {/* Attached files for this part if any */}
                    {resp.attachments && resp.attachments.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {resp.attachments.map((att, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => setPreviewImage(att.url)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{att.name || att.caption || `Attached Evidence ${aIdx + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-700">
                  {log.studentResponse || 'Student submitted task.'}
                </div>
              )}
            </div>

            {/* General student attachments if any */}
            {studentAttachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Student Attached Evidence / Work Photos ({studentAttachments.length})
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
                        alt={att.name || `Student work ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-xl"
                      />
                      <span className="text-xs text-slate-600 truncate block p-1">
                        {att.name || `Student Work ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Student Reflection if any */}
            {log.studentReflection && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-sm text-slate-800">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1">
                  Student Metacognitive Reflection:
                </span>
                <p className="italic text-slate-700">"{log.studentReflection}"</p>
              </div>
            )}
          </div>

          {/* SECTION 2: AI Grading Assistant (Teacher Advisory Tool) */}
          <div className="pt-5 space-y-4">
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <span>2. AI Grading Assistant</span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Teacher Advisory Tool
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Generate an advisory IB criteria evaluation for this student's submission. The final grade and marks are strictly determined by you.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateAiRecommendation}
                    disabled={isGeneratingAi}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin text-white" />
                        <span>Analyzing Responses...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>
                          {hasAiAssistance ? 'Re-Generate AI Recommendation' : 'Generate AI Recommendation'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {aiGenError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiGenError}</span>
                </div>
              )}

              {/* Display AI recommendations if available */}
              {hasAiAssistance && (
                <div className="space-y-3 pt-2 border-t border-indigo-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">AI Suggested Formative Level:</span>
                      {typeof effectiveAiSuggestedScore === 'number' && (
                        <span className="text-sm font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                          {effectiveAiSuggestedScore} / 8
                        </span>
                      )}
                      {effectiveAiSuggestedLevel && (
                        <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                          {effectiveAiSuggestedLevel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={applyAiSuggestions}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply AI Draft to Fields</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearToManual}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Clear Fields</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Summary and Comments */}
                  {(activeAiFeedback?.summary || log.feedback?.summary) && (
                    <div className="text-xs text-slate-700 bg-white/90 p-3.5 rounded-xl border border-indigo-100 leading-relaxed font-medium shadow-2xs">
                      <span className="font-bold text-indigo-900 block mb-1">AI Diagnostic Commentary:</span>
                      {(activeAiFeedback?.summary || log.feedback?.summary || '')
                        .replace(/^Work submitted for teacher review and grading\.\s*\(AI Formative Guidance generated:\s*/, '')
                        .replace(/\)$/, '')}
                    </div>
                  )}

                  {/* AI Strengths & Next Steps */}
                  {((activeAiFeedback?.strengths && activeAiFeedback.strengths.length > 0) ||
                    (log.feedback?.strengths && log.feedback.strengths.length > 0) ||
                    (activeAiFeedback?.next_steps && activeAiFeedback.next_steps.length > 0) ||
                    (log.feedback?.next_steps && log.feedback.next_steps.length > 0)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {((activeAiFeedback?.strengths && activeAiFeedback.strengths.length > 0) ||
                        (log.feedback?.strengths && log.feedback.strengths.length > 0)) && (
                        <div className="p-3 bg-white/90 rounded-xl border border-emerald-100 text-slate-700 shadow-2xs">
                          <span className="font-bold text-emerald-800 block mb-1">Identified Strengths:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            {(activeAiFeedback?.strengths || log.feedback?.strengths || []).slice(0, 3).map((st, sIdx) => (
                              <li key={sIdx} className="truncate">{st}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {((activeAiFeedback?.next_steps && activeAiFeedback.next_steps.length > 0) ||
                        (log.feedback?.next_steps && log.feedback.next_steps.length > 0)) && (
                        <div className="p-3 bg-white/90 rounded-xl border border-blue-100 text-slate-700 shadow-2xs">
                          <span className="font-bold text-blue-800 block mb-1">Suggested Next Steps:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            {(activeAiFeedback?.next_steps || log.feedback?.next_steps || []).slice(0, 3).map((ns, nIdx) => (
                              <li key={nIdx} className="truncate">{ns}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rubric Matrix breakdown if available */}
                  {(activeAiFeedback?.rubric_matrix || log.feedback?.rubric_matrix) && (activeAiFeedback?.rubric_matrix || log.feedback?.rubric_matrix)!.length > 0 && (
                    <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-1.5 shadow-2xs">
                      <span className="text-[11px] font-bold text-indigo-900 block">Formative Criteria Rubric Matrix:</span>
                      <div className="space-y-1">
                        {(activeAiFeedback?.rubric_matrix || log.feedback?.rubric_matrix)!.map((rm, rIdx) => (
                          <div key={rIdx} className="text-[11px] flex items-start justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="font-bold text-indigo-900 shrink-0">{rm.criterion}:</span>
                            <span className="text-slate-600 flex-1">{rm.descriptor}</span>
                            <span className="font-bold text-slate-800 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {rm.score_range}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 font-medium italic pt-1">
                    * The above AI evaluation is an advisory draft. Review, edit, and finalize your score and comments in Section 3 below.
                  </div>
                </div>
              )}

              {aiAppliedNotice && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fadeIn">
                  <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiAppliedNotice}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: Teacher Grading, Feedback & Digital Badge */}
          <div className="pt-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    3. Teacher Grading, Corrections & Badge Award
                  </h3>
                  <p className="text-xs text-slate-500">
                    As teacher, your score and feedback override any automated or draft evaluation.
                  </p>
                </div>
              </div>
              {score !== undefined && (
                <button
                  type="button"
                  onClick={clearToManual}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors font-medium self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Score (Mark Ungraded)</span>
                </button>
              )}
            </div>

            {/* Score & Level Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Teacher Formative Score (1–8 MYP Scale)
                  </label>
                  {score === undefined ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Not Graded Yet
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Score Selected: {score}/8
                    </span>
                  )}
                </div>

                {/* Quick 1-8 Select Buttons */}
                <div className="grid grid-cols-8 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                    const isSelected = score === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleScoreChange(s)}
                        className={`py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md scale-105 ring-2 ring-indigo-300'
                            : 'bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={score || 4}
                    onChange={(e) => handleScoreChange(Number(e.target.value))}
                    className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className={`w-12 h-12 rounded-2xl text-white font-extrabold text-xl flex items-center justify-center shadow-md ${
                    score !== undefined ? 'bg-indigo-600' : 'bg-slate-300 text-slate-500'
                  }`}>
                    {score !== undefined ? score : '—'}
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium px-1">
                  <span>1-2: Limited</span>
                  <span>3-4: Adequate</span>
                  <span>5-6: Substantial</span>
                  <span>7-8: Excellent</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  ATL Developmental Level
                </label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['Developing', 'Applying', 'Extending'] as SkillLevel[]).map((lvl) => {
                    const active = level === lvl;
                    const colors =
                      lvl === 'Extending'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : lvl === 'Applying'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : 'border-amber-500 bg-amber-50 text-amber-800';
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevel(lvl)}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all ${
                          active
                            ? `${colors} shadow-sm ring-2 ring-indigo-300 font-extrabold`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Teacher Feedback Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Teacher Written Feedback & Corrections
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write actionable comments, praise student reasoning, note corrections, or highlight ATL skill execution..."
                className="w-full p-3.5 rounded-2xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Strengths & Next Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 block flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Key Strengths (one per line)
                </label>
                <textarea
                  rows={2}
                  value={strengthsText}
                  onChange={(e) => setStrengthsText(e.target.value)}
                  placeholder="e.g. Precise scientific vocabulary&#10;Clear step-by-step logic"
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-800 block flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                  Target Next Steps (one per line)
                </label>
                <textarea
                  rows={2}
                  value={nextStepsText}
                  onChange={(e) => setNextStepsText(e.target.value)}
                  placeholder="e.g. Connect evidence directly to hypothesis&#10;Justify assumptions with data"
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* AWARD A DIGITAL BADGE */}
            <div className="p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Award an ATL Milestone Digital Badge
                    </h4>
                    <p className="text-xs text-slate-500">
                      Celebrates student effort and is added to their digital portfolio.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBadgePreset('');
                      setIsCustomBadge(false);
                    }}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                      !selectedBadgePreset && !isCustomBadge
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    No Badge
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomBadge(true);
                      setSelectedBadgePreset('');
                    }}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                      isCustomBadge
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-purple-50'
                    }`}
                  >
                    + Custom Badge
                  </button>
                </div>
              </div>

              {!isCustomBadge ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {TEACHER_PRESET_BADGES.map((b) => {
                    const isSelected = selectedBadgePreset === b.name;
                    return (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => setSelectedBadgePreset(b.name)}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          isSelected
                            ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Star className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block leading-tight truncate">
                            {b.name}
                          </span>
                          <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {b.criteria || b.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 bg-white p-4 rounded-xl border border-purple-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-purple-950 block mb-1">
                        Custom Badge Title
                      </label>
                      <input
                        type="text"
                        value={customBadgeName}
                        onChange={(e) => setCustomBadgeName(e.target.value)}
                        placeholder="e.g. Master of Bio-Data Analysis"
                        className="w-full p-2.5 rounded-lg border border-purple-300 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-purple-950 block mb-1">
                        Citation / Achievement Reason
                      </label>
                      <input
                        type="text"
                        value={customBadgeDesc}
                        onChange={(e) => setCustomBadgeDesc(e.target.value)}
                        placeholder="e.g. Exceptional interpretation of diffusion graphs"
                        className="w-full p-2.5 rounded-lg border border-purple-300 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            {saveError && <span className="text-rose-600 font-bold block">{saveError}</span>}
            {saveSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Evaluation & Official Grade recorded!
              </span>
            )}
            {!saveError && !saveSuccess && (
              <span>
                Grade to record: <strong className="text-indigo-700">{score !== undefined ? `${score}/8 (${level})` : 'No score selected yet'}</strong> by {teacherName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Evaluation...' : 'Save & Record Grade'}
            </button>
          </div>
        </div>
      </div>

      {/* High-Resolution Full-Page Zoom Lightbox */}
      <ImageZoomLightbox
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        title={log.taskTitle || 'Attached Question Diagram / Stimulus'}
        caption="High-resolution view. Use toolbar to zoom in/out, fit to page, view 100% text, or drag to pan."
      />
    </div>
  );
};
