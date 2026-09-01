import React, { useState, useMemo } from 'react';
import { ATLTaskLog, StudentEvidenceRosterItem } from '../types';
import {
  buildStudentEvidenceRoster,
  exportToddleRosterCsv,
  copyToClipboard,
  saveCustomStudent,
  updateCustomStudent,
  deleteCustomStudent,
  getStudentEvidenceUrl,
  getConfiguredBaseUrl,
  setConfiguredBaseUrl,
  DEFAULT_PRODUCTION_URL
} from '../lib/evidenceUtils';
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  GraduationCap,
  Layers,
  Link as LinkIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';

interface ToddleLinkManagerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  logs: ATLTaskLog[];
  academicYear: string;
  sampleStudents?: string[];
  onOpenStudentPortal: (studentName: string, evidenceToken: string, mypYear?: string) => void;
}

const formatClassLabel = (yearKey: string): string => {
  const clean = yearKey.replace(/^MYP\s*/i, '').trim();
  switch (clean) {
    case '1': return 'MYP 1 (Grade 6)';
    case '2': return 'MYP 2 (Grade 7)';
    case '3': return 'MYP 3 (Grade 8)';
    case '4': return 'MYP 4 (Grade 9)';
    case '5': return 'MYP 5 (Grade 10)';
    default: return `MYP ${clean}`;
  }
};

const SUBJECT_OPTIONS = [
  'Science • Biology',
  'Science • Chemistry',
  'Science • Physics',
  'Sciences • Integrated',
  'Language & Literature • English',
  'Language Acquisition • Spanish',
  'Language Acquisition • French',
  'Individuals & Societies • History',
  'Individuals & Societies • Geography',
  'Mathematics • Standard',
  'Mathematics • Extended',
  'Arts • Visual Arts',
  'Arts • Drama',
  'Design • Digital & Product',
  'Physical & Health Education'
];

export const ToddleLinkManagerModal: React.FC<ToddleLinkManagerModalProps> = ({
  isOpen = true,
  onClose,
  logs,
  academicYear,
  sampleStudents = [],
  onOpenStudentPortal
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // New Student Addition Form State
  const [isAddingStudent, setIsAddingStudent] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentYear, setNewStudentYear] = useState<string>('2');
  const [newStudentSubject, setNewStudentSubject] = useState<string>('Science • Biology');
  const [rosterRefreshKey, setRosterRefreshKey] = useState<number>(0);

  // Editing Student Modal State
  const [editingStudent, setEditingStudent] = useState<StudentEvidenceRosterItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editYear, setEditYear] = useState<string>('2');
  const [editSubject, setEditSubject] = useState<string>('Science • Biology');

  // Base URL State
  const [baseUrlInput, setBaseUrlInput] = useState<string>(() => getConfiguredBaseUrl());
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState<boolean>(false);
  const [baseUrlSavedMsg, setBaseUrlSavedMsg] = useState<boolean>(false);

  // Build the complete student evidence roster
  const fullRoster = useMemo(() => {
    return buildStudentEvidenceRoster(logs, academicYear, sampleStudents);
  }, [logs, academicYear, sampleStudents, rosterRefreshKey]);

  // Filter roster by class and search
  const filteredRoster = useMemo(() => {
    return fullRoster.filter((item) => {
      const matchClass = selectedClass === 'All' || item.mypYear === selectedClass || `MYP ${item.mypYear}` === selectedClass;
      const matchSearch = !searchQuery ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.evidenceToken.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.studentId && item.studentId.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchSearch;
    });
  }, [fullRoster, selectedClass, searchQuery]);

  // Class counts summary
  const classSummary = useMemo(() => {
    const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    fullRoster.forEach((item) => {
      const yr = (item.mypYear || '3').replace(/\D/g, '');
      if (counts[yr] !== undefined) {
        counts[yr] += 1;
      }
    });
    return counts;
  }, [fullRoster]);

  if (isOpen === false) return null;

  const handleCopySingle = async (url: string, id: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    saveCustomStudent(newStudentName.trim(), newStudentYear, newStudentSubject);
    setNewStudentName('');
    setIsAddingStudent(false);
    setRosterRefreshKey((k) => k + 1);
  };

  const startEditingStudent = (student: StudentEvidenceRosterItem) => {
    setEditingStudent(student);
    setEditName(student.studentName);
    setEditYear(student.mypYear || '2');
    setEditSubject(student.subject || 'Science • Biology');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName.trim()) return;
    updateCustomStudent(editingStudent.studentName, {
      name: editName.trim(),
      mypYear: editYear,
      subject: editSubject
    });
    setEditingStudent(null);
    setRosterRefreshKey((k) => k + 1);
  };

  const handleDeleteStudent = (name: string) => {
    if (confirm(`Remove "${name}" from roster?`)) {
      deleteCustomStudent(name);
      setRosterRefreshKey((k) => k + 1);
    }
  };

  const handleCopyAllLinks = async () => {
    if (filteredRoster.length === 0) return;
    const lines = [
      `# Toddle / LMS Student Evidence Links (${selectedClass === 'All' ? 'All Classes' : `MYP ${selectedClass}`}) - AY ${academicYear}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      '| Student Name | Student ID | Class & Subject | ATL Skills Logged | Student Personal Link |',
      '| :--- | :--- | :--- | :--- | :--- |',
      ...filteredRoster.map((s) => `| ${s.studentName} | ${s.studentId || s.evidenceToken} | MYP ${s.mypYear} ${s.subject || 'Science • Biology'} | ${s.logsCount} ATL Skills | ${s.evidenceUrl} |`)
    ].join('\n');

    const success = await copyToClipboard(lines);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleExportCsv = () => {
    exportToddleRosterCsv(filteredRoster, academicYear, selectedClass);
  };

  const handleSaveBaseUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setConfiguredBaseUrl(baseUrlInput);
    setIsEditingBaseUrl(false);
    setBaseUrlSavedMsg(true);
    setRosterRefreshKey((k) => k + 1);
    setTimeout(() => setBaseUrlSavedMsg(false), 3000);
  };

  const handleResetToVercel = () => {
    setBaseUrlInput(DEFAULT_PRODUCTION_URL);
    setConfiguredBaseUrl(DEFAULT_PRODUCTION_URL);
    setIsEditingBaseUrl(false);
    setBaseUrlSavedMsg(true);
    setRosterRefreshKey((k) => k + 1);
    setTimeout(() => setBaseUrlSavedMsg(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shrink-0">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[11px] font-bold">
                  Toddle & LMS Personalized Links
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span>Personal ATL Skills Workspace</span>
                </span>
                <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
                  <Globe className="h-3 w-3 text-purple-600" />
                  <span>Vercel Hosted: edu-tn-43-myp-atl-skills-workbench</span>
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Student Links & ATL Skills Evidence Hub
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Each student has a unique personal link for their ATL Skills tasks, evidence submissions, and growth trajectory. Share their link via Toddle, ManageBac, Canvas, Google Classroom, or email.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Deployment Domain Config Bar */}
        <div className="px-5 py-2.5 bg-indigo-50/50 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-600">Active Link Base Domain:</span>
            <span className="font-mono text-[11px] font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 truncate max-w-xs sm:max-w-md">
              {getConfiguredBaseUrl()}
            </span>
            {baseUrlSavedMsg && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md animate-in fade-in">
                Domain Updated!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEditingBaseUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingBaseUrl(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                >
                  <Settings className="h-3 w-3" />
                  <span>Change Domain</span>
                </button>
                {getConfiguredBaseUrl() !== DEFAULT_PRODUCTION_URL && (
                  <button
                    type="button"
                    onClick={handleResetToVercel}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset to Vercel
                  </button>
                )}
              </>
            ) : (
              <form onSubmit={handleSaveBaseUrl} className="flex items-center gap-1.5 animate-in fade-in">
                <input
                  type="url"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  placeholder="https://edu-tn-43-myp-atl-skills-workbench.vercel.app"
                  className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-900 focus:outline-none w-56 sm:w-80"
                  required
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBaseUrl(false)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-5 border-b border-slate-100 bg-white space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Class Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedClass('All')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedClass === 'All'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Classes ({fullRoster.length})
              </button>
              {['1', '2', '3', '4', '5'].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedClass(yr)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedClass === yr
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  MYP {yr} ({classSummary[yr] || 0})
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingStudent(!isAddingStudent)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all shadow-2xs cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Student</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllLinks}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  copiedAll
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {copiedAll ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied All Links!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy All Links</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                title="Download CSV spreadsheet with all student tokens and links"
              >
                <Download className="h-3.5 w-3.5 text-slate-600" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Add Student Form */}
          {isAddingStudent && (
            <form onSubmit={handleAddStudentSubmit} className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Student Full Name (e.g. Aarya)"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                autoFocus
              />
              <select
                value={newStudentYear}
                onChange={(e) => setNewStudentYear(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="1">MYP 1 (Grade 6)</option>
                <option value="2">MYP 2 (Grade 7)</option>
                <option value="3">MYP 3 (Grade 8)</option>
                <option value="4">MYP 4 (Grade 9)</option>
                <option value="5">MYP 5 (Grade 10)</option>
              </select>
              <select
                value={newStudentSubject}
                onChange={(e) => setNewStudentSubject(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none max-w-xs"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!newStudentName.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  Create Student
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name, ID, or token..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Students Table / List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredRoster.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
              <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No students match current filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Click "Add Student" above to add new students to this class roster.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoster.map((student) => {
                const isCopied = copiedId === student.evidenceToken;
                const subjectParts = (student.subject || 'Science • Biology').split(' • ');

                return (
                  <div
                    key={student.evidenceToken}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
                  >
                    {/* Left: Avatar + Name + Student ID */}
                    <div className="flex items-center gap-3 shrink-0 min-w-[160px] sm:min-w-[190px]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0 shadow-xs">
                        {student.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {student.studentName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 font-medium truncate">
                          ID: {student.studentId || `student-${student.evidenceToken}`}
                        </div>
                      </div>
                    </div>

                    {/* Middle Left: Class & Subject Badge (Matching Screenshot) */}
                    <div className="rounded-xl bg-sky-50/80 border border-sky-100/90 px-3 py-1.5 text-center shrink-0 min-w-[100px] leading-tight">
                      <div className="text-xs font-bold text-slate-800">MYP {student.mypYear}</div>
                      <div className="text-[11px] font-semibold text-slate-600">{subjectParts[0] || 'Science'}</div>
                      <div className="text-[10px] font-medium text-slate-500">• {subjectParts[1] || 'Biology'}</div>
                    </div>

                    {/* Middle: ATL Skills Count (Matching Screenshot green dot + count) */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 shrink-0 min-w-[95px]">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-slate-700">
                        <strong className="text-slate-900">{student.logsCount}</strong> ATL {student.logsCount === 1 ? 'Skill' : 'Skills'}
                      </span>
                    </div>

                    {/* Middle Right: Link Box (Truncated clean display) */}
                    <div className="flex-1 min-w-[160px] max-w-sm rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-mono text-slate-600 truncate select-all shadow-2xs">
                      {student.evidenceUrl}
                    </div>

                    {/* Right: Copy Link Button */}
                    <button
                      type="button"
                      onClick={() => handleCopySingle(student.evidenceUrl, student.evidenceToken)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 ${
                        isCopied
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 hover:text-blue-900'
                      }`}
                      title="Copy personalized student link"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-blue-600" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    {/* Action Icons (Matching Screenshot) */}
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      {/* Open in new tab */}
                      <button
                        type="button"
                        onClick={() => {
                          window.open(student.evidenceUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Open student folder in new browser tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>

                      {/* View / Open Folder in App */}
                      <button
                        type="button"
                        onClick={() => {
                          onOpenStudentPortal(student.studentName, student.evidenceToken, student.mypYear);
                          onClose();
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Preview student ATL skills folder"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Edit Student */}
                      <button
                        type="button"
                        onClick={() => startEditingStudent(student)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit student name, class year, or subject"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* Delete Student */}
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student.studentName)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Delete student from roster"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Works seamlessly with Vercel deployment, Toddle, ManageBac, and Google Classroom.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
          >
            Close Manager
          </button>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Student Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Update student name, MYP class, or subject</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    MYP Class Year
                  </label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="1">MYP 1 (Grade 6)</option>
                    <option value="2">MYP 2 (Grade 7)</option>
                    <option value="3">MYP 3 (Grade 8)</option>
                    <option value="4">MYP 4 (Grade 9)</option>
                    <option value="5">MYP 5 (Grade 10)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingStudent.studentId || `student-${editingStudent.evidenceToken}`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-500 select-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subject & Stream
                </label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  {SUBJECT_OPTIONS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

