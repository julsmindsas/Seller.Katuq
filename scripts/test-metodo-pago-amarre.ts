/**
 * Test autónomo (ts-node) del AMARRE de método de pago — spec 015, T-03.
 * El harness karma del proyecto está inoperante; este runner ejecuta la lógica PURA
 * de `src/app/shared/util/metodo-pago.util.ts` (sin dependencias de Angular) con la
 * MISMA tabla de casos que el backend `functions/scripts/test-pagos-amarre.js`
 * (paridad RT-03). Si cambias un caso, cámbialo en ambos.
 *
 * Uso: npm run test:pagos-amarre   (ts-node --transpile-only)
 */
import * as assert from 'assert';
import { esPasarelaPorNombre, evaluarAmarre } from '../src/app/shared/util/metodo-pago.util';

let pass = 0;
function ok(name: string, fn: () => void): void {
  try { fn(); pass++; console.log(`  ✅ ${name}`); }
  catch (e: any) { console.error(`  ❌ ${name}: ${e.message}`); process.exitCode = 1; }
}

// --- Tabla de casos de esPasarelaPorNombre (idéntica al backend) ---
const CASOS_PASARELA: Array<[unknown, boolean]> = [
  ['Wompi', true],
  ['WOMPI', true],
  ['pago con Wompi', true],
  ['ePayco', true],
  ['Pasarela X', true],
  ['Tarjeta Online', true],
  ['Tarjeta', false],
  ['Efectivo', false],
  ['Nequi', false],
  ['', false],
  [null, false],
];

// --- Tabla de casos de evaluarAmarre (idéntica al backend) ---
const CASOS_AMARRE: Array<{ in: any; out: any }> = [
  { in: { nombre: 'Wompi', integracion: 'No', hayPasarelaActiva: true },
    out: { amarrado: true, motivo: 'pasarela', bloqueaCanalOff: true, bloqueaQuitarFlag: true } },
  { in: { nombre: 'Wompi', integracion: 'Si', hayPasarelaActiva: true },
    out: { amarrado: true, motivo: 'pasarela', bloqueaCanalOff: true, bloqueaQuitarFlag: true } },
  { in: { nombre: 'Wompi', integracion: 'No', hayPasarelaActiva: false },
    out: { amarrado: false, motivo: null, bloqueaCanalOff: false, bloqueaQuitarFlag: false } },
  { in: { nombre: 'Wompi', integracion: 'Si', hayPasarelaActiva: false },
    out: { amarrado: true, motivo: 'flag', bloqueaCanalOff: true, bloqueaQuitarFlag: false } },
  { in: { nombre: 'Efectivo', integracion: 'Si', hayPasarelaActiva: true },
    out: { amarrado: true, motivo: 'flag', bloqueaCanalOff: true, bloqueaQuitarFlag: false } },
  { in: { nombre: 'Efectivo', integracion: 'No', hayPasarelaActiva: true },
    out: { amarrado: false, motivo: null, bloqueaCanalOff: false, bloqueaQuitarFlag: false } },
  { in: { nombre: 'Efectivo', integracion: 'No', hayPasarelaActiva: false },
    out: { amarrado: false, motivo: null, bloqueaCanalOff: false, bloqueaQuitarFlag: false } },
  { in: { nombre: 'Datáfono', integracion: ' SÍ ', hayPasarelaActiva: false },
    out: { amarrado: true, motivo: 'flag', bloqueaCanalOff: true, bloqueaQuitarFlag: false } },
];

console.log('Test (ts-node) — amarre de método de pago (spec 015):');

CASOS_PASARELA.forEach(([nombre, esp]) => {
  ok(`esPasarelaPorNombre(${JSON.stringify(nombre)}) === ${esp}`, () => {
    assert.strictEqual(esPasarelaPorNombre(nombre), esp);
  });
});

CASOS_AMARRE.forEach((c) => {
  const { nombre, integracion, hayPasarelaActiva } = c.in;
  ok(`evaluarAmarre nombre=${JSON.stringify(nombre)} int=${JSON.stringify(integracion)} pasarela=${hayPasarelaActiva} → ${c.out.motivo}`, () => {
    const r = evaluarAmarre({ nombre, integracion }, { hayPasarelaActiva });
    assert.deepStrictEqual(r, c.out);
  });
});

console.log(`\n${process.exitCode ? 'HAY FALLOS' : 'TODO VERDE'} — ${pass} asserts OK`);
