import React, { useState, useMemo } from 'react';
import { ATLTaskLog, ATLCategoryKey, SkillLevel } from '../types';
import { exportToWordDoc } from '../lib/exportUtils';
import { ATL_DATA, ALL_CLUSTERS, SAMPLE_STUDENTS } from '../data/atlData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Filter,
  Users,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Search,
  Plus,
  Trash2,
  Eye,
  FileText,
  Download,
  RotateCcw,
} from 'lucide-react';

interface DashboardViewProps {
  logs: ATLTaskLog[];
  academicYear: string;
  setAcademicYear: (year: string) => void;
  onDeleteLog: (id: string) => void;
  onResetSampleLogs: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  logs,
  academicYear,
  setAcademicYear,
  onDeleteLog,
  onResetSampleLogs,
}) => {
  // Filters
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedStudent, setSelectedStudent] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLogForModal, setSelectedLogForModal] = useState<ATLTaskLog | null>(null);

  // Dynamic list of unique students from current logs
  const availableStudents = useMemo(() => {
    const studentSet = new Set<string>();
    logs.forEach((log) => {
      if (log.studentName && log.studentName.trim()) {
        studentSet.add(log.studentName.trim());
      }
    });
    return Array.from(studentSet).sort();
  }, [logs]);

  // Student progress report state
  const [reportStudent, setReportStudent] = useState<string>('');

  // Automatically pick the first available student if none selected or if selected student no longer exists
  React.useEffect(() => {
    if (availableStudents.length > 0 && (!reportStudent || !availableStudents.includes(reportStudent))) {
      setReportStudent(availableStudents[0]);
    }
  }, [availableStudents, reportStudent]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchYear = log.academicYear === academicYear;
      const matchTerm = selectedTerm === 'All' || log.term === selectedTerm || (log.term && log.term.startsWith(selectedTerm));
      const matchSubject = selectedSubject === 'All' || log.subject === selectedSubject;
      const matchStudent = selectedStudent === 'All' || log.studentName === selectedStudent;
      const matchSearch =
        !searchQuery ||
        log.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.cluster.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchYear && matchTerm && matchSubject && matchStudent && matchSearch;
    });
  }, [logs, academicYear, selectedTerm, selectedSubject, selectedStudent, searchQuery]);

  // 1. Skill Cluster Targeting Frequency Data
  const clusterFrequencyData = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_CLUSTERS.forEach((c) => {
      counts[c.name] = 0;
    });

    filteredLogs.forEach((log) => {
      if (counts[log.cluster] !== undefined) {
        counts[log.cluster] += 1;
      } else {
        counts[log.cluster] = 1;
      }
    });

    return ALL_CLUSTERS.map((c) => ({
      cluster: c.name,
      category: c.category,
      count: counts[c.name] || 0,
      fill: ATL_DATA[c.category as ATLCategoryKey]?.color || '#33627d',
    }));
  }, [filteredLogs]);

  // 2. Category Usage Breakdown Data
  const categoryFrequencyData = useMemo(() => {
    const catCounts: Record<ATLCategoryKey, number> = {
      Communication: 0,
      Social: 0,
      'Self-management': 0,
      Research: 0,
      Thinking: 0,
    };

    filteredLogs.forEach((log) => {
      if (catCounts[log.category] !== undefined) {
        catCounts[log.category] += 1;
      }
    });

    return (Object.keys(catCounts) as ATLCategoryKey[]).map((cat) => ({
      category: cat,
      count: catCounts[cat],
      color: ATL_DATA[cat].color,
    }));
  }, [filteredLogs]);

  // 3. Academic Year Trend Line (Term distribution)
  const trendData = useMemo(() => {
    const terms = ['Term 1', 'Term 2'];
    return terms.map((t) => {
      const termLogs = filteredLogs.filter((l) => l.term && l.term.startsWith(t));
      const developing = termLogs.filter((l) => l.level === 'Developing').length;
      const applying = termLogs.filter((l) => l.level === 'Applying').length;
      const extending = termLogs.filter((l) => l.level === 'Extending').length;

      return {
        term: t === 'Term 1' ? 'Term 1 (July–Dec)' : 'Term 2 (Jan–May)',
        totalTasks: termLogs.length,
        Developing: developing,
        Applying: applying,
        Extending: extending,
      };
    });
  }, [filteredLogs]);

  // KPI Metrics Calculation
  const totalTasks = filteredLogs.length;
  const uniqueClustersTargeted = new Set(filteredLogs.map((l) => l.cluster)).size;
  const topCategory = categoryFrequencyData.reduce((prev, current) =>
    prev.count > current.count ? prev : current
  , categoryFrequencyData[0]);

  const levelDistribution = useMemo(() => {
    const counts = { Developing: 0, Applying: 0, Extending: 0 };
    filteredLogs.forEach((l) => {
      counts[l.level] += 1;
    });
    return counts;
  }, [filteredLogs]);

  // Individual Student Progress Report Data
  const studentLogs = useMemo(() => {
    return logs.filter((l) => l.academicYear === academicYear && l.studentName === reportStudent);
  }, [logs, academicYear, reportStudent]);

  const studentClusterCoverage = useMemo(() => {
    const setClust = new Set(studentLogs.map((l) => l.cluster));
    return `${setClust.size} / 10 Clusters`;
  }, [studentLogs]);

  return (
    <div className="space-y-8">
      {/* Top Controls & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <BarChart3 className="h-4 w-4" />
              <span>Academic Year Tracking Dashboard</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              ATL Skill Usage & Trends ({academicYear})
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Track how many times each Approaches to Learning skill cluster was targeted, monitor usage velocity, and generate progress reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetSampleLogs}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all"
              title="Clear all recorded task analytics logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Analytics Data</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-100 pt-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Academic Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            >
              <option value="All">All Terms (Full Year)</option>
              <option value="Term 1">Term 1 (July – Dec)</option>
              <option value="Term 2">Term 2 (Jan – May)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Subject Group
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            >
              <option value="All">All Subject Groups</option>
              <option value="Sciences">Sciences</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Language and Literature">Language and Literature</option>
              <option value="Individuals and Societies">Individuals and Societies</option>
              <option value="Design">Design</option>
              <option value="Arts">Arts</option>
              <option value="Physical and Health Education">Physical & Health Education</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Student / Class
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
            >
              <option value="All">All Students & Classes</option>
              {availableStudents.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Search Tasks
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Topic, skill, or student..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total ATL Tasks</span>
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{totalTasks}</div>
          <p className="mt-1 text-xs font-medium text-slate-500">Targeted practice tasks recorded</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Clusters Covered</span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{uniqueClustersTargeted} / 10</div>
          <p className="mt-1 text-xs font-medium text-slate-500">Unique ATL skill clusters practiced</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Category</span>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 truncate">
            {topCategory?.category || 'None'}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">{topCategory?.count || 0} tasks explicitly targeted</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-violet-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mastery Spread</span>
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-700">{levelDistribution.Extending} Ext</span>
            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-700">{levelDistribution.Applying} App</span>
            <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-amber-700">{levelDistribution.Developing} Dev</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">Formative assessment result breakdown</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Frequency Bar Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                ATL Skill Cluster Usage Frequency
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                How many times each of the 10 MYP ATL skill clusters was targeted in {academicYear}
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterFrequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="cluster"
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" name="Times Targeted" radius={[6, 6, 0, 0]}>
                  {clusterFrequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown & Trend Velocity */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Academic Term Usage Trends
            </h3>
            <p className="text-xs font-medium text-slate-500 mb-4 mt-0.5">
              Volume of ATL task practice across terms in {academicYear}
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="totalTasks" name="Total Tasks" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Extending" name="Extending Level" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 10 ATL Clusters Coverage Heatmap Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">
          10 MYP ATL Clusters Coverage Matrix
        </h3>
        <p className="text-xs font-medium text-slate-500 mb-6 mt-0.5">
          Complete breakdown of target count, subject distribution, and active status for all 10 clusters in {academicYear}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {ALL_CLUSTERS.map((cl) => {
            const catData = ATL_DATA[cl.category as ATLCategoryKey];
            const clusterLogs = filteredLogs.filter((l) => l.cluster === cl.name);
            const count = clusterLogs.length;

            return (
              <div
                key={cl.name}
                className="rounded-2xl border p-4 transition-all shadow-2xs hover:shadow-xs"
                style={{
                  borderColor: count > 0 ? catData.borderColor : '#e2e8f0',
                  backgroundColor: count > 0 ? catData.bgSoft : '#f8fafc',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cl.category}
                  </span>
                  <span
                    className="text-xs font-extrabold rounded-full px-2.5 py-0.5"
                    style={{
                      backgroundColor: count > 0 ? catData.color : '#e2e8f0',
                      color: count > 0 ? '#ffffff' : '#64748b',
                    }}
                  >
                    {count} {count === 1 ? 'time' : 'times'}
                  </span>
                </div>

                <div className="mt-2 font-bold text-sm text-slate-900">{cl.name}</div>

                <div className="mt-3 w-full bg-white/80 rounded-full h-2 overflow-hidden border border-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(count * 25, 100)}%`,
                      backgroundColor: catData.color,
                    }}
                  />
                </div>

                <div className="mt-2 text.11px text-slate-500 font-medium">
                  {count > 0 ? (
                    <span>Last used in <strong className="text-slate-800">{clusterLogs[clusterLogs.length - 1].subject}</strong></span>
                  ) : (
                    <span className="italic text-slate-400">Not yet targeted in {selectedTerm === 'All' ? 'this year' : selectedTerm}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Progress Report Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              <span>Student Progress Report Generator</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              Individual ATL Growth Profile
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Generate a formal progress summary card for student ePortfolios, parent conferences, or report cards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-500">Select Student:</label>
            <select
              value={reportStudent}
              onChange={(e) => setReportStudent(e.target.value)}
              disabled={availableStudents.length === 0}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none disabled:opacity-50"
            >
              {availableStudents.length === 0 ? (
                <option value="">No student records yet</option>
              ) : (
                availableStudents.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Student Progress Card Display */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">MYP Student Progress Card</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {reportStudent || 'No Student Selected'}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Academic Year {academicYear} • ATL Skills Development Log</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                {studentLogs.length} Tasks Logged
              </span>
              <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {studentClusterCoverage}
              </span>
            </div>
          </div>

          {studentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-medium leading-relaxed">
              {availableStudents.length === 0 ? (
                <span>No student task logs recorded yet for {academicYear}. Start by filling in student details and completing tasks in the <strong>Task Workbench</strong> tab!</span>
              ) : (
                <span>No logged ATL tasks found for <strong>{reportStudent}</strong> in {academicYear}. Select another student or switch to the Task Workbench to log a new task.</span>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Targeted Skills History & Level Attainment
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 font-bold uppercase text-slate-400 text-[11px]">
                      <th className="py-2.5 px-3">Date & Term</th>
                      <th className="py-2.5 px-3">Subject & Topic</th>
                      <th className="py-2.5 px-3">ATL Category & Cluster</th>
                      <th className="py-2.5 px-3 text-center">Level Achieved</th>
                      <th className="py-2.5 px-3">Key Strength Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {studentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white transition-colors">
                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {log.date}
                          <div className="text-[10px] text-slate-400">{log.term}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{log.subject}</div>
                          <div className="text-slate-500 font-medium">{log.topic}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-indigo-700">{log.cluster}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{log.category}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              log.level === 'Extending'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : log.level === 'Applying'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs leading-snug font-medium">
                          {log.feedback.summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Log History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Academic Year Task History Log
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Showing {filteredLogs.length} logged student task evaluations for {academicYear}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-bold uppercase text-slate-400 text-[11px]">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Student / Class</th>
                <th className="py-3 px-3">Subject & Topic</th>
                <th className="py-3 px-3">ATL Skill Cluster</th>
                <th className="py-3 px-3 text-center">Level</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    No tasks found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-500 font-medium">
                      {log.date}
                      <div className="text-[10px] text-slate-400">{log.term}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {log.studentName}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.subject} (MYP {log.mypYear})</div>
                      <div className="text-slate-500 font-medium">{log.topic}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-indigo-700">{log.cluster}</span>
                      <div className="text-[10px] text-slate-400 font-medium">{log.category}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          log.level === 'Extending'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : log.level === 'Applying'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLogForModal(log)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteLog(log.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Log Entry Details
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedLogForModal.taskTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl font-medium text-slate-800">
                <div><strong className="text-slate-500">Student:</strong> {selectedLogForModal.studentName}</div>
                <div><strong className="text-slate-500">Date:</strong> {selectedLogForModal.date} ({selectedLogForModal.term})</div>
                <div><strong className="text-slate-500">Subject:</strong> {selectedLogForModal.subject} (MYP {selectedLogForModal.mypYear})</div>
                <div><strong className="text-slate-500">ATL Cluster:</strong> {selectedLogForModal.cluster} ({selectedLogForModal.category})</div>
              </div>

              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Feedback Summary:</strong>
                <p className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-indigo-950 font-medium leading-relaxed">
                  {selectedLogForModal.feedback.summary}
                </p>
              </div>

              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Strengths:</strong>
                <ul className="list-disc pl-5 space-y-1 text-slate-800 font-medium">
                  {selectedLogForModal.feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Student Responses:</strong>
                <div className="space-y-2">
                  {selectedLogForModal.responses.map((r, i) => (
                    <div key={i} className="border border-slate-200 p-3 rounded-xl bg-white shadow-2xs">
                      <div className="font-bold text-indigo-700">{r.label}) {r.prompt}</div>
                      <div className="mt-1.5 text-slate-800 font-medium">{r.response}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons inside Modal */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() =>
                    exportToWordDoc({
                      studentName: selectedLogForModal.studentName,
                      subject: selectedLogForModal.subject,
                      topic: selectedLogForModal.topic,
                      mypYear: selectedLogForModal.mypYear,
                      academicYear: selectedLogForModal.academicYear,
                      term: selectedLogForModal.term,
                      category: selectedLogForModal.category,
                      cluster: selectedLogForModal.cluster,
                      level: selectedLogForModal.level,
                      taskTitle: selectedLogForModal.taskTitle,
                      responses: selectedLogForModal.responses,
                      feedback: selectedLogForModal.feedback,
                    })
                  }
                  className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download Word Doc (.doc)</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
