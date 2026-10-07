import { ATLTaskLog, AssignedTask } from '../types';

export function formatTeacherComment(text?: string): string {
  if (!text) return '';
  let formatted = text
    .replace(/^Work submitted for teacher review and grading\.\s*\(AI Formative Guidance generated:\s*/i, '')
    .replace(/^Work submitted for teacher review and grading\.\s*\(AI Guidance generated:\s*/i, '')
    .replace(/^Work submitted for teacher review and grading\.\s*\(Teacher Feedback generated:\s*/i, '')
    .replace(/^Work submitted for teacher review and grading\.\s*/i, '')
    .replace(/^AI[\s\-_]*(Generated|Assisted)?[\s\-_]*(Remarks|Comments|Feedback|Response|Guidance)[\s:]*/i, '')
    .replace(/^Teacher[\s\-_]*(Remarks|Comments|Feedback)[\s:]*/i, '')
    .replace(/\s*\(AI Formative Guidance generated:.*?\)$/i, '')
    .replace(/\s*\(AI Generated.*?\)$/i, '')
    .replace(/\)$/, '')
    .trim();

  // Convert third-person teacher references to first-person direct feedback ("I", "my")
  formatted = formatted
    .replace(/\bthe teacher identified that\b/gi, 'I identified that')
    .replace(/\bthe teacher identified\b/gi, 'I identified')
    .replace(/\bthe teacher observed that\b/gi, 'I observed that')
    .replace(/\bthe teacher observed\b/gi, 'I observed')
    .replace(/\bthe teacher noticed that\b/gi, 'I noticed that')
    .replace(/\bthe teacher noticed\b/gi, 'I noticed')
    .replace(/\bthe teacher pointed out that\b/gi, 'I pointed out that')
    .replace(/\bthe teacher pointed out\b/gi, 'I pointed out')
    .replace(/\bthe teacher points out that\b/gi, 'I point out that')
    .replace(/\bthe teacher points out\b/gi, 'I point out')
    .replace(/\bthe teacher noted that\b/gi, 'I noted that')
    .replace(/\bthe teacher noted\b/gi, 'I noted')
    .replace(/\bthe teacher recommends that\b/gi, 'I recommend that')
    .replace(/\bthe teacher recommends\b/gi, 'I recommend')
    .replace(/\bthe teacher suggests that\b/gi, 'I suggest that')
    .replace(/\bthe teacher suggests\b/gi, 'I suggest')
    .replace(/\bthe teacher advises that\b/gi, 'I advise that')
    .replace(/\bthe teacher advises\b/gi, 'I advise')
    .replace(/\bthe teacher evaluated that\b/gi, 'I evaluated that')
    .replace(/\bthe teacher evaluated\b/gi, 'I evaluated')
    .replace(/\bthe teacher assessed that\b/gi, 'I assessed that')
    .replace(/\bthe teacher assessed\b/gi, 'I assessed')
    .replace(/\bthe teacher found that\b/gi, 'I found that')
    .replace(/\bthe teacher found\b/gi, 'I found')
    .replace(/\bthe teacher's diagnostic\b/gi, 'My diagnostic feedback')
    .replace(/\bthe teacher's feedback\b/gi, 'My feedback')
    .replace(/\bthe teacher's remarks\b/gi, 'My feedback')
    .replace(/\bthe teacher's comments\b/gi, 'My comments')
    .replace(/\bthe teacher\b/gi, 'I');

  // Convert third-person student references to direct second-person address ("you", "your")
  formatted = formatted
    .replace(/\bthe student's response\b/gi, 'your response')
    .replace(/\bthe student's answer\b/gi, 'your answer')
    .replace(/\bthe student's claim\b/gi, 'your claim')
    .replace(/\bthe student's evidence\b/gi, 'your evidence')
    .replace(/\bthe student's reasoning\b/gi, 'your reasoning')
    .replace(/\bthe student's work\b/gi, 'your work')
    .replace(/\bthe student demonstrated that\b/gi, 'you demonstrated that')
    .replace(/\bthe student demonstrated\b/gi, 'you demonstrated')
    .replace(/\bthe student demonstrates that\b/gi, 'you demonstrate that')
    .replace(/\bthe student demonstrates\b/gi, 'you demonstrate')
    .replace(/\bthe student showed that\b/gi, 'you showed that')
    .replace(/\bthe student showed\b/gi, 'you showed')
    .replace(/\bthe student shows that\b/gi, 'you show that')
    .replace(/\bthe student shows\b/gi, 'you show')
    .replace(/\bthe student stated that\b/gi, 'you stated that')
    .replace(/\bthe student stated\b/gi, 'you stated')
    .replace(/\bthe student states that\b/gi, 'you stated that')
    .replace(/\bthe student states\b/gi, 'you stated')
    .replace(/\bthe student wrote that\b/gi, 'you wrote that')
    .replace(/\bthe student wrote\b/gi, 'you wrote')
    .replace(/\bthe student needs to\b/gi, 'you need to')
    .replace(/\bthe student should\b/gi, 'you should')
    .replace(/\bthe student must\b/gi, 'you must')
    .replace(/\bthe student\b/gi, 'you');

  // Fix minor grammatical artifacts if "I has" or "I is" were produced
  formatted = formatted
    .replace(/\bI has\b/g, 'I have')
    .replace(/\bI is\b/g, 'I am');

  return formatted;
}

/**
 * Check if a prompt string is one of the generic default boilerplate prompts
 */
export function isBoilerplateTemplatePrompt(prompt: string): boolean {
  if (!prompt) return false;
  const p = prompt.toLowerCase();
  return (
    p.includes('based on the infographic / question above') ||
    p.includes('based on the infographic above, evaluate the findings') ||
    p.includes('based on the scientific dataset and graph above') ||
    p.includes('cite at least two specific quantitative data values') ||
    p.includes('answer the question provided above:') ||
    p.includes('type your complete response and justification here')
  );
}

/**
 * Clean existing task submission logs by sanitizing boilerplate template questions
 * and removing unwanted generic artifacts while preserving all student work.
 */
export function cleanTaskLog(log: ATLTaskLog): { cleanedLog: ATLTaskLog; changed: boolean } {
  let changed = false;
  const isCustom =
    (log as any).sourceType === 'chatgpt_custom' ||
    log.originalTask?.sourceType === 'chatgpt_custom' ||
    Boolean(log.stimulusImages && log.stimulusImages.length > 0) ||
    Boolean(log.originalTask?.stimulusImages && log.originalTask.stimulusImages.length > 0) ||
    Boolean((log as any).customQuestionText);

  let newResponses = log.responses;
  if (newResponses && newResponses.length > 0) {
    const updatedResponses = newResponses.map((r, idx) => {
      if (isBoilerplateTemplatePrompt(r.prompt || '')) {
        changed = true;
        const newPrompt = isCustom
          ? 'Response & Evidence for Attached Infographic / Stimulus'
          : `Part ${r.label || String.fromCharCode(65 + idx)}`;
        return { ...r, prompt: newPrompt };
      }
      return r;
    });
    if (changed) {
      newResponses = updatedResponses;
    }
  }

  let newOriginalTask = log.originalTask;
  if (newOriginalTask) {
    let taskChanged = false;
    let parts = newOriginalTask.parts;
    if (parts && parts.length > 0) {
      const updatedParts = parts.map((p, idx) => {
        if (isBoilerplateTemplatePrompt(p.prompt || '')) {
          taskChanged = true;
          return {
            ...p,
            prompt: isCustom
              ? 'Response for attached infographic / stimulus:'
              : `Question Part ${p.label || String.fromCharCode(65 + idx)}`
          };
        }
        return p;
      });
      if (taskChanged) {
        parts = updatedParts;
      }
    }

    // If custom task with stimulusImages, remove accidental mock scientific_dataset
    if (isCustom && newOriginalTask.scientific_dataset && (newOriginalTask.stimulusImages?.length || log.stimulusImages?.length)) {
      newOriginalTask = { ...newOriginalTask, scientific_dataset: null as any };
      taskChanged = true;
    }

    // Clean empty context or context matching boilerplate
    if (newOriginalTask.context && isBoilerplateTemplatePrompt(newOriginalTask.context)) {
      newOriginalTask = { ...newOriginalTask, context: '' };
      taskChanged = true;
    }

    if (taskChanged) {
      changed = true;
      newOriginalTask = { ...newOriginalTask, parts };
    }
  }

  let newFeedback = log.feedback;
  if (newFeedback) {
    let fbChanged = false;
    let summary = newFeedback.summary;
    if (summary) {
      const formatted = formatTeacherComment(summary);
      if (formatted !== summary) {
        summary = formatted;
        fbChanged = true;
      }
    }
    let strengths = newFeedback.strengths;
    if (strengths && strengths.length > 0) {
      const formattedSt = strengths.map((s) => formatTeacherComment(s));
      if (formattedSt.some((s, idx) => s !== strengths![idx])) {
        strengths = formattedSt;
        fbChanged = true;
      }
    }
    let nextSteps = newFeedback.next_steps;
    if (nextSteps && nextSteps.length > 0) {
      const formattedNs = nextSteps.map((n) => formatTeacherComment(n));
      if (formattedNs.some((n, idx) => n !== nextSteps![idx])) {
        nextSteps = formattedNs;
        fbChanged = true;
      }
    }
    if (fbChanged) {
      newFeedback = { ...newFeedback, summary, strengths, next_steps: nextSteps };
      changed = true;
    }
  }

  let newTeacherEval = log.teacherEvaluation;
  if (newTeacherEval?.feedback) {
    const formatted = formatTeacherComment(newTeacherEval.feedback);
    if (formatted !== newTeacherEval.feedback) {
      newTeacherEval = { ...newTeacherEval, feedback: formatted };
      changed = true;
    }
  }

  if (changed) {
    return {
      cleanedLog: {
        ...log,
        responses: newResponses,
        originalTask: newOriginalTask,
        feedback: newFeedback,
        teacherEvaluation: newTeacherEval
      },
      changed: true
    };
  }

  return { cleanedLog: log, changed: false };
}

/**
 * Clean existing assigned task records
 */
export function cleanAssignedTask(task: AssignedTask): { cleanedTask: AssignedTask; changed: boolean } {
  let changed = false;
  const isCustom =
    task.sourceType === 'chatgpt_custom' ||
    task.task?.sourceType === 'chatgpt_custom' ||
    Boolean(task.stimulusImages && task.stimulusImages.length > 0) ||
    Boolean(task.task?.stimulusImages && task.task.stimulusImages.length > 0) ||
    Boolean((task.task as any)?.customQuestionText);

  let newTaskObj = task.task;
  if (newTaskObj) {
    let taskChanged = false;
    let parts = newTaskObj.parts;
    if (parts && parts.length > 0) {
      const updatedParts = parts.map((p, idx) => {
        if (isBoilerplateTemplatePrompt(p.prompt || '')) {
          taskChanged = true;
          return {
            ...p,
            prompt: isCustom
              ? 'Submit your response and working for the attached infographic / stimulus:'
              : `Question Part ${p.label || String.fromCharCode(65 + idx)}`
          };
        }
        return p;
      });
      if (taskChanged) {
        parts = updatedParts;
      }
    }

    if (isCustom && newTaskObj.scientific_dataset && (newTaskObj.stimulusImages?.length || task.stimulusImages?.length)) {
      newTaskObj = { ...newTaskObj, scientific_dataset: null as any };
      taskChanged = true;
    }

    if (newTaskObj.context && isBoilerplateTemplatePrompt(newTaskObj.context)) {
      newTaskObj = { ...newTaskObj, context: '' };
      taskChanged = true;
    }

    if (taskChanged) {
      changed = true;
      newTaskObj = { ...newTaskObj, parts };
    }
  }

  if (changed) {
    return {
      cleanedTask: {
        ...task,
        task: newTaskObj
      },
      changed: true
    };
  }

  return { cleanedTask: task, changed: false };
}
