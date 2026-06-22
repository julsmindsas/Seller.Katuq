# Plan 008.2 — Convertir cotización a pedido

> Estado: **approved** · Spec: [[008.2-cotizacion-convertir-pedido]]
> Fecha: 2026-06-22

## Arquitectura (decidida)

Hidratar la Venta Asistida. Cero creación de `order` desde la cotización; el pedido
se crea por el flujo normal de `crear-ventas`. Marcado de "convertida" **post-creación**.

```
[Cotización aceptada] --click "Convertir"-->
  CotizacionConvertService.iniciar(cot):
    - guard estado==='aceptada'
    - si carrito activo → confirm (Swal)
    - cartService.clearCart()
    - cot.items.forEach → cartService.addToCart({producto,configuracion,cantidad,_precioManualOverride,_ivaManualOverride})
    - sessionStorage['cliente'] = cot.cliente
    - sessionStorage['cotizacionOrigen'] = {id, nro}
    - router.navigate(['/ventas/crear-ventas'], {queryParams:{documento: cot.cliente.documento}})
        |
        v
[Venta Asistida] usuario completa facturación/entrega/pago → createOrder() OK:
    crear-ventas.marcarCotizacionConvertidaSiAplica(nroPedido):
      - lee sessionStorage['cotizacionOrigen']; si existe:
          cotizacionesService.marcarConvertida(id, nroPedido).subscribe()
          sessionStorage.removeItem('cotizacionOrigen')
        |
        v
[Backend] PATCH /v1/cotizaciones/:id/convertida
    set estadoCotizacion='convertida', convertidaAPedido=true,
        pedidoGenerado=nro, fechaConversion, user_edit (guard company, idempotente)
```

## Contratos

### Backend (nuevo, aislado a colección `cotizaciones`)
- **`PATCH /v1/cotizaciones/:id/convertida`** · body `{ nroPedido?: string }`
  - Lee doc, valida `company` (multi-tenant). Si ya `convertida` → 200 idempotente.
  - `update({ estadoCotizacion:'convertida', convertidaAPedido:true, pedidoGenerado:nroPedido||null, fechaConversion:ISO, date_edit, user_edit })`.
  - **No toca `orders`/`inventory`.**

### Frontend
- `CotizacionesService.marcarConvertida(id, nroPedido)` → PATCH anterior.
- `CotizacionConvertService` (providedIn root, en `cotizaciones/`) — método `iniciar(cot)`:
  inyecta `CartSingletonService`, `Router`, usa `Swal`. Devuelve `Promise<boolean>`.
- `crear-ventas.component.ts`: método privado `marcarCotizacionConvertidaSiAplica(nroPedido)`
  llamado en los **2** handlers de éxito de `createOrder` (≈línea 3105 y 4105).
  Inyecta `CotizacionesService` (providedIn root → sin tocar módulos).
- Botones en `cotizaciones-lista` (acción de fila) y `cotizacion-editor` (cabecera/footer),
  visibles/habilitados solo si `estadoCotizacion==='aceptada'`.

## Gates vs constitución
- **Art VI** (no acoplar UI a proveedor): N/A, flujo interno.
- **Art IX** (Angular services para HTTP): ✅ `CotizacionesService extends BaseService`.
- **360**: NO se modifica código de Osmosis/Shopify/inventario. El `order` lo crea el
  flujo de venta asistida ya existente (sin cambios a su lógica).
- **R-01 carrito singleton**: se limpia con confirmación (AC-04).

## Riesgos
- **RT-1:** `crear-ventas` es enorme; el hook debe ser aditivo y en ambos success paths.
  Mitigación: 1 método privado idempotente, llamado en los 2 puntos; try/catch defensivo.
- **RT-2:** items de cotización deben ser compatibles con `addToCart`. Mitigación: mapear
  al shape explícito {producto,configuracion,cantidad,overrides} (igual que ngOnInit sync).
- **RT-3:** si el usuario crea el pedido pero el `marcarConvertida` falla (red), el pedido
  queda creado y la cotización sigue `aceptada`. Aceptable; reintentar manual. Log, no bloquear.
