import React, { useState, useEffect } from 'react';
import {
  Check,
  RefreshCw,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Mic2,
  Link2,
  RotateCcw,
  Trash2,
  Sparkles,
  ArrowRight,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import { TONE_CLASSES } from '../config';
import {
  DEFAULT_MODEL_URL,
  ModelStorage,
  SavedCustomModel,
  isDefaultModelUrl,
  normalizeTeachableMachineUrl,
} from '../services/modelStorage';
import { REGIONAL_PROFILES } from '../data/vocabulary';
import { RegionId } from '../types';
import { ModalWrapper } from './immersive/ModalWrapper';

export interface ModelSwitchResult {
  success: boolean;
  loadedFromUrl: boolean;
  isFallback: boolean;
  normalizedUrl: string;
  wordLabels?: string[];
  error?: string;
}

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModelUrl: string;
  activeRegion?: RegionId;
  loadedWordLabels?: string[];
  onSaveModelUrl: (newUrl: string) => Promise<ModelSwitchResult>;
  isModelReady?: boolean;
  isFallback: boolean;
  modelError?: string;
  onOpenTeacherModal: () => void;
  onOpenArchitecture?: () => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaveModelUrl,
  currentModelUrl,
  activeRegion = 'bac',
  loadedWordLabels = [],
  isModelReady = true,
  isFallback,
  modelError,
  onOpenTeacherModal,
  onOpenArchitecture,
}) => {
  const regionLabel =
    REGIONAL_PROFILES.find((r) => r.id === activeRegion)?.name || 'Miền Bắc (Chuẩn Hà Nội)';
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [switchingUrl, setSwitchingUrl] = useState<string | null>(null);
  const [savedModels, setSavedModels] = useState<SavedCustomModel[]>([]);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedModels(ModelStorage.getSavedCustomModels());
      setFeedback(null);
      setUrlInput(isDefaultModelUrl(currentModelUrl) ? '' : currentModelUrl);
    }
  }, [isOpen, currentModelUrl]);

  const isUsingDefault = isDefaultModelUrl(currentModelUrl);

  const applyModelUrl = async (targetUrl: string, clearInputOnSuccess = false) => {
    const normalized = normalizeTeachableMachineUrl(targetUrl);
    if (!normalized) {
      setFeedback({
        type: 'error',
        message: 'Đường link không hợp lệ. Vui lòng nhập URL Teachable Machine bắt đầu bằng https://',
      });
      return;
    }

    setFeedback(null);
    setSwitchingUrl(normalized);
    setIsSaving(true);

    try {
      const result = await onSaveModelUrl(normalized);
      setSavedModels(ModelStorage.getSavedCustomModels());

      if (result.loadedFromUrl) {
        const usingOriginal = isDefaultModelUrl(result.normalizedUrl);
        setFeedback({
          type: 'success',
          message: usingOriginal
            ? 'Đã chuyển về sử dụng Model gốc (Mặc định) thành công!'
            : 'Đã cập nhật dữ liệu giọng đọc theo link Teachable Machine mới! Model gốc vẫn được giữ nguyên bên dưới để bạn chọn lại khi cần.',
        });
        if (clearInputOnSuccess) {
          setUrlInput('');
        }
      } else {
        setFeedback({
          type: 'error',
          message:
            result.error ||
            'Không thể tải model từ đường link này. Vui lòng kiểm tra lại link Teachable Machine (đảm bảo đã Export model dạng Audio).',
        });
      }
    } finally {
      setIsSaving(false);
      setSwitchingUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await applyModelUrl(urlInput, false);
  };

  const handleSelectDefault = async () => {
    await applyModelUrl(DEFAULT_MODEL_URL, true);
  };

  const handleRemoveSaved = async (urlToRemove: string) => {
    const remaining = ModelStorage.removeCustomModel(urlToRemove);
    setSavedModels(remaining);
    const normalizedCurrent = normalizeTeachableMachineUrl(currentModelUrl);
    const normalizedRemoved = normalizeTeachableMachineUrl(urlToRemove);
    if (normalizedCurrent && normalizedRemoved && normalizedCurrent === normalizedRemoved) {
      await applyModelUrl(DEFAULT_MODEL_URL, true);
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Cập nhật dữ liệu giọng đọc"
      subtitle={`Đang cấu hình cho vùng: ${regionLabel}`}
      icon={<Mic2 className="w-5 h-5" />}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4 text-xs sm:text-sm text-[var(--vt-slate-600)]">
        {/* 1. Trạng thái Model đang sử dụng */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`vt-chip px-2.5 py-1 text-xs font-extrabold border-b-2 ${
                  isUsingDefault
                    ? 'bg-[var(--vt-blue-50)] text-[var(--vt-blue-600)] border-[var(--vt-blue-100)]'
                    : 'bg-[var(--vt-amber-100)] text-[var(--vt-amber-800)] border-[var(--vt-amber-200)]'
                }`}
              >
                {isUsingDefault ? 'Model gốc (Mặc định)' : 'Model tùy chỉnh'}
              </span>

              <span
                className={`vt-chip px-2.5 py-1 text-xs font-bold border-b-2 ${
                  !isModelReady
                    ? 'bg-[var(--vt-slate-100)] text-[var(--vt-slate-600)] border-[var(--vt-slate-200)]'
                    : isFallback
                      ? 'bg-[var(--vt-amber-50)] text-[var(--vt-amber-800)] border-[var(--vt-amber-200)]'
                      : 'bg-[var(--vt-success-100)] text-[var(--vt-success-800)] border-[var(--vt-success-300)]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    !isModelReady
                      ? 'bg-[var(--vt-slate-400)]'
                      : isFallback
                        ? 'bg-[var(--vt-amber-500)]'
                        : 'bg-[var(--vt-success-500)]'
                  }`}
                />
                {!isModelReady
                  ? 'Đang tải model...'
                  : isFallback
                    ? 'Chế độ F0 dự phòng'
                    : 'Sẵn sàng nhận diện'}
              </span>
            </div>
          </div>

          <div className="text-xs text-[var(--vt-slate-600)] font-mono bg-[var(--vt-slate-50)] px-3 py-2 rounded-xl border border-[var(--vt-slate-200)] break-all">
            {currentModelUrl}
          </div>

          {loadedWordLabels.length > 0 && !isFallback && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] font-bold text-[var(--vt-slate-500)]">
                Nhãn đã nạp:
              </span>
              {loadedWordLabels.map((lbl) => (
                <span
                  key={lbl}
                  className="px-2 py-0.5 rounded-lg bg-[var(--vt-slate-100)] text-[var(--vt-slate-700)] text-[11px] font-bold border border-[var(--vt-slate-200)]"
                >
                  {lbl}
                </span>
              ))}
            </div>
          )}

          {isFallback && modelError && (
            <div className="p-2.5 bg-[var(--vt-amber-50)] rounded-xl border border-[var(--vt-amber-200)] text-xs text-[var(--vt-amber-900)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--vt-amber-600)] shrink-0 mt-0.5" />
              <span>{modelError}</span>
            </div>
          )}
        </div>

        {/* 2. Form gắn link Teachable Machine mới */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-orange-200)] border-b-4 border-b-[var(--vt-amber-shadow)] shadow-2xs space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--vt-orange-100)] text-[var(--vt-red-600)] flex items-center justify-center shrink-0 border border-[var(--vt-orange-200)]">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-[var(--vt-slate-900)]">
                Gắn link Teachable Machine mới
              </h4>
              <p className="text-xs text-[var(--vt-slate-500)] font-medium mt-0.5">
                Dán đường link model Audio từ Teachable Machine để thay đổi model giọng đọc hiện tại. Model gốc vẫn luôn được giữ lại.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/"
              aria-label="Đường link Teachable Machine"
              className="flex-1 px-3.5 py-2.5 rounded-2xl border-2 border-[var(--vt-slate-200)] bg-[var(--vt-slate-50)] text-xs sm:text-sm text-[var(--vt-slate-900)] focus:outline-hidden focus:border-[var(--vt-orange)] focus:bg-white font-mono transition-colors"
              required
            />
            <button
              type="submit"
              disabled={isSaving || !urlInput.trim()}
              className="vt-btn vt-btn-primary min-h-[44px] px-4 py-2.5 text-xs sm:text-sm shrink-0"
            >
              {isSaving && switchingUrl !== DEFAULT_MODEL_URL ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang nạp...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Cập nhật model</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-[var(--vt-slate-500)] font-medium">
            Hệ thống tự động tải <code>model.json</code> và <code>metadata.json</code> trực tiếp từ đường link bạn gắn.
          </p>

          {feedback && (
            <div
              role="status"
              className={`p-3 rounded-2xl border-2 text-xs font-bold flex items-start gap-2 animate-vt-pop ${
                feedback.type === 'success'
                  ? 'bg-[var(--vt-success-100)]/70 border-[var(--vt-success-300)] text-[var(--vt-success-800)]'
                  : 'bg-[var(--vt-red-50)] border-[var(--vt-red-200)] text-[var(--vt-red-700)]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--vt-success-600)] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[var(--vt-red-600)] shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{feedback.message}</span>
            </div>
          )}
        </form>

        {/* 3. Chọn lại Model gốc hoặc các link đã gắn */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-black text-[var(--vt-slate-900)]">
              Chọn model giọng đọc đã lưu
            </h4>
            <span className="text-[11px] font-bold text-[var(--vt-slate-500)]">
              Model gốc luôn được giữ nguyên
            </span>
          </div>

          {/* Card cố định: Model gốc (Mặc định) */}
          <div
            className={`p-3 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
              isUsingDefault
                ? 'bg-[var(--vt-success-100)]/40 border-[var(--vt-success-400)]'
                : 'bg-[var(--vt-slate-50)] border-[var(--vt-slate-200)]'
            }`}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-[var(--vt-slate-900)]">
                  Model gốc (Mặc định VietTone AI)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--vt-blue-100)] text-[var(--vt-blue-600)] text-[10px] font-extrabold">
                  Luôn giữ nguyên
                </span>
              </div>
              <p className="text-[11px] text-[var(--vt-slate-500)] font-mono truncate">
                {DEFAULT_MODEL_URL}
              </p>
            </div>

            {isUsingDefault ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--vt-success-600)] text-white text-xs font-extrabold shrink-0 self-start sm:self-center">
                <Check className="w-3.5 h-3.5" />
                Đang sử dụng
              </span>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSelectDefault}
                className="vt-btn vt-btn-secondary-light min-h-[40px] px-3.5 py-1.5 text-xs shrink-0 self-start sm:self-center"
              >
                {isSaving && switchingUrl === DEFAULT_MODEL_URL ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--vt-red-600)]" />
                )}
                <span>Chọn lại model gốc</span>
              </button>
            )}
          </div>

          {/* Danh sách các link Teachable Machine tùy chỉnh đã gắn */}
          {savedModels.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-extrabold text-[var(--vt-slate-500)] uppercase tracking-wider">
                Link Teachable Machine đã gắn ({savedModels.length})
              </p>
              {savedModels.map((item) => {
                const isActive =
                  normalizeTeachableMachineUrl(currentModelUrl) ===
                  normalizeTeachableMachineUrl(item.url);

                return (
                  <div
                    key={item.url}
                    className={`p-3 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isActive
                        ? 'bg-[var(--vt-amber-50)] border-[var(--vt-amber-400)]'
                        : 'bg-white border-[var(--vt-slate-200)]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-mono font-bold text-[var(--vt-slate-800)] truncate">
                        {item.url}
                      </p>
                      {item.wordLabels && item.wordLabels.length > 0 && (
                        <p className="text-[11px] text-[var(--vt-slate-500)] truncate">
                          Nhãn: {item.wordLabels.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--vt-amber-500)] text-white text-xs font-extrabold">
                          <Check className="w-3.5 h-3.5" />
                          Đang dùng
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => applyModelUrl(item.url, false)}
                          className="vt-btn vt-btn-secondary-light min-h-[38px] px-3 py-1 text-xs"
                        >
                          {isSaving && switchingUrl === item.url ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Chọn dùng'
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleRemoveSaved(item.url)}
                        title="Xóa link này khỏi danh sách đã lưu"
                        aria-label={`Xóa link ${item.url}`}
                        className="p-2 rounded-xl text-[var(--vt-slate-400)] hover:text-[var(--vt-red-600)] hover:bg-[var(--vt-red-50)] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Yêu cầu 7 lớp trong Teachable Machine */}
        <div className="bg-[var(--vt-surface-modal)] p-4 rounded-3xl border-2 border-[var(--vt-slate-200)] shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 font-extrabold text-[var(--vt-slate-800)] text-xs">
            <Layers className="w-4 h-4 text-[var(--vt-slate-500)]" />
            <span>Yêu cầu 7 lớp (Classes) chuẩn trong Teachable Machine Audio:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {TONE_CLASSES.map((clsName, idx) => (
              <div
                key={clsName}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--vt-slate-50)] border border-[var(--vt-slate-200)] text-[11px] font-bold text-[var(--vt-slate-700)]"
              >
                <span className="w-4 h-4 rounded-full bg-[var(--vt-slate-200)] text-[10px] font-black flex items-center justify-center text-[var(--vt-slate-700)] shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate">{clsName}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--vt-slate-500)] font-medium">
            Hỗ trợ cả tên nhãn dạng <code>ma, má, mà, mả, mã, mạ</code> hoặc <code>Thanh ngang, Thanh sắc...</code>
          </p>
        </div>

        {/* 5. Liên kết nhanh Mẫu giáo viên & Kiến trúc + Bảo mật */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTeacherModal();
            }}
            className="p-3 rounded-2xl bg-[var(--vt-red-50)] hover:bg-[var(--vt-red-100)] border border-[var(--vt-red-200)] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Mic2 className="w-4 h-4 text-[var(--vt-red-600)] shrink-0" />
              <span className="text-xs font-extrabold text-[var(--vt-red-700)] truncate">
                Mẫu chuẩn Giáo viên (F0)
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--vt-red-600)] shrink-0" />
          </button>

          {onOpenArchitecture && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenArchitecture();
              }}
              className="p-3 rounded-2xl bg-[var(--vt-slate-900)] hover:bg-[var(--vt-slate-800)] border border-[var(--vt-slate-700)] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-4 h-4 text-[var(--vt-cyan-400)] shrink-0" />
                <span className="text-xs font-extrabold text-white truncate">
                  Sơ đồ Luồng xử lý AI
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--vt-cyan-400)] shrink-0" />
            </button>
          )}
        </div>

        <div className="p-3 bg-white rounded-2xl border border-[var(--vt-slate-200)] flex items-center gap-2 text-[var(--vt-slate-600)] text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-[var(--vt-success-600)] shrink-0" />
          <span>Mô hình chạy hoàn toàn trên trình duyệt, không gửi âm thanh lên máy chủ.</span>
        </div>
      </div>
    </ModalWrapper>
  );
};
