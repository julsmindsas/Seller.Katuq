/**
 * D-547 (F2, D13): la forma de `GET /v1/order-actions/me` y su lectura tolerante. Funciones PURAS, sin Angular:
 * las carga también `node --test`. Lo que no llega con su forma se toma como vacío; nunca lanza.
 */

/** Lo que el servidor guarda del rol (D13, `GET /me`). */
export interface RolAccionesServidor {
  profile?: string | null;
  actions?: string[] | null;
  source?: 'role' | 'default' | string;
}

/** `GET /me`, ya normalizado. */
export interface AccionesUsuario {
  role: RolAccionesServidor;
  pinned: string[];
  /** `dismissed[id]` = fecha hasta la que no se vuelve a sugerir esa acción. */
  dismissed: Record<string, string>;
  lastSuggestionAt: string;
  /** Días distintos de los últimos 7 en que usó cada acción. */
  usageDays: Record<string, number>;
}

/** Sin documento único del usuario (404 o 409) el bloque usa los valores por defecto: perfil General sin pines. */
export function accionesPorOmision(): AccionesUsuario {
  return { role: { profile: null, actions: null, source: 'default' }, pinned: [], dismissed: {}, lastSuggestionAt: '', usageDays: {} };
}

const esObjeto = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Tolera una respuesta incompleta: lo que no llega con su forma se toma como vacío. */
export function normalizarAcciones(r: unknown): AccionesUsuario {
  const o: Record<string, any> = esObjeto(r) ? r : {};
  const role = esObjeto(o['role']) ? o['role'] : {};
  const numeros: Record<string, number> = {};
  if (esObjeto(o['usageDays'])) for (const [k, v] of Object.entries(o['usageDays'])) if (Number.isFinite(Number(v))) numeros[k] = Number(v);
  const rechazadas: Record<string, string> = {};
  if (esObjeto(o['dismissed'])) for (const [k, v] of Object.entries(o['dismissed'])) if (typeof v === 'string') rechazadas[k] = v;
  return {
    role: {
      profile: typeof role['profile'] === 'string' ? role['profile'] : null,
      actions: Array.isArray(role['actions']) ? role['actions'].filter((x: unknown) => typeof x === 'string') : null,
      source: typeof role['source'] === 'string' ? role['source'] : 'default',
    },
    pinned: Array.isArray(o['pinned']) ? o['pinned'].filter((x: unknown) => typeof x === 'string') : [],
    dismissed: rechazadas,
    lastSuggestionAt: typeof o['lastSuggestionAt'] === 'string' ? o['lastSuggestionAt'] : '',
    usageDays: numeros,
  };
}
