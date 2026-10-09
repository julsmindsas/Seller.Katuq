/**
 * La sesión del navegador es de un administrador de Katuq (Julsmind). Es SOLO para decidir qué
 * mostrar y adónde redirigir: el candado real de "toda Katuq" es del backend (empresa del token).
 */
export function sesionEsJulsmind(): boolean {
  try {
    const crudo = localStorage.getItem('user');
    const usuario = crudo ? JSON.parse(crudo) : null;
    // Mismos roles que acepta el backend para "toda Katuq" (analyticsEnVivo.js: esRolAdministrador).
    return (
      !!usuario &&
      usuario.company === 'Julsmind' &&
      (usuario.rol === 'Administrador' || usuario.rol === 'Super Administrador')
    );
  } catch {
    return false;
  }
}
