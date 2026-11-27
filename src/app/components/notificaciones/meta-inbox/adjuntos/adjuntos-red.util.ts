/**
 * Archivos del chat de Instagram y Facebook (bandeja única): tipos, topes y la lista blanca de formatos con que
 * se crea un `Blob` en el navegador. Funciones puras, sin Angular.
 *
 * Los tipos y topes de aquí solo sirven para avisar antes de subir. Quien decide es el servidor, que revisa la
 * firma del archivo y los topes de cada red.
 */
import { MetaAdjunto, MetaAdjuntoKind, MetaCanal } from '../models/meta-thread.model';

const MB = 1024 * 1024;

/** Redes donde el chat ve y envía archivos con la bandeja única. TikTok sigue con su imagen propia (D-709). */
export type CanalConArchivos = 'instagram' | 'facebook';

export function canalConArchivos(canal: MetaCanal | string | null | undefined): canal is CanalConArchivos {
  return canal === 'instagram' || canal === 'facebook';
}

interface ReglasCanal {
  /** Atributo `accept` del selector de archivos. */
  accept: string;
  /** Formatos permitidos por tipo (minúsculas). */
  mimes: Record<'image' | 'audio' | 'video' | 'document', string[]>;
  /** Extensiones permitidas por tipo, para cuando el navegador no dice el formato. */
  extensiones: Record<'image' | 'audio' | 'video' | 'document', string[]>;
}

/**
 * Qué se le puede enviar al cliente por cada red. Es copia de `clasificarParaRed` del servidor
 * (services/messaging/media/redes.js), que decide por la firma de los bytes:
 *  - Instagram: foto JPG o PNG (sin GIF); audio AAC, M4A (AAC) o WAV; video MP4, MOV o WebM; documento solo PDF.
 *  - Facebook: foto JPG, PNG o GIF; audio AAC, M4A (AAC) o WAV; video solo MP4; documento solo PDF.
 * Las notas de voz van en M4A (AAC) o WAV en las dos redes: el servidor no acepta Ogg/Opus ni WebM de audio.
 */
const REGLAS: Record<CanalConArchivos, ReglasCanal> = {
  instagram: {
    accept: [
      'image/jpeg', 'image/png',
      'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav', '.m4a', '.aac', '.wav',
      'video/mp4', 'video/quicktime', 'video/webm', '.mov',
      'application/pdf', '.pdf',
    ].join(','),
    mimes: {
      image: ['image/jpeg', 'image/png'],
      audio: ['audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/wave'],
      video: ['video/mp4', 'video/quicktime', 'video/webm'],
      document: ['application/pdf'],
    },
    extensiones: {
      image: ['jpg', 'jpeg', 'png'],
      audio: ['aac', 'm4a', 'wav'],
      video: ['mp4', 'mov', 'webm'],
      document: ['pdf'],
    },
  },
  facebook: {
    accept: [
      'image/jpeg', 'image/png', 'image/gif',
      'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav', '.m4a', '.aac', '.wav',
      'video/mp4',
      'application/pdf', '.pdf',
    ].join(','),
    mimes: {
      image: ['image/jpeg', 'image/png', 'image/gif'],
      audio: ['audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/wave'],
      video: ['video/mp4'],
      document: ['application/pdf'],
    },
    extensiones: {
      image: ['jpg', 'jpeg', 'png', 'gif'],
      audio: ['aac', 'm4a', 'wav'],
      video: ['mp4'],
      document: ['pdf'],
    },
  },
};

export function acceptDe(canal: CanalConArchivos): string {
  return REGLAS[canal].accept;
}

/** Tope por tipo antes de subir: foto 8 MB; audio, video y PDF 25 MB (los mismos del servidor). */
export const TOPE_SUBIDA_RED: Record<'image' | 'audio' | 'video' | 'document', number> = {
  image: 8 * MB,
  audio: 25 * MB,
  video: 25 * MB,
  document: 25 * MB,
};

/** Texto que acompaña un archivo (sale como un segundo mensaje, después del archivo). */
export const MAX_TEXTO_RED = 2000;

/** Corte automático de una nota de voz. */
export const MAX_SEGUNDOS_VOZ_RED = 150;

/** Tipo del archivo elegido (para la vista previa y el aviso); el servidor lo confirma por la firma. */
export function kindDeArchivoRed(archivo: { type?: string; name?: string }): 'image' | 'audio' | 'video' | 'document' {
  const tipo = String(archivo.type || '').toLowerCase();
  const nombre = String(archivo.name || '').toLowerCase();
  if (tipo.startsWith('image/')) return 'image';
  if (tipo.startsWith('audio/')) return 'audio';
  if (tipo.startsWith('video/')) return 'video';
  if (/\.(m4a|aac|wav|mp3|ogg|opus)$/.test(nombre)) return 'audio';
  if (/\.(mov|mp4|webm)$/.test(nombre)) return 'video';
  return 'document';
}

function extensionDe(nombre: string | undefined): string {
  const n = String(nombre || '').toLowerCase();
  const punto = n.lastIndexOf('.');
  return punto >= 0 ? n.slice(punto + 1) : '';
}

/** ¿Esta red acepta este archivo? (Por el formato que dice el navegador o, si no dice, por la extensión.) */
export function permitidoEnRed(canal: CanalConArchivos, archivo: { type?: string; name?: string }): boolean {
  const kind = kindDeArchivoRed(archivo);
  const reglas = REGLAS[canal];
  const tipo = String(archivo.type || '').split(';')[0].trim().toLowerCase();
  if (tipo && reglas.mimes[kind].includes(tipo)) return true;
  // Algunos navegadores no dicen el formato (o dicen uno genérico): se mira la extensión.
  if (!tipo || tipo === 'application/octet-stream') return reglas.extensiones[kind].includes(extensionDe(archivo.name));
  return false;
}

/** Formatos que el navegador puede mostrar o reproducir; con otro, el archivo solo se descarga. */
const MIME_POR_KIND: Record<MetaAdjuntoKind, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  sticker: ['image/webp', 'image/png', 'image/jpeg', 'image/gif'],
  audio: ['audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  document: [],
};

const KINDS: MetaAdjuntoKind[] = ['image', 'audio', 'video', 'document', 'sticker'];

/** El tipo del adjunto si es un archivo que se puede ver o bajar; null si es una etiqueta (publicación, historia…). */
export function kindDeAdjunto(a: MetaAdjunto | null | undefined): MetaAdjuntoKind | null {
  const k = a && typeof a.kind === 'string' ? (a.kind as MetaAdjuntoKind) : null;
  return k && KINDS.includes(k) ? k : null;
}

/** Ruta de un archivo del chat que sí se pide con la sesión. Cualquier otra no se pide. */
const RUTA_MEDIA_RED = /^\/v1\/meta\/conversations\/(instagram|facebook)\/[a-f0-9]{64}\/media\/[A-Za-z0-9_.:=%-]{3,300}(\?i=\d{1,2})?$/;

export function esRutaDeMediaRed(ruta: unknown): ruta is string {
  return typeof ruta === 'string' && RUTA_MEDIA_RED.test(ruta) && !ruta.includes('..');
}

/** Formato seguro para crear el `Blob`: el que llegó si está en la lista del tipo; si no, `application/octet-stream`. */
export function mimeSeguroRed(kind: MetaAdjuntoKind, ...candidatos: Array<string | null | undefined>): string {
  const permitidos = MIME_POR_KIND[kind] || [];
  for (const c of candidatos) {
    const base = String(c || '').split(';')[0].trim().toLowerCase();
    if (base && permitidos.includes(base)) return base;
  }
  return 'application/octet-stream';
}

/** Etiqueta de lo que no es un archivo (publicación, historia, reel…), según el tipo que dijo Meta. */
export function claveEtiquetaAdjunto(tipo: string | null | undefined): string {
  switch (String(tipo || '').toLowerCase()) {
    case 'share':
    case 'post':
    case 'ig_post':
      return 'notificaciones.redes3.adjuntos.etiqueta.publicacion';
    case 'story_mention':
      return 'notificaciones.redes3.adjuntos.etiqueta.historia';
    case 'reel':
    case 'ig_reel':
      return 'notificaciones.redes3.adjuntos.etiqueta.reel';
    case 'fallback':
      return 'notificaciones.redes3.adjuntos.etiqueta.enlace';
    case 'ephemeral':
    case 'efimero':
      return 'notificaciones.redes3.adjuntos.etiqueta.temporal';
    case 'location':
      return 'notificaciones.cierre2.adjuntos.etiqueta.ubicacion';
    case 'template':
      return 'notificaciones.cierre2.adjuntos.etiqueta.botones';
    default:
      return 'notificaciones.redes3.adjuntos.etiqueta.otro';
  }
}

/** «850 KB», «3,4 MB». */
export function tamanoLegibleRed(bytes: number | null | undefined, locale = 'es-CO'): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < MB) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = n / MB;
  try {
    return `${mb.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
  } catch {
    return `${mb.toFixed(1)} MB`;
  }
}

/** «1:05» */
export function duracionLegibleRed(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Id del envío con que el servidor evita mandar dos veces el mismo archivo (`^[A-Za-z0-9_-]{8,80}$`). */
export function nuevoIdEnvioRed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const LOCALE_POR_IDIOMA: Record<string, string> = { es: 'es-CO', en: 'en-US', pt: 'pt-BR', de: 'de-DE' };
