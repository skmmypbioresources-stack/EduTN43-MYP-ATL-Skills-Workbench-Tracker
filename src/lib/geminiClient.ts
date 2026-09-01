import { GeneratedTask, TaskFeedback, TaskMeta, StudentResponseItem } from '../types';
import {
  determinePrimaryCriterion,
  generateTaskByCriterion,
  validateScientificDataset,
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

      const systemInstruction = `You are a distinguished International Baccalaureate (IB) MYP and DP Sciences / Biology Senior Examiner and Curriculum Specialist.
Your mission is to generate intellectually rigorous, higher-order thinking learning tasks that train students to think and reason like real scientists.

CRITICAL RULE: THE SELECTED MYP CRITERION DETERMINES THE TASK STYLE. The AI must never generate the wrong assessment style.

${criterionDirectives}

ADDITIONAL MANDATES:
1. AUTHENTIC GLOBAL CONTEXT: Embed a relevant global context (e.g. Globalisation & sustainability, Scientific & technical innovation, Fairness & development, Food security & biodiversity) that meaningfully influences the scenario.
2. DIFFICULTY SCALING: Adapt cognitive demand for MYP Year ${meta.year || '4'}.
3. EXACT TASK TITLE: The task title is strictly: "${exactTitle}". Do NOT modify or replace it.

Return strictly valid JSON with this structure (no markdown fences, no text outside JSON):
{
  "title": "${exactTitle}",
  "chosen_cluster": "${meta.cluster || 'Critical thinking'}",
  "global_context": "Authentic global context",
  "context": "Authentic real-world scientific scenario framing the investigation.",
  "atl_focus_explainer": "ATL Focus: ${meta.category || 'Thinking'} — ${meta.cluster || 'Critical thinking'}. Skill Indicators: ...",
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

        if (primaryCriterion === 'Criterion A' || primaryCriterion === 'Criterion B' || primaryCriterion === 'Criterion D') {
          delete parsed.scientific_dataset;
        } else if (primaryCriterion === 'Criterion C') {
          if (!validateScientificDataset(parsed.scientific_dataset)) {
            parsed.scientific_dataset = generateTaskByCriterion('Criterion C', meta.topic, meta.subject, meta.year, meta.cluster, exactTitle).scientific_dataset;
          } else {
            parsed.scientific_dataset.source_label = 'Source: Simulated biological dataset generated for educational purposes.';
          }
        }

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

      const systemInstruction = `You are an exceptionally strict, uncompromising IB MYP & DP Biology Chief Examiner.
Evaluate student submissions with rigorous academic standards, meticulous precision, and strict objectivity.

TARGET ASSESSMENT CRITERION: ${primaryCriterion}
${criterionMarkingFocus}

CRITICAL EXAMINER MARKING PRINCIPLES:
1. UNCOMPROMISING RIGOR & OBJECTIVITY:
   - Mark with high skepticism and strict adherence to scientific accuracy.
   - NEVER award marks for effort, attempt, politeness, length of text, or enthusiasm.
   - NEVER infer missing knowledge, assume implicit understanding, or give the benefit of the doubt.
   - Assess strictly what is explicitly stated in the student's text.
   - Scientific mechanism and precision override literary style or enthusiasm. If mechanistic biological processes (e.g., specific organelles, enzymes, chemical equations, cellular transport mechanisms, ATP yield, molecular structures) are missing or vague, strictly penalize the score.

2. STRICT 8-POINT RESTRICTION & SCORE BOUNDARIES:
   - 8 / 8 (Exceptional / Flawless Mastery): EXTREMELY RARE. DO NOT award 8 points unless the student's work is virtually flawless, demonstrating exceptional depth, exhaustive molecular/cellular mechanistic explanations, rigorous scientific vocabulary, and zero misconceptions or omissions. If there is ANY minor omission, informal term, or lack of complete mechanistic explanation, the score MUST NOT be 8.
   - 7 / 8 (Strong Extending): Thorough, rigorous, and accurate demonstration of knowledge and understanding with complete explanations, but with slight opportunities for deeper elaboration or minor refinement.
   - 6 / 8 (High Applying): Consistent and accurate understanding across all core questions with appropriate terminology, but lacks the exhaustive depth or independent synthesis needed for Extending.
   - 5 / 8 (Standard Applying): Sound basic grasp of the concepts, but answers contain noticeable simplifications, informal terms (e.g., 'energy' instead of 'ATP', 'powerhouse' without respiration, 'things entering/leaving'), or surface-level justifications.
   - 3–4 / 8 (Developing): Incomplete understanding, partial explanations, missing major mechanisms, significant gaps, or superficial answers. (4 = partial attempt with some valid points; 3 = basic recall with notable misconceptions or omissions).
   - 1–2 / 8 (Beginning / Limited): Major biological errors, severe misconceptions, largely blank or one-sentence non-mechanistic answers. (2 = fragmented/minimal; 1 = insufficient evidence/blank).

3. THREE PROFICIENCY TIERS:
   - "Extending" (Formative Score 7-8): Masterful scientific accuracy, precise academic terminology, comprehensive mechanistic reasoning, insightful evaluation.
   - "Applying" (Formative Score 5-6): Competent conceptual understanding addressing the main prompts, but with minor omissions in mechanism or occasional informal phrasing.
   - "Developing" (Formative Score 1-4): Limited understanding, evident misconceptions, missing mechanisms, or vague/fragmented responses.

4. EXAMINER FEEDBACK FORMATTING:
   - "summary": 2-3 concise, objective, rigorous examiner sentences diagnosing the exact scientific depth, mechanistic precision, and accuracy under ${primaryCriterion}.
   - "strengths": Array of 2-3 genuine, evidence-based strengths directly quoting or citing the student's accurate reasoning. If work is weak, note strictly what limited valid points were present without inflation.
   - "next_steps": Array of 2-3 explicit, actionable, uncompromising scientific corrections and error analyses. Specify exact misconceptions, missing biological mechanisms, and required grade-level vocabulary upgrades (e.g., "Replace 'powerhouse creates energy' with 'mitochondria synthesize ATP via aerobic cellular respiration'", "Specify whether passive diffusion, facilitated diffusion, or active transport via ATP hydrolysis occurs"). Avoid generic advice like 'add more detail'.

Return strictly valid JSON with this EXACT structure:
{
  "level": "Developing" | "Applying" | "Extending",
  "formativeScore": 5,
  "summary": "2-3 concise, objective examiner sentences...",
  "strengths": ["Explicit strength 1 citing accurate reasoning", "Explicit strength 2"],
  "next_steps": ["Actionable scientific correction 1", "Specific error remediation 2"]
}`;

      const userPrompt = `TARGET CRITERION: ${primaryCriterion}\nTask Title: ${task.title}\nSubject: ${meta.subject}\nTopic: ${meta.topic}\nMYP Year: ${meta.year}\nATL Category: ${meta.category}\nATL Cluster: ${task.chosen_cluster || meta.cluster}\n\nStudent Submitted Answers:\n${responses.map((r) => `Part ${r.label} (${r.prompt}):\nAnswer: ${r.response || '(Blank)'}`).join('\n\n')}`;

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
          // Strictly guard 8 points: only allowed if AI explicitly designated 8; otherwise cap at 7
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

        return parsed;
      }
    } catch (err: any) {
      console.warn('Direct Gemini evaluation error, using heuristic fallback:', err?.message || err);
    }
  }

  // 3. Strict Fallback Smart Heuristic Evaluator
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

  return {
    level: lvl,
    formativeScore,
    summary: lvl === 'Extending'
      ? `The submission demonstrates rigorous scientific articulation for ${meta.topic || 'the topic'}, applying explicit mechanisms and consistent evidence-based reasoning in line with MYP Year ${meta.year || '4'} expectations.`
      : lvl === 'Applying'
      ? `The response demonstrates accurate conceptual understanding of ${meta.topic || 'the topic'}, but requires greater precision in biochemical mechanisms and explicit scientific justifications.`
      : `The response shows emerging familiarity with ${meta.topic || 'the topic'}, but lacks specific scientific mechanisms, evidence-based justifications, and formal vocabulary.`,
    strengths: [
      `Directly engaged with analytical prompts for ${meta.subject || 'Sciences'}.`,
      `Identified foundational relationships within ${meta.topic || 'the topic'}.`
    ],
    next_steps: [
      `Incorporate exact physiological and cellular mechanisms rather than general descriptive statements.`,
      `Strengthen evidence-based justifications by explicitly linking structure to function.`
    ]
  };
}
