const ONBOARDING_V2_STORAGE_PREFIX = 'katuq_onboarding_v2';

/**
 * El progreso del onboarding pertenece simultaneamente a un usuario y a una
 * empresa. Nunca debe compartir la llave global usada por la version inicial.
 */
export function buildOnboardingStorageKey(userKey: string, tenantKey: string): string {
  const user = String(userKey || '').trim();
  const tenant = String(tenantKey || '').trim();
  if (!user || !tenant) {
    throw new Error('userKey y tenantKey son requeridos para guardar el onboarding');
  }
  return `${ONBOARDING_V2_STORAGE_PREFIX}:${encodeURIComponent(user)}:${encodeURIComponent(tenant)}`;
}

/**
 * Convierte el umbral escrito por el usuario sin reinterpretar entradas
 * invalidas. En particular, "5.5" no puede convertirse en 55 ni "-5" en 5.
 */
export function parseLowStockThreshold(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw !== 'string') return null;

  const value = raw.trim();
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * El logout debe retirar tanto la llave legacy como todos los borradores V2
 * namespaced. Primero recolecta las llaves para no saltarse entradas mientras
 * `removeItem` modifica el indice de Storage.
 */
export function clearOnboardingStorage(
  storage: Pick<Storage, 'length' | 'key' | 'removeItem'>
): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key === ONBOARDING_V2_STORAGE_PREFIX || key?.startsWith(`${ONBOARDING_V2_STORAGE_PREFIX}:`)) {
      if (key) keys.push(key);
    }
  }
  keys.forEach(key => storage.removeItem(key));
}
