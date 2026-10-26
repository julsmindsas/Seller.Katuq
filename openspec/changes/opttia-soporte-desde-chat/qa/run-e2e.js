'use strict';
// Ópt-in explícito, tres repositorios. HTTP SOLO loopback; modelo, DB y avisos falsos.
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const seller = path.resolve(__dirname, '../../../..');
const backend = path.resolve(seller, '../katuq_admin_back_firebase/functions');
const adk = process.env.KATUQ_TEST_ADK_ROOT
  ? path.resolve(process.env.KATUQ_TEST_ADK_ROOT) : path.resolve(seller, '../../../KAI/kai/adk_agent');
const python = process.argv[2];
if (!python || !path.isAbsolute(python)) throw new Error('Indica el Python del entorno aislado.');
const { createRequire } = require('node:module');
const fromBackend = createRequire(path.join(backend, 'package.json'));
const fromSeller = createRequire(path.join(seller, 'package.json'));
const { fixture: backendFixture } = require(path.join(backend, 'tests/opttia-access.test.js'));
const { fixture: supportFixture } = require(path.join(backend, 'tests/opttiaSupportMcp.test.js'));
const { load, fixture: clientFixture } = require(path.join(seller, 'tests/opttia-support.test.js'));
const permissions = fromBackend('./services/mcp/permisoDeEscritura');

async function main() {
  const support = supportFixture();
  let canWrite = true;
  const restore = permissions._usarLector(async () => ({ usuarios: 1, activo: true, rol: 'Soporte', menus: canWrite ? ['misTickets'] : [] }));
  const registry = { getTool: name => name === 'create_support_ticket' ? support.tool : null,
    async executeTool(name, args, context) {
      assert.equal(name, 'create_support_ticket'); assert.equal(context.mcpCompany, 'A');
      assert.deepEqual(Array.from(context.mcpPermissions), ['write']); assert.equal(context.mcpUserEmail, 'a@example.com');
      assert.ok((await permissions.puedeEscribir({ company: 'A', email: context.mcpUserEmail, modulos: ['misTickets'] })).ok);
      return support.tool.execute(args, context);
    } };
  const f = backendFixture({ httpMode: true, permissions: {}, role: 'Soporte', featureFlags: { opttiaSupportTickets: true }, registryOverride: registry });
  const app = fromBackend('express')();
  app.use(fromBackend('express').json()); app.use('/v1/opttia', f.router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/v1/opttia`;
  const token = fromBackend('jwt-simple').encode({ company: 'A', email: 'a@example.com', sub: '123', exp: Date.now()/1000+600 }, 'opttia-integration-test-only');
  try {
    const child = spawn(python, [path.join(__dirname, 'e2e-agent.py'), adk], { cwd: adk,
      env: { ...process.env, KATUQ_ACCESS_API_URL: base }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdin.end(JSON.stringify({ token }));
    const exit = await new Promise(resolve => child.on('close', resolve));
    if (exit !== 0) throw new Error('El fixture ADK no completó el protocolo local. Revisar su runtime sin publicar autorizaciones.');
    const observed = JSON.parse(stdout);
    assert.equal(observed.leak, false, 'El modelo nunca recibe capacidades privadas.');
    assert.equal(observed.modelCalls, 2);
    const card = observed.frames.find(frame => frame.type === 'katuq:SUPPORT_PROPOSAL')?.proposal;
    assert.ok(card, 'ADK debe emitir una propuesta real del MCP local.');
    for (const secret of [token, card.confirmationToken, 'GENERIC_RECEIPT_SENTINEL']) {
      assert.equal(stderr.includes(secret), false, 'Las trazas no deben contener capacidades privadas.');
    }
    assert.equal(support.persistence.docs.size, 0, 'Cero alta antes del clic.');
    const fClient = clientFixture(), session = { token, company: 'A', email: 'a@example.com', nit: '123' };
    const { OpttiaSupportConfirmationService } = load('opttia-support-confirmation.service.ts', {
      './base.service': { BaseService: fClient.BaseService }, './interceptor/opttia-mcp.context': fClient.context,
      './opttia-support.types': fClient.types,
    });
    const { HttpInterceptor2 } = load('interceptor/http.interceptor.ts', { './opttia-mcp.context': fClient.context,
      '../firebase/auth.service': {}, 'ngx-toastr': {}, '@sentry/angular': {} },
      { localStorage: { getItem: () => JSON.stringify(session) }, window: { location: { pathname: '/welcome' } }, FormData: class {} });
    const interceptor = new HttpInterceptor2({}, {}), methods = [];
    const client = { post(url, body, options) {
      assert.equal(url, 'https://back.katuq.com/v1/opttia/mcp'); methods.push(body.method);
      const req = { url, body, context: options.context, clone({ setHeaders }) {
        return { ...this, headers: { ...options.headers.values, ...setHeaders } };
      } };
      return interceptor.handleAccess(req, { handle(request) {
        return fromSeller('rxjs').from(fetch(base+'/mcp', { method: 'POST', headers: request.headers, body: JSON.stringify(body) }).then(async response => {
          if (!response.ok) { const error = new Error('HTTP fixture'); error.status = response.status; throw error; }
          return response.status === 202 || response.status === 204 ? null : response.json();
        }));
      } });
    } };
    const confirmation = new OpttiaSupportConfirmationService(client);
    const saved = await confirmation.confirm(card), repeat = await confirmation.confirm(card);
    assert.equal(saved.ticket.id, repeat.ticket.id); assert.equal(saved.ticket.nroTicket, repeat.ticket.nroTicket);
    assert.equal(support.persistence.docs.size, 1); assert.equal(support.persistence.notifications.length, 1);
    assert.equal([...f.usage.values()][0].chatMessages, 1, 'Confirmar/reintentar no consume otro mensaje.');
    canWrite = false;
    await assert.rejects(confirmation.confirm(card), error => error.state === 'revoked');
    assert.equal(support.persistence.docs.size, 1);
    assert.ok(methods.every(method => ['initialize', 'notifications/initialized', 'tools/call'].includes(method)));
    process.stdout.write(JSON.stringify({ verified: true, model: 'simulado', storage: 'memoria', realTickets: 0,
      proposalsBeforeClick: 1, savedInMemory: 1, notificationsInMemory: 1, admittedMessages: 1, modelCalls: 2,
      privateAuthorizationInModel: false, replaySameTicket: true, permissionRevocationRejected: true })+'\n');
  } finally {
    restore(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { process.stderr.write(error.message+'\n'); process.exitCode = 1; });
