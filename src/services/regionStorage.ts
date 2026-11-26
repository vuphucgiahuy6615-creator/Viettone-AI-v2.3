import { RegionId } from '../types';
import { DEFAULT_MODEL_URL, normalizeTeachableMachineUrl } from './modelStorage';

const ACTIVE_REGION_KEY = 'vt_active_region';
const REGION_MODEL_MAP_KEY = 'vt_region_model_map';

export const RegionStorage = {
  getActiveRegion(): RegionId {
    try {
      const val = localStorage.getItem(ACTIVE_REGION_KEY);
      if (val === 'bac' || val === 'trung' || val === 'nam') {
        return val;
      }
    } catch {
      // Ignore storage read errors
    }
    return 'bac';
  },

  setActiveRegion(regionId: RegionId): void {
    try {
      localStorage.setItem(ACTIVE_REGION_KEY, regionId);
    } catch {
      // Ignore storage write errors
    }
  },

  getRegionModelMap(): Partial<Record<RegionId, string>> {
    try {
      const raw = localStorage.getItem(REGION_MODEL_MAP_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Partial<Record<RegionId, string>>;
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  },

  getRegionModelUrl(regionId: RegionId): string {
    const map = this.getRegionModelMap();
    const custom = map[regionId];
    if (custom) {
      const normalized = normalizeTeachableMachineUrl(custom);
      if (normalized) return normalized;
    }
    return DEFAULT_MODEL_URL;
  },

  setRegionModelUrl(regionId: RegionId, url: string): string {
    const normalized = normalizeTeachableMachineUrl(url) || DEFAULT_MODEL_URL;
    const map = this.getRegionModelMap();
    if (normalized === DEFAULT_MODEL_URL) {
      delete map[regionId];
    } else {
      map[regionId] = normalized;
    }
    try {
      localStorage.setItem(REGION_MODEL_MAP_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage write errors
    }
    return normalized;
  },

  hasCustomRegionModel(regionId: RegionId): boolean {
    const map = this.getRegionModelMap();
    return Boolean(map[regionId] && normalizeTeachableMachineUrl(map[regionId]!) !== DEFAULT_MODEL_URL);
  },
};
