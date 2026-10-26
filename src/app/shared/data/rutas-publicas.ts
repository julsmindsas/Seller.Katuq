/**
 * Rutas donde no aparecen las ventanas propias de la sesión (novedades, encuesta NPS):
 * páginas sin menú que se abren sin cuenta o en pantalla completa (D-483).
 *
 * El 404 no tiene prefijo propio (es la ruta `**`): quien necesite excluirlo lo mira en
 * el estado del router, como hace la tarjeta NPS.
 */

/**
 * La lista con la que nació el modal de novedades. El modal la sigue usando tal cual y
 * con su misma comparación (`url.startsWith`), así que su comportamiento no cambia.
 * Pasarlo a `RUTAS_PUBLICAS` completa es otro cambio.
 */
export const RUTAS_PUBLICAS_BASE: readonly string[] = [
  '/login', '/authentication', '/registrarse', '/nuevo-registro',
  '/change-password', '/terms-conditions', '/privacy-policy',
  '/video-agent', '/live-audio',
];

/**
 * Todas: las de arriba, la landing de campaña, los resultados de pago, el onboarding,
 * los enlaces públicos (reportes, cotizaciones, sitios y catálogos) y la
 * encuesta pública a compradores (fase 2).
 */
export const RUTAS_PUBLICAS: readonly string[] = [
  ...RUTAS_PUBLICAS_BASE,
  '/promo', '/payment-callback', '/subscription-callback', '/onboarding',
  '/r', '/c', '/s', '/cat',
  '/encuesta',
  // Subida de archivos de un ticket abierto desde Claude (D-549, plan B): enlace de un solo uso, sin cuenta.
  '/adjuntar',
];

/** Ruta sin query, fragmento ni parámetros de matriz. */
export function rutaSinQuery(url: string): string {
  return String(url || '').split(/[?#;]/)[0] || '/';
}

/**
 * ¿La URL es de una ruta pública? Compara por segmento completo: `/r` es pública pero
 * `/rol` no, y `/c` no se traga `/crm` ni `/cartera`.
 */
export function esRutaPublica(url: string, rutas: readonly string[] = RUTAS_PUBLICAS): boolean {
  const ruta = rutaSinQuery(url);
  return rutas.some((p) => ruta === p || ruta.startsWith(p + '/'));
}
