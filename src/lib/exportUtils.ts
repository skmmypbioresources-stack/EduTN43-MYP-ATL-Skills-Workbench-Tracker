import { TaskFeedback, TaskMeta, GeneratedTask, StudentResponseItem } from '../types';

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
  taskTitle: string;
  context?: string;
  responses: StudentResponseItem[];
  feedback: TaskFeedback;
}

/**
 * Generates and downloads a Microsoft Word (.doc) report containing:
 * - Student & Course Metadata
 * - ATL Skill Cluster & Achieved Level
 * - Task Title, Context & Questions
 * - Submitted Student Answers
 * - Formative AI Feedback (Overview, Strengths & Next Steps)
 */
export function exportToWordDoc(data: ReportData) {
  const sanitize = (text: string) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const strengthsHtml = data.feedback.strengths
    .map((s) => `<li style="margin-bottom: 6px; color: #166534;"><strong>✓</strong> ${sanitize(s)}</li>`)
    .join('');

  const nextStepsHtml = data.feedback.next_steps
    .map((ns) => `<li style="margin-bottom: 6px; color: #3730a3;"><strong>→</strong> ${sanitize(ns)}</li>`)
    .join('');

  const responsesHtml = data.responses
    .map(
      (r, i) => `
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

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>ATL Formative Assessment Report - ${sanitize(data.studentName)}</title>
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
      </style>
    </head>
    <body>
      <div class="header-box">
        <div class="subtitle">IB MYP Approaches to Learning (ATL) • Formative Assessment Report</div>
        <div class="title">${sanitize(data.taskTitle || 'ATL Skill Task Assessment')}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td><strong>Student Name:</strong> ${sanitize(data.studentName || 'Anonymous')}</td>
          <td><strong>Academic Year:</strong> ${sanitize(data.academicYear)} (${sanitize(data.term)})</td>
        </tr>
        <tr>
          <td><strong>Subject & Topic:</strong> ${sanitize(data.subject)} (MYP ${sanitize(data.mypYear)}) — ${sanitize(data.topic)}</td>
          <td><strong>ATL Cluster:</strong> ${sanitize(data.cluster)} (${sanitize(data.category)})</td>
        </tr>
        <tr>
          <td colspan="2">
            <strong>Demonstrated Skill Level:</strong> 
            <span class="badge">${sanitize(data.level)}</span>
          </td>
        </tr>
      </table>

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

      <div class="section-heading">Formative Assessment Feedback</div>
      <div class="summary-box">
        <strong>Overview:</strong><br/>
        ${sanitize(data.feedback.summary)}
      </div>

      <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
        <tr valign="top">
          <td style="width: 50%; padding-right: 10px;">
            <div style="font-weight: bold; color: #15803d; font-size: 11pt; margin-bottom: 6px;">Key Strengths:</div>
            <ul style="padding-left: 20px; margin: 0;">
              ${strengthsHtml}
            </ul>
          </td>
          <td style="width: 50%; padding-left: 10px;">
            <div style="font-weight: bold; color: #4338ca; font-size: 11pt; margin-bottom: 6px;">Next Steps for Growth:</div>
            <ul style="padding-left: 20px; margin: 0;">
              ${nextStepsHtml}
            </ul>
          </td>
        </tr>
      </table>

      <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9pt; color: #94a3b8; text-align: center;">
        * Generated by MYP ATL Skills Workbench & Tracker. Formative indicator for teaching and learning dialogue.
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
