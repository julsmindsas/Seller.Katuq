# Tasks — código SIIGO por producto y bodegas de Bombas

Ticket 1229 (cd nF3GLH3F2sZGnKsqNODM; el número se repite con «Web · F2-20»,
cd b0t5fO5a8aA4ZHiKnsIC), D-504. Módulo sensible (facturación): un cambio a la
vez, con diff revisado.

**Estado (2026-10-21):** APROBADA (Daniel, 21-oct, en bloque) y EN PRODUCCIÓN
con la bandera `siigoProductEquivalence` apagada: backend ee5ee2e7 (4030ec8c,
91c5f916 y 83202c51) y front release 2026.10.21.2 (6d7d00a1 y 55059eab). Lo de
los bloques 1229-B01 a 1229-B04 (S.1, 1.9, 1b.2 y 2.6) está commiteado en la
rama `feature/tickets-web` y **sin desplegar** (3.1). Candado de emisión: D-561,
propuesta commiteada y apagada que Daniel ratifica antes de 3.1 (no estaba en
lo aprobado en bloque).

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
      **Quién desbloquea:** el comercio, al crearlas en Siigo Nube (la API de
      SIIGO solo lee bodegas). Después, cualquiera del equipo desde la pantalla,
      sin código nuevo.

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
      - Commits: backend 70f97a54, front 7b7dcca1 (rama `feature/tickets-web`,
        sin desplegar).

## 1b. Front (Seller.Katuq)

- [x] 1b.1 `siigo-config`: tabla "Categorías contables" con categoría de Katuq
      y selector de categoría SIIGO. Guarda
      `accountsMapping.accountGroupByCategory`. Diseño `cfg-*` (D-400).
      Build de producción sin errores.
- [x] 1b.2 Vista previa SIIGO: pintar `enSiigo` y `codigoSiigo` en cada línea
      (bloque 1229-B03). `error` se ve como «no se pudo revisar»; una línea sin
      `enSiigo` no se revisó. Los `avisos` ya se pintan hoy.
      - `ventas/list/list.component.html` (celda del producto de `fvp-tabla`) y
        `.scss`: solo cuando la línea trae `enSiigo`, debajo de la descripción
        va el código del producto (`l.codigo`) en texto muted y un chip:
        `existente` «En SIIGO», `equivalente` «En SIIGO como {codigoSiigo}»
        (éxito; así la línea muestra A → B y el código de SIIGO va en su propio
        span sin el UPPERCASE del chip, tal cual existe en SIIGO); `nuevo`
        «Se creará en SIIGO» y `ambiguo` «Se creará: varios posibles en SIIGO»
        (alerta); `error` «No se pudo revisar en SIIGO» (pizarra). Sin `enSiigo`
        (bandera apagada, backend viejo u otro proveedor) la celda queda igual
        que hoy, como pide la spec EARS. Solo presentación: sin cambios de TS,
        columnas, eventos ni servicios.
      - Decisión: con la bandera encendida, una línea que quedó sin revisar
        (tope de 20 códigos, plazo de 15 s o corte tras el primer error) no
        lleva chip; lo dice el aviso «Se revisaron en SIIGO k de N productos.».
      - Diseño Katuq: clases `fv-*` sin «p-», chip radio 20px con par semántico
        y color/tamaño propios, código con `letter-spacing: normal`; gradientes
        y primarios prohibidos de la pantalla sin subir (scss 3/0, html 0/0).
        Excepción de color: el texto del chip de alerta va en `#8a5300` (el de
        `.fvp-aviso`), no en `#D9820A`: sobre `#FFF1DF` da 5.7:1 contra 2.6:1.
        Se registra en el contrato con 3.3.
      - Pruebas: `node --test tests/ventas/vista-previa-siigo.test.js` (14):
        parsea la celda con `@angular/compiler` y la pinta con cada respuesta, y
        compila el SCSS con sass. `tsc --noEmit -p tsconfig.app.json` sin
        errores. **Pendiente:** revisión en navegador a 1440 y 390 px (no hay
        navegador en el servidor) y la verificación real de 3.2 después de 2.5.
      - Commit: front 9a57fab7 (rama, sin desplegar). La excepción de color y la
        revisión visual pendiente quedaron en D-504 del contrato (3.3).

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
      **Código listo (bloque 1229-B04, 2026-10-21); falta la ejecución**, que
      sigue bloqueada por la revisión de Laura y una sesión con permiso de
      escritura. `--apply` exige `--aprobado "<xlsx>"`: solo escribe los
      productos cuyo par (Referencia, Código en SIIGO) de la hoja «Asignados»
      coincide con el emparejamiento recalculado; las filas que cambiaron,
      desaparecieron o ya tenían código, y las asignadas hoy que no están en el
      Excel («no aprobada (borrada o nueva)»), se informan (hoja «No se
      escriben») y no se escriben. El Excel de salida nunca es el aprobado: se
      niega si `--out` apunta a él, sin `--out` no reemplaza un archivo que ya
      existe y, con `--aprobado`, la hoja recalculada se llama «Asignados
      recalculados». Si leer el Excel altera los prototipos de JavaScript
      (xlsx 0.18.5, CVE-2023-30533) se detiene antes de Firebase. Relee cada lote con `getAll`, salta los que ya
      tienen código o no son de la empresa, y escribe con `updateCodigoSiigo`
      y la precondición `lastUpdateTime`. `--verificar 10` toma una foto antes y
      relee después (fuera de `integrations.siigo` no puede cambiar nada); sin
      `--apply` relee una carga ya hecha. `--dry-run` siempre gana. Orden exacto
      en el encabezado de `scripts/siigo/cargarCodigosSiigo.js`.
      **Quién desbloquea:** Laura (OK al Excel; el del 19-oct está en Descargas
      de la máquina donde corrió la prueba, no en el servidor) y después Daniel,
      con una sesión con permiso de escritura. Antes del `--apply` se repite la
      prueba sin escribir: si los números ya no son 666/2/618/38, Laura revisa el
      Excel nuevo.
- [ ] 2.4 Script de precarga de la conexión de categorías de Bombas (mayoría
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
      **Código listo (bloque 1229-B04, 2026-10-21); falta la ejecución**
      (bloqueada por la confirmación de Laura). `--apply` exige `--conexiones`
      (la mayoría queda solo para la prueba). Al guardar, `fusionarConexiones`
      cuenta una sola vez la misma categoría escrita distinto (llave normalizada
      como en `grupoContableSiigo`) y lo que ya eligió el comercio gana; relee la
      configuración sin caché y manda `accountsMapping` completo a `saveConfig`
      (conserva `accountGroup` y las demás llaves; el resto de la configuración
      queda igual). Solo guarda si la integración SIIGO ya está activa, porque
      `saveConfig` siempre deja `status: 'active'`. Efectos de `saveConfig`
      aceptados por D6: sube `version`/`updatedAt`/`updatedBy`, reescribe el
      documento de secretos con los mismos secretos y deja su auditoría.
      `--verificar` relee y compara lo guardado con el archivo; termina con
      salida 1 si una conexión falta o quedó distinta. Durante la carga nadie
      debe guardar en Integraciones → SIIGO (esa pantalla manda
      `accountGroupByCategory` entero) y se vuelve a correr `--verificar` justo
      antes de 2.5.
      **Quién desbloquea:** Laura (confirma que las categorías nuevas 1647–1679
      tienen las cuentas de inventario, costo, ingreso y devolución) y después
      Daniel, que corre `--apply` y `--verificar`.
- [ ] 2.5 Prender `siigoProductEquivalence` para ALMACEN BOMBAS
      (`scripts/set-company-feature.js`).
      **Quién desbloquea:** Daniel, cuando estén 2.3 aplicada, 2.4 con
      `--verificar` en 0, D-561 ratificada y en `shadow` sin desajustes, S.2
      resuelta o en sombra, y 2.7 respondida por el comercio (inventario inicial
      de la bodega 31 cargado en SIIGO, bloqueo por falta de stock apagado y los
      2 ambiguos elegidos).
- [x] 2.6 Pruebas de los scripts de carga (bloque 1229-B04). La lógica pasó a
      `scripts/siigo/planCargaSiigo.js` (sin efectos al cargarse; los scripts
      solo ejecutan con `require.main === module`). Pruebas en
      `tests/accounting/emparejarCodigosSiigo.test.js` (38), dentro de
      `npm run test:codigo-siigo`: `normalizado`, `largoDeKatuq`, emparejador
      (código igual, regla sin bloques, ambiguo, el repetido de Katuq no gana,
      `repetidos()`), clasificación idéntica a la del script anterior
      (caracterización antes y después), `planDeCarga` (coincide, cambió,
      desapareció, no aprobada, ya tenía código), Excel de salida que nunca pisa
      el aprobado, guarda contra la contaminación de prototipos al leerlo,
      escritura con db falso (salta los que
      ya tienen código o son de otra empresa, update de solo las 3 rutas,
      precondición y relectura si otro proceso escribe), verificación de la
      muestra, `fusionarConexiones`, `saveConfig` con un servicio falso (y no
      guarda con la integración apagada), `require` de los scripts en un proceso
      aparte, y el write-set del código de carga: toda llamada que escribe va
      sobre un receptor permitido, solo `products.integrations.siigo.productCode*`
      y, por `saveConfig`, `accountsMapping.accountGroupByCategory` de
      `integration_configs/{empresa}_siigo` (más los metadatos y la auditoría
      que `saveConfig` siempre escribe).
      Commits: backend f9f89660, front 4290122d (rama, sin desplegar).
- [ ] 2.7 Mandar al comercio el aviso previo (borrador abajo, «Aviso previo al
      comercio») y esperar su respuesta **antes de 2.5**: es lo que el comercio
      tiene que hacer antes de que se prenda la bandera. No se deja para la
      nota de cierre, que se pega cuando 2.5 y 3.2 ya están hechas.
      **Quién desbloquea:** Daniel (lo pega en el ticket 1229; los agentes no
      escriben en tickets) y luego el comercio (Laura), al responder.

## 3. Cierre

- [ ] 3.1 Commit por ruta (sin `git add -A`), push, deploy del backend
      (`pm2 reload katuq-api`) y release del front. Requiere salir del modo automático.
      La base (4030ec8c, 91c5f916, 83202c51, 6d7d00a1 y 55059eab) ya está en
      producción (backend ee5ee2e7, front 2026.10.21.2). Falta lo de la rama
      `feature/tickets-web`: backend cb6aad91, 70f97a54 y f9f89660; front
      693069ce, 7b7dcca1, 9a57fab7, 4290122d y el commit de 1229-B05.
      **Quién desbloquea:** Daniel (push, despliegue y release). Antes ratifica
      D-561 (el candado va en cb6aad91 y no estaba en lo aprobado en bloque).
- [ ] 3.2 Vista previa de una factura de Bombas con un producto de formato
      largo: debe mostrar el código SIIGO corto y "existente", no "se creará".
      Incluye la revisión de la vista previa en navegador a 1440 y 390 px (1b.2).
      **Quién desbloquea:** Daniel con el comercio, después de 3.1 y 2.5; la
      primera factura real se coordina con Bombas y se revisa en SIIGO (producto,
      bodega y categoría).
- [x] 3.3 Actualizar D-504 en `specs/CONTRACT.md` (incluida la excepción de
      color del chip de alerta de 1b.2, `#8a5300`, y la revisión visual a 1440
      y 390 px de la vista previa). Hecho en el bloque 1229-B05: D-504
      APROBADA y EN PRODUCCIÓN con la bandera apagada, desvíos en `design.md`,
      decisión D-561 del candado y D-453 citada por su cd (no estaba errada: el
      número 1229 se repite con «Web · F2-20»). La parte del ticket pasó a 3.4.
- [ ] 3.4 Pegar en el ticket 1229 (cd nF3GLH3F2sZGnKsqNODM) la nota de cierre
      de abajo, con los Excel adjuntos, y cerrarlo cuando 2.3, 2.4, 2.5 y 3.2
      estén hechas. Si Medellín sigue pendiente, va como tarea del comercio en
      el mismo ticket (D-531, T·1).
      **Quién desbloquea:** Daniel (los agentes no escriben en tickets).
- [ ] 3.5 Revisar `siigoProductEquivalence` el 2027-04-30 (Art. XII; dueño
      Daniel): o queda como regla de Bombas documentada, o se retira.
- [ ] 3.6 Ajustar `specs/siigo-codigo-producto/spec.md` a lo que está en
      producción: «Equivalencia única antes de crear» pasa a «WHILE la empresa
      tiene `siigoProductEquivalence` encendida» (desvío D3), y se suman los
      EARS de la carga (`--aprobado`, `--verificar`) y, si Daniel ratifica
      D-561, los del candado. Antes de `/opsx:archive`.
      **Quién desbloquea:** Daniel (cambia una spec aprobada fuera de lo que
      cubrió la recomendación 5).

### Aviso previo al comercio (borrador, tarea 2.7)

Para que Daniel lo pegue en el ticket 1229 antes de prender la bandera (2.5).

> Hola, Laura. Antes de activar la facturación con los códigos que ya tienen
> en SIIGO, necesitamos tres cosas de su lado:
>
> 1. Cargar en SIIGO el inventario inicial de la bodega 31 (Zona Franca Libre
>    Disposición), que hoy está en 0.
> 2. Dejar apagado en SIIGO el bloqueo de facturas por falta de stock, para
>    que ninguna factura se rechace mientras cuadran las existencias.
> 3. Decirnos cuál es el producto correcto en los 2 casos que tienen dos
>    posibles equivalentes en SIIGO (van en el Excel adjunto). Si se facturan
>    antes, SIIGO crea uno nuevo.
>
> Cuando nos confirmen, activamos el cambio y hacemos con ustedes la primera
> factura.

### Nota de cierre para el comercio (borrador)

Para que Daniel la pegue en el ticket 1229 al cerrarlo (3.4). Si algo de
2.3–3.2 sigue pendiente ese día, ajustar el texto antes de pegarlo (por ejemplo,
el punto 5 de los ambiguos según lo que respondieron a 2.7).

> Hola, Laura. Terminamos la integración de inventario con SIIGO para
> ALMACEN BOMBAS. Esto es lo que quedó:
>
> 1. **Bodegas conectadas.** Cada factura descuenta en SIIGO de la bodega real:
>    Bogotá (BOD-005 → bodega 6), Cali (BOD-006 → bodega 7) y Zona Franca
>    Libre Disposición (BOD-001 → bodega 31).
> 2. **Lo que falta de Medellín.** Las bodegas de Medellín (MED-VIT, MED-MOT,
>    MED-VIR y MED-REP) y Zona Franca Exterior todavía no existen en SIIGO.
>    Como acordamos, Katuq es el dueño del dato: créenlas en Siigo Nube, una
>    por cada bodega de Katuq, y nos avisan para conectarlas. Mientras tanto,
>    las ventas de esas bodegas descuentan de la bodega por defecto de SIIGO.
> 3. **Qué viaja a SIIGO y qué no.** SIIGO no permite registrar traslados ni
>    ajustes de inventario por su API, y hoy Katuq no envía compras a SIIGO,
>    así que los traslados, ajustes y compras que hagan en Katuq no llegan a
>    SIIGO; allá hay que registrarlos. Lo que sí queda resuelto es que
>    cada venta descuenta de la bodega correcta y del producto correcto: Katuq
>    factura con el código que el producto ya tiene en SIIGO, en vez de crear
>    otro.
> 4. **Bodega 31 en SIIGO.** Como les pedimos antes de activar el cambio,
>    el inventario inicial de la bodega 31 tiene que estar cargado en SIIGO y
>    el bloqueo de facturas por falta de stock debe seguir apagado, para que
>    ninguna factura se rechace.
> 5. **Listas para revisar en SIIGO** (van en el Excel adjunto):
>    - 38 productos que SIIGO tiene repetidos;
>    - 50 productos que Katuq creó desde el 1 de septiembre y quedaron en la
>      categoría Motobombas porque no había otra configurada: revisen cuáles
>      cambiar;
>    - 2 productos con dos posibles equivalentes en SIIGO, que resolvimos con
>      lo que nos indicaron (si alguno quedó sin elegir, SIIGO crea uno nuevo al
>      facturarlo);
>    - 618 productos de Katuq sin equivalente en SIIGO: se crean solos la
>      primera vez que se facturen, ya con su categoría contable.
>    Fusionar o recategorizar los repetidos es un trabajo contable de ustedes en
>    SIIGO; Katuq no los toca.
> 6. **Pendiente del ticket 1099.** Ustedes ya llamaron a soporte de SIIGO por
>    el saldo doble de las facturas FV-2-6268, FV-2-6269, FV-2-6270 y
>    FV-2-6271, del 29 de septiembre. ¿Ya les respondieron? Cuando SIIGO lo
>    corrija, marquen como hecha la tarea del ticket 1099.

**Para Daniel (no va en la nota):** al cerrar, reclasificar el ticket de
«gestión comercial > clientes» a «finanzas > facturación electrónica», para que
las métricas de soporte lo cuenten bien. Los Excel (`Codigos SIIGO ALMACEN
BOMBAS.xlsx` y `Categorias SIIGO ALMACEN BOMBAS.xlsx`) no están en el servidor:
adjuntar la versión que Laura aprobó, o la que salga de repetir la prueba.

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
        `message` en español para el comercio. Compara el header `company`,
        `body.company`, `body.companyId`, `body.empresa` y `query.companyId`
        (lo leen `validateCompany` y el controlador). El modo se lee con
        `interruptorSync`: la emisión no espera a Firestore (si la caché venció,
        refresca en segundo plano).
      - Ningún llamador interno usa esas rutas por HTTP con API key: la
        herramienta MCP llama al manager en el mismo proceso y el front manda
        el JWT con el header `company` de la sesión.
      - Pruebas: `npm run test:candado-empresa-factura` (caracterización del
        router antes y después, decisión en los tres modos y middleware).
      - **Encenderlo es decisión de Daniel:** primero `shadow`
        (`node scripts/platform-flags.js invoiceTenantLock shadow --execute`),
        revisar los eventos y después `on`. Va antes de prender
        `siigoProductEquivalence` en ALMACEN BOMBAS (2.5). Decisión **D-561**
        en el contrato (bloque 1229-B05), como **propuesta** pendiente de
        ratificar: el candado no estaba en lo aprobado en bloque. Sus EARS
        (off/shadow/on, 403, Julsmind, API key) pasan a la spec en 3.6 si
        Daniel la ratifica; el encargo de B05 se limitó a contrato, tareas y
        diseño.
      - Commits: backend cb6aad91, front 693069ce (rama, sin desplegar).
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
      **Quién desbloquea:** Daniel (aprobar la propuesta).
- [ ] S.3 Revisar `invoiceTenantLock` el 2027-01-31 (D-561, Art. XII; dueño
      Daniel): si está en `on` sin problemas, retirar el interruptor y dejar el
      candado fijo; si no, decidir si se elimina. Antes, encenderlo: `shadow`,
      revisar `tenant_mismatch_shadow` y pasar a `on`. Para 2.5 basta `shadow`
      sin desajustes.
      **Quién desbloquea:** Daniel.
