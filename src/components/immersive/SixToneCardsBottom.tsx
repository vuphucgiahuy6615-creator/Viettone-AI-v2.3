import React from 'react';
import { Volume2, Star } from 'lucide-react';
import { VIETNAMESE_TONES } from '../../data/tones';
import { ToneItem, ToneRoadmapStat } from '../../types';
import { playToneAudio } from '../../utils/audioSynthesizer';

interface SixToneCardsBottomProps {
  selectedTone: ToneItem;
  onSelectTone: (tone: ToneItem) => void;
  disabled?: boolean;
  roadmapStats?: ToneRoadmapStat[];
}

function getMasteryStars(stat?: ToneRoadmapStat): number {
  if (!stat || stat.totalAttempts === 0) return 0;
  if (
    stat.hasEnoughData &&
    stat.matchRatio >= 0.75 &&
    (stat.avgF0Score === null || stat.avgF0Score >= 80)
  ) {
    return 3;
  }
  if (stat.matchRatio >= 0.5 || (stat.avgF0Score !== null && stat.avgF0Score >= 65)) {
    return 2;
  }
  return 1;
}

export const SixToneCardsBottom: React.FC<SixToneCardsBottomProps> = ({
  selectedTone,
  onSelectTone,
  disabled = false,
  roadmapStats = [],
}) => {
  const handlePlaySample = (e: React.MouseEvent, toneId: string) => {
    e.stopPropagation();
    playToneAudio(toneId);
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-2 pb-1">
      {/* Lưới 6 thẻ thanh điệu: 6 cột trên Desktop / Tablet, 3 cột x 2 hàng trên Mobile */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
        {VIETNAMESE_TONES.map((tone) => {
          const isSelected = tone.id === selectedTone.id;
          const toneStat = roadmapStats.find((s) => s.toneId === tone.id);
          const masteryStars = getMasteryStars(toneStat);
          const isUnpracticed = !toneStat || toneStat.totalAttempts === 0;

          return (
            <div
              key={tone.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={isSelected}
              aria-label={`Chọn luyện ${tone.name} (${tone.word})`}
              onClick={() => {
                if (!disabled) onSelectTone(tone);
              }}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectTone(tone);
                }
              }}
              className={`vt-card group relative flex flex-col items-center justify-center min-h-[108px] pt-4 pb-3 px-2.5 sm:px-3 transition-all duration-100 select-none text-center ${
                disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer active:border-b-0 active:mb-[4px] active:translate-y-[4px]'
              } ${
                isSelected
                  ? 'bg-gradient-to-b from-[var(--vt-orange-500)]/35 via-[var(--vt-red-500)]/25 to-[var(--vt-surface-dark)] border-[3px] border-[var(--vt-orange)] border-b-[5px] border-b-[var(--vt-orange-shadow)] shadow-[0_0_25px_rgba(255,145,0,0.5)] translate-y-[-2px]'
                  : isUnpracticed
                    ? 'bg-[var(--vt-surface)]/80 hover:bg-[var(--vt-surface-hover)] border-white/15 border-b-[var(--vt-surface-shadow)] opacity-80 hover:opacity-100'
                    : 'bg-[var(--vt-surface)] hover:bg-[var(--vt-surface-hover)] border-white/25 border-b-[var(--vt-surface-shadow)] hover:border-white/40'
              }`}
            >
              {/* Chip "Đang luyện" trên thẻ đang chọn */}
              {isSelected && (
                <div className="vt-chip absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] text-white text-[10px] font-black uppercase tracking-wide whitespace-nowrap border-white/40 border-b-[var(--vt-red-shadow)] shadow-md">
                  <span>Đang luyện</span>
                </div>
              )}

              {/* Hàng 1: Từ phát âm to đậm và Loa nghe mẫu bên cạnh */}
              <div className="flex items-center justify-center gap-0.5 w-full mt-0.5">
                <span
                  className={`text-3xl sm:text-4xl font-black tracking-tight leading-none ${
                    isSelected ? 'text-[var(--vt-amber-300)] drop-shadow-xs' : 'text-white'
                  }`}
                >
                  {tone.word}
                </span>

                {/* Loa nghe mẫu (đảm bảo vùng chạm >= 44px) */}
                <button
                  type="button"
                  onClick={(e) => handlePlaySample(e, tone.id)}
                  className={`min-w-[44px] min-h-[44px] -my-2 -mr-2 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                    isSelected
                      ? 'text-[var(--vt-amber-300)] hover:text-white hover:bg-white/20'
                      : 'text-white/75 hover:text-[var(--vt-amber-300)] hover:bg-white/10'
                  }`}
                  title={`Nghe phát âm chuẩn: ${tone.word}`}
                  aria-label={`Nghe mẫu ${tone.word}`}
                >
                  <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </div>

              {/* Hàng 2: Tên thanh bên dưới */}
              <div className="mt-1.5 w-full">
                <span
                  className={`text-xs sm:text-sm font-extrabold block truncate ${
                    isSelected ? 'text-[var(--vt-orange-200)]' : 'text-white/85'
                  }`}
                >
                  {tone.name}
                </span>
              </div>

              {/* Hàng 3: Mức độ thành thạo (1-3 sao từ roadmapStats) */}
              <div
                className="mt-1.5 flex items-center justify-center gap-1"
                aria-label={`Mức độ thành thạo: ${masteryStars} trên 3 sao`}
              >
                {[1, 2, 3].map((starIndex) => {
                  const filled = starIndex <= masteryStars;
                  return (
                    <Star
                      key={starIndex}
                      className={`w-3 h-3 ${
                        filled
                          ? 'text-[var(--vt-amber-300)] fill-[var(--vt-amber-300)] drop-shadow-[0_0_4px_rgba(255,183,3,0.45)]'
                          : 'text-white/25'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

