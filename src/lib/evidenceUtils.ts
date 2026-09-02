import { ATLTaskLog, StudentEvidenceRosterItem, StudentRecord } from '../types';
import { resolveFormativeScore } from './scoreUtils';
import { ALL_STUDENTS_ROSTER, DEFAULT_STUDENTS_BY_CLASS } from '../data/atlData';

const TOKEN_CACHE_KEY = 'atl_student_evidence_tokens_v1';
const CUSTOM_ROSTER_KEY = 'atl_custom_student_roster_v1';
const CUSTOM_BASE_URL_KEY = 'atl_custom_base_url_v1';
export const DEFAULT_PRODUCTION_URL = 'https://edu-tn-43-myp-atl-skills-workbench.vercel.app';

/**
 * Gets the configured base URL for sharing student links
 */
export function getConfiguredBaseUrl(): string {
  try {
    const saved = localStorage.getItem(CUSTOM_BASE_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch (e) {
    console.error('Failed to read custom base URL:', e);
  }
  return DEFAULT_PRODUCTION_URL;
}

/**
 * Saves a custom base URL (e.g. Vercel deployment link)
 */
export function setConfiguredBaseUrl(url: string): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(CUSTOM_BASE_URL_KEY);
    } else {
      localStorage.setItem(CUSTOM_BASE_URL_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch (e) {
    console.error('Failed to save custom base URL:', e);
  }
}

export interface CustomStudentEntry {
  id?: string;
  studentId?: string;
  name: string;
  mypYear: string;
  classSection?: string;
  subject?: string;
  createdAt?: string;
}

/**
 * Gets custom students saved by teacher in localStorage
 */
export function getCustomStudents(): CustomStudentEntry[] {
  try {
    const stored = localStorage.getItem(CUSTOM_ROSTER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const officialMap = new Map<string, StudentRecord>();
        ALL_STUDENTS_ROSTER.forEach((s) => {
          officialMap.set(s.name.trim().toLowerCase(), s);
          officialMap.set(s.id.trim(), s);
        });

        const seenNames = new Set<string>();
        const seenIds = new Set<string>();
        const result: CustomStudentEntry[] = [];

        parsed.forEach((s: CustomStudentEntry) => {
          if (!s || !s.name || !s.name.trim()) return;
          const cleanName = s.name.trim();
          const normName = cleanName.toLowerCase();
          const cleanYear = (s.mypYear || '2').replace(/\D/g, '') || '2';
          const studentId = cleanTo4DigitId(s.id || s.studentId || '', cleanName, cleanYear);

          // If student already exists in official roster, ignore custom copy or sync with official
          if (officialMap.has(normName) || officialMap.has(studentId)) {
            return;
          }

          if (!seenNames.has(normName) && !seenIds.has(studentId)) {
            seenNames.add(normName);
            seenIds.add(studentId);
            result.push({
              ...s,
              id: studentId,
              studentId: studentId,
              name: cleanName,
              mypYear: cleanYear,
            });
          }
        });

        return result;
      }
    }
  } catch (e) {
    console.error('Failed to read custom student roster from localStorage:', e);
  }
  return [];
}

/**
 * Helper to ensure student ID is a clean 4-digit string
 */
export function cleanTo4DigitId(rawId: string, name: string = '', mypYear: string = '2'): string {
  const digits = (rawId || '').replace(/\D/g, '');
  if (digits.length === 4) {
    return digits;
  }
  if (digits.length > 4) {
    return digits.substring(0, 4);
  }
  return generateStudentUniqueId(name, mypYear);
}

/**
 * Generates a clean 4-digit student ID matching original student roster
 */
export function generateStudentUniqueId(name: string, mypYear: string = '2'): string {
  const cleanName = name.trim().toLowerCase();
  // Check if student exists in the official roster
  const known = ALL_STUDENTS_ROSTER.find(
    (s) => s.name.toLowerCase() === cleanName || s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase())
  );
  if (known) return known.id;

  const seed = `${cleanName}-${mypYear}-student-id`;
  const numHash = Math.abs(simpleNumericHash(seed));
  // Return pure 4-digit ID between 7000 and 8999
  return String(7000 + (numHash % 2000));
}

function simpleNumericHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  const positive = Math.abs(hash);
  return 1000 + (positive % 9000);
}

/**
 * Saves a new custom student to the roster
 */
export function saveCustomStudent(
  name: string,
  mypYear: string = '2',
  subject: string = 'Science • Biology',
  id?: string,
  classSection?: string
): CustomStudentEntry {
  const cleanName = name.trim();
  const cleanYear = mypYear.replace(/\D/g, '') || '2';
  const custom = getCustomStudents();
  const existingIdx = custom.findIndex((s) => s.name.toLowerCase() === cleanName.toLowerCase());

  const studentId = cleanTo4DigitId(id || custom[existingIdx]?.studentId || custom[existingIdx]?.id || '', cleanName, cleanYear);

  const newEntry: CustomStudentEntry = {
    id: studentId,
    studentId: studentId,
    name: cleanName,
    mypYear: cleanYear,
    classSection: classSection || (cleanYear === '2' ? 'MYP 2C' : `MYP ${cleanYear}`),
    subject: subject.trim() || 'Science • Biology',
    createdAt: custom[existingIdx]?.createdAt || new Date().toISOString()
  };

  if (existingIdx >= 0) {
    custom[existingIdx] = newEntry;
  } else {
    custom.push(newEntry);
  }

  try {
    localStorage.setItem(CUSTOM_ROSTER_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to save custom student to localStorage:', e);
  }

  // Pre-generate and cache token
  getStudentEvidenceToken(cleanName, cleanYear);
  return newEntry;
}

/**
 * Updates an existing custom student (handles name changes)
 */
export function updateCustomStudent(
  originalName: string,
  updated: { name: string; mypYear: string; subject?: string; studentId?: string; classSection?: string }
): CustomStudentEntry {
  const custom = getCustomStudents();
  const idx = custom.findIndex((s) => s.name.toLowerCase() === originalName.trim().toLowerCase());
  const existingId = updated.studentId || (idx >= 0 ? (custom[idx].studentId || custom[idx].id) : undefined);

  // Remove old entry if name changed
  if (idx >= 0 && originalName.trim().toLowerCase() !== updated.name.trim().toLowerCase()) {
    deleteCustomStudent(originalName);
  }

  return saveCustomStudent(
    updated.name,
    updated.mypYear,
    updated.subject || 'Science • Biology',
    existingId,
    updated.classSection
  );
}

/**
 * Deletes a custom student from the roster
 */
export function deleteCustomStudent(name: string): void {
  const cleanName = name.trim().toLowerCase();
  const custom = getCustomStudents().filter((s) => s.name.toLowerCase() !== cleanName);
  try {
    localStorage.setItem(CUSTOM_ROSTER_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to delete custom student from localStorage:', e);
  }
}

/**
 * Normalizes student name into a clean, lowercased alphanumeric slug
 */
export function slugifyStudentName(name: string): string {
  if (!name) return 'student';
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove MYP tags like (MYP 1)
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'student';
}

/**
 * Deterministic short hash code from string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const positive = Math.abs(hash);
  return positive.toString(36).substring(0, 6);
}

/**
 * Gets cached custom tokens mapped from localStorage
 */
function getCachedTokens(): Record<string, string> {
  try {
    const stored = localStorage.getItem(TOKEN_CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to read evidence tokens from localStorage:', e);
  }
  return {};
}

/**
 * Stores a custom token for a student
 */
export function setCachedToken(studentName: string, token: string): void {
  try {
    const cached = getCachedTokens();
    cached[studentName.trim().toLowerCase()] = token.trim();
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.error('Failed to save evidence token to localStorage:', e);
  }
}

/**
 * Canonical Student Representation
 */
export interface CanonicalStudentInfo {
  canonicalName: string;
  studentId: string;
  mypYear: string;
  classSection: string;
  subject: string;
  canonicalToken: string;
  aliases: string[];
}

/**
 * Computes a deterministic canonical token for a student
 */
export function computeCanonicalToken(canonicalName: string, studentId: string, mypYear: string): string {
  const slug = slugifyStudentName(canonicalName);
  const seed = `${canonicalName}-${studentId}-${mypYear}-toddle-portal-2025`;
  const hash = simpleHash(seed);
  return `${slug}-${hash}`;
}

/**
 * Finds or constructs the single canonical identity for any student reference.
 * Resolves short names ("Aarya"), full names ("AARYA SUDHIR BHOSLE"), IDs ("8547"),
 * and tokens ("aarya-sudhir-bhosle-...", "aarya-...") to the exact same canonical profile.
 */
export function findCanonicalStudent(
  identifier: string,
  hintMypYear?: string
): CanonicalStudentInfo {
  const clean = (identifier || '').trim();
  const lower = clean.toLowerCase();
  const cleanYear = hintMypYear ? hintMypYear.replace(/\D/g, '') : '';

  // Helper to build a complete CanonicalStudentInfo object
  const buildCanonical = (
    name: string,
    id: string,
    year: string,
    section?: string,
    subject?: string,
    extraAliases: string[] = []
  ): CanonicalStudentInfo => {
    const canonicalName = name.trim();
    const studentId = id.trim();
    const mypYear = (year || '2').replace(/\D/g, '') || '2';
    const classSection = section || (mypYear === '2' ? 'MYP 2C' : `MYP ${mypYear}`);
    const finalSubject = subject || 'Science • Biology';
    const canonicalToken = computeCanonicalToken(canonicalName, studentId, mypYear);

    const aliases = Array.from(new Set([
      canonicalName.toLowerCase(),
      studentId,
      canonicalToken.toLowerCase(),
      slugifyStudentName(canonicalName),
      ...canonicalName.toLowerCase().split(/\s+/),
      ...extraAliases.map((a) => a.toLowerCase().trim())
    ])).filter(Boolean);

    // Cache token for canonical name and all aliases
    aliases.forEach((alias) => {
      setCachedToken(alias, canonicalToken);
    });

    return {
      canonicalName,
      studentId,
      mypYear,
      classSection,
      subject: finalSubject,
      canonicalToken,
      aliases
    };
  };

  // If empty or default generic, return student fallback
  if (!clean || lower === 'student') {
    return buildCanonical('Student', '0000', cleanYear || '2', 'MYP 2C', 'Science • Biology');
  }

  // 1. Direct match on 4-digit Student ID in official roster
  if (/^\d{4}$/.test(lower)) {
    const idMatch = ALL_STUDENTS_ROSTER.find((s) => s.id === lower);
    if (idMatch) {
      return buildCanonical(idMatch.name, idMatch.id, idMatch.mypYear, idMatch.classSection, idMatch.subject);
    }
  }

  // 2. Direct exact match on official student name
  const exactOfficial = ALL_STUDENTS_ROSTER.find(
    (s) => s.name.toLowerCase() === lower
  );
  if (exactOfficial) {
    return buildCanonical(exactOfficial.name, exactOfficial.id, exactOfficial.mypYear, exactOfficial.classSection, exactOfficial.subject);
  }

  // 3. Match custom students from localStorage
  const customList = getCustomStudents();
  for (const cs of customList) {
    if (cs.name.toLowerCase() === lower || cs.studentId === lower || cs.id === lower) {
      return buildCanonical(cs.name, cs.studentId || cs.id || '7500', cs.mypYear, cs.classSection, cs.subject);
    }
  }

  // 4. Match by token / slug
  // Check if identifier is an existing token or matches a student slug
  const parts = lower.split('-');
  const slugPart = parts.length > 1 ? parts.slice(0, -1).join('-') : lower;

  const candidates = cleanYear
    ? ALL_STUDENTS_ROSTER.filter((s) => s.mypYear === cleanYear)
    : ALL_STUDENTS_ROSTER;

  const tokenMatch = candidates.find((s) => {
    const sSlug = slugifyStudentName(s.name);
    return lower === sSlug || lower.startsWith(`${sSlug}-`) || sSlug.startsWith(lower) || sSlug === slugPart || sSlug.startsWith(slugPart) || slugPart.startsWith(sSlug);
  });
  if (tokenMatch) {
    return buildCanonical(tokenMatch.name, tokenMatch.id, tokenMatch.mypYear, tokenMatch.classSection, tokenMatch.subject, [clean, slugPart]);
  }

  // 5. Match by First Name / Name Substring within candidate pool
  // 5a. First name match (e.g. "Aarya" matches "AARYA SUDHIR BHOSLE")
  const firstNameMatches = candidates.filter((s) => {
    const firstWord = s.name.trim().split(/\s+/)[0].toLowerCase();
    return firstWord === lower || firstWord === slugPart;
  });
  if (firstNameMatches.length === 1) {
    const m = firstNameMatches[0];
    return buildCanonical(m.name, m.id, m.mypYear, m.classSection, m.subject, [clean]);
  }

  // If no single match in filtered candidates, search across all official students
  if (cleanYear && firstNameMatches.length === 0) {
    const allFirstMatches = ALL_STUDENTS_ROSTER.filter((s) => {
      const firstWord = s.name.trim().split(/\s+/)[0].toLowerCase();
      return firstWord === lower || firstWord === slugPart;
    });
    if (allFirstMatches.length === 1) {
      const m = allFirstMatches[0];
      return buildCanonical(m.name, m.id, m.mypYear, m.classSection, m.subject, [clean]);
    }
  }

  // 5b. Words subset match (e.g. "Aarya Bhosle" matches "AARYA SUDHIR BHOSLE")
  const inputWords = lower.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean);
  if (inputWords.length > 0) {
    const subsetMatches = candidates.filter((s) => {
      const targetWords = s.name.toLowerCase().split(/\s+/).filter(Boolean);
      return inputWords.every((w) => targetWords.includes(w));
    });
    if (subsetMatches.length === 1) {
      const m = subsetMatches[0];
      return buildCanonical(m.name, m.id, m.mypYear, m.classSection, m.subject, [clean]);
    }
  }

  // 6. Match custom student first name
  for (const cs of customList) {
    const firstWord = cs.name.trim().split(/\s+/)[0].toLowerCase();
    if (firstWord === lower || firstWord === slugPart) {
      return buildCanonical(cs.name, cs.studentId || cs.id || '7500', cs.mypYear, cs.classSection, cs.subject, [clean]);
    }
  }

  // 7. Fallback: Stable canonical record for unlisted/ad-hoc student
  const finalYear = cleanYear || '2';
  const generatedId = cleanTo4DigitId('', clean, finalYear);
  return buildCanonical(clean, generatedId, finalYear, finalYear === '2' ? 'MYP 2C' : `MYP ${finalYear}`, 'Science • Biology');
}

/**
 * Checks if two student identifiers (names, tokens, or IDs) refer to the exact same student
 */
export function isSameStudent(
  identA: string,
  identB: string,
  yearA?: string,
  yearB?: string
): boolean {
  if (!identA || !identB) return false;
  const cleanA = identA.trim().toLowerCase();
  const cleanB = identB.trim().toLowerCase();
  if (cleanA === cleanB) return true;

  const canonA = findCanonicalStudent(identA, yearA);
  const canonB = findCanonicalStudent(identB, yearB);

  if (canonA.studentId && canonB.studentId && canonA.studentId === canonB.studentId) {
    return true;
  }
  if (canonA.canonicalName.toLowerCase() === canonB.canonicalName.toLowerCase()) {
    return true;
  }
  if (canonA.canonicalToken === canonB.canonicalToken) {
    return true;
  }

  return false;
}

/**
 * Generates a unique, deterministic, and tamper-proof evidence token for a student
 * Always resolves to the single canonical token for that student
 */
export function getStudentEvidenceToken(studentName: string, mypYear?: string): string {
  const cleanName = (studentName || '').trim();
  if (!cleanName || cleanName.toLowerCase() === 'student') {
    return 'student-portal';
  }

  const canonical = findCanonicalStudent(cleanName, mypYear);
  return canonical.canonicalToken;
}

/**
 * Returns the current application base URL (origin + pathname)
 * Prefers the configured Vercel production URL if specified, or auto-detects from window.location
 */
export function getAppBaseUrl(preferProduction: boolean = true): string {
  if (preferProduction) {
    const configured = getConfiguredBaseUrl();
    if (configured) return configured;
  }
  if (typeof window === 'undefined') return DEFAULT_PRODUCTION_URL;
  const { protocol, host, pathname } = window.location;
  // Ensure we get clean origin and pathname
  const cleanPath = pathname === '/' ? '' : pathname;
  return `${protocol}//${host}${cleanPath}`;
}

/**
 * Constructs the standalone Student Personal Folder URL.
 * Guarantees that the URL is always uniform and uses canonical parameters.
 */
export function getStudentEvidenceUrl(token: string, studentName?: string, mypYear?: string, customBase?: string): string {
  const base = customBase ? customBase.replace(/\/+$/, '') : getAppBaseUrl(true);

  // Resolve to canonical student so the URL is 100% unified
  const identifier = studentName || token;
  const canonical = identifier ? findCanonicalStudent(identifier, mypYear) : null;
  const finalToken = canonical ? canonical.canonicalToken : token;
  const finalName = canonical ? canonical.canonicalName : studentName;
  const finalYear = canonical ? canonical.mypYear : (mypYear ? mypYear.replace(/\D/g, '') : undefined);

  const params = new URLSearchParams();
  if (finalName) {
    params.set('student', finalName);
  }
  if (finalYear) {
    params.set('year', finalYear);
  }
  params.set('token', finalToken);
  return `${base}?${params.toString()}`;
}

/**
 * Resolves a student from a token, student ID, or student name string against logs and rosters.
 * Always returns the canonical student name, year, ID, and class section.
 */
export function resolveStudentByToken(
  tokenOrName: string,
  logs: ATLTaskLog[],
  sampleStudents: string[] = []
): { studentName: string; mypYear?: string; studentId?: string; classSection?: string } | null {
  if (!tokenOrName) return null;

  // Check if token directly matches a log
  const logMatch = logs.find(
    (l) => (l.evidenceToken && l.evidenceToken.toLowerCase() === tokenOrName.trim().toLowerCase()) ||
           (l.studentName && l.studentName.toLowerCase().trim() === tokenOrName.trim().toLowerCase())
  );
  const seedName = logMatch?.studentName || tokenOrName;
  const seedYear = logMatch?.mypYear;

  const canonical = findCanonicalStudent(seedName, seedYear);
  if (canonical) {
    return {
      studentName: canonical.canonicalName,
      mypYear: canonical.mypYear,
      studentId: canonical.studentId,
      classSection: canonical.classSection
    };
  }

  return null;
}

/**
 * Builds the complete Toddle / LMS Student Roster with analytics & portal links.
 * Guarantees zero duplicate entries by aggregating into the single canonical identity.
 */
export function buildStudentEvidenceRoster(
  logs: ATLTaskLog[],
  academicYear: string = '2025-2026',
  sampleStudents: string[] = []
): StudentEvidenceRosterItem[] {
  // Canonical map: canonical studentId -> student data object
  const studentMap = new Map<string, {
    canonicalName: string;
    studentId: string;
    mypYear: string;
    classSection: string;
    subject: string;
    logs: ATLTaskLog[];
  }>();

  // 1. Populate all predefined official students
  ALL_STUDENTS_ROSTER.forEach((st) => {
    const canon = findCanonicalStudent(st.name, st.mypYear);
    studentMap.set(canon.studentId, {
      canonicalName: canon.canonicalName,
      studentId: canon.studentId,
      mypYear: canon.mypYear,
      classSection: canon.classSection,
      subject: canon.subject,
      logs: []
    });
  });

  // 2. Merge custom students from teacher roster
  const customStudents = getCustomStudents();
  customStudents.forEach((cs) => {
    if (!cs || !cs.name || !cs.name.trim()) return;
    const canon = findCanonicalStudent(cs.name, cs.mypYear);
    if (!studentMap.has(canon.studentId)) {
      studentMap.set(canon.studentId, {
        canonicalName: canon.canonicalName,
        studentId: canon.studentId,
        mypYear: canon.mypYear,
        classSection: cs.classSection || canon.classSection,
        subject: cs.subject || canon.subject,
        logs: []
      });
    }
  });

  // 3. Process logs and attach to the single canonical student
  logs.forEach((log) => {
    if (log.academicYear === academicYear && log.studentName && log.studentName.trim()) {
      const canon = findCanonicalStudent(log.studentId || log.studentName, log.mypYear);
      if (studentMap.has(canon.studentId)) {
        studentMap.get(canon.studentId)!.logs.push(log);
      } else {
        studentMap.set(canon.studentId, {
          canonicalName: canon.canonicalName,
          studentId: canon.studentId,
          mypYear: canon.mypYear,
          classSection: log.classSection || canon.classSection,
          subject: log.subject || canon.subject,
          logs: [log]
        });
      }
    }
  });

  // 4. Build output roster ensuring 100% unique tokens and IDs
  const roster: StudentEvidenceRosterItem[] = [];
  const seenTokens = new Set<string>();
  const seenIds = new Set<string>();

  studentMap.forEach((data) => {
    const studentName = data.canonicalName;
    const studentLogs = data.logs;
    const token = getStudentEvidenceToken(studentName, data.mypYear);
    const url = getStudentEvidenceUrl(token, studentName, data.mypYear);

    // If duplicate token encountered, do not duplicate in UI
    if (seenTokens.has(token) || seenIds.has(data.studentId)) {
      return;
    }
    seenTokens.add(token);
    seenIds.add(data.studentId);

    // Calculate score average
    let totalScore = 0;
    let scoreCount = 0;
    const levelCounts = { extending: 0, applying: 0, developing: 0 };
    const clusterCounts: Record<string, number> = {};

    studentLogs.forEach((l) => {
      const score = typeof l.formativeScore === 'number'
        ? l.formativeScore
        : (l.feedback && typeof l.feedback.formativeScore === 'number'
            ? l.feedback.formativeScore
            : resolveFormativeScore(l));

      totalScore += score;
      scoreCount += 1;

      if (l.level === 'Extending') levelCounts.extending += 1;
      else if (l.level === 'Applying') levelCounts.applying += 1;
      else levelCounts.developing += 1;

      clusterCounts[l.cluster] = (clusterCounts[l.cluster] || 0) + 1;
    });

    const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;

    // Find top cluster
    let topCluster = 'None';
    let maxClusterCount = 0;
    Object.entries(clusterCounts).forEach(([cluster, count]) => {
      if (count > maxClusterCount) {
        maxClusterCount = count;
        topCluster = cluster;
      }
    });

    // Find latest activity date
    let latestActivityDate = 'No activity yet';
    if (studentLogs.length > 0) {
      const sortedDates = [...studentLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      latestActivityDate = sortedDates[0].date || 'Recent';
    }

    roster.push({
      studentId: data.studentId,
      studentName: data.canonicalName,
      canonicalName: data.canonicalName,
      mypYear: data.mypYear,
      classSection: data.classSection,
      subject: data.subject,
      logsCount: studentLogs.length,
      evidenceToken: token,
      evidenceUrl: url,
      averageScore,
      latestActivityDate,
      topCluster,
      masteryDistribution: levelCounts
    });
  });

  // Sort roster by class then student name
  return roster.sort((a, b) => {
    if (a.mypYear !== b.mypYear) {
      return a.mypYear.localeCompare(b.mypYear);
    }
    return a.studentName.localeCompare(b.studentName);
  });
}

/**
 * Exports the Toddle / LMS Student Links Roster as a clean CSV spreadsheet
 */
export function exportToddleRosterCsv(
  roster: StudentEvidenceRosterItem[],
  academicYear: string,
  classFilter = 'All_Classes'
): void {
  const headers = [
    'Student Name',
    'MYP Class / Grade',
    'Academic Year',
    'Total Evidence Tasks',
    'Average Formative Score (/8)',
    'Latest Submission Date',
    'Top ATL Skill Cluster',
    'Extending Count',
    'Applying Count',
    'Developing Count',
    'Evidence Portal Token',
    'Toddle / LMS Evidence Portal Link'
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = roster.map((item) => [
    escapeCsv(item.studentName),
    escapeCsv(`MYP ${item.mypYear}`),
    escapeCsv(academicYear),
    escapeCsv(item.logsCount),
    escapeCsv(item.logsCount > 0 ? `${item.averageScore}/8` : 'N/A'),
    escapeCsv(item.latestActivityDate),
    escapeCsv(item.topCluster),
    escapeCsv(item.masteryDistribution.extending),
    escapeCsv(item.masteryDistribution.applying),
    escapeCsv(item.masteryDistribution.developing),
    escapeCsv(item.evidenceToken),
    escapeCsv(item.evidenceUrl)
  ].join(','));

  const csvContent = '\ufeff' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `Toddle_ATL_Evidence_Links_${classFilter}_${academicYear}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to clipboard safely across iframe and browser contexts
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, falling back to textarea execCommand:', err);
  }

  // Fallback
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    console.error('Failed to copy to clipboard:', e);
    return false;
  }
}
