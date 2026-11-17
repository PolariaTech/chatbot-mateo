'use client';

import { useEffect, useRef } from 'react';

export function debeCorrerChequeoVisible(visibilityState) {
  return visibilityState === 'visible';
}

/**
 * Ejecuta `callback` cada `intervalMs` solo con la pestaña visible,
 * y también al volver a enfocarla.
 */
export function useVisibleInterval(callback, intervalMs, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return undefined;

    const runIfVisible = () => {
      if (debeCorrerChequeoVisible(document.visibilityState)) {
        callbackRef.current();
      }
    };

    const intervalId = window.setInterval(runIfVisible, intervalMs);
    document.addEventListener('visibilitychange', runIfVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', runIfVisible);
    };
  }, [enabled, intervalMs]);
}
