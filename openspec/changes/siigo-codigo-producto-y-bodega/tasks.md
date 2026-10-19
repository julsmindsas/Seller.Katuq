# Tasks — código SIIGO por producto y bodegas de Bombas

Ticket 1229, D-504. Módulo sensible (facturación): un cambio a la vez, con diff
revisado.

## 0. Bodegas (datos)

- [x] 0.1 Conectar BOD-005 → 6 Bogota, BOD-006 → 7 Cali, BOD-001 → 31 Zona
      franca LD (`warehouses.integrations.siigo`, prueba sin escribir y luego
      aplicado el 2026-10-18). ⚠️ El 19-oct se vio que la 31 no tiene
      existencias en SIIGO: preguntar al comercio.
- [ ] 0.2 Medellín (MED-VIT, MED-MOT, MED-VIR, MED-REP → Medellin 4 o BMedellin
      64) y Zona Franca Exterior: según lo que diga el comercio, desde Bodegas →
      Importar SIIGO.

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

## 1b. Front (Seller.Katuq)

- [x] 1b.1 `siigo-config`: tabla "Categorías contables" con categoría de Katuq
      y selector de categoría SIIGO. Guarda
      `accountsMapping.accountGroupByCategory`. Diseño `cfg-*` (D-400).
      Build de producción sin errores.

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
- [x] 2.4 Script de precarga de la conexión de categorías de Bombas (mayoría
      sobre los emparejados), primero sin escribir. Aplicar cuando el comercio
      confirme si van las categorías viejas o las nuevas. Prueba del 19-oct
      con `--katuq-desde 2026-09-01`: 8 conexiones (BOMBAS > Bomba/Kit → 378,
      BOMBAS > Motobomba → 377, MOTORES → 1348, Plantas → 1350,
      Repuesto > Impulsor → 1349, Repuesto > Sello → 1357, Bomba → 378). Las
      demás se eligen en la pantalla.
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
