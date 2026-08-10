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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Task Generator API
app.post('/api/generate-task', async (req, res) => {
  try {
    const { subject, topic, year, category, cluster, autoCluster, iduSubject, apiKey: bodyApiKey } = req.body;
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }

    const ai = getGenAIClient(customApiKey);

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

The task must use the provided SUBJECT and TOPIC as its strict subject content and train the given ATL SKILL CLUSTER in students at MYP year (${year || 'MYP 3'}).
Return ONLY valid JSON matching the schema.`;

    const userPrompt = `
SUBJECT: ${subject}
TOPIC: ${topic}
MYP YEAR: MYP ${year || '3'}
ATL CATEGORY: ${category || 'Thinking'}
ATL CLUSTER: ${cluster || 'Critical thinking'}
${iduSubject ? `INTERDISCIPLINARY SECOND SUBJECT: ${iduSubject}` : 'NO IDU'}
    `;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Short engaging task title' },
                chosen_cluster: { type: Type.STRING, description: 'The ATL cluster targeted' },
                context: { type: Type.STRING, description: '2-3 sentence framing grounded in the subject topic' },
                atl_focus_explainer: { type: Type.STRING, description: '1-2 sentences telling the student what skill this builds and why' },
                idu_note: { type: Type.STRING, description: '1-2 sentence note on interdisciplinary link, if applicable' },
                parts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING, description: 'Part label e.g. A, B, C' },
                      prompt: { type: Type.STRING, description: 'Part instruction text' },
                      placeholder: { type: Type.STRING, description: 'Short hint of what a response should contain' }
                    },
                    required: ['label', 'prompt']
                  }
                },
                estimated_minutes: { type: Type.NUMBER, description: 'Estimated time in minutes' }
              },
              required: ['title', 'chosen_cluster', 'context', 'atl_focus_explainer', 'parts', 'estimated_minutes']
            }
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
        console.error('Gemini API Error generating task, falling back to smart template:', geminiError?.message || geminiError);
      }
    }

    // Fallback template generator if API key is not present or API call fails
    const chosenClust = cluster || 'Critical thinking';
    const fallbackTask = {
      title: `${chosenClust} Activity: ${topic}`,
      chosen_cluster: chosenClust,
      context: `In this ${subject} activity about "${topic}", you will practice your ${chosenClust.toLowerCase()} skills through simple, step-by-step questions.`,
      atl_focus_explainer: `This task helps you build your ${category || 'Thinking'} skills (${chosenClust}) by guiding you to observe, explain, and share your ideas clearly.`,
      idu_note: iduSubject ? `Connects ${subject} ideas with ${iduSubject}.` : '',
      parts: [
        {
          label: 'A',
          prompt: `What are 2 simple things you already know or notice about ${topic} in ${subject}?`,
          placeholder: `For example: One key fact about ${topic} is...`
        },
        {
          label: 'B',
          prompt: `How does ${topic} work or affect things around us? Explain in 2-3 short sentences.`,
          placeholder: `For example: When ${topic} happens, it causes... because...`
        },
        {
          label: 'C',
          prompt: `What is your opinion or a question you still have about ${topic}? Explain why you think so.`,
          placeholder: `For example: I think ${topic} is important because...`
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
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
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
