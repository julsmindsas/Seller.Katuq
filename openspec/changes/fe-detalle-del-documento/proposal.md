# Facturación electrónica: el detalle del documento muestra lo que se facturó

**Estado:** borrador — pendiente aprobación de Daniel
**Ticket:** 1489 (hallazgo M6) · **Decisión:** D-621 (por registrar en `specs/CONTRACT.md`)
**Origen:** diagnóstico QA del 30-oct (ALMARA / JULSMIND SAS)

## Por qué

El panel lateral de un documento (Facturación → Facturas y notas → clic en el número) muestra cliente, valor, saldo, emisión, CUFE y acciones. No muestra los ítems, la base, el IVA, la forma y el medio de pago, el vencimiento, los abonos ni la mora. Para saber «¿qué le facturé?» o «¿cuándo vence?» hay que descargar el PDF. El comercio esperaba un resumen de conceptos y totales, forma de pago y vencimiento, más abonos y días de mora con enlace a Cartera (la evidencia adjunta tiene M6 señalando ese bloque).

El ticket llegó sin comentarios (0) y sin tickets relacionados; la fecha de registro es 2026-10-30T19:07Z.

## Qué datos ya existen y cuáles faltan

Leído en el código el 2026-11-03, sin consultar datos (D-579: los datos viven en Postgres; los nombres de campo son los del código leído y se confirman al diseñar).

| Dato | ¿Existe? | Dónde |
|------|----------|-------|
| Base, descuento, IVA total, cargos y total | **Sí, y ya llega al navegador** | `dian_documents.totals` (`lineExtension`, `taxExclusive`, `taxTotal`, `allowanceTotal`, `chargeTotal`, `payable`), guardado al emitir (`providers/dianXMLProvider.js:235-236`). La lista lo devuelve entero; el front solo no lo dibuja (la interfaz `DianDocument` ni lo declara). |
| Saldo y notas de la factura | Sí (ticket 1279) | `services/accounting/dian/saldoFactura.js`, ya pintado en el panel |
| Cliente y pedido | Sí (ticket 1276) | `services/accounting/dian/documentDisplay.js` |
| Líneas (descripción, cantidad, valor unitario, valor de línea, tarifa IVA) | **Sí, por otro camino** | `GET /v1/accounting/dian/documents/:numero/lineas` (`controllers/accountingController.js` `getLineasDeFactura`; front `IntegrationsService.getDianInvoiceLines`). Hoy solo lo usa la nota por línea. Solo facturas aceptadas. |
| IVA desglosado por tarifa | **Falta** | El modelo UBL lo calcula (`mapOrderToUblModel().taxes`) pero ni se guarda ni se devuelve. |
| Forma y medio de pago, vencimiento | **Falta en el documento** | `dian_documents` no guarda `payment`. Sale de otra fuente según el origen: factura libre → `dian_invoice_requests.selection.invoice.payment`; factura de pedido → se deriva de `orders.formaDePago` (contado/crédito, medio «10») y no tiene vencimiento fiscal (`invoicePayment.js:5`). |
| Abonos y mora | **No son de DIAN: son de Cartera** | Ver más abajo. |

## Cartera: abonos y mora

**Sí requieren Cartera.** Los documentos DIAN no guardan pagos. Cartera (`services/treasury/carteraService.js`, spec 014) calcula el saldo **por pedido** (`faltaPorPagar`, o `totalPedididoConDescuento − anticipo`) y su mora con `fechaEntrega + payTermDays del cliente`, no con el vencimiento fiscal de la factura. Consecuencias:

- una factura libre (sin pedido, el caso de todas las de Julsmind) **no tiene abonos en Katuq** hasta que exista el libro único de cartera (FE-22, hoja de ruta `facturacion-electronica-hoja-de-ruta`);
- en una factura de pedido, los abonos y la mora de Cartera pueden no coincidir con el vencimiento de la factura;
- Cartera solo la leen los roles de tesorería (`TREASURY_ROLES`).

El módulo de Cartera lo trabaja otra sesión (aws-claude-1). Esta propuesta **solo lee** lo que Cartera ya expone, no cambia su cálculo, sus rutas ni su pantalla, y se coordina antes de implementar esa parte.

## Qué cambia

Dos entregas, la segunda condicionada a la coordinación con Cartera:

1. **Resumen en el panel (sin Cartera).** Al abrir una factura aceptada, el panel muestra: conceptos (descripción, cantidad, valor unitario, IVA, valor de línea); totales (base, descuento, IVA por tarifa, envío, total); forma y medio de pago; y vencimiento con «vence en N días / venció hace N días» calculado solo con la fecha fiscal. Las notas muestran sus totales y la factura que citan.
2. **Abonos y mora (lee Cartera).** Para facturas con pedido, y solo para quien tiene rol de tesorería: abonado, por cobrar, días de mora y «Ver en Cartera». Sin pedido o sin datos no se muestra nada ni se inventa.

**Recomendación técnica (a aprobar):** ampliar de forma aditiva la respuesta del `GET …/lineas` existente con `impuestos[]`, `totales` y `pago {forma, medio, vencimiento}`, sin romper la nota por línea. No se crea endpoint ni colección nuevos (regla de `openspec/config.yaml`). Se descarta guardar `payment` en `dian_documents` al emitir: toca el camino de emisión y los consecutivos. Si Daniel prefiere un endpoint propio, requiere su aprobación explícita.

## No-goals

- No cambia la emisión, el XML, el CUFE, la numeración ni las notas crédito y débito.
- No escribe nada: ni `dian_documents`, ni pedidos, ni pagos, ni Cartera.
- No registra abonos ni cambia el saldo de Cartera o de tesorería.
- No cubre Siigo ni World Office (Artículo VI: la UI no se acopla a un proveedor; este panel es el de DIAN directa).
- No reemplaza el PDF.

## Riesgos (módulos sensibles)

- **Pedidos:** para facturas de pedido las líneas se reconstruyen desde el pedido **actual**, sin cuadrar con lo aceptado (a diferencia de la factura libre, que sí compara el total con ±1). Si el pedido cambió después de facturar, el panel mostraría líneas que no son las del XML. La spec exige cuadrar con `totals.payable` y, si no cuadra, mostrar solo los totales con un aviso.
- **Consecutivos:** ninguno; no se toca la numeración.
- **Cartera/pagos:** dos «saldos» distintos (el de la factura tras sus notas y el de Cartera) pueden confundir; la spec exige rotularlos distinto. Coordinar con aws-claude-1 antes de leer Cartera.
- **Datos antiguos:** las facturas anteriores a esta entrega no guardaron la forma de pago; se muestra «No disponible», nunca un valor supuesto.

## Diseño y reglas

Pantalla ya modernizada: se reutiliza el panel `fe-detalle` y sus clases `fe-*`; plano, tokens de `openspec/specs/design-system/spec.md`, sin gradientes ni primarios paralelos, labels en UPPERCASE muted, 1440 y 390 px sin scroll horizontal, textos en `es.json`. Cambia solo la presentación del panel y su lectura. Nota de versión al publicar (D-567).

## Capacidad

Delta sobre `facturacion-electronica` (`specs/facturacion-electronica/spec.md`).
