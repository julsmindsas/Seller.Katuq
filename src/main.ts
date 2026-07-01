import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/angular';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Sentry se inicializa ANTES del bootstrap para capturar también errores de
// arranque. Solo errores (tracesSampleRate 0) para cuidar la cuota gratuita.
// Acceso defensivo: los environment.ts están gitignoreados — en una máquina
// sin el campo `sentryDsn` la app simplemente no inicializa Sentry.
const _sentryDsn: string = (environment as any).sentryDsn || '';
if (_sentryDsn) {
  Sentry.init({
    dsn: _sentryDsn,
    environment: environment.production ? 'production' : 'development',
    // "2026.06.19.1 - 19 de Junio..." → release "katuq-front@2026.06.19.1"
    release: 'katuq-front@' + String(environment.version || 'dev').split(' ')[0],
    tracesSampleRate: 0,
    sendDefaultPii: false,
    ignoreErrors: [
      // Ruido de navegador sin valor accionable.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^Non-Error exception captured/,
      // Angular DevTools en desarrollo (mismo filtro que tenía app.component).
      /ng-debug-api/,
    ],
    beforeSend(event) {
      // Nunca enviar credenciales: el interceptor adjunta Authorization y
      // usage-code a cada request; si terminan en el evento, se eliminan.
      if (event.request && event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['authorization'];
        delete event.request.headers['usage-code'];
        delete event.request.headers['company'];
      }
      return event;
    },
  });
}

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
