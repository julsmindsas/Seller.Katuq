'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');

function pureModule(filename) {
  const context = { exports: {}, require(id) {
    if (id === './integrations.service') return { IntegrationCategory: {
      ECOMMERCE: 'ecommerce', PAYMENT: 'payment', LOGISTICS: 'logistics',
      MARKETING: 'marketing', CRM: 'crm', ACCOUNTING: 'accounting', OTHER: 'other',
    } };
    return pureModule(path.resolve(path.dirname(filename), id + '.ts'));
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}

function methods(file, names, globals = {}) {
  const filename = path.join(root, file);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(ts.isClassDeclaration);
  const selected = cls.members.filter(n => names.includes(n.name?.getText(source)));
  assert.equal(selected.length, names.length);
  const context = { exports: {}, ...globals };
  vm.runInNewContext(ts.transpileModule(`export class UnderTest { ${selected.map(n => n.getText(source)).join('\n')} }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports.UnderTest;
}

function fixture() {
  const { DIRECTORIO_INTEGRACIONES } = pureModule(path.join(root, 'src/app/components/integrations/integrations-directorio.ts'));
  const guidesFile = path.join(root, 'src/app/components/integrations/mcp-guides.ts');
  const guides = fs.existsSync(guidesFile) ? pureModule(guidesFile) : {};
  const Page = methods('src/app/components/integrations/integrations-list.component.ts', [
    'estadoTarjeta', 'conexionDe', 'tipoDe', 'textoEstado', 'textoBoton', 'esConectada',
    'entradasVisibles', 'normalizar', 'otrasConexiones', 'totalConectadas',
    'totalParaConectar', 'totalProximamente', 'abrirEntrada', 'alTeclado',
  ], { ...guides, McpGuideComponent: class {}, Event });
  const calls = [];
  const page = new Page();
  Object.assign(page, {
    directorio: DIRECTORIO_INTEGRACIONES, busquedaDir: '', soloMias: false,
    listaCargada: true, errorMessage: null, integrations: [],
    resumenWhatsapp: { activo: false, bot: null }, conexionesMeta: {}, idsDirectorio: new Set(),
    modal: { open: (...args) => { const ref = { componentInstance: {} }; calls.push(['modal', args, ref]); return ref; } },
    router: { navigateByUrl: () => calls.push(['navigate']) },
    configureIntegration: () => calls.push(['configure']), openIntegrationModal: () => calls.push(['edit']),
  });
  return { page, calls, entries: DIRECTORIO_INTEGRACIONES.flatMap(g => g.entradas) };
}

test('las guías se encuentran por nombre/MCP pero nunca aparecen en Mis conexiones ni alteran contadores', () => {
  const { page, entries } = fixture();
  const guides = entries.filter(e => e.estado === 'guia');
  assert.equal(guides.length, 3);
  const before = [page.totalConectadas, page.totalParaConectar, page.totalProximamente];
  const groups = page.directorio;
  page.directorio = groups.map(g => ({ ...g, entradas: g.entradas.filter(e => e.estado !== 'guia') }));
  assert.deepEqual([page.totalConectadas, page.totalParaConectar, page.totalProximamente], before);
  page.directorio = groups;
  for (const term of ['ChatGPT', 'Claude', 'Codex', 'MCP']) {
    page.busquedaDir = term;
    assert(page.directorio.flatMap(g => page.entradasVisibles(g)).some(e => e.estado === 'guia'));
  }
  page.busquedaDir = ''; page.soloMias = true;
  assert.equal(page.directorio.flatMap(g => page.entradasVisibles(g)).filter(e => e.estado === 'guia').length, 0);
});

test('cada guía abre su propio diálogo sin configurar, editar ni navegar, incluso si falló la carga de conexiones', () => {
  const { page, calls, entries } = fixture();
  const guides = entries.filter(e => e.estado === 'guia');
  assert.equal(guides.length, 3);
  page.listaCargada = false; page.errorMessage = 'Sin conexión';
  for (const e of guides) {
    assert.equal(page.textoEstado(e, page.estadoTarjeta(e)), 'Desde tu IA');
    assert.equal(page.textoBoton(e, page.estadoTarjeta(e)), 'Ver instructivo');
    page.abrirEntrada(e);
    assert.equal(calls.at(-1)[2].componentInstance.guide.id, e.guideId);
  }
  assert.deepEqual(calls.map(c => c[0]), ['modal', 'modal', 'modal']);
});

test('Próximamente no configura ni navega con clic o teclado, y TikTok Shop conserva su identidad', () => {
  const { page, calls, entries } = fixture();
  const upcoming = entries.filter(e => e.estado === 'pronto');
  for (const e of upcoming) {
    page.abrirEntrada(e);
    const target = {};
    page.alTeclado(e, { target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
  }
  assert.equal(calls.length, 0);
  assert(entries.some(e => e.id === 'tiktok_shop' && e.nombre === 'TikTok Shop'));
  const futureIds = new Set(['tiktok_messages', 'email_messages', 'cloud_calls']);
  assert.equal(entries.filter(e => futureIds.has(e.id) && e.estado === 'pronto').length, 3);
  const total = page.totalProximamente;
  page.directorio = page.directorio.map(g => ({ ...g, entradas: g.entradas.filter(e => !futureIds.has(e.id)) }));
  assert.equal(total - page.totalProximamente, 3);
});

test('copiar sólo envía la URL pública al portapapeles y evita envíos simultáneos', async () => {
  const values = [];
  let finish;
  const Dialog = methods('src/app/components/integrations/mcp-guide/mcp-guide.component.ts', ['copyAddress'], {
    navigator: { clipboard: { writeText: value => { values.push(value); return new Promise(resolve => { finish = resolve; }); } } },
  });
  const dialog = new Dialog();
  Object.assign(dialog, { serverUrl: 'https://api.katuq.com/mcp', cdr: { detectChanges() {} } });
  const pending = dialog.copyAddress();
  await dialog.copyAddress();
  assert.deepEqual(values, ['https://api.katuq.com/mcp']);
  finish(); await pending;
  assert.equal(dialog.copyMessage, 'Dirección copiada.');
  assert.equal(dialog.copying, false);
});

test('copia rechazada o no disponible mantiene la URL y anuncia alternativa manual', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw new Error('NotAllowed'); } }]) {
    const Dialog = methods('src/app/components/integrations/mcp-guide/mcp-guide.component.ts', ['copyAddress'], { navigator: { clipboard } });
    const dialog = new Dialog();
    let updates = 0;
    Object.assign(dialog, { serverUrl: 'https://api.katuq.com/mcp', cdr: { detectChanges() { updates++; } } });
    await dialog.copyAddress();
    assert.equal(dialog.serverUrl, 'https://api.katuq.com/mcp');
    assert.match(dialog.copyMessage, /selecciona.*c[oó]pia/i);
    assert.equal(dialog.copying, false);
    assert(updates > 0);
  }
});

test('cerrar la guía mientras se copia no intenta pintar una vista destruida', async () => {
  let finish;
  const Dialog = methods('src/app/components/integrations/mcp-guide/mcp-guide.component.ts', ['copyAddress', 'ngOnDestroy'], {
    navigator: { clipboard: { writeText: () => new Promise(resolve => { finish = resolve; }) } },
  });
  const dialog = new Dialog();
  let renders = 0;
  Object.assign(dialog, { serverUrl: 'https://api.katuq.com/mcp', cdr: { detectChanges() { renders++; } } });
  const pending = dialog.copyAddress();
  dialog.ngOnDestroy(); finish(); await pending;
  assert.equal(renders, 0);
});
