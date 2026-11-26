import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
  badge?: React.ReactNode;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidthClass = 'max-w-4xl',
  badge,
}) => {
  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Khóa cuộn trang nền khi modal mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[var(--vt-slate-900)]/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${maxWidthClass} bg-[var(--vt-surface-modal)] rounded-3xl shadow-2xl border-2 border-[var(--vt-slate-200)] border-b-4 border-b-[var(--vt-slate-shadow)] flex flex-col max-h-[90vh] overflow-hidden animate-vt-pop`}
      >
        {/* Sticky Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b-2 border-[var(--vt-slate-100)] flex items-center justify-between gap-3 bg-[var(--vt-surface-modal)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-10 h-10 rounded-2xl bg-[var(--vt-red-50)] text-[var(--vt-red-600)] flex items-center justify-center shrink-0 border-2 border-[var(--vt-red-100)] shadow-2xs">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="modal-title" className="text-lg sm:text-xl font-black text-[var(--vt-slate-900)] truncate">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs sm:text-sm text-[var(--vt-slate-500)] mt-0.5 truncate font-semibold">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="vt-btn vt-btn-secondary-light min-w-[44px] min-h-[44px] w-11 h-11 rounded-full p-0 shrink-0"
            title="Đóng cửa sổ (Esc)"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 bg-[var(--vt-slate-50)]/60">
          {children}
        </div>
      </div>
    </div>
  );
};
