import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [drillId, setDrillId] = useState<DrillId>("accuracy");
  const [sampleIndex, setSampleIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const typedTextRef = useRef("");
  const firstTypedAtRef = useRef<number | null>(null);
  const lastTypedAtRef = useRef<number | null>(null);
  const promptOrderRef = useRef<number[]>([]);
  const promptCursorRef = useRef(0);
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
    const order = shuffleIndices(activeDrill.samples.length);
    promptOrderRef.current = order;
    promptCursorRef.current = 0;
    setSampleIndex(order[0] ?? 0);
  }, [activeDrill]);

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

  const handleStart = () => {
    setResetSignal((prev) => prev + 1);
    firstTypedAtRef.current = null;
    lastTypedAtRef.current = null;
    setIsRunning(true);
    setError(null);
  };

  const handleDrillChange = (nextId: DrillId) => {
    setDrillId(nextId);
    setResetSignal((prev) => prev + 1);
    firstTypedAtRef.current = null;
    lastTypedAtRef.current = null;
    setIsRunning(false);
  };

  const handleNewPrompt = () => {
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
    setIsRunning(false);
  };

  const handleAnalyze = async () => {
    if (!isRunning) {
      setError("Start the session before submitting.");
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
      setIsRunning(false);
    }
  };

  const handleTextChange = useCallback(
    (text: string) => {
      typedTextRef.current = text;
      if (!isRunning) {
        return;
      }
      const now = Date.now();
      if (firstTypedAtRef.current === null && text.length > 0) {
        firstTypedAtRef.current = now;
      }
      if (firstTypedAtRef.current !== null) {
        lastTypedAtRef.current = now;
      }
    },
    [isRunning]
  );

  const handleBlockPaste = useCallback(() => {
    showToast("Paste disabled during active test.");
  }, [showToast]);

  return (
    <div className="flex flex-col gap-8">
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
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Target Text</p>
              <h2 className="mt-2 font-display text-2xl">Typing Lab</h2>
            </div>
            <button
              onClick={handleNewPrompt}
              className="btn-outline btn-outline-sm"
            >
              New prompt
            </button>
          </div>
          <p className="mt-6 text-lg leading-relaxed text-cloud/80">{targetText}</p>
        </div>
        <div className="gradient-panel flex flex-col justify-between rounded-3xl p-8 shadow-glow">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Session Controls</p>
            <h3 className="mt-2 font-display text-2xl">Timer</h3>
            <p className="mt-4 text-sm text-cloud/70">
              Press start, then type. Timing begins on your first keystroke and ends on your last.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStart}
              className="btn-primary"
            >
              Start
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn-outline"
            >
              {loading ? "Analyzing..." : "Submit"}
            </button>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
          </div>
        </div>
      </section>

      <TypingInputPanel
        isRunning={isRunning}
        resetSignal={resetSignal}
        onTextChange={handleTextChange}
        onBlockPaste={handleBlockPaste}
      />

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard label="Current Prompt" value={`${sampleIndex + 1}/${activeDrill.samples.length}`} />
        <StatCard label="Active Drill" value={activeDrill.label} />
        <StatCard label="Timer Status" value={isRunning ? "Running" : "Idle"} />
      </section>

      <Toast message={message} />
    </div>
  );
};
