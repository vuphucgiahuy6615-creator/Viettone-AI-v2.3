import React, { useEffect, useState } from 'react';
import {
  Mic,
  Square,
  RotateCcw,
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ToneItem, FeedbackAssessment, F0ContourData, F0ScoreResult, PracticeWordItem } from '../../types';
import { TONE_NAME_MAP } from '../../data/tones';

interface BeLacDialogueBoxProps {
  selectedTone: ToneItem;
  activeWord?: PracticeWordItem | null;
  isListening: boolean;
  isAnalyzing?: boolean;
  noSpeechDetected?: boolean;
  audioVolume: number;
  permissionError: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  onRetryPermission: () => void;
  assessment: FeedbackAssessment | null;
  userContour: F0ContourData | null;
  f0ScoreResult: F0ScoreResult | null;
  onOpenAnalysis?: () => void;
  isAnalysisOpen?: boolean;
  encourageVoiceText?: string | null;
  praiseVoiceText?: string | null;
}

export const BeLacDialogueBox: React.FC<BeLacDialogueBoxProps> = ({
  selectedTone,
  activeWord = null,
  isListening,
  isAnalyzing = false,
  noSpeechDetected = false,
  audioVolume,
  permissionError,
  onStartListening,
  onStopListening,
  onRetryPermission,
  assessment,
  userContour,
  f0ScoreResult,
  onOpenAnalysis,
  isAnalysisOpen = true,
  encourageVoiceText = null,
  praiseVoiceText = null,
}) => {
  const displayWord = activeWord?.word || selectedTone.word;
  // Sóng âm thanh hai bên Microphone
  const [leftWave, setLeftWave] = useState<number[]>([10, 16, 24, 14, 20, 28, 18, 12]);
  const [rightWave, setRightWave] = useState<number[]>([12, 18, 28, 20, 14, 24, 16, 10]);

  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => {
      const volMult = Math.max(0.3, audioVolume * 3.8);
      setLeftWave([
        Math.min(100, Math.floor((10 + Math.random() * 35) * volMult)),
        Math.min(100, Math.floor((16 + Math.random() * 50) * volMult)),
        Math.min(100, Math.floor((24 + Math.random() * 65) * volMult)),
        Math.min(100, Math.floor((14 + Math.random() * 45) * volMult)),
        Math.min(100, Math.floor((20 + Math.random() * 60) * volMult)),
        Math.min(100, Math.floor((28 + Math.random() * 70) * volMult)),
        Math.min(100, Math.floor((18 + Math.random() * 50) * volMult)),
        Math.min(100, Math.floor((12 + Math.random() * 40) * volMult)),
      ]);
      setRightWave([
        Math.min(100, Math.floor((12 + Math.random() * 40) * volMult)),
        Math.min(100, Math.floor((18 + Math.random() * 50) * volMult)),
        Math.min(100, Math.floor((28 + Math.random() * 70) * volMult)),
        Math.min(100, Math.floor((20 + Math.random() * 60) * volMult)),
        Math.min(100, Math.floor((14 + Math.random() * 45) * volMult)),
        Math.min(100, Math.floor((24 + Math.random() * 65) * volMult)),
        Math.min(100, Math.floor((16 + Math.random() * 50) * volMult)),
        Math.min(100, Math.floor((10 + Math.random() * 35) * volMult)),
      ]);
    }, 90);
    return () => clearInterval(interval);
  }, [isListening, audioVolume]);

  // Phân tích trạng thái dữ liệu thực tế
  type DialogueState =
    | 'ready'
    | 'listening'
    | 'confident_match'
    | 'confident_mismatch'
    | 'uncertain'
    | 'low_audio_quality'
    | 'no_valid_f0'
    | 'error';

  let dialogueState: DialogueState = 'ready';

  if (permissionError) {
    dialogueState = 'error';
  } else if (isListening) {
    dialogueState = 'listening';
  } else if (noSpeechDetected) {
    dialogueState = 'low_audio_quality';
  } else if (assessment) {
    const isQuietOrNoSignal =
      !userContour ||
      userContour.points.length === 0 ||
      userContour.unreliableReason?.includes('Chưa thu nhận') ||
      (userContour.voicedFramesCount < 3 && !assessment.isAiConfident);

    const isNoF0 = !userContour?.isReliable;

    if (isQuietOrNoSignal) {
      dialogueState = 'low_audio_quality';
    } else if (isNoF0 && !assessment.isAiConfident) {
      dialogueState = 'no_valid_f0';
    } else if (!assessment.isAiConfident) {
      dialogueState = 'uncertain';
    } else {
      const isMatch =
        assessment.predictedToneName?.trim().toLowerCase() ===
        selectedTone.name.trim().toLowerCase();
      dialogueState = isMatch ? 'confident_match' : 'confident_mismatch';
    }
  }

  // Lấy từ và thanh dự đoán
  const predictedToneItem = assessment?.predictedToneName
    ? TONE_NAME_MAP[assessment.predictedToneName]
    : null;
  const predictedWord = predictedToneItem
    ? predictedToneItem.word.toUpperCase()
    : assessment?.predictedToneName?.toUpperCase() || '—';

  // Lời nhắn theo trạng thái
  const getContent = () => {
    switch (dialogueState) {
      case 'listening':
        return {
          headline: 'Bé Lạc đang lắng nghe!',
          subheadline: `Hãy đọc từ "${displayWord}" thật to và rõ nhé!`,
          subtext: 'Mình sẽ phân tích cao độ và nhận diện thanh điệu của bạn ngay.',
        };
      case 'confident_match':
        return {
          headline: `Bé Lạc nghe được thanh ${selectedTone.name.replace('Thanh ', '').toUpperCase()}!`,
          subheadline: praiseVoiceText || 'AI đã nhận diện trùng thanh bạn chọn. Rất xuất sắc!',
          subtext: 'Đường nét cao độ của bạn khớp rất tốt với mẫu tham chiếu.',
        };
      case 'confident_mismatch': {
        const predName = assessment?.predictedToneName?.replace('Thanh ', '').toUpperCase() || '';
        const targetName = selectedTone.name.replace('Thanh ', '').toUpperCase();
        return {
          headline: `Bé Lạc nghe giống thanh ${predName} hơn!`,
          subheadline: encourageVoiceText || `Bạn đang luyện thanh ${targetName}. Hãy nghe lại mẫu và thử lại nhé!`,
          subtext: 'Cùng nghe âm mẫu chuẩn để điều chỉnh đường cao độ nào.',
        };
      }
      case 'uncertain':
        return {
          headline: 'Bé Lạc vẫn chưa chắc chắn!',
          subheadline: 'Mình cùng nghe mẫu rồi thử lại lần nữa nhé!',
          subtext: 'Hãy ngân dài âm hơn một nhịp để AI bắt trọn đường nét thanh điệu.',
        };
      case 'low_audio_quality':
        return {
          headline: 'Bé Lạc chưa nghe rõ bạn nè!',
          subheadline: 'Hãy thử đọc to và rõ hơn nhé!',
          subtext: 'Mình sẽ lắng nghe để nhận diện đúng thanh điệu của bạn.',
        };
      case 'no_valid_f0':
        return {
          headline: 'Bé Lạc đã nghe bạn rồi!',
          subheadline: 'Nhưng chưa đủ dữ liệu đường cao độ để so sánh.',
          subtext: 'Hãy phát âm rõ nguyên âm và không thì thầm nhé.',
        };
      case 'error':
        return {
          headline: 'Bé Lạc đang gặp chút trục trặc!',
          subheadline: 'Hãy kiểm tra quyền truy cập microphone và thử lại nhé!',
          subtext: 'Đảm bảo trình duyệt đã được cấp phép sử dụng microphone.',
        };
      case 'ready':
      default:
        return {
          headline: 'Bé Lạc đã sẵn sàng!',
          subheadline: `Nhấn nút micro và đọc to từ "${displayWord}" nhé!`,
          subtext: 'Mình sẽ lắng nghe để nhận diện đúng thanh điệu của bạn.',
        };
    }
  };

  const content = getContent();

  const shouldShake =
    !isListening &&
    (dialogueState === 'confident_mismatch' ||
      dialogueState === 'uncertain' ||
      dialogueState === 'low_audio_quality' ||
      dialogueState === 'no_valid_f0');

  return (
    <div className="w-full max-w-2xl mx-auto relative z-20 mt-2">
      {/* Khung hội thoại chính dạng bong bóng thoại (.vt-card + đuôi nhọn hướng lên Bé Lạc) */}
      <div
        key={shouldShake ? `shake-${assessment?.headline ?? dialogueState}-${userContour?.voicedFramesCount ?? 0}` : 'bubble'}
        className={`vt-card relative rounded-[32px] sm:rounded-[38px] p-5 sm:p-7 text-center text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-300 ${
          shouldShake ? 'animate-vt-shake' : ''
        }`}
      >
        {/* Đuôi bong bóng thoại hướng lên phía Bé Lạc */}
        <svg
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-3 text-white/20 pointer-events-none"
          viewBox="0 0 24 12"
          aria-hidden="true"
        >
          <path d="M12 0 L24 12 H0 Z" fill="var(--vt-surface)" />
          <path d="M0 12 L12 0 L24 12" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>

        {/* Lỗi quyền microphone nếu có */}
        {permissionError && (
          <div className="mb-4 bg-[var(--vt-amber-500)]/20 border-2 border-[var(--vt-amber-400)]/40 text-[var(--vt-amber-200)] px-3.5 py-2.5 rounded-2xl flex items-start gap-2.5 shadow-sm text-left">
            <AlertCircle className="w-4 h-4 text-[var(--vt-amber-400)] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-extrabold">Chưa thể truy cập Microphone</p>
              <p className="text-[var(--vt-amber-200)]/90">{permissionError}</p>
              <button
                type="button"
                onClick={onRetryPermission}
                aria-label="Cấp quyền microphone lại"
                className="vt-btn mt-2 min-h-[44px] px-3.5 py-1.5 bg-[var(--vt-amber-500)] text-[var(--vt-slate-950)] border-[var(--vt-amber-300)] border-b-[var(--vt-amber-shadow)] text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cấp quyền lại</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Khu vực MICROPHONE 76-80px ở trung tâm phía trên với sóng âm hai bên */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-3.5 sm:mb-4">
          {/* Sóng âm bên trái */}
          <div className="flex items-center gap-0.5 sm:gap-1 h-12 sm:h-14 w-16 sm:w-28 justify-end" aria-hidden="true">
            {leftWave.map((h, i) => (
              <div
                key={`lw-${i}`}
                className="w-1 sm:w-1.5 bg-gradient-to-t from-[var(--vt-red)] via-[var(--vt-orange)] to-[var(--vt-amber-300)] rounded-full transition-all duration-100 shadow-[0_0_6px_rgba(255,145,0,0.5)]"
                style={{
                  height: isListening ? `${Math.max(8, h)}%` : `${h * 0.4}%`,
                  opacity: isListening ? 1 : 0.5,
                }}
              />
            ))}
          </div>

          {/* Nút Microphone Tròn 76-80px Nổi Bật (.vt-btn-primary border-b-4) */}
          <div className="relative shrink-0 flex items-center justify-center">
            {/* Hiệu ứng vòng sóng lan tỏa khi đang ghi âm */}
            {isListening && (
              <>
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--vt-red-500)] to-[var(--vt-amber-400)] animate-ping opacity-45 -z-10 pointer-events-none"
                  style={{ transform: `scale(${1.15 + audioVolume * 1.4})` }}
                />
                <div
                  className="absolute -inset-2 rounded-full border-2 border-[var(--vt-orange-400)]/60 animate-listening-wave -z-10 pointer-events-none"
                  style={{ transform: `scale(${1 + audioVolume * 0.6})` }}
                />
              </>
            )}

            {!isListening ? (
              <button
                type="button"
                onClick={onStartListening}
                disabled={isAnalyzing}
                className="vt-btn vt-btn-primary group w-[76px] h-[76px] sm:w-20 sm:h-20 min-w-[76px] min-h-[76px] rounded-full p-0"
                title="Bấm để bắt đầu đọc"
                aria-label="Bắt đầu ghi âm phát âm"
              >
                <Mic className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-xs group-hover:scale-110 transition-transform" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopListening}
                className="vt-btn w-[76px] h-[76px] sm:w-20 sm:h-20 min-w-[76px] min-h-[76px] rounded-full p-0 bg-[var(--vt-slate-900)] border-white/30 border-b-black text-white shadow-xl hover:bg-[var(--vt-slate-800)]"
                title="Dừng ghi âm"
                aria-label="Dừng ghi âm"
              >
                <Square className="w-6 h-6 fill-white text-white" />
              </button>
            )}
          </div>

          {/* Sóng âm bên phải */}
          <div className="flex items-center gap-0.5 sm:gap-1 h-12 sm:h-14 w-16 sm:w-28 justify-start" aria-hidden="true">
            {rightWave.map((h, i) => (
              <div
                key={`rw-${i}`}
                className="w-1 sm:w-1.5 bg-gradient-to-t from-[var(--vt-red)] via-[var(--vt-orange)] to-[var(--vt-amber-300)] rounded-full transition-all duration-100 shadow-[0_0_6px_rgba(255,145,0,0.5)]"
                style={{
                  height: isListening ? `${Math.max(8, h)}%` : `${h * 0.4}%`,
                  opacity: isListening ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* 2. Tiêu đề và nội dung phản hồi của Bé Lạc */}
        <div className="space-y-1.5 mb-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[var(--vt-amber-300)] text-lg sm:text-xl font-black select-none drop-shadow-xs" aria-hidden="true">
              ◟
            </span>
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-sm">
              {content.headline}
            </h3>
            <span className="text-[var(--vt-amber-300)] text-lg sm:text-xl font-black select-none drop-shadow-xs" aria-hidden="true">
              ◞
            </span>
          </div>

          <p className="text-sm sm:text-base md:text-lg font-extrabold text-[var(--vt-yellow)] drop-shadow-xs">
            {content.subheadline}
          </p>

          <p className="text-xs sm:text-sm text-white/85 max-w-lg mx-auto pt-0.5 leading-relaxed font-semibold">
            {content.subtext}
          </p>

          {(praiseVoiceText || encourageVoiceText) && !isListening && (
            <div className="pt-2 flex items-center justify-center animate-vt-pop">
              <div className="vt-chip px-3.5 py-1.5 bg-gradient-to-r from-[var(--vt-amber-400)]/25 via-[var(--vt-orange-500)]/20 to-[var(--vt-red-500)]/25 border-[var(--vt-amber-300)]/45 border-b-[var(--vt-amber-shadow)] text-[var(--vt-amber-200)] text-xs sm:text-sm font-bold shadow-md">
                <span className="text-sm" aria-hidden="true">🗣️</span>
                <span>Bé Lạc: &ldquo;{praiseVoiceText || encourageVoiceText}&rdquo;</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. BẢNG KẾT QUẢ AI ĐỐI CHIẾU TRỰC TIẾP (4 ô .vt-card xuất hiện lần lượt với vt-pop) */}
        {assessment && !isListening && (
          <div className="mt-4 pt-4 border-t border-white/15 space-y-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              {/* Bạn đang luyện */}
              <div
                className="vt-card bg-white/10 border-white/20 border-b-[var(--vt-surface-shadow)] p-2.5 sm:p-3 animate-vt-pop"
                style={{ animationDelay: '0ms' }}
              >
                <span className="text-[11px] sm:text-xs uppercase font-extrabold text-white/75 block mb-0.5">
                  Bạn đang luyện
                </span>
                <span className="text-lg sm:text-xl font-black text-white block truncate">
                  {displayWord.toUpperCase()}
                </span>
                <span className="text-xs text-white/80 font-bold block truncate">
                  {selectedTone.name}
                </span>
              </div>

              {/* AI nhận diện */}
              <div
                className={`vt-card p-2.5 sm:p-3 animate-vt-pop ${
                  assessment.predictedToneName?.trim().toLowerCase() ===
                  selectedTone.name.trim().toLowerCase()
                    ? 'bg-[var(--vt-success-500)]/25 border-[var(--vt-success-400)]/55 border-b-[var(--vt-success-shadow)] text-white'
                    : 'bg-[var(--vt-amber-500)]/25 border-[var(--vt-amber-400)]/55 border-b-[var(--vt-amber-shadow)] text-white'
                }`}
                style={{ animationDelay: '60ms' }}
              >
                <span className="text-[11px] sm:text-xs uppercase font-extrabold text-white/75 block mb-0.5">
                  AI nhận diện
                </span>
                <span className="text-lg sm:text-xl font-black block truncate text-[var(--vt-amber-300)]">
                  {predictedWord}
                </span>
                <span className="text-xs font-bold block truncate opacity-95">
                  {assessment.predictedToneName || 'Chưa rõ'}
                </span>
              </div>

              {/* Độ tin cậy AI */}
              <div
                className="vt-card bg-white/10 border-white/20 border-b-[var(--vt-surface-shadow)] p-2.5 sm:p-3 animate-vt-pop"
                style={{ animationDelay: '120ms' }}
              >
                <span className="text-[11px] sm:text-xs uppercase font-extrabold text-white/75 block mb-0.5">
                  Độ tin cậy AI
                </span>
                <span className="text-lg sm:text-xl font-black text-white block">
                  {Math.round(assessment.confidence * 100)}%
                </span>
                <span className="text-xs text-white/80 font-bold block truncate">
                  {assessment.isAiConfident ? 'Tự tin cao' : 'Cần thử lại'}
                </span>
              </div>

              {/* Điểm tương đồng F0 */}
              <div
                className="vt-card bg-white/10 border-white/20 border-b-[var(--vt-surface-shadow)] p-2.5 sm:p-3 animate-vt-pop"
                style={{ animationDelay: '180ms' }}
              >
                <span className="text-[11px] sm:text-xs uppercase font-extrabold text-white/75 block mb-0.5">
                  Độ giống đường F0
                </span>
                {typeof f0ScoreResult?.score === 'number' && f0ScoreResult.score >= 0 ? (
                  <>
                    <span className="text-lg sm:text-xl font-black text-[var(--vt-amber-300)] block">
                      {f0ScoreResult.score}
                      <span className="text-xs sm:text-sm text-white/75 font-bold">/100</span>
                    </span>
                    <span className="text-xs text-[var(--vt-success-300)] font-extrabold block truncate">
                      F0 hợp lệ
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black text-white/95 block my-1">
                      Chưa đủ F0
                    </span>
                    <span className="text-xs text-white/75 font-semibold block truncate">
                      Nói to hơn nhé
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Lời khuyên sư phạm ngắn */}
            {assessment.adviceText && (
              <div className="vt-card bg-[var(--vt-amber-500)]/15 p-3 rounded-2xl border-[var(--vt-amber-400)]/40 border-b-[var(--vt-amber-shadow)] text-xs sm:text-sm text-[var(--vt-amber-100)] text-left flex items-start gap-2.5">
                <Sparkles className="w-4.5 h-4.5 text-[var(--vt-amber-300)] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-extrabold text-white text-xs sm:text-sm">Mẹo luyện: </span>
                  <span className="text-xs sm:text-sm font-semibold">{assessment.adviceText}</span>
                </div>
              </div>
            )}

            {/* 2 nút hành động: Đọc lại (.vt-btn-primary) & Phân tích chi tiết (.vt-btn-secondary) */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={onStartListening}
                disabled={isAnalyzing}
                aria-label="Đọc lại lượt phát âm này"
                className="vt-btn vt-btn-primary min-h-[44px] px-5 py-2.5 text-sm sm:text-base"
              >
                <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span>Đọc lại</span>
              </button>

              {onOpenAnalysis && (
                <button
                  type="button"
                  onClick={onOpenAnalysis}
                  aria-pressed={isAnalysisOpen}
                  aria-label={isAnalysisOpen ? 'Ẩn ô phân tích chi tiết' : 'Hiện ô phân tích chi tiết'}
                  title={isAnalysisOpen ? 'Ẩn ô phân tích chi tiết' : 'Hiện ô phân tích chi tiết'}
                  className={`vt-btn min-h-[44px] px-4.5 py-2.5 text-sm sm:text-base ${
                    isAnalysisOpen
                      ? 'bg-[var(--vt-amber-400)]/25 hover:bg-[var(--vt-amber-400)]/35 text-[var(--vt-amber-100)] border-[var(--vt-amber-300)]/60 border-b-[var(--vt-amber-shadow)]'
                      : 'vt-btn-secondary'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[var(--vt-amber-300)]" />
                  <span>Phân tích chi tiết</span>
                  {isAnalysisOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--vt-amber-300)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/80" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
