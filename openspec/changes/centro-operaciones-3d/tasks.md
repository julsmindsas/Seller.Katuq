## 1. Medición previa (sin código de producto)

- [ ] 1.1 Con un script de solo lectura, medir para FLORECER, ALMARA FELICIDAD y OH MY STORE: tamaño de la cola operativa, productos únicos en la cola, pedidos sin `bodegaId` y cuántos saldrían frenados. Anotar los números en `design.md`.
- [ ] 1.2 Confirmar con Daniel qué roles de FLORECER llevan el menú (pregunta abierta del diseño).

## 2. Backend: foto de la operación (solo lectura)

- [ ] 2.1 Servicio `services/operacion/fotoOperacion.js`: cola (`READY_STATES`, `.select()`, sin cancelados, alcance D-349), productos únicos, `getRealStockMap` por bodega y regla de frenado con respaldo `stockTotal` si falta `bodegaId`.
- [ ] 2.2 Ruta `GET /v1/analytics/logistica/centro-operaciones` con `auth`; empresa del token; 403 "no disponible" si `companyConfig/{empresa}.centroOperaciones3d !== true`; tope de 3.000 pedidos con `truncado`.
- [ ] 2.3 Prueba de contrato del write-set: falla si el servicio escribe en `inventory`, `inventoryMovement`, `products`, precios, listas de precios o cualquier colección.
- [ ] 2.4 Prueba de la regla: negativo en la bodega frena; no inventariable no frena; registro duplicado por referencia y por docId cuenta una vez; respaldo por `stockTotal`.
- [ ] 2.5 `node --check` y la prueba del 2.4 contra datos reales de FLORECER (solo lectura).

## 3. Frontend: pantalla y escena

- [ ] 3.1 Módulo lazy `components/centro-operaciones/`, ruta `centro-operaciones` con `AuthGuard` y entrada en `nav.service.ts`.
- [ ] 3.2 `CentroOperacionesService extends BaseService` con la foto; estado "no disponible" para el 403.
- [ ] 3.3 `CentroOperacionesEscena extends EscenaBase`: nivel bodega (estanterías instanciadas, color por stock), nivel muelles (etapas, urgentes, camiones por transportador), transición de cámara entre niveles y tope de 60 pedidos por muelle con "+N".
- [ ] 3.4 Pedidos frenados: etiqueta "faltan N de <producto>", parpadeo de la estantería y foco que ilumina los pedidos de un producto.
- [ ] 3.5 Panel en texto: cola por etapa, frenados y faltantes; modo sin WebGL operativo con solo el panel.
- [ ] 3.6 Refresco cada 60 s visible, al volver de Despachos, pausa con pestaña oculta y respeto a "reducir movimiento".
- [ ] 3.7 Revisión contra el tema canónico (`openspec/specs/design-system`) y spans con color propio (regla `span.ng-star-inserted`).

## 4. Acciones (un cambio a la vez, con diff aprobado: módulo sensible)

- [ ] 4.1 Generar guía desde la escena con `LogisticaServiceV2.generarGuia(orderId)` y la misma apertura del PDF que Despachos.
- [ ] 4.2 Abrir detalle: navegar a Pedidos con el pedido seleccionado.
- [ ] 4.3 **Diff aparte para aprobar:** en Despachos, leer `?pedidos=&transportador=` solo para preseleccionar entre los pedidos ya cargados de la empresa; ids ajenos se ignoran. No toca `dispatchShippingOrder`.
- [ ] 4.4 Despachar e imprimir desde la escena: aviso previo si hay frenados y navegación a Despachos con la preselección.

## 5. Encendido en FLORECER y cierre

- [ ] 5.1 Script `scripts/backfill-menu-centro-operaciones.js` parametrizado por empresa: `--dry-run` por defecto y `--apply` para escribir; solo agrega la entrada al array `menus` de los roles elegidos.
- [ ] 5.2 Encender `companyConfig/FLORECER.centroOperaciones3d` y correr el backfill en FLORECER (dry-run, revisión y apply).
- [ ] 5.3 Build sin errores. Prueba en FLORECER con datos de demo: cola, frenado, guía, entrega a Despachos y modo sin WebGL. Capturas como evidencia.
- [ ] 5.4 Registrar en `specs/CONTRACT.md` el cierre de D-354 y la bitácora.
