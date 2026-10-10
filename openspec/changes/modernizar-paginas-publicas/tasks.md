## 1. Base común

- [x] 1.1 Crear `shared/components/publica/` con `_publica.scss` (tokens `$pub-*` y mixin `publica-piezas`), `publica-marco.component` y `PublicaModule`.
- [x] 1.2 Registrar D-398 en `specs/CONTRACT.md`.

## 2. Pantallas (una tarea por pantalla; leer el componente antes de editarlo; mismo comportamiento)

- [x] 2.1 Recuperar contraseña (`pages/authentication/forgot-password`).
- [x] 2.2 Crear nueva contraseña (`pages/authentication/reset-password`).
- [x] 2.3 Cambio obligatorio de contraseña (`components/change-password`).
- [x] 2.4 Términos y condiciones: ruta del PDF real + marco de lectura + botón Descargar.
- [x] 2.5 Política de privacidad: quitar gradientes, marco de lectura.
- [x] 2.6 Resultado del pago (`components/payment-callback`).
- [x] 2.7 Resultado de la suscripción (`components/subscription-callback`).
- [x] 2.8 Página no encontrada (`shared/components/page-not-found`).
- [x] 2.9 Ingresa a tu cuenta (`auth/login`): solo la columna del formulario y textos en español.
- [x] 2.10 Rutas de la plantilla y `forget-password` → `redirectTo`.

## 3. Cierre

- [ ] 3.1 `ng build --configuration production` sin errores.
- [ ] 3.2 Capturas Playwright 1440/390 de cada pantalla desde el `dist` local; sin logo roto, sin inglés, sin scroll horizontal.
- [ ] 3.3 Publicar, probar en producción y registrar el cierre en CONTRACT.md.
