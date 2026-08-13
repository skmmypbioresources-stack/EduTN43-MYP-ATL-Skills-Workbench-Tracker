import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client lazily or safely
function getGenAIClient(customKey?: string) {
  const apiKey = (typeof customKey === 'string' && customKey.trim().length > 0)
    ? customKey.trim()
    : process.env.GEMINI_API_KEY;

  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper function to handle transient 503/429 model overload errors with automatic retries and model fallbacks
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    systemInstruction: string;
    contents: string;
    temperature: number;
    responseMimeType: string;
    responseSchema: any;
  },
  maxRetriesPerModel = 2
) {
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastErr: any = null;

  for (const modelName of models) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature,
            responseMimeType: params.responseMimeType,
            responseSchema: params.responseSchema,
          },
        });
        return response;
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        const code = err?.status || err?.code;
        const isTransient =
          code === 503 ||
          code === 429 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('overloaded');

        if (isTransient) {
          console.warn(`[Gemini Retry] Model ${modelName} attempt ${attempt} failed (${msg}). Retrying...`);
          if (attempt < maxRetriesPerModel) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          }
          console.warn(`[Gemini Fallback] Model ${modelName} exhausted retries, trying next model...`);
          break;
        } else {
          throw err;
        }
      }
    }
  }
  throw lastErr;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Task Generator API
app.post('/api/generate-task', async (req, res) => {
  try {
    const { subject, topic, year, category, cluster, autoCluster, iduSubject, criteria, strands, apiKey: bodyApiKey } = req.body;
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }

    const ai = getGenAIClient(customApiKey);

    const systemInstruction = `You are a friendly, encouraging IB MYP educator designing simple, clear, age-appropriate classroom tasks for middle school students.

CRITICAL MANDATES:
1. STRICT QUESTION COUNT: Generate EXACTLY 4 scaffolded question parts (Part A, Part B, Part C, and Part D) - NEVER 3, NEVER 5.
   - Part A: Identify & Recall (basic facts or direct observations).
   - Part B: Explain & Describe (simple cause-and-effect or process).
   - Part C: Apply Knowledge (using ideas in a practical scenario or simple situation).
   - Part D: Analyze & Reflect (a simple decision, challenge, or real-world impact).

2. STRICT YEAR-LEVEL APPROPRIATENESS & AGE CALIBRATION:
   - Target MYP Year: MYP ${year || '3'} (Grade ${Number(year || 3) + 5}).
   - STRICTLY adapt question complexity, depth, and wording to ONLY the selected MYP year level:
     * MYP 1 (Grade 6, ages 11-12): Keep questions EXTREMELY simple, basic, encouraging, and direct! MYP 1 students are just entering middle school — DO NOT give them complex multi-part prompts or heavy academic jargon. Use short sentence structures and relatable everyday examples so they build confidence.
     * MYP 2 & MYP 3 (Grades 7-8): Standard middle school level with guided explanations and simple application.
     * MYP 4 & MYP 5 (Grades 9-10): Grade 9-10 level with basic analysis, but strictly within middle school bounds (DO NOT use DP / university level concepts).
   - Keep context crisp (2 short sentences) and placeholders friendly with clear sentence starters (e.g., "For example: I notice that...").
${criteria && criteria.length > 0 ? `- EXPLICITLY FOCUS TASK PROMPTS ON TARGET MYP CRITERIA: ${criteria.join(', ')}` : ''}
${strands && strands.length > 0 ? `- TARGET SPECIFIC STRANDS:\n  ${strands.join('\n  ')}` : ''}

The task must use the provided SUBJECT and TOPIC as its strict subject content and train the given ATL SKILL CLUSTER in students at MYP year (${year || '3'}).
Return ONLY valid JSON matching the schema.`;

    const userPrompt = `
SUBJECT: ${subject}
TOPIC: ${topic}
MYP YEAR: MYP ${year || '3'}
ATL CATEGORY: ${category || 'Thinking'}
ATL CLUSTER: ${cluster || 'Critical thinking'}
${iduSubject ? `INTERDISCIPLINARY SECOND SUBJECT: ${iduSubject}` : 'NO IDU'}
${criteria && criteria.length > 0 ? `TARGET MYP CRITERIA: ${criteria.join(', ')}` : ''}
${strands && strands.length > 0 ? `TARGET STRANDS:\n${strands.join('\n')}` : ''}
    `;

    if (ai) {
      try {
        const response = await generateContentWithRetry(ai, {
          contents: userPrompt,
          systemInstruction,
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short engaging task title' },
              chosen_cluster: { type: Type.STRING, description: 'The ATL cluster targeted' },
              context: { type: Type.STRING, description: '2 sentence framing grounded in the subject topic' },
              atl_focus_explainer: { type: Type.STRING, description: '1 sentence telling the student what skill this builds and why' },
              idu_note: { type: Type.STRING, description: '1 sentence note on interdisciplinary link, if applicable' },
              target_criteria: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Target MYP criteria' },
              target_strands: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Target MYP strands' },
              parts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: 'Part label: strictly A, B, C, D' },
                    prompt: { type: Type.STRING, description: 'Part instruction text calibrated strictly to target MYP year level' },
                    placeholder: { type: Type.STRING, description: 'Short sentence starter' }
                  },
                  required: ['label', 'prompt']
                }
              },
              estimated_minutes: { type: Type.NUMBER, description: 'Estimated time in minutes' }
            },
            required: ['title', 'chosen_cluster', 'context', 'atl_focus_explainer', 'parts', 'estimated_minutes']
          }
        });

        const text = response.text;
        if (text) {
          const cleanedText = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed.parts && parsed.parts.length > 4) {
            parsed.parts = parsed.parts.slice(0, 4);
          }
          if (criteria && criteria.length > 0 && !parsed.target_criteria) {
            parsed.target_criteria = criteria;
          }
          if (strands && strands.length > 0 && !parsed.target_strands) {
            parsed.target_strands = strands;
          }
          return res.json(parsed);
        }
      } catch (geminiError: any) {
        console.error('Gemini API Error generating task, falling back to smart template:', geminiError?.message || geminiError);
      }
    }

    // Fallback template generator if API key is not present or API call fails
    const chosenClust = cluster || 'Critical thinking';
    const fallbackTask = {
      title: `${chosenClust} Activity: ${topic}`,
      chosen_cluster: chosenClust,
      context: `In this ${subject} activity about "${topic}", you will practice your ${chosenClust.toLowerCase()} skills through 4 step-by-step questions.`,
      atl_focus_explainer: `This task helps you build your ${category || 'Thinking'} skills (${chosenClust}) by guiding you to observe, explain, apply, and reflect on ideas.`,
      idu_note: iduSubject ? `Connects ${subject} ideas with ${iduSubject}.` : '',
      parts: [
        {
          label: 'A',
          prompt: `Identify & State: What are 2 simple facts or observations you know about ${topic} in ${subject}?`,
          placeholder: `For example: One key fact about ${topic} is...`
        },
        {
          label: 'B',
          prompt: `Explain & Describe: How does ${topic} work or function? Explain in 2 short sentences.`,
          placeholder: `For example: When ${topic} happens, it causes... because...`
        },
        {
          label: 'C',
          prompt: `Apply Knowledge: How can you use what you learned about ${topic} in a real situation or example?`,
          placeholder: `For example: In a real scenario, we can apply ${topic} by...`
        },
        {
          label: 'D',
          prompt: `Analyze & Reflect: What is an important decision, advantage, or question about ${topic}? Explain your idea.`,
          placeholder: `For example: An important idea about ${topic} is... because...`
        }
      ],
      estimated_minutes: 15
    };

    return res.json(fallbackTask);
  } catch (err: any) {
    console.error('Server error in /api/generate-task:', err);
    res.status(500).json({ error: 'Failed to generate task.' });
  }
});

// Task Evaluator / Feedback API
app.post('/api/evaluate-task', async (req, res) => {
  try {
    const { task, meta, responses, apiKey: bodyApiKey } = req.body;
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Valid student responses are required.' });
    }

    const ai = getGenAIClient(customApiKey);

    const systemInstruction = `You are a warm, encouraging IB MYP teacher evaluating middle school student work (MYP 1 to MYP 5 / Grades 6 to 10).
Evaluate constructively and kindly using age-appropriate middle school expectations. Remember these are MYP students, NOT DP or university students.

Rubric levels:
- "Developing": Student provided brief or partial answers, or needs a little guidance. Give friendly, encouraging feedback on how to expand their ideas.
- "Applying": Student answered the prompts clearly with good effort and relevant middle-school understanding.
- "Extending": Student provided thoughtful, complete, or creative answers that clearly address the prompts.

Write feedback in a direct, warm, student-friendly tone ("Great job explaining...", "Next time, try adding...").`;

    const userPrompt = `
SUBJECT: ${meta?.subject || 'General'}
TOPIC: ${meta?.topic || 'Topic'}
MYP YEAR: ${meta?.year || '3'}
ATL CATEGORY: ${meta?.category || 'Thinking'}
ATL CLUSTER: ${task?.chosen_cluster || meta?.cluster || 'Critical thinking'}
TASK TITLE: ${task?.title || 'ATL Task'}

STUDENT RESPONSES:
${responses.map((r: any) => `Part ${r.label}: ${r.prompt}\nResponse: ${r.response || '(left blank)'}`).join('\n\n')}
    `;

    if (ai) {
      try {
        const response = await generateContentWithRetry(ai, {
          contents: userPrompt,
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              level: {
                type: Type.STRING,
                enum: ['Developing', 'Applying', 'Extending'],
                description: 'The overall performance level on the ATL skill rubric'
              },
              summary: { type: Type.STRING, description: '2-3 sentence overview grounded in evidence from their responses' },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Bullet points highlighting what worked well'
              },
              next_steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Actionable steps to advance to the next level'
              }
            },
            required: ['level', 'summary', 'strengths', 'next_steps']
          }
        });

        const text = response.text;
        if (text) {
          const cleanedText = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          const parsed = JSON.parse(cleanedText);
          return res.json(parsed);
        }
      } catch (geminiError: any) {
        console.error('Gemini API Error evaluating task, falling back to evaluation heuristic:', geminiError?.message || geminiError);
      }
    }

    // Heuristic fallback grading if Gemini key is absent or fails
    const totalChars = responses.reduce((acc: number, r: any) => acc + (r.response ? r.response.length : 0), 0);
    const filledCount = responses.filter((r: any) => r.response && r.response.trim().length > 10).length;

    let level: 'Developing' | 'Applying' | 'Extending' = 'Developing';
    if (filledCount >= responses.length && totalChars > 250) {
      level = 'Extending';
    } else if (filledCount >= 1 && totalChars > 80) {
      level = 'Applying';
    }

    const clusterName = task?.chosen_cluster || meta?.cluster || 'target skill';

    const fallbackFeedback = {
      level,
      summary: level === 'Extending'
        ? `You demonstrated exceptional engagement with the ${clusterName} skill, providing clear, structured responses backed by domain reasoning.`
        : level === 'Applying'
        ? `You effectively applied ${clusterName} techniques across your answers, making explicit connections to ${meta?.topic || 'the topic'}.`
        : `Your response shows initial engagement with ${clusterName}. Expanding on your answers with specific evidence will help reach higher levels.`,
      strengths: [
        `Directly addressed prompt constraints for ${clusterName}.`,
        `Maintained focus on ${meta?.subject || 'subject'} vocabulary.`
      ],
      next_steps: [
        `Incorporate explicit justification for key assertions in future tasks.`,
        `Practice transfer by applying this approach in other MYP units.`
      ]
    };

    return res.json(fallbackFeedback);
  } catch (err: any) {
    console.error('Server error in /api/evaluate-task:', err);
    res.status(500).json({ error: 'Failed to evaluate task.' });
  }
});

// Setup Vite development server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ATL Workbench server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
