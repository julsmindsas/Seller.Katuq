#!/usr/bin/env node
/**
 * spec 010 · T-14 — Contrato del LAYERING de descuentos de cotizaciones.
 *
 * La resolución por línea (sinIVA + tarifa, jerarquía manual→categoría→volumen→
 * base, ancla A) ya está cubierta por el harness FE/BE (14/14). Lo ESPECÍFICO de
 * cotizaciones es el layering de descuentos que el motor de PEDIDOS no tiene:
 *   - descuento POR LÍNEA (descuentoLinea %)  →  aplica antes del global
 *   - descuento GLOBAL (descGlobal %)         →  sobre el subtotal neto de líneas
 * Este test fija ese layering con un caso trabajado, replicando exactamente las
 * fórmulas de los getters del editor (cotizacion-editor.component.ts §T-21) bajo
 * el flag ivaCalcUnificado=ON (getValorIva = sinIVA × tarifa, ancla A).
 *
 * Correr:  node test-cotizaciones-layering.js
 */

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

/** Réplica de los getters de totales del editor (flag ON). */
function totalesCotizacion(lineas, descGlobalPct) {
  const g = Math.min(100, Math.max(0, Number(descGlobalPct) || 0)) / 100;

  // get subtotal: Σ sinIVA × cantidad (bruto, antes de descuentos)
  const subtotal = lineas.reduce((a, l) => a + l.sinIVA * l.cantidad, 0);

  // get totalDescuentoLineas: Σ sinIVA × cantidad × descLinea
  const totalDescuentoLineas = lineas.reduce(
    (a, l) => a + l.sinIVA * l.cantidad * (Math.min(100, Math.max(0, l.descLinea || 0)) / 100),
    0
  );

  // subtotalNetoLineas = subtotal − descuentos de línea
  const subtotalNetoLineas = subtotal - totalDescuentoLineas;

  // get totalDescuentoGlobal = subtotalNetoLineas × descGlobal
  const totalDescuentoGlobal = subtotalNetoLineas * g;

  const totalDescuento = totalDescuentoLineas + totalDescuentoGlobal;
  const baseGravable = subtotal - totalDescuento;

  // ivaNetoLineas: Σ (sinIVA × tarifa) × cantidad × (1 − descLinea)   [ancla A]
  const ivaNetoLineas = lineas.reduce(
    (a, l) =>
      a +
      l.sinIVA * (l.tarifa / 100) * l.cantidad * (1 - (Math.min(100, Math.max(0, l.descLinea || 0)) / 100)),
    0
  );

  // get totalImpuesto = ivaNetoLineas × (1 − descGlobal)
  const totalImpuesto = ivaNetoLineas * (1 - g);

  const total = baseGravable + totalImpuesto;

  return {
    subtotal: round2(subtotal),
    totalDescuento: round2(totalDescuento),
    baseGravable: round2(baseGravable),
    totalImpuesto: round2(totalImpuesto),
    total: round2(total),
  };
}

// ── Caso trabajado ────────────────────────────────────────────────────────
// Línea A: sinIVA 100, IVA 19%, x2, 10% desc línea
// Línea B: sinIVA 50,  IVA 5%,  x1, 0%  desc línea
// Descuento global: 5%
const lineas = [
  { sinIVA: 100, tarifa: 19, cantidad: 2, descLinea: 10 },
  { sinIVA: 50, tarifa: 5, cantidad: 1, descLinea: 0 },
];
const descGlobal = 5;

const esperado = {
  subtotal: 250, // 100*2 + 50*1
  totalDescuento: 31.5, // líneas 20 + global (230*5%)=11.5
  baseGravable: 218.5, // 250 − 31.5
  totalImpuesto: 34.87, // (19*2*0.9 + 2.5) * 0.95 = 36.7*0.95 = 34.865 → 34.87
  total: 253.37, // 218.5 + 34.865 = 253.365 → 253.37
};

const got = totalesCotizacion(lineas, descGlobal);

let ok = true;
for (const k of Object.keys(esperado)) {
  const pass = Math.abs(got[k] - esperado[k]) < 0.01;
  if (!pass) ok = false;
  console.log(`${pass ? "✅" : "❌"} ${k}: got=${got[k]} esperado=${esperado[k]}`);
}

console.log(ok ? "\n✅ PASS — layering cotizaciones (línea + global) OK" : "\n❌ FAIL");
process.exit(ok ? 0 : 1);
