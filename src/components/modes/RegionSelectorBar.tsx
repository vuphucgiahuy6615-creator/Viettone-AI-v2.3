import React from 'react';
import { Globe2, SlidersHorizontal } from 'lucide-react';
import { REGIONAL_PROFILES } from '../../data/vocabulary';
import { RegionId } from '../../types';

interface RegionSelectorBarProps {
  activeRegion: RegionId;
  onSelectRegion: (regionId: RegionId) => void;
  hasCustomRegionModel: boolean;
  onOpenModelModal: () => void;
}

export const RegionSelectorBar: React.FC<RegionSelectorBarProps> = ({
  activeRegion,
  onSelectRegion,
  hasCustomRegionModel,
  onOpenModelModal,
}) => {
  const currentProfile =
    REGIONAL_PROFILES.find((r) => r.id === activeRegion) || REGIONAL_PROFILES[0];

  return (
    <section
      aria-label="Chọn vùng miền phát âm"
      className="w-full rounded-2xl bg-[var(--vt-slate-900)]/70 backdrop-blur-xl border-2 border-white/15 px-3.5 sm:px-4 py-3 space-y-2.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Globe2 className="w-4 h-4 text-[var(--vt-amber-300)] shrink-0" aria-hidden="true" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-white/80 whitespace-nowrap">
            Giọng vùng miền
          </span>
          <span className="text-white/35" aria-hidden="true">·</span>
          <span className="text-xs font-bold text-[var(--vt-amber-200)] truncate">
            {currentProfile.name}
          </span>
        </div>

        {/* Segmented Control Bắc / Trung / Nam */}
        <div
          role="radiogroup"
          aria-label="Chuyển vùng miền phát âm"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/15 self-start sm:self-auto"
        >
          {REGIONAL_PROFILES.map((region) => {
            const isActive = region.id === activeRegion;
            return (
              <button
                key={region.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onSelectRegion(region.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                  isActive
                    ? 'bg-[var(--vt-orange)] text-white shadow-sm'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {region.shortName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-white/10">
        <p className="text-xs text-white/75 font-semibold leading-relaxed">
          {currentProfile.toneCharacteristics}
        </p>

        <button
          type="button"
          onClick={onOpenModelModal}
          className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-extrabold text-[var(--vt-amber-200)] shrink-0 self-start sm:self-auto whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--vt-amber-300)]" aria-hidden="true" />
          <span>{hasCustomRegionModel ? 'Đã gắn model vùng' : 'Gắn model vùng'}</span>
        </button>
      </div>
    </section>
  );
};
