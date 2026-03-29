import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GameStatus = "idle" | "running" | "over";

interface Bubble {
  id: number;
  key: string;
  spawnAtMs: number;
  xPercent: number;
  sizePx: number;
  variant: number;
  poppedAtMs?: number;
}

interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  lives: number;
}

const useRafTimestamp = (enabled: boolean) => {
  const [timestamp, setTimestamp] = useState(() => performance.now());
  const rafIdRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    lastFrameMsRef.current = 0;
    const frameIntervalMs = 1000 / 45;

    const loop = (timeMs: number) => {
      if (timeMs - lastFrameMsRef.current >= frameIntervalMs) {
        lastFrameMsRef.current = timeMs;
        setTimestamp(timeMs);
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = null;
    };
  }, [enabled]);

  return timestamp;
};

const STORAGE_KEY = "bubble.highScore.printable";
const POP_SOUND_URL = `${import.meta.env.BASE_URL}audio/bubble-pop.mp3`;

const INITIAL_LIVES = 3;
const BASE_HIT_SCORE = 100;
const COMBO_BONUS = 10;

const BASE_SPAWN_MS = 900;
const BASE_TRAVEL_MS = 5200;
const RAMP_PER_SEC = 0.03;
const MAX_SPEED = 5.0;
const MAX_BUBBLES = 28;

const ESCAPE_PROGRESS = 1.05;
const POP_ANIM_MS = 260;

const LETTER_KEYS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const FULL_KEY_SET = [...LETTER_KEYS];

const createInitialStats = (): GameStats => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  hits: 0,
  misses: 0,
  lives: INITIAL_LIVES
});

const shuffle = <T,>(items: readonly T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const normalizeKey = (rawKey: string, code: string) => {
  if (code === "Space" || rawKey === " ") {
    return "";
  }
  const upper = rawKey.toUpperCase();
  if (upper.length !== 1) {
    return "";
  }
  if (!upper.trim()) {
    return "";
  }
  if (upper < "A" || upper > "Z") {
    return "";
  }
  return upper;
};

const BubbleField = React.memo<{
  status: GameStatus;
  bubbles: Bubble[];
  fieldRef: React.RefObject<HTMLDivElement>;
  fieldHeightPx: number;
  getProgress: (bubble: Bubble, timeMs: number) => number;
  startGame: () => void;
  resetGame: () => void;
}>(({ status, bubbles, fieldRef, fieldHeightPx, getProgress, startGame, resetGame }) => {
  const nowMs = useRafTimestamp(status === "running");

  return (
    <div
      ref={fieldRef}
      className="relative mt-6 h-[520px] overflow-hidden rounded-3xl border border-overlay/10 bg-black/20"
    >
      {bubbles.map((bubble) => {
        const renderAt = bubble.poppedAtMs ?? nowMs;
        const progress = getProgress(bubble, renderAt);
        const height = fieldHeightPx || 1;
        const startY = height + bubble.sizePx * 0.8;
        const endY = -bubble.sizePx * 0.8;
        const centerY = startY + (endY - startY) * progress;
        const topPx = Math.round(centerY - bubble.sizePx / 2);
        const variantClass =
          bubble.variant === 0
            ? "bubble-variant-mint"
            : bubble.variant === 1
              ? "bubble-variant-lilac"
              : "bubble-variant-accent";

        return (
          <div
            key={bubble.id}
            className="bubble-shell"
            style={{
              left: `${bubble.xPercent}%`,
              width: `${bubble.sizePx}px`,
              height: `${bubble.sizePx}px`,
              transform: `translate3d(-50%, ${topPx}px, 0)`,
              willChange: "transform"
            }}
          >
            <div className={`bubble ${variantClass} ${bubble.poppedAtMs ? "bubble-pop" : ""}`}>
              <span className="bubble-label">{bubble.key}</span>
            </div>
          </div>
        );
      })}

      {status !== "running" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-3xl border border-overlay/10 bg-black/40 px-8 py-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">
              {status === "over" ? "Game Over" : "Ready"}
            </p>
            <p className="mt-3 text-sm text-cloud/70">
              {status === "over"
                ? "Reset to start a new run."
                : "Press Start, then type the key inside each bubble to pop it."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={startGame}
                className="btn-primary"
              >
                Start
              </button>
              <button onClick={resetGame} className="btn-outline">
                Reset
              </button>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-cloud/50">
              Tip: Press Space to start.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export const BubbleKeysPage: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [stats, setStats] = useState<GameStats>(() => createInitialStats());
  const [highScore, setHighScore] = useState(0);
  const [fieldHeightPx, setFieldHeightPx] = useState(520);
  const [speedDisplay, setSpeedDisplay] = useState(1);

  const fieldRef = useRef<HTMLDivElement | null>(null);

  const statusRef = useRef<GameStatus>(status);
  const bubblesRef = useRef<Bubble[]>(bubbles);
  const statsRef = useRef<GameStats>(stats);
  const highScoreRef = useRef(highScore);
  const fieldHeightRef = useRef(fieldHeightPx);
  const nowMsRef = useRef(performance.now());

  const startedAtMsRef = useRef<number | null>(null);
  const nextSpawnAtMsRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const bubbleIdRef = useRef(1);
  const keyBagRef = useRef<string[]>([]);
  const popSoundPoolRef = useRef<HTMLAudioElement[]>([]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    fieldHeightRef.current = fieldHeightPx;
  }, [fieldHeightPx]);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY) || "0");
      const safe = Number.isFinite(stored) ? stored : 0;
      highScoreRef.current = safe;
      setHighScore(safe);
    } catch {
      highScoreRef.current = 0;
      setHighScore(0);
    }
  }, []);

  const playPopSound = useCallback(() => {
    let pool = popSoundPoolRef.current;
    if (!pool.length) {
      pool = Array.from({ length: 6 }, () => {
        const audio = new Audio(POP_SOUND_URL);
        audio.preload = "auto";
        audio.volume = 0.45;
        return audio;
      });
      popSoundPoolRef.current = pool;
    }

    const audio = pool.find((candidate) => candidate.paused || candidate.ended) || pool[0];
    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
    } catch {
      // ignore
    }

    void audio.play().catch(() => {
      // ignore (autoplay / user gesture / unsupported)
    });
  }, []);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const next = Math.max(260, Math.round(el.getBoundingClientRect().height));
      setFieldHeightPx(next);
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const setBubblesSynced = useCallback((next: Bubble[]) => {
    bubblesRef.current = next;
    setBubbles(next);
  }, []);

  const setStatsSynced = useCallback((next: GameStats) => {
    statsRef.current = next;
    setStats(next);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const speedAt = useCallback((timeMs: number) => {
    const startedAt = startedAtMsRef.current;
    if (startedAt === null) {
      return 1;
    }
    const elapsedSeconds = Math.max(0, (timeMs - startedAt) / 1000);
    const next = 1 + RAMP_PER_SEC * elapsedSeconds;
    return Math.min(MAX_SPEED, next);
  }, []);

  const getProgress = useCallback(
    (bubble: Bubble, timeMs: number) => {
      const speedSpawn = speedAt(bubble.spawnAtMs);
      const speedNow = speedAt(timeMs);
      const avgSpeed = (speedSpawn + speedNow) / 2;
      const dt = Math.max(0, timeMs - bubble.spawnAtMs);
      return (dt * avgSpeed) / BASE_TRAVEL_MS;
    },
    [speedAt]
  );

  const endGame = useCallback(() => {
    stopLoop();
    setStatus("over");
    statusRef.current = "over";
  }, [stopLoop]);

  const applyHit = useCallback(() => {
    const prev = statsRef.current;
    const points = BASE_HIT_SCORE + prev.combo * COMBO_BONUS;
    const nextCombo = prev.combo + 1;
    const nextScore = prev.score + points;
    const next: GameStats = {
      ...prev,
      score: nextScore,
      combo: nextCombo,
      maxCombo: Math.max(prev.maxCombo, nextCombo),
      hits: prev.hits + 1
    };

    setStatsSynced(next);

    if (nextScore > highScoreRef.current) {
      highScoreRef.current = nextScore;
      setHighScore(nextScore);
      try {
        localStorage.setItem(STORAGE_KEY, String(nextScore));
      } catch {
        // ignore
      }
    }
  }, [setStatsSynced]);

  const applyMiss = useCallback(() => {
    const prev = statsRef.current;
    const nextLives = Math.max(0, prev.lives - 1);
    const next: GameStats = {
      ...prev,
      combo: 0,
      misses: prev.misses + 1,
      lives: nextLives
    };
    setStatsSynced(next);

    if (nextLives <= 0) {
      endGame();
    }
  }, [endGame, setStatsSynced]);

  const takeNextKey = useCallback(() => {
    if (!keyBagRef.current.length) {
      keyBagRef.current = shuffle(FULL_KEY_SET);
    }
    return keyBagRef.current.pop() || "";
  }, []);

  const spawnBubbleAt = useCallback(
    (spawnAtMs: number) => {
      if (statusRef.current !== "running") {
        return;
      }

      const nextKey = takeNextKey();
      if (!nextKey) {
        return;
      }

      const id = bubbleIdRef.current;
      bubbleIdRef.current += 1;
      const sizePx = Math.round(56 + Math.random() * 34);
      const xPercent = 8 + Math.random() * 84;
      const variant = id % 3;
      const bubble: Bubble = {
        id,
        key: nextKey,
        spawnAtMs,
        xPercent,
        sizePx,
        variant
      };

      setBubblesSynced([...bubblesRef.current, bubble]);
    },
    [setBubblesSynced, takeNextKey]
  );

  const tick = useCallback(
    (timestampMs: number) => {
      if (statusRef.current !== "running") {
        return;
      }

      nowMsRef.current = timestampMs;

      const currentBubbles = bubblesRef.current;
      if (currentBubbles.length) {
        const survivors: Bubble[] = [];
        let missedCount = 0;
        for (const bubble of currentBubbles) {
          if (bubble.poppedAtMs) {
            if (timestampMs - bubble.poppedAtMs <= POP_ANIM_MS) {
              survivors.push(bubble);
            }
            continue;
          }

          const progress = getProgress(bubble, timestampMs);
          if (progress > ESCAPE_PROGRESS) {
            missedCount += 1;
          } else {
            survivors.push(bubble);
          }
        }

        if (survivors.length !== currentBubbles.length) {
          setBubblesSynced(survivors);
        }

        if (missedCount > 0) {
          for (let i = 0; i < missedCount; i += 1) {
            applyMiss();
            if (statusRef.current !== "running") {
              break;
            }
          }
        }
      }

      if (statusRef.current !== "running") {
        return;
      }

      const spawnIntervalAt = (timeMs: number) => BASE_SPAWN_MS / speedAt(timeMs);

      if (nextSpawnAtMsRef.current === null) {
        nextSpawnAtMsRef.current = timestampMs + spawnIntervalAt(timestampMs);
      }

      let activeCount = 0;
      for (const bubble of bubblesRef.current) {
        if (!bubble.poppedAtMs) {
          activeCount += 1;
        }
      }

      let guard = 0;
      while (timestampMs >= (nextSpawnAtMsRef.current ?? 0) && guard < 8) {
        const scheduledAt = nextSpawnAtMsRef.current ?? timestampMs;
        const interval = spawnIntervalAt(scheduledAt);

        if (activeCount < MAX_BUBBLES) {
          spawnBubbleAt(scheduledAt);
          activeCount += 1;
        }

        nextSpawnAtMsRef.current = scheduledAt + interval;
        guard += 1;
      }

      if (guard >= 8 && timestampMs >= (nextSpawnAtMsRef.current ?? 0)) {
        nextSpawnAtMsRef.current = timestampMs + spawnIntervalAt(timestampMs);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [applyMiss, getProgress, setBubblesSynced, spawnBubbleAt, speedAt]
  );

  const startGame = useCallback(() => {
    if (statusRef.current === "running") {
      return;
    }

    stopLoop();

    bubbleIdRef.current = 1;
    keyBagRef.current = [];
    setBubblesSynced([]);
    setStatsSynced(createInitialStats());

    const now = performance.now();
    startedAtMsRef.current = now;
    nextSpawnAtMsRef.current = null;

    setStatus("running");
    statusRef.current = "running";
    nowMsRef.current = now;
    setSpeedDisplay(1);

    spawnBubbleAt(now);
    nextSpawnAtMsRef.current = now + BASE_SPAWN_MS / speedAt(now);
    rafIdRef.current = requestAnimationFrame(tick);
  }, [setBubblesSynced, setStatsSynced, spawnBubbleAt, speedAt, stopLoop, tick]);

  const resetGame = useCallback(() => {
    stopLoop();
    bubbleIdRef.current = 1;
    keyBagRef.current = [];
    startedAtMsRef.current = null;
    nextSpawnAtMsRef.current = null;
    setBubblesSynced([]);
    setStatsSynced(createInitialStats());
    setStatus("idle");
    statusRef.current = "idle";
    const now = performance.now();
    nowMsRef.current = now;
    setSpeedDisplay(1);
  }, [setBubblesSynced, setStatsSynced, stopLoop]);

  const popBubbleForKey = useCallback(
    (key: string) => {
      const now = nowMsRef.current || performance.now();
      const candidates = bubblesRef.current.filter(
        (bubble) => !bubble.poppedAtMs && bubble.key === key
      );

      if (!candidates.length) {
        applyMiss();
        return;
      }

      let best = candidates[0]!;
      let bestProgress = getProgress(best, now);
      for (let i = 1; i < candidates.length; i += 1) {
        const bubble = candidates[i]!;
        const progress = getProgress(bubble, now);
        if (progress > bestProgress) {
          best = bubble;
          bestProgress = progress;
        }
      }

      setBubblesSynced(bubblesRef.current.map((bubble) => (
        bubble.id === best.id ? { ...bubble, poppedAtMs: now } : bubble
      )));
      playPopSound();
      applyHit();
    },
    [applyHit, applyMiss, getProgress, playPopSound, setBubblesSynced]
  );

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

      if (event.code === "Space" && statusRef.current !== "running") {
        event.preventDefault();
        startGame();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        return;
      }

      const key = normalizeKey(event.key, event.code);
      if (!key) {
        return;
      }

      if (statusRef.current !== "running") {
        return;
      }

      popBubbleForKey(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popBubbleForKey, startGame]);

  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  const accuracy = useMemo(() => {
    const total = stats.hits + stats.misses;
    if (!total) {
      return 0;
    }
    return Math.round((stats.hits / total) * 1000) / 10;
  }, [stats.hits, stats.misses]);

  useEffect(() => {
    if (status !== "running") {
      setSpeedDisplay(1);
      return;
    }

    const intervalId = window.setInterval(() => {
      setSpeedDisplay(speedAt(performance.now()));
    }, 180);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [speedAt, status]);

  const bubbleCount = useMemo(() => bubbles.filter((bubble) => !bubble.poppedAtMs).length, [bubbles]);

  return (
    <div className="flex flex-col gap-8">
      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Protected Arcade</p>
            <h2 className="mt-2 font-display text-3xl text-cloud">Bubble Keys</h2>
            <p className="mt-2 text-sm text-cloud/60">
              Pop the rising bubbles by typing their key. Wrong keys and escapes cost a life.
            </p>
          </div>
          <div className="panel-solid rounded-2xl border border-overlay/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Key Set</p>
            <p className="mt-2 text-sm text-cloud/70">A–Z</p>
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
            <span className="chip">
              {status === "running" ? "Running" : status === "over" ? "Game Over" : "Ready"}
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">High Score</p>
              <p className="mt-2 font-display text-3xl text-cloud">{highScore}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={startGame}
                className="btn-primary"
                disabled={status === "running"}
              >
                Start
              </button>
              <button onClick={resetGame} className="btn-outline">
                Reset
              </button>
            </div>

            <p className="text-sm text-cloud/60">
              Tip: press <span className="font-mono text-cloud/80">Space</span> to start.
            </p>

            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Speed</p>
              <p className="mt-2 font-display text-3xl text-cloud">{Math.round(speedDisplay * 100) / 100}x</p>
              <p className="mt-2 text-xs text-cloud/50">
                Spawn + rise rate ramp up over time (caps at {MAX_SPEED}x).
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Score</p>
            <p className="mt-2 font-display text-3xl text-cloud">{stats.score}</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Combo</p>
            <p className="mt-2 font-display text-3xl text-cloud">{stats.combo}</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Max Combo</p>
            <p className="mt-2 font-display text-3xl text-cloud">{stats.maxCombo}</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Accuracy</p>
            <p className="mt-2 font-display text-3xl text-cloud">{accuracy}%</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Lives</p>
            <p className="mt-2 font-display text-3xl text-cloud">{stats.lives}</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Bubbles</p>
            <p className="mt-2 font-display text-3xl text-cloud">{bubbleCount}</p>
          </div>
        </div>
      </section>

      <section className="panel-solid rounded-3xl border border-overlay/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Game Board</p>
            <h3 className="mt-2 font-display text-2xl text-cloud">Bubble Field</h3>
          </div>
          {status === "over" ? (
            <div className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 text-sm text-cloud">
              Game over — press Reset to try again.
            </div>
          ) : null}
        </div>

        <BubbleField
          status={status}
          bubbles={bubbles}
          fieldRef={fieldRef}
          fieldHeightPx={fieldHeightPx}
          getProgress={getProgress}
          startGame={startGame}
          resetGame={resetGame}
        />
      </section>
    </div>
  );
};
