/**
 * Archivos del chat de WhatsApp (bandeja única): tipos, topes y la lista blanca de formatos con que se crea un
 * `Blob` en el navegador. Funciones puras, sin Angular.
 *
 * Los topes y los tipos son solo para avisar antes de subir: quien decide es el servidor (firma del archivo,
 * reducción de fotos grandes y topes de WhatsApp).
 */
import { MediaKind } from "../models/whatsapp-thread.model";

const MB = 1024 * 1024;

/**
 * Lo que se le puede enviar al cliente por WhatsApp (atributo `accept` del selector). Las fotos van solo como
 * JPG o PNG para que el iPhone convierta las HEIC al elegirlas.
 */
export const ACCEPT_WHATSAPP = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".txt",
  "video/mp4",
  "video/3gpp",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/amr",
  "audio/ogg",
  ".m4a",
  ".mp3",
].join(",");

/** Tope por tipo antes de subir. Las fotos de más de 5 MB las reduce el servidor, así que se dejan hasta 25 MB. */
export const TOPE_SUBIDA: Record<MediaKind, number> = {
  image: 25 * MB,
  sticker: 1 * MB,
  audio: 16 * MB,
  video: 16 * MB,
  document: 25 * MB,
};

/** Texto que acompaña un archivo en WhatsApp. */
export const MAX_CAPTION = 1024;

/** Corte automático de una nota de voz. */
export const MAX_SEGUNDOS_VOZ = 150;

/** Formatos que el navegador puede mostrar o reproducir; con otro, el archivo solo se descarga. */
const MIME_POR_KIND: Record<MediaKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  sticker: ["image/webp", "image/png", "image/jpeg", "image/gif"],
  audio: ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr", "audio/wav", "audio/webm", "audio/x-m4a"],
  video: ["video/mp4", "video/3gpp", "video/webm"],
  document: [],
};

/** Ruta de un archivo del chat que sí se pide con la sesión. Cualquier otra no se pide. */
const RUTA_MEDIA = /^\/v1\/whatsapp\/conversations\/[A-Fa-f0-9]{64}\/media\/[A-Za-z0-9_.:=%-]{3,600}(\?lineId=[A-Za-z0-9_.:=%@+-]{1,300})?$/;

export function esRutaDeMedia(ruta: unknown): ruta is string {
  return typeof ruta === "string" && RUTA_MEDIA.test(ruta) && !ruta.includes("..");
}

/** Formato seguro para crear el `Blob`: el que llegó si está en la lista del tipo; si no, `application/octet-stream`. */
export function mimeSeguro(kind: MediaKind, ...candidatos: Array<string | null | undefined>): string {
  const permitidos = MIME_POR_KIND[kind] || [];
  for (const c of candidatos) {
    const base = String(c || "").split(";")[0].trim().toLowerCase();
    if (base && permitidos.includes(base)) return base;
  }
  return "application/octet-stream";
}

/** Tipo del archivo elegido (para la vista previa y el aviso de tamaño); el servidor lo confirma por la firma. */
export function kindDeArchivo(archivo: { type?: string; name?: string }): MediaKind {
  const tipo = String(archivo.type || "").toLowerCase();
  const nombre = String(archivo.name || "").toLowerCase();
  if (tipo.startsWith("image/")) return "image";
  if (tipo.startsWith("video/")) return "video";
  if (tipo.startsWith("audio/") || /\.(m4a|mp3|aac|amr|ogg|opus)$/.test(nombre)) return "audio";
  return "document";
}

/** «850 KB», «3,4 MB». */
export function tamanoLegible(bytes: number | null | undefined, locale = "es-CO"): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < MB) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = n / MB;
  try {
    return `${mb.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
  } catch {
    return `${mb.toFixed(1)} MB`;
  }
}

/** «1:05» */
export function duracionLegible(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Id del envío que el servidor usa para no mandar dos veces el mismo archivo (`^[A-Za-z0-9_-]{8,80}$`). */
export function nuevoClientMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Enlace de Google Maps de una ubicación (se abre aparte; no lleva datos de Katuq). */
export function enlaceMapa(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}
