import React, { forwardRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ToneItem,
  FeedbackAssessment,
  F0ContourData,
  ReferenceToneSample,
  F0ScoreResult,
  PracticeWordItem,
} from '../../types';
import { AiProbabilityBars } from '../AiProbabilityBars';
import { F0ScoreCard } from '../F0ScoreCard';
import { F0ContourChart } from '../F0ContourChart';
import { DetailedFeedback } from '../DetailedFeedback';

export interface InlineAnalysisPanelProps {
  selectedTone: ToneItem;
  activeWord?: PracticeWordItem | null;
  currentProbabilities: Record<string, number>;
  topToneName: string | null;
  topToneScore: number;
  userContour: F0ContourData | null;
  refSample: ReferenceToneSample | null;
  f0ScoreResult: F0ScoreResult | null;
  feedbackAssessment: FeedbackAssessment | null;
  isListening: boolean;
  onRetry: () => void;
  onNextTone: () => void;
  onOpenTeacherModal: () => void;
}

export const InlineAnalysisPanel = forwardRef<HTMLDivElement, InlineAnalysisPanelProps>(
  (
    {
      selectedTone,
      activeWord = null,
      currentProbabilities,
      topToneName,
      topToneScore,
      userContour,
      refSample,
      f0ScoreResult,
      feedbackAssessment,
      isListening,
      onRetry,
      onNextTone,
      onOpenTeacherModal,
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    return (
      <section
        ref={ref}
        aria-label="Phân tích chi tiết lượt đọc"
        className="w-full max-w-2xl mx-auto scroll-mt-20 bg-[var(--vt-surface-modal)]/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] border-2 border-white/70 border-b-4 border-b-[var(--vt-slate-shadow)] text-[var(--vt-slate-900)] overflow-hidden animate-vt-pop"
      >
        {/* Header thu gọn / mở rộng */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[var(--vt-red-50)] border border-[var(--vt-red-200)] text-[var(--vt-red-600)] flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-[var(--vt-slate-900)] truncate">
                Phân tích chi tiết lượt đọc
              </h3>
              <p className="text-xs text-[var(--vt-slate-500)] truncate font-semibold">
                Mục tiêu: <strong className="text-[var(--vt-slate-700)]">{activeWord?.word || selectedTone.word}</strong> ({selectedTone.name})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="vt-btn vt-btn-secondary-light min-h-[44px] px-3.5 py-2 text-xs shrink-0"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Thu gọn phân tích chi tiết' : 'Mở rộng phân tích chi tiết'}
          >
            <span>{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--vt-slate-600)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--vt-slate-600)]" />
            )}
          </button>
        </div>

        {/* 4 khối phân tích theo cùng thứ tự như AnalysisModal */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* 1. Xác suất nhận diện 6 thanh */}
            <AiProbabilityBars
              probabilities={currentProbabilities}
              topToneName={topToneName}
              topToneScore={topToneScore}
              isListening={isListening}
              selectedToneName={selectedTone.name}
              hybridAgreement={feedbackAssessment?.agreementStatus}
              hybridExplanation={feedbackAssessment?.hybridExplanation}
            />

            {/* 2. Điểm tương đồng F0 (0–100) */}
            {f0ScoreResult && (
              <F0ScoreCard
                f0Result={f0ScoreResult}
                aiConfidencePercent={Math.round(topToneScore * 100)}
                topToneName={topToneName}
              />
            )}

            {/* 3. Biểu đồ đường cao độ F0 (Hz vs ms) */}
            <div className="w-full overflow-x-auto">
              <F0ContourChart
                userContour={userContour}
                refSample={refSample}
                targetToneName={selectedTone.name}
                isListening={isListening}
                onOpenTeacherModal={onOpenTeacherModal}
              />
            </div>

            {/* 4. Phản hồi sư phạm chi tiết */}
            <DetailedFeedback
              assessment={feedbackAssessment}
              targetTone={selectedTone}
              isListening={isListening}
              onRetry={onRetry}
              onNextTone={onNextTone}
            />
          </div>
        )}
      </section>
    );
  }
);

InlineAnalysisPanel.displayName = 'InlineAnalysisPanel';
