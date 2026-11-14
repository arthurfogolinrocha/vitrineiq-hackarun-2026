import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiErro, api } from '../services/api';
import { LostSaleReason, ZoneId } from '../types';

export const OFFLINE_QUEUE_STORAGE_KEY = 'vitrineiq.offlineQueue';

export type OfflineQueueItem =
  | {
      id: string;
      kind: 'venda';
      zoneId: ZoneId;
      storeName: string;
      createdAt: string;
    }
  | {
      id: string;
      kind: 'perda';
      zoneId: ZoneId;
      storeName: string;
      reason: LostSaleReason;
      note?: string;
      createdAt: string;
    };

/** Retorna true para erros 4xx (autenticação/validação), que não devem ser reenfileirados. */
export function isClientHttpError(err: unknown): boolean {
  return err instanceof ApiErro && err.status >= 400 && err.status < 500;
}

/** Lê a fila offline persistida em localStorage com tolerância a falhas de storage/JSON. */
export function readOfflineQueue(storage?: Storage): OfflineQueueItem[] {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!target) return [];
    const raw = target.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineQueueItem[]) : [];
  } catch {
    return [];
  }
}

/** Persiste a fila offline no storage; remove a chave quando estiver vazia. */
export function writeOfflineQueue(items: OfflineQueueItem[], storage?: Storage): void {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!target) return;
    if (items.length === 0) {
      target.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
    } else {
      target.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Storage indisponível (modo privado ou quota excedida): mantém apenas em memória
  }
}

interface UseOfflineQueueOptions {
  /** Ativo apenas quando há sessão autenticada fora do modo demonstração. */
  enabled: boolean;
  /** Callback acionado após reenviar pelo menos um evento pendente com sucesso. */
  onFlushed?: (flushedCount: number) => void;
}

/**
 * Gerencia fila offline resiliente em `localStorage` (`vitrineiq.offlineQueue`) para
 * vendas concluídas e vendas perdidas quando a rede ou API falhar (exceto erros 4xx).
 */
export function useOfflineQueue({ enabled, onFlushed }: UseOfflineQueueOptions) {
  const [queue, setQueue] = useState<OfflineQueueItem[]>(() => readOfflineQueue());
  const queueRef = useRef<OfflineQueueItem[]>(queue);
  queueRef.current = queue;
  const flushingRef = useRef(false);
  const onFlushedRef = useRef(onFlushed);
  onFlushedRef.current = onFlushed;

  const updateQueue = useCallback((updater: (prev: OfflineQueueItem[]) => OfflineQueueItem[]) => {
    const next = updater(queueRef.current);
    queueRef.current = next;
    setQueue(next);
    writeOfflineQueue(next);
  }, []);

  const enqueueSale = useCallback(
    (zoneId: ZoneId, storeName: string) => {
      if (!enabled) return;
      const item: OfflineQueueItem = {
        id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind: 'venda',
        zoneId,
        storeName,
        createdAt: new Date().toISOString(),
      };
      updateQueue((prev) => [...prev, item]);
    },
    [enabled, updateQueue]
  );

  const enqueueLoss = useCallback(
    (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) => {
      if (!enabled) return;
      const item: OfflineQueueItem = {
        id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind: 'perda',
        zoneId,
        storeName,
        reason,
        note,
        createdAt: new Date().toISOString(),
      };
      updateQueue((prev) => [...prev, item]);
    },
    [enabled, updateQueue]
  );

  const flushQueue = useCallback(async (): Promise<number> => {
    if (!enabled || flushingRef.current) return 0;
    const snapshot = queueRef.current;
    if (snapshot.length === 0) return 0;

    flushingRef.current = true;
    let flushedCount = 0;

    try {
      for (const item of snapshot) {
        try {
          if (item.kind === 'venda') {
            await api.registrarVenda(item.zoneId, item.storeName);
          } else {
            await api.registrarPerda(item.zoneId, item.storeName, item.reason, item.note);
          }
          flushedCount++;
          updateQueue((prev) => prev.filter((q) => q.id !== item.id));
        } catch (err) {
          if (isClientHttpError(err)) {
            if (err instanceof ApiErro && err.status === 401) {
              break;
            }
            // Erro de validação/permissão (400/403/422): descarta item inválido para não travar a fila
            updateQueue((prev) => prev.filter((q) => q.id !== item.id));
            continue;
          }
          // Falha de rede ou 5xx: interrompe e preserva os itens restantes para o próximo ciclo
          break;
        }
      }

      if (flushedCount > 0) {
        onFlushedRef.current?.(flushedCount);
      }
      return flushedCount;
    } finally {
      flushingRef.current = false;
    }
  }, [enabled, updateQueue]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const handleOnline = () => {
      void flushQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [enabled, flushQueue]);

  return {
    pendingCount: queue.length,
    enqueueSale,
    enqueueLoss,
    flushQueue,
  };
}
