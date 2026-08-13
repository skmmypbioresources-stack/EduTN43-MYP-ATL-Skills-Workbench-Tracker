import React, { useState } from 'react';
import { SCIENCE_MYP_CRITERIA, MYPCriterion, MYPStrand } from '../data/mypCriteriaData';
import { Target, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface MYPCriteriaSelectorProps {
  selectedCriteria: string[];
  selectedStrands: string[];
  onChange: (criteria: string[], strands: string[]) => void;
}

export const MYPCriteriaSelector: React.FC<MYPCriteriaSelectorProps> = ({
  selectedCriteria,
  selectedStrands,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeCriterionId, setActiveCriterionId] = useState<string>('Criterion A');

  const toggleCriterion = (crit: MYPCriterion) => {
    let nextCriteria = [...selectedCriteria];
    let nextStrands = [...selectedStrands];

    const isCritSelected = nextCriteria.includes(crit.id);

    if (isCritSelected) {
      // Unselect criterion and all its strands
      nextCriteria = nextCriteria.filter((id) => id !== crit.id);
      const critStrandIds = crit.strands.map((s) => `${crit.id}.${s.code}`);
      nextStrands = nextStrands.filter((sid) => !critStrandIds.includes(sid));
    } else {
      // Select criterion and default select all its strands for convenience
      nextCriteria.push(crit.id);
      crit.strands.forEach((s) => {
        const sid = `${crit.id}.${s.code}`;
        if (!nextStrands.includes(sid)) {
          nextStrands.push(sid);
        }
      });
    }

    onChange(nextCriteria, nextStrands);
  };

  const toggleStrand = (crit: MYPCriterion, strand: MYPStrand) => {
    const strandId = `${crit.id}.${strand.code}`;
    let nextStrands = [...selectedStrands];
    let nextCriteria = [...selectedCriteria];

    if (nextStrands.includes(strandId)) {
      nextStrands = nextStrands.filter((s) => s !== strandId);
      // Check if any strands remain for this criterion
      const remainingStrandsForCrit = crit.strands.some((s) => nextStrands.includes(`${crit.id}.${s.code}`));
      if (!remainingStrandsForCrit) {
        nextCriteria = nextCriteria.filter((id) => id !== crit.id);
      }
    } else {
      nextStrands.push(strandId);
      if (!nextCriteria.includes(crit.id)) {
        nextCriteria.push(crit.id);
      }
    }

    onChange(nextCriteria, nextStrands);
  };

  const activeCriterion = SCIENCE_MYP_CRITERIA.find((c) => c.id === activeCriterionId) || SCIENCE_MYP_CRITERIA[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all">
      {/* Header Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>MYP Assessment Criteria & Strands</span>
              <span className="text-[10px] text-slate-400 font-normal">(Optional Focus)</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {selectedCriteria.length === 0 ? (
                'Target specific Science Criteria A, B, C, or D & strands'
              ) : (
                <span className="text-indigo-700 font-bold">
                  {selectedCriteria.length} Criteria • {selectedStrands.length} Strands Selected
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCriteria.length > 0 && (
            <span className="rounded-md bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
              {selectedCriteria.map((c) => c.replace('Criterion ', '')).join(', ')}
            </span>
          )}
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-3.5 space-y-3.5 border-t border-slate-100">
          {/* Criteria Pills Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SCIENCE_MYP_CRITERIA.map((crit) => {
              const isSelected = selectedCriteria.includes(crit.id);
              const isActive = activeCriterionId === crit.id;
              const selectedStrandCount = crit.strands.filter((s) => selectedStrands.includes(`${crit.id}.${s.code}`)).length;

              return (
                <button
                  key={crit.id}
                  type="button"
                  onClick={() => {
                    setActiveCriterionId(crit.id);
                    if (!isSelected) {
                      toggleCriterion(crit);
                    }
                  }}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  } ${isActive ? 'ring-2 ring-indigo-500/20' : ''}`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[11px] font-extrabold text-indigo-700">{crit.id}</span>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCriterion(crit);
                      }}
                      className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold line-clamp-1">{crit.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {selectedStrandCount} / {crit.strands.length} strands
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Criterion Strands Detail Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div>
                <span className="text-xs font-black text-indigo-900">{activeCriterion.id}: {activeCriterion.name}</span>
                <p className="text-[11px] text-slate-500">{activeCriterion.description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleCriterion(activeCriterion)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer shrink-0 ml-2"
              >
                {selectedCriteria.includes(activeCriterion.id) ? 'Deselect All' : 'Select All Strands'}
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {activeCriterion.strands.map((strand) => {
                const strandId = `${activeCriterion.id}.${strand.code}`;
                const isChecked = selectedStrands.includes(strandId);

                return (
                  <label
                    key={strand.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'border-indigo-200 bg-white text-slate-900 font-medium shadow-2xs'
                        : 'border-transparent hover:bg-white/80 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStrand(activeCriterion, strand)}
                      className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <span className="font-extrabold text-indigo-700 mr-1.5">{strand.code}.</span>
                      <span className="text-[11px] leading-snug">{strand.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
