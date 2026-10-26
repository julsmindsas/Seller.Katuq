'use strict';

// Ayuda de TEMA-B20: compila las hojas del lote 2 (ventas) de la cola «todas las paginas» y las normaliza en claro para fijar el «antes».
// Regenerar el fixture (compila la version de un commit): node tests/theme/cola-ventas-claro.js <commit> > fixtures/cola-ventas-claro-<commit>.json

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const { normalizarCss, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const ARCHIVOS = [
  'src/app/components/ventas/entrega/direccion-estructurada/direccion-estructurada.component.scss',
  'src/app/components/ventas/list/list-produccion.component.scss',
  'src/app/components/ventas/notas/notas/notas.component.scss',
  'src/app/components/ventas/clientes/crear-cliente-modal/crear-cliente-modal.component.scss',
  'src/app/components/ventas/clientes/customer-metrics/customer-metrics.component.scss',
  'src/app/components/ventas/clientes/global-metrics/global-metrics.component.scss',
  'src/app/components/ventas/pos2/widgets/cash-closing/reporte-cierre/reporte-cierre.component.scss',
  'src/app/components/ventas/orden-venta/orden-venta.component.scss',
  'src/app/components/ventas/list/pedido-3d/pedido-3d.component.scss',
  'src/app/components/ventas/pos2/widgets/cash-closing-history/cash-closing-history.component.scss',
  'src/app/components/ventas/asentarpagomanual/asentarpagomanual.component.scss',
  'src/app/components/ventas/facturacion/pedido-facturacion.component.scss',
  'src/app/components/ventas/clientes/lista/clientes-lista.component.scss',
  'src/app/components/ventas/order-history-timeline/order-history-timeline.component.scss',
  'src/app/components/ventas/editar-iva-linea-pedido/editar-iva-linea-pedido.component.scss',
  'src/app/components/ventas/list/pedido-reparto/pedido-reparto.component.scss',
  'src/app/components/ventas/list/pedido-pago-cuotas/pedido-pago-cuotas.component.scss',
  'src/app/components/ventas/pos2/widgets/cash-closing/cash-closing.component.scss',
];
const nm = path.join(RAIZ, 'node_modules');
const opts = { style: 'expanded', loadPaths: [path.join(RAIZ, 'src'), nm], logger: sass.Logger.silent,
  importers: [{ findFileUrl: u => (u.startsWith('~') ? pathToFileURL(path.join(nm, u.slice(1))) : null) }] };

function compilar(rel, commit) {
  if (!commit) return sass.compile(path.join(RAIZ, rel), opts).css;
  const fuente = execFileSync('git', ['show', `${commit}:${rel}`], { cwd: RAIZ, encoding: 'utf8' });
  return sass.compileString(fuente, { ...opts, url: pathToFileURL(path.join(RAIZ, rel)) }).css;
}

function lineasClaro(rel, commit) {
  const claros = leerTokens(compilar('src/app/shared/styles/_theme-tokens.scss'), 'claro');
  return normalizarCss(compilar(rel, commit), claros, 'claro');
}

module.exports = { ARCHIVOS, compilar, lineasClaro };

if (require.main === module) {
  const salida = { base: process.argv[2] || '', archivos: {} };
  for (const f of ARCHIVOS) salida.archivos[f] = lineasClaro(f, process.argv[2]);
  process.stdout.write(JSON.stringify(salida));
}
