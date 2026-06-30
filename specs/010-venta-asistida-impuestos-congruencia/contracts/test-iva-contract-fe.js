#!/usr/bin/env node
/**
 * Harness FE — spec 010 (T-05/T-08). Corre los fixtures dorados contra el núcleo
 * canónico del FRONTEND (`src/app/shared/services/ventas/iva-canonico.ts`),
 * compilado a JS. Debe dar los mismos resultados que el harness del backend.
 *
 * Uso (desde la raíz Seller.Katuq):
 *   npx tsc src/app/shared/services/ventas/iva-canonico.ts --outDir <tmp> --module commonjs --target es2019
 *   node specs/010-venta-asistida-impuestos-congruencia/contracts/test-iva-contract-fe.js <tmp>/iva-canonico.js [fixtures.json]
 */
"use strict";
const fs = require("fs");
const path = require("path");

const corePath = process.argv[2];
if (!corePath || !fs.existsSync(corePath)) {
  console.error("Falta la ruta al iva-canonico.js compilado:", corePath);
  process.exit(2);
}
const { calcularTotalesCanonico } = require(path.resolve(corePath));

const fixturesPath =
  process.argv[3] || path.resolve(__dirname, "iva-fixtures.json");
const { meta, casos } = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));
const TOL = (meta && meta.toleranciaRedondeo) || 0.01;

const order = (caso) => {
  const ctx = caso.ctx || {};
  const ped = caso.pedido || {};
  return {
    carrito: caso.carrito || [],
    porceDescuento: ctx.porceDescuento || 0,
    totalEnvio: ped.totalEnvio || 0,
    tarifaEnvio: ped.tarifaEnvio,
    cliente: ctx.categoriaClienteId ? { categoria: { id: ctx.categoriaClienteId } } : undefined,
  };
};
const near = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) <= TOL;

let pass = 0, fail = 0;
console.log(`\nContrato IVA FE — fixtures: ${path.basename(fixturesPath)}\n`);
console.log("CASO                              | esp.IVA | obt.IVA | esp.Total | obt.Total | estado");
console.log("-".repeat(96));
for (const caso of casos) {
  const r = calcularTotalesCanonico(order(caso));
  const esp = caso.esperado || {};
  const ok = near(r.totalImpuesto, esp.totalImpuesto) && near(r.total, esp.total);
  if (ok) pass++; else fail++;
  const f = (n) => (typeof n === "number" ? n.toFixed(2).padStart(8) : String(n).padStart(8));
  console.log(`${caso.id.padEnd(33)} | ${f(esp.totalImpuesto)} | ${f(r.totalImpuesto)} | ${f(esp.total)} | ${f(r.total)} | ${ok ? "✅ PASS" : "❌ FAIL"}`);
}
console.log("-".repeat(96));
console.log(`\nResultado FE: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
