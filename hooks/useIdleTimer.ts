import { useEffect, useRef, useState, useCallback } from 'react';

const WARNING_SECONDS = 60; // avisa 60s antes de deslogar

interface UseIdleTimerOptions {
  timeoutMinutes: number; // tempo total de inatividade
  onLogout: () => void;
  enabled: boolean;        // desativa quando não há usuário logado
}

export const useIdleTimer = ({ timeoutMinutes, onLogout, enabled }: UseIdleTimerOptions) => {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (idleTimerRef.current)    clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
  };

  const startWarningCountdown = useCallback(() => {
    setIsWarning(true);
    setSecondsLeft(WARNING_SECONDS);

    warningTimerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(warningTimerRef.current!);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onLogout]);

  const reset = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    setIsWarning(false);
    setSecondsLeft(WARNING_SECONDS);

    // timeout total - 60s de aviso
    const idleMs = Math.max((timeoutMinutes * 60 - WARNING_SECONDS), 10) * 1000;
    idleTimerRef.current = setTimeout(startWarningCountdown, idleMs);
  }, [enabled, timeoutMinutes, startWarningCountdown]);

  // Reinicia timer a cada evento de atividade do usuário
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (!isWarning) reset(); // não reseta se o aviso já está visível
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    reset(); // inicia o timer na montagem

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearTimers();
    };
  }, [enabled, reset, isWarning]);

  return { isWarning, secondsLeft, reset };
};
