import React from 'react';
import { Check, X, HelpCircle, ArrowRight, RotateCcw, BarChart3 } from 'lucide-react';
import { FeedbackAssessment, PracticeWordItem, ToneItem } from '../../types';

interface ResultFooterBannerProps {
  assessment: FeedbackAssessment | null;
  selectedTone: ToneItem;
  activeWord?: PracticeWordItem | null;
  isListening: boolean;
  isAnalyzing: boolean;
  praiseVoiceText?: string | null;
  encourageVoiceText?: string | null;
  onNextTone: () => void;
  onRetry: () => void;
  onViewAnalysis: () => void;
}

export const ResultFooterBanner: React.FC<ResultFooterBannerProps> = ({
  assessment,
  selectedTone,
  activeWord = null,
  isListening,
  isAnalyzing,
  praiseVoiceText = null,
  encourageVoiceText = null,
  onNextTone,
  onRetry,
  onViewAnalysis,
}) => {
  if (!assessment || isListening || isAnalyzing) {
    return null;
  }

  const isExactTone =
    assessment.predictedToneName?.trim().toLowerCase() ===
    selectedTone.name.trim().toLowerCase();
  const isSuccess = Boolean(assessment.isAiConfident && isExactTone);
  const isUncertain = !assessment.isAiConfident;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={isSuccess ? 'Kết quả phát âm đúng' : 'Gợi ý luyện lại phát âm'}
      className={`fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t-2 shadow-[0_-12px_36px_rgba(2,6,23,0.5)] animate-vt-bounce-in ${
        isSuccess
          ? 'bg-[var(--vt-success)] border-[var(--vt-success-400)] text-white'
          : 'bg-[var(--vt-orange)] border-[var(--vt-amber-200)] text-[var(--vt-slate-950)]'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Trạng thái & lời nhắn */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-b-4 ${
              isSuccess
                ? 'bg-white text-[var(--vt-success)] border-[var(--vt-success-100)] border-b-[var(--vt-success-800)]'
                : 'bg-[var(--vt-slate-950)] text-[var(--vt-amber-300)] border-[var(--vt-slate-800)] border-b-[var(--vt-surface-shadow)]'
            }`}
            aria-hidden="true"
          >
            {isSuccess ? (
              <Check className="w-6 h-6 stroke-[3]" />
            ) : isUncertain ? (
              <HelpCircle className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <X className="w-6 h-6 stroke-[3]" />
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-black leading-snug truncate">
              {isSuccess
                ? 'Tuyệt vời!'
                : `Đáp án đúng: ${activeWord?.word || selectedTone.word} (${selectedTone.name})`}
            </h4>
            <p
              className={`text-xs sm:text-sm font-bold leading-snug line-clamp-2 ${
                isSuccess ? 'text-[var(--vt-success-100)]' : 'text-[var(--vt-slate-900)]'
              }`}
            >
              {isSuccess
                ? praiseVoiceText || assessment.headline
                : encourageVoiceText || assessment.adviceText || assessment.headline}
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2.5 shrink-0">
          {!isSuccess && (
            <button
              type="button"
              onClick={onViewAnalysis}
              aria-label="Xem phân tích chi tiết lượt đọc"
              className="min-h-[44px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold text-[var(--vt-slate-950)] hover:bg-black/10 underline decoration-2 underline-offset-4 inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-slate-950)]"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Xem phân tích</span>
            </button>
          )}

          {isSuccess ? (
            <button
              type="button"
              onClick={onNextTone}
              aria-label="Tiếp tục sang thanh điệu tiếp theo"
              className="vt-btn min-h-[44px] px-6 py-2.5 bg-white text-[var(--vt-success-800)] border-[var(--vt-success-100)] border-b-[var(--vt-success-800)] text-sm sm:text-base shadow-md hover:bg-[var(--vt-success-100)]"
            >
              <span>TIẾP TỤC</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Thử lại phát âm thanh này"
              className="vt-btn min-h-[44px] px-6 py-2.5 bg-[var(--vt-slate-950)] text-white border-[var(--vt-slate-800)] border-b-black text-sm sm:text-base shadow-md hover:bg-[var(--vt-slate-900)]"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.75]" />
              <span>THỬ LẠI</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
