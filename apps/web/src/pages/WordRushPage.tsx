import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { WORD_BANK } from "../utils/wordRushWordBank";

type GameStatus = "idle" | "running" | "over";

const INITIAL_MS = 10_000;
const BONUS_MS = 2_000;
const TICK_MS = 100;

const HIGH_SCORE_KEY = "wordrush.highScore.v1";

const shuffle = <T,>(items: readonly T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const WordRushPage: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [currentWord, setCurrentWord] = useState("");
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(INITIAL_MS);

  const { message, showToast, dismiss } = useToast();

  const statusRef = useRef<GameStatus>(status);
  const endAtMsRef = useRef(0);
  const wordBagRef = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(HIGH_SCORE_KEY) || "0");
      const safe = Number.isFinite(stored) ? stored : 0;
      setHighScore(safe);
    } catch {
      setHighScore(0);
    }
  }, []);

  useEffect(() => {
    if (score <= highScore) {
      return;
    }
    setHighScore(score);
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      // ignore
    }
  }, [score, highScore]);

  const takeNextWord = useCallback(() => {
    if (!wordBagRef.current.length) {
      wordBagRef.current = shuffle(WORD_BANK);
    }
    return wordBagRef.current.pop() ?? WORD_BANK[0] ?? "word";
  }, []);

  const startGame = useCallback(() => {
    dismiss();
    setScore(0);
    setTyped("");
    setCurrentWord(takeNextWord());
    endAtMsRef.current = performance.now() + INITIAL_MS;
    setTimeLeftMs(INITIAL_MS);
    setStatus("running");
    statusRef.current = "running";
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [dismiss, takeNextWord]);

  const resetGame = useCallback(() => {
    dismiss();
    setStatus("idle");
    statusRef.current = "idle";
    setScore(0);
    setTyped("");
    setCurrentWord("");
    setTimeLeftMs(INITIAL_MS);
    endAtMsRef.current = 0;
  }, [dismiss]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const timeLeft = Math.max(0, endAtMsRef.current - performance.now());
      setTimeLeftMs(timeLeft);
      if (timeLeft === 0) {
        setStatus("over");
        statusRef.current = "over";
      }
    }, TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [status]);

  const secondsLeft = useMemo(() => Math.round(timeLeftMs / 100) / 10, [timeLeftMs]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      const next = raw.replace(/[^a-zA-Z]/g, "").toLowerCase();
      setTyped(next);

      if (statusRef.current !== "running") {
        return;
      }

      const now = performance.now();
      const timeLeft = Math.max(0, endAtMsRef.current - now);
      if (timeLeft === 0) {
        setTimeLeftMs(0);
        setStatus("over");
        statusRef.current = "over";
        return;
      }

      if (next !== currentWord) {
        return;
      }

      setScore((prev) => prev + 1);
      setTyped("");
      setCurrentWord(takeNextWord());
      endAtMsRef.current += BONUS_MS;
      setTimeLeftMs(Math.max(0, endAtMsRef.current - performance.now()));
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [currentWord, takeNextWord]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (statusRef.current === "running") {
        event.preventDefault();
        showToast("Paste disabled during Word Rush.");
      }
    },
    [showToast]
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startGame]);

  useEffect(() => {
    if (status === "running") {
      inputRef.current?.focus();
    }
  }, [status, currentWord]);

  return (
    <div className="flex flex-col gap-8">
      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Protected Arcade</p>
            <h2 className="mt-2 font-display text-3xl text-cloud">Word Rush</h2>
            <p className="mt-2 text-sm text-cloud/60">
              Type the word before time hits 0. Each correct word instantly advances and adds +2 seconds.
            </p>
          </div>
          <div className="panel-solid rounded-2xl border border-overlay/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Word Bank</p>
            <p className="mt-2 text-sm text-cloud/70">{WORD_BANK.length} words</p>
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
              <button onClick={startGame} className="btn-primary" disabled={status === "running"}>
                Start
              </button>
              <button onClick={resetGame} className="btn-outline">
                Reset
              </button>
            </div>

            <p className="text-sm text-cloud/60">
              Tip: press <span className="font-mono text-cloud/80">Space</span> to start (when not typing).
            </p>

            <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Anti-cheat</p>
              <p className="mt-2 text-sm text-cloud/70">Paste is disabled while running.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Score</p>
            <p className="mt-2 font-display text-3xl text-cloud">{score}</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Time Left</p>
            <p className="mt-2 font-display text-3xl text-cloud">{secondsLeft.toFixed(1)}s</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Bonus</p>
            <p className="mt-2 font-display text-3xl text-cloud">+2s</p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Tick</p>
            <p className="mt-2 font-display text-3xl text-cloud">0.1s</p>
          </div>
        </div>
      </section>

      <section className="panel-solid rounded-3xl border border-overlay/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Game Board</p>
            <h3 className="mt-2 font-display text-2xl text-cloud">Word Bag</h3>
          </div>
          {status === "over" ? (
            <div className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 text-sm text-cloud">
              Time&apos;s up — press Start to try again.
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Current Word</p>
            <p className="mt-3 font-display text-4xl tracking-wide text-cloud">
              {status === "running" ? currentWord : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-overlay/10 bg-overlay/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Type</p>
            <input
              ref={inputRef}
              value={typed}
              onChange={handleChange}
              onPaste={handlePaste}
              disabled={status !== "running"}
              placeholder={status === "running" ? "Type the word..." : "Press Start to begin."}
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
      </section>

      <Toast message={message} />
    </div>
  );
};
