import React from 'react';
import { Check, Star, Volume2, Headphones, Gift, ArrowRight, Sparkles } from 'lucide-react';
import { PracticeWordItem, RegionId, ToneId, ToneItem, ToneRoadmapStat } from '../../types';
import { playWordAudio } from '../../utils/audioSynthesizer';

export type SpecialNodeKind = 'review' | 'chest';

export interface PathNodeProps {
  kind: 'tone' | SpecialNodeKind;
  tone?: ToneItem;
  practiceWord?: PracticeWordItem;
  regionId?: RegionId;
  stat?: ToneRoadmapStat;
  stars?: number;
  isMastered?: boolean;
  isCurrent?: boolean;
  isChestUnlocked?: boolean;
  chestClaimed?: boolean;
  recommendedTone?: ToneItem;
  isPopoverOpen: boolean;
  offsetFactor: number;
  nodeRef?: React.Ref<HTMLDivElement>;
  onTogglePopover: () => void;
  onStartPractice: (toneId: ToneId, wordItem?: PracticeWordItem) => void;
  onOpenChest?: () => void;
}

export const PathNode: React.FC<PathNodeProps> = ({
  kind,
  tone,
  practiceWord,
  regionId = 'bac' as RegionId,
  stat,
  stars = 0,
  isMastered = false,
  isCurrent = false,
  isChestUnlocked = false,
  chestClaimed = false,
  recommendedTone,
  isPopoverOpen,
  offsetFactor,
  nodeRef,
  onTogglePopover,
  onStartPractice,
  onOpenChest,
}) => {
  const progressPercent = stat ? Math.min(100, Math.max(0, stat.matchRatio)) : 0;
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference - (progressPercent / 100) * ringCircumference;

  const unifiedOrangeNodeClass =
    'vt-node w-[72px] h-[72px] rounded-full bg-[var(--vt-orange)] border-[var(--vt-orange-200)]/75 border-b-[var(--vt-orange-shadow)] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.28)]';

  const displayWord = practiceWord?.word || tone?.word || '';
  const isMultiWord = displayWord.trim().includes(' ') || displayWord.length > 4;

  // Xác định nhãn & màu nút đồng bộ màu cam ở trạng thái bình thường (chưa chạm)
  const renderNodeButton = () => {
    if (kind === 'review') {
      return (
        <button
          type="button"
          onClick={onTogglePopover}
          title="Ôn tập thanh điệu cần củng cố"
          aria-label="Ôn tập thanh điệu có tỉ lệ đúng thấp nhất"
          aria-expanded={isPopoverOpen}
          className={unifiedOrangeNodeClass}
        >
          <Headphones className="w-7 h-7" />
        </button>
      );
    }

    if (kind === 'chest') {
      return (
        <button
          type="button"
          onClick={() => {
            if (isChestUnlocked && onOpenChest) {
              onOpenChest();
            }
            onTogglePopover();
          }}
          title={isChestUnlocked ? 'Mở rương thưởng hoàn thành chặng!' : 'Đạt ít nhất 1 sao cho cả 6 âm để mở rương'}
          aria-label={isChestUnlocked ? 'Mở rương thưởng' : 'Rương thưởng chưa mở khoá'}
          aria-expanded={isPopoverOpen}
          className={unifiedOrangeNodeClass}
        >
          <Gift className="w-7 h-7" />
        </button>
      );
    }

    // Node thanh điệu / từ luyện tập
    if (!tone) return null;

    if (isCurrent) {
      return (
        <div className="relative flex items-center justify-center">
          {/* Bong bóng "BẮT ĐẦU" phía trên nút đang học */}
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="relative px-3.5 py-1 rounded-xl bg-[var(--vt-slate-900)] border-2 border-[var(--vt-orange)] text-[var(--vt-yellow)] text-xs font-black uppercase tracking-wider whitespace-nowrap shadow-lg">
              BẮT ĐẦU
              <span
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[var(--vt-slate-900)] border-r-2 border-b-2 border-[var(--vt-orange)]"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Vòng SVG tiến độ bao quanh */}
          <svg
            className="w-[94px] h-[94px] -rotate-90 pointer-events-none"
            viewBox="0 0 94 94"
            aria-hidden="true"
          >
            <circle
              cx="47"
              cy="47"
              r={ringRadius}
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="6"
            />
            <circle
              cx="47"
              cy="47"
              r={ringRadius}
              fill="none"
              stroke="var(--vt-yellow)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>

          <button
            type="button"
            onClick={onTogglePopover}
            title={`${tone.name} (${displayWord})`}
            aria-label={`Đang học ${tone.name} (${displayWord}), bấm để mở tùy chọn luyện tập`}
            aria-expanded={isPopoverOpen}
            className={`${unifiedOrangeNodeClass} absolute`}
          >
            <span
              className={`font-black tracking-tight uppercase text-center leading-tight px-1 ${
                isMultiWord ? 'text-xs' : 'text-2xl'
              }`}
            >
              {displayWord}
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="relative inline-flex items-center justify-center">
        <button
          type="button"
          onClick={onTogglePopover}
          title={isMastered ? `${tone.name} (${displayWord}) – Đã thành thạo` : `${tone.name} (${displayWord})`}
          aria-label={
            isMastered
              ? `${tone.name} (${displayWord}) đã thành thạo, bấm để luyện lại`
              : `Chọn ${tone.name} (${displayWord})`
          }
          aria-expanded={isPopoverOpen}
          className={unifiedOrangeNodeClass}
        >
          <span
            className={`font-black tracking-tight uppercase text-center leading-tight px-1 ${
              isMultiWord ? 'text-xs' : 'text-2xl'
            }`}
          >
            {displayWord}
          </span>
        </button>

        {isMastered && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-[var(--vt-orange)] border-2 border-[var(--vt-orange-shadow)] flex items-center justify-center shadow-sm"
          >
            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      ref={nodeRef}
      className="relative flex flex-col items-center [--vt-zigzag:40px] sm:[--vt-zigzag:70px]"
      style={{
        transform: `translateX(calc(${offsetFactor.toFixed(4)} * var(--vt-zigzag)))`,
      }}
    >
      {renderNodeButton()}

      {/* Nhãn dưới nút hoặc sao thành thạo */}
      {kind === 'tone' && (isMastered || stars > 0) && (
        <div
          className="mt-1.5 flex items-center justify-center gap-1"
          aria-label={`Đạt ${stars} trên 3 sao`}
        >
          {[1, 2, 3].map((idx) => (
            <Star
              key={idx}
              className={`w-3.5 h-3.5 ${
                idx <= stars
                  ? 'text-[var(--vt-amber-300)] fill-[var(--vt-amber-300)] drop-shadow-[0_0_4px_rgba(255,183,3,0.45)]'
                  : 'text-white/20'
              }`}
            />
          ))}
        </div>
      )}

      {kind === 'review' && (
        <span className="mt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/75">
          ÔN TẬP
        </span>
      )}

      {kind === 'chest' && (
        <span className="mt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/75">
          {isChestUnlocked ? 'MỞ RƯƠNG' : 'RƯƠNG THƯỞNG'}
        </span>
      )}

      {/* Popover chi tiết ngay bên dưới nút */}
      {isPopoverOpen && (
        <div
          role="dialog"
          aria-label="Thông tin bài luyện thanh điệu"
          className="mt-3 w-64 sm:w-72 bg-[var(--vt-slate-900)]/95 backdrop-blur-xl border-2 border-white/20 border-b-4 border-b-[var(--vt-surface-shadow)] rounded-2xl p-4 shadow-2xl text-left z-30 animate-vt-pop"
        >
          {kind === 'tone' && tone && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-black text-white">
                    {displayWord} ({tone.name})
                  </h4>
                  <span className="text-xs font-extrabold text-[var(--vt-amber-300)] tabular-nums">
                    {stat?.matchRatio ?? 0}% đúng
                  </span>
                </div>
                {practiceWord?.meaning && (
                  <p className="text-xs text-white/85 font-semibold mt-0.5">
                    {practiceWord.meaning}
                  </p>
                )}
                <p className="text-[11px] text-white/65 font-semibold mt-0.5">
                  {practiceWord?.evaluationMode === 'f0_contour'
                    ? 'Chấm điểm bằng đường nét F0 & giọng mẫu chuẩn'
                    : `${stat?.totalAttempts ?? 0} lượt luyện tập`}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => playWordAudio(displayWord, tone.id, regionId, 1)}
                  aria-label={`Nghe mẫu âm ${displayWord}`}
                  className="vt-btn-3d vt-btn-secondary min-h-[44px] w-full px-3 py-2 text-xs"
                >
                  <Volume2 className="w-4 h-4 text-[var(--vt-amber-300)]" />
                  <span>NGHE MẪU</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartPractice(tone.id, practiceWord)}
                  aria-label={`Luyện ngay ${displayWord} (${tone.name})`}
                  className="vt-btn-3d vt-btn-primary min-h-[44px] w-full px-3 py-2 text-xs"
                >
                  <span>LUYỆN NGAY +10 KN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {kind === 'review' && recommendedTone && (
            <div className="space-y-3">
              <div>
                <h4 className="text-base font-black text-white">Ôn tập nhanh</h4>
                <p className="text-xs text-white/80 font-semibold mt-0.5">
                  Đề xuất ôn: <strong className="text-[var(--vt-yellow)]">{recommendedTone.name} ({recommendedTone.word})</strong>
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => playWordAudio(recommendedTone.word, recommendedTone.id, regionId, 1)}
                  aria-label={`Nghe mẫu ${recommendedTone.word}`}
                  className="vt-btn-3d vt-btn-secondary min-h-[44px] w-full px-3 py-2 text-xs"
                >
                  <Volume2 className="w-4 h-4 text-[var(--vt-amber-300)]" />
                  <span>NGHE MẪU</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartPractice(recommendedTone.id)}
                  aria-label={`Ôn tập ngay ${recommendedTone.name}`}
                  className="vt-btn-3d vt-btn-primary min-h-[44px] w-full px-3 py-2 text-xs"
                >
                  <span>ÔN TẬP NGAY +10 KN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {kind === 'chest' && (
            <div className="space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--vt-amber-500)]/20 text-[var(--vt-amber-300)] flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-black text-white">
                {isChestUnlocked
                  ? chestClaimed
                    ? 'Chúc mừng hoàn thành Phần 1!'
                    : 'Rương thưởng đã mở!'
                  : 'Rương thưởng Phần 1'}
              </h4>
              <p className="text-xs text-white/80 font-semibold leading-relaxed">
                {isChestUnlocked
                  ? 'Tuyệt vời! Bạn đã đạt ít nhất 1 sao cho cả 6 thanh điệu tiếng Việt.'
                  : 'Hãy luyện để cả 6 thanh MA, MÁ, MÀ, MẢ, MÃ, MẠ đạt ít nhất 1 sao để mở rương thưởng nhé!'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
