import {
  TaskFeedback,
  TaskMeta,
  GeneratedTask,
  StudentResponseItem,
  ATLTaskLog,
  ATLCategoryKey,
  TaskImageAttachment,
  TeacherEvaluation,
  StudentRecord,
  AssignedTask
} from '../types';
import { buildATLSkillGuideAndIntro, generateStimulusImagesForTopic } from './scientificDatasetGenerator';
import { isTaskLogGraded, getTaskEffectiveScore } from './scoreUtils';
import { formatTeacherComment } from './sanitizeTaskData';

export interface ReportData {
  studentName: string;
  subject: string;
  topic: string;
  mypYear: string;
  academicYear: string;
  term: string;
  category: string;
  cluster: string;
  level: string;
  formativeScore?: number;
  taskTitle: string;
  context?: string;
  atlPedagogicalIntro?: string;
  atl_skill_guide?: any;
  skillIndicators?: string[];
  responses: StudentResponseItem[];
  feedback: TaskFeedback;
  studentReflection?: string;
  attemptNumber?: number;
  previousLevels?: string[];
  criteria?: string[];
  strands?: string[];
  dueDate?: string;
  submissionStatus?: 'on_time' | 'overdue' | 'not_applicable';
  daysOverdue?: number;
  originalTask?: GeneratedTask;
  stimulusImages?: TaskImageAttachment[];
  studentAttachments?: TaskImageAttachment[];
  teacherEvaluation?: TeacherEvaluation;
  teacherName?: string;
  classSection?: string;
  badgeAwarded?: any;
}

/**
 * Resolves 3-5 measurable action-verb skill indicators for the report.
 * Uses provided AI skill indicators if available, or derives dynamic, topic-calibrated indicators.
 */
export function resolveSkillIndicators(data: ReportData): string[] {
  if (data.skillIndicators && Array.isArray(data.skillIndicators) && data.skillIndicators.length > 0) {
    const valid = data.skillIndicators
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^[•\-\*]\s*/, ''));
    if (valid.length > 0) {
      return valid.slice(0, 5);
    }
  }

  const topic = (data.topic || 'the curriculum topic').trim();
  const cluster = (data.cluster || 'Critical thinking').toLowerCase();
  const category = (data.category || 'Thinking').toLowerCase();

  // Dynamic topic-calibrated ATL skill indicators starting with action verbs
  if (cluster.includes('critical') || (category.includes('thinking') && !cluster.includes('creative') && !cluster.includes('transfer'))) {
    return [
      `Analyse relationships between biological structures, mechanisms, and functions in ${topic}.`,
      `Justify scientific conclusions and claims using valid biological evidence.`,
      `Evaluate the strengths and limitations of biological models used for ${topic}.`,
      `Construct logical analogies and scientific explanations using accurate scientific vocabulary.`
    ];
  }

  if (cluster.includes('creative')) {
    return [
      `Construct innovative biological models or analogies to explain mechanisms in ${topic}.`,
      `Synthesise concepts across multiple cellular or ecological systems to propose novel hypotheses.`,
      `Generate alternative scientific explanations when analysing anomalies in ${topic}.`,
      `Design refined experimental investigations to test variable interactions.`
    ];
  }

  if (cluster.includes('transfer')) {
    return [
      `Transfer scientific principles learned in ${topic} to solve unfamiliar real-world scenarios.`,
      `Analyse cross-disciplinary connections between biological dynamics and wider scientific contexts.`,
      `Synthesise multiple concepts to model complex multi-organelle or ecosystem interactions.`,
      `Predict systemic outcomes when biological concepts are applied to novel environments.`
    ];
  }

  if (cluster.includes('communication') || cluster.includes('literacy')) {
    return [
      `Construct coherent scientific explanations of ${topic} using precise terminology.`,
      `Interpret and evaluate data tables, diagrams, and graphical representations accurately.`,
      `Justify biological arguments using structured reasoning and validated evidence.`,
      `Critique scientific communication for clarity, accuracy, and depth of explanation.`
    ];
  }

  if (cluster.includes('research') || cluster.includes('information') || cluster.includes('media')) {
    return [
      `Analyse and synthesise data from credible scientific investigations concerning ${topic}.`,
      `Evaluate the reliability, validity, and methodological limitations of experimental data.`,
      `Identify patterns, correlations, and anomalies in complex biological datasets.`,
      `Justify scientific recommendations using empirical evidence from scientific literature.`
    ];
  }

  if (cluster.includes('collaboration') || category.includes('social')) {
    return [
      `Synthesise diverse viewpoints when constructing collaborative solutions in ${topic}.`,
      `Critique peer scientific arguments constructively using objective evidence.`,
      `Defend team conclusions using reasoned analysis of biological principles.`,
      `Coordinate and evaluate group problem-solving strategies effectively.`
    ];
  }

  if (category.includes('self-management') || cluster.includes('organization') || cluster.includes('reflection') || cluster.includes('affective')) {
    return [
      `Evaluate personal understanding of ${topic} and pinpoint specific conceptual growth areas.`,
      `Plan and execute structured problem-solving pathways for multi-part inquiry tasks.`,
      `Analyse misconceptions and refine scientific justifications based on diagnostic feedback.`,
      `Monitor task pacing and demonstrate sustained analytical persistence.`
    ];
  }

  return [
    `Analyse relationships between structures, mechanisms, and functions in ${topic}.`,
    `Justify scientific conclusions and explanations using empirical evidence.`,
    `Evaluate the strengths, limitations, and validity of scientific models.`,
    `Construct logical scientific explanations using accurate subject vocabulary.`
  ];
}

function renderStimulusImagesHtml(images: TaskImageAttachment[], sanitize: (t: string) => string): string {
  if (!images || images.length === 0) return '';
  return `
    <div style="margin-top: 12px; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
      <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #4338ca; margin-bottom: 6px;">
        Attached Stimulus Images & Scientific Diagrams (${images.length})
      </div>
      <div style="display: grid; grid-template-columns: ${images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))'}; gap: 12px;">
        ${images.map((img, idx) => `
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size: 8.5pt; font-weight: bold; color: #334155; margin-bottom: 6px; text-align: left;">
              Figure ${idx + 1}: ${sanitize(img.name || img.caption || 'Scientific Stimulus Diagram')}
            </div>
            <img src="${img.url}" alt="${sanitize(img.caption || img.name || 'Scientific Diagram')}" style="max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; background: #ffffff; display: block; margin: 0 auto;" />
            ${img.caption ? `<div style="margin-top: 6px; font-size: 8pt; color: #64748b; font-style: italic; line-height: 1.35;">${sanitize(img.caption)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDatasetStimulusHtml(dataset: any, sanitize: (t: string) => string): string {
  if (!dataset || !dataset.data_points || dataset.data_points.length === 0) return '';
  return `
    <div style="margin-top: 12px; margin-bottom: 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; page-break-inside: avoid; break-inside: avoid;">
      <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #0f172a; margin-bottom: 4px;">
        Scientific Empirical Dataset: ${sanitize(dataset.title || 'Experimental Observations')}
      </div>
      <div style="font-size: 8pt; color: #64748b; margin-bottom: 8px;">
        Independent Variable: <strong>${sanitize(dataset.independent_variable || 'X')}</strong> • Dependent Variable: <strong>${sanitize(dataset.dependent_variable || 'Y')}</strong>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; background: #ffffff;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 6px 10px; text-align: left; border: 1px solid #e2e8f0;">${sanitize(dataset.independent_variable || 'Independent Variable')}</th>
            <th style="padding: 6px 10px; text-align: left; border: 1px solid #e2e8f0;">${sanitize(dataset.dependent_variable || 'Dependent Variable')}</th>
            <th style="padding: 6px 10px; text-align: left; border: 1px solid #e2e8f0;">Observation Notes</th>
          </tr>
        </thead>
        <tbody>
          ${dataset.data_points.slice(0, 10).map((dp: any) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 10px; border: 1px solid #e2e8f0; font-weight: 600;">${sanitize(String(dp.x))}</td>
              <td style="padding: 5px 10px; border: 1px solid #e2e8f0;">${sanitize(String(dp.y))}</td>
              <td style="padding: 5px 10px; border: 1px solid #e2e8f0; color: #64748b; font-style: italic;">${sanitize(dp.note || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${dataset.trend_description ? `
        <div style="margin-top: 6px; font-size: 8pt; color: #475569; font-style: italic;">
          Trend Note: ${sanitize(dataset.trend_description)}
        </div>
      ` : ''}
    </div>
  `;
}

function renderStudentAnswersHtml(responses: StudentResponseItem[], studentAttachments: TaskImageAttachment[] | undefined, sanitize: (t: string) => string): string {
  const partsHtml = (responses || []).map((r, idx) => {
    const hasCer = r.claim || r.evidence || r.reasoning;
    return `
      <div style="margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; padding: 12px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-weight: bold; color: #1e1b4b; font-size: 10pt; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
          <span style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 8pt; font-weight: bold; padding: 2px 7px; border-radius: 4px; margin-right: 6px; text-transform: uppercase;">
            Part ${sanitize(r.label || String.fromCharCode(65 + idx))}
          </span>
          ${sanitize(r.prompt)}
        </div>
        ${hasCer ? `
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
            ${r.claim ? `
              <div style="background-color: #eff6ff; border-left: 3px solid #3b82f6; padding: 8px 10px; border-radius: 4px; font-size: 9pt;">
                <strong style="color: #1e40af; text-transform: uppercase; font-size: 7.5pt; display: block; margin-bottom: 2px;">Scientific Claim:</strong>
                <span style="color: #1e293b;">${sanitize(r.claim)}</span>
              </div>
            ` : ''}
            ${r.evidence ? `
              <div style="background-color: #ecfdf5; border-left: 3px solid #10b981; padding: 8px 10px; border-radius: 4px; font-size: 9pt;">
                <strong style="color: #065f46; text-transform: uppercase; font-size: 7.5pt; display: block; margin-bottom: 2px;">Empirical Evidence:</strong>
                <span style="color: #1e293b;">${sanitize(r.evidence)}</span>
              </div>
            ` : ''}
            ${r.reasoning ? `
              <div style="background-color: #faf5ff; border-left: 3px solid #8b5cf6; padding: 8px 10px; border-radius: 4px; font-size: 9pt;">
                <strong style="color: #5b21b6; text-transform: uppercase; font-size: 7.5pt; display: block; margin-bottom: 2px;">Mechanistic Reasoning:</strong>
                <span style="color: #1e293b;">${sanitize(r.reasoning)}</span>
              </div>
            ` : ''}
          </div>
        ` : `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 9pt; color: #1e293b; white-space: pre-wrap; line-height: 1.5;">
            ${r.response ? sanitize(r.response) : '<em style="color: #94a3b8;">(No response provided / Left blank)</em>'}
          </div>
        `}
        ${r.attachments && r.attachments.length > 0 ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
            <div style="font-size: 8pt; font-weight: bold; color: #475569; margin-bottom: 6px; text-transform: uppercase;">
              Student Attached Working / Diagram for Part ${sanitize(r.label)}:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${r.attachments.map((att) => `
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #fafafa; text-align: center;">
                  <img src="${att.url}" alt="${sanitize(att.caption || 'Student diagram')}" style="max-height: 170px; max-width: 100%; object-fit: contain; border-radius: 4px;" />
                  ${att.caption ? `<div style="font-size: 7.5pt; color: #64748b; margin-top: 3px;">${sanitize(att.caption)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const attachmentsHtml = (studentAttachments && studentAttachments.length > 0) ? `
    <div style="margin-top: 14px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; page-break-inside: avoid; break-inside: avoid;">
      <div style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #334155; margin-bottom: 8px;">
        Additional Student Submitted Attachments / Work Evidence (${studentAttachments.length})
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
        ${studentAttachments.map((att, i) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
            <img src="${att.url}" alt="${sanitize(att.caption || `Student artifact ${i + 1}`)}" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 4px;" />
            <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">${sanitize(att.name || att.caption || `Artifact #${i + 1}`)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return partsHtml + attachmentsHtml;
}

export function replaceExaminerWithTeacher(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/\bexaminer's\b/gi, (m) => m[0] === 'E' ? "Teacher's" : "teacher's")
    .replace(/\bexaminers'\b/gi, (m) => m[0] === 'E' ? "Teachers'" : "teachers'")
    .replace(/\bexaminers\b/gi, (m) => m[0] === 'E' ? "Teachers" : "teachers")
    .replace(/\bexaminer\b/gi, (m) => m[0] === 'E' ? "Teacher" : "teacher");
}

function renderEvaluatedWordsHtml(feedback: TaskFeedback, sanitize: (t: string) => string): string {
  const evaluatedPhrases = feedback.evaluatedPhrases || [];
  const quotesUsed = feedback.studentQuotesUsed || [];

  let quoteItems: { quote: string; evaluation?: string; status?: string }[] = [];
  if (evaluatedPhrases.length > 0) {
    quoteItems = evaluatedPhrases.map((ep) => ({
      quote: ep.studentQuote,
      evaluation: ep.evaluation ? replaceExaminerWithTeacher(ep.evaluation) : ep.evaluation,
      status: ep.status
    }));
  } else if (quotesUsed.length > 0) {
    quoteItems = quotesUsed.map((q) => ({
      quote: q.replace(/^["']|["']$/g, ''),
      evaluation: 'Extracted from student response and evaluated by the teacher against criterion standards.',
      status: 'accurate'
    }));
  } else {
    const combined = `${feedback.summary || ''} ${(feedback.strengths || []).join(' ')} ${(feedback.next_steps || []).join(' ')}`;
    const matches = combined.match(/"([^"]{4,100})"/g);
    if (matches && matches.length > 0) {
      const unique = Array.from(new Set(matches.map((m) => m.replace(/^"|"$/g, '')))).slice(0, 4);
      quoteItems = unique.map((u) => ({
        quote: u,
        evaluation: 'Direct phrase cited from student response by the teacher.',
        status: 'accurate'
      }));
    }
  }

  if (quoteItems.length === 0) return '';

  return `
    <div style="margin-top: 14px; margin-bottom: 16px; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 12px 14px; page-break-inside: avoid; break-inside: avoid;">
      <div style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #6d28d9; margin-bottom: 6px;">
        🔍 Words & Phrases Picked From Student Answer & Evaluated
      </div>
      <div style="font-size: 8.5pt; color: #4c1d95; margin-bottom: 10px; line-height: 1.4;">
        The teacher specifically identified and evaluated the following terminology and phrasing written in the student's submission:
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${quoteItems.map((item) => `
          <div style="background-color: #ffffff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 8px 12px; font-size: 9pt;">
            <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 3px;">
              <span style="font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #7c3aed; background: #ede9fe; padding: 2px 6px; border-radius: 4px;">Student Wrote:</span>
              <strong style="color: #1e1b4b; font-family: Georgia, serif; font-size: 9.5pt;">"${sanitize(item.quote)}"</strong>
            </div>
            ${item.evaluation ? `
              <div style="font-size: 8.5pt; color: #475569; padding-left: 4px; line-height: 1.35;">
                <strong style="color: #6b21a8;">Teacher Diagnostic:</strong> ${sanitize(item.evaluation)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function generateReportHtml(data: ReportData): string {
  const sanitize = (text: string) => text ? replaceExaminerWithTeacher(text).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const indicators = resolveSkillIndicators(data);
  const skillIndicatorsHtml = indicators.length > 0
    ? `
      <div style="margin-top: 6px; font-size: 9.5pt; color: #1e293b;">
        <strong style="color: #0f172a;">Skill Indicators:</strong>
        <ul style="margin: 3px 0 0 0; padding-left: 16px; color: #334155; line-height: 1.45;">
          ${indicators.map((ind) => `<li style="margin-bottom: 2px;">${sanitize(ind.replace(/^[•\-\*]\s*/, ''))}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const strengthsHtml = data.feedback.strengths
    .map((s) => `<li style="margin-bottom: 6px; color: #166534;"><strong>✓</strong> ${sanitize(s)}</li>`)
    .join('');

  const nextStepsHtml = data.feedback.next_steps
    .map((ns) => `<li style="margin-bottom: 6px; color: #3730a3;"><strong>→</strong> ${sanitize(ns)}</li>`)
    .join('');

  // Resolve stimulus images
  const stimulusImages =
    (data.stimulusImages && data.stimulusImages.length > 0)
      ? data.stimulusImages
      : (data.originalTask?.stimulusImages && data.originalTask.stimulusImages.length > 0)
      ? data.originalTask.stimulusImages
      : generateStimulusImagesForTopic(data.topic, data.subject);

  // Resolve student attachments
  const studentAttachments =
    (data.studentAttachments && data.studentAttachments.length > 0)
      ? data.studentAttachments
      : data.responses?.flatMap((r) => r.attachments || []) || [];

  // Resolve Question Paper Prompts
  const questionParts =
    data.originalTask?.parts && data.originalTask.parts.length > 0
      ? data.originalTask.parts
      : data.responses.map((r, i) => ({
          label: r.label || String.fromCharCode(65 + i),
          prompt: r.prompt || `Part ${r.label || String.fromCharCode(65 + i)}`,
          criterion_assessed: (data.criteria && data.criteria[0]) || 'Criterion A'
        }));

  const attemptText = data.attemptNumber ? `Attempt #${data.attemptNumber} for ${sanitize(data.cluster)}` : null;
  const progressionText = data.previousLevels && data.previousLevels.length > 0
    ? [...data.previousLevels, data.level].join(' ➔ ')
    : data.level;

  const scoreDisplay = data.teacherEvaluation?.formativeScore ?? data.formativeScore ?? data.feedback?.formativeScore;

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; background: #ffffff;">
      <!-- Header Banner -->
      <div style="border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 8.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
              EduTN43 • IB MYP Approaches to Learning (ATL) Assessment Portfolio
            </div>
            <div style="font-size: 17pt; font-weight: bold; color: #1e1b4b;">${sanitize(data.taskTitle || 'ATL Skill Assessment Report')}</div>
          </div>
          <div style="text-align: right; background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1;">
            <div style="font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: bold;">Comprehensive Record</div>
            <div style="font-size: 9.5pt; font-weight: 800; color: #4338ca;">Questions • Student Work • Grading</div>
          </div>
        </div>
      </div>

      <!-- Student & Assessment Metadata Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f1f5f9;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: top;">
            <strong>Student Name:</strong> ${sanitize(data.studentName || 'Anonymous')}<br/>
            ${data.classSection ? `<span style="font-size: 9pt; color: #64748b;">Class / Section: ${sanitize(data.classSection)}</span>` : ''}
          </td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: top;">
            <strong>Academic Year:</strong> ${sanitize(data.academicYear)} (${sanitize(data.term)})<br/>
            <span style="font-size: 9pt; color: #64748b;">Assessment Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: top;">
            <strong>Subject & Topic:</strong> ${sanitize(data.subject)} (MYP ${sanitize(data.mypYear)}) — ${sanitize(data.topic)}
          </td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: top;">
            <div><strong>ATL Cluster:</strong> ${sanitize(data.cluster)} (${sanitize(data.category)})</div>
            ${skillIndicatorsHtml}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt;">
            <div style="margin-bottom: 4px;">
              <strong>Formative Score:</strong> 
              <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 11pt; color: #1e1b4b; background-color: #e0e7ff;">
                ${scoreDisplay ? `${scoreDisplay}/8` : 'Formative Assessment'}
              </span>
            </div>
            <div>
              <strong>Demonstrated Level:</strong> 
              <span style="display: inline-block; padding: 3px 10px; border-radius: 10px; font-weight: bold; font-size: 10pt; color: #ffffff; background-color: ${
                data.level === 'Extending' ? '#10b981' : data.level === 'Applying' ? '#4f46e5' : '#f59e0b'
              };">${sanitize(data.level)}</span>
            </div>
          </td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt;">
            <strong>Skill Attempt & Growth:</strong><br/>
            ${attemptText ? `<strong>${attemptText}</strong><br/>` : ''}
            <span>Progression: ${sanitize(progressionText)}</span>
          </td>
        </tr>
        ${
          data.dueDate || data.submissionStatus
            ? `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt;">
            <strong>Task Due Date:</strong> ${data.dueDate ? sanitize(data.dueDate) : 'Open Task (No due date)'}
          </td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt;">
            <strong>Submission Timing:</strong> ${
              data.submissionStatus === 'overdue'
                ? `<span style="color: #b45309; font-weight: bold;">Extended Submission (+${data.daysOverdue || 1}d overdue)</span>`
                : data.submissionStatus === 'on_time'
                ? `<span style="color: #15803d; font-weight: bold;">Submitted On-Time</span>`
                : 'Standard'
            }
          </td>
        </tr>
        `
            : ''
        }
      </table>

      <!-- Criteria Banner -->
      ${
        (data.criteria && data.criteria.length > 0) || (data.strands && data.strands.length > 0)
          ? `
        <div style="margin-bottom: 20px; border: 1px solid #a7f3d0; background-color: #ecfdf5; border-left: 4px solid #059669; padding: 10px 14px; border-radius: 6px; font-size: 10pt; color: #064e3b; page-break-inside: avoid; break-inside: avoid;">
          <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #047857; margin-bottom: 3px; font-size: 9pt;">Target MYP Assessment Criteria & Strands</div>
          ${
            data.criteria && data.criteria.length > 0
              ? `<div><strong>Target Criteria:</strong> ${data.criteria.map((c) => sanitize(c)).join(', ')}</div>`
              : ''
          }
          ${
            data.strands && data.strands.length > 0
              ? `<div style="margin-top: 3px; font-size: 9pt; color: #065f46;"><strong>Focused Strands:</strong> ${data.strands.map((s) => sanitize(s)).join(' • ')}</div>`
              : ''
          }
        </div>
      `
          : ''
      }

      <!-- ATL Pedagogical Focus -->
      ${
        (() => {
          const rawIntro = data.atlPedagogicalIntro;
          const rawGuide = data.atl_skill_guide;
          const derived = buildATLSkillGuideAndIntro(
            data.cluster || 'Critical thinking',
            data.category || 'Thinking',
            data.topic,
            data.criteria?.[0] || 'Criterion C',
            data.subject
          );
          const resolvedIntro = rawIntro || derived.atlPedagogicalIntro;
          const resolvedGuide = rawGuide || derived.atl_skill_guide;

          return `
            <div style="margin-bottom: 20px; border: 1px solid #c7d2fe; background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 12px 14px; border-radius: 8px; page-break-inside: avoid; break-inside: avoid;">
              <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #4338ca; margin-bottom: 3px; font-size: 9pt;">
                Targeted ATL Skill Focus & Pedagogical Context
              </div>
              <div style="font-size: 10.5pt; font-weight: bold; color: #1e1b4b; margin-bottom: 4px;">
                Skill: ${sanitize(resolvedGuide?.skill_name || data.cluster)} (${sanitize(data.category)})
              </div>
              <p style="font-size: 9.5pt; color: #312e81; line-height: 1.45; margin: 0 0 8px 0;">
                ${sanitize(resolvedIntro)}
              </p>
              ${
                resolvedGuide
                  ? `
                <table style="width: 100%; border-collapse: collapse; margin-top: 6px;">
                  <tr>
                    <td style="padding: 6px 8px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 8.5pt; width: 33%; vertical-align: top;">
                      <strong style="color: #4338ca; display: block; margin-bottom: 2px;">1. What You Are Doing:</strong>
                      <span style="color: #334155;">${sanitize(resolvedGuide.what_you_are_doing)}</span>
                    </td>
                    <td style="padding: 6px 8px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 8.5pt; width: 33%; vertical-align: top;">
                      <strong style="color: #4338ca; display: block; margin-bottom: 2px;">2. How It Is Tested (CER):</strong>
                      <span style="color: #334155;">${sanitize(resolvedGuide.how_it_is_tested)}</span>
                    </td>
                    <td style="padding: 6px 8px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 8.5pt; width: 34%; vertical-align: top;">
                      <strong style="color: #4338ca; display: block; margin-bottom: 2px;">3. What Is Being Developed:</strong>
                      <span style="color: #334155;">${sanitize(resolvedGuide.what_is_being_developed)}</span>
                    </td>
                  </tr>
                </table>
              `
                  : ''
              }
            </div>
          `;
        })()
      }

      <!-- ========================================== -->
      <!-- SECTION 1: QUESTION PAPER & STIMULUS       -->
      <!-- ========================================== -->
      <div style="margin-top: 24px; margin-bottom: 20px;">
        <div style="font-size: 12pt; font-weight: 800; color: #1e1b4b; border-bottom: 2px solid #4f46e5; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Section 1: Official Question Paper & Assessment Stimulus
        </div>

        ${
          data.context || data.originalTask?.context
            ? `
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; padding: 12px; border-radius: 6px; margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #0369a1; margin-bottom: 4px;">
              Scientific Inquiry Scenario & Context:
            </div>
            <div style="font-size: 9.5pt; color: #1e293b; line-height: 1.5;">
              ${sanitize(data.context || data.originalTask?.context || '')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Stimulus Images / Scientific Diagrams -->
        ${renderStimulusImagesHtml(stimulusImages, sanitize)}

        <!-- Scientific Dataset Stimulus (if present) -->
        ${data.originalTask?.scientific_dataset ? renderDatasetStimulusHtml(data.originalTask.scientific_dataset, sanitize) : ''}

        <!-- Structured Question Paper Prompts -->
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 14px; page-break-inside: avoid; break-inside: avoid;">
          <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #334155; margin-bottom: 8px;">
            Inquiry Question Prompts Assigned to Student:
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${questionParts.map((qp: any, idx: number) => `
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; font-size: 9pt;">
                <div style="font-weight: bold; color: #1e1b4b; margin-bottom: 2px;">
                  <span style="color: #4f46e5; margin-right: 4px;">Part ${sanitize(qp.label || String.fromCharCode(65 + idx))}:</span>
                  ${sanitize(qp.prompt)}
                </div>
                ${qp.criterion_assessed ? `
                  <div style="font-size: 8pt; color: #64748b;">Assessing: <em>${sanitize(qp.criterion_assessed)}</em></div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- SECTION 2: STUDENT SUBMITTED ANSWERS       -->
      <!-- ========================================== -->
      <div style="margin-top: 24px; margin-bottom: 20px;">
        <div style="font-size: 12pt; font-weight: 800; color: #1e1b4b; border-bottom: 2px solid #059669; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Section 2: Student Submitted Answers & Evidence
        </div>
        ${renderStudentAnswersHtml(data.responses, studentAttachments, sanitize)}
      </div>

      <!-- ========================================== -->
      <!-- SECTION 3: TEACHER EVALUATION & GRADING    -->
      <!-- ========================================== -->
      <div style="margin-top: 24px; margin-bottom: 20px;">
        <div style="font-size: 12pt; font-weight: 800; color: #1e1b4b; border-bottom: 2px solid #7c3aed; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Section 3: Teacher Evaluation & ATL Skill Grading
        </div>

        <!-- Grade Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;">
          <div>
            <div style="font-size: 8pt; text-transform: uppercase; font-weight: bold; color: #64748b;">Final Formative Evaluation</div>
            <div style="font-size: 14pt; font-weight: 800; color: #1e1b4b;">
              Formative Score: <span style="color: #4f46e5;">${scoreDisplay ? `${scoreDisplay} / 8` : 'Assessed'}</span>
            </div>
            ${data.teacherEvaluation?.gradedBy || data.teacherName ? `
              <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
                Graded by: <strong>${sanitize(data.teacherEvaluation?.gradedBy || data.teacherName || 'Sciences Faculty')}</strong>
                ${data.teacherEvaluation?.gradedAt ? ` • on ${sanitize(data.teacherEvaluation.gradedAt)}` : ''}
              </div>
            ` : ''}
          </div>
          <div>
            <span style="display: inline-block; padding: 6px 14px; border-radius: 12px; font-weight: bold; font-size: 11pt; color: #ffffff; background-color: ${
              data.level === 'Extending' ? '#10b981' : data.level === 'Applying' ? '#4f46e5' : '#f59e0b'
            };">
              ${sanitize(data.level)}
            </span>
          </div>
        </div>

        <!-- Specific Words Quoted from Student Answer and Evaluated -->
        ${renderEvaluatedWordsHtml(data.feedback, sanitize)}

        <!-- Diagnostic Summary -->
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; padding: 12px; border-radius: 6px; font-size: 9.5pt; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
          <strong style="color: #1e1b4b; display: block; margin-bottom: 3px; font-size: 9pt; text-transform: uppercase;">Teacher Feedback & Scientific Corrections:</strong>
          <span style="color: #334155; line-height: 1.5;">${sanitize(formatTeacherComment(data.teacherEvaluation?.feedback || data.feedback.summary))}</span>
        </div>

        <!-- Strengths & Growth Targets -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid;">
          <tr valign="top">
            <td style="width: 50%; padding-right: 10px;">
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px;">
                <div style="font-weight: bold; color: #15803d; font-size: 9.5pt; margin-bottom: 6px; text-transform: uppercase;">
                  ✓ Demonstrated Strengths (What You Did Well):
                </div>
                <ul style="padding-left: 18px; margin: 0; font-size: 9pt; color: #14532d; line-height: 1.4;">
                  ${strengthsHtml}
                </ul>
              </div>
            </td>
            <td style="width: 50%; padding-left: 10px;">
              <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 10px 12px;">
                <div style="font-weight: bold; color: #4338ca; font-size: 9.5pt; margin-bottom: 6px; text-transform: uppercase;">
                  → How to Write Scientifically Correctly (Errors & Fixes):
                </div>
                <ul style="padding-left: 18px; margin: 0; font-size: 9pt; color: #312e81; line-height: 1.4;">
                  ${nextStepsHtml}
                </ul>
              </div>
            </td>
          </tr>
        </table>

        <!-- Rubric Matrix if available -->
        ${
          data.feedback.rubric_matrix && Array.isArray(data.feedback.rubric_matrix) && data.feedback.rubric_matrix.length > 0
            ? `
          <div style="margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #ffffff; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size: 9pt; font-weight: bold; color: #334155; margin-bottom: 6px; text-transform: uppercase;">
              Criteria Rubric Matrix Assessment:
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
              ${data.feedback.rubric_matrix.map((rm: any) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 4px 6px; font-weight: bold; color: #4338ca; width: 25%;">${sanitize(rm.criterion || '')}</td>
                  <td style="padding: 4px 6px; color: #334155; width: 60%;">${sanitize(rm.descriptor || '')}</td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: bold; color: #0f172a; width: 15%;">${sanitize(rm.score_range || '')}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `
            : ''
        }

        <!-- Digital Badge Awarded if present -->
        ${
          data.badgeAwarded || data.teacherEvaluation?.badgeAwarded
            ? `
          <div style="display: flex; align-items: center; gap: 8px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;">
            <span style="font-size: 14pt;">★</span>
            <div>
              <strong style="color: #92400e; font-size: 9pt;">Digital Skill Badge Awarded: ${(data.badgeAwarded || data.teacherEvaluation?.badgeAwarded).name}</strong>
              <div style="font-size: 8pt; color: #78350f;">${(data.badgeAwarded || data.teacherEvaluation?.badgeAwarded).description}</div>
            </div>
          </div>
        `
            : ''
        }

        <!-- Student Self-Reflection -->
        ${
          data.studentReflection
            ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 10px 12px; border-radius: 6px; font-size: 9pt; color: #14532d; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
            <strong style="text-transform: uppercase; font-size: 8pt; display: block; margin-bottom: 2px;">Student Metacognitive Reflection:</strong>
            <em>"${sanitize(data.studentReflection)}"</em>
          </div>
        `
            : ''
        }

        <!-- Official Sign-off Verification -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 12px; page-break-inside: avoid; break-inside: avoid;">
          <tr>
            <td style="width: 50%; padding-top: 16px; font-size: 9pt; color: #475569;">
              <div style="border-bottom: 1px solid #94a3b8; width: 75%; height: 24px; margin-bottom: 4px;"></div>
              <strong>Assessing Teacher Signature:</strong> ${sanitize(data.teacherEvaluation?.gradedBy || data.teacherName || 'Subject Teacher')}
            </td>
            <td style="width: 50%; padding-top: 16px; font-size: 9pt; color: #475569; text-align: right;">
              <div style="border-bottom: 1px solid #94a3b8; width: 75%; height: 24px; margin-bottom: 4px; margin-left: auto;"></div>
              <strong>Verified Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8.5pt; color: #94a3b8; text-align: center;">
        * Generated by EduTN43 • MYP ATL Skills Workbench & Assessment System. Official task record for students, parents, and coordinators.
      </div>
    </div>
  `;
}

/**
 * Downloads a high-resolution PDF document directly using html2pdf.js
 */
export async function exportToPdf(data: ReportData): Promise<void> {
  const htmlContent = generateReportHtml(data);
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  const fileName = `ATL_Report_${(data.studentName || 'Student').replace(/\s+/g, '_')}_${(data.subject || 'Subject').replace(/\s+/g, '_')}.pdf`;

  const opt = {
    margin: [8, 10, 8, 10] as [number, number, number, number],
    filename: fileName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
  };

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;
    await html2pdf().set(opt).from(element).save();
  } finally {
    document.body.removeChild(element);
  }
}

/**
 * Generates and downloads a Microsoft Word (.doc) report
 */
export function exportToWordDoc(data: ReportData) {
  const sanitize = (text: string) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const bodyHtml = generateReportHtml(data);

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>ATL Skill Assessment Report - ${sanitize(data.studentName)}</title>
      <style>
        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          margin: 20px;
          color: #0f172a;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `ATL_Report_${(data.studentName || 'Student').replace(/\s+/g, '_')}_${(data.subject || 'Subject').replace(/\s+/g, '_')}.doc`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get sorted unique YYYY-MM months present in task logs
 */
export function getAvailableMonthsFromLogs(logs: ATLTaskLog[]): { value: string; label: string }[] {
  const monthsSet = new Set<string>();
  logs.forEach((log) => {
    if (log.date) {
      const ym = log.date.substring(0, 7); // e.g. "2026-08"
      if (/^\d{4}-\d{2}$/.test(ym)) {
        monthsSet.add(ym);
      }
    }
  });

  const sorted = Array.from(monthsSet).sort().reverse();
  return sorted.map((ym) => {
    const [year, month] = ym.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return { value: ym, label };
  });
}

/**
 * Generates and downloads a CSV spreadsheet compatible with Microsoft Excel and Google Sheets
 */
export function exportToCsvSpreadsheet(logs: ATLTaskLog[], filenamePrefix = 'ATL_Monthly_Analytics_Report') {
  const headers = [
    'Date Logged',
    'Academic Year',
    'Term',
    'Student Name',
    'MYP Grade / Level',
    'Subject Group',
    'Curriculum Topic',
    'Task Title',
    'Task Due Date',
    'Submission Timing / Status',
    'Target MYP Criteria',
    'Target Strands',
    'ATL Category',
    'ATL Skill Cluster',
    'Formative Score (/8)',
    'Level Achieved',
    'Attempt #',
    'Feedback Summary',
    'Key Strengths',
    'Next Steps',
    'Student Post-Task Reflection'
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = logs.map((log) => {
    let timingLabel = 'Open Task (No Due Date)';
    if (log.submissionStatus === 'on_time') {
      timingLabel = 'On-Time Submission';
    } else if (log.submissionStatus === 'overdue') {
      timingLabel = `Overdue / Extended Time (+${log.daysOverdue || 1} days)`;
    }

    return [
      escapeCsv(log.date),
      escapeCsv(log.academicYear),
      escapeCsv(log.term),
      escapeCsv(log.studentName || 'Anonymous'),
      escapeCsv(`MYP ${log.mypYear}`),
      escapeCsv(log.subject),
      escapeCsv(log.topic),
      escapeCsv(log.taskTitle || 'ATL Skill Assessment'),
      escapeCsv(log.dueDate || 'N/A'),
      escapeCsv(timingLabel),
      escapeCsv(log.criteria && log.criteria.length > 0 ? log.criteria.join('; ') : 'N/A'),
      escapeCsv(log.strands && log.strands.length > 0 ? log.strands.join('; ') : 'N/A'),
      escapeCsv(log.category),
      escapeCsv(log.cluster),
      escapeCsv(log.formativeScore ? `${log.formativeScore}/8` : (log.feedback?.formativeScore ? `${log.feedback.formativeScore}/8` : 'N/A')),
      escapeCsv(log.level),
      escapeCsv(log.attemptNumber || 1),
      escapeCsv(log.feedback?.summary || ''),
      escapeCsv(log.feedback?.strengths?.join(' | ') || ''),
      escapeCsv(log.feedback?.next_steps?.join(' | ') || ''),
      escapeCsv(log.studentReflection || '')
    ].join(',');
  });

  const csvContent = '\ufeff' + [headers.map(escapeCsv).join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  const currentDate = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filenamePrefix}_${currentDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface StudentProgressReportParams {
  studentName: string;
  studentId?: string;
  academicYear: string;
  classTag?: string; // e.g. "MYP 4 (Grade 9)"
  term?: string;
  logs: ATLTaskLog[];
  teacherName?: string;
  schoolName?: string;
  overallNotes?: string;
}

/**
 * Generates an institutional, high-resolution HTML document for a student's
 * complete Approaches to Learning (ATL) progress report across the academic year.
 * Optimized for print and PDF rendering with performance trends, mastery breakdowns,
 * and individual task evidence for parents, coordinators, and stakeholders.
 */
export function generateStudentProgressReportHtml(params: StudentProgressReportParams): string {
  const sanitize = (text?: string | null) =>
    text ? replaceExaminerWithTeacher(String(text)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';

  const sortedLogs = [...params.logs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const totalTasks = sortedLogs.length;
  const gradedLogs = sortedLogs.filter(isTaskLogGraded);
  const pendingLogs = sortedLogs.filter((l) => !isTaskLogGraded(l));

  const validScores = gradedLogs
    .map((l) => getTaskEffectiveScore(l))
    .filter((s): s is number => typeof s === 'number');

  const avgScore =
    validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : null;
  const highestScore = validScores.length > 0 ? Math.max(...validScores) : null;
  const lowestScore = validScores.length > 0 ? Math.min(...validScores) : null;

  let extendingCount = 0;
  let applyingCount = 0;
  let developingCount = 0;

  gradedLogs.forEach((l) => {
    const lvl = l.teacherEvaluation?.level || l.level || 'Applying';
    if (lvl === 'Extending') extendingCount++;
    else if (lvl === 'Developing') developingCount++;
    else applyingCount++;
  });

  const totalGraded = gradedLogs.length;
  const uniqueClusters = Array.from(new Set(sortedLogs.map((l) => l.cluster).filter(Boolean)));
  const clusterCoverageCount = uniqueClusters.length;
  const clusterCoveragePercent = Math.min(100, Math.round((clusterCoverageCount / 10) * 100));

  // Determine Growth / Performance Trajectory
  let trajectoryHeadline = 'Baseline Profiling';
  let trajectoryColor = '#4338ca';
  let trajectoryBg = '#eef2ff';
  let trajectoryBorder = '#c7d2fe';
  let trajectoryDetail =
    'Initial formative inquiries logged. Ongoing tasks will establish longitudinal growth trends.';

  if (validScores.length >= 3) {
    const mid = Math.floor(validScores.length / 2);
    const firstHalf = validScores.slice(0, mid);
    const secondHalf = validScores.slice(mid);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = Number((avgSecond - avgFirst).toFixed(1));

    if (diff >= 0.8) {
      trajectoryHeadline = 'Strong Positive Growth (+ ' + diff + ' pts)';
      trajectoryColor = '#047857';
      trajectoryBg = '#ecfdf5';
      trajectoryBorder = '#a7f3d0';
      trajectoryDetail =
        'Student demonstrates noticeable upward trajectory over successive inquiries, displaying increased autonomous thinking and scientific depth.';
    } else if (diff <= -0.8) {
      trajectoryHeadline = 'Variable Performance (Advanced Rigor)';
      trajectoryColor = '#b45309';
      trajectoryBg = '#fffbeb';
      trajectoryBorder = '#fde68a';
      trajectoryDetail =
        'Recent tasks introduced higher conceptual complexity. Focused support in criteria processing is planned for upcoming inquiries.';
    } else if (avgSecond >= 6.5) {
      trajectoryHeadline = 'Consistently High Attainment (Mastery)';
      trajectoryColor = '#047857';
      trajectoryBg = '#ecfdf5';
      trajectoryBorder = '#a7f3d0';
      trajectoryDetail =
        'Maintaining advanced performance across varied scientific topics, consistently achieving Extending and upper Applying marks.';
    } else {
      trajectoryHeadline = 'Consistent Application & Progress';
      trajectoryColor = '#4338ca';
      trajectoryBg = '#eef2ff';
      trajectoryBorder = '#c7d2fe';
      trajectoryDetail =
        'Reliable execution across core scientific inquiry methods with steady attainment across targeted ATL clusters.';
    }
  } else if (validScores.length > 0) {
    const latest = validScores[validScores.length - 1];
    if (latest >= 7) {
      trajectoryHeadline = 'Advanced Initial Attainment';
      trajectoryColor = '#047857';
      trajectoryBg = '#ecfdf5';
      trajectoryBorder = '#a7f3d0';
      trajectoryDetail = 'Demonstrating thorough mastery on evaluated formative tasks with critical scientific depth.';
    } else if (latest >= 4) {
      trajectoryHeadline = 'Solid Competence (Applying Level)';
      trajectoryColor = '#4338ca';
      trajectoryBg = '#eef2ff';
      trajectoryBorder = '#c7d2fe';
      trajectoryDetail = 'Demonstrating competent application of biological claims, reasoning, and ATL skill routines.';
    } else {
      trajectoryHeadline = 'Developing Foundational Skills';
      trajectoryColor = '#b45309';
      trajectoryBg = '#fffbeb';
      trajectoryBorder = '#fde68a';
      trajectoryDetail = 'Building foundational scientific inquiry habits with scaffolded teacher support.';
    }
  }

  // 5 ATL Categories Breakdown
  const ATL_CATEGORIES: { name: string; key: ATLCategoryKey; clusters: string }[] = [
    { name: 'Thinking', key: 'Thinking', clusters: 'Critical thinking, Creative thinking, Transfer' },
    { name: 'Communication', key: 'Communication', clusters: 'Communication & scientific literacy' },
    { name: 'Social', key: 'Social', clusters: 'Collaboration & peer synthesis' },
    { name: 'Self-management', key: 'Self-management', clusters: 'Organization, Affective & Reflection' },
    { name: 'Research', key: 'Research', clusters: 'Information literacy & Media literacy' }
  ];

  const categoryBreakdownHtml = ATL_CATEGORIES.map((cat) => {
    const catLogs = sortedLogs.filter((l) => (l.category || '').toLowerCase() === cat.key.toLowerCase());
    const catScores = catLogs
      .map((l) => getTaskEffectiveScore(l))
      .filter((s): s is number => typeof s === 'number');
    const catAvg = catScores.length > 0 ? (catScores.reduce((a, b) => a + b, 0) / catScores.length).toFixed(1) : '—';
    const catClustersTargeted = Array.from(new Set(catLogs.map((l) => l.cluster).filter(Boolean)));
    const percentWidth = catScores.length > 0 ? Math.min(100, Math.round((Number(catAvg) / 8) * 100)) : 0;

    return `
      <tr>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e1b4b;">
          ${sanitize(cat.name)}
          <div style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${sanitize(cat.clusters)}</div>
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">
          ${catLogs.length} task${catLogs.length === 1 ? '' : 's'}
          ${catClustersTargeted.length > 0 ? `<div style="font-size: 8pt; color: #6366f1;">${catClustersTargeted.length} cluster(s)</div>` : ''}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          ${catAvg !== '—' ? `<span style="font-weight: bold; color: #1e1b4b; background-color: #f1f5f9; padding: 2px 7px; border-radius: 4px;">${catAvg}/8</span>` : '<span style="color: #94a3b8;">Not Assessed</span>'}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; width: 140px;">
          <div style="background-color: #e2e8f0; border-radius: 4px; height: 9px; width: 100%; overflow: hidden;">
            <div style="background-color: #4f46e5; height: 100%; width: ${percentWidth}%;"></div>
          </div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 2px; text-align: right;">${percentWidth}% mastery</div>
        </td>
      </tr>
    `;
  }).join('');

  // MYP Criteria Distribution
  const criteriaKeys = [
    { label: 'Criterion A: Knowing and understanding', code: 'Criterion A' },
    { label: 'Criterion B: Inquiring and designing', code: 'Criterion B' },
    { label: 'Criterion C: Processing and evaluating', code: 'Criterion C' },
    { label: 'Criterion D: Reflecting on the impacts of science', code: 'Criterion D' }
  ];

  const criteriaRowsHtml = criteriaKeys.map((crit) => {
    const critLogs = sortedLogs.filter((l) => (l.criteria || []).some((c) => c.includes(crit.code)));
    const critScores = critLogs
      .map((l) => getTaskEffectiveScore(l))
      .filter((s): s is number => typeof s === 'number');
    const critAvg = critScores.length > 0 ? (critScores.reduce((a, b) => a + b, 0) / critScores.length).toFixed(1) : '—';

    return `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="font-size: 9pt; color: #1e293b;">${sanitize(crit.label)}</strong>
          <div style="font-size: 8pt; color: #64748b;">${critLogs.length} inquiry tasks aligned</div>
        </div>
        <div style="text-align: right;">
          ${critAvg !== '—' ? `<span style="font-weight: bold; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px; font-size: 9pt;">${critAvg} / 8</span>` : '<span style="font-size: 8.5pt; color: #94a3b8;">Pending Inquiries</span>'}
        </div>
      </div>
    `;
  }).join('');

  // Chronological Task History Rows
  const chronologicalTaskRowsHtml = sortedLogs.map((log, index) => {
    const score = getTaskEffectiveScore(log);
    const isGraded = isTaskLogGraded(log);
    const level = log.teacherEvaluation?.level || log.level || 'Applying';
    const scoreBarWidth = score ? Math.min(100, Math.round((score / 8) * 100)) : 0;

    const levelBadgeColor =
      level === 'Extending' ? '#047857' : level === 'Applying' ? '#4338ca' : '#b45309';
    const levelBadgeBg =
      level === 'Extending' ? '#ecfdf5' : level === 'Applying' ? '#eef2ff' : '#fffbeb';
    const levelBadgeBorder =
      level === 'Extending' ? '#a7f3d0' : level === 'Applying' ? '#c7d2fe' : '#fde68a';

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 10px; font-size: 8.5pt; color: #64748b; white-space: nowrap;">
          <strong>#${index + 1}</strong> • ${sanitize(log.date || 'N/A')}
          <div style="font-size: 8pt; color: #94a3b8;">${sanitize(log.term || '')}</div>
        </td>
        <td style="padding: 8px 10px; font-size: 9pt;">
          <div style="font-weight: bold; color: #0f172a;">${sanitize(log.taskTitle || 'Scientific Inquiry Task')}</div>
          <div style="font-size: 8pt; color: #64748b;">${sanitize(log.subject)} — ${sanitize(log.topic)}</div>
          ${
            log.criteria && log.criteria.length > 0
              ? `<div style="font-size: 7.5pt; color: #059669; margin-top: 2px;">Target: ${sanitize(log.criteria.join(', '))}</div>`
              : ''
          }
        </td>
        <td style="padding: 8px 10px; font-size: 8.5pt;">
          <div style="font-weight: bold; color: #4338ca;">${sanitize(log.cluster)}</div>
          <div style="font-size: 8pt; color: #64748b;">${sanitize(log.category)}</div>
        </td>
        <td style="padding: 8px 10px; text-align: center; white-space: nowrap;">
          ${
            isGraded && typeof score === 'number'
              ? `
              <div style="font-weight: bold; font-size: 10pt; color: #1e1b4b;">${score} / 8</div>
              <div style="background-color: #e2e8f0; border-radius: 3px; height: 5px; width: 55px; margin: 2px auto 4px auto; overflow: hidden;">
                <div style="background-color: ${levelBadgeColor}; height: 100%; width: ${scoreBarWidth}%;"></div>
              </div>
              <span style="font-size: 7.5pt; font-weight: bold; color: ${levelBadgeColor}; background-color: ${levelBadgeBg}; border: 1px solid ${levelBadgeBorder}; padding: 1px 6px; border-radius: 4px;">
                ${sanitize(level)}
              </span>
            `
              : `
              <span style="font-size: 8pt; color: #b45309; background-color: #fffbeb; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                Pending Evaluation
              </span>
            `
          }
        </td>
        <td style="padding: 8px 10px; font-size: 8pt; color: #334155; line-height: 1.35; max-width: 200px;">
          ${sanitize(log.feedback?.summary || log.teacherEvaluation?.feedback || 'Inquiry assessment completed.')}
        </td>
      </tr>
    `;
  }).join('');

  // Detailed Task Portfolio Cards (Avoid break inside)
  const detailedTaskCardsHtml = sortedLogs.map((log, index) => {
    const score = getTaskEffectiveScore(log);
    const isGraded = isTaskLogGraded(log);
    const level = log.teacherEvaluation?.level || log.level || 'Applying';
    const strengths = log.feedback?.strengths || log.teacherEvaluation?.strengths || [];
    const nextSteps = log.feedback?.next_steps || log.teacherEvaluation?.nextSteps || [];
    const badge = log.badgeAwarded || log.teacherEvaluation?.badgeAwarded;
    const reflection = log.studentReflection || log.metacognitiveReflection;

    const levelBadgeColor =
      level === 'Extending' ? '#047857' : level === 'Applying' ? '#4338ca' : '#b45309';
    const levelBadgeBg =
      level === 'Extending' ? '#ecfdf5' : level === 'Applying' ? '#eef2ff' : '#fffbeb';

    return `
      <div class="page-break-avoid" style="margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; padding: 12px 14px; page-break-inside: avoid; break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #6366f1;">
              Inquiry Task #${index + 1} • ${sanitize(log.date || 'N/A')} • ${sanitize(log.term || 'Academic Term')}
            </div>
            <div style="font-size: 11pt; font-weight: bold; color: #0f172a; margin-top: 1px;">
              ${sanitize(log.taskTitle || 'Scientific Inquiry Task')}
            </div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 1px;">
              ${sanitize(log.subject)} (MYP ${sanitize(log.mypYear || '')}) — <strong>${sanitize(log.topic)}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            ${
              isGraded && typeof score === 'number'
                ? `
                <div style="font-size: 14pt; font-weight: 800; color: #1e1b4b;">${score} <span style="font-size: 9pt; color: #64748b; font-weight: normal;">/ 8</span></div>
                <span style="display: inline-block; font-size: 8pt; font-weight: bold; color: ${levelBadgeColor}; background-color: ${levelBadgeBg}; padding: 2px 8px; border-radius: 4px; margin-top: 2px;">
                  ${sanitize(level)}
                </span>
              `
                : `
                <span style="display: inline-block; font-size: 8pt; font-weight: bold; color: #b45309; background-color: #fffbeb; padding: 2px 8px; border-radius: 4px;">
                  Awaiting Review
                </span>
              `
            }
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 8pt; color: #475569; margin-bottom: 8px; background-color: #f8fafc; padding: 6px 10px; border-radius: 6px;">
          <div><strong>ATL Focus:</strong> <span style="color: #4338ca; font-weight: bold;">${sanitize(log.cluster)}</span> (${sanitize(log.category)})</div>
          ${log.criteria && log.criteria.length > 0 ? `<div><strong>Criteria:</strong> ${sanitize(log.criteria.join(', '))}</div>` : ''}
          ${log.strands && log.strands.length > 0 ? `<div><strong>Strands:</strong> ${sanitize(log.strands.join(' • '))}</div>` : ''}
          ${log.attemptNumber && log.attemptNumber > 1 ? `<div><strong>Attempt:</strong> #${log.attemptNumber}</div>` : ''}
        </div>

        ${
          badge
            ? `
            <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; margin-bottom: 8px; font-size: 8pt; color: #92400e;">
              <strong>★ Badge Awarded:</strong> ${sanitize(badge.name)} — <em>${sanitize(badge.description)}</em>
            </div>
          `
            : ''
        }

        <div style="font-size: 8.5pt; color: #1e293b; margin-bottom: 8px; line-height: 1.45;">
          <strong>Teacher Feedback & Scientific Corrections:</strong><br/>
          ${sanitize(formatTeacherComment(log.feedback?.summary || log.teacherEvaluation?.feedback || 'Student completed scientific inquiry response.'))}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 8pt; margin-bottom: 8px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px;">
            <strong style="color: #166534; display: block; margin-bottom: 3px;">✓ Demonstrated Strengths (What You Did Well):</strong>
            ${
              strengths.length > 0
                ? `<ul style="margin: 0; padding-left: 14px; color: #14532d; line-height: 1.35;">
                    ${strengths.map((s) => `<li style="margin-bottom: 2px;">${sanitize(formatTeacherComment(s))}</li>`).join('')}
                  </ul>`
                : '<span style="color: #15803d;">Demonstrated solid biological reasoning.</span>'
            }
          </div>

          <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 8px 10px;">
            <strong style="color: #3730a3; display: block; margin-bottom: 3px;">→ How to Write Scientifically Correctly (Errors & Fixes):</strong>
            ${
              nextSteps.length > 0
                ? `<ul style="margin: 0; padding-left: 14px; color: #312e81; line-height: 1.35;">
                    ${nextSteps.map((ns) => `<li style="margin-bottom: 2px;">${sanitize(formatTeacherComment(ns))}</li>`).join('')}
                  </ul>`
                : '<span style="color: #4338ca;">Continue applying evidence-based justifications.</span>'
            }
          </div>
        </div>

        ${
          reflection
            ? `
            <div style="background-color: #fdf4ff; border: 1px solid #f5d0fe; border-left: 3px solid #c026d3; border-radius: 6px; padding: 6px 10px; font-size: 8pt; color: #701a75;">
              <strong>Student Metacognitive Reflection:</strong> "${sanitize(reflection)}"
            </div>
          `
            : ''
        }

        ${
          log.feedback ? renderEvaluatedWordsHtml(log.feedback, sanitize) : ''
        }

        ${(() => {
          const taskStimulusImages =
            (log.stimulusImages && log.stimulusImages.length > 0)
              ? log.stimulusImages
              : (log.originalTask?.stimulusImages && log.originalTask.stimulusImages.length > 0)
              ? log.originalTask.stimulusImages
              : generateStimulusImagesForTopic(log.topic, log.subject);

          const studentWorkImages =
            (log.studentAttachments && log.studentAttachments.length > 0)
              ? log.studentAttachments
              : log.responses?.flatMap((r) => r.attachments || []) || [];

          return `
            <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
              ${log.originalTask?.context ? `
                <div style="font-size: 8pt; color: #475569; margin-bottom: 6px; font-style: italic; background: #f8fafc; padding: 6px; border-radius: 4px;">
                  <strong>Question Context:</strong> ${sanitize(log.originalTask.context)}
                </div>
              ` : ''}

              ${taskStimulusImages && taskStimulusImages.length > 0 ? `
                <div style="margin-bottom: 8px;">
                  <div style="font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #4338ca; margin-bottom: 4px;">
                    Question Paper Attached Images (${taskStimulusImages.length}):
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${taskStimulusImages.slice(0, 3).map((img, i) => `
                      <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; background: #ffffff; text-align: center; max-width: 180px;">
                        <img src="${img.url}" alt="${sanitize(img.caption || 'Stimulus')}" style="max-height: 110px; max-width: 100%; object-fit: contain; border-radius: 3px;" />
                        <div style="font-size: 7pt; color: #64748b; margin-top: 2px;">${sanitize(img.name || img.caption || `Diagram ${i + 1}`)}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${log.responses && log.responses.length > 0 ? `
                <div style="font-size: 8pt; font-weight: bold; color: #334155; margin-bottom: 4px; text-transform: uppercase;">
                  Assigned Questions & Student Submitted Answers:
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${log.responses.map((r, i) => `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; font-size: 8pt;">
                      <div style="font-weight: bold; color: #1e1b4b; margin-bottom: 2px;">
                        <span style="color: #4f46e5;">Part ${sanitize(r.label || String.fromCharCode(65 + i))}:</span> ${sanitize(r.prompt)}
                      </div>
                      <div style="color: #334155; font-size: 8pt; background: #ffffff; padding: 4px 6px; border-radius: 3px; border: 1px solid #f1f5f9;">
                        ${r.claim || r.evidence || r.reasoning ? `
                          ${r.claim ? `<div><strong style="color: #1e40af;">Claim:</strong> ${sanitize(r.claim)}</div>` : ''}
                          ${r.evidence ? `<div><strong style="color: #065f46;">Evidence:</strong> ${sanitize(r.evidence)}</div>` : ''}
                          ${r.reasoning ? `<div><strong style="color: #6b21a8;">Reasoning:</strong> ${sanitize(r.reasoning)}</div>` : ''}
                        ` : (r.response ? sanitize(r.response) : '<em style="color: #94a3b8;">(Left blank)</em>')}
                      </div>
                      ${r.attachments && r.attachments.length > 0 ? `
                        <div style="margin-top: 4px; display: flex; gap: 6px;">
                          ${r.attachments.map((att) => `
                            <img src="${att.url}" alt="${sanitize(att.caption || 'Student work')}" style="max-height: 80px; max-width: 100px; object-fit: contain; border-radius: 3px; border: 1px solid #cbd5e1;" />
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${studentWorkImages && studentWorkImages.length > 0 ? `
                <div style="margin-top: 6px;">
                  <div style="font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #047857; margin-bottom: 4px;">
                    Student Attached Work Evidence (${studentWorkImages.length}):
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${studentWorkImages.map((img) => `
                      <img src="${img.url}" alt="${sanitize(img.caption || 'Student artifact')}" style="max-height: 90px; max-width: 120px; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1;" />
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        })()}
      </div>
    `;
  }).join('');

  const reportDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>IB MYP ATL Student Progress Report - ${sanitize(params.studentName)}</title>
      <style>
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          margin: 0;
          padding: 24px;
          line-height: 1.45;
          font-size: 9.5pt;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 10mm 10mm;
          }
          body {
            padding: 0;
          }
        }
        .page-break-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .page-break-before {
          page-break-before: always;
          break-before: always;
        }
        .header-banner {
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .institution-title {
          font-size: 8pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #4338ca;
        }
        .report-title {
          font-size: 18pt;
          font-weight: 900;
          color: #1e1b4b;
          letter-spacing: -0.5px;
          margin: 4px 0 2px 0;
        }
        .report-subtitle {
          font-size: 9.5pt;
          color: #475569;
          font-weight: 500;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 12px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .kpi-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
        }
        .kpi-label {
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 15pt;
          font-weight: 900;
          color: #1e1b4b;
        }
        .kpi-sub {
          font-size: 7.5pt;
          color: #475569;
          margin-top: 2px;
          font-weight: 500;
        }
        .section-header {
          font-size: 10.5pt;
          font-weight: 800;
          color: #1e1b4b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 4px;
          margin: 18px 0 10px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        table.standard-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 8.5pt;
        }
        table.standard-table th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 7.5pt;
          letter-spacing: 0.5px;
          padding: 7px 10px;
          border-bottom: 1px solid #cbd5e1;
          text-align: left;
        }
        .legend-box {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 14px;
          margin-top: 20px;
          font-size: 8pt;
        }
        .signoff-section {
          margin-top: 24px;
          border-top: 1px solid #cbd5e1;
          padding-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          font-size: 8.5pt;
        }
      </style>
    </head>
    <body>
      <div style="max-width: 780px; margin: 0 auto;">
        <!-- Header Banner -->
        <div class="header-banner">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="institution-title">
                ${sanitize(params.schoolName || 'International Baccalaureate (IB) World School')} • Middle Years Programme (MYP)
              </div>
              <h1 class="report-title">Student ATL Progress Report</h1>
              <div class="report-subtitle">
                Approaches to Learning Skills Attainment, Formative Score Trajectory & Evidence Portfolio
              </div>
            </div>
            <div style="text-align: right; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 6px 10px;">
              <div style="font-size: 7.5pt; font-weight: bold; color: #4338ca; text-transform: uppercase;">Official Assessment Document</div>
              <div style="font-size: 8.5pt; font-weight: bold; color: #1e1b4b;">Academic Year ${sanitize(params.academicYear)}</div>
              <div style="font-size: 7.5pt; color: #64748b;">Report Date: ${sanitize(reportDate)}</div>
            </div>
          </div>
        </div>

        <!-- Student Demographics & Metadata Grid -->
        <div class="meta-grid">
          <div>
            <table style="width: 100%; font-size: 9pt;">
              <tr>
                <td style="color: #64748b; width: 110px; padding: 2px 0;"><strong>Student Name:</strong></td>
                <td style="color: #0f172a; font-weight: 800; font-size: 11pt;">${sanitize(params.studentName || 'Student')}</td>
              </tr>
              ${
                params.studentId
                  ? `<tr>
                      <td style="color: #64748b; padding: 2px 0;"><strong>Student ID:</strong></td>
                      <td style="color: #334155; font-weight: 600;">#${sanitize(params.studentId)}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="color: #64748b; padding: 2px 0;"><strong>Class & Grade:</strong></td>
                <td style="color: #1e1b4b; font-weight: 700;">${sanitize(params.classTag || 'MYP Sciences')}</td>
              </tr>
            </table>
          </div>

          <div>
            <table style="width: 100%; font-size: 9pt;">
              <tr>
                <td style="color: #64748b; width: 110px; padding: 2px 0;"><strong>Reporting Scope:</strong></td>
                <td style="color: #0f172a; font-weight: 600;">${sanitize(params.term || 'Full Academic Year')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 2px 0;"><strong>Inquiries Assessed:</strong></td>
                <td style="color: #0f172a; font-weight: 700;">${totalTasks} Tasks Logged (${totalGraded} Graded)</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 2px 0;"><strong>Assessing Teacher:</strong></td>
                <td style="color: #4338ca; font-weight: 700;">${sanitize(params.teacherName || 'MYP Sciences Department')}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Executive Performance KPIs -->
        <div class="kpi-container">
          <div class="kpi-card" style="border-top: 3px solid #4f46e5;">
            <div class="kpi-label">Average Formative Score</div>
            <div class="kpi-value">${avgScore ? `${avgScore} <span style="font-size: 10pt; color: #64748b; font-weight: normal;">/ 8</span>` : 'N/A'}</div>
            <div class="kpi-sub">
              ${
                avgScore && Number(avgScore) >= 6
                  ? 'Extending Band (High)'
                  : avgScore && Number(avgScore) >= 4
                  ? 'Applying Band (Competent)'
                  : 'Developing Band'
              }
            </div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid #059669;">
            <div class="kpi-label">ATL Skill Coverage</div>
            <div class="kpi-value">${clusterCoverageCount} <span style="font-size: 10pt; color: #64748b; font-weight: normal;">/ 10</span></div>
            <div class="kpi-sub">${clusterCoveragePercent}% of All IB Clusters</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid #0284c7;">
            <div class="kpi-label">Attainment Profile</div>
            <div class="kpi-value" style="font-size: 11pt; margin-top: 4px;">
              <span style="color: #047857; font-weight: 800;">${extendingCount} Ext</span> •
              <span style="color: #4338ca; font-weight: 800;">${applyingCount} App</span> •
              <span style="color: #b45309; font-weight: 800;">${developingCount} Dev</span>
            </div>
            <div class="kpi-sub">${totalGraded} Evaluated Inquiries</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid #d97706;">
            <div class="kpi-label">Score Range</div>
            <div class="kpi-value" style="font-size: 13pt;">
              ${highestScore !== null ? `${lowestScore} - ${highestScore}` : '—'}
              <span style="font-size: 9pt; color: #64748b; font-weight: normal;">/ 8</span>
            </div>
            <div class="kpi-sub">${pendingLogs.length > 0 ? `${pendingLogs.length} pending review` : 'All tasks evaluated'}</div>
          </div>
        </div>

        <!-- Performance Trajectory Box -->
        <div class="page-break-avoid" style="background-color: ${trajectoryBg}; border: 1px solid ${trajectoryBorder}; border-left: 4px solid ${trajectoryColor}; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <strong style="font-size: 9.5pt; color: ${trajectoryColor}; text-transform: uppercase; letter-spacing: 0.5px;">
              Performance Trend: ${sanitize(trajectoryHeadline)}
            </strong>
            <span style="font-size: 8pt; font-weight: bold; color: ${trajectoryColor}; background-color: #ffffff; border: 1px solid ${trajectoryBorder}; padding: 1px 6px; border-radius: 4px;">
              ATL Continuum Status
            </span>
          </div>
          <p style="font-size: 9pt; color: #1e293b; margin: 0; line-height: 1.4;">
            ${sanitize(trajectoryDetail)}
          </p>
        </div>

        ${
          params.overallNotes
            ? `
            <div class="page-break-avoid" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #4338ca; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
              <strong style="font-size: 9pt; color: #1e1b4b; display: block; margin-bottom: 4px; text-transform: uppercase;">
                Teacher Stakeholder Commentary & Guidance:
              </strong>
              <div style="font-size: 9pt; color: #334155; line-height: 1.45; white-space: pre-wrap;">
                ${sanitize(params.overallNotes)}
              </div>
            </div>
          `
            : ''
        }

        <!-- Section 1: Performance Trends & Chronological Trajectory Table -->
        <div class="page-break-avoid">
          <div class="section-header">
            <span>1. Chronological Performance Trajectory & Formative Scores</span>
            <span style="font-size: 8pt; font-weight: normal; color: #64748b;">${sortedLogs.length} Inquiry Logs</span>
          </div>
          <table class="standard-table">
            <thead>
              <tr>
                <th style="width: 85px;">Date & Term</th>
                <th>Inquiry Task & Subject Topic</th>
                <th style="width: 140px;">Target ATL Skill</th>
                <th style="width: 90px; text-align: center;">Score & Level</th>
                <th style="width: 180px;">Teacher Observations</th>
              </tr>
            </thead>
            <tbody>
              ${chronologicalTaskRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Section 2: ATL Skill Category Mastery Matrix & Criteria Alignment -->
        <div class="page-break-avoid" style="margin-top: 14px;">
          <div class="section-header">
            <span>2. Approaches to Learning (ATL) Category Mastery Matrix</span>
            <span style="font-size: 8pt; font-weight: normal; color: #64748b;">5 IB MYP ATL Categories</span>
          </div>

          <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div>
              <table class="standard-table" style="margin-bottom: 0;">
                <thead>
                  <tr>
                    <th>ATL Category & Clusters</th>
                    <th style="text-align: center;">Tasks</th>
                    <th style="text-align: center;">Avg (/8)</th>
                    <th>Mastery Gauge</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryBreakdownHtml}
                </tbody>
              </table>
            </div>

            <div>
              <div style="font-size: 8.5pt; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px; letter-spacing: 0.5px;">
                Sciences Assessment Criteria Alignment:
              </div>
              ${criteriaRowsHtml}
            </div>
          </div>
        </div>

        <!-- Section 3: Detailed Inquiries & Evidence Portfolio -->
        <div style="margin-top: 18px;">
          <div class="section-header">
            <span>3. Assessed Inquiries & Formative Evidence Portfolio</span>
            <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Detailed Rubric Diagnostic Notes</span>
          </div>
          ${detailedTaskCardsHtml}
        </div>

        <!-- Section 4: IB MYP Assessment Legend for Stakeholders -->
        <div class="legend-box page-break-avoid">
          <strong style="color: #1e1b4b; font-size: 8.5pt; text-transform: uppercase; display: block; margin-bottom: 4px;">
            Stakeholder Guidance: Understanding IB MYP ATL Scores & Attainment Levels
          </strong>
          <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 4px;">
            <tr>
              <td style="padding: 4px 6px; width: 33%; vertical-align: top; border-right: 1px solid #e2e8f0;">
                <strong style="color: #047857;">Extending (7 - 8 / 8):</strong><br/>
                Student transfers ATL skills autonomously across unfamiliar, complex biological contexts. High-order synthesis, evaluation, and nuanced evidence-based justification.
              </td>
              <td style="padding: 4px 6px; width: 33%; vertical-align: top; border-right: 1px solid #e2e8f0;">
                <strong style="color: #4338ca;">Applying (4 - 6 / 8):</strong><br/>
                Student reliably and competently applies scientific reasoning and targeted ATL strategies with consistency. Clear claims supported by appropriate empirical evidence.
              </td>
              <td style="padding: 4px 6px; width: 34%; vertical-align: top;">
                <strong style="color: #b45309;">Developing (1 - 3 / 8):</strong><br/>
                Student exhibits emerging awareness of ATL thinking routines and scientific concepts. Requires scaffolded guidance, prompts, or structured templates to justify conclusions.
              </td>
            </tr>
          </table>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            * In the IB Middle Years Programme, Approaches to Learning (ATL) skills represent learning how to learn. Formative evaluations are designed to diagnose growth, target constructive feedback, and build intellectual habits for the IB Diploma Programme and beyond.
          </div>
        </div>

        <!-- Sign-Off Section -->
        <div class="signoff-section page-break-avoid">
          <div>
            <div style="font-size: 8pt; color: #64748b; margin-bottom: 24px;">Assessing Teacher / Educator:</div>
            <div style="font-weight: bold; color: #0f172a; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">
              ${sanitize(params.teacherName || 'Subject Teacher')}
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Signature & Verification</div>
          </div>

          <div>
            <div style="font-size: 8pt; color: #64748b; margin-bottom: 24px;">Date of Evaluation:</div>
            <div style="font-weight: bold; color: #0f172a; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">
              ${sanitize(reportDate)}
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Official Reporting Date</div>
          </div>

          <div>
            <div style="font-size: 8pt; color: #64748b; margin-bottom: 24px;">MYP Coordinator / Department Stamp:</div>
            <div style="font-weight: bold; color: #4338ca; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">
              IB MYP Sciences Faculty
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Programme Endorsement</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Downloads a publication-ready high-resolution PDF of the student's complete
 * Approaches to Learning (ATL) progress report using html2pdf.js.
 */
export async function exportStudentProgressReportToPdf(params: StudentProgressReportParams): Promise<void> {
  const htmlContent = generateStudentProgressReportHtml(params);
  const element = document.createElement('div');
  element.id = 'atl-student-progress-report-pdf-target';
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '0';
  element.style.width = '780px';
  element.style.backgroundColor = '#ffffff';
  element.style.color = '#0f172a';
  element.style.zIndex = '-9999';
  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  const cleanStudentName = (params.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanYear = (params.academicYear || 'Year').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fileName = `ATL_Progress_Report_${cleanStudentName}_${cleanYear}.pdf`;

  const opt = {
    margin: [8, 10, 8, 10] as [number, number, number, number],
    filename: fileName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 780
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;
    await html2pdf().set(opt).from(element).save();
  } finally {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }
}

/**
 * Opens the print preview window for the student progress report,
 * enabling immediate browser printing or native "Save as PDF".
 */
export function printStudentProgressReport(params: StudentProgressReportParams): void {
  const htmlContent = generateStudentProgressReportHtml(params);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback if popups are blocked: export to PDF directly
    exportStudentProgressReportToPdf(params);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Trigger print once DOM has finished loading
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

/* ========================================================================== */
/* CLASS RECORD & EVIDENCE PORTFOLIO EXPORT SYSTEM                            */
/* ========================================================================== */

export interface ClassRecordReportParams {
  classKey: string; // '1' | '2' | '3' | '4' | '5' | 'All'
  className: string; // e.g. 'MYP 1 (Grade 6 · Ages 11–12)'
  academicYear: string;
  term?: string;
  subject?: string;
  teacherName?: string;
  schoolName?: string;
  logs: ATLTaskLog[];
  assignedTasks?: AssignedTask[];
  classStudents?: StudentRecord[];
  onlySubmittedStudents?: boolean; // When true, filters out students who have not completed any tasks
  includeStudentAnswersAppendix?: boolean; // When true, places full student answers in a detachable Part II appendix
}

/**
 * Generates an inline SVG vector line chart for Class Longitudinal ATL Growth Curve.
 */
function generateClassGrowthCurveSvg(
  points: { label: string; score: number; date: string; taskTitle: string }[],
  width = 720,
  height = 220
): string {
  if (!points || points.length === 0) {
    return `
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; color: #64748b; font-size: 9pt;">
        No chronological formative score data logged yet for this class cohort.
      </div>
    `;
  }

  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const yMax = 8;
  const yMin = 0;

  const getY = (val: number) => padTop + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
  const getX = (idx: number) => {
    if (points.length === 1) return padLeft + chartW / 2;
    return padLeft + (idx / (points.length - 1)) * chartW;
  };

  // Background benchmark bands
  const yExt = getY(7);
  const yApp = getY(4);
  const yBase = getY(0);

  const polyPoints = points.map((p, i) => `${getX(i).toFixed(1)},${getY(p.score).toFixed(1)}`).join(' ');
  const areaPoints = `${getX(0).toFixed(1)},${yBase} ${polyPoints} ${getX(points.length - 1).toFixed(1)},${yBase}`;

  const avgScore = points.reduce((acc, p) => acc + p.score, 0) / points.length;
  const yAvg = getY(avgScore);

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; margin: 0 auto; background: #ffffff; border-radius: 8px;">
      <defs>
        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      <!-- Benchmark colored bands -->
      <rect x="${padLeft}" y="${getY(8)}" width="${chartW}" height="${yExt - getY(8)}" fill="#ecfdf5" opacity="0.75" />
      <rect x="${padLeft}" y="${yExt}" width="${chartW}" height="${yApp - yExt}" fill="#eef2ff" opacity="0.75" />
      <rect x="${padLeft}" y="${yApp}" width="${chartW}" height="${yBase - yApp}" fill="#fffbeb" opacity="0.6" />

      <!-- Horizontal gridlines and score labels -->
      ${[2, 4, 6, 7, 8].map((s) => {
        const y = getY(s);
        return `
          <line x1="${padLeft}" y1="${y}" x2="${padLeft + chartW}" y2="${y}" stroke="#cbd5e1" stroke-dasharray="${s === 7 ? '0' : '3,3'}" stroke-width="${s === 7 ? '1.5' : '1'}" />
          <text x="${padLeft - 8}" y="${y + 3.5}" text-anchor="end" font-size="8.5" fill="#64748b" font-weight="bold">${s}</text>
        `;
      }).join('')}

      <!-- Benchmark Zone Labels on Right -->
      <text x="${padLeft + chartW - 6}" y="${getY(7.5) + 3}" text-anchor="end" font-size="7.5" font-weight="bold" fill="#059669">EXTENDING (7-8)</text>
      <text x="${padLeft + chartW - 6}" y="${getY(5.5) + 3}" text-anchor="end" font-size="7.5" font-weight="bold" fill="#4338ca">APPLYING (4-6)</text>
      <text x="${padLeft + chartW - 6}" y="${getY(2.5) + 3}" text-anchor="end" font-size="7.5" font-weight="bold" fill="#d97706">DEVELOPING (1-3)</text>

      <!-- Cohort Average Dashed Line -->
      <line x1="${padLeft}" y1="${yAvg}" x2="${padLeft + chartW}" y2="${yAvg}" stroke="#059669" stroke-width="1.8" stroke-dasharray="5,4" />
      <text x="${padLeft + 8}" y="${yAvg - 4}" font-size="8" font-weight="bold" fill="#047857">Cohort Average: ${avgScore.toFixed(1)} / 8</text>

      <!-- Shaded Area Under Curve -->
      <polygon points="${areaPoints}" fill="url(#growthGrad)" />

      <!-- Polyline Curve -->
      <polyline points="${polyPoints}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Points with Score Badges and Dates -->
      ${points.map((p, i) => {
        const cx = getX(i);
        const cy = getY(p.score);
        return `
          <g>
            <circle cx="${cx}" cy="${cy}" r="5" fill="#ffffff" stroke="#4338ca" stroke-width="2.5" />
            <rect x="${cx - 15}" y="${cy - 20}" width="30" height="14" rx="4" fill="#1e1b4b" opacity="0.9" />
            <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="8" font-weight="bold" fill="#ffffff">${p.score.toFixed(1)}</text>
            <text x="${cx}" y="${padTop + chartH + 16}" text-anchor="middle" font-size="8" fill="#334155" font-weight="600">${p.date ? p.date.substring(5) : `Task #${i + 1}`}</text>
            <text x="${cx}" y="${padTop + chartH + 28}" text-anchor="middle" font-size="7" fill="#64748b">${p.label || `T${i + 1}`}</text>
          </g>
        `;
      }).join('')}

      <!-- Bottom X Axis Line -->
      <line x1="${padLeft}" y1="${yBase}" x2="${padLeft + chartW}" y2="${yBase}" stroke="#94a3b8" stroke-width="1.5" />
      <text x="${padLeft + chartW / 2}" y="${height - 4}" text-anchor="middle" font-size="8" font-weight="bold" fill="#64748b">Chronological Tasks & Inquiries Till Date</text>
    </svg>
  `;
}

/**
 * Generates an inline SVG mini sparkline for an individual student in a table row.
 */
function generateStudentGrowthCurveMiniSvg(scores: number[], width = 110, height = 26): string {
  if (!scores || scores.length === 0) return '<span style="color:#94a3b8;font-size:7.5pt;">—</span>';
  if (scores.length === 1) {
    return `<span style="font-weight:bold;color:#4f46e5;font-size:8.5pt;">${scores[0]} / 8</span>`;
  }

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const min = 1;
  const max = 8;

  const getY = (v: number) => pad + h - ((v - min) / (max - min)) * h;
  const getX = (i: number) => pad + (i / (scores.length - 1)) * w;

  const pointsStr = scores.map((s, i) => `${getX(i).toFixed(1)},${getY(s).toFixed(1)}`).join(' ');
  const latestScore = scores[scores.length - 1];
  const firstScore = scores[0];
  const isUp = latestScore >= firstScore;
  const strokeColor = isUp ? '#059669' : '#d97706';

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: ${width}px; height: ${height}px; vertical-align: middle; display: inline-block;">
      <polyline points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${getX(scores.length - 1).toFixed(1)}" cy="${getY(latestScore).toFixed(1)}" r="3" fill="${strokeColor}" />
    </svg>
  `;
}

/**
 * Generates an inline SVG representation of a scientific dataset (Line / Bar graph).
 */
function generateScientificDatasetSvg(dataset: any, width = 680, height = 200): string {
  if (!dataset) return '';
  const dataPoints: Array<{ x: any; y: any; note?: string }> = dataset.data_points || dataset.data || [];
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) return '';

  const padLeft = 50;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const numVals = dataPoints.map((d) => Number(d.y)).filter((n) => !isNaN(n));
  if (numVals.length === 0) return '';

  const minY = Math.min(0, Math.min(...numVals));
  const maxY = Math.max(10, Math.max(...numVals) * 1.15);

  const getY = (v: number) => padTop + chartH - ((v - minY) / (maxY - minY || 1)) * chartH;
  const getX = (i: number) => {
    if (dataPoints.length === 1) return padLeft + chartW / 2;
    return padLeft + (i / (dataPoints.length - 1)) * chartW;
  };

  const pointsStr = dataPoints.map((d, i) => `${getX(i).toFixed(1)},${getY(Number(d.y)).toFixed(1)}`).join(' ');

  return `
    <div style="margin-top: 8px; margin-bottom: 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; page-break-inside: avoid; break-inside: avoid;">
      <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #1e1b4b; margin-bottom: 6px;">
        Scientific Graphical Representation: ${dataset.title || 'Experimental Dataset'}
      </div>
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-height: 200px; font-family: sans-serif; display: block;">
        <!-- Axes -->
        <line x1="${padLeft}" y1="${padTop + chartH}" x2="${padLeft + chartW}" y2="${padTop + chartH}" stroke="#64748b" stroke-width="1.5" />
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + chartH}" stroke="#64748b" stroke-width="1.5" />

        <!-- Gridlines -->
        ${[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = minY + (maxY - minY) * pct;
          const y = getY(val);
          return `
            <line x1="${padLeft}" y1="${y}" x2="${padLeft + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
            <text x="${padLeft - 6}" y="${y + 3}" text-anchor="end" font-size="7.5" fill="#64748b">${val.toFixed(1)}</text>
          `;
        }).join('')}

        <!-- Trend Line -->
        <polyline points="${pointsStr}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Points -->
        ${dataPoints.map((d, i) => `
          <circle cx="${getX(i)}" cy="${getY(Number(d.y))}" r="4" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" />
          <text x="${getX(i)}" y="${padTop + chartH + 14}" text-anchor="middle" font-size="7" fill="#475569">${String(d.x)}</text>
        `).join('')}

        <!-- Axis Labels -->
        <text x="${padLeft + chartW / 2}" y="${height - 4}" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#334155">${dataset.independent_variable || dataset.x_axis_label || 'Independent Variable (X)'}</text>
        <text x="14" y="${padTop + chartH / 2}" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#334155" transform="rotate(-90 14 ${padTop + chartH / 2})">${dataset.dependent_variable || dataset.y_axis_label || 'Dependent Variable (Y)'}</text>
      </svg>
    </div>
  `;
}

/**
 * Generates the complete, high-resolution Institutional Class Record & Evidence Portfolio HTML document.
 * Includes:
 * 1. Official IB Programme & Institutional Header
 * 2. Class Longitudinal ATL Growth Curve & Attainment Analytics (till date)
 * 3. Class Roster Growth Table with individual trajectory & initial-to-latest scores
 * 4. Comprehensive Task Inquiries (ALL Questions visible, scenario, stimulus images, datasets & graphs)
 * 5. Student-by-Student Submitted Work, CER Evidence, Teacher Evaluations, and Quoted Phrases
 */
export function generateClassRecordHtml(params: ClassRecordReportParams): string {
  const sanitize = (text?: string | null) =>
    text ? replaceExaminerWithTeacher(String(text)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';

  const normalizeClassKey = (str?: string): string => {
    if (!str) return 'All';
    const s = str.trim().toLowerCase();
    if (s.includes('1')) return '1';
    if (s.includes('2')) return '2';
    if (s.includes('3')) return '3';
    if (s.includes('4')) return '4';
    if (s.includes('5')) return '5';
    return str;
  };

  const targetClassKey = params.classKey || 'All';

  // Filter logs for this class and academic year
  const classLogs = params.logs.filter((log) => {
    if (params.academicYear && log.academicYear !== params.academicYear) return false;
    if (targetClassKey !== 'All') {
      const lk = normalizeClassKey(log.mypYear);
      if (lk !== targetClassKey) return false;
    }
    return true;
  });

  // Sort logs chronologically
  const sortedLogs = [...classLogs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Calculate cohort performance metrics
  const gradedLogs = sortedLogs.filter(isTaskLogGraded);
  const pendingLogs = sortedLogs.filter((l) => !isTaskLogGraded(l));

  const validScores = gradedLogs
    .map((l) => getTaskEffectiveScore(l))
    .filter((s): s is number => typeof s === 'number');

  const avgClassScore =
    validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '—';
  const highestScore = validScores.length > 0 ? Math.max(...validScores) : null;
  const lowestScore = validScores.length > 0 ? Math.min(...validScores) : null;

  let extCount = 0;
  let appCount = 0;
  let devCount = 0;

  gradedLogs.forEach((l) => {
    const lvl = l.teacherEvaluation?.level || l.level || 'Applying';
    if (lvl === 'Extending') extCount++;
    else if (lvl === 'Developing') devCount++;
    else appCount++;
  });

  const totalGraded = gradedLogs.length;
  const extPct = totalGraded > 0 ? Math.round((extCount / totalGraded) * 100) : 0;
  const appPct = totalGraded > 0 ? Math.round((appCount / totalGraded) * 100) : 0;
  const devPct = totalGraded > 0 ? Math.round((devCount / totalGraded) * 100) : 0;

  // Group logs by student to compute individual growth trajectories
  const studentLogsMap: Record<string, ATLTaskLog[]> = {};
  sortedLogs.forEach((l) => {
    const name = (l.studentName || 'Anonymous').trim();
    if (!studentLogsMap[name]) studentLogsMap[name] = [];
    studentLogsMap[name].push(l);
  });

  // Filter students who have actually submitted / completed work
  const onlyDone = params.onlySubmittedStudents !== false; // Default to true: ignore unsubmitted students
  const submittedStudentNames = Object.keys(studentLogsMap)
    .filter((name) => (studentLogsMap[name] || []).length > 0)
    .sort((a, b) => a.localeCompare(b));

  const activeStudentNames = onlyDone
    ? submittedStudentNames
    : Array.from(new Set([
        ...(params.classStudents?.map((s) => s.name) || []),
        ...submittedStudentNames
      ])).sort((a, b) => a.localeCompare(b));

  // Calculate Growth Curve points across chronological tasks
  const taskGroupMap: Record<string, { date: string; title: string; scores: number[] }> = {};
  sortedLogs.forEach((l) => {
    const key = (l.taskTitle || l.topic || 'Task').trim();
    if (!taskGroupMap[key]) {
      taskGroupMap[key] = { date: l.date || '', title: key, scores: [] };
    }
    const sc = getTaskEffectiveScore(l);
    if (typeof sc === 'number') {
      taskGroupMap[key].scores.push(sc);
    }
  });

  const growthCurvePoints: { label: string; score: number; date: string; taskTitle: string }[] = [];
  Object.values(taskGroupMap).forEach((grp, idx) => {
    if (grp.scores.length > 0) {
      const avg = grp.scores.reduce((a, b) => a + b, 0) / grp.scores.length;
      growthCurvePoints.push({
        label: `Inquiry #${idx + 1}`,
        score: Number(avg.toFixed(1)),
        date: grp.date,
        taskTitle: grp.title
      });
    }
  });

  // ATL Categories Attainment Breakdown
  const ATL_CATEGORIES: { name: string; key: ATLCategoryKey }[] = [
    { name: 'Thinking', key: 'Thinking' },
    { name: 'Communication', key: 'Communication' },
    { name: 'Social', key: 'Social' },
    { name: 'Self-management', key: 'Self-management' },
    { name: 'Research', key: 'Research' }
  ];

  const categoryMasteryRowsHtml = ATL_CATEGORIES.map((cat) => {
    const catLogs = sortedLogs.filter((l) => (l.category || '').toLowerCase() === cat.key.toLowerCase());
    const catScores = catLogs
      .map((l) => getTaskEffectiveScore(l))
      .filter((s): s is number => typeof s === 'number');
    const catAvg = catScores.length > 0 ? (catScores.reduce((a, b) => a + b, 0) / catScores.length).toFixed(1) : '—';
    const percentWidth = catScores.length > 0 ? Math.min(100, Math.round((Number(catAvg) / 8) * 100)) : 0;

    return `
      <tr>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e1b4b;">
          ${sanitize(cat.name)}
        </td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">
          ${catLogs.length} task${catLogs.length === 1 ? '' : 's'}
        </td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          ${catAvg !== '—' ? `<strong style="color: #1e1b4b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${catAvg}/8</strong>` : '<span style="color: #94a3b8;">Pending</span>'}
        </td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; width: 120px;">
          <div style="background-color: #e2e8f0; border-radius: 3px; height: 8px; width: 100%; overflow: hidden;">
            <div style="background-color: #4f46e5; height: 100%; width: ${percentWidth}%;"></div>
          </div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px; text-align: right;">${percentWidth}% mastery</div>
        </td>
      </tr>
    `;
  }).join('');

  // Class Roster Growth Table Rows (Filtered by only active/submitted students)
  const studentGrowthRowsHtml = activeStudentNames.map((stName, idx) => {
    const stLogs = studentLogsMap[stName] || [];
    const stOfficial = params.classStudents?.find((s) => s.name.toLowerCase() === stName.toLowerCase());
    const rollNo = stOfficial?.id || (stLogs[0]?.studentRollNumber || stLogs[0]?.rollNumber || `ST-${100 + idx}`);
    const stScores = stLogs
      .map((l) => getTaskEffectiveScore(l))
      .filter((s): s is number => typeof s === 'number');

    const stAvg = stScores.length > 0 ? (stScores.reduce((a, b) => a + b, 0) / stScores.length).toFixed(1) : '—';
    const firstScore = stScores.length > 0 ? stScores[0] : null;
    const latestScore = stScores.length > 0 ? stScores[stScores.length - 1] : null;

    let growthDeltaText = '—';
    let growthColor = '#64748b';
    if (firstScore !== null && latestScore !== null && stScores.length > 1) {
      const diff = Number((latestScore - firstScore).toFixed(1));
      if (diff > 0) {
        growthDeltaText = `+${diff} pts ↑`;
        growthColor = '#047857';
      } else if (diff < 0) {
        growthDeltaText = `${diff} pts ↓`;
        growthColor = '#b45309';
      } else {
        growthDeltaText = `0.0 (Steady)`;
        growthColor = '#4338ca';
      }
    }

    const latestLevel =
      stLogs.length > 0
        ? (stLogs[stLogs.length - 1].teacherEvaluation?.level || stLogs[stLogs.length - 1].level || 'Applying')
        : 'Pending';

    const levelBadgeBg =
      latestLevel === 'Extending' ? '#ecfdf5' : latestLevel === 'Applying' ? '#eef2ff' : '#fffbeb';
    const levelBadgeColor =
      latestLevel === 'Extending' ? '#047857' : latestLevel === 'Applying' ? '#4338ca' : '#b45309';

    // Top cluster
    const clusterCounts: Record<string, number> = {};
    stLogs.forEach((l) => {
      if (l.cluster) clusterCounts[l.cluster] = (clusterCounts[l.cluster] || 0) + 1;
    });
    const topCluster = Object.entries(clusterCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Inquiry';

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 6px 8px; font-size: 8pt; color: #64748b; font-weight: bold; width: 45px;">
          #${idx + 1}
        </td>
        <td style="padding: 6px 8px; font-size: 8pt; color: #64748b; font-family: monospace; width: 60px;">
          ${sanitize(rollNo)}
        </td>
        <td style="padding: 6px 8px; font-size: 8.5pt; font-weight: bold; color: #0f172a;">
          ${sanitize(stName)}
          ${stOfficial?.gender ? `<span style="font-size: 7pt; color: #94a3b8; font-weight: normal; margin-left: 4px;">(${sanitize(stOfficial.gender)})</span>` : ''}
        </td>
        <td style="padding: 6px 8px; font-size: 8pt; text-align: center; color: #334155;">
          ${stLogs.length}
        </td>
        <td style="padding: 6px 8px; text-align: center;">
          ${generateStudentGrowthCurveMiniSvg(stScores, 85, 22)}
        </td>
        <td style="padding: 6px 8px; font-size: 8pt; text-align: center;">
          ${firstScore !== null && latestScore !== null ? `
            <span style="color: #64748b;">${firstScore}</span> ➔ <strong style="color: #1e1b4b;">${latestScore}</strong>
            <div style="font-size: 7pt; font-weight: bold; color: ${growthColor};">${growthDeltaText}</div>
          ` : '<span style="color: #94a3b8;">—</span>'}
        </td>
        <td style="padding: 6px 8px; font-size: 9pt; text-align: center;">
          ${stAvg !== '—' ? `<strong style="color: #1e1b4b; background: #eef2ff; padding: 2px 6px; border-radius: 4px;">${stAvg}</strong>` : '<span style="color: #94a3b8;">—</span>'}
        </td>
        <td style="padding: 6px 8px; text-align: center;">
          <span style="font-size: 7.5pt; font-weight: bold; color: ${levelBadgeColor}; background-color: ${levelBadgeBg}; padding: 2px 6px; border-radius: 4px;">
            ${sanitize(latestLevel)}
          </span>
        </td>
        <td style="padding: 6px 8px; font-size: 8pt; color: #4338ca; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${sanitize(topCluster)}
        </td>
      </tr>
    `;
  }).join('');

  // Group unique tasks to render Official Question Papers with BIG Stimulus Images & Datasets
  const uniqueTasksMap = new Map<string, { taskMeta: ATLTaskLog; submissions: ATLTaskLog[] }>();
  sortedLogs.forEach((log) => {
    const key = (log.assignedTaskId || log.taskTitle || log.topic).trim();
    if (!uniqueTasksMap.has(key)) {
      uniqueTasksMap.set(key, { taskMeta: log, submissions: [] });
    }
    uniqueTasksMap.get(key)!.submissions.push(log);
  });

  // PART I - SECTION 1: OFFICIAL QUESTIONS & ENLARGED STIMULUS MATERIAL
  const questionsOnlyPortfolioHtml = Array.from(uniqueTasksMap.entries()).map(([taskKey, taskData], taskIdx) => {
    const baseLog = taskData.taskMeta;
    const taskSubmissions = taskData.submissions;
    const originalTask = baseLog.originalTask;

    // Resolve Questions/Prompts
    const questionParts =
      originalTask?.parts && originalTask.parts.length > 0
        ? originalTask.parts
        : baseLog.responses && baseLog.responses.length > 0
        ? baseLog.responses.map((r, i) => ({
            label: r.label || String.fromCharCode(65 + i),
            prompt: r.prompt || `Part ${r.label || String.fromCharCode(65 + i)}`,
            criterion_assessed: (baseLog.criteria && baseLog.criteria[0]) || 'Criterion A'
          }))
        : [
            { label: 'A', prompt: `Analyse the core biological mechanisms and principles governing ${baseLog.topic}.`, criterion_assessed: 'Criterion A' },
            { label: 'B', prompt: `Evaluate empirical scientific data, identifying patterns, correlations, and anomalies.`, criterion_assessed: 'Criterion C' },
            { label: 'C', prompt: `Construct a justified scientific claim supported by mechanistic evidence and scientific reasoning.`, criterion_assessed: 'Criterion C' }
          ];

    // Resolve Stimulus Images (Now rendered significantly larger for clear visibility)
    const taskStimulusImages =
      (baseLog.stimulusImages && baseLog.stimulusImages.length > 0)
        ? baseLog.stimulusImages
        : (originalTask?.stimulusImages && originalTask.stimulusImages.length > 0)
        ? originalTask.stimulusImages
        : generateStimulusImagesForTopic(baseLog.topic, baseLog.subject);

    // Pedagogical Guide
    const derivedPedagogy = buildATLSkillGuideAndIntro(
      baseLog.cluster || 'Critical thinking',
      baseLog.category || 'Thinking',
      baseLog.topic,
      baseLog.criteria?.[0] || 'Criterion C',
      baseLog.subject
    );
    const resolvedIntro = baseLog.atlPedagogicalIntro || originalTask?.atlPedagogicalIntro || derivedPedagogy.atlPedagogicalIntro;
    const resolvedGuide = baseLog.atl_skill_guide || originalTask?.atl_skill_guide || derivedPedagogy.atl_skill_guide;

    // Scientific Dataset
    const dataset: any = originalTask?.scientific_dataset;

    return `
      <div style="margin-top: 18px; margin-bottom: 24px; border: 2px solid #cbd5e1; border-radius: 10px; background-color: #ffffff; padding: 18px; page-break-inside: avoid; break-inside: avoid;">
        <!-- Task Header Banner -->
        <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #4338ca;">
              Inquiry Task #${taskIdx + 1} • ${sanitize(baseLog.academicYear)} (${sanitize(baseLog.term || 'Academic Term')})
            </div>
            <h2 style="font-size: 15pt; font-weight: 800; color: #1e1b4b; margin: 3px 0 2px 0;">
              ${sanitize(baseLog.taskTitle || 'Scientific Inquiry Task')}
            </h2>
            <div style="font-size: 9.5pt; color: #475569;">
              Subject: <strong>${sanitize(baseLog.subject)}</strong> (MYP ${sanitize(baseLog.mypYear)}) • Curriculum Topic: <strong>${sanitize(baseLog.topic)}</strong>
            </div>
          </div>
          <div style="text-align: right; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 6px 12px;">
            <div style="font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #6d28d9;">Submissions Recorded</div>
            <div style="font-size: 12pt; font-weight: 800; color: #4338ca;">${taskSubmissions.length} Students Completed</div>
          </div>
        </div>

        <!-- Task Metadata Strip -->
        <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 8.5pt; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
          <div><strong>ATL Focus:</strong> <span style="color: #4338ca; font-weight: bold;">${sanitize(baseLog.cluster)}</span> (${sanitize(baseLog.category)})</div>
          ${baseLog.criteria && baseLog.criteria.length > 0 ? `<div><strong>Target Criteria:</strong> ${sanitize(baseLog.criteria.join(', '))}</div>` : ''}
          ${baseLog.strands && baseLog.strands.length > 0 ? `<div><strong>Strands:</strong> ${sanitize(baseLog.strands.join(' • '))}</div>` : ''}
          <div><strong>Due Date:</strong> ${baseLog.dueDate ? sanitize(baseLog.dueDate) : 'Open Task Window'}</div>
        </div>

        <!-- Pedagogical Focus Box -->
        ${resolvedIntro ? `
          <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-left: 3.5px solid #7c3aed; border-radius: 6px; padding: 10px 12px; font-size: 8.5pt; margin-bottom: 12px;">
            <strong style="color: #6d28d9; text-transform: uppercase; font-size: 8pt; display: block; margin-bottom: 2px;">
              Targeted ATL Pedagogical Rationale & Skill Model:
            </strong>
            <div style="color: #312e81; line-height: 1.45;">${sanitize(resolvedIntro)}</div>
            ${resolvedGuide ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ddd6fe; font-size: 8pt;">
                <div><strong style="color: #6d28d9;">1. What Student Is Doing:</strong> ${sanitize(resolvedGuide.what_you_are_doing)}</div>
                <div><strong style="color: #6d28d9;">2. How Tested (CER):</strong> ${sanitize(resolvedGuide.how_it_is_tested)}</div>
                <div><strong style="color: #6d28d9;">3. What Is Developed:</strong> ${sanitize(resolvedGuide.what_is_being_developed)}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Inquiry Scenario & Context -->
        ${(baseLog.originalTask?.context || (baseLog as any).context) ? `
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 3.5px solid #0284c7; border-radius: 6px; padding: 10px 14px; font-size: 9pt; margin-bottom: 14px;">
            <strong style="color: #0369a1; text-transform: uppercase; font-size: 8pt; display: block; margin-bottom: 3px;">
              Inquiry Scenario & Scientific Background Context:
            </strong>
            <div style="color: #1e293b; line-height: 1.5;">
              ${sanitize(baseLog.originalTask?.context || (baseLog as any).context)}
            </div>
          </div>
        ` : ''}

        <!-- Attached Stimulus Images & Scientific Diagrams (SIGNIFICANTLY LARGER & CLEARLY VISIBLE) -->
        ${taskStimulusImages && taskStimulusImages.length > 0 ? `
          <div style="margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #312e81; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span>🔬 Question Stimulus Material & Scientific Diagrams (${taskStimulusImages.length}):</span>
              <span style="font-size: 7.5pt; color: #4338ca; font-weight: 600; text-transform: none;">Referenced in inquiry questions below</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${taskStimulusImages.map((img, i) => `
                <div style="background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 8px; padding: 12px; page-break-inside: avoid; break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">
                    <div style="font-size: 9pt; font-weight: bold; color: #0f172a;">
                      Figure ${i + 1}: ${sanitize(img.name || img.caption || 'Scientific Stimulus Diagram')}
                    </div>
                    <span style="font-size: 7pt; font-weight: bold; background: #e0e7ff; color: #3730a3; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">
                      Question Visual Stimulus
                    </span>
                  </div>
                  <div style="padding: 8px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #f1f5f9; display: flex; justify-content: center; align-items: center;">
                    <img 
                      src="${img.url}" 
                      alt="${sanitize(img.caption || 'Scientific Stimulus Diagram')}" 
                      style="max-height: 440px; width: auto; max-width: 100%; object-fit: contain; border-radius: 4px; display: block; margin: 0 auto;" 
                    />
                  </div>
                  ${img.caption ? `
                    <div style="font-size: 8.5pt; color: #334155; margin-top: 8px; text-align: left; background: #f8fafc; padding: 8px 12px; border-radius: 4px; border-left: 3px solid #6366f1; line-height: 1.45;">
                      <strong>Caption & Observational Context:</strong> ${sanitize(img.caption)}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Scientific Dataset Stimulus & Graphical Plot (Visible & Rendered) -->
        ${dataset ? `
          <div style="margin-bottom: 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #0f172a; margin-bottom: 4px;">
              Scientific Empirical Dataset Stimulus: ${sanitize(dataset.title || 'Experimental Observations')}
            </div>
            <div style="font-size: 8pt; color: #64748b; margin-bottom: 6px;">
              Independent Variable: <strong>${sanitize(dataset.independent_variable || dataset.x_axis_label || 'X')}</strong> • Dependent Variable: <strong>${sanitize(dataset.dependent_variable || dataset.y_axis_label || 'Y')}</strong>
            </div>

            <!-- SVG Graph of Dataset -->
            ${generateScientificDatasetSvg(dataset, 720, 190)}

            <!-- Data Table -->
            ${dataset.data_points && dataset.data_points.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 8pt; background: #ffffff; margin-top: 8px;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th style="padding: 5px 8px; text-align: left; border: 1px solid #e2e8f0;">${sanitize(dataset.independent_variable || 'X')}</th>
                    <th style="padding: 5px 8px; text-align: left; border: 1px solid #e2e8f0;">${sanitize(dataset.dependent_variable || 'Y')}</th>
                    <th style="padding: 5px 8px; text-align: left; border: 1px solid #e2e8f0;">Observation Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${dataset.data_points.slice(0, 8).map((dp: any) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 4px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${sanitize(String(dp.x))}</td>
                      <td style="padding: 4px 8px; border: 1px solid #e2e8f0;">${sanitize(String(dp.y))}</td>
                      <td style="padding: 4px 8px; border: 1px solid #e2e8f0; color: #64748b;">${sanitize(dp.note || '—')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        ` : ''}

        <!-- Official Question Paper Prompts (All Questions Clearly Visible) -->
        <div style="background-color: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid;">
          <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #1e1b4b; margin-bottom: 8px;">
            Inquiry Questions Assigned to Students (${questionParts.length} Parts):
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${questionParts.map((qp: any, qIdx: number) => `
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; font-size: 9pt;">
                <div style="font-weight: bold; color: #1e1b4b; margin-bottom: 3px; line-height: 1.4;">
                  <span style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 8pt; font-weight: bold; padding: 2px 7px; border-radius: 3px; margin-right: 6px; text-transform: uppercase;">
                    Part ${sanitize(qp.label || String.fromCharCode(65 + qIdx))}
                  </span>
                  ${sanitize(qp.prompt)}
                </div>
                ${qp.criterion_assessed ? `
                  <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">Assessing Criterion: <strong style="color: #4338ca;">${sanitize(qp.criterion_assessed)}</strong></div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // PART I - SECTION 3: CONSOLIDATED STUDENT REFLECTIONS & METACOGNITIVE GROWTH (In First Few Pages)
  const studentReflectionsList: { studentName: string; taskTitle: string; reflection: string; date?: string; score?: number | null }[] = [];
  activeStudentNames.forEach((stName) => {
    const stLogs = studentLogsMap[stName] || [];
    stLogs.forEach((l) => {
      const ref = (l.studentReflection || l.metacognitiveReflection || '').trim();
      if (ref) {
        studentReflectionsList.push({
          studentName: stName,
          taskTitle: l.taskTitle || l.topic || 'Inquiry Task',
          reflection: ref,
          date: l.date,
          score: getTaskEffectiveScore(l)
        });
      }
    });
  });

  const consolidatedReflectionsHtml = studentReflectionsList.length > 0 ? `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${studentReflectionsList.map((sr) => `
        <div style="background-color: #fdf4ff; border: 1px solid #f5d0fe; border-left: 3.5px solid #c026d3; border-radius: 6px; padding: 8px 12px; font-size: 8.5pt; page-break-inside: avoid; break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="color: #86198f; font-size: 9pt;">${sanitize(sr.studentName)}</strong>
            <span style="font-size: 7.5pt; color: #a21caf;">${sanitize(sr.taskTitle)} ${sr.date ? `(${sanitize(sr.date)})` : ''}</span>
          </div>
          <div style="color: #4a044e; font-style: italic; line-height: 1.4;">
            "${sanitize(sr.reflection)}"
          </div>
        </div>
      `).join('')}
    </div>
  ` : `
    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 14px; text-align: center; color: #64748b; font-size: 8.5pt;">
      Student reflective statements logged during task completion will appear here.
    </div>
  `;

  // PART II: DETAILED STUDENT WRITTEN ANSWERS & CER EVIDENCE (Detachable Appendix at End)
  const includeAppendix = params.includeStudentAnswersAppendix !== false;

  const detailedAnswersAppendixHtml = includeAppendix ? Array.from(uniqueTasksMap.entries()).map(([taskKey, taskData], taskIdx) => {
    const baseLog = taskData.taskMeta;
    // Filter submissions to only students who have done/completed work
    const taskSubmissions = taskData.submissions.filter((s) => {
      if (!onlyDone) return true;
      return (s.studentName && activeStudentNames.includes(s.studentName.trim()));
    });

    if (taskSubmissions.length === 0) return '';

    return `
      <div style="margin-top: 20px; margin-bottom: 24px; border: 1.5px solid #cbd5e1; border-radius: 8px; background-color: #ffffff; padding: 14px; page-break-inside: avoid; break-inside: avoid;">
        <div style="border-bottom: 1.5px solid #4f46e5; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #4338ca;">Task #${taskIdx + 1} Answers</div>
            <strong style="font-size: 11pt; color: #1e1b4b;">${sanitize(baseLog.taskTitle || baseLog.topic)}</strong>
          </div>
          <span style="font-size: 8pt; color: #64748b;">${taskSubmissions.length} Student Responses</span>
        </div>

        ${taskSubmissions.map((sub) => {
          const subScore = getTaskEffectiveScore(sub);
          const isGraded = isTaskLogGraded(sub);
          const subLevel = sub.teacherEvaluation?.level || sub.level || 'Applying';
          const strengths = sub.feedback?.strengths || sub.teacherEvaluation?.strengths || [];
          const nextSteps = sub.feedback?.next_steps || sub.teacherEvaluation?.nextSteps || [];
          const studentAttachments = sub.studentAttachments || sub.responses?.flatMap((r) => r.attachments || []) || [];

          const levelColor = subLevel === 'Extending' ? '#047857' : subLevel === 'Applying' ? '#4338ca' : '#b45309';
          const levelBg = subLevel === 'Extending' ? '#ecfdf5' : subLevel === 'Applying' ? '#eef2ff' : '#fffbeb';

          return `
            <div style="margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #ffffff; padding: 10px; page-break-inside: avoid; break-inside: avoid;">
              <!-- Student Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 6px;">
                <div>
                  <strong style="font-size: 9.5pt; color: #0f172a;">${sanitize(sub.studentName)}</strong>
                  <span style="font-size: 8pt; color: #64748b; margin-left: 6px;">
                    ${sub.studentRollNumber || sub.rollNumber ? `ID: #${sanitize(sub.studentRollNumber || sub.rollNumber)} • ` : ''}
                    Submitted: ${sanitize(sub.date || 'N/A')}
                  </span>
                </div>
                <div style="text-align: right;">
                  ${isGraded && typeof subScore === 'number' ? `
                    <span style="font-size: 11pt; font-weight: 800; color: #1e1b4b; margin-right: 6px;">${subScore} / 8</span>
                    <span style="font-size: 7.5pt; font-weight: bold; color: ${levelColor}; background-color: ${levelBg}; padding: 2px 7px; border-radius: 4px;">
                      ${sanitize(subLevel)}
                    </span>
                  ` : `
                    <span style="font-size: 7.5pt; font-weight: bold; color: #b45309; background-color: #fffbeb; padding: 2px 6px; border-radius: 4px;">
                      Pending Grading
                    </span>
                  `}
                </div>
              </div>

              <!-- Student Responses to Questions -->
              <div style="font-size: 8pt; color: #334155; margin-bottom: 8px;">
                <strong style="color: #475569; display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 7.5pt;">Student Written Responses:</strong>
                ${(sub.responses && sub.responses.length > 0) ? sub.responses.map((r, rIdx) => {
                  const hasCer = r.claim || r.evidence || r.reasoning;
                  return `
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; margin-bottom: 4px;">
                      <div style="font-weight: bold; color: #1e1b4b; margin-bottom: 2px;">
                        Part ${sanitize(r.label || String.fromCharCode(65 + rIdx))}: ${sanitize(r.prompt)}
                      </div>
                      ${hasCer ? `
                        <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 3px;">
                          ${r.claim ? `<div style="background: #eff6ff; padding: 3px 6px; border-left: 2px solid #3b82f6; border-radius: 2px;"><strong style="color: #1e40af;">Claim:</strong> ${sanitize(r.claim)}</div>` : ''}
                          ${r.evidence ? `<div style="background: #ecfdf5; padding: 3px 6px; border-left: 2px solid #10b981; border-radius: 2px;"><strong style="color: #065f46;">Evidence:</strong> ${sanitize(r.evidence)}</div>` : ''}
                          ${r.reasoning ? `<div style="background: #faf5ff; padding: 3px 6px; border-left: 2px solid #8b5cf6; border-radius: 2px;"><strong style="color: #5b21b6;">Reasoning:</strong> ${sanitize(r.reasoning)}</div>` : ''}
                        </div>
                      ` : `
                        <div style="background: #ffffff; padding: 4px 6px; border-radius: 3px; border: 1px solid #f1f5f9; color: #1e293b;">
                          ${r.response ? sanitize(r.response) : '<em style="color: #94a3b8;">(Left blank)</em>'}
                        </div>
                      `}
                      ${r.attachments && r.attachments.length > 0 ? `
                        <div style="margin-top: 4px; display: flex; gap: 6px;">
                          ${r.attachments.map((att) => `
                            <img src="${att.url}" alt="${sanitize(att.caption || 'Student diagram')}" style="max-height: 80px; max-width: 110px; object-fit: contain; border-radius: 3px; border: 1px solid #cbd5e1;" />
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('') : `
                  <div style="background: #ffffff; padding: 4px 6px; border-radius: 3px; border: 1px solid #f1f5f9; color: #1e293b;">
                    ${sub.studentResponse ? sanitize(sub.studentResponse) : '<em style="color: #94a3b8;">(No response text recorded)</em>'}
                  </div>
                `}
              </div>

              <!-- Student Work Attachments -->
              ${studentAttachments && studentAttachments.length > 0 ? `
                <div style="margin-bottom: 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px;">
                  <div style="font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #047857; margin-bottom: 4px;">
                    Student Attached Diagrams & Evidence (${studentAttachments.length}):
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${studentAttachments.map((img) => `
                      <img src="${img.url}" alt="${sanitize(img.caption || 'Artifact')}" style="max-height: 85px; max-width: 120px; object-fit: contain; border-radius: 3px; border: 1px solid #cbd5e1;" />
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Evaluated Words Quoted From Answer -->
              ${sub.feedback ? renderEvaluatedWordsHtml(sub.feedback, sanitize) : ''}

              <!-- Teacher Feedback & Corrections -->
              <div style="font-size: 8pt; color: #334155; margin-bottom: 6px; background-color: #f8fafc; border-left: 3px solid #4f46e5; padding: 6px 8px; border-radius: 3px;">
                <strong style="color: #1e1b4b; text-transform: uppercase; font-size: 7.5pt; display: block;">Teacher Feedback & Scientific Corrections:</strong>
                ${sanitize(formatTeacherComment(sub.teacherEvaluation?.feedback || sub.feedback?.summary || 'Task completed and verified against criterion rubrics.'))}
              </div>

              <!-- Strengths & Growth Areas Grid -->
              ${(strengths.length > 0 || nextSteps.length > 0) ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 7.5pt;">
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 6px 8px;">
                    <strong style="color: #166534; display: block; margin-bottom: 2px;">✓ Strengths (What Was Done Well):</strong>
                    <ul style="margin: 0; padding-left: 12px; color: #14532d; line-height: 1.3;">
                      ${strengths.slice(0, 3).map((s) => `<li>${sanitize(formatTeacherComment(s))}</li>`).join('')}
                    </ul>
                  </div>
                  <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 6px 8px;">
                    <strong style="color: #3730a3; display: block; margin-bottom: 2px;">→ Errors & Scientific Fixes:</strong>
                    <ul style="margin: 0; padding-left: 12px; color: #312e81; line-height: 1.3;">
                      ${nextSteps.slice(0, 3).map((ns) => `<li>${sanitize(formatTeacherComment(ns))}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('') : '';

  const reportDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>IB MYP ATL Class Record & Submission Portfolio - ${sanitize(params.className)}</title>
      <style>
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          margin: 0;
          padding: 24px;
          line-height: 1.45;
          font-size: 9pt;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            padding: 0;
          }
        }
        .page-break-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .page-break-before {
          page-break-before: always;
          break-before: page;
        }
        .header-banner {
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .institution-title {
          font-size: 8pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #4338ca;
        }
        .report-title {
          font-size: 18pt;
          font-weight: 900;
          color: #1e1b4b;
          letter-spacing: -0.5px;
          margin: 4px 0 2px 0;
        }
        .report-subtitle {
          font-size: 9.5pt;
          color: #475569;
          font-weight: 500;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 12px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .kpi-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
        }
        .kpi-label {
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 15pt;
          font-weight: 900;
          color: #1e1b4b;
        }
        .kpi-sub {
          font-size: 7.5pt;
          color: #475569;
          margin-top: 2px;
          font-weight: 500;
        }
        .section-header {
          font-size: 10.5pt;
          font-weight: 800;
          color: #1e1b4b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 4px;
          margin: 18px 0 10px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        table.standard-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 8pt;
        }
        table.standard-table th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 7pt;
          letter-spacing: 0.5px;
          padding: 6px 8px;
          border-bottom: 1px solid #cbd5e1;
          text-align: left;
        }
        .signoff-section {
          margin-top: 24px;
          border-top: 1px solid #cbd5e1;
          padding-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          font-size: 8.5pt;
        }
        .coordinator-cut-notice {
          margin-top: 18px;
          background-color: #eef2ff;
          border: 1.5px dashed #6366f1;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 8pt;
          color: #312e81;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div style="max-width: 820px; margin: 0 auto;">
        <!-- ================================================================= -->
        <!-- PART I: COORDINATOR & CURRICULUM DOSSIER (FIRST FEW PAGES)       -->
        <!-- ================================================================= -->

        <!-- Header Banner -->
        <div class="header-banner">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="institution-title">
                ${sanitize(params.schoolName || 'International Baccalaureate (IB) World School')} • Middle Years Programme (MYP)
              </div>
              <h1 class="report-title">Class ATL Submission Record & Dossier</h1>
              <div class="report-subtitle">
                Part I: Official Inquiry Questions, Growth Curves, Attainment Levels & Student Reflections
              </div>
            </div>
            <div style="text-align: right; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 6px 12px;">
              <div style="font-size: 7.5pt; font-weight: bold; color: #4338ca; text-transform: uppercase;">Coordinator Dossier</div>
              <div style="font-size: 9.5pt; font-weight: bold; color: #1e1b4b;">${sanitize(params.className)}</div>
              <div style="font-size: 7.5pt; color: #64748b;">Academic Year ${sanitize(params.academicYear)}</div>
            </div>
          </div>
        </div>

        <!-- Class Demographics & Metadata Grid -->
        <div class="meta-grid">
          <div>
            <table style="width: 100%; font-size: 8.5pt;">
              <tr>
                <td style="color: #64748b; width: 100px; padding: 2px 0;"><strong>Class / Cohort:</strong></td>
                <td style="color: #0f172a; font-weight: 800; font-size: 10pt;">${sanitize(params.className)}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 2px 0;"><strong>Subject Group:</strong></td>
                <td style="color: #1e1b4b; font-weight: 700;">${sanitize(params.subject || 'Sciences')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 2px 0;"><strong>Students Evaluated:</strong></td>
                <td style="color: #0f172a; font-weight: 700;">
                  ${activeStudentNames.length} Students ${onlyDone ? `<span style="font-size: 7.5pt; color: #047857; font-weight: normal;">(Completed work only • unsubmitted students omitted)</span>` : ''}
                </td>
              </tr>
            </table>
          </div>

          <div>
            <table style="width: 100%; font-size: 8.5pt;">
              <tr>
                <td style="color: #64748b; width: 110px; padding: 2px 0;"><strong>Reporting Scope:</strong></td>
                <td style="color: #0f172a; font-weight: 600;">${sanitize(params.term || 'Full Academic Year')}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 2px 0;"><strong>Generated Date:</strong></td>
                <td style="color: #0f172a; font-weight: 600;">${sanitize(reportDate)}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 2px 0;"><strong>Assessing Faculty:</strong></td>
                <td style="color: #4338ca; font-weight: 700;">${sanitize(params.teacherName || 'Sciences Faculty')}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Executive Performance KPIs -->
        <div class="kpi-container">
          <div class="kpi-card" style="border-top: 3px solid #4f46e5;">
            <div class="kpi-label">Class Average Score</div>
            <div class="kpi-value">${avgClassScore} <span style="font-size: 9.5pt; color: #64748b; font-weight: normal;">/ 8</span></div>
            <div class="kpi-sub">Across ${totalGraded} Graded Inquiries</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid #059669;">
            <div class="kpi-label">Class Attainment Spread</div>
            <div class="kpi-value" style="font-size: 11pt; margin-top: 4px;">
              <span style="color: #047857;">${extPct}% Ext</span> •
              <span style="color: #4338ca;">${appPct}% App</span> •
              <span style="color: #b45309;">${devPct}% Dev</span>
            </div>
            <div class="kpi-sub">${extCount} Extending (${extPct}%)</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid #0284c7;">
            <div class="kpi-label">Tasks & Inquiries</div>
            <div class="kpi-value">${uniqueTasksMap.size} <span style="font-size: 9.5pt; color: #64748b; font-weight: normal;">Unique</span></div>
            <div class="kpi-sub">${classLogs.length} Total Submissions</div>
          </div>

          <div class="kpi-card" style="border-top: 3px solid #d97706;">
            <div class="kpi-label">Cohort Score Range</div>
            <div class="kpi-value" style="font-size: 12pt;">
              ${highestScore !== null ? `${lowestScore} - ${highestScore}` : '—'}
              <span style="font-size: 8.5pt; color: #64748b; font-weight: normal;">/ 8</span>
            </div>
            <div class="kpi-sub">${pendingLogs.length > 0 ? `${pendingLogs.length} pending grading` : 'All graded'}</div>
          </div>
        </div>

        <!-- SECTION 1: THE QUESTIONS & SCIENTIFIC STIMULUS (FIRST IN THE DOSSIER) -->
        <div style="margin-bottom: 24px;">
          <div class="section-header">
            <span>1. Assigned Inquiry Questions & Scientific Stimulus Materials</span>
            <span style="font-size: 7.5pt; font-weight: normal; color: #64748b;">Curriculum Prompts, Stimulus Diagrams & Datasets</span>
          </div>
          <div style="font-size: 8.5pt; color: #475569; margin-bottom: 12px; line-height: 1.45; background-color: #f8fafc; border-left: 3px solid #4f46e5; padding: 6px 10px; border-radius: 4px;">
            The questions and large scientific stimulus diagrams below represent the authentic tasks assigned to this class. Students used these primary stimuli to construct their written responses and CER scientific evidence.
          </div>
          ${questionsOnlyPortfolioHtml}
        </div>

        <!-- SECTION 2: STUDENT ACHIEVEMENTS, ACHIEVING LEVELS & GROWTH CURVES TILL DATE -->
        <div class="page-break-avoid" style="margin-bottom: 24px;">
          <div class="section-header">
            <span>2. Student Achievements, Achieving Levels & Longitudinal Growth Curves</span>
            <span style="font-size: 7.5pt; font-weight: normal; color: #64748b;">Formative Score Progression (Till Date)</span>
          </div>

          <!-- Class Longitudinal Growth Curve -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
            <div style="font-size: 8.5pt; color: #475569; margin-bottom: 8px; line-height: 1.4;">
              <strong>Class Longitudinal Formative Growth Curve (Till Date):</strong> Maps average formative score progression over time across all assessed inquiry tasks:
            </div>
            ${generateClassGrowthCurveSvg(growthCurvePoints, 760, 220)}
          </div>

          <!-- Category Mastery Breakdown & Level Distribution -->
          <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 4px;">
                ATL Category Mastery Breakdown:
              </div>
              <table class="standard-table" style="background: #ffffff;">
                <thead>
                  <tr>
                    <th>ATL Category</th>
                    <th style="text-align: center;">Tasks</th>
                    <th style="text-align: center;">Avg (/8)</th>
                    <th>Mastery Gauge</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryMasteryRowsHtml}
                </tbody>
              </table>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 8pt;">
              <strong style="color: #1e1b4b; text-transform: uppercase; font-size: 7.5pt; display: block; margin-bottom: 4px;">
                IB MYP Achieving Levels Continuum:
              </strong>
              <div style="margin-bottom: 5px; padding: 4px 8px; background: #ecfdf5; border-radius: 4px; border: 1px solid #a7f3d0;">
                <strong style="color: #047857;">Extending (Levels 7-8):</strong> ${extCount} Students (${extPct}%)<br/>
                <span style="font-size: 7pt; color: #065f46;">Consistently demonstrates comprehensive mastery and deep mechanistic reasoning.</span>
              </div>
              <div style="margin-bottom: 5px; padding: 4px 8px; background: #eef2ff; border-radius: 4px; border: 1px solid #c7d2fe;">
                <strong style="color: #4338ca;">Applying (Levels 4-6):</strong> ${appCount} Students (${appPct}%)<br/>
                <span style="font-size: 7pt; color: #3730a3;">Competently applies scientific knowledge and structures CER arguments with evidence.</span>
              </div>
              <div style="padding: 4px 8px; background: #fffbeb; border-radius: 4px; border: 1px solid #fde68a;">
                <strong style="color: #b45309;">Developing (Levels 1-3):</strong> ${devCount} Students (${devPct}%)<br/>
                <span style="font-size: 7pt; color: #92400e;">Acquiring foundational concepts with guided teacher feedback and scaffolding.</span>
              </div>
            </div>
          </div>

          <!-- Class Student Roster Growth Table (Only completed students!) -->
          <div>
            <div style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #1e1b4b; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span>Student Performance Roster & Trajectory (${activeStudentNames.length} Students):</span>
              <span style="font-size: 7.5pt; color: #047857; font-weight: 600;">Showing only students who completed tasks</span>
            </div>
            <table class="standard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ID</th>
                  <th>Student Name</th>
                  <th style="text-align: center;">Tasks</th>
                  <th style="text-align: center;">Growth Sparkline</th>
                  <th style="text-align: center;">Initial ➔ Latest</th>
                  <th style="text-align: center;">Avg (/8)</th>
                  <th style="text-align: center;">Level</th>
                  <th>Top ATL Skill</th>
                </tr>
              </thead>
              <tbody>
                ${studentGrowthRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- SECTION 3: STUDENT REFLECTIONS & METACOGNITIVE GROWTH (IN FIRST FEW PAGES) -->
        <div class="page-break-avoid" style="margin-bottom: 24px;">
          <div class="section-header">
            <span>3. Student Self-Reflections & Metacognitive Growth Takeaways</span>
            <span style="font-size: 7.5pt; font-weight: normal; color: #64748b;">Metacognitive Insights from Completed Students</span>
          </div>
          <div style="font-size: 8.5pt; color: #475569; margin-bottom: 10px; line-height: 1.45;">
            Below are student self-reflections and metacognitive takeaways recorded upon completing the inquiry tasks, illustrating how students evaluate their own learning process and thinking development:
          </div>
          ${consolidatedReflectionsHtml}
        </div>

        <!-- Institutional Sign-Off Section -->
        <div class="signoff-section page-break-avoid">
          <div>
            <div style="font-size: 8pt; color: #64748b; margin-bottom: 24px;">Assessing Subject Teacher:</div>
            <div style="font-weight: bold; color: #0f172a; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">
              ${sanitize(params.teacherName || 'Subject Teacher')}
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Signature & Verification</div>
          </div>

          <div>
            <div style="font-size: 8pt; color: #64748b; margin-bottom: 24px;">Evaluation & Submission Date:</div>
            <div style="font-weight: bold; color: #0f172a; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">
              ${sanitize(reportDate)}
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Official Reporting Date</div>
          </div>

          <div>
            <div style="font-size: 8pt; color: #64748b; margin-bottom: 24px;">MYP Coordinator / Department Endorsement:</div>
            <div style="font-weight: bold; color: #4338ca; border-bottom: 1px solid #94a3b8; padding-bottom: 2px;">
              IB Middle Years Programme Faculty
            </div>
            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Programme Moderation Endorsement</div>
          </div>
        </div>

        <!-- Printout Cut / End of Coordinator Submission Notice -->
        <div class="coordinator-cut-notice page-break-avoid">
          <div>
            <strong>✂ COORDINATOR SUBMISSION NOTICE:</strong> Part I above contains all curriculum questions, stimulus diagrams, student achievement levels, growth curves, and student reflections. If you do not wish to print or submit individual student answer sheets, you can stop the printout here.
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- PART II: DETAILED STUDENT WRITTEN ANSWERS (END PAGES APPENDIX)   -->
        <!-- ================================================================= -->
        ${includeAppendix && detailedAnswersAppendixHtml ? `
          <div class="page-break-before" style="margin-top: 30px;">
            <div style="border-bottom: 3px solid #7c3aed; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #6d28d9;">
                  Part II • Optional Detailed Submission Appendix
                </div>
                <h2 style="font-size: 16pt; font-weight: 900; color: #1e1b4b; margin: 3px 0 2px 0;">
                  Detailed Student Responses & CER Evidence
                </h2>
                <div style="font-size: 8.5pt; color: #64748b;">
                  Contains complete student written answers, Claim-Evidence-Reasoning structures, attached artifacts, and teacher feedback for moderation.
                </div>
              </div>
              <div style="text-align: right; background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 6px 12px;">
                <div style="font-size: 7pt; font-weight: bold; color: #7e22ce; text-transform: uppercase;">Detachable Appendix</div>
                <div style="font-size: 8pt; color: #581c87;">Can be excluded from coordinator printout if not required</div>
              </div>
            </div>

            ${detailedAnswersAppendixHtml}
          </div>
        ` : ''}

        <div style="margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 7.5pt; color: #94a3b8; text-align: center;">
          * Generated by EduTN43 • IB MYP Approaches to Learning (ATL) Skills Assessment & Class Evidence Portfolio System. Official submission document.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Downloads a high-resolution Class Record & Student Evidence Portfolio PDF directly using html2pdf.js.
 */
export async function exportClassRecordToPdf(
  params: ClassRecordReportParams,
  onProgress?: (status: string) => void
): Promise<void> {
  if (onProgress) onProgress('Compiling comprehensive class questions, graphs, and student evidence...');

  const htmlContent = generateClassRecordHtml(params);
  const element = document.createElement('div');
  element.id = 'atl-class-record-pdf-target';
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '0';
  element.style.width = '820px';
  element.style.backgroundColor = '#ffffff';
  element.style.color = '#0f172a';
  element.style.zIndex = '-9999';
  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  const cleanClass = (params.className || params.classKey || 'Class').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanYear = (params.academicYear || 'Year').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fileName = `ATL_Class_Record_${cleanClass}_${cleanYear}.pdf`;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: fileName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 1.75,
      useCORS: true,
      logging: false,
      windowWidth: 820
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    if (onProgress) onProgress('Rendering vector growth curves, images, and student work to PDF...');
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;
    await html2pdf().set(opt).from(element).save();
    if (onProgress) onProgress('Class Record PDF downloaded successfully!');
  } finally {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }
}

/**
 * Opens native browser print preview window for instantaneous 1-click printing or "Save as PDF".
 */
export function printClassRecord(params: ClassRecordReportParams): void {
  const htmlContent = generateClassRecordHtml(params);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    exportClassRecordToPdf(params);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

/**
 * Downloads a standalone, self-contained offline HTML file of the Class Record.
 * Instantaneous (<100ms) download with 100% of questions, images, SVG graphs, and student answers.
 */
export function exportClassRecordToHtmlFile(params: ClassRecordReportParams): void {
  const htmlContent = generateClassRecordHtml(params);
  const cleanClass = (params.className || params.classKey || 'Class').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanYear = (params.academicYear || 'Year').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fileName = `ATL_Class_Record_${cleanClass}_${cleanYear}.html`;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a Microsoft Word (.doc) document for the Class Record.
 */
export function exportClassRecordToWordDoc(params: ClassRecordReportParams): void {
  const htmlContent = generateClassRecordHtml(params);
  const cleanClass = (params.className || params.classKey || 'Class').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanYear = (params.academicYear || 'Year').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fileName = `ATL_Class_Record_${cleanClass}_${cleanYear}.doc`;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



