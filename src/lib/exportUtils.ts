import { TaskFeedback, TaskMeta, GeneratedTask, StudentResponseItem, ATLTaskLog, ATLCategoryKey } from '../types';
import { buildATLSkillGuideAndIntro } from './scientificDatasetGenerator';
import { isTaskLogGraded, getTaskEffectiveScore } from './scoreUtils';

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

function generateReportHtml(data: ReportData): string {
  const sanitize = (text: string) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

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

  const responsesHtml = data.responses
    .map(
      (r) => `
      <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #4338ca; font-size: 13px;">
          Question / Part ${sanitize(r.label)}: ${sanitize(r.prompt)}
        </p>
        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 12px; color: #1e293b; white-space: pre-wrap;">
          <strong>Student Answer:</strong><br/>
          ${r.response ? sanitize(r.response) : '<em>(No response provided / Left blank)</em>'}
        </div>
      </div>
    `
    )
    .join('');

  const attemptText = data.attemptNumber ? `Attempt #${data.attemptNumber} for ${sanitize(data.cluster)}` : null;
  const progressionText = data.previousLevels && data.previousLevels.length > 0
    ? [...data.previousLevels, data.level].join(' ➔ ')
    : data.level;

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; background: #ffffff;">
      <div style="border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
        <div style="font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">EduTN43 • IB MYP Approaches to Learning (ATL) Skill Development Report</div>
        <div style="font-size: 18pt; font-weight: bold; color: #1e1b4b;">${sanitize(data.taskTitle || 'ATL Skill Task Assessment')}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f1f5f9;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt; vertical-align: top;"><strong>Student Name:</strong> ${sanitize(data.studentName || 'Anonymous')}</td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt; vertical-align: top;"><strong>Academic Year:</strong> ${sanitize(data.academicYear)} (${sanitize(data.term)})</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt; vertical-align: top;"><strong>Subject & Topic:</strong> ${sanitize(data.subject)} (MYP ${sanitize(data.mypYear)}) — ${sanitize(data.topic)}</td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt; vertical-align: top;">
            <div><strong>ATL Cluster:</strong> ${sanitize(data.cluster)} (${sanitize(data.category)})</div>
            ${skillIndicatorsHtml}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt;">
            <div style="margin-bottom: 4px;">
              <strong>Formative Score:</strong> 
              <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 11pt; color: #1e1b4b; background-color: #e0e7ff;">
                ${data.formativeScore ? `${data.formativeScore}/8` : (data.feedback?.formativeScore ? `${data.feedback.formativeScore}/8` : 'N/A')}
              </span>
            </div>
            <div>
              <strong>Demonstrated Level:</strong> 
              <span style="display: inline-block; padding: 3px 10px; border-radius: 10px; font-weight: bold; font-size: 10.5pt; color: #ffffff; background-color: ${
                data.level === 'Extending' ? '#10b981' : data.level === 'Applying' ? '#4f46e5' : '#f59e0b'
              };">${sanitize(data.level)}</span>
            </div>
          </td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt;">
            <strong>Skill Attempt & Growth:</strong><br/>
            ${attemptText ? `<strong>${attemptText}</strong><br/>` : ''}
            <span>Progression: ${sanitize(progressionText)}</span>
          </td>
        </tr>
        ${
          data.dueDate || data.submissionStatus
            ? `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt;">
            <strong>Task Due Date:</strong> ${data.dueDate ? sanitize(data.dueDate) : 'Open Task (No due date)'}
          </td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt;">
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

      ${
        (data.criteria && data.criteria.length > 0) || (data.strands && data.strands.length > 0)
          ? `
        <div style="margin-bottom: 20px; border: 1px solid #a7f3d0; background-color: #ecfdf5; border-left: 4px solid #059669; padding: 12px 14px; border-radius: 6px; font-size: 10.5pt; color: #064e3b;">
          <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #047857; margin-bottom: 4px; font-size: 9.5pt;">Target MYP Assessment Criteria & Strands</div>
          ${
            data.criteria && data.criteria.length > 0
              ? `<div><strong>Target Criteria:</strong> ${data.criteria.map((c) => sanitize(c)).join(', ')}</div>`
              : ''
          }
          ${
            data.strands && data.strands.length > 0
              ? `<div style="margin-top: 4px; font-size: 10pt; color: #065f46;"><strong>Focused Strands:</strong> ${data.strands.map((s) => sanitize(s)).join(' • ')}</div>`
              : ''
          }
        </div>
      `
          : ''
      }

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
            <div style="margin-bottom: 20px; border: 1px solid #c7d2fe; background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 8px;">
              <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #4338ca; margin-bottom: 4px; font-size: 9.5pt;">
                Approaches to Learning (ATL) Pedagogical Purpose • Named & Taught on Purpose
              </div>
              <div style="font-size: 11pt; font-weight: bold; color: #1e1b4b; margin-bottom: 6px;">
                Targeted Skill: ${sanitize(resolvedGuide?.skill_name || data.cluster)} (${sanitize(data.category)})
              </div>
              <p style="font-size: 10pt; color: #312e81; line-height: 1.5; margin: 0 0 10px 0;">
                ${sanitize(resolvedIntro)}
              </p>
              ${
                resolvedGuide
                  ? `
                <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                  <tr>
                    <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 9.5pt; width: 33%; vertical-align: top;">
                      <strong style="color: #4338ca; display: block; margin-bottom: 2px;">1. What You Are Doing:</strong>
                      <span style="color: #334155;">${sanitize(resolvedGuide.what_you_are_doing)}</span>
                    </td>
                    <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 9.5pt; width: 33%; vertical-align: top;">
                      <strong style="color: #4338ca; display: block; margin-bottom: 2px;">2. How It Is Tested (CER):</strong>
                      <span style="color: #334155;">${sanitize(resolvedGuide.how_it_is_tested)}</span>
                    </td>
                    <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 9.5pt; width: 34%; vertical-align: top;">
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

      ${
        data.context
          ? `
        <div style="font-size: 12pt; font-weight: bold; color: #312e81; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase;">Task Context & Background</div>
        <p style="font-size: 10.5pt; color: #334155; font-style: italic; background: #fafafa; padding: 10px; border-radius: 6px; border: 1px solid #f1f5f9; margin-bottom: 20px;">
          ${sanitize(data.context)}
        </p>
      `
          : ''
      }

      <div style="font-size: 12pt; font-weight: bold; color: #312e81; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase;">Task Questions & Student Submitted Answers</div>
      ${responsesHtml}

      <div style="font-size: 12pt; font-weight: bold; color: #312e81; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase;">ATL Skill Feedback & Evaluation</div>
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; padding: 12px; border-radius: 6px; font-size: 11pt; margin-bottom: 16px;">
        <strong>Overview:</strong><br/>
        ${sanitize(data.feedback.summary)}
      </div>

      <table style="width: 100%; margin-top: 16px; border-collapse: collapse; margin-bottom: 20px;">
        <tr valign="top">
          <td style="width: 50%; padding-right: 10px;">
            <div style="font-weight: bold; color: #15803d; font-size: 11pt; margin-bottom: 6px;">Key Strengths Demonstrated:</div>
            <ul style="padding-left: 20px; margin: 0; font-size: 10.5pt;">
              ${strengthsHtml}
            </ul>
          </td>
          <td style="width: 50%; padding-left: 10px;">
            <div style="font-weight: bold; color: #4338ca; font-size: 11pt; margin-bottom: 6px;">Next Steps for Skill Progression:</div>
            <ul style="padding-left: 20px; margin: 0; font-size: 10.5pt;">
              ${nextStepsHtml}
            </ul>
          </td>
        </tr>
      </table>

      ${
        data.studentReflection
          ? `
        <div style="font-size: 12pt; font-weight: bold; color: #312e81; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase;">Student Self-Reflection & Learning Log</div>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 12px; border-radius: 6px; font-size: 11pt; color: #14532d;">
          <strong>Student Post-Task Reflection:</strong><br/>
          ${sanitize(data.studentReflection)}
        </div>
      `
          : ''
      }

      <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9pt; color: #94a3b8; text-align: center;">
        * Generated by EduTN43 • MYP ATL Skills Workbench & Tracker. Skill Development Report for teaching and learning dialogue.
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

  const responsesHtml = data.responses
    .map(
      (r) => `
      <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #4338ca; font-size: 13px;">
          Question / Part ${sanitize(r.label)}: ${sanitize(r.prompt)}
        </p>
        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 12px; color: #1e293b; white-space: pre-wrap;">
          <strong>Student Answer:</strong><br/>
          ${r.response ? sanitize(r.response) : '<em>(No response provided / Left blank)</em>'}
        </div>
      </div>
    `
    )
    .join('');

  const attemptText = data.attemptNumber ? `Attempt #${data.attemptNumber} for ${sanitize(data.cluster)}` : null;
  const progressionText = data.previousLevels && data.previousLevels.length > 0
    ? [...data.previousLevels, data.level].join(' ➔ ')
    : data.level;

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>ATL Skill Development Report - ${sanitize(data.studentName)}</title>
      <style>
        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          margin: 30px;
          color: #0f172a;
          line-height: 1.5;
        }
        .header-box {
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 20pt;
          font-weight: bold;
          color: #1e1b4b;
          margin: 0;
        }
        .subtitle {
          font-size: 10pt;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background-color: #f1f5f9;
        }
        .meta-table td {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          font-size: 11pt;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: bold;
          font-size: 12pt;
          color: #ffffff;
          background-color: ${
            data.level === 'Extending' ? '#10b981' : data.level === 'Applying' ? '#4f46e5' : '#f59e0b'
          };
        }
        .section-heading {
          font-size: 13pt;
          font-weight: bold;
          color: #312e81;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-top: 24px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .summary-box {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #4f46e5;
          padding: 12px;
          border-radius: 6px;
          font-size: 11pt;
        }
        .reflection-box {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-left: 4px solid #16a34a;
          padding: 12px;
          border-radius: 6px;
          font-size: 11pt;
          color: #14532d;
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div class="subtitle">EduTN43 • IB MYP Approaches to Learning (ATL) Skill Development Report</div>
        <div class="title">${sanitize(data.taskTitle || 'ATL Skill Task Assessment')}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td><strong>Student Name:</strong> ${sanitize(data.studentName || 'Anonymous')}</td>
          <td><strong>Academic Year:</strong> ${sanitize(data.academicYear)} (${sanitize(data.term)})</td>
        </tr>
        <tr>
          <td style="vertical-align: top;"><strong>Subject & Topic:</strong> ${sanitize(data.subject)} (MYP ${sanitize(data.mypYear)}) — ${sanitize(data.topic)}</td>
          <td style="vertical-align: top;">
            <div><strong>ATL Cluster:</strong> ${sanitize(data.cluster)} (${sanitize(data.category)})</div>
            ${skillIndicatorsHtml}
          </td>
        </tr>
        <tr>
          <td>
            <div style="margin-bottom: 4px;">
              <strong>Formative Score:</strong> 
              <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 11pt; color: #1e1b4b; background-color: #e0e7ff;">
                ${data.formativeScore ? `${data.formativeScore}/8` : (data.feedback?.formativeScore ? `${data.feedback.formativeScore}/8` : 'N/A')}
              </span>
            </div>
            <div>
              <strong>Demonstrated Level:</strong> 
              <span class="badge">${sanitize(data.level)}</span>
            </div>
          </td>
          <td>
            <strong>Skill Attempt & Growth:</strong><br/>
            ${attemptText ? `<strong>${attemptText}</strong><br/>` : ''}
            <span>Progression: ${sanitize(progressionText)}</span>
          </td>
        </tr>
        ${
          data.dueDate || data.submissionStatus
            ? `
        <tr>
          <td>
            <strong>Task Due Date:</strong> ${data.dueDate ? sanitize(data.dueDate) : 'Open Task (No due date)'}
          </td>
          <td>
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

      ${
        (data.criteria && data.criteria.length > 0) || (data.strands && data.strands.length > 0)
          ? `
        <div style="margin-bottom: 20px; border: 1px solid #a7f3d0; background-color: #ecfdf5; border-left: 4px solid #059669; padding: 12px 14px; border-radius: 6px; font-size: 10.5pt; color: #064e3b;">
          <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #047857; margin-bottom: 4px; font-size: 9.5pt;">Target MYP Assessment Criteria & Strands</div>
          ${
            data.criteria && data.criteria.length > 0
              ? `<div><strong>Target Criteria:</strong> ${data.criteria.map((c) => sanitize(c)).join(', ')}</div>`
              : ''
          }
          ${
            data.strands && data.strands.length > 0
              ? `<div style="margin-top: 4px; font-size: 10pt; color: #065f46;"><strong>Focused Strands:</strong> ${data.strands.map((s) => sanitize(s)).join(' • ')}</div>`
              : ''
          }
        </div>
      `
          : ''
      }

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
            <div style="margin-bottom: 20px; border: 1px solid #c7d2fe; background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 8px;">
              <div style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #4338ca; margin-bottom: 4px; font-size: 9.5pt;">
                Approaches to Learning (ATL) Pedagogical Purpose • Named & Taught on Purpose
              </div>
              <div style="font-size: 11pt; font-weight: bold; color: #1e1b4b; margin-bottom: 6px;">
                Targeted Skill: ${sanitize(resolvedGuide?.skill_name || data.cluster)} (${sanitize(data.category)})
              </div>
              <p style="font-size: 10.5pt; color: #312e81; line-height: 1.5; margin: 0 0 10px 0;">
                ${sanitize(resolvedIntro)}
              </p>
              ${
                resolvedGuide
                  ? `
                <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                  <tr>
                    <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 9.5pt; width: 33%; vertical-align: top;">
                      <strong style="color: #4338ca; display: block; margin-bottom: 2px;">1. What You Are Doing:</strong>
                      <span style="color: #334155;">${sanitize(resolvedGuide.what_you_are_doing)}</span>
                    </td>
                    <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 9.5pt; width: 33%; vertical-align: top;">
                      <strong style="color: #4338ca; display: block; margin-bottom: 2px;">2. How It Is Tested (CER):</strong>
                      <span style="color: #334155;">${sanitize(resolvedGuide.how_it_is_tested)}</span>
                    </td>
                    <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e0e7ff; border-radius: 6px; font-size: 9.5pt; width: 34%; vertical-align: top;">
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

      ${
        data.context
          ? `
        <div class="section-heading">Task Context & Background</div>
        <p style="font-size: 11pt; color: #334155; font-style: italic; background: #fafafa; padding: 10px; border-radius: 6px; border: 1px solid #f1f5f9;">
          ${sanitize(data.context)}
        </p>
      `
          : ''
      }

      <div class="section-heading">Task Questions & Student Submitted Answers</div>
      ${responsesHtml}

      <div class="section-heading">ATL Skill Feedback & Evaluation</div>
      <div class="summary-box">
        <strong>Overview:</strong><br/>
        ${sanitize(data.feedback.summary)}
      </div>

      <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
        <tr valign="top">
          <td style="width: 50%; padding-right: 10px;">
            <div style="font-weight: bold; color: #15803d; font-size: 11pt; margin-bottom: 6px;">Key Strengths Demonstrated:</div>
            <ul style="padding-left: 20px; margin: 0;">
              ${strengthsHtml}
            </ul>
          </td>
          <td style="width: 50%; padding-left: 10px;">
            <div style="font-weight: bold; color: #4338ca; font-size: 11pt; margin-bottom: 6px;">Next Steps for Skill Progression:</div>
            <ul style="padding-left: 20px; margin: 0;">
              ${nextStepsHtml}
            </ul>
          </td>
        </tr>
      </table>

      ${
        data.studentReflection
          ? `
        <div class="section-heading">Student Self-Reflection & Learning Log</div>
        <div class="reflection-box">
          <strong>Student Post-Task Reflection:</strong><br/>
          ${sanitize(data.studentReflection)}
        </div>
      `
          : ''
      }

      <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9pt; color: #94a3b8; text-align: center;">
        * Generated by EduTN43 • MYP ATL Skills Workbench & Tracker. Skill Development Report for teaching and learning dialogue.
      </div>
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
    text ? String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';

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
          <strong>Teacher Diagnostic Summary:</strong><br/>
          ${sanitize(log.feedback?.summary || log.teacherEvaluation?.feedback || 'Student completed scientific inquiry response.')}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 8pt; margin-bottom: 8px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px;">
            <strong style="color: #166534; display: block; margin-bottom: 3px;">✓ Demonstrated Strengths:</strong>
            ${
              strengths.length > 0
                ? `<ul style="margin: 0; padding-left: 14px; color: #14532d; line-height: 1.35;">
                    ${strengths.map((s) => `<li style="margin-bottom: 2px;">${sanitize(s)}</li>`).join('')}
                  </ul>`
                : '<span style="color: #15803d;">Demonstrated solid biological reasoning.</span>'
            }
          </div>

          <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 8px 10px;">
            <strong style="color: #3730a3; display: block; margin-bottom: 3px;">→ Actionable Growth Targets:</strong>
            ${
              nextSteps.length > 0
                ? `<ul style="margin: 0; padding-left: 14px; color: #312e81; line-height: 1.35;">
                    ${nextSteps.map((ns) => `<li style="margin-bottom: 2px;">${sanitize(ns)}</li>`).join('')}
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


