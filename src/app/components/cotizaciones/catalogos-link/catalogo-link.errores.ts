/**
 * Mensaje para el vendedor a partir de un error HTTP. El backend de catálogos ya responde en
 * lenguaje de negocio ("El catálogo necesita un nombre"); si no llega mensaje, se usa uno propio
 * que dice qué pasó y qué hacer.
 */
export function mensajeDeError(err: any, porDefecto: string): string {
  if (err?.status === 0) return "No hay conexión. Revisa tu internet e intenta de nuevo.";
  const msg = err?.error?.message;
  return typeof msg === "string" && msg.trim() ? msg : porDefecto;
}
