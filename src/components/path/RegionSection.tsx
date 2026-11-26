import React, { useEffect, useRef } from 'react';
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { Check, MapPin, Mic2 } from 'lucide-react';
import { LandmarkItem, RegionSceneConfig } from '../../data/regionScenes';
import { RegionId } from '../../types';

interface RegionSectionProps {
  scene: RegionSceneConfig;
  activePracticeRegion: RegionId;
  visibleRegion: RegionId;
  onBecomeVisible: (regionId: RegionId) => void;
  onSelectPracticeRegion: (regionId: RegionId) => void;
  sectionRefCallback: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const landmarkContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export const RegionSection: React.FC<RegionSectionProps> = ({
  scene,
  activePracticeRegion,
  visibleRegion,
  onBecomeVisible,
  onSelectPracticeRegion,
  sectionRefCallback,
  children,
}) => {
  const localRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Nhận biết vùng đang chiếm giữa màn hình (>50% vùng nhìn thấy) để cập nhật chỉ báo vùng
  const isCenteredInView = useInView(localRef, {
    margin: '-42% 0px -42% 0px',
  });

  // Nhận biết vùng đang hiện diện trong viewport để mờ/blur nhẹ vùng đã lướt qua
  const isRegionFocused = isCenteredInView || visibleRegion === scene.id;

  useEffect(() => {
    if (isCenteredInView) {
      onBecomeVisible(scene.id);
    }
  }, [isCenteredInView, onBecomeVisible, scene.id]);

  // Parallax nhiều lớp dựa trên tiến độ lướt qua chính khối vùng miền này
  const { scrollYProgress } = useScroll({
    target: localRef,
    offset: ['start end', 'end start'],
  });

  const yFarLayer = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [48, -48]
  );
  const yNearLayer = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [110, -110]
  );

  const isSelectedForPractice = activePracticeRegion === scene.id;
  const mobileLandmarks = scene.landmarks.filter((item) => item.mobileVisible).slice(0, 2);
  const firstLandmark = scene.landmarks[0];

  const setRefs = (el: HTMLElement | null) => {
    localRef.current = el;
    sectionRefCallback(el);
  };

  return (
    <motion.section
      ref={setRefs}
      id={`region-section-${scene.id}`}
      aria-labelledby={`region-heading-${scene.id}`}
      animate={
        shouldReduceMotion
          ? { opacity: isRegionFocused ? 1 : 0.72 }
          : {
              opacity: isRegionFocused ? 1 : 0.62,
              y: isRegionFocused ? 0 : 10,
              filter: isRegionFocused ? 'blur(0px)' : 'blur(1.5px)',
            }
      }
      transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
      className="relative w-full md:min-h-screen rounded-3xl overflow-x-clip py-4 sm:py-6 px-1 sm:px-2"
    >
      {/* Lớp chuyển sắc cực nhẹ (<= 15%, họ cam/vàng/đỏ) giữ nguyên nền practice-bg.jpg */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 rounded-3xl pointer-events-none ${scene.accentOverlayClass}`}
      />

      {/* Lớp nền xa (Parallax chậm ~0.2x): đường nét núi non / sóng biển tông ấm */}
      <motion.div
        aria-hidden="true"
        style={{ y: yFarLayer }}
        className="hidden sm:block absolute inset-x-0 top-24 pointer-events-none select-none opacity-35 will-change-transform z-[1]"
      >
        <svg viewBox="0 0 700 220" className="w-full h-44 text-amber-200/40" fill="none">
          {scene.id === 'bac' && (
            <path
              d="M0 190 L110 110 L195 155 L310 76 L430 148 L555 88 L700 175 L700 220 L0 220 Z"
              fill="currentColor"
            />
          )}
          {scene.id === 'trung' && (
            <path
              d="M0 185 Q 140 115, 290 165 T 560 130 L 700 165 L 700 220 L 0 220 Z"
              fill="currentColor"
            />
          )}
          {scene.id === 'nam' && (
            <path
              d="M0 175 C 120 145, 240 205, 360 170 C 480 135, 590 195, 700 165 L 700 220 L 0 220 Z"
              fill="currentColor"
            />
          )}
        </svg>
      </motion.div>

      {/* Banner tiêu đề vùng miền (slide/fade in khi vào vùng) */}
      <motion.header
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        className="relative z-10 mb-4 rounded-2xl bg-[var(--vt-slate-950)]/72 backdrop-blur-xl border border-white/20 p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[var(--vt-amber-300)]">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Hành trình vùng miền · {scene.shortName}</span>
            </div>
            <h2
              id={`region-heading-${scene.id}`}
              className="text-xl sm:text-2xl font-black text-white leading-tight mt-1"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}
            >
              {scene.title}
            </h2>
            <p
              className="text-xs sm:text-sm font-semibold text-white/90 mt-1 leading-relaxed"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
            >
              {scene.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectPracticeRegion(scene.id)}
            aria-pressed={isSelectedForPractice}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border-2 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
              isSelectedForPractice
                ? `bg-gradient-to-r ${scene.badgeGradientClass} border-white/60 text-white shadow-md`
                : 'bg-white/10 border-white/25 text-white hover:bg-white/20 hover:border-[var(--vt-amber-300)]/70'
            }`}
          >
            {isSelectedForPractice ? (
              <>
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Đang luyện giọng vùng này</span>
              </>
            ) : (
              <>
                <Mic2 className="w-4 h-4 shrink-0 text-[var(--vt-amber-300)]" aria-hidden="true" />
                <span>Luyện giọng vùng này</span>
              </>
            )}
          </button>
        </div>
      </motion.header>

      {/* Mobile (< 640px): tối đa 2 địa danh + Bé Lạc gọn phía trên lộ trình, không che nút bài học */}
      <motion.div
        variants={landmarkContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.35 }}
        className="sm:hidden relative z-10 mb-4 grid grid-cols-2 gap-2.5"
      >
        {mobileLandmarks.map((landmark, idx) => (
          <motion.figure
            key={landmark.id}
            variants={{
              hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 16 },
              visible: {
                opacity: 1,
                scale: 1,
                y: 0,
                transition: { duration: 0.5, ease: EASE_OUT_EXPO },
              },
            }}
            className="flex flex-col items-center p-2.5 rounded-2xl bg-[var(--vt-slate-950)]/55 border border-white/15 backdrop-blur-sm"
          >
            <div className="relative flex items-center justify-center">
              <img
                src={landmark.src}
                alt={landmark.name}
                loading="lazy"
                className="w-24 h-16 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
              />
              {idx === 0 && (
                <img
                  src={scene.mascotSrc}
                  alt={scene.mascotCaption}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/be-lac.png';
                  }}
                  className="w-9 h-9 object-contain -ml-3 self-end drop-shadow-md"
                />
              )}
            </div>
            <figcaption
              className="mt-1 text-[11px] font-extrabold text-amber-50 text-center leading-tight"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.75)' }}
            >
              {landmark.name}
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>

      {/* Khu vực nội dung trung tâm + các địa danh ở 2 bên lề (Desktop/Tablet >= 640px) */}
      <div className="relative w-full">
        <motion.div
          variants={landmarkContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="hidden sm:block absolute inset-0 pointer-events-none select-none z-[4]"
        >
          {scene.landmarks.map((landmark) => (
            <ParallaxLandmark
              key={landmark.id}
              landmark={landmark}
              yParallax={landmark.depth === 'far' ? yFarLayer : yNearLayer}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
              mascot={
                firstLandmark && landmark.id === firstLandmark.id
                  ? { src: scene.mascotSrc, caption: scene.mascotCaption }
                  : undefined
              }
            />
          ))}
        </motion.div>

        {/* Đường bài học giữ nguyên logic chấm điểm / progress / âm thanh */}
        <div className="relative z-10">{children}</div>
      </div>
    </motion.section>
  );
};

interface ParallaxLandmarkProps {
  landmark: LandmarkItem;
  yParallax: ReturnType<typeof useTransform<number, number>>;
  shouldReduceMotion: boolean;
  mascot?: { src: string; caption: string };
}

const ParallaxLandmark: React.FC<ParallaxLandmarkProps> = ({
  landmark,
  yParallax,
  shouldReduceMotion,
  mascot,
}) => {
  const isLeft = landmark.position === 'left';

  return (
    <motion.div
      style={{
        top: `${landmark.topPercent}%`,
        y: yParallax,
      }}
      className={`absolute ${
        isLeft ? 'left-0 sm:left-1' : 'right-0 sm:right-1'
      } w-28 sm:w-32 md:w-36 will-change-transform`}
    >
      <motion.figure
        variants={{
          hidden: shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: 0.85, y: 20 },
          visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.6, ease: EASE_OUT_EXPO },
          },
        }}
        className="flex flex-col items-center text-center"
      >
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [-5, 5, -5],
                }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : {
                  duration: landmark.floatDuration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
          className="relative flex items-end justify-center will-change-transform"
        >
          <img
            src={landmark.src}
            alt={landmark.name}
            loading="lazy"
            className="w-24 sm:w-28 md:w-32 h-auto object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
          />

          {/* Bé Lạc đứng cạnh địa danh đầu tiên của mỗi vùng */}
          {mascot && (
            <img
              src={mascot.src}
              alt={mascot.caption}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/be-lac.png';
              }}
              className={`w-12 md:w-14 h-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] ${
                isLeft ? '-ml-4' : '-mr-4 order-first'
              }`}
            />
          )}
        </motion.div>

        <figcaption
          className="mt-1 px-2 py-0.5 rounded-lg bg-[var(--vt-slate-950)]/72 backdrop-blur-sm border border-white/15 text-[10px] sm:text-[11px] font-extrabold text-amber-50 leading-snug shadow-sm"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}
        >
          {landmark.name}
        </figcaption>
      </motion.figure>
    </motion.div>
  );
};
