import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Target, Check, Sparkles } from 'lucide-react';
import { playWelcomeScreenAudio, stopAnyVoiceAudio } from '../../utils/audioSynthesizer';

const WELCOME_LINES = [
  'Xin chào! Mình là Bé Lạc 👋',
  'Mình sẽ cùng bạn chinh phục 6 thanh điệu tiếng Việt!',
  'Mỗi ngày chỉ cần 5 phút thôi nhé!',
] as const;

const DAILY_GOAL_OPTIONS = [
  { value: 5, label: 'Thư giãn', desc: '5 lượt / ngày' },
  { value: 10, label: 'Tiêu chuẩn', desc: '10 lượt / ngày' },
  { value: 15, label: 'Chăm chỉ', desc: '15 lượt / ngày' },
  { value: 20, label: 'Bứt phá', desc: '20 lượt / ngày' },
] as const;

interface WelcomeScreenProps {
  initialDailyGoal: number;
  onSelectDailyGoal: (goal: number) => void;
  onFinishWelcome: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  initialDailyGoal,
  onSelectDailyGoal,
  onFinishWelcome,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [lineIndex, setLineIndex] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(() =>
    prefersReducedMotion ? WELCOME_LINES[0].length : 0
  );
  const [showGoalStep, setShowGoalStep] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<number>(initialDailyGoal || 10);
  const audioTriggeredRef = useRef<boolean>(false);
  const leavingRef = useRef<boolean>(false);

  const currentLine = WELCOME_LINES[lineIndex];
  const isTypingCurrentLine = charCount < currentLine.length;
  const isAllDone = lineIndex === WELCOME_LINES.length - 1 && !isTypingCurrentLine;

  // Chạy hiệu ứng máy đánh chữ theo từng câu
  useEffect(() => {
    if (prefersReducedMotion) {
      setCharCount(currentLine.length);
      return;
    }

    if (charCount < currentLine.length) {
      const timer = window.setTimeout(() => {
        setCharCount((prev) => prev + 1);
      }, 28);
      return () => window.clearTimeout(timer);
    }

    // Tự động chuyển sang câu tiếp theo sau một nhịp nghỉ ngắn nếu chưa tới câu cuối
    if (lineIndex < WELCOME_LINES.length - 1) {
      const nextTimer = window.setTimeout(() => {
        setLineIndex((prev) => prev + 1);
        setCharCount(0);
      }, 950);
      return () => window.clearTimeout(nextTimer);
    }
  }, [charCount, currentLine.length, lineIndex, prefersReducedMotion]);

  // Phát /viettone-home/assets/welcome.mp3 chỉ sau lần chạm/nhấn đầu tiên của người dùng
  const triggerAudioOnFirstGesture = () => {
    if (audioTriggeredRef.current || leavingRef.current) return;
    audioTriggeredRef.current = true;
    playWelcomeScreenAudio();
  };

  useEffect(() => {
    return () => {
      stopAnyVoiceAudio();
    };
  }, []);

  const handleBubbleClick = () => {
    triggerAudioOnFirstGesture();
    if (isTypingCurrentLine) {
      setCharCount(currentLine.length);
      return;
    }
    if (lineIndex < WELCOME_LINES.length - 1) {
      setLineIndex((prev) => prev + 1);
      setCharCount(prefersReducedMotion ? WELCOME_LINES[lineIndex + 1].length : 0);
    }
  };

  const completeAndEnterApp = () => {
    leavingRef.current = true;
    stopAnyVoiceAudio();
    try {
      sessionStorage.setItem('vt_welcome_seen', '1');
    } catch {
      // Ignore storage error
    }
    onFinishWelcome();
  };

  const handleChooseGoalAndContinue = (goal: number) => {
    setSelectedGoal(goal);
    onSelectDailyGoal(goal);
    completeAndEnterApp();
  };

  return (
    <div
      onPointerDown={triggerAudioOnFirstGesture}
      className="min-h-screen bg-[url('/assets/practice-bg.jpg')] bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col font-['Nunito','Be_Vietnam_Pro',sans-serif] text-white selection:bg-[var(--vt-red)] selection:text-white overflow-x-hidden"
    >
      {/* Lớp phủ tối giữ đúng tông nền VietTone */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70 pointer-events-none" />

      {/* Nút Bỏ qua góc trên phải */}
      <header className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            leavingRef.current = true;
            completeAndEnterApp();
          }}
          aria-label="Bỏ qua màn hình chào để vào trang học"
          className="vt-btn-3d min-h-[44px] min-w-[44px] px-4 py-2 bg-white/10 hover:bg-white/20 text-white/90 border-white/20 border-b-[var(--vt-surface-shadow)] text-xs sm:text-sm backdrop-blur-md"
        >
          Bỏ qua
        </button>
      </header>

      {/* Nội dung trung tâm */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-10 pt-2 max-w-3xl mx-auto w-full">
        {/* Bé Lạc nảy từ dưới lên rồi lắc nhẹ */}
        <motion.div
          initial={prefersReducedMotion ? false : { y: 80, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 250, damping: 18, mass: 0.9 }
          }
          className="relative flex flex-col items-center"
        >
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-gradient-to-b from-[var(--vt-orange)]/30 via-[var(--vt-red)]/20 to-transparent blur-2xl -z-10 pointer-events-none"
              aria-hidden="true"
            />
            <img
              src="/assets/be-lac.png"
              alt="Bé Lạc - Người bạn đồng hành VietTone AI"
              className="h-44 sm:h-56 md:h-60 w-auto object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.5)] animate-vt-wiggle select-none"
            />
          </div>
          <div
            className="w-36 sm:w-44 h-3.5 rounded-full bg-black/45 blur-xs mt-1 animate-be-lac-shadow pointer-events-none"
            aria-hidden="true"
          />
        </motion.div>

        {/* Bong bóng thoại typewriter (bấm để bỏ qua câu đang chạy / sang câu tiếp theo) */}
        <button
          type="button"
          onClick={handleBubbleClick}
          aria-label="Bong bóng thoại của Bé Lạc. Chạm để xem nhanh câu tiếp theo"
          className="vt-card relative mt-5 w-full max-w-xl px-5 sm:px-7 py-5 text-center text-white shadow-[0_14px_40px_rgba(0,0,0,0.4)] cursor-pointer hover:border-white/35 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)]"
        >
          {/* Đuôi bong bóng hướng lên Bé Lạc */}
          <svg
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-3 text-white/20 pointer-events-none"
            viewBox="0 0 24 12"
            aria-hidden="true"
          >
            <path d="M12 0 L24 12 H0 Z" fill="var(--vt-surface)" />
            <path d="M0 12 L12 0 L24 12" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>

          <div className="min-h-[64px] flex flex-col items-center justify-center gap-1.5">
            {lineIndex > 0 && (
              <p className="text-xs sm:text-sm font-bold text-white/60">
                {WELCOME_LINES[lineIndex - 1]}
              </p>
            )}
            <p className="text-lg sm:text-2xl font-black text-[var(--vt-yellow)] leading-snug">
              {currentLine.slice(0, charCount)}
              {isTypingCurrentLine && (
                <span className="inline-block w-0.5 h-5 sm:h-6 bg-[var(--vt-orange)] ml-1 align-middle animate-pulse" />
              )}
            </p>
          </div>

          {!isAllDone && (
            <span className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider text-white/60">
              Chạm vào khung thoại để tiếp tục
            </span>
          )}
        </button>

        {/* 2 nút hành động 3D sau câu cuối hoặc bước chọn mục tiêu */}
        {isAllDone && !showGoalStep && (
          <div className="mt-6 w-full max-w-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 animate-vt-pop">
            <button
              type="button"
              onClick={completeAndEnterApp}
              aria-label="Bắt đầu ngay vào đường tiến độ bài học"
              className="vt-btn-3d vt-btn-primary min-h-[52px] px-7 py-3.5 text-sm sm:text-base flex-1"
            >
              <span>BẮT ĐẦU NGAY</span>
              <ArrowRight className="w-5 h-5 stroke-[2.75]" />
            </button>

            <button
              type="button"
              onClick={() => setShowGoalStep(true)}
              aria-label="Chọn mục tiêu luyện tập hằng ngày"
              className="vt-btn-3d vt-btn-secondary min-h-[52px] px-6 py-3.5 text-sm sm:text-base flex-1"
            >
              <Target className="w-4 h-4 text-[var(--vt-amber-300)]" />
              <span>CHỌN MỤC TIÊU HẰNG NGÀY</span>
            </button>
          </div>
        )}

        {/* Bước chọn mục tiêu hằng ngày: 5 / 10 / 15 / 20 lượt */}
        {showGoalStep && (
          <div className="mt-6 w-full max-w-xl vt-card p-5 sm:p-6 space-y-4 animate-vt-pop text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--vt-amber-300)]" />
                <h2 className="text-base sm:text-lg font-black text-white">
                  Chọn mục tiêu mỗi ngày của bạn
                </h2>
              </div>
              <span className="text-xs font-bold text-[var(--vt-amber-300)]">
                Mặc định 10 lượt
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DAILY_GOAL_OPTIONS.map((option) => {
                const active = selectedGoal === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedGoal(option.value)}
                    aria-pressed={active}
                    aria-label={`Chọn mục tiêu ${option.desc} (${option.label})`}
                    className={`vt-btn-3d min-h-[76px] flex-col p-3 text-center normal-case ${
                      active
                        ? 'bg-gradient-to-b from-[var(--vt-red)] to-[var(--vt-orange)] text-white border-white/40 border-b-[var(--vt-red-shadow)]'
                        : 'bg-white/10 hover:bg-white/15 text-white border-white/20 border-b-[var(--vt-surface-shadow)]'
                    }`}
                  >
                    <span className="text-xl font-black leading-none">{option.value}</span>
                    <span className="text-xs font-extrabold">{option.label}</span>
                    <span className="text-[11px] font-semibold opacity-85">{option.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowGoalStep(false)}
                aria-label="Quay lại"
                className="vt-btn-3d vt-btn-secondary min-h-[46px] px-5 py-2.5 text-xs sm:text-sm"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => handleChooseGoalAndContinue(selectedGoal)}
                aria-label={`Lưu mục tiêu ${selectedGoal} lượt mỗi ngày và vào học`}
                className="vt-btn-3d vt-btn-primary min-h-[46px] px-6 py-2.5 text-xs sm:text-sm"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>LƯU MỤC TIÊU & VÀO HỌC</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
