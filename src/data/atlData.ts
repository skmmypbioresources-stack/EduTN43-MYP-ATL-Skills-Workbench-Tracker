import { ATLCategoryKey, ATLCategoryData, ATLTaskLog } from '../types';

export const ATL_DATA: Record<ATLCategoryKey, ATLCategoryData> = {
  Communication: {
    color: '#4f46e5',
    bgSoft: '#eef2ff',
    borderColor: '#c7d2fe',
    textColor: '#312e81',
    clusters: {
      'Communication': {
        description: 'Exchanging thoughts, messages and information effectively through interaction, literacy and use of a variety of media.',
        indicators: [
          'Give and receive meaningful feedback',
          'Use a variety of speaking techniques to communicate with different audiences',
          'Use appropriate forms of writing for different purposes and audiences',
          'Use a variety of media to communicate with a range of audiences',
          'Interpret and use non-verbal communication effectively',
          'Negotiate ideas and knowledge with peers and teachers',
          'Structure information logically in summaries, reports or essays',
          'Use and interpret a range of discipline-specific terms and symbols'
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
    taskTitle: 'Critical thinking Activity: Cell Structure and Function',
    responses: [
      { label: 'A', prompt: 'What are 2 simple things you know about cells?', response: 'Cells have a nucleus that controls activities and a cell membrane.' },
      { label: 'B', prompt: 'How does plant cell structure differ from animal cell structure?', response: 'Plant cells have rigid cell walls and chloroplasts for photosynthesis.' },
    ],
    feedback: {
      level: 'Applying',
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
    taskTitle: 'Communication Activity: Linear Equations',
    responses: [
      { label: 'A', prompt: 'Explain what slope represents on a line graph.', response: 'Slope is the rate of change or rise over run.' },
      { label: 'B', prompt: 'Show step by step how to solve y = 2x + 3 when x = 4.', response: 'Substitute x=4: y = 2(4) + 3 = 8 + 3 = 11.' },
    ],
    feedback: {
      level: 'Extending',
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
    taskTitle: 'Creative thinking Activity: Character Analysis',
    responses: [
      { label: 'A', prompt: 'Describe the main character’s key conflict.', response: 'The protagonist struggles between individual desires and social expectations.' },
      { label: 'B', prompt: 'How would the story change from a secondary character’s perspective?', response: 'It would show the protagonist’s actions as unpredictable rather than heroic.' },
    ],
    feedback: {
      level: 'Applying',
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
    taskTitle: 'Information literacy Activity: Industrial Era Sources',
    responses: [
      { label: 'A', prompt: 'Compare primary vs secondary source perspectives on factory conditions.', response: 'Primary worker letters highlight harsh daily struggles while factory owner reports focus on production output.' },
      { label: 'B', prompt: 'Evaluate reliability of 19th-century parliamentary reports.', response: 'They provide official records but may reflect upper-class political bias.' },
    ],
    feedback: {
      level: 'Extending',
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
    taskTitle: 'Reflection Activity: Plant Genetics Inquiries',
    responses: [
      { label: 'A', prompt: 'Reflect on how cross-pollination ensures genetic diversity.', response: 'Combining genetic material from two plants creates variation in traits, helping adaptation.' },
      { label: 'B', prompt: 'What study strategy helped you master Punnett squares?', response: 'Drawing diagrams and checking probabilities with peer discussions.' },
    ],
    feedback: {
      level: 'Applying',
      summary: 'Marcus reflected thoughtfully on biological concepts and effective study strategies.',
      strengths: ['Clear reflection on learning strategies', 'Accurate biological conceptualization'],
      next_steps: ['Apply genetic probability rules to pedigree charts'],
    },
  },
];
