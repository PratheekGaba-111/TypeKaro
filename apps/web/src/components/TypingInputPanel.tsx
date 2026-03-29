import React, { useCallback, useEffect, useState } from "react";

type TypingInputVariant = "card" | "embedded";

interface TypingInputPanelProps {
  isRunning: boolean;
  disabled?: boolean;
  blockPaste?: boolean;
  placeholder?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  variant?: TypingInputVariant;
  textareaClassName?: string;
  resetSignal: number;
  onTextChange: (text: string) => void;
  onBlockPaste: () => void;
}

export const TypingInputPanel = React.memo<TypingInputPanelProps>(({
  isRunning,
  disabled = false,
  blockPaste = isRunning,
  placeholder = "Start typing once the timer is running.",
  textareaRef,
  variant = "card",
  textareaClassName,
  resetSignal,
  onTextChange,
  onBlockPaste
}) => {
  const [text, setText] = useState("");

  useEffect(() => {
    setText("");
    onTextChange("");
  }, [resetSignal, onTextChange]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      setText(next);
      onTextChange(next);
    },
    [onTextChange]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (blockPaste) {
        event.preventDefault();
        onBlockPaste();
      }
    },
    [blockPaste, onBlockPaste]
  );

  const textarea = (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      className={textareaClassName || "input-field mt-4 h-40 w-full resize-none"}
      disabled={disabled}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      onPaste={handlePaste}
    />
  );

  if (variant === "embedded") {
    return <div className="w-full">{textarea}</div>;
  }

  return (
    <section className="panel-solid panel-contained rounded-3xl p-8 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Your Input</p>
        <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Chars: {text.length}</p>
      </div>
      {textarea}
    </section>
  );
});
