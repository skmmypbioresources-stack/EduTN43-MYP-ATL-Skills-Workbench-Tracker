import { ATLCategoryKey, ATLCategoryData, ATLTaskLog, AssignedTask, StudentRecord } from '../types';

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

export const MYP_1_STUDENTS: StudentRecord[] = [
  { id: '8674', name: 'CHARAN SAI M', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8671', name: 'ARAV MENNENI', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8633', name: 'PRANAV SHERAWAT', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8610', name: 'PARV SURANA', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8593', name: 'RAJHVEER MAYYUR DASPUTE', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8558', name: 'DHRUV SARAWGI', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8544', name: 'SAI THATHVA ROHIN CHUNDI', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8560', name: 'JOEL MARVIN REDDY THUMMA', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8549', name: 'DHRITI SURANA', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Female' },
  { id: '8502', name: 'HRIDHAN CHANDRAKANT PATIL', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8497', name: 'SHASHANK KARTHICKEN', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Male' },
  { id: '8463', name: 'RUSHIL NAIK NENAVATH', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8457', name: 'RONAQ MALIK G', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8448', name: 'ANJANA HARIKRISHNAN', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Female' },
  { id: '8425', name: 'AKSHAN C V', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8418', name: 'TAKSHVEE MANOJKUMAR', mypYear: '1', classSection: 'MYP 1', subject: 'Sciences', gender: 'Female' },
  { id: '8416', name: 'JAYDEN GOUNDER', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8415', name: 'HITARTH JAYSON HIRANI', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8381', name: 'MAHI AMOL DUSANE', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Female' },
  { id: '8376', name: 'GUDIPALLY SHIVA SAI', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8373', name: 'HERIT RAVIRAJ NESADIYA', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8364', name: 'AHAAN SAGAR KHURANA', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8361', name: 'HEER NIKHIL KOTHARI', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8356', name: 'A.P.RIHAAN', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8350', name: 'PRISHA AGRAWAL', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Female' },
  { id: '8349', name: 'ABIR KEDIA', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8348', name: 'AHAN KEDIA', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8329', name: 'SRI VISHNU PRADHAN A.P', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8302', name: 'NIRANJAN J', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8301', name: 'KAVIN KRISH RR', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8298', name: 'AVYUKTH CHOWDARY CHERUKURI', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8296', name: 'KIAAN SAMEER PATEL', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8267', name: 'KUMMITHI SHANMUKA SAI REDDY', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Male' },
  { id: '8225', name: 'HARDVI HITESH BHARVAD', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Female' },
  { id: '8212', name: 'SHYAM RANGPARIYA', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
  { id: '8179', name: 'MIRUNALINI A', mypYear: '1', classSection: 'MYP 1B', subject: 'Sciences', gender: 'Female' },
  { id: '8166', name: 'ADHEEKSHAN NIMALAN', mypYear: '1', classSection: 'MYP 1A', subject: 'Sciences', gender: 'Male' },
];

export const MYP_2_STUDENTS: StudentRecord[] = [
  { id: '8654', name: 'MIRAYA SHARVIL SHRIDHAR', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Female' },
  { id: '8642', name: 'JAANVI AGARWAL', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Female' },
  { id: '8506', name: 'VIHAAN YELAMARTI', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8559', name: 'MANTRA HIMANSHUBHAI DOBARIYA', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8550', name: 'ARKO BANERJEE', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8547', name: 'AARYA SUDHIR BHOSLE', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Female' },
  { id: '8471', name: 'SAMANYU GALI', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8451', name: 'DHRUSHIL VIRAL SHAH', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8411', name: 'VIHAN ASHISHBHAI MARVANIYA', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8325', name: 'MOHAMMAD REHAN SHAREEF', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8304', name: 'GUTHI PRAGNYA', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Female' },
  { id: '8087', name: 'VARADA KAUL', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Female' },
  { id: '7955', name: 'THANEEKSHA GOWDA R', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Female' },
  { id: '7831', name: 'INAAYA DINA RAWTHAR', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Female' },
  { id: '8645', name: 'VIRAT ANANT JAIN', mypYear: '2', classSection: 'MYP 2C', subject: 'Science • Biology', gender: 'Male' },
  { id: '8667', name: 'AMAIRA SAWA', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Female' },
  { id: '8661', name: 'BELLA ASH MOTIMAYA', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Female' },
  { id: '8658', name: 'SIMHASKANDA KUNUKUNTLA', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Male' },
  { id: '8617', name: 'AJOONI KAUR', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Female' },
  { id: '8604', name: 'SK ANMOL', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Male' },
  { id: '8588', name: 'SHRESTH RUIA', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Male' },
  { id: '8564', name: 'SARVAM PULINBHAI JASOLIYA', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Male' },
  { id: '8540', name: 'SUHANI RITESH PATEL', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Female' },
  { id: '8521', name: 'RUTANSHI DEVDA', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Female' },
  { id: '8510', name: 'ANSH ROONGTA', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Male' },
  { id: '8379', name: 'ARTH ABHI SETTY', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Male' },
  { id: '8534', name: 'ARTH GOYAL', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Male' },
  { id: '8531', name: 'SAMAIRA JAIN', mypYear: '2', classSection: 'MYP 2A', subject: 'Science • Biology', gender: 'Female' },
  { id: '8513', name: 'AYAAN GUPTA', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Male' },
  { id: '8488', name: 'JENISH SIDDHARTH PATEL', mypYear: '2', classSection: 'MYP 2A', subject: 'Science • Biology', gender: 'Male' },
  { id: '8479', name: 'SOLANKI MIHIR MINESHBHAI', mypYear: '2', classSection: 'MYP 2A', subject: 'Science • Biology', gender: 'Male' },
  { id: '8456', name: 'G NITHISH CHOWDARY', mypYear: '2', classSection: 'MYP 2A', subject: 'Science • Biology', gender: 'Male' },
  { id: '8442', name: 'VEERA RAVI SUTARIYA', mypYear: '2', classSection: 'MYP 2A', subject: 'Science • Biology', gender: 'Female' },
  { id: '8181', name: 'V KRISHIYEAH', mypYear: '2', classSection: 'MYP 2A', subject: 'Science • Biology', gender: 'Female' },
  { id: '8133', name: 'MIRUDULLA SAI MAHESH', mypYear: '2', classSection: 'MYP 2A', subject: 'Science • Biology', gender: 'Female' },
  { id: '8088', name: 'VIVAAN KAUL', mypYear: '2', classSection: 'MYP 2', subject: 'Science • Biology', gender: 'Male' },
  { id: '8056', name: 'KAKARLA RANGA PRABHANJAN', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Male' },
  { id: '8015', name: 'SHIVAN RAJ DHOLAKIA', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Male' },
  { id: '7972', name: 'ANAISHA CHORDIA', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Female' },
  { id: '7756', name: 'HET HITESHBHAI BHARVAD', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Male' },
  { id: '7755', name: 'ADITH ARADHYA', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Male' },
  { id: '7731', name: 'ITHAL INEYA L S', mypYear: '2', classSection: 'MYP 2B', subject: 'Science • Biology', gender: 'Female' },
];

export const MYP_2C_STUDENTS: StudentRecord[] = MYP_2_STUDENTS.filter((s) => s.classSection === 'MYP 2C');

export const MYP_3_STUDENTS: StudentRecord[] = [
  { id: '8659', name: 'JESHITH KAKARLA', mypYear: '3', classSection: 'MYP 3-1', subject: 'Sciences', gender: 'Male' },
  { id: '8630', name: 'JIYAA GURUPRASAD BILUGALI', mypYear: '3', classSection: 'MYP 3-2', subject: 'Sciences', gender: 'Female' },
  { id: '8626', name: 'SARANSH AGGARWAL', mypYear: '3', classSection: 'MYP 3-3', subject: 'Sciences', gender: 'Male' },
  { id: '8606', name: 'VED SATISHBHAI MOVALIYA', mypYear: '3', classSection: 'MYP 3-4', subject: 'Sciences', gender: 'Male' },
  { id: '8602', name: 'SUFIYAN SABIR FAKIR', mypYear: '3', classSection: 'MYP 3-5', subject: 'Sciences', gender: 'Male' },
  { id: '8601', name: 'DARSH AGARWAL', mypYear: '3', classSection: 'MYP 3-6', subject: 'Sciences', gender: 'Male' },
  { id: '8597', name: 'ADVAIT JINDAL', mypYear: '3', classSection: 'MYP 3-7', subject: 'Sciences', gender: 'Male' },
  { id: '8596', name: 'ARMAN RAJESH PATEL', mypYear: '3', classSection: 'MYP 3-8', subject: 'Sciences', gender: 'Male' },
  { id: '8576', name: 'JAHAN PATEL', mypYear: '3', classSection: 'MYP 3-9', subject: 'Sciences', gender: 'Male' },
  { id: '8575', name: 'DEV ADITYA GANTA', mypYear: '3', classSection: 'MYP 3-10', subject: 'Sciences', gender: 'Male' },
  { id: '8571', name: 'YOHAN NIKUNJ PATEL', mypYear: '3', classSection: 'MYP 3-11', subject: 'Sciences', gender: 'Male' },
  { id: '8568', name: 'YASH ROONGTA', mypYear: '3', classSection: 'MYP 3-12', subject: 'Sciences', gender: 'Male' },
  { id: '8517', name: 'AARADHYA RAJ SHEKHAR', mypYear: '3', classSection: 'MYP 3-13', subject: 'Sciences', gender: 'Female' },
  { id: '8524', name: 'VED MARELLA', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8452', name: 'AARUSH BODHAASU', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8449', name: 'YUVRAJ . SAHU', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8410', name: 'AVYAAN KEDIA', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8401', name: 'HARDIK MAHESHWARI', mypYear: '3', classSection: 'MYP 3', subject: 'Sciences', gender: 'Male' },
  { id: '8385', name: 'MANYA SIDDHARTH PATEL', mypYear: '3', classSection: 'MYP 3', subject: 'Sciences', gender: 'Female' },
  { id: '8371', name: 'YOHAN CHINTAN RIBADIA', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Male' },
  { id: '8336', name: 'SANAVI BARMAN', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Female' },
  { id: '8299', name: 'RIKITH PACHIPULA', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Male' },
  { id: '8213', name: 'HENIL HIRENBHAI AMRUTIYA', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8211', name: 'ARYAN AGARWAL', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8149', name: 'PRISHA RAHUL MANGUKIYA', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Female' },
  { id: '8113', name: 'SHIV RAMCHANDRA SADIGALE', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Male' },
  { id: '8101', name: 'S LACSHIT NAARAYANAN', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8090', name: 'DIVYAM AGARWAL', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Male' },
  { id: '8072', name: 'KUNDULA KRISHNA SASIDHAR', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '8032', name: 'AYRA ASHISH LAKHANI', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Female' },
  { id: '8010', name: 'PRANEETH GUTHI', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Male' },
  { id: '8003', name: 'PRADHAKSHANAA RAJESHKUMAR', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Female' },
  { id: '7979', name: 'VISHWARJUNA DAYANENI', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
  { id: '7960', name: 'S. NEERAJA NAYANI', mypYear: '3', classSection: 'MYP 3', subject: 'Sciences', gender: 'Female' },
  { id: '7952', name: 'YASHI JALAN', mypYear: '3', classSection: 'MYP 3B', subject: 'Sciences', gender: 'Female' },
  { id: '7698', name: 'AVNI SAMRA', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Female' },
  { id: '7641', name: 'JOHAN MATHEW SHAREEN', mypYear: '3', classSection: 'MYP 3A', subject: 'Sciences', gender: 'Male' },
];

export const MYP_4_STUDENTS: StudentRecord[] = [
  { id: '8672', name: 'MOHMMAD ALI FARUK PATEL', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8668', name: 'MANYA PINJANI', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Female' },
  { id: '8639', name: 'SAMAR AJAY MEGHANI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8616', name: 'VIDHI SIDDHARTH SHAH', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Female' },
  { id: '8612', name: 'ANIT PATRO PATNALA', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8611', name: 'AARJYOHI LAHIRI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Female' },
  { id: '8539', name: 'VIVAAN AGRAWAL', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8528', name: 'ARTH NIKUNJ PATEL', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8500', name: 'KRISHNA REDDY TEEGALA', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8496', name: 'JAS DHIRAJ DARYANI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8494', name: 'REYANSH JIWANI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8478', name: 'NISHIKA JUNEJA', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Female' },
  { id: '8477', name: 'GAURANGI BHANOT', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Female' },
  { id: '8472', name: 'SIYA KIRAN GALI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Female' },
  { id: '8460', name: 'PAVANA KSHEMAMKARI MATTUPALLI', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Female' },
  { id: '8440', name: 'MIRAYA ANUJ MEHTA', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Female' },
  { id: '8431', name: 'AMAANULLAH KHAN', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '8426', name: 'MITHILESH GOKUL DUSANE', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8407', name: 'KAYRA SARVESH SALVI CHAVAN', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Female' },
  { id: '8402', name: 'JOHAN DALSANIYA', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8395', name: 'KRISHIV AMISH MEHTA', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8392', name: 'DHRUV PRANAV GANDHI', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8378', name: 'SUKRITI SARASWAT', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Female' },
  { id: '8370', name: 'ARYAMAN PANKAJ KOTADIYA', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8367', name: 'AVEKA AGARWAL', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Female' },
  { id: '8331', name: 'MILIT SHRIVASTAVA', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '8326', name: 'ALEX PARESH BAVALIYA', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8294', name: 'HARSHIL BANKIMBHAI MEHTA', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8282', name: 'SHAAN SAKHIYA', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8277', name: 'VIAANN BRIJESH PATEL', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '8270', name: 'AADHEESH PATEL', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8237', name: 'SAMAR AGRAWAL', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '8216', name: 'AARYAN DENISH KANASAGARA', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8199', name: 'JAIVARDHAN AGARWALLA', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '8193', name: 'PRATHAM CHANDARANA', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '8191', name: 'JILAY HITESH SARDHARA', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8178', name: 'NIRVAAN PEEYUSH JAIN', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8165', name: 'AARAV SIPANI', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8138', name: 'ZAYAAN MOHAMED IMRAN MANSOORI', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '8136', name: 'GRIHITHA SRINIVAS GOWDA', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Female' },
  { id: '8084', name: 'NEEV NIRAV PATEL', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8079', name: 'K SAI SMARAN', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '8064', name: 'KAKARLA RANGA YASHASWINI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Female' },
  { id: '8046', name: 'NEEL BHAVESHBHAI KATHROTIYA', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '7966', name: 'VIRAT SAI M', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '7956', name: 'SAANVI GOWDA R', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Female' },
  { id: '7949', name: 'ADITI SANTRA', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Female' },
  { id: '7939', name: 'RYANN FRANCY JOSEPH', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Male' },
  { id: '7889', name: 'YAKKSHH MIRANI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '7863', name: 'ANANT SINGH ARORA', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '7825', name: 'SHOURYA RAHUL MANE', mypYear: '4', classSection: 'MYP 4A', subject: 'Sciences', gender: 'Male' },
  { id: '7769', name: 'ESHITHA SEELAM', mypYear: '4', classSection: 'MYP 4B', subject: 'Sciences', gender: 'Female' },
  { id: '7767', name: 'VIVAAN SANGILIRAJ', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '7749', name: 'ARNAV V', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '7560', name: 'TEJESWAR REDDY KUMMITHI', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
  { id: '7337', name: 'YAJ SUNIT PATEL', mypYear: '4', classSection: 'MYP 4', subject: 'Sciences', gender: 'Male' },
];

export const MYP_5_STUDENTS: StudentRecord[] = [
  { id: '8499', name: 'NAINEISHA REDDY GUNREDDY', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '8446', name: 'JINANSHI JAIN', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '8389', name: 'RUDRANSH VIVEK GANDHI', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Male' },
  { id: '8283', name: 'RUDRA SAKHIYA', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Male' },
  { id: '8223', name: 'DEV KARIA', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Male' },
  { id: '8218', name: 'NINA ASHWIN GANDHI', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '8217', name: 'AASMAA GAJERA', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Female' },
  { id: '8185', name: 'AARNAVI REKHA APPASANI', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '8168', name: 'SIDDHANT AKSHAY VASOYA', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Male' },
  { id: '8164', name: 'AKSHAJ VELLORE', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Male' },
  { id: '8162', name: 'VAIDEHI ANAND', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Female' },
  { id: '8157', name: 'YOGI KAKADIYA', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Male' },
  { id: '8132', name: 'ANAV SINGH BHATIA', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Male' },
  { id: '8108', name: 'DIVA ADESHRA', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '8038', name: 'LAKSHMI KEERTHANA ERUGADINDLA', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '8024', name: 'ANAYA CHOKSI', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '7987', name: 'SANVI SAJAY', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Female' },
  { id: '7976', name: 'SATVIK AGRAWAL', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Male' },
  { id: '7973', name: 'PRANAV GOBINATH', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Male' },
  { id: '7839', name: 'SAI SIDDHIKSHA SAKHAMURI', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Female' },
  { id: '7789', name: 'VIDUSSHI JAIN', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
  { id: '7737', name: 'TIARA AGRAWAL', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Female' },
  { id: '7645', name: 'YADHAVAR BABU', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Male' },
  { id: '7632', name: 'SAACHI AGARWAL', mypYear: '5', classSection: 'MYP 5A', subject: 'Sciences', gender: 'Female' },
  { id: '7588', name: 'ARNAV SAMRA', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Male' },
  { id: '7490', name: 'KULDIP DUBISETTY', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Male' },
  { id: '7336', name: 'SAANVI SUNIT PATEL', mypYear: '5', classSection: 'MYP 5', subject: 'Sciences', gender: 'Female' },
];

export const DEFAULT_STUDENTS_BY_CLASS: Record<string, StudentRecord[]> = {
  '1': MYP_1_STUDENTS,
  '2': MYP_2_STUDENTS,
  '3': MYP_3_STUDENTS,
  '4': MYP_4_STUDENTS,
  '5': MYP_5_STUDENTS,
};

// Deduplicated master roster across all classes
export const ALL_STUDENTS_ROSTER: StudentRecord[] = (() => {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: StudentRecord[] = [];

  const all = [
    ...MYP_1_STUDENTS,
    ...MYP_2_STUDENTS,
    ...MYP_3_STUDENTS,
    ...MYP_4_STUDENTS,
    ...MYP_5_STUDENTS
  ];

  for (const student of all) {
    const normId = student.id.trim();
    const normName = student.name.trim().toLowerCase();
    if (!seenIds.has(normId) && !seenNames.has(normName)) {
      seenIds.add(normId);
      seenNames.add(normName);
      result.push(student);
    }
  }

  return result;
})();

export const SAMPLE_STUDENTS: string[] = ALL_STUDENTS_ROSTER.map(
  (s) => `${s.name} (${s.classSection || `MYP ${s.mypYear}`})`
);

export const SAMPLE_LOGS: ATLTaskLog[] = [
  {
    id: 'sample-log-myp2-1',
    date: '2025-10-14',
    academicYear: '2025-2026',
    term: 'Term 1',
    studentName: 'MIRAYA SHARVIL SHRIDHAR',
    subject: 'Science • Biology',
    topic: 'Photosynthesis Rate & Environmental Factors',
    mypYear: '2',
    category: 'Thinking',
    cluster: 'Critical thinking',
    level: 'Extending',
    formativeScore: 8,
    taskTitle: 'Critical thinking Activity: Photosynthesis Rate & Environmental Limiting Factors',
    responses: [
      { label: 'A', prompt: 'State the word and chemical equation for photosynthesis and name the primary light-absorbing pigment in plant leaves.', response: '6CO2 + 6H2O -> C6H12O6 + 6O2 in the presence of light and chlorophyll. The main green pigment is chlorophyll inside chloroplasts.' },
      { label: 'B', prompt: 'Why does the rate of photosynthesis plateau even if light intensity continues to increase indefinitely?', response: 'The reaction becomes limited by another factor such as carbon dioxide concentration, ambient temperature, or chloroplast enzyme saturation.' },
    ],
    feedback: {
      level: 'Extending',
      formativeScore: 8,
      summary: 'Miraya demonstrated thorough understanding of photosynthesis limiting factors with precise biochemical reasoning.',
      strengths: ['Accurate chemical and word formulas', 'Clear explanation of limiting factor saturation'],
      next_steps: ['Connect limiting factor plateaus to agricultural greenhouse yield optimizations'],
    },
  },
  {
    id: 'sample-log-myp2-2',
    date: '2025-11-04',
    academicYear: '2025-2026',
    term: 'Term 1',
    studentName: 'JAANVI AGARWAL',
    subject: 'Science • Biology',
    topic: 'Plant Physiology & Cellular Respiration',
    mypYear: '2',
    category: 'Communication',
    cluster: 'Literacy',
    level: 'Applying',
    formativeScore: 7,
    taskTitle: 'Literacy Activity: Plant Physiology & Stomatal Gas Exchange',
    responses: [
      { label: 'A', prompt: 'Describe how stomata and guard cells regulate transpiration.', response: 'Guard cells take up water to swell and open stomatal pores for gas exchange, and close during water stress to prevent dehydration.' },
      { label: 'B', prompt: 'Explain the difference between respiration and photosynthesis in leaf cells.', response: 'Photosynthesis occurs in chloroplasts producing glucose during the day, while aerobic respiration occurs in mitochondria continuously.' },
    ],
    feedback: {
      level: 'Applying',
      formativeScore: 7,
      summary: 'Jaanvi communicated physiological mechanisms using accurate biological vocabulary.',
      strengths: ['Precise anatomical terminology for guard cells and stomata', 'Clear distinction of organelles'],
      next_steps: ['Quantify transpiration rates using potometer data interpretation'],
    },
  },
  {
    id: 'sample-log-myp2-3',
    date: '2025-11-20',
    academicYear: '2025-2026',
    term: 'Term 1',
    studentName: 'AARYA SUDHIR BHOSLE',
    subject: 'Science • Biology',
    topic: 'Cell Biology & Transport Mechanisms',
    mypYear: '2',
    category: 'Thinking',
    cluster: 'Critical thinking',
    level: 'Extending',
    formativeScore: 8,
    taskTitle: 'Critical thinking Activity: Osmosis & Diffusion in Plant Tissues',
    responses: [
      { label: 'A', prompt: 'Explain what happens to potato cells placed in hypertonic saltwater.', response: 'Water exits the cells by osmosis down the water potential gradient, causing protoplasts to shrink away from cell walls (plasmolysis).' },
      { label: 'B', prompt: 'How does turgor pressure support herbaceous plant structures?', response: 'When vacuoles absorb water, turgor pressure pushes cytoplasm firmly against rigid cellulose cell walls, keeping stems upright.' },
    ],
    feedback: {
      level: 'Extending',
      formativeScore: 8,
      summary: 'Aarya provided comprehensive, scientific explanations of water potential and cellular turgor.',
      strengths: ['Sophisticated grasp of osmosis mechanics', 'Clear articulation of plasmolysis'],
      next_steps: ['Analyze percentage mass change graphs from osmosis experiments'],
    },
  },
  {
    id: 'sample-log-myp2-4',
    date: '2026-01-22',
    academicYear: '2025-2026',
    term: 'Term 2',
    studentName: 'VIHAAN YELAMARTI',
    subject: 'Science • Biology',
    topic: 'Ecosystem Dynamics & Food Webs',
    mypYear: '2',
    category: 'Research',
    cluster: 'Information literacy',
    level: 'Applying',
    formativeScore: 6,
    taskTitle: 'Information literacy Activity: Trophic Levels & Energy Pyramids',
    responses: [
      { label: 'A', prompt: 'Why is only approximately 10% of energy transferred between trophic levels?', response: 'Most energy is lost as heat through respiration, movement, and undigested waste materials.' },
      { label: 'B', prompt: 'Predict the impact of apex predator removal on primary producers.', response: 'Herbivore populations explode without predation, leading to overgrazing and sharp decline in producer biomass.' },
    ],
    feedback: {
      level: 'Applying',
      formativeScore: 6,
      summary: 'Vihaan demonstrated sound reasoning regarding thermodynamic energy transfer in ecosystems.',
      strengths: ['Accurate recall of 10% trophic efficiency rule', 'Sound ecological trophic cascade logic'],
      next_steps: ['Construct quantitative biomass pyramids using measured field data'],
    },
  },
  {
    id: 'sample-log-myp2-5',
    date: '2026-02-18',
    academicYear: '2025-2026',
    term: 'Term 2',
    studentName: 'ARKO BANERJEE',
    subject: 'Science • Biology',
    topic: 'Enzyme Action & Temperature Effects',
    mypYear: '2',
    category: 'Self-management',
    cluster: 'Reflection',
    level: 'Applying',
    formativeScore: 7,
    taskTitle: 'Reflection Activity: Enzyme Reaction Rates & Lab Techniques',
    responses: [
      { label: 'A', prompt: 'Reflect on how controlling water bath temperature affected your experimental accuracy.', response: 'Maintaining precise temperatures prevented random fluctuations and ensured denaturation was the only variable measured.' },
      { label: 'B', prompt: 'What improvement would you make to your catalase lab methodology?', response: 'Use a digital gas pressure sensor rather than measuring foam height with a ruler to reduce parallax error.' },
    ],
    feedback: {
      level: 'Applying',
      formativeScore: 7,
      summary: 'Arko reflected critically on experimental sources of error and proposed valid apparatus improvements.',
      strengths: ['Thoughtful methodology reflection', 'Identification of parallax error mitigation'],
      next_steps: ['Calibrate data collection intervals for early initial reaction rate calculations'],
    },
  },
  {
    id: 'sample-log-myp2-6',
    date: '2026-03-05',
    academicYear: '2025-2026',
    term: 'Term 2',
    studentName: 'VIRAT ANANT JAIN',
    subject: 'Science • Biology',
    topic: 'Classification & Biodiversity Keys',
    mypYear: '2',
    category: 'Communication',
    cluster: 'Collaboration',
    level: 'Extending',
    formativeScore: 8,
    taskTitle: 'Collaboration Activity: Dichotomous Keys & Invertebrate Identification',
    responses: [
      { label: 'A', prompt: 'How did your group divide tasks during the pond water sample identification?', response: 'One student operated the microscope, another recorded observable characteristics, and two navigated the dichotomous key.' },
      { label: 'B', prompt: 'Why is paired branching effective in biological classification keys?', response: 'Couplets provide unambiguous either/or morphological choices based on observable anatomical features.' },
    ],
    feedback: {
      level: 'Extending',
      formativeScore: 8,
      summary: 'Virat collaborated effectively and demonstrated clear taxonomic reasoning.',
      strengths: ['Equitable group task distribution', 'Logical grasp of dichotomous key couplets'],
      next_steps: ['Design an original multi-tier dichotomous key for local flora'],
    },
  },
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

