# Diseño — código SIIGO por producto (D-504, ticket 1229)

## Contexto del código

Hay tres lugares que sacan el código del producto al facturar, y todos pasan
por `primerCodigo` (ticket 1110):

| Lugar | Para qué |
|-------|----------|
| `accountingManager` (bucle del carrito, ~l.1710) | clave de `productIdMap` y mensajes |
| `siigoProvider.findOrCreateProduct` (~l.1110) | buscar el producto en SIIGO o crearlo |
| `SiigoDataMapper.extractProductCode` (l.260) | `code` de cada renglón de la factura y del producto creado |

Los tres reciben el **producto del carrito**, que es la copia guardada en el
pedido y no el documento de `products`. Los pedidos viejos no tendrán el
código nuevo, así que hay que leerlo al facturar.

## D1. Dónde vive el código

`products/{id}.integrations.siigo`:

```
productCode:       "GLD-01-4SSFR"
productCodeSource: "carga-1229" | "equivalencia-al-facturar"
productCodeAt:     ISO-8601
```

Artículo XV: inglés, bajo `integrations.<provider>`, igual que
`warehouses.integrations.siigo.warehouseId` (D-046).

## D2. Leerlo al facturar sin tocar los tres lugares por separado

Nueva función `services/accounting/utils/codigoSiigo.js`:

- `anotarCodigosSiigo(db, companyId, carrito)`: lee en una sola llamada
  (`getAll`) los documentos de `products` del carrito, usando `producto.cd` o
  `producto._id`, filtrados por `company`. A cada producto del carrito **en
  memoria** le pone `integrations.siigo.productCode` cuando el documento lo
  tiene. No falla nunca: si la lectura falla, factura como hoy.
- El pedido no se vuelve a guardar desde `accountingManager` (verificado:
  solo lo lee). Aunque se guardara, el dato es el mismo que tiene el producto.
- `primerCodigo` en los tres lugares recibe
  `producto?.integrations?.siigo?.productCode` como **primer** valor.

Se llama a `anotarCodigosSiigo` antes del bucle del carrito en la factura
(~l.1679) y en la vista previa (~l.1339), para que la vista previa muestre el
mismo código que irá en la factura. Solo se llama para SIIGO.

## D3. Equivalencia al facturar, antes de crear

En `findOrCreateProduct`, cuando la búsqueda exacta no encuentra el producto y
este no traía código guardado:

1. `candidatosSiigo(codigo)` (función pura) arma los códigos posibles
   quitando bloques de dos dígitos después de la marca. Por ejemplo,
   `GLD-00-01-4SSFR` da `GLD-01-4SSFR`, `GLD-00-4SSFR` y `GLD-4SSFR`, sin
   repetidos y sin el original.
2. Busca cada candidato con `findProductByCode`, que es exacto. Son a lo más
   3 consultas, y solo cuando el producto no existe en SIIGO.
3. Si existe **exactamente uno**, lo usa y devuelve `equivalencia: {productId,
   codigo}`. Con cero o más de uno, crea como hoy.

`accountingManager` guarda la equivalencia en el producto (D4) y pone el
código en el producto del carrito en memoria, para que el renglón de la
factura lo use.

La carga inicial (D5) cubre más casos porque compara contra todo el catálogo
de SIIGO. Por ejemplo, `FRT-07-06-807CL` contra `FRT-05-31-807CL` no sale con
los candidatos. Esos quedan para la revisión del comercio.

## D4. Escritura acotada

`guardarCodigoSiigo(db, productId, codigo, origen)` hace un único
`update` con las tres rutas de D1 en dot-notation. No usa `set` ni toca nada
más. Si falla, se deja un aviso en el log y la factura sigue. Un contract test
revisa que el objeto del update tenga solo esas tres claves.

## D5. Carga inicial para Bombas

Script `scripts/siigo/cargarCodigosSiigo.js --company "ALMACEN BOMBAS"`:

- Por defecto es una prueba sin escribir. Con `--apply` escribe; `--dry-run`
  siempre gana. `--apply` exige `--aprobado "<xlsx>"`: solo se escriben los
  productos cuyo par (Referencia, Código en SIIGO) de la hoja «Asignados» que
  revisó el comercio coincide con el emparejamiento recalculado; lo demás se
  informa y no se escribe. El Excel de salida nunca reemplaza el aprobado.
- Lee todo el catálogo de SIIGO por páginas y los productos de Katuq de la
  empresa.
- Por cada producto busca primero el código exacto y después la regla
  normalizada (marca + referencia sin bloques de dos dígitos), sin contar los
  productos que Katuq creó en SIIGO con el formato largo. Solo usa los que
  tienen un único candidato.
- No pisa un `productCode` que ya esté guardado.
- Genera el Excel de revisión con cuatro hojas: asignados, ambiguos, sin
  equivalente y repetidos en SIIGO.
- Escribe con D4, en lotes, y deja un resumen en la salida. Relee cada lote con
  `getAll`, salta los productos que ya tienen código (pudo guardarlo la
  equivalencia al facturar) o que no son de la empresa, y escribe con la
  precondición `lastUpdateTime` del documento leído.
- `--verificar N` toma una foto de una muestra antes y la relee después: fuera
  de `integrations.siigo` no puede cambiar nada y el código debe ser el
  esperado. Sin `--apply` relee una carga ya hecha.
- La lógica vive en `scripts/siigo/planCargaSiigo.js`, sin efectos al cargarse,
  con pruebas en `tests/accounting/emparejarCodigosSiigo.test.js`.

## D6. Categoría contable de SIIGO por categoría de Katuq

En SIIGO, la categoría de productos (`account_group`) lleva las cuentas de
inventario, costo de venta, ingreso y devolución. Hoy `createProduct` usa
`accountsMapping.accountGroup`. Si está vacío, usa el primero que devuelve
`GET /account-groups`, que en Bombas es Motobombas.

- **Dónde vive la conexión:** en `accountsMapping.accountGroupByCategory` de la
  configuración SIIGO (`integration_configs/{empresa}_siigo`), en Firestore y
  cifrado igual que el resto (D-505). Es un objeto `{ "<ruta>": <id SIIGO> }`.
  La ruta se normaliza: sin tildes, en minúsculas, sin espacios repetidos y con
  ` > ` entre niveles. Por ejemplo, `"bombas > motobomba": 377` o
  `"motores": 1348`.
- **`grupoContableSiigo(producto, accountsMapping)`**, en
  `utils/codigoSiigo.js`, es una función pura.
  - Saca la ruta de la categoría de `producto.categorias`. Viene serializada con
    `flatted` y en tres formas: con `ruta`, con cadena de `parent` o solo con
    `label`.
  - Busca primero la ruta completa, después sus prefijos hacia la raíz y al
    final la etiqueta sola.
  - Si no encuentra nada, devuelve `accountsMapping.accountGroup`, o `null`
    para que se comporte como hoy.
- **`findOrCreateProduct`:** antes de `createProduct`, pasa
  `accountsMapping.accountGroup` resuelto por categoría. `createProduct` no
  cambia su búsqueda de respaldo.
- **Servicios:** `createProduct` lee `product.stockControl`, pero el mapper
  entrega `stock_control`. Por eso hoy todo producto queda con control de
  inventario. Se pasa a respetar `stock_control` cuando viene.
- **Pantalla:** en Integraciones → SIIGO, junto al selector de categoría que ya
  existe, va una tabla con las categorías de Katuq de la empresa y un
  selector de categoría de SIIGO para cada una. Se guarda en el mismo
  `accountsMapping`.
- **Bombas:** un script propone la conexión por mayoría a partir de los
  productos ya emparejados, solo como prueba. Para guardar, `--apply` exige
  `--conexiones` con la lista que eligió el comercio (19-oct: las nuevas,
  1647–1679). Guarda por `integrationConfigService`, para no tocar el cifrado
  a mano, solo si la integración ya está activa; funde con lo guardado (la
  misma categoría escrita distinto cuenta una vez y gana lo que eligió el
  comercio) y `--verificar` relee lo guardado contra el archivo.
- **No cambia** la categoría de los productos que ya existen en SIIGO.

## D7. Vista previa: qué pasará con cada producto (tarea 1.9)

- `codigoSiigo.js` replica la decisión de `findOrCreateProduct` en funciones
  puras con `buscar` inyectado (`strategy.findProductByCode`): búsqueda exacta;
  candidatos solo sin código guardado y con la bandera; uno solo y con código
  exacto. El código buscado sale en el orden del proveedor (con `code` antes de
  `_id`); la línea se anota por el código del mapper (`codigosLinea`), no por
  índice. Un contract test compara la decisión con la del proveedor real.
- **Detrás de `siigoProductEquivalence`.** Apagada, la vista previa es la de
  hoy (nada nuevo nace encendido). Desvío de la recomendación 5 del informe,
  que pedía la búsqueda exacta para todos: así no cambia la latencia ni los
  avisos de OH MY STORE ni de ALMARA. 3.2 se verifica después de 2.5.
- **Acotada.** Tope de 20 códigos, plazo de 15 s, `retryAttempts: 0` y timeout
  de 5 s solo para estas lecturas, y corte en el primer error. El circuit
  breaker de `ResilientHttpClient` es uno por proveedor para todas las empresas
  y se abre con 5 fallas seguidas: la vista previa aporta como mucho una.
- **Divergencia declarada.** Si una consulta falla, la factura sigue y crea; la
  vista previa marca `error` y avisa que no revisó todo, sin afirmar nada.
- No cambia lo que se factura: no toca el proveedor, el mapper ni
  `createInvoiceFromOrder`.

## Desvíos al implementar (registro del 2026-10-21, bloque 1229-B05)

Los tres primeros van con D-504 (aprobada por Daniel el 21-oct, en bloque) y
están anotados en el contrato. El candado (S.1) no estaba en lo aprobado: es
la propuesta D-533, apagada y pendiente de ratificar.

- **D3 detrás de una bandera por comercio.** La búsqueda del equivalente solo
  corre con `siigoProductEquivalence` (`companies.featureFlags`, D-505), apagada
  por defecto. La regla depende de cómo codifica cada comercio (ALMARA y OH MY
  STORE codifican distinto). El código guardado de D1/D2 sí se lee siempre.
  Dueño Daniel; se revisa el 2027-04-30 (tarea 3.5). El requisito «Equivalencia
  única antes de crear» de la spec todavía no dice «WHILE la bandera…»: se
  ajusta con la aprobación de Daniel (tarea 3.6).
- **D6, `stock_control` solo para servicios.** `createProduct` crea los
  servicios sin control de inventario; los productos siguen con control, aunque
  el mapper mande otro valor.
- **D7 detrás de la misma bandera** (ya escrito en D7): apagada, la vista
  previa es la de siempre. Se aparta de la recomendación 5 del informe, que
  pedía la búsqueda exacta para todos y decía que el front no cambiaba: lo
  nuevo nace apagado y el circuit breaker de SIIGO es compartido. El front sí
  cambió (1b.2, chip por línea), porque los avisos solos no dicen a qué línea
  se refieren.
- **Candado de emisión (S.1), fuera del diseño original.** Hallazgo de
  planificación del 21-oct: `from-order` y `from-order-async` le creían al
  header `company`. Va en su propia decisión, D-533, con el interruptor global
  `config/feature_flags.invoiceTenantLock` (off | shadow | on), que nace en
  `off`. Que el `orderId` sea de la empresa queda en S.2. Daniel la ratifica
  antes de desplegar (3.1).
- **Requisitos EARS sin pasar a la spec.** El de la vista previa sí entró
  (1229-B02) porque era la recomendación 5, aprobada. Los del candado (D-533,
  propuesta) y los de la carga con `--aprobado` y `--verificar` (D5 y D6) no
  estaban en el plan aprobado; quedan para que Daniel los apruebe, junto con
  la condición de la bandera en «Equivalencia única antes de crear».

## Pruebas

- `grupoContableSiigo`: las tres formas de `categorias`, la ruta completa
  antes que la raíz, la normalización de tildes, el caso sin conexión (vuelve a
  `accountGroup`) y el caso sin categoría.
- `createProduct` con un httpClient falso: `account_group` resuelto por
  categoría y servicio con `stock_control: false`.

- `candidatosSiigo`: ejemplos reales de Bombas, código corto y código sin
  bloques.
- `anotarCodigosSiigo`: con código, sin código, producto de otra empresa (no
  anota) y lectura que falla (no lanza).
- `findOrCreateProduct` con un httpClient falso: un equivalente lo usa, dos
  equivalentes crea, ninguno crea, y un código guardado no consulta
  candidatos.
- Contract test del write-set de D4.
- Las pruebas de facturación SIIGO que ya existen deben seguir en verde.

## Riesgos y reversa

- Un código mal asignado factura otro producto. Para quitarlo se borra
  `integrations.siigo.productCode` del producto, y la factura vuelve al
  comportamiento de hoy.
- Las consultas extra a SIIGO solo pasan cuando el producto no existe allá, es
  decir, en el mismo punto donde hoy se crearía.
