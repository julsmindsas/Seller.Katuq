## Contexto

La fase 1 (D-483) ya guarda un documento por usuario y por ciclo en `surveyResponses` (`type: "nps"`, audiencia comercio, empresa receptora Julsmind). `respuestas.pendiente` decide con `elegibilidad.decidirCadencia`, y el front lo muestra con `nps-tarjeta`, montada en `app.component`. El correo y la página pública del comprador (D-490) ya resuelven un enlace firmado (`enlaceFirmado`) hasta una respuesta. Se reutiliza todo eso.

## Decisiones

1. **Configuración en `config/nps` (D-505).** Campos: `etapaComercios` (apagada, internos o todos), `correoComercios` (booleano), `compradores` (booleano, antes `NPS_COMPRADORES`) y `responsableComercios` (correo, antes `NPS_RESPONSABLE_COMERCIOS`).
   - Un lector, `services/nps/config.js`, con caché de 60 s (5 s si falla), el mismo patrón de `config/registro_independientes`.
   - Sin documento: todo apagado.
   - Se crea el documento con los valores de hoy del `.env`, y luego se quitan esas tres variables del servidor.
2. **Canal de presentación lo decide el servidor.** `pendiente` devuelve `{ id, presentacion }`:
   - `"ventana"` si el ciclo no tiene `ventanaAt`, y lo marca en la misma transacción (una sola vez por ciclo, aunque haya dos pestañas);
   - si ya la tiene, `"tarjeta"`.

   El front no guarda nada en el navegador.
3. **Front.**
   - `nps-tarjeta` gana dos modos: ventana (modal centrado, sin bloquear el cierre) y flotante cerrada (botón "Califica a Katuq" que se expande).
   - En `/welcome` no se monta la flotante: se usa `nps-inicio`, un componente nuevo que reutiliza `escala-nps` y el mismo servicio.
   - Los tres usan `NpsFeedbackService`: una sola llamada a `/pendiente` por carga, compartida.
4. **Correo.** Cron `npsComerciosCorreo`, a diario a las 10:00 Colombia, con `conLatido`:
   - recorre las empresas elegibles (misma `motivoDeExclusion`) y sus usuarios de la familia Administrador;
   - para cada uno, toma su último ciclo: si no hay o toca uno nuevo, lo crea con `crearCiclo` y origen `"correo"`; si está pendiente desde hace 3 días o más y sin `correoAt`, lo envía;
   - marca `correoAt` antes de enviar (reclamo en transacción), con un tope de 200 por corrida.

   El destinatario no se guarda en el ciclo: se lee del usuario al enviar.
5. **Página pública.** `publica.resolver` reconoce el token `nps` de un ciclo de comercio (`audience: "seller"`) y devuelve la pregunta de Katuq con su marca. `responder` y `comentar` delegan en `respuestas.responder`/`comentar`, por el camino de D-483, con el usuario del ciclo en vez de la sesión. Así el ticket del detractor y el cierre del ciclo salen iguales.
6. **Etapa "todos".** Se enciende en `config/nps` solo después de probar los tres canales internos en FLORECER. El correo, después de verificar SPF, DKIM y DMARC.

## Contratos

- `GET /v1/nps/pendiente` → `{ success, pregunta: { id, presentacion: "ventana" | "tarjeta" } | null }`. Hoy devuelve `{ id }`: el campo nuevo es compatible.
- `GET /v1/nps/publica/encuesta/:ref` → agrega `marca: "katuq"` cuando es la pregunta de Katuq.

## Write-set

`surveyResponses` (los ciclos de comercio: `ventanaAt`, `correoAt` y respuestas), `config/nps` y el ticket de soporte que ya abre D-483. Nada de pedidos, inventario, productos ni consecutivos.

## Pruebas

- Contrato: cadencia con canales (ventana una vez; responder por correo cierra el Seller y al revés; tope de 200; sin `config/nps`, todo apagado).
- La página pública con audiencia de comercio abre un solo ticket.
- Front: los tres modos en el navegador a 1440 y 390 px.
