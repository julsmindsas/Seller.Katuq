import { ErrorHandler, Injectable } from '@angular/core';
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

  handleError(error: any): void {
    if (this.isChunkLoadError(error)) {
      if (this.tryReloadOnce()) {
        console.warn(
          '[ChunkLoadError] bundle desactualizado tras un deploy; recargando para traer la versión nueva...',
        );
        // hard reload para saltarse la caché del index.html
        window.location.reload();
        return;
      }
      // Ya se recargó hace muy poco y sigue fallando: no reintentar (evita bucle),
      // dejar que Sentry lo registre para diagnóstico.
    }

    this.sentryHandler.handleError(error);
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
