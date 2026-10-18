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

## Pruebas

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
