## Context

- **El registro** tiene hoy cinco pantallas de una pregunta: nombre, correo, celular, documento y contraseña.
  - `Lead` (Meta) y `SubmitForm` (TikTok) salen al pasar del nombre.
  - `CompleteRegistration` sale al aprobar o al confirmar el código (`firePixel`, D-323).
  - Los píxeles solo se cargan en `/registrarse`, y en el inicio de sesión cuando alguien confirma su código.
- **`origenCampana`** (utm y fbclid/ttclid) solo queda en `surveyResponses`, así que hoy no se puede contar por campaña desde `companies`.
- **Hoy los eventos no llevan `event_id`**, y sin él Meta no puede deduplicar píxel y API de conversiones.
- **Fuentes de Meta** (leídas el 29-sep por la sesión de videos):
  - el objetivo de clientes potenciales calificados exige la API de conversiones para campañas nuevas desde abril de 2026 ([782657799338685](https://www.facebook.com/business/help/782657799338685));
  - parámetros B2B recomendados para el píxel, entre ellos `lead_score` ([502347657043574](https://www.facebook.com/business/help/502347657043574));
  - una conversión personalizada sobre un evento propio requiere asignarle una categoría estándar ([780705975381000](https://www.facebook.com/business/help/780705975381000), [462806641140703](https://www.facebook.com/business/help/462806641140703)).

## Decisions

1. **La pregunta sale solo con la marca de campaña y es opcional.**
   - **Marca:** el parámetro propio `perfil=vendedor` en el enlace del anuncio. `PixelesPautaService.capturarOrigen` lo guarda con los utm, en `sessionStorage`, para que sobreviva a los pasos.
     - Descartado depender de `utm_campaign=registros-vendedores`: se rompe si marketing renombra la campaña.
   - **Reutilizable:** una lista `PERFILES_REGISTRO` en el front, `{ vendedor: { pregunta, opciones } }`. Otra campaña agrega su perfil a la lista y el flujo no cambia.
   - **Dónde:** botones debajo del nombre del negocio, en el primer paso, sin pantalla nueva. No bloquean: "Siguiente" funciona sin responder.
   - **Sin marca:** el registro es el de hoy. La pregunta no se pinta y los eventos no llevan campos nuevos.
   - **Descartado ponerla como primer paso de la configuración inicial:** llegaría después del evento de registro.
   - **Valores guardados:** `no_vendo`, `menos_10`, `10_50`, `mas_50`, con calificación 0, 1, 2 y 3.
2. **Los eventos:**
   - **`CompleteRegistration`**, como hoy. Si hubo respuesta, además lleva `{ pedidos_semana, calificacion, lead_score: calificacion, value: calificacion, currency: "COP" }`.
     - El `value` es la calificación, no plata. Sirve para reglas de conversión personalizada.
     - `event_id = reg-<companyId>`.
   - **`VendedorActivo`**, un evento propio, solo con `10_50` o `mas_50`.
     - `event_id = va-<companyId>`.
     - Sale en el mismo momento que `CompleteRegistration`.
   - **TikTok:** `CompleteRegistration` con los mismos datos. `VendedorActivo` va como evento propio si la cuenta lo permite.
   - **`Lead`** (al pasar del nombre) lleva `pedidos_semana` y `lead_score` si hubo respuesta. Da volumen temprano, pero no pasa por el filtro, así que no se usa para optimizar la campaña.
   - **`VendedorActivo`** va con `trackCustom`. Para usarlo en una conversión personalizada, marketing le asigna una categoría estándar en Events Manager.
3. **El servidor decide, el navegador dispara.**
   - La respuesta de aprobar y la de confirmar el código traen `{ firePixel, eventId, vendedorActivo }`.
   - `registrationEventId` se guarda en la empresa. Así la API de conversiones, cuando se encienda, manda el mismo `event_id` y Meta deduplica.
   - Queda un adaptador `services/pauta/conversiones.js` apagado (`META_CAPI_ENABLED=false`), sin llamadas a la red hasta que haya token y OK de Daniel.
4. **La métrica:** `GET /v1/registro/metricas-campana?desde=` (Super Admin).
   - Agrupa las empresas por `origenCampana.utm_campaign` (sin campaña: "orgánico") y excluye `metricsExcluded` y los registros sin verificar.
   - Por campaña muestra registros, cuántos declaran `10_50` o `mas_50`, el porcentaje, el costo y el costo por vendedor activo.
   - El costo se guarda en `config/pautaCostos` (`{ [utm_campaign]: { costoCOP, actualizadoAt, por } }`) con `PUT` del Super Admin.
5. **Personalización (opcional, fase 2).** Con `10_50` o `mas_50`, la configuración inicial preselecciona el objetivo "Importar mis productos" y muestra primero pedidos, inventario y cobros. La tienda en 1 clic sigue apareciendo al final.

## Risks / Trade-offs

- **[Respuestas infladas para parecer serio]** → es autodeclarado. La métrica se contrasta después con pedidos reales en 30 días. Si la señal se ensucia, se sube a "Más de 50".
- **[Descuidar el registro gratis general]** → no se toca: la pregunta solo aparece con `perfil=vendedor`.
- **[Un campo más en el primer paso de la campaña nueva]** → son botones opcionales, sin teclado, y la tasa de paso se mide con `Lead`.
- **[La API de conversiones es obligatoria para ciertos objetivos]** → el `event_id` y el adaptador quedan listos. Se enciende cuando Daniel dé el token y el OK. Mientras tanto, la campaña optimiza a `VendedorActivo` por píxel, o a `Lead` como plan B, como propone marketing.

## Migration Plan

1. Backend: guardar el campo, la respuesta con `vendedorActivo` y la métrica.
2. Front: los botones, los eventos con `event_id` y el panel.
3. Desplegar antes del 1-oct con OK de Daniel. Marketing crea la conversión personalizada sobre `VendedorActivo`.
4. Fase 2: la personalización de la configuración inicial.
- **Reversa:** quitar `perfil=vendedor` del enlace del anuncio. Sin la marca, todo es como hoy.
