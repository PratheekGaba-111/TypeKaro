import React from "react";

interface ToastProps {
  message: string | null;
}

export const Toast = React.memo<ToastProps>(({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="toast fixed bottom-6 right-6 z-50">
      {message}
    </div>
  );
});
