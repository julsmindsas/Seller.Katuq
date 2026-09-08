'use strict';

const assert = require('node:assert/strict');
const { test, before } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { of, defer, Subject, throwError } = require('rxjs');
const { map, switchMap, takeUntil, tap, catchError, finalize, timeout } = require('rxjs/operators');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });
const feedback = require('../../src/app/components/integrations/dian-config-feedback.ts');
const { splitDianDocumentList } = require('../../src/app/components/facturacion-electronica/dian-document-list.ts');
let FormBuilder, Validators;
before(async () => {
  await import('@angular/compiler');
  ({ FormBuilder, Validators } = await import('@angular/forms'));
});

function methodsFrom(file, names, globals) {
  const filename = path.resolve(__dirname, '../../src/app/components/integrations', file);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(node => ts.isClassDeclaration(node));
  const methods = cls.members.filter(node => names.includes(node.name?.getText(source)));
  assert.equal(methods.length, names.length);
  const compiled = ts.transpileModule('export class SubjectUnderTest { ' + methods.map(n => n.getText(source)).join('\n') + ' }',
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, ...globals };
  vm.runInNewContext(compiled, context);
  return context.exports.SubjectUnderTest;
}

test('Nueva factura renders before scrolling and focuses the form, even when already selected', () => {
  const Page = methodsFrom('../facturacion-electronica/facturacion-electronica.component.ts', ['selectTab'], {});
  const page = new Page();
  const calls = [];
  page.activeTab = 'documents';
  page.composerOpened = false;
  page.changeDetector = { detectChanges() {
    assert.equal(page.activeTab, 'compose');
    assert.equal(page.composerOpened, true);
    calls.push('render');
    page.composer = { requestNewInvoice() { calls.push('new'); } };
  } };
  page.composerPanel = { nativeElement: {
    focus(options) { assert.equal(options.preventScroll, true); calls.push('focus'); },
    scrollIntoView(options) { assert.equal(options.block, 'start'); calls.push('scroll'); },
  } };
  page.selectTab('compose');
  page.selectTab('compose');
  assert.deepEqual(calls, ['render', 'new', 'focus', 'scroll', 'render', 'new', 'focus', 'scroll']);
  calls.length = 0;
  page.selectTab('documents');
  assert.equal(page.activeTab, 'documents');
  assert.equal(page.composerOpened, true, 'switching tabs must preserve the existing draft');
  assert.deepEqual(calls, []);
  const html = fs.readFileSync(path.resolve(__dirname, '../../src/app/components/facturacion-electronica/facturacion-electronica.component.html'), 'utf8');
  assert.match(html, /#composerPanel[^>]*tabindex="-1"/);
});

const numbering = { resolutionNumber: 'UNIT-RESOLUTION', prefix: 'UNIT', from: 1, to: 100, current: 8, validFrom: '2026-01-01', validTo: '2028-01-01' };
function fixture(options = {}) {
  const Handler = methodsFrom('integrations.component.ts', [
    'onSubmit', 'createDianForm', 'updateDianSecretValidators', 'validateDianStep',
    'goToDianStep', 'nextDianStep', 'openDianFromDirectRoute', 'selectDianEnvironment',
    'syncDianCurrentFromRange',
  ], {
    ...feedback, of, defer, switchMap, takeUntil, Validators,
    DIAN_HABILITATION_NUMBERING: { ...numbering, resolutionNumber: '18760000001', prefix: 'SETP', from: 990000000, to: 995000000, current: 990000000 },
    setTimeout: fn => fn(), document: { querySelector: () => null },
  });
  const calls = [], notices = [];
  let activeCompany = 'ShopA';
  const instance = new Handler();
  Object.assign(instance, {
    fb: new FormBuilder(), selectedIntegrationType: 'dian', editingIntegrationId: 'ShopA_dian',
    dianConfigCompanyId: 'ShopA', dianStoredSecrets: Object.fromEntries(feedback.DIAN_SECRET_FIELDS.map(k => [k, true])),
    dianStep: 4, dianStepError: '', dianLoadError: '', isLoadingEdit: false, isSaving: false,
    destroy$: new Subject(), dianCertificateFileName: '', isModalMode: false,
    integrationsService: {
      getActiveCompanyId: () => activeCompany,
      validateConfig: (_p, body) => { calls.push(['validate', body]); return options.validation$ || of({ success: true }); },
      updateIntegration: (_p, body) => { calls.push(['update', body]); return options.save$ || of(null); },
      createIntegration: (_p, body) => { calls.push(['create', body]); return options.save$ || of(null); },
      getIntegration: (_p, fresh) => {
        calls.push(['read', fresh]);
        return options.read$ || of({ id: 'ShopA_dian', companyId: 'ShopA',
          storedSecrets: Object.fromEntries(feedback.DIAN_SECRET_FIELDS.map(k => [k, true])),
          config: { ...instance.integrationForm.value } });
      },
    },
    uiHelper: Object.fromEntries(['showError', 'showSuccess'].map(k => [k, text => notices.push([k, text])])),
    loadDianTestOrders: () => calls.push(['loadTestOrders']),
    buildCredentials: value => value,
    clearDianBatchResult() {},
    setupRealTimeValidation() {}, updateTemplateProperties() {},
    resetForm() { this.integrationForm = this.createDianForm(); },
    editIntegration() { calls.push(['edit']); },
  });
  instance.integrationForm = instance.createDianForm();
  instance.integrationForm.patchValue({
    environment: 'produccion', numbering,
    issuer: { businessName: 'Tienda prueba', nit: '900000001', dv: '1', address: 'Dirección',
      municipalityCode: '05001', cityName: 'Medellín', department: 'Antioquia', email: 'test@example.invalid' },
  });
  instance.updateDianSecretValidators();
  return { instance, calls, notices, setCompany: value => activeCompany = value };
}

test('successful production save rereads persisted data, keeps edit mode and never loads test orders', () => {
  const { instance, calls, notices } = fixture();
  instance.onSubmit();
  assert.deepEqual(calls.map(c => c[0]), ['validate', 'update', 'read']);
  assert.equal(calls[0][1].certificateP12Base64, undefined);
  assert.equal(calls[2][1], true);
  assert.equal(instance.editingIntegrationId, 'ShopA_dian');
  assert.equal(instance.dianStep, 5);
  assert.equal(instance.isSaving, false);
  assert.equal(instance.integrationForm.pristine, true);
  assert.match(notices[0][1], /producción guardada/);
  assert.equal(instance.integrationForm.get('certificatePassword').value, '');
});

test('new commerce gets persisted ID after create and subsequent saves use update', () => {
  const { instance, calls } = fixture();
  instance.editingIntegrationId = null;
  instance.dianStoredSecrets = {};
  for (const field of feedback.DIAN_SECRET_FIELDS) instance.integrationForm.get(field).setValue('unit-placeholder');
  instance.onSubmit();
  assert.equal(calls[1][0], 'create');
  assert.equal(instance.editingIntegrationId, 'ShopA_dian');
  calls.length = 0;
  instance.onSubmit();
  assert.equal(calls[1][0], 'update');
});

test('validation failure is visible and cannot call save', () => {
  const { instance, calls, notices } = fixture({ validation$: of({ success: false, errors: ['Falta certificatePassword'] }) });
  instance.onSubmit();
  assert.deepEqual(calls.map(c => c[0]), ['validate']);
  assert.match(instance.dianStepError, /contraseña del certificado/);
  assert.equal(instance.dianStep, 4);
  assert.equal(instance.isSaving, false);
  assert.equal(notices[0][0], 'showError');
});

test('network failure does not pretend validation passed or clear form data', () => {
  const { instance, calls } = fixture({ validation$: throwError(() => ({ status: 0 })) });
  instance.onSubmit();
  assert.equal(calls.length, 1);
  assert.match(instance.dianStepError, /No se ha confirmado el guardado/);
  assert.equal(instance.integrationForm.get('numbering.current').value, 8);
});

test('failed save remains reviewable, without success or step 5', () => {
  const { instance, notices } = fixture({ save$: throwError(() => ({ error: { message: 'Error guardando' } })) });
  instance.onSubmit();
  assert.equal(instance.dianStep, 4);
  assert.equal(instance.isSaving, false);
  assert(notices.every(n => n[0] !== 'showSuccess'));
});

test('confirmed save with failed readback is reported accurately and blocks another blind save', () => {
  const { instance, calls } = fixture({ read$: throwError(() => ({ status: 503 })) });
  instance.onSubmit();
  assert.match(instance.dianLoadError, /confirmó el guardado/);
  const count = calls.length;
  instance.onSubmit();
  assert.equal(calls.length, count);
});

test('double click sends only one save while waiting', () => {
  const pending = new Subject();
  const { instance, calls } = fixture({ save$: pending });
  instance.onSubmit(); instance.onSubmit();
  assert.equal(calls.filter(c => c[0] === 'update').length, 1);
  pending.next(null); pending.complete();
  assert.equal(instance.isSaving, false);
});

test('only 404 opens new configuration; service outage blocks edits', () => {
  for (const status of [404, 500, 0]) {
    const { instance } = fixture({ read$: throwError(() => ({ status })) });
    instance.openDianFromDirectRoute();
    assert.equal(!!instance.dianLoadError, status !== 404);
    assert.equal(instance.isLoadingEdit, false);
  }
});

test('cannot skip review into activation without a saved clean draft', () => {
  const { instance } = fixture();
  instance.integrationForm.markAsDirty();
  instance.goToDianStep(5);
  assert.equal(instance.dianStep, 4);
  assert.match(instance.dianStepError, /Guardar y continuar/);
});

test('changed commerce aborts before validation or save', () => {
  const { instance, setCompany, calls } = fixture();
  setCompany('ShopB');
  instance.onSubmit();
  assert.match(instance.dianLoadError, /Cambió el comercio/);
  assert.equal(calls.length, 0);
});

test('tenant switch during validation cannot save the old draft into the new commerce', () => {
  const pending = new Subject();
  const { instance, calls, setCompany } = fixture({ validation$: pending });
  instance.onSubmit(); setCompany('ShopB'); pending.next({ success: true }); pending.complete();
  assert.deepEqual(calls.map(c => c[0]), ['validate']);
  assert.match(instance.dianStepError, /Cambió el comercio/);
});

test('switching to production clears test range/key, keeps automatic invoicing off', () => {
  const { instance } = fixture();
  instance.integrationForm.get('environment').setValue('habilitacion');
  instance.selectDianEnvironment('produccion');
  assert.equal(instance.integrationForm.get('numbering.prefix').value, '');
  assert.equal(instance.integrationForm.get('technicalKey').invalid, true);
  assert.equal(instance.integrationForm.get('enableAutoInvoicing').value, false);
});

test('production range rejects test numbering, invalid counters and dates', () => {
  assert.equal(feedback.dianNumberingError(numbering, true), '');
  for (const patch of [{ prefix: 'SETP' }, { current: 0 }, { current: 101 }, { current: 2.5 }, { validTo: 'bad' }]) {
    assert(feedback.dianNumberingError({ ...numbering, ...patch }, true));
  }
});

test('editing the lower range bound does not reset an existing next invoice', () => {
  const { instance } = fixture();
  instance.syncDianCurrentFromRange();
  assert.equal(instance.integrationForm.get('numbering.current').value, 8);
});

test('timeout is actionable and never claims the configuration was saved', () => {
  const message = feedback.dianConfigError({ name: 'TimeoutError' });
  assert.match(message, /No se ha confirmado el guardado/);
});

test('validation service interprets the backend validation envelope', async () => {
  const Service = methodsFrom('integrations.service.ts', ['validateConfig'], { map, timeout });
  const service = new Service();
  service.getApiHeaders = () => ({ company: 'ShopA' });
  service.http = { post: () => of({ success: true, validation: { isValid: false, errors: ['missing field'] } }) };
  const response = await service.validateConfig('dian', {}).toPromise();
  assert.equal(response.success, false);
  assert.deepEqual(response.errors, ['missing field']);
});

test('technical batch logs do not count as notes, invoices or rejected fiscal documents', () => {
  const result = splitDianDocumentList([
    { type: 'invoice', status: 'accepted' }, { type: 'creditNote' }, { type: 'debitNote' },
    { type: 'habilitationSet', status: 'failed' }, { type: 'habilitationStatus', status: 'pending_or_rejected' }, null,
  ]);
  assert.equal(result.documents.length, 3);
  assert.equal(result.history.length, 2);
  assert(!result.documents.some(row => row.type.startsWith('habilitation')));
});

test('DIAN detail always fetches fresh metadata and uses the current tenant', async () => {
  const Service = methodsFrom('integrations.service.ts', ['getIntegration'], { map, tap, timeout, console: { log() {} } });
  const service = new Service();
  let requests = 0, caches = 0, tenant = 'ShopA';
  service.getCurrentCompanyId = () => tenant;
  service.getApiHeaders = () => ({ company: tenant });
  service.cacheService = { get() { caches++; return of({}); } };
  service.http = { get: (_url, options) => {
    requests++;
    assert.equal(options.headers.company, tenant);
    return of({ config: { id: tenant + '_dian', companyId: tenant, provider: 'dian',
      status: 'active', config: { environment: 'produccion' }, storedSecrets: { certificateP12Base64: true } } });
  } };
  const first = await service.getIntegration('dian').toPromise();
  tenant = 'ShopB';
  const second = await service.getIntegration('dian').toPromise();
  assert.equal(first.companyId, 'ShopA');
  assert.equal(second.companyId, 'ShopB');
  assert.equal(second.storedSecrets.certificateP12Base64, true);
  assert.equal(requests, 2); assert.equal(caches, 0);
});

test('HTTP 200 with success:false cannot produce a successful create or update', async () => {
  const Service = methodsFrom('integrations.service.ts', ['createIntegration', 'updateIntegration'], { map, tap, catchError, finalize, timeout });
  for (const method of ['createIntegration', 'updateIntegration']) {
    const service = new Service();
    service.getApiHeaders = () => ({ company: 'ShopA' });
    service.stateService = { setLoading() {}, setError() {} };
    service.http = { post: () => of({ success: false, message: 'No guardado' }),
      put: () => of({ success: false, message: 'No guardado' }) };
    await assert.rejects(service[method]('dian', {}).toPromise(), /No guardado/);
  }
});
