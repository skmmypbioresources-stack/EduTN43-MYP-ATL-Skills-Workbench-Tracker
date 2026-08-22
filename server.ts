import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  determinePrimaryCriterion,
  generateTaskByCriterion,
  validateScientificDataset,
} from './src/lib/scientificDatasetGenerator';

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
    const { subject, topic, year, category, cluster, autoCluster, iduSubject, criteria, strands, title, taskTitle, apiKey: bodyApiKey } = req.body;
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }

    const exactTitle = (taskTitle || title || topic || '').trim();
    const primaryCriterion = determinePrimaryCriterion(criteria, strands);
    const ai = getGenAIClient(customApiKey);

    // Build strict Criterion-governed System Instruction
    let criterionDirectives = '';
    if (primaryCriterion === 'Criterion A') {
      criterionDirectives = `
CORE MANDATE — CRITERION A (Knowing & Understanding):
- Task Type: Conceptual biology, scientific explanations, compare and contrast, scientific reasoning, and application of knowledge.
- ABSOLUTE PROHIBITION: You MUST NOT generate any graphs, numerical datasets, data tables, or experimental results tables. The "scientific_dataset" field MUST be omitted / null.
- Inquiry Structure (Scaffolded 4 Parts):
  * Part A: Explain & Define (Foundational Scientific Knowledge — explicit structure-function relationships).
  * Part B: Compare & Contrast (Mechanistic Analysis — compare biological systems, energy demands, and pathways).
  * Part C: Apply Knowledge (Unfamiliar Situation — predict cellular/organ-system impacts of a mutation, drug, or stressor).
  * Part D: Scientist's Challenge (Model Critique & Synthesis — evaluate strengths and limitations of biological models/analogies).
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Explain, Compare, Apply, Synthesise, Evaluate). Focus on conceptual mastery.`;
    } else if (primaryCriterion === 'Criterion B') {
      criterionDirectives = `
CORE MANDATE — CRITERION B (Inquiring & Designing):
- Task Type: Authentic scientific investigation design (students design the investigation rather than analyse outcomes).
- ABSOLUTE PROHIBITION: You MUST NOT generate results, experimental data tables, outcome numbers, graphs, or data analysis questions. The "scientific_dataset" field MUST be omitted / null.
- Inquiry Structure (Scaffolded 4 Parts):
  * Part A: Research Question & Hypothesis (Formulate a focused, testable question and a testable hypothesis with scientific rationale).
  * Part B: Variable Manipulation & Operationalization (Explicitly define IV with 5 intervals & units, DV with measurement protocol & units, and 3+ strictly Controlled Variables with specific control methods).
  * Part C: Apparatus & Step-by-Step Methodology (Detailed, numbered, replicable procedure, precise apparatus selection, and repeat trials).
  * Part D: Safety, Ethics & Validity Improvement (Scientist's Challenge — 2 specific hazards with mitigation precautions, and prevention of confounding variables/systematic errors).
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Formulate, Operationalize, Design, Evaluate). Focus on experimental design.`;
    } else if (primaryCriterion === 'Criterion C') {
      criterionDirectives = `
CORE MANDATE — CRITERION C (Processing & Evaluating — Data Questions Only):
- Task Type: Quantitative data analysis, mathematical transformations, graph interpretation, and methodological evaluation.
- THIS IS THE ONLY CRITERION PERMITTED TO GENERATE GRAPHS OR DATA.
- MANDATORY SCIENTIFIC DATASET & GRAPH:
  * Generate a realistic simulated biological dataset inside "scientific_dataset" with authentic biological fluctuations (never flat/linear).
  * Plotted graph points MUST EXACTLY MATCH every row in the data table.
  * Clearly labelled axes (x_axis_label, y_axis_label) and unit labels (unit_x, unit_y).
  * Publication-quality title (e.g. "Figure 1. Effect of Ambient Temperature on Mean Pollen Tube Growth Rate and Seed Set in Prunus avium").
  * Source label must strictly be: "Source: Simulated biological dataset generated for educational purposes.".
  * Provide 5 to 10 authentic data rows inside "data".
- Inquiry Structure (Scaffolded 5 Parts progressing in difficulty):
  * Part A: Identify a Trend (Pattern recognition citing initial, peak/inflection, and final values from the dataset).
  * Part B: Process Numerical Evidence (Scientific calculation — calculate rate of change, % difference, or mean value showing formula and units).
  * Part C: Explain Biological Relationship (Mechanistic cellular, physiological, or molecular explanation of the observed data).
  * Part D: Evaluate Reliability & Limitations (Evaluate sample size, anomalies, repeatability, and confounding variables).
  * Part E: Draw Justified Conclusion & Suggest Improvement (Scientist's Challenge — data-justified conclusion + targeted methodological improvement).
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Analyse, Calculate, Interpret, Evaluate, Justify). Focus on data literacy.`;
    } else {
      // Criterion D
      criterionDirectives = `
CORE MANDATE — CRITERION D (Reflecting on the Impacts of Science):
- Task Type: Authentic real-world scenarios involving ethics, sustainability, global context, scientific innovation, environmental decision-making, and societal implications.
- Embedded Global Context: Automatically embed one meaningful global context (e.g. Globalisation & sustainability, Scientific & technical innovation, Fairness & development, Identities & relationships) directly shaping the narrative scenario.
- ABSOLUTE PROHIBITION: You MUST NOT generate experimental datasets, data tables, or numerical graphs. The "scientific_dataset" field MUST be omitted / null. Students evaluate impacts using biological knowledge.
- Inquiry Structure (Scaffolded 4 Parts):
  * Part A: Scientific Application & Context (Explain how biological science/technology in ${topic} is applied to solve a real-world problem).
  * Part B: Multi-Perspective Implications (Evaluate at least 2 distinct implications: moral, ethical, social, economic, or environmental — weighing benefits vs risks).
  * Part C: Scientific Communication & Stakeholder Literacy (Evaluate how scientific language and evidence are used to communicate with diverse stakeholders and resolve conflicting interests).
  * Part D: Justified Ethical Decision (Scientist's Challenge — defend a policy, regulation, or ethical stance balancing scientific efficacy with global responsibilities).
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Explain, Discuss, Evaluate, Justify). Focus on scientific literacy and bioethics.`;
    }

    const systemInstruction = `You are a distinguished International Baccalaureate (IB) MYP and DP Sciences / Biology Senior Examiner and Curriculum Specialist.
Your mission is to generate intellectually rigorous, higher-order thinking learning tasks that train students to think and reason like real scientists.

CRITICAL RULE: THE SELECTED MYP CRITERION DETERMINES THE TASK STYLE. The AI must never generate the wrong assessment style.

${criterionDirectives}

ADDITIONAL MANDATES:
1. AUTHENTIC GLOBAL CONTEXT: Embed a relevant global context (e.g. Globalisation & sustainability, Scientific & technical innovation, Fairness & development, Food security & biodiversity) that meaningfully influences the scenario.
2. DIFFICULTY SCALING: Adapt cognitive demand for MYP Year ${year || '4'} (deep mechanistic understanding, precise terminology like ATP, membrane transport, phosphorylation, enzyme kinetics, ecological cascades).
3. EXACT TASK TITLE: The task title is strictly: "${exactTitle}". Do NOT modify or replace it.

Return ONLY valid JSON matching the schema without markdown formatting.`;

    const userPrompt = `
PRIMARY MYP CRITERION: ${primaryCriterion}
TASK TITLE: ${exactTitle}
SUBJECT: ${subject}
TOPIC: ${topic}
MYP YEAR: MYP ${year || '4'}
ATL CATEGORY: ${category || 'Thinking'}
ATL CLUSTER: ${cluster || 'Critical thinking'}
${iduSubject ? `INTERDISCIPLINARY SECOND SUBJECT: ${iduSubject}` : 'NO IDU'}
${criteria && criteria.length > 0 ? `ALL SELECTED CRITERIA: ${criteria.join(', ')}` : `CRITERION: ${primaryCriterion}`}
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
              title: { type: Type.STRING, description: 'Task title (must match the specified task title)' },
              chosen_cluster: { type: Type.STRING, description: 'The ATL cluster targeted' },
              global_context: { type: Type.STRING, description: 'Authentic global context' },
              context: { type: Type.STRING, description: 'Authentic real-world scientific scenario framing the investigation' },
              atl_focus_explainer: { type: Type.STRING, description: 'Skill statement with 3-4 measurable action-verb indicators' },
              skill_indicators: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-5 measurable skill indicators starting with observable action verbs'
              },
              scientific_dataset: {
                type: Type.OBJECT,
                description: 'Authentic simulated scientific dataset and graph stimulus (ONLY for Criterion C, omit for A, B, D)',
                properties: {
                  graph_type: { type: Type.STRING, enum: ['line', 'bar', 'scatter', 'histogram', 'pie'] },
                  title: { type: Type.STRING, description: 'Publication-quality figure title' },
                  global_context: { type: Type.STRING, description: 'Global context' },
                  description: { type: Type.STRING, description: 'Description of the scientific methodology or setup' },
                  x_axis_label: { type: Type.STRING, description: 'Independent variable name' },
                  y_axis_label: { type: Type.STRING, description: 'Dependent variable name' },
                  unit_x: { type: Type.STRING, description: 'Unit for X axis' },
                  unit_y: { type: Type.STRING, description: 'Unit for Y axis' },
                  source_label: { type: Type.STRING, description: 'Must be: Source: Simulated biological dataset generated for educational purposes.' },
                  x_key: { type: Type.STRING, description: 'Key name for X axis' },
                  y_keys: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of numeric series keys' },
                  series_labels: { type: Type.OBJECT, description: 'Mapping of series keys to human-readable names' },
                  data: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT },
                    description: 'Array of 5-10 data rows with authentic non-linear scientific data'
                  }
                },
                required: ['graph_type', 'title', 'x_axis_label', 'y_axis_label', 'x_key', 'data']
              },
              idu_note: { type: Type.STRING, description: '1 sentence note on interdisciplinary link, if applicable' },
              target_criteria: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Target MYP criteria' },
              target_strands: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Target MYP strands' },
              parts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: 'Part label (A, B, C, D, E)' },
                    prompt: { type: Type.STRING, description: 'Progressive inquiry prompt aligned with the selected criterion' },
                    placeholder: { type: Type.STRING, description: 'Scientific reasoning starter cue' }
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
          parsed.title = exactTitle || parsed.title;

          // Enforce strict Criterion constraints on generated output
          if (primaryCriterion === 'Criterion A' || primaryCriterion === 'Criterion B' || primaryCriterion === 'Criterion D') {
            delete parsed.scientific_dataset;
          } else if (primaryCriterion === 'Criterion C') {
            if (!validateScientificDataset(parsed.scientific_dataset)) {
              // Ensure Criterion C always has a valid publication-quality dataset
              parsed.scientific_dataset = generateTaskByCriterion('Criterion C', topic, subject, year, cluster, exactTitle).scientific_dataset;
            } else {
              parsed.scientific_dataset.source_label = 'Source: Simulated biological dataset generated for educational purposes.';
            }
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
        console.error('Gemini API Error generating task, falling back to criterion template:', geminiError?.message || geminiError);
      }
    }

    // Fallback template generator governed strictly by the selected MYP Criterion
    const fallbackTask = generateTaskByCriterion(
      primaryCriterion,
      topic,
      subject,
      year || '4',
      cluster || 'Critical thinking',
      exactTitle
    );
    if (iduSubject) {
      fallbackTask.idu_note = `Synthesizes core ${subject} mechanisms with analytical frameworks in ${iduSubject}.`;
    }
    if (criteria && criteria.length > 0) {
      fallbackTask.target_criteria = criteria;
    }
    if (strands && strands.length > 0) {
      fallbackTask.target_strands = strands;
    }

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

    const primaryCriterion = determinePrimaryCriterion(meta?.criteria || task?.target_criteria, meta?.strands || task?.target_strands);
    const ai = getGenAIClient(customApiKey);

    let criterionMarkingFocus = '';
    if (primaryCriterion === 'Criterion A') {
      criterionMarkingFocus = 'Focus: Assess depth and accuracy of biological knowledge, precision of terminology (e.g. ATP, selective permeability, enzyme active sites), mechanistic clarity, and ability to apply knowledge to unfamiliar situations. Never award marks for vague descriptive phrases.';
    } else if (primaryCriterion === 'Criterion B') {
      criterionMarkingFocus = 'Focus: Assess quality of investigation design: formulation of a testable hypothesis with scientific rationale, clear operationalization of IV/DV and 3+ controlled variables with control methods, validity and replicability of step-by-step procedure, apparatus choice, and safety/hazard mitigation.';
    } else if (primaryCriterion === 'Criterion C') {
      criterionMarkingFocus = 'Focus: Assess quantitative data literacy: accurate trend identification, mathematical calculations with correct units, mechanistic explanations of observed results, evaluation of anomalies/reliability/limitations, and evidence-based justified conclusions. Do NOT award marks for merely reading raw values.';
    } else {
      criterionMarkingFocus = 'Focus: Assess evaluation of scientific applications, multi-perspective implications (moral, ethical, social, economic, environmental), use of scientific language, and justified decision-making within the global context.';
    }

    const systemInstruction = `You are a strict, experienced IB MYP & DP Biology Chief Examiner.
Evaluate student submissions with uncompromising academic rigor, precision, and objectivity.

TARGET ASSESSMENT CRITERION: ${primaryCriterion}
${criterionMarkingFocus}

EXAMINER MARKING BEHAVIOR & RULES:
1. STRICT OBJECTIVE MARKING:
   - Never award marks for effort, politeness, or enthusiasm.
   - Never infer missing knowledge or complete the student's thoughts.
   - Assess strictly what is explicitly written.
   - Scientific accuracy overrides creativity: an engaging analogy or articulate prose cannot compensate for incorrect or vague biology.
   - If scientific evidence or mechanistic reasoning is absent, do not award proficiency.

2. THREE PROFICIENCY TIERS:
   - "Extending" (IB 7-8 / High Mastery): Scientifically accurate, uses precise grade-level terminology (e.g. ATP, semi-permeable, phospholipid bilayer, oxidative phosphorylation, gene expression), provides complete mechanisms, justifies claims with evidence, addresses Scientist's Challenge insightfully.
   - "Applying" (IB 4-6 / Sound Competence): Demonstrates sound conceptual understanding and addresses core prompts, but has minor omissions in mechanism, uses occasional informal terms (e.g. "energy" instead of "ATP", "powerhouse" without aerobic respiration), or offers limited depth in justification.
   - "Developing" (IB 1-3 / Limited/Fragmented): Contains notable misconceptions, missing evidence, vague claims without biological mechanisms, or incomplete responses.

3. EXAMINER FEEDBACK FORMATTING:
   - "summary": 2-3 concise, objective examiner sentences summarizing the scientific depth, precision of mechanism, and quality of justification aligned with ${primaryCriterion}.
   - "strengths": Array of 2-3 genuine, evidence-based strengths directly quoting or citing the student's accurate reasoning.
   - "next_steps": Array of 2-3 explicit, actionable scientific corrections and error analyses. Specify exact misconceptions, missing evidence, or vocabulary upgrades (e.g. "Replace 'powerhouse gives energy' with 'mitochondria produce ATP via aerobic respiration'", "Provide the specific transport mechanism (osmosis vs active transport)"). Avoid vague advice like "add more detail".`;

    const userPrompt = `
PRIMARY CRITERION: ${primaryCriterion}
SUBJECT: ${meta?.subject || 'Biology'}
TOPIC: ${meta?.topic || 'Biology Topic'}
MYP YEAR: ${meta?.year || '4'}
ATL CATEGORY: ${meta?.category || 'Thinking'}
ATL CLUSTER: ${task?.chosen_cluster || meta?.cluster || 'Critical thinking'}
TASK TITLE: ${task?.title || 'Scientific Task'}

CRITERIA & STRANDS:
${meta?.criteria ? `Criteria: ${meta.criteria.join(', ')}` : primaryCriterion}
${meta?.strands ? `Strands: ${meta.strands.join('; ')}` : ''}

STUDENT RESPONSES:
${responses.map((r: any) => `Part ${r.label} (${r.prompt}):\nResponse: ${r.response || '(left blank)'}`).join('\n\n')}
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
                description: 'The overall performance level according to strict MYP examiner standards'
              },
              summary: { type: Type.STRING, description: 'Objective, evidence-based examiner synthesis' },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Explicit, verified scientific strengths'
              },
              next_steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Targeted error analyses and specific scientific vocabulary/mechanism upgrades'
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
    const filledCount = responses.filter((r: any) => r.response && r.response.trim().length > 15).length;

    let level: 'Developing' | 'Applying' | 'Extending' = 'Developing';
    if (filledCount >= responses.length && totalChars > 280) {
      level = 'Extending';
    } else if (filledCount >= 2 && totalChars > 100) {
      level = 'Applying';
    }

    const clusterName = task?.chosen_cluster || meta?.cluster || 'Critical thinking';

    const fallbackFeedback = {
      level,
      summary: level === 'Extending'
        ? `The submission demonstrates rigorous scientific articulation for ${meta?.topic || 'the topic'}, applying explicit mechanisms and consistent evidence-based reasoning in line with MYP Year ${meta?.year || '4'} expectations.`
        : level === 'Applying'
        ? `The response demonstrates accurate conceptual understanding of ${meta?.topic || 'the topic'}, but requires greater precision in biochemical mechanisms and explicit scientific justifications.`
        : `The response shows emerging familiarity with ${meta?.topic || 'the topic'}, but lacks specific scientific mechanisms, evidence-based justifications, and formal vocabulary.`,
      strengths: [
        `Directly engaged with analytical prompts for ${meta?.subject || 'Sciences'}.`,
        `Identified foundational relationships within ${meta?.topic || 'the topic'}.`
      ],
      next_steps: [
        `Incorporate exact physiological and cellular mechanisms rather than general descriptive statements.`,
        `Strengthen evidence-based justifications by explicitly linking structure to function.`
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
