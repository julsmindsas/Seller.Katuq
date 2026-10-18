# Facturación electrónica: hoja de ruta de 13 tickets en 5 fases

> Hoja de ruta **para aprobar el orden; no implementar**. Agrupa los tickets de Julsmind (idea) FE-02
> (#1277), FE-06 (#1275), FE-08 (#1274), FE-09 (#1264), FE-10 (#1273), FE-11 (#1265), FE-12 (#1272),
> FE-17 (#1268), FE-19 (#1278), FE-21 (#1280), FE-22 (#1283), FE-23 (#1281) y FE-24 (#1282).
> No reemplaza las propuestas que ya existen: `facturacion-en-integraciones` (FE-01), `facturacion-pos`
> (D-419) y `bot-entrega-y-facturacion-completas`. Cada fase abre después su propio cambio OpenSpec, de
> máximo 3 páginas (Artículo XIII).

## Por qué

Los 13 tickets salen del diagnóstico de Jairo (12-oct) y se cruzan entre sí: la cartera depende de las
notas, la factura agrupada depende de la cartera y el portal depende de las tres. Hacerlos en el orden
en que llegan obliga a rehacer trabajo y mete tres veces la mano en pedidos, pagos y consecutivos, que
son los módulos sensibles. Esta hoja fija un orden por valor y dependencia para que cada propuesta
posterior se apruebe sabiendo qué viene antes y qué viene después.

## Estado actual

Leído en el código el 2026-10-18, sin consultar Firestore. Las rutas del backend son relativas a
`katuq_admin_back_firebase/functions/`.

- **DIAN directa (D-079, spec 016):** emite en producción solo para Julsmind (D-448). El XML
  (`services/accounting/dian/ublBuilder.js`) cubre factura de venta (tipo 01), nota crédito (91) y nota
  débito, y **solo el IVA** como tributo. El CUFE está en `dian/cufe.js` y el consecutivo en
  `dian/numbering.js`, con transacción sobre `integration_configs/{empresa}_dian`.
- **Ya publicado del mismo frente:** notas sobre facturas libres, por línea y con saldo (D-459, FE-20),
  avisos de rango y certificado (D-448), auditoría (D-449), libro de ventas (D-451), validaciones previas
  (D-455) y explicación de rechazos con «reemplazada por» (D-464).
- **Siigo y World Office:** son estrategias del `AccountingManager` (`services/accounting/accountingManager.js`).
  Siigo maneja retenciones (ticket 1054, `providers/siigoProvider.js`). Desde Katuq **solo DIAN emite notas**
  (`createNote` existe únicamente en `providers/dianXMLProvider.js`). En Siigo y World Office la nota se
  hace en su sistema y Katuq solo refactura (D-407) o libera (D-367).
- **Un pedido, una factura:** `createInvoiceFromOrder` bloquea con `ALREADY_INVOICED` y
  `facturacionEnProceso`. D-237 impide que dos pedidos compartan factura.
- **FE-03 (#1261), idempotencia por envío y control de saltos, quedó archivado sin cambio** (16-oct): toca
  numeración y necesita propuesta. El salto JULS23–JULS40 sigue sin explicación.
- **Bandeja:** `components/facturacion-electronica/facturacion-electronica.component.ts` está amarrada a
  `'dian'` y ya muestra pedidos sin factura. Siigo y World Office se facturan desde Todos los pedidos.
- **Cartera:** `services/treasury/carteraService.js` (spec 014) calcula el saldo desde el pedido
  (`resolveSaldo` = `faltaPorPagar`). La factura DIAN tiene saldo por notas (`dian/saldoFactura.js`),
  pero no por pagos. No hay recibos de caja. World Office sincroniza su CxC aparte
  (`services/integrations/world-office/woReceivablesSyncService.js`).
- **Portal del comprador:** «Mis pedidos» con estado de cuenta, cupo y número de factura (D-473,
  `utils/siteCuentaMayorista.js`, `GET /public/:slug/cuenta/pedidos`). Cotizaciones con enlace público
  para aceptar o rechazar (D-426).
- **Otras piezas:**
  - **POS:** factura con el proveedor contable (D-419). Falta la prueba en navegador y la de emisión.
  - **Compras:** registra factura, pago y saldo por proveedor (`routers/purchaseOrders.js`), todo
    digitado a mano.
  - **Mensualidades:** la factura recurrente solo existe para la membresía de Katuq
    (`services/billing/membershipInvoicing.js`).
  - **Plan:** `config/subscriptionLimits.js` no cuenta documentos electrónicos.
- **No existe:** tiquete POS electrónico, RADIAN, recepción de facturas, documento soporte ni nómina. La
  búsqueda en el backend no devuelve nada.

| Ticket | Ya existe | Falta | Toca (sensible) | Riesgo DIAN |
|---|---|---|---|---|
| FE-02 Bandeja única | Pendientes DIAN; facturar Siigo/WO desde Pedidos | Vista por proveedor, estados comunes, por refacturar | Pedidos (regla automática por estado) | Bajo |
| FE-06 Notas y refacturar | Notas DIAN (D-459); refacturar Siigo/WO (D-407) | Notas Siigo/WO desde Katuq, refacturar en un paso, efecto en cartera e inventario | Consecutivos, pedidos, inventario | Alto |
| FE-08 Impuestos y crédito | Retenciones en Siigo; contado/crédito en factura libre DIAN | INC, retenciones y exportación en el XML; crédito en facturas de pedido | Pagos (crea CxC) | Alto |
| FE-09 Tiquete POS | POS factura vía proveedor (D-419) | Documento equivalente, resolución por caja, contingencia | Consecutivos, pedidos | Alto |
| FE-10 RADIAN emisor | Estado DIAN por documento | Eventos del comprador, alertas, apta título valor | — | Medio |
| FE-11 Recepción | Factura de compra manual | Buzón, lectura XML, eventos como receptor | Compras, inventario, pagos | Alto |
| FE-12 Soporte y nómina | — | Ambos documentos, resoluciones y numeración | Consecutivos; datos personales | Alto |
| FE-17 Habilitación y plan | Asistente de 5 pasos, set de pruebas, manuales | Autoservicio de cero a producción, contador por plan, paquetes | Cobro de Katuq | Alto (modelo legal) |
| FE-19 Nueva factura | Composer con borradores y revisión sin consecutivo | Campos de FE-08, OC, unidad, vista previa, recurrente | Inventario, pagos | Medio |
| FE-21 Cartera de facturas | Saldo por notas (D-459) | Pagos por factura, aging, recibo de caja | Pagos | Medio |
| FE-22 Cartera única | Cartera por pedido (spec 014) | Un solo libro sin doble conteo | Pedidos, pagos | Medio |
| FE-23 Agrupar y partir | Candado 1 pedido ↔ 1 factura | N pedidos ↔ 1 factura, factura parcial, corte programado | Pedidos, consecutivos | Alto |
| FE-24 Portal | Mis pedidos y estado de cuenta (D-473) | Facturas, pagos aplicados, comprobantes, solicitudes | Pagos, pedidos | Medio (Ley 1581) |

## Fases

| Fase | Tickets | Por qué en este orden | Criterio de salida |
|---|---|---|---|
| **0. Prerrequisitos** (fuera de esta hoja) | FE-01 (propuesta existente) y el núcleo de FE-03 reabierto | Sin proveedor elegido ni idempotencia por envío, todo lo demás duplica o adivina | Proveedor resuelto en una sola función del servidor; dos envíos del mismo pedido en menos de 1 s dan una factura; saltos de numeración explicados |
| **1. Bandeja única** | FE-02 | Es el trabajo diario y la puerta de entrada de FE-06, FE-23 y FE-24 | Con Siigo y con DIAN se factura desde la bandeja y cada pedido muestra su factura; «Por refacturar» lista rechazos y errores del proveedor |
| **2. El documento correcto** | FE-08 → FE-19 → FE-06 | Sin retenciones ni crédito la factura no sirve al cliente empresarial; las notas cierran el ciclo de corrección | Factura a 30 días con ReteFuente, OC y un concepto excluido, bien reflejada en el PDF; refacturar deja nota crédito y factura nueva enlazadas, con cualquier proveedor que lo soporte |
| **3. Cartera única** | FE-22 → FE-21 → FE-23 | El libro único va primero; si no, la cartera de facturas y la factura agrupada cuentan dos veces | El caso del ticket (pedido $1.000.000, facturado $600.000, pago $700.000) cuadra; el total del cliente es igual en pedidos, facturas y estado de cuenta; 5 pedidos salen en una factura Siigo |
| **4. Vender y cobrar a escala** | FE-24, FE-09, FE-17 | Con la cartera confiable, el portal recauda; el POS y la habilitación abren la venta del módulo a más comercios | Un comprador paga dos facturas vencidas por PSE y quedan pagadas con su recibo; una venta POS genera su documento aceptado; un comercio nuevo llega a producción con el asistente |
| **5. Katuq también recibe** | FE-10 + FE-11 (un solo motor de eventos RADIAN), FE-12 | Mismo motor como emisor y como receptor; menor urgencia operativa | Un reclamo del comprador aparece con alerta; una factura de proveedor llega al buzón, entra a compras y recibe acuse; se emite un documento soporte aceptado |

## Dependencias y sensibles

- **Dependencias de los tickets:** FE-02←FE-01; FE-06←FE-02; FE-08←FE-02; FE-19←FE-01, FE-08;
  FE-22←FE-02, FE-06; FE-21←FE-08, FE-22; FE-23←FE-02, FE-03, FE-22; FE-24←FE-02, FE-21, FE-22;
  FE-09←FE-01, FE-03; FE-11, FE-12 y FE-17←FE-01. FE-05 y FE-16 ya están resueltos.
- **FE-06 queda partido entre dos fases.** Pide «efecto automático en cartera», pero eso necesita el
  libro único de FE-22, que a su vez depende de FE-06. En la fase 2 la nota solo baja el saldo de la
  factura, que ya existe; en la fase 3, FE-22 hace el cruce con el pedido.
- **Uno a la vez, con diff aprobado** (`openspec/config.yaml`):
  - **Consecutivos:** FE-03, FE-01(b) (varias resoluciones), FE-06, FE-09, FE-12 y FE-23.
  - **Pedidos:** FE-02 (regla automática, hoy en `controllers/orders.js`), FE-06, FE-22, FE-23 y FE-24.
  - **Pagos:** FE-08, FE-21, FE-22 y FE-24, por encima de los guards de tesorería (D-074 a D-078).
- **Inventario:** la devolución de FE-06, descontar bodega en FE-19 y la entrada por compra de FE-11
  usan el write-set cerrado de D-134 (`inventory`, `inventoryMovement`). Ninguno escribe `products` ni
  precios, y cada uno lleva contract test.
- **Proveedores:** todo se hace con descriptores y estrategias del manager, sin `if (provider === …)` en
  la UI (Artículo VI). Lo que un proveedor no soporte se oculta, no se simula.

## Riesgos

- **DIAN:**
  - Una factura aceptada no se modifica: se corrige con nota. Las notas siguen las causales de la DIAN.
  - INC, retenciones, exento frente a excluido, exportación, tiquete POS, RADIAN, documento soporte y
    nómina tienen reglas y anexos propios.
  - Cada uno se valida con el contador y en habilitación antes de producción. Ninguna prueba se hace en
    producción sin permiso explícito.
- **Ventas POS sin documento:** con «No requiere factura» (D-419), la venta POS no tiene documento
  fiscal. Mientras no exista FE-09, el camino legal es la factura electrónica a Consumidor Final, que
  hasta donde entendemos sustituye al tiquete. Hay que confirmarlo con el contador.
- **Consecutivos:**
  - No reusar números ni dejar saltos sin causa.
  - Todo envío lleva un identificador único (FE-03).
  - Cada resolución nueva, sea por caja POS, soporte o nómina, tiene su propio rango, su protección
    contra retroceso y su transacción (Artículo VIII).
  - Reintentar sin idempotencia puede duplicar documentos ante la DIAN, como ya pasó en D-145 y con
    JULS22.
- **Doble conteo:**
  - Hoy el saldo vive en el pedido.
  - Si la cartera de facturas (FE-21) o el portal (FE-24) salen antes del libro único (FE-22), la
    cartera total se infla y un pago se refleja en un lado y no en el otro.
  - FE-23 rompe el supuesto de un pedido por factura en que se apoyan D-237, D-367 y D-407: el
    candado y la recuperación deben pasar a ser por línea.
- **Modelo legal al escalar (FE-17):** D-079 habilita a cada comercio como software propio y Katuq no
  es Proveedor Tecnológico. La habilitación en autoservicio para muchos comercios obliga a revisar esa
  decisión, o la de marca blanca, antes de venderla.
- **Datos personales:** el portal y la nómina manejan datos de compradores y empleados (Ley 1581). Los
  permisos de las rutas contables se definen en el cambio privado del backend, como en FE-01.

## No-goals

- Implementar código, escribir en Firestore o emitir documentos con esta hoja.
- Rediseñar FE-01, POS (D-419) o el bot: se referencian.
- Colecciones nuevas o endpoints «v2». Cada fase las justifica en su propia propuesta, si hacen falta.
- Alegra: queda como espacio de conector en FE-01.

## Preguntas para Daniel

1. ¿Reabrimos el núcleo de FE-03 (idempotencia por envío y reporte de saltos) como prerrequisito? FE-09
   y FE-23 dependen de él.
2. ¿Apruebas el orden de las fases: bandeja → documento → cartera → escala → recepción?
3. ¿FE-09 sube de la fase 4 a la 2? Depende de si algún comercio con POS necesita ya el tiquete
   electrónico o le sirve la factura a Consumidor Final.
4. ¿Mantenemos «No requiere factura» en el POS mientras FE-09 no exista?
5. Nómina (FE-12): ¿la emitimos nosotros o la conectamos con Siigo o un proveedor de nómina?
6. FE-17: ¿seguimos con software propio por comercio (D-079) o evaluamos Proveedor Tecnológico o marca
   blanca antes de vender el módulo?
7. En FE-22, ¿un pago va primero a la factura y luego a lo no facturado (lo que sugiere el ticket), o se
   configura por comercio?
8. Notas en Siigo y World Office: ¿las emitimos desde Katuq por su API o seguimos con «nota en su sistema
   y Katuq libera o refactura»?

## Decisión

Al aprobar, se registra como **D-XXX** en `specs/CONTRACT.md`, con el orden aprobado y las respuestas.
El último número usado hoy es D-492; hay que revisarlo al registrar. Esta propuesta no modifica el
contrato. Cada fase abre su propio cambio OpenSpec con proposal, design y tasks, y sus checkpoints.
