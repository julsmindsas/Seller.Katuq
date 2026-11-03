/**
 * Estado de una idea (D-627, tickets 1442 y 1443) — parte PURA, sin Angular ni DOM.
 *
 * Una idea es un ticket con `motivo: 'idea'`. El ticket conserva sus cuatro estados de Support
 * (Pendiente, Haciendo, Resuelto, Archivado); la idea suma `ideaEstado`, con seis valores que
 * solo escribe el equipo. Mientras no exista, el estado se DERIVA del `status`, así la pantalla
 * funciona antes y después de migrar. La tabla es la misma del servidor
 * (functions/services/soporte/ideaEstado.js).
 */

export type IdeaEstadoKey =
  | 'recibida'
  | 'en_evaluacion'
  | 'planeada'
  | 'en_desarrollo'
  | 'implementada'
  | 'no_viable';

export const IDEA_ESTADO_KEYS: readonly IdeaEstadoKey[] = [
  'recibida', 'en_evaluacion', 'planeada', 'en_desarrollo', 'implementada', 'no_viable',
];

export interface IdeaEstadoDescriptor {
  /** Clave de traducción del nombre en singular. */
  label: string;
  /** Clave de traducción del nombre en plural (pestañas y título de la lista). */
  plural: string;
  /** Color fuerte (texto e ícono) y fondo suave: pares semánticos del design-system. */
  fg: string;
  bg: string;
  icon: string;
}

export const IDEA_ESTADOS: Readonly<Record<IdeaEstadoKey, IdeaEstadoDescriptor>> = {
  recibida:      { label: 'soporte.misIdeas.maestro.estado.recibida',     plural: 'soporte.misIdeas.maestro.plural.recibida',     fg: '#5A6B78', bg: '#EEF0F3', icon: 'pi-inbox' },
  en_evaluacion: { label: 'soporte.misIdeas.maestro.estado.enEvaluacion', plural: 'soporte.misIdeas.maestro.plural.enEvaluacion', fg: '#D9820A', bg: '#FFF1DF', icon: 'pi-search' },
  planeada:      { label: 'soporte.misIdeas.maestro.estado.planeada',     plural: 'soporte.misIdeas.maestro.plural.planeada',     fg: '#5F3FE0', bg: '#EFE9FF', icon: 'pi-calendar' },
  en_desarrollo: { label: 'soporte.misIdeas.maestro.estado.enDesarrollo', plural: 'soporte.misIdeas.maestro.plural.enDesarrollo', fg: '#1E6FD9', bg: '#E7F1FF', icon: 'pi-cog' },
  implementada:  { label: 'soporte.misIdeas.maestro.estado.implementada', plural: 'soporte.misIdeas.maestro.plural.implementada', fg: '#1E874B', bg: '#E6F7EE', icon: 'pi-check-circle' },
  no_viable:     { label: 'soporte.misIdeas.maestro.estado.noViable',     plural: 'soporte.misIdeas.maestro.plural.noViable',     fg: '#D64545', bg: '#FDECEC', icon: 'pi-times-circle' },
};

/** Estado del ticket (en minúsculas) → estado de idea que se muestra cuando falta `ideaEstado`. */
const IDEA_POR_STATUS: Readonly<Record<string, IdeaEstadoKey>> = {
  pendiente: 'recibida',
  haciendo: 'en_desarrollo',
  'en proceso': 'en_desarrollo',
  resuelto: 'implementada',
  archivado: 'no_viable',
};

function texto(valor: unknown): string {
  return String(valor === undefined || valor === null ? '' : valor).trim();
}

/** Lleva lo que venga guardado al valor canónico; `null` si no es uno de los seis. */
export function normalizarIdeaEstado(valor: unknown): IdeaEstadoKey | null {
  const limpio = texto(valor)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return (IDEA_ESTADO_KEYS as readonly string[]).includes(limpio) ? (limpio as IdeaEstadoKey) : null;
}

/** ¿El ticket es una idea? Mismas señales que el servidor. */
export function esIdea(ticket: any): boolean {
  return texto(ticket?.motivo).toLowerCase() === 'idea' || texto(ticket?.tipoSolicitud).toLowerCase() === 'idea';
}

/** Estado propio si lo tiene; si no, el derivado del estado del ticket. */
export function ideaEstadoDe(ticket: any): IdeaEstadoKey {
  return normalizarIdeaEstado(ticket?.ideaEstado) || IDEA_POR_STATUS[texto(ticket?.status).toLowerCase()] || 'recibida';
}

export type ConteoIdeas = { todas: number } & Record<IdeaEstadoKey, number>;

/** Cuántas ideas hay en cada estado, más el total. */
export function contarPorEstado(ideas: any[]): ConteoIdeas {
  const conteo: ConteoIdeas = {
    todas: 0, recibida: 0, en_evaluacion: 0, planeada: 0, en_desarrollo: 0, implementada: 0, no_viable: 0,
  };
  for (const idea of ideas || []) {
    conteo.todas++;
    conteo[ideaEstadoDe(idea)]++;
  }
  return conteo;
}

/** Apoyos de «A mí también me sirve»: el contador guardado o, si falta, el largo de la lista. */
export function apoyosDe(ticket: any): number {
  const total = Number(ticket?.apoyosIdeaTotal);
  if (Number.isFinite(total) && total >= 0) return Math.floor(total);
  return Array.isArray(ticket?.apoyosIdea) ? ticket.apoyosIdea.length : 0;
}

/** ¿Esta persona (por su correo) ya apoyó la idea? */
export function yaApoyo(ticket: any, correo: string): boolean {
  const mio = texto(correo).toLowerCase();
  if (!mio || !Array.isArray(ticket?.apoyosIdea)) return false;
  return ticket.apoyosIdea.some((a: any) => texto(a?.usuario).toLowerCase() === mio);
}

// ---------------------------------------------------------------------------
// Fechas y adjuntos (misma lógica de Mis tickets)
// ---------------------------------------------------------------------------

/** Parsea 'YYYY-MM-DD' como fecha local (new Date() la leería en UTC y en Colombia correría un día). */
export function aFecha(valor: unknown): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  const t = String(valor);
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (soloFecha) return new Date(+soloFecha[1], +soloFecha[2] - 1, +soloFecha[3]);
  const fecha = new Date(t);
  return isNaN(fecha.getTime()) ? null : fecha;
}

/** Días de calendario desde la fecha hasta hoy; `null` si no hay fecha válida. */
export function diasDesde(valor: unknown, hoy: Date = new Date()): number | null {
  const fecha = aFecha(valor);
  if (!fecha) return null;
  const desde = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((hasta.getTime() - desde.getTime()) / 86400000);
}

export type TipoAdjunto = 'imagen' | 'video' | 'audio' | 'documento';

function rutaAdjunto(url: string): string {
  let ruta = String(url || '').split('?')[0];
  try { ruta = decodeURIComponent(ruta); } catch { /* ruta mal codificada: se usa tal cual */ }
  return ruta.toLowerCase();
}

export function tipoAdjunto(url: string): TipoAdjunto {
  if (!url) return 'imagen';
  const ruta = rutaAdjunto(url);
  if (/\.(ogg|opus|oga|mp3|m4a|wav|aac)$/.test(ruta)) return 'audio';
  if (/\.(mp4|mov|avi|webm|mkv|m4v)$/.test(ruta)) return 'video';
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)$/.test(ruta)) return 'documento';
  return 'imagen';
}

/** Solo mp4/mov/webm/m4v se reproducen en línea; avi y mkv se abren aparte. */
export function esVideoReproducible(url: string): boolean {
  return tipoAdjunto(url) === 'video' && /\.(mp4|mov|webm|m4v)$/.test(rutaAdjunto(url));
}

export function esArchivoParaAbrir(url: string): boolean {
  const tipo = tipoAdjunto(url);
  return tipo === 'documento' || (tipo === 'video' && !esVideoReproducible(url));
}

export function nombreAdjunto(url: string): string {
  if (!url) return '';
  let ruta = String(url).split('?')[0];
  try { ruta = decodeURIComponent(ruta); } catch { /* se usa tal cual */ }
  const archivo = ruta.substring(ruta.lastIndexOf('/') + 1);
  return archivo.replace(/^\d{10,}_/, '').replace(/^idea_\d+_\d+_/, '').replace(/^ticket_\d+_\d+_/, '');
}

export function inicialesDe(nombre: string): string {
  const partes = texto(nombre).split(/\s+/).filter(Boolean);
  if (!partes.length) return 'US';
  return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
}
