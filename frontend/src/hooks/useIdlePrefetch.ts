import { useEffect, useRef } from 'react';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Pré-carrega os chunks pesados (`RetailerCockpit` e `ShoppingMap`) durante tempo ocioso
 * após login bem-sucedido, evitando travar a pintura inicial e tornando a troca de abas instantânea.
 */
export function useIdlePrefetch(active: boolean): void {
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (!active || prefetchedRef.current || typeof window === 'undefined') return;

    const runPrefetch = () => {
      if (prefetchedRef.current) return;
      prefetchedRef.current = true;
      void import('../components/RetailerCockpit');
      void import('../components/ShoppingMap');
    };

    const win = window as IdleWindow;
    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(runPrefetch, { timeout: 2000 });
      return () => {
        win.cancelIdleCallback?.(idleId);
      };
    }

    const timerId = window.setTimeout(runPrefetch, 800);
    return () => window.clearTimeout(timerId);
  }, [active]);
}
