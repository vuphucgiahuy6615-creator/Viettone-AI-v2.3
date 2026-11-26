import JSZip from 'jszip';
import { TONE_CLASSES } from '../config';
import { REGIONAL_PROFILES } from '../data/vocabulary';
import { RegionId, StudioAudioTake } from '../types';

function writeAsciiString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Mã hóa mảng mẫu âm thanh mono Float32 [-1, 1] thành Blob WAV 16-bit PCM chuẩn
 */
export function encodeWavBuffer(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataByteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAsciiString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size = 16 (PCM)
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function sanitizeFilenamePart(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Đóng gói dữ liệu thu âm theo 7 thư mục chuẩn Teachable Machine Audio (.wav)
 */
export async function exportDatasetZip(
  takesByClass: Record<string, StudioAudioTake[]>,
  regionId: RegionId
): Promise<Blob> {
  const zip = new JSZip();
  const regionProfile =
    REGIONAL_PROFILES.find((r) => r.id === regionId) || REGIONAL_PROFILES[0];

  let totalTakes = 0;
  const classSummaryLines: string[] = [];

  for (const className of TONE_CLASSES) {
    const folder = zip.folder(className);
    const takes = takesByClass[className] || [];
    totalTakes += takes.length;
    classSummaryLines.push(`- ${className}: ${takes.length} file WAV`);

    if (!folder) continue;

    takes.forEach((take, index) => {
      const wavBlob = encodeWavBuffer(take.pcmData, take.sampleRate);
      const wordPart = sanitizeFilenamePart(take.word || 'sample');
      const idxStr = String(index + 1).padStart(2, '0');
      const filename = `${sanitizeFilenamePart(className)}_${wordPart}_${regionId}_${idxStr}.wav`;
      folder.file(filename, wavBlob);
    });
  }

  const readmeContent = [
    'VIETTONE AI - BO DU LIEU GIONG DOC TEACHABLE MACHINE AUDIO',
    '==========================================================',
    `Vung mien: ${regionProfile.name} (${regionId})`,
    `Ngay xuat: ${new Date().toLocaleString('vi-VN')}`,
    `Tong so mau WAV: ${totalTakes}`,
    '',
    'Cau truc 7 thu muc chuan Teachable Machine:',
    ...classSummaryLines,
    '',
    'Huong dan huan luyen tren Teachable Machine:',
    '1. Giai nen file ZIP nay.',
    '2. Truy cap https://teachablemachine.withgoogle.com/train/audio',
    '3. Tao du 7 lop (Class) theo dung ten 7 thu muc trong goi ZIP.',
    '4. Tai cac file .wav tu tung thu muc vao lop tuong ung (Background Noise >= 20s tong hoac nhieu mau nen).',
    '5. Nhan Train Model -> Export Model -> Upload my model -> Sao chep link.',
    '6. Dan link vao muc "Cap nhat du lieu giong doc" trong VietTone AI.',
  ].join('\n');

  zip.file('README.txt', readmeContent);

  return zip.generateAsync({ type: 'blob' });
}
