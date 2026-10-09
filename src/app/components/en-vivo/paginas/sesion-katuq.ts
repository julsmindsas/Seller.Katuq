/**
 * La sesión del navegador es de un administrador de Katuq (Julsmind). Es SOLO para decidir qué
 * mostrar y adónde redirigir: el candado real de "toda Katuq" es del backend (empresa del token).
 */
export function sesionEsJulsmind(): boolean {
  try {
    const crudo = localStorage.getItem('user');
    const usuario = crudo ? JSON.parse(crudo) : null;
    return !!usuario && usuario.rol === 'Administrador' && usuario.company === 'Julsmind';
  } catch {
    return false;
  }
}
