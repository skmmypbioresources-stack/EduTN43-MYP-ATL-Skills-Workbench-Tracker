import { ATLTaskLog, AssignedTask } from '../types';

const LOGS_CACHE_KEY = 'atl_workbench_logs_v2';
const ASSIGNED_TASKS_CACHE_KEY = 'atl_assigned_tasks_v2';
const IDB_DB_NAME = 'myp_atl_offline_db';
const IDB_STORE_NAME = 'offline_cache';
const IDB_VERSION = 1;

/**
 * Open or initialize the native IndexedDB instance for high-capacity offline storage.
 * IndexedDB has virtually unlimited capacity (hundreds of MBs) compared to localStorage (5MB).
 */
function openOfflineDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_DB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[OfflineDB] IndexedDB could not be opened, using in-memory/Firestore fallback.');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save data to IndexedDB asynchronously without quota limits.
 */
export async function saveToIndexedDB(key: string, data: any): Promise<void> {
  try {
    const db = await openOfflineDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    store.put(data, key);
  } catch (err) {
    // Non-blocking background caching error
    console.debug('[OfflineDB] Background IndexedDB write skipped:', err);
  }
}

/**
 * Retrieve data from IndexedDB asynchronously.
 */
export async function getFromIndexedDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openOfflineDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Strips heavy base64 data URLs (which can be 1-2MB each) and trims redundant fields
 * to create a featherweight (< 100KB) snapshot safe for localStorage.
 */
function sanitizeLogsForLocalStorage(logs: ATLTaskLog[], maxItems = 40): any[] {
  if (!Array.isArray(logs)) return [];
  const subset = logs.slice(0, maxItems);

  return subset.map((log) => {
    const copy: any = { ...log };

    // Strip heavy base64 strings from student attachments
    if (Array.isArray(copy.studentAttachments)) {
      copy.studentAttachments = copy.studentAttachments.map((att: any) => ({
        id: att.id,
        name: att.name,
        caption: att.caption,
        url: typeof att.url === 'string' && att.url.startsWith('data:') ? '' : att.url,
      }));
    }

    // Strip heavy base64 strings from stimulus images
    if (Array.isArray(copy.stimulusImages)) {
      copy.stimulusImages = copy.stimulusImages.map((img: any) => ({
        id: img.id,
        name: img.name,
        caption: img.caption,
        url: typeof img.url === 'string' && img.url.startsWith('data:') ? '' : img.url,
      }));
    }

    // Strip heavy base64 strings from question response attachments
    if (Array.isArray(copy.responses)) {
      copy.responses = copy.responses.map((resp: any) => {
        if (!resp || !Array.isArray(resp.attachments)) return resp;
        return {
          ...resp,
          attachments: resp.attachments.map((att: any) => ({
            id: att.id,
            name: att.name,
            caption: att.caption,
            url: typeof att.url === 'string' && att.url.startsWith('data:') ? '' : att.url,
          })),
        };
      });
    }

    // Omit large duplicated originalTask payload if present
    if (copy.originalTask) {
      delete copy.originalTask;
    }

    return copy;
  });
}

/**
 * Strips heavy stimulus data URLs from assigned tasks before localStorage caching.
 */
function sanitizeAssignedTasksForLocalStorage(tasks: AssignedTask[], maxItems = 30): any[] {
  if (!Array.isArray(tasks)) return [];
  const subset = tasks.slice(0, maxItems);

  return subset.map((t) => {
    const copy: any = { ...t };
    if (Array.isArray(copy.stimulusImages)) {
      copy.stimulusImages = copy.stimulusImages.map((img: any) => ({
        ...img,
        url: typeof img.url === 'string' && img.url.startsWith('data:') ? '' : img.url,
      }));
    }
    if (copy.task && Array.isArray(copy.task.stimulusImages)) {
      copy.task = {
        ...copy.task,
        stimulusImages: copy.task.stimulusImages.map((img: any) => ({
          ...img,
          url: typeof img.url === 'string' && img.url.startsWith('data:') ? '' : img.url,
        })),
      };
    }
    return copy;
  });
}

/**
 * Safely writes to localStorage with progressive quota fallback and cleanup.
 * Prevents QuotaExceededError from throwing and stops unhandled console errors.
 */
export function safeSetLocalStorageItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      // 1. Attempt to clean legacy or stale keys
      try {
        const legacyKeys = ['atl_workbench_logs', 'atl_assigned_tasks', 'atl_logs'];
        legacyKeys.forEach((k) => {
          if (k !== key) localStorage.removeItem(k);
        });
      } catch {
        // ignore
      }

      // 2. If it's a JSON array, try slicing it more aggressively
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 5) {
          const minimalSubset = parsed.slice(0, 10);
          localStorage.setItem(key, JSON.stringify(minimalSubset));
          return true;
        }
      } catch {
        // ignore
      }

      // 3. If it still doesn't fit, remove the problematic key to avoid leaving corrupt/bloated state
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }

      console.warn(`[SafeStorage] LocalStorage quota reached for "${key}". Offline cache pruned safely; full data is preserved in Firestore & IndexedDB.`);
      return false;
    }

    console.warn(`[SafeStorage] Non-quota error while setting "${key}":`, err);
    return false;
  }
}

/**
 * Safely reads from localStorage without throwing.
 */
export function safeGetLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Failed to read "${key}" from localStorage:`, err);
    return null;
  }
}

/**
 * Cache Task Logs in localStorage safely (sanitized + capped) and also in IndexedDB.
 */
export function cacheTaskLogsLocally(logs: ATLTaskLog[]): void {
  if (!logs || !Array.isArray(logs)) return;

  // 1. Save full data (including attachments) to IndexedDB asynchronously
  saveToIndexedDB(LOGS_CACHE_KEY, logs);

  // 2. Sanitize and save lightweight subset to localStorage for instantaneous initial load
  try {
    const lightweight = sanitizeLogsForLocalStorage(logs, 35);
    safeSetLocalStorageItem(LOGS_CACHE_KEY, JSON.stringify(lightweight));
  } catch (err) {
    console.warn('[SafeStorage] Skipping localStorage log caching:', err);
  }
}

/**
 * Cache Assigned Tasks in localStorage safely (sanitized + capped) and also in IndexedDB.
 */
export function cacheAssignedTasksLocally(tasks: AssignedTask[]): void {
  if (!tasks || !Array.isArray(tasks)) return;

  // 1. Save full data to IndexedDB asynchronously
  saveToIndexedDB(ASSIGNED_TASKS_CACHE_KEY, tasks);

  // 2. Sanitize and save lightweight subset to localStorage
  try {
    const lightweight = sanitizeAssignedTasksForLocalStorage(tasks, 25);
    safeSetLocalStorageItem(ASSIGNED_TASKS_CACHE_KEY, JSON.stringify(lightweight));
  } catch (err) {
    console.warn('[SafeStorage] Skipping localStorage assigned tasks caching:', err);
  }
}

/**
 * One-time startup check to prune any oversized existing localStorage cache
 * that may have previously filled up the quota.
 */
export function cleanBloatedLocalStorageIfNecessary(): void {
  if (typeof window === 'undefined') return;
  try {
    const logsCache = localStorage.getItem(LOGS_CACHE_KEY);
    // If the cache in localStorage is larger than 1.2 MB, prune it immediately
    if (logsCache && logsCache.length > 1.2 * 1024 * 1024) {
      try {
        const parsed = JSON.parse(logsCache);
        if (Array.isArray(parsed)) {
          const trimmed = sanitizeLogsForLocalStorage(parsed, 20);
          localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(trimmed));
        } else {
          localStorage.removeItem(LOGS_CACHE_KEY);
        }
      } catch {
        localStorage.removeItem(LOGS_CACHE_KEY);
      }
    }
  } catch {
    // ignore
  }
}
