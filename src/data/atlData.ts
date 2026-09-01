import { ATLCategoryKey, ATLCategoryData, ATLTaskLog, AssignedTask } from '../types';

export const ATL_DATA: Record<ATLCategoryKey, ATLCategoryData> = {
  Communication: {
    color: '#4f46e5',
    bgSoft: '#eef2ff',
    borderColor: '#c7d2fe',
    textColor: '#312e81',
    clusters: {
      'Communication': {
        description: 'Exchanging thoughts, messages and information effectively through oral presentations, terminology, and discussions.',
        indicators: [
          'Present experimental results orally.',
          'Explain biological processes using correct terminology.',
          'Participate in scientific discussions and debates.'
        ]
      },
      'Collaboration': {
        description: 'Working effectively in teams during investigations, sharing roles fairly, and exchanging constructive peer feedback.',
        indicators: [
          'Conduct laboratory investigations in teams.',
          'Divide roles fairly during practical work.',
          'Give and receive constructive peer feedback.'
        ]
      },
      'Literacy': {
        description: 'Writing scientific explanations and lab reports, interpreting graphs and data tables, and using subject-specific vocabulary.',
        indicators: [
          'Write lab reports and scientific explanations.',
          'Interpret graphs, data tables, and diagrams.',
          'Cite scientific sources appropriately and use subject-specific vocabulary.'
        ]
      }
    }
  },
  Social: {
    color: '#0d9488',
    bgSoft: '#f0fdf4',
    borderColor: '#a7f3d0',
    textColor: '#064e3b',
    clusters: {
      'Collaboration': {
        description: 'Working effectively with others: shared responsibility, give-and-take, and resolving disagreement constructively.',
        indicators: [
          'Practise empathy',
          'Delegate and share responsibility for decision-making',
          'Help others to succeed',
          'Take responsibility for one’s own actions and contributions',
          'Manage and resolve conflict, and work collaboratively in teams',
          'Build consensus among differing viewpoints',
          'Make fair and equitable decisions',
          'Listen actively to other perspectives and ideas',
          'Negotiate effectively and encourage others to contribute'
        ]
      }
    }
  },
  'Self-management': {
    color: '#d97706',
    bgSoft: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#78350f',
    clusters: {
      'Organization': {
        description: 'Managing time and tasks effectively — planning, prioritising, and meeting deadlines.',
        indicators: [
          'Plan short- and long-term assignments; meet deadlines',
          'Create plans to prepare for summative assessments',
          'Keep and use a weekly planner or schedule for tasks',
          'Set goals that are challenging and realistic',
          'Bring necessary equipment and materials to class',
          'Keep an organised, logical system of notes and files',
          'Select and use appropriate strategies for a given task'
        ]
      },
      'Affective': {
        description: 'Managing one’s own state of mind — focus, resilience, perseverance and managing emotion.',
        indicators: [
          'Practise focus and concentration',
          'Practise strategies to overcome distraction',
          'Demonstrate persistence and perseverance',
          'Practise delaying gratification',
          'Practise resilience in the face of setbacks',
          'Manage anxiety, frustration or discouragement constructively',
          'Practise positive, solution-focused thinking under pressure'
        ]
      },
      'Reflection': {
        description: '(Re)considering the process of learning — choosing, using and evaluating one’s own strategies.',
        indicators: [
          'Identify strengths and weaknesses of one’s own learning strategies',
          'Demonstrate flexibility in selecting and adjusting strategies',
          'Reflect on content: what was learned and how it connects',
          'Reflect on ATL skills: what helped or hindered progress',
          'Reflect on personal learning strategies: what would improve next time',
          'Keep a record (journal/log) of reflections over time'
        ]
      }
    }
  },
  Research: {
    color: '#7c3aed',
    bgSoft: '#f5f3ff',
    borderColor: '#ddd6fe',
    textColor: '#4c1d95',
    clusters: {
      'Information literacy': {
        description: 'Finding, interpreting, judging and creating information responsibly across sources.',
        indicators: [
          'Collect, record and verify data accurately',
          'Access information from a range of sources to inform an argument',
          'Make connections between different sources of information',
          'Evaluate and select credible information sources and tools',
          'Process data and report results clearly',
          'Present information in a variety of formats',
          'Understand and respect intellectual property rights',
          'Reference and cite sources appropriately'
        ]
      },
      'Media literacy': {
        description: 'Interacting critically with media to locate, evaluate and ethically use information.',
        indicators: [
          'Locate, organise, analyse and evaluate information from varied media',
          'Recognise how media shapes interpretation of events and ideas',
          'Communicate information effectively using appropriate media formats',
          'Compare, contrast and draw connections across multiple media sources',
          'Identify bias, purpose and reliability in a media source'
        ]
      }
    }
  },
  Thinking: {
    color: '#0284c7',
    bgSoft: '#f0f9ff',
    borderColor: '#bae6fd',
    textColor: '#0c4a6e',
    clusters: {
      'Critical thinking': {
        description: 'Analysing and evaluating issues, ideas and evidence to form sound, well-reasoned judgements.',
        indicators: [
          'Observe carefully in order to recognise problems',
          'Gather and organise relevant information to formulate an argument',
          'Recognise unstated assumptions and bias in a source or argument',
          'Interpret data and evaluate evidence',
          'Draw reasonable, well-supported conclusions',
          'Test conclusions against new information or counter-evidence',
          'Formulate factual, conceptual and debatable questions',
          'Consider an issue from multiple perspectives'
        ]
      },
      'Creative thinking': {
        description: 'Generating novel ideas and considering new or unconventional perspectives.',
        indicators: [
          'Use brainstorming to generate new ideas and inquiries',
          'Consider multiple alternatives, including unlikely ones',
          'Create novel solutions to authentic problems',
          'Make unexpected connections between ideas or objects',
          'Ask "what if" questions and generate testable hypotheses',
          'Apply existing knowledge to generate new products or processes',
          'Practise flexible thinking by developing opposing or complementary arguments',
          'Use metaphor or analogy to explain an idea'
        ]
      },
      'Transfer': {
        description: 'Using skills and knowledge flexibly, across multiple contexts and subjects.',
        indicators: [
          'Use skills and knowledge in more than one context',
          'Combine knowledge, understanding and skills to create a product or solution',
          'Apply current knowledge to new or unfamiliar situations',
          'Change the context of an inquiry to gain a different perspective',
          'Make explicit connections between subjects or disciplines'
        ]
      }
    }
  }
};

export const ALL_CLUSTERS = [
  { name: 'Communication', category: 'Communication' },
  { name: 'Collaboration', category: 'Social' },
  { name: 'Literacy', category: 'Communication' },
  { name: 'Organization', category: 'Self-management' },
  { name: 'Affective', category: 'Self-management' },
  { name: 'Reflection', category: 'Self-management' },
  { name: 'Information literacy', category: 'Research' },
  { name: 'Media literacy', category: 'Research' },
  { name: 'Critical thinking', category: 'Thinking' },
  { name: 'Creative thinking', category: 'Thinking' },
  { name: 'Transfer', category: 'Thinking' }
];

export const SAMPLE_STUDENTS: string[] = [
  'Maya Lin (MYP 1)',
  'David Kim (MYP 2)',
  'Alex Rivera (MYP 3)',
  'Sophia Chen (MYP 4)',
  'Marcus Vance (MYP 5)',
];

export const SAMPLE_LOGS: ATLTaskLog[] = [
  {
    id: 'sample-log-1',
    date: '2025-09-12',
    academicYear: '2025-2026',
    term: 'Term 1',
    studentName: 'Maya Lin',
    subject: 'Sciences',
    topic: 'Cell Structure and Function',
    mypYear: '1',
    category: 'Thinking',
    cluster: 'Critical thinking',
    level: 'Applying',
    formativeScore: 6,
    taskTitle: 'Critical thinking Activity: Cell Structure and Function',
    responses: [
      { label: 'A', prompt: 'What are 2 simple things you know about cells?', response: 'Cells have a nucleus that controls activities and a cell membrane.' },
      { label: 'B', prompt: 'How does plant cell structure differ from animal cell structure?', response: 'Plant cells have rigid cell walls and chloroplasts for photosynthesis.' },
    ],
    feedback: {
      level: 'Applying',
      formativeScore: 6,
      summary: 'Maya clearly identified key cell organelles and explained differences accurately.',
      strengths: ['Accurate recall of cell components', 'Clear comparison between plant and animal cells'],
      next_steps: ['Connect organelle functions to real-life biological processes'],
    },
  },
  {
    id: 'sample-log-2',
    date: '2025-10-05',
    academicYear: '2025-2026',
    term: 'Term 1',
    studentName: 'David Kim',
    subject: 'Mathematics',
    topic: 'Linear Equations and Graphing',
    mypYear: '2',
    category: 'Communication',
    cluster: 'Communication',
    level: 'Extending',
    formativeScore: 8,
    taskTitle: 'Communication Activity: Linear Equations',
    responses: [
      { label: 'A', prompt: 'Explain what slope represents on a line graph.', response: 'Slope is the rate of change or rise over run.' },
      { label: 'B', prompt: 'Show step by step how to solve y = 2x + 3 when x = 4.', response: 'Substitute x=4: y = 2(4) + 3 = 8 + 3 = 11.' },
    ],
    feedback: {
      level: 'Extending',
      formativeScore: 8,
      summary: 'David communicated mathematical steps with precision and clarity.',
      strengths: ['Structured mathematical communication', 'Correct calculation and graphical interpretation'],
      next_steps: ['Explore negative slopes in real-world contexts'],
    },
  },
  {
    id: 'sample-log-3',
    date: '2025-11-18',
    academicYear: '2025-2026',
    term: 'Term 1',
    studentName: 'Alex Rivera',
    subject: 'Language and Literature',
    topic: 'Theme and Character Development in Novels',
    mypYear: '3',
    category: 'Thinking',
    cluster: 'Creative thinking',
    level: 'Applying',
    formativeScore: 5,
    taskTitle: 'Creative thinking Activity: Character Analysis',
    responses: [
      { label: 'A', prompt: 'Describe the main character’s key conflict.', response: 'The protagonist struggles between individual desires and social expectations.' },
      { label: 'B', prompt: 'How would the story change from a secondary character’s perspective?', response: 'It would show the protagonist’s actions as unpredictable rather than heroic.' },
    ],
    feedback: {
      level: 'Applying',
      formativeScore: 5,
      summary: 'Alex demonstrated creative perspective-taking and literary insight.',
      strengths: ['Empathetic perspective shifting', 'Solid understanding of plot conflict'],
      next_steps: ['Incorporate direct textual quotes to support claims'],
    },
  },
  {
    id: 'sample-log-4',
    date: '2026-02-10',
    academicYear: '2025-2026',
    term: 'Term 2',
    studentName: 'Sophia Chen',
    subject: 'Individuals and Societies',
    topic: 'Industrial Revolution and Urbanization',
    mypYear: '4',
    category: 'Research',
    cluster: 'Information literacy',
    level: 'Extending',
    formativeScore: 8,
    taskTitle: 'Information literacy Activity: Industrial Era Sources',
    responses: [
      { label: 'A', prompt: 'Compare primary vs secondary source perspectives on factory conditions.', response: 'Primary worker letters highlight harsh daily struggles while factory owner reports focus on production output.' },
      { label: 'B', prompt: 'Evaluate reliability of 19th-century parliamentary reports.', response: 'They provide official records but may reflect upper-class political bias.' },
    ],
    feedback: {
      level: 'Extending',
      formativeScore: 8,
      summary: 'Sophia evaluated historical source bias with commendable critical judgment.',
      strengths: ['Sophisticated source evaluation', 'Nuanced recognition of historical perspective'],
      next_steps: ['Synthesize findings into an argumentative essay format'],
    },
  },
  {
    id: 'sample-log-5',
    date: '2026-03-22',
    academicYear: '2025-2026',
    term: 'Term 2',
    studentName: 'Marcus Vance',
    subject: 'Sciences',
    topic: 'Genetics and Sexual Reproduction in Plants',
    mypYear: '5',
    category: 'Self-management',
    cluster: 'Reflection',
    level: 'Applying',
    formativeScore: 6,
    taskTitle: 'Reflection Activity: Plant Genetics Inquiries',
    responses: [
      { label: 'A', prompt: 'Reflect on how cross-pollination ensures genetic diversity.', response: 'Combining genetic material from two plants creates variation in traits, helping adaptation.' },
      { label: 'B', prompt: 'What study strategy helped you master Punnett squares?', response: 'Drawing diagrams and checking probabilities with peer discussions.' },
    ],
    feedback: {
      level: 'Applying',
      formativeScore: 6,
      summary: 'Marcus reflected thoughtfully on biological concepts and effective study strategies.',
      strengths: ['Clear reflection on learning strategies', 'Accurate biological conceptualization'],
      next_steps: ['Apply genetic probability rules to pedigree charts'],
    },
  },
];

export const SAMPLE_ASSIGNED_TASKS: AssignedTask[] = [
  {
    id: 'sample-assigned-myp4-1',
    title: 'Cellular Respiration & Enzyme Kinetics Investigation',
    subject: 'Sciences',
    topic: 'Cellular Respiration, ATP Synthesis & Factors Affecting Catalase Activity',
    mypYear: '4',
    category: 'Thinking',
    cluster: 'Critical thinking',
    teacherName: 'Sciences Department',
    createdAt: new Date().toISOString(),
    academicYear: '2025-2026',
    term: 'Term 2',
    active: true,
    criteria: ['Criterion A: Knowing and understanding', 'Criterion C: Processing and evaluating'],
    dueDate: '2026-04-15',
    task: {
      title: 'Cellular Respiration & Enzyme Kinetics Investigation',
      chosen_cluster: 'Critical thinking',
      global_context: 'Scientific and technical innovation',
      context: 'In this formative ATL task, you will analyze enzyme-catalyzed biochemical reactions in cellular respiration and evaluate experimental data regarding enzyme denaturation under temperature stress.',
      atl_focus_explainer: 'Focus on drawing reasoned conclusions, evaluating scientific variables, and applying conceptual understanding of enzyme active sites.',
      estimated_minutes: 15,
      parts: [
        {
          label: 'A',
          prompt: 'Explain the role of ATP in cellular processes and how catalase breaks down harmful metabolic by-products (H2O2) in aerobic organisms.',
          placeholder: 'Discuss ATP phosphorylation and the enzyme-substrate catalytic mechanism...'
        },
        {
          label: 'B',
          prompt: 'Predict and justify what happens to enzyme reaction rate when temperature increases past the optimum point (55°C). Use the concept of protein tertiary structure and active site denaturation in your explanation.',
          placeholder: 'Explain thermal energy, hydrogen bonding disruption, conformational changes, and loss of enzyme-substrate specificity...'
        },
        {
          label: 'C',
          prompt: 'Suggest two controlled variables that an experimenter must hold constant when testing catalase reaction rates across different pH levels, and justify why each is critical.',
          placeholder: 'Identify specific controlled variables and explain how failing to control them would introduce confounding factors...'
        }
      ]
    }
  },
  {
    id: 'sample-assigned-myp4-2',
    title: 'Bioethics & Genetic Modification Case Study',
    subject: 'Sciences',
    topic: 'CRISPR-Cas9 Gene Editing, Agricultural Crop Resilience & Ecological Impact',
    mypYear: '4',
    category: 'Research',
    cluster: 'Information literacy',
    teacherName: 'Sciences Department',
    createdAt: new Date().toISOString(),
    academicYear: '2025-2026',
    term: 'Term 2',
    active: true,
    criteria: ['Criterion D: Reflecting on the impacts of science'],
    dueDate: '2026-04-20',
    task: {
      title: 'Bioethics & Genetic Modification Case Study',
      chosen_cluster: 'Information literacy',
      global_context: 'Globalisation and sustainability',
      context: 'Examine the ethical, environmental, and socio-economic implications of deploying CRISPR-edited drought-resistant staple crops in vulnerable agricultural zones.',
      atl_focus_explainer: 'Evaluate contrasting stakeholder perspectives, detect bias in scientific media reporting, and synthesize evidence-based ethical evaluations.',
      estimated_minutes: 15,
      parts: [
        {
          label: 'A',
          prompt: 'Identify one environmental benefit and one potential ecological risk associated with introducing genetically edited crops into open agricultural ecosystems.',
          placeholder: 'Consider biodiversity, non-target species, pesticide reduction, and horizontal gene transfer...'
        },
        {
          label: 'B',
          prompt: 'Evaluate how a smallholder farmer in an arid region and an international patent-holding biotechnology firm might have differing perspectives on genetic crop patents.',
          placeholder: 'Analyze economic equity, food sovereignty, seed licensing costs, and agricultural security...'
        }
      ]
    }
  },
  {
    id: 'sample-assigned-myp3-1',
    title: 'Cell Organelle Systems & Biological Analogies',
    subject: 'Sciences',
    topic: 'Cell Biology, Endomembrane System & Organelle Specialization',
    mypYear: '3',
    category: 'Communication',
    cluster: 'Communication',
    teacherName: 'Sciences Department',
    createdAt: new Date().toISOString(),
    academicYear: '2025-2026',
    term: 'Term 2',
    active: true,
    criteria: ['Criterion A: Knowing and understanding'],
    dueDate: '2026-04-12',
    task: {
      title: 'Cell Organelle Systems & Biological Analogies',
      chosen_cluster: 'Communication',
      context: 'Demonstrate your ability to communicate complex biological structures clearly using precise terminology and structured analogical reasoning.',
      atl_focus_explainer: 'Translate scientific functions into accessible analogies while maintaining scientific accuracy.',
      estimated_minutes: 15,
      parts: [
        {
          label: 'A',
          prompt: 'Compare the function of Mitochondria and Ribosomes within an animal cell to key departments in a modern city or factory.',
          placeholder: 'Detail energy generation vs protein manufacturing...'
        },
        {
          label: 'B',
          prompt: 'Explain why plant cells require both chloroplasts AND mitochondria to sustain life.',
          placeholder: 'Distinguish between glucose synthesis (photosynthesis) and ATP release (cellular respiration)...'
        }
      ]
    }
  },
  {
    id: 'sample-assigned-myp2-1',
    title: 'Photosynthesis Rate & Environmental Factors',
    subject: 'Sciences',
    topic: 'Plant Physiology, Chlorophyll Absorption & Light Intensity',
    mypYear: '2',
    category: 'Thinking',
    cluster: 'Critical thinking',
    teacherName: 'Sciences Department',
    createdAt: new Date().toISOString(),
    academicYear: '2025-2026',
    term: 'Term 2',
    active: true,
    criteria: ['Criterion C: Processing and evaluating'],
    dueDate: '2026-04-18',
    task: {
      title: 'Photosynthesis Rate & Environmental Factors',
      chosen_cluster: 'Critical thinking',
      context: 'Investigate how environmental variables (light intensity, CO2 concentration, and temperature) act as limiting factors in plant photosynthesis.',
      atl_focus_explainer: 'Analyze cause-and-effect relationships and interpret scientific limiting factor graphs.',
      estimated_minutes: 15,
      parts: [
        {
          label: 'A',
          prompt: 'State the word and chemical equation for photosynthesis and name the primary light-absorbing pigment in plant leaves.',
          placeholder: 'Write the balanced or word equation and identify chlorophyll...'
        },
        {
          label: 'B',
          prompt: 'Why does the rate of photosynthesis plateau (level off) even if light intensity continues to increase indefinitely?',
          placeholder: 'Explain the concept of limiting factors such as CO2 availability or enzyme saturation...'
        }
      ]
    }
  },
  {
    id: 'sample-assigned-myp1-1',
    title: 'Living vs Non-Living Organisms & Cell Theory',
    subject: 'Sciences',
    topic: 'Introduction to Biology, Microscope Techniques & Cell Theory',
    mypYear: '1',
    category: 'Communication',
    cluster: 'Literacy',
    teacherName: 'Sciences Department',
    createdAt: new Date().toISOString(),
    academicYear: '2025-2026',
    term: 'Term 2',
    active: true,
    criteria: ['Criterion A: Knowing and understanding'],
    dueDate: '2026-04-10',
    task: {
      title: 'Living vs Non-Living Organisms & Cell Theory',
      chosen_cluster: 'Literacy',
      context: 'Apply the three tenets of Cell Theory and use MRS GREN characteristics to evaluate biological specimens.',
      atl_focus_explainer: 'Use correct scientific vocabulary and structured explanations.',
      estimated_minutes: 10,
      parts: [
        {
          label: 'A',
          prompt: 'State the three core principles of Cell Theory.',
          placeholder: '1. All living organisms are composed of... 2. The cell is the basic unit... 3. All cells arise from...'
        },
        {
          label: 'B',
          prompt: 'Using two life processes (e.g. Reproduction, Nutrition, Respiration), explain why a virus is considered non-living outside a host cell.',
          placeholder: 'Explain host dependency, lack of cellular machinery, and metabolic inactivity...'
        }
      ]
    }
  }
];

