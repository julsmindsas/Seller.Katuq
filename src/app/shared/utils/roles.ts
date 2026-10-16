/**
 * Familia de roles del front, espejo exacto de `middleware/requireRole.js` del
 * backend (`normalizeRole` + `isAdminFamilyRole`): si cambia allá, cambia acá.
 * El servidor sigue siendo quien decide (responde 403); esto solo decide qué se
 * muestra.
 */

/** Sin tildes, en minúsculas y con los espacios colapsados (igual que `normalizeRole`). */
export function normalizarRol(rol: unknown): string {
  return String(rol || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ¿El rol es de la familia Administrador? Busca "administrador" como palabra, así
 * entran "Administrador", "Administrador LT", "ADMINISTRADOR FULL OH" y también
 * "Super Administrador" (igual que `isAdminFamilyRole`).
 */
export function esFamiliaAdministrador(rol: unknown): boolean {
  return /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(normalizarRol(rol));
}

/** ¿El rol es exactamente "Super Administrador" (con o sin tildes y mayúsculas)? */
export function esSuperAdministrador(rol: unknown): boolean {
  return normalizarRol(rol) === 'super administrador';
}
