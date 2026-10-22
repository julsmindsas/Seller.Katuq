'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {of, firstValueFrom} = require('rxjs');
const directory = path.resolve(__dirname, '../../src/app/components/kuvo');
function compile(file, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(directory, file), 'utf8');
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true}}).outputText;
  const context = {...globals, exports: {}, require: name => imports[name] || require(name)};
  vm.runInNewContext(code, context); return context.exports;
}
const models = compile('kuvo.models.ts');
const navigation = compile('../../shared/services/nav.service.ts', {
  '@angular/core': {Injectable: () => target => target},
  './dropshipping-settings.service': {},
});
const guardImports = {'@angular/core': {Injectable: () => target => target}, '@angular/router': {},
  '../../shared/services/nav.service': navigation};
const guard = compile('kuvo.guard.ts', guardImports);
function component(service) {
  const {KuvoComponent} = compile('kuvo.component.ts', {'@angular/core': {Component: () => target => target, ChangeDetectionStrategy: {OnPush: 1}}, '@angular/common': {}, '@angular/forms': {}, '@angular/router': {},
    '../../shared/services/bodegas/bodega.service': {}, './kuvo.guard': guard, './kuvo.service': {}, './kuvo.models': models,
    '@ngx-translate/core': {TranslateModule: {}, TranslateService: class {}}});
  const instance = new KuvoComponent(service, {}, {markForCheck() {}}, {instant: key => key}); instance.authorized = true; return instance;
}
test('Panel Kuvo: payload parcial conserva cupones/saldos privados y slug bloqueado nunca se reenvía', () => {
  const saved = {slug: 'almara', slugLocked: true, nombrePublico: 'Almara', checkoutEnabled: false, activo: true,
    tienda: {habilitada: false, bodegaId: 'BOD-001', pagoEnLinea: false, contraEntrega: true, envio: {modo: 'zonas', costo: 5000, gratisDesde: 0, texto: ''}, cupones: [{codigo: 'QA', usos: 5}]} };
  const draft = models.publicationDraft(saved), patch = JSON.parse(JSON.stringify(models.publicationPatch({...draft, slug: 'otro', account: {balanceCents: 1}})));
  assert.equal(patch.slug, undefined); assert.equal(patch.tienda.bodegaId, 'BOD-001'); assert.equal(patch.tienda.cupones, undefined);
  assert.equal(patch.account, undefined); assert.equal(patch.activo, undefined); assert.equal(saved.tienda.cupones[0].usos, 5);
});
test('Panel Kuvo: banco nunca solicita status verificado y sólo envía campos del contrato', () => {
  const patch = JSON.parse(JSON.stringify(models.bankPatch({legalIdType: 'NIT', legalId: ' 900000000 ', bankId: 'qa-bank', accountType: 'AHORROS', accountNumber: '0000000000', name: ' Comercio QA ', email: ' qa@example.invalid ', status: 'verified', version: 'invalid'})));
  assert.deepEqual(Object.keys(patch).sort(), ['accountNumber', 'accountType', 'bankId', 'email', 'legalId', 'legalIdType', 'name'].sort());
  assert.equal(patch.name, 'Comercio QA'); assert.equal(patch.accountNumber, '0000000000');
});
test('Panel Kuvo: HTTP usa BaseService central, endpoints actuales y saldo productivo sin escoger tenant', async () => {
  const calls = [];
  class Base { get(url) {calls.push({method: 'GET', url}); return of({success: true, data: {server: true}});} put(url, body) {calls.push({method: 'PUT', url, body}); return of({success: true, data: {server: true}});} }
  const {KuvoService} = compile('kuvo.service.ts', {'@angular/core': {Injectable: () => target => target}, '@angular/common/http': {}, '../../shared/services/base.service': {BaseService: Base}});
  const service = new KuvoService({});
  await firstValueFrom(service.publication()); await firstValueFrom(service.statement()); await firstValueFrom(service.bankConfiguration());
  await firstValueFrom(service.updatePublication({activo: false})); await firstValueFrom(service.requestBank({bankId: 'qa'}));
  assert.deepEqual(calls.map(call => call.url), ['/v1/sites/kuvo/comercio', '/v1/sites/kuvo/saldo?environment=production', '/v1/sites/kuvo/cuenta-liquidacion', '/v1/sites/kuvo/comercio', '/v1/sites/kuvo/cuenta-liquidacion']);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[3].body)), {activo: false}); assert.ok(calls.every(call => !call.body?.company));
});
test('Panel Kuvo: retirar funciona con borrador inválido y la disponibilidad viene del GET servidor', () => {
  const calls = [], saved = {slug: 'qa', slugLocked: false, nombrePublico: 'QA', activo: false, checkoutEnabled: true,
    tienda: {habilitada: true, bodegaId: 'BOD-001', pagoEnLinea: true, contraEntrega: false, envio: {modo: 'fijo', costo: 0, gratisDesde: 0, texto: ''}}};
  const instance = component({updatePublication: body => {calls.push(body); return of(saved);}, publication: () => of({...saved, checkoutAvailable: false})});
  instance.draft = {nombrePublico: '', bodegaId: '', envioCosto: -1}; instance.withdraw();
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {activo: false}); assert.equal(instance.publication.checkoutAvailable, false);
  assert.equal(instance.savingPublication, false); assert.ok(instance.publicationNotice.includes('retiró'));
});
test('Panel Kuvo: rechazar pago online conserva estado publicado del servidor y muestra motivo de configuración', () => {
  const {throwError} = require('rxjs');
  const instance = component({updatePublication: () => throwError(() => ({error: {code: 'ONLINE_PAYMENT_UNAVAILABLE'}}))});
  instance.publication = {activo: true, checkoutEnabled: false};
  instance.withdraw();
  assert.equal(instance.publication.checkoutEnabled, false); assert.equal(instance.publicationNotice, '');
  assert.ok(instance.publicationError.includes('aún no está listo')); assert.equal(instance.savingPublication, false);
});
test('Panel Kuvo: guard reconoce la familia administrador vigente y bloquea roles operativos o sesión dañada', () => {
  for (const role of ['Administrador', 'Administrador LT', 'ADMINISTRADOR', 'Super Administrador']) assert.equal(guard.canManageKuvo(role), true);
  for (const role of ['Vendedor', 'Operador', 'Contador', '', null]) assert.equal(guard.canManageKuvo(role), false);
  for (const saved of [JSON.stringify({rol: 'Vendedor', menus: ['*']}), '{sesión inválida']) {
    const {KuvoGuard} = compile('kuvo.guard.ts', guardImports, {localStorage: {getItem: () => saved}});
    assert.equal(new KuvoGuard({parseUrl: value => value}).canActivate(), '/welcome');
  }
});
test('Panel Kuvo: solicitar cuenta conserva máscara y estado servidor, limpia datos privados y no calcula saldo', () => {
  const destination = {status: 'pending_verification', version: 'qa-version', bankName: '', lastFour: '0000', accountType: 'AHORROS'};
  let requested;
  const instance = component({requestBank: body => {requested = body; return of(destination);}});
  instance.statement = {balanceDisplay: 'Importe desde servidor', availableDisplay: 'Saldo desde servidor'};
  instance.bank = {banks: [{id: 'qa-bank', name: 'Banco QA'}], commissionPercent: 0, frequency: 'weekly', destination: null};
  instance.bankDraft = {legalIdType: 'NIT', legalId: '900000000', bankId: 'qa-bank', accountType: 'AHORROS', accountNumber: '0000000000', name: 'Comercio QA', email: 'qa@example.invalid'};
  instance.saveBank();
  assert.equal(requested.status, undefined); assert.equal(instance.bank.destination.status, 'pending_verification');
  assert.equal(instance.bank.destination.accountNumber, undefined); assert.equal(instance.bankDraft.accountNumber, '');
  assert.equal(instance.statement.balanceDisplay, 'Importe desde servidor'); assert.equal(instance.statement.availableDisplay, 'Saldo desde servidor');
});
