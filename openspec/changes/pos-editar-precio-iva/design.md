## Context

- **POS que se toca:** `ventas/ventas-pos` → `components/ventas/pos2/` (menú "Ventas POS"). El POS viejo de `components/pos/` no se toca, salvo `factura-tirilla`, que el POS nuevo sigue usando.
- **Forma de la línea del POS:** el ítem de `CartService.posCartItems` es **plano**: el producto de inventario aplanado más `cantidad` (`product.component.ts:205-214`). La clave de línea es `crearProducto.titulo`. Al crear el pedido, `pos-order-creator` lo envuelve como `{ producto: item, cantidad, configuracion }`.
- **Producción hoy:** `ivaCalcUnificado: false` (front) e `IVA_PERSIST_CANONICAL` apagado (back). El servidor recalcula con el camino legacy de `orderCalculationService.calculateOrderTotals` y el POS se asienta con el total del servidor (`settleApprovedPOSPayment`).
- **Fórmulas del servidor (legacy) para una línea:**
  - Bruto = sinIva × cant.
  - Neto = bruto × (1 − desc).
  - IVA = sinIva × tarifa × cant × (1 − desc).
  - Total = neto + IVA.
  - El precio manual entra al IVA pero **no** al bruto ni al neto: ese es el bug 2 de la propuesta.

## Goals / Non-Goals

**Goals:**
- Mismos controles y mismos campos que la venta asistida.
- Un único cálculo de línea en el front del POS.
- Servidor coherente con ese cálculo y que no confíe en el cliente.
- Pruebas que fijen los números en los dos repos.

**Non-Goals:**
- Unificar el cálculo de líneas **sin** cambios (volumen, tipo de cliente o promoción en el POS).
- Encender los motores canónicos.
- Validar las ediciones de pedidos.
- Permisos por rol.

## Decisions

### D1. Función pura de línea en el front: `shared/utils/pos-linea-precio.ts`

```ts
export const TARIFAS_IVA = [0, 5, 8, 19] as const;
export interface LineaPos { precio: any; procesoComercial?: any; cantidad: number;
  _precioManualOverride?: number|null; _ivaManualOverride?: number|null; descuentoLinea?: number|null; }
export function tieneCambios(l: LineaPos): boolean
export function permitePrecioManual(l: LineaPos): boolean     // procesoComercial?.permitePrecioManual === true
export function resolverLineaPos(l: LineaPos): { sinIva: number; tarifa: number; desc: number;
  conIvaUnitarioNeto: number; ivaUnitarioNeto: number; totalLinea: number }
export function sanearPrecioManual(v: unknown): number | undefined  // vacío, NaN o <0 → undefined
export function sanearDescuento(v: unknown): number                  // 0-100
```

- `resolverLineaPos` es el **espejo exacto del servidor legacy ya corregido**.
  - sinIva: el manual si `permitePrecioManual` y hay override. Si no, el escalón de volumen vigente (mismas reglas que el servidor: ticket 1024, escalón sin rango se salta). Si no, `_sinIvaDesde(precio)`.
  - Tarifa: el override. Si no, la `valorIVAPorVolumen` del escalón. Si no, `precioUnitarioIva`.
- Se usa **solo** si `tieneCambios(línea)`. Una línea sin cambios sigue con `discount_price || precioUnitarioConIva` (sin cambio de comportamiento).
- Se acepta la entrada con las dos formas, la plana del carrito POS y la línea de pedido (`{producto:{precio, procesoComercial}, ...}`), con un adaptador `lineaDesdeItemPos` / `lineaDesdePedido`.
- Por qué no reusar `iva-canonico.resolverPrecioLinea`: es el espejo del motor **canónico**, que está apagado en producción. El servidor que cobra hoy es el legacy. Copiarlo garantiza que el ticket cuadre con lo que se guarda. Las diferencias canónico/legacy solo existen con datos de volumen incompletos (D-046) y no las agrava este cambio.
- Sin redondeo intermedio, igual que el servidor. Se redondea solo al mostrar.

### D2. `CartService.getPOSSubTotal()` conserva su contrato

Devuelve el mismo string `"$123.45"` (lo parsean `pos-order-creator`, `pos-checkout`, `pos-validation` y `warehouse-selector`). Cambia solo el precio por línea:

```ts
const price = tieneCambios(linea) ? resolverLineaPos(linea).conIvaUnitarioNeto
                                  : (item.discount_price || item.precio.precioUnitarioConIva || 0);
```

Los overrides se guardan **en el ítem del carrito** (`item._precioManualOverride`, `item._ivaManualOverride`, `item.descuentoLinea`), igual que en la venta asistida. `posAddToCart` sobre una línea existente solo suma cantidad y conserva los cambios. `clearCart` los elimina con el ítem.

### D3. UI: componente `app-pos-linea-precio` (SRP) dentro de `cart-summary`

- **Archivos:** `pos2/widgets/pos-linea-precio/pos-linea-precio.component.{ts,html,scss}`, declarado en el módulo de ventas junto a `CartSummaryComponent`.
- **Entrada:** `@Input() item`. Muta el ítem (mismo patrón del carrito de venta asistida) y emite `(cambio)` para refrescar.
- **Plantilla:** la misma lógica de `carrito.component.html:131-200`.
  - Input precio base con `_precioManualTemp` mientras escribe y confirmación en `blur` o Enter.
  - `select` 0/5/8/19.
  - Desc. %.
  - Desglose "+ $IVA IVA = $precio".
  - Total de línea.
- **Diseño** (design-system):
  - Tokens Katuq: acento `#5F3FE0`, labels UPPERCASE muted, radios 11 px, sin gradientes.
  - Clases sin la secuencia "p-" (trampa de `_reset.scss`): `lp-precio`, `lp-iva`, `lp-desc`.
  - Cada `span` con texto lleva color propio.
  - Cabe en el ticket a 390 px.
- Al lado del precio unitario aparece una marca "Precio editado" cuando la línea tiene cambios, para que el cajero vea qué se tocó.

### D4. `pos-order-creator.createPedidoObject`

Por cada línea:
- `producto` = el ítem **sin** las tres claves de override ni `_precioManualTemp`, para no dejar campos engañosos en el snapshot.
- Las claves van al nivel de la línea, solo si aplican:
  - `_precioManualOverride` si `permitePrecioManual` y hay valor.
  - `_ivaManualOverride` si se eligió.
  - `descuentoLinea` si es > 0.
- `subtotal` / `totalPedido*` siguen saliendo de `getPOSSubTotal()`. El servidor recalcula de todos modos.
- La función de mapeo de línea se extrae como `lineaPedidoPos(item)` en `pos-linea-precio.ts` para poder probarla sin Angular.

### D5. Tirilla

`factura-tirilla`:
- `calcularTotalProducto` y el precio unitario de la plantilla usan `resolverLineaPos(lineaDesdePedido(item))` cuando la línea tiene cambios; si no, lo de hoy.
- Si la línea trae los campos del servidor (`precioSinIvaResuelto` / `tarifaEfectiva`, con el canónico encendido), los prefiere.
- Los totales siguen siendo los del pedido guardado.

### D6. Backend: subtotal con precio manual

En `getSubTotalPedido` y `getSubTotalNetoPedido` se agrega, antes de la promoción, la misma prioridad 0 de `getTotalImpuesto`:

```js
const tienePrecioManual = itemCarrito._precioManualOverride != null &&
  producto?.procesoComercial?.permitePrecioManual === true;
if (tienePrecioManual) totalItemSinIVA = (Number(itemCarrito._precioManualOverride) || 0) * cantidad;
else if (tienePromo) ...
```

- Un precio manual 0 es válido (regalo, ticket 1018), por eso se usa `!= null` y no `||`.
- `excluirPromocionados` no cambia.
- Con el canónico encendido, el bloque `IVA_PERSIST_CANONICAL` ya lo hacía bien. Ahora los dos caminos dan lo mismo.

### D7. Backend: `services/orders/lineOverridesValidation.js`

```js
validarOverridesDeLineas(carrito) → { ok:true } | { ok:false, linea, campo, valor, mensaje }   // puro
async aplicarPermisoPrecioManualReal(carrito, company, db) → { descartadas: [...] }
```

- **`validarOverridesDeLineas`** solo revisa los campos presentes (`!= null`):
  - IVA ∈ {0,5,8,19}, tras `Number()`. Acepta "19" de un string y rechaza "19.5".
  - Precio: finito y ≥ 0.
  - Descuento: finito, de 0 a 100.
- **`aplicarPermisoPrecioManualReal`** solo actúa sobre las líneas con `_precioManualOverride != null`:
  - Un `db.getAll` de `products/{cd||id}`.
  - Si el documento existe y su `company === company` de la sesión, escribe en el snapshot de la línea `procesoComercial.permitePrecioManual = (doc === true)`. Si es `false`, borra el override de la línea y registra `{event:'precio_manual_descartado', company, productoId}` con el logger estructurado del back.
  - Si el documento no existe o es de otra empresa, se descarta el override: no hay producto real que lo autorice.
  - **Excepción:** ítems libres de cotización (`itemEsLibre === true`, D-063), que no tienen producto. Conservan el comportamiento actual.
- **Dónde se llama en `exports.create`:** justo después de `order.company = company` y antes de consumir el consecutivo. Un 400 no gasta número de pedido. Error: `res.status(400).send({ msg })`, mismo formato de los 400 vecinos.

### D8. World Office

`worldOfficeDataMapper.mapCartItemToWORenglon`: con precio manual válido, `valorUnitario = Number(_precioManualOverride)` (sin dividir). El comentario equivocado se corrige.

## Pruebas

| Repo | Archivo | Qué fija |
|---|---|---|
| Front | `tests/ventas/pos-linea-precio.test.js` (`node --test`, ts-node como `precio-congelado-por-fecha`) | Saneo; línea sin cambios = precio de hoy; manual + IVA; IVA solo; desc; volumen + IVA manual; manual 0; producto sin permiso ignora el manual; `lineaPedidoPos` pone las claves en la línea y no en `producto` |
| Front | `tests/ventas/pos-linea-precio.fixtures.json` | Casos de referencia con `esperado: {subtotal, totalImpuesto, total}` |
| Back | `functions/tests/orders/precioManualSubtotal.test.js` | `calculateOrderTotals` con los **mismos** casos (copia del JSON). total = subtotal + IVA = Σ líneas, con `IVA_PERSIST_CANONICAL` apagado y encendido |
| Back | `functions/tests/orders/lineOverridesValidation.test.js` | 400 por tarifa, precio y descuento; strings numéricos; descarte con producto sin permiso, de otra empresa o inexistente; ítem libre; sin overrides → cero lecturas (db falso que cuenta llamadas) |
| Back | `functions/tests/accounting/worldOfficePrecioManual.test.js` | Renglón con precio manual sin dividir |
| Back | Regresión | `test-1055`, `test-1018`, `test-preserve-line-overrides`, `test-iva-contract`, `test:saneamiento-1018`, `test:mobile-pos-contract`, `test:order-line-iva-edit`, `test:descuentos-money-path` sin cambios |

Un script `scripts/check-fixtures-pos-linea.js` del back compara su copia del JSON con la del front cuando los dos repos están lado a lado. Si difieren, falla.

**Prueba funcional** (con aprobación, ver tasks):
- Backend local y front local contra la empresa demo FLORECER.
- Venta POS con cuatro líneas: sin cambios, precio manual, IVA 0 % y Desc. 10 %.
- Comparar el ticket, el monto cobrado, el pedido guardado, la tirilla y el correo.

## Risks / Trade-offs

- **[400 nuevos]** Mitigación: antes de aplicar, recorrer los otros clientes de `/v1/orders/create` (cotización convertida, app móvil `harden-mobile-pos-contracts`, WhatsApp) y verificar que no manden valores fuera de rango.
- **[Copia de la fórmula legacy en el front]** Se suma a las copias ya listadas en D-046. Mitigación: fixtures compartidos y comprobación de igualdad. Cuando se encienda el canónico, `resolverLineaPos` pasa a delegar en `iva-canonico` en una línea.
- **[Subtotal nuevo]** Los pedidos nuevos con precio manual cambian de monto (para bien). Se anuncia a los comercios con precio manual.
- **[Lectura a Firestore]** Una sola llamada en lote, solo cuando hay precio manual.

## Migration Plan

1. Back: D6 → D7 → D8, con las pruebas en verde, diff aprobado y despliegue (`git pull` + reinicio del backend).
2. Front: D1 → D5, build de producción sin errores, revisión a 1440 y 390 px y despliegue con el candado de publicación.
3. **Rollback:** revertir el commit del front deja el POS como hoy. Revertir el del back devuelve el subtotal legacy y quita la validación. No hay datos que migrar.

## Open Questions

- ¿La app móvil o la conversión de cotizaciones mandan tarifas distintas de 0/5/8/19 (por ejemplo 16 por datos viejos)? Se verifica en el código antes de aplicar D7. Si aparece alguna, se decide contigo.
