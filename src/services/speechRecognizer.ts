/**
 * VietTone AI - Speech Commands & Teachable Machine Audio Engine
 * Xử lý mô hình Teachable Machine qua thư viện @tensorflow-models/speech-commands
 * và hỗ trợ bộ phân tích âm vực thời gian thực trên trình duyệt.
 */

import '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';
import { PRED_CONFIG, TONE_CLASSES } from '../config';
import { VadPreprocessor, VadProcessResult } from './vadPreprocessor';
import { normalizeTeachableMachineUrl } from './modelStorage';

/**
 * Ánh xạ nhãn trả về từ Teachable Machine sang 7 class chuẩn tiếng Việt
 * Hỗ trợ cả 2 bộ nhãn phổ biến trong Teachable Machine:
 * 1) 'ma', 'má', 'mà', 'mả', 'mã', 'mạ', 'Background Noise' (như model URL cDF6WszFL)
 * 2) 'Thanh ngang', 'Thanh sắc', 'Thanh huyền', 'Thanh hỏi', 'Thanh ngã', 'Thanh nặng', 'Background Noise'
 */
export function mapModelLabelToTone(label: string): string {
  const norm = label.trim().toLowerCase();

  if (
    norm.includes('noise') ||
    norm.includes('background') ||
    norm === '_background_noise_'
  ) {
    return 'Background Noise';
  }

  if (
    norm === 'ma' ||
    norm === 'thanh ngang' ||
    norm.includes('ngang') ||
    norm === 'khong dau' ||
    norm === 'không dấu'
  ) {
    return 'Thanh ngang';
  }

  if (
    norm === 'má' ||
    norm === 'thanh sắc' ||
    norm === 'thanh sac' ||
    norm.includes('sắc') ||
    norm.includes('sac')
  ) {
    return 'Thanh sắc';
  }

  if (
    norm === 'mà' ||
    norm === 'thanh huyền' ||
    norm === 'thanh huyen' ||
    norm.includes('huyền') ||
    norm.includes('huyen')
  ) {
    return 'Thanh huyền';
  }

  if (
    norm === 'mả' ||
    norm === 'thanh hỏi' ||
    norm === 'thanh hoi' ||
    norm.includes('hỏi') ||
    norm.includes('hoi')
  ) {
    return 'Thanh hỏi';
  }

  if (
    norm === 'mã' ||
    norm === 'thanh ngã' ||
    norm === 'thanh nga' ||
    norm.includes('ngã') ||
    norm.includes('nga')
  ) {
    return 'Thanh ngã';
  }

  if (
    norm === 'mạ' ||
    norm === 'thanh nặng' ||
    norm === 'thanh nang' ||
    norm.includes('nặng') ||
    norm.includes('nang')
  ) {
    return 'Thanh nặng';
  }

  return label;
}

export type RecognizerStatus =
  | 'unloaded'
  | 'loading'
  | 'ready'
  | 'listening'
  | 'error'
  | 'permission_denied'
  | 'fallback_active';

export interface RecognitionCallbackPayload {
  rawScores: Record<string, number>;
  normalizedToneScores: Record<string, number>;
  topTone: string | null;
  topToneScore: number;
  isBackgroundNoise: boolean;
  audioVolume: number;
}

export class VietToneSpeechEngine {
  private recognizer: speechCommands.SpeechCommandRecognizer | null = null;
  private isListeningState: boolean = false;
  private currentModelUrl: string = '';
  private labels: string[] = [];
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private recordedChunks: Float32Array[] = [];
  private lastRecordedAudio: { buffer: Float32Array; sampleRate: number } | null = null;
  private lastVadResult: VadProcessResult | null = null;
  private fallbackInterval: number | null = null;
  private isFallbackMode: boolean = false;
  private sessionToken: number = 0;
  private stoppingPromise: Promise<void> | null = null;

  // Lịch sử điểm số để ổn định dự đoán qua cửa sổ ~1 giây
  private predictionBuffer: {
    timestamp: number;
    scores: Record<string, number>;
    isNoise: boolean;
    volume: number;
  }[] = [];

  constructor() {}

  public getLastRecordedAudio(): { buffer: Float32Array; sampleRate: number } | null {
    return this.lastRecordedAudio;
  }

  public getLastVadResult(): VadProcessResult | null {
    return this.lastVadResult;
  }

  public getLabels(): string[] {
    if (this.labels.length > 0) return this.labels;
    return [...TONE_CLASSES];
  }

  public getIsListening(): boolean {
    return this.isListeningState;
  }

  public getIsFallbackMode(): boolean {
    return this.isFallbackMode;
  }

  public getCurrentModelUrl(): string {
    return this.currentModelUrl;
  }

  /**
   * Tải mô hình Teachable Machine từ URL
   */
  public async loadModel(modelUrl: string): Promise<{
    success: boolean;
    isFallback: boolean;
    loadedFromUrl: boolean;
    normalizedUrl: string;
    wordLabels?: string[];
    error?: string;
  }> {
    const normalized = normalizeTeachableMachineUrl(modelUrl);
    if (!normalized) {
      const errorMsg = 'Đường link Teachable Machine không hợp lệ. Vui lòng nhập URL bắt đầu bằng https://';
      if (!this.recognizer) {
        this.isFallbackMode = true;
        this.labels = [...TONE_CLASSES];
        return {
          success: true,
          isFallback: true,
          loadedFromUrl: false,
          normalizedUrl: modelUrl.trim(),
          error: errorMsg,
        };
      }
      return {
        success: false,
        isFallback: this.isFallbackMode,
        loadedFromUrl: false,
        normalizedUrl: modelUrl.trim(),
        error: errorMsg,
      };
    }

    const checkpointURL = normalized + 'model.json';
    const metadataURL = normalized + 'metadata.json';

    try {
      console.log('[VietTone AI] Đang nạp mô hình Teachable Machine từ URL:', normalized);

      // Kiểm tra và lấy metadata.json bằng GET để xác nhận kết nối và CORS
      const testFetch = await fetch(metadataURL);
      if (!testFetch.ok) {
        throw new Error(`Không thể tải metadata.json (Mã lỗi HTTP ${testFetch.status})`);
      }
      const metadata = await testFetch.json();
      if (!metadata || !Array.isArray(metadata.wordLabels) || metadata.wordLabels.length === 0) {
        throw new Error('File metadata.json không chứa danh sách nhãn giọng đọc (wordLabels).');
      }
      console.log('[VietTone AI] Đã tải metadata.json:', metadata);

      const candidateRecognizer = speechCommands.create(
        'BROWSER_FFT',
        undefined,
        checkpointURL,
        metadataURL
      );

      await candidateRecognizer.ensureModelLoaded();
      const loadedLabels = candidateRecognizer.wordLabels();

      // Chỉ khi nạp thành công hoàn toàn mới dừng phiên nghe cũ và thay thế recognizer hiện tại
      await this.stopListening();
      this.recognizer = candidateRecognizer;
      this.currentModelUrl = normalized;
      this.labels = loadedLabels;
      this.isFallbackMode = false;

      console.log('[VietTone AI] Đã tải hoàn tất mô hình Teachable Machine! Word labels:', this.labels);

      return {
        success: true,
        isFallback: false,
        loadedFromUrl: true,
        normalizedUrl: normalized,
        wordLabels: loadedLabels,
      };
    } catch (err: unknown) {
      console.warn('[VietTone AI] Lỗi khi tải mô hình Teachable Machine:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến URL mô hình Teachable Machine';

      if (!this.recognizer) {
        // Khi khởi động ban đầu không có mạng/URL lỗi -> chuyển sang chế độ phân tích F0 dự phòng
        this.currentModelUrl = normalized;
        this.isFallbackMode = true;
        this.labels = [...TONE_CLASSES];
        return {
          success: true,
          isFallback: true,
          loadedFromUrl: false,
          normalizedUrl: normalized,
          error: errorMessage,
        };
      }

      // Nếu đã có model đang chạy ổn định trước đó -> giữ nguyên model đang chạy và báo lỗi link mới
      return {
        success: false,
        isFallback: this.isFallbackMode,
        loadedFromUrl: false,
        normalizedUrl: normalized,
        error: errorMessage,
      };
    }
  }

  /**
   * Bắt đầu lắng nghe microphone và suy luận âm thanh
   */
  public async startListening(
    onFrameUpdate: (payload: RecognitionCallbackPayload) => void,
    onError: (errorType: 'permission_denied' | 'engine_error', message: string) => void
  ): Promise<boolean> {
    if (this.isListeningState) {
      return true;
    }

    this.lastRecordedAudio = null;
    this.lastVadResult = null;
    this.recordedChunks = [];
    this.predictionBuffer = [];

    if (this.stoppingPromise) {
      await this.stoppingPromise;
    }

    if (this.isListeningState) {
      return true;
    }

    this.lastRecordedAudio = null;
    this.lastVadResult = null;
    this.recordedChunks = [];
    this.predictionBuffer = [];

    const myToken = ++this.sessionToken;

    // Kiểm tra và xin quyền microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
    } catch (permErr: unknown) {
      console.error('Không có quyền truy cập microphone:', permErr);
      onError('permission_denied', 'Bạn đã từ chối hoặc trình duyệt chặn quyền truy cập Microphone.');
      return false;
    }

    if (myToken !== this.sessionToken) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    this.mediaStream = stream;

    // Thiết lập Web Audio Analyser để đo volume và bộ ghi nhận buffer âm thanh cho F0
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (myToken !== this.sessionToken) {
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
        stream.getTracks().forEach((track) => track.stop());
        if (this.mediaStream === stream) {
          this.mediaStream = null;
        }
        return false;
      }

      this.audioContext = ctx;
      const source = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);

      // Thu thập mẫu PCM Float32Array liên tục để phân tích F0 sau khi kết thúc lượt nói
      this.scriptProcessor = ctx.createScriptProcessor(2048, 1, 1);
      const muteGain = ctx.createGain();
      muteGain.gain.setValueAtTime(0, ctx.currentTime);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isListeningState || myToken !== this.sessionToken) return;
        const channelData = e.inputBuffer.getChannelData(0);
        this.recordedChunks.push(new Float32Array(channelData));
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(muteGain);
      muteGain.connect(ctx.destination);
    } catch (audioCtxErr) {
      console.warn('Không thể khởi tạo Web Audio Analyser/ScriptProcessor:', audioCtxErr);
    }

    if (myToken !== this.sessionToken) {
      return false;
    }

    this.isListeningState = true;

    // Trường hợp 1: Có mô hình Teachable Machine thực tế
    if (this.recognizer && !this.isFallbackMode) {
      try {
        await this.recognizer.listen(
          async (result) => {
            if (!this.isListeningState || myToken !== this.sessionToken) return;

            const scores = result.scores as Float32Array | number[];
            const rawScores: Record<string, number> = {};
            const labels = this.recognizer?.wordLabels() || this.labels;

            for (let i = 0; i < labels.length; i++) {
              rawScores[labels[i]] = scores[i] !== undefined ? scores[i] : 0;
            }

            const volume = this.getAudioVolume();
            this.processPredictionFrame(rawScores, volume, onFrameUpdate);
          },
          {
            includeSpectrogram: false,
            probabilityThreshold: 0.1,
            invokeCallbackOnNoiseAndUnknown: true,
            overlapFactor: 0.5,
          }
        );
        return true;
      } catch (listenErr: unknown) {
        console.warn('Lỗi khi kích hoạt recognizer.listen, chuyển sang chế độ phân tích âm vực:', listenErr);
        this.isFallbackMode = true;
      }
    }

    if (myToken !== this.sessionToken || !this.isListeningState) {
      return false;
    }

    // Trường hợp 2: Chế độ phân tích âm vực cao độ trực tiếp (khi chưa có URL Teachable Machine hoàn chỉnh)
    this.startFallbackAnalysis(onFrameUpdate, myToken);
    return true;
  }

  /**
   * Tính toán âm lượng hiện tại từ AnalyserNode
   */
  private getAudioVolume(): number {
    if (!this.analyser) return 0;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    return Math.min(1, rms * 4); // Khuếch đại nhẹ để thể hiện độ nhạy
  }

  /**
   * Phân tích cao độ F0 (Fundamental Frequency) bằng giải thuật Autocorrelation
   */
  private detectPitch(analyser: AnalyserNode, sampleRate: number): { pitch: number; clarity: number } {
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    // Tính năng lượng RMS
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    if (rms < 0.015) {
      return { pitch: -1, clarity: 0 };
    }

    // Autocorrelation
    const maxShift = Math.floor(sampleRate / 80); // Min pitch 80Hz (giọng nam trầm)
    const minShift = Math.floor(sampleRate / 600); // Max pitch 600Hz (giọng nữ/trẻ em cao)
    let bestCorrelation = 0;
    let bestShift = -1;

    for (let shift = minShift; shift <= maxShift; shift++) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - shift; i++) {
        correlation += buffer[i] * buffer[i + shift];
      }
      correlation = correlation / (buffer.length - shift);

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestShift = shift;
      }
    }

    const clarity = bestCorrelation / (sumSquares / buffer.length);
    if (bestShift > 0 && clarity > 0.4) {
      const pitch = sampleRate / bestShift;
      return { pitch, clarity };
    }

    return { pitch: -1, clarity: 0 };
  }

  /**
   * Xử lý một khung dự đoán âm thanh và chuẩn hoá xác suất của 6 thanh điệu
   */
  private processPredictionFrame(
    rawScores: Record<string, number>,
    volume: number,
    onFrameUpdate: (payload: RecognitionCallbackPayload) => void
  ) {
    // 1. Ánh xạ mọi nhãn (dù là 'ma', 'má' hay 'Thanh ngang', 'Thanh sắc') về 7 class chuẩn
    const mappedScores: Record<string, number> = {
      'Background Noise': 0,
      'Thanh ngang': 0,
      'Thanh sắc': 0,
      'Thanh huyền': 0,
      'Thanh hỏi': 0,
      'Thanh ngã': 0,
      'Thanh nặng': 0,
    };

    for (const [rawLabel, score] of Object.entries(rawScores)) {
      const standardName = mapModelLabelToTone(rawLabel);
      if (standardName in mappedScores) {
        mappedScores[standardName] = Math.max(mappedScores[standardName], score);
      } else {
        mappedScores[standardName] = score;
      }
    }

    const bgNoiseScore = mappedScores['Background Noise'] ?? 0;
    // Khung được coi là nhiễu nền hoặc khoảng lặng nếu năng lượng nhỏ hơn ngưỡng hoặc điểm noise cao
    const isBackgroundNoise = bgNoiseScore > 0.65 || volume < PRED_CONFIG.AUDIO_VOLUME_THRESHOLD;

    // Lọc ra 6 thanh điệu (loại bỏ Background Noise)
    const toneKeys = [
      'Thanh ngang',
      'Thanh sắc',
      'Thanh huyền',
      'Thanh hỏi',
      'Thanh ngã',
      'Thanh nặng',
    ];

    let totalToneScore = 0;
    const toneScoresMap: Record<string, number> = {};

    for (const key of toneKeys) {
      const score = Math.max(0.0001, mappedScores[key] ?? 0);
      toneScoresMap[key] = score;
      totalToneScore += score;
    }

    // Chuẩn hoá tỉ lệ phần trăm của 6 thanh về tổng 1 (100%)
    const normalizedScores: Record<string, number> = {};
    let topTone: string | null = null;
    let topToneScore = 0;

    for (const key of toneKeys) {
      const normalized = totalToneScore > 0 ? toneScoresMap[key] / totalToneScore : 0.166;
      normalizedScores[key] = normalized;

      if (normalized > topToneScore) {
        topToneScore = normalized;
        topTone = key;
      }
    }

    // Lưu vào buffer trượt để làm mượt dự đoán
    const now = Date.now();
    this.predictionBuffer.push({
      timestamp: now,
      scores: normalizedScores,
      isNoise: isBackgroundNoise,
      volume,
    });

    // Chỉ giữ các mẫu trong khoảng PRED_CONFIG.BUFFER_TIME_MS (~1.1 giây)
    this.predictionBuffer = this.predictionBuffer.filter(
      (item) => now - item.timestamp <= PRED_CONFIG.BUFFER_TIME_MS
    );

    onFrameUpdate({
      rawScores: mappedScores,
      normalizedToneScores: normalizedScores,
      topTone: isBackgroundNoise ? null : topTone,
      topToneScore,
      isBackgroundNoise,
      audioVolume: volume,
    });
  }

  /**
   * Chế độ phân tích âm vực thời gian thực (Realtime Pitch & Contour Engine)
   * Sử dụng khi Teachable Machine URL chưa được nạp hoặc đang trong quá trình huấn luyện
   */
  private startFallbackAnalysis(
    onFrameUpdate: (payload: RecognitionCallbackPayload) => void,
    token: number
  ) {
    const pitchHistory: number[] = [];
    const sampleRate = this.audioContext?.sampleRate || 44100;

    this.fallbackInterval = window.setInterval(() => {
      if (!this.isListeningState || !this.analyser || token !== this.sessionToken) return;

      const volume = this.getAudioVolume();
      const { pitch, clarity } = this.detectPitch(this.analyser, sampleRate);

      if (pitch > 80 && pitch < 600 && clarity > 0.4 && volume > 0.03) {
        pitchHistory.push(pitch);
        if (pitchHistory.length > 15) pitchHistory.shift();
      }

      // Xây dựng xác suất dựa trên đặc trưng cao độ đường cong tiếng Việt
      const scores: Record<string, number> = {
        'Background Noise': volume < 0.03 ? 0.95 : 0.05,
        'Thanh ngang': 0.1,
        'Thanh sắc': 0.1,
        'Thanh huyền': 0.1,
        'Thanh hỏi': 0.1,
        'Thanh ngã': 0.1,
        'Thanh nặng': 0.1,
      };

      if (pitchHistory.length >= 4 && volume >= 0.03) {
        const startPitch = pitchHistory.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const endPitch = pitchHistory.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const minPitch = Math.min(...pitchHistory);
        const maxPitch = Math.max(...pitchHistory);
        const pitchDelta = endPitch - startPitch;
        const pitchRange = maxPitch - minPitch;

        if (pitchDelta > 28) {
          // Đi lên rõ -> Thanh sắc hoặc Thanh ngã
          if (pitchRange > 65) {
            scores['Thanh ngã'] = 0.65;
            scores['Thanh sắc'] = 0.25;
          } else {
            scores['Thanh sắc'] = 0.72;
            scores['Thanh ngã'] = 0.18;
          }
        } else if (pitchDelta < -25) {
          // Đi xuống -> Thanh huyền hoặc Thanh nặng
          if (pitchHistory.length <= 6 || volume < 0.08) {
            scores['Thanh nặng'] = 0.75;
            scores['Thanh huyền'] = 0.18;
          } else {
            scores['Thanh huyền'] = 0.70;
            scores['Thanh nặng'] = 0.20;
          }
        } else if (minPitch < startPitch - 15 && endPitch > minPitch + 10) {
          // Đi xuống rồi ngoắc lên -> Thanh hỏi
          scores['Thanh hỏi'] = 0.78;
          scores['Thanh huyền'] = 0.12;
        } else {
          // Bằng phẳng, ít biến thiên -> Thanh ngang
          scores['Thanh ngang'] = 0.78;
          scores['Thanh huyền'] = 0.12;
        }
      }

      this.processPredictionFrame(scores, volume, onFrameUpdate);
    }, 180);
  }

  /**
   * Tính toán kết quả ổn định từ bộ đệm dự đoán (~1 giây)
   * Sử dụng trung bình xác suất và majority voting
   */
  public getStabilizedResult(): {
    isStable: boolean;
    winnerTone: string | null;
    confidence: number;
    averageScores: Record<string, number>;
    reason?: string;
  } {
    // Ưu tiên các khung có giọng nói thực tế (không phải nhiễu nền hoặc khoảng lặng)
    let candidateFrames = this.predictionBuffer.filter((item) => !item.isNoise);

    const toneKeys = [
      'Thanh ngang',
      'Thanh sắc',
      'Thanh huyền',
      'Thanh hỏi',
      'Thanh ngã',
      'Thanh nặng',
    ];

    const averageScores: Record<string, number> = {};
    for (const key of toneKeys) averageScores[key] = 0;

    // Nếu không có khung nào vượt ngưỡng thông thường, tìm các khung có âm lượng cao nhất trong buffer
    if (candidateFrames.length === 0 && this.predictionBuffer.length > 0) {
      const sortedByVol = [...this.predictionBuffer].sort((a, b) => b.volume - a.volume);
      if (sortedByVol[0].volume > 0.015) {
        candidateFrames = [sortedByVol[0]];
      }
    }

    if (candidateFrames.length === 0) {
      return {
        isStable: false,
        winnerTone: null,
        confidence: 0,
        averageScores,
        reason: 'Chưa phát hiện giọng nói rõ ràng qua micro.',
      };
    }

    // 1. Tính trung bình có trọng số theo âm lượng của từng khung
    let totalWeight = 0;
    for (const frame of candidateFrames) {
      const weight = Math.max(0.2, frame.volume * 5);
      totalWeight += weight;
      for (const key of toneKeys) {
        averageScores[key] += (frame.scores[key] || 0) * weight;
      }
    }

    for (const key of toneKeys) {
      averageScores[key] = totalWeight > 0 ? averageScores[key] / totalWeight : 0.166;
    }

    // 2. Tìm thanh có xác suất trung bình cao nhất
    let winnerTone: string | null = null;
    let maxAvgScore = 0;

    for (const key of toneKeys) {
      if (averageScores[key] > maxAvgScore) {
        maxAvgScore = averageScores[key];
        winnerTone = key;
      }
    }

    // 3. Majority Voting: Đếm số lượng frame mà winner đứng đầu
    let winnerFrameCount = 0;
    for (const frame of candidateFrames) {
      let topInFrame = '';
      let topScoreInFrame = 0;
      for (const key of toneKeys) {
        if ((frame.scores[key] || 0) > topScoreInFrame) {
          topScoreInFrame = frame.scores[key] || 0;
          topInFrame = key;
        }
      }
      if (topInFrame === winnerTone) {
        winnerFrameCount++;
      }
    }

    const majorityRatio = candidateFrames.length > 0 ? winnerFrameCount / candidateFrames.length : 0;
    const isConfident = maxAvgScore >= PRED_CONFIG.MIN_CONFIDENCE_THRESHOLD;
    const isStable = isConfident && (candidateFrames.length === 1 || majorityRatio >= 0.50);

    return {
      isStable,
      winnerTone,
      confidence: maxAvgScore,
      averageScores,
      reason: !isConfident
        ? 'Độ tự tin chưa đủ cao'
        : !isStable
        ? 'Dự đoán chưa ổn định qua các cửa sổ âm'
        : undefined,
    };
  }

  /**
   * Dừng lắng nghe microphone và giải phóng tài nguyên
   */
  public async stopListening(): Promise<void> {
    if (this.stoppingPromise) {
      return this.stoppingPromise;
    }

    const doStop = async () => {
      this.isListeningState = false;
      this.sessionToken += 1;

      // Chụp toàn bộ tài nguyên vào biến cục bộ trước mọi lệnh await
      const fallbackInterval = this.fallbackInterval;
      const chunks = this.recordedChunks;
      const audioContext = this.audioContext;
      const scriptProcessor = this.scriptProcessor;
      const mediaStream = this.mediaStream;
      const analyser = this.analyser;
      const recognizer = this.recognizer;

      // Reset các field trên instance NGAY LẬP TỨC
      this.fallbackInterval = null;
      this.recordedChunks = [];
      this.audioContext = null;
      this.scriptProcessor = null;
      this.mediaStream = null;
      this.analyser = null;

      if (fallbackInterval !== null) {
        clearInterval(fallbackInterval);
      }

      if (scriptProcessor) {
        scriptProcessor.onaudioprocess = null;
        try {
          scriptProcessor.disconnect();
        } catch (e) {
          console.warn('Lỗi ngắt kết nối scriptProcessor:', e);
        }
      }

      if (analyser) {
        try {
          analyser.disconnect();
        } catch {
          // Ignore
        }
      }

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }

      if (recognizer && recognizer.isListening()) {
        try {
          await recognizer.stopListening();
        } catch (stopErr) {
          console.warn('Lỗi khi gọi recognizer.stopListening:', stopErr);
        }
      }

      // Gộp tất cả các chunks Float32Array thu được trong lượt phát âm vừa qua
      if (chunks.length > 0 && audioContext) {
        const sampleRate = audioContext.sampleRate;
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        if (totalLength >= 512) {
          const merged = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }

          // Áp dụng VAD: Cắt bỏ khoảng lặng ở 2 đầu và chuẩn hóa biên độ
          const vadResult = VadPreprocessor.processAudio(merged, sampleRate);
          this.lastVadResult = vadResult;

          // Chỉ lưu bản thu khi thực sự có tín hiệu âm thanh (không lưu im lặng tuyệt đối)
          if (vadResult.speechDetected || vadResult.peakAmplitude >= 0.008) {
            this.lastRecordedAudio = {
              buffer: vadResult.speechDetected ? vadResult.trimmedBuffer : merged,
              sampleRate,
            };
          } else {
            this.lastRecordedAudio = null;
          }
        }
      }

      if (audioContext && audioContext.state !== 'closed') {
        try {
          await audioContext.close();
        } catch (closeErr) {
          console.warn('Lỗi khi đóng AudioContext:', closeErr);
        }
      }
    };

    this.stoppingPromise = doStop().finally(() => {
      this.stoppingPromise = null;
    });

    return this.stoppingPromise;
  }

  /**
   * Huỷ hoàn toàn engine
   */
  public async destroy(): Promise<void> {
    await this.stopListening();
    this.recognizer = null;
    this.predictionBuffer = [];
  }
}

// Singleton instance dùng chung trong ứng dụng để tránh tạo nhiều recognizer
export const speechEngineInstance = new VietToneSpeechEngine();
