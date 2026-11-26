/**
 * VietTone AI - Immersive Learning Experience (Hala Rabbit inspired structure with Bé Lạc centerpiece)
 * Luyện nghe và phát âm 6 thanh điệu tiếng Việt cùng Người bạn đồng hành Bé Lạc
 * 
 * Bố cục Immersive:
 * 1. Minimal Header: Logo, Streak, 5 Popups (Phân tích, Lộ trình, Tiến bộ, Thành tích, Cài đặt), Sound FX
 * 2. Centerpiece Bé Lạc: Bé Lạc ở trung tâm, hiệu ứng sóng âm khi đang nghe, thanh mục tiêu và nút nghe mẫu
 * 3. Khung hội thoại Bé Lạc: Nút Microphone nổi bật, sóng âm âm lượng thực, KẾT QUẢ AI TRỰC TIẾP KHÔNG CẦN POPUP
 * 4. Sáu thẻ thanh điệu: Dưới cùng màn hình (6 cột Desktop, 3x2 Mobile), thứ tự ma, má, mà, mả, mã, mạ
 * 5. Các công cụ phân tích, lộ trình, tiến độ, thành tích và cài đặt được đưa gọn vào popup / modal độc lập
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VIETNAMESE_TONES } from './data/tones';
import {
  ALL_PRACTICE_WORDS,
  findPracticeWordById,
  getToneDefaultWordItem,
} from './data/vocabulary';
import {
  ToneItem,
  ToneId,
  F0ContourData,
  ReferenceToneSample,
  F0ScoreResult,
  FeedbackAssessment,
  PracticeAttempt,
  ToneRoadmapStat,
  StreakInfo,
  MilestoneBadge,
  MotivationMessage,
  RegionId,
  LearningModeTab,
  PracticeWordItem,
} from './types';
import { speechEngineInstance, RecognitionCallbackPayload } from './services/speechRecognizer';
import { PitchEstimator } from './services/pitchEstimator';
import { ReferenceAudioService } from './services/referenceAudioService';
import { F0ScoringService } from './services/f0Scoring';
import { FeedbackAdvisor } from './services/feedbackAdvisor';
import { ProgressStorage } from './services/progressStorage';
import { MotivationEngine } from './services/motivationEngine';
import { HybridToneEngine } from './services/hybridToneEngine';
import { RegionStorage } from './services/regionStorage';
import {
  isSoundFxEnabled,
  setSoundFxEnabled,
  playCelebrationChime,
  playPracticeWelcomeAudio,
  playRandomEncourageAudio,
  playRandomPraiseAudio,
  stopAnyVoiceAudio,
  setRecordingActive,
  ENCOURAGE_VOICE_MESSAGES,
  PRAISE_VOICE_MESSAGES,
} from './utils/audioSynthesizer';

// Screen Flow & Immersive Modal Components
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { LearningPathHome } from './components/path/LearningPathHome';
import { PracticeScreen } from './components/practice/PracticeScreen';
import { AnalysisModal } from './components/immersive/AnalysisModal';
import { RoadmapModal } from './components/immersive/RoadmapModal';
import { ProgressModal } from './components/immersive/ProgressModal';
import { AchievementsModal } from './components/immersive/AchievementsModal';
import { SettingsModal } from './components/immersive/SettingsModal';

// Existing System Modals & Landing
import { ModelSettingsModal, ModelSwitchResult } from './components/ModelSettingsModal';
import { PitchGuideInfo } from './components/PitchGuideInfo';
import { TeacherReferenceModal } from './components/TeacherReferenceModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { VietToneHomeEmbedded } from './components/VietToneHomeEmbedded';
import { ModelStorage, isDefaultModelUrl, normalizeTeachableMachineUrl } from './services/modelStorage';
import { getInitialRoute, navigateTo, getQueryParam, AppRoute } from './utils/router';

const DAILY_GOAL_STORAGE_KEY = 'vt_daily_goal';
const WELCOME_SEEN_SESSION_KEY = 'vt_welcome_seen';

const readStoredDailyGoal = (): number => {
  try {
    const raw = localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return 10;
};

export default function App() {
  // Client-side router state ('/', '/welcome', '/app', '/app/practice')
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => getInitialRoute());
  const [dailyGoal, setDailyGoal] = useState<number>(() => readStoredDailyGoal());

  const handleSelectDailyGoal = useCallback((goal: number) => {
    const validGoal = Number.isFinite(goal) && goal > 0 ? goal : 10;
    setDailyGoal(validGoal);
    try {
      localStorage.setItem(DAILY_GOAL_STORAGE_KEY, String(validGoal));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const stopActiveSessionMedia = useCallback(() => {
    if (voiceTimerRef.current !== null) {
      clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (listeningTimerRef.current !== null) {
      clearTimeout(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }
    sessionIdRef.current += 1;
    setRecordingActive(false);
    stopAnyVoiceAudio();
    if (speechEngineInstance.getIsListening()) {
      speechEngineInstance.stopListening();
      setIsListening(false);
    }
    setIsIntroActive(false);
    setEncourageVoiceText(null);
    setPraiseVoiceText(null);
    setNoSpeechDetected(false);
  }, []);

  const handleNavigate = (route: AppRoute, toneId?: string, wordItem?: PracticeWordItem) => {
    stopActiveSessionMedia();
    if (route !== '/app/practice') {
      practiceIntroPlayedRef.current = false;
    }
    const queryParams: Record<string, string> = {};
    if (toneId) queryParams.tone = toneId;
    if (wordItem) queryParams.word = wordItem.id;
    navigateTo(route, Object.keys(queryParams).length > 0 ? queryParams : undefined);
    setCurrentRoute(route);
    if (route === '/app') {
      refreshStorageData();
    }
    if (wordItem) {
      setActivePracticeWord(wordItem);
      const found = VIETNAMESE_TONES.find((t) => t.id === wordItem.toneId);
      if (found) {
        setSelectedTone(found);
        setUserContour(null);
        setF0ScoreResult(null);
        setFeedbackAssessment(null);
        setNoSpeechDetected(false);
        setMotivationMessage(MotivationEngine.getReadyMessage(found, streakInfo));
      }
    } else if (toneId) {
      const found = VIETNAMESE_TONES.find((t) => t.id === toneId.toLowerCase());
      if (found) {
        setSelectedTone(found);
        setActivePracticeWord(getToneDefaultWordItem(found.id));
        setUserContour(null);
        setF0ScoreResult(null);
        setFeedbackAssessment(null);
        setNoSpeechDetected(false);
        setMotivationMessage(MotivationEngine.getReadyMessage(found, streakInfo));
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // State 5 Popup chính của Immersive Redesign
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);
  const [isProgressOpen, setIsProgressOpen] = useState<boolean>(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // State các Modal phụ trợ hệ thống
  const [isModelUrlModalOpen, setIsModelUrlModalOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);

  // State Vùng miền & Chế độ luyện tập (Version 3.0)
  const [activeRegion, setActiveRegion] = useState<RegionId>(() => RegionStorage.getActiveRegion());
  const [activeModeTab, setActiveModeTab] = useState<LearningModeTab>('path');

  // State quản lý mô hình Teachable Machine (lưu link tùy chỉnh nhưng luôn giữ nguyên model gốc)
  const [modelUrl, setModelUrl] = useState<string>(() => ModelStorage.getActiveModelUrl());
  const [loadedWordLabels, setLoadedWordLabels] = useState<string[]>([]);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);
  const [modelErrorMessage, setModelErrorMessage] = useState<string>('');

  // State chọn thanh và từ luyện tập (hỗ trợ đọc query param ?tone= và ?word=)
  const [selectedTone, setSelectedTone] = useState<ToneItem>(() => {
    const wordParam = getQueryParam('word');
    if (wordParam) {
      const w = findPracticeWordById(wordParam);
      if (w) {
        const foundTone = VIETNAMESE_TONES.find((t) => t.id === w.toneId);
        if (foundTone) return foundTone;
      }
    }
    const toneParam = getQueryParam('tone');
    if (toneParam) {
      const found = VIETNAMESE_TONES.find((t) => t.id === toneParam.toLowerCase());
      if (found) return found;
    }
    return VIETNAMESE_TONES[4]; // Mặc định: mã (thanh ngã)
  });

  const [activePracticeWord, setActivePracticeWord] = useState<PracticeWordItem | null>(() => {
    const wordParam = getQueryParam('word');
    if (wordParam) {
      const w = findPracticeWordById(wordParam);
      if (w) return w;
    }
    const toneParam = getQueryParam('tone');
    if (toneParam) {
      const found = VIETNAMESE_TONES.find((t) => t.id === toneParam.toLowerCase());
      if (found) return getToneDefaultWordItem(found.id);
    }
    return getToneDefaultWordItem(VIETNAMESE_TONES[4].id);
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isIntroActive, setIsIntroActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0);

  // State xác suất thời gian thực
  const [currentProbabilities, setCurrentProbabilities] = useState<Record<string, number>>({
    'Thanh ngang': 0.16,
    'Thanh sắc': 0.17,
    'Thanh huyền': 0.16,
    'Thanh hỏi': 0.17,
    'Thanh ngã': 0.17,
    'Thanh nặng': 0.17,
  });
  const [topToneName, setTopToneName] = useState<string | null>(null);
  const [topToneScore, setTopToneScore] = useState<number>(0);

  // State kết quả F0 & Phản hồi của lượt đọc
  const [userContour, setUserContour] = useState<F0ContourData | null>(null);
  const [refSample, setRefSample] = useState<ReferenceToneSample | null>(null);
  const [f0ScoreResult, setF0ScoreResult] = useState<F0ScoreResult | null>(null);
  const [feedbackAssessment, setFeedbackAssessment] = useState<FeedbackAssessment | null>(null);
  const [isInlineAnalysisOpen, setIsInlineAnalysisOpen] = useState<boolean>(true);
  const [noSpeechDetected, setNoSpeechDetected] = useState<boolean>(false);
  const [encourageVoiceText, setEncourageVoiceText] = useState<string | null>(null);
  const [praiseVoiceText, setPraiseVoiceText] = useState<string | null>(null);

  // Tiến trình và lịch sử lưu trữ cục bộ (100% localStorage)
  const [historyAttempts, setHistoryAttempts] = useState<PracticeAttempt[]>([]);
  const [roadmapStats, setRoadmapStats] = useState<ToneRoadmapStat[]>([]);
  const [recent7Days, setRecent7Days] = useState<
    Array<{ dateStr: string; displayDate: string; attemptsCount: number; avgScore: number | null }>
  >([]);
  const [streakInfo, setStreakInfo] = useState<StreakInfo>({
    currentStreak: 0,
    isActiveToday: false,
    lastActiveDate: null,
    totalDaysActive: 0,
  });
  const [milestoneBadges, setMilestoneBadges] = useState<MilestoneBadge[]>([]);

  // Motivation Engine & Gamification States
  const [soundFxEnabled, setSoundFxEnabledState] = useState<boolean>(isSoundFxEnabled());
  const [motivationMessage, setMotivationMessage] = useState<MotivationMessage>(() =>
    MotivationEngine.getReadyMessage(VIETNAMESE_TONES[4], {
      currentStreak: 0,
      isActiveToday: false,
      lastActiveDate: null,
      totalDaysActive: 0,
    })
  );
  const [isConfettiActive, setIsConfettiActive] = useState<boolean>(false);

  const listeningTimerRef = useRef<number | null>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<number>(0);
  const isFinalizingRef = useRef<boolean>(false);
  const speechDetectedRef = useRef<boolean>(false);
  const practiceIntroPlayedRef = useRef<boolean>(false);
  const analysisPanelRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledAssessmentRef = useRef<FeedbackAssessment | null>(null);

  useEffect(() => {
    if (
      feedbackAssessment !== null &&
      !isListening &&
      !isAnalyzing &&
      lastScrolledAssessmentRef.current !== feedbackAssessment
    ) {
      lastScrolledAssessmentRef.current = feedbackAssessment;
      const timer = window.setTimeout(() => {
        analysisPanelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);
      return () => window.clearTimeout(timer);
    }
    if (feedbackAssessment === null) {
      lastScrolledAssessmentRef.current = null;
    }
  }, [feedbackAssessment, isListening, isAnalyzing]);

  const handleToggleInlineAnalysis = useCallback(() => {
    setIsInlineAnalysisOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => {
          analysisPanelRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 100);
      }
      return next;
    });
  }, []);

  const handleOpenAndScrollAnalysis = useCallback(() => {
    setIsInlineAnalysisOpen(true);
    window.setTimeout(() => {
      analysisPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, []);

  // Tự động phát âm thanh chào mừng chỉ khi ở màn hình luyện tập (/app/practice)
  useEffect(() => {
    if (currentRoute === '/app/practice') {
      if (!practiceIntroPlayedRef.current) {
        practiceIntroPlayedRef.current = true;
        setIsIntroActive(true);
        const timer = window.setTimeout(() => {
          playPracticeWelcomeAudio(
            selectedTone.id,
            undefined,
            activePracticeWord?.word || selectedTone.word,
            activeRegion
          );
        }, 350);
        return () => window.clearTimeout(timer);
      }
    } else {
      // Khi rời /app/practice, reset cờ và dừng mọi âm thanh đang phát
      practiceIntroPlayedRef.current = false;
      setIsIntroActive(false);
      if (voiceTimerRef.current !== null) {
        clearTimeout(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      setRecordingActive(false);
      stopAnyVoiceAudio();
    }
  }, [currentRoute, selectedTone.id, selectedTone.word, activePracticeWord, activeRegion]);

  // Tải dữ liệu lưu trữ từ localStorage
  const refreshStorageData = useCallback(() => {
    const attempts = ProgressStorage.getAllAttempts();
    const stats = ProgressStorage.getToneStats();
    const days = ProgressStorage.getRecent7DaysProgress();
    const streak = ProgressStorage.getStreakInfo();
    const badges = ProgressStorage.getMilestoneBadges();

    setHistoryAttempts(attempts);
    setRoadmapStats(stats);
    setRecent7Days(days);
    setStreakInfo(streak);
    setMilestoneBadges(badges);
  }, []);

  // Cập nhật mẫu tham chiếu khi đổi thanh hoặc vùng miền
  const updateCurrentRefSample = useCallback(
    (toneId: ToneId, regionId: RegionId = activeRegion) => {
      const sample = ReferenceAudioService.getReferenceSample(toneId, regionId);
      setRefSample(sample);
    },
    [activeRegion]
  );

  useEffect(() => {
    updateCurrentRefSample(selectedTone.id, activeRegion);
  }, [selectedTone.id, activeRegion, updateCurrentRefSample]);

  // 1. Tải mô hình khi khởi động hoặc chuyển đổi mô hình
  const initModel = useCallback(async (urlToLoad: string): Promise<ModelSwitchResult> => {
    setIsModelReady(false);
    setModelErrorMessage('');
    const result = await speechEngineInstance.loadModel(urlToLoad);
    setIsModelReady(true);
    setIsFallbackMode(result.isFallback);
    if (result.wordLabels) {
      setLoadedWordLabels(result.wordLabels);
    } else if (result.isFallback) {
      setLoadedWordLabels([]);
    }
    if (result.error) {
      setModelErrorMessage(result.error);
    }
    return {
      success: result.success,
      loadedFromUrl: result.loadedFromUrl,
      isFallback: result.isFallback,
      normalizedUrl: result.normalizedUrl,
      wordLabels: result.wordLabels,
      error: result.error,
    };
  }, []);

  const handleSwitchModelUrl = useCallback(
    async (newUrl: string): Promise<ModelSwitchResult> => {
      stopActiveSessionMedia();
      const result = await initModel(newUrl);
      if (result.loadedFromUrl) {
        const persistedUrl = ModelStorage.setActiveModelUrl(result.normalizedUrl);
        RegionStorage.setRegionModelUrl(activeRegion, persistedUrl);
        setModelUrl(persistedUrl);
        if (!isDefaultModelUrl(persistedUrl)) {
          ModelStorage.saveCustomModel({
            url: persistedUrl,
            wordLabels: result.wordLabels,
            updatedAt: Date.now(),
          });
        }
      }
      return result;
    },
    [initModel, stopActiveSessionMedia, activeRegion]
  );

  const handleSelectRegion = useCallback(
    async (regionId: RegionId) => {
      stopActiveSessionMedia();
      RegionStorage.setActiveRegion(regionId);
      setActiveRegion(regionId);
      updateCurrentRefSample(selectedTone.id, regionId);

      const regionModelUrl = RegionStorage.getRegionModelUrl(regionId);
      const currentNormalized = normalizeTeachableMachineUrl(modelUrl);
      if (regionModelUrl !== currentNormalized) {
        const res = await initModel(regionModelUrl);
        if (res.loadedFromUrl) {
          const persisted = ModelStorage.setActiveModelUrl(res.normalizedUrl);
          setModelUrl(persisted);
        }
      }
    },
    [stopActiveSessionMedia, updateCurrentRefSample, selectedTone.id, modelUrl, initModel]
  );

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = getInitialRoute();
      stopActiveSessionMedia();
      if (nextRoute !== '/app/practice') {
        practiceIntroPlayedRef.current = false;
      }
      setCurrentRoute(nextRoute);
      if (nextRoute === '/app') {
        refreshStorageData();
      }
      const wordParam = getQueryParam('word');
      if (wordParam) {
        const foundWord = findPracticeWordById(wordParam);
        if (foundWord) {
          setActivePracticeWord(foundWord);
          const foundTone = VIETNAMESE_TONES.find((t) => t.id === foundWord.toneId);
          if (foundTone) {
            setSelectedTone(foundTone);
          }
          setUserContour(null);
          setF0ScoreResult(null);
          setFeedbackAssessment(null);
          return;
        }
      }
      const toneParam = getQueryParam('tone');
      if (toneParam) {
        const found = VIETNAMESE_TONES.find((t) => t.id === toneParam.toLowerCase());
        if (found) {
          setSelectedTone(found);
          setActivePracticeWord(getToneDefaultWordItem(found.id));
          setUserContour(null);
          setF0ScoreResult(null);
          setFeedbackAssessment(null);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [refreshStorageData, stopActiveSessionMedia]);

  useEffect(() => {
    const initialUrl = ModelStorage.getActiveModelUrl();
    initModel(initialUrl);
    refreshStorageData();

    return () => {
      speechEngineInstance.destroy();
      if (listeningTimerRef.current) {
        clearTimeout(listeningTimerRef.current);
      }
      if (voiceTimerRef.current !== null) {
        clearTimeout(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      setRecordingActive(false);
      stopAnyVoiceAudio();
    };
  }, [initModel, refreshStorageData]);

  // Cập nhật thông điệp sẵn sàng khi streak hoặc selectedTone thay đổi (nếu chưa có lượt đọc gần đây)
  useEffect(() => {
    if (!feedbackAssessment) {
      setMotivationMessage(MotivationEngine.getReadyMessage(selectedTone, streakInfo));
    }
  }, [selectedTone, streakInfo, feedbackAssessment]);

  // 2. Xử lý khung dữ liệu nhận diện liên tục từ speech-commands
  const handleFrameUpdate = useCallback((payload: RecognitionCallbackPayload) => {
    setAudioVolume(payload.audioVolume);

    if (payload.isBackgroundNoise) {
      return;
    }

    speechDetectedRef.current = true;
    setCurrentProbabilities(payload.normalizedToneScores);

    if (payload.topTone) {
      setTopToneName(payload.topTone);
      setTopToneScore(payload.topToneScore);
    }
  }, []);

  // 3. Kết thúc một đợt đọc và tổng hợp F0 + Điểm số + Phản hồi + Motivation Engine
  const finalizeRecognition = useCallback(async () => {
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    const mySession = sessionIdRef.current;

    setIsListening(false);
    setIsAnalyzing(true);
    setAudioVolume(0);

    if (listeningTimerRef.current) {
      clearTimeout(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }

    try {
      await speechEngineInstance.stopListening();
      setRecordingActive(false);

      if (mySession !== sessionIdRef.current) {
        return;
      }

      // A. Lấy buffer âm thanh thực tế và kết quả VAD của lượt đọc
      const recordedAudio = speechEngineInstance.getLastRecordedAudio();
      const vadResult = speechEngineInstance.getLastVadResult();
      const stabilized = speechEngineInstance.getStabilizedResult();

      if (!recordedAudio || recordedAudio.buffer.length === 0) {
        setUserContour(null);
        setF0ScoreResult(null);
        setFeedbackAssessment(null);
        setTopToneName(null);
        setTopToneScore(0);
        setEncourageVoiceText(null);
        setPraiseVoiceText(null);
        setNoSpeechDetected(true);
        return;
      }

      const contour = PitchEstimator.extractF0Contour(
        recordedAudio.buffer,
        recordedAudio.sampleRate
      );

      // Nếu không phát hiện tiếng nói thực tế (im lặng / chỉ có tiếng ồn nền rất nhỏ) -> không phân tích và không lưu lượt đọc
      const hasValidSpeech =
        contour.isReliable ||
        (Boolean(vadResult?.speechDetected) && contour.voicedFramesCount >= 3) ||
        (Boolean(vadResult?.speechDetected) &&
          (vadResult?.speechDurationMs ?? 0) >= 220 &&
          speechDetectedRef.current &&
          stabilized.isStable);

      if (!hasValidSpeech) {
        setUserContour(null);
        setF0ScoreResult(null);
        setFeedbackAssessment(null);
        setTopToneName(null);
        setTopToneScore(0);
        setEncourageVoiceText(null);
        setPraiseVoiceText(null);
        setNoSpeechDetected(true);
        return;
      }

      setNoSpeechDetected(false);
      setUserContour(contour);

      const evaluationMode = activePracticeWord?.evaluationMode || 'hybrid';
      const targetWordLabel = activePracticeWord?.word || selectedTone.word;

      // B & C. MÔ HÌNH LAI hoặc F0 CHUẨN (đối với từ mở rộng ngoài "ma")
      const hybridRes = HybridToneEngine.evaluateHybrid(
        stabilized.averageScores,
        contour,
        evaluationMode
      );

      setCurrentProbabilities(hybridRes.combinedScores);
      setTopToneName(hybridRes.topTone);
      setTopToneScore(hybridRes.topScore);

      // D. Lấy mẫu tham chiếu chuẩn thật theo vùng miền
      const currentRef = ReferenceAudioService.getReferenceSample(selectedTone.id, activeRegion);
      setRefSample(currentRef);

      // E. Tính điểm tương đồng F0 (0–100)
      const f0ScoreRes = F0ScoringService.calculateF0Similarity(contour, currentRef);
      setF0ScoreResult(f0ScoreRes);

      // F. Phản hồi sư phạm chỉ rõ lỗi có thể cải thiện kết hợp giải thích mô hình lai
      const assessment = FeedbackAdvisor.generateAssessment({
        targetTone: selectedTone,
        targetWordLabel,
        evaluationMode,
        predictedToneName: hybridRes.topTone,
        probabilities: hybridRes.combinedScores,
        userContour: contour,
        refSample: currentRef,
        f0ScoreResult: f0ScoreRes,
        hybridExplanation: hybridRes.explanation,
        agreementStatus: hybridRes.agreementStatus,
      });
      setFeedbackAssessment(assessment);

      // G. Lưu lượt luyện vào localStorage
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const isMatch =
        hybridRes.topTone?.trim().toLowerCase() === selectedTone.name.trim().toLowerCase();

      let audioQuality: PracticeAttempt['audioQuality'] = 'good';
      if (!contour.isReliable) {
        audioQuality = 'unreliable_pitch';
      }

      const attempt: PracticeAttempt = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        dateStr,
        targetToneId: selectedTone.id,
        targetToneName: selectedTone.name,
        targetWord: targetWordLabel,
        predictedToneName: hybridRes.topTone,
        confidence: hybridRes.topScore,
        top2Margin: assessment.top2Margin,
        isAiConfident: hybridRes.isAiConfident,
        isMatch,
        hasReliableF0: contour.isReliable,
        f0Score: f0ScoreRes.score,
        meanPitchHz: contour.meanPitchHz || undefined,
        audioQuality,
        adviceSummary: assessment.headline,
        engineMode: evaluationMode === 'f0_contour' ? 'fallback' : 'hybrid',
        hybridAgreement: hybridRes.agreementStatus,
      };

      ProgressStorage.saveAttempt(attempt);

      // H. Motivation Engine: Đánh giá và chọn thông điệp động viên
      const allUpdatedAttempts = ProgressStorage.getAllAttempts();
      const updatedStreak = ProgressStorage.getStreakInfo();
      const motMessage = MotivationEngine.evaluateAttempt(attempt, allUpdatedAttempts, updatedStreak);
      setMotivationMessage(motMessage);

      // Kích hoạt hiệu ứng ăn mừng hoặc giọng động viên của Bé Lạc
      if (isMatch) {
        setEncourageVoiceText(null);
        let chimeDurationMs = 0;
        if (motMessage.celebrate) {
          setIsConfettiActive(true);
          if (motMessage.state === 'ten_attempts' || motMessage.state === 'three_day_streak') {
            chimeDurationMs = playCelebrationChime('milestone');
          } else {
            chimeDurationMs = playCelebrationChime('success');
          }
        } else {
          chimeDurationMs = playCelebrationChime('success');
        }

        // Phát ngẫu nhiên 1 trong 5 file âm thanh MP3 cổ vũ người dùng khi đọc đúng
        if (voiceTimerRef.current !== null) {
          clearTimeout(voiceTimerRef.current);
        }
        voiceTimerRef.current = window.setTimeout(() => {
          voiceTimerRef.current = null;
          if (mySession !== sessionIdRef.current) return;
          const chosenPraiseIdx = playRandomPraiseAudio();
          if (chosenPraiseIdx > 0 && chosenPraiseIdx <= PRAISE_VOICE_MESSAGES.length) {
            setPraiseVoiceText(PRAISE_VOICE_MESSAGES[chosenPraiseIdx - 1]);
          }
        }, chimeDurationMs + 150);
      } else {
        setPraiseVoiceText(null);
        // Người dùng chưa nói đúng (isMatch = false)
        const chimeDurationMs = playCelebrationChime('encourage');
        if (voiceTimerRef.current !== null) {
          clearTimeout(voiceTimerRef.current);
        }
        voiceTimerRef.current = window.setTimeout(() => {
          voiceTimerRef.current = null;
          if (mySession !== sessionIdRef.current) return;
          const chosenIdx = playRandomEncourageAudio();
          if (chosenIdx > 0 && chosenIdx <= ENCOURAGE_VOICE_MESSAGES.length) {
            setEncourageVoiceText(ENCOURAGE_VOICE_MESSAGES[chosenIdx - 1]);
          }
        }, chimeDurationMs + 150);
      }

      refreshStorageData();
    } finally {
      isFinalizingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [selectedTone, activePracticeWord, activeRegion, refreshStorageData]);

  // 4. Bắt đầu lắng nghe
  const handleStartListening = async () => {
    if (isAnalyzing || isFinalizingRef.current) return;

    if (voiceTimerRef.current !== null) {
      clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    sessionIdRef.current += 1;
    const mySession = sessionIdRef.current;
    setRecordingActive(true);
    stopAnyVoiceAudio();
    setEncourageVoiceText(null);
    setPraiseVoiceText(null);
    setIsIntroActive(false);
    setPermissionError(null);
    setNoSpeechDetected(false);
    setIsInlineAnalysisOpen(true);
    setUserContour(null);
    setF0ScoreResult(null);
    setFeedbackAssessment(null);
    setTopToneName(null);
    setTopToneScore(0);
    setCurrentProbabilities({
      'Thanh ngang': 0.16,
      'Thanh sắc': 0.17,
      'Thanh huyền': 0.16,
      'Thanh hỏi': 0.17,
      'Thanh ngã': 0.17,
      'Thanh nặng': 0.17,
    });
    setIsConfettiActive(false);
    speechDetectedRef.current = false;

    const started = await speechEngineInstance.startListening(
      handleFrameUpdate,
      (errType, message) => {
        if (mySession !== sessionIdRef.current) return;
        setRecordingActive(false);
        setIsListening(false);
        setIsAnalyzing(false);
        if (errType === 'permission_denied') {
          setPermissionError(message);
        } else {
          setModelErrorMessage(message);
        }
      }
    );

    if (mySession !== sessionIdRef.current) {
      return;
    }

    if (started) {
      setIsListening(true);
      listeningTimerRef.current = window.setTimeout(() => {
        finalizeRecognition();
      }, 1900);
    } else {
      setRecordingActive(false);
    }
  };

  const handleStopListening = () => {
    finalizeRecognition();
  };

  const handleNextTone = () => {
    if (voiceTimerRef.current !== null) {
      clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    sessionIdRef.current += 1;
    stopAnyVoiceAudio();
    setEncourageVoiceText(null);
    setPraiseVoiceText(null);
    setNoSpeechDetected(false);

    let nextWord: PracticeWordItem | null = null;
    if (activePracticeWord && activePracticeWord.stageId !== 'stage1_ma') {
      const sameStageList = ALL_PRACTICE_WORDS.filter(
        (w) =>
          w.stageId === activePracticeWord.stageId &&
          (!activePracticeWord.syllableFamily ||
            w.syllableFamily === activePracticeWord.syllableFamily)
      );
      const curIdx = sameStageList.findIndex((w) => w.id === activePracticeWord.id);
      if (curIdx !== -1 && sameStageList.length > 0) {
        nextWord = sameStageList[(curIdx + 1) % sameStageList.length];
      }
    }

    const nextTone = nextWord
      ? VIETNAMESE_TONES.find((t) => t.id === nextWord!.toneId) || VIETNAMESE_TONES[0]
      : VIETNAMESE_TONES[
          (VIETNAMESE_TONES.findIndex((t) => t.id === selectedTone.id) + 1) %
            VIETNAMESE_TONES.length
        ];

    const resolvedWord = nextWord || getToneDefaultWordItem(nextTone.id);
    setSelectedTone(nextTone);
    setActivePracticeWord(resolvedWord);
    setUserContour(null);
    setF0ScoreResult(null);
    setFeedbackAssessment(null);
    setMotivationMessage(MotivationEngine.getReadyMessage(nextTone, streakInfo));
    if (currentRoute === '/app/practice') {
      try {
        window.history.replaceState(
          {
            route: '/app/practice',
            queryParams: { tone: nextTone.id, word: resolvedWord.id },
          },
          '',
          `/app/practice?tone=${nextTone.id}&word=${resolvedWord.id}`
        );
      } catch {
        // Ignore history errors
      }
    }
  };

  const handleSelectToneById = (toneId: ToneId) => {
    if (isListening) return;
    setIsRoadmapOpen(false);
    setIsProgressOpen(false);
    handleNavigate('/app/practice', toneId);
  };

  const handleExitPractice = () => {
    stopActiveSessionMedia();
    practiceIntroPlayedRef.current = false;
    refreshStorageData();
    handleNavigate('/app');
  };

  const handleCelebrateChest = () => {
    setIsConfettiActive(true);
    playCelebrationChime('milestone');
  };

  const handleClearHistory = () => {
    ProgressStorage.clearHistory();
    refreshStorageData();
    setMotivationMessage(
      MotivationEngine.getReadyMessage(selectedTone, {
        currentStreak: 0,
        isActiveToday: false,
        lastActiveDate: null,
        totalDaysActive: 0,
      })
    );
  };

  const handleToggleSoundFx = () => {
    const next = !soundFxEnabled;
    setSoundFxEnabled(next);
    setSoundFxEnabledState(next);
  };

  const handleOpenFromLanding = (toneId?: string) => {
    let welcomeSeen = false;
    try {
      welcomeSeen = sessionStorage.getItem(WELCOME_SEEN_SESSION_KEY) === '1';
    } catch {
      welcomeSeen = false;
    }

    if (welcomeSeen) {
      if (toneId) {
        handleNavigate('/app/practice', toneId);
      } else {
        handleNavigate('/app');
      }
    } else {
      handleNavigate('/welcome');
    }
  };

  const nextRecommendation = ProgressStorage.getNextRecommendedTone();
  const nowDate = new Date();
  const todayDateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(nowDate.getDate()).padStart(2, '0')}`;
  const todayAttemptsCount = historyAttempts.filter((a) => a.dateStr === todayDateStr).length;

  return (
    <>
      {currentRoute === '/' && (
        <VietToneHomeEmbedded
          onOpenLearning={handleOpenFromLanding}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
        />
      )}

      {currentRoute === '/welcome' && (
        <WelcomeScreen
          initialDailyGoal={dailyGoal}
          onSelectDailyGoal={handleSelectDailyGoal}
          onFinishWelcome={() => handleNavigate('/app')}
        />
      )}

      {currentRoute === '/app' && (
        <LearningPathHome
          roadmapStats={roadmapStats}
          nextRecommended={nextRecommendation}
          historyAttempts={historyAttempts}
          streakInfo={streakInfo}
          milestoneBadges={milestoneBadges}
          todayAttemptsCount={todayAttemptsCount}
          dailyGoal={dailyGoal}
          soundFxEnabled={soundFxEnabled}
          isConfettiActive={isConfettiActive}
          activeRegion={activeRegion}
          activeModeTab={activeModeTab}
          hasCustomRegionModel={RegionStorage.hasCustomRegionModel(activeRegion)}
          onSelectRegion={handleSelectRegion}
          onSelectModeTab={setActiveModeTab}
          onTeacherSamplesUpdated={() => {
            updateCurrentRefSample(selectedTone.id, activeRegion);
            refreshStorageData();
          }}
          onConfettiComplete={() => setIsConfettiActive(false)}
          onCelebrateChest={handleCelebrateChest}
          onToggleSoundFx={handleToggleSoundFx}
          onGoHome={() => handleNavigate('/')}
          onStartPractice={(toneId, wordItem) => handleNavigate('/app/practice', toneId, wordItem)}
          onOpenAnalysis={() => setIsAnalysisOpen(true)}
          onOpenRoadmap={() => setIsRoadmapOpen(true)}
          onOpenProgress={() => setIsProgressOpen(true)}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenVoiceModelModal={() => setIsModelUrlModalOpen(true)}
          isCustomModelActive={!isDefaultModelUrl(modelUrl)}
        />
      )}

      {currentRoute === '/app/practice' && (
        <PracticeScreen
          selectedTone={selectedTone}
          activeWord={activePracticeWord}
          activeRegion={activeRegion}
          isListening={isListening}
          isAnalyzing={isAnalyzing}
          noSpeechDetected={noSpeechDetected}
          audioVolume={audioVolume}
          permissionError={permissionError}
          isIntroActive={isIntroActive}
          onIntroComplete={() => setIsIntroActive(false)}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onNextTone={handleNextTone}
          onExitPractice={handleExitPractice}
          currentProbabilities={currentProbabilities}
          topToneName={topToneName}
          topToneScore={topToneScore}
          userContour={userContour}
          refSample={refSample}
          f0ScoreResult={f0ScoreResult}
          feedbackAssessment={feedbackAssessment}
          isInlineAnalysisOpen={isInlineAnalysisOpen}
          onToggleInlineAnalysis={handleToggleInlineAnalysis}
          onOpenAndScrollAnalysis={handleOpenAndScrollAnalysis}
          analysisPanelRef={analysisPanelRef}
          encourageVoiceText={encourageVoiceText}
          praiseVoiceText={praiseVoiceText}
          isFallbackMode={isFallbackMode}
          isConfettiActive={isConfettiActive}
          onConfettiComplete={() => setIsConfettiActive(false)}
          onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
          streakInfo={streakInfo}
          todayAttemptsCount={todayAttemptsCount}
          dailyGoal={dailyGoal}
        />
      )}

      {/* ================= 5 POPUP / MODAL CHUYÊN BIỆT ================= */}

      {/* POPUP 1 – Phân tích AI & Đường nét F0 */}
      <AnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        selectedTone={selectedTone}
        currentProbabilities={currentProbabilities}
        topToneName={topToneName}
        topToneScore={topToneScore}
        userContour={userContour}
        refSample={refSample}
        f0ScoreResult={f0ScoreResult}
        feedbackAssessment={feedbackAssessment}
        isListening={isListening}
        onRetry={() => {
          setIsAnalysisOpen(false);
          if (currentRoute !== '/app/practice') {
            handleNavigate('/app/practice', selectedTone.id);
          } else {
            handleStartListening();
          }
        }}
        onNextTone={handleNextTone}
        onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
      />

      {/* POPUP 2 – Lộ trình học tập */}
      <RoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
        stats={roadmapStats}
        nextRecommended={nextRecommendation}
        streakInfo={streakInfo}
        onSelectToneId={handleSelectToneById}
      />

      {/* POPUP 3 – Tiến bộ của tôi & Lịch sử */}
      <ProgressModal
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
        attempts={historyAttempts}
        stats={roadmapStats}
        recent7Days={recent7Days}
        streakInfo={streakInfo}
        badges={milestoneBadges}
        onClearHistory={handleClearHistory}
        onSelectAttemptTone={handleSelectToneById}
      />

      {/* POPUP 4 – Thành tích & Streak */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        streakInfo={streakInfo}
        badges={milestoneBadges}
        todayAttemptsCount={todayAttemptsCount}
        dailyGoal={dailyGoal}
      />

      {/* POPUP 5 – Cài đặt hệ thống */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        soundFxEnabled={soundFxEnabled}
        onToggleSoundFx={handleToggleSoundFx}
        onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenModelSettings={() => setIsModelUrlModalOpen(true)}
        onClearHistory={handleClearHistory}
        isModelReady={isModelReady}
        isFallback={isFallbackMode}
        modelUrl={modelUrl}
      />

      {/* Modal Cập nhật dữ liệu giọng đọc (Đổi URL Teachable Machine & Chọn lại Model gốc) */}
      <ModelSettingsModal
        isOpen={isModelUrlModalOpen}
        onClose={() => setIsModelUrlModalOpen(false)}
        currentModelUrl={modelUrl}
        activeRegion={activeRegion}
        loadedWordLabels={loadedWordLabels}
        onSaveModelUrl={handleSwitchModelUrl}
        isModelReady={isModelReady}
        isFallback={isFallbackMode}
        modelError={modelErrorMessage}
        onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
      />

      {/* Modal Hướng dẫn 6 thanh điệu */}
      <PitchGuideInfo
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Modal Quản lý Mẫu chuẩn Giáo viên */}
      <TeacherReferenceModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        activeRegion={activeRegion}
        onSamplesUpdated={() => {
          updateCurrentRefSample(selectedTone.id, activeRegion);
          refreshStorageData();
        }}
      />

      {/* Modal Sơ đồ Kiến trúc & Luồng xử lý */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </>
  );
}
