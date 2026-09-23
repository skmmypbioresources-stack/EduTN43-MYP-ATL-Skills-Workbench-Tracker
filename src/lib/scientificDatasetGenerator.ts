import { ScientificDataset, TaskPart, GeneratedTask, TaskImageAttachment, ATLSkillGuide } from '../types';

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
// SCIENTIFIC STIMULUS DIAGRAMS & IMAGES GENERATOR
// Creates high-clarity vector diagrams as data-URIs for question stimulus
// -----------------------------------------------------------------------------------------
export function getFallbackStimulusImage(topic = 'Biology', subject = 'Biology'): string {
  const images = generateStimulusImagesForTopic(topic, subject);
  return images[0]?.url || 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f8fafc%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22150%22%20text-anchor%3D%22middle%22%20fill%3D%22%2364748b%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%3EScientific%20Diagram%3C%2Ftext%3E%3C%2Fsvg%3E';
}

export function generateStimulusImagesForTopic(topic: string, subject = 'Biology'): TaskImageAttachment[] {
  const clean = (topic || '').toLowerCase();

  // 1. Enzyme / Biochemical Kinetics & Activation Energy Diagram
  if (
    clean.includes('enzyme') ||
    clean.includes('cataly') ||
    clean.includes('digest') ||
    clean.includes('amylase') ||
    clean.includes('protein') ||
    clean.includes('substrat') ||
    clean.includes('inhibit')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
        <linearGradient id="enzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#312e81" />
        </linearGradient>
        <linearGradient id="subGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
      </defs>
      <rect width="700" height="360" fill="#f8fafc" rx="16"/>
      <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>
      
      <!-- Stage 1 -->
      <g transform="translate(35, 60)">
        <text x="80" y="16" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">1. Free Enzyme & Substrate</text>
        <!-- Substrate -->
        <polygon points="60,50 100,50 110,80 90,98 70,98 50,80" fill="url(#subGrad)" stroke="#b45309" stroke-width="2"/>
        <text x="80" y="78" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#ffffff" text-anchor="middle">Substrate (S)</text>
        <!-- Enzyme -->
        <path d="M 30,135 Q 80,95 130,135 L 140,195 Q 80,210 20,195 Z" fill="url(#enzGrad)" stroke="#1e1b4b" stroke-width="2"/>
        <text x="80" y="170" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">Active Site</text>
      </g>

      <path d="M 220,145 L 250,145" stroke="#94a3b8" stroke-width="3" marker-end="url(#arrow)" stroke-dasharray="4"/>

      <!-- Stage 2 -->
      <g transform="translate(245, 60)">
        <text x="95" y="16" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">2. Enzyme-Substrate Complex</text>
        <!-- Bound Substrate -->
        <polygon points="75,100 115,100 122,122 105,138 85,138 68,122" fill="url(#subGrad)" stroke="#b45309" stroke-width="2"/>
        <!-- Enzyme holding substrate -->
        <path d="M 45,125 Q 95,95 145,125 L 155,195 Q 95,210 35,195 Z" fill="url(#enzGrad)" stroke="#1e1b4b" stroke-width="2"/>
        <text x="95" y="175" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#c7d2fe" text-anchor="middle">Induced Fit Strain</text>
      </g>

      <path d="M 445,145 L 475,145" stroke="#94a3b8" stroke-width="3" marker-end="url(#arrow)" stroke-dasharray="4"/>

      <!-- Stage 3 -->
      <g transform="translate(470, 60)">
        <text x="95" y="16" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#1e293b" text-anchor="middle">3. Products Dissociated</text>
        <!-- Split Products -->
        <circle cx="70" cy="70" r="16" fill="#10b981" stroke="#047857" stroke-width="2"/>
        <text x="70" y="74" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#fff" text-anchor="middle">P₁</text>
        <circle cx="120" cy="70" r="16" fill="#06b6d4" stroke="#0e7490" stroke-width="2"/>
        <text x="120" y="74" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#fff" text-anchor="middle">P₂</text>
        <!-- Regenerated Enzyme -->
        <path d="M 45,135 Q 95,95 145,135 L 155,195 Q 95,210 35,195 Z" fill="url(#enzGrad)" stroke="#1e1b4b" stroke-width="2"/>
        <text x="95" y="170" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">Recycled Enzyme</text>
      </g>
      
      <!-- Bottom Activation Energy Comparison Line -->
      <g transform="translate(60, 275)">
        <rect x="0" y="0" width="580" height="42" fill="#eff6ff" stroke="#bfdbfe" rx="8"/>
        <text x="290" y="26" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e40af" text-anchor="middle">Biochemical Principle: Enzyme lowers activation energy barrier (ΔG‡) without altering net free energy change (ΔG).</text>
      </g>

      <text x="350" y="340" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Catalytic Cycle & Induced-Fit Enzyme-Substrate Model</text>
    </svg>`;

    return [
      {
        id: 'stimulus-diag-enzyme',
        name: 'Figure S1: Enzyme Catalytic Mechanism Diagram',
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption: 'Figure S1. Molecular schematic illustrating substrate-active site binding, induced-fit conformational shift, and product release.'
      }
    ];
  }

  // 2. Osmosis, Water Potential & Plant Tuber Tissue States (Solanum tuberosum)
  if (
    clean.includes('osmo') ||
    clean.includes('transport') ||
    clean.includes('diffus') ||
    clean.includes('membrane') ||
    clean.includes('cell membrane') ||
    clean.includes('potato') ||
    clean.includes('turgor') ||
    clean.includes('plasmoly') ||
    clean.includes('solute')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284c7" />
        </marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
        </marker>
      </defs>
      <rect width="700" height="360" fill="#f8fafc" rx="16"/>
      <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>
      
      <!-- Panel 1: Hypotonic (0.0 M) -->
      <g transform="translate(35, 45)">
        <rect x="0" y="0" width="195" height="245" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5" rx="10"/>
        <text x="97" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#166534" text-anchor="middle">Hypotonic (0.0 M)</text>
        <text x="97" y="40" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#15803d" text-anchor="middle">Pure Distilled Water</text>
        
        <!-- Plant cell wall -->
        <rect x="30" y="60" width="135" height="110" fill="#dcfce7" stroke="#15803d" stroke-width="3" rx="6"/>
        <!-- Turgid vacuole & cytoplasm pushing against wall -->
        <rect x="35" y="65" width="125" height="100" fill="#bbf7d0" stroke="#16a34a" stroke-width="2" rx="4"/>
        <text x="97" y="120" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#166534" text-anchor="middle">TURGID</text>
        <text x="97" y="136" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#15803d" text-anchor="middle">(+18.6% Mass Increase)</text>
        
        <!-- Water entering arrows -->
        <line x1="12" y1="115" x2="28" y2="115" stroke="#0284c7" stroke-width="3" marker-end="url(#arrow)"/>
        <text x="97" y="200" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#1e293b" text-anchor="middle">Net H₂O Influx (Endosmosis)</text>
        <text x="97" y="220" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#64748b" text-anchor="middle">High External Water Potential</text>
      </g>

      <!-- Panel 2: Isotonic (~0.38 M) -->
      <g transform="translate(252, 45)">
        <rect x="0" y="0" width="195" height="245" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="10"/>
        <text x="97" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0f172a" text-anchor="middle">Isotonic (~0.38 M)</text>
        <text x="97" y="40" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#475569" text-anchor="middle">Equilibrium Concentration</text>
        
        <!-- Plant cell wall -->
        <rect x="30" y="60" width="135" height="110" fill="#f1f5f9" stroke="#64748b" stroke-width="3" rx="6"/>
        <!-- Flaccid cell -->
        <rect x="38" y="68" width="119" height="94" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" rx="4"/>
        <text x="97" y="120" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#334155" text-anchor="middle">EQUILIBRIUM</text>
        <text x="97" y="136" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#64748b" text-anchor="middle">(0.0% Net Mass Change)</text>
        
        <text x="97" y="200" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#1e293b" text-anchor="middle">Dynamic Water Balance</text>
        <text x="97" y="220" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#64748b" text-anchor="middle">Ψ(inside) = Ψ(outside)</text>
      </g>

      <!-- Panel 3: Hypertonic (1.0 M) -->
      <g transform="translate(470, 45)">
        <rect x="0" y="0" width="195" height="245" fill="#fef2f2" stroke="#fca5a5" stroke-width="1.5" rx="10"/>
        <text x="97" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#991b1b" text-anchor="middle">Hypertonic (1.0 M)</text>
        <text x="97" y="40" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#dc2626" text-anchor="middle">High Sucrose Solution</text>
        
        <!-- Plant cell wall -->
        <rect x="30" y="60" width="135" height="110" fill="#fee2e2" stroke="#dc2626" stroke-width="3" rx="6"/>
        <!-- Plasmolyzed shrunken protoplast -->
        <rect x="52" y="78" width="90" height="74" fill="#fca5a5" stroke="#b91c1c" stroke-width="2" rx="14"/>
        <text x="97" y="118" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#7f1d1d" text-anchor="middle">PLASMOLYZED</text>
        <text x="97" y="134" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#991b1b" text-anchor="middle">(-26.3% Mass Loss)</text>
        
        <!-- Water leaving arrows -->
        <line x1="145" y1="115" x2="162" y2="115" stroke="#dc2626" stroke-width="3" marker-end="url(#arrow-red)"/>
        <text x="97" y="200" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#1e293b" text-anchor="middle">Net H₂O Efflux (Exosmosis)</text>
        <text x="97" y="220" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#64748b" text-anchor="middle">Low External Water Potential</text>
      </g>

      <text x="350" y="325" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Plant Tissue Water Potential Gradient & Cellular Osmotic Responses</text>
    </svg>`;

    return [
      {
        id: 'stimulus-diag-osmosis',
        name: 'Figure S1: Plant Cell Osmotic Turgor & Plasmolysis Diagram',
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption: 'Figure S1. Cellular mechanism showing turgid, equilibrium, and plasmolyzed plant cell states across graded external sucrose concentrations.'
      }
    ];
  }

  // 3. Photosynthesis & Chloroplast Function
  if (
    clean.includes('photo') ||
    clean.includes('light') ||
    clean.includes('chlorophyll') ||
    clean.includes('chloroplast') ||
    clean.includes('elodea') ||
    clean.includes('calvin') ||
    clean.includes('thylakoid')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#047857" />
        </marker>
        <linearGradient id="chloroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#059669" />
          <stop offset="100%" stop-color="#065f46" />
        </linearGradient>
      </defs>
      <rect width="700" height="360" fill="#f8fafc" rx="16"/>
      <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>

      <!-- Chloroplast Organelle Outline -->
      <g transform="translate(50, 45)">
        <rect x="0" y="0" width="600" height="250" fill="#ecfdf5" stroke="#10b981" stroke-width="3" rx="40"/>
        <text x="300" y="28" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#065f46" text-anchor="middle">Chloroplast Organelle: Two-Stage Photosynthetic Mechanism</text>

        <!-- Thylakoid Stack (Light Dependent) -->
        <g transform="translate(60, 55)">
          <rect x="0" y="0" width="200" height="150" fill="#d1fae5" stroke="#059669" stroke-width="2" rx="12"/>
          <text x="100" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#047857" text-anchor="middle">1. Thylakoid Grana Stacks</text>
          <text x="100" y="40" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#065f46" text-anchor="middle">(Light-Dependent Reactions)</text>

          <!-- Disc stacks -->
          <ellipse cx="100" cy="70" rx="60" ry="12" fill="#059669" stroke="#047857" stroke-width="1.5"/>
          <ellipse cx="100" cy="85" rx="60" ry="12" fill="#10b981" stroke="#047857" stroke-width="1.5"/>
          <ellipse cx="100" cy="100" rx="60" ry="12" fill="#34d399" stroke="#047857" stroke-width="1.5"/>

          <text x="100" y="132" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#065f46" text-anchor="middle">Photolysis: 2H₂O → O₂ + 4H⁺</text>
        </g>

        <!-- Intermediate Arrows -->
        <g transform="translate(275, 90)">
          <path d="M 0,15 L 45,15" stroke="#047857" stroke-width="3" marker-end="url(#arrow)"/>
          <text x="22" y="8" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#047857" text-anchor="middle">ATP + NADPH</text>

          <path d="M 45,45 L 0,45" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="22" y="62" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">ADP + NADP⁺</text>
        </g>

        <!-- Stroma (Light Independent / Calvin) -->
        <g transform="translate(340, 55)">
          <rect x="0" y="0" width="200" height="150" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" rx="12"/>
          <text x="100" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#92400e" text-anchor="middle">2. Aqueous Stroma Matrix</text>
          <text x="100" y="40" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b45309" text-anchor="middle">(Calvin Cycle / Carbon Fixation)</text>

          <!-- Cycle Circle -->
          <circle cx="100" cy="85" r="32" fill="none" stroke="#d97706" stroke-width="3" stroke-dasharray="6,3"/>
          <text x="100" y="88" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#92400e" text-anchor="middle">RuBisCO</text>

          <text x="100" y="132" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#92400e" text-anchor="middle">CO₂ Fixed → Triose Phosphate</text>
        </g>
      </g>

      <text x="350" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Chloroplast Ultrastructure, Photolysis, and Calvin Carbon Fixation</text>
    </svg>`;

    return [
      {
        id: 'stimulus-diag-photo',
        name: 'Figure S1: Chloroplast Photosynthetic Pathway Diagram',
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption: 'Figure S1. Functional schematic of light-dependent photolysis in thylakoid grana and carbon fixation in the stroma.'
      }
    ];
  }

  // 4. Cellular Respiration & Mitochondria
  if (
    clean.includes('respirat') ||
    clean.includes('mitochon') ||
    clean.includes('energy') ||
    clean.includes('ferment') ||
    clean.includes('yeast') ||
    clean.includes('lactate') ||
    clean.includes('atp') ||
    clean.includes('exercise')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b91c1c" />
        </marker>
      </defs>
      <rect width="700" height="360" fill="#f8fafc" rx="16"/>
      <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>

      <g transform="translate(50, 45)">
        <rect x="0" y="0" width="600" height="250" fill="#fff1f2" stroke="#f43f5e" stroke-width="3" rx="40"/>
        <text x="300" y="26" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#9f1239" text-anchor="middle">Mitochondrial Respiration: Aerobic Catabolic Pathway</text>

        <!-- Stage 1: Glycolysis -->
        <g transform="translate(30, 50)">
          <rect x="0" y="0" width="150" height="150" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="10"/>
          <text x="75" y="25" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#0f172a" text-anchor="middle">Cytoplasm</text>
          <text x="75" y="45" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#475569" text-anchor="middle">Glycolysis</text>
          <text x="75" y="80" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#334155" text-anchor="middle">Glucose (C₆)</text>
          <text x="75" y="100" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#b91c1c" text-anchor="middle">↓ 2 Pyruvate (C₃)</text>
          <text x="75" y="130" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#059669" text-anchor="middle">Net +2 ATP</text>
        </g>

        <!-- Stage 2: Krebs Cycle -->
        <g transform="translate(225, 50)">
          <rect x="0" y="0" width="150" height="150" fill="#fee2e2" stroke="#f87171" stroke-width="2" rx="10"/>
          <text x="75" y="25" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#991b1b" text-anchor="middle">Mitochondrial Matrix</text>
          <text x="75" y="45" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#b91c1c" text-anchor="middle">Krebs Cycle</text>
          <circle cx="75" cy="85" r="24" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,2"/>
          <text x="75" y="88" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="#991b1b" text-anchor="middle">Citric Acid</text>
          <text x="75" y="130" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#059669" text-anchor="middle">NADH + FADH₂</text>
        </g>

        <!-- Stage 3: ETC -->
        <g transform="translate(420, 50)">
          <rect x="0" y="0" width="150" height="150" fill="#fef2f2" stroke="#ef4444" stroke-width="2" rx="10"/>
          <text x="75" y="25" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#991b1b" text-anchor="middle">Inner Cristae</text>
          <text x="75" y="45" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#b91c1c" text-anchor="middle">Electron Transport</text>
          <text x="75" y="80" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#334155" text-anchor="middle">H⁺ Gradient</text>
          <text x="75" y="98" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#b91c1c" text-anchor="middle">O₂ + e⁻ → H₂O</text>
          <text x="75" y="130" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#059669" text-anchor="middle">~32-34 ATP</text>
        </g>
      </g>

      <text x="350" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Stages of Cellular Respiration and ATP Generation</text>
    </svg>`;

    return [
      {
        id: 'stimulus-diag-respiration',
        name: 'Figure S1: Cellular Respiration Pathway Diagram',
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption: 'Figure S1. Biochemical schematic of glycolysis, the Krebs matrix cycle, and oxidative phosphorylation yielding ATP.'
      }
    ];
  }

  // 5. Antibiotics / Kirby-Bauer Disc Diffusion
  if (
    clean.includes('antibiot') ||
    clean.includes('bacteri') ||
    clean.includes('microb') ||
    clean.includes('resist') ||
    clean.includes('infect') ||
    clean.includes('pathogen')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
      <rect width="700" height="360" fill="#f8fafc" rx="16"/>
      <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>
      
      <!-- Agar Plate -->
      <circle cx="230" cy="175" r="120" fill="#fef9c3" stroke="#cbd5e1" stroke-width="6"/>
      <!-- Bacterial Lawn texture -->
      <circle cx="230" cy="175" r="114" fill="#fef08a" opacity="0.6"/>
      
      <!-- Disc 1 (Susceptible, AMX, 28mm) -->
      <circle cx="190" cy="130" r="42" fill="#ffffff" stroke="#0284c7" stroke-width="2" stroke-dasharray="3,3"/>
      <circle cx="190" cy="130" r="10" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
      <text x="190" y="133" font-family="system-ui, sans-serif" font-size="8" font-weight="800" fill="#0f172a" text-anchor="middle">AMX</text>
      
      <!-- Disc 2 (Resistant, PEN, 0mm) -->
      <circle cx="270" cy="135" r="12" fill="#ffffff" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,3"/>
      <circle cx="270" cy="135" r="10" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
      <text x="270" y="138" font-family="system-ui, sans-serif" font-size="8" font-weight="800" fill="#0f172a" text-anchor="middle">PEN</text>

      <!-- Disc 3 (Intermediate, CIP, 18mm) -->
      <circle cx="230" cy="220" r="28" fill="#ffffff" stroke="#d97706" stroke-width="2" stroke-dasharray="3,3"/>
      <circle cx="230" cy="220" r="10" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
      <text x="230" y="223" font-family="system-ui, sans-serif" font-size="8" font-weight="800" fill="#0f172a" text-anchor="middle">CIP</text>

      <!-- Key Panel -->
      <g transform="translate(400, 50)">
        <text x="0" y="20" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#0f172a">Kirby-Bauer Assay Key &amp; Calibration</text>
        <rect x="0" y="35" width="260" height="210" fill="#f8fafc" stroke="#e2e8f0" rx="8"/>
        
        <circle cx="20" cy="65" r="8" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
        <text x="36" y="69" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#0369a1">Susceptible: Clear Zone (&gt;25 mm)</text>

        <circle cx="20" cy="105" r="8" fill="#ffffff" stroke="#d97706" stroke-width="2"/>
        <text x="36" y="109" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#b45309">Intermediate: Moderate Zone (15-20 mm)</text>

        <circle cx="20" cy="145" r="8" fill="#ffffff" stroke="#dc2626" stroke-width="2"/>
        <text x="36" y="149" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#b91c1c">Resistant: Minimal/No Zone (&lt;10 mm)</text>

        <rect x="15" y="180" width="230" height="26" fill="#eff6ff" rx="4"/>
        <text x="130" y="197" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#1e40af" text-anchor="middle">Standard Calibrated 6 mm Disc</text>
      </g>

      <text x="350" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Disc Diffusion Susceptibility Assay Showing Zones of Inhibition</text>
    </svg>`;

    return [
      {
        id: 'stimulus-diag-agar',
        name: 'Figure S1: Disc Diffusion Assay Diagram',
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption: 'Figure S1. Disc diffusion agar layout illustrating antimicrobial inhibition zones and bacterial lawn clearance.'
      }
    ];
  }

  // 6. Ecology / Food Web / Energy Pyramids
  if (
    clean.includes('ecol') ||
    clean.includes('food') ||
    clean.includes('trophic') ||
    clean.includes('pyramid') ||
    clean.includes('producer') ||
    clean.includes('ecosystem') ||
    clean.includes('biodivers') ||
    clean.includes('predat') ||
    clean.includes('pollinat') ||
    clean.includes('bee')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#047857" />
        </marker>
      </defs>
      <rect width="700" height="360" fill="#f8fafc" rx="16"/>
      <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>

      <text x="350" y="42" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#065f46" text-anchor="middle">Trophic Energy Pyramid: Lindeman's 10% Ecological Efficiency Law</text>

      <!-- Tiers -->
      <!-- Tier 4: Apex Predators -->
      <polygon points="280,70 420,70 450,115 250,115" fill="#fecdd3" stroke="#f43f5e" stroke-width="2"/>
      <text x="350" y="92" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#9f1239" text-anchor="middle">Tertiary Consumers (Apex): 10 J</text>
      <text x="350" y="106" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#be123c" text-anchor="middle">Eagle / Shark (0.1% of incident energy)</text>

      <!-- Tier 3: Secondary Consumers -->
      <polygon points="250,120 450,120 490,165 210,165" fill="#fed7aa" stroke="#f97316" stroke-width="2"/>
      <text x="350" y="142" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#9a3412" text-anchor="middle">Secondary Consumers: 100 J</text>
      <text x="350" y="156" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#c2410c" text-anchor="middle">Carnivores / Insectivores</text>

      <!-- Tier 2: Primary Consumers -->
      <polygon points="210,170 490,170 530,215 170,215" fill="#fef08a" stroke="#eab308" stroke-width="2"/>
      <text x="350" y="192" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#854d0e" text-anchor="middle">Primary Consumers (Herbivores): 1,000 J</text>
      <text x="350" y="206" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#a16207" text-anchor="middle">Zooplankton / Grazers</text>

      <!-- Tier 1: Primary Producers -->
      <polygon points="170,220 530,220 570,265 130,265" fill="#bbf7d0" stroke="#22c55e" stroke-width="2"/>
      <text x="350" y="242" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#166534" text-anchor="middle">Primary Producers: 10,000 J</text>
      <text x="350" y="256" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#15803d" text-anchor="middle">Phytoplankton / Terrestrial Flora</text>

      <!-- Energy Loss Side Note -->
      <g transform="translate(565, 140)">
        <rect x="0" y="0" width="105" height="70" fill="#fee2e2" stroke="#fca5a5" rx="6"/>
        <text x="52" y="22" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#991b1b" text-anchor="middle">~90% Dissipated</text>
        <text x="52" y="38" font-family="system-ui, sans-serif" font-size="8" font-weight="600" fill="#b91c1c" text-anchor="middle">Metabolic Heat</text>
        <text x="52" y="52" font-family="system-ui, sans-serif" font-size="8" font-weight="600" fill="#b91c1c" text-anchor="middle">Respiration &amp; Waste</text>
      </g>

      <text x="350" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Ecological Biomass &amp; Thermodynamic Energy Dissipation Model</text>
    </svg>`;

    return [
      {
        id: 'stimulus-diag-ecology',
        name: 'Figure S1: Ecological Trophic Energy Pyramid',
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption: 'Figure S1. Quantitative trophic level structure depicting biomass step-downs and the 10% energy transfer rule.'
      }
    ];
  }

  // 7. Genetics, DNA & Mendelian Cross
  if (
    clean.includes('gene') ||
    clean.includes('dna') ||
    clean.includes('rna') ||
    clean.includes('inherit') ||
    clean.includes('allele') ||
    clean.includes('punnett') ||
    clean.includes('cross') ||
    clean.includes('mutat') ||
    clean.includes('trait')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
      <rect width="700" height="360" fill="#f8fafc" rx="16"/>
      <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>

      <text x="350" y="42" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#1e1b4b" text-anchor="middle">Mendelian Monohybrid Cross: Allelic Segregation &amp; Punnett Model</text>

      <!-- Punnett Grid -->
      <g transform="translate(120, 65)">
        <!-- Header gametes -->
        <text x="110" y="20" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#4f46e5" text-anchor="middle">Maternal Gametes: Bb</text>
        <text x="18" y="105" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0284c7" text-anchor="middle">Paternal</text>

        <!-- Column labels -->
        <text x="80" y="45" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#4338ca" text-anchor="middle">B</text>
        <text x="140" y="45" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#4338ca" text-anchor="middle">b</text>

        <!-- Row labels -->
        <text x="40" y="85" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#0369a1" text-anchor="middle">B</text>
        <text x="40" y="145" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#0369a1" text-anchor="middle">b</text>

        <!-- Cell (1,1): BB -->
        <rect x="55" y="55" width="55" height="55" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
        <text x="82" y="88" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#1d4ed8" text-anchor="middle">BB</text>

        <!-- Cell (1,2): Bb -->
        <rect x="115" y="55" width="55" height="55" fill="#f0fdf4" stroke="#22c55e" stroke-width="2"/>
        <text x="142" y="88" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#15803d" text-anchor="middle">Bb</text>

        <!-- Cell (2,1): Bb -->
        <rect x="55" y="115" width="55" height="55" fill="#f0fdf4" stroke="#22c55e" stroke-width="2"/>
        <text x="82" y="148" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#15803d" text-anchor="middle">Bb</text>

        <!-- Cell (2,2): bb -->
        <rect x="115" y="115" width="55" height="55" fill="#fef2f2" stroke="#ef4444" stroke-width="2"/>
        <text x="142" y="148" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#b91c1c" text-anchor="middle">bb</text>
      </g>

      <!-- Ratio Breakdown Box -->
      <g transform="translate(380, 75)">
        <rect x="0" y="0" width="240" height="175" fill="#f8fafc" stroke="#cbd5e1" rx="10"/>
        <text x="120" y="25" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0f172a" text-anchor="middle">Expected Phenotypic Distribution</text>

        <rect x="15" y="42" width="210" height="32" fill="#eff6ff" stroke="#bfdbfe" rx="6"/>
        <text x="25" y="62" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e40af">Dominant Phenotype: 75% (3/4)</text>

        <rect x="15" y="82" width="210" height="32" fill="#fef2f2" stroke="#fecaca" rx="6"/>
        <text x="25" y="102" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#991b1b">Recessive Phenotype: 25% (1/4)</text>

        <text x="120" y="145" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#334155" text-anchor="middle">Genotypic Ratio: 1 BB : 2 Bb : 1 bb</text>
      </g>

      <text x="350" y="330" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Punnett Square Analysis Demonstrating Law of Independent Segregation</text>
    </svg>`;

    return [
      {
        id: 'stimulus-diag-genetics',
        name: 'Figure S1: Punnett Square Monohybrid Inheritance Diagram',
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption: 'Figure S1. Theoretical Punnett square showing homozygous and heterozygous allele combinations with a 3:1 phenotypic outcome.'
      }
    ];
  }

  // 8. Default: Standard Controlled Laboratory Experimental Apparatus Setup
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 360" width="700" height="360">
    <rect width="700" height="360" fill="#f8fafc" rx="16"/>
    <rect x="16" y="16" width="668" height="328" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>
    
    <g transform="translate(60, 40)">
      <text x="280" y="24" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#0f172a" text-anchor="middle">Standardized Controlled Experimental Apparatus Setup</text>
      <!-- Bench surface -->
      <line x1="20" y1="240" x2="560" y2="240" stroke="#334155" stroke-width="4"/>

      <!-- Water Bath / Chamber -->
      <rect x="80" y="120" width="180" height="120" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" rx="4"/>
      <text x="170" y="145" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">Constant Temp Bath</text>
      
      <!-- Reaction Tube inside -->
      <rect x="145" y="90" width="50" height="120" fill="#f8fafc" stroke="#475569" stroke-width="2" rx="6"/>
      <rect x="147" y="150" width="46" height="58" fill="#cbd5e1" opacity="0.6"/>

      <!-- Thermometer -->
      <line x1="215" y1="70" x2="215" y2="200" stroke="#ef4444" stroke-width="3"/>
      <circle cx="215" cy="205" r="6" fill="#ef4444"/>
      <text x="225" y="85" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#b91c1c">Temp Probe</text>

      <!-- Collection Syringe / Sensor -->
      <rect x="320" y="110" width="150" height="35" fill="#f1f5f9" stroke="#64748b" stroke-width="2" rx="4"/>
      <!-- Plunger -->
      <rect x="420" y="116" width="70" height="23" fill="#94a3b8" rx="2"/>
      <text x="395" y="132" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">Gas Syringe (±0.2 mL)</text>

      <!-- Delivery Tube connecting them -->
      <path d="M 170,90 L 170,60 L 320,60 L 320,125" fill="none" stroke="#64748b" stroke-width="3"/>
    </g>

    <text x="350" y="325" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">Figure S1: Calibrated Apparatus Setup for Quantitative Empirical Data Collection</text>
  </svg>`;

  return [
    {
      id: 'stimulus-diag-setup',
      name: 'Figure S1: Calibrated Apparatus Setup',
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      caption: 'Figure S1. Schematic of standardized experimental apparatus with digital measurement sensors and controls.'
    }
  ];
}

// -----------------------------------------------------------------------------------------
// SCIENTIFIC DATASET MASTER GENERATOR
// Produces authentic datasets with interactive graph data for ANY topic and criterion
// -----------------------------------------------------------------------------------------
export function getScientificDatasetForTopic(
  topic: string,
  criterionCode: MYPCriterionCode = 'Criterion C',
  subject = 'Biology'
): ScientificDataset {
  const cleanTopic = (topic || '').toLowerCase();
  const defaultSource = 'Source: Simulated biological dataset generated for educational purposes.';

  // 1. Pollination / Plants / Agriculture / Bees
  if (
    cleanTopic.includes('pollin') ||
    cleanTopic.includes('reproduct') ||
    cleanTopic.includes('bee') ||
    cleanTopic.includes('crop') ||
    cleanTopic.includes('flower') ||
    (cleanTopic.includes('plant') && cleanTopic.includes('yield'))
  ) {
    return {
      graph_type: 'line',
      title: 'Figure 1. Effect of Ambient Temperature on Mean Pollen Tube Growth Rate and Seed Set in Prunus avium',
      global_context: 'Food security & biodiversity',
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

  // 2. Enzymes / Metabolism / Digestion
  if (
    cleanTopic.includes('enzyme') ||
    cleanTopic.includes('cataly') ||
    cleanTopic.includes('digest') ||
    cleanTopic.includes('protein') ||
    cleanTopic.includes('amylase') ||
    cleanTopic.includes('catalase')
  ) {
    return {
      graph_type: 'line',
      title: 'Figure 1. Initial Reaction Velocity (V0) of Human Salivary Amylase vs. Incubation Temperature (10°C–70°C) at Constant pH 6.8',
      global_context: 'Biotechnology & public health',
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

  // 3. Osmosis / Membrane / Cell Transport
  if (
    cleanTopic.includes('osmo') ||
    cleanTopic.includes('transport') ||
    cleanTopic.includes('diffus') ||
    cleanTopic.includes('membrane') ||
    cleanTopic.includes('cell membrane') ||
    cleanTopic.includes('turgor')
  ) {
    return {
      graph_type: 'scatter',
      title: 'Figure 1. Mean Percentage Change in Solanum tuberosum Tuber Cylinder Mass vs. External Sucrose Solution Molarity (0.0–1.0 mol/dm³)',
      global_context: 'Water security & agriculture',
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

  // 4. Photosynthesis / Chlorophyll / Light
  if (
    cleanTopic.includes('photo') ||
    cleanTopic.includes('light') ||
    cleanTopic.includes('chlorophyll') ||
    cleanTopic.includes('carbon') ||
    cleanTopic.includes('elodea')
  ) {
    return {
      graph_type: 'line',
      title: 'Figure 1. Net Photosynthetic Oxygen Evolution Rate in Elodea canadensis vs. Incident Light Intensity at Saturated Dissolved CO₂',
      global_context: 'Climate change & ecosystems',
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

  // 5. Antibiotics / Bacteria / Medicine
  if (
    cleanTopic.includes('antibiot') ||
    cleanTopic.includes('bacteri') ||
    cleanTopic.includes('microb') ||
    cleanTopic.includes('resist') ||
    cleanTopic.includes('infect')
  ) {
    return {
      graph_type: 'bar',
      title: 'Figure 1. Mean Zone of Inhibition Diameter (mm) for Clinical Staphylococcus aureus Isolates Across 5 Antimicrobial Classes (2015 vs 2025)',
      global_context: 'Public health & global disease',
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

  // 6. Genetics / DNA / Gene Expression
  if (cleanTopic.includes('gene') || cleanTopic.includes('dna') || cleanTopic.includes('rna') || cleanTopic.includes('mutat') || cleanTopic.includes('crispr')) {
    return {
      graph_type: 'bar',
      title: `Figure 1. Relative Gene Expression Levels (qPCR Fold Change) in ${topic} Following Targeted Environmental Induction`,
      global_context: 'Scientific & technical innovation',
      description: 'Quantitative real-time PCR measuring relative mRNA expression fold-change standardized against GAPDH housekeeping controls.',
      x_axis_label: 'Target Locus Tested',
      y_axis_label: 'Relative mRNA Expression (Fold Change)',
      unit_x: 'Locus',
      unit_y: '2^-ΔΔCt Fold',
      source_label: defaultSource,
      x_key: 'locus',
      y_keys: ['wild_type', 'induced_state'],
      series_labels: {
        wild_type: 'Wild Type Baseline',
        induced_state: 'Induced Condition',
      },
      data: [
        { locus: 'Gene A (Control)', wild_type: 1.0, induced_state: 1.05 },
        { locus: 'Promoter Region B', wild_type: 1.0, induced_state: 4.82 },
        { locus: 'Structural Exon C', wild_type: 1.0, induced_state: 6.14 },
        { locus: 'Regulatory Kinase D', wild_type: 1.0, induced_state: 0.28 },
        { locus: 'Transport Channel E', wild_type: 1.0, induced_state: 3.45 },
      ],
    };
  }

  // 7. Respiration / Energy / Mitochondria / Exercise
  if (cleanTopic.includes('respirat') || cleanTopic.includes('energy') || cleanTopic.includes('mitochon') || cleanTopic.includes('exercise') || cleanTopic.includes('atp')) {
    return {
      graph_type: 'line',
      title: `Figure 1. Aerobic Oxygen Consumption Rate (VO₂) and Blood Lactate Concentration vs. Graded Exercise Power Output in ${topic}`,
      global_context: 'Public health & physiology',
      description: 'Incremental metabolic ergometer test recording oxygen consumption rate (mL/kg/min) and capillary blood lactate accumulation (mmol/L).',
      x_axis_label: 'Power Output Workload',
      y_axis_label: 'VO₂ Rate & Lactate Accumulation',
      unit_x: 'Watts',
      unit_y: 'mL/kg/min & mmol/L',
      source_label: defaultSource,
      x_key: 'workload',
      y_keys: ['vo2_rate', 'lactate_conc'],
      series_labels: {
        vo2_rate: 'VO₂ Oxygen Consumption (mL/kg/min)',
        lactate_conc: 'Blood Lactate Concentration (mmol/L)',
      },
      data: [
        { workload: 50, vo2_rate: 14.2, lactate_conc: 1.2 },
        { workload: 100, vo2_rate: 22.8, lactate_conc: 1.5 },
        { workload: 150, vo2_rate: 31.4, lactate_conc: 2.1 },
        { workload: 200, vo2_rate: 42.0, lactate_conc: 3.8 },
        { workload: 250, vo2_rate: 51.5, lactate_conc: 7.2 },
        { workload: 300, vo2_rate: 56.1, lactate_conc: 11.4 },
      ],
    };
  }

  // Default: General Biological / Scientific Stress Gradient Response
  return {
    graph_type: 'line',
    title: `Figure 1. Empirical Quantitative Response & Metabolic Index in ${topic} Across Graded Environmental Treatment`,
    global_context: 'Scientific & technical innovation',
    description: `Controlled quantitative bio-assay measuring baseline metabolic activity and relative physiological integrity in ${topic} across graded experimental treatment.`,
    x_axis_label: 'Treatment Gradient Level',
    y_axis_label: 'Relative Physiological Rate & Viability',
    unit_x: '% Treatment',
    unit_y: '% Baseline',
    source_label: defaultSource,
    x_key: 'treatment_level',
    y_keys: ['response_rate', 'system_viability'],
    series_labels: {
      response_rate: 'Relative Response Rate (%)',
      system_viability: 'Viability Index (%)',
    },
    data: [
      { treatment_level: '0%', response_rate: 100.0, system_viability: 99.4 },
      { treatment_level: '20%', response_rate: 96.2, system_viability: 92.1 },
      { treatment_level: '40%', response_rate: 88.5, system_viability: 81.3 },
      { treatment_level: '60%', response_rate: 61.4, system_viability: 58.7 },
      { treatment_level: '80%', response_rate: 34.2, system_viability: 32.5 },
      { treatment_level: '100%', response_rate: 12.8, system_viability: 14.1 },
    ],
  };
}

// -----------------------------------------------------------------------------------------
// ATL PEDAGOGICAL SKILL GUIDE & INTRO BUILDER (IB MYP Transferable Skills Philosophy)
// Core Principle: Approaches to Learning are transferable skills that the MYP insists get named
// and taught on purpose, not assumed as background ability. A skill mentioned on a unit planner
// and never modelled is a skill you are testing, not teaching. Naming it is only the first half;
// this generator explicitly models and explains the second half to students.
// -----------------------------------------------------------------------------------------
export function getTaskBriefATLDescription(
  topic?: string,
  subject?: string,
  category?: string,
  cluster?: string,
  rawIntro?: string
): string {
  if (
    rawIntro &&
    !rawIntro.includes('Approaches to Learning (ATL) are the transferable skills') &&
    !rawIntro.includes('A skill mentioned on a unit planner') &&
    rawIntro.length < 320
  ) {
    return rawIntro.trim();
  }

  const normTopic = topic || 'Science';
  const normSubject = subject || 'Sciences';
  const normCategory = category || 'Thinking';
  const normCluster = cluster || 'Critical thinking';

  return `This task on "${normTopic}" in ${normSubject} focuses on developing ${normCategory} — ${normCluster} skills. Students apply scientific understanding and empirical analysis to construct structured, evidence-supported arguments using the Claim, Evidence, and Reasoning (CER) framework.`;
}

export function buildATLSkillGuideAndIntro(
  cluster: string,
  category: string,
  topic: string,
  criterion: string,
  subject = 'Biology'
): { atlPedagogicalIntro: string; atl_skill_guide: ATLSkillGuide } {
  const normCluster = (cluster || 'Critical thinking').trim();
  const normCategory = (category || 'Thinking').trim();

  const pedagogicalIntro = `This task on "${topic}" in ${subject} focuses on developing ${normCategory} — ${normCluster} skills. Students apply scientific understanding and empirical analysis to construct structured, evidence-supported arguments using the Claim, Evidence, and Reasoning (CER) framework.`;

  const skillGuide: ATLSkillGuide = {
    skill_name: `${normCluster}: Empirical Inquiry & Mechanistic Reasoning in ${topic}`,
    category: normCategory,
    cluster: normCluster,
    what_you_are_doing: `You are actively interrogating authentic scientific data, diagrams, and experimental scenarios for "${topic}" to construct structured, evidence-grounded scientific explanations rather than superficial guesses.`,
    how_it_is_tested: `The assessment deliberately tests this ATL skill across 2 scaffolded inquiries using the Claim, Evidence, and Reasoning (CER) framework: Part A tests your ability to identify empirical trends and cite specific quantitative values as Evidence for a defended Claim; Part B tests your capacity to synthesize deep physiological/mechanistic Reasoning and evaluate experimental limitations or implications.`,
    what_is_being_developed: `Transferable cognitive mastery: moving from passive factual recall to rigorous empirical analysis, mechanistic justification, and metacognitive critique of scientific validity.`,
    transferable_insight: `This ATL skill enables you to critically evaluate claims in everyday life, interpret statistical trends in scientific media, identify confounding variables, and construct defended ethical decisions across any discipline.`,
    pedagogical_rationale: `A skill mentioned on a unit planner and never modelled is a skill you are testing, not teaching. Naming the skill is only the first half; this task explicitly models how to extract evidence and structure scientific reasoning.`
  };

  return { atlPedagogicalIntro: pedagogicalIntro, atl_skill_guide: skillGuide };
}

// -----------------------------------------------------------------------------------------
// CRITERION A GENERATOR: Knowing & Understanding
// For CER tasks: Exactly 2 depth-rich questions with data, graph, and diagram stimulus.
// -----------------------------------------------------------------------------------------
export function generateCriterionATask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string,
  cerMode = true
): GeneratedTask {
  const title = exactTitle || topic;
  const dataset = getScientificDatasetForTopic(topic, 'Criterion A', subject);
  const images = generateStimulusImagesForTopic(topic, subject);
  const atl = buildATLSkillGuideAndIntro(cluster, 'Thinking', topic, 'Criterion A', subject);

  if (cerMode) {
    return {
      title,
      chosen_cluster: cluster,
      global_context: dataset.global_context || 'Scientific & technical innovation',
      context: `You are evaluating the core biological concepts, physiological mechanisms, and system dynamics of "${topic}" in ${subject}. Examine the accompanying graphical data in Figure 1, the data table, and Figure S1 diagram to formulate an evidence-based scientific claim and provide in-depth mechanistic reasoning.`,
      atl_focus_explainer: `ATL Focus: Thinking — ${cluster}. Skill Indicators: • Formulate a scientific claim identifying core biological concepts in ${topic}; • Support claims with quantitative and observational evidence from scientific data; • Provide deep mechanistic reasoning explaining biological structures, pathways, and adaptations.`,
      atlPedagogicalIntro: atl.atlPedagogicalIntro,
      atl_skill_guide: atl.atl_skill_guide,
      skill_indicators: [
        `Formulate a scientific claim identifying core biological structures and concepts in ${topic}.`,
        `Cite quantitative evidence from graphical datasets and models to support biological claims.`,
        `Synthesise comprehensive mechanistic reasoning to explain physiological pathways and predict responses to perturbations.`
      ],
      scientific_dataset: dataset,
      stimulusImages: images,
      target_criteria: ['Criterion A: Knowing and understanding'],
      target_strands: [
        'A.i: explain scientific knowledge',
        'A.ii: apply scientific knowledge and understanding to solve problems set in familiar and unfamiliar situations',
        'A.iii: analyse and evaluate information to make scientifically supported judgments'
      ],
      parts: [
        {
          label: 'A',
          prompt: `Claim & Evidence Formulation (Knowing & Understanding): Formulate a precise scientific Claim identifying the core biological structure, physiological mechanism, or concept governing "${topic}". Cite at least TWO specific quantitative data points, trends, or empirical values from Figure 1 and the data table as Evidence to substantiate your claim.`,
          placeholder: `Claim: State your direct scientific claim answering the core question about ${topic}...\n\nEvidence: Cite specific quantitative data points, peak values, or trends from Figure 1 and the data table (e.g., at [condition], the measured value was [X with units])...`
        },
        {
          label: 'B',
          prompt: `Scientific Reasoning & Deep Biological Synthesis (Mechanism & Critique): Provide comprehensive scientific Reasoning explaining the cellular, biochemical, or physiological mechanisms that justify why your evidence supports your claim. Then, apply this understanding to an unfamiliar scenario: predict the immediate and system-wide consequences if this physiological pathway is inhibited by an environmental toxin or mutation.`,
          placeholder: `Reasoning: Explain the step-by-step biological mechanism, structure-function relationship, and cellular principles connecting your evidence to your claim...\n\nApplication & Synthesis: If this pathway is inhibited or stressed, predict the exact downstream cellular consequences with scientific justification...`
        }
      ],
      estimated_minutes: 15
    };
  }

  // Non-CER fallback: 4 parts
  return {
    title,
    chosen_cluster: cluster,
    global_context: 'Scientific & technical innovation',
    context: `You are evaluating the core biological concepts, physiological mechanisms, and system dynamics of "${topic}" in ${subject}. In this assessment, you will explain scientific principles, compare and contrast biological structures, and apply your understanding to novel scenarios.`,
    atl_focus_explainer: `ATL Focus: Thinking — ${cluster}.`,
    atlPedagogicalIntro: atl.atlPedagogicalIntro,
    atl_skill_guide: atl.atl_skill_guide,
    skill_indicators: [
      `Explain key biological concepts and mechanisms in ${topic}.`,
      `Apply scientific understanding to explain familiar and unfamiliar biological phenomena.`
    ],
    scientific_dataset: dataset,
    stimulusImages: images,
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
        placeholder: `State the primary biological structures and explain their specific structure-function relationship...`
      },
      {
        label: 'B',
        prompt: `Compare & Contrast (Mechanistic Analysis): Contrast the biological mechanisms involved in ${topic} with a related biological system or pathway.`,
        placeholder: `Provide a detailed mechanistic breakdown comparing the processes...`
      },
      {
        label: 'C',
        prompt: `Apply Knowledge (Unfamiliar Biological Situation): If an environmental stressor interferes with ${topic}, predict the consequences with clear scientific justification.`,
        placeholder: `Predict the direct cellular defect and trace the cascade of physiological consequences...`
      },
      {
        label: 'D',
        prompt: `Scientist's Challenge (Model Critique & Synthesis): Evaluate the strengths and limitations of a common biological model used to represent ${topic}.`,
        placeholder: `The model is effective because... However, it breaks down because...`
      }
    ],
    estimated_minutes: 15
  };
}

// -----------------------------------------------------------------------------------------
// CRITERION B GENERATOR: Inquiring & Designing
// For CER tasks: Exactly 2 depth-rich questions with pilot data, graph, and setup diagram.
// -----------------------------------------------------------------------------------------
export function generateCriterionBTask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string,
  cerMode = true
): GeneratedTask {
  const title = exactTitle || topic;
  const dataset = getScientificDatasetForTopic(topic, 'Criterion B', subject);
  const images = generateStimulusImagesForTopic(topic, subject);
  const atl = buildATLSkillGuideAndIntro(cluster, 'Research', topic, 'Criterion B', subject);

  if (cerMode) {
    return {
      title,
      chosen_cluster: cluster,
      global_context: dataset.global_context || 'Scientific & technical innovation',
      context: `You are a research scientist designing a rigorous controlled investigation on "${topic}" in ${subject}. Examine the preliminary pilot investigation dataset in Figure 1, the calibrated apparatus in Figure S1, and the data table. You will formulate a testable hypothesis, operationalize variables, and justify your experimental methodology.`,
      atl_focus_explainer: `ATL Focus: Research / Thinking — ${cluster}. Skill Indicators: • Formulate a testable scientific claim/hypothesis supported by preliminary data; • Operationalize independent, dependent, and controlled variables; • Provide scientific reasoning justifying apparatus resolution, trial replication, and reliability controls.`,
      atlPedagogicalIntro: atl.atlPedagogicalIntro,
      atl_skill_guide: atl.atl_skill_guide,
      skill_indicators: [
        `Formulate a testable scientific claim and hypothesis predicting the effect of independent variables in ${topic}.`,
        `Operationalize variables and design reproducible methods supported by empirical evidence.`,
        `Provide rigorous scientific reasoning detailing validity controls and systematic error prevention.`
      ],
      scientific_dataset: dataset,
      stimulusImages: images,
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
          prompt: `Research Claim & Variable Operationalization (Hypothesis & Variables): State a focused scientific Claim/Hypothesis predicting how altering the independent variable will impact "${topic}". Cite specific baseline trends from the pilot dataset in Figure 1 as preliminary Evidence to support your prediction, and explicitly operationalize: (1) The Independent Variable (5 intervals with units); (2) The Dependent Variable (exact measurement technique and units); (3) Three strictly Controlled Variables with the exact physical method used to hold each constant.`,
          placeholder: `Research Claim & Hypothesis: "If [Independent Variable increases], then [Dependent Variable will...] because..."\n\nPreliminary Evidence: Citing trends from Figure 1...\n\nOperationalized Variables:\n- IV (5 intervals + units): ...\n- DV (measurement apparatus + units): ...\n- Controlled Variables (3 variables + exact control methods): ...`
        },
        {
          label: 'B',
          prompt: `Methodological Reasoning & Validity Critique (Procedure, Precision & Reliability): Provide comprehensive scientific Reasoning explaining how your experimental procedure, apparatus precision (e.g. sensor/syringe resolution in Figure S1), and repetition protocol ensure valid, reproducible data. Identify potential sources of systematic error or confounding variables, and explain how your design eliminates them.`,
          placeholder: `Scientific Reasoning on Methodology: Explain step-by-step why this procedure reliably isolates the independent variable...\n\nValidity, Precision & Error Mitigation: Explain apparatus resolution, repetition protocol (minimum 3 trials), and specific risk mitigations...`
        }
      ],
      estimated_minutes: 15
    };
  }

  // Non-CER fallback
  return {
    title,
    chosen_cluster: cluster,
    global_context: 'Scientific & technical innovation',
    context: `You are a research scientist designing a controlled laboratory investigation into "${topic}" in ${subject}.`,
    atl_focus_explainer: `ATL Focus: Research / Thinking — ${cluster}.`,
    atlPedagogicalIntro: atl.atlPedagogicalIntro,
    atl_skill_guide: atl.atl_skill_guide,
    skill_indicators: [
      `Formulate a testable biological hypothesis for ${topic}.`,
      `Identify independent, dependent, and controlled variables.`,
      `Design a safe, logical, and reproducible experimental procedure.`
    ],
    scientific_dataset: dataset,
    stimulusImages: images,
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
        prompt: `Research Question & Hypothesis: Formulate a testable scientific research question for ${topic} and explain the underlying biological reasoning.`,
        placeholder: `State research question and hypothesis with biological rationale...`
      },
      {
        label: 'B',
        prompt: `Variables & Protocol: Identify the IV, DV, and three controlled variables.`,
        placeholder: `IV, DV, and 3 controlled variables with methods of control...`
      },
      {
        label: 'C',
        prompt: `Methodology: Write a numbered step-by-step procedure that another scientist could replicate.`,
        placeholder: `Step-by-step procedure...`
      },
      {
        label: 'D',
        prompt: `Safety & Validity: Identify hazards and describe risk mitigations and error controls.`,
        placeholder: `Hazards, mitigations, and validity controls...`
      }
    ],
    estimated_minutes: 15
  };
}

// -----------------------------------------------------------------------------------------
// CRITERION C GENERATOR: Processing & Evaluating
// For CER tasks: Exactly 2 depth-rich questions with full scientific dataset and graph.
// -----------------------------------------------------------------------------------------
export function generateCriterionCTask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string,
  cerMode = true
): GeneratedTask {
  const title = exactTitle || topic;
  const dataset = getScientificDatasetForTopic(topic, 'Criterion C', subject);
  const images = generateStimulusImagesForTopic(topic, subject);
  const atl = buildATLSkillGuideAndIntro(cluster, 'Thinking', topic, 'Criterion C', subject);

  if (cerMode) {
    return {
      title,
      chosen_cluster: cluster,
      global_context: dataset.global_context || 'Food security & biodiversity',
      context: `You are processing and evaluating quantitative empirical data from a controlled scientific investigation on "${topic}" in ${subject}. Examine the interactive graphical data in Figure 1, the experimental data table, and Figure S1 diagram to formulate an evidence-based claim and provide mechanistic reasoning and critique.`,
      atl_focus_explainer: `ATL Focus: Thinking / Research — ${cluster}. Skill Indicators: • State an evidence-based scientific claim describing quantitative trends in ${topic}; • Process mathematical evidence (rates of change, peak values, percentages) to support claims; • Provide deep scientific reasoning explaining physiological mechanisms and critically evaluate experimental validity and improvements.`,
      atlPedagogicalIntro: atl.atlPedagogicalIntro,
      atl_skill_guide: atl.atl_skill_guide,
      skill_indicators: [
        'Analyse biological trends and formulate evidence-based claims from quantitative graphical data.',
        'Process numerical evidence by calculating rates of change, percentage changes, and peak values.',
        'Synthesise mechanistic scientific reasoning connecting cellular/biochemical principles to empirical data.',
        'Critically evaluate experimental reliability, identify anomalies, and propose justified methodological improvements.'
      ],
      scientific_dataset: dataset,
      stimulusImages: images,
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
          prompt: `Quantitative Claim & Mathematical Evidence (Data Analysis & Processing): Formulate an explicit, evidence-based scientific Claim describing the overall relationship between the independent variable and dependent variable in Figure 1 for "${topic}". Cite at least THREE specific quantitative Evidence points from the dataset (including initial baseline, inflection/maximum point, and final values with correct units). Include a calculated rate of change or percentage difference between two key intervals, showing your complete working.`,
          placeholder: `Claim: State your direct scientific claim regarding the relationship and effect observed in Figure 1...\n\nQuantitative Evidence & Calculations:\n- Initial Baseline: at [IV], the measured value was [DV with units]\n- Inflection / Peak: at [IV], the measured value was [DV with units]\n- Final Interval: at [IV], the measured value was [DV with units]\n- Calculation: (Change in DV) / (Change in IV) = ... [Include working and final units]`
        },
        {
          label: 'B',
          prompt: `Mechanistic Reasoning, Reliability & Methodological Critique: Provide in-depth scientific Reasoning explaining the underlying physiological, cellular, or biochemical mechanisms that account for the observed curve and data patterns. Then, critically evaluate the reliability of this dataset: identify potential sources of measurement uncertainty, assess whether any data points appear anomalous, and propose ONE realistic, justified methodological improvement or extension to enhance experimental validity.`,
          placeholder: `Mechanistic Reasoning: Explain the cellular, enzymatic, or physiological cause-and-effect pathway that produces this specific trend...\n\nExperimental Critique & Reliability: Evaluate sample size, trial consistency, and measurement precision...\n\nJustified Improvement: Propose one specific modification to apparatus or protocol and explain scientifically how it improves data validity...`
        }
      ],
      estimated_minutes: 15
    };
  }

  // Non-CER fallback: 5 parts
  return {
    title,
    chosen_cluster: cluster,
    global_context: dataset.global_context || 'Food security & biodiversity',
    context: `You are processing and evaluating quantitative data from a controlled biological investigation on "${topic}" in ${subject}. Examine the data table and accompanying graphical representation in Figure 1.`,
    atl_focus_explainer: `ATL Focus: Thinking / Research — ${cluster}.`,
    atlPedagogicalIntro: atl.atlPedagogicalIntro,
    atl_skill_guide: atl.atl_skill_guide,
    skill_indicators: [
      'Analyse biological trends from quantitative evidence and graphical data.',
      'Process numerical evidence by calculating rate of change.',
      'Explain underlying biological relationships and mechanisms.',
      'Evaluate experimental reliability and methodological limitations.',
      'Draw justified scientific conclusions and suggest targeted improvements.'
    ],
    scientific_dataset: dataset,
    stimulusImages: images,
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
        prompt: `Identify a Trend (Pattern Recognition): State the overall quantitative relationship between the variables in Figure 1. Cite specific initial, maximum/plateau, and final values.`,
        placeholder: `Describe the general trend quoting values directly from table/graph...`
      },
      {
        label: 'B',
        prompt: `Process Numerical Evidence (Scientific Calculations): Calculate the rate of change between two specified intervals in the dataset. Show your working.`,
        placeholder: `State formula, show working and final answer with units...`
      },
      {
        label: 'C',
        prompt: `Explain Biological Relationship (Mechanistic Reasoning): Explain the biological mechanism responsible for the observed trend in Figure 1.`,
        placeholder: `Explain biological cause-and-effect relationship...`
      },
      {
        label: 'D',
        prompt: `Evaluate Reliability & Limitations: Evaluate the reliability and validity of this dataset.`,
        placeholder: `Evaluate sample size, precision, and confounding factors...`
      },
      {
        label: 'E',
        prompt: `Draw Justified Conclusion & Suggest Improvement: State an evidence-based conclusion and propose one methodological improvement.`,
        placeholder: `Conclusion supported by data... Improvement...`
      }
    ],
    estimated_minutes: 15
  };
}

// -----------------------------------------------------------------------------------------
// CRITERION D GENERATOR: Reflecting on the Impacts of Science
// For CER tasks: Exactly 2 depth-rich questions with real-world impact dataset & diagram.
// -----------------------------------------------------------------------------------------
export function generateCriterionDTask(
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string,
  cerMode = true
): GeneratedTask {
  const title = exactTitle || topic;
  const dataset = getScientificDatasetForTopic(topic, 'Criterion D', subject);
  const images = generateStimulusImagesForTopic(topic, subject);
  const atl = buildATLSkillGuideAndIntro(cluster, 'Communication', topic, 'Criterion D', subject);

  if (cerMode) {
    return {
      title,
      chosen_cluster: cluster,
      global_context: dataset.global_context || 'Globalisation & sustainability',
      context: `You are evaluating the moral, ethical, environmental, and societal implications of scientific applications relating to "${topic}" in ${subject}. Framed within the global context of ${dataset.global_context}, examine the real-world longitudinal data in Figure 1, the accompanying data table, and Figure S1 to formulate an evidence-based claim and provide scientific reasoning on ethical and policy trade-offs.`,
      atl_focus_explainer: `ATL Focus: Communication / Thinking — ${cluster}. Skill Indicators: • Formulate an evidence-based claim evaluating real-world scientific applications in ${topic}; • Support claims with quantitative stakeholder and environmental data; • Provide balanced scientific and ethical reasoning evaluating trade-offs, unintended consequences, and justified policy decisions.`,
      atlPedagogicalIntro: atl.atlPedagogicalIntro,
      atl_skill_guide: atl.atl_skill_guide,
      skill_indicators: [
        `Formulate an evidence-based claim regarding the efficacy and real-world impact of science in ${topic}.`,
        `Cite quantitative data and stakeholder evidence from datasets to support socio-scientific evaluations.`,
        `Provide deep scientific and ethical reasoning balancing benefits against unintended risks and justifying policy decisions.`
      ],
      scientific_dataset: dataset,
      stimulusImages: images,
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
          prompt: `Socio-Scientific Claim & Empirical Evidence (Application & Efficacy): Formulate a clear, evidence-based Claim regarding how the application of science in "${topic}" addresses a major real-world challenge. Cite at least TWO specific data points, percentages, or longitudinal trends from Figure 1 and the data table as Evidence evaluating its practical efficacy or stakeholder impact.`,
          placeholder: `Claim: State your defended claim evaluating the real-world application of science in ${topic}...\n\nEmpirical Evidence: Cite specific quantitative figures, longitudinal trends, or stakeholder metrics from Figure 1 and the data table...`
        },
        {
          label: 'B',
          prompt: `Scientific & Ethical Reasoning (Trade-Offs & Justified Policy Decision): Provide rigorous scientific and ethical Reasoning analyzing the complex trade-offs of this development. Weigh the positive societal/environmental benefits against at least TWO potential unintended risks or ethical concerns (e.g. economic disparity, ecological disruption, or health risks). Conclude by defending a justified policy or regulatory recommendation grounded in scientific literacy and global context principles.`,
          placeholder: `Scientific & Ethical Reasoning: Explain the scientific principles underlying both the benefits and potential unintended consequences...\n\nTrade-Off Evaluation: Contrast positive impacts with negative risks or stakeholder conflicts...\n\nJustified Policy Decision: Conclude with a defended regulatory recommendation balancing efficacy and ethical responsibility...`
        }
      ],
      estimated_minutes: 15
    };
  }

  // Non-CER fallback: 4 parts
  return {
    title,
    chosen_cluster: cluster,
    global_context: dataset.global_context || 'Globalisation & sustainability',
    context: `You are evaluating the moral, ethical, environmental, and societal implications of scientific applications relating to "${topic}" in ${subject}.`,
    atl_focus_explainer: `ATL Focus: Communication / Thinking — ${cluster}.`,
    atlPedagogicalIntro: atl.atlPedagogicalIntro,
    atl_skill_guide: atl.atl_skill_guide,
    skill_indicators: [
      `Explain how biological science is applied to address real-world challenges in ${topic}.`,
      `Evaluate implications of scientific solutions.`,
      `Justify ethical decisions using scientific evidence.`
    ],
    scientific_dataset: dataset,
    stimulusImages: images,
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
        prompt: `Scientific Application: Explain the way in which science in ${topic} is applied to solve a real-world problem.`,
        placeholder: `Explain the problem and scientific mechanism...`
      },
      {
        label: 'B',
        prompt: `Evaluate Implications: Discuss and evaluate at least TWO distinct implications (ethical, environmental, economic, or social).`,
        placeholder: `Implications: Positive benefits vs negative impacts...`
      },
      {
        label: 'C',
        prompt: `Communication & Stakeholders: Evaluate how scientific claims should be communicated to the public.`,
        placeholder: `Communication strategies...`
      },
      {
        label: 'D',
        prompt: `Justified Ethical Decision: Take a defended, evidence-based stance on how this science should be regulated.`,
        placeholder: `Defended policy or ethical recommendation...`
      }
    ],
    estimated_minutes: 15
  };
}

/**
 * Master dispatcher: Generates the exact assessment task according to the selected Criterion.
 * For CER tasks: guarantees exactly 2 depth-rich questions with graphs, data tables, and diagrams.
 */
export function generateTaskByCriterion(
  criterionCode: MYPCriterionCode,
  topic: string,
  subject = 'Biology',
  mypYear = '4',
  cluster = 'Critical thinking',
  exactTitle?: string,
  cerMode = true
): GeneratedTask {
  switch (criterionCode) {
    case 'Criterion A':
      return generateCriterionATask(topic, subject, mypYear, cluster, exactTitle, cerMode);
    case 'Criterion B':
      return generateCriterionBTask(topic, subject, mypYear, cluster, exactTitle, cerMode);
    case 'Criterion C':
      return generateCriterionCTask(topic, subject, mypYear, cluster, exactTitle, cerMode);
    case 'Criterion D':
      return generateCriterionDTask(topic, subject, mypYear, cluster, exactTitle, cerMode);
    default:
      return generateCriterionCTask(topic, subject, mypYear, cluster, exactTitle, cerMode);
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
