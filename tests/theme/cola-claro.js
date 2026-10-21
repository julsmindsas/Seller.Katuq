'use strict';

// Ayuda de TEMA-B19: compila las hojas del lote 1 de la cola «todas las paginas» y las normaliza en claro para fijar el «antes».
// Regenerar el fixture (compila la version de un commit): node tests/theme/cola-claro.js <commit> > fixtures/cola-claro-<commit>.json

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const { normalizarCss, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const ARCHIVOS = [
  'src/app/components/crm/components/crm-list/crm-list.component.scss',
  'src/app/components/produccion/dashboard/dashboard.component.scss',
  'src/app/components/productos/crear-productos/crear-productos.component.scss',
  'src/app/components/dashboard/legacy-dashboard.component.scss',
  'src/app/components/dashboard/builder/report-builder.component.scss',
  'src/app/components/productos/productos.component.scss',
  'src/app/components/picking-packing/packing-detail/packing-detail.component.scss',
  'src/app/components/prospect-manager/prospect-manager.component.scss',
  'src/app/components/picking-packing/picking-detail/picking-detail.component.scss',
  'src/app/components/crm/components/crm-seguimiento/crm-seguimiento.component.scss',
  'src/app/components/crm/components/crm-detail/crm-detail.component.scss',
  'src/app/components/dropshipping/ordenes-dropshipping/lista-ordenes.component.scss',
  'src/app/components/dropshipping/proveedores/detalle-proveedor/detalle-proveedor.component.scss',
  'src/app/components/dropshipping/dashboard/dashboard-dropshipping.component.scss',
  'src/app/components/notificaciones/whatsapp-billing-meter/whatsapp-billing-meter.component.scss',
  'src/app/components/notificaciones/notificaciones.component.scss',
  'src/app/components/productos/crear-producto-lite/crear-producto-lite.component.scss',
  'src/app/components/rol/rol.component.scss',
  'src/app/components/picking-packing/packing-list/packing-list.component.scss',
  'src/app/components/picking-packing/picking-list/picking-list.component.scss',
  'src/app/components/dashboard/view/report-view.component.scss',
  'src/app/components/notificaciones/whatsapp-inbox/components/new-conversation-dialog/new-conversation-dialog.component.scss',
  'src/app/components/produccion/dashboard/tracking/proceso-tracking.component.scss',
  'src/app/components/formas-entrega/forma-entrega-create/forma-entrega-create.component.scss',
  'src/app/components/rol/roles/roles.component.scss',
  'src/app/components/dropshipping/proveedores/crear-proveedor/crear-proveedor.component.scss',
  'src/app/components/dropshipping/proveedores/lista-proveedores/lista-proveedores.component.scss',
  'src/app/components/notificaciones/meta-inbox/components/meta-contact-panel/meta-contact-panel.component.scss',
  'src/app/components/notificaciones/whatsapp-inbox/components/whatsapp-thread-list/whatsapp-thread-list.component.scss',
  'src/app/components/produccion/dashboard/cerrararticulo/cerrararticulo.component.scss',
  'src/app/components/formas-entrega/horario-entrega/listahorarios/listahorarios.component.scss',
  'src/app/components/notificaciones/inbox-core/chat-dueno/chat-dueno.component.scss',
  'src/app/components/notificaciones/meta-inbox/components/meta-inbox-shell/meta-inbox-shell.component.scss',
  'src/app/components/formas-entrega/horario-entrega/horario-entrega.component.scss',
  'src/app/components/productos/product-details/product-details.component.scss',
  'src/app/components/usuarios/usuarios.component.scss',
  'src/app/components/notificaciones/whatsapp-inbox/components/whatsapp-thread-detail/whatsapp-thread-detail.component.scss',
  'src/app/components/produccion/dashboard/cerrarproducto/cerrarproducto.component.scss',
  'src/app/components/formas-entrega/tipo-entrega/tipo-entrega.component.scss',
  'src/app/components/notificaciones/whatsapp-inbox/components/whatsapp-contact-panel/whatsapp-contact-panel.component.scss',
  'src/app/components/tiempos-entrega/create/tiempo-entrega/tiempo-entrega.component.scss',
  'src/app/components/usuarios/edit-profile/edit-profile.component.scss',
  'src/app/components/crm/components/lead-form-modal/lead-form-modal.component.scss',
  'src/app/components/usuarios/crear-usuarios/crear-usuarios.component.scss',
  'src/app/components/notificaciones/whatsapp-inbox/components/whatsapp-inbox-shell/whatsapp-inbox-shell.component.scss',
  'src/app/components/notificaciones/whatsapp-inbox/components/whatsapp-pedidos-list/whatsapp-pedidos-list.component.scss',
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
