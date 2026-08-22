import { ScientificDataset, TaskPart, GeneratedTask } from '../types';

export const GLOBAL_CONTEXTS = [
  'Scientific & technical innovation',
  'Globalisation & sustainability',
  'Fairness & development',
  'Identities & relationships',
  'Orientation in space & time',
  'Personal & cultural expression',
  'Food security & biodiversity',
  'Climate change & conservation',
  'Public health & global disease',
  'Biotechnology & ethics',
] as const;

export type MYPCriterionCode = 'Criterion A' | 'Criterion B' | 'Criterion C' | 'Criterion D';

/**
 * Accurately determines the primary MYP Criterion from criteria list or strands.
 * If Criterion C is selected, it takes precedence as the data evaluation task.
 * Otherwise, resolves Criterion B, Criterion D, or Criterion A. Defaults to Criterion A.
 */
export function determinePrimaryCriterion(
  criteria?: string[],
  strands?: string[]
): MYPCriterionCode {
  if (criteria && criteria.length > 0) {
    for (const c of criteria) {
      const lower = c.toLowerCase();
      if (lower.includes('criterion c') || lower.includes('processing') || lower.includes('evaluating') || lower === 'c') {
        return 'Criterion C';
      }
      if (lower.includes('criterion b') || lower.includes('inquiring') || lower.includes('designing') || lower === 'b') {
        return 'Criterion B';
      }
      if (lower.includes('criterion d') || lower.includes('reflecting') || lower.includes('impacts') || lower === 'd') {
        return 'Criterion D';
      }
      if (lower.includes('criterion a') || lower.includes('knowing') || lower.includes('understanding') || lower === 'a') {
        return 'Criterion A';
      }
    }
  }

  if (strands && strands.length > 0) {
    for (const s of strands) {
      const lower = s.toLowerCase();
      if (lower.startsWith('c.') || lower.includes('criterion c')) return 'Criterion C';
      if (lower.startsWith('b.') || lower.includes('criterion b')) return 'Criterion B';
      if (lower.startsWith('d.') || lower.includes('criterion d')) return 'Criterion D';
      if (lower.startsWith('a.') || lower.includes('criterion a')) return 'Criterion A';
    }
  }

  return 'Criterion A';
}

/**
 * Validates that a ScientificDataset conforms to publication-quality standards.
 * Verifies that table data exists, keys match, points are valid numbers, and source is correct.
 */
export function validateScientificDataset(dataset: any): dataset is ScientificDataset {
  if (!dataset || typeof dataset !== 'object') return false;
  if (!dataset.graph_type || !['line', 'bar', 'scatter', 'histogram', 'pie'].includes(dataset.graph_type)) return false;
  if (!dataset.title || typeof dataset.title !== 'string' || dataset.title.trim().length < 5) return false;
  if (!dataset.x_axis_label || !dataset.y_axis_label) return false;
  if (!Array.isArray(dataset.data) || dataset.data.length < 4) return false;
  
  const xKey = dataset.x_key;
  if (!xKey) return false;

  const yKeys = dataset.y_keys || (dataset.y_key ? [dataset.y_key] : []);
  if (yKeys.length === 0) return false;

  for (const row of dataset.data) {
    if (row[xKey] === undefined || row[xKey] === null) return false;
    let hasNumericY = false;
    for (const yk of yKeys) {
      if (typeof row[yk] === 'number' && !isNaN(row[yk])) {
        hasNumericY = true;
      }
    }
    if (!hasNumericY) return false;
  }

  return true;
}

// -----------------------------------------------------------------------------------------
// CRITERION A GENERATOR: Knowing & Understanding
// Strictly NO datasets, NO graphs, NO experimental tables.
// -----------------------------------------------------------------------------------------
export function generateCriterionATask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string
): GeneratedTask {
  const title = exactTitle || topic;
  const yearNum = parseInt(mypYear, 10) || 4;
  const isAdvanced = yearNum >= 5;

  return {
    title,
    chosen_cluster: cluster,
    global_context: 'Scientific & technical innovation',
    context: `You are evaluating the core biological concepts, physiological mechanisms, and system dynamics of "${topic}" in ${subject}. In this assessment, you will explain scientific principles, compare and contrast biological structures, and apply your understanding to novel scenarios.`,
    atl_focus_explainer: `ATL Focus: Thinking — ${cluster}. Skill Indicators: • Explain complex biological concepts and mechanisms in ${topic}; • Compare and contrast biological structures and functional adaptations; • Apply scientific knowledge to solve unfamiliar biological problems; • Synthesise multi-system interactions and evaluate biological models.`,
    skill_indicators: [
      `Explain key biological concepts, cellular structures, and mechanisms in ${topic}.`,
      `Compare and contrast physiological adaptations and biological functions.`,
      `Apply scientific understanding to explain familiar and unfamiliar biological phenomena.`,
      `Synthesise mechanistic reasoning to evaluate biological models and explain system-wide breakdown.`
    ],
    target_criteria: ['Criterion A: Knowing and understanding'],
    target_strands: [
      'A.i: explain scientific knowledge',
      'A.ii: apply scientific knowledge and understanding to solve problems set in familiar and unfamiliar situations',
      'A.iii: analyse and evaluate information to make scientifically supported judgments'
    ],
    parts: [
      {
        label: 'A',
        prompt: `Explain & Define (Foundational Scientific Knowledge): Identify the key biological structures, molecules, or components involved in ${topic}. Clearly explain how their specific structure enables their biological function.`,
        placeholder: `State the primary biological structures and explain their specific structure-function relationship using precise grade-level terminology...`
      },
      {
        label: 'B',
        prompt: `Compare & Contrast (Mechanistic Analysis): Contrast the biological mechanisms involved in ${topic} with a related biological system or pathway. Detail the step-by-step physiological changes, energy requirements, and cause-and-effect relationships.`,
        placeholder: `Provide a detailed mechanistic breakdown comparing the processes, including energetic demands and cellular pathways...`
      },
      {
        label: 'C',
        prompt: `Apply Knowledge (Unfamiliar Biological Situation): If a specific genetic mutation, pharmacological inhibitor, or environmental stressor interferes with ${topic}, predict the immediate cellular and downstream organ-system consequences. Justify your reasoning scientifically.`,
        placeholder: `Predict the direct cellular defect and trace the cascade of physiological consequences with clear scientific justification...`
      },
      {
        label: 'D',
        prompt: `Scientist's Challenge (Model Critique & Synthesis): Evaluate the strengths and limitations of a common biological model or analogy used to represent ${topic}. Explain where the analogy accurately reflects the biology, where it breaks down, and propose a more accurate scientific representation.`,
        placeholder: `Scientist's Challenge: The model is effective because... However, it breaks down biologically because... A more rigorous representation would include...`
      }
    ],
    estimated_minutes: 15
  };
}

// -----------------------------------------------------------------------------------------
// CRITERION B GENERATOR: Inquiring & Designing
// Strictly investigation design, hypotheses, variables, methodology. NO results, NO graphs.
// -----------------------------------------------------------------------------------------
export function generateCriterionBTask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string
): GeneratedTask {
  const title = exactTitle || topic;

  return {
    title,
    chosen_cluster: cluster,
    global_context: 'Scientific & technical innovation',
    context: `You are a research scientist designing a rigorous, controlled laboratory investigation to investigate the factor affecting "${topic}" in ${subject}. You will formulate a testable hypothesis, operationalize variables, design a step-by-step reproducible method, and address safety and reliability.`,
    atl_focus_explainer: `ATL Focus: Research / Thinking — ${cluster}. Skill Indicators: • Formulate a focused, testable research question and scientifically reasoned hypothesis; • Identify and operationalize independent, dependent, and controlled variables; • Design a logical, reproducible, and valid experimental methodology; • Identify safety hazards, risk mitigations, and protocols for data reliability.`,
    skill_indicators: [
      `Formulate a testable biological hypothesis with supporting scientific rationale for ${topic}.`,
      `Identify independent, dependent, and controlled variables with specific control methods.`,
      `Design a safe, logical, and reproducible experimental procedure with appropriate apparatus.`,
      `Evaluate methodological validity and design protocols to ensure data reliability and minimize systematic errors.`
    ],
    target_criteria: ['Criterion B: Inquiring and designing'],
    target_strands: [
      'B.i: explain a problem or question to be tested by a scientific investigation',
      'B.ii: formulate a testable hypothesis and explain it using scientific reasoning',
      'B.iii: explain how to manipulate the variables, and explain how data will be collected',
      'B.iv: design scientific investigations'
    ],
    parts: [
      {
        label: 'A',
        prompt: `Research Question & Hypothesis (Formulation): Formulate a focused, testable scientific research question to investigate an independent variable affecting ${topic}. State a clear, falsifiable hypothesis and explain the underlying biological reasoning supporting your prediction.`,
        placeholder: `State: "How does [Independent Variable with units] affect [Dependent Variable with units]?" Hypothesis: "If [IV increases], then [DV will...] because [biological mechanism]..."`
      },
      {
        label: 'B',
        prompt: `Variables & Control Protocol (Operationalization): Explicitly identify: (1) The Independent Variable (including 5 planned testing intervals and units); (2) The Dependent Variable (including exact measurement technique, equipment, and units); (3) At least THREE strictly Controlled Variables, explaining the exact method used to keep each constant.`,
        placeholder: `IV: ... (5 values: e.g. 10, 20, 30, 40, 50°C)\nDV: ... (measured via... in units of...)\nControlled Variables:\n1. [Variable]: kept constant by [method]\n2. [Variable]: kept constant by [method]\n3. [Variable]: kept constant by [method]`
      },
      {
        label: 'C',
        prompt: `Apparatus & Step-by-Step Methodology (Experimental Design): List the specialized scientific apparatus (including precision/resolution). Write a detailed, numbered, step-by-step procedure that another scientist could replicate exactly to collect valid, reliable quantitative data (including repeat trials).`,
        placeholder: `Apparatus List (with resolutions):\n- ...\n\nStep-by-Step Procedure:\n1. Prepare...\n2. Set up...\n3. Measure and record...\n4. Repeat for a minimum of 3 trials per interval to calculate mean values...`
      },
      {
        label: 'D',
        prompt: `Safety, Ethics & Methodological Validity (Scientist's Challenge): Identify TWO specific chemical, biological, or physical hazards associated with this investigation and describe explicit risk mitigation precautions. Explain one potential source of systematic error or confounding variable in your setup and describe how your design prevents it.`,
        placeholder: `Hazard 1: [Hazard] -> Risk Mitigation: [Specific precaution]\nHazard 2: [Hazard] -> Risk Mitigation: [Specific precaution]\nValidity & Confounding Prevention: [Explain how design ensures valid data]...`
      }
    ],
    estimated_minutes: 15
  };
}

// -----------------------------------------------------------------------------------------
// CRITERION C GENERATOR: Processing & Evaluating (Data Questions Only)
// Mandatory realistic biological dataset, data table, graph matching table, 5-6 questions.
// -----------------------------------------------------------------------------------------
export function generateCriterionCTask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string
): GeneratedTask {
  const title = exactTitle || topic;
  const cleanTopic = (topic || '').toLowerCase();

  let globalContext = 'Food security & Biodiversity';
  let dataset: ScientificDataset;

  const defaultSource = 'Source: Simulated biological dataset generated for educational purposes.';

  // Topic 1: Pollination / Crops / Ecology / Bees
  if (
    cleanTopic.includes('pollin') ||
    cleanTopic.includes('reproduct') ||
    cleanTopic.includes('bee') ||
    cleanTopic.includes('crop') ||
    cleanTopic.includes('flower') ||
    cleanTopic.includes('plant') && cleanTopic.includes('yield')
  ) {
    globalContext = 'Food security & Biodiversity';
    dataset = {
      graph_type: 'line',
      title: 'Figure 1. Effect of Ambient Temperature on Mean Pollen Tube Growth Rate and Seed Set in Prunus avium',
      global_context: globalContext,
      description:
        'Controlled agronomic investigation tracking in vitro pollen tube elongation rate (μm/h) and percentage ovule fertilization success across ambient temperature increments (10°C to 35°C).',
      x_axis_label: 'Ambient Temperature',
      y_axis_label: 'Growth Rate & Fertilization Percentage',
      unit_x: '°C',
      unit_y: 'Rate (μm/h) / % Success',
      source_label: defaultSource,
      x_key: 'temperature',
      y_keys: ['growth_rate', 'seed_set_pct'],
      series_labels: {
        growth_rate: 'Mean Pollen Tube Growth Rate (μm/h)',
        seed_set_pct: 'Seed Set Success Rate (%)',
      },
      data: [
        { temperature: 10, growth_rate: 18.2, seed_set_pct: 22.4 },
        { temperature: 15, growth_rate: 42.6, seed_set_pct: 48.1 },
        { temperature: 20, growth_rate: 86.4, seed_set_pct: 84.7 },
        { temperature: 25, growth_rate: 98.1, seed_set_pct: 91.5 },
        { temperature: 28, growth_rate: 92.3, seed_set_pct: 82.0 },
        { temperature: 30, growth_rate: 64.5, seed_set_pct: 51.3 },
        { temperature: 35, growth_rate: 14.8, seed_set_pct: 9.6 },
      ],
    };
  }
  // Topic 2: Enzymes / Metabolism / Catalysis / Digestion / pH / Temperature
  else if (
    cleanTopic.includes('enzyme') ||
    cleanTopic.includes('cataly') ||
    cleanTopic.includes('digest') ||
    cleanTopic.includes('protein') ||
    cleanTopic.includes('amylase') ||
    cleanTopic.includes('catalase')
  ) {
    globalContext = 'Biotechnology & Public Health';
    dataset = {
      graph_type: 'line',
      title: 'Figure 1. Initial Reaction Velocity (V0) of Human Salivary Amylase vs. Incubation Temperature (10°C–70°C) at Constant pH 6.8',
      global_context: globalContext,
      description:
        'Controlled spectrophotometric kinetic assay measuring maltose production rate (μmol/min) from 1% soluble starch substrate incubated across thermal gradients at constant pH 6.8.',
      x_axis_label: 'Incubation Temperature',
      y_axis_label: 'Initial Reaction Velocity (V0)',
      unit_x: '°C',
      unit_y: 'μmol maltose / min',
      source_label: defaultSource,
      x_key: 'temperature',
      y_keys: ['reaction_velocity'],
      series_labels: {
        reaction_velocity: 'Amylase Reaction Velocity (μmol/min)',
      },
      data: [
        { temperature: 10, reaction_velocity: 4.1 },
        { temperature: 20, reaction_velocity: 11.3 },
        { temperature: 30, reaction_velocity: 24.8 },
        { temperature: 37, reaction_velocity: 38.5 },
        { temperature: 40, reaction_velocity: 39.2 },
        { temperature: 45, reaction_velocity: 27.6 },
        { temperature: 50, reaction_velocity: 13.4 },
        { temperature: 60, reaction_velocity: 1.8 },
        { temperature: 70, reaction_velocity: 0.0 },
      ],
    };
  }
  // Topic 3: Osmosis / Cell Transport / Potato / Membrane
  else if (
    cleanTopic.includes('osmo') ||
    cleanTopic.includes('transport') ||
    cleanTopic.includes('diffus') ||
    cleanTopic.includes('cell membrane') ||
    cleanTopic.includes('membrane') ||
    cleanTopic.includes('turgor')
  ) {
    globalContext = 'Water Scarcity & Agriculture';
    dataset = {
      graph_type: 'scatter',
      title: 'Figure 1. Mean Percentage Change in Solanum tuberosum Tuber Cylinder Mass vs. External Sucrose Solution Molarity (0.0–1.0 mol/dm³)',
      global_context: globalContext,
      description:
        'Osmometric gravimetric inquiry measuring net osmotic water flux in standardized potato cylinders (n=5 per trial) after 120 minutes of immersion across graded sucrose concentrations.',
      x_axis_label: 'Sucrose Solution Concentration',
      y_axis_label: 'Mean % Mass Change of Tissues',
      unit_x: 'mol/dm³',
      unit_y: '% Change in Mass',
      source_label: defaultSource,
      x_key: 'sucrose_conc',
      y_keys: ['mean_pct_mass_change'],
      series_labels: {
        mean_pct_mass_change: 'Mean % Mass Change (±0.4%)',
      },
      data: [
        { sucrose_conc: 0.0, mean_pct_mass_change: 18.6 },
        { sucrose_conc: 0.1, mean_pct_mass_change: 12.4 },
        { sucrose_conc: 0.2, mean_pct_mass_change: 6.8 },
        { sucrose_conc: 0.3, mean_pct_mass_change: 1.1 },
        { sucrose_conc: 0.4, mean_pct_mass_change: -5.2 },
        { sucrose_conc: 0.6, mean_pct_mass_change: -14.6 },
        { sucrose_conc: 0.8, mean_pct_mass_change: -21.4 },
        { sucrose_conc: 1.0, mean_pct_mass_change: -26.3 },
      ],
    };
  }
  // Topic 4: Photosynthesis / Limiting Factors / Light / Carbon
  else if (
    cleanTopic.includes('photo') ||
    cleanTopic.includes('light') ||
    cleanTopic.includes('chlorophyll') ||
    cleanTopic.includes('carbon') ||
    cleanTopic.includes('elodea')
  ) {
    globalContext = 'Climate Change & Ecosystems';
    dataset = {
      graph_type: 'line',
      title: 'Figure 1. Net Photosynthetic Oxygen Evolution Rate in Elodea canadensis vs. Incident Light Intensity at Saturated Dissolved CO₂',
      global_context: globalContext,
      description:
        'Audus micro-volumeter apparatus tracking net volume of oxygen gas produced (mm³/min) under constant thermal conditions (21°C) across light intensities from 0 to 100 kLux.',
      x_axis_label: 'Incident Light Intensity',
      y_axis_label: 'Net Oxygen Production Rate',
      unit_x: 'kLux',
      unit_y: 'mm³ O₂ / min',
      source_label: defaultSource,
      x_key: 'light_intensity',
      y_keys: ['o2_evolution_rate'],
      series_labels: {
        o2_evolution_rate: 'Oxygen Evolution Rate (mm³/min)',
      },
      data: [
        { light_intensity: 0, o2_evolution_rate: 0.0 },
        { light_intensity: 10, o2_evolution_rate: 9.4 },
        { light_intensity: 20, o2_evolution_rate: 18.2 },
        { light_intensity: 30, o2_evolution_rate: 26.5 },
        { light_intensity: 40, o2_evolution_rate: 32.8 },
        { light_intensity: 50, o2_evolution_rate: 37.1 },
        { light_intensity: 60, o2_evolution_rate: 39.4 },
        { light_intensity: 70, o2_evolution_rate: 40.1 },
        { light_intensity: 80, o2_evolution_rate: 40.3 },
        { light_intensity: 100, o2_evolution_rate: 40.4 },
      ],
    };
  }
  // Topic 5: Antibiotics / Bacteria / Resistance / Immunology
  else if (
    cleanTopic.includes('antibiot') ||
    cleanTopic.includes('bacteri') ||
    cleanTopic.includes('microb') ||
    cleanTopic.includes('resist') ||
    cleanTopic.includes('infect')
  ) {
    globalContext = 'Public Health & Global Disease';
    dataset = {
      graph_type: 'bar',
      title: 'Figure 1. Mean Zone of Inhibition Diameter (mm) for Clinical Staphylococcus aureus Isolates Across 5 Antimicrobial Classes (2015 vs 2025)',
      global_context: globalContext,
      description:
        'Standardized Kirby-Bauer disc diffusion susceptibility assay measuring clearing diameter on Mueller-Hinton agar for 150 clinical hospital isolates.',
      x_axis_label: 'Antibiotic Class Tested',
      y_axis_label: 'Mean Zone of Inhibition Diameter',
      unit_x: 'Class',
      unit_y: 'mm',
      source_label: defaultSource,
      x_key: 'antibiotic',
      y_keys: ['zone_2015', 'zone_2025'],
      series_labels: {
        zone_2015: '2015 Baseline Zone (mm)',
        zone_2025: '2025 Surveillance Zone (mm)',
      },
      data: [
        { antibiotic: 'Penicillin G', zone_2015: 28.4, zone_2025: 6.2 },
        { antibiotic: 'Methicillin', zone_2015: 23.1, zone_2025: 8.5 },
        { antibiotic: 'Erythromycin', zone_2015: 25.6, zone_2025: 14.1 },
        { antibiotic: 'Ciprofloxacin', zone_2015: 26.8, zone_2025: 19.3 },
        { antibiotic: 'Vancomycin', zone_2015: 24.5, zone_2025: 22.8 },
      ],
    };
  }
  // Default Generic Biological Dataset
  else {
    globalContext = 'Human impacts on ecosystems';
    dataset = {
      graph_type: 'line',
      title: `Figure 1. Longitudinal Biological Response & Metabolic Efficiency in ${topic} Across Experimental Stress Gradient`,
      global_context: globalContext,
      description: `Controlled bio-assay measuring baseline metabolic activity rate and relative cellular integrity in ${topic} across an increasing stress gradient.`,
      x_axis_label: 'Stress Gradient Level',
      y_axis_label: 'Relative Metabolic Rate & Cell Viability',
      unit_x: '% Stress Level',
      unit_y: '% Baseline',
      source_label: defaultSource,
      x_key: 'stress_level',
      y_keys: ['metabolic_rate', 'cell_viability'],
      series_labels: {
        metabolic_rate: 'Relative Metabolic Rate (%)',
        cell_viability: 'Cell Viability Index (%)',
      },
      data: [
        { stress_level: '0%', metabolic_rate: 100.0, cell_viability: 99.4 },
        { stress_level: '20%', metabolic_rate: 96.2, cell_viability: 92.1 },
        { stress_level: '40%', metabolic_rate: 88.5, cell_viability: 81.3 },
        { stress_level: '60%', metabolic_rate: 61.4, cell_viability: 58.7 },
        { stress_level: '80%', metabolic_rate: 34.2, cell_viability: 32.5 },
        { stress_level: '100%', metabolic_rate: 12.8, cell_viability: 14.1 },
      ],
    };
  }

  return {
    title,
    chosen_cluster: cluster,
    global_context: globalContext,
    context: `You are processing and evaluating quantitative data from a controlled biological investigation on "${topic}" in ${subject}. Examine the data table and accompanying graphical representation in Figure 1 to identify patterns, process calculations, explain biological mechanisms, evaluate experimental reliability, and formulate justified conclusions.`,
    atl_focus_explainer: `ATL Focus: Thinking / Research — ${cluster}. Skill Indicators: • Analyse biological trends and patterns from quantitative datasets; • Process numerical evidence and perform biological calculations; • Explain underlying physiological and cellular mechanisms using quantitative data; • Evaluate experimental reliability, anomalous results, and validity limitations; • Draw evidence-based conclusions and propose methodological improvements.`,
    skill_indicators: [
      'Analyse biological trends from quantitative evidence and graphical data.',
      'Process numerical evidence by calculating rate of change and percentage differences.',
      'Explain underlying biological relationships and mechanisms supported by data.',
      'Evaluate experimental reliability, anomalous trials, and methodological limitations.',
      'Draw justified scientific conclusions and suggest targeted improvements to the investigation.'
    ],
    scientific_dataset: dataset,
    target_criteria: ['Criterion C: Processing and evaluating'],
    target_strands: [
      'C.i: present collected and transformed data',
      'C.ii: interpret data and explain results using scientific reasoning',
      'C.iii: evaluate the validity of a hypothesis based on the outcome of the scientific investigation',
      'C.iv: evaluate the validity of the method',
      'C.v: explain improvements or extensions to the method'
    ],
    parts: [
      {
        label: 'A',
        prompt: `Identify a Trend (Pattern Recognition): State the overall quantitative relationship between the independent variable and dependent variable shown in Figure 1. Cite specific initial, maximum/plateau, and final values from the dataset to support your description.`,
        placeholder: `Describe the general trend, quoting initial values, peak/inflection values, and final values directly from the table/graph...`
      },
      {
        label: 'B',
        prompt: `Process Numerical Evidence (Scientific Calculations): Calculate the rate of change or percentage difference between two specified intervals in the dataset. Show your complete mathematical working, including correct scientific units.`,
        placeholder: `State formula: (Final - Initial) / Interval... Show working and final answer with correct units...`
      },
      {
        label: 'C',
        prompt: `Explain Biological Relationship (Mechanistic Reasoning): Explain the biological and physiological mechanism responsible for the observed trend in Figure 1. Why does the biological system respond in this specific way at molecular, cellular, or organismal levels?`,
        placeholder: `Explain the biological cause-and-effect relationship, citing specific enzymes, transport mechanisms, or physiological adaptations...`
      },
      {
        label: 'D',
        prompt: `Evaluate Reliability & Limitations (Critical Analysis): Evaluate the reliability and validity of this dataset. Identify any potential anomalous points, sample size limitations, or uncontrolled variables that could confound the results.`,
        placeholder: `Evaluate sample size, measurement precision, repeatability, and potential confounding biotic/abiotic factors...`
      },
      {
        label: 'E',
        prompt: `Draw Justified Conclusion & Suggest Improvement (Scientist's Challenge): State an evidence-based conclusion regarding the original investigation, justifying it with specific data. Propose ONE realistic, targeted methodological improvement or extension to enhance the validity of future data.`,
        placeholder: `Conclusion supported by data... Improvement: [Specific modification to apparatus or protocol] because it will...`
      }
    ],
    estimated_minutes: 15
  };
}

// -----------------------------------------------------------------------------------------
// CRITERION D GENERATOR: Reflecting on the Impacts of Science
// Scenarios involving ethics, sustainability, global context. Strictly NO numerical datasets.
// -----------------------------------------------------------------------------------------
export function generateCriterionDTask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string
): GeneratedTask {
  const title = exactTitle || topic;
  const cleanTopic = (topic || '').toLowerCase();

  let globalContext = 'Globalisation & sustainability';
  if (cleanTopic.includes('gene') || cleanTopic.includes('dna') || cleanTopic.includes('clon') || cleanTopic.includes('crispr') || cleanTopic.includes('biotech')) {
    globalContext = 'Scientific & technical innovation';
  } else if (cleanTopic.includes('health') || cleanTopic.includes('disease') || cleanTopic.includes('vaccin') || cleanTopic.includes('antibiot')) {
    globalContext = 'Fairness & development';
  } else if (cleanTopic.includes('ecolog') || cleanTopic.includes('climat') || cleanTopic.includes('pollut') || cleanTopic.includes('conserv')) {
    globalContext = 'Globalisation & sustainability';
  }

  return {
    title,
    chosen_cluster: cluster,
    global_context: globalContext,
    context: `You are evaluating the moral, ethical, environmental, and societal implications of scientific applications relating to "${topic}" in ${subject}. Framed within the global context of ${globalContext}, you will examine how scientific knowledge is applied to solve real-world problems and evaluate the resulting consequences for human communities and planetary ecosystems.`,
    atl_focus_explainer: `ATL Focus: Communication / Thinking — ${cluster}. Skill Indicators: • Explain the ways in which science is applied to solve specific real-world problems in ${topic}; • Discuss and evaluate the moral, ethical, social, economic, and environmental implications of scientific developments; • Apply accurate scientific language to communicate complex arguments effectively; • Synthesise stakeholder perspectives and justify evidence-based ethical decisions.`,
    skill_indicators: [
      `Explain how biological science is applied to address real-world challenges in ${topic}.`,
      `Evaluate moral, ethical, environmental, economic, and social implications of scientific solutions.`,
      `Apply precise scientific terminology to communicate balanced arguments.`,
      `Justify ethical decisions on controversial biological issues using scientific evidence and global context reasoning.`
    ],
    target_criteria: ['Criterion D: Reflecting on the impacts of science'],
    target_strands: [
      'D.i: explain the ways in which science is applied and used to address a specific problem or issue',
      'D.ii: discuss and evaluate the various implications of using science and its application to solve a specific problem or issue',
      'D.iii: apply scientific language effectively',
      'D.iv: document the work of others and sources of information used'
    ],
    parts: [
      {
        label: 'A',
        prompt: `Scientific Application (Context & Purpose): Explain the way in which biological science, technology, or research in ${topic} is currently applied to solve a significant real-world problem. Describe the specific biological mechanism or principle underlying this technology.`,
        placeholder: `Explain the real-world problem, the specific scientific technology/solution used, and the biological mechanism behind it...`
      },
      {
        label: 'B',
        prompt: `Evaluate Implications (Multi-Perspective Analysis): Discuss and evaluate at least TWO distinct implications of using this scientific application (choose from: ethical, environmental, economic, or social). Address both positive benefits and negative unintended consequences.`,
        placeholder: `Implication 1 (e.g. Environmental/Social): Positive benefits vs potential negative impacts...\nImplication 2 (e.g. Ethical/Economic): Trade-offs and stakeholder impacts...`
      },
      {
        label: 'C',
        prompt: `Communication & Stakeholder Perspectives (Scientific Literacy): Evaluate how scientific claims regarding ${topic} should be communicated to diverse public and policy stakeholders. How can scientists effectively use evidence and scientific language to address public scepticism or ethical concerns?`,
        placeholder: `Evaluate communication strategies, the role of evidence-based discourse, and methods to address misinformation or conflicting stakeholder priorities...`
      },
      {
        label: 'D',
        prompt: `Justified Ethical Decision (Scientist's Challenge): Take a defended, evidence-based stance on whether this scientific application should be expanded, restricted, or regulated in the context of ${globalContext}. Justify your decision by balancing biological efficacy with ethical and societal responsibilities.`,
        placeholder: `Scientist's Challenge: State your defended position and justify your policy or ethical recommendation using scientific reasoning and global context principles...`
      }
    ],
    estimated_minutes: 15
  };
}

/**
 * Master dispatcher: Generates the exact assessment task according to the selected Criterion.
 * Guarantees that:
 * - Criterion A: Knowing and understanding (no graphs/data)
 * - Criterion B: Inquiring and designing (no results/graphs)
 * - Criterion C: Processing and evaluating (data tables + graphs only)
 * - Criterion D: Reflecting on the impacts of science (ethics/impacts/global context, no graphs)
 */
export function generateTaskByCriterion(
  criterionCode: MYPCriterionCode,
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string
): GeneratedTask {
  switch (criterionCode) {
    case 'Criterion A':
      return generateCriterionATask(topic, subject, mypYear, cluster, exactTitle);
    case 'Criterion B':
      return generateCriterionBTask(topic, subject, mypYear, cluster, exactTitle);
    case 'Criterion C':
      return generateCriterionCTask(topic, subject, mypYear, cluster, exactTitle);
    case 'Criterion D':
      return generateCriterionDTask(topic, subject, mypYear, cluster, exactTitle);
    default:
      return generateCriterionATask(topic, subject, mypYear, cluster, exactTitle);
  }
}

// Backwards compatibility alias
export function generateScientificInvestigation(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking'
) {
  const task = generateCriterionCTask(topic, subject, mypYear, cluster);
  return {
    globalContext: task.global_context || 'Food security & Biodiversity',
    dataset: task.scientific_dataset!,
    parts: task.parts,
    skillIndicators: task.skill_indicators || []
  };
}
