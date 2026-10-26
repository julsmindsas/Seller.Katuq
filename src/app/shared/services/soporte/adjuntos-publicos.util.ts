import { ArchivoDeSesion, TopesAdjuntos } from './adjuntos-publicos.models';

/**
 * Parte pura de la página de subida de archivos de un ticket (D-549, plan B): validación local para
 * avisar rápido, formato de tamaños y textos de error. El servidor vuelve a validar todo; esto solo
 * ahorra una ida y vuelta. Sin Angular, para poder probarla en Node (tests/soporte/).
 */

/** Extensión → tipo, igual que el servidor (`tools/_evidenciaFuentes.js`). */
export const TIPO_POR_EXTENSION: Readonly<Record<string, string>> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ogg: 'audio/ogg', opus: 'audio/ogg', oga: 'audio/ogg',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', aac: 'audio/aac',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

const MB = 1024 * 1024;

/** «120 KB», «3 MB», «3,5 MB»: lo mismo que ve la persona en la tarjeta de Claude. */
export function formatearTamano(bytes: number): string {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${Math.round(n / 1024)} KB`;
  const mb = Math.round((n / MB) * 10) / 10;
  return `${String(mb).replace('.', ',')} MB`;
}

export function esAudioOVideo(tipo: string): boolean {
  return /^(audio|video)\//.test(String(tipo || '').toLowerCase());
}

/** Tope en bytes según el tipo (audio y video pesan más que una captura). */
export function topeEnBytes(tipo: string, topes: TopesAdjuntos): number {
  return esAudioOVideo(tipo) ? topes.audioVideo : topes.general;
}

/**
 * El tipo del archivo: el que dice el navegador si el servidor lo permite; si no, el de la extensión.
 * `null` si no es de un tipo que se pueda adjuntar.
 */
export function tipoDeArchivo(nombre: string, tipoDelNavegador: string, permitidos: readonly string[]): string | null {
  const dado = String(tipoDelNavegador || '').toLowerCase();
  if (dado && permitidos.includes(dado)) return dado;
  const extension = String(nombre || '').split('?')[0].split('.').pop()?.toLowerCase() || '';
  const porExtension = TIPO_POR_EXTENSION[extension] || null;
  return porExtension && permitidos.includes(porExtension) ? porExtension : null;
}

export interface ArchivoLocal {
  name: string;
  size: number;
  type: string;
}

export interface ReglasAdjuntos {
  tipos: readonly string[];
  topes: TopesAdjuntos;
  maximo: number;
}

/** `tipo` cuando `ok`; `motivo` (texto para la persona) cuando no. */
export interface ValidacionArchivo {
  ok: boolean;
  tipo?: string;
  motivo?: string;
}

/** ¿Se puede intentar subir este archivo? `yaEnLista` cuenta los que ya están (subidos o subiendo). */
export function validarArchivoLocal(archivo: ArchivoLocal, reglas: ReglasAdjuntos, yaEnLista: number): ValidacionArchivo {
  if (yaEnLista >= reglas.maximo) {
    return { ok: false, motivo: `Se pueden adjuntar hasta ${reglas.maximo} archivos. Quita uno para agregar otro.` };
  }
  const tipo = tipoDeArchivo(archivo.name, archivo.type, reglas.tipos);
  if (!tipo) return { ok: false, motivo: 'Este tipo de archivo no se puede adjuntar.' };
  if (!Number.isFinite(archivo.size) || archivo.size <= 0) return { ok: false, motivo: 'El archivo está vacío.' };
  const tope = topeEnBytes(tipo, reglas.topes);
  if (archivo.size > tope) {
    return { ok: false, motivo: `Pesa ${formatearTamano(archivo.size)}; el máximo es ${Math.round(tope / MB)} MB.` };
  }
  return { ok: true, tipo };
}

/** El número de orden de un archivo, leído de su ruta (`…/3_foto.png` → 3), o null. */
export function numeroDeRuta(ruta: string): number | null {
  const m = /^(\d+)_/.exec(String(ruta || '').split('/').pop() || '');
  return m ? Number(m[1]) : null;
}

export interface ErrorDePagina {
  titulo: string;
  texto: string;
  icono: string;
}

/** Los motivos por los que no se puede abrir la página. Mensajes de negocio, sin jerga. */
export const ERRORES_DE_PAGINA: Readonly<Record<string, ErrorDePagina>> = {
  INVALIDO: {
    titulo: 'Este enlace no es válido',
    texto: 'Puede que esté incompleto. Pídele a Claude que abra la tarjeta del ticket de nuevo.',
    icono: 'pi-link',
  },
  VENCIDO: {
    titulo: 'Este enlace ya venció',
    texto: 'Cada enlace dura 30 minutos. Pídele a Claude que abra la tarjeta del ticket de nuevo.',
    icono: 'pi-clock',
  },
  USADO: {
    titulo: 'Este enlace ya se usó',
    texto: 'Si aún falta algún archivo, pídele a Claude que abra la tarjeta del ticket de nuevo.',
    icono: 'pi-check-circle',
  },
  NO_DISPONIBLE: {
    titulo: 'Adjuntar archivos no está disponible en este momento',
    texto: 'Inténtalo de nuevo en unos minutos.',
    icono: 'pi-pause',
  },
  GENERAL: {
    titulo: 'No pudimos abrir esta página',
    texto: 'Revisa tu conexión e inténtalo de nuevo en unos minutos.',
    icono: 'pi-exclamation-triangle',
  },
};

/** La explicación de pantalla completa para un código del servidor (o la general si no se conoce). */
export function errorDePagina(codigo: string | undefined | null): ErrorDePagina {
  return (codigo && ERRORES_DE_PAGINA[codigo]) || ERRORES_DE_PAGINA['GENERAL'];
}

/** Lo que se le dice a la persona cuando falla algo de UN archivo (el servidor ya habla en español de negocio). */
export function mensajeDeArchivo(estado: number | undefined, codigo: string | undefined, mensajeServidor?: string): string {
  if (codigo === 'USADO' || codigo === 'VENCIDO' || codigo === 'INVALIDO') return errorDePagina(codigo).titulo;
  if (codigo === 'DEMASIADAS_SOLICITUDES' || estado === 429) return 'Hay demasiadas solicitudes seguidas. Espera unos minutos e inténtalo de nuevo.';
  const texto = String(mensajeServidor || '').trim();
  if (texto && estado !== undefined && estado >= 400 && estado < 500) return texto;
  return 'No pudimos subir este archivo. Revisa tu conexión e inténtalo de nuevo.';
}

/** ¿Hay algo que se pueda dar por terminado? Al menos un archivo subido y nada en marcha. */
export function puedeTerminar(items: ReadonlyArray<{ estado: string }>): boolean {
  return items.some((i) => i.estado === 'subido') && !items.some((i) => i.estado === 'subiendo' || i.estado === 'esperando');
}

/** Los archivos de la sesión que ya estaban subidos al abrir la página, como elementos de la lista. */
export function itemsDeSesion(archivos: ReadonlyArray<ArchivoDeSesion>): Array<{ nombre: string; bytes: number; n: number }> {
  return archivos.map((a) => ({ nombre: a.nombre, bytes: a.bytes, n: a.n }));
}
