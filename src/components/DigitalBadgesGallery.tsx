import React, { useState } from 'react';
import { DigitalBadge, ATLTaskLog } from '../types';
import {
  Award,
  Star,
  Brain,
  Sparkles,
  Target,
  Flame,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

interface DigitalBadgesGalleryProps {
  badges: DigitalBadge[];
  studentName: string;
  onViewTaskByBadge?: (badgeId: string) => void;
}

export const DigitalBadgesGallery: React.FC<DigitalBadgesGalleryProps> = ({
  badges,
  studentName,
  onViewTaskByBadge
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'teacher_awarded' | 'achievement' | 'mastery'>('all');

  const filteredBadges = badges.filter((b) => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  const getBadgeIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'brain':
        return <Brain className="w-6 h-6" />;
      case 'sparkles':
        return <Sparkles className="w-6 h-6" />;
      case 'trophy':
        return <Trophy className="w-6 h-6" />;
      case 'target':
        return <Target className="w-6 h-6" />;
      case 'flame':
        return <Flame className="w-6 h-6" />;
      case 'star':
        return <Star className="w-6 h-6" />;
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  const getBadgeTheme = (color: string) => {
    switch (color) {
      case 'amber':
        return {
          card: 'from-amber-500/10 via-amber-400/5 to-orange-500/10 border-amber-300',
          iconBg: 'bg-amber-500 text-white shadow-amber-200',
          tag: 'bg-amber-100 text-amber-900 border-amber-300',
          ring: 'ring-amber-200'
        };
      case 'emerald':
        return {
          card: 'from-emerald-500/10 via-teal-400/5 to-emerald-500/10 border-emerald-300',
          iconBg: 'bg-emerald-600 text-white shadow-emerald-200',
          tag: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          ring: 'ring-emerald-200'
        };
      case 'purple':
        return {
          card: 'from-purple-500/10 via-fuchsia-400/5 to-purple-500/10 border-purple-300',
          iconBg: 'bg-purple-600 text-white shadow-purple-200',
          tag: 'bg-purple-100 text-purple-900 border-purple-300',
          ring: 'ring-purple-200'
        };
      case 'sky':
        return {
          card: 'from-sky-500/10 via-blue-400/5 to-cyan-500/10 border-sky-300',
          iconBg: 'bg-sky-600 text-white shadow-sky-200',
          tag: 'bg-sky-100 text-sky-900 border-sky-300',
          ring: 'ring-sky-200'
        };
      case 'rose':
        return {
          card: 'from-rose-500/10 via-pink-400/5 to-red-500/10 border-rose-300',
          iconBg: 'bg-rose-600 text-white shadow-rose-200',
          tag: 'bg-rose-100 text-rose-900 border-rose-300',
          ring: 'ring-rose-200'
        };
      case 'indigo':
      default:
        return {
          card: 'from-indigo-500/10 via-purple-400/5 to-indigo-500/10 border-indigo-300',
          iconBg: 'bg-indigo-600 text-white shadow-indigo-200',
          tag: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          ring: 'ring-indigo-200'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">
              My Digital ATL Badges & Honors ({badges.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Awarded for demonstrated ATL skill growth, teacher commendations, and milestone accomplishments.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start">
          {[
            { id: 'all', label: 'All Badges' },
            { id: 'teacher_awarded', label: 'Teacher Honors' },
            { id: 'mastery', label: 'Mastery' },
            { id: 'achievement', label: 'Milestones' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === tab.id
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <div className="p-8 rounded-3xl border border-dashed border-slate-200 text-center bg-slate-50/50 space-y-2">
          <Award className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">No badges in this category yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Complete tasks, submit reflective answers, and earn teacher citations to unlock your badges!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBadges.map((badge) => {
            const theme = getBadgeTheme(badge.color);
            return (
              <div
                key={badge.id}
                className={`relative rounded-3xl border p-5 bg-gradient-to-br ${theme.card} shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-md`}
                    >
                      {getBadgeIcon(badge.icon)}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.tag}`}
                    >
                      {badge.category === 'teacher_awarded'
                        ? 'Teacher Award'
                        : badge.category === 'mastery'
                        ? 'Mastery Level'
                        : 'ATL Milestone'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                      {badge.name}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <div>
                    {badge.awardedBy && (
                      <span className="block font-semibold text-slate-700">
                        {badge.awardedBy}
                      </span>
                    )}
                    {badge.earnedAt && (
                      <span className="text-[10px] text-slate-400">
                        {badge.earnedAt}
                      </span>
                    )}
                  </div>

                  {onViewTaskByBadge && (
                    <button
                      type="button"
                      onClick={() => onViewTaskByBadge(badge.id)}
                      className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900"
                    >
                      <span>View Task</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
