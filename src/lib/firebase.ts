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
import { ATLTaskLog, AssignedTask } from '../types';
import { resolveFormativeScore } from './scoreUtils';
import { getStudentEvidenceToken } from './evidenceUtils';

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
          const computedScore = typeof data.formativeScore === 'number'
            ? data.formativeScore
            : (data.feedback && typeof data.feedback.formativeScore === 'number'
                ? data.feedback.formativeScore
                : resolveFormativeScore(data));

          const studentName = data.studentName || 'Anonymous';
          const mypYear = data.mypYear || '1';
          const evidenceToken = data.evidenceToken || getStudentEvidenceToken(studentName, mypYear);

          logs.push({
            id: docSnap.id,
            ...data,
            date: data.date || new Date().toISOString().split('T')[0],
            academicYear: data.academicYear || '2025-2026',
            term: data.term || 'Term 1',
            studentName,
            subject: data.subject || 'Sciences',
            topic: data.topic || 'General Topic',
            mypYear,
            category: data.category || 'Thinking',
            cluster: data.cluster || 'Critical thinking',
            level: data.level || 'Applying',
            formativeScore: computedScore,
            taskTitle: data.taskTitle || 'ATL Task',
            evidenceToken,
            responses: data.responses || [],
            feedback: data.feedback ? {
              ...data.feedback,
              level: data.feedback.level || data.level || 'Applying',
              formativeScore: typeof data.feedback.formativeScore === 'number' ? data.feedback.formativeScore : computedScore,
            } : {
              level: data.level || 'Applying',
              formativeScore: computedScore,
              summary: '',
              strengths: [],
              next_steps: []
            }
          } as ATLTaskLog);
        });
        onUpdate(logs);
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error('Failed to set up Firestore listener:', err);
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
    const dataToSave = removeUndefinedFields({
      ...log,
      evidenceToken: token,
      createdAt: new Date().toISOString()
    });
    await setDoc(docRef, dataToSave);
  } catch (err) {
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
    console.error('Failed to update student reflection in Firestore:', err);
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
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
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
            mypYear: data.mypYear || '1',
            category: data.category || 'Thinking',
            cluster: data.cluster || 'Critical thinking',
            task: data.task,
            teacherName: data.teacherName || 'Teacher',
            createdAt: data.createdAt || new Date().toISOString(),
            academicYear: data.academicYear || '2025-2026',
            term: data.term || 'Term 1',
            active: data.active !== false
          } as AssignedTask);
        });
        onUpdate(tasks);
      },
      (err) => {
        console.error('Firestore assigned tasks subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error('Failed to set up assigned tasks listener:', err);
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
    const dataToSave = removeUndefinedFields({
      ...assignedTask,
      createdAt: assignedTask.createdAt || new Date().toISOString()
    });
    await setDoc(docRef, dataToSave);
  } catch (err) {
    console.error('Failed to save assigned task to Firestore:', err);
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
    console.error('Failed to delete assigned task from Firestore:', err);
    throw err;
  }
}

