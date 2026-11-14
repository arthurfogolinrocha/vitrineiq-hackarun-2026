import { useCallback, useState } from 'react';
import { SystemAuditLog } from '../types';
import { generateAuditHash } from '../utils/security';

const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'audit-boot',
    action: 'VITRINEIQ_BOOT_SECURE',
    status: 'SUCCESS',
    details:
      'Gêmeo Digital Capim Dourado Shopping inicializado com backend Python + espelho TS; câmera envia só contagens.',
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    securityHash: generateAuditHash(
      'VITRINEIQ_BOOT_SECURE:CAPIM_DOURADO',
      'GENESIS_BLOCK_0000',
      'audit-boot',
      '00:00'
    ),
    prevHash: 'GENESIS_BLOCK_0000',
  },
];

/** Mantém trilha encadeada (hash SHA-256) das ações do sistema em memória. */
export function useAuditLogs() {
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(INITIAL_AUDIT_LOGS);

  const appendAudit = useCallback(
    (action: string, details: string, status: SystemAuditLog['status'] = 'SUCCESS') => {
      setAuditLogs((prev) => {
        const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const timestamp = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const prevHash = prev[0]?.securityHash || 'GENESIS_BLOCK_0000';
        const securityHash = generateAuditHash(`${action}:${details}`, prevHash, id, timestamp);
        return [
          {
            id,
            action,
            status,
            details,
            timestamp,
            securityHash,
            prevHash,
          },
          ...prev.slice(0, 29),
        ];
      });
    },
    []
  );

  return { auditLogs, appendAudit };
}
