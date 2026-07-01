import * as Sentry from '@sentry/angular';

/**
 * Sincroniza el usuario/empresa del localStorage al scope de Sentry para que
 * cada error llegue con contexto de quién y de qué comercio (multi-tenant).
 *
 * Se invoca en dos puntos: al bootstrap de la app (AppComponent) y tras el
 * login (AuthService.SignIn). Si no hay sesión, limpia el scope para no
 * atribuir errores a un usuario viejo.
 */
export function syncSentryUserContext(): void {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) {
      Sentry.setUser(null);
      return;
    }
    const u = JSON.parse(raw);
    Sentry.setUser({
      id: u.nit || undefined,
      email: u.email || undefined,
      username: u.name || u.email || undefined,
    });
    Sentry.setTag('company', u.company || 'sin-company');
    Sentry.setTag('rol', u.rol || 'sin-rol');
  } catch {
    // localStorage corrupto: la telemetría nunca debe romper la app.
  }
}
