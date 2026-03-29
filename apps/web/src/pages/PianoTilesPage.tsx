import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Difficulty = "easy" | "medium" | "hard";
type GameStatus = "idle" | "running" | "over";

interface Tile {
  id: number;
  lane: number;
  spawnAtMs: number;
}

interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  lives: number;
}

const HIT_LINE_RATIO = 0.86;
const HIT_WINDOW_PX = 34;
const MISS_THRESHOLD_PROGRESS = 1.08;
const BASE_HIT_SCORE = 100;
const COMBO_BONUS = 10;
const MISS_PENALTY = 50;
const INITIAL_LIVES = 3;
const TILE_HEIGHT_PX = 66;

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;
  keys: string[];
  spawnIntervalMs: number;
  travelMs: number;
}> = {
  easy: {
    label: "Easy",
    keys: ["D", "F", "J", "K"],
    spawnIntervalMs: 700,
    travelMs: 2600
  },
  medium: {
    label: "Medium",
    keys: ["A", "S", "D", "J", "K"],
    spawnIntervalMs: 600,
    travelMs: 2200
  },
  hard: {
    label: "Hard",
    keys: ["A", "S", "D", "F", "J", "K", "L", ";"],
    spawnIntervalMs: 500,
    travelMs: 1900
  }
};

const TILE_GRADIENTS = [
  "from-mint/85 to-mint/20",
  "from-lilac/85 to-lilac/20",
  "from-accent/80 to-accent/20",
  "from-mint/80 to-lilac/25",
  "from-lilac/80 to-mint/25",
  "from-accent/75 to-lilac/20",
  "from-mint/75 to-accent/20",
  "from-lilac/75 to-accent/20"
];

const getHighScoreKey = (difficulty: Difficulty) => `piano.highScore.${difficulty}`;

const createInitialStats = (): GameStats => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  hits: 0,
  misses: 0,
  lives: INITIAL_LIVES
});

const normalizeKey = (rawKey: string, difficulty: Difficulty) => {
  if (!rawKey) {
    return "";
  }
  const upper = rawKey.toUpperCase();
  if (difficulty === "hard" && upper === ":") {
    return ";";
  }
  return upper;
};

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

const PianoLaneBoard = React.memo<{
  status: GameStatus;
  boardRef: React.RefObject<HTMLDivElement>;
  boardHeightPx: number;
  hitLineY: number;
  boardGridStyle: React.CSSProperties;
  keys: string[];
  pressedKeys: Set<string>;
  tilesByLane: Tile[][];
  travelMs: number;
  startGame: () => void;
  resetGame: () => void;
}>(({
  status,
  boardRef,
  boardHeightPx,
  hitLineY,
  boardGridStyle,
  keys,
  pressedKeys,
  tilesByLane,
  travelMs,
  startGame,
  resetGame
}) => {
  const nowMs = useRafTimestamp(status === "running");

  return (
    <div
      ref={boardRef}
      className="relative mt-6 h-[520px] overflow-hidden rounded-3xl border border-overlay/10 bg-black/20"
    >
      <div
        className="absolute left-0 right-0"
        style={{
          top: Math.max(0, hitLineY - HIT_WINDOW_PX),
          height: HIT_WINDOW_PX * 2
        }}
      >
        <div className="h-full w-full bg-mint/5 blur-md" />
      </div>
      <div
        className="absolute left-0 right-0"
        style={{ top: hitLineY }}
      >
        <div className="h-[2px] w-full bg-mint/70 shadow-[0_0_18px_rgba(46,196,182,0.45)]" />
      </div>

      <div className="absolute inset-0 grid" style={boardGridStyle}>
        {keys.map((laneKey, laneIndex) => {
          const isPressed = pressedKeys.has(laneKey);
          const laneTiles = tilesByLane[laneIndex] || [];
          return (
            <div
              key={laneKey}
              className={`relative h-full border-l border-overlay/10 ${laneIndex === 0 ? "border-l-0" : ""} ${isPressed ? "bg-overlay/5" : ""}`}
            >
              {laneTiles.map((tile) => {
                const progress = (nowMs - tile.spawnAtMs) / travelMs;
                const centerY = progress * boardHeightPx;
                const topPx = Math.round(centerY - TILE_HEIGHT_PX / 2);
                const gradient = TILE_GRADIENTS[tile.lane % TILE_GRADIENTS.length]!;
                return (
                  <div
                    key={tile.id}
                    className={`absolute left-2 right-2 top-0 rounded-2xl border border-overlay/20 bg-gradient-to-b ${gradient} shadow-[0_10px_18px_rgba(0,0,0,0.26)]`}
                    style={{
                      transform: `translate3d(0, ${topPx}px, 0)`,
                      willChange: "transform",
                      height: `${TILE_HEIGHT_PX}px`
                    }}
                  />
                );
              })}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div
                  className={`rounded-full border px-4 py-2 text-center font-mono text-sm ${isPressed ? "border-mint/60 bg-mint/20 text-cloud" : "border-overlay/20 bg-overlay/5 text-cloud/80"}`}
                >
                  {laneKey}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {status !== "running" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-3xl border border-overlay/10 bg-black/40 px-8 py-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">
              {status === "over" ? "Game Over" : "Ready"}
            </p>
            <p className="mt-3 text-sm text-cloud/70">
              {status === "over"
                ? "Reset to start a new run."
                : "Press Start, then hit the keys as tiles reach the line."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => void startGame()}
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

export const PianoTilesPage: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [status, setStatus] = useState<GameStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [stats, setStats] = useState<GameStats>(() => createInitialStats());
  const [highScore, setHighScore] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(() => new Set());
  const [boardHeightPx, setBoardHeightPx] = useState(520);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const difficultyRef = useRef<Difficulty>(difficulty);
  const statusRef = useRef<GameStatus>(status);
  const mutedRef = useRef(isMuted);
  const configRef = useRef(DIFFICULTY_CONFIG[difficulty]);
  const keyToLaneRef = useRef<Record<string, number>>({});

  const tilesRef = useRef<Tile[]>(tiles);
  const statsRef = useRef<GameStats>(stats);
  const highScoreRef = useRef(highScore);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const boardHeightRef = useRef(boardHeightPx);
  const nowMsRef = useRef(performance.now());

  const rafIdRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const tileIdRef = useRef(1);

  const audioRef = useRef<{
    ctx: AudioContext;
    master: GainNode;
    intervalId: number;
  } | null>(null);

  const config = DIFFICULTY_CONFIG[difficulty];

  useEffect(() => {
    difficultyRef.current = difficulty;
    configRef.current = DIFFICULTY_CONFIG[difficulty];
    const mapping: Record<string, number> = {};
    configRef.current.keys.forEach((key, index) => {
      mapping[key] = index;
    });
    keyToLaneRef.current = mapping;
  }, [difficulty]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    boardHeightRef.current = boardHeightPx;
  }, [boardHeightPx]);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(getHighScoreKey(difficulty)) || "0");
      const safe = Number.isFinite(stored) ? stored : 0;
      highScoreRef.current = safe;
      setHighScore(safe);
    } catch {
      highScoreRef.current = 0;
      setHighScore(0);
    }
  }, [difficulty]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const next = Math.max(260, Math.round(el.getBoundingClientRect().height));
      setBoardHeightPx(next);
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const setTilesSynced = useCallback((next: Tile[]) => {
    tilesRef.current = next;
    setTiles(next);
  }, []);

  const setStatsSynced = useCallback((next: GameStats) => {
    statsRef.current = next;
    setStats(next);
  }, []);

  const clearPressedKeys = useCallback(() => {
    const next = new Set<string>();
    pressedKeysRef.current = next;
    setPressedKeys(next);
  }, []);

  const stopLoops = useCallback(() => {
    if (spawnTimerRef.current !== null) {
      window.clearInterval(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const stopMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    window.clearInterval(audio.intervalId);
    audio.master.disconnect();
    audio.ctx.close().catch(() => {
      // ignore
    });
    audioRef.current = null;
  }, []);

  const endGame = useCallback(() => {
    stopLoops();
    stopMusic();
    clearPressedKeys();
    setStatus("over");
    statusRef.current = "over";
  }, [clearPressedKeys, stopLoops, stopMusic]);

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
        localStorage.setItem(getHighScoreKey(difficultyRef.current), String(nextScore));
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
      score: Math.max(0, prev.score - MISS_PENALTY),
      combo: 0,
      misses: prev.misses + 1,
      lives: nextLives
    };
    setStatsSynced(next);

    if (nextLives <= 0) {
      endGame();
    }
  }, [endGame, setStatsSynced]);

  const spawnTile = useCallback(() => {
    const cfg = configRef.current;
    const laneCount = cfg.keys.length;
    if (!laneCount) {
      return;
    }
    const lane = Math.floor(Math.random() * laneCount);
    const now = performance.now();
    const tile: Tile = { id: tileIdRef.current++, lane, spawnAtMs: now };
    setTilesSynced([...tilesRef.current, tile]);
  }, [setTilesSynced]);

  const attemptHitLane = useCallback(
    (lane: number) => {
      const cfg = configRef.current;
      const boardHeight = boardHeightRef.current;
      if (boardHeight <= 0) {
        applyMiss();
        return;
      }

      const now = nowMsRef.current || performance.now();
      const hitLineY = boardHeight * HIT_LINE_RATIO;

      const laneTiles = tilesRef.current.filter((tile) => tile.lane === lane);
      if (!laneTiles.length) {
        applyMiss();
        return;
      }

      let bestTile: Tile | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const tile of laneTiles) {
        const progress = (now - tile.spawnAtMs) / cfg.travelMs;
        const centerY = progress * boardHeight;
        const distance = Math.abs(centerY - hitLineY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTile = tile;
        }
      }

      if (!bestTile || bestDistance > HIT_WINDOW_PX) {
        applyMiss();
        return;
      }

      setTilesSynced(tilesRef.current.filter((tile) => tile.id !== bestTile.id));
      applyHit();
    },
    [applyHit, applyMiss, setTilesSynced]
  );

  const tick = useCallback(
    (timestampMs: number) => {
      if (statusRef.current !== "running") {
        return;
      }

      nowMsRef.current = timestampMs;

      const cfg = configRef.current;
      const currentTiles = tilesRef.current;
      if (currentTiles.length) {
        const survivors: Tile[] = [];
        let missedCount = 0;

        for (const tile of currentTiles) {
          const progress = (timestampMs - tile.spawnAtMs) / cfg.travelMs;
          if (progress > MISS_THRESHOLD_PROGRESS) {
            missedCount += 1;
          } else {
            survivors.push(tile);
          }
        }

        if (missedCount > 0) {
          setTilesSynced(survivors);
          for (let i = 0; i < missedCount; i += 1) {
            applyMiss();
            if (statusRef.current !== "running") {
              break;
            }
          }
        }
      }

      if (statusRef.current === "running") {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    },
    [applyMiss, setTilesSynced]
  );

  const startLoops = useCallback((spawnImmediately: boolean) => {
    stopLoops();
    if (spawnImmediately) {
      spawnTile();
    }
    spawnTimerRef.current = window.setInterval(spawnTile, configRef.current.spawnIntervalMs);
    rafIdRef.current = requestAnimationFrame(tick);
  }, [spawnTile, stopLoops, tick]);

  const startMusic = useCallback(async () => {
    if (mutedRef.current) {
      return;
    }
    if (audioRef.current) {
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
      if (ctx.state !== "running") {
        setAudioAvailable(false);
        await ctx.close();
        return;
      }

      setAudioAvailable(true);
      const master = ctx.createGain();
      master.gain.value = 1;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      master.connect(compressor);
      compressor.connect(ctx.destination);

      const notes = [261.63, 329.63, 392.0, 523.25];
      let step = 0;

      const scheduleNote = (frequency: number, startAt: number, peakGain: number) => {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(frequency, startAt);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

        osc.connect(gain);
        gain.connect(master);
        osc.start(startAt);
        osc.stop(startAt + 0.18);
      };

      const play = () => {
        if (!audioRef.current) {
          return;
        }
        const startAt = ctx.currentTime + 0.01;
        const n0 = notes[step % notes.length]!;
        const n1 = notes[(step + 1) % notes.length]!;
        const n2 = notes[(step + 2) % notes.length]!;
        step += 1;

        scheduleNote(n0, startAt, 0.22);
        scheduleNote(n1, startAt + 0.14, 0.2);
        scheduleNote(n2, startAt + 0.28, 0.18);
        scheduleNote(n0 / 2, startAt, 0.12);
      };

      const intervalId = window.setInterval(play, configRef.current.spawnIntervalMs);
      audioRef.current = { ctx, master, intervalId };
      play();
    } catch {
      // ignore audio failures (unsupported / blocked)
      audioRef.current = null;
      setAudioAvailable(false);
    }
  }, []);

  const startGame = useCallback(async () => {
    if (statusRef.current === "running") {
      return;
    }

    tileIdRef.current = 1;
    setTilesSynced([]);
    setStatsSynced(createInitialStats());
    clearPressedKeys();

    setStatus("running");
    statusRef.current = "running";
    const now = performance.now();
    nowMsRef.current = now;

    startLoops(true);
    await startMusic();
  }, [clearPressedKeys, setStatsSynced, setTilesSynced, startLoops, startMusic]);

  const resetGame = useCallback(() => {
    stopLoops();
    stopMusic();
    tileIdRef.current = 1;
    setTilesSynced([]);
    setStatsSynced(createInitialStats());
    clearPressedKeys();
    setStatus("idle");
    statusRef.current = "idle";
    const now = performance.now();
    nowMsRef.current = now;
  }, [clearPressedKeys, setStatsSynced, setTilesSynced, stopLoops, stopMusic]);

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

      if (event.code === "Space") {
        event.preventDefault();
        void startGame();
        return;
      }

      const key = normalizeKey(event.key, difficultyRef.current);
      if (key.length !== 1 || !key.trim()) {
        return;
      }

      if (!pressedKeysRef.current.has(key)) {
        const next = new Set(pressedKeysRef.current);
        next.add(key);
        pressedKeysRef.current = next;
        setPressedKeys(next);
      }

      if (statusRef.current !== "running") {
        return;
      }

      const lane = keyToLaneRef.current[key];
      if (typeof lane !== "number") {
        applyMiss();
        return;
      }

      attemptHitLane(lane);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = normalizeKey(event.key, difficultyRef.current);
      if (key.length !== 1 || !key.trim()) {
        return;
      }
      if (!pressedKeysRef.current.has(key)) {
        return;
      }
      const next = new Set(pressedKeysRef.current);
      next.delete(key);
      pressedKeysRef.current = next;
      setPressedKeys(next);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [applyMiss, attemptHitLane, startGame]);

  useEffect(() => {
    return () => {
      stopLoops();
      stopMusic();
    };
  }, [stopLoops, stopMusic]);

  const accuracy = useMemo(() => {
    const total = stats.hits + stats.misses;
    if (!total) {
      return 0;
    }
    return Math.round((stats.hits / total) * 1000) / 10;
  }, [stats.hits, stats.misses]);

  const boardGridStyle = { gridTemplateColumns: `repeat(${config.keys.length}, minmax(0, 1fr))` };

  const hitLineY = boardHeightPx * HIT_LINE_RATIO;

  const tilesByLane = useMemo(() => {
    const laneCount = config.keys.length;
    const buckets: Tile[][] = Array.from({ length: laneCount }, () => []);
    for (const tile of tiles) {
      if (tile.lane >= 0 && tile.lane < laneCount) {
        buckets[tile.lane]!.push(tile);
      }
    }
    return buckets;
  }, [difficulty, tiles]);

  return (
    <div className="flex flex-col gap-8">
      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Protected Arcade</p>
            <h2 className="mt-2 font-display text-3xl text-cloud">Piano Tiles</h2>
            <p className="mt-2 text-sm text-cloud/60">
              Best on a physical keyboard. Hit the lane keys when tiles cross the line.
            </p>
          </div>
          <div className="panel-solid rounded-2xl border border-overlay/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Keys</p>
            <p className="mt-2 font-mono text-sm text-cloud">
              {config.keys.join(" ")}
            </p>
            <p className="mt-2 text-xs text-cloud/50">
              Mobile hint: rotate + use an external keyboard.
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
            <span className="chip">
              {status === "running" ? "Running" : status === "over" ? "Game Over" : "Ready"}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cloud/60">Difficulty</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => {
                  const next = key as Difficulty;
                  const isActive = next === difficulty;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (next === difficultyRef.current) {
                          return;
                        }
                        resetGame();
                        setDifficulty(next);
                      }}
                      className={`card-option ${isActive ? "card-option-active" : ""}`}
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">{cfg.label}</p>
                      <p className="mt-2 font-mono text-sm text-cloud/80">{cfg.keys.join(" ")}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void startGame()}
                className="btn-primary"
                disabled={status === "running"}
              >
                Start
              </button>
              <button onClick={resetGame} className="btn-outline">
                Reset
              </button>
              <button
                onClick={() => {
                  setIsMuted((prev) => {
                    const next = !prev;
                    mutedRef.current = next;
                    if (next) {
                      stopMusic();
                    } else if (statusRef.current === "running") {
                      void startMusic();
                    }
                    return next;
                  });
                }}
                className="btn-outline"
              >
                {isMuted ? "Unmute Music" : "Mute Music"}
              </button>
            </div>

            <p className="text-sm text-cloud/60">
              Rule: 3 misses ends the run. Hit scores {BASE_HIT_SCORE} + combo × {COMBO_BONUS}. Miss is -{MISS_PENALTY}.
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-cloud/50">
              Space: Start
              {!audioAvailable ? " • Music blocked/unavailable" : ""}
            </p>
          </div>
        </div>

        <div className="panel-solid rounded-3xl border border-overlay/10 p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Stats</p>
          <h3 className="mt-2 font-display text-2xl text-cloud">Performance</h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Score</p>
              <p className="mt-2 font-display text-3xl text-cloud">{stats.score}</p>
            </div>
            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">High Score</p>
              <p className="mt-2 font-display text-3xl text-cloud">{highScore}</p>
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
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Hits</p>
              <p className="mt-2 font-display text-3xl text-cloud">{stats.hits}</p>
            </div>
            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Misses</p>
              <p className="mt-2 font-display text-3xl text-cloud">{stats.misses}</p>
            </div>
            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Accuracy</p>
              <p className="mt-2 font-display text-3xl text-cloud">{accuracy}%</p>
            </div>
            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Lives</p>
              <p className="mt-2 font-display text-3xl text-cloud">{stats.lives}</p>
            </div>
          </div>

          <p className="mt-5 text-sm text-cloud/60">
            Timing window: ±{HIT_WINDOW_PX}px around the line. Tiles that pass the board count as a miss.
          </p>
        </div>
      </section>

      <section className="panel-solid rounded-3xl border border-overlay/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Game Board</p>
            <h3 className="mt-2 font-display text-2xl text-cloud">Lanes</h3>
          </div>
          {status === "over" ? (
            <div className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 text-sm text-cloud">
              Game over — press Reset to try again.
            </div>
          ) : null}
        </div>

        <PianoLaneBoard
          status={status}
          boardRef={boardRef}
          boardHeightPx={boardHeightPx}
          hitLineY={hitLineY}
          boardGridStyle={boardGridStyle}
          keys={config.keys}
          pressedKeys={pressedKeys}
          tilesByLane={tilesByLane}
          travelMs={config.travelMs}
          startGame={() => void startGame()}
          resetGame={resetGame}
        />
      </section>
    </div>
  );
};
