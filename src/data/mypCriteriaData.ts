export interface MYPStrand {
  id: string; // e.g. "A.i"
  code: string; // "i"
  label: string; // "explain scientific knowledge"
}

export interface MYPCriterion {
  id: string; // "Criterion A"
  name: string; // "Knowing and understanding"
  description: string;
  strands: MYPStrand[];
}

export const SCIENCE_MYP_CRITERIA: MYPCriterion[] = [
  {
    id: 'Criterion A',
    name: 'Knowing and understanding',
    description: 'Explain and apply scientific knowledge to solve problems and make supported judgments.',
    strands: [
      { id: 'A.i', code: 'i', label: 'explain scientific knowledge' },
      { id: 'A.ii', code: 'ii', label: 'apply scientific knowledge and understanding to solve problems set in familiar and unfamiliar situations' },
      { id: 'A.iii', code: 'iii', label: 'analyse and evaluate information to make scientifically supported judgments' },
    ],
  },
  {
    id: 'Criterion B',
    name: 'Inquiring and designing',
    description: 'Design scientific investigations by formulating hypotheses and manipulating variables.',
    strands: [
      { id: 'B.i', code: 'i', label: 'explain a problem or question to be tested by a scientific investigation' },
      { id: 'B.ii', code: 'ii', label: 'formulate a testable hypothesis and explain it using scientific reasoning' },
      { id: 'B.iii', code: 'iii', label: 'explain how to manipulate the variables, and explain how data will be collected' },
      { id: 'B.iv', code: 'iv', label: 'design scientific investigations' },
    ],
  },
  {
    id: 'Criterion C',
    name: 'Processing and evaluating',
    description: 'Process, present, and interpret data, and evaluate hypotheses and scientific methods.',
    strands: [
      { id: 'C.i', code: 'i', label: 'present collected and transformed data' },
      { id: 'C.ii', code: 'ii', label: 'interpret data and explain results using scientific reasoning' },
      { id: 'C.iii', code: 'iii', label: 'evaluate the validity of a hypothesis based on the outcome of the scientific investigation' },
      { id: 'C.iv', code: 'iv', label: 'evaluate the validity of the method' },
      { id: 'C.v', code: 'v', label: 'explain improvements or extensions to the method' },
    ],
  },
  {
    id: 'Criterion D',
    name: 'Reflecting on the impacts of science',
    description: 'Evaluate implications of scientific applications, use language effectively, and document sources.',
    strands: [
      { id: 'D.i', code: 'i', label: 'explain the ways in which science is applied and used to address a specific problem or issue' },
      { id: 'D.ii', code: 'ii', label: 'discuss and evaluate the various implications of using science and its application to solve a specific problem or issue' },
      { id: 'D.iii', code: 'iii', label: 'apply scientific language effectively' },
      { id: 'D.iv', code: 'iv', label: 'document the work of others and sources of information used' },
    ],
  },
];
