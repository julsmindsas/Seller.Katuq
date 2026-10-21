'use strict';
/**
 * Pantalla «Traer mi tienda» (F5-30, F530-F02, tareas 8.3 y 8.4): contratos de lectura del código.
 *   node --test tests/migracion/pantalla.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '../../src/app');
const dir = path.join(raiz, 'components/migracion-tienda');
const leer = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const archivos = ['migrar-tienda.component.ts', 'migrar-tienda.component.scss', 'migracion-tienda.routing.ts', 'pasos/paso-subir.component.ts', 'pasos/paso-simular.component.ts', 'pasos/paso-importar.component.ts', 'pasos/paso-reporte.component.ts', 'logica/flujo.ts', 'logica/textos.ts'];
const PASOS = ['subir', 'simular', 'importar', 'reporte'];

test('cada paso es un componente standalone OnPush; el contenedor también', () => {
  for (const p of PASOS) {
    const s = leer(dir, `pasos/paso-${p}.component.ts`);
    assert.match(s, /standalone: true/, p);
    assert.match(s, /ChangeDetectionStrategy\.OnPush/, p);
    assert.ok(!/HttpClient|MigracionTiendaService/.test(s), `${p}: los pasos solo presentan`);
  }
  const c = leer(dir, 'migrar-tienda.component.ts');
  assert.match(c, /standalone: true/);
  assert.match(c, /ChangeDetectionStrategy\.OnPush/);
  assert.ok(!/HttpClient/.test(c));
});

test('ruta: lazy, bajo AuthGuard y con MigracionTiendaGuard dentro', () => {
  const r = leer(raiz, 'shared/routes/routes.ts');
  const bloque = r.slice(r.indexOf('path: "migrar-tienda"'));
  assert.match(bloque.slice(0, 400), /loadChildren/);
  assert.match(bloque.slice(0, 500), /canActivate: \[AuthGuard\]/);
  const m = leer(dir, 'migracion-tienda.routing.ts');
  assert.match(m, /canActivate: \[MigracionTiendaGuard\]/);
  assert.match(m, /loadComponent/);
});

test('el botón «Traer mi tienda» solo existe con la bandera storeMigrationImport (Mis sitios y Productos)', () => {
  const sitios = leer(raiz, 'components/sitios/lista/sitios-lista.component.html');
  assert.match(sitios, /\*ngIf="features\.isEnabled\('storeMigrationImport'\)"[^>]*traerMiTienda\(\)/);
  const prodHtml = leer(raiz, 'components/productos/productos.component.html');
  assert.match(prodHtml, /\*ngIf="traerTiendaActiva"/);
  assert.match(prodHtml, /Traer mi tienda/);
  const prodTs = leer(raiz, 'components/productos/productos.component.ts');
  assert.match(prodTs, /get traerTiendaActiva\(\): boolean \{\s*return this\.features\.isEnabled\('storeMigrationImport'\)/);
  for (const t of [sitios, prodHtml]) assert.equal((t.match(/\/migrar-tienda|traerMiTienda/g) || []).length > 0, true);
});

test('sin if por proveedor en la pantalla ni en el flujo', () => {
  for (const f of ['migrar-tienda.component.ts', 'pasos/paso-subir.component.ts', 'pasos/paso-simular.component.ts', 'pasos/paso-importar.component.ts', 'pasos/paso-reporte.component.ts', 'logica/flujo.ts', 'logica/textos.ts']) {
    const s = leer(dir, f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/['"`](shopify|woocommerce)['"`]/i.test(s), `${f} nombra un proveedor`);
  }
});

test('regla de diseño Katuq: sin degradados ni primarios paralelos, sin clases con «p-»', () => {
  const PROHIBIDOS = /#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea|#3b82f6|#1d4ed8|#6366f1|#1976d2|#7366ff|rgba\(102,\s*126,\s*234/i;
  for (const f of archivos) {
    const s = leer(dir, f);
    assert.equal((s.match(/(linear|radial)-gradient\(/g) || []).length, 0, `${f}: degradados`);
    assert.ok(!PROHIBIDOS.test(s), `${f}: primario paralelo`);
    assert.ok(!/fc-secondary|fs-24|btn-success|border-left/.test(s), `${f}: plantilla vieja`);
    for (const m of s.matchAll(/class="([^"]+)"/g)) {
      for (const clase of m[1].split(/\s+/)) {
        if (clase.startsWith('mt-') || clase.startsWith('cfg-')) assert.ok(!clase.includes('p-'), `${f}: clase con «p-»: ${clase}`);
      }
    }
  }
  const scss = leer(dir, 'migrar-tienda.component.scss');
  assert.match(scss, /@import '\.\.\/\.\.\/shared\/styles\/config-pagina'/);
  assert.match(scss, /@include config-pagina/);
  assert.match(scss, /h1\.cfg-titulo \{ font-size: 1\.5rem !important/);
  assert.match(scss, /:focus-visible/);
  assert.match(scss, /outline: 3px solid #7C5CFF !important/);
  assert.match(scss, /letter-spacing: normal/);
});

test('todo span con texto lleva clase con color y tamaño propios', () => {
  const clases = leer(dir, 'migrar-tienda.component.scss');
  for (const f of archivos.filter((a) => a.includes('pasos/'))) {
    for (const m of leer(dir, f).matchAll(/<span([^>]*)>/g)) {
      const cl = /class="([^"]+)"/.exec(m[1]);
      assert.ok(cl, `${f}: span sin clase`);
      for (const nombre of cl[1].split(/\s+/)) {
        assert.ok(clases.includes(nombre) || /^cfg-/.test(nombre), `${f}: ${nombre} sin estilo propio`);
      }
    }
  }
});

test('textos de la pantalla sin jerga técnica', () => {
  const jerga = /\b(dry-run|payload|endpoint|handle|upsert|batch|HTTP|JSON|SKU|migrationId|OFFER_|PLAN_LIMIT)\b/;
  for (const f of ['pasos/paso-subir.component.ts', 'pasos/paso-simular.component.ts', 'pasos/paso-importar.component.ts', 'pasos/paso-reporte.component.ts', 'logica/textos.ts']) {
    const s = leer(dir, f);
    const visibles = [...s.matchAll(/>([^<>{]*[A-Za-zÁ-ú][^<>{]*)</g)].map((m) => m[1]).concat([...s.matchAll(/etiqueta: '([^']+)'/g)].map((m) => m[1]));
    for (const t of visibles) assert.ok(!jerga.test(t), `${f}: «${t.trim()}»`);
  }
});

test('el reporte, INVENTORY_FAILED y los avisos de guardas están conectados a la pantalla', () => {
  const rep = leer(dir, 'pasos/paso-reporte.component.ts');
  assert.match(rep, /Descargar reporte \(CSV\)/);
  assert.match(rep, /avisoExistencias/);
  const sim = leer(dir, 'pasos/paso-simular.component.ts');
  assert.match(sim, /guardasBloqueantes/);
  assert.match(sim, /\[disabled\]="!puedeImportar"/);
  assert.match(sim, /sobrantes/);
  const c = leer(dir, 'migrar-tienda.component.ts');
  assert.match(c, /reporteCsv\(this\.totales\)/);
  assert.match(c, /avisoInventario\(t\)/);
  assert.match(c, /BodegaService/);
  assert.match(c, /s\.tipo === 'tienda'/);
});
