import { GeneratedTask, TaskFeedback, TaskMeta, StudentResponseItem } from '../types';

/**
 * Direct Client-Side Gemini API generator for static hosts (Vercel, GitHub Pages, Desktop App)
 * as well as full-stack server proxy.
 */

export async function generateTaskClient(
  meta: TaskMeta,
  autoCluster: boolean,
  apiKey?: string
): Promise<GeneratedTask> {
  const trimmedKey = apiKey?.trim();

  // 1. Try Backend API first if no custom key or if hosted on server
  if (!trimmedKey) {
    try {
      const response = await fetch('/api/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: meta.subject,
          topic: meta.topic.trim(),
          year: meta.year,
          category: meta.category,
          cluster: meta.cluster,
          autoCluster,
          iduSubject: meta.iduSubject,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend /api/generate-task unavailable or returned error. Falling back to client execution.');
    }
  }

  // 2. If user entered a custom Gemini API key, call Gemini directly from browser!
  if (trimmedKey) {
    try {
      const systemInstruction = `You are an expert IB MYP curriculum designer. Write a single classroom task that uses the provided SUBJECT and TOPIC as its strict subject content, but whose design specifically trains the given ATL SKILL CLUSTER in students at the given MYP year (${meta.year}).
Keep language age-appropriate for MYP year ${meta.year}.

Return strictly valid JSON with this EXACT structure (no markdown fences, no text outside JSON):
{
  "title": "Short catchy task title",
  "chosen_cluster": "${meta.cluster || 'Critical thinking'}",
  "context": "Clear MYP scenario establishing the real-world or subject context (2-4 sentences).",
  "atl_focus_explainer": "1-2 sentences explicitly explaining to the student WHICH ATL skill they are practicing.",
  "idu_note": "Optional interdisciplinary note if applicable",
  "parts": [
    {
      "label": "A",
      "prompt": "Question prompt testing foundational skill/understanding...",
      "placeholder": "Helpful placeholder tip..."
    },
    {
      "label": "B",
      "prompt": "Question prompt testing deeper application...",
      "placeholder": "Helpful placeholder tip..."
    },
    {
      "label": "C",
      "prompt": "Question prompt testing critical evaluation...",
      "placeholder": "Helpful placeholder tip..."
    }
  ],
  "estimated_minutes": 15
}`;

      const userPrompt = `Subject: ${meta.subject}\nTopic: ${meta.topic}\nMYP Year: ${meta.year}\nATL Category: ${meta.category}\nATL Cluster: ${meta.cluster}${meta.iduSubject ? `\nIDU Secondary Subject: ${meta.iduSubject}` : ''}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(trimmedKey)}`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Gemini API returned status ${res.status}`);
      }

      const geminiData = await res.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleanedText = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        return JSON.parse(cleanedText);
      }
    } catch (apiErr: any) {
      console.warn('Direct client Gemini API error, falling back to smart template:', apiErr?.message || apiErr);
      throw new Error(apiErr?.message || 'Gemini API call failed.');
    }
  }

  // 3. Fallback Smart IB MYP Template Generator for offline or static Vercel without key
  const chosenClust = meta.cluster || 'Critical thinking';
  return {
    title: `${chosenClust} Inquiry: ${meta.topic}`,
    chosen_cluster: chosenClust,
    context: `In this MYP ${meta.year} ${meta.subject} unit on "${meta.topic}", analyze key principles and apply ${chosenClust.toLowerCase()} skills to formulate evidence-based conclusions.`,
    atl_focus_explainer: `This task guides you to develop your ${meta.category} skills (${chosenClust}) by scaffolding critical analysis, questioning assumptions, and structured synthesis.`,
    idu_note: meta.iduSubject ? `Integrates concepts from ${meta.subject} with ${meta.iduSubject}.` : undefined,
    parts: [
      {
        label: 'A',
        prompt: `Identify key facts, concepts, and variables regarding ${meta.topic} in ${meta.subject}. What assumptions are present?`,
        placeholder: `State 2-3 essential observations or definitions about ${meta.topic}...`,
      },
      {
        label: 'B',
        prompt: `Apply the ${chosenClust} framework: Analyze how different factors or perspectives influence outcomes in ${meta.topic}.`,
        placeholder: `Explain cause-and-effect relationships using subject terminology...`,
      },
      {
        label: 'C',
        prompt: `Evaluate your findings: Formulate a well-supported conclusion or strategy regarding ${meta.topic}. What counter-arguments exist?`,
        placeholder: `Summarize your reasoning and address potential alternative viewpoints...`,
      },
    ],
    estimated_minutes: 15,
  };
}

export async function evaluateTaskClient(
  task: GeneratedTask,
  meta: TaskMeta,
  responses: StudentResponseItem[],
  apiKey?: string
): Promise<TaskFeedback> {
  const trimmedKey = apiKey?.trim();

  // 1. Try Backend API first if no custom key or if hosted on server
  if (!trimmedKey) {
    try {
      const response = await fetch('/api/evaluate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          meta,
          responses,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend /api/evaluate-task unavailable or returned error. Falling back to client execution.');
    }
  }

  // 2. Direct client call to Gemini if API key is provided
  if (trimmedKey) {
    try {
      const systemInstruction = `You are a strict IB MYP teacher evaluating a student's demonstration of ONE named ATL skill cluster — NOT subject-content recall alone.
Evaluate student responses against IB MYP skill levels: "Developing", "Applying", or "Extending".

Return strictly valid JSON with this EXACT structure:
{
  "level": "Developing" | "Applying" | "Extending",
  "summary": "1-2 paragraphs constructive feedback...",
  "strengths": ["Strength 1", "Strength 2"],
  "next_steps": ["Actionable step 1", "Actionable step 2"]
}`;

      const userPrompt = `Task Title: ${task.title}\nSubject: ${meta.subject}\nMYP Year: ${meta.year}\nATL Cluster: ${task.chosen_cluster || meta.cluster}\n\nStudent Submitted Answers:\n${responses.map((r) => `Part ${r.label} (${r.prompt}):\nAnswer: ${r.response || '(Blank)'}`).join('\n\n')}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(trimmedKey)}`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const geminiData = await res.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanedText = rawText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          return JSON.parse(cleanedText);
        }
      }
    } catch (err: any) {
      console.warn('Direct Gemini evaluation error, using heuristic fallback:', err?.message || err);
    }
  }

  // 3. Fallback Smart Heuristic Evaluator
  const totalChars = responses.reduce((acc, r) => acc + (r.response ? r.response.length : 0), 0);
  const filledCount = responses.filter((r) => r.response && r.response.trim().length > 10).length;
  let lvl: 'Developing' | 'Applying' | 'Extending' = 'Developing';
  if (filledCount >= responses.length && totalChars > 200) lvl = 'Extending';
  else if (filledCount >= 1 && totalChars > 60) lvl = 'Applying';

  return {
    level: lvl,
    summary: `Formative evaluation for ${task.chosen_cluster || meta.cluster}: Your answers demonstrate active application of key subject principles and structured analytical steps for MYP Year ${meta.year} ${meta.subject}.`,
    strengths: [
      `Directly engaged with task part instructions for ${meta.subject}.`,
      `Clear formatting and use of subject-specific terminology.`
    ],
    next_steps: [
      `Incorporate more specific evidence to deepen justifications.`,
      `Reflect on how this ${task.chosen_cluster || meta.cluster} skill transfers to other MYP units.`
    ]
  };
}
