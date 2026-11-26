import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface RegionDividerProps {
  title: string;
  subtitle?: string;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const RegionDivider: React.FC<RegionDividerProps> = ({ title, subtitle }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.45 }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className="relative w-full my-6 sm:my-10 py-6 select-none overflow-hidden rounded-3xl"
      role="separator"
      aria-label={title}
    >
      {/* Dải SVG gợn sóng/mây/sông tông cam-vàng uốn lượn */}
      <svg
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        className="w-full h-24 sm:h-28 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vt-divider-wave-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#EF233C" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="vt-divider-wave-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#FF9100" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.16" />
          </linearGradient>
        </defs>

        {/* Sóng núi/mây lớp sau */}
        <path
          d="M0 64 C 140 16, 260 104, 400 58 C 540 12, 660 98, 800 52 L 800 120 L 0 120 Z"
          fill="url(#vt-divider-wave-1)"
        />
        {/* Sóng sông lớp trước */}
        <path
          d="M0 78 C 160 112, 280 28, 420 74 C 560 118, 680 34, 800 72 L 800 120 L 0 120 Z"
          fill="url(#vt-divider-wave-2)"
        />
        {/* Đường viền sáng mảnh */}
        <path
          d="M0 64 C 140 16, 260 104, 400 58 C 540 12, 660 98, 800 52"
          fill="none"
          stroke="#FDE68A"
          strokeOpacity="0.65"
          strokeWidth="2.2"
        />
      </svg>

      {/* Nhãn thông báo chuyển vùng độ tương phản cao trên nền tối ấm */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-[var(--vt-slate-950)]/82 backdrop-blur-md border border-[var(--vt-amber-300)]/45 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <Sparkles className="w-4 h-4 text-[var(--vt-amber-300)] shrink-0" aria-hidden="true" />
          <span
            className="text-sm sm:text-base font-black text-white tracking-tight"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.55)' }}
          >
            {title} ✨
          </span>
        </div>
        {subtitle && (
          <p
            className="mt-1.5 text-xs font-bold text-amber-50/95 max-w-md"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
};
