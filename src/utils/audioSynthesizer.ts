/**
 * Bộ phát âm mẫu 6 thanh điệu tiếng Việt:
 * 1. Ưu tiên phát trực tiếp các file ghi âm chuẩn (.ogg / .mp3 / .wav) từ thư mục /assets/tones/
 * 2. Tự động chuyển đổi mượt mà và ngắt âm cũ khi người dùng bấm liên tiếp
 * 3. Nếu trình duyệt chặn hoặc gặp lỗi mạng, dự phòng bằng Web Speech API + Web Audio Oscillator F0
 */

// Bộ đệm audio element cho 6 thanh điệu và từ vựng mở rộng
const toneAudioElements: Record<string, HTMLAudioElement> = {};
const wordAudioElements: Record<string, HTMLAudioElement> = {};
let currentPlayingAudio: HTMLAudioElement | null = null;
let practiceIntroAudio: HTMLAudioElement | null = null;
let welcomeScreenAudio: HTMLAudioElement | null = null;
let currentEncourageAudio: HTMLAudioElement | null = null;
let currentPraiseAudio: HTMLAudioElement | null = null;

const stoppedAudios = new WeakSet<HTMLAudioElement>();
let isRecordingActive = false;
let introEndedHandler: (() => void) | null = null;
let introNextToneTimer: number | null = null;
let introUserGestureHandler: (() => void) | null = null;

let sharedAudioCtx: AudioContext | null = null;
const activeOscillators = new Set<OscillatorNode>();
const activeBufferSources = new Set<AudioBufferSourceNode>();

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function setRecordingActive(active: boolean): void {
  isRecordingActive = active;
  if (active) {
    stopAnyVoiceAudio();
  }
}

function getToneAudioElement(toneId: string): HTMLAudioElement {
  if (toneAudioElements[toneId]) {
    return toneAudioElements[toneId];
  }

  const audio = new Audio();
  
  // Kiểm tra định dạng audio được trình duyệt hỗ trợ tốt nhất
  let preferredExt = 'mp3';
  if (audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')) {
    preferredExt = 'ogg';
  } else if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, '')) {
    preferredExt = 'mp3';
  } else if (audio.canPlayType && audio.canPlayType('audio/wav').replace(/no/, '')) {
    preferredExt = 'wav';
  }

  audio.src = `/assets/tones/tone-${toneId}.${preferredExt}`;
  audio.preload = 'auto';

  // Dự phòng nếu lỗi tải file chính thì thử các định dạng còn lại
  const fallbackUrls = [
    `/assets/tones/tone-${toneId}.ogg`,
    `/assets/tones/tone-${toneId}.mp3`,
    `/assets/tones/tone-${toneId}.wav`,
    `/viettone-home/assets/tone-${toneId}.ogg`,
    `/viettone-home/assets/tone-${toneId}.mp3`,
  ];
  let fallbackIndex = 0;

  audio.addEventListener('error', () => {
    if (stoppedAudios.has(audio) || currentPlayingAudio !== audio || isRecordingActive) {
      return;
    }
    while (fallbackIndex < fallbackUrls.length) {
      const nextUrl = fallbackUrls[fallbackIndex++];
      if (nextUrl !== audio.src) {
        audio.src = nextUrl;
        audio.load();
        if (!stoppedAudios.has(audio) && currentPlayingAudio === audio && !isRecordingActive) {
          audio.play().catch(() => {});
        }
        return;
      }
    }
  });

  toneAudioElements[toneId] = audio;
  return audio;
}

function fallbackSynthesizer(toneId: string) {
  if (isRecordingActive) return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    
    // Thử dùng Web Speech API tiếng Việt
    if ('speechSynthesis' in window) {
      const wordsMap: Record<string, string> = {
        ngang: 'ma',
        sac: 'má',
        huyen: 'mà',
        hoi: 'mả',
        nga: 'mã',
        nang: 'mạ',
      };
      const textToSpeak = wordsMap[toneId] || 'ma';
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.85;
      
      const viVoices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('vi'));
      if (viVoices.length > 0) {
        utterance.voice = viVoices[0];
      }
      window.speechSynthesis.speak(utterance);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    activeOscillators.add(osc);
    osc.onended = () => {
      activeOscillators.delete(osc);
      try {
        osc.disconnect();
      } catch {
        // Ignore
      }
    };

    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);

    switch (toneId) {
      case 'ngang':
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(330, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
        break;

      case 'sac':
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(490, now + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;

      case 'huyen':
        osc.frequency.setValueAtTime(310, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
        break;

      case 'hoi':
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
        break;

      case 'nga':
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);
        gain.gain.setValueAtTime(0.02, now + 0.28);
        gain.gain.setValueAtTime(0.18, now + 0.32);
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
        break;

      case 'nang':
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
        break;

      default:
        osc.frequency.setValueAtTime(330, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
  } catch (e) {
    console.warn('Audio synthesis fallback error:', e);
  }
}

export const ENCOURAGE_VOICE_MESSAGES = [
  'Bạn thử xem phần Mẹo luyện rồi đọc lại nhé! Bé Lạc tin bạn sẽ tiến bộ hơn đấy!',
  'Đừng vội nhé! Hãy nghe lại giọng mẫu, chú ý cách lên xuống của thanh điệu rồi thử lại cùng mình nào!',
  'Mình cùng xem biểu đồ cao độ F0 để tìm điểm khác biệt nhé! Sau đó thử phát âm thêm một lần nữa nào!',
] as const;

export const PRAISE_VOICE_MESSAGES = [
  'Tuyệt vời quá! Bạn phát âm chuẩn thanh điệu này rồi đó!',
  'Đúng rồi nè! Giọng bạn đọc nghe rất tự nhiên và chuẩn xác!',
  'Bé Lạc khen bạn! Bạn bắt nhịp thanh điệu cực kỳ chuẩn luôn!',
  'Xuất sắc lắm! Cứ giữ vững phong độ này nhé, bạn đang tiến bộ rất nhanh!',
  'Quá chuẩn luôn! Cùng Bé Lạc tiếp tục chinh phục các thanh tiếp theo nào!',
] as const;

let lastEncourageIndex = -1;
let lastPraiseIndex = -1;

export function stopAnyVoiceAudio() {
  if (introNextToneTimer !== null) {
    window.clearTimeout(introNextToneTimer);
    introNextToneTimer = null;
  }

  if (practiceIntroAudio && introEndedHandler) {
    practiceIntroAudio.removeEventListener('ended', introEndedHandler);
    introEndedHandler = null;
  }

  if (introUserGestureHandler && typeof window !== 'undefined') {
    window.removeEventListener('click', introUserGestureHandler);
    window.removeEventListener('touchstart', introUserGestureHandler);
    introUserGestureHandler = null;
  }

  if (currentPlayingAudio) {
    stoppedAudios.add(currentPlayingAudio);
    try {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    currentPlayingAudio = null;
  }
  if (practiceIntroAudio) {
    stoppedAudios.add(practiceIntroAudio);
    try {
      practiceIntroAudio.pause();
      practiceIntroAudio.currentTime = 0;
    } catch {
      // Ignore
    }
  }
  if (welcomeScreenAudio) {
    stoppedAudios.add(welcomeScreenAudio);
    try {
      welcomeScreenAudio.pause();
      welcomeScreenAudio.currentTime = 0;
    } catch {
      // Ignore
    }
  }
  if (currentEncourageAudio) {
    stoppedAudios.add(currentEncourageAudio);
    try {
      currentEncourageAudio.pause();
      currentEncourageAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    currentEncourageAudio = null;
  }
  if (currentPraiseAudio) {
    stoppedAudios.add(currentPraiseAudio);
    try {
      currentPraiseAudio.pause();
      currentPraiseAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    currentPraiseAudio = null;
  }

  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // Ignore
    }
    try {
      osc.disconnect();
    } catch {
      // Ignore
    }
  });
  activeOscillators.clear();

  activeBufferSources.forEach((src) => {
    try {
      src.stop();
    } catch {
      // Ignore
    }
    try {
      src.disconnect();
    } catch {
      // Ignore
    }
  });
  activeBufferSources.clear();

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

/**
 * Phát ngẫu nhiên 1 trong 5 file âm thanh MP3 cổ vũ người dùng khi đọc đúng âm
 */
export function playRandomPraiseAudio(onEnded?: () => void): number {
  if (!isSoundFxEnabled() || isRecordingActive) return -1;

  stopAnyVoiceAudio();

  // Chọn ngẫu nhiên 1 trong 5 file audio cổ vũ (tránh lặp lại câu vừa phát trước đó nếu có thể)
  const choices = [1, 2, 3, 4, 5];
  const candidates = choices.filter((c) => c !== lastPraiseIndex);
  const chosenIndex = candidates[Math.floor(Math.random() * candidates.length)] || choices[0];
  lastPraiseIndex = chosenIndex;

  const key = `praise-${chosenIndex}`;

  const audio = new Audio();
  let preferredExt = 'mp3';
  if (audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')) {
    preferredExt = 'ogg';
  } else if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, '')) {
    preferredExt = 'mp3';
  } else if (audio.canPlayType && audio.canPlayType('audio/wav').replace(/no/, '')) {
    preferredExt = 'wav';
  }

  audio.src = `/assets/tones/${key}.${preferredExt}`;
  audio.preload = 'auto';

  const fallbackUrls = [
    `/assets/tones/${key}.ogg`,
    `/assets/tones/${key}.mp3`,
    `/assets/tones/${key}.wav`,
    `/viettone-home/assets/${key}.mp3`,
  ];
  let fbIdx = 0;
  audio.addEventListener('error', () => {
    if (stoppedAudios.has(audio) || currentPraiseAudio !== audio || isRecordingActive) {
      return;
    }
    if (fbIdx < fallbackUrls.length) {
      audio.src = fallbackUrls[fbIdx++];
      audio.load();
      if (!stoppedAudios.has(audio) && currentPraiseAudio === audio && !isRecordingActive) {
        audio.play().catch(() => {});
      }
    }
  });

  if (onEnded) {
    const handleEnded = () => {
      audio.removeEventListener('ended', handleEnded);
      if (!stoppedAudios.has(audio)) {
        onEnded();
      }
    };
    audio.addEventListener('ended', handleEnded);
  }

  currentPraiseAudio = audio;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      if (err?.name === 'AbortError') return;
      if (currentPraiseAudio !== audio || stoppedAudios.has(audio) || isRecordingActive) return;
      if (err?.name !== 'NotAllowedError' && err?.name !== 'NotSupportedError') return;

      console.warn(`Autoplay ${key} bị hạn chế, dùng Web Speech API dự phòng:`, err);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(PRAISE_VOICE_MESSAGES[chosenIndex - 1]);
          utterance.lang = 'vi-VN';
          utterance.rate = 1.0;
          const viVoices = window.speechSynthesis.getVoices().filter((v) => v.lang.includes('vi'));
          if (viVoices.length > 0) utterance.voice = viVoices[0];
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore
        }
      }
    });
  }

  return chosenIndex;
}

export function playRandomEncourageAudio(onEnded?: () => void): number {
  if (!isSoundFxEnabled() || isRecordingActive) return -1;

  stopAnyVoiceAudio();

  // Chọn ngẫu nhiên 1 trong 3 file audio (tránh lặp lại câu vừa phát trước đó nếu có thể)
  const choices = [1, 2, 3];
  const candidates = choices.filter((c) => c !== lastEncourageIndex);
  const chosenIndex = candidates[Math.floor(Math.random() * candidates.length)] || choices[0];
  lastEncourageIndex = chosenIndex;

  const key = `encourage-${chosenIndex}`;

  const audio = new Audio();
  let preferredExt = 'mp3';
  if (audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')) {
    preferredExt = 'ogg';
  } else if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, '')) {
    preferredExt = 'mp3';
  } else if (audio.canPlayType && audio.canPlayType('audio/wav').replace(/no/, '')) {
    preferredExt = 'wav';
  }

  audio.src = `/assets/tones/${key}.${preferredExt}`;
  audio.preload = 'auto';

  const fallbackUrls = [
    `/assets/tones/${key}.ogg`,
    `/assets/tones/${key}.mp3`,
    `/assets/tones/${key}.wav`,
    `/viettone-home/assets/${key}.mp3`,
  ];
  let fbIdx = 0;
  audio.addEventListener('error', () => {
    if (stoppedAudios.has(audio) || currentEncourageAudio !== audio || isRecordingActive) {
      return;
    }
    if (fbIdx < fallbackUrls.length) {
      audio.src = fallbackUrls[fbIdx++];
      audio.load();
      if (!stoppedAudios.has(audio) && currentEncourageAudio === audio && !isRecordingActive) {
        audio.play().catch(() => {});
      }
    }
  });

  if (onEnded) {
    const handleEnded = () => {
      audio.removeEventListener('ended', handleEnded);
      if (!stoppedAudios.has(audio)) {
        onEnded();
      }
    };
    audio.addEventListener('ended', handleEnded);
  }

  currentEncourageAudio = audio;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      if (err?.name === 'AbortError') return;
      if (currentEncourageAudio !== audio || stoppedAudios.has(audio) || isRecordingActive) return;
      if (err?.name !== 'NotAllowedError' && err?.name !== 'NotSupportedError') return;

      console.warn(`Autoplay ${key} bị hạn chế, dùng Web Speech API dự phòng:`, err);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(ENCOURAGE_VOICE_MESSAGES[chosenIndex - 1]);
          utterance.lang = 'vi-VN';
          utterance.rate = 1.0;
          const viVoices = window.speechSynthesis.getVoices().filter((v) => v.lang.includes('vi'));
          if (viVoices.length > 0) utterance.voice = viVoices[0];
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore
        }
      }
    });
  }

  return chosenIndex;
}

export function playPracticeWelcomeAudio(
  toneId: string,
  onEnded?: () => void,
  word?: string,
  regionId: 'bac' | 'trung' | 'nam' = 'bac'
) {
  if (!isSoundFxEnabled() || isRecordingActive) return;

  stopAnyVoiceAudio();

  // Tạo hoặc tái sử dụng intro audio
  if (!practiceIntroAudio) {
    const audio = new Audio();
    let preferredExt = 'mp3';
    if (audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')) {
      preferredExt = 'ogg';
    } else if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, '')) {
      preferredExt = 'mp3';
    } else if (audio.canPlayType && audio.canPlayType('audio/wav').replace(/no/, '')) {
      preferredExt = 'wav';
    }
    audio.src = `/assets/tones/practice-intro.${preferredExt}`;
    audio.preload = 'auto';

    // Dự phòng đường dẫn phụ nếu cần
    const fallbackUrls = [
      `/assets/tones/practice-intro.ogg`,
      `/assets/tones/practice-intro.mp3`,
      `/assets/tones/practice-intro.wav`,
      `/viettone-home/assets/practice-intro.mp3`,
    ];
    let fbIdx = 0;
    audio.addEventListener('error', () => {
      if (stoppedAudios.has(audio) || practiceIntroAudio !== audio || isRecordingActive) {
        return;
      }
      if (fbIdx < fallbackUrls.length) {
        audio.src = fallbackUrls[fbIdx++];
        audio.load();
        if (!stoppedAudios.has(audio) && practiceIntroAudio === audio && !isRecordingActive) {
          audio.play().catch(() => {});
        }
      }
    });

    practiceIntroAudio = audio;
  }

  const audio = practiceIntroAudio;
  stoppedAudios.delete(audio);
  audio.currentTime = 0;

  if (introEndedHandler) {
    audio.removeEventListener('ended', introEndedHandler);
    introEndedHandler = null;
  }

  introEndedHandler = () => {
    if (introEndedHandler) {
      audio.removeEventListener('ended', introEndedHandler);
      introEndedHandler = null;
    }
    if (stoppedAudios.has(audio) || isRecordingActive) return;
    introNextToneTimer = window.setTimeout(() => {
      introNextToneTimer = null;
      if (isRecordingActive) return;
      if (word) {
        playWordAudio(word, toneId, regionId, 1);
      } else {
        playToneAudio(toneId);
      }
      if (onEnded) onEnded();
    }, 120);
  };

  audio.addEventListener('ended', introEndedHandler);

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      if (err?.name === 'AbortError' || stoppedAudios.has(audio) || isRecordingActive) return;
      console.warn('Autoplay practice-intro bị chặn hoặc lỗi, gắn listener chạm để phát:', err);
      // Nếu browser chặn autoplay thì khi người dùng chạm màn hình lần đầu sẽ tự phát
      if (introUserGestureHandler) {
        window.removeEventListener('click', introUserGestureHandler);
        window.removeEventListener('touchstart', introUserGestureHandler);
        introUserGestureHandler = null;
      }
      introUserGestureHandler = () => {
        if (introUserGestureHandler) {
          window.removeEventListener('click', introUserGestureHandler);
          window.removeEventListener('touchstart', introUserGestureHandler);
          introUserGestureHandler = null;
        }
        if (isRecordingActive || stoppedAudios.has(audio)) return;
        stoppedAudios.delete(audio);
        audio.play().catch(() => {});
      };
      window.addEventListener('click', introUserGestureHandler, { once: true });
      window.addEventListener('touchstart', introUserGestureHandler, { once: true });
    });
  }
}

export function playWelcomeScreenAudio() {
  if (!isSoundFxEnabled() || isRecordingActive) return;

  stopAnyVoiceAudio();

  if (!welcomeScreenAudio) {
    const audio = new Audio('/viettone-home/assets/welcome.mp3');
    audio.preload = 'auto';
    const fallbackUrls = ['/viettone-home/assets/welcome.ogg', '/viettone-home/assets/welcome.wav'];
    let fbIdx = 0;
    audio.addEventListener('error', () => {
      if (stoppedAudios.has(audio) || welcomeScreenAudio !== audio || isRecordingActive) {
        return;
      }
      if (fbIdx < fallbackUrls.length) {
        audio.src = fallbackUrls[fbIdx++];
        audio.load();
        if (!stoppedAudios.has(audio) && welcomeScreenAudio === audio && !isRecordingActive) {
          audio.play().catch(() => {});
        }
      }
    });
    welcomeScreenAudio = audio;
  }

  const audio = welcomeScreenAudio;
  stoppedAudios.delete(audio);
  audio.currentTime = 0;
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      if (err?.name === 'AbortError' || stoppedAudios.has(audio)) return;
      console.warn('Không thể phát welcome.mp3:', err);
    });
  }
}

export function playToneAudio(toneId: string, rate = 1) {
  if (isRecordingActive) return;

  // Dừng file âm thanh đang phát trước đó nếu có
  stopAnyVoiceAudio();

  try {
    const audio = getToneAudioElement(toneId);
    stoppedAudios.delete(audio);
    currentPlayingAudio = audio;
    audio.currentTime = 0;
    const clampedRate = Math.max(0.6, Math.min(1.25, rate));
    audio.playbackRate = clampedRate;
    if ('preservesPitch' in audio) {
      (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err?.name === 'AbortError') return;
        if (currentPlayingAudio !== audio || stoppedAudios.has(audio) || isRecordingActive) return;
        if (err?.name !== 'NotAllowedError' && err?.name !== 'NotSupportedError') return;

        console.warn(`File audio tone-${toneId} không thể phát tự động, chuyển sang bộ tổng hợp dự phòng:`, err);
        fallbackSynthesizer(toneId);
      });
    }
  } catch (err) {
    if (isRecordingActive) return;
    console.warn('Không thể khởi tạo audio element, dùng fallback:', err);
    fallbackSynthesizer(toneId);
  }
}

const MA_WORD_BY_TONE: Record<string, string> = {
  ngang: 'ma',
  sac: 'má',
  huyen: 'mà',
  hoi: 'mả',
  nga: 'mã',
  nang: 'mạ',
};

const WORD_AUDIO_ID_MAP: Record<string, string> = {
  ba: 'ba_ngang',
  'bá': 'ba_sac',
  'bà': 'ba_huyen',
  'bả': 'ba_hoi',
  'bã': 'ba_nga',
  'bạ': 'ba_nang',
  la: 'la_ngang',
  'lá': 'la_sac',
  'là': 'la_huyen',
  'lả': 'la_hoi',
  'lã': 'la_nga',
  'lạ': 'la_nang',
  ca: 'ca_ngang',
  'cá': 'ca_sac',
  'cà': 'ca_huyen',
  'cả': 'ca_hoi',
  'cã': 'ca_nga',
  'cạ': 'ca_nang',
  'cà phê': 'comp_caphe',
  'bánh mì': 'comp_banhmi',
  'cô giáo': 'comp_cogiao',
  'câu hỏi': 'comp_tuhai',
  'xã hội': 'comp_xango',
  'học sinh': 'comp_hocsinh',
};

function getWordAudioElement(wordAudioId: string): HTMLAudioElement {
  if (wordAudioElements[wordAudioId]) {
    return wordAudioElements[wordAudioId];
  }

  const audio = new Audio(`/assets/tones/words/${wordAudioId}.mp3`);
  audio.preload = 'auto';
  wordAudioElements[wordAudioId] = audio;
  return audio;
}

function playFallbackWordTone(
  word: string,
  toneId: string,
  regionId: 'bac' | 'trung' | 'nam',
  rate: number
): void {
  if (isRecordingActive) return;

  let spokeViaViSpeech = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const viVoices = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.toLowerCase().includes('vi'));

      // Chỉ phát qua Web Speech API nếu trình duyệt có sẵn giọng tiếng Việt thật (tránh đọc sai thanh bằng giọng tiếng Anh)
      if (viVoices.length > 0) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'vi-VN';
        utterance.voice = viVoices[0];
        utterance.rate = Math.max(0.6, Math.min(1.15, rate * 0.92));
        utterance.pitch = regionId === 'trung' ? 0.9 : regionId === 'nam' ? 1.05 : 1.0;
        window.speechSynthesis.speak(utterance);
        spokeViaViSpeech = true;
      }
    } catch {
      spokeViaViSpeech = false;
    }
  }

  if (spokeViaViSpeech) return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const durScale = 1 / Math.max(0.65, rate);
    const baseFreq = regionId === 'trung' ? 280 : regionId === 'nam' ? 335 : 315;

    activeOscillators.add(osc);
    osc.onended = () => {
      activeOscillators.delete(osc);
      try {
        osc.disconnect();
      } catch {
        // Ignore
      }
    };

    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.04);

    if (toneId === 'sac') {
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.48, now + 0.55 * durScale);
    } else if (toneId === 'huyen') {
      osc.frequency.setValueAtTime(baseFreq * 0.95, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, now + 0.6 * durScale);
    } else if (toneId === 'hoi') {
      osc.frequency.setValueAtTime(baseFreq * 0.92, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, now + 0.3 * durScale);
      osc.frequency.exponentialRampToValueAtTime(
        regionId === 'nam' ? baseFreq * 1.1 : baseFreq * 0.95,
        now + 0.65 * durScale
      );
    } else if (toneId === 'nga') {
      if (regionId === 'nam') {
        osc.frequency.setValueAtTime(baseFreq * 0.92, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.28 * durScale);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.62 * durScale);
      } else {
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.25 * durScale);
        gain.gain.setValueAtTime(0.02, now + 0.28 * durScale);
        gain.gain.setValueAtTime(0.16, now + 0.32 * durScale);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.62 * durScale);
      }
    } else if (toneId === 'nang') {
      osc.frequency.setValueAtTime(baseFreq * 0.9, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.56, now + 0.32 * durScale);
    } else {
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq, now + 0.6 * durScale);
    }

    const stopTime = now + (toneId === 'nang' ? 0.36 : 0.66) * durScale;
    gain.gain.exponentialRampToValueAtTime(0.001, stopTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(stopTime);
  } catch {
    // Ignore oscillator errors
  }
}

/**
 * Phát âm mẫu cho từ bất kỳ (ưu tiên phát trực tiếp file giọng đọc tiếng Việt chuẩn cho từng từ)
 */
export function playWordAudio(
  word: string,
  toneId: string,
  regionId: 'bac' | 'trung' | 'nam' = 'bac',
  rate = 1
): void {
  if (isRecordingActive) return;

  const trimmed = word.trim().toLowerCase();
  const isStandardMa = trimmed === MA_WORD_BY_TONE[toneId];

  if (isStandardMa) {
    playToneAudio(toneId, rate);
    return;
  }

  const wordAudioId = WORD_AUDIO_ID_MAP[trimmed];
  if (wordAudioId) {
    stopAnyVoiceAudio();
    try {
      const audio = getWordAudioElement(wordAudioId);
      stoppedAudios.delete(audio);
      currentPlayingAudio = audio;
      audio.currentTime = 0;
      const clampedRate = Math.max(0.6, Math.min(1.25, rate));
      audio.playbackRate = clampedRate;
      if ('preservesPitch' in audio) {
        (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err?.name === 'AbortError') return;
          if (currentPlayingAudio !== audio || stoppedAudios.has(audio) || isRecordingActive) return;
          playFallbackWordTone(word, toneId, regionId, rate);
        });
      }
      return;
    } catch {
      playFallbackWordTone(word, toneId, regionId, rate);
      return;
    }
  }

  stopAnyVoiceAudio();
  playFallbackWordTone(word, toneId, regionId, rate);
}

/**
 * Phát lại trực tiếp mẫu âm thanh Float32Array đã ghi trong Phòng thu dữ liệu
 */
export function playStudioBuffer(pcmData: Float32Array, sampleRate: number): void {
  if (pcmData.length === 0) return;
  stopAnyVoiceAudio();

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const audioBuffer = ctx.createBuffer(1, pcmData.length, sampleRate);
    audioBuffer.copyToChannel(pcmData, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    activeBufferSources.add(source);
    source.onended = () => {
      activeBufferSources.delete(source);
      try {
        source.disconnect();
      } catch {
        // Ignore
      }
    };
    source.start(0);
  } catch (err) {
    console.warn('Không thể phát lại mẫu âm thanh đã ghi:', err);
  }
}

const SOUND_FX_KEY = 'viettone_sound_fx_enabled';

export function isSoundFxEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_FX_KEY);
    return val !== 'false'; // Mặc định bật
  } catch {
    return true;
  }
}

export function setSoundFxEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_FX_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore error
  }
}

/**
 * Phát âm thanh chúc mừng / khích lệ du dương bằng Web Audio API
 * Sử dụng chuỗi thang âm ngũ cung ấm áp, không cần bất kỳ file âm thanh nào từ bên ngoài
 */
export function playCelebrationChime(type: 'success' | 'milestone' | 'encourage' = 'success'): number {
  if (!isSoundFxEnabled() || isRecordingActive) return 0;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return 0;
    const now = ctx.currentTime;

    // Chuỗi nốt ngũ cung (C5, D5, E5, G5, A5) mang âm sắc Việt trong trẻo
    const notes =
      type === 'milestone'
        ? [523.25, 659.25, 783.99, 1046.5] // C5 - E5 - G5 - C6 (rực rỡ)
        : type === 'success'
        ? [523.25, 659.25, 783.99] // C5 - E5 - G5 (vui tươi)
        : [587.33, 659.25]; // D5 - E5 (nhẹ nhàng, ấm áp)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      activeOscillators.add(osc);
      osc.onended = () => {
        activeOscillators.delete(osc);
        try {
          osc.disconnect();
        } catch {
          // Ignore
        }
      };

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.46);
    });

    return Math.round(((notes.length - 1) * 0.1 + 0.46) * 1000);
  } catch (e) {
    console.warn('Could not play celebration sound:', e);
    return 0;
  }
}
