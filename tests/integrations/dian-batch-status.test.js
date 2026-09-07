'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Subject, of, throwError } = require('rxjs');
const { takeUntil } = require('rxjs/operators');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { describeDianBatchStatus } = require('../../src/app/components/integrations/dian-batch-status.ts');
const pending = { isValid: false, statusCode: null, statusDescription: 'Batch en proceso de validación.', errorMessages: [] };
const accepted = { isValid: true, statusCode: '00', xmlFileName: 'invoice.xml', statusMessage: 'Procesado correctamente', errorMessages: [] };
const rejected = { isValid: false, statusCode: '99', xmlFileName: 'credit-note.xml', errorMessages: ['Regla: FAK01, documento rechazado'] };

test('la respuesta real en proceso se muestra como información, no como rechazo', () => {
  const result = describeDianBatchStatus({ success: true, data: { isValid: false, responses: [pending] } });
  assert.equal(result.state, 'pending');
  assert.equal(result.title, 'Lote en proceso');
  assert.equal(result.alertClass, 'alert-info');
  assert.deepEqual(result.details[0].messages, [pending.statusDescription]);
  assert.match(result.description, /no significa que tu software esté rechazado/);
});

test('aceptación de documentos nunca se presenta como habilitación del software', () => {
  const result = describeDianBatchStatus({ isValid: true, responses: [accepted, accepted] });
  assert.equal(result.state, 'accepted');
  assert.equal(result.title, 'Lote aceptado');
  assert.match(result.description, /habilitación del software se consulta por separado/);
  assert.equal(result.details[0].code, '00');
});

test('un rechazo explícito mantiene las reglas y el nombre del documento', () => {
  const result = describeDianBatchStatus({ isValid: false, responses: [rejected] });
  assert.equal(result.state, 'rejected');
  assert.equal(result.alertClass, 'alert-danger');
  assert.equal(result.details[0].documentName, rejected.xmlFileName);
  assert.deepEqual(result.details[0].messages, rejected.errorMessages);
});

test('un lote mixto conserva por separado aceptación y rechazo', () => {
  const result = describeDianBatchStatus({ isValid: false, responses: [accepted, rejected, pending] });
  assert.equal(result.state, 'mixed');
  assert.deepEqual(result.details.map(r => r.label), ['Aceptado', 'Rechazado', 'En proceso']);
});

test('TrackId inexistente (66) no equivale a software rechazado', () => {
  const result = describeDianBatchStatus({ responses: [{ isValid: false, statusCode: '66', statusDescription: 'TrackId no existe en los registros de la DIAN.' }] });
  assert.equal(result.state, 'not_found');
});

test('isValid false sin detalle no permite inferir pendiente ni rechazado', () => {
  for (const response of [null, undefined, {}, 'bad response', [], { isValid: false }, { responses: [null] }, { responses: [] }]) {
    assert.equal(describeDianBatchStatus(response).state, 'unknown');
  }
});

test('el detalle prima sobre la bandera agregada y una lista vacía nunca aprueba', () => {
  assert.equal(describeDianBatchStatus({ isValid: true, responses: [] }).state, 'unknown');
  assert.equal(describeDianBatchStatus({ isValid: true, responses: null }).state, 'unknown');
  assert.equal(describeDianBatchStatus({ isValid: true, responses: 'invalid' }).state, 'unknown');
  assert.equal(describeDianBatchStatus({ isValid: true, responses: [rejected] }).state, 'rejected');
});

test('tolera respuestas planas legacy y conserva statusDescription y statusMessage', () => {
  const result = describeDianBatchStatus({ ...pending, statusMessage: 'Consulta recibida' });
  assert.equal(result.state, 'pending');
  assert.deepEqual(result.details[0].messages, [pending.statusDescription, 'Consulta recibida']);
});

test('mensajes nulos o malformados no rompen la pantalla y no se repiten', () => {
  const result = describeDianBatchStatus({ responses: [{ isValid: false, statusDescription: 'Documento rechazado', errorMessages: [null, {}, '', 'Documento rechazado'] }] });
  assert.equal(result.state, 'rejected');
  assert.deepEqual(result.details[0].messages, ['Documento rechazado']);
});

test('advertencias sobre un documento aceptado no lo convierten en rechazado', () => {
  assert.equal(describeDianBatchStatus({ ...accepted, errorMessages: ['Notificación: dato no encontrado'] }).state, 'accepted');
  assert.equal(describeDianBatchStatus({ ...rejected, errorMessages: ['Campo no encontrado'] }).state, 'rejected');
});

test('HTTP success no es aceptación DIAN y un error de API no puede aprobar', () => {
  assert.equal(describeDianBatchStatus({ success: true }).state, 'unknown');
  assert.equal(describeDianBatchStatus({ success: false, data: accepted }).state, 'unknown');
  assert.equal(describeDianBatchStatus({ isValid: 'false' }).state, 'unknown');
  assert.equal(describeDianBatchStatus({ isValid: 'true' }).state, 'unknown');
});

test('el modelo no expone XML, certificados ni secretos', () => {
  const result = describeDianBatchStatus({ ...accepted, xmlBase64: 'PRIVATE_XML', certificatePassword: 'PRIVATE_PASSWORD' });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_/);
});

// Run the actual component methods with a stubbed service; no Angular browser,
// authenticated session, Firestore writes, or DIAN calls are needed.
const componentPath = path.resolve(__dirname, '../../src/app/components/integrations/integrations.component.ts');
const source = ts.createSourceFile(componentPath, fs.readFileSync(componentPath, 'utf8'), ts.ScriptTarget.Latest, true);
const component = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'IntegrationsComponent');
const methods = component.members.filter(node => ['checkDianHabilitationStatus', 'clearDianBatchResult'].includes(node.name?.getText(source)));
assert.equal(methods.length, 2);
const compiled = ts.transpileModule(`export class QueryHandler { ${methods.map(node => node.getText(source)).join('\n')} }`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const context = { exports: {}, describeDianBatchStatus, takeUntil };
vm.runInNewContext(compiled, context);

function handler(response$) {
  const notices = [];
  const calls = [];
  const instance = Object.assign(new context.exports.QueryHandler(), {
    dianZipKey: '  batch-test  ', dianHabilitationLoading: false, dianBatchQueryVersion: 0,
    dianHabilitationStatus: null, dianHabilitationError: '', dianQueriedZipKey: '',
    destroy$: new Subject(),
    integrationForm: Object.freeze({ environment: 'habilitacion' }),
    integrationsService: { getDianHabilitationStatus: key => { calls.push(key); return response$; } },
    uiHelper: Object.fromEntries(['showInfo', 'showWarning', 'showSuccess', 'showError'].map(name => [name, text => notices.push([name, text])]))
  });
  return { instance, notices, calls };
}

test('consultar un lote pendiente no genera toast de error ni cambia ambiente', () => {
  const { instance, notices, calls } = handler(of({ data: { responses: [pending] } }));
  instance.checkDianHabilitationStatus();
  assert.deepEqual(calls, ['batch-test']);
  assert.deepEqual(notices, [['showInfo', 'Lote en proceso']]);
  assert.equal(instance.integrationForm.environment, 'habilitacion');
  assert.equal(instance.dianQueriedZipKey, 'batch-test');
  assert.equal(instance.dianHabilitationLoading, false);
});

test('error de red limpia la aceptación anterior y deja un error de consulta visible', () => {
  const { instance, notices } = handler(throwError(() => ({ error: { message: 'Tiempo de espera agotado' } })));
  instance.dianHabilitationStatus = describeDianBatchStatus(accepted);
  instance.checkDianHabilitationStatus();
  assert.equal(instance.dianHabilitationStatus, null);
  assert.equal(instance.dianHabilitationError, 'Tiempo de espera agotado');
  assert.equal(instance.dianQueriedZipKey, '');
  assert.deepEqual(notices, [['showError', 'Tiempo de espera agotado']]);
});

test('no duplica consultas mientras espera y descarta respuestas de un contexto anterior', () => {
  const response$ = new Subject();
  const { instance, calls, notices } = handler(response$);
  instance.checkDianHabilitationStatus();
  instance.checkDianHabilitationStatus();
  assert.equal(calls.length, 1);
  instance.clearDianBatchResult();
  response$.next({ data: accepted });
  response$.complete();
  assert.equal(instance.dianHabilitationStatus, null);
  assert.equal(notices.length, 0);
});

test('código vacío no consulta y una nueva consulta no conserva errores anteriores', () => {
  const { instance, calls } = handler(of({ data: { responses: [pending] } }));
  instance.dianZipKey = '   ';
  instance.checkDianHabilitationStatus();
  assert.equal(calls.length, 0);
  instance.dianZipKey = 'batch-test';
  instance.dianHabilitationError = 'Error anterior';
  instance.checkDianHabilitationStatus();
  assert.equal(instance.dianHabilitationError, '');
});

test('la plantilla usa detalles normalizados y separa lote, software y ambiente', () => {
  const html = fs.readFileSync(componentPath.replace('.ts', '.html'), 'utf8');
  assert.doesNotMatch(html, /PENDIENTE O RECHAZADO|dianHabilitationStatus\?\.isValid/);
  assert.match(html, /batch\.details/);
  assert.match(html, /detail\.messages/);
  assert.match(html, /Habilitación del software/);
  assert.match(html, /Ambiente seleccionado en Katuq/);
  assert.match(html, /Consultar lote/);
  assert.match(html, /role="alert" \*ngIf="dianHabilitationError"/);
});
