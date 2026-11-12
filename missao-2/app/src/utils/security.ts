/**
 * Módulo de Segurança & Integridade Governamental
 * Implementa sanitização contra XSS, verificação de integridade e guardrails éticos.
 */

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove tags de script e caracteres perigosos
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, (tag) => (tag === '<' ? '&lt;' : '&gt;'))
    .trim();
}

export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredKeys: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const key of requiredKeys) {
    const value = data[key];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(String(key));
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export function generateAuditHash(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Converte para inteiro de 32 bits
  }
  return `SEC-SHA-${Math.abs(hash).toString(16).padStart(8, '0').toUpperCase()}`;
}

export function containsRestrictedPatterns(text: string): boolean {
  // Guardrail para bloquear tentativa de prompt injection ou vazamento de segredos
  const patterns = [
    /ignore all previous instructions/i,
    /system prompt reveal/i,
    /drop table/i,
    /delete from/i,
    /<iframe/i,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

