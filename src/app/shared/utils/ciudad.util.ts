/**
 * Normaliza un nombre de ciudad/municipio para comparar direcciones de venta
 * asistida contra la ciudad seleccionada en el paso de productos.
 *
 * El mismo municipio puede llegar con grafías distintas según de qué catálogo
 * salió (el legacy `Mock/pais-estado-ciudad.ts` vs el oficial DANE
 * `colombia-dane-codes.ts`) — comparado sin normalizar, "Bogota" y "Bogotá"
 * nunca matchean. El sufijo "D.C." es un caso aparte: no es un problema de
 * tilde/mayúscula, es un sufijo real distinto que DANE agrega SOLO a Bogotá
 * (único caso en los 1099 municipios del catálogo) — se le quita explícito
 * en vez de armar una tabla de alias genérica que no aplicaría a ningún otro
 * municipio hoy.
 */
export function normalizarCiudad(ciudad: string): string {
  return String(ciudad || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+d\.?\s*c\.?\s*$/i, '')
    .trim();
}
