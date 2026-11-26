import React from 'react';
import { Award, Flame, Sparkles, Target } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import { MilestoneBadge, StreakInfo } from '../../types';
import { BadgesShowcase } from '../BadgesShowcase';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakInfo: StreakInfo;
  badges: MilestoneBadge[];
  todayAttemptsCount: number;
  dailyGoal?: number;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  streakInfo,
  badges,
  todayAttemptsCount,
  dailyGoal = 10,
}) => {
  const dailyTarget = dailyGoal > 0 ? dailyGoal : 10;
  const dailyProgressPercent = Math.min(100, Math.round((todayAttemptsCount / dailyTarget) * 100));
  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Thành tích & Chuỗi ngày rèn luyện"
      subtitle="Ghi nhận từng nỗ lực nhỏ trên hành trình chinh phục 6 thanh điệu"
      icon={<Award className="w-5 h-5" />}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Banner tổng quan: Chuỗi ngày & Mục tiêu hôm nay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card Chuỗi ngày (Streak) */}
          <div className="bg-gradient-to-r from-[var(--vt-orange-500)] to-[var(--vt-amber-500)] text-white rounded-3xl border-2 border-[var(--vt-orange-400)] border-b-4 border-b-[var(--vt-orange-shadow)] p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--vt-orange-100)]">
                <Flame className="w-4 h-4 text-[var(--vt-amber-200)] fill-[var(--vt-amber-200)]" />
                <span>Chuỗi ngày luyện tập</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-black">{streakInfo.currentStreak}</span>
                <span className="text-sm font-bold opacity-90">ngày liên tiếp</span>
              </div>
              <p className="text-xs text-[var(--vt-orange-100)] mt-1 font-semibold">
                {streakInfo.isActiveToday
                  ? '✨ Hôm nay bạn đã duy trì chuỗi thành công!'
                  : 'Hãy luyện ít nhất 1 lượt hôm nay để giữ chuỗi nhé!'}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Flame className="w-8 h-8 text-[var(--vt-amber-200)] fill-[var(--vt-amber-200)] animate-pulse" />
            </div>
          </div>

          {/* Card Mục tiêu hằng ngày */}
          <div className="bg-[var(--vt-surface-modal)] rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--vt-slate-700)]">
                <Target className="w-4 h-4 text-[var(--vt-red-600)]" />
                <span>Mục tiêu rèn luyện hôm nay</span>
              </div>
              <span className="text-xs font-black text-[var(--vt-slate-900)]">
                {todayAttemptsCount}/{dailyTarget} lượt
              </span>
            </div>

            <div className="my-2">
              <div className="w-full bg-[var(--vt-slate-100)] h-3.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="relative bg-gradient-to-r from-[var(--vt-red-500)] to-[var(--vt-amber-500)] h-full rounded-full transition-all duration-300"
                  style={{ width: `${dailyProgressPercent}%` }}
                >
                  <div className="absolute top-[2px] left-1.5 right-1.5 h-[2px] rounded-full bg-white/35" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--vt-slate-500)] font-semibold">
              <span>{dailyProgressPercent}% hoàn thành</span>
              <span className="inline-flex items-center gap-1 text-[var(--vt-success-700)] font-extrabold">
                <Sparkles className="w-3 h-3 text-[var(--vt-success-600)]" />
                {todayAttemptsCount >= dailyTarget ? 'Đã đạt mục tiêu!' : 'Cố lên bạn nhé!'}
              </span>
            </div>
          </div>
        </div>

        {/* Danh sách toàn bộ Huy hiệu & Cột mốc */}
        <BadgesShowcase badges={badges} />

        {/* Lời nhắn động viên */}
        <div className="bg-[var(--vt-amber-50)] rounded-3xl border-2 border-[var(--vt-amber-200)] border-b-4 border-b-[var(--vt-amber-shadow)] p-3.5 text-xs text-[var(--vt-amber-900)] flex items-center gap-2.5 font-semibold">
          <Sparkles className="w-4 h-4 text-[var(--vt-amber-600)] shrink-0" />
          <span>
            Bạn đã mở khóa <strong>{unlockedCount}/{badges.length}</strong> huy hiệu. Hãy kiên trì luyện tập mỗi ngày cùng Bé Lạc nhé!
          </span>
        </div>
      </div>
    </ModalWrapper>
  );
};
