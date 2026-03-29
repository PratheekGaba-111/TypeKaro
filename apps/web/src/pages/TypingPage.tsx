import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { AnalyzeResponse, HistoryResponse, SessionDTO } from "@app/shared";
import { StatCard } from "../components/StatCard";
import { ProgressBar } from "../components/ProgressBar";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { calculateXp, summarizeGamification } from "../utils/gamification";
import { drills, getDrill, type DrillId } from "../utils/drills";
import { TypingInputPanel } from "../components/TypingInputPanel";

const RESULT_KEY = "last_result";
const BONUS_XP = 25;

type LabPhase = "idle" | "countdown" | "ready" | "running";

const shuffleIndices = (length: number, avoidIndex?: number) => {
  if (length <= 1) {
    return [0];
  }
  const order = Array.from({ length }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (typeof avoidIndex === "number" && order.length > 1 && order[0] === avoidIndex) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
};

export const TypingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drillId, setDrillId] = useState<DrillId>("accuracy");
  const [sampleIndex, setSampleIndex] = useState(0);
  const [phase, setPhase] = useState<LabPhase>("idle");
  const [countdownLeft, setCountdownLeft] = useState(3);
  const [typedText, setTypedText] = useState("");
  const [showDrillPicker, setShowDrillPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [pasteHint, setPasteHint] = useState(false);
  const [hudNowMs, setHudNowMs] = useState(() => Date.now());
  const typedTextRef = useRef("");
  const firstTypedAtRef = useRef<number | null>(null);
  const lastTypedAtRef = useRef<number | null>(null);
  const promptOrderRef = useRef<number[]>([]);
  const promptCursorRef = useRef(0);
  const phaseRef = useRef<LabPhase>(phase);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const { message, showToast } = useToast();

  const activeDrill = useMemo(() => getDrill(drillId), [drillId]);
  const targetText = useMemo(
    () => activeDrill.samples[sampleIndex] || activeDrill.samples[0],
    [activeDrill, sampleIndex]
  );
  const gamification = useMemo(() => summarizeGamification(sessions), [sessions]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await api.get<HistoryResponse>("/api/history");
      setSessions(response.sessions);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get("drill");
    if (!requested) {
      return;
    }
    const safe = drills.some((drill) => drill.id === requested) ? (requested as DrillId) : null;
    if (safe && safe !== drillId) {
      setDrillId(safe);
    }
  }, [location.search, drillId]);

  useEffect(() => {
    const order = shuffleIndices(activeDrill.samples.length);
    promptOrderRef.current = order;
    promptCursorRef.current = 0;
    setSampleIndex(order[0] ?? 0);
  }, [activeDrill]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const isRunning = phase === "running";
  const isArmed = phase === "ready" || phase === "running";

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (isModifier && ["c", "v", "x"].includes(key)) {
        event.preventDefault();
        showToast("Copy/paste disabled during active test.");
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      showToast("Right-click disabled during active test.");
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isRunning, showToast]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }
    const intervalId = window.setInterval(() => {
      setHudNowMs(Date.now());
    }, 200);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  const startCountdown = useCallback(() => {
    setShowDrillPicker(false);
    setResetSignal((prev) => prev + 1);
    firstTypedAtRef.current = null;
    lastTypedAtRef.current = null;
    typedTextRef.current = "";
    setTypedText("");
    setCountdownLeft(3);
    setPhase("countdown");
    setError(null);
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    if (phase !== "countdown") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCountdownLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          setPhase("ready");
          requestAnimationFrame(() => {
            workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            textareaRef.current?.focus();
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [phase]);

  const handleDrillChange = (nextId: DrillId) => {
    setShowDrillPicker(false);
    setDrillId(nextId);
    setResetSignal((prev) => prev + 1);
    firstTypedAtRef.current = null;
    lastTypedAtRef.current = null;
    typedTextRef.current = "";
    setTypedText("");
    setPhase("idle");
  };

  const handleNewPrompt = () => {
    setShowDrillPicker(false);
    const order = promptOrderRef.current;
    if (!order.length) {
      const nextOrder = shuffleIndices(activeDrill.samples.length);
      promptOrderRef.current = nextOrder;
      promptCursorRef.current = 0;
      setSampleIndex(nextOrder[0] ?? 0);
    } else {
      const nextCursor = promptCursorRef.current + 1;
      if (nextCursor >= order.length) {
        const nextOrder = shuffleIndices(activeDrill.samples.length, sampleIndex);
        promptOrderRef.current = nextOrder;
        promptCursorRef.current = 0;
        setSampleIndex(nextOrder[0] ?? 0);
      } else {
        promptCursorRef.current = nextCursor;
        setSampleIndex(order[nextCursor]);
      }
    }
    setResetSignal((prev) => prev + 1);
    firstTypedAtRef.current = null;
    lastTypedAtRef.current = null;
    typedTextRef.current = "";
    setTypedText("");
    setPhase("idle");
  };

  const handleAnalyze = useCallback(async () => {
    if (phaseRef.current !== "running") {
      setError("Start the countdown, then type before submitting.");
      return;
    }

    const typedText = typedTextRef.current;
    if (!typedText.trim()) {
      setError("Type the prompt before submitting.");
      return;
    }
    if (firstTypedAtRef.current === null || lastTypedAtRef.current === null) {
      setError("Type the prompt before submitting.");
      return;
    }
    const timeTakenMs = Math.max(0, lastTypedAtRef.current - firstTypedAtRef.current);
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<AnalyzeResponse>("/api/analyze", {
        targetText,
        typedText,
        timeTakenMs
      });
      const baseXp = calculateXp(response.metrics.netWpm, response.metrics.accuracy);
      const meetsAccuracy =
        !activeDrill.targetAccuracy || response.metrics.accuracy >= activeDrill.targetAccuracy;
      const meetsWpm = !activeDrill.targetWpm || response.metrics.wpm >= activeDrill.targetWpm;
      const meetsTarget = meetsAccuracy && meetsWpm;
      const bonusXp = meetsTarget ? BONUS_XP : 0;
      const totalXp = baseXp + bonusXp;
      localStorage.setItem(RESULT_KEY, JSON.stringify({
        ...response,
        targetText,
        typedText,
        timeTakenMs,
        drillId: activeDrill.id,
        drillLabel: activeDrill.label,
        targetAccuracy: activeDrill.targetAccuracy || null,
        targetWpm: activeDrill.targetWpm || null,
        baseXp,
        bonusXp,
        totalXp,
        meetsTarget
      }));
      navigate("/results");
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, [activeDrill, navigate, targetText]);

  const handleTextChange = useCallback(
    (text: string) => {
      typedTextRef.current = text;
      setTypedText(text);
      const now = Date.now();

      if (phaseRef.current === "ready") {
        if (text.length > 0 && firstTypedAtRef.current === null) {
          firstTypedAtRef.current = now;
          lastTypedAtRef.current = now;
          setPhase("running");
        }
        return;
      }

      if (phaseRef.current === "running") {
        if (firstTypedAtRef.current === null && text.length > 0) {
          firstTypedAtRef.current = now;
        }
        if (firstTypedAtRef.current !== null) {
          lastTypedAtRef.current = now;
        }
      }
    },
    []
  );

  const handleBlockPaste = useCallback(() => {
    showToast("Paste blocked during active run.");
    setPasteHint(true);
    window.setTimeout(() => setPasteHint(false), 2500);
  }, [showToast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        const readyToSubmit =
          phaseRef.current === "running" &&
          Boolean(typedTextRef.current.trim()) &&
          firstTypedAtRef.current !== null &&
          lastTypedAtRef.current !== null;
        if (readyToSubmit) {
          event.preventDefault();
          handleAnalyze();
        }
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

      if (event.code === "Space" && phaseRef.current === "idle") {
        event.preventDefault();
        startCountdown();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAnalyze, startCountdown]);

  const elapsedMs = useMemo(() => {
    if (firstTypedAtRef.current === null) return 0;
    return Math.max(0, hudNowMs - firstTypedAtRef.current);
  }, [hudNowMs]);

  const liveWpm = useMemo(() => {
    const minutes = elapsedMs / 60_000;
    if (minutes <= 0) return 0;
    const words = typedText.length / 5;
    return Math.round((words / minutes) * 10) / 10;
  }, [elapsedMs, typedText.length]);

  const canSubmit =
    isRunning &&
    !loading &&
    Boolean(typedText.trim()) &&
    firstTypedAtRef.current !== null &&
    lastTypedAtRef.current !== null;

  const statusChip =
    phase === "running"
      ? { label: "Running", className: "chip chip-mint" }
      : phase === "ready"
      ? { label: "Ready", className: "chip chip-lilac" }
      : phase === "countdown"
      ? { label: "Countdown", className: "chip" }
      : { label: "Idle", className: "chip" };

  const labRingClass =
    phase === "running"
      ? "ring-2 ring-mint/20"
      : phase === "countdown"
      ? "ring-2 ring-lilac/20"
      : "ring-1 ring-overlay/10";

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div
          ref={workspaceRef}
          className={`gradient-panel gradient-panel-lab rounded-3xl p-8 shadow-glow transition-shadow ${labRingClass}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Typing Workspace</p>
              <h2 className="mt-2 font-display text-2xl text-cloud">Typing Lab</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip chip-lilac">{activeDrill.label}</span>
              <button
                onClick={handleNewPrompt}
                className="btn-outline btn-outline-sm"
              >
                New prompt
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-overlay/10 bg-overlay/5 p-5 max-h-[30vh] overflow-auto md:max-h-none md:overflow-visible">
            <p className="text-lg leading-relaxed text-cloud/85 md:text-xl whitespace-pre-wrap">
              {targetText}
            </p>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Your Input</p>
              <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">
                Chars: {typedText.length} / {targetText.length}
              </p>
            </div>
            <TypingInputPanel
              variant="embedded"
              isRunning={isRunning}
              disabled={phase === "idle" || phase === "countdown"}
              blockPaste={isArmed}
              placeholder={
                phase === "idle"
                  ? "Press Space or Start to begin."
                  : phase === "countdown"
                  ? "Countdown running..."
                  : phase === "ready"
                  ? "Type when ready — timing starts on your first keystroke."
                  : "Keep typing..."
              }
              textareaRef={textareaRef}
              textareaClassName="input-field mt-3 h-44 w-full resize-none md:h-52"
              resetSignal={resetSignal}
              onTextChange={handleTextChange}
              onBlockPaste={handleBlockPaste}
            />
          </div>
        </div>
        <div className={`gradient-panel gradient-panel-lab flex flex-col justify-between rounded-3xl p-8 shadow-glow transition-shadow ${labRingClass}`}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Session Controls</p>
            <h3 className="mt-2 font-display text-2xl">Timer</h3>
            <p className="mt-4 text-sm text-cloud/70">
              Press Space or Start to begin. You get a 3-second countdown, then timing begins on your first keystroke.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-cloud/55">
              Space = start • Ctrl+Enter = submit
            </p>
            <div className="mt-5 rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={statusChip.className}>{statusChip.label}</span>
                {pasteHint ? <span className="text-xs text-accent">Paste blocked during run</span> : null}
              </div>
              {phase === "countdown" ? (
                <div className="mt-5 text-center">
                  <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Get ready</p>
                  <p className="mt-2 font-display text-5xl text-cloud">{countdownLeft}</p>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-cloud/70">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Elapsed</p>
                    <p className="mt-1 font-display text-lg text-cloud">
                      {(elapsedMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Live WPM</p>
                    <p className="mt-1 font-display text-lg text-cloud">{liveWpm}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Chars</p>
                    <p className="mt-1 font-display text-lg text-cloud">
                      {typedText.length} / {targetText.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Shortcut</p>
                    <p className="mt-1 text-sm text-cloud/70">Ctrl+Enter</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={startCountdown}
              className="btn-primary"
            >
              {phase === "idle" ? "Start (Space)" : "Restart"}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!canSubmit}
              className="btn-outline"
            >
              {loading ? "Analyzing..." : "Submit"}
            </button>
            {!canSubmit ? (
              <p className="text-xs text-cloud/60">Start → type → Ctrl+Enter to submit</p>
            ) : null}
            {error ? <p className="text-sm text-accent">{error}</p> : null}
          </div>
        </div>
      </section>

      {phase === "idle" ? (
        <>
          <section className="gradient-panel rounded-3xl p-8 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Training Hub</p>
                <h2 className="mt-2 font-display text-2xl">Choose a Drill</h2>
              </div>
              <p className="text-sm text-cloud/60">Bonus +{BONUS_XP} XP when target met</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {drills.map((drill) => (
                <button
                  key={drill.id}
                  onClick={() => handleDrillChange(drill.id)}
                  className={`card-option ${drill.id === activeDrill.id ? "card-option-active" : ""}`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">{drill.label}</p>
                  <p className="mt-2 text-sm">{drill.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-cloud/60">
              {activeDrill.targetAccuracy ? (
                <span>Target Accuracy: {activeDrill.targetAccuracy}%</span>
              ) : null}
              {activeDrill.targetWpm ? <span>Target WPM: {activeDrill.targetWpm}</span> : null}
              <span>Prompt: {sampleIndex + 1}/{activeDrill.samples.length}</span>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <StatCard
              label="Level"
              value={`Lv ${gamification.level}`}
              hint={`${gamification.xpToNext} XP to next`}
            />
            <StatCard
              label="Streak"
              value={`${gamification.streak} days`}
              hint="Keep the chain alive"
            />
            <div className="gradient-panel rounded-2xl p-6 shadow-glow">
              <ProgressBar
                label="XP Progress"
                value={gamification.currentLevelXp}
                max={500}
              />
              <p className="mt-3 text-xs text-cloud/60">
                Next unlock: Level {gamification.level + 1}
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="panel-solid rounded-3xl border border-overlay/10 p-6 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Quick settings</p>
              <h3 className="mt-2 font-display text-xl text-cloud">{activeDrill.label}</h3>
              <p className="mt-1 text-sm text-cloud/60">Bonus +{BONUS_XP} XP when target met</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip">Lv {gamification.level}</span>
              <span className="chip">Streak {gamification.streak}d</span>
              <button
                onClick={() => setShowDrillPicker((prev) => !prev)}
                className="btn-outline btn-outline-sm"
              >
                {showDrillPicker ? "Close drills" : "Change drill"}
              </button>
            </div>
          </div>
          {showDrillPicker ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {drills.map((drill) => (
                <button
                  key={drill.id}
                  onClick={() => handleDrillChange(drill.id)}
                  className={`card-option ${drill.id === activeDrill.id ? "card-option-active" : ""}`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">{drill.label}</p>
                  <p className="mt-2 text-sm">{drill.description}</p>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <Toast message={message} />
    </div>
  );
};
