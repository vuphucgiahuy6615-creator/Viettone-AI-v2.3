import React, { useState } from 'react';
import {
  Settings2,
  Volume2,
  VolumeX,
  Sparkles,
  GitBranch,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Mic,
  Cpu,
} from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import { playCelebrationChime } from '../../utils/audioSynthesizer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundFxEnabled: boolean;
  onToggleSoundFx: () => void;
  onOpenTeacherModal: () => void;
  onOpenArchitecture: () => void;
  onOpenModelSettings: () => void;
  onClearHistory: () => void;
  isModelReady: boolean;
  isFallback: boolean;
  modelUrl: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundFxEnabled,
  onToggleSoundFx,
  onOpenTeacherModal,
  onOpenArchitecture,
  onOpenModelSettings,
  onClearHistory,
  isModelReady,
  isFallback,
  modelUrl,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleTestChime = () => {
    playCelebrationChime('success');
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt hệ thống"
      subtitle="Tùy chỉnh âm thanh, mô hình AI, mẫu chuẩn giáo viên và dữ liệu"
      icon={<Settings2 className="w-5 h-5" />}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {/* 1. Tùy chỉnh Âm thanh hiệu ứng */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--vt-amber-50)] text-[var(--vt-amber-600)] flex items-center justify-center shrink-0 border border-[var(--vt-amber-100)]">
              {soundFxEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--vt-slate-800)]">
                Âm thanh hiệu ứng & Chimes
              </h4>
              <p className="text-xs text-[var(--vt-slate-500)] font-medium">
                Phát chuông ngũ cung êm dịu khi đạt tiến bộ hoặc mốc luyện tập
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {soundFxEnabled && (
              <button
                type="button"
                onClick={handleTestChime}
                className="vt-btn vt-btn-secondary-light min-h-[44px] px-3 py-1.5 text-xs"
                title="Nghe thử âm thanh"
                aria-label="Nghe thử âm thanh hiệu ứng"
              >
                Thử
              </button>
            )}

            <button
              type="button"
              onClick={onToggleSoundFx}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-400)]"
              role="switch"
              aria-checked={soundFxEnabled}
              aria-label="Bật tắt âm thanh hiệu ứng và chuông"
            >
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  soundFxEnabled ? 'bg-[var(--vt-red-600)]' : 'bg-[var(--vt-slate-300)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    soundFxEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* 2. Quản lý Mẫu chuẩn Giáo viên */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--vt-red-50)] text-[var(--vt-red-600)] flex items-center justify-center shrink-0 border border-[var(--vt-red-100)]">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--vt-slate-800)]">
                Mẫu chuẩn Giáo viên (Teacher Reference)
              </h4>
              <p className="text-xs text-[var(--vt-slate-500)] font-medium">
                Ghi âm mẫu giáo viên chuẩn hoặc tải file audio F0 đối chiếu thực tế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTeacherModal();
            }}
            aria-label="Quản lý mẫu chuẩn giáo viên"
            className="vt-btn min-h-[44px] px-3.5 py-2 text-xs bg-[var(--vt-red-50)] hover:bg-[var(--vt-red-100)] text-[var(--vt-red-700)] border-[var(--vt-red-200)] border-b-[var(--vt-red-200)] shrink-0"
          >
            Quản lý mẫu
          </button>
        </div>

        {/* 3. Mô hình AI Teachable Machine & Cấu hình */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--vt-blue-50)] text-[var(--vt-blue-600)] flex items-center justify-center shrink-0 border border-[var(--vt-blue-100)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-extrabold text-[var(--vt-slate-800)]">
                  Mô hình AI Teachable Machine
                </h4>
                <span
                  className={`vt-chip px-2 py-0.5 text-[10px] font-bold border-b-2 ${
                    isModelReady
                      ? isFallback
                        ? 'bg-[var(--vt-amber-100)] text-[var(--vt-amber-800)] border-[var(--vt-amber-200)]'
                        : 'bg-[var(--vt-success-100)] text-[var(--vt-success-800)] border-[var(--vt-success-300)]'
                      : 'bg-[var(--vt-slate-100)] text-[var(--vt-slate-600)] border-[var(--vt-slate-200)]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isModelReady
                        ? isFallback
                          ? 'bg-[var(--vt-amber-500)]'
                          : 'bg-[var(--vt-success-500)]'
                        : 'bg-[var(--vt-slate-400)]'
                    }`}
                  />
                  {isModelReady ? (isFallback ? 'Mô phỏng F0' : 'Sẵn sàng') : 'Đang tải'}
                </span>
              </div>
              <p className="text-xs text-[var(--vt-slate-500)] truncate mt-0.5 font-medium" title={modelUrl}>
                URL: {modelUrl}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenModelSettings();
            }}
            aria-label="Đổi URL mô hình AI"
            className="vt-btn vt-btn-secondary-light min-h-[44px] px-3.5 py-2 text-xs shrink-0"
          >
            Đổi URL
          </button>
        </div>

        {/* 4. Sơ đồ kiến trúc thuật toán (Architecture Flow) */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--vt-cyan-50)] text-[var(--vt-cyan-600)] flex items-center justify-center shrink-0 border border-[var(--vt-cyan-100)]">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--vt-slate-800)]">
                Sơ đồ Kiến trúc & Luồng xử lý Code
              </h4>
              <p className="text-xs text-[var(--vt-slate-500)] font-medium">
                Biểu đồ luồng dữ liệu thời gian thực từ AudioContext qua Teachable Machine và DTW F0
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenArchitecture();
            }}
            aria-label="Xem sơ đồ kiến trúc thuật toán"
            className="vt-btn min-h-[44px] px-3.5 py-2 text-xs bg-[var(--vt-cyan-50)] hover:bg-[var(--vt-cyan-100)] text-[var(--vt-cyan-700)] border-[var(--vt-cyan-200)] border-b-[var(--vt-cyan-shadow)] shrink-0"
          >
            Xem sơ đồ
          </button>
        </div>

        {/* 5. Xóa lịch sử dữ liệu luyện tập */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--vt-red-50)] text-[var(--vt-red-600)] flex items-center justify-center shrink-0 border border-[var(--vt-red-100)]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-[var(--vt-slate-800)]">
                  Xóa toàn bộ lịch sử luyện tập
                </h4>
                <p className="text-xs text-[var(--vt-slate-500)] font-medium">
                  Đặt lại dữ liệu tiến độ và streak về trạng thái ban đầu
                </p>
              </div>
            </div>

            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                aria-label="Xóa dữ liệu lịch sử luyện tập"
                className="vt-btn min-h-[44px] px-3.5 py-2 text-xs text-[var(--vt-red-600)] bg-[var(--vt-red-50)] hover:bg-[var(--vt-red-100)] border-[var(--vt-red-200)] border-b-[var(--vt-red-200)] shrink-0"
              >
                Xóa dữ liệu
              </button>
            ) : null}
          </div>

          {showClearConfirm && (
            <div className="mt-3 p-3.5 bg-[var(--vt-red-50)] rounded-2xl border-2 border-[var(--vt-red-200)] text-xs text-[var(--vt-red-900)] space-y-2.5 animate-vt-pop">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[var(--vt-red-600)] shrink-0 mt-0.5" />
                <p className="font-bold">
                  Bạn có chắc chắn muốn xóa toàn bộ lịch sử luyện tập và chuỗi ngày rèn luyện? Thao tác này không thể hoàn tác.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  aria-label="Hủy xóa lịch sử"
                  className="vt-btn vt-btn-secondary-light min-h-[44px] px-4 py-1.5 text-xs bg-white"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setShowClearConfirm(false);
                    onClose();
                  }}
                  aria-label="Xác nhận xóa toàn bộ dữ liệu"
                  className="vt-btn min-h-[44px] px-4 py-1.5 text-xs bg-[var(--vt-red-600)] text-white border-[var(--vt-red-700)] border-b-[var(--vt-red-900)] hover:bg-[var(--vt-red-700)] shadow-xs"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
