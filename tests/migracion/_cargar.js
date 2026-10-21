'use strict';
/** Carga la lógica pura del importador (TypeScript) sin Angular. No es una prueba. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });
const base = '../../src/app/components/migracion-tienda/';
module.exports = {
  csv: require(base + 'logica/csv.ts'),
  perfiles: require(base + 'logica/perfiles.ts'),
  imp: require(base + 'logica/importacion.ts'),
  lotes: require(base + 'logica/lotes.ts'),
  errores: require(base + 'logica/errores.ts'),
  sumas: require(base + 'logica/sumas.ts'),
  reporte: require(base + 'logica/reporte.ts'),
  acceso: require(base + 'logica/acceso.ts'),
};
