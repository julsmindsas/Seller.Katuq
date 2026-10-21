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

- Por defecto es una prueba sin escribir. Con `--apply` escribe.
- Lee todo el catálogo de SIIGO por páginas y los productos de Katuq de la
  empresa.
- Por cada producto busca primero el código exacto y después la regla
  normalizada (marca + referencia sin bloques de dos dígitos), sin contar los
  productos que Katuq creó en SIIGO con el formato largo. Solo usa los que
  tienen un único candidato.
- No pisa un `productCode` que ya esté guardado.
- Genera el Excel de revisión con cuatro hojas: asignados, ambiguos, sin
  equivalente y repetidos en SIIGO.
- Escribe con D4, en lotes, y deja un resumen en la salida.

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
- **Bombas:** un script precarga la conexión por mayoría a partir de los
  productos ya emparejados, con prueba sin escribir y por
  `integrationConfigService`, para no tocar el cifrado a mano. Se carga
  solo después de que el comercio confirme si van las categorías viejas
  (BOMBAS, MOTOR…) o las nuevas (1647–1679).
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
