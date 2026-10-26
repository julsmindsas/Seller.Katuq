'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B12d, tareas 13.2 a 13.7):
// empresas (consola de la plataforma, crear/editar empresa, módulos variables), roles y usuarios.
// Los textos de pantalla pasan al traductor; no se traducen los nombres de roles (se comparan en
// NavService), los permisos, los nombres de menú guardados en roles, los featureFlags ni lo que viaja
// a la API (`/v1/users/edit`). Node puro.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const RAIZ = path.resolve(__dirname, '../..');
const APP = path.join(RAIZ, 'src/app');
const IDIOMAS = ['es', 'en', 'pt', 'de'];
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const dics = Object.fromEntries(IDIOMAS.map(i => [i, JSON.parse(leer(`src/assets/i18n/${i}.json`))]));
const config = JSON.parse(leer('scripts/i18n-check.config.json'));
const CERRADAS = ['components/empresas', 'components/rol', 'components/usuarios'];
const PREFIJO = /^(empresas|rol|usuarios)\./;
const variables = v => [...String(v).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort();
const sinComentarios = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const enCerrada = ruta => CERRADAS.some(c => ruta.startsWith(`src/app/${c}/`));

function archivos(dir) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...archivos(ruta));
    else if (/\.(html|ts)$/.test(e.name) && !e.name.endsWith('.spec.ts')) res.push(ruta);
  }
  return res;
}
const ARCHIVOS = CERRADAS.flatMap(c => archivos(path.join(APP, c)));

test('13.6: cero textos sueltos y sin claves inexistentes en empresas, rol y usuarios', () => {
  const r = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: CERRADAS });
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  assert.deepEqual(r.errores.filter(e => enCerrada(e.archivo || '')).map(e => `${e.tipo} ${e.archivo}:${e.linea}`), []);
  const abiertas = r.avisos.filter(h => h.tipo === 'claveInexistenteAbierta' && enCerrada(h.archivo));
  assert.deepEqual(abiertas.map(h => `${h.archivo}:${h.linea} ${h.clave}`), []);
});

test('13.6: las tres carpetas están en modulosCerrados y en el bloque IDI-B12 Resto', () => {
  for (const c of CERRADAS) {
    assert.ok(config.modulosCerrados.includes(c), `${c} cerrado`);
    assert.ok(config.bloques['IDI-B12 Resto'].includes(c), `${c} en el bloque`);
  }
});

test('13.2/13.3: las claves que piden las pantallas existen en los cuatro idiomas con las mismas variables', () => {
  const usadas = new Set();
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/['"`]((?:[a-zA-Z]+)\.\w+\.[\w.]+)['"`]/g)) {
      if ((PREFIJO.test(m[1]) || /^comun\./.test(m[1])) && !m[1].endsWith('.')) usadas.add(m[1]);
    }
  }
  const propias = [...usadas].filter(k => PREFIJO.test(k));
  assert.ok(propias.length > 800, `${propias.length} claves propias`);
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].trim().length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
});

test('13.4: ortografía del español en las claves nuevas', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => PREFIJO.test(k));
  assert.ok(nuevas.length > 800, `${nuevas.length} claves nuevas`);
  for (const [clave, valor] of nuevas) {
    assert.doesNotMatch(valor, /\.\.\./, `${clave}: usar «…»`);
    assert.doesNotMatch(valor, /\b(querés|podés|tenés|revisá|asigná|ajustá|guardá|completá|elegí|armá|empezá|verificá|volvé)\b/i, `${clave}: voseo`);
    assert.doesNotMatch(valor, /\b(configuracion|descripcion|informacion|sesion|aqui|facturacion|direccion|exito|telefono)\b/i, `${clave}: sin tilde`);
    assert.ok((valor.match(/!/g) || []).length <= (valor.match(/¡/g) || []).length, `${clave}: signo de apertura ¡`);
  }
  for (const idioma of ['en', 'pt', 'de']) {
    for (const [clave, valor] of Object.entries(dics[idioma]).filter(([k]) => PREFIJO.test(k))) {
      assert.doesNotMatch(valor, /\.\.\./, `${idioma}: ${clave}`);
    }
  }
  assert.doesNotMatch(Object.entries(dics.de).filter(([k]) => PREFIJO.test(k)).map(([, v]) => v).join(' '), /ß/, 'de-CH sin eszett');
  // Faltas que había en las plantillas antes del bloque.
  const valores = new Set(nuevas.map(([, v]) => v));
  for (const malo of ['First name', 'Codigo Postal', 'Rotulo Dirección', 'Como llegar', 'Descripcion', 'Guardado con exito', 'Número de telefono fijo']) {
    assert.ok(!valores.has(malo), `ya no debe existir «${malo}»`);
  }
});

test('13.2: nombres de roles, permisos y valores que viajan a la API no pasan por el traductor', () => {
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    const t = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    assert.doesNotMatch(t, /\[(value|ngValue)\]="[^"]*\| translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /formControlName="[^"]*translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /\[\(ngModel\)\]="[^"]*translate/, path.relative(APP, archivo));
  }
  // «Super Administrador» y «Administrador» se comparan tal cual (NavService, ROLES_QUE_GUARDAN).
  const drop = leer('src/app/components/empresas/modulovariable/dropshipping/dropshipping-config.component.ts');
  assert.match(drop, /const ROLES_QUE_GUARDAN = \['Administrador', 'Super Administrador'\];/);
  assert.match(leer('src/app/shared/services/nav.service.ts'), /Super Administrador/);
  // Los nombres de menú guardados en el rol y la etiqueta Produccion del árbol de procesos se guardan: no cambian.
  assert.match(leer('src/app/components/rol/roles/roles.component.ts'), /title: 'Creación rápida', type: 'link'/);
  const procesos = leer('src/app/components/empresas/modulovariable/produccion/procesos/procesos.component.ts');
  assert.match(procesos, /label: 'Produccion'/);
  assert.match(procesos, /event\.node\.label !== 'Produccion'/);
  // El motivo de cortesía que se guarda sigue en español.
  assert.match(leer('src/app/components/empresas/consola/consola-plataforma.component.ts'), /'Empresa de Katuq \/ demo'/);
  // Los valores del selector de ruta de bienvenida (path) no cambian; solo la etiqueta.
  const crear = leer('src/app/components/usuarios/crear-usuarios/crear-usuarios.component.ts');
  for (const p of ['/welcome', '/pedidos', '/pos', '/productos', '/inventario', '/clientes', '/despachos', '/dashboards/builder']) {
    assert.ok(crear.includes(`path: '${p}'`), p);
  }
  assert.match(leer('src/app/components/usuarios/crear-usuarios/crear-usuarios.component.html'), /\[value\]="r\.path">\{\{ r\.label \| translate \}\}/);
  // Los valores del filtro de estado (true/false/null) y los modos de precio no cambian.
  const emp = leer('src/app/components/empresas/empresas.component.ts');
  assert.match(emp, /value: null/);
  assert.match(emp, /value: true/);
  assert.match(emp, /value: false/);
  for (const modo of ['unitario:', 'tipoCliente:', 'volumen:']) assert.ok(emp.includes(modo), modo);
});

test('13.3: servicios y modelos no usan el traductor; los componentes lo reciben como último parámetro', () => {
  for (const archivo of ARCHIVOS.filter(a => /\.service\.ts$|\.models?\.ts$|\/model\//.test(a))) {
    assert.doesNotMatch(fs.readFileSync(archivo, 'utf8'), /TranslateService|translate\.instant/, path.relative(APP, archivo));
  }
  // Ninguna llamada a /v1/users/edit ni servicio compartido cambia en este bloque.
  for (const s of ['src/app/shared/services/servicios.service.ts', 'src/app/shared/services/maestros/maestro.service.ts']) {
    assert.doesNotMatch(leer(s), /TranslateService|translate\.instant/, s);
  }
  for (const archivo of ARCHIVOS.filter(a => /\.component\.ts$/.test(a))) {
    const t = fs.readFileSync(archivo, 'utf8');
    if (!/this\.translate\.instant/.test(t)) continue;
    assert.match(t, /private translate: TranslateService,?\s*\)\s*\{/, `${path.relative(APP, archivo)} inyecta TranslateService al final`);
    assert.match(t, /import \{ TranslateService \} from '@ngx-translate\/core'/, path.relative(APP, archivo));
  }
  // El módulo de roles no importaba SharedModule: ahora importa TranslateModule para el pipe.
  assert.match(leer('src/app/components/rol/roles/roles.module.ts'), /TranslateModule/);
});

test('13.2: los textos que cambian con el idioma se arman con el idioma activo', () => {
  const emp = leer('src/app/components/empresas/empresas.component.ts');
  assert.match(emp, /translate\.onLangChange/);
  assert.match(emp, /armarEstadosActivo\(\)/);
});
