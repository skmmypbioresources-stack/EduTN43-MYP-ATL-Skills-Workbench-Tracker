import React, { useState, useRef, useMemo } from 'react';
import {
  AssignedTask,
  GeneratedTask,
  TaskImageAttachment,
  ATLCategoryKey
} from '../types';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  FileText,
  Layers,
  HelpCircle,
  Wand2,
  Eye,
  ArrowRight,
  AlertCircle,
  Users,
  UserCheck,
  Check,
  Search
} from 'lucide-react';
import { compressImage, optimizeAttachments } from '../utils/imageOptimizer';
import { getRosterForClass, SelectableStudent } from '../lib/evidenceUtils';

interface CustomTaskCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishTask?: (taskData: {
    teacherName: string;
    subject: string;
    topic: string;
    title: string;
    mypYear: string;
    category: ATLCategoryKey;
    cluster: string;
    criteria: string[];
    dueDate?: string;
    academicYear?: string;
    finalTask: GeneratedTask;
    targetStudentNames?: string[];
  }) => Promise<void>;
  onCreateTask?: (taskData: {
    teacherName: string;
    subject: string;
    topic: string;
    title: string;
    mypYear: string;
    category: ATLCategoryKey;
    cluster: string;
    criteria: string[];
    dueDate?: string;
    academicYear?: string;
    finalTask: GeneratedTask;
    targetStudentNames?: string[];
  }) => Promise<void>;
  defaultTeacherName?: string;
  defaultMypYear?: string;
  academicYear?: string;
}

export const CustomTaskCreatorModal: React.FC<CustomTaskCreatorModalProps> = ({
  isOpen,
  onClose,
  onPublishTask,
  onCreateTask,
  defaultTeacherName = 'Ms. Teacher',
  defaultMypYear = '3',
  academicYear
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [teacherName, setTeacherName] = useState(defaultTeacherName);
  const [mypYear, setMypYear] = useState(defaultMypYear || 'All');
  const [subject, setSubject] = useState('Sciences');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ATLCategoryKey>('Thinking');
  const [cluster, setCluster] = useState('Critical thinking skills');
  const [criteria, setCriteria] = useState<string[]>(['Criterion A', 'Criterion C']);
  const [dueDate, setDueDate] = useState('');

  // ChatGPT Question Scenario / Stimulus
  const [stimulusContext, setStimulusContext] = useState('');
  const [atlFocusExplainer, setAtlFocusExplainer] = useState(
    'Students analyze data, justify conclusions with evidence, and evaluate scientific methodology.'
  );

  // Images attached to question
  const [stimulusImages, setStimulusImages] = useState<TaskImageAttachment[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Question Format: Single Question or Multi-Part
  const [questionMode, setQuestionMode] = useState<'single' | 'multipart'>('single');
  const [singleQuestionPrompt, setSingleQuestionPrompt] = useState(
    'Based on the infographic / question above, analyze the data and provide your comprehensive response and justification.'
  );

  // Question parts (for multipart mode)
  const [parts, setParts] = useState<
    Array<{ label: string; prompt: string; placeholder?: string }>
  >([
    {
      label: 'A',
      prompt: 'State the trend shown in the stimulus data and explain the scientific rationale behind this pattern.',
      placeholder: 'Based on the provided information/diagram, the observed pattern is...'
    },
    {
      label: 'B',
      prompt: 'Evaluate the validity or limitations of the evidence provided in the question.',
      placeholder: 'A significant strength of this source is... however, a key limitation is...'
    }
  ]);

  // Assignment Target Mode: 'class' (Whole cohort) or 'specific' (Select individual students)
  const [assignMode, setAssignMode] = useState<'class' | 'specific'>('class');
  const [selectedStudentNames, setSelectedStudentNames] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Available students for current selected mypYear or whole school
  const availableRoster = useMemo(() => {
    return getRosterForClass(mypYear);
  }, [mypYear]);

  const filteredRoster = useMemo(() => {
    if (!studentSearchQuery.trim()) return availableRoster;
    const q = studentSearchQuery.toLowerCase().trim();
    return availableRoster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.classSection.toLowerCase().includes(q)
    );
  }, [availableRoster, studentSearchQuery]);

  const handleToggleStudent = (name: string) => {
    setSelectedStudentNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSelectAllFiltered = () => {
    const names = filteredRoster.map((s) => s.name);
    setSelectedStudentNames((prev) => Array.from(new Set([...prev, ...names])));
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentNames([]);
  };

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Global Clipboard Paste Handler (Ctrl+V) for Infographics & Diagrams
  const handleContainerPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setPasteToast('Optimizing pasted infographic...');
          try {
            const dataUrl = await compressImage(file, {
              maxWidth: 1280,
              maxHeight: 1280,
              quality: 0.78,
              targetMaxBytes: 250 * 1024
            });
            setStimulusImages((prev) => [
              ...prev,
              {
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                url: dataUrl,
                name: 'Pasted Infographic / Diagram',
                caption: 'Pasted Infographic from ChatGPT'
              }
            ]);
            setPasteToast('Infographic pasted & optimized!');
            setTimeout(() => setPasteToast(null), 3000);
          } catch (err) {
            console.error('Failed to optimize pasted image:', err);
            setPasteToast('Failed to process image');
            setTimeout(() => setPasteToast(null), 3000);
          }
        }
      }
    }
  };

  // Drag and Drop Handler for Infographics
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      setPasteToast(`Optimizing "${file.name}"...`);
      try {
        const dataUrl = await compressImage(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.78,
          targetMaxBytes: 250 * 1024
        });
        setStimulusImages((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            url: dataUrl,
            name: file.name,
            caption: file.name.replace(/\.[^/.]+$/, '')
          }
        ]);
        setPasteToast(`Attached infographic "${file.name}"!`);
        setTimeout(() => setPasteToast(null), 3000);
      } catch (err) {
        console.error('Failed to compress dropped file:', err);
      }
    }
  };

  // File upload handler converting image to DataURL
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      setPasteToast(`Optimizing "${file.name}"...`);
      try {
        const dataUrl = await compressImage(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.78,
          targetMaxBytes: 250 * 1024
        });
        setStimulusImages((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            url: dataUrl,
            name: file.name,
            caption: file.name.replace(/\.[^/.]+$/, '')
          }
        ]);
        setPasteToast(`Attached "${file.name}"!`);
        setTimeout(() => setPasteToast(null), 3000);
      } catch (err) {
        console.error('Failed to compress uploaded file:', err);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setStimulusImages((prev) => [
      ...prev,
      {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        url: imageUrlInput.trim(),
        name: 'Web Image',
        caption: imageCaptionInput.trim() || 'Attached Diagram / Stimulus'
      }
    ]);
    setImageUrlInput('');
    setImageCaptionInput('');
    setShowUrlInput(false);
  };

  const handleRemoveImage = (index: number) => {
    setStimulusImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateImageCaption = (index: number, caption: string) => {
    setStimulusImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, caption } : img))
    );
  };

  // Smart Parser for pasted ChatGPT content
  const handleSmartParseChatGPT = () => {
    if (!stimulusContext.trim()) return;

    const text = stimulusContext;

    // Look for parts like "Part A:", "Question 1:", "1.", "a)"
    const partRegex = /(?:(?:Part\s*([A-Z])|Question\s*(\d+)|\b([A-Z])\)\s*|\b(\d+)\.\s*))\s*([^]+?)(?=(?:Part\s*[A-Z]|Question\s*\d+|\b[A-Z]\)\s*|\b\d+\.\s*|$))/gi;
    const matches = Array.from(text.matchAll(partRegex));

    if (matches.length >= 2) {
      const parsedParts = matches.map((m, idx) => {
        const label = m[1] || m[2] || m[3] || m[4] || String.fromCharCode(65 + idx);
        const promptContent = m[5].trim();
        return {
          label,
          prompt: promptContent,
          placeholder: `Type your answer for Part ${label} here...`
        };
      });

      // Context is everything before the first part
      const firstIndex = matches[0].index || 0;
      const extractedContext = text.substring(0, firstIndex).trim();

      if (extractedContext) {
        setStimulusContext(extractedContext);
      }
      setParts(parsedParts);
    } else {
      alert(
        'Could not automatically detect multiple parts (e.g. Part A, Part B or 1., 2.). You can manually add parts below!'
      );
    }
  };

  const handleAddPart = () => {
    const nextLabel = String.fromCharCode(65 + parts.length);
    setParts((prev) => [
      ...prev,
      {
        label: nextLabel,
        prompt: '',
        placeholder: `Type your response for Part ${nextLabel} here...`
      }
    ]);
  };

  const handleRemovePart = (index: number) => {
    if (parts.length <= 1) return;
    setParts((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    const finalTitle = title.trim() || topic.trim() || 'Custom Class Task';
    const finalTopic = topic.trim() || finalTitle;

    const finalParts =
      questionMode === 'single'
        ? [
            {
              label: '1',
              prompt: singleQuestionPrompt.trim() || 'Provide your detailed analysis and answer to the question / infographic above.',
              placeholder: 'Type your complete response and analysis here...'
            }
          ]
        : parts.map((p, idx) => ({
            label: p.label || String.fromCharCode(65 + idx),
            prompt: p.prompt || `Part ${p.label}`,
            placeholder: p.placeholder || 'Type your response here...'
          }));

    setIsPublishing(true);
    setPublishError(null);
    try {
      if (assignMode === 'specific' && selectedStudentNames.length === 0) {
        setPublishError('Please select at least one student from the roster, or switch to "Whole Class / Cohort".');
        setIsPublishing(false);
        return;
      }

      // Pre-optimize and compress all stimulus images client-side before Firestore dispatch
      const sanitizedImages = await optimizeAttachments(stimulusImages);

      const taskObject: GeneratedTask = {
        title: finalTitle,
        topic: finalTopic,
        chosen_cluster: cluster,
        estimated_minutes: 25,
        subject,
        atl_category: category,
        atl_cluster: cluster,
        sourceType: 'chatgpt_custom',
        context: stimulusContext.trim(),
        atl_focus_explainer: atlFocusExplainer.trim(),
        target_criteria: criteria,
        target_strands: ['Strand 1', 'Strand 2'],
        stimulusImages: sanitizedImages,
        customQuestionText: stimulusContext.trim(),
        parts: finalParts
      };

      const publishFn = onPublishTask || onCreateTask;
      if (publishFn) {
        await publishFn({
          teacherName: teacherName.trim() || 'Teacher',
          subject,
          topic: finalTopic,
          title: finalTitle,
          mypYear,
          category,
          cluster,
          criteria,
          dueDate: dueDate || undefined,
          academicYear,
          finalTask: taskObject,
          targetStudentNames: assignMode === 'specific' ? selectedStudentNames : undefined
        });
      }
      setPublishSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (e: any) {
      console.error('Failed to publish custom task:', e);
      setPublishError(e?.message || 'Failed to publish task. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        onPaste={handleContainerPaste}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {pasteToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{pasteToast}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Add ChatGPT / Custom Question with Images
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  New Feature
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Paste prompts from ChatGPT, attach graphs & diagrams, and assign directly to your students.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(step === 'edit' ? 'preview' : 'edit')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {step === 'edit' ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Preview as Student</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Back to Editor</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {publishError && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 flex items-center gap-3 text-rose-800 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="flex-1 font-medium">{publishError}</div>
            <button
              type="button"
              onClick={() => setPublishError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        {publishSuccess ? (
          <div className="p-12 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Task Published to Class!</h3>
            <p className="text-xs text-slate-600 max-w-md">
              Your custom question with attached diagrams has been assigned to students. They will see it immediately on their portal.
            </p>
          </div>
        ) : step === 'edit' ? (
          <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 text-xs">
            {/* Cohort & Subject Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Teacher Name
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Ms. Smith"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Cohort / MYP Year <span className="text-rose-600">*</span>
                </label>
                <select
                  value={mypYear}
                  onChange={(e) => setMypYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="All">All MYP Classes (MYP 1–5 · Whole School)</option>
                  <option value="1">MYP 1 (Grade 6)</option>
                  <option value="2">MYP 2 (Grade 7)</option>
                  <option value="3">MYP 3 (Grade 8)</option>
                  <option value="4">MYP 4 (Grade 9)</option>
                  <option value="5">MYP 5 (Grade 10)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Subject Group <span className="text-rose-600">*</span>
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Sciences">Sciences</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Language and Literature">Language and Literature</option>
                  <option value="Individuals and Societies">Individuals and Societies</option>
                  <option value="Design">Design</option>
                  <option value="Arts">Arts</option>
                  <option value="Physical and Health Education">Physical and Health Education</option>
                  <option value="Language Acquisition">Language Acquisition</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Target Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Student Assignment Target Selection */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="block text-[11px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Assign To Students</span>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose whether this task is visible to the whole class or targeted to specific individual students.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-indigo-200/80 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setAssignMode('class')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      assignMode === 'class'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Whole Class / Cohort</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignMode('specific')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      assignMode === 'specific'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Select Respective Students ({selectedStudentNames.length})</span>
                  </button>
                </div>
              </div>

              {/* Specific Students Selector */}
              {assignMode === 'specific' && (
                <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2.5 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Search student by name or ID (e.g. 8654)..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline px-2 py-1 cursor-pointer"
                      >
                        Select All ({filteredRoster.length})
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearSelectedStudents}
                        className="text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:underline px-2 py-1 cursor-pointer"
                      >
                        Clear Selection
                      </button>
                      <span className="ml-2 inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                        {selectedStudentNames.length} selected
                      </span>
                    </div>
                  </div>

                  {/* Student Checklist */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg pr-1">
                    {filteredRoster.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No students found matching your search.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-1">
                        {filteredRoster.map((student) => {
                          const isSelected = selectedStudentNames.includes(student.name);
                          return (
                            <label
                              key={`${student.name}-${student.id}`}
                              className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(student.name)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <div className="truncate flex-1">
                                <span className="block truncate">{student.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {student.id} • {student.classSection}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedStudentNames.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold">Selected:</span>
                      {selectedStudentNames.slice(0, 6).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-800"
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleStudent(name)}
                            className="text-indigo-400 hover:text-rose-600 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {selectedStudentNames.length > 6 && (
                        <span className="text-[10px] text-slate-500 font-semibold">
                          +{selectedStudentNames.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title & Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Task Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ChatGPT Science Investigation: Enzyme Activity Analysis"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Curriculum Topic <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Enzymes & Reaction Rates"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* ATL Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  ATL Skill Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ATLCategoryKey)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Thinking">Thinking</option>
                  <option value="Research">Research</option>
                  <option value="Communication">Communication</option>
                  <option value="Social">Social</option>
                  <option value="Self-management">Self-management</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Targeted ATL Skill Cluster
                </label>
                <input
                  type="text"
                  value={cluster}
                  onChange={(e) => setCluster(e.target.value)}
                  placeholder="e.g. Critical thinking skills"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* ChatGPT Prompt / Context */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>ChatGPT Prompt / Question Stimulus / Scenario</span>
                </label>
                <button
                  type="button"
                  onClick={handleSmartParseChatGPT}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Automatically split text into parts if Part A, Part B or 1., 2. are detected"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Auto-Split Parts</span>
                </button>
              </div>
              <p className="text-[11px] text-indigo-900/80">
                Paste your question text from ChatGPT or your curriculum documents below.
              </p>
              <textarea
                rows={5}
                value={stimulusContext}
                onChange={(e) => setStimulusContext(e.target.value)}
                placeholder={`e.g. You are a biochemist studying the rate of reaction of catalase in potatoes at varying temperatures. The apparatus was set up as shown in the diagram...`}
                className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* ATTACH QUESTION IMAGES, INFOGRAPHICS & DIAGRAMS */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 transition-all p-4 space-y-3 ${
                isDraggingOver
                  ? 'border-indigo-600 bg-indigo-50/90 shadow-md'
                  : 'border-slate-200 bg-slate-50/80 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Infographic, Graph, or Stimulus Diagram ({stimulusImages.length})</span>
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Drag & drop here, click upload, or copy image in ChatGPT and press <strong>Ctrl+V</strong> to paste!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Image URL</span>
                  </button>
                </div>
              </div>

              {/* URL Input dropdown */}
              {showUrlInput && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-2 items-center">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste direct image URL (https://...)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <input
                    type="text"
                    value={imageCaptionInput}
                    onChange={(e) => setImageCaptionInput(e.target.value)}
                    placeholder="Caption (e.g. Figure 1: Infographic)"
                    className="w-full sm:w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shrink-0"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Thumbnails of attached images */}
              {stimulusImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {stimulusImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="group relative rounded-xl border border-slate-200 bg-white p-2 shadow-2xs space-y-2"
                    >
                      <div className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img
                          src={img.url}
                          alt={img.caption || 'Attached image'}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={(e) => handleUpdateImageCaption(idx, e.target.value)}
                        placeholder="Caption / Diagram label"
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded-xl p-5 text-center text-slate-400 bg-white/70 space-y-1">
                  <ImageIcon className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No infographic or diagram attached yet</p>
                  <p className="text-[11px] text-slate-400">Copy any diagram or infographic and hit <strong>Ctrl+V</strong> right here to paste it instantly.</p>
                </div>
              )}
            </div>

            {/* QUESTION RESPONSE FORMAT: SINGLE OR MULTI-PART */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>Student Response Format</span>
                </label>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQuestionMode('single')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      questionMode === 'single'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Single Comprehensive Question
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionMode('multipart')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      questionMode === 'multipart'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Multi-Part Question (A, B, C...)
                  </button>
                </div>
              </div>

              {questionMode === 'single' ? (
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Question Prompt for Student
                  </label>
                  <textarea
                    rows={2}
                    value={singleQuestionPrompt}
                    onChange={(e) => setSingleQuestionPrompt(e.target.value)}
                    placeholder="e.g. Based on the infographic above, evaluate the findings and justify your conclusion..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400">
                    The student will see the infographic and this prompt, and can write their comprehensive response or attach handwritten workings.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">Question Sub-Parts ({parts.length})</span>
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Part</span>
                    </button>
                  </div>

                  {parts.map((part, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 shadow-2xs relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">
                            {part.label}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            Question Part {part.label}
                          </span>
                        </div>

                        {parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete part"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={part.prompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParts((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, prompt: val } : p))
                          );
                        }}
                        placeholder="Enter the specific question prompt for students..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                      />

                      <input
                        type="text"
                        value={part.placeholder || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParts((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, placeholder: val } : p))
                          );
                        }}
                        placeholder="Optional student starter hint / placeholder"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PREVIEW AS STUDENT STEP */
          <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                  Student View Simulation
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {mypYear === 'All' ? 'All MYP Classes' : `MYP ${mypYear}`} • {subject} •{' '}
                  {assignMode === 'class'
                    ? 'Whole Class'
                    : `${selectedStudentNames.length} Selected Students`}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{title || topic}</h3>
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {stimulusContext || 'No stimulus text provided.'}
              </p>
            </div>

            {/* Stimulus Images Preview */}
            {stimulusImages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Question Diagrams ({stimulusImages.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stimulusImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50"
                    >
                      <img
                        src={img.url}
                        alt={img.caption || 'Diagram'}
                        className="w-full h-44 object-cover"
                      />
                      <div className="p-2 bg-white text-xs font-semibold text-slate-700">
                        {img.caption || `Diagram ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts Preview */}
            <div className="space-y-4">
              {parts.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"
                >
                  <label className="text-xs font-bold text-slate-800 block">
                    Part {p.label}: {p.prompt}
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-400 italic">
                    {p.placeholder || 'Student will type response here...'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step === 'edit' ? (
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span>Preview Task</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep('edit')}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
              >
                Back to Edit
              </button>
            )}

            <button
              type="button"
              disabled={isPublishing || !title.trim() || parts.length === 0}
              onClick={handlePublish}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isPublishing ? (
                <span>Publishing to Students...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish Task to Class</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
