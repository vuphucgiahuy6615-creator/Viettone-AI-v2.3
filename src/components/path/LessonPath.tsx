import React, { useEffect, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { VIETNAMESE_TONES } from '../../data/tones';
import {
  STAGE1_MA_WORDS,
  STAGE2_SYLLABLE_FAMILIES,
  STAGE3_COMPOUND_WORDS,
  STAGE_METADATA,
} from '../../data/vocabulary';
import {
  PracticeWordItem,
  RegionId,
  ToneId,
  ToneRoadmapStat,
  VocabularyStageId,
} from '../../types';
import { PathNode } from './PathNode';

interface LessonPathProps {
  roadmapStats: ToneRoadmapStat[];
  nextRecommendedToneId: ToneId;
  activeRegion: RegionId;
  defaultStage?: VocabularyStageId;
  autoScrollToActive?: boolean;
  showFloatingMascot?: boolean;
  onStartPractice: (toneId: ToneId, wordItem?: PracticeWordItem) => void;
  onOpenGuide: () => void;
  onCelebrateChest: () => void;
}

export function getToneNodeStatus(stat?: ToneRoadmapStat) {
  const totalAttempts = stat?.totalAttempts ?? 0;
  const matchRatio = stat?.matchRatio ?? 0;
  const avgF0 = stat?.avgF0Score ?? null;
  const validAttempts = stat?.validAttempts ?? 0;

  const isMastered = totalAttempts >= 3 && matchRatio >= 70;

  let stars = 0;
  if (totalAttempts >= 3 && matchRatio >= 85 && (avgF0 === null || avgF0 >= 75)) {
    stars = 3;
  } else if (isMastered) {
    stars = 2;
  } else if (totalAttempts >= 1 && (matchRatio > 0 || validAttempts >= 1)) {
    stars = 1;
  }

  return { isMastered, stars };
}

export const LessonPath: React.FC<LessonPathProps> = ({
  roadmapStats,
  nextRecommendedToneId,
  activeRegion,
  defaultStage = 'stage1_ma' as VocabularyStageId,
  autoScrollToActive = true,
  showFloatingMascot = true,
  onStartPractice,
  onOpenGuide,
  onCelebrateChest,
}) => {
  const activeStage: VocabularyStageId = defaultStage;
  const [activeFamily, setActiveFamily] = useState<string>('ba');
  const [openNodeKey, setOpenNodeKey] = useState<string | null>(null);
  const [chestClaimed, setChestClaimed] = useState<boolean>(false);
  const activeNodeRef = useRef<HTMLDivElement | null>(null);

  const stageWords: PracticeWordItem[] =
    activeStage === 'stage1_ma'
      ? STAGE1_MA_WORDS
      : activeStage === 'stage2_syllables'
        ? STAGE2_SYLLABLE_FAMILIES.find((f) => f.family === activeFamily)?.words ||
          STAGE2_SYLLABLE_FAMILIES[0].words
        : STAGE3_COMPOUND_WORDS;

  const stageMeta = STAGE_METADATA[activeStage];

  const toneStatuses = VIETNAMESE_TONES.map((tone) => {
    const stat = roadmapStats.find((s) => s.toneId === tone.id);
    return {
      tone,
      stat,
      ...getToneNodeStatus(stat),
    };
  });

  const recommendedStatus = toneStatuses.find((t) => t.tone.id === nextRecommendedToneId);
  const firstUnmastered = toneStatuses.find((t) => !t.isMastered);
  const currentToneId: ToneId =
    recommendedStatus && !recommendedStatus.isMastered
      ? recommendedStatus.tone.id
      : firstUnmastered
        ? firstUnmastered.tone.id
        : nextRecommendedToneId;

  const allSixHaveOneStar = toneStatuses.every((t) => t.stars >= 1);

  const reviewToneItem =
    VIETNAMESE_TONES.find((t) => t.id === nextRecommendedToneId) || VIETNAMESE_TONES[0];

  useEffect(() => {
    if (!autoScrollToActive) return;
    const timer = window.setTimeout(() => {
      activeNodeRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [autoScrollToActive]);

  const handleToggle = (key: string) => {
    setOpenNodeKey((prev) => (prev === key ? null : key));
  };

  return (
    <section className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center pb-24 md:pb-12">

      {/* Banner chương trên cùng */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] border-2 border-white/20 border-b-4 border-b-[var(--vt-red-shadow)] p-4 sm:p-5 shadow-[0_10px_30px_rgba(239,35,60,0.3)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-white/85">
            {stageMeta.subtitle} · {stageMeta.badge}
          </p>
          <h3 className="text-lg sm:text-2xl font-black text-white leading-tight mt-0.5">
            {stageMeta.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={onOpenGuide}
          aria-label="Mở hướng dẫn phát âm 6 thanh điệu"
          className="vt-btn-3d min-h-[44px] px-3.5 sm:px-4 py-2 bg-black/15 hover:bg-black/25 text-white border-white/40 border-b-black/35 text-xs sm:text-sm shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          <span>HƯỚNG DẪN</span>
        </button>
      </div>

      {/* Thanh chọn họ âm tiết cho Chặng 2 */}
      {activeStage === 'stage2_syllables' && (
        <div className="w-full mt-3 flex items-center justify-center gap-2 flex-wrap">
          {STAGE2_SYLLABLE_FAMILIES.map((fam) => {
            const isFamActive = fam.family === activeFamily;
            return (
              <button
                key={fam.family}
                type="button"
                onClick={() => {
                  setActiveFamily(fam.family);
                  setOpenNodeKey(null);
                }}
                className={`min-h-[38px] px-4 py-1.5 rounded-xl border text-xs font-extrabold transition-colors cursor-pointer ${
                  isFamActive
                    ? 'bg-white text-[var(--vt-slate-950)] border-white shadow-sm'
                    : 'bg-[var(--vt-slate-900)]/65 border-white/15 text-white/80 hover:bg-white/10'
                }`}
              >
                {fam.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Đường zig-zag dọc */}
      <div className="relative w-full pt-14 pb-6 flex flex-col items-center gap-8 sm:gap-9">
        {showFloatingMascot && (
          <>
            {/* Nhân vật Bé Lạc đứng ở khoảng trống đối diện giữa đường đi */}
            <div
              className="hidden sm:flex flex-col items-center absolute right-4 md:right-8 top-[42%] -translate-y-1/2 pointer-events-none select-none z-10"
              aria-hidden="true"
            >
              <img
                src="/assets/be-lac-cool.png"
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets/be-lac.png';
                }}
                className="w-32 md:w-36 h-auto object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)] animate-vt-breathe"
              />
              <div className="w-24 h-2.5 rounded-full bg-black/40 blur-xs mt-1" />
            </div>

            {/* Bé Lạc thu gọn cho màn hình mobile để không chồng lên nút */}
            <div className="sm:hidden flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[var(--vt-slate-900)]/65 border border-white/15 backdrop-blur-md">
              <img
                src="/assets/be-lac-cool.png"
                alt="Bé Lạc đồng hành"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets/be-lac.png';
                }}
                className="w-12 h-12 object-contain animate-vt-breathe"
              />
              <p className="text-xs font-bold text-white/90">
                Chọn một từ trên đường đi bên dưới để bắt đầu luyện cùng Bé Lạc!
              </p>
            </div>
          </>
        )}

        {stageWords.map((wordItem, idx) => {
          const tone =
            VIETNAMESE_TONES.find((t) => t.id === wordItem.toneId) || VIETNAMESE_TONES[0];
          const stat = roadmapStats.find((s) => s.toneId === tone.id);
          const { isMastered, stars } = getToneNodeStatus(stat);
          const isCurrent =
            activeStage === 'stage1_ma'
              ? tone.id === currentToneId
              : idx === 0;
          const offsetFactor = Math.sin(idx * 0.9);
          const key = `word-${wordItem.id}`;

          return (
            <PathNode
              key={key}
              kind="tone"
              tone={tone}
              practiceWord={wordItem}
              regionId={activeRegion}
              stat={stat}
              stars={stars}
              isMastered={isMastered}
              isCurrent={isCurrent}
              isPopoverOpen={openNodeKey === key}
              offsetFactor={offsetFactor}
              nodeRef={isCurrent ? activeNodeRef : undefined}
              onTogglePopover={() => handleToggle(key)}
              onStartPractice={onStartPractice}
            />
          );
        })}

        {/* Nút đặc biệt: ÔN TẬP */}
        <PathNode
          kind="review"
          recommendedTone={reviewToneItem}
          regionId={activeRegion}
          isPopoverOpen={openNodeKey === 'review'}
          offsetFactor={Math.sin(stageWords.length * 0.9)}
          onTogglePopover={() => handleToggle('review')}
          onStartPractice={onStartPractice}
        />

        {/* Nút đặc biệt: RƯƠNG THƯỞNG */}
        <PathNode
          kind="chest"
          isChestUnlocked={allSixHaveOneStar}
          chestClaimed={chestClaimed}
          isPopoverOpen={openNodeKey === 'chest'}
          offsetFactor={Math.sin((stageWords.length + 1) * 0.9)}
          onTogglePopover={() => handleToggle('chest')}
          onStartPractice={onStartPractice}
          onOpenChest={() => {
            setChestClaimed(true);
            onCelebrateChest();
          }}
        />
      </div>
    </section>
  );
};
