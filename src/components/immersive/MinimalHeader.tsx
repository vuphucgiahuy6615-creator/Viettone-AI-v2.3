import React, { useState } from 'react';
import {
  BarChart3,
  Compass,
  TrendingUp,
  Award,
  Settings2,
  Volume2,
  VolumeX,
  Home,
  Flame,
  MoreVertical,
  HelpCircle,
  GitBranch,
} from 'lucide-react';
import { StreakInfo } from '../../types';

interface MinimalHeaderProps {
  onGoHome: () => void;
  onOpenAnalysis: () => void;
  onOpenRoadmap: () => void;
  onOpenProgress: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenArchitecture?: () => void;
  streakInfo: StreakInfo;
  soundFxEnabled: boolean;
  onToggleSoundFx: () => void;
  isModelReady: boolean;
  isFallback: boolean;
  hasRecentAttempt?: boolean;
  todayAttemptsCount?: number;
}

export const MinimalHeader: React.FC<MinimalHeaderProps> = ({
  onGoHome,
  onOpenAnalysis,
  onOpenRoadmap,
  onOpenProgress,
  onOpenAchievements,
  onOpenSettings,
  onOpenGuide,
  onOpenArchitecture,
  streakInfo,
  soundFxEnabled,
  onToggleSoundFx,
  hasRecentAttempt = false,
  todayAttemptsCount = 0,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const streakDays = streakInfo.currentStreak;
  const dailyGoal = 10;
  const dailyPercent = Math.min(100, Math.round((todayAttemptsCount / dailyGoal) * 100));

  return (
    <header className="w-full bg-[var(--vt-surface)] backdrop-blur-md border-b-2 border-white/15 sticky top-0 z-30 shadow-sm text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Khu vực Trái: Nút Trang chủ */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onGoHome}
            className="vt-btn vt-btn-secondary min-w-[44px] min-h-[44px] px-3 sm:px-3.5 py-2 rounded-2xl text-xs sm:text-sm"
            title="Quay lại Trang chủ giới thiệu"
            aria-label="Quay lại trang chủ"
          >
            <Home className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Trang chủ</span>
          </button>
        </div>

        {/* Khu vực Giữa: Thanh tiến độ mục tiêu ngày (cao 16px, vệt sáng trắng phía trên) */}
        <div className="flex-1 max-w-[160px] sm:max-w-xs md:max-w-md flex items-center gap-2 sm:gap-2.5 min-w-0">
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
              {/* Vệt sáng trắng (sheen highlight) phía trên */}
              <div className="absolute top-[2px] left-1.5 right-1.5 h-[3px] rounded-full bg-white/40 pointer-events-none" />
            </div>
          </div>
          <span className="text-xs sm:text-sm font-black text-[var(--vt-amber-300)] shrink-0 tabular-nums">
            {todayAttemptsCount}/{dailyGoal}
          </span>
        </div>

        {/* Khu vực Phải: Chip Streak + Âm thanh + Các nút tròn Popup */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Chip Streak */}
          <button
            type="button"
            onClick={onOpenAchievements}
            className={`vt-chip min-h-[44px] px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm cursor-pointer transition-transform active:translate-y-[2px] ${
              streakDays > 0
                ? 'bg-[var(--vt-orange-500)]/25 border-[var(--vt-orange-400)]/60 border-b-[var(--vt-orange-shadow)] text-[var(--vt-orange-200)]'
                : 'bg-white/10 border-white/20 border-b-[var(--vt-surface-shadow)] text-white/80 hover:bg-white/15'
            }`}
            title={`Chuỗi ${streakDays} ngày luyện tập!`}
            aria-label={`Chuỗi ${streakDays} ngày luyện tập, mở bảng thành tích`}
          >
            <Flame
              className={`w-4 h-4 ${
                streakDays > 0
                  ? 'text-[var(--vt-orange-400)] fill-[var(--vt-orange-400)]'
                  : 'text-white/60'
              }`}
            />
            <span className="font-black">{streakDays}</span>
            <span className="hidden md:inline text-xs font-bold text-white/80">ngày</span>
          </button>

          {/* Chip Sound FX */}
          <button
            type="button"
            onClick={onToggleSoundFx}
            className={`vt-btn min-w-[44px] min-h-[44px] p-2 rounded-full ${
              soundFxEnabled
                ? 'bg-[var(--vt-amber-500)]/25 text-[var(--vt-amber-300)] border-[var(--vt-amber-400)]/50 border-b-[var(--vt-amber-shadow)] hover:bg-[var(--vt-amber-500)]/35'
                : 'vt-btn-secondary text-white/70'
            }`}
            title={soundFxEnabled ? 'Âm thanh: Đang bật' : 'Âm thanh: Đã tắt'}
            aria-label={soundFxEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            aria-pressed={soundFxEnabled}
          >
            {soundFxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Các nút icon popup dạng tròn .vt-btn-secondary trên Desktop (vùng chạm >= 44px) */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Công cụ học tập">
            <button
              type="button"
              onClick={onOpenAnalysis}
              className={`vt-btn min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0 ${
                hasRecentAttempt
                  ? 'vt-btn-primary'
                  : 'vt-btn-secondary'
              }`}
              title="Phân tích AI & Đường nét F0"
              aria-label="Mở popup phân tích AI và đường nét F0"
            >
              <BarChart3 className={`w-4 h-4 ${hasRecentAttempt ? 'text-white' : 'text-[var(--vt-amber-300)]'}`} />
            </button>

            <button
              type="button"
              onClick={onOpenRoadmap}
              className="vt-btn vt-btn-secondary min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0"
              title="Lộ trình học tập 4 bước"
              aria-label="Mở lộ trình học tập"
            >
              <Compass className="w-4 h-4 text-[var(--vt-amber-300)]" />
            </button>

            <button
              type="button"
              onClick={onOpenProgress}
              className="vt-btn vt-btn-secondary min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0"
              title="Tiến bộ của tôi"
              aria-label="Mở tiến bộ và lịch sử luyện tập"
            >
              <TrendingUp className="w-4 h-4 text-[var(--vt-amber-300)]" />
            </button>

            <button
              type="button"
              onClick={onOpenAchievements}
              className="vt-btn vt-btn-secondary min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0"
              title="Thành tích & Huy hiệu"
              aria-label="Mở thành tích và huy hiệu"
            >
              <Award className="w-4 h-4 text-[var(--vt-amber-300)]" />
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="vt-btn vt-btn-secondary min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0"
              title="Cài đặt hệ thống"
              aria-label="Mở cài đặt hệ thống"
            >
              <Settings2 className="w-4 h-4 text-white/90" />
            </button>
          </nav>

          {/* Nút Menu 3 chấm (hiển thị chính cho mobile/tablet + mục phụ trên desktop) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="vt-btn vt-btn-secondary min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0"
              title="Tùy chọn menu"
              aria-label="Mở menu tùy chọn"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Menu Popover */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--vt-slate-900)]/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-white/20 border-b-4 border-b-[var(--vt-surface-shadow)] py-2 z-50 animate-vt-pop text-white">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAnalysis();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-white/95 hover:bg-white/15 cursor-pointer text-left"
                  >
                    <BarChart3 className="w-4 h-4 text-[var(--vt-red-400)]" />
                    <span>Phân tích AI & Đường nét F0</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenRoadmap();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-white/95 hover:bg-white/15 cursor-pointer text-left"
                  >
                    <Compass className="w-4 h-4 text-[var(--vt-amber-400)]" />
                    <span>Lộ trình học tập 4 bước</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenProgress();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-white/95 hover:bg-white/15 cursor-pointer text-left"
                  >
                    <TrendingUp className="w-4 h-4 text-[var(--vt-success-400)]" />
                    <span>Tiến bộ & Lịch sử của tôi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAchievements();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-white/95 hover:bg-white/15 cursor-pointer text-left"
                  >
                    <Award className="w-4 h-4 text-[var(--vt-amber-400)]" />
                    <span>Huy hiệu & Chuỗi rèn luyện</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-white/95 hover:bg-white/15 cursor-pointer text-left"
                  >
                    <Settings2 className="w-4 h-4 text-[var(--vt-slate-300)]" />
                    <span>Cài đặt & Mẫu giáo viên</span>
                  </button>

                  <div className="my-1.5 border-t border-white/15" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenGuide();
                    }}
                    className="w-full min-h-[44px] flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 cursor-pointer text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-white/60" />
                    <span>Hướng dẫn 6 thanh điệu</span>
                  </button>

                  {onOpenArchitecture && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenArchitecture();
                      }}
                      className="w-full min-h-[44px] flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 cursor-pointer text-left"
                    >
                      <GitBranch className="w-4 h-4 text-[var(--vt-cyan-400)]" />
                      <span>Sơ đồ kiến trúc thuật toán</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

