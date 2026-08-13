import { GeneratedTask, TaskFeedback, TaskMeta, StudentResponseItem } from '../types';

/**
 * Direct Client-Side Gemini API generator with retries and model fallbacks for transient 503 errors.
 */

async function fetchGeminiWithRetry(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.3
): Promise<string> {
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastErrMessage = '';

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
            generationConfig: {
              temperature,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson?.error?.message || `Gemini API status ${res.status}`;
          lastErrMessage = errMsg;
          const isTransient =
            res.status === 503 ||
            res.status === 429 ||
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('RESOURCE_EXHAUSTED');

          if (isTransient) {
            console.warn(`[Client Gemini Retry] Model ${model} attempt ${attempt} failed (${errMsg}). Retrying...`);
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 1200));
              continue;
            }
            console.warn(`[Client Gemini Fallback] Model ${model} exhausted retries, trying fallback model...`);
            break;
          } else {
            throw new Error(errMsg);
          }
        }

        const geminiData = await res.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          return rawText;
        }
      } catch (err: any) {
        lastErrMessage = err?.message || String(err);
        if (
          attempt < 2 &&
          (lastErrMessage.includes('503') ||
            lastErrMessage.includes('UNAVAILABLE') ||
            lastErrMessage.includes('high demand'))
        ) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
      }
    }
  }
  throw new Error(lastErrMessage || 'Gemini API call failed across all models.');
}

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
          criteria: meta.criteria,
          strands: meta.strands,
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
      const systemInstruction = `You are a friendly, encouraging IB MYP educator designing simple, clear, age-appropriate classroom tasks for middle school students.

CRITICAL MANDATES:
1. STRICT QUESTION COUNT: Generate EXACTLY 4 scaffolded question parts (Part A, Part B, Part C, and Part D) - NEVER 3, NEVER 5.
   - Part A: Identify & Recall (basic facts or direct observations).
   - Part B: Explain & Describe (simple cause-and-effect or process).
   - Part C: Apply Knowledge (using ideas in a practical scenario or simple situation).
   - Part D: Analyze & Reflect (a simple decision, challenge, or real-world impact).

2. STRICT YEAR-LEVEL APPROPRIATENESS & AGE CALIBRATION:
   - Target MYP Year: MYP ${meta.year || '3'} (Grade ${Number(meta.year || 3) + 5}).
   - STRICTLY adapt question complexity, depth, and wording to ONLY the selected MYP year level:
     * MYP 1 (Grade 6, ages 11-12): Keep questions EXTREMELY simple, basic, encouraging, and direct! MYP 1 students are just entering middle school — DO NOT give them complex multi-part prompts or heavy academic jargon. Use short sentence structures and relatable everyday examples so they build confidence.
     * MYP 2 & MYP 3 (Grades 7-8): Standard middle school level with guided explanations and simple application.
     * MYP 4 & MYP 5 (Grades 9-10): Grade 9-10 level with basic analysis, but strictly within middle school bounds (DO NOT use DP / university level concepts).
   - Keep context crisp (2 short sentences) and placeholders friendly with clear sentence starters (e.g., "For example: I notice that...").
${meta.criteria && meta.criteria.length > 0 ? `- Target Criteria: ${meta.criteria.join(', ')}` : ''}
${meta.strands && meta.strands.length > 0 ? `- Target Strands:\n  ${meta.strands.join('\n  ')}` : ''}

Return strictly valid JSON with this EXACT structure (no markdown fences, no text outside JSON):
{
  "title": "Short catchy task title",
  "chosen_cluster": "${meta.cluster || 'Critical thinking'}",
  "context": "Clear, simple MYP scenario establishing the topic in 2 short, easy sentences.",
  "atl_focus_explainer": "1 short sentence explaining what simple skill they are practicing.",
  "idu_note": "Optional simple interdisciplinary note if applicable",
  "target_criteria": ${JSON.stringify(meta.criteria || [])},
  "target_strands": ${JSON.stringify(meta.strands || [])},
  "parts": [
    {
      "label": "A",
      "prompt": "Identify & State prompt...",
      "placeholder": "Friendly sentence starter..."
    },
    {
      "label": "B",
      "prompt": "Explain & Describe prompt...",
      "placeholder": "Friendly sentence starter..."
    },
    {
      "label": "C",
      "prompt": "Apply Knowledge prompt...",
      "placeholder": "Friendly sentence starter..."
    },
    {
      "label": "D",
      "prompt": "Analyze & Reflect prompt...",
      "placeholder": "Friendly sentence starter..."
    }
  ],
  "estimated_minutes": 15
}`;

      const userPrompt = `Subject: ${meta.subject}\nTopic: ${meta.topic}\nMYP Year: ${meta.year}\nATL Category: ${meta.category}\nATL Cluster: ${meta.cluster}${meta.iduSubject ? `\nIDU Secondary Subject: ${meta.iduSubject}` : ''}${meta.criteria ? `\nTarget Criteria: ${meta.criteria.join(', ')}` : ''}${meta.strands ? `\nTarget Strands: ${meta.strands.join('; ')}` : ''}`;

      const rawText = await fetchGeminiWithRetry(trimmedKey, systemInstruction, userPrompt, 0.3);
      if (rawText) {
        const cleanedText = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        const parsed = JSON.parse(cleanedText);
        if (parsed.parts && parsed.parts.length > 4) {
          parsed.parts = parsed.parts.slice(0, 4);
        }
        return parsed;
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
    context: `In this ${meta.subject} activity on "${meta.topic}", you will practice your ${chosenClust.toLowerCase()} skills through 4 simple, step-by-step questions.`,
    atl_focus_explainer: `This task helps you build your ${meta.category} skills (${chosenClust}) by guiding you to observe, explain, apply, and reflect on ideas.`,
    idu_note: meta.iduSubject ? `Connects ${meta.subject} ideas with ${meta.iduSubject}.` : undefined,
    parts: [
      {
        label: 'A',
        prompt: `Identify & State: What are 2 simple things you already know or notice about ${meta.topic} in ${meta.subject}?`,
        placeholder: `For example: One key fact about ${meta.topic} is...`,
      },
      {
        label: 'B',
        prompt: `Explain & Describe: How does ${meta.topic} work or affect things around us? Explain in 2 short sentences.`,
        placeholder: `For example: When ${meta.topic} happens, it causes... because...`,
      },
      {
        label: 'C',
        prompt: `Apply Knowledge: How can you use what you learned about ${meta.topic} in a real situation or example?`,
        placeholder: `For example: In a real scenario, we can apply ${meta.topic} by...`,
      },
      {
        label: 'D',
        prompt: `Analyze & Reflect: What is an important decision, advantage, or question about ${meta.topic}? Explain your idea.`,
        placeholder: `For example: An important idea about ${meta.topic} is... because...`,
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

      const rawText = await fetchGeminiWithRetry(trimmedKey, systemInstruction, userPrompt, 0.2);
      if (rawText) {
        const cleanedText = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        return JSON.parse(cleanedText);
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
