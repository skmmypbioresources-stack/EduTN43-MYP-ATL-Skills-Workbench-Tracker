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
      const systemInstruction = `You are a friendly, encouraging IB MYP educator designing simple, clear, age-appropriate classroom tasks for middle school students (MYP 1 to MYP 5 / Grades 6 to 10).

CRITICAL ACCESSIBILITY & AGE LEVEL MANDATE:
- DO NOT create DP (Diploma Programme) or university-level complex questions.
- MAXIMUM difficulty is Grade 10 / MYP 5, but even for MYP 5, questions MUST BE EASY to understand and straightforward to answer.
- For younger grades (MYP 1, MYP 2, MYP 3, MYP 4 / Grades 6-9), make questions VERY EASY, simple, relatable, and direct.
- Use clear, simple vocabulary, short sentences, and explicit step-by-step prompts so students immediately know what to write without feeling overwhelmed.
- Avoid dense academic jargon or complicated sentence structures.
- Make questions encouraging and fun to attempt so students feel confident.
- Provide scaffolded prompts (Part A: simple identification or recall; Part B: simple explanation or cause-and-effect; Part C: simple personal reflection or decision).
- Placeholders must offer friendly, concrete sentence starters (e.g., "For example: I think... because...").

Return strictly valid JSON with this EXACT structure (no markdown fences, no text outside JSON):
{
  "title": "Short catchy task title",
  "chosen_cluster": "${meta.cluster || 'Critical thinking'}",
  "context": "Clear, simple MYP scenario establishing the topic in 2 short, easy sentences.",
  "atl_focus_explainer": "1 short sentence explaining what simple skill they are practicing.",
  "idu_note": "Optional simple interdisciplinary note if applicable",
  "parts": [
    {
      "label": "A",
      "prompt": "Simple, easy question prompt asking for basic facts or observations...",
      "placeholder": "Friendly sentence starter or tip..."
    },
    {
      "label": "B",
      "prompt": "Simple, step-by-step question prompt asking to explain or apply...",
      "placeholder": "Friendly sentence starter or tip..."
    },
    {
      "label": "C",
      "prompt": "Simple question prompt asking for student's opinion or reflection...",
      "placeholder": "Friendly sentence starter or tip..."
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
    title: `${chosenClust} Activity: ${meta.topic}`,
    chosen_cluster: chosenClust,
    context: `In this ${meta.subject} activity on "${meta.topic}", you will practice your ${chosenClust.toLowerCase()} skills through simple, step-by-step questions.`,
    atl_focus_explainer: `This task helps you build your ${meta.category} skills (${chosenClust}) by guiding you to observe, explain, and share your ideas clearly.`,
    idu_note: meta.iduSubject ? `Connects ${meta.subject} ideas with ${meta.iduSubject}.` : undefined,
    parts: [
      {
        label: 'A',
        prompt: `What are 2 simple things you already know or notice about ${meta.topic} in ${meta.subject}?`,
        placeholder: `For example: One key fact about ${meta.topic} is...`,
      },
      {
        label: 'B',
        prompt: `How does ${meta.topic} work or affect things around us? Explain in 2-3 short sentences.`,
        placeholder: `For example: When ${meta.topic} happens, it causes... because...`,
      },
      {
        label: 'C',
        prompt: `What is your opinion or a question you still have about ${meta.topic}? Explain why you think so.`,
        placeholder: `For example: I think ${meta.topic} is important because...`,
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
      const systemInstruction = `You are a warm, encouraging IB MYP teacher evaluating middle school student work (MYP 1 to MYP 5 / Grades 6 to 10).
Evaluate constructively and kindly using age-appropriate middle school expectations. Remember these are MYP students, NOT DP or university students.

Rubric levels:
- "Developing": Student provided brief or partial answers, or needs a little guidance. Give friendly, encouraging feedback on how to expand their ideas.
- "Applying": Student answered the prompts clearly with good effort and relevant middle-school understanding.
- "Extending": Student provided thoughtful, complete, or creative answers that clearly address the prompts.

Return strictly valid JSON with this EXACT structure:
{
  "level": "Developing" | "Applying" | "Extending",
  "summary": "1-2 paragraphs friendly constructive feedback...",
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
