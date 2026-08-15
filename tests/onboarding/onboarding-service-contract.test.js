"use strict";

const assert = require("node:assert/strict");

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs" });
require("ts-node/register/transpile-only");
require("@angular/compiler");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

global.localStorage = new MemoryStorage();
global.sessionStorage = new MemoryStorage();

const {
  OnboardingService,
} = require("../../src/app/components/onboarding/services/onboarding.service.ts");

class FakeHttpClient {
  constructor() {
    this.calls = [];
    this.responses = [];
  }

  resolve(value) { this.responses.push({ value }); }
  reject(error) { this.responses.push({ error }); }

  get(url, options) { return this.request("GET", url, undefined, options); }
  post(url, body, options) { return this.request("POST", url, body, options); }

  request(method, url, body, options) {
    this.calls.push({ method, url, body, options });
    const response = this.responses.shift() || { value: {} };
    return {
      toPromise() {
        return response.error
          ? Promise.reject(response.error)
          : Promise.resolve(response.value);
      },
    };
  }
}

function stateStub() {
  return {
    userEmail: "ana@example.com",
    userId: "user-1",
    companyName: "Empresa A",
    currentStepId: "company-info",
    steps: new Map(),
    completedSteps: 0,
    progressPercentage: 0,
    isCompleted: false,
    startedAt: new Date(),
    lastUpdated: new Date(),
  };
}

(async () => {
  // Completion ya no envia identidad controlable por el navegador.
  const successHttp = new FakeHttpClient();
  successHttp.resolve({ success: true });
  const successService = new OnboardingService(successHttp);
  successService.onboardingState$.next(stateStub());

  assert.strictEqual(await successService.completeOnboarding(), true);
  assert.strictEqual(successService.getCurrentState().isCompleted, true);
  assert.strictEqual(successHttp.calls.length, 1);
  assert.strictEqual(successHttp.calls[0].method, "POST");
  assert.ok(successHttp.calls[0].url.endsWith("/v1/onboarding/complete"));
  assert.deepStrictEqual(successHttp.calls[0].body, {});

  // Un 500/red rechaza la promesa y no marca localmente como completado.
  const networkHttp = new FakeHttpClient();
  networkHttp.reject(new Error("backend unavailable"));
  const networkService = new OnboardingService(networkHttp);
  const pendingState = stateStub();
  networkService.onboardingState$.next(pendingState);
  await assert.rejects(
    () => networkService.completeOnboarding(),
    /backend unavailable/,
  );
  assert.strictEqual(networkService.getCurrentState().isCompleted, false);

  // Un HTTP 200 con success:false tambien debe detener el flujo de exito.
  const semanticHttp = new FakeHttpClient();
  semanticHttp.resolve({ success: false, message: "faltan recursos" });
  const semanticService = new OnboardingService(semanticHttp);
  semanticService.onboardingState$.next(stateStub());
  await assert.rejects(
    () => semanticService.completeOnboarding(),
    /faltan recursos/,
  );
  assert.strictEqual(semanticService.getCurrentState().isCompleted, false);

  // El progreso V2 se envia sin email ni company: ambos salen del JWT.
  const progressHttp = new FakeHttpClient();
  progressHttp.resolve({ success: true });
  const progressService = new OnboardingService(progressHttp);
  const progress = {
    schemaVersion: "v2",
    activeRoute: "sell_today",
    context: { channel: "local" },
    currentStepId: "product",
    steps: { goal: "done" },
    draft: {},
  };
  await progressService.saveV2Progress(progress);
  assert.ok(progressHttp.calls[0].url.endsWith("/v1/onboarding/progress"));
  assert.deepStrictEqual(progressHttp.calls[0].body, progress);
  assert.strictEqual(Object.hasOwn(progressHttp.calls[0].body, "email"), false);
  assert.strictEqual(Object.hasOwn(progressHttp.calls[0].body, "company"), false);

  // La decisión de entrada también es autenticada: deferred remoto evita
  // forzar el wizard en cada login, pero nunca sustituye completion.
  const deferredHttp = new FakeHttpClient();
  deferredHttp.resolve({
    success: true,
    data: {
      schemaVersion: "v2",
      onboardingCompleted: false,
      context: {},
      steps: {},
      draft: { deferred: true },
    },
  });
  const deferredService = new OnboardingService(deferredHttp);
  assert.deepStrictEqual(
    await deferredService.getOnboardingEntryState(),
    { completed: false, deferred: true },
  );
  assert.ok(deferredHttp.calls[0].url.endsWith("/v1/onboarding/progress"));

  const completedHttp = new FakeHttpClient();
  completedHttp.resolve({
    success: true,
    data: {
      schemaVersion: "v2",
      onboardingCompleted: true,
      context: {},
      steps: {},
      draft: { deferred: true },
    },
  });
  const completedService = new OnboardingService(completedHttp);
  assert.deepStrictEqual(
    await completedService.getOnboardingEntryState(),
    { completed: true, deferred: false },
  );

  // Readiness invalida nunca habilita finalizar por defecto.
  const readinessHttp = new FakeHttpClient();
  readinessHttp.resolve({ success: true, data: { company_ready: true } });
  const readinessService = new OnboardingService(readinessHttp);
  await assert.rejects(
    () => readinessService.getReadiness(),
    /estado de preparación válido/,
  );

  // El comando mínimo conserva el contrato de inventario: booleano explícito,
  // cantidad y código de negocio de bodega (nunca el docId Firestore).
  const productHttp = new FakeHttpClient();
  productHttp.resolve({
    success: true,
    data: {
      id: "onb_product_1",
      inventariable: true,
      cantidadInicial: 3,
      idBodega: "BOD-001",
    },
  });
  const productService = new OnboardingService(productHttp);
  const minimalPayload = {
    nombre: "Camiseta blanca",
    precio: 50000,
    tipo: "producto",
    requestId: "request-product-0001",
    inventariable: true,
    cantidadInicial: 3,
    idBodega: "BOD-001",
  };
  const created = await productService.createMinimalProduct(minimalPayload);
  assert.strictEqual(created.id, "onb_product_1");
  assert.ok(productHttp.calls[0].url.endsWith("/v1/onboarding/minimal-product"));
  assert.deepStrictEqual(productHttp.calls[0].body, minimalPayload);

  // El umbral inválido se omite y el válido usa el endpoint acotado de empresa.
  const thresholdHttp = new FakeHttpClient();
  const thresholdService = new OnboardingService(thresholdHttp);
  await thresholdService.saveLowStockThreshold(-1);
  assert.strictEqual(thresholdHttp.calls.length, 0);
  thresholdHttp.resolve({ success: true });
  await thresholdService.saveLowStockThreshold(5);
  assert.ok(thresholdHttp.calls[0].url.endsWith("/v1/companies/notification-settings"));
  assert.deepStrictEqual(thresholdHttp.calls[0].body, { stockBajoUmbral: 5 });

  console.log("onboarding-service-contract.test.js: OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
