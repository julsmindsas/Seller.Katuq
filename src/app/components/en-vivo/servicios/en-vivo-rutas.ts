/**
 * Rutas del backend para "En vivo" (diseño 5). Puras: las usan `EnVivoService`
 * (HTTP por BaseService) y `EnVivoCanalService` (fetch del stream), para que las dos
 * armen la misma dirección.
 *
 * `?empresa=` solo lo respeta el servidor con una sesión de Katuq (Julsmind); con
 * cualquier otra sesión lo ignora. El front manda siempre el encabezado `company` de
 * la sesión, nunca el del comercio que mira.
 */

export const RUTA_EN_VIVO = '/v1/analytics/en-vivo';

/** Arma `?a=1&b=2` con los valores presentes; vacío si no hay ninguno. */
export function consulta(parametros: Record<string, string | null | undefined>): string {
  const partes = Object.keys(parametros)
    .filter((clave) => {
      const valor = parametros[clave];
      return valor !== undefined && valor !== null && valor !== '';
    })
    .map((clave) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(parametros[clave]))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

export const rutasEnVivo = {
  foto: (empresa?: string): string => `${RUTA_EN_VIVO}/foto${consulta({ empresa })}`,
  fotoGlobal: (): string => `${RUTA_EN_VIVO}/global/foto`,
  stream: (empresa?: string): string => `${RUTA_EN_VIVO}/stream${consulta({ empresa })}`,
  streamGlobal: (): string => `${RUTA_EN_VIVO}/global/stream`,
  detalle: (id: string, empresa?: string): string =>
    `${RUTA_EN_VIVO}/pedido/${encodeURIComponent(id)}${consulta({ empresa })}`,
  pregunta: (empresa?: string): string => `${RUTA_EN_VIVO}/opttia/pregunta${consulta({ empresa })}`,
};
