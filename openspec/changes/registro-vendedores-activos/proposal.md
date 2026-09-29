## Why

La campaña de Meta que arranca el 1-oct busca "personas o negocios que YA venden y son serios; no tienen que ser formales" (Daniel). La de hoy trae sobre todo gente que empieza: de 36 registros de pauta, 35 con cédula y casi todos micro.

Daniel ya decidió:
- entran por el mismo registro, solos y sin llamadas;
- el anuncio no menciona precio ni "gratis".

Al optimizar por conversiones, Meta amplía los intereses de todos modos. La calidad solo se le enseña con una señal: un evento o parámetro que distinga a quien ya vende. Hoy el registro no pregunta nada que sirva para eso.

## What Changes

1. **El registro general NO cambia.** Daniel: "si cambiamos descuidamos a los que quiero que se registren gratis, porque eso genera tracción para inversionistas".
   - La pregunta "¿Cuántos pedidos recibes a la semana?" (Todavía no vendo · Menos de 10 · 10 a 50 · Más de 50) sale **solo** cuando el enlace del anuncio trae `perfil=vendedor`.
   - Sin esa marca, el registro y el píxel son idénticos a los de hoy.
   - Es **opcional**: sale como botones debajo del nombre del negocio, sin pantalla nueva. Si no la responde, se registra igual, sin mensaje ni bloqueo.
   - Queda **reutilizable**: cada perfil de campaña (`perfil=<nombre>`) define su pregunta en una lista del front. Una campaña futura trae su enlace y el flujo del registro no se toca.
   - La respuesta se guarda en la empresa (`pedidosSemana`) junto con `origenCampana` (incluido `perfil`), que hoy solo queda en la encuesta.
2. **Señal a Meta**, solo para registros aprobados o que confirmaron su correo (las mismas reglas del filtro):
   - solo cuando hubo respuesta: `CompleteRegistration` y `Lead` llevan `pedidos_semana`, `calificacion` y `lead_score` (el mismo valor, 0 a 3; `lead_score` es la clave B2B que recomienda Meta). Sin respuesta, salen como hoy;
   - además, quien recibe 10 o más pedidos a la semana dispara un evento propio, `VendedorActivo`. Con él se arma la conversión personalizada para optimizar la campaña nueva;
   - los dos llevan `event_id` estable. Queda listo el envío por la API de conversiones, con el mismo `event_id` para que Meta no cuente doble; la API se enciende aparte.
3. **Métrica por campaña en el panel del Super Admin.** Por `utm_campaign` muestra registros, cuántos venden 10 o más a la semana, el porcentaje y el costo por vendedor activo. El costo lo escribe el Super Admin, o la sesión de marketing, mientras no haya integración con Meta.
4. **Opcional: lo que sigue según la respuesta.** A quien ya vende 10 o más, la configuración inicial le propone primero pedidos, inventario y cobros (incluido importar su Excel), y la tienda después.

## Capabilities

### New Capabilities
- `seller-volume-signal`: la pregunta, la señal a Meta, la métrica por campaña y la personalización.

## Impact

- **Front:**
  - `/registrarse` (botones en el primer paso, eventos del píxel con `event_id`);
  - la pantalla del código (el evento sale al confirmar);
  - la configuración inicial (paso 4, opcional);
  - el panel del Super Admin.
- **Backend:**
  - `saveSurveyResponse` guarda `pedidosSemana` y `origenCampana` en la empresa;
  - la respuesta de aprobar y la de confirmar el código dicen si es vendedor activo;
  - métrica `GET /v1/registro/metricas-campana`.
- **Datos:** sin colecciones nuevas.
  - En `companies`: `pedidosSemana`, `origenCampana` y `registrationEventId`.
  - El costo por campaña va en un documento nuevo de la colección `config`, que ya existe.
- **Decisión:** D-327.
- **No-goals:**
  - el envío real por la API de conversiones (queda preparado);
  - cambiar el anuncio o la campaña (lo hace la sesión de videos);
  - que la respuesta cambie el filtro de registros falsos.
