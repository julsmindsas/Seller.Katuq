import { CalidadNumero } from '../../../../../shared/services/messaging/whatsapp-consola.models';

/** Variante de color del par fuerte/fondo suave (`cfg-pill--*`). */
export type VarianteColor = 'ok' | 'warn' | 'error' | 'info' | 'neutro';

export interface EtiquetaColor {
  /** Clave de traducción del texto. */
  clave: string;
  variante: VarianteColor;
}

/** Calidad que reporta Meta, en palabras sencillas: alta, media o baja. */
export function etiquetaCalidad(calidad: CalidadNumero | null | undefined): EtiquetaColor {
  switch (calidad) {
    case 'GREEN':
      return { clave: 'consolaWhatsapp.calidad.alta', variante: 'ok' };
    case 'YELLOW':
      return { clave: 'consolaWhatsapp.calidad.media', variante: 'warn' };
    case 'RED':
      return { clave: 'consolaWhatsapp.calidad.baja', variante: 'error' };
    default:
      return { clave: 'consolaWhatsapp.calidad.sinDato', variante: 'neutro' };
  }
}

/** Estado de aprobación del nombre visible. Un estado que no se conoce se muestra como «Sin dato». */
export function etiquetaEstadoNombre(estado: string | null | undefined): EtiquetaColor | null {
  if (!estado) return null;
  switch (String(estado).toUpperCase()) {
    case 'APPROVED':
    case 'AVAILABLE_WITHOUT_REVIEW':
      return { clave: 'consolaWhatsapp.estadoNombre.aprobado', variante: 'ok' };
    case 'PENDING_REVIEW':
      return { clave: 'consolaWhatsapp.estadoNombre.enRevision', variante: 'warn' };
    case 'DECLINED':
    case 'EXPIRED':
      return { clave: 'consolaWhatsapp.estadoNombre.rechazado', variante: 'error' };
    default:
      return { clave: 'consolaWhatsapp.estadoNombre.sinDato', variante: 'neutro' };
  }
}

/**
 * Conversaciones por día que permite Meta. El servidor manda el nivel crudo (`TIER_1K`, `TIER_UNLIMITED`…)
 * y su tope numérico (`null` = sin tope). Devuelve `null` si no se sabe y `'ilimitado'` si Meta no pone tope.
 */
export function limiteDiarioNumero(
  limite: number | string | null | undefined,
  tope?: number | null,
): number | 'ilimitado' | null {
  if (typeof tope === 'number' && Number.isFinite(tope) && tope > 0) return tope;
  if (limite === null || limite === undefined || limite === '') return null;
  if (typeof limite === 'number') return Number.isFinite(limite) && limite > 0 ? limite : null;
  const texto = String(limite).toUpperCase();
  if (texto.includes('UNLIMITED')) return 'ilimitado';
  const tier = /TIER_(\d+)(K?)/.exec(texto);
  if (tier) return Number(tier[1]) * (tier[2] ? 1000 : 1);
  const n = Number(texto.replace(/[^\d]/g, ''));
  if (Number.isFinite(n) && n > 0) return n;
  // Hay un nivel que no se sabe leer y el servidor dice que no tiene tope numérico.
  return tope === null ? 'ilimitado' : null;
}

/** Fecha en que se leyó la salud, o `null` si no se puede leer. */
export function fechaDeSalud(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const f = new Date(valor);
  return Number.isNaN(f.getTime()) ? null : f;
}
