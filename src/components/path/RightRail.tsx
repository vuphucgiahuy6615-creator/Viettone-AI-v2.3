import React from 'react';
import {
  Flame,
  Star,
  Target,
  Volume2,
  VolumeX,
  Zap,
  Gift,
  Award,
  ArrowRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { VIETNAMESE_TONES } from '../../data/tones';
import { MilestoneBadge, PracticeAttempt, PracticeWordItem, StreakInfo, ToneId } from '../../types';

interface RightRailProps {
  streakInfo: StreakInfo;
  historyAttempts: PracticeAttempt[];
  todayAttemptsCount: number;
  dailyGoal: number;
  soundFxEnabled: boolean;
  onToggleSoundFx: () => void;
  nextRecommended: { toneId: ToneId; reason: string };
  milestoneBadges: MilestoneBadge[];
  onStartPractice: (toneId: ToneId, wordItem?: PracticeWordItem) => void;
  onOpenAchievements: () => void;
}

export function computeTotalXp(attempts: PracticeAttempt[]): number {
  return attempts.reduce((sum, a) => sum + (a.isMatch ? 10 : 2), 0);
}

/** Hàng chỉ số gọn cho Tablet & Mobile (< 1024px) */
export const CompactStatsBar: React.FC<{
  streakInfo: StreakInfo;
  totalXp: number;
  todayAttemptsCount: number;
  dailyGoal: number;
  soundFxEnabled: boolean;
  onToggleSoundFx: () => void;
  onOpenAchievements: () => void;
}> = ({
  streakInfo,
  totalXp,
  todayAttemptsCount,
  dailyGoal,
  soundFxEnabled,
  onToggleSoundFx,
  onOpenAchievements,
}) => {
  return (
    <div className="lg:hidden w-full max-w-2xl mx-auto mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[var(--vt-slate-900)]/70 backdrop-blur-xl border-2 border-white/10">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <button
          type="button"
          onClick={onOpenAchievements}
          aria-label={`Chuỗi ${streakInfo.currentStreak} ngày luyện tập`}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-2.5 rounded-xl hover:bg-white/10 font-extrabold text-sm text-[var(--vt-orange-200)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)]"
        >
          <Flame className="w-4.5 h-4.5 text-[var(--vt-orange)] fill-[var(--vt-orange)]" />
          <span>{streakInfo.currentStreak}</span>
        </button>

        <div
          className="min-h-[44px] inline-flex items-center gap-1.5 px-2 rounded-xl font-extrabold text-sm text-[var(--vt-yellow)]"
          title="Tổng điểm kinh nghiệm"
        >
          <Star className="w-4.5 h-4.5 text-[var(--vt-amber-vivid)] fill-[var(--vt-amber-vivid)]" />
          <span>{totalXp} KN</span>
        </div>

        <button
          type="button"
          onClick={onOpenAchievements}
          aria-label={`Hôm nay đã luyện ${todayAttemptsCount} trên ${dailyGoal} lượt`}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-2 rounded-xl hover:bg-white/10 font-extrabold text-sm text-[var(--vt-success-300)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)]"
        >
          <Target className="w-4.5 h-4.5 text-[var(--vt-success-400)]" />
          <span>
            {todayAttemptsCount}/{dailyGoal}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleSoundFx}
        aria-label={soundFxEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        aria-pressed={soundFxEnabled}
        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[var(--vt-amber-300)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)]"
      >
        {soundFxEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5 text-white/60" />}
      </button>
    </div>
  );
};

export const RightRail: React.FC<RightRailProps> = ({
  streakInfo,
  historyAttempts,
  todayAttemptsCount,
  dailyGoal,
  soundFxEnabled,
  onToggleSoundFx,
  nextRecommended,
  milestoneBadges,
  onStartPractice,
  onOpenAchievements,
}) => {
  const totalXp = computeTotalXp(historyAttempts);
  const dailyPercent = Math.min(100, Math.round((todayAttemptsCount / dailyGoal) * 100));
  const recommendedTone =
    VIETNAMESE_TONES.find((t) => t.id === nextRecommended.toneId) || VIETNAMESE_TONES[0];

  const sortedBadges = [...milestoneBadges]
    .sort((a, b) => Number(b.isUnlocked) - Number(a.isUnlocked))
    .slice(0, 3);

  return (
    <aside
      aria-label="Thống kê và nhiệm vụ hằng ngày"
      className="hidden lg:flex lg:flex-col lg:w-[340px] lg:shrink-0 gap-4 sticky top-6 self-start"
    >
      {/* 1. Hàng chỉ số trên cùng */}
      <div className="rounded-2xl border-2 border-white/10 bg-[var(--vt-slate-900)]/60 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenAchievements}
          title="Chuỗi ngày luyện tập"
          aria-label={`Chuỗi ${streakInfo.currentStreak} ngày luyện tập`}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-2 rounded-xl hover:bg-white/10 font-extrabold text-sm text-[var(--vt-orange-200)] cursor-pointer"
        >
          <Flame className="w-5 h-5 text-[var(--vt-orange)] fill-[var(--vt-orange)]" />
          <span>{streakInfo.currentStreak}</span>
        </button>

        <div
          className="min-h-[44px] inline-flex items-center gap-1.5 px-2 rounded-xl font-extrabold text-sm text-[var(--vt-yellow)]"
          title="Tổng kinh nghiệm tích lũy"
        >
          <Star className="w-5 h-5 text-[var(--vt-amber-vivid)] fill-[var(--vt-amber-vivid)]" />
          <span>{totalXp}</span>
        </div>

        <button
          type="button"
          onClick={onOpenAchievements}
          title="Số lượt luyện hôm nay"
          aria-label={`Đã luyện ${todayAttemptsCount} lượt hôm nay`}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-2 rounded-xl hover:bg-white/10 font-extrabold text-sm text-[var(--vt-success-300)] cursor-pointer"
        >
          <Target className="w-5 h-5 text-[var(--vt-success-400)]" />
          <span>{todayAttemptsCount}</span>
        </button>

        <button
          type="button"
          onClick={onToggleSoundFx}
          aria-label={soundFxEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
          aria-pressed={soundFxEnabled}
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[var(--vt-amber-300)] cursor-pointer transition-colors"
        >
          {soundFxEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5 text-white/60" />}
        </button>
      </div>

      {/* 2. Thẻ Nhiệm vụ hằng ngày */}
      <div className="rounded-2xl border-2 border-white/10 bg-[var(--vt-slate-900)]/60 backdrop-blur-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-black text-white">Nhiệm vụ hằng ngày</h2>
          <button
            type="button"
            onClick={onOpenAchievements}
            aria-label="Xem tất cả nhiệm vụ và thành tích"
            className="min-h-[44px] px-2 -my-2 text-xs font-extrabold uppercase tracking-wider text-[var(--vt-orange)] hover:text-[var(--vt-yellow)] cursor-pointer"
          >
            XEM TẤT CẢ
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--vt-amber-500)]/20 border border-[var(--vt-amber-400)]/40 text-[var(--vt-amber-300)] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 fill-[var(--vt-amber-300)]" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-extrabold text-white">Luyện {dailyGoal} lượt</p>
            <div className="flex items-center gap-2">
              <div
                className="relative flex-1 h-4 rounded-full bg-white/15 border border-white/15 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.min(todayAttemptsCount, dailyGoal)}
                aria-valuemin={0}
                aria-valuemax={dailyGoal}
                aria-label={`Nhiệm vụ hằng ngày: ${todayAttemptsCount} trên ${dailyGoal} lượt`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] transition-all duration-300"
                  style={{ width: `${dailyPercent}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-xs">
                  {todayAttemptsCount} / {dailyGoal}
                </span>
              </div>
              <Gift
                className={`w-5 h-5 shrink-0 ${
                  todayAttemptsCount >= dailyGoal
                    ? 'text-[var(--vt-amber-vivid)]'
                    : 'text-white/50'
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Thẻ Thanh nên luyện tiếp */}
      <div className="rounded-2xl border-2 border-white/10 bg-[var(--vt-slate-900)]/60 backdrop-blur-xl p-4 space-y-3">
        <h2 className="text-base font-black text-white">Thanh nên luyện tiếp</h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--vt-red)] to-[var(--vt-orange)] border border-white/25 flex items-center justify-center text-2xl font-black text-white shrink-0">
            {recommendedTone.word}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--vt-yellow)] truncate">
              {recommendedTone.name}
            </p>
            <p className="text-xs text-white/75 font-semibold line-clamp-2">
              {nextRecommended.reason}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStartPractice(recommendedTone.id)}
          aria-label={`Luyện ngay ${recommendedTone.name}`}
          className="vt-btn-3d vt-btn-primary min-h-[44px] w-full py-2.5 px-4 text-xs sm:text-sm"
        >
          <span>LUYỆN NGAY</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Thẻ Huy hiệu gần nhất */}
      <div className="rounded-2xl border-2 border-white/10 bg-[var(--vt-slate-900)]/60 backdrop-blur-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-black text-white">Huy hiệu gần nhất</h2>
          <button
            type="button"
            onClick={onOpenAchievements}
            aria-label="Xem tất cả huy hiệu"
            className="min-h-[44px] px-2 -my-2 text-xs font-extrabold uppercase tracking-wider text-[var(--vt-orange)] hover:text-[var(--vt-yellow)] cursor-pointer"
          >
            XEM TẤT CẢ
          </button>
        </div>

        <div className="space-y-2">
          {sortedBadges.map((badge) => (
            <div
              key={badge.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                badge.isUnlocked
                  ? 'bg-[var(--vt-success)]/20 border-[var(--vt-success-400)]/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  badge.isUnlocked
                    ? 'bg-[var(--vt-amber-400)]/20 text-[var(--vt-amber-300)]'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                {badge.isUnlocked ? <Award className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold truncate">{badge.title}</p>
                <p className="text-[11px] opacity-80 truncate">{badge.description}</p>
              </div>
              {badge.isUnlocked && (
                <CheckCircle2 className="w-4 h-4 text-[var(--vt-success-400)] shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
