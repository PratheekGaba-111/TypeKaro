import { useCallback, useRef, useState } from "react";

export const useToast = (duration = 2000) => {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const showToast = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setMessage(null);
      }, duration);
    },
    [duration]
  );

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setMessage(null);
  }, []);

  return { message, showToast, dismiss };
};
