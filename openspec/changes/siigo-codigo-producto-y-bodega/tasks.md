# Tasks — código SIIGO por producto y bodegas de Bombas

Ticket 1229, D-504. Módulo sensible (facturación): un cambio a la vez, con diff
revisado.

## 0. Bodegas (datos)

- [x] 0.1 Conectar BOD-005 → 6 Bogota, BOD-006 → 7 Cali, BOD-001 → 31 Zona
      franca LD (`warehouses.integrations.siigo`, prueba sin escribir y luego
      aplicado el 2026-10-18). ⚠️ El 19-oct se vio que la 31 no tiene
      existencias en SIIGO. Respuesta del comercio (19-oct): la conexión está
      bien; ellos no han cargado ese inventario en SIIGO.
- [ ] 0.2 Medellín (MED-VIT, MED-MOT, MED-VIR, MED-REP) y Zona Franca
      Exterior. Respuesta del comercio (19-oct): Katuq es el dueño del dato, así que
      el comercio crea en SIIGO una bodega por cada una de Katuq. Cuando las
      cree, se conectan desde Bodegas → Importar SIIGO.

## 1. Backend (katuq_admin_back_firebase/functions)

- [x] 1.1 `services/accounting/utils/codigoSiigo.js`: `candidatosSiigo`,
      `anotarCodigosSiigo`, `guardarCodigoSiigo` (D2, D3, D4).
- [x] 1.2 Pruebas `tests/accounting/codigoSiigo.test.js`: funciones puras,
      anotación y contract test del write-set. Script `test:codigo-siigo`.
- [x] 1.3 `primerCodigo` con `producto?.integrations?.siigo?.productCode`
      primero en `accountingManager`, `siigoProvider.findOrCreateProduct` y
      `SiigoDataMapper.extractProductCode`.
- [x] 1.4 `accountingManager`: llamar `anotarCodigosSiigo` antes del carrito en
      la factura y en la vista previa (solo SIIGO).
- [x] 1.5 `findOrCreateProduct`: probar los candidatos antes de crear. Si hay
      uno solo, devolver `equivalencia`. `accountingManager` lo guarda con
      `guardarCodigoSiigo` y anota el producto en memoria.
- [x] 1.6 Pruebas de `findOrCreateProduct` con un httpClient falso. Correr las
      pruebas de facturación SIIGO que ya existen.

- [x] 1.7 `grupoContableSiigo` en `codigoSiigo.js` con pruebas (D6).
- [x] 1.8 `findOrCreateProduct` pasa la categoría resuelta; `createProduct`
      respeta `stock_control` del mapper. Pruebas con un httpClient falso.
- [x] 1.9 Aviso de productos en la vista previa SIIGO (recomendación 5 del
      informe del 1229, aprobada por Daniel el 2026-10-21; bloque 1229-B02).
      Solo lectura: no cambia lo que se factura. Diseño D7; requisito «La vista
      previa dice qué pasará con cada producto en SIIGO» en la spec.
      - `codigoSiigo.js`: `resolverProductoSiigo` (misma regla que
        `findOrCreateProduct`: búsqueda exacta; candidatos solo sin código
        guardado y con la bandera; uno solo y con código exacto),
        `revisarProductosEnSiigo` (código en el orden del proveedor, sin
        repetidos, uno a la vez, tope 20, plazo 15 s, corte en el primer
        error), `avisosProductosSiigo` (singular o plural) y
        `anotarLineasVistaPrevia` (por el código de la línea, no por índice).
      - `previewInvoiceFromOrder`: **solo con `siigoProductEquivalence`**;
        apagada, la vista previa es la de hoy. **Desvío** de la recomendación 5
        (búsqueda exacta para todos), por la regla de que lo nuevo nace apagado
        y porque el circuit breaker de SIIGO es compartido por todas las
        empresas. Lecturas con `findProductByCode` sin reintentos y con timeout
        de 5 s. Cada línea lleva `enSiigo` y `codigoSiigo` cuando va con un
        equivalente. Nunca llama `findOrCreateProduct` ni `createProduct`; si la
        revisión falla, la vista previa sale como antes. El envío no se revisa
        (no está en el carrito).
      - Pruebas: `tests/accounting/vistaPreviaProductosSiigo.test.js` (125), en
        `npm run test:codigo-siigo`, con contract test contra
        `findOrCreateProduct` (incluye productos que solo traen `code` y la
        divergencia declarada cuando SIIGO falla) y la vista previa de punta a
        punta (Firestore en memoria, sin escrituras). Las 22 de `codigoSiigo`,
        las 4 de `siigoClienteNitConDv`, `candadoFactura` (16) y
        `emisionConCandado` (15) siguen igual.
      - Con esto 3.2 se puede comprobar después de 2.5: un producto con código
        guardado existente sale con `enSiigo: 'existente'` y sin aviso de
        creación. La pantalla que lo pinta es 1b.2.

## 1b. Front (Seller.Katuq)

- [x] 1b.1 `siigo-config`: tabla "Categorías contables" con categoría de Katuq
      y selector de categoría SIIGO. Guarda
      `accountsMapping.accountGroupByCategory`. Diseño `cfg-*` (D-400).
      Build de producción sin errores.
- [ ] 1b.2 Vista previa SIIGO: pintar `enSiigo` y `codigoSiigo` en cada línea
      (bloque 1229-B03). `error` se ve como «no se pudo revisar»; una línea sin
      `enSiigo` no se revisó. Los `avisos` ya se pintan hoy.

Hecho el 2026-10-19: backend 4030ec8c y 91c5f916; front 6d7d00a1 y 55059eab.
22 pruebas (`test:codigo-siigo`) y las pruebas SIIGO existentes en verde.
**Desvío:** la búsqueda del equivalente quedó detrás de la bandera por comercio
`siigoProductEquivalence`, porque hay comercios con SIIGO sin inventario y otra
forma de codificar. El cambio de control de inventario quedó limitado a los
servicios.

## 2. Carga inicial

- [x] 2.1 `scripts/siigo/cargarCodigosSiigo.js` (D5), por defecto sin escribir.
- [x] 2.2 Prueba sin escribir para ALMACEN BOMBAS: esperado ~666 asignados,
      2 ambiguos y ~618 sin equivalente. Excel de revisión en Descargas.
- [ ] 2.3 Aplicar con `--apply` (salir del modo automático) y releer una muestra.
      Antes la revisa Laura (Bombas) con el Excel `Codigos SIIGO ALMACEN
      BOMBAS.xlsx` (19-oct: 666 asignados, 2 ambiguos, 618 sin equivalente,
      38 repetidos).
- [x] 2.4 Script de precarga de la conexión de categorías de Bombas (mayoría
      sobre los emparejados), primero sin escribir. Aplicar cuando el comercio
      confirme si van las categorías viejas o las nuevas. Prueba del 19-oct
      con `--katuq-desde 2026-09-01`: 8 conexiones (BOMBAS > Bomba/Kit → 378,
      BOMBAS > Motobomba → 377, MOTORES → 1348, Plantas → 1350,
      Repuesto > Impulsor → 1349, Repuesto > Sello → 1357, Bomba → 378). Las
      demás se eligen en la pantalla.
      **19-oct, respuesta del comercio:** van las categorías NUEVAS
      (1647–1679). Se descarta la mayoría y se usa la lista explícita
      `--conexiones "~/Downloads/Categorias SIIGO ALMACEN BOMBAS.json"` (backend
      83202c51), con 54 conexiones y los nombres viejos de las mismas categorías.
      Prueba: los 1.286 productos quedan con categoría. Las que no tienen
      categoría nueva siguen en la de siempre: Motobomba, Generador, RCI >
      Sistema de Presión, Aspersor, Calentador, Medidor de flujo, Repuestos y
      Sello. Laura la revisa con `Categorias SIIGO ALMACEN BOMBAS.xlsx` y
      confirma que las categorías nuevas tienen las cuentas de inventario,
      costo, ingreso y devolución. Luego `--apply`.
- [ ] 2.5 Prender `siigoProductEquivalence` para ALMACEN BOMBAS
      (`scripts/set-company-feature.js`).

## 3. Cierre

- [ ] 3.1 Commit por ruta (sin `git add -A`), push, deploy del backend
      (`pm2 reload katuq-api`) y release del front. Requiere salir del modo automático.
- [ ] 3.2 Vista previa de una factura de Bombas con un producto de formato
      largo: debe mostrar el código SIIGO corto y "existente", no "se creará".
- [ ] 3.3 Actualizar D-504 en `specs/CONTRACT.md` y cerrar el ticket 1229 con
      la nota para el comercio: bodegas conectadas, qué falta de Medellín y el
      Excel de productos.

## S. Seguridad

- [x] S.1 Candado de empresa en la emisión de facturas (hallazgo de
      planificación del 2026-10-21, bloque 1229-B01). `from-order` y
      `from-order-async` solo tenían `auth` + `validateCompany`, que le cree al
      header `company`: una sesión de un comercio podía emitir en el proveedor
      (SIIGO) de otro y, con `siigoProductEquivalence` encendida, guardar
      códigos SIIGO en sus productos. La vista previa ya usaba
      `requireJwtTenant`. **Lo que S.1 cierra:** la empresa de la petición
      queda atada a la del JWT. **Lo que NO cierra:** que el `orderId` sea de
      esa empresa (ver S.2).
      - `functions/middleware/candadoEmpresaFactura.js`, después de `auth` solo
        en esas dos rutas (`routers/accounting.js`). Julsmind entra a cualquier
        empresa (D-359).
      - Interruptor global `invoiceTenantLock` en `config/feature_flags`
        (D-505, catálogo de `services/platformFlags.js`): `off` | `shadow` |
        `on`, **nace en `off`** (sin el campo, igual que hoy). `shadow` deja
        pasar y anota `tenant_mismatch_shadow` en `accounting_invoice_errors`
        (empresa del JWT, empresa pedida, ruta, `requestedOrderId` y huella
        del usuario; sin correo). `on` responde 403 `TENANT_MISMATCH` o
        `TENANT_NOT_IN_JWT` con `error`/`code` de `requireJwtTenant` más un
        `message` en español para el comercio. Revisa también
        `query.companyId` (lo leen `validateCompany` y el controlador). El modo
        se lee con `interruptorSync`: la emisión no espera a Firestore.
      - Ningún llamador interno usa esas rutas por HTTP con API key: la
        herramienta MCP llama al manager en el mismo proceso y el front manda
        el JWT con el header `company` de la sesión.
      - Pruebas: `npm run test:candado-empresa-factura` (caracterización del
        router antes y después, decisión en los tres modos y middleware).
      - **Encenderlo es decisión de Daniel:** primero `shadow`
        (`node scripts/platform-flags.js invoiceTenantLock shadow --execute`),
        revisar los eventos y después `on`. Va antes de prender
        `siigoProductEquivalence` en ALMACEN BOMBAS (2.5). La decisión D-XXX va
        en el contrato con el bloque 1229-B05, junto con el requisito EARS del
        candado (off/shadow/on, 403, Julsmind, API key) en
        `specs/siigo-codigo-producto/spec.md`.
      - Antes de pasar a `on`: el interceptor del front muestra el 403 con el
        título fijo «Suscripción»; decidir si se mapea `TENANT_MISMATCH` a un
        título propio (cambio de front aparte).
- [ ] S.2 Comprobar que el pedido es de la empresa de la sesión al emitir y en
      la vista previa. Hoy `AccountingManager.createInvoiceFromOrder` (y el
      preview) leen `orders/{orderId}` por id sin comparar el `company` del
      pedido con `companyId`: con S.1 en `on`, una sesión de A todavía puede
      facturar en su propio SIIGO un pedido de B conociendo su docId, y deja en
      ese pedido el lock y `facturacionElectronica` (B lo ve como facturado).
      Hallazgo de la revisión de 1229-B01. Es un cambio de comportamiento en
      facturación (módulo sensible): necesita propuesta, su propio interruptor
      (nace en `off`, sombra primero) y aprobación de Daniel. Debe quedar
      resuelto, o al menos en sombra sin desajustes, antes de 2.5.
