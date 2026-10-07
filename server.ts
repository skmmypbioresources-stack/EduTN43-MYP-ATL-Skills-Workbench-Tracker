import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  determinePrimaryCriterion,
  generateTaskByCriterion,
  validateScientificDataset,
  getScientificDatasetForTopic,
  generateStimulusImagesForTopic,
  buildATLSkillGuideAndIntro,
} from './src/lib/scientificDatasetGenerator';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
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
        const isDemandSpike =
          code === 503 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('overloaded');
        const isRateLimit =
          code === 429 ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (isDemandSpike) {
          console.warn(`[Gemini Fallback] Model ${modelName} experiencing high demand (503/UNAVAILABLE). Immediately switching to next model...`);
          break; // Switch to the next model immediately instead of retrying the overloaded one
        } else if (isRateLimit) {
          console.warn(`[Gemini Retry] Model ${modelName} rate limited (attempt ${attempt}). Backing off...`);
          if (attempt < maxRetriesPerModel) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          }
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
    const { subject, topic, year, category, cluster, autoCluster, iduSubject, criteria, strands, title, taskTitle, customInstructions, cerFramework, apiKey: bodyApiKey } = req.body;
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }

    const exactTitle = (taskTitle || title || topic || '').trim();
    const primaryCriterion = determinePrimaryCriterion(criteria, strands);
    const ai = getGenAIClient(customApiKey);

    const isCerEnabled = cerFramework === true || cerFramework === 'true' || cerFramework === undefined;
    const cerDirectives = isCerEnabled ? `
MANDATORY CER (CLAIM, EVIDENCE, REASONING) 2-QUESTION TASK SPECIFICATION:
- You MUST create EXACTLY TWO (2) questions (Part A and Part B). Do NOT create 3, 4, or 5 parts.
- Rather than superficial length or many questions, focus purely on 2 DEPTH-RICH questions directly assessing ${primaryCriterion}:
  * Part A: Scientific Claim & Evidence. Direct prompt requiring students to make a clear scientific assertion and cite specific evidence, principles, or observations relevant to ${primaryCriterion}.
  * Part B: Deep Mechanistic Reasoning & Evaluation / Extended Critique. Rigorous prompt requiring students to explain the underlying cellular, physiological, ecological, or physical mechanisms connecting their evidence to their claim, evaluate limitations, or propose targeted solutions.
${primaryCriterion === 'Criterion C' ? `- MANDATORY SCIENTIFIC DATASET & GRAPH:
  * You MUST provide a rich, authentic simulated biological dataset inside "scientific_dataset" with graph data (graph_type, axes, units, 5-10 rows) so students have empirical graphs and data tables to extract evidence from.` : `- SCIENTIFIC DATASET: The "scientific_dataset" field MUST be omitted / null as this task assesses ${primaryCriterion} (not numerical data evaluation).`}
- In each part's "placeholder", provide clear CER sentence scaffolding (e.g. "Claim: ... Evidence: ... Reasoning: ...").` : '';

    // Build strict Criterion-governed System Instruction
    let criterionDirectives = '';
    if (primaryCriterion === 'Criterion A') {
      criterionDirectives = `
CORE MANDATE — CRITERION A (Knowing & Understanding):
- Task Type: Conceptual biology, scientific explanations, compare and contrast, scientific reasoning, and application of knowledge.
${isCerEnabled ? '- CER Format: Focus on 2 depth-rich questions. Provide scientific dataset and graphs as empirical stimulus for students to explain.' : `- ABSOLUTE PROHIBITION: You MUST NOT generate any graphs, numerical datasets, data tables, or experimental results tables. The "scientific_dataset" field MUST be omitted / null.
- Inquiry Structure (Scaffolded 4 Parts):
  * Part A: Explain & Define.
  * Part B: Compare & Contrast.
  * Part C: Apply Knowledge.
  * Part D: Scientist's Challenge.`}
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Explain, Compare, Apply, Synthesise, Evaluate).`;
    } else if (primaryCriterion === 'Criterion B') {
      criterionDirectives = `
CORE MANDATE — CRITERION B (Inquiring & Designing):
- Task Type: Authentic scientific investigation design (students design the investigation and formulate hypotheses/methods).
${isCerEnabled ? '- CER Format: Focus on 2 depth-rich questions. Include a scientific dataset representing pilot investigation data or preliminary trial results for students to critique and design from.' : `- ABSOLUTE PROHIBITION: You MUST NOT generate results, experimental data tables, outcome numbers, graphs, or data analysis questions. The "scientific_dataset" field MUST be omitted / null.
- Inquiry Structure (Scaffolded 4 Parts):
  * Part A: Research Question & Hypothesis.
  * Part B: Variable Manipulation & Operationalization.
  * Part C: Apparatus & Step-by-Step Methodology.
  * Part D: Safety, Ethics & Validity Improvement.`}
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Formulate, Operationalize, Design, Evaluate).`;
    } else if (primaryCriterion === 'Criterion C') {
      criterionDirectives = `
CORE MANDATE — CRITERION C (Processing & Evaluating — Data Questions):
- Task Type: Quantitative data analysis, mathematical transformations, graph interpretation, and methodological evaluation.
- MANDATORY SCIENTIFIC DATASET & GRAPH:
  * Generate a realistic simulated biological dataset inside "scientific_dataset" with authentic biological fluctuations.
  * Plotted graph points MUST EXACTLY MATCH every row in the data table.
  * Clearly labelled axes (x_axis_label, y_axis_label) and unit labels (unit_x, unit_y).
  * Publication-quality title.
  * Source label must strictly be: "Source: Simulated biological dataset generated for educational purposes.".
  * Provide 5 to 10 authentic data rows inside "data".
${isCerEnabled ? '- CER Format: Focus on 2 depth-rich questions (Part A: Trend analysis & calculated evidence; Part B: Biological mechanisms, reliability & justified evaluation).' : `- Inquiry Structure (Scaffolded 5 Parts):
  * Part A: Identify a Trend.
  * Part B: Process Numerical Evidence.
  * Part C: Explain Biological Relationship.
  * Part D: Evaluate Reliability & Limitations.
  * Part E: Draw Justified Conclusion & Suggest Improvement.`}
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Analyse, Calculate, Interpret, Evaluate, Justify).`;
    } else {
      // Criterion D
      criterionDirectives = `
CORE MANDATE — CRITERION D (Reflecting on the Impacts of Science):
- Task Type: Authentic real-world scenarios involving ethics, sustainability, global context, scientific innovation, and societal implications.
- Embedded Global Context: Automatically embed one meaningful global context directly shaping the narrative scenario.
${isCerEnabled ? '- CER Format: Focus on 2 depth-rich questions (Part A: Scientific application, quantitative impact data, and evidence; Part B: Multidimensional ethical evaluation and justified resolution).' : `- ABSOLUTE PROHIBITION: You MUST NOT generate experimental datasets, data tables, or numerical graphs. The "scientific_dataset" field MUST be omitted / null.
- Inquiry Structure (Scaffolded 4 Parts):
  * Part A: Scientific Application & Context.
  * Part B: Multi-Perspective Implications.
  * Part C: Scientific Communication & Stakeholder Literacy.
  * Part D: Justified Ethical Decision.`}
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Explain, Discuss, Evaluate, Justify).`;
    }

    const systemInstruction = `You are a distinguished International Baccalaureate (IB) MYP and DP Sciences / Biology Lead Educator and Curriculum Specialist.
Your mission is to generate intellectually rigorous, higher-order thinking learning tasks that train students to think and reason like real scientists.

CRITICAL RULE: THE SELECTED MYP CRITERION DETERMINES THE TASK STYLE. The AI must never generate the wrong assessment style.

${criterionDirectives}

${cerDirectives}

MANDATORY APPROACHES TO LEARNING (ATL) PEDAGOGICAL SPECIFICATION:
- Fundamental MYP Principle: Approaches to Learning are the transferable skills (Organisation, Collaboration, Communication, Information Literacy, Critical Thinking, Transfer, Reflection) that the MYP insists get named and taught on PURPOSE, not assumed as background ability students either have or don't.
- Core Teaching Imperative: A skill mentioned on a unit planner and never modelled is a skill you are testing, not teaching. Naming the skill is only the first half; this task must deliberately explain and model the second half.
- REQUIRED FIELD 'atlPedagogicalIntro':
  You MUST write a comprehensive, inspiring, student-facing paragraph explaining:
  (1) The specific ATL skill being targeted (${category || 'Thinking'} — ${cluster || 'Critical thinking'});
  (2) Why this skill matters in science and across all disciplines;
  (3) What the student is actively doing during this task;
  (4) How this skill is being developed and scaffolded through the 2-part Claim-Evidence-Reasoning (CER) questions.
  This text MUST be written directly to the student in an empowering, rigorous, accessible tone.
- REQUIRED FIELD 'atl_skill_guide':
  Provide a structured object containing: skill_name, category, cluster, what_you_are_doing, how_it_is_tested, what_is_being_developed, transferable_insight, pedagogical_rationale.

ADDITIONAL MANDATES:
1. AUTHENTIC GLOBAL CONTEXT: Embed a relevant global context (e.g. Globalisation & sustainability, Scientific & technical innovation, Fairness & development, Food security & biodiversity) that meaningfully influences the scenario.
2. DIFFICULTY SCALING: Adapt cognitive demand for MYP Year ${year || '4'} (deep mechanistic understanding, precise terminology like ATP, membrane transport, phosphorylation, enzyme kinetics, ecological cascades).
3. EXACT TASK TITLE: The task title is strictly: "${exactTitle}". Do NOT modify or replace it.
${customInstructions ? `4. TEACHER CUSTOM DIFFERENTIATION & AGE-GROUP GUIDANCE:
The teacher provided specific instructions for this student cohort/age group:
"${customInstructions}"
You MUST strictly incorporate these instructions to tailor the vocabulary, scaffolding, examples, and cognitive demand accordingly.` : ''}

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
${customInstructions ? `TEACHER DIFFERENTIATION / INSTRUCTIONS:\n${customInstructions}` : ''}
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
              atlPedagogicalIntro: {
                type: Type.STRING,
                description: 'Student-facing explanatory intro: why this ATL skill is targeted, how it matters, what the student is actively doing, and how it is developed in this task'
              },
              atl_skill_guide: {
                type: Type.OBJECT,
                description: 'Comprehensive ATL guide breaking down what the student is doing, how it is tested, and what is developed',
                properties: {
                  skill_name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  cluster: { type: Type.STRING },
                  what_you_are_doing: { type: Type.STRING },
                  how_it_is_tested: { type: Type.STRING },
                  what_is_being_developed: { type: Type.STRING },
                  transferable_insight: { type: Type.STRING },
                  pedagogical_rationale: { type: Type.STRING }
                }
              },
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

          // Enforce strict constraints on generated output
          if (isCerEnabled) {
            // CER tasks must have EXACTLY 2 questions
            if (parsed.parts && parsed.parts.length > 2) {
              parsed.parts = parsed.parts.slice(0, 2);
              if (parsed.parts[0]) parsed.parts[0].label = 'A';
              if (parsed.parts[1]) parsed.parts[1].label = 'B';
            }
            // Ensure valid publication-quality scientific dataset exists only when Criterion C is assessed
            if (primaryCriterion === 'Criterion C') {
              if (!validateScientificDataset(parsed.scientific_dataset)) {
                parsed.scientific_dataset = getScientificDatasetForTopic(topic, primaryCriterion, subject);
              } else {
                parsed.scientific_dataset.source_label = 'Source: Simulated biological dataset generated for educational purposes.';
              }
            } else {
              delete parsed.scientific_dataset;
            }
            // Ensure stimulus images are attached if none were provided
            if (!parsed.stimulusImages || parsed.stimulusImages.length === 0) {
              parsed.stimulusImages = generateStimulusImagesForTopic(topic, subject);
            }
          } else {
            // Non-CER tasks
            if (primaryCriterion === 'Criterion C') {
              if (!validateScientificDataset(parsed.scientific_dataset)) {
                parsed.scientific_dataset = generateTaskByCriterion('Criterion C', topic, subject, year, cluster, exactTitle, false).scientific_dataset;
              } else {
                parsed.scientific_dataset.source_label = 'Source: Simulated biological dataset generated for educational purposes.';
              }
            } else {
              delete parsed.scientific_dataset;
            }
          }

          if (criteria && criteria.length > 0 && !parsed.target_criteria) {
            parsed.target_criteria = criteria;
          }
          if (strands && strands.length > 0 && !parsed.target_strands) {
            parsed.target_strands = strands;
          }
          if (!parsed.atlPedagogicalIntro || !parsed.atl_skill_guide) {
            const fallbackAtl = buildATLSkillGuideAndIntro(
              parsed.chosen_cluster || cluster || 'Critical thinking',
              category || 'Thinking',
              topic,
              primaryCriterion,
              subject
            );
            if (!parsed.atlPedagogicalIntro) parsed.atlPedagogicalIntro = fallbackAtl.atlPedagogicalIntro;
            if (!parsed.atl_skill_guide) parsed.atl_skill_guide = fallbackAtl.atl_skill_guide;
          }
          parsed.cerFramework = isCerEnabled;
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
      exactTitle,
      isCerEnabled
    );
    (fallbackTask as any).cerFramework = isCerEnabled;
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

// Task Refinement & Calibration API (Difficulty adjustment and surgical part regeneration)
app.post('/api/refine-task', async (req, res) => {
  try {
    const { currentTask, instruction, partIndex, meta, apiKey: bodyApiKey } = req.body;
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;

    if (!currentTask || !instruction) {
      return res.status(400).json({ error: 'currentTask and instruction are required.' });
    }

    const ai = getGenAIClient(customApiKey);
    if (!ai) {
      return res.status(503).json({ error: 'Gemini AI is not initialized.' });
    }

    // 1. Surgical refinement of a single question part
    if (typeof partIndex === 'number' && partIndex >= 0 && currentTask.parts && currentTask.parts[partIndex]) {
      const targetPart = currentTask.parts[partIndex];
      const partPrompt = `
You are an expert IB MYP Sciences Curriculum Specialist.
The teacher has generated an assessment task and wants to refine ONLY Question Part ${partIndex + 1} (${targetPart.label}).

OVERALL TASK CONTEXT:
Task Title: "${currentTask.title}"
Context / Scenario: ${currentTask.context}
Target Level: MYP Year ${meta?.year || '3'} (${meta?.subject || 'Sciences'})

CURRENT QUESTION PART:
Label: ${targetPart.label}
Prompt: ${targetPart.prompt}
Placeholder / Guidance: ${targetPart.placeholder || ''}

TEACHER'S REVISION INSTRUCTION:
"${instruction}"

GUIDELINES:
- Rewrite ONLY this question part to strictly fulfill the teacher's instruction (e.g. adjust age appropriateness, change difficulty, clarify questions, add scaffolding).
- Maintain alignment with the overall task scenario and MYP inquiry standards.
- Provide a helpful, age-appropriate placeholder sentence starter or scaffolding cue.

Return ONLY valid JSON matching:
{
  "label": "${targetPart.label}",
  "prompt": "The refined question prompt...",
  "placeholder": "Sentence starter or guidance..."
}
`;

      const response = await generateContentWithRetry(ai, {
        contents: partPrompt,
        systemInstruction: 'You are an IB MYP curriculum specialist. Output only valid JSON without markdown.',
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            prompt: { type: Type.STRING },
            placeholder: { type: Type.STRING },
          },
          required: ['label', 'prompt'],
        },
      });

      const updatedPart = JSON.parse(response.text || '{}');
      const updatedParts = [...currentTask.parts];
      updatedParts[partIndex] = {
        label: updatedPart.label || targetPart.label,
        prompt: updatedPart.prompt || targetPart.prompt,
        placeholder: updatedPart.placeholder || targetPart.placeholder,
      };

      return res.json({
        ...currentTask,
        parts: updatedParts,
      });
    }

    // 2. Full Task Difficulty Calibration or General Revision
    const fullPrompt = `
You are a distinguished International Baccalaureate (IB) MYP Sciences Lead Educator.
The teacher is reviewing an AI-generated assessment task and has requested revisions before publishing to students.

CURRENT TASK:
${JSON.stringify(currentTask, null, 2)}

TEACHER'S REVISION & CALIBRATION REQUEST:
"${instruction}"
TARGET LEVEL: MYP Year ${meta?.year || '3'} (${meta?.subject || 'Sciences'})

CRITICAL MANDATES:
1. If the teacher requested "Simplify" or "Make easier / lower difficulty":
   - Moderate the scientific vocabulary and simplify sentence structures for students aged ${meta?.year === '1' ? '11-12' : meta?.year === '2' ? '12-13' : meta?.year === '3' ? '13-14' : '14-16'}.
   - Break down complex multi-step prompts into clear, scaffolded sub-questions.
   - Include helpful sentence starters in placeholders.
   - Keep the core scientific integrity and curriculum objectives intact.
2. If the teacher requested "Elevate Rigor" or "Make harder / higher difficulty":
   - Increase cognitive demand toward higher-order analysis, evaluation, and critique (Bloom's Taxonomy).
   - Require students to evaluate experimental limitations, suggest mechanistic hypotheses, or justify decisions with quantitative evidence.
3. If the teacher provided a custom scenario or content revision (e.g. change topic/organism/context):
   - Seamlessly adapt the narrative scenario, questions, and ATL focus to reflect the teacher's desired direction.
4. Keep the exact task title "${currentTask.title}" unless the teacher explicitly requested changing it.
5. If the task contains a "scientific_dataset", maintain its structure and ensure numbers/labels remain biologically plausible.

Return ONLY valid JSON matching the full task schema without markdown formatting.
`;

    const response = await generateContentWithRetry(ai, {
      contents: fullPrompt,
      systemInstruction: 'You are an IB MYP curriculum specialist revising an assessment task. Output only valid JSON.',
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          chosen_cluster: { type: Type.STRING },
          global_context: { type: Type.STRING },
          context: { type: Type.STRING },
          atl_focus_explainer: { type: Type.STRING },
          skill_indicators: { type: Type.ARRAY, items: { type: Type.STRING } },
          scientific_dataset: {
            type: Type.OBJECT,
            properties: {
              graph_type: { type: Type.STRING, enum: ['line', 'bar', 'scatter', 'histogram', 'pie'] },
              title: { type: Type.STRING },
              global_context: { type: Type.STRING },
              description: { type: Type.STRING },
              x_axis_label: { type: Type.STRING },
              y_axis_label: { type: Type.STRING },
              unit_x: { type: Type.STRING },
              unit_y: { type: Type.STRING },
              source_label: { type: Type.STRING },
              x_key: { type: Type.STRING },
              y_keys: { type: Type.ARRAY, items: { type: Type.STRING } },
              series_labels: { type: Type.OBJECT },
              data: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            },
          },
          idu_note: { type: Type.STRING },
          target_criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
          target_strands: { type: Type.ARRAY, items: { type: Type.STRING } },
          parts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                prompt: { type: Type.STRING },
                placeholder: { type: Type.STRING },
              },
              required: ['label', 'prompt'],
            },
          },
          estimated_minutes: { type: Type.NUMBER },
        },
        required: ['title', 'context', 'parts'],
      },
    });

    const revisedTask = JSON.parse(response.text || '{}');
    revisedTask.title = currentTask.title;
    return res.json(revisedTask);
  } catch (err: any) {
    console.error('Server error in /api/refine-task:', err);
    res.status(500).json({ error: err?.message || 'Failed to refine task.' });
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

    const systemInstruction = `You are the student's IB MYP & DP Biology Teacher writing personal, direct feedback to your student.
Evaluate their submission with rigorous academic standards, pinpointing scientific errors and providing brief, to-the-point scientific corrections.

TARGET ASSESSMENT CRITERION: ${primaryCriterion}
${criterionMarkingFocus}

CRITICAL TEACHER ASSESSMENT & VOICE PRINCIPLES:
1. FIRST-PERSON PERSONAL TEACHER VOICE (CRITICAL MANDATE):
   - You are the teacher writing personally and directly to your student. Always speak in the first person singular ("I", "my") addressing the student directly as "you".
   - ABSOLUTE PROHIBITION ON THIRD PERSON: NEVER refer to yourself in the third person (NEVER write "the teacher identified", "the teacher observed", "the teacher notes", "the instructor suggests"). NEVER refer to the student in third person (NEVER write "the student demonstrated", "the student states", "the student should").
   - Direct personal teacher phrasing: "I noticed in your answer that...", "I identified an error when you wrote...", "Here is how to state this scientifically correctly:".
   - BRIEF & TO THE POINT: Be concise and sharp. Directly pinpoint the specific scientific errors or missing concepts and give the exact, scientifically correct way to write them. Only brief and to the point is enough. Do not include conversational fluff or AI meta-commentary.
   - NO AI HEADINGS OR MENTIONS: Never introduce yourself as AI or label remarks as AI-generated. This is personal teacher feedback identifying errors and showing how to write them scientifically correctly.

2. MANDATORY REQUIREMENT — DIRECT CITATION OF STUDENT PHRASING:
   - ZERO TOLERANCE FOR GENERIC OR BOILERPLATE FEEDBACK: Do not write vague, formulaic comments (such as "Good understanding", "Well done on this task", or "Add more detail").
   - MUST PICK AND USE WORDS FROM STUDENT ANSWERS: Extract, quote verbatim in quotation marks ("..."), and evaluate specific words, claims, numerical figures, and phrases written by the student.
   - In "summary": Write directly to the student in first person ("I"). Briefly identify their errors and state how to write them scientifically correctly. Quote 1-2 exact phrases from their response (e.g., 'When you stated "[student quote]", I noticed an error: [brief error identification]. To write this scientifically correctly: [concise correction].').
   - In "strengths": Write in first person ("I"): Quote their exact words in double quotes ("...") and state briefly why that vocabulary or reasoning was scientifically valid.
   - In "next_steps": Point out their error directly citing their phrase in double quotes ("...") and provide the exact scientific correction showing how to write it correctly.
   - In "studentQuotesUsed": Provide an array of 2 to 4 verbatim phrases picked from the student's answer that were evaluated.
   - In "evaluatedPhrases": Provide structured items showing the exact studentQuote, your diagnostic evaluation of that phrasing in first person, and status ('accurate' | 'partial' | 'needs_improvement').

3. STRICT 8-POINT RESTRICTION & SCORE BOUNDARIES:
   - 8 / 8 (Exceptional / Flawless Mastery): EXTREMELY RARE. DO NOT award 8 points unless the student's work is virtually flawless, demonstrating exceptional depth, exhaustive molecular/cellular mechanistic explanations, rigorous scientific vocabulary, and zero misconceptions or omissions. If there is ANY minor omission, informal term, or lack of complete mechanistic explanation, the score MUST NOT be 8.
   - 7 / 8 (Strong Extending): Thorough, rigorous, and accurate demonstration of knowledge and understanding with complete explanations, but with slight opportunities for deeper elaboration or minor refinement.
   - 6 / 8 (High Applying): Consistent and accurate understanding across all core questions with appropriate terminology, but lacks the exhaustive depth or independent synthesis needed for Extending.
   - 5 / 8 (Standard Applying): Sound basic grasp of the concepts, but answers contain noticeable simplifications, informal terms (e.g., 'energy' instead of 'ATP', 'powerhouse' without respiration, 'things entering/leaving'), or surface-level justifications.
   - 3–4 / 8 (Developing): Incomplete understanding, partial explanations, missing major mechanisms, significant gaps, or superficial answers. (4 = partial attempt with some valid points; 3 = basic recall with notable misconceptions or omissions).
   - 1–2 / 8 (Beginning / Limited): Major biological errors, severe misconceptions, largely blank or one-sentence non-mechanistic answers. (2 = fragmented/minimal; 1 = insufficient evidence/blank).

4. THREE PROFICIENCY TIERS:
   - "Extending" (Formative Score 7-8): Masterful scientific accuracy, precise academic terminology, comprehensive mechanistic reasoning, insightful evaluation.
   - "Applying" (Formative Score 5-6): Competent conceptual understanding addressing the main prompts, but with minor omissions in mechanism or occasional informal phrasing.
   - "Developing" (Formative Score 1-4): Limited understanding, evident misconceptions, missing mechanisms, or vague/fragmented responses.

Return ONLY valid JSON matching the schema.`;

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

STUDENT RESPONSES TO EVALUATE:
${responses.map((r: any) => `Part ${r.label} (${r.prompt}):
Student Written Answer: ${r.response || (r.claim ? `Claim: ${r.claim}\nEvidence: ${r.evidence}\nReasoning: ${r.reasoning}` : '(left blank)')}`).join('\n\n')}

INSTRUCTION: Carefully read the student's exact text above. Extract verbatim quotes/words written by the student and evaluate them directly. Write strictly in the first person as the teacher ("I", "my") speaking directly to the student ("you"). DO NOT use third person (NEVER write "the teacher identified" or "the student demonstrated"). Identify the scientific errors directly and show concisely how to write them scientifically correctly, keeping the feedback brief and to the point.
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
                description: 'The overall performance level according to strict MYP teacher assessment standards'
              },
              formativeScore: {
                type: Type.INTEGER,
                description: 'Numerical formative score out of 8 (1 to 8) based on demonstrated evidence'
              },
              summary: {
                type: Type.STRING,
                description: 'Objective, evidence-based teacher diagnostic synthesis that explicitly quotes and references the student\'s exact words'
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Explicit, verified scientific strengths that directly quote the student\'s words in double quotes ("...")'
              },
              next_steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Targeted error analyses citing the student\'s specific words or phrasing in double quotes ("...") and giving concrete scientific upgrades'
              },
              studentQuotesUsed: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of 2-4 exact phrases and words picked from the student\'s answer that were evaluated'
              },
              evaluatedPhrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentQuote: { type: Type.STRING, description: 'Exact quote or phrase from student answer' },
                    evaluation: { type: Type.STRING, description: 'Teacher diagnostic evaluation of this specific phrasing' },
                    status: { type: Type.STRING, enum: ['accurate', 'partial', 'needs_improvement'] }
                  },
                  required: ['studentQuote', 'evaluation', 'status']
                },
                description: 'Structured breakdown of student phrasing picked and evaluated by the teacher'
              }
            },
            required: ['level', 'formativeScore', 'summary', 'strengths', 'next_steps']
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

          // Validate and normalize formativeScore within range under strict criteria
          let score = typeof parsed.formativeScore === 'number' ? Math.round(parsed.formativeScore) : 0;
          if (parsed.level === 'Extending') {
            if (score === 8) {
              score = 8;
            } else {
              score = 7;
            }
          } else if (parsed.level === 'Applying') {
            if (score < 5 || score > 6) score = 5;
          } else {
            if (score < 1 || score > 4) score = 3;
          }
          parsed.formativeScore = score;

          // If studentQuotesUsed wasn't populated by AI, derive it from parsed text quotes
          if (!parsed.studentQuotesUsed || parsed.studentQuotesUsed.length === 0) {
            const quoteRegex = /"([^"]{4,80})"/g;
            const extractedQuotes: string[] = [];
            let m;
            const combinedFeedback = `${parsed.summary} ${parsed.strengths?.join(' ')} ${parsed.next_steps?.join(' ')}`;
            while ((m = quoteRegex.exec(combinedFeedback)) !== null) {
              if (!extractedQuotes.includes(m[1]) && !m[1].includes('Developing') && !m[1].includes('Applying') && !m[1].includes('Extending')) {
                extractedQuotes.push(m[1]);
              }
            }
            if (extractedQuotes.length > 0) {
              parsed.studentQuotesUsed = extractedQuotes.slice(0, 4);
            }
          }

          return res.json(parsed);
        }
      } catch (geminiError: any) {
        console.error('Gemini API Error evaluating task, falling back to evaluation heuristic:', geminiError?.message || geminiError);
      }
    }

    // Smart heuristic fallback grading that extracts and cites REAL student words
    const studentPhrases: string[] = [];
    responses.forEach((r: any) => {
      const rawText = (r.response || `${r.claim || ''} ${r.evidence || ''} ${r.reasoning || ''}`).trim();
      if (rawText && rawText.length > 5) {
        // Extract meaningful clauses or sentences from the student's actual text
        const chunks = rawText.split(/[.;\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length >= 10 && s.length <= 120);
        for (const c of chunks) {
          if (!studentPhrases.includes(c)) {
            studentPhrases.push(c);
          }
        }
      }
    });

    const totalChars = responses.reduce((acc: number, r: any) => acc + (r.response ? r.response.length : 0), 0);
    const filledCount = responses.filter((r: any) => r.response && r.response.trim().length > 30).length;

    let level: 'Developing' | 'Applying' | 'Extending' = 'Developing';
    let formativeScore = 3;

    if (filledCount >= responses.length && totalChars > 500) {
      level = 'Extending';
      formativeScore = totalChars > 750 ? 8 : 7;
    } else if (filledCount >= 2 && totalChars > 220) {
      level = 'Applying';
      formativeScore = totalChars > 350 ? 6 : 5;
    } else {
      level = 'Developing';
      formativeScore = totalChars > 120 ? 4 : totalChars > 60 ? 3 : totalChars > 0 ? 2 : 1;
    }

    const firstQuote = studentPhrases[0] ? `"${studentPhrases[0]}"` : 'your initial claim';
    const secondQuote = studentPhrases[1] ? `"${studentPhrases[1]}"` : 'your supporting explanation';
    const thirdQuote = studentPhrases[2] ? `"${studentPhrases[2]}"` : 'your reasoning';

    const fallbackFeedback = {
      level,
      formativeScore,
      summary: studentPhrases.length > 0
        ? `In evaluating your response, when you wrote ${firstQuote}, you established a direct connection to ${meta?.topic || 'the topic'}. However, addressing ${primaryCriterion} requires anchoring this claim in precise molecular/mechanistic terminology.`
        : `Your submission addressed ${meta?.topic || 'the inquiry topic'} under ${primaryCriterion}, but lacks sufficient written depth and specific scientific terminology to evaluate full mechanistic understanding.`,
      strengths: [
        studentPhrases[0]
          ? `In your answer, stating ${firstQuote} demonstrated appropriate engagement with the targeted ATL inquiry prompt.`
          : `Directly addressed the key inquiry prompt for ${meta?.subject || 'Sciences'}.`,
        studentPhrases[1]
          ? `Your explanation including ${secondQuote} identified an authentic relationship within ${meta?.topic || 'the topic'}.`
          : `Engaged with empirical evidence relevant to ${meta?.topic || 'the topic'}.`
      ],
      next_steps: [
        studentPhrases[0]
          ? `Upgrade your wording in ${firstQuote} by substituting informal terms with specific physiological mechanisms and scientific vocabulary.`
          : `Incorporate explicit scientific mechanisms rather than general descriptive statements.`,
        studentPhrases[2] || studentPhrases[1]
          ? `Expand upon your reasoning around ${thirdQuote} to justify how structural features directly dictate the biological outcome.`
          : `Strengthen evidence-based justifications by explicitly linking structure to function.`
      ],
      studentQuotesUsed: studentPhrases.slice(0, 4).map((p) => `"${p}"`),
      evaluatedPhrases: studentPhrases.slice(0, 3).map((p, idx) => ({
        studentQuote: p,
        evaluation: idx === 0
          ? 'Identified core topic trend, but needs deeper mechanistic explanation.'
          : 'Valid empirical observation; upgrade vocabulary with formal scientific terms.',
        status: idx === 0 ? 'partial' : 'accurate'
      }))
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ATL Workbench server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
