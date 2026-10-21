/**
 * Quién puede entrar a «Traer mi tienda» (F5-30, tarea 8.2): la bandera `storeMigrationImport` de la
 * empresa y un rol administrador. Es la misma regla de la cadena del servidor (`requireFeature` y
 * `ONLY_ADMIN`); el servidor sigue siendo quien decide. Puro, para probarlo sin Angular.
 */
export function esRolAdministrador(rol: unknown): boolean {
  return /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(String(rol === undefined || rol === null ? '' : rol).trim().toLowerCase());
}

export function puedeTraerTienda(banderaActiva: boolean, rol: unknown): boolean {
  return banderaActiva === true && esRolAdministrador(rol);
}
