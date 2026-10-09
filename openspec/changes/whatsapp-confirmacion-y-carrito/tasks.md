## 0. Decisiones

- [x] 0.1 Plan aprobado por Daniel (2026-10-08).
- [ ] 0.2 Daniel aprueba **este diff** (tres parches del backend y uno del front). Módulos sensibles: un paquete a la vez, con diff a la vista.
- [ ] 0.3 Responder las preguntas abiertas de `design.md` (compuerta de notificaciones, doble mensaje, WhatsApp y correo, verificación del teléfono, precio, número de FLORECER, tope diario, sondeo de respaldo).
- [ ] 0.4 Registrar la decisión en `specs/CONTRACT.md` con su número D-XXX (lo asigna quien haga el commit).

## 1. Fundación (dependencia, la implementa otro agente)

- [ ] 1.1 `services/companyFeatureFlags.js` y `scripts/set-company-feature.js` en el repo. Los parches no los reimplementan; leen la bandera con `isFeatureEnabled(company, flag)` y, si el módulo no está o falla, la tratan como apagada.

## 2. Confirmación — backend (`1-confirmacion-back.patch`)

- [ ] 2.1 Prueba de contrato de `sendTemplate` con botones: sin botones el cuerpo del envío es el de siempre (también sin variables); con botones salen `quick_reply` con su `payload`; en sandbox se ignoran. (`kapsoPlantillaBotones`, 7 casos)
- [ ] 2.2 `kapsoService.sendTemplate` acepta `buttons`.
- [ ] 2.3 Servicio `whatsappConfirmacionPedido` y su prueba: bandera apagada sin efectos (y sin armar dependencias), compuertas, una sola vez, marca, confirmar, cancelar con `restoreStock`, **dos toques a la vez con la devolución lenta**, **el mismo toque entregado dos veces a la vez**, **retomar solo si la marca es vieja y el pedido sigue sin moverse**, **pedido tomado por un mensajero / con orden de envío / con factura en curso**, **una respuesta por resultado repetido**, **el nombre que no puede ser un enlace**, teléfono y empresa, falla de devolución, falla después de devolver, write-set. (50 casos)
- [ ] 2.4 Llamado en `orderNotificationService.notify`, detrás de la compuerta y la idempotencia de siempre, y su prueba. (5 casos)
- [ ] 2.5 Webhook: reconoce el toque de la plantilla (`type: button`), responde 200 antes de decidir, no lo manda al bot, **no se queda con las respuestas interactivas del bot**, y su prueba contra el controlador real. (11 casos)
- [ ] 2.6 **Sondeo de respaldo** (`kapsoInboundPoller`): si guarda el toque antes que el webhook, también lo decide; prueba con el poller y el webhook reales, en las dos órdenes. (`kapsoPollerConfirmacion`, 5 casos)
- [ ] 2.7 **Mostrar el diff a Daniel** antes de aplicar.
- [ ] 2.8 `node --check` de cada archivo, reinicio local del backend sin errores (no hay hot-reload) y las pruebas existentes de WhatsApp, sitios y notificaciones sin cambios.

## 3. Confirmación — front (`1-confirmacion-front.patch`)

- [ ] 3.1 `etiquetaConfirmacionWhatsapp` y la insignia en la fila, el detalle y la tabla de `ventas/list`; las etiquetas no se quedan pegadas (ver `design.md`, decisión 8).
- [ ] 3.2 `npm run build` sin errores. (No se compiló al preparar el parche: el front no se puede compilar desde aquí.)
- [ ] 3.3 Revisión visual con un pedido de FLORECER en cada estado.

## 4. Carrito — backend (`2-carrito-back.patch`)

- [ ] 4.1 `utils/siteCarrito.js` (puro): **solo celulares colombianos**, id por teléfono, prueba del permiso **con la huella de origen**, decisión por canal. El id del correo no cambia.
- [ ] 4.2 `guardarCarrito` (permiso, retiro en los dos carritos, unificar el del teléfono cuando llega el correo), `cerrarCarritoAlComprar` (con teléfono), `recordarCarritosAbandonados` (**horario de la Ley 2300**, permiso releído al reclamar) y el render (**casilla solo si el plan manda recordatorios**).
- [ ] 4.3 La casilla en el checkout (`siteTienda.js`) y la bandera en el render (`siteHtml.js`, en un lugar que no choca con otros parches). Con la bandera apagada, el script de la tienda no cambia.
- [ ] 4.4 **Freno por tienda** (`routers/sites.js`): 60 carritos con permiso por hora y tienda.
- [ ] 4.5 Actualizar las tres aserciones de `scripts/test-sitios-publicacion.js` (la llamada a `cerrarCarritoAlComprar`, la guarda del correo apagado —ya no pasa en vacío— y la ruta del carrito).
- [ ] 4.6 Servicio `whatsappRecuperacionCarrito`: **un recordatorio por día por teléfono y empresa**, **tope diario por empresa**, **nombre filtrado**; y la prueba `carritoWhatsapp` (54 casos), con las pruebas existentes de `tests/sitios/*` en verde.
- [ ] 4.7 `node --check` de cada archivo y reinicio local del backend sin errores.
- [ ] 4.8 **Mostrar el diff a Daniel** antes de aplicar.

## 5. Plantillas ante Meta (`3-plantillas-meta-back.patch`)

- [ ] 5.1 `scripts/kapso-registrar-plantillas.js` (simulacro por defecto; con `--execute` **no crea nada si no pudo comprobar que ya existe**) y su prueba. (12 casos)
- [ ] 5.2 Daniel revisa los textos finales de `design.md`.
- [ ] 5.3 Daniel corre `node scripts/kapso-registrar-plantillas.js --execute`.
- [ ] 5.4 Seguir con `--status` hasta que ambas digan APPROVED. Confirmar que la de confirmación quedó en UTILITY.

## 6. Prueba en FLORECER

- [ ] 6.1 Prerrequisitos: `featureFlags.whatsappOrderConfirmation` y `whatsappCartRecovery` en `true` (script de la Fundación); canal de WhatsApp de FLORECER encendido, aceptado, con número real y saldo; FLORECER en `ORDER_NOTIF_UNIFIED_COMPANIES`; `CARRITO_ABANDONADO_CRON_ENABLED=true`; las dos plantillas aprobadas.
- [ ] 6.2 Primer toque: leer en `whatsapp_inbound` que `raw.type` sea `button` y `raw.button.payload` sea `confirm:<id>` (y no el texto del botón).
- [ ] 6.3 Pedido contra entrega → llega el mensaje → Confirmar → etiqueta "Confirmado" y respuesta. Tocar Confirmar varias veces: llega un solo "ya estaba confirmado".
- [ ] 6.4 Otro pedido → Cancelar (dos veces seguidas) → existencias antes y después (suben **una** vez), estado Cancelado, respuesta. Otro movido a mano antes de tocar (pago PreAprobado, o un mensajero que lo tomó) → "Pidió cancelar" y nada cancelado.
- [ ] 6.5 Carrito sin correo con la casilla marcada, **en horario permitido** → a la hora llega el recordatorio → el enlace rearma el carrito → comprar cierra el carrito. Responder BAJA y comprobar que no vuelve. Repetir con el mismo teléfono y otro correo: no llega un segundo mensaje.
- [ ] 6.6 Fuera de horario (domingo, o sábado después de las 3 p. m.): el carrito espera y no sale nada.
- [ ] 6.7 Apagar las dos banderas y repetir: todo vuelve a ser como hoy.

## 7. Cierre

- [ ] 7.1 Registrar en `CONTRACT.md` y en la memoria.
- [ ] 7.2 Retirar las banderas (dueño: Daniel; fecha propuesta: 2027-01-31, Art. XII) cuando los comercios que las usen estén estables.
- [ ] 7.3 Pendiente aparte: el aviso de "pedido recibido" que ya existe (`whatsappTemplates.js`) saluda con el nombre sin filtrarlo; aplicarle la misma regla.

## Avance (2026-10-08, segunda ronda)

- Los parches están regenerados y **no aplicados**: `git apply --check` pasa para los cuatro contra el árbol de trabajo actual, y los tres del backend se aplican juntos en las seis órdenes (también junto a los parches de "comprar ahora" y de Wompi que tocan los mismos archivos).
- Se corrieron las pruebas nuevas y las existentes de sitios, WhatsApp, notificaciones y contratos de inventario contra el código parchado, sin tocar los repositorios. Todo en verde. La compilación del front y la prueba con Meta de verdad quedan pendientes.
- `openspec validate whatsapp-confirmacion-y-carrito --strict` pasa.
