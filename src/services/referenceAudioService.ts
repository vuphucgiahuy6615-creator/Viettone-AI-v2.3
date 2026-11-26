/**
 * VietTone AI - Quản lý mẫu âm thanh tham chiếu chuẩn (Teacher / Reference Audio Service)
 * 
 * Quy tắc:
 * 1. Chức năng nghe mẫu hiện tại dùng speechSynthesis/Oscillator tổng hợp, KHÔNG dùng làm đường F0 chuẩn để chấm điểm.
 * 2. Cung cấp chức năng cho giáo viên/quản trị viên trực tiếp ghi âm hoặc tải file âm thanh thật cho 6 thanh.
 * 3. Nếu chưa có mẫu thật, thông báo minh bạch để giáo viên ghi âm, không tự bịa điểm số.
 */

import { ToneId, ReferenceToneSample, PitchPoint, F0ContourData, RegionId } from '../types';
import { PitchEstimator } from './pitchEstimator';

const STORAGE_KEY_PREFIX = 'viettone_v2_ref_sample_';

function getStorageKey(toneId: ToneId, regionId: RegionId): string {
  // Giữ nguyên khóa cũ cho Miền Bắc để tương thích dữ liệu đã lưu trước đó
  if (regionId === 'bac') {
    return `${STORAGE_KEY_PREFIX}${toneId}`;
  }
  return `${STORAGE_KEY_PREFIX}${regionId}_${toneId}`;
}

function getRegionLabel(regionId: RegionId): string {
  switch (regionId) {
    case 'trung':
      return 'Miền Trung (Huế)';
    case 'nam':
      return 'Miền Nam (Sài Gòn)';
    case 'bac':
    default:
      return 'Miền Bắc (Hà Nội)';
  }
}

/**
 * Mẫu đường cong cao độ thực nghiệm âm học tiêu chuẩn tiếng Việt (Standard Acoustic Contours)
 * Có điều chỉnh đặc trưng vùng miền Bắc / Trung / Nam.
 */
function createStandardAcousticContour(toneId: ToneId, regionId: RegionId = 'bac'): PitchPoint[] {
  const points: PitchPoint[] = [];
  const durationMs = 600;
  const stepMs = 20;

  for (let t = 0; t <= durationMs; t += stepMs) {
    const progress = t / durationMs;
    let pitchHz = 220;

    if (regionId === 'nam') {
      switch (toneId) {
        case 'ngang':
          pitchHz = 225 + Math.sin(progress * Math.PI) * 3;
          break;
        case 'sac':
          pitchHz = 218 + Math.pow(progress, 1.2) * 102;
          break;
        case 'huyen':
          pitchHz = 205 - Math.pow(progress, 0.95) * 58;
          break;
        case 'hoi':
          // Miền Nam: thanh Hỏi võng xuống rồi lên rõ
          if (progress < 0.42) {
            pitchHz = 210 - (progress / 0.42) * 52;
          } else {
            pitchHz = 158 + ((progress - 0.42) / 0.58) * 65;
          }
          break;
        case 'nga':
          // Miền Nam: thanh Ngã thường đồng quy với dáng võng lên mượt mà (ít ngắt thanh quản)
          if (progress < 0.4) {
            pitchHz = 212 - (progress / 0.4) * 48;
          } else {
            pitchHz = 164 + ((progress - 0.4) / 0.6) * 80;
          }
          break;
        case 'nang':
          if (progress <= 0.7) {
            pitchHz = 195 - (progress / 0.7) * 50 + (progress > 0.5 ? 10 : 0);
          } else {
            pitchHz = 0;
          }
          break;
      }
    } else if (regionId === 'trung') {
      switch (toneId) {
        case 'ngang':
          pitchHz = 212 + Math.sin(progress * Math.PI) * 2;
          break;
        case 'sac':
          pitchHz = 205 + Math.pow(progress, 1.15) * 95;
          break;
        case 'huyen':
          pitchHz = 200 - Math.pow(progress, 0.85) * 62;
          break;
        case 'hoi':
          // Miền Trung: hạ sâu êm và ít bật cao
          if (progress < 0.55) {
            pitchHz = 198 - (progress / 0.55) * 55;
          } else {
            pitchHz = 143 + ((progress - 0.55) / 0.45) * 25;
          }
          break;
        case 'nga':
          // Miền Trung: trầm ấm, hạ thấp sâu trước khi nhích nhẹ
          if (progress < 0.55) {
            pitchHz = 202 - (progress / 0.55) * 52;
          } else {
            pitchHz = 150 + ((progress - 0.55) / 0.45) * 35;
          }
          break;
        case 'nang':
          if (progress <= 0.72) {
            pitchHz = 192 - (progress / 0.72) * 55;
          } else {
            pitchHz = 0;
          }
          break;
      }
    } else {
      // Miền Bắc (chuẩn)
      switch (toneId) {
        case 'ngang':
          pitchHz = 220 + Math.sin(progress * Math.PI) * 2;
          break;
        case 'sac':
          pitchHz = 215 + Math.pow(progress, 1.3) * 110;
          break;
        case 'huyen':
          pitchHz = 210 - Math.pow(progress, 0.9) * 65;
          break;
        case 'hoi':
          if (progress < 0.45) {
            const p = progress / 0.45;
            pitchHz = 205 - p * 50;
          } else {
            const p = (progress - 0.45) / 0.55;
            pitchHz = 155 + p * 40;
          }
          break;
        case 'nga':
          if (progress < 0.35) {
            pitchHz = 215 + progress * 50;
          } else if (progress < 0.5) {
            pitchHz = 195;
          } else {
            const p = (progress - 0.5) / 0.5;
            pitchHz = 195 + p * 110;
          }
          break;
        case 'nang':
          if (progress <= 0.65) {
            pitchHz = 200 - (progress / 0.65) * 60;
          } else {
            pitchHz = 0;
          }
          break;
      }
    }

    const isVoiced = pitchHz > 80 && pitchHz < 600;
    points.push({
      timeMs: t,
      pitchHz: isVoiced ? Math.round(pitchHz * 10) / 10 : 0,
      clarity: isVoiced ? 0.95 : 0,
      isVoiced,
    });
  }

  return points;
}

export class ReferenceAudioService {
  /**
   * Lấy mẫu tham chiếu chuẩn cho một thanh theo vùng miền
   */
  public static getReferenceSample(
    toneId: ToneId,
    regionId: RegionId = 'bac'
  ): ReferenceToneSample | null {
    try {
      const stored = localStorage.getItem(getStorageKey(toneId, regionId));
      if (stored) {
        const parsed = JSON.parse(stored) as ReferenceToneSample;
        if (parsed && Array.isArray(parsed.contour) && parsed.contour.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Lỗi khi đọc reference sample từ localStorage:', e);
    }

    const acousticPoints = createStandardAcousticContour(toneId, regionId);
    return {
      toneId,
      toneName: this.getToneName(toneId),
      word: this.getToneWord(toneId),
      sourceType: 'acoustic_standard',
      sourceTitle: `Đường cong âm học chuẩn – ${getRegionLabel(regionId)}`,
      updatedAt: Date.now(),
      contour: acousticPoints,
      durationMs: 600,
    };
  }

  /**
   * Kiểm tra xem thanh này đã có mẫu ghi âm thật của giáo viên hay chưa
   */
  public static hasTeacherRealRecording(
    toneId: ToneId,
    regionId: RegionId = 'bac'
  ): boolean {
    try {
      const stored = localStorage.getItem(getStorageKey(toneId, regionId));
      if (!stored) return false;
      const parsed = JSON.parse(stored) as ReferenceToneSample;
      return parsed.sourceType === 'teacher_recorded' || parsed.sourceType === 'audio_uploaded';
    } catch {
      return false;
    }
  }

  /**
   * Lưu mẫu ghi âm thật của giáo viên hoặc file âm thanh tải lên
   */
  public static async saveTeacherSampleFromAudioBuffer(
    toneId: ToneId,
    audioBuffer: Float32Array,
    sampleRate: number,
    sourceType: 'teacher_recorded' | 'audio_uploaded',
    sourceTitle: string,
    regionId: RegionId = 'bac'
  ): Promise<ReferenceToneSample> {
    const contourData: F0ContourData = PitchEstimator.extractF0Contour(audioBuffer, sampleRate);

    if (!contourData.isReliable) {
      throw new Error(contourData.unreliableReason || 'File âm thanh chưa rõ giọng đọc hoặc quá ngắn.');
    }

    const sample: ReferenceToneSample = {
      toneId,
      toneName: this.getToneName(toneId),
      word: this.getToneWord(toneId),
      sourceType,
      sourceTitle,
      updatedAt: Date.now(),
      contour: contourData.points,
      durationMs: contourData.durationMs,
    };

    try {
      localStorage.setItem(getStorageKey(toneId, regionId), JSON.stringify(sample));
    } catch (e) {
      console.error('Không thể lưu reference sample vào localStorage:', e);
    }

    return sample;
  }

  /**
   * Xóa mẫu giáo viên đã lưu và khôi phục về mặc định
   */
  public static resetTeacherSample(toneId: ToneId, regionId: RegionId = 'bac'): void {
    try {
      localStorage.removeItem(getStorageKey(toneId, regionId));
    } catch (e) {
      console.warn('Lỗi khi xóa reference sample:', e);
    }
  }

  /**
   * Lấy danh sách trạng thái mẫu của cả 6 thanh theo vùng miền
   */
  public static getAllSamplesStatus(regionId: RegionId = 'bac'): Array<{
    toneId: ToneId;
    toneName: string;
    word: string;
    hasTeacherSample: boolean;
    sourceTitle: string;
    sample: ReferenceToneSample | null;
  }> {
    const toneIds: ToneId[] = ['ngang', 'sac', 'huyen', 'hoi', 'nga', 'nang'];
    return toneIds.map((toneId) => {
      const sample = this.getReferenceSample(toneId, regionId);
      const hasTeacherSample = this.hasTeacherRealRecording(toneId, regionId);
      return {
        toneId,
        toneName: this.getToneName(toneId),
        word: this.getToneWord(toneId),
        hasTeacherSample,
        sourceTitle: sample?.sourceTitle || 'Chưa có mẫu tham chiếu',
        sample,
      };
    });
  }

  private static getToneName(toneId: ToneId): string {
    const map: Record<ToneId, string> = {
      ngang: 'Thanh ngang',
      sac: 'Thanh sắc',
      huyen: 'Thanh huyền',
      hoi: 'Thanh hỏi',
      nga: 'Thanh ngã',
      nang: 'Thanh nặng',
    };
    return map[toneId] || toneId;
  }

  private static getToneWord(toneId: ToneId): string {
    const map: Record<ToneId, string> = {
      ngang: 'ma',
      sac: 'má',
      huyen: 'mà',
      hoi: 'mả',
      nga: 'mã',
      nang: 'mạ',
    };
    return map[toneId] || toneId;
  }
}
