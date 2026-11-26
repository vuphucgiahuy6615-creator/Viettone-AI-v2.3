import React from 'react';
import {
  BookOpen,
  BarChart3,
  Compass,
  TrendingUp,
  Award,
  HelpCircle,
  Settings2,
  Mic2,
} from 'lucide-react';

interface PathSidebarProps {
  onGoHome: () => void;
  onOpenAnalysis: () => void;
  onOpenRoadmap: () => void;
  onOpenProgress: () => void;
  onOpenAchievements: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onOpenVoiceModelModal: () => void;
  isCustomModelActive?: boolean;
}

export const PathSidebar: React.FC<PathSidebarProps> = ({
  onGoHome,
  onOpenAnalysis,
  onOpenRoadmap,
  onOpenProgress,
  onOpenAchievements,
  onOpenGuide,
  onOpenSettings,
  onOpenVoiceModelModal,
  isCustomModelActive = false,
}) => {
  const navItems = [
    {
      id: 'learn',
      label: 'HỌC',
      icon: BookOpen,
      active: true,
      onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      ariaLabel: 'Trang chủ đường tiến độ bài học',
    },
    {
      id: 'analysis',
      label: 'PHÂN TÍCH',
      icon: BarChart3,
      active: false,
      onClick: onOpenAnalysis,
      ariaLabel: 'Mở bảng phân tích AI và đường nét F0',
    },
    {
      id: 'roadmap',
      label: 'LỘ TRÌNH',
      icon: Compass,
      active: false,
      onClick: onOpenRoadmap,
      ariaLabel: 'Mở lộ trình học tập 6 thanh điệu',
    },
    {
      id: 'progress',
      label: 'TIẾN BỘ',
      icon: TrendingUp,
      active: false,
      onClick: onOpenProgress,
      ariaLabel: 'Mở thống kê tiến bộ của tôi',
    },
    {
      id: 'achievements',
      label: 'THÀNH TÍCH',
      icon: Award,
      active: false,
      onClick: onOpenAchievements,
      ariaLabel: 'Mở bảng thành tích và huy hiệu',
    },
    {
      id: 'guide',
      label: 'HƯỚNG DẪN',
      icon: HelpCircle,
      active: false,
      onClick: onOpenGuide,
      ariaLabel: 'Mở hướng dẫn phát âm 6 thanh điệu',
    },
    {
      id: 'settings',
      label: 'CÀI ĐẶT',
      icon: Settings2,
      active: false,
      onClick: onOpenSettings,
      ariaLabel: 'Mở cài đặt hệ thống',
    },
  ];

  // Các mục chính cho thanh điều hướng đáy trên mobile (<768px)
  const mobileNavItems = [
    navItems[0],
    navItems[1],
    navItems[2],
    navItems[3],
    {
      id: 'voice-model',
      label: 'GIỌNG ĐỌC',
      icon: Mic2,
      active: false,
      onClick: onOpenVoiceModelModal,
      ariaLabel: 'Cập nhật dữ liệu giọng đọc',
    },
    navItems[6],
  ];

  return (
    <>
      {/* Sidebar trái cho Tablet (icon only: md -> lg) và Desktop (icon + chữ IN HOA: lg+) */}
      <aside
        aria-label="Điều hướng chính VietTone AI"
        className="hidden md:flex md:flex-col md:w-20 lg:w-64 md:fixed md:inset-y-0 md:left-0 z-30 bg-[var(--vt-slate-950)]/80 backdrop-blur-xl border-r border-white/10 px-3 lg:px-4 py-5 overflow-y-auto"
      >
        {/* Logo VietTone + Bé Lạc nhỏ */}
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Quay về trang giới thiệu VietTone AI"
          className="min-h-[48px] flex items-center justify-center lg:justify-start gap-2.5 px-2 mb-6 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)]"
        >
          <img
            src="/assets/be-lac.png"
            alt=""
            className="w-9 h-9 object-contain shrink-0 drop-shadow-md"
          />
          <span className="hidden lg:inline text-2xl font-black tracking-tight bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] bg-clip-text text-transparent">
            VietTone
          </span>
        </button>

        {/* Menu dọc */}
        <nav className="flex-1 flex flex-col gap-1.5" aria-label="Menu chức năng">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                title={item.label}
                aria-label={item.ariaLabel}
                aria-current={item.active ? 'page' : undefined}
                className={`min-h-[48px] w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 lg:px-4 py-2.5 rounded-2xl font-extrabold text-sm tracking-wide uppercase transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                  item.active
                    ? 'border-2 border-[var(--vt-orange)] bg-white/5 text-[var(--vt-yellow)] shadow-[0_0_18px_rgba(255,145,0,0.18)]'
                    : 'border-2 border-transparent text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon
                  className={`w-6 h-6 shrink-0 ${
                    item.active ? 'text-[var(--vt-orange)]' : 'text-[var(--vt-amber-300)]'
                  }`}
                />
                <span className="hidden lg:inline truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Nút Cập nhật dữ liệu giọng đọc (gắn link Teachable Machine / chọn lại model gốc) */}
        <div className="pt-3 mt-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onOpenVoiceModelModal}
            title="Cập nhật dữ liệu giọng đọc"
            aria-label="Cập nhật dữ liệu giọng đọc"
            className={`min-h-[52px] w-full flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-3.5 py-2.5 rounded-2xl border-2 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
              isCustomModelActive
                ? 'bg-gradient-to-r from-[var(--vt-red)]/25 to-[var(--vt-orange)]/25 border-[var(--vt-orange)]/70 text-white hover:from-[var(--vt-red)]/35 hover:to-[var(--vt-orange)]/35 shadow-[0_0_16px_rgba(255,145,0,0.2)]'
                : 'bg-white/5 border-white/15 text-white/90 hover:bg-white/12 hover:border-[var(--vt-amber-300)]/50'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isCustomModelActive
                  ? 'bg-gradient-to-br from-[var(--vt-red)] to-[var(--vt-orange)] text-white shadow-sm'
                  : 'bg-[var(--vt-amber-500)]/20 text-[var(--vt-amber-300)] border border-[var(--vt-amber-400)]/30'
              }`}
            >
              <Mic2 className="w-4 h-4" />
            </div>
            <div className="hidden lg:flex flex-col items-start text-left min-w-0">
              <span className="text-xs font-extrabold leading-snug text-white">
                Cập nhật dữ liệu giọng đọc
              </span>
              <span className="text-[10px] font-bold text-[var(--vt-amber-300)]/90 truncate">
                {isCustomModelActive ? 'Đang dùng link tùy chỉnh' : 'Đang dùng Model gốc'}
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* Thanh điều hướng dưới đáy cho Mobile (<768px) */}
      <nav
        aria-label="Điều hướng di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--vt-slate-950)]/92 backdrop-blur-xl border-t border-white/15 px-1.5 py-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center justify-around gap-0.5">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                aria-current={item.active ? 'page' : undefined}
                className={`min-w-[44px] min-h-[44px] flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                  item.active
                    ? 'bg-white/10 border border-[var(--vt-orange)]/70 text-[var(--vt-yellow)]'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    item.active
                      ? 'text-[var(--vt-orange)]'
                      : item.id === 'voice-model'
                        ? 'text-[var(--vt-amber-300)]'
                        : 'text-white/80'
                  }`}
                />
                <span className="text-[9px] font-extrabold tracking-tight mt-0.5 truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
