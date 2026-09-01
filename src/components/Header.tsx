import React, { useState, useEffect } from 'react';
import { Sparkles, BarChart3, Download, Laptop, Monitor, Apple, CheckCircle2, X, Key, Eye, EyeOff, ExternalLink, ShieldCheck, GraduationCap, Lock, Share2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'student' | 'workbench' | 'dashboard';
  setActiveTab: (tab: 'student' | 'workbench' | 'dashboard') => void;
  academicYear: string;
  setAcademicYear: (year: string) => void;
  totalLogsCount: number;
  customApiKey: string;
  onSaveApiKey: (key: string) => void;
  isAnalyticsUnlocked?: boolean;
  onOpenToddleManager?: () => void;
  activeTasksCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  academicYear,
  setAcademicYear,
  totalLogsCount,
  customApiKey,
  onSaveApiKey,
  isAnalyticsUnlocked = false,
  onOpenToddleManager,
  activeTasksCount = 0,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  // Local key input buffer
  const [inputKey, setInputKey] = useState(customApiKey);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setInputKey(customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  const handleSaveKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(inputKey);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClearKey = () => {
    setInputKey('');
    onSaveApiKey('');
  };

  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Top line badge & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* EduTN43 Brand Logo */}
              <div className="flex items-center gap-1.5 rounded-lg bg-indigo-950 px-2.5 py-1 text-white shadow-2xs border border-indigo-800/50">
                <GraduationCap className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-black tracking-tight text-white">Edu<span className="text-indigo-400">TN43</span></span>
              </div>
              <span className="text-slate-300 font-light hidden sm:inline">|</span>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-600"></span>
                MYP • Approaches to Learning (ATL) Workbench
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Custom API Key Button */}
              <button
                id="api-key-modal-btn"
                onClick={() => setShowKeyModal(true)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold transition-all shadow-2xs ${
                  customApiKey.trim().length > 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
                title="Use your own Gemini API key for dedicated traffic"
              >
                <Key className={`h-3.5 w-3.5 ${customApiKey.trim().length > 0 ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{customApiKey.trim().length > 0 ? 'Custom API Key Active' : 'API Key (Optional)'}</span>
                {customApiKey.trim().length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>

              {/* Toddle & LMS Evidence Links Manager Button */}
              {onOpenToddleManager && (
                <button
                  id="toddle-links-btn"
                  onClick={onOpenToddleManager}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-2xs cursor-pointer"
                  title="Manage and copy student Toddle / LMS standalone evidence portal links"
                >
                  <Share2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Toddle Links</span>
                </button>
              )}

              {/* Install Desktop/Chromebook App Button */}
              <button
                id="install-app-btn"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-2xs"
                title="Install as a standalone desktop or Chromebook app"
              >
                {installed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Installed App</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Install Desktop App</span>
                  </>
                )}
              </button>

              {/* Academic Year Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="academic-year-select" className="text-xs font-semibold text-slate-500">Academic Year:</label>
                <select
                  id="academic-year-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs focus:border-indigo-600 focus:outline-none"
                >
                  <option value="2025-2026">2025–2026</option>
                  <option value="2026-2027">2026–2027</option>
                </select>
              </div>
            </div>
          </div>

          {/* Title and subtitle */}
          <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                ATL Skills Mastery & Tracking Dashboard
              </h1>
              <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500 leading-relaxed">
                Design subject-grounded tasks to explicitly teach and evaluate the 10 MYP Approaches to Learning clusters, assess student growth, and track academic year target trends.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-xs gap-1">
              <button
                id="tab-student"
                onClick={() => setActiveTab('student')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                  activeTab === 'student'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="h-4 w-4 text-blue-300" />
                <span>Student Tasks Portal</span>
                {typeof activeTasksCount === 'number' && activeTasksCount > 0 && (
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeTab === 'student' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activeTasksCount}
                  </span>
                )}
              </button>

              <button
                id="tab-workbench"
                onClick={() => setActiveTab('workbench')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                  activeTab === 'workbench'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Sparkles className="h-4 w-4 text-indigo-300" />
                <span>Teacher Studio</span>
              </button>

              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BarChart3 className="h-4 w-4 text-indigo-300" />
                <span>Year Analytics</span>
                {!isAnalyticsUnlocked && (
                  <Lock className={`h-3 w-3 shrink-0 ${activeTab === 'dashboard' ? 'text-amber-300' : 'text-amber-500'}`} title="Protected by Teacher Password" />
                )}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'dashboard'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {totalLogsCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Installation Guide Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Install MYP ATL Workbench App</h3>
                  <p className="text-xs text-slate-500">Install as a standalone app on Chromebook, Windows, or Mac</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                This app is a <strong>Progressive Web Application (PWA)</strong> that installs directly onto your device with its own desktop icon, launcher shortcut, and offline capabilities!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Chromebook */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mb-2">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div className="font-bold text-slate-800 mb-1">Chromebook</div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Click the <strong>Install Icon</strong> in Chrome’s address bar or open Chrome Menu (⋮) &rarr; <em>Save & Share</em> &rarr; <em>Install MYP ATL Workbench</em>.
                  </p>
                </div>

                {/* Windows PC */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 mb-2">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div className="font-bold text-slate-800 mb-1">Windows PC</div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    In Chrome or Edge, click the <strong>Install App</strong> button in the browser address bar to add a desktop icon & Start menu shortcut.
                  </p>
                </div>

                {/* macOS */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 mb-2">
                    <Apple className="h-4 w-4" />
                  </div>
                  <div className="font-bold text-slate-800 mb-1">Mac Desktop</div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    In Chrome, click Chrome Menu (⋮) &rarr; <em>Save and Share</em> &rarr; <em>Install Page as App</em> to add to macOS Launchpad & Dock.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-amber-800 text-[11px] leading-relaxed">
                <strong>Note for standard shared links:</strong> Once open in Google Chrome or Microsoft Edge, look for the computer icon with a down-arrow in the right side of the address bar to install instantly!
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowInstallModal(false)}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Gemini API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Custom Gemini API Key</h3>
                  <p className="text-xs text-slate-500">Provide your own key for fast, uninterrupted generations</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKeySubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                By entering your personal Google Gemini API key, your requests will run on your own quota rather than sharing default server traffic limits.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKeySecret ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeySecret(!showKeySecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKeySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {saveSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>API Key saved successfully! App is now using your key.</span>
                </div>
              )}

              <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3 text-xs text-indigo-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Privacy & Key Security</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Your key is stored securely inside your browser&apos;s local storage and is never saved permanently on our servers.
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  <span>Get a free Gemini API key from Google AI Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                {customApiKey.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    Clear Saved Key
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-xs"
                  >
                    Save API Key
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
