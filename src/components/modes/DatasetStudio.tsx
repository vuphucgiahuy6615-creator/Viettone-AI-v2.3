import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Play,
  Trash2,
  Download,
  BookmarkCheck,
  Radio,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { TONE_CLASSES } from '../../config';
import { ALL_PRACTICE_WORDS, REGIONAL_PROFILES } from '../../data/vocabulary';
import { ReferenceAudioService } from '../../services/referenceAudioService';
import { VadPreprocessor } from '../../services/vadPreprocessor';
import { RegionId, StudioAudioTake, ToneId } from '../../types';
import { playStudioBuffer, stopAnyVoiceAudio } from '../../utils/audioSynthesizer';
import { exportDatasetZip } from '../../utils/wavEncoder';

interface DatasetStudioProps {
  activeRegion: RegionId;
  onSamplesUpdated: () => void;
}

const CLASS_TO_TONE_ID: Record<string, ToneId | null> = {
  'Background Noise': null,
  'Thanh ngang': 'ngang',
  'Thanh sắc': 'sac',
  'Thanh huyền': 'huyen',
  'Thanh hỏi': 'hoi',
  'Thanh ngã': 'nga',
  'Thanh nặng': 'nang',
};

const DEFAULT_WORDS_BY_CLASS: Record<string, string> = {
  'Background Noise': 'nhieu_nen',
  'Thanh ngang': 'ma',
  'Thanh sắc': 'má',
  'Thanh huyền': 'mà',
  'Thanh hỏi': 'mả',
  'Thanh ngã': 'mã',
  'Thanh nặng': 'mạ',
};

export const DatasetStudio: React.FC<DatasetStudioProps> = ({
  activeRegion,
  onSamplesUpdated,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(TONE_CLASSES[1]);
  const [targetWord, setTargetWord] = useState<string>(DEFAULT_WORDS_BY_CLASS[TONE_CLASSES[1]]);
  const [takesByClass, setTakesByClass] = useState<Record<string, StudioAudioTake[]>>({});
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const cleanupMic = () => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore
      }
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
    setLiveVolume(0);
  };

  useEffect(() => {
    return () => {
      cleanupMic();
      stopAnyVoiceAudio();
    };
  }, []);

  const handleSelectClass = (cls: string) => {
    setSelectedClass(cls);
    setTargetWord(DEFAULT_WORDS_BY_CLASS[cls] || 'ma');
    setStatusBanner(null);
  };

  const handleStartRecord = async () => {
    stopAnyVoiceAudio();
    setStatusBanner(null);
    cleanupMic();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(2048, 1, 1);
      const chunks: Float32Array[] = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(input));
        let sumSq = 0;
        for (let i = 0; i < input.length; i++) {
          sumSq += input[i] * input[i];
        }
        const rms = Math.sqrt(sumSq / input.length);
        setLiveVolume(Math.min(1, rms * 6));
      };

      const silentGain = ctx.createGain();
      silentGain.gain.setValueAtTime(0, ctx.currentTime);

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      streamRef.current = stream;
      ctxRef.current = ctx;
      processorRef.current = processor;
      chunksRef.current = chunks;
      setIsRecording(true);
    } catch {
      setStatusBanner({
        type: 'error',
        message: 'Không thể mở microphone. Vui lòng cấp quyền mic trong trình duyệt.',
      });
    }
  };

  const handleStopRecord = () => {
    const sampleRate = ctxRef.current?.sampleRate || 44100;
    const rawChunks = chunksRef.current;
    const cls = selectedClass;
    const wordVal = targetWord.trim() || DEFAULT_WORDS_BY_CLASS[cls] || 'sample';

    cleanupMic();

    const totalLen = rawChunks.reduce((sum, c) => sum + c.length, 0);
    if (totalLen < sampleRate * 0.15) {
      setStatusBanner({
        type: 'error',
        message: 'Đoạn thu âm quá ngắn. Hãy giữ tối thiểu khoảng 0.5 – 1.5 giây.',
      });
      return;
    }

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const c of rawChunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    let finalPcm = merged;
    if (cls !== 'Background Noise') {
      const vad = VadPreprocessor.processAudio(merged, sampleRate);
      if (vad.speechDetected && vad.trimmedBuffer.length > sampleRate * 0.15) {
        finalPcm = vad.trimmedBuffer;
      }
    }

    const take: StudioAudioTake = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      className: cls,
      word: wordVal,
      durationMs: Math.round((finalPcm.length / sampleRate) * 1000),
      sampleRate,
      pcmData: finalPcm,
      createdAt: Date.now(),
    };

    setTakesByClass((prev) => ({
      ...prev,
      [cls]: [take, ...(prev[cls] || [])],
    }));

    setStatusBanner({
      type: 'success',
      message: `Đã lưu mẫu "${wordVal}" vào thư mục ${cls} (${(take.durationMs / 1000).toFixed(2)}s WAV).`,
    });
  };

  const handleDeleteTake = (cls: string, id: string) => {
    setTakesByClass((prev) => ({
      ...prev,
      [cls]: (prev[cls] || []).filter((t) => t.id !== id),
    }));
  };

  const handleSaveAsTeacherF0 = async (take: StudioAudioTake) => {
    const toneId = CLASS_TO_TONE_ID[take.className];
    if (!toneId) return;

    try {
      await ReferenceAudioService.saveTeacherSampleFromAudioBuffer(
        toneId,
        take.pcmData,
        take.sampleRate,
        'teacher_recorded',
        `Phòng thu ${regionLabel} (${take.word})`,
        activeRegion
      );
      onSamplesUpdated();
      setStatusBanner({
        type: 'success',
        message: `Đã cập nhật mẫu chuẩn F0 cho ${take.className} (${regionLabel}).`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Chưa thể trích xuất đường F0 ổn định từ đoạn thu này.',
      });
    }
  };

  const handleExportZip = async () => {
    if (totalTakes === 0) {
      setStatusBanner({
        type: 'error',
        message: 'Chưa có đoạn thu nào để xuất. Hãy ghi âm ít nhất 1 mẫu WAV.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const zipBlob = await exportDatasetZip(takesByClass, activeRegion);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viettone_dataset_${activeRegion}_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusBanner({
        type: 'success',
        message: `Đã tải xuống gói ZIP gồm 7 thư mục WAV (${totalTakes} file) sẵn sàng nạp lên Teachable Machine!`,
      });
    } catch {
      setStatusBanner({
        type: 'error',
        message: 'Có lỗi khi nén gói ZIP. Vui lòng thử lại.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const regionLabel =
    REGIONAL_PROFILES.find((r) => r.id === activeRegion)?.shortName || 'Miền Bắc';

  const currentTakes = takesByClass[selectedClass] || [];
  const totalTakes = (Object.values(takesByClass) as StudioAudioTake[][]).reduce(
    (sum, list) => sum + list.length,
    0
  );

  const selectedToneId = CLASS_TO_TONE_ID[selectedClass];
  const suggestedWords = selectedToneId
    ? ALL_PRACTICE_WORDS.filter((w) => w.toneId === selectedToneId && w.stageId !== 'stage3_compounds').slice(0, 4)
    : [];

  return (
    <section
      aria-label="Phòng thu dữ liệu giọng đọc cho Giáo viên và Phụ huynh"
      className="flex-1 w-full max-w-2xl mx-auto pb-24 md:pb-12 space-y-4"
    >
      {/* Banner */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] border-2 border-white/20 border-b-4 border-b-[var(--vt-red-shadow)] p-4 sm:p-5 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-white/85">
            PHÒNG THU GIÁO VIÊN &amp; PHỤ HUYNH
          </p>
          <h1 className="text-lg sm:text-2xl font-black text-white leading-tight mt-0.5">
            Thu âm &amp; Xuất gói ZIP 7 thư mục WAV
          </h1>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/25 flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
      </div>

      {/* Chọn 1 trong 7 lớp Teachable Machine */}
      <div className="vt-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-white/75">
            1. Chọn lớp dữ liệu ({regionLabel})
          </h2>
          <span className="text-xs font-extrabold text-[var(--vt-amber-300)] tabular-nums">
            Tổng {totalTakes} mẫu WAV
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TONE_CLASSES.map((cls) => {
            const count = (takesByClass[cls] || []).length;
            const isActive = selectedClass === cls;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => handleSelectClass(cls)}
                className={`min-h-[48px] px-2.5 py-2 rounded-xl border-2 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                  isActive
                    ? 'bg-[var(--vt-orange)]/25 border-[var(--vt-orange)] text-white'
                    : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'
                }`}
              >
                <p className="text-xs font-black truncate">{cls}</p>
                <p className="text-[11px] text-[var(--vt-amber-300)] font-bold tabular-nums">
                  {count} mẫu
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Khu vực thu âm cho lớp đang chọn */}
      <div className="vt-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-white">
              2. Ghi âm cho lớp &ldquo;{selectedClass}&rdquo;
            </h2>
            <p className="text-xs text-white/75 font-semibold mt-0.5">
              {selectedClass === 'Background Noise'
                ? 'Giữ im lặng hoặc thu tiếng ồn phòng học tự nhiên để làm mẫu nền.'
                : 'Hệ thống tự động cắt khoảng lặng đầu/cuối và chuẩn hóa âm lượng WAV 16-bit.'}
            </p>
          </div>
        </div>

        {/* Từ cần đọc (nếu là thanh điệu) */}
        {selectedClass !== 'Background Noise' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white/75">Gợi ý từ:</span>
              {suggestedWords.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setTargetWord(w.word)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-extrabold border transition-colors cursor-pointer ${
                    targetWord === w.word
                      ? 'bg-[var(--vt-orange)] border-[var(--vt-amber-300)] text-white'
                      : 'bg-white/10 border-white/15 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {w.word}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={targetWord}
              onChange={(e) => setTargetWord(e.target.value)}
              placeholder="Hoặc nhập từ muốn ghi âm..."
              aria-label="Từ ghi âm"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/20 text-sm font-bold text-white placeholder:text-white/40 focus:outline-hidden focus:border-[var(--vt-orange)]"
            />
          </div>
        )}

        {/* Thanh mức âm lượng + Nút Ghi âm */}
        <div className="space-y-2.5">
          <div className="w-full h-2.5 rounded-full bg-black/35 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[var(--vt-amber-300)] to-[var(--vt-orange)] transition-all duration-75"
              style={{ width: `${Math.round(liveVolume * 100)}%` }}
            />
          </div>

          {!isRecording ? (
            <button
              type="button"
              onClick={handleStartRecord}
              className="vt-btn-3d vt-btn-primary w-full min-h-[48px] py-3 px-4 text-sm"
            >
              <Mic className="w-4 h-4" />
              <span>BẮT ĐẦU GHI MẪU ({selectedClass === 'Background Noise' ? 'Nền' : targetWord})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecord}
              className="vt-btn-3d w-full min-h-[48px] py-3 px-4 bg-[var(--vt-slate-900)] border-white/30 border-b-black text-white text-sm"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>DỪNG &amp; LƯU MẪU WAV</span>
            </button>
          )}
        </div>

        {statusBanner && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
              statusBanner.type === 'success'
                ? 'bg-[var(--vt-success)]/25 border-[var(--vt-success-300)]/60 text-white'
                : 'bg-[var(--vt-red)]/25 border-[var(--vt-red-300)]/60 text-white'
            }`}
          >
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--vt-success-300)] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[var(--vt-amber-300)] shrink-0 mt-0.5" />
            )}
            <span>{statusBanner.message}</span>
          </div>
        )}

        {/* Danh sách các đoạn thu trong lớp đang chọn */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-extrabold text-white/75 uppercase tracking-wider">
            Danh sách đoạn thu của {selectedClass} ({currentTakes.length})
          </p>

          {currentTakes.length === 0 ? (
            <p className="text-xs text-white/55 font-semibold py-2">
              Chưa có đoạn thu nào cho lớp này. Nhấn nút ghi âm ở trên để thêm mẫu đầu tiên.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {currentTakes.map((take, idx) => (
                <div
                  key={take.id}
                  className="p-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">
                      #{currentTakes.length - idx} · {take.word}
                    </p>
                    <p className="text-[11px] text-white/70 font-semibold tabular-nums">
                      {(take.durationMs / 1000).toFixed(2)}s · {take.sampleRate} Hz
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => playStudioBuffer(take.pcmData, take.sampleRate)}
                      title="Nghe lại mẫu này"
                      aria-label={`Nghe lại mẫu ${take.word}`}
                      className="min-w-[36px] min-h-[36px] rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </button>

                    {selectedToneId && (
                      <button
                        type="button"
                        onClick={() => handleSaveAsTeacherF0(take)}
                        title="Dùng mẫu này làm đường F0 chuẩn cho vùng hiện tại"
                        className="min-h-[36px] px-2.5 rounded-lg bg-[var(--vt-amber-400)]/20 hover:bg-[var(--vt-amber-400)]/30 border border-[var(--vt-amber-300)]/40 text-[var(--vt-amber-200)] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Lưu mẫu F0</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteTake(selectedClass, take.id)}
                      title="Xóa mẫu này"
                      aria-label={`Xóa mẫu ${take.word}`}
                      className="min-w-[36px] min-h-[36px] rounded-lg bg-white/10 hover:bg-[var(--vt-red)]/35 text-white/75 hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Xuất ZIP 7 thư mục WAV */}
      <div className="vt-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-white">
            3. Xuất gói dữ liệu Teachable Machine
          </h3>
          <p className="text-xs text-white/75 font-semibold mt-0.5">
            Tải file ZIP chia sẵn 7 thư mục WAV + hướng dẫn nạp lên Teachable Machine.
          </p>
        </div>

        <button
          type="button"
          disabled={isExporting || totalTakes === 0}
          onClick={handleExportZip}
          className="vt-btn-3d vt-btn-primary min-h-[46px] px-4 py-2.5 text-xs sm:text-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'ĐANG NÉN ZIP...' : `TẢI GÓI ZIP (${totalTakes})`}</span>
        </button>
      </div>
    </section>
  );
};
