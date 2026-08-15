"use strict";

const assert = require("node:assert/strict");
require("ts-node/register/transpile-only");

const {
  buildOnboardingStorageKey,
  clearOnboardingStorage,
  parseLowStockThreshold,
} = require("../../src/app/components/onboarding/utils/onboarding-v2.utils.ts");

// El estado queda aislado por usuario y tenant, incluso con caracteres que no
// son seguros como separadores de localStorage.
assert.strictEqual(
  buildOnboardingStorageKey("ana@example.com", "Mi Empresa / Norte"),
  "katuq_onboarding_v2:ana%40example.com:Mi%20Empresa%20%2F%20Norte",
);
assert.notStrictEqual(
  buildOnboardingStorageKey("ana@example.com", "Empresa A"),
  buildOnboardingStorageKey("ana@example.com", "Empresa B"),
);
assert.notStrictEqual(
  buildOnboardingStorageKey("ana@example.com", "Empresa A"),
  buildOnboardingStorageKey("luis@example.com", "Empresa A"),
);
assert.throws(() => buildOnboardingStorageKey("", "Empresa A"), /requeridos/);
assert.throws(() => buildOnboardingStorageKey("ana@example.com", ""), /requeridos/);

// El umbral solo acepta enteros no negativos; vacio significa no enviar valor.
assert.strictEqual(parseLowStockThreshold(""), null);
assert.strictEqual(parseLowStockThreshold("   "), null);
assert.strictEqual(parseLowStockThreshold(null), null);
assert.strictEqual(parseLowStockThreshold("0"), 0);
assert.strictEqual(parseLowStockThreshold(" 5 "), 5);
assert.strictEqual(parseLowStockThreshold(8), 8);
assert.strictEqual(parseLowStockThreshold("-5"), null);
assert.strictEqual(parseLowStockThreshold("5.5"), null);
assert.strictEqual(parseLowStockThreshold("5 unidades"), null);
assert.strictEqual(parseLowStockThreshold(Number.MAX_SAFE_INTEGER + 1), null);

// Limpiar mientras Storage muta no puede dejar borradores de otra empresa.
const values = new Map([
  ["user", "{}"],
  ["katuq_onboarding_v2", "legacy"],
  ["katuq_onboarding_v2:ana:empresa-a", "a"],
  ["unrelated", "keep"],
  ["katuq_onboarding_v2:luis:empresa-b", "b"],
]);
const fakeStorage = {
  get length() { return values.size; },
  key(index) { return [...values.keys()][index] ?? null; },
  removeItem(key) { values.delete(key); },
};
clearOnboardingStorage(fakeStorage);
assert.deepStrictEqual([...values.keys()], ["user", "unrelated"]);

console.log("onboarding-v2-utils.test.js: OK");
