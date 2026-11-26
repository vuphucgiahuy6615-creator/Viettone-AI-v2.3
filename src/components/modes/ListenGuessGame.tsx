import React, { useCallback, useEffect, useState } from 'react';
import {
  Volume2,
  Gauge,
  Trophy,
  RotateCcw,
  ArrowRight,
  Flame,
  CheckCircle2,
  XCircle,
  Headphones,
  Play,
} from 'lucide-react';
import { VIETNAMESE_TONES } from '../../data/tones';
import {
  ALL_PRACTICE_WORDS,
  STAGE1_MA_WORDS,
} from '../../data/vocabulary';
import { PracticeWordItem, RegionId, ToneId } from '../../types';
import {
  playCelebrationChime,
  playWordAudio,
  stopAnyVoiceAudio,
} from '../../utils/audioSynthesizer';

type QuizFilter = 'all' | 'hoi_nga' | 'huyen_nang' | 'expanded';
type QuizPhase = 'menu' | 'playing' | 'feedback' | 'summary';

interface QuizQuestion {
  target: PracticeWordItem;
  options: PracticeWordItem[];
}

interface ListenGuessGameProps {
  activeRegion: RegionId;
  onPracticeWeakTone: (toneId: ToneId, wordItem?: PracticeWordItem) => void;
}

const TOTAL_ROUNDS = 10;

const FILTER_OPTIONS: Array<{ id: QuizFilter; label: string; desc: string }> = [
  { id: 'all', label: 'Tất cả 6 thanh', desc: 'Luyện phản xạ phân biệt đủ 6 thanh điệu' },
  { id: 'hoi_nga', label: 'Cặp Hỏi – Ngã', desc: 'Tập trung 2 thanh dễ nhầm mả / mã, bả / bã, cả / cã' },
  { id: 'huyen_nang', label: 'Cặp Huyền – Nặng', desc: 'Phân biệt độ dài và điểm ngắt giữa huyền và nặng' },
  { id: 'expanded', label: 'Từ mở rộng', desc: 'Nghe đoán thanh trên âm ba, la, ca và từ ghép' },
];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQuestions(filter: QuizFilter): QuizQuestion[] {
  let pool: PracticeWordItem[] = [];

  if (filter === 'hoi_nga') {
    pool = ALL_PRACTICE_WORDS.filter(
      (w) => (w.toneId === 'hoi' || w.toneId === 'nga') && w.stageId !== 'stage3_compounds'
    );
  } else if (filter === 'huyen_nang') {
    pool = ALL_PRACTICE_WORDS.filter(
      (w) => (w.toneId === 'huyen' || w.toneId === 'nang') && w.stageId !== 'stage3_compounds'
    );
  } else if (filter === 'expanded') {
    pool = ALL_PRACTICE_WORDS.filter((w) => w.stageId !== 'stage1_ma');
  } else {
    pool = [...STAGE1_MA_WORDS, ...ALL_PRACTICE_WORDS.filter((w) => w.stageId === 'stage2_syllables')];
  }

  if (pool.length === 0) {
    pool = [...STAGE1_MA_WORDS];
  }

  let shuffledPool = shuffleArray(pool);
  const questions: QuizQuestion[] = [];
  let lastTargetId = '';

  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    if (shuffledPool.length === 0) {
      shuffledPool = shuffleArray(pool);
    }
    let idx = shuffledPool.findIndex((item) => item.id !== lastTargetId);
    if (idx < 0) idx = 0;
    const [target] = shuffledPool.splice(idx, 1);
    lastTargetId = target.id;

    // Lấy các phương án cùng họ âm tiết (vd: la/lá/là/lả/lã/lạ) hoặc cùng nhóm từ ghép với thanh khác nhau
    const sameFamily = ALL_PRACTICE_WORDS.filter(
      (w) =>
        w.stageId === target.stageId &&
        w.syllableFamily &&
        w.syllableFamily === target.syllableFamily &&
        w.id !== target.id &&
        w.toneId !== target.toneId
    );

    let distractors: PracticeWordItem[] = [];
    if (sameFamily.length >= 3) {
      distractors = shuffleArray(sameFamily).slice(0, 3);
    } else {
      const sameStageOthers = ALL_PRACTICE_WORDS.filter(
        (w) => w.stageId === target.stageId && w.id !== target.id && w.toneId !== target.toneId
      );
      const fallbackOthers = ALL_PRACTICE_WORDS.filter(
        (w) => w.id !== target.id && w.toneId !== target.toneId
      );
      const candidates = [...shuffleArray(sameStageOthers), ...shuffleArray(fallbackOthers)];
      const uniqueToneIds = new Set<ToneId>([target.toneId]);

      for (const candidate of candidates) {
        if (!uniqueToneIds.has(candidate.toneId)) {
          uniqueToneIds.add(candidate.toneId);
          distractors.push(candidate);
        }
        if (distractors.length >= 3) break;
      }
    }

    const options = shuffleArray([target, ...distractors.slice(0, 3)]);
    questions.push({ target, options });
  }

  return questions;
}

export const ListenGuessGame: React.FC<ListenGuessGameProps> = ({
  activeRegion,
  onPracticeWeakTone,
}) => {
  const [phase, setPhase] = useState<QuizPhase>('menu');
  const [filter, setFilter] = useState<QuizFilter>('all');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [mistakeTones, setMistakeTones] = useState<Record<string, number>>({});

  useEffect(() => {
    return () => {
      stopAnyVoiceAudio();
    };
  }, []);

  const currentQuestion = questions[currentIdx] || null;

  const playCurrentTarget = useCallback(
    (rate = 1) => {
      if (!currentQuestion) return;
      playWordAudio(
        currentQuestion.target.word,
        currentQuestion.target.toneId,
        activeRegion,
        rate
      );
    },
    [currentQuestion, activeRegion]
  );

  const handleStartGame = () => {
    const generated = buildQuestions(filter);
    setQuestions(generated);
    setCurrentIdx(0);
    setSelectedOptionId(null);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setMistakeTones({});
    setPhase('playing');

    const first = generated[0];
    if (first) {
      window.setTimeout(() => {
        playWordAudio(first.target.word, first.target.toneId, activeRegion, 1);
      }, 150);
    }
  };

  const handleSelectOption = (opt: PracticeWordItem) => {
    if (phase !== 'playing' || !currentQuestion) return;
    setSelectedOptionId(opt.id);

    const isCorrect = opt.id === currentQuestion.target.id;

    if (isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((prev) => Math.max(prev, nextCombo));
      setCorrectCount((prev) => prev + 1);
      setScore((prev) => prev + 10 + Math.min(nextCombo - 1, 5) * 2);
      playCelebrationChime(nextCombo >= 3 ? 'milestone' : 'success');
    } else {
      setCombo(0);
      setMistakeTones((prev) => ({
        ...prev,
        [currentQuestion.target.toneId]: (prev[currentQuestion.target.toneId] || 0) + 1,
      }));
      playCelebrationChime('encourage');
    }

    setPhase('feedback');
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      stopAnyVoiceAudio();
      setPhase('summary');
      return;
    }

    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setSelectedOptionId(null);
    setPhase('playing');

    const nextQ = questions[nextIdx];
    if (nextQ) {
      window.setTimeout(() => {
        playWordAudio(nextQ.target.word, nextQ.target.toneId, activeRegion, 1);
      }, 140);
    }
  };

  // Tìm thanh hay nhầm nhất để gợi ý luyện nói
  const weakestToneEntry = (Object.entries(mistakeTones) as Array<[string, number]>).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const weakestToneId = (weakestToneEntry?.[0] as ToneId) || 'hoi';
  const weakestToneMeta = VIETNAMESE_TONES.find((t) => t.id === weakestToneId);

  return (
    <section
      aria-label="Chế độ Nghe và Đoán thanh"
      className="flex-1 w-full max-w-2xl mx-auto pb-24 md:pb-12 space-y-4"
    >
      {/* Banner tiêu đề */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-[var(--vt-red)] to-[var(--vt-orange)] border-2 border-white/20 border-b-4 border-b-[var(--vt-red-shadow)] p-4 sm:p-5 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-white/85">
            LUYỆN TAI NGHE THANH ĐIỆU
          </p>
          <h1 className="text-lg sm:text-2xl font-black text-white leading-tight mt-0.5">
            Nghe &amp; Đoán thanh (10 câu)
          </h1>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/25 flex items-center justify-center shrink-0">
          <Headphones className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
      </div>

      {/* MÀN 1: MENU CHỌN BỘ CÂU HỎI */}
      {phase === 'menu' && (
        <div className="vt-card p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              Chọn bộ thử thách nghe phân biệt
            </h2>
            <p className="text-xs sm:text-sm text-white/75 font-semibold mt-1">
              Nghe phát âm theo vùng miền đang chọn, sau đó chọn đúng thanh điệu tương ứng.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FILTER_OPTIONS.map((item) => {
              const isSelected = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${
                    isSelected
                      ? 'bg-[var(--vt-orange)]/25 border-[var(--vt-orange)] text-white'
                      : 'bg-white/5 border-white/15 text-white/85 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm font-black">{item.label}</p>
                  <p className="text-xs text-white/75 font-semibold mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleStartGame}
            className="vt-btn-3d vt-btn-primary w-full min-h-[48px] py-3 px-5 text-sm sm:text-base"
          >
            <Play className="w-4 h-4 fill-white" aria-hidden="true" />
            <span>BẮT ĐẦU 10 CÂU NGHE</span>
          </button>
        </div>
      )}

      {/* MÀN 2 & 3: ĐANG CHƠI & PHẢN HỒI TỪNG CÂU */}
      {(phase === 'playing' || phase === 'feedback') && currentQuestion && (
        <div className="vt-card p-5 sm:p-6 space-y-5">
          {/* HUD: Câu hiện tại · Điểm · Combo */}
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-extrabold border-b border-white/15 pb-3">
            <span className="text-white/90 tabular-nums">
              Câu {currentIdx + 1}/{questions.length}
            </span>
            <div className="flex items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1 text-[var(--vt-amber-300)]">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                {score} điểm
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--vt-orange-200)]">
                <Flame className="w-4 h-4 text-[var(--vt-orange)]" aria-hidden="true" />
                Combo {combo}
              </span>
            </div>
          </div>

          {/* Nút Nghe lại & Nghe chậm */}
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <p className="text-sm font-extrabold text-white/90">
              Bấm nút bên dưới để nghe, rồi chọn đúng từ bạn vừa nghe thấy:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => playCurrentTarget(1)}
                className="vt-btn-3d vt-btn-primary min-h-[46px] px-5 py-2.5 text-sm"
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>NGHE LẠI</span>
              </button>

              <button
                type="button"
                onClick={() => playCurrentTarget(0.75)}
                className="vt-btn-3d vt-btn-secondary min-h-[46px] px-4 py-2.5 text-sm"
              >
                <Gauge className="w-4 h-4 text-[var(--vt-amber-300)]" aria-hidden="true" />
                <span>Nghe chậm (0.75x)</span>
              </button>
            </div>
          </div>

          {/* 4 lựa chọn đáp án */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((opt) => {
              const toneMeta = VIETNAMESE_TONES.find((t) => t.id === opt.toneId);
              const isSelected = selectedOptionId === opt.id;
              const isTarget = opt.id === currentQuestion.target.id;

              let btnClass =
                'bg-white/10 hover:bg-white/15 border-white/20 text-white';

              if (phase === 'feedback') {
                if (isTarget) {
                  btnClass =
                    'bg-[var(--vt-success)]/35 border-[var(--vt-success-300)] text-white';
                } else if (isSelected && !isTarget) {
                  btnClass =
                    'bg-[var(--vt-red)]/35 border-[var(--vt-red-300)] text-white';
                } else {
                  btnClass = 'bg-white/5 border-white/10 text-white/55';
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={phase === 'feedback'}
                  onClick={() => handleSelectOption(opt)}
                  className={`min-h-[76px] p-3.5 rounded-2xl border-2 border-b-4 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-[var(--vt-amber-300)] ${btnClass}`}
                >
                  <span className="text-2xl font-black tracking-tight">{opt.word}</span>
                  <span className="text-xs font-bold opacity-85">
                    {toneMeta?.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Phản hồi tức thì + Mẹo F0 */}
          {phase === 'feedback' && (
            <div className="space-y-3 pt-2 border-t border-white/15 animate-vt-pop">
              {selectedOptionId === currentQuestion.target.id ? (
                <div className="p-3.5 rounded-2xl bg-[var(--vt-success)]/25 border border-[var(--vt-success-300)]/60 flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[var(--vt-success-300)] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-white">
                      Chính xác! Đó là &ldquo;{currentQuestion.target.word}&rdquo;
                    </p>
                    <p className="text-xs text-white/85 font-semibold mt-0.5">
                      {currentQuestion.target.tip}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[var(--vt-orange)]/20 border border-[var(--vt-amber-300)]/60 flex items-start gap-2.5 text-sm">
                  <XCircle className="w-5 h-5 text-[var(--vt-amber-300)] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-white">
                      Đáp án đúng: &ldquo;{currentQuestion.target.word}&rdquo; (
                      {VIETNAMESE_TONES.find((t) => t.id === currentQuestion.target.toneId)?.name})
                    </p>
                    <p className="text-xs text-white/85 font-semibold mt-0.5">
                      Mẹo nghe: {currentQuestion.target.tip}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleNextQuestion}
                className="vt-btn-3d vt-btn-primary w-full min-h-[46px] py-2.5 px-4 text-sm"
              >
                <span>{currentIdx + 1 >= questions.length ? 'XEM KẾT QUẢ' : 'CÂU TIẾP THEO'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MÀN 4: TỔNG KẾT */}
      {phase === 'summary' && (
        <div className="vt-card p-6 text-center space-y-5 animate-vt-pop">
          <div className="w-16 h-16 rounded-full bg-[var(--vt-amber-400)]/20 border-2 border-[var(--vt-amber-300)] text-[var(--vt-amber-300)] flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Hoàn thành thử thách!</h2>
            <p className="text-sm text-white/80 font-semibold">
              Bạn nghe đúng {correctCount}/{questions.length} câu · Đạt {score} điểm · Combo tối đa {maxCombo}
            </p>
          </div>

          {Object.keys(mistakeTones).length > 0 && weakestToneMeta && (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-left space-y-2.5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--vt-amber-300)]">
                Đề xuất củng cố
              </p>
              <p className="text-sm text-white font-semibold">
                Bạn hay nhầm <strong className="text-[var(--vt-yellow)]">{weakestToneMeta.name} ({weakestToneMeta.word})</strong>. Hãy thử luyện đọc lại thanh này cùng Bé Lạc!
              </p>
              <button
                type="button"
                onClick={() => onPracticeWeakTone(weakestToneMeta.id)}
                className="vt-btn-3d vt-btn-secondary min-h-[42px] px-4 py-2 text-xs"
              >
                <span>Luyện phát âm {weakestToneMeta.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleStartGame}
              className="vt-btn-3d vt-btn-primary flex-1 min-h-[46px] py-2.5 px-4 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>CHƠI LẠI</span>
            </button>
            <button
              type="button"
              onClick={() => setPhase('menu')}
              className="vt-btn-3d vt-btn-secondary flex-1 min-h-[46px] py-2.5 px-4 text-sm"
            >
              <span>Đổi bộ câu hỏi</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
