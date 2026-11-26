import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Volume2,
  GitCompareArrows,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { MINIMAL_PAIRS } from '../../data/vocabulary';
import { VIETNAMESE_TONES } from '../../data/tones';
import { AcousticToneClassifier } from '../../services/acousticToneClassifier';
import { PitchEstimator } from '../../services/pitchEstimator';
import { ReferenceAudioService } from '../../services/referenceAudioService';
import { VadPreprocessor } from '../../services/vadPreprocessor';
import { F0ContourData, MinimalPairItem, PitchPoint, RegionId } from '../../types';
import {
  playCelebrationChime,
  playWordAudio,
  stopAnyVoiceAudio,
} from '../../utils/audioSynthesizer';

interface MinimalPairsArenaProps {
  activeRegion: RegionId;
}

type DrillStage = 'idle' | 'recording_a' | 'ready_b' | 'recording_b' | 'done';

interface RecordedPairEval {
  contour: F0ContourData;
  detectedTone: string;
  confidence: number;
  matchesTarget: boolean;
  pitchDeltaHz: number;
}

function buildSvgPolylinePoints(
  points: PitchPoint[],
  width: number,
  height: number
): string {
  const voiced = points.filter((p) => p.isVoiced && p.pitchHz > 0);
  if (voiced.length < 2) return '';

  const minHz = Math.min(...voiced.map((p) => p.pitchHz), 130);
  const maxHz = Math.max(...voiced.map((p) => p.pitchHz), 330);
  const spanHz = Math.max(40, maxHz - minHz);

  return voiced
    .map((pt, idx) => {
      const x = (idx / (voiced.length - 1)) * (width - 16) + 8;
      const normY = (pt.pitchHz - minHz) / spanHz;
      const y = height - 10 - normY * (height - 20);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const MinimalPairsArena: React.FC<MinimalPairsArenaProps> = ({
  activeRegion,
}) => {
  const [selectedPair, setSelectedPair] = useState<MinimalPairItem>(MINIMAL_PAIRS[0]);
  const [drillStage, setDrillStage] = useState<DrillStage>('idle');
  const [evalA, setEvalA] = useState<RecordedPairEval | null>(null);
  const [evalB, setEvalB] = useState<RecordedPairEval | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const autoStopTimerRef = useRef<number | null>(null);

  const cleanupRecording = () => {
    if (autoStopTimerRef.current !== null) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
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
  };

  useEffect(() => {
    return () => {
      cleanupRecording();
      stopAnyVoiceAudio();
    };
  }, []);

  const refA = ReferenceAudioService.getReferenceSample(selectedPair.toneA, activeRegion);
  const refB = ReferenceAudioService.getReferenceSample(selectedPair.toneB, activeRegion);

  const toneMetaA = VIETNAMESE_TONES.find((t) => t.id === selectedPair.toneA);
  const toneMetaB = VIETNAMESE_TONES.find((t) => t.id === selectedPair.toneB);

  const finalizeTake = (which: 'a' | 'b') => {
    const sampleRate = ctxRef.current?.sampleRate || 44100;
    const rawChunks = chunksRef.current;
    cleanupRecording();

    const totalLen = rawChunks.reduce((sum, c) => sum + c.length, 0);
    if (totalLen === 0) {
      setMicError('Chưa thu được âm thanh. Vui lòng thử đọc lại to và rõ hơn.');
      setDrillStage(which === 'a' ? 'idle' : 'ready_b');
      return;
    }

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of rawChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const vad = VadPreprocessor.processAudio(merged, sampleRate);
    const contour = PitchEstimator.extractF0Contour(
      vad.speechDetected ? vad.trimmedBuffer : merged,
      sampleRate
    );

    if (!contour.isReliable) {
      setMicError(
        contour.unreliableReason || 'Giọng đọc chưa đủ rõ cao độ F0. Hãy thử lại gần mic hơn.'
      );
      setDrillStage(which === 'a' ? 'idle' : 'ready_b');
      return;
    }

    const acoustic = AcousticToneClassifier.classifyContour(contour);
    const targetToneName = which === 'a' ? toneMetaA?.name || '' : toneMetaB?.name || '';
    const matchesTarget =
      acoustic.topTone.trim().toLowerCase() === targetToneName.trim().toLowerCase();

    const result: RecordedPairEval = {
      contour,
      detectedTone: acoustic.topTone,
      confidence: acoustic.confidence,
      matchesTarget,
      pitchDeltaHz: acoustic.features.pitchDeltaHz,
    };

    if (which === 'a') {
      setEvalA(result);
      setDrillStage('ready_b');
    } else {
      setEvalB(result);
      setDrillStage('done');
      playCelebrationChime(result.matchesTarget && evalA?.matchesTarget ? 'milestone' : 'success');
    }
  };

  const startRecordingFor = async (which: 'a' | 'b') => {
    stopAnyVoiceAudio();
    setMicError(null);
    cleanupRecording();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
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
        chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
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
      setDrillStage(which === 'a' ? 'recording_a' : 'recording_b');

      autoStopTimerRef.current = window.setTimeout(() => {
        finalizeTake(which);
      }, 2100);
    } catch {
      setMicError('Không thể truy cập microphone. Vui lòng kiểm tra quyền mic trên trình duyệt.');
      setDrillStage('idle');
    }
  };

  const handleSelectPair = (pair: MinimalPairItem) => {
    cleanupRecording();
    stopAnyVoiceAudio();
    setSelectedPair(pair);
    setEvalA(null);
    setEvalB(null);
    setMicError(null);
    setDrillStage('idle');
  };

  const handleResetDrill = () => {
    cleanupRecording();
    setEvalA(null);
    setEvalB(null);
    setMicError(null);
    setDrillStage('idle');
  };

  const refPointsA = refA ? buildSvgPolylinePoints(refA.contour, 220, 96) : '';
  const refPointsB = refB ? buildSvgPolylinePoints(refB.contour, 220, 96) : '';

  const separationGood =
    evalA &&
    evalB &&
    (evalA.detectedTone !== evalB.detectedTone ||
      Math.abs(evalA.pitchDeltaHz - evalB.pitchDeltaHz) >= 15);

  return (
    <section
      aria-label="Chế độ Đấu cặp dễ nhầm"
      className="flex-1 w-full max-w-2xl mx-auto pb-24 md:pb-12 space-y-4"
    >
      {/* Banner */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] border-2 border-white/20 border-b-4 border-b-[var(--vt-red-shadow)] p-4 sm:p-5 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-white/85">
            ĐỐI CHIẾU SONG SONG
          </p>
          <h1 className="text-lg sm:text-2xl font-black text-white leading-tight mt-0.5">
            Đấu cặp thanh dễ nhầm
          </h1>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/25 flex items-center justify-center shrink-0">
          <GitCompareArrows className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
      </div>

      {/* Bộ chọn cặp thanh */}
      <div className="vt-card p-4 space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-white/75">
          Chọn cặp thanh muốn đối chiếu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MINIMAL_PAIRS.map((pair) => {
            const isActive = selectedPair.id === pair.id;
            return (
              <button
                key={pair.id}
                type="button"
                onClick={() => handleSelectPair(pair)}
                className={`p-3 rounded-xl border-2 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                  isActive
                    ? 'bg-[var(--vt-orange)]/25 border-[var(--vt-orange)] text-white'
                    : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'
                }`}
              >
                <p className="text-sm font-black">{pair.title}</p>
                <p className="text-[11px] text-white/70 font-semibold mt-0.5">{pair.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hai thẻ A và B + Đường F0 đối chiếu */}
      <div className="vt-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card A */}
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--vt-amber-300)]">
                Từ A · {toneMetaA?.name}
              </span>
              <button
                type="button"
                onClick={() => playWordAudio(selectedPair.wordA, selectedPair.toneA, activeRegion, 1)}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/20 text-xs font-extrabold text-white cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-[var(--vt-amber-300)]" />
                <span>Nghe</span>
              </button>
            </div>
            <p className="text-4xl font-black text-white">{selectedPair.wordA}</p>
            {evalA && (
              <div className="text-xs font-bold text-white/90 pt-1 border-t border-white/10 tabular-nums">
                AI F0 nghe giống: <span className="text-[var(--vt-amber-300)]">{evalA.detectedTone}</span>{' '}
                ({evalA.pitchDeltaHz >= 0 ? '+' : ''}
                {evalA.pitchDeltaHz} Hz)
              </div>
            )}
          </div>

          {/* Card B */}
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--vt-cyan-400)]">
                Từ B · {toneMetaB?.name}
              </span>
              <button
                type="button"
                onClick={() => playWordAudio(selectedPair.wordB, selectedPair.toneB, activeRegion, 1)}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/20 text-xs font-extrabold text-white cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-[var(--vt-amber-300)]" />
                <span>Nghe</span>
              </button>
            </div>
            <p className="text-4xl font-black text-white">{selectedPair.wordB}</p>
            {evalB && (
              <div className="text-xs font-bold text-white/90 pt-1 border-t border-white/10 tabular-nums">
                AI F0 nghe giống: <span className="text-[var(--vt-cyan-400)]">{evalB.detectedTone}</span>{' '}
                ({evalB.pitchDeltaHz >= 0 ? '+' : ''}
                {evalB.pitchDeltaHz} Hz)
              </div>
            )}
          </div>
        </div>

        {/* Biểu đồ SVG so sánh dáng F0 mẫu của A và B */}
        <div className="rounded-2xl bg-black/30 border border-white/10 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white/80">So sánh hình dáng cao độ F0 chuẩn</span>
            <div className="flex items-center gap-3">
              <span className="text-[var(--vt-amber-300)]">― {selectedPair.wordA}</span>
              <span className="text-[var(--vt-cyan-400)]">― {selectedPair.wordB}</span>
            </div>
          </div>

          <svg
            viewBox="0 0 220 96"
            className="w-full h-24 rounded-xl bg-black/25"
            aria-label="Biểu đồ so sánh cao độ mẫu giữa hai thanh"
          >
            <line x1="8" y1="48" x2="212" y2="48" stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
            {refPointsA && (
              <polyline
                fill="none"
                stroke="#fcd34d"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={refPointsA}
              />
            )}
            {refPointsB && (
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={refPointsB}
              />
            )}
          </svg>

          <p className="text-xs text-white/80 font-semibold leading-relaxed">
            {selectedPair.contrastHint}
          </p>
        </div>

        {micError && (
          <div className="p-3 rounded-xl bg-[var(--vt-red)]/25 border border-[var(--vt-red-300)]/60 text-xs font-bold text-white flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--vt-amber-300)] shrink-0 mt-0.5" />
            <span>{micError}</span>
          </div>
        )}

        {/* Điều khiển Luyện đọc luân phiên A -> B */}
        <div className="space-y-3 pt-1">
          {drillStage === 'idle' && (
            <button
              type="button"
              onClick={() => startRecordingFor('a')}
              className="vt-btn-3d vt-btn-primary w-full min-h-[48px] py-3 px-4 text-sm"
            >
              <Mic className="w-4 h-4" />
              <span>BẮT ĐẦU: ĐỌC TỪ A (&ldquo;{selectedPair.wordA}&rdquo;)</span>
            </button>
          )}

          {drillStage === 'recording_a' && (
            <button
              type="button"
              onClick={() => finalizeTake('a')}
              className="vt-btn-3d w-full min-h-[48px] py-3 px-4 bg-[var(--vt-slate-900)] border-white/30 border-b-black text-white text-sm"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>ĐANG NGHE &ldquo;{selectedPair.wordA}&rdquo;... BẤM ĐỂ CHỐT</span>
            </button>
          )}

          {drillStage === 'ready_b' && (
            <button
              type="button"
              onClick={() => startRecordingFor('b')}
              className="vt-btn-3d vt-btn-primary w-full min-h-[48px] py-3 px-4 text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>TIẾP THEO: ĐỌC TỪ B (&ldquo;{selectedPair.wordB}&rdquo;)</span>
            </button>
          )}

          {drillStage === 'recording_b' && (
            <button
              type="button"
              onClick={() => finalizeTake('b')}
              className="vt-btn-3d w-full min-h-[48px] py-3 px-4 bg-[var(--vt-slate-900)] border-white/30 border-b-black text-white text-sm"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>ĐANG NGHE &ldquo;{selectedPair.wordB}&rdquo;... BẤM ĐỂ CHỐT</span>
            </button>
          )}

          {drillStage === 'done' && evalA && evalB && (
            <div className="space-y-3 animate-vt-pop">
              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-sm ${
                  separationGood
                    ? 'bg-[var(--vt-success)]/25 border-[var(--vt-success-300)]/60'
                    : 'bg-[var(--vt-orange)]/25 border-[var(--vt-amber-300)]/60'
                }`}
              >
                <CheckCircle2
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    separationGood ? 'text-[var(--vt-success-300)]' : 'text-[var(--vt-amber-300)]'
                  }`}
                />
                <div className="space-y-1">
                  <p className="font-black text-white">
                    {separationGood
                      ? `Tốt lắm! Bạn đã tách bạch rõ "${selectedPair.wordA}" và "${selectedPair.wordB}".`
                      : `Hai lượt đọc "${selectedPair.wordA}" và "${selectedPair.wordB}" còn hơi gần nhau về đường cao độ.`}
                  </p>
                  <p className="text-xs text-white/85 font-semibold">
                    {selectedPair.contrastHint}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDrill}
                className="vt-btn-3d vt-btn-secondary w-full min-h-[44px] py-2.5 px-4 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Luyện lại cặp này</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
