import { TEACHABLE_MACHINE_MODEL_URL } from '../config';

const ACTIVE_MODEL_STORAGE_KEY = 'vt_active_model_url';
const SAVED_CUSTOM_MODELS_KEY = 'vt_saved_custom_models';

export interface SavedCustomModel {
  url: string;
  wordLabels?: string[];
  updatedAt: number;
}

/**
 * Chuẩn hóa URL Teachable Machine:
 * - Cắt khoảng trắng
 * - Nếu người dùng dán kèm /model.json hoặc /metadata.json thì tự động bỏ phần tên file
 * - Đảm bảo kết thúc bằng dấu /
 */
export function normalizeTeachableMachineUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    let pathname = parsed.pathname;
    pathname = pathname.replace(/\/(model\.json|metadata\.json|weights\.bin)$/i, '');
    if (!pathname.endsWith('/')) {
      pathname += '/';
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
}

export const DEFAULT_MODEL_URL =
  normalizeTeachableMachineUrl(TEACHABLE_MACHINE_MODEL_URL) || TEACHABLE_MACHINE_MODEL_URL;

export function isDefaultModelUrl(url: string): boolean {
  const normalized = normalizeTeachableMachineUrl(url);
  if (!normalized) return false;
  return normalized === DEFAULT_MODEL_URL;
}

export const ModelStorage = {
  getActiveModelUrl(): string {
    try {
      const saved = localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY);
      if (saved) {
        const normalized = normalizeTeachableMachineUrl(saved);
        if (normalized) return normalized;
      }
    } catch {
      // Ignore storage access errors
    }
    return DEFAULT_MODEL_URL;
  },

  setActiveModelUrl(url: string): string {
    const normalized = normalizeTeachableMachineUrl(url) || DEFAULT_MODEL_URL;
    try {
      localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage write errors
    }
    return normalized;
  },

  getSavedCustomModels(): SavedCustomModel[] {
    try {
      const raw = localStorage.getItem(SAVED_CUSTOM_MODELS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (item): item is SavedCustomModel =>
            Boolean(item) &&
            typeof item.url === 'string' &&
            !isDefaultModelUrl(item.url)
        )
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch {
      return [];
    }
  },

  saveCustomModel(entry: SavedCustomModel): SavedCustomModel[] {
    const normalized = normalizeTeachableMachineUrl(entry.url);
    if (!normalized || isDefaultModelUrl(normalized)) {
      return this.getSavedCustomModels();
    }

    const existing = this.getSavedCustomModels().filter(
      (item) => normalizeTeachableMachineUrl(item.url) !== normalized
    );

    const updated: SavedCustomModel[] = [
      {
        url: normalized,
        wordLabels: entry.wordLabels,
        updatedAt: entry.updatedAt || Date.now(),
      },
      ...existing,
    ].slice(0, 10);

    try {
      localStorage.setItem(SAVED_CUSTOM_MODELS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage write errors
    }
    return updated;
  },

  removeCustomModel(url: string): SavedCustomModel[] {
    const normalized = normalizeTeachableMachineUrl(url);
    const remaining = this.getSavedCustomModels().filter(
      (item) => normalizeTeachableMachineUrl(item.url) !== normalized
    );
    try {
      localStorage.setItem(SAVED_CUSTOM_MODELS_KEY, JSON.stringify(remaining));
    } catch {
      // Ignore storage write errors
    }
    return remaining;
  },
};
