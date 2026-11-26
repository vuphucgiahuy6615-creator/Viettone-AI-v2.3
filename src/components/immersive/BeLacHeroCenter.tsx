import React from 'react';
import { Target, Volume2 } from 'lucide-react';
import { REGIONAL_PROFILES } from '../../data/vocabulary';
import { ToneItem, FeedbackAssessment, PracticeWordItem, RegionId } from '../../types';
import { playWordAudio } from '../../utils/audioSynthesizer';
import { AnimatedBeLac, BeLacAnimationState } from './AnimatedBeLac';

interface BeLacHeroCenterProps {
  selectedTone: ToneItem;
  activeWord?: PracticeWordItem | null;
  activeRegion?: RegionId;
  isListening: boolean;
  isAnalyzing?: boolean;
  audioVolume: number;
  assessment?: FeedbackAssessment | null;
  permissionError?: string | null;
  isIntroActive?: boolean;
  onIntroComplete?: () => void;
}

export const BeLacHeroCenter: React.FC<BeLacHeroCenterProps> = ({
  selectedTone,
  activeWord = null,
  activeRegion = 'bac' as RegionId,
  isListening,
  isAnalyzing = false,
  audioVolume,
  assessment = null,
  permissionError = null,
  isIntroActive = false,
  onIntroComplete,
}) => {
  const displayWord = activeWord?.word || selectedTone.word;
  const regionShort =
    REGIONAL_PROFILES.find((r) => r.id === activeRegion)?.shortName || 'Miền Bắc';

  const handlePlaySample = () => {
    playWordAudio(displayWord, selectedTone.id, activeRegion, 1);
  };

  // Xác định trạng thái của Bé Lạc dựa trên tương tác thực tế
  let mascotState: BeLacAnimationState = 'idle';

  if (permissionError) {
    mascotState = 'error';
  } else if (isListening) {
    mascotState = 'listening';
  } else if (isAnalyzing) {
    mascotState = 'thinking';
  } else if (isIntroActive) {
    mascotState = 'intro';
  } else if (assessment) {
    const isMatch =
      assessment.predictedToneName?.trim().toLowerCase() ===
      selectedTone.name.trim().toLowerCase();
    mascotState = isMatch ? 'success' : 'uncertain';
  }

  // Chiều cao thanh sóng âm thanh hai bên
  const waveHeightsLeft = [6, 12, 18, 10, 16, 22, 14, 8];
  const waveHeightsRight = [8, 14, 22, 16, 10, 18, 12, 6];

  return (
    <div className="flex flex-col items-center justify-center text-center select-none pt-0 pb-1 w-full max-w-xl mx-auto">
      {/* 1. Nhân vật Bé Lạc tương tác đa trạng thái (Animated Mascot) */}
      <AnimatedBeLac
        state={mascotState}
        audioVolume={audioVolume}
        imageSrc="/assets/be-lac.png"
        altText="Bé Lạc - VietTone AI"
        onClick={handlePlaySample}
        onIntroComplete={onIntroComplete}
        showBadge={true}
      />

      {/* 2. Thẻ Từ mục tiêu lớn trong .vt-card + nút loa tròn 3D (.vt-btn-primary) */}
      <div className="mt-2 flex items-center justify-center gap-2 sm:gap-3.5 w-full">
        {/* Sóng âm bên trái */}
        <div className="hidden sm:flex items-center gap-0.5 sm:gap-1" aria-hidden="true">
          {waveHeightsLeft.map((h, i) => (
            <div
              key={`wl-${i}`}
              className="w-0.5 sm:w-1 bg-gradient-to-t from-[var(--vt-orange-400)] to-[var(--vt-amber-300)] rounded-full transition-all duration-150 shadow-[0_0_6px_rgba(255,145,0,0.6)]"
              style={{
                height: isListening
                  ? `${Math.max(4, h * (1 + audioVolume * 2.2))}px`
                  : `${h}px`,
              }}
            />
          ))}
        </div>

        {/* Khối .vt-card hiển thị từ mục tiêu to đậm + nút loa 3D */}
        <div className="vt-card px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 shadow-xl shadow-black/30 text-white">
          <div className="flex flex-col items-start text-left">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-white/75">
              <Target className="w-3.5 h-3.5 text-[var(--vt-amber-300)]" />
              <span>
                {selectedTone.name} · {regionShort}
              </span>
            </span>
            <span
              className={`font-black text-[var(--vt-amber-vivid)] tracking-tight leading-none mt-0.5 drop-shadow-xs ${
                displayWord.includes(' ') ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'
              }`}
            >
              {displayWord}
            </span>
            {activeWord?.meaning && (
              <span className="text-[11px] font-semibold text-white/70 mt-1">
                {activeWord.meaning}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handlePlaySample}
            className="vt-btn vt-btn-primary w-12 h-12 min-w-[48px] min-h-[48px] rounded-full p-0 shrink-0"
            title={`Nghe phát âm chuẩn: ${displayWord}`}
            aria-label={`Nghe mẫu phát âm từ ${displayWord} (${selectedTone.name})`}
          >
            <Volume2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Sóng âm bên phải */}
        <div className="hidden sm:flex items-center gap-0.5 sm:gap-1" aria-hidden="true">
          {waveHeightsRight.map((h, i) => (
            <div
              key={`wr-${i}`}
              className="w-0.5 sm:w-1 bg-gradient-to-t from-[var(--vt-orange-400)] to-[var(--vt-amber-300)] rounded-full transition-all duration-150 shadow-[0_0_6px_rgba(255,145,0,0.6)]"
              style={{
                height: isListening
                  ? `${Math.max(4, h * (1 + audioVolume * 2.2))}px`
                  : `${h}px`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
