import { GeneratedTask, TaskFeedback, TaskMeta, StudentResponseItem } from '../types';
import {
  determinePrimaryCriterion,
  generateTaskByCriterion,
  validateScientificDataset,
  getScientificDatasetForTopic,
  generateStimulusImagesForTopic,
  buildATLSkillGuideAndIntro,
} from './scientificDatasetGenerator';

/**
 * Direct Client-Side Gemini API generator with retries and model fallbacks for transient 503 errors.
 */

async function fetchGeminiWithRetry(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.3
): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
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
          const isDemandSpike =
            res.status === 503 ||
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('overloaded');
          const isRateLimit =
            res.status === 429 ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED');

          if (isDemandSpike) {
            console.warn(`[Client Gemini Fallback] Model ${model} experiencing high demand (503/UNAVAILABLE). Immediately switching to next model...`);
            break; // Immediately move to next healthy model
          } else if (isRateLimit) {
            console.warn(`[Client Gemini Retry] Model ${model} rate limited (attempt ${attempt}). Retrying...`);
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 1200));
              continue;
            }
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
        const isDemandSpike =
          lastErrMessage.includes('503') ||
          lastErrMessage.includes('UNAVAILABLE') ||
          lastErrMessage.includes('high demand');
        if (isDemandSpike) {
          break; // Switch to next model immediately
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
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
  const exactTitle = (meta.taskTitle?.trim() || meta.title?.trim() || meta.topic.trim());

  // 1. Try Backend API first if no custom key or if hosted on server
  if (!trimmedKey) {
    try {
      const response = await fetch('/api/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: exactTitle,
          taskTitle: exactTitle,
          subject: meta.subject,
          topic: meta.topic.trim(),
          year: meta.year,
          category: meta.category,
          cluster: meta.cluster,
          autoCluster,
          iduSubject: meta.iduSubject,
          criteria: meta.criteria,
          strands: meta.strands,
          customInstructions: meta.customInstructions,
          cerFramework: meta.cerFramework !== false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        result.title = exactTitle;
        return result;
      }
    } catch (e) {
      console.warn('Backend /api/generate-task unavailable or returned error. Falling back to client execution.');
    }
  }

  // 2. If user entered a custom Gemini API key, call Gemini directly from browser!
  const primaryCriterion = determinePrimaryCriterion(meta.criteria, meta.strands);

  if (trimmedKey) {
    try {
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
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Explain, Compare, Apply, Synthesise, Evaluate).`;
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
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Formulate, Operationalize, Design, Evaluate).`;
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
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Analyse, Calculate, Interpret, Evaluate, Justify).`;
      } else {
        // Criterion D
        criterionDirectives = `
CORE MANDATE — CRITERION D (Reflecting on the Impacts of Science):
- Task Type: Authentic real-world scenarios involving ethics, sustainability, global context, scientific innovation, environmental decision-making, and societal implications.
- Embedded Global Context: Automatically embed one meaningful global context directly shaping the narrative scenario.
- ABSOLUTE PROHIBITION: You MUST NOT generate experimental datasets, data tables, or numerical graphs. The "scientific_dataset" field MUST be omitted / null.
- Inquiry Structure (Scaffolded 4 Parts):
  * Part A: Scientific Application & Context (Explain how biological science/technology in ${meta.topic} is applied to solve a real-world problem).
  * Part B: Multi-Perspective Implications (Evaluate at least 2 distinct implications: moral, ethical, social, economic, or environmental — weighing benefits vs risks).
  * Part C: Scientific Communication & Stakeholder Literacy (Evaluate how scientific language and evidence are used to communicate with diverse stakeholders and resolve conflicting interests).
  * Part D: Justified Ethical Decision (Scientist's Challenge — defend a policy, regulation, or ethical stance balancing scientific efficacy with global responsibilities).
- Measurable ATL Skill Indicators (3-5): Begin with observable action verbs (e.g. Explain, Discuss, Evaluate, Justify).`;
      }

      const systemInstruction = `You are a distinguished International Baccalaureate (IB) MYP and DP Sciences / Biology Senior Teacher and Curriculum Specialist.
Your mission is to generate intellectually rigorous, higher-order thinking learning tasks that train students to think and reason like real scientists.

CRITICAL RULE: THE SELECTED MYP CRITERION DETERMINES THE TASK STYLE. The AI must never generate the wrong assessment style.

${criterionDirectives}

${meta.cerFramework !== false ? `MANDATORY CER (CLAIM, EVIDENCE, REASONING) FRAMEWORK:
- Structure questions and placeholders to enforce the Claim, Evidence, and Reasoning (CER) scientific framework.
- Train students to form a direct Claim, support it with empirical/scenario Evidence, and justify it with biological/scientific Reasoning.
- You MUST generate EXACTLY TWO (2) questions: Part A (Claim & Evidence from data/graph/scenario) and Part B (Mechanistic Reasoning, Reliability & Evaluation).
- In each part's "placeholder", provide clear CER prompts (e.g. "Claim: State your answer. Evidence: Cite specific observations or data. Reasoning: Explain the scientific mechanism connecting evidence to claim.").` : ''}

MANDATORY APPROACHES TO LEARNING (ATL) FOCUS:
- Keep 'atlPedagogicalIntro' brief (1-2 sentences). Describe ONLY the task being assigned and what specific ATL skill it focuses on (category and cluster). Do NOT include generic essays or definitions of what ATL skills are in the MYP.
- In your JSON response, also include 'atl_skill_guide': { skill_name, category, cluster, what_you_are_doing, how_it_is_tested, what_is_being_developed, transferable_insight, pedagogical_rationale }.

ADDITIONAL MANDATES:
1. AUTHENTIC GLOBAL CONTEXT: Embed a relevant global context (e.g. Globalisation & sustainability, Scientific & technical innovation, Fairness & development, Food security & biodiversity) that meaningfully influences the scenario.
2. DIFFICULTY SCALING: Adapt cognitive demand for MYP Year ${meta.year || '4'}.
3. EXACT TASK TITLE: The task title is strictly: "${exactTitle}". Do NOT modify or replace it.
${meta.customInstructions ? `4. DIFFERENTIATION: Strictly tailor to the teacher's instructions: "${meta.customInstructions}".` : ''}

Return strictly valid JSON with this structure (no markdown fences, no text outside JSON):
{
  "title": "${exactTitle}",
  "chosen_cluster": "${meta.cluster || 'Critical thinking'}",
  "global_context": "Authentic global context",
  "context": "Authentic real-world scientific scenario framing the investigation.",
  "atl_focus_explainer": "ATL Focus: ${meta.category || 'Thinking'} — ${meta.cluster || 'Critical thinking'}. Skill Indicators: ...",
  "atlPedagogicalIntro": "Student-facing pedagogical explanation of the targeted ATL skill, why it matters, what the student is actively doing, and how it is developed in this task.",
  "atl_skill_guide": {
    "skill_name": "${meta.cluster || 'Critical thinking'}",
    "category": "${meta.category || 'Thinking'}",
    "cluster": "${meta.cluster || 'Critical thinking'}",
    "what_you_are_doing": "What the student is doing...",
    "how_it_is_tested": "How this task assesses the skill...",
    "what_is_being_developed": "What cognitive ability is being developed...",
    "transferable_insight": "How this transfers...",
    "pedagogical_rationale": "Named and taught on purpose, not assumed..."
  },
  "skill_indicators": [
    "Indicator 1 starting with action verb",
    "Indicator 2",
    "Indicator 3"
  ],
  ${primaryCriterion === 'Criterion C' ? `"scientific_dataset": {
    "graph_type": "line",
    "title": "Figure 1. ...",
    "global_context": "Global context name",
    "description": "Experimental protocol description...",
    "x_axis_label": "Independent Variable",
    "y_axis_label": "Dependent Variable",
    "unit_x": "unit",
    "unit_y": "unit",
    "source_label": "Source: Simulated biological dataset generated for educational purposes.",
    "x_key": "x_val",
    "y_keys": ["series_1"],
    "series_labels": { "series_1": "Measurement 1" },
    "data": [
      { "x_val": 1, "series_1": 10.2 }
    ]
  },` : ''}
  "idu_note": "Optional interdisciplinary note if applicable",
  "target_criteria": ${JSON.stringify(meta.criteria || [primaryCriterion])},
  "target_strands": ${JSON.stringify(meta.strands || [])},
  "parts": [
    {
      "label": "A",
      "prompt": "Criterion-specific prompt Part A...",
      "placeholder": "Reasoning starter cue..."
    }
  ],
  "estimated_minutes": 15
}`;

      const userPrompt = `PRIMARY MYP CRITERION: ${primaryCriterion}\nTASK TITLE: ${exactTitle}\nSubject: ${meta.subject}\nTopic: ${meta.topic}\nMYP Year: ${meta.year}\nATL Category: ${meta.category}\nATL Cluster: ${meta.cluster}${meta.iduSubject ? `\nIDU Secondary Subject: ${meta.iduSubject}` : ''}${meta.criteria ? `\nTarget Criteria: ${meta.criteria.join(', ')}` : ''}${meta.strands ? `\nTarget Strands: ${meta.strands.join('; ')}` : ''}`;

      const rawText = await fetchGeminiWithRetry(trimmedKey, systemInstruction, userPrompt, 0.3);
      if (rawText) {
        const cleanedText = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        const parsed = JSON.parse(cleanedText);
        parsed.title = exactTitle;

        const isCer = meta.cerFramework !== false;
        if (isCer) {
          if (parsed.parts && parsed.parts.length > 2) {
            parsed.parts = parsed.parts.slice(0, 2);
            if (parsed.parts[0]) parsed.parts[0].label = 'A';
            if (parsed.parts[1]) parsed.parts[1].label = 'B';
          }
          if (!validateScientificDataset(parsed.scientific_dataset)) {
            parsed.scientific_dataset = getScientificDatasetForTopic(meta.topic, primaryCriterion, meta.subject);
          } else {
            parsed.scientific_dataset.source_label = 'Source: Simulated biological dataset generated for educational purposes.';
          }
          if (!parsed.stimulusImages || parsed.stimulusImages.length === 0) {
            parsed.stimulusImages = generateStimulusImagesForTopic(meta.topic, meta.subject);
          }
        } else {
          if (primaryCriterion === 'Criterion A' || primaryCriterion === 'Criterion B' || primaryCriterion === 'Criterion D') {
            delete parsed.scientific_dataset;
          } else if (primaryCriterion === 'Criterion C') {
            if (!validateScientificDataset(parsed.scientific_dataset)) {
              parsed.scientific_dataset = generateTaskByCriterion('Criterion C', meta.topic, meta.subject, meta.year, meta.cluster, exactTitle, false).scientific_dataset;
            } else {
              parsed.scientific_dataset.source_label = 'Source: Simulated biological dataset generated for educational purposes.';
            }
          }
        }

        if (!parsed.atlPedagogicalIntro || !parsed.atl_skill_guide) {
          const fallbackAtl = buildATLSkillGuideAndIntro(
            parsed.chosen_cluster || meta.cluster || 'Critical thinking',
            meta.category || 'Thinking',
            meta.topic,
            primaryCriterion,
            meta.subject
          );
          if (!parsed.atlPedagogicalIntro) parsed.atlPedagogicalIntro = fallbackAtl.atlPedagogicalIntro;
          if (!parsed.atl_skill_guide) parsed.atl_skill_guide = fallbackAtl.atl_skill_guide;
        }

        parsed.cerFramework = isCer;
        return parsed;
      }
    } catch (apiErr: any) {
      console.warn('Direct client Gemini API error, falling back to criterion template:', apiErr?.message || apiErr);
    }
  }

  // 3. Fallback Smart IB MYP Template Generator strictly governed by the selected MYP Criterion
  const fallback = generateTaskByCriterion(
    primaryCriterion,
    meta.topic,
    meta.subject,
    meta.year || '4',
    meta.cluster || 'Critical thinking',
    exactTitle
  );
  (fallback as any).cerFramework = meta.cerFramework !== false;
  if (meta.iduSubject) {
    fallback.idu_note = `Synthesizes core ${meta.subject} mechanisms with analytical frameworks in ${meta.iduSubject}.`;
  }
  if (meta.criteria && meta.criteria.length > 0) {
    fallback.target_criteria = meta.criteria;
  }
  if (meta.strands && meta.strands.length > 0) {
    fallback.target_strands = meta.strands;
  }
  return fallback;
}

export async function refineTaskClient(
  currentTask: GeneratedTask,
  instruction: string,
  meta: TaskMeta,
  partIndex?: number,
  apiKey?: string
): Promise<GeneratedTask> {
  const trimmedKey = apiKey?.trim();

  // 1. Try Backend API first
  try {
    const response = await fetch('/api/refine-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(trimmedKey ? { 'x-gemini-api-key': trimmedKey } : {}),
      },
      body: JSON.stringify({
        currentTask,
        instruction,
        partIndex,
        meta,
        apiKey: trimmedKey,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    }
  } catch (e) {
    console.warn('Backend /api/refine-task unavailable or returned error, attempting client fallback.');
  }

  // 2. Direct client fallback if API key present
  if (trimmedKey) {
    try {
      if (typeof partIndex === 'number' && partIndex >= 0 && currentTask.parts && currentTask.parts[partIndex]) {
        const targetPart = currentTask.parts[partIndex];
        const prompt = `
You are an expert IB MYP Sciences Curriculum Specialist.
Refine Question Part ${partIndex + 1} (${targetPart.label}) of the following task according to the teacher's instruction:
"${instruction}"

OVERALL CONTEXT:
Task Title: "${currentTask.title}"
Context: ${currentTask.context}

CURRENT QUESTION PART:
Label: ${targetPart.label}
Prompt: ${targetPart.prompt}
Placeholder: ${targetPart.placeholder || ''}

Return ONLY valid JSON matching:
{
  "label": "${targetPart.label}",
  "prompt": "Refined question prompt...",
  "placeholder": "Refined placeholder..."
}
`;
        const resText = await fetchGeminiWithRetry(trimmedKey, 'Output only valid JSON without markdown fences.', prompt, 0.3);
        const updatedPart = JSON.parse(resText || '{}');
        const updatedParts = [...currentTask.parts];
        updatedParts[partIndex] = {
          label: updatedPart.label || targetPart.label,
          prompt: updatedPart.prompt || targetPart.prompt,
          placeholder: updatedPart.placeholder || targetPart.placeholder,
        };
        return {
          ...currentTask,
          parts: updatedParts,
        };
      } else {
        // Full task refinement
        const prompt = `
You are an expert IB MYP Sciences Curriculum Specialist.
The teacher has requested this revision for the entire task:
"${instruction}"

CURRENT TASK STRUCTURE:
${JSON.stringify(currentTask, null, 2)}

Return the full updated task as strictly valid JSON matching the original schema.
`;
        const resText = await fetchGeminiWithRetry(trimmedKey, 'Output only valid JSON without markdown fences.', prompt, 0.3);
        const updatedTask = JSON.parse(resText || '{}');
        if (updatedTask && updatedTask.title && updatedTask.parts) {
          return updatedTask;
        }
      }
    } catch (err) {
      console.warn('Direct client refine failed:', err);
    }
  }

  return currentTask;
}

export async function evaluateTaskClient(
  task: GeneratedTask,
  meta: TaskMeta,
  responses: StudentResponseItem[],
  apiKey?: string
): Promise<TaskFeedback> {
  const trimmedKey = apiKey?.trim();
  const primaryCriterion = determinePrimaryCriterion(meta.criteria || task.target_criteria, meta.strands || task.target_strands);

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

Return strictly valid JSON with this EXACT structure:
{
  "level": "Developing" | "Applying" | "Extending",
  "formativeScore": 5,
  "summary": "Direct first-person feedback quoting student phrases and showing scientific correction...",
  "strengths": ["Strength quoting \\\"student phrase\\\" and evaluating it in first person", "Strength 2"],
  "next_steps": ["Correction citing \\\"student phrase\\\" and giving exact scientific fix", "Next step 2"],
  "studentQuotesUsed": ["\\\"verbatim phrase 1\\\"", "\\\"verbatim phrase 2\\\""],
  "evaluatedPhrases": [
    { "studentQuote": "exact quote", "evaluation": "evaluation of phrase in first person", "status": "accurate" }
  ]
}`;

      const userPrompt = `TARGET CRITERION: ${primaryCriterion}
Task Title: ${task.title}
Subject: ${meta.subject}
Topic: ${meta.topic}
MYP Year: ${meta.year}
ATL Category: ${meta.category}
ATL Cluster: ${task.chosen_cluster || meta.cluster}

Student Submitted Answers to Evaluate:
${responses.map((r) => `Part ${r.label} (${r.prompt}):
Student Written Answer: ${r.response || (r.claim ? `Claim: ${r.claim}\nEvidence: ${r.evidence}\nReasoning: ${r.reasoning}` : '(Blank)')}`).join('\n\n')}

INSTRUCTION: Carefully read the student's exact text above. Extract verbatim quotes/words written by the student and evaluate them directly. Write strictly in the first person as the teacher ("I", "my") speaking directly to the student ("you"). DO NOT use third person (NEVER write "the teacher identified" or "the student demonstrated"). Identify the scientific errors directly and show concisely how to write them scientifically correctly, keeping the feedback brief and to the point.`;

      const rawText = await fetchGeminiWithRetry(trimmedKey, systemInstruction, userPrompt, 0.2);
      if (rawText) {
        const cleanedText = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        const parsed = JSON.parse(cleanedText);

        // Validate and normalize formativeScore under strict criteria
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

        return parsed;
      }
    } catch (err: any) {
      console.warn('Direct Gemini evaluation error, using heuristic fallback:', err?.message || err);
    }
  }

  // 3. Strict Fallback Smart Heuristic Evaluator that extracts real student words
  const studentPhrases: string[] = [];
  responses.forEach((r) => {
    const rawText = (r.response || `${r.claim || ''} ${r.evidence || ''} ${r.reasoning || ''}`).trim();
    if (rawText && rawText.length > 5) {
      const chunks = rawText.split(/[.;\n]+/).map((s) => s.trim()).filter((s) => s.length >= 10 && s.length <= 120);
      for (const c of chunks) {
        if (!studentPhrases.includes(c)) {
          studentPhrases.push(c);
        }
      }
    }
  });

  const totalChars = responses.reduce((acc, r) => acc + (r.response ? r.response.length : 0), 0);
  const filledCount = responses.filter((r) => r.response && r.response.trim().length > 30).length;
  let lvl: 'Developing' | 'Applying' | 'Extending' = 'Developing';
  let formativeScore = 3;

  if (filledCount >= responses.length && totalChars > 500) {
    lvl = 'Extending';
    formativeScore = totalChars > 750 ? 8 : 7;
  } else if (filledCount >= 2 && totalChars > 220) {
    lvl = 'Applying';
    formativeScore = totalChars > 350 ? 6 : 5;
  } else {
    lvl = 'Developing';
    formativeScore = totalChars > 120 ? 4 : totalChars > 60 ? 3 : totalChars > 0 ? 2 : 1;
  }

  const firstQuote = studentPhrases[0] ? `"${studentPhrases[0]}"` : 'your initial claim';
  const secondQuote = studentPhrases[1] ? `"${studentPhrases[1]}"` : 'your supporting explanation';
  const thirdQuote = studentPhrases[2] ? `"${studentPhrases[2]}"` : 'your reasoning';

  return {
    level: lvl,
    formativeScore,
    summary: studentPhrases.length > 0
      ? `In evaluating your response, when you wrote ${firstQuote}, you established a direct connection to ${meta.topic || 'the topic'}. However, addressing ${primaryCriterion} requires anchoring this claim in precise molecular/mechanistic terminology.`
      : `Your submission addressed ${meta.topic || 'the inquiry topic'} under ${primaryCriterion}, but lacks sufficient written depth and specific scientific terminology to evaluate full mechanistic understanding.`,
    strengths: [
      studentPhrases[0]
        ? `In your answer, stating ${firstQuote} demonstrated appropriate engagement with the targeted ATL inquiry prompt.`
        : `Directly addressed the key inquiry prompt for ${meta.subject || 'Sciences'}.`,
      studentPhrases[1]
        ? `Your explanation including ${secondQuote} identified an authentic relationship within ${meta.topic || 'the topic'}.`
        : `Engaged with empirical evidence relevant to ${meta.topic || 'the topic'}.`
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
}
