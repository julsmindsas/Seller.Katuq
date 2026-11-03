# Facturación electrónica: retenciones por factura y desglose de IVA

> **Estado: borrador — pendiente aprobación de Daniel**
> **Ticket:** 1483 (hallazgo A9, ALMARA FELICIDAD) · **Decisión:** D-620 (por registrar en `specs/CONTRACT.md`)
> **Origen:** diagnóstico QA del 30-oct (ALMARA / JULSMIND SAS)
> Solo propuesta: no se implementa nada hasta aprobar proposal, spec, plan y tasks, y en cada cambio sensible
> hasta que Daniel apruebe el diff.

## Por qué

En la factura libre y en la bandeja DIAN el comercio ve «Sin retenciones ni descuento global» y, en la tarjeta de
indicadores, «IVA generado $0 · Retenciones: no registradas» sobre $41,3 M facturados a 8 empresas de octubre.
Sus clientes B2B practican ReteFuente, ReteIVA y ReteICA, así que el valor que pagan no coincide con el de la factura y
la cartera queda descuadrada. Además, si el $0 de IVA no corresponde al régimen real del emisor, es un riesgo
tributario. El ticket pide: (1) validar con el contador si el $0 es correcto; (2) retenciones por factura reflejadas en
el «Neto a pagar»; (3) desglose del IVA por tarifa. Lo relaciona con FE-08.

El ticket tiene 0 comentarios y 2 adjuntos (fecha de alta 2026-10-30T19:04:31Z), leídos completos.

## Diagnóstico (leído en el código el 2026-11-03, sin consultar datos)

- **IVA por línea.** El formulario (`composer/manual-invoice-form.component.ts:54`) arranca `taxRate` en `null`
  («Elige», `.html:133`) con tarifas 0/5/19. El servidor solo acepta `[0,5,19]` (`manualInvoice.js:89`). Cada línea
  calcula su IVA (`ublInvoiceMapper.js:74-79`), el modelo lo agrupa por tarifa en `taxes[]` (`:152-161`) y el XML
  emite un `TaxSubtotal` por tarifa y uno por línea (`ublBuilder.js:148-162`, `:180-190`). Es decir: el desglose por
  tarifa **ya existe en el modelo y en el XML**; la revisión del front solo muestra un «IVA» total
  (`invoice-composer.component.html:135`).
- **Por qué sale $0.** La tarjeta suma `totals.taxTotal` de los documentos aceptados del período
  (`indicadoresFacturacion.js:34-35`). Si sale 0 con $41,3 M facturados, esas 8 facturas se emitieron con todas las
  líneas a 0 %: el sistema no la inventa. Nada en el código contrasta la tarifa elegida con el régimen del emisor
  (solo se copian sus responsabilidades al XML, `ublBuilder.js:93-106`), y el selector no distingue entre excluido,
  exento y «lo dejé en 0». Hallazgo lateral: los documentos emitidos sin solicitud revisada no guardan `totals`
  (`ublBuilder.js:522` solo los devuelve con `dianRequestId`), por lo que ni su valor ni su IVA entran a las tarjetas.
  **No verificado con datos:** no se consultó la base; el contador o el Libro de ventas del período (Excel) dirán
  la tarifa real de cada factura.
- **«Retenciones: no registradas» es un texto fijo.** `accountingController.js:2471` devuelve `retenciones: null`
  («los documentos DIAN no guardan retenciones todavía»); el front lo traduce en
  `facturacion-electronica.component.html:95`.
- **El UBL no soporta retenciones.** Búsqueda de `Withholding`/`retenc` en `services/accounting/dian/` y en
  `providers/dianXMLProvider.js`: sin resultados. El único tributo es IVA (`TaxScheme 01`). El CUFE incluye las
  ranuras 04 (INC) y 03 (ICA) fijas en 0 (`cufe.js:83-85`, `ublBuilder.js:414-417`). El total a pagar es
  `taxInclusive − descuento + envío` (`ublInvoiceMapper.js:167`) y alimenta `PayableAmount` y el CUFE; no resta nada.
- **Contraste.** Siigo sí maneja retenciones desde el ticket 1054 y por línea desde D-574
  (`accountingController.js:41-52`, `siigoDataMapper.js:890`); DIAN directa no.
- **FE-08.** En `facturacion-electronica-hoja-de-ruta` (fase 2) FE-08 es «INC, retenciones y exportación en el XML;
  crédito en facturas de pedido», riesgo Alto, y su cambio aún no se abre (`tasks.md` 7.2). No hay entrada de FE-08 en
  `specs/CONTRACT.md`. Esta propuesta toma **solo la porción de IVA y retenciones** de FE-08; INC, exportación y
  crédito de pedidos quedan fuera.

## Qué cambia

Tres cambios independientes, en este orden, cada uno con su aprobación de diff:

1. **A — IVA visible (solo presentación y lectura).** La revisión muestra el IVA por tarifa (0 %, 5 %, 19 %) con su
   base; aviso no bloqueante cuando ninguna línea cobra IVA; las tarjetas indican cuántas facturas del período no
   cobraron IVA. No toca XML, CUFE ni totales.
2. **B — Retenciones por factura (datos y presentación).** ReteFuente, ReteIVA y ReteICA opcionales en la revisión
   de la factura libre y de la que sale de un pedido. Se muestra «Neto a pagar» = total a pagar − retenciones y se
   guarda con el documento (en `totals`, mismas colecciones). Sugerencia basada en las retenciones de la última
   factura del mismo cliente, editable; **sin tabla de tarifas fiscales** (eso es asesoría del contador). La tarjeta
   suma las retenciones registradas. El XML y el CUFE no cambian. Detrás de bandera por empresa.
3. **C — Retenciones en el XML (alto riesgo, condicional).** Emitir `WithholdingTaxTotal` solo si el contador y el
   Anexo Técnico confirman que es necesario o permitido. Se valida contra el set de habilitación antes de producción.

**Pregunta al contador (resuelve el punto 1 del ticket, sin código):** ¿JULSMIND SAS es responsable de IVA?, ¿sus
conceptos son excluidos, exentos o gravados?, ¿`PayableAmount` debe incluir o excluir las retenciones?, ¿se exige
`WithholdingTaxTotal` para que el cliente practique la retención?

## Capabilities

- Nueva: `facturacion-electronica` (delta en `specs/facturacion-electronica/spec.md`): desglose de IVA, retenciones y
  neto a pagar de la factura DIAN directa.

## Impact (write-set)

- **Front (`src/app/components/facturacion-electronica/`):** `composer/invoice-composer.component.*`,
  `composer/invoice-composer.models.ts`, `facturacion-electronica.component.html`, `assets/i18n/es.json`. Servicio
  existente `DianInvoiceService` (extiende `BaseService`).
- **Backend (`functions/services/accounting/dian/`):** A: `indicadoresFacturacion.js`, lectura. B: `manualInvoice.js`,
  `invoiceRequests.js` (`cleanSelection`), `ublInvoiceMapper.js` (campos opcionales `retenciones`/`neto` que no alteran
  el hash cuando están vacíos), `accountingController.js` (indicador). C: además `ublBuilder.js`.
- **Datos:** solo las colecciones existentes `dian_invoice_requests` y `dian_documents` (campo nuevo en `selection` y en
  `totals`). **Sin colecciones ni endpoints nuevos.** No escribe `orders`, inventario, productos, precios ni
  consecutivos (`numbering.takeNext` no se toca).
- **Bandera:** `featureFlags.dianRetenciones` en `companies` (D-505), con dueño (Daniel) y retiro al estabilizar
  (Artículo XII). Piloto: ALMARA / JULSMIND SAS.
- **Nota de versión (D-567):** una por cada cambio visible para el comercio (A y B).

## Riesgos (módulo sensible)

- **XML DIAN, CUFE y totales** son módulo sensible: **un cambio a la vez, con diff aprobado por Daniel**
  (`openspec/config.yaml`, tasks). A y B no modifican `ublBuilder.js`; C sí y va solo, con prueba de habilitación.
- Un total mal calculado se descubre como rechazo DIAN o cartera descuadrada: el neto se calcula una vez en el servidor
  y el front solo lo muestra.
- La sugerencia de retenciones puede inducir a error: nunca se aplica sola y se rotula «según tu última factura».
- Pagos y cartera (D-074 a D-078, `carteraService.resolveSaldo`) no se tocan: el neto no cambia el saldo hasta FE-21/FE-22.
- Pruebas nuevas locales, sin credenciales ni datos reales (D-566); la emisión real solo con permiso de Daniel.

## No-goals

- INC, exportación y crédito de pedidos (resto de FE-08); cartera y recibos de caja (FE-21/22).
- Tabla fiscal de tarifas de retención por concepto o actividad; cambiar la tarifa de IVA de facturas ya emitidas.
- Retenciones en Siigo y World Office (Siigo ya las maneja); notas crédito/débito con retenciones.
- Decidir por el contador si el $0 de IVA es correcto.
