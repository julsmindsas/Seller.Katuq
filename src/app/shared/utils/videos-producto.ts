/**
 * Ticket 1405: reconoce enlaces de video de YouTube, TikTok, Instagram y Vimeo.
 * Es la misma regla de `functions/utils/videosProducto.js`; aquí solo sirve para avisar en el
 * formulario. Lo que se guarda lo decide el servidor.
 */
export interface VideoProducto {
  tipo: 'enlace' | 'archivo';
  proveedor: 'youtube' | 'tiktok' | 'instagram' | 'vimeo' | 'katuq';
  id: string;
  url: string;
  embed?: string;
  path?: string;
}

/** Formatos de los videos subidos; el tope de tamaño y duración lo manda el servidor según el plan. */
export const TIPOS_VIDEO_ARCHIVO = ['video/mp4', 'video/webm'];

export const MAX_VIDEOS_PRODUCTO = 5;

export const NOMBRE_PROVEEDOR: Record<VideoProducto['proveedor'], string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  vimeo: 'Vimeo',
  katuq: 'Video subido',
};

/** Duración en segundos de un archivo de video, leída en el navegador (0 si no se pudo). */
export function duracionDeVideo(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? v.duration : 0); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    v.src = url;
  });
}

export function reconocerVideo(texto: string): VideoProducto | null {
  const limpio = String(texto || '').trim();
  if (!limpio) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const partes = u.pathname.split('/').filter(Boolean);
  const video = (proveedor: 'youtube' | 'tiktok' | 'instagram' | 'vimeo', id: string): VideoProducto => ({ tipo: 'enlace', proveedor, id, url: limpio });

  if (host === 'youtu.be' && /^[\w-]{11}$/.test(partes[0] || '')) return video('youtube', partes[0]);
  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{11}$/.test(v)) return video('youtube', v);
    if (['shorts', 'embed', 'live'].includes(partes[0]) && /^[\w-]{11}$/.test(partes[1] || '')) return video('youtube', partes[1]);
    return null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = partes.find((p) => /^\d{5,12}$/.test(p));
    return id ? video('vimeo', id) : null;
  }
  if (host === 'tiktok.com') {
    const i = partes.indexOf('video');
    const id = i >= 0 ? partes[i + 1] : null;
    return id && /^\d{8,25}$/.test(id) ? video('tiktok', id) : null;
  }
  if (host === 'instagram.com') {
    const i = partes.findIndex((p) => p === 'p' || p === 'reel' || p === 'tv');
    const id = i >= 0 ? partes[i + 1] : null;
    return id && /^[\w-]{5,40}$/.test(id) ? video('instagram', id) : null;
  }
  return null;
}
