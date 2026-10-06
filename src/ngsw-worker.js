/**
 * Ticket 1078 (D-356): interruptor de apagado del Service Worker viejo.
 *
 * Entre oct-2025 y mar-2026 la app registraba el Service Worker de Angular
 * (`ngsw-worker.js`). Al desactivarlo no se publicó nada que lo desinstalara, y
 * los navegadores que lo tenían siguen sirviendo la versión vieja guardada en su
 * caché: la app queda en blanco en el perfil normal y funciona en incógnito.
 *
 * Este archivo reemplaza al worker viejo en la misma URL. Cuando el navegador
 * revisa si hay versión nueva del worker, instala este, que se desinstala solo y
 * borra las cachés `ngsw:*`. Es una copia de `@angular/service-worker/safety-worker.js`.
 * No se borra mientras pueda quedar algún navegador con el worker viejo.
 */

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());

  event.waitUntil(self.registration.unregister());

  event.waitUntil(caches.keys().then(cacheNames => {
    const ngswCacheNames = cacheNames.filter(name => /^ngsw:/.test(name));
    return Promise.all(ngswCacheNames.map(name => caches.delete(name)));
  }));
});
