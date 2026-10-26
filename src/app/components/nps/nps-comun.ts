import { SegmentoNps } from '../../shared/services/feedback/feedback.models';
import { CanalEncuesta, EstadoCaso, EstadoEncuesta } from '../../shared/services/nps/nps.models';
import { TranslateService } from '@ngx-translate/core';
import { esFamiliaAdministrador } from '../../shared/utils/roles';

/** Textos y utilidades compartidas del módulo NPS (D-490). */

export const NOMBRE_SEGMENTO: Record<SegmentoNps, string> = { promotor: 'nps.segmento.promotor', pasivo: 'nps.segmento.pasivo', detractor: 'nps.segmento.detractor' };

export const NOMBRE_CANAL: Record<CanalEncuesta, string> = {
  entrega: 'nps.canal.entrega',
  enlace: 'nps.canal.enlace',
  seller: 'nps.canal.seller',
  katuq: 'nps.canal.katuq',
};

export const NOMBRE_ESTADO_ENCUESTA: Record<EstadoEncuesta, string> = { borrador: 'nps.estadoEncuesta.borrador', activa: 'nps.estadoEncuesta.activa', pausada: 'nps.estadoEncuesta.pausada' };

export const NOMBRE_ESTADO_CASO: Record<EstadoCaso, string> = {
  nuevo: 'nps.estadoCaso.nuevo',
  contactado: 'nps.estadoCaso.contactado',
  resuelto: 'nps.estadoCaso.resuelto',
  sin_solucion: 'nps.estadoCaso.sinSolucion',
};

export const ESTADOS_CASO: EstadoCaso[] = ['nuevo', 'contactado', 'resuelto', 'sin_solucion'];
export const ESTADOS_CIERRE: EstadoCaso[] = ['resuelto', 'sin_solucion'];

/** Etapas de la encuesta de Julsmind a sus comercios (`NPS_COMERCIOS`). */
export const NOMBRE_ETAPA: Record<string, string> = {
  apagada: 'nps.etapa.apagada',
  internos: 'nps.etapa.internos',
  todos: 'nps.etapa.todos',
};

export function casoAbierto(estado: EstadoCaso | null | undefined): boolean {
  return estado === 'nuevo' || estado === 'contactado';
}

/** Rol de la sesión (lo decide el servidor; esto solo decide qué se muestra). */
export function rolSesion(): string {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.rol || '';
  } catch {
    return '';
  }
}

export function emailSesion(): string {
  try {
    return String(JSON.parse(localStorage.getItem('user') || '{}')?.email || '').toLowerCase();
  } catch {
    return '';
  }
}

export function empresaSesion(): string {
  try {
    return String(JSON.parse(localStorage.getItem('user') || '{}')?.company || '');
  } catch {
    return '';
  }
}

export function esAdministradorSesion(): boolean {
  return esFamiliaAdministrador(rolSesion());
}

/** Solo dígitos; un celular colombiano de 10 dígitos que empieza por 3 recibe el 57. */
export function telefonoInternacional(telefono: string | null | undefined): string | null {
  const digitos = String(telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`;
  return digitos.length >= 8 ? digitos : null;
}

/** Enlace de WhatsApp con un saludo; lo envía la persona, nada sale solo. */
export function enlaceWhatsapp(telefono: string | null | undefined, texto: string): string | null {
  const numero = telefonoInternacional(telefono);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;
}

export function enlaceLlamada(telefono: string | null | undefined): string | null {
  const digitos = String(telefono || '').replace(/[^\d+]/g, '');
  return digitos.length >= 7 ? `tel:${digitos}` : null;
}

const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
const FECHA_HORA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function fechaCorta(iso: string | null | undefined): string {
  const t = Date.parse(String(iso || ''));
  return isNaN(t) ? '' : FECHA.format(new Date(t));
}

export function fechaHora(iso: string | null | undefined): string {
  const t = Date.parse(String(iso || ''));
  return isNaN(t) ? '' : FECHA_HORA.format(new Date(t));
}

/** "3 h", "2 días" o "—". */
export function duracionHoras(horas: number | null | undefined, tr: TranslateService): string {
  if (horas === null || horas === undefined || !isFinite(horas)) return '—';
  if (horas < 1) return tr.instant('nps.comun.menosDe1H');
  if (horas < 48) return tr.instant('nps.comun.nHoras', { n: Math.round(horas) });
  const dias = Math.round(horas / 24);
  return tr.instant('nps.comun.nDias', { n: dias });
}

/** Código de error del contrato (`{ success: false, code, error }`). */
export function codigoError(e: any): string | undefined {
  return e?.error?.code;
}

/** Mensaje para el comercio: el del servidor (ya en lenguaje de comercio) o uno por omisión. */
export function mensajeError(e: any, porOmision: string, tr: TranslateService): string {
  if (e?.status === 0) return tr.instant('nps.comun.sinConexion');
  if (e?.status === 403 && !e?.error?.error) return tr.instant('nps.comun.soloAdministradores');
  return e?.error?.error || porOmision;
}

/** Reemplaza `{comercio}` por el nombre del comercio. */
export function conComercio(texto: string | null | undefined, comercio: string): string {
  return String(texto || '').replace(/\{comercio\}/g, comercio || 'nosotros');
}
