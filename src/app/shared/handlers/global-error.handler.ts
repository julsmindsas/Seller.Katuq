import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';
import * as Sentry from '@sentry/angular';

/**
 * ErrorHandler global de la app.
 *
 * Detecta ChunkLoadError — el fallo típico cuando, tras un deploy, el index.html
 * quedó cacheado en el navegador y pide un chunk lazy con hash viejo que ya no
 * existe en el servidor. Sin manejo, el import() de la ruta se rechaza, el router
 * no pinta nada y la página queda en blanco / "cargando" (ClickUp wdu9v76w1g,
 * observado en /despachos). Ante ese caso recargamos UNA vez para traer el bundle
 * nuevo; cualquier otro error se delega a Sentry igual que antes.
 *
 * La recarga va a la ruta que el usuario INTENTABA abrir, no a la actual: el router
 * solo cambia la URL del navegador después de cargar el módulo lazy, así que cuando
 * el chunk falla la barra todavía dice /welcome y un reload a secas dejaba al
 * usuario "rebotado" al inicio (clic en Logística → Envíos y entregas → welcome).
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // Handler de Sentry con la misma configuración previa (showDialog:false, logErrors:true).
  private readonly sentryHandler = Sentry.createErrorHandler({
    showDialog: false,
    logErrors: true,
  });

  // Marca en sessionStorage para no entrar en bucle de recargas.
  private static readonly RELOAD_FLAG = 'chunkReloadAt';
  private static readonly RELOAD_COOLDOWN_MS = 10000;

  /** URL de la navegación en curso (la que pidió el chunk que falló). */
  private pendingUrl: string | null = null;
  private routerHooked = false;

  constructor(private injector: Injector) {
    // El ErrorHandler nace durante el bootstrap, antes de que exista el Router;
    // se engancha en el siguiente tick para que ya esté escuchando la primera
    // navegación (si se hiciera solo al primer error, llegaría tarde).
    setTimeout(() => this.hookRouter(), 0);
  }

  handleError(error: any): void {
    this.hookRouter();

    if (this.isChunkLoadError(error)) {
      if (this.tryReloadOnce()) {
        const target = this.pendingUrl;
        console.warn(
          `[ChunkLoadError] bundle desactualizado tras un deploy; recargando ${target || 'la página'} para traer la versión nueva...`,
        );
        // Carga completa (salta la caché del index.html) directo a la ruta destino.
        if (target) {
          window.location.assign(target);
        } else {
          window.location.reload();
        }
        return;
      }
      // Ya se recargó hace muy poco y sigue fallando: no reintentar (evita bucle),
      // dejar que Sentry lo registre para diagnóstico.
    }

    this.sentryHandler.handleError(error);
  }

  /**
   * Se engancha al router de forma perezosa (el ErrorHandler se instancia antes que
   * el Router; inyectarlo en el constructor crea dependencia circular). Guarda la URL
   * de cada navegación que arranca y la suelta cuando termina bien.
   */
  private hookRouter(): void {
    if (this.routerHooked) return;
    try {
      const router = this.injector.get(Router, null);
      if (!router) return;
      this.routerHooked = true;
      router.events.subscribe((ev) => {
        if (ev instanceof NavigationStart) {
          this.pendingUrl = ev.url;
        } else if (ev instanceof NavigationEnd || ev instanceof NavigationCancel) {
          // NavigationError NO limpia: es justo el evento que precede al
          // ChunkLoadError y necesitamos la URL para recargar hacia ella.
          this.pendingUrl = null;
        }
      });
    } catch {
      // Router aún no disponible; se reintenta en el próximo error.
    }
  }

  /** Reconoce el error tanto si llega directo como envuelto en una promesa rechazada. */
  private isChunkLoadError(error: any): boolean {
    const name = error?.name || error?.rejection?.name || '';
    const message =
      error?.message || error?.rejection?.message || String(error || '');
    return (
      name === 'ChunkLoadError' ||
      /Loading chunk [\w-]+ failed/i.test(message) ||
      /Loading CSS chunk [\w-]+ failed/i.test(message)
    );
  }

  /**
   * Devuelve true (y marca el momento) si se debe recargar. Si ya se recargó dentro
   * del cooldown, devuelve false para no caer en un ciclo de recargas infinito.
   */
  private tryReloadOnce(): boolean {
    try {
      const last = Number(
        sessionStorage.getItem(GlobalErrorHandler.RELOAD_FLAG) || '0',
      );
      const now = Date.now();
      if (last && now - last < GlobalErrorHandler.RELOAD_COOLDOWN_MS) {
        return false;
      }
      sessionStorage.setItem(GlobalErrorHandler.RELOAD_FLAG, String(now));
      return true;
    } catch {
      // Si sessionStorage no está disponible, recargar una sola vez sin guard.
      return true;
    }
  }
}
