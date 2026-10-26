## 0. Decisiones y checkpoints

- [x] 0.1 Alcance decidido con el usuario (2026-10-19): precio + IVA + Desc. % igual que la venta asistida; corregir el subtotal con precio manual en el backend; validar en el servidor.
- [x] 0.2 Aprobación de `proposal.md` + `specs/` + `design.md`.
- [x] 0.3 Registrar la decisión en `specs/CONTRACT.md` (siguiente número libre: D-536).

## 1. Verificación previa (solo lectura)

- [x] 1.1 Revisar los clientes de `POST /v1/orders/create` (cotización convertida, app móvil, bot de WhatsApp, Kuvo) y confirmar qué valores de `_ivaManualOverride`, `_precioManualOverride` y `descuentoLinea` pueden mandar. Si alguno puede mandar algo fuera de rango, parar y decidir.
  - Resultado (19-oct): ningún cliente en disco manda valores fuera de rango (venta asistida, POS, cotización convertida, duplicar pedido, borradores; WhatsApp, IA y MCP no mandan los campos; Kuvo, sitio, Shopify y WooCommerce no pasan por `create`). App iOS en otro repo, no verificable. Ítems libres de cotización: sin `cd`/`id`, pierden el override como hoy (mismo monto); se deja el diseño como está por decisión del usuario.
- [x] 1.2 Confirmar en el código que el ítem del POS trae `cd` o `id` del producto y `procesoComercial` (`product.component.ts:205-214` y escaneo `:592-600`).

## 2. Backend — pruebas primero (`katuq_admin_back_firebase/functions`)

- [x] 2.1 `tests/orders/precioManualSubtotal.test.js` + copia de los fixtures. Debe **fallar** antes del cambio con el caso de precio manual.
- [x] 2.2 `tests/orders/lineOverridesValidation.test.js` con un `db` falso.
- [x] 2.3 `tests/accounting/worldOfficePrecioManual.test.js`. Debe fallar antes del cambio.

## 3. Backend — cambios (módulo sensible `orders`: uno a la vez, diff a la vista)

- [x] 3.1 D6: prioridad de precio manual en `getSubTotalPedido` y `getSubTotalNetoPedido`. Pruebas 2.1 en verde.
- [x] 3.2 D7: `services/orders/lineOverridesValidation.js` + llamada en `controllers/orders.js:create` antes del consecutivo. Pruebas 2.2 en verde.
- [x] 3.3 D8: World Office. Prueba 2.3 en verde.
- [x] 3.4 Scripts `test:precio-manual-pos` en `package.json` y `scripts/check-fixtures-pos-linea.js`.
- [x] 3.5 Regresión: `test-1055`, `test-1018-renglon-en-cero`, `test-preserve-line-overrides`, `test-iva-contract`, `test:saneamiento-1018`, `test:mobile-pos-contract`, `test:order-line-iva-edit`, `test:descuentos-money-path`, `test:codigo-siigo`. `node --check` de cada archivo tocado.
  - Resultado (20-oct): todas en verde. `test-iva-contract` y `descuentoDeListaEspejo` necesitan la ruta del front (`RUTA_SELLER_KATUQ`), con ella pasan. `preciosPorTipoFase0` falla igual en HEAD sin este cambio (redondeo 45294.12, ya existía). Sin `node index.js`: arrancaría los crones contra producción.
- [x] 3.6 **Mostrar el diff del backend y esperar aprobación** antes del commit.
  - Resultado (21-oct): aprobado. Commit `af6e2925`, sobre la punta de origin (44 commits nuevos), con las pruebas y la regresión de nuevo en verde. D-507 se renumera a D-536 por choque con otra sesión.

## 4. Front — pruebas primero (`Seller.Katuq`)

- [x] 4.1 `tests/ventas/pos-linea-precio.fixtures.json` (mismo contenido que la copia del back) y `tests/ventas/pos-linea-precio.test.js`.

## 5. Front — cambios

- [x] 5.1 D1: `shared/utils/pos-linea-precio.ts`. Pruebas 4.1 en verde.
- [x] 5.2 D2: `CartService.getPOSSubTotal` (mismo formato de string).
- [x] 5.3 D3: componente `pos-linea-precio` en `pos2/widgets/` + uso en `cart-summary` + declaración en el módulo.
- [x] 5.4 D4: `pos-order-creator.createPedidoObject` con `lineaPedidoPos`.
- [x] 5.5 D5: `factura-tirilla` (precio por línea).
- [x] 5.6 `npm run build` sin errores (revertir el bump de versión de `environment*.ts` si no se va a publicar). Contar gradientes y primarios prohibidos en `pos2`: no suben.
  - Resultado (21-oct): build de producción sin errores (solo el aviso de tamaño, que ya existía). Conteo en `pos2` y la tirilla: 0 en origin, 0 con el cambio. Las clases del editor usan `lin-` y no `lp-`, porque `lp-` contiene "p-".

## 6. Prueba funcional (requiere aprobación: escribe pedidos reales)

- [ ] 6.1 Pedir permiso para crear pedidos de prueba en la empresa demo FLORECER con el back local (`urlApi` → `http://localhost:3300`).
- [x] 6.2 Venta POS con cuatro líneas (sin cambios, precio manual, IVA 0 %, Desc. 10 %). Comparar ticket = monto cobrado = pedido guardado (subtotal, IVA, total) = tirilla, con diferencia ≤ $1.
  - Resultado (22-oct, back local legacy, FLORECER BOD-003): POS-000002 (4 líneas): ticket = cobro = $130.065, pero el servidor descartó el precio manual de la Caja de Bombones porque ese producto es de ALMARA FELICIDAD (288 de 300 productos del inventario de FLORECER son de ALMARA) → pedido $137.065, falta $7.000, tirilla "PAGADO". IVA 19 % y desc. 10 % bien. POS-000003 (Caja de Bombones propia de FLORECER, manual $40.000): ticket = cobro = pedido = $40.000, sin descarte. Pendiente decidir: rechazar con 400 en vez de descartar en silencio.
- [ ] 6.3 Intentar con la petición manipulada (IVA 3, precio −1) → 400 sin consumir consecutivo.
- [ ] 6.4 Revisión visual del ticket a 1440 y 390 px, sin scroll horizontal ni texto invisible.
- [ ] 6.5 Anular o marcar los pedidos de prueba según indique el usuario.

## 7. Cierre

- [ ] 7.1 Bitácora en `specs/CONTRACT.md` (D-536) y commits con sello en los dos repos.
- [ ] 7.2 Despliegue: primero el backend, después el front con el candado de publicación. Solo con autorización.
- [ ] 7.3 `/opsx:archive` cuando esté en producción.
