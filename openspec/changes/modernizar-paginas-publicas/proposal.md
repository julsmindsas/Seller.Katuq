## Why

Las pantallas públicas de Katuq (las que se ven sin sesión o justo al entrar) quedaron con el diseño de la plantilla vieja, mientras que "Regístrese" ya tiene el diseño aprobado por Daniel el 2026-09-24 (tema canónico, plano, primero celular). Revisadas en producción el 2026-10-09 (capturas a 1440 y 390 px):

- **Términos y condiciones** muestra un 404 dentro de la página: el componente pide `assets/pdf/Terminos y Condiciones Generales de uso KATUQ.pdf` y el archivo real se llama `...KATUQ.docx.pdf`.
- **Recuperar contraseña** y **Crear nueva contraseña** muestran el logo roto (texto "forgot password page") y un botón lila pálido.
- **Desbloquear** y las páginas de demostración de la plantilla (`authentication/login/*`, `authentication/register/*`) están en inglés ("Unlock", "Sign in") y con el logo roto; nadie las enlaza.
- **Cambio obligatorio de contraseña** no tiene diseño: logo gigante, campos sin borde, botones sueltos.
- **Política de privacidad** usa gradientes (prohibidos por el design-system).
- **Resultado del pago** usa letra con serifa y un recuadro vacío; **Resultado de la suscripción** usa gradientes, un botón verde y el ícono separado del texto.
- **Ingresa a tu cuenta** está bien armada pero con otro estilo y textos en inglés ("show", "app@yourmail.com").
- **Página no encontrada (404)** usa el estilo de la plantilla.

Decisión: **D-398** en `specs/CONTRACT.md` (pedido de Daniel: "revisa páginas viejas de Katuq y modernízalas como Regístrese").

## What Changes

- Una **base común para las pantallas públicas**: barra superior con el logo de Katuq (el mismo SVG de Regístrese) y un enlace a la derecha, columna principal y, en pantallas anchas, un panel lateral lila opcional. Las piezas (título, texto, campo, botón, aviso de error/éxito, enlace) con los mismos tokens que Regístrese (`#5F3FE0`, ink `#211F3A`, Geometr415, radios 11/16 px, sin gradientes).
- Rediseño, **sin cambiar lo que hacen**, de: Recuperar contraseña, Crear nueva contraseña, Cambio obligatorio de contraseña, Términos y condiciones (con el PDF que sí existe y botón de descarga), Política de privacidad (mismo texto), Resultado del pago, Resultado de la suscripción, Página no encontrada e Ingresa a tu cuenta (solo la columna del formulario y sus textos; la imagen de la izquierda se queda).
- Textos en español: "Mostrar/Ocultar", "tu@correo.com", "Volver a entrar".
- Las páginas de demostración de la plantilla (`authentication/login/*`, `authentication/register/*`, `authentication/unlock-user`) y el duplicado `authentication/forget-password` **redirigen** a `/login`, `/registrarse` o `/authentication/forgot-password`.

## Capabilities

### New Capabilities
- `paginas-publicas`: aspecto, textos y comportamiento visible de las pantallas públicas (sin sesión o de paso) de Seller Center.

### Modified Capabilities
<!-- Ninguna: el design-system no cambia; esta capacidad lo aplica. -->

## Impact

- Front únicamente (`Seller.Katuq`): `pages/authentication/*`, `components/change-password`, `components/terms-conditions`, `components/privacy-policy`, `components/payment-callback`, `components/subscription-callback`, `shared/components/page-not-found`, `auth/login` y un módulo compartido nuevo en `shared/components/publica/`.
- Backend: sin cambios. Mismos endpoints (`/v1/authentication/forgot-password`, `/reset-password`, cambio de contraseña, Wompi).

## No-goals

- No cambia el flujo de registro (`/registrarse`) ni el onboarding.
- No cambia la lógica de login, recuperación, pagos ni suscripciones: mismas llamadas, validaciones y redirecciones.
- No cambia el texto legal de privacidad ni de términos.
- No toca pantallas internas (con menú).

## Riesgos

- **Login es la puerta de toda la app.** Se cambia solo la presentación del formulario; los `formControlName`, eventos y redirecciones quedan iguales y se prueba entrar en producción antes de cerrar.
- **Cambio obligatorio de contraseña** (`mustChangePassword`): se conserva "Cambiar más tarde" y el hash del cliente.
- **Resultado de pago/suscripción** lo abre Wompi: los parámetros de la URL y las consultas no cambian.
- Sin módulos sensibles (orders/inventory/consecutivos).
