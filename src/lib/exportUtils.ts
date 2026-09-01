import { TaskFeedback, TaskMeta, GeneratedTask, StudentResponseItem, ATLTaskLog } from '../types';
import html2pdf from 'html2pdf.js';

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

