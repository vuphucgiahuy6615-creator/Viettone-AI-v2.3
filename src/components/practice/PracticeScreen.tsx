import React from 'react';
import { X, Flame, ShieldCheck, Info } from 'lucide-react';
import {
  F0ContourData,
  F0ScoreResult,
  FeedbackAssessment,
  PracticeWordItem,
  ReferenceToneSample,
  RegionId,
  StreakInfo,
  ToneItem,
} from '../../types';
import { ConfettiEffect } from '../ConfettiEffect';
import { BeLacHeroCenter } from '../immersive/BeLacHeroCenter';
import { BeLacDialogueBox } from '../immersive/BeLacDialogueBox';
import { InlineAnalysisPanel } from '../immersive/InlineAnalysisPanel';
import { ResultFooterBanner } from '../immersive/ResultFooterBanner';

interface PracticeScreenProps {
  selectedTone: ToneItem;
  activeWord?: PracticeWordItem | null;
  activeRegion?: RegionId;
  isListening: boolean;
  isAnalyzing: boolean;
  noSpeechDetected: boolean;
  audioVolume: number;
  permissionError: string | null;
  isIntroActive: boolean;
  onIntroComplete: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onNextTone: () => void;
  onExitPractice: () => void;
  currentProbabilities: Record<string, number>;
  topToneName: string | null;
  topToneScore: number;
  userContour: F0ContourData | null;
  refSample: ReferenceToneSample | null;
  f0ScoreResult: F0ScoreResult | null;
  feedbackAssessment: FeedbackAssessment | null;
  isInlineAnalysisOpen: boolean;
  onToggleInlineAnalysis: () => void;
  onOpenAndScrollAnalysis: () => void;
  analysisPanelRef: React.RefObject<HTMLDivElement | null>;
  encourageVoiceText: string | null;
  praiseVoiceText: string | null;
  isFallbackMode: boolean;
  isConfettiActive: boolean;
  onConfettiComplete: () => void;
  onOpenTeacherModal: () => void;
  streakInfo: StreakInfo;
  todayAttemptsCount: number;
  dailyGoal: number;
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  selectedTone,
  activeWord = null,
  activeRegion = 'bac',
  isListening,
  isAnalyzing,
  noSpeechDetected,
  audioVolume,
  permissionError,
  isIntroActive,
  onIntroComplete,
  onStartListening,
  onStopListening,
  onNextTone,
  onExitPractice,
  currentProbabilities,
  topToneName,
  topToneScore,
  userContour,
  refSample,
  f0ScoreResult,
  feedbackAssessment,
  isInlineAnalysisOpen,
  onToggleInlineAnalysis,
  onOpenAndScrollAnalysis,
  analysisPanelRef,
  encourageVoiceText,
  praiseVoiceText,
  isFallbackMode,
  isConfettiActive,
  onConfettiComplete,
  onOpenTeacherModal,
  streakInfo,
  todayAttemptsCount,
  dailyGoal,
}) => {
  const showResultBanner = feedbackAssessment !== null && !isListening && !isAnalyzing;
  const showInlineAnalysis = showResultBanner && isInlineAnalysisOpen;
  const dailyPercent = Math.min(100, Math.round((todayAttemptsCount / dailyGoal) * 100));

  return (
    <div className="min-h-screen bg-[url('/assets/practice-bg.jpg')] bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col font-['Nunito','Be_Vietnam_Pro',sans-serif] text-white selection:bg-[var(--vt-red)] selection:text-white">
      {/* Lớp phủ gradient nhẹ giúp tăng chiều sâu và độ tương phản */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/60 pointer-events-none -z-0" />

      <ConfettiEffect active={isConfettiActive} onComplete={onConfettiComplete} />

      {/* Header bài học tối giản kiểu Duolingo: Nút ✕ (trái) | Thanh tiến độ hôm nay (giữa) | Streak 🔥 (phải) */}
      <header className="w-full bg-[var(--vt-surface)] backdrop-blur-md border-b-2 border-white/15 sticky top-0 z-30 shadow-sm text-white">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-5">
          <button
            type="button"
            onClick={onExitPractice}
            aria-label="Thoát màn luyện tập và quay về đường tiến độ"
            title="Quay về đường tiến độ (/app)"
            className="vt-btn vt-btn-secondary min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Thanh tiến độ lượt hôm nay */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div
              className="w-full h-4 rounded-full bg-white/15 border border-white/20 overflow-hidden p-0.5 shadow-inner"
              role="progressbar"
              aria-valuenow={Math.min(todayAttemptsCount, dailyGoal)}
              aria-valuemin={0}
              aria-valuemax={dailyGoal}
              aria-label={`Tiến độ luyện tập hôm nay: ${todayAttemptsCount} trên ${dailyGoal} lượt`}
            >
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] transition-all duration-300 shadow-[0_0_10px_rgba(255,145,0,0.45)]"
                style={{ width: `${Math.max(dailyPercent, todayAttemptsCount > 0 ? 8 : 0)}%` }}
              >
                <div className="absolute top-[2px] left-1.5 right-1.5 h-[3px] rounded-full bg-white/40 pointer-events-none" />
              </div>
            </div>
            <span className="text-xs sm:text-sm font-black text-[var(--vt-amber-300)] shrink-0 tabular-nums">
              {todayAttemptsCount}/{dailyGoal}
            </span>
          </div>

          {/* Streak 🔥 */}
          <div
            className={`vt-chip min-h-[44px] px-3 py-1.5 text-xs sm:text-sm shrink-0 ${
              streakInfo.currentStreak > 0
                ? 'bg-[var(--vt-orange-500)]/25 border-[var(--vt-orange-400)]/60 border-b-[var(--vt-orange-shadow)] text-[var(--vt-orange-200)]'
                : 'bg-white/10 border-white/20 border-b-[var(--vt-surface-shadow)] text-white/80'
            }`}
            aria-label={`Chuỗi ${streakInfo.currentStreak} ngày luyện tập`}
          >
            <Flame
              className={`w-4 h-4 ${
                streakInfo.currentStreak > 0
                  ? 'text-[var(--vt-orange-400)] fill-[var(--vt-orange-400)]'
                  : 'text-white/60'
              }`}
            />
            <span className="font-black">{streakInfo.currentStreak}</span>
          </div>
        </div>
      </header>

      {/* Main Practice Content (KHÔNG còn SixToneCardsBottom) */}
      <main
        className={`relative z-10 flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-3 sm:py-5 flex flex-col items-center ${
          showInlineAnalysis
            ? 'justify-start gap-4 sm:gap-5 pb-48 sm:pb-32'
            : showResultBanner
              ? 'justify-start gap-4 pb-48 sm:pb-32'
              : 'justify-center gap-4 pb-8'
        }`}
      >
        {/* A. Bé Lạc trung tâm & Từ mục tiêu */}
        <BeLacHeroCenter
          selectedTone={selectedTone}
          activeWord={activeWord}
          activeRegion={activeRegion}
          isListening={isListening}
          isAnalyzing={isAnalyzing}
          audioVolume={audioVolume}
          assessment={feedbackAssessment}
          permissionError={permissionError}
          isIntroActive={isIntroActive}
          onIntroComplete={onIntroComplete}
        />

        {/* B. Khung hội thoại Bé Lạc (Microphone & Kết quả AI trực tiếp) */}
        <BeLacDialogueBox
          selectedTone={selectedTone}
          activeWord={activeWord}
          isListening={isListening}
          isAnalyzing={isAnalyzing}
          noSpeechDetected={noSpeechDetected}
          audioVolume={audioVolume}
          permissionError={permissionError}
          onStartListening={onStartListening}
          onStopListening={onStopListening}
          onRetryPermission={onStartListening}
          assessment={feedbackAssessment}
          userContour={userContour}
          f0ScoreResult={f0ScoreResult}
          onOpenAnalysis={onToggleInlineAnalysis}
          isAnalysisOpen={isInlineAnalysisOpen}
          encourageVoiceText={encourageVoiceText}
          praiseVoiceText={praiseVoiceText}
        />

        {/* C. Phần phân tích chi tiết hiển thị ngay bên dưới sau khi thu âm xong */}
        {showInlineAnalysis && (
          <InlineAnalysisPanel
            ref={analysisPanelRef}
            selectedTone={selectedTone}
            activeWord={activeWord}
            currentProbabilities={currentProbabilities}
            topToneName={topToneName}
            topToneScore={topToneScore}
            userContour={userContour}
            refSample={refSample}
            f0ScoreResult={f0ScoreResult}
            feedbackAssessment={feedbackAssessment}
            isListening={isListening}
            onRetry={onStartListening}
            onNextTone={onNextTone}
            onOpenTeacherModal={onOpenTeacherModal}
          />
        )}

        {/* Fallback Mode Note nếu URL mô hình lỗi mạng */}
        {isFallbackMode && (
          <div className="w-full max-w-2xl p-2.5 rounded-2xl bg-[var(--vt-amber-500)]/20 border border-[var(--vt-amber-400)]/40 text-[var(--vt-amber-200)] text-xs sm:text-sm flex items-center gap-2 shadow-xs backdrop-blur-md">
            <Info className="w-4 h-4 text-[var(--vt-amber-400)] shrink-0" />
            <span className="truncate">
              Chế độ mô phỏng F0 thời gian thực đang chạy trực tiếp trên trình duyệt.
            </span>
          </div>
        )}

        {/* Footer Quyền riêng tư */}
        <div className="w-full pt-1.5 pb-1 flex items-center justify-center gap-2 text-center text-xs sm:text-sm text-white/75">
          <ShieldCheck className="w-4 h-4 text-[var(--vt-success-400)] shrink-0" />
          <span>
            Âm thanh được phân tích trực tiếp trên thiết bị của bạn, tuyệt đối bảo mật.
          </span>
        </div>
      </main>

      {/* D. Banner kết quả trượt lên ở đáy màn hình kiểu Duolingo */}
      <ResultFooterBanner
        assessment={feedbackAssessment}
        selectedTone={selectedTone}
        activeWord={activeWord}
        isListening={isListening}
        isAnalyzing={isAnalyzing}
        praiseVoiceText={praiseVoiceText}
        encourageVoiceText={encourageVoiceText}
        onNextTone={onNextTone}
        onRetry={onStartListening}
        onViewAnalysis={onOpenAndScrollAnalysis}
      />
    </div>
  );
};
