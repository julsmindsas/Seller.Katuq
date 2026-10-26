'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rxjs = require('rxjs');
const operators = require('rxjs/operators');
const root = path.resolve(__dirname, '../..');

function pureModule(file) {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}

/**
 * Ejecuta NavService real; simula transporte/almacenamiento, no las reglas de rol.
 * Opciones: `user`, `paths` (rutas autorizadas), `flags` (banderas de la empresa encendidas, por nombre),
 * `dropshipping` (el módulo habilitado en la sesión) y `nps` (el NPS lo prende la bandera `npsModulo`).
 */
function fixture(width, options = {}) {
  const filename = path.join(root, 'src/app/shared/services/nav.service.ts');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const service = source.statements.find(ts.isClassDeclaration);
  const viewport = new EventTarget();
  viewport.innerWidth = width;
  const storage = new Map(Object.entries({
    user: JSON.stringify(options.user || { rol: 'Vendedor', company: 'QA' }),
    authorizedMenuItems: JSON.stringify(options.paths || []),
  }));
  const futureFile = 'src/app/shared/data/future-message-channels.ts';
  const context = {
    exports: {}, ...rxjs, ...operators,
    ...pureModule('src/app/shared/utils/roles.ts'),
    ...(fs.existsSync(path.join(root, futureFile)) ? pureModule(futureFile) : {}),
    Injectable: () => target => target,
    window: viewport,
    dropshippingHabilitadoEnLaSesion: () => !!options.dropshipping,
    npsDisponible: (company, banderaPrendida) => String(company || '').trim().toLowerCase() === 'julsmind' || !!banderaPrendida,
    localStorage: { getItem: key => storage.get(key) ?? null },
  };
  vm.runInNewContext(ts.transpileModule(service.getText(source), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true },
  }).outputText, context);
  const events = new rxjs.Subject();
  const nav = new context.exports.NavService(
    { events }, { refreshCart: () => rxjs.of([]) },
    { deepClone: value => JSON.parse(JSON.stringify(value)) },
    { isEnabled: key => !!options.flags?.[key], isEnabled$: key => rxjs.of(!!options.flags?.[key]) },
    { companyInformation$: rxjs.of(null) },
  );
  return { nav, events, viewport, storage };
}

module.exports = { fixture };
