'use strict';
const test = require.main === module ? require('node:test') : () => {};
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rxjs = require('rxjs');

class HttpContextToken { constructor(factory) { this.factory = factory; } }
class HttpContext {
  constructor() { this.values = new Map(); }
  set(key, value) { this.values.set(key, value); return this; }
  get(key) { return this.values.has(key) ? this.values.get(key) : key.factory(); }
}
class HttpHeaders {
  constructor(values = {}) { this.values = Object.fromEntries(Object.entries(values).map(([k,v]) => [k.toLowerCase(), v])); }
  get(key) { return this.values[key.toLowerCase()] || null; }
  set(key, value) { return new HttpHeaders({ ...this.values, [key]: value }); }
}
const http = { HttpContext, HttpContextToken, HttpHeaders };
const angular = { Injectable: () => value => value };
const environment = { urlApi: 'https://back.katuq.com', opttiaAccessApi: 'https://back.katuq.com/v1/opttia/access',
  opttiaBasicApi: 'https://back.katuq.com/adk/agui/basic/v1' };
const ROOT = path.resolve(__dirname, '../src/app/shared/services');
function load(relative, mocks = {}, globals = {}) {
  const filename = path.join(ROOT, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, URL, Date, JSON, crypto: require('node:crypto').webcrypto,
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === '@angular/core') return angular;
      if (name === '@angular/common/http') return http;
      if (name === 'rxjs') return rxjs;
      if (name.endsWith('/environments/environment')) return { environment };
      throw new Error('Dependencia/I-O no autorizada: ' + name);
    }, ...globals }, { filename });
  return module.exports;
}

module.exports = { load, fixture };

function fixture() {
  const context = load('interceptor/opttia-mcp.context.ts');
  const types = load('opttia-support.types.ts');
  const skip = new HttpContextToken(() => false);
  const { BaseService } = load('base.service.ts', { './interceptor/loader.interceptor': { SKIP_LOADER: skip } });
  const { OpttiaSupportConfirmationService } = load('opttia-support-confirmation.service.ts', {
    './base.service': { BaseService }, './interceptor/opttia-mcp.context': context, './opttia-support.types': types,
  });
  const requests = []; let domainError = null, version = '2025-11-25', wrongId = false, malformedError = false;
  const client = { post(url, body, options) {
    requests.push({ url, body, options });
    if (body.method === 'notifications/initialized') return rxjs.of(null);
    const result = body.method === 'initialize' ? { protocolVersion: version, capabilities: {}, serverInfo: { name: 'fixture', version: '1' } }
      : { isError: !!domainError, content: [{ type: 'text', text: JSON.stringify(domainError || {
        success: true, status: 'abierto', ticket: { id: 'ticket-qa', nroTicket: 123, status: 'Pendiente' },
      }) }] };
    return rxjs.of({ jsonrpc: '2.0', id: wrongId ? 'wrong-id' : body.id, result, ...(malformedError ? { error: null } : {}) });
  } };
  const service = new OpttiaSupportConfirmationService(client);
  return { context, types, service, requests, skip, BaseService,
    setError: value => { domainError = value; }, setVersion: value => { version = value; }, setWrongId: () => { wrongId = true; },
    setMalformedError: () => { malformedError = true; } };
}

function proposal() {
  return { version: 1, proposalId: 'a'.repeat(32), expiresAt: new Date(Date.now() + 240000).toISOString(),
    confirmationToken: 'PRIVATE_CONFIRM_SENTINEL', display: { company: 'A', reporter: 'person@example.invalid',
      asunto: 'No guarda factura', descripcion: 'Aparece un error.', adjuntos: [] } };
}

test('MCP negocia e inicializa; prueba real va en metadata, sin otro admit/modelo', async () => {
  const f = fixture(), card = proposal();
  const saved = await f.service.confirm(card);
  assert.equal(saved.status, 'abierto'); assert.equal(saved.ticket.nroTicket, 123);
  assert.deepEqual(f.requests.map(r => r.body.method), ['initialize', 'notifications/initialized', 'tools/call']);
  assert.ok(f.requests.every(r => r.url === environment.urlApi + '/v1/opttia/mcp'));
  assert.ok(f.requests.every(r => r.options.context.get(f.skip) === true));
  const call = f.requests[2];
  assert.equal(call.options.headers.get('MCP-Protocol-Version'), '2025-11-25');
  assert.equal(call.body.params._meta.katuqSupportConfirmation.token, card.confirmationToken);
  assert.equal(call.body.params.arguments.comprobante, undefined);
  assert.equal(JSON.stringify(call.body.params.arguments).includes('PRIVATE_CONFIRM_SENTINEL'), false);
});

test('HTTP 200 con isError, id ajeno o versión desconocida nunca da éxito', async () => {
  const denied = fixture(); denied.setError({ success: false, code: 'SUPPORT_NOT_AUTHORIZED' });
  await assert.rejects(denied.service.confirm(proposal()));
  const wrongId = fixture(); wrongId.setWrongId();
  await assert.rejects(wrongId.service.confirm(proposal()));
  const malformed = fixture(); malformed.setMalformedError();
  await assert.rejects(malformed.service.confirm(proposal()));
  const unsupported = fixture(); unsupported.setVersion('unverified-version');
  await assert.rejects(unsupported.service.confirm(proposal()));
  assert.equal(unsupported.requests.length, 1);
});

test('interceptor conserva Bearer/tenant y cambia Accept solo en MCP marcado y canónico', () => {
  const f = fixture();
  const user = { token: 'SESSION_SENTINEL', company: 'A', email: 'person@example.invalid', nit: 'qa', authorizationCode: 'qa' };
  const globals = { localStorage: { getItem: () => JSON.stringify(user) }, window: { location: { pathname: '/welcome' } }, FormData: class {} };
  const { HttpInterceptor2 } = load('interceptor/http.interceptor.ts', {
    './opttia-mcp.context': f.context, '../firebase/auth.service': {}, 'ngx-toastr': {}, '@sentry/angular': {},
  }, globals);
  const interceptor = new HttpInterceptor2({}, {});
  const send = (url, marked) => {
    let sent;
    const req = { url, body: {}, context: new HttpContext().set(f.context.OPTTIA_MCP_TRANSPORT, marked),
      clone({ setHeaders }) { return { ...this, headers: new HttpHeaders(setHeaders) }; } };
    interceptor.handleAccess(req, { handle(value) { sent = value; return rxjs.of(value); } });
    return sent;
  };
  const canonical = environment.urlApi + '/v1/opttia/mcp';
  const mcp = send(canonical, true);
  assert.equal(mcp.headers.get('Accept'), 'application/json, text/event-stream');
  assert.equal(mcp.headers.get('Authorization'), 'Bearer SESSION_SENTINEL');
  assert.equal(mcp.headers.get('company'), 'A');
  for (const [url, marked] of [[canonical, false], [environment.urlApi + '/v1/orders', true], [canonical + '?other=1', true]]) {
    assert.equal(send(url, marked).headers.get('Accept'), 'application/json');
  }
});

function chatFixture() {
  const f = fixture(), store = new Map();
  let session = { token: 'SESSION_SENTINEL', companyId: 'A', displayName: 'Comercio A', email: 'person@example.invalid' };
  let confirmations = 0, settle, reject, timer;
  const sentProposals = [];
  const confirmation = { confirm: proposal => { confirmations++; sentProposals.push(proposal);
    return new Promise((resolve, fail) => { settle = resolve; reject = fail; }); } };
  const globals = { setTimeout: callback => { timer = callback; return 1; }, clearTimeout() {} };
  const stateModule = load('opttia-support-state.ts', { './opttia-support.types': f.types }, globals);
  const { OpttiaChatService } = load('opttia-chat.service.ts', {
    './security/katuq-commerce-context.service': {}, './opttia-support-confirmation.service': {}, './opttia-support.types': f.types,
    './opttia-support-state': stateModule,
  }, { localStorage: { getItem: key => store.get(key) || null }, AbortController, TextDecoder,
    window: { addEventListener() {}, removeEventListener() {} },
    setTimeout: () => 1, clearTimeout() {}, fetch: () => { throw new Error('Red no autorizada'); } });
  const chat = new OpttiaChatService({ run: fn => fn() }, { resolve: () => session }, confirmation);
  chat.ensureSessionScope(session);
  store.set(chat.consentStorageKey, 'accepted');
  chat.accessSubject.next({ allowed: false, remaining: 0, limit: 10, tools: ['create_support_ticket'], supportTicketCreation: true });
  let view = null;
  chat.support$.subscribe(value => { view = value; });
  const state = () => view;
  return { chat, state, push: () => chat.handleEvent({ type: 'katuq:SUPPORT_PROPOSAL', proposal: proposal() }),
    setSession: value => { session = value; }, session: () => session, store, settle: value => settle(value),
    reject: error => reject(error), sentProposals, expire: () => timer(),
    get confirmations() { return confirmations; } };
}

test('cuota cero permite confirmar una propuesta vigente, doble clic no duplica', async () => {
  const f = chatFixture(); f.push();
  assert.equal(f.state().status, 'review');
  assert.equal(JSON.stringify(f.state()).includes('PRIVATE_CONFIRM_SENTINEL'), false);
  const first = f.chat.confirmSupport(), second = f.chat.confirmSupport();
  assert.equal(f.confirmations, 1); assert.equal(f.state().status, 'submitting');
  f.settle({ success: true, status: 'abierto', ticket: { id: 'qa', nroTicket: 42, status: 'Pendiente' } });
  await Promise.all([first, second]);
  assert.equal(f.state().status, 'created'); assert.equal(f.state().ticket.nroTicket, 42);
});

test('cambio de sesión o retiro de consentimiento invalida antes de confirmar', async () => {
  const f = chatFixture(); f.push();
  f.setSession({ ...f.session(), token: 'OTHER_SESSION' });
  await f.chat.confirmSupport(); assert.equal(f.confirmations, 0);
  const other = chatFixture(); other.push(); other.store.clear();
  await other.chat.confirmSupport(); assert.equal(other.confirmations, 0);
});

test('cancelar pendiente no escribe y texto del modelo no crea una transición de éxito', () => {
  const f = chatFixture(); f.push(); f.chat.cancelSupport();
  assert.equal(f.state().status, 'cancelled'); assert.equal(f.confirmations, 0);
  f.chat.handleEvent({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'fake', delta: 'Ya creé el ticket 999.' });
  assert.equal(f.state().status, 'cancelled'); assert.equal(f.state().ticket, undefined);
});

test('resultado incierto reintenta exactamente la misma intención y nunca ofrece cancelar una escritura enviada', async () => {
  const f = chatFixture(); f.push();
  const first = f.chat.confirmSupport();
  f.chat.cancelSupport(); assert.equal(f.state().status, 'submitting');
  f.reject(new Error('RESPONSE_LOST')); await first;
  assert.equal(f.state().status, 'uncertain');
  f.chat.cancelSupport(); assert.equal(f.state().status, 'uncertain');
  const retry = f.chat.confirmSupport();
  assert.equal(f.sentProposals[0].confirmationToken, f.sentProposals[1].confirmationToken);
  f.settle({ success: true, status: 'ya_existia', ticket: { id: 'qa', nroTicket: 42, status: 'Pendiente' } });
  await retry; assert.equal(f.state().status, 'existing');
});

test('vencimiento, retiro de permiso y respuesta tardía de otra sesión no reviven la autorización', async () => {
  const expired = chatFixture(); expired.push(); expired.expire();
  assert.equal(expired.state().status, 'expired');
  await expired.chat.confirmSupport(); assert.equal(expired.confirmations, 0);
  const revoked = chatFixture(); revoked.push();
  revoked.chat.handleEvent({ type: 'katuq:ACCESS', access: { allowed: true, remaining: 9, limit: 10, tools: [], supportTicketCreation: false } });
  assert.equal(revoked.state().status, 'revoked');
  await revoked.chat.confirmSupport(); assert.equal(revoked.confirmations, 0);
  const late = chatFixture(); late.push(); const pending = late.chat.confirmSupport();
  late.setSession({ ...late.session(), companyId: 'B', token: 'OTHER' });
  late.settle({ success: true, status: 'abierto', ticket: { id: 'qa', nroTicket: 42, status: 'Pendiente' } });
  await pending; assert.equal(late.state(), null);
});

test('solo aclaración explícita conserva borrador; nueva pregunta descarta la propuesta anterior', () => {
  const f = chatFixture(), draft = { asunto: 'Error', descripcion: '', adjuntos: [] };
  f.chat.handleEvent({ type: 'katuq:SUPPORT_DRAFT', draft });
  assert.equal(JSON.stringify(f.chat.support.takeDraft(true)), JSON.stringify(draft));
  assert.equal(f.state(), null);
  f.chat.handleEvent({ type: 'katuq:SUPPORT_DRAFT', draft });
  assert.equal(f.chat.support.takeDraft(false), null);
  f.push(); assert.equal(f.chat.support.takeDraft(true), null); assert.equal(f.state(), null);
});

test('un SSE obsoleto no puede restaurar otra tarjeta ni mensajes', async () => {
  const f = chatFixture();
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({ type:'katuq:SUPPORT_PROPOSAL', proposal:proposal() })+'\n\n'));
    controller.close();
  } });
  await f.chat.consumeEventStream(stream, () => false);
  assert.equal(f.state(), null); assert.equal(f.confirmations, 0);
});

test('plantilla escapada, solo número estructurado y enlace fijo a Mis tickets', () => {
  const componentRoot = path.join(ROOT, '../components/opttia-chat');
  const html = fs.readFileSync(path.join(componentRoot, 'opttia-support-ticket.component.html'), 'utf8');
  const scss = fs.readFileSync(path.join(componentRoot, 'opttia-support-ticket.component.scss'), 'utf8');
  assert.doesNotMatch(html, /innerHTML|confirmationToken|\[routerLink\]/);
  assert.match(html, /routerLink="\/misTickets"/);
  assert.match(html, /view.status === 'submitting'/);
  assert.doesNotMatch(scss, /(?:linear|radial)-gradient\(|#(?:2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)/i);
  const classes = [...html.matchAll(/class="([^"]+)"/g)].flatMap(match => match[1].split(/\s+/));
  assert.ok(classes.every(name => !name.includes('p-')));
  assert.match(scss, /focus-visible[^}]*outline: 3px solid #7C5CFF !important/);
  assert.ok(fs.readFileSync(path.join(ROOT, 'company-features.service.ts'), 'utf8').includes("'opttiaSupportTickets'"));
});
