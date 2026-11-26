import React, { useCallback, useRef, useState } from 'react';
import { Compass, Headphones, GitCompareArrows, Radio } from 'lucide-react';
import {
  LearningModeTab,
  MilestoneBadge,
  PracticeAttempt,
  PracticeWordItem,
  RegionId,
  StreakInfo,
  ToneId,
  ToneRoadmapStat,
} from '../../types';
import { REGION_SCENES } from '../../data/regionScenes';
import { stopAnyVoiceAudio } from '../../utils/audioSynthesizer';
import { ConfettiEffect } from '../ConfettiEffect';
import { PathSidebar } from './PathSidebar';
import { LessonPath } from './LessonPath';
import { RegionDivider } from './RegionDivider';
import { RegionScrollIndicator } from './RegionScrollIndicator';
import { RegionSection } from './RegionSection';
import { RightRail, CompactStatsBar, computeTotalXp } from './RightRail';
import { RegionSelectorBar } from '../modes/RegionSelectorBar';
import { ListenGuessGame } from '../modes/ListenGuessGame';
import { MinimalPairsArena } from '../modes/MinimalPairsArena';
import { DatasetStudio } from '../modes/DatasetStudio';

interface LearningPathHomeProps {
  roadmapStats: ToneRoadmapStat[];
  nextRecommended: { toneId: ToneId; reason: string };
  historyAttempts: PracticeAttempt[];
  streakInfo: StreakInfo;
  milestoneBadges: MilestoneBadge[];
  todayAttemptsCount: number;
  dailyGoal: number;
  soundFxEnabled: boolean;
  isConfettiActive: boolean;
  activeRegion: RegionId;
  activeModeTab: LearningModeTab;
  hasCustomRegionModel: boolean;
  onSelectRegion: (regionId: RegionId) => void;
  onSelectModeTab: (tab: LearningModeTab) => void;
  onTeacherSamplesUpdated: () => void;
  onConfettiComplete: () => void;
  onCelebrateChest: () => void;
  onToggleSoundFx: () => void;
  onGoHome: () => void;
  onStartPractice: (toneId: ToneId, wordItem?: PracticeWordItem) => void;
  onOpenAnalysis: () => void;
  onOpenRoadmap: () => void;
  onOpenProgress: () => void;
  onOpenAchievements: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onOpenVoiceModelModal: () => void;
  isCustomModelActive?: boolean;
}

const MODE_TABS: Array<{
  id: LearningModeTab;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'path', label: 'Lộ trình từ vựng', Icon: Compass },
  { id: 'quiz', label: 'Nghe & Đoán thanh', Icon: Headphones },
  { id: 'pairs', label: 'Đấu cặp dễ nhầm', Icon: GitCompareArrows },
  { id: 'studio', label: 'Phòng thu dữ liệu', Icon: Radio },
];

export const LearningPathHome: React.FC<LearningPathHomeProps> = ({
  roadmapStats,
  nextRecommended,
  historyAttempts,
  streakInfo,
  milestoneBadges,
  todayAttemptsCount,
  dailyGoal,
  soundFxEnabled,
  isConfettiActive,
  activeRegion,
  activeModeTab,
  hasCustomRegionModel,
  onSelectRegion,
  onSelectModeTab,
  onTeacherSamplesUpdated,
  onConfettiComplete,
  onCelebrateChest,
  onToggleSoundFx,
  onGoHome,
  onStartPractice,
  onOpenAnalysis,
  onOpenRoadmap,
  onOpenProgress,
  onOpenAchievements,
  onOpenGuide,
  onOpenSettings,
  onOpenVoiceModelModal,
  isCustomModelActive = false,
}) => {
  const totalXp = computeTotalXp(historyAttempts);
  const [visibleRegion, setVisibleRegion] = useState<RegionId>('bac');
  const sectionRefs = useRef<Partial<Record<RegionId, HTMLElement | null>>>({});

  const handleBecomeVisible = useCallback((regionId: RegionId) => {
    setVisibleRegion((prev) => (prev === regionId ? prev : regionId));
  }, []);

  const handleJumpToRegion = useCallback((regionId: RegionId) => {
    setVisibleRegion(regionId);
    sectionRefs.current[regionId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const handleTabChange = (tab: LearningModeTab) => {
    stopAnyVoiceAudio();
    onSelectModeTab(tab);
  };

  return (
    <div className="min-h-screen bg-[url('/assets/practice-bg.jpg')] bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col font-['Nunito','Be_Vietnam_Pro',sans-serif] text-white selection:bg-[var(--vt-red)] selection:text-white">
      {/* Lớp phủ tối giữ nguyên bảng màu VietTone */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70 pointer-events-none" />

      <ConfettiEffect active={isConfettiActive} onComplete={onConfettiComplete} />

      {/* Cột 1: Sidebar trái (Desktop) / Icon rail (Tablet) / Bottom nav (Mobile) */}
      <PathSidebar
        onGoHome={onGoHome}
        onOpenAnalysis={onOpenAnalysis}
        onOpenRoadmap={onOpenRoadmap}
        onOpenProgress={onOpenProgress}
        onOpenAchievements={onOpenAchievements}
        onOpenGuide={onOpenGuide}
        onOpenSettings={onOpenSettings}
        onOpenVoiceModelModal={onOpenVoiceModelModal}
        isCustomModelActive={isCustomModelActive}
      />

      {/* Nội dung chính (chừa khoảng sidebar trái ở md/lg+) */}
      <main className="relative z-10 flex-1 md:pl-20 lg:pl-64">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* Thanh chỉ số nhanh phía trên cột giữa cho Tablet & Mobile */}
          <div className="w-full lg:hidden">
            <CompactStatsBar
              streakInfo={streakInfo}
              totalXp={totalXp}
              todayAttemptsCount={todayAttemptsCount}
              dailyGoal={dailyGoal}
              soundFxEnabled={soundFxEnabled}
              onToggleSoundFx={onToggleSoundFx}
              onOpenAchievements={onOpenAchievements}
            />
          </div>

          {/* Cột 2: Bộ chọn vùng miền + Tab chế độ + Nội dung chế độ đang chọn */}
          <div className="flex-1 w-full max-w-2xl mx-auto space-y-3.5">
            <RegionSelectorBar
              activeRegion={activeRegion}
              onSelectRegion={onSelectRegion}
              hasCustomRegionModel={hasCustomRegionModel}
              onOpenModelModal={onOpenVoiceModelModal}
            />

            {/* Thanh Tab chuyển 4 chế độ */}
            <nav
              aria-label="Chế độ luyện tập VietTone AI"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[var(--vt-slate-900)]/75 backdrop-blur-xl border-2 border-white/15"
            >
              {MODE_TABS.map(({ id, label, Icon }) => {
                const isActive = activeModeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleTabChange(id)}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                      isActive
                        ? 'bg-[var(--vt-orange)] text-white shadow-md'
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>

            {activeModeTab === 'path' && (
              <div className="w-full space-y-2 pb-20 md:pb-10">
                <RegionScrollIndicator
                  visibleRegion={visibleRegion}
                  onJumpToRegion={handleJumpToRegion}
                />

                {REGION_SCENES.map((scene, index) => (
                  <React.Fragment key={scene.id}>
                    {index > 0 && scene.dividerTitle && (
                      <RegionDivider
                        title={scene.dividerTitle}
                        subtitle={scene.dividerSubtitle}
                      />
                    )}

                    <RegionSection
                      scene={scene}
                      activePracticeRegion={activeRegion}
                      visibleRegion={visibleRegion}
                      onBecomeVisible={handleBecomeVisible}
                      onSelectPracticeRegion={onSelectRegion}
                      sectionRefCallback={(el) => {
                        sectionRefs.current[scene.id] = el;
                      }}
                    >
                      <LessonPath
                        roadmapStats={roadmapStats}
                        nextRecommendedToneId={nextRecommended.toneId}
                        activeRegion={activeRegion}
                        defaultStage={scene.recommendedStage}
                        autoScrollToActive={false}
                        showFloatingMascot={false}
                        onStartPractice={onStartPractice}
                        onOpenGuide={onOpenGuide}
                        onCelebrateChest={onCelebrateChest}
                      />
                    </RegionSection>
                  </React.Fragment>
                ))}
              </div>
            )}

            {activeModeTab === 'quiz' && (
              <ListenGuessGame
                activeRegion={activeRegion}
                onPracticeWeakTone={(toneId, wordItem) => onStartPractice(toneId, wordItem)}
              />
            )}

            {activeModeTab === 'pairs' && (
              <MinimalPairsArena activeRegion={activeRegion} />
            )}

            {activeModeTab === 'studio' && (
              <DatasetStudio
                activeRegion={activeRegion}
                onSamplesUpdated={onTeacherSamplesUpdated}
              />
            )}
          </div>

          {/* Cột 3: Bảng chỉ số, Nhiệm vụ, Đề xuất & Huy hiệu (Desktop >= 1024px) */}
          <RightRail
            streakInfo={streakInfo}
            historyAttempts={historyAttempts}
            todayAttemptsCount={todayAttemptsCount}
            dailyGoal={dailyGoal}
            soundFxEnabled={soundFxEnabled}
            onToggleSoundFx={onToggleSoundFx}
            nextRecommended={nextRecommended}
            milestoneBadges={milestoneBadges}
            onStartPractice={onStartPractice}
            onOpenAchievements={onOpenAchievements}
          />
        </div>
      </main>
    </div>
  );
};
