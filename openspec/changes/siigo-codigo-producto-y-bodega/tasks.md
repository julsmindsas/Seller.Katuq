# Tasks — código SIIGO por producto y bodegas de Bombas

Ticket 1229, D-504. Módulo sensible (facturación): un cambio a la vez, con diff
revisado.

## 0. Bodegas (datos)

- [x] 0.1 Conectar BOD-005 → 6 Bogota, BOD-006 → 7 Cali, BOD-001 → 31 Zona
      franca LD (`warehouses.integrations.siigo`, prueba sin escribir y luego
      aplicado el 2026-10-18).
- [ ] 0.2 Medellín (MED-VIT, MED-MOT, MED-VIR, MED-REP → Medellin 4 o BMedellin
      64) y Zona Franca Exterior: según lo que diga el comercio, desde Bodegas →
      Importar SIIGO.

## 1. Backend (katuq_admin_back_firebase/functions)

- [ ] 1.1 `services/accounting/utils/codigoSiigo.js`: `candidatosSiigo`,
      `anotarCodigosSiigo`, `guardarCodigoSiigo` (D2, D3, D4).
- [ ] 1.2 Pruebas `tests/accounting/codigoSiigo.test.js`: funciones puras,
      anotación y contract test del write-set. Script `test:codigo-siigo`.
- [ ] 1.3 `primerCodigo` con `producto?.integrations?.siigo?.productCode`
      primero en `accountingManager`, `siigoProvider.findOrCreateProduct` y
      `SiigoDataMapper.extractProductCode`.
- [ ] 1.4 `accountingManager`: llamar `anotarCodigosSiigo` antes del carrito en
      la factura y en la vista previa (solo SIIGO).
- [ ] 1.5 `findOrCreateProduct`: probar los candidatos antes de crear. Si hay
      uno solo, devolver `equivalencia`. `accountingManager` lo guarda con
      `guardarCodigoSiigo` y anota el producto en memoria.
- [ ] 1.6 Pruebas de `findOrCreateProduct` con un httpClient falso. Correr las
      pruebas de facturación SIIGO que ya existen.

## 2. Carga inicial

- [ ] 2.1 `scripts/siigo/cargarCodigosSiigo.js` (D5), por defecto sin escribir.
- [ ] 2.2 Prueba sin escribir para ALMACEN BOMBAS: esperado ~666 asignados,
      2 ambiguos y ~618 sin equivalente. Excel de revisión en Descargas.
- [ ] 2.3 Aplicar con `--apply` (salir del modo automático) y releer una muestra.

## 3. Cierre

- [ ] 3.1 Commit por ruta (sin `git add -A`), push, deploy del backend
      (`pm2 reload katuq-api`). Requiere salir del modo automático.
- [ ] 3.2 Vista previa de una factura de Bombas con un producto de formato
      largo: debe mostrar el código SIIGO corto y "existente", no "se creará".
- [ ] 3.3 Actualizar D-504 en `specs/CONTRACT.md` y cerrar el ticket 1229 con
      la nota para el comercio: bodegas conectadas, qué falta de Medellín y el
      Excel de productos.
