import { PricingModeService } from '../../../shared/services/empresas/pricing-mode.service';

/**
 * La sesión es de la familia Administrador (Administrador, Super Administrador, "ADMINISTRADOR FULL
 * OH"...), igual que `requireRole` del backend. Solo decide qué mostrar (el interruptor de Opttia, el
 * inicio): el servidor es quien rechaza a los demás roles (403).
 */
export function sesionEsAdministrador(): boolean {
  try {
    const crudo = localStorage.getItem('user');
    return PricingModeService.esRolAdministrador(crudo ? JSON.parse(crudo)?.rol : null);
  } catch {
    return false;
  }
}

/**
 * La sesión puede abrir "En vivo" de su comercio (D-575): la familia Administrador o un rol con la
 * entrada `en-vivo` en su menú. Es la regla del backend (analyticsEnVivo.js); si se apartan, el
 * inicio llevaría a una pantalla que dice "no disponible".
 */
export function sesionPuedeVerEnVivo(): boolean {
  if (sesionEsAdministrador()) return true;
  try {
    const menus = JSON.parse(localStorage.getItem('authorizedMenuItems') || '[]');
    return Array.isArray(menus) && menus.some((m) => m?.path === 'en-vivo');
  } catch {
    return false;
  }
}

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
