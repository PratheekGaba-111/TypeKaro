import React, { useCallback, useEffect, useState } from "react";

interface TypingInputPanelProps {
  isRunning: boolean;
  resetSignal: number;
  onTextChange: (text: string) => void;
  onBlockPaste: () => void;
}

export const TypingInputPanel = React.memo<TypingInputPanelProps>(({
  isRunning,
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
      if (isRunning) {
        event.preventDefault();
        onBlockPaste();
      }
    },
    [isRunning, onBlockPaste]
  );

  return (
    <section className="panel-solid panel-contained rounded-3xl p-8 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Your Input</p>
        <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Chars: {text.length}</p>
      </div>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Start typing once the timer is running."
        className="input-field mt-4 h-40 w-full resize-none"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        onPaste={handlePaste}
      />
    </section>
  );
});
