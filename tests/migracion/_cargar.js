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
  flujo: require(base + 'logica/flujo.ts'),
  textos: require(base + 'logica/textos.ts'),
  ampliacion: require(base + 'logica/ampliacion.ts'),
  seo: require('../../src/app/components/productos/crear-productos/seo-producto.ts'),
  acceso: require(base + 'logica/acceso.ts'),
  clientes: require(base + 'logica/clientes.ts'),
};
