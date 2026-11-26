import React from 'react';
import { motion, useScroll } from 'motion/react';
import { REGION_SCENES } from '../../data/regionScenes';
import { RegionId } from '../../types';

interface RegionScrollIndicatorProps {
  visibleRegion: RegionId;
  onJumpToRegion: (regionId: RegionId) => void;
}

export const RegionScrollIndicator: React.FC<RegionScrollIndicatorProps> = ({
  visibleRegion,
  onJumpToRegion,
}) => {
  const { scrollYProgress } = useScroll();

  return (
    <>
      {/* Thanh tiến trình lướt mỏng màu --vt-amber-300 ở mép trên cùng */}
      <div
        className="fixed top-0 left-0 right-0 h-1 z-50 bg-black/25 pointer-events-none"
        aria-hidden="true"
      >
        <motion.div
          className="h-full bg-[var(--vt-amber-300)] shadow-[0_0_12px_rgba(253,186,116,0.9)] will-change-transform"
          style={{
            scaleX: scrollYProgress,
            transformOrigin: '0% 50%',
          }}
        />
      </div>

      {/* Thanh nhảy nhanh gọn trên Mobile (< 768px) giữ chiều cao tối thiểu */}
      <nav
        aria-label="Chọn vùng miền trên lộ trình"
        className="md:hidden sticky top-2 z-30 w-full flex items-center justify-between gap-1.5 p-1 rounded-xl bg-[var(--vt-slate-950)]/88 backdrop-blur-md border border-white/15 shadow-lg"
      >
        {REGION_SCENES.map((scene) => {
          const isVisible = visibleRegion === scene.id;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onJumpToRegion(scene.id)}
              aria-current={isVisible ? 'location' : undefined}
              className={`flex-1 min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                isVisible
                  ? 'bg-[var(--vt-orange)] text-white shadow-sm'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              {scene.shortName}
            </button>
          );
        })}
      </nav>
    </>
  );
};
