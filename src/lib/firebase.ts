import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ATLTaskLog, AssignedTask } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Enable offline IndexedDB persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore offline persistence: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore offline persistence not supported in this browser environment');
    }
  });
} catch (e) {
  console.warn('Could not initialize offline persistence:', e);
}

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
          logs.push({
            id: docSnap.id,
            date: data.date || new Date().toISOString().split('T')[0],
            academicYear: data.academicYear || '2025-2026',
            term: data.term || 'Term 1',
            studentName: data.studentName || 'Anonymous',
            subject: data.subject || 'Sciences',
            topic: data.topic || 'General Topic',
            mypYear: data.mypYear || '1',
            category: data.category || 'Thinking',
            cluster: data.cluster || 'Critical thinking',
            level: data.level || 'Applying',
            taskTitle: data.taskTitle || 'ATL Task',
            responses: data.responses || [],
            feedback: data.feedback || {
              level: data.level || 'Applying',
              summary: '',
              strengths: [],
              next_steps: []
            }
          });
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
 * Save a new or updated task log to Firestore
 */
export async function saveTaskLogToFirestore(log: ATLTaskLog): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, log.id);
    await setDoc(docRef, {
      ...log,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to save log to Firestore:', err);
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
          });
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
    await setDoc(docRef, {
      ...assignedTask,
      createdAt: assignedTask.createdAt || new Date().toISOString()
    });
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

