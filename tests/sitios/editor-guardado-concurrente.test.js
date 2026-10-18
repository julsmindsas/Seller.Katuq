'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Subject, of } = require('rxjs');

// Exercise the production methods without booting Angular or sending HTTP.
const filename = path.resolve(__dirname, '../../src/app/components/sitios/editor/sitio-editor.component.ts');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
const component = source.statements.find(node => ts.isClassDeclaration(node));
const methodNames = [
  'completar', 'firmaActual', 'fijarComoGuardado', 'recalcularSucio', 'guardar',
  'contenidoParaGuardar', 'aplicarLoGuardado', 'camposPerdidos', 'publicar', 'publicarAhora',
  // Lo llama guardar() desde los cambios de pauta.
  'errorPauta',
];
const methods = component.members.filter(node => methodNames.includes(node.name?.getText(source)));
assert.equal(methods.length, methodNames.length);
// Las constantes de nivel superior del archivo (CAMPOS_PAUTA, PALETAS…) también:
// los métodos las usan y sin ellas la prueba rompe por un ReferenceError ajeno.
const constantes = source.statements.filter(node => ts.isVariableStatement(node)).map(node => node.getText(source)).join('\n');
const compiled = ts.transpileModule(constantes + '\nexport class Editor { ' + methods.map(node => node.getText(source)).join('\n') + ' }', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
// `completar` usa ajustesDeEstiloCompletos (ticket 1227): se carga el módulo real.
function cargarTs(relativo, requerir) {
  const salida = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, relativo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const modulo = { exports: {} };
  vm.runInNewContext(salida, { exports: modulo.exports, module: modulo, require: requerir });
  return modulo.exports;
}
const contraste = cargarTs('../../src/app/components/sitios/contraste.ts', () => ({}));
const ajustesEstilo = cargarTs('../../src/app/components/sitio-render/ajustes-estilo.ts', (p) => (p.includes('contraste') ? contraste : {}));
const context = { exports: {}, ajustesDeEstiloCompletos: ajustesEstilo.ajustesDeEstiloCompletos };
vm.runInNewContext(compiled, context);

const clone = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const pending = [], requests = [], wireRequests = [], publications = [], notices = [];
  const editor = new context.exports.Editor();
  Object.assign(editor, {
    id: 'site-test', nombre: 'Tienda', slug: 'tienda', dominioPropio: '', slugValido: true,
    guardando: false, publicando: false, sucio: false, firmaGuardada: '',
    tokenMetaNuevo: '', secretoGa4Nuevo: '', quitarMeta: false, quitarGa4: false,
    tokenTiktokNuevo: '', quitarTiktok: false,
    // publicar() mira el checklist (getter en el componente): sin pendientes críticos.
    pendientesCriticos: [],
    sitio: { nombre: 'Tienda', slug: 'tienda', estado: 'borrador' },
    service: {
      guardar(body) {
        requests.push(body);
        wireRequests.push(clone(body));
        const response = new Subject();
        pending.push(response);
        return response;
      },
      publicar(id) { publications.push(id); return of({ success: true }); },
    },
    toastr: Object.fromEntries(['success', 'error', 'warning', 'info'].map(name => [name, message => notices.push([name, message])])),
    plan: { manejar: () => false },
    resolverProductosDePrevia() {},
  });
  editor.contenido = editor.completar({
    bloques: [{ id: 'hero-test', tipo: 'hero', datos: { titulo: 'Antes', ctaUrl: '' } }],
    analitica: { metaConversionsPuesto: false, ga4SecretoPuesto: false },
  });
  editor.fijarComoGuardado();
  return {
    editor, requests, publications, notices,
    respond(patch = {}) {
      const index = requests.length - 1;
      const request = clone(wireRequests[index]);
      const draft = request.contenido;
      delete draft.analitica.metaConversionsToken;
      delete draft.analitica.ga4ApiSecret;
      pending[index].next({ success: true, data: { nombre: request.nombre, slug: request.slug,
        dominioPropio: request.dominioPropio, draft, ...patch } });
      pending[index].complete();
    },
    fail(error) { pending[pending.length - 1].error(error); },
  };
}

test('normal save applies server sanitation and confirms the persisted draft', () => {
  const { editor, requests, respond, notices } = fixture();
  editor.contenido.bloques[0].datos.ctaUrl = 'www.invalid.example';
  editor.tokenMetaNuevo = 'test-meta-token';
  editor.secretoGa4Nuevo = 'test-ga4-secret';
  editor.recalcularSucio();
  editor.guardar();
  const draft = clone(requests[0].contenido);
  draft.bloques[0].datos.ctaUrl = '';
  delete draft.analitica.metaConversionsToken;
  delete draft.analitica.ga4ApiSecret;
  draft.analitica.metaConversionsPuesto = true;
  draft.analitica.ga4SecretoPuesto = true;
  respond({ nombre: 'Tienda normalizada', draft });
  assert.equal(editor.contenido.bloques[0].datos.ctaUrl, '');
  assert.equal(editor.nombre, 'Tienda normalizada');
  assert.equal(editor.tokenMetaNuevo, '');
  assert.equal(editor.secretoGa4Nuevo, '');
  assert.equal(editor.sucio, false);
  assert.equal(editor.guardando, false);
  assert(notices.some(([kind, message]) => kind === 'warning' && message.includes('no es una dirección válida')));
});

test('editing a block while saving preserves the newer draft and marks it unsaved', () => {
  const { editor, requests, respond } = fixture();
  editor.guardar();
  editor.contenido.bloques[0].datos.titulo = 'Después';
  editor.recalcularSucio();
  assert.equal(requests[0].contenido.bloques[0].datos.titulo, 'Antes', 'the request must be an independent snapshot');
  respond();
  assert.equal(editor.contenido.bloques[0].datos.titulo, 'Después');
  assert.equal(editor.sucio, true);
  assert.equal(editor.guardando, false);
  editor.contenido.bloques[0].datos.titulo = 'Antes';
  editor.recalcularSucio();
  assert.equal(editor.sucio, false, 'undo to the actually persisted draft must be clean');
});

test('editing metadata while saving does not overwrite it with the older response', () => {
  const { editor, respond } = fixture();
  editor.guardar();
  editor.nombre = 'Nombre posterior';
  editor.slug = 'slug-posterior';
  editor.dominioPropio = 'nuevo.example';
  editor.recalcularSucio();
  respond({ nombre: 'Tienda normalizada' });
  assert.equal(editor.nombre, 'Nombre posterior');
  assert.equal(editor.slug, 'slug-posterior');
  assert.equal(editor.dominioPropio, 'nuevo.example');
  assert.equal(editor.sitio.nombre, 'Tienda normalizada', 'site metadata acknowledges what the server persisted');
  assert.equal(editor.sucio, true);
});

test('publishing stops when the draft changes while its prerequisite save is pending', () => {
  const { editor, respond, publications, notices } = fixture();
  editor.publicar();
  editor.contenido.bloques[0].datos.titulo = 'Cambio durante publicar';
  editor.recalcularSucio();
  respond();
  assert.equal(editor.contenido.bloques[0].datos.titulo, 'Cambio durante publicar');
  assert.equal(editor.sucio, true);
  assert.deepEqual(publications, []);
  assert(notices.some(([kind, message]) => kind === 'warning' && /public/i.test(message)));
});

test('publishing without concurrent edits saves before publishing exactly once', () => {
  const { editor, respond, requests, publications } = fixture();
  editor.publicar();
  editor.publicar();
  assert.equal(requests.length, 1);
  assert.deepEqual(publications, []);
  respond();
  assert.deepEqual(publications, ['site-test']);
  assert.equal(editor.sitio.estado, 'publicado');
  assert.equal(editor.sucio, false);
});

test('credentials written while saving remain pending instead of being erased', () => {
  const { editor, respond, requests } = fixture();
  editor.tokenMetaNuevo = 'first-test-token';
  editor.guardar();
  assert.equal(requests[0].contenido.analitica.metaConversionsToken, 'first-test-token');
  editor.tokenMetaNuevo = 'second-test-token';
  editor.secretoGa4Nuevo = 'second-test-secret';
  editor.recalcularSucio();
  respond();
  assert.equal(editor.tokenMetaNuevo, 'second-test-token');
  assert.equal(editor.secretoGa4Nuevo, 'second-test-secret');
  assert.equal(editor.sucio, true);
});

test('a failed save leaves the draft and pending credentials available to retry', () => {
  const { editor, fail, publications } = fixture();
  editor.contenido.bloques[0].datos.titulo = 'Pendiente';
  editor.tokenMetaNuevo = 'retry-test-token';
  editor.recalcularSucio();
  editor.publicar();
  fail({ error: { message: 'No guardado' } });
  assert.equal(editor.guardando, false);
  assert.equal(editor.contenido.bloques[0].datos.titulo, 'Pendiente');
  assert.equal(editor.tokenMetaNuevo, 'retry-test-token');
  assert.equal(editor.sucio, true);
  assert.deepEqual(publications, []);
});

test('concurrent edits stay dirty against the sanitized server draft, without merging it', () => {
  const { editor, requests, respond, notices } = fixture();
  editor.contenido.bloques[0].datos.ctaUrl = 'www.invalid.example';
  editor.guardar();
  editor.contenido.bloques[0].datos.titulo = 'Título nuevo';
  const draft = clone(requests[0].contenido);
  draft.bloques[0].datos.ctaUrl = '';
  respond({ draft });
  assert.equal(editor.contenido.bloques[0].datos.titulo, 'Título nuevo');
  assert.equal(editor.contenido.bloques[0].datos.ctaUrl, 'www.invalid.example', 'keep the whole newer local draft');
  assert.equal(editor.sucio, true);
  editor.contenido.bloques[0].datos.titulo = 'Antes';
  editor.recalcularSucio();
  assert.equal(editor.sucio, true, 'the rejected URL is still an unsaved difference');
  editor.contenido.bloques[0].datos.ctaUrl = '';
  editor.recalcularSucio();
  assert.equal(editor.sucio, false);
  assert(notices.some(([kind, message]) => kind === 'warning' && message.includes('no es una dirección válida')));
});

test('new removal requests while saving remain pending and prevent publication', () => {
  const { editor, requests, respond, publications } = fixture();
  editor.tokenMetaNuevo = 'token-before-removal';
  editor.secretoGa4Nuevo = 'secret-before-removal';
  editor.publicar();
  editor.tokenMetaNuevo = '';
  editor.secretoGa4Nuevo = '';
  editor.quitarMeta = true;
  editor.quitarGa4 = true;
  editor.recalcularSucio();
  respond();
  assert.equal(editor.quitarMeta, true);
  assert.equal(editor.quitarGa4, true);
  assert.equal(editor.sucio, true);
  assert.deepEqual(publications, []);
  editor.guardar();
  assert.equal(requests[1].contenido.analitica.metaConversionsToken, '');
  assert.equal(requests[1].contenido.analitica.ga4ApiSecret, '');
  respond();
  assert.equal(editor.quitarMeta, false);
  assert.equal(editor.quitarGa4, false);
  assert.equal(editor.sucio, false);
});

test('credentials typed after a pending removal survive and are sent by the next save', () => {
  const { editor, requests, respond } = fixture();
  editor.quitarMeta = true;
  editor.quitarGa4 = true;
  editor.guardar();
  assert.equal(requests[0].contenido.analitica.metaConversionsToken, '');
  assert.equal(requests[0].contenido.analitica.ga4ApiSecret, '');
  editor.tokenMetaNuevo = 'replacement-test-token';
  editor.secretoGa4Nuevo = 'replacement-test-secret';
  respond();
  assert.equal(editor.tokenMetaNuevo, 'replacement-test-token');
  assert.equal(editor.secretoGa4Nuevo, 'replacement-test-secret');
  assert.equal(editor.sucio, true);
  editor.guardar();
  assert.equal(requests[1].contenido.analitica.metaConversionsToken, 'replacement-test-token');
  assert.equal(requests[1].contenido.analitica.ga4ApiSecret, 'replacement-test-secret');
  respond();
  assert.equal(editor.tokenMetaNuevo, '');
  assert.equal(editor.secretoGa4Nuevo, '');
  assert.equal(editor.quitarMeta, false);
  assert.equal(editor.quitarGa4, false);
  assert.equal(editor.sucio, false);
});

test('credential-only edits enable saving and confirmed secrets are not sent twice', () => {
  const { editor, requests, respond } = fixture();
  editor.tokenMetaNuevo = 'credential-only-test-token';
  editor.recalcularSucio();
  assert.equal(editor.sucio, true);
  editor.guardar();
  respond();
  assert.equal(editor.sucio, false);
  editor.guardar();
  assert.equal(Object.hasOwn(requests[1].contenido.analitica, 'metaConversionsToken'), false);
  assert.equal(Object.hasOwn(requests[1].contenido.analitica, 'ga4ApiSecret'), false);
});

test('a success envelope without the persisted draft cannot mark changes saved or publish', () => {
  const { editor, respond, publications, notices } = fixture();
  editor.contenido.bloques[0].datos.titulo = 'Sin confirmar';
  editor.tokenMetaNuevo = 'unconfirmed-test-token';
  editor.recalcularSucio();
  editor.publicar();
  respond({ draft: null });
  assert.equal(editor.contenido.bloques[0].datos.titulo, 'Sin confirmar');
  assert.equal(editor.tokenMetaNuevo, 'unconfirmed-test-token');
  assert.equal(editor.guardando, false);
  assert.equal(editor.sucio, true);
  assert.deepEqual(publications, []);
  assert(notices.some(([kind]) => kind === 'error'));
});

test('confirmed credential indicators update during a concurrent title edit without overwriting the title', () => {
  const { editor, requests, respond } = fixture();
  editor.tokenMetaNuevo = 'confirmed-test-token';
  editor.secretoGa4Nuevo = 'confirmed-test-secret';
  editor.guardar();
  editor.contenido.bloques[0].datos.titulo = 'Título que permanece';
  const draft = clone(requests[0].contenido);
  delete draft.analitica.metaConversionsToken;
  delete draft.analitica.ga4ApiSecret;
  draft.analitica.metaConversionsPuesto = true;
  draft.analitica.ga4SecretoPuesto = true;
  respond({ draft });
  assert.equal(editor.contenido.bloques[0].datos.titulo, 'Título que permanece');
  assert.equal(editor.contenido.analitica.metaConversionsPuesto, true);
  assert.equal(editor.contenido.analitica.ga4SecretoPuesto, true);
  assert.equal(editor.tokenMetaNuevo, '');
  assert.equal(editor.secretoGa4Nuevo, '');
  assert.equal(editor.sucio, true);
  editor.contenido.bloques[0].datos.titulo = 'Antes';
  editor.recalcularSucio();
  assert.equal(editor.sucio, false, 'only the title remained pending, not stale credential indicators');
});

test('server credential indicators cannot overwrite newer removal or replacement intentions', () => {
  const { editor, requests, respond } = fixture();
  editor.tokenMetaNuevo = 'meta-sent-before-removal';
  editor.quitarGa4 = true;
  editor.contenido.analitica.ga4SecretoPuesto = true;
  editor.guardar();
  editor.tokenMetaNuevo = '';
  editor.quitarMeta = true;
  editor.contenido.analitica.metaConversionsPuesto = false;
  editor.secretoGa4Nuevo = 'ga4-replacement-after-removal';
  const draft = clone(requests[0].contenido);
  delete draft.analitica.metaConversionsToken;
  delete draft.analitica.ga4ApiSecret;
  draft.analitica.metaConversionsPuesto = true;
  draft.analitica.ga4SecretoPuesto = false;
  respond({ draft });
  assert.equal(editor.quitarMeta, true);
  assert.equal(editor.contenido.analitica.metaConversionsPuesto, false);
  assert.equal(editor.secretoGa4Nuevo, 'ga4-replacement-after-removal');
  assert.equal(editor.quitarGa4, true);
  assert.equal(editor.contenido.analitica.ga4SecretoPuesto, true);
  assert.equal(editor.sucio, true);
});

// ── Revisión 2026-10-18: propuesta de KAI, «Volver al de antes» del Tema y productos de la previa ──
const metodosIA = [
  'disenarConIA', 'aplicarPropuestaIA', 'volverAntesDeIA', 'nadaTocadoPorIA', 'cerrarPropuestaIA',
  'conAntesDeIA', 'alternarAntesIA', 'aceptarPropuestaIA', 'hayPropuestaIA', 'marcarSucio',
  'probarVestido', 'descartarVestido', 'fotosDeVitrina', 'preciosDeVitrina', 'esNuevo',
];
const miembrosIA = component.members.filter(node => metodosIA.includes(node.name?.getText(source)));
assert.equal(miembrosIA.length, metodosIA.length);
const precioTipo = cargarTs('../../src/app/shared/utils/precio-por-tipo-cliente.ts', () => ({}));
const contextoIA = { exports: {}, descuentoVigente: precioTipo.descuentoVigente };
vm.runInNewContext(ts.transpileModule('export class EditorIA { ' + miembrosIA.map(node => node.getText(source)).join('\n') + ' }', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, contextoIA);

function fixtureIA() {
  const peticiones = [], autoguardados = [], avisos = [];
  const editor = new contextoIA.exports.EditorIA();
  Object.assign(editor, {
    id: 'site-test', indicacionesIA: '', disenandoIA: false, razonesIA: [], seleccionado: -1,
    viendoAntesIA: false, fotoAntesDeIA: '', fotoPropuestaIA: '', temaAnterior: null,
    conservarMisColores: false, coloresMarca: null, clavesDelVestido: new Set(),
    service: { disenarConIA() { const r = new Subject(); peticiones.push(r); return r; } },
    toastr: Object.fromEntries(['success', 'error', 'warning', 'info'].map(name => [name, m => avisos.push([name, m])])),
    recalcularSucio() {}, recalcularPrevia() {}, guardarEnHistorial() {},
    programarAutoguardado() { autoguardados.push(true); },
  });
  editor.tocadoPorIA = editor.nadaTocadoPorIA();
  editor.contenido = {
    tema: { estilo: 'clasico', colorPrimario: '#111111', colorSecundario: '#ffffff', colorTexto: '#000000' },
    bloques: [
      { id: 'h', tipo: 'hero', visible: true, datos: { titulo: 'Hola', subtitulo: 'Sub', ctaTexto: 'Ver' } },
      { id: 'p', tipo: 'productos', visible: true, datos: { titulo: 'Productos' } },
      { id: 'f', tipo: 'faq', visible: true, datos: { titulo: 'Preguntas' } },
    ],
    tienda: { cupones: [] },
  };
  const propuesta = {
    tema: { estilo: 'moderno', colorPrimario: '#5F3FE0' }, orden: ['f', 'h', 'p'], ocultar: ['p'],
    portada: { titulo: 'Nuevo titular', subtitulo: '', cta: 'Comprar' }, anuncio: '', razones: ['Más contraste'],
  };
  return {
    editor, autoguardados, avisos, propuesta,
    responder(res) { const r = peticiones[peticiones.length - 1]; r.next(res); r.complete(); },
    fallar(e) { peticiones[peticiones.length - 1].error(e); },
  };
}

test('a failed first KAI request leaves no phantom proposal and resumes autosave', () => {
  const a = fixtureIA();
  a.editor.disenarConIA();
  a.fallar({ status: 403, error: { message: 'Límite del plan' } });
  assert.equal(a.editor.hayPropuestaIA, false);
  assert.equal(a.autoguardados.length, 1);
  const b = fixtureIA();
  b.editor.disenarConIA();
  b.responder({ success: false, message: 'Sin propuesta' });
  assert.equal(b.editor.hayPropuestaIA, false);
  assert.equal(b.autoguardados.length, 1);
});

test('a failed «Proponer otro» keeps the pending proposal and its original before', () => {
  const { editor, responder, fallar, propuesta } = fixtureIA();
  editor.disenarConIA();
  responder({ success: true, data: propuesta });
  editor.disenarConIA();
  fallar({ error: { message: 'Timeout' } });
  assert.equal(editor.hayPropuestaIA, true);
  editor.volverAntesDeIA();
  assert.equal(editor.contenido.tema.estilo, 'clasico');
});

test('discarding reverts only what KAI changed and keeps later store and block edits', () => {
  const { editor, responder, propuesta } = fixtureIA();
  editor.disenarConIA();
  responder({ success: true, data: propuesta });
  assert.deepEqual(clone(editor.contenido.bloques.map(b => b.id)), ['f', 'h', 'p']);
  editor.contenido.tienda.cupones.push({ codigo: 'BIENVENIDA' });
  editor.contenido.bloques[0].datos.titulo = 'FAQ editado';
  editor.contenido.tema.botonForma = 'pastilla';
  editor.volverAntesDeIA();
  const c = editor.contenido;
  assert.equal(editor.hayPropuestaIA, false);
  assert.equal(c.tema.estilo, 'clasico');
  assert.equal(c.tema.colorPrimario, '#111111');
  assert.equal(c.tema.botonForma, 'pastilla');
  assert.deepEqual(clone(c.bloques.map(b => b.id)), ['h', 'p', 'f']);
  assert.equal(c.bloques[1].visible, true);
  assert.deepEqual(clone(c.bloques[0].datos), { titulo: 'Hola', subtitulo: 'Sub', ctaTexto: 'Ver' });
  assert.equal(c.bloques[2].datos.titulo, 'FAQ editado');
  assert.deepEqual(clone(c.tienda.cupones), [{ codigo: 'BIENVENIDA' }]);
});

test('the before view keeps later store edits; its main button keeps what is seen', () => {
  const { editor, responder, propuesta } = fixtureIA();
  editor.disenarConIA();
  responder({ success: true, data: propuesta });
  editor.contenido.tienda.cupones.push({ codigo: 'X' });
  editor.alternarAntesIA();
  assert.equal(editor.viendoAntesIA, true);
  assert.equal(editor.contenido.tema.estilo, 'clasico');
  assert.deepEqual(clone(editor.contenido.tienda.cupones), [{ codigo: 'X' }]);
  // «Quedarme con como estaba» (volverAntesDeIA mirando el antes) deja el antes, no la propuesta.
  editor.volverAntesDeIA();
  assert.equal(editor.hayPropuestaIA, false);
  assert.equal(editor.viendoAntesIA, false);
  assert.equal(editor.contenido.tema.estilo, 'clasico');
  assert.deepEqual(clone(editor.contenido.tienda.cupones), [{ codigo: 'X' }]);
});

test('accepting from the proposal view keeps KAI design; editing on the before view keeps the before', () => {
  const a = fixtureIA();
  a.editor.disenarConIA();
  a.responder({ success: true, data: a.propuesta });
  a.editor.aceptarPropuestaIA();
  assert.equal(a.editor.hayPropuestaIA, false);
  assert.equal(a.editor.contenido.tema.estilo, 'moderno');
  const b = fixtureIA();
  b.editor.disenarConIA();
  b.responder({ success: true, data: b.propuesta });
  b.editor.alternarAntesIA();
  b.editor.contenido.tema.colorTexto = '#222222';
  b.editor.marcarSucio();
  assert.equal(b.editor.hayPropuestaIA, false);
  assert.equal(b.editor.contenido.tema.estilo, 'clasico');
  assert.equal(b.editor.contenido.tema.colorTexto, '#222222');
});

test('«Volver al de antes» of Tema restores only what the theme changed', () => {
  const { editor } = fixtureIA();
  editor.contenido.tema.fuenteTitulo = 'serif';
  editor.probarVestido({ id: 'v', nombre: 'V', tema: { estilo: 'moderno', fuenteTitulo: 'sans', fuenteCuerpo: 'sans', colorPrimario: '#5F3FE0', colorSecundario: '#f4f2fb', colorTexto: '#211F3A' } });
  editor.contenido.tema.botonForma = 'pastilla';
  editor.contenido.tema.logoPosicion = 'centro';
  editor.descartarVestido();
  const t = editor.contenido.tema;
  assert.equal(t.estilo, 'clasico');
  assert.equal(t.fuenteTitulo, 'serif');
  assert.equal(Object.hasOwn(t, 'fuenteCuerpo'), false);
  assert.equal(t.colorPrimario, '#111111');
  assert.equal(t.botonForma, 'pastilla');
  assert.equal(t.logoPosicion, 'centro');
  assert.equal(editor.temaAnterior, null);
});

test('preview products carry the storefront offer, second photo and new flag', () => {
  const { editor } = fixtureIA();
  const hoy = new Date().toISOString();
  const producto = {
    precio: { precioUnitarioConIva: 120000 },
    preciosPorTipoCliente: [{ tipoClienteNombre: 'Público en general', activo: true, precioConIva: 100000, precioDescuentoConIva: 80000, descuentoHasta: '2999-12-31' }],
    createdAt: hoy,
  };
  assert.deepEqual(clone(editor.preciosDeVitrina(producto)), { precioConIva: 80000, precioAntes: 100000, descuentoPorcentaje: 20 });
  const vencida = { ...producto, preciosPorTipoCliente: [{ ...producto.preciosPorTipoCliente[0], descuentoHasta: '2000-01-01' }] };
  assert.deepEqual(clone(editor.preciosDeVitrina(vencida)), { precioConIva: 100000, precioAntes: null, descuentoPorcentaje: null });
  assert.equal(editor.preciosDeVitrina({ precio: { precioUnitarioConIva: 5000 } }).precioConIva, 5000);
  assert.equal(editor.esNuevo(producto), true);
  assert.equal(editor.esNuevo({ createdAt: '2001-01-01T00:00:00Z' }), false);
  assert.equal(editor.esNuevo({}), false);
  assert.deepEqual(clone(editor.fotosDeVitrina({ imagenesPrincipales: ['/a.jpg', { urls: '/a.jpg' }], imagenesSecundarias: [{ urls: 'https://x.test/b.jpg' }] })),
    ['https://images2.guiacereza.com/a.jpg', 'https://x.test/b.jpg']);
});
