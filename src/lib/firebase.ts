import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ATLTaskLog, AssignedTask, DEFAULT_ACADEMIC_YEAR } from '../types';
import { isTaskLogGraded, getTaskEffectiveScore } from './scoreUtils';
import { getStudentEvidenceToken } from './evidenceUtils';
import { sanitizeAssignedTaskPayload, sanitizeTaskLogPayload } from '../utils/imageOptimizer';

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore instance with multi-tab persistent cache or default
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, dbId);
} catch (e) {
  // If Firestore is already initialized, get existing instance
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = firestoreInstance;

const COLLECTION_NAME = 'task_logs';

export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err.message || err.code || '');
  return (
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('Free daily read units per project')
  );
}

export function getFirestoreUpgradeUrl(): string {
  const projectId = firebaseConfig.projectId || 'poised-axon-c0bnn';
  const dbId = firebaseConfig.firestoreDatabaseId || 'ai-studio-mypatlskillswork-597f7718-46a5-47f5-9f37-c4eacfdeccd9';
  return `https://console.firebase.google.com/project/${projectId}/firestore/databases/${dbId}/data?openUpgradeDialog=true`;
}

/**
 * Subscribe to real-time updates for all task logs from Firestore
 */
export function subscribeToTaskLogs(
  onUpdate: (logs: ATLTaskLog[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const logsRef = collection(db, COLLECTION_NAME);
    const q = query(logsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const logs: ATLTaskLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const isGraded = isTaskLogGraded(data);
          const effectiveScore = isGraded ? getTaskEffectiveScore(data) : undefined;
          const status = data.status || (isGraded ? 'graded' : 'pending_review');

          const studentName = data.studentName || 'Anonymous';
          const mypYear = data.mypYear || '1';
          const evidenceToken = data.evidenceToken || getStudentEvidenceToken(studentName, mypYear);

          logs.push({
            id: docSnap.id,
            ...data,
            date: data.date || new Date().toISOString().split('T')[0],
            academicYear: data.academicYear || DEFAULT_ACADEMIC_YEAR,
            term: data.term || 'Term 1',
            studentName,
            subject: data.subject || 'Sciences',
            topic: data.topic || 'General Topic',
            mypYear,
            category: data.category || 'Thinking',
            cluster: data.cluster || 'Critical thinking',
            level: isGraded ? (data.level || data.teacherEvaluation?.level || 'Applying') : undefined,
            formativeScore: effectiveScore,
            status,
            aiSuggestedScore: data.aiSuggestedScore || (data.status === 'pending_review' ? data.feedback?.formativeScore : undefined),
            aiSuggestedLevel: data.aiSuggestedLevel || (data.status === 'pending_review' ? data.feedback?.level : undefined),
            taskTitle: data.taskTitle || 'ATL Task',
            evidenceToken,
            responses: data.responses || [],
            feedback: data.feedback ? {
              ...data.feedback,
              level: data.feedback.level || data.level || 'Applying',
              formativeScore: isGraded ? effectiveScore : undefined,
            } : {
              level: 'Applying',
              formativeScore: undefined,
              summary: '',
              strengths: [],
              next_steps: []
            }
          } as ATLTaskLog);
        });
        onUpdate(logs);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          console.warn('[Firestore] Daily free read quota reached. Running with offline cached data.');
        } else {
          console.error('Firestore subscription error:', err);
        }
        if (onError) onError(err);
      }
    );
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Failed to set up Firestore listener due to quota limit.');
    } else {
      console.error('Failed to set up Firestore listener:', err);
    }
    if (onError) onError(err as Error);
    return () => {};
  }
}

/**
 * Helper to recursively strip 'undefined' properties before sending to Firestore
 */
function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Save a new or updated task log to Firestore
 */
export async function saveTaskLogToFirestore(log: ATLTaskLog): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, log.id);
    const token = log.evidenceToken || getStudentEvidenceToken(log.studentName || 'Student', log.mypYear || '1');
    const sanitizedLog = await sanitizeTaskLogPayload(log);
    const dataToSave = removeUndefinedFields({
      ...sanitizedLog,
      evidenceToken: token,
      createdAt: sanitizedLog.createdAt || new Date().toISOString()
    });
    await setDoc(docRef, dataToSave);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Task log saved to local cache due to daily quota limit.');
      return;
    }
    console.error('Failed to save log to Firestore:', err);
    throw err;
  }
}

/**
 * Update student reflection on a task log in Firestore
 */
export async function updateTaskLogReflectionInFirestore(logId: string, reflection: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, logId);
    await updateDoc(docRef, removeUndefinedFields({
      studentReflection: reflection
    }));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Task log reflection updated in local cache due to daily quota limit.');
      return;
    }
    console.error('Failed to update student reflection in Firestore:', err);
    throw err;
  }
}

/**
 * Update a task log in Firestore (for teacher grading, corrections, feedback, or badge awards)
 */
export async function updateTaskLogInFirestore(logId: string, partial: Partial<ATLTaskLog>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, logId);
    await setDoc(docRef, removeUndefinedFields(partial), { merge: true });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Task log updated in local cache due to daily quota limit.');
      return;
    }
    console.error('Failed to update task log in Firestore:', err);
    throw err;
  }
}

/**
 * Delete a task log from Firestore
 */
export async function deleteTaskLogFromFirestore(logId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, logId);
    await deleteDoc(docRef);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Task log deleted from local cache due to daily quota limit.');
      return;
    }
    console.error('Failed to delete log from Firestore:', err);
    throw err;
  }
}

const ASSIGNED_COLLECTION_NAME = 'assigned_tasks';

/**
 * Subscribe to real-time updates for teacher assigned tasks
 */
export function subscribeToAssignedTasks(
  onUpdate: (tasks: AssignedTask[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const tasksRef = collection(db, ASSIGNED_COLLECTION_NAME);

    return onSnapshot(
      tasksRef,
      (snapshot) => {
        const tasks: AssignedTask[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          tasks.push({
            id: docSnap.id,
            ...data,
            title: data.title || 'Assigned Common Task',
            subject: data.subject || 'Sciences',
            topic: data.topic || 'General Topic',
            mypYear: data.mypYear || 'All',
            category: data.category || 'Thinking',
            cluster: data.cluster || 'Critical thinking',
            task: data.task,
            teacherName: data.teacherName || 'Teacher',
            createdAt: data.createdAt || new Date().toISOString(),
            academicYear: data.academicYear || DEFAULT_ACADEMIC_YEAR,
            term: data.term || 'Term 1',
            targetStudentNames: Array.isArray(data.targetStudentNames) ? data.targetStudentNames : undefined,
            active: data.active !== false
          } as AssignedTask);
        });
        tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onUpdate(tasks);
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          console.warn('[Firestore] Daily free read quota reached for assigned tasks. Running with offline cached data.');
        } else {
          console.error('Firestore assigned tasks subscription error:', err);
        }
        if (onError) onError(err);
      }
    );
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Failed to set up assigned tasks listener due to quota limit.');
    } else {
      console.error('Failed to set up assigned tasks listener:', err);
    }
    if (onError) onError(err as Error);
    return () => {};
  }
}

/**
 * Save a new or updated assigned task to Firestore
 */
export async function saveAssignedTaskToFirestore(assignedTask: AssignedTask): Promise<void> {
  try {
    const docRef = doc(db, ASSIGNED_COLLECTION_NAME, assignedTask.id);
    const sanitizedTask = await sanitizeAssignedTaskPayload(assignedTask);
    const dataToSave = removeUndefinedFields({
      ...sanitizedTask,
      createdAt: sanitizedTask.createdAt || new Date().toISOString()
    });
    await setDoc(docRef, dataToSave);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Assigned task saved to local offline cache due to daily quota limit.');
      return;
    }
    console.error('Failed to save assigned task to Firestore:', err);
    throw err;
  }
}

/**
 * Update specific fields of an assigned task in Firestore (e.g. changing academicYear)
 */
export async function updateAssignedTaskInFirestore(taskId: string, partial: Partial<AssignedTask>): Promise<void> {
  try {
    const docRef = doc(db, ASSIGNED_COLLECTION_NAME, taskId);
    const dataToUpdate = removeUndefinedFields(partial);
    await setDoc(docRef, dataToUpdate, { merge: true });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Assigned task updated in local cache due to daily quota limit.');
      return;
    }
    console.error('Failed to update assigned task in Firestore:', err);
    throw err;
  }
}

/**
 * Delete an assigned task from Firestore
 */
export async function deleteAssignedTaskFromFirestore(taskId: string): Promise<void> {
  try {
    const docRef = doc(db, ASSIGNED_COLLECTION_NAME, taskId);
    await deleteDoc(docRef);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[Firestore] Assigned task deleted from local cache due to daily quota limit.');
      return;
    }
    console.error('Failed to delete assigned task from Firestore:', err);
    throw err;
  }
}

