import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { WORD_BANK } from "../utils/wordRushWordBank";

type Phase = "idle" | "memorize" | "typing" | "countdown" | "over";
type Difficulty = "easy" | "medium" | "hard" | "auto";

const TICK_MS = 50;
const COUNTDOWN_MS = 3000;

const BEST_SCORE_KEY = "memoryMode.bestScore.v1";
const BEST_STREAK_KEY = "memoryMode.bestStreak.v1";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const shuffle = <T,>(items: readonly T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const VISIBLE_MS: Record<Exclude<Difficulty, "auto">, number> = {
  easy: 3000,
  medium: 2200,
  hard: 1400
};

const WORDS = WORD_BANK.map((word) => word.toLowerCase()).filter((word) => /^[a-z]+$/.test(word));
const EASY_WORDS = WORDS.filter((word) => word.length >= 3 && word.length <= 4);
const MEDIUM_WORDS = WORDS.filter((word) => word.length >= 5 && word.length <= 6);
const HARD_WORDS = WORDS.filter((word) => word.length >= 7 && word.length <= 8);

const difficultyLabel: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  auto: "Auto"
};

const phaseLabel: Record<Phase, string> = {
  idle: "Ready",
  memorize: "Memorize",
  typing: "Typing",
  countdown: "Next Up",
  over: "Game Over"
};

const effectiveDifficultyFor = (
  selected: Difficulty,
  totalScore: number
): Exclude<Difficulty, "auto"> => {
  if (selected !== "auto") {
    return selected;
  }
  if (totalScore < 10) {
    return "easy";
  }
  if (totalScore < 25) {
    return "medium";
  }
  return "hard";
};

const sanitizeTyped = (value: string) => value.replace(/[^a-zA-Z]/g, "").toLowerCase();

export const MemoryModePage: React.FC = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("auto");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [typingLimitMs, setTypingLimitMs] = useState(7000);

  const [word, setWord] = useState("");
  const [wordDisplay, setWordDisplay] = useState("");
  const [wordVisible, setWordVisible] = useState(false);
  const [typed, setTyped] = useState("");

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [memorizeTotalMs, setMemorizeTotalMs] = useState(0);
  const [memorizeLeftMs, setMemorizeLeftMs] = useState(0);
  const [typingTotalMs, setTypingTotalMs] = useState(0);
  const [typingLeftMs, setTypingLeftMs] = useState(0);
  const [countdownTotalMs, setCountdownTotalMs] = useState(0);
  const [countdownLeftMs, setCountdownLeftMs] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const phaseRef = useRef(phase);
  const difficultyRef = useRef(difficulty);
  const wordRef = useRef(word);
  const typedRef = useRef(typed);
  const scoreRef = useRef(score);

  const memorizeEndAtMsRef = useRef<number | null>(null);
  const typingEndAtMsRef = useRef<number | null>(null);
  const countdownEndAtMsRef = useRef<number | null>(null);

  const easyBagRef = useRef<string[]>([]);
  const mediumBagRef = useRef<string[]>([]);
  const hardBagRef = useRef<string[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const wordHideTimeoutRef = useRef<number | null>(null);

  const updateNow = useCallback(() => performance.now(), []);

  const { message, showToast, dismiss } = useToast();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    wordRef.current = word;
  }, [word]);

  useEffect(() => {
    typedRef.current = typed;
  }, [typed]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    try {
      const storedScore = Number(localStorage.getItem(BEST_SCORE_KEY) || "0");
      const storedStreak = Number(localStorage.getItem(BEST_STREAK_KEY) || "0");
      setBestScore(Number.isFinite(storedScore) ? storedScore : 0);
      setBestStreak(Number.isFinite(storedStreak) ? storedStreak : 0);
    } catch {
      setBestScore(0);
      setBestStreak(0);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch {
      // ignore
    }
  }, [bestScore]);

  useEffect(() => {
    try {
      localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));
    } catch {
      // ignore
    }
  }, [bestStreak]);

  const effectiveDifficulty = useMemo<Exclude<Difficulty, "auto">>(
    () => effectiveDifficultyFor(difficulty, score),
    [difficulty, score]
  );

  const ensureAudio = useCallback(async () => {
    if (!soundEnabled) {
      return;
    }
    if (audioCtxRef.current) {
      try {
        await audioCtxRef.current.resume();
      } catch {
        // ignore
      }
      return;
    }

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      setAudioAvailable(false);
      return;
    }

    try {
      const ctx: AudioContext = new AudioContextCtor();
      await ctx.resume();
      audioCtxRef.current = ctx;
      setAudioAvailable(ctx.state === "running");
    } catch {
      audioCtxRef.current = null;
      setAudioAvailable(false);
    }
  }, [soundEnabled]);

  const playBeep = useCallback(() => {
    if (!soundEnabled) {
      return;
    }
    const ctx = audioCtxRef.current;
    if (!ctx) {
      return;
    }

    try {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 880;

      const gain = ctx.createGain();
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const startAt = ctx.currentTime + 0.01;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

      osc.start(startAt);
      osc.stop(startAt + 0.16);
    } catch {
      // ignore (blocked / unsupported)
    }
  }, [soundEnabled]);

  const takeFromBag = useCallback((bagRef: React.MutableRefObject<string[]>, options: readonly string[]) => {
    if (!bagRef.current.length) {
      bagRef.current = shuffle(options);
    }
    return bagRef.current.pop() ?? options[0] ?? "type";
  }, []);

  const takeNextWord = useCallback((level: Exclude<Difficulty, "auto">) => {
    if (level === "easy") {
      return takeFromBag(easyBagRef, EASY_WORDS);
    }
    if (level === "medium") {
      return takeFromBag(mediumBagRef, MEDIUM_WORDS);
    }
    return takeFromBag(hardBagRef, HARD_WORDS);
  }, [takeFromBag]);

  const resetSession = useCallback(() => {
    dismiss();
    memorizeEndAtMsRef.current = null;
    typingEndAtMsRef.current = null;
    countdownEndAtMsRef.current = null;
    if (wordHideTimeoutRef.current) {
      window.clearTimeout(wordHideTimeoutRef.current);
      wordHideTimeoutRef.current = null;
    }
    setPhase("idle");
    phaseRef.current = "idle";

    setWord("");
    setWordDisplay("");
    setWordVisible(false);
    setTyped("");
    setScore(0);
    setStreak(0);

    setMemorizeTotalMs(0);
    setMemorizeLeftMs(0);
    setTypingTotalMs(0);
    setTypingLeftMs(0);
    setCountdownTotalMs(0);
    setCountdownLeftMs(0);
    setTypingLimitMs(7000);
  }, [dismiss]);

  const startSession = useCallback(async () => {
      dismiss();
      if (wordHideTimeoutRef.current) {
        window.clearTimeout(wordHideTimeoutRef.current);
        wordHideTimeoutRef.current = null;
      }

      await ensureAudio();

      setScore(0);
      setStreak(0);

      const level = effectiveDifficultyFor(difficultyRef.current, 0);
      const nextWord = takeNextWord(level);
      setWord(nextWord);
      wordRef.current = nextWord;
      setWordDisplay(nextWord);
      setWordVisible(true);
      setTyped("");
      typedRef.current = "";

      const visibleMs = VISIBLE_MS[level];
      const now = updateNow();
      memorizeEndAtMsRef.current = now + visibleMs;
      setMemorizeTotalMs(visibleMs);
      setMemorizeLeftMs(visibleMs);

      setTypingTotalMs(0);
      setTypingLeftMs(0);
      typingEndAtMsRef.current = null;

      setCountdownTotalMs(0);
      setCountdownLeftMs(0);
      countdownEndAtMsRef.current = null;

      setPhase("memorize");
      phaseRef.current = "memorize";
  }, [dismiss, ensureAudio, takeNextWord, updateNow]);

  const hideWord = useCallback(() => {
    setWordVisible(false);
    if (wordHideTimeoutRef.current) {
      window.clearTimeout(wordHideTimeoutRef.current);
    }
    wordHideTimeoutRef.current = window.setTimeout(() => {
      setWordDisplay("");
      wordHideTimeoutRef.current = null;
    }, 320);
  }, []);

  const startCountdown = useCallback(() => {
    setTyped("");
    typedRef.current = "";
    typingEndAtMsRef.current = null;
    setTypingTotalMs(0);
    setTypingLeftMs(0);

    const now = updateNow();
    countdownEndAtMsRef.current = now + COUNTDOWN_MS;
    setCountdownTotalMs(COUNTDOWN_MS);
    setCountdownLeftMs(COUNTDOWN_MS);

    setPhase("countdown");
    phaseRef.current = "countdown";
  }, [updateNow]);

  const endGame = useCallback(
    (reason: "timeout") => {
      if (reason === "timeout") {
        showToast("Time's up — game over.");
      }

      memorizeEndAtMsRef.current = null;
      typingEndAtMsRef.current = null;
      countdownEndAtMsRef.current = null;
      setMemorizeTotalMs(0);
      setMemorizeLeftMs(0);
      setTypingTotalMs(0);
      setTypingLeftMs(0);
      setCountdownTotalMs(0);
      setCountdownLeftMs(0);

      setTyped("");
      typedRef.current = "";
      hideWord();

      setPhase("over");
      phaseRef.current = "over";
    },
    [hideWord, showToast]
  );

  const handleCorrect = useCallback(() => {
    if (phaseRef.current !== "typing") {
      return;
    }

    setScore((prev) => {
      const next = prev + 1;
      setBestScore((best) => (next > best ? next : best));
      return next;
    });
    setStreak((prev) => {
      const next = prev + 1;
      setBestStreak((best) => (next > best ? next : best));
      return next;
    });

    startCountdown();
  }, [startCountdown]);

  const handleTypingTimeout = useCallback(() => {
    if (phaseRef.current !== "typing") {
      return;
    }
    endGame("timeout");
  }, [endGame]);

  const startTypingPhase = useCallback(() => {
    playBeep();

    setPhase("typing");
    phaseRef.current = "typing";
    setMemorizeLeftMs(0);
    memorizeEndAtMsRef.current = null;
    hideWord();

    requestAnimationFrame(() => inputRef.current?.focus());

    const limitMs = typingLimitMs;
    const now = updateNow();
    typingEndAtMsRef.current = now + limitMs;
    setTypingTotalMs(limitMs);
    setTypingLeftMs(limitMs);
  }, [hideWord, playBeep, typingLimitMs, updateNow]);

  useEffect(() => {
    if (phase !== "memorize" && phase !== "typing" && phase !== "countdown") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const now = updateNow();
      if (phaseRef.current === "memorize") {
        const endAt = memorizeEndAtMsRef.current;
        if (!endAt) {
          return;
        }
        const left = Math.max(0, endAt - now);
        setMemorizeLeftMs(left);
        if (left === 0) {
          startTypingPhase();
        }
        return;
      }

      if (phaseRef.current === "typing") {
        const endAt = typingEndAtMsRef.current;
        if (!endAt) {
          return;
        }
        const left = Math.max(0, endAt - now);
        setTypingLeftMs(left);
        if (left === 0) {
          handleTypingTimeout();
        }
        return;
      }

      if (phaseRef.current === "countdown") {
        const endAt = countdownEndAtMsRef.current;
        if (!endAt) {
          return;
        }
        const left = Math.max(0, endAt - now);
        setCountdownLeftMs(left);
        if (left === 0) {
          const level = effectiveDifficultyFor(difficultyRef.current, scoreRef.current);
          const nextWord = takeNextWord(level);
          setWord(nextWord);
          wordRef.current = nextWord;
          setWordDisplay(nextWord);
          setWordVisible(true);

          setTyped("");
          typedRef.current = "";

          const visibleMs = VISIBLE_MS[level];
          memorizeEndAtMsRef.current = now + visibleMs;
          setMemorizeTotalMs(visibleMs);
          setMemorizeLeftMs(visibleMs);

          countdownEndAtMsRef.current = null;
          setCountdownTotalMs(0);
          setCountdownLeftMs(0);

          setTypingTotalMs(0);
          setTypingLeftMs(0);
          typingEndAtMsRef.current = null;

          setPhase("memorize");
          phaseRef.current = "memorize";
        }
      }
    }, TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [handleTypingTimeout, phase, startTypingPhase, takeNextWord, updateNow]);

  useEffect(() => {
    if (phase === "typing") {
      inputRef.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }

      if (event.code === "Space" && (phaseRef.current === "idle" || phaseRef.current === "over")) {
        event.preventDefault();
        void startSession();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startSession]);

  const memorizeSecondsLeft = useMemo(
    () => Math.round(memorizeLeftMs / 100) / 10,
    [memorizeLeftMs]
  );
  const typingSecondsLeft = useMemo(
    () => Math.round(typingLeftMs / 100) / 10,
    [typingLeftMs]
  );
  const countdownSecondsLeft = useMemo(() => {
    if (!countdownTotalMs) {
      return 0;
    }
    return Math.max(1, Math.ceil(countdownLeftMs / 1000));
  }, [countdownLeftMs, countdownTotalMs]);

  const memorizeProgress = useMemo(() => {
    if (!memorizeTotalMs) {
      return 0;
    }
    return clamp((memorizeLeftMs / memorizeTotalMs) * 100, 0, 100);
  }, [memorizeLeftMs, memorizeTotalMs]);

  const typingProgress = useMemo(() => {
    if (!typingTotalMs) {
      return 0;
    }
    return clamp((typingLeftMs / typingTotalMs) * 100, 0, 100);
  }, [typingLeftMs, typingTotalMs]);

  const countdownProgress = useMemo(() => {
    if (!countdownTotalMs) {
      return 0;
    }
    return clamp((countdownLeftMs / countdownTotalMs) * 100, 0, 100);
  }, [countdownLeftMs, countdownTotalMs]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = sanitizeTyped(event.target.value);
      setTyped(next);
      typedRef.current = next;

      if (phaseRef.current !== "typing") {
        return;
      }

      if (next !== wordRef.current) {
        return;
      }

      handleCorrect();
    },
    [handleCorrect]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (phaseRef.current === "typing") {
        event.preventDefault();
        showToast("Paste disabled during Memory Mode.");
      }
    },
    [showToast]
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Memory Challenge</p>
            <h2 className="mt-2 font-display text-3xl text-cloud">Memory Mode</h2>
            <p className="mt-2 text-sm text-cloud/60">
              Memorize the word, then type it from memory after it disappears.
            </p>
          </div>
          <div className="panel-solid rounded-2xl border border-overlay/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Effective Difficulty</p>
            <p className="mt-2 text-sm text-cloud/70">
              {difficulty === "auto" ? `Auto → ${difficultyLabel[effectiveDifficulty]}` : difficultyLabel[difficulty]}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="panel-solid rounded-3xl border border-overlay/10 p-6 lg:col-span-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Controls</p>
              <h3 className="mt-2 font-display text-2xl text-cloud">Session</h3>
            </div>
            <span className="chip">{phaseLabel[phase]}</span>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cloud/60">Difficulty</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(["easy", "medium", "hard", "auto"] as const).map((level) => {
                  const isActive = level === difficulty;
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        if (level === difficultyRef.current) {
                          return;
                        }
                        resetSession();
                        setDifficulty(level);
                      }}
                      className={`card-option ${isActive ? "card-option-active" : ""}`}
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">{difficultyLabel[level]}</p>
                      <p className="mt-2 text-sm text-cloud/75">
                        {level === "easy"
                          ? "3–4 letters"
                          : level === "medium"
                            ? "5–6 letters"
                            : level === "hard"
                              ? "7–8 letters"
                              : "Ramps with score"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Score</p>
              <p className="mt-2 font-display text-3xl text-cloud">{score}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cloud/50">Best: {bestScore}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Streak</p>
                <p className="mt-2 font-display text-3xl text-cloud">{streak}</p>
              </div>
              <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Best Streak</p>
                <p className="mt-2 font-display text-3xl text-cloud">{bestStreak}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => void startSession()}
                className="btn-primary"
                disabled={phase !== "idle" && phase !== "over"}
              >
                Start
              </button>
              <button onClick={resetSession} className="btn-outline">
                Reset
              </button>
            </div>

            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Options</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  className="btn-outline"
                >
                  {soundEnabled ? "Sound On" : "Sound Off"}
                </button>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.25em] text-cloud/50">
                {!audioAvailable ? "Audio unavailable/blocked • " : ""}
                Typing limit: {(typingLimitMs / 1000).toFixed(1)}s • Space: Start • Paste disabled while typing
              </p>
            </div>
          </div>
        </div>

        <div className="panel-solid rounded-3xl border border-overlay/10 p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Game Board</p>
          <h3 className="mt-2 font-display text-2xl text-cloud">Recall</h3>

          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Word</p>
                {phase === "memorize" ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">
                    Hiding in {memorizeSecondsLeft.toFixed(1)}s
                  </p>
                ) : phase === "countdown" ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">
                    Next in {countdownSecondsLeft}s
                  </p>
                ) : phase === "typing" && typingTotalMs ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">
                    Time left {typingSecondsLeft.toFixed(1)}s
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="progress-track h-2 overflow-hidden rounded-full">
                  {phase === "memorize" ? (
                    <div className="progress-fill h-full" style={{ width: `${memorizeProgress}%` }} />
                  ) : phase === "countdown" ? (
                    <div className="progress-fill h-full" style={{ width: `${countdownProgress}%` }} />
                  ) : phase === "typing" && typingTotalMs ? (
                    <div className="progress-fill h-full" style={{ width: `${typingProgress}%` }} />
                  ) : (
                    <div className="h-full" style={{ width: "0%" }} />
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-overlay/10 bg-overlay/5 p-5">
                {phase === "idle" ? (
                  <p className="text-sm text-cloud/60">
                    Press <span className="font-mono text-cloud/80">Space</span> or <span className="font-mono text-cloud/80">Start</span> to begin.
                  </p>
                ) : phase === "over" ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Time&apos;s up</p>
                    <p className="mt-3 text-sm text-cloud/70">
                      Press <span className="font-mono text-cloud/80">Space</span> or{" "}
                      <span className="font-mono text-cloud/80">Start</span> to try again.
                    </p>
                  </div>
                ) : phase === "countdown" ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Next word is displayed in</p>
                    <p className="mt-3 font-display text-5xl text-cloud">{countdownSecondsLeft}</p>
                  </div>
                ) : (
                  <>
                    <p
                      className={`font-display text-4xl tracking-wide text-cloud transition-opacity duration-300 ${
                        wordVisible ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden={!wordVisible}
                    >
                      {wordDisplay || "—"}
                    </p>
                    {phase !== "memorize" ? (
                      <p className="mt-2 font-mono text-lg text-cloud/40 select-none">
                        {"·".repeat(Math.min(24, Math.max(6, word.length || 12)))}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Type From Memory</p>
                {phase === "typing" ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Instant match</p>
                ) : null}
              </div>

              <input
                ref={inputRef}
                value={typed}
                onChange={handleChange}
                onPaste={handlePaste}
                disabled={phase !== "typing"}
                placeholder={
                  phase === "idle"
                    ? "Press Space to start."
                    : phase === "over"
                      ? "Press Space or Start to play again."
                    : phase === "memorize"
                      ? "Memorize the word..."
                      : phase === "typing"
                        ? "Type the word..."
                        : "Next word incoming..."
                }
                className="input-field mt-4 w-full font-mono text-lg"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />

              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cloud/50">
                Letters only · Instant match · No paste
              </p>
            </div>
          </div>
        </div>
      </section>

      <Toast message={message} />
    </div>
  );
};
