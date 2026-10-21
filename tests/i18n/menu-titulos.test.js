'use strict';

// D-532 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B01a, tareas 2.2 y 2.3). design.md D3, D4 y D9.
// - Excepción D3: los títulos del menú (nav.service.ts) siguen siendo claves literales en español. El
//   arreglo de títulos, encabezados, rutas e insignias es idéntico al tomado antes del bloque.
// - Cada título visible existe en es, en, pt y de; en en, pt y de está traducido (o en la lista permitida).
// - La ortografía se corrige solo en el valor de es.json.
// - Los aria-label armados por concatenación pasan a claves con parámetro; los nombres de idioma no se
//   traducen; «Próximamente» se traduce al mostrarse, no en el dato.
// - Favoritos y secciones plegadas se guardan por el título original, sin importar el idioma.
// Node puro: no compila Angular ni llama a la red.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const { extraerMenu, clavesVisibles, RAIZ } = require('./menu-titulos');
const { ejecutar } = require('../../scripts/i18n-check.js');

const IDIOMAS = ['es', 'en', 'pt', 'de'];
const dic = idioma => JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/assets/i18n', `${idioma}.json`), 'utf8'));
const dics = Object.fromEntries(IDIOMAS.map(i => [i, dic(i)]));
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const SNAPSHOT = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/menu-titulos.snapshot.json'), 'utf8'));

const SHELL = 'src/app/shared/components';
const PLANTILLAS = [
  `${SHELL}/sidebar/sidebar.component.html`,
  `${SHELL}/header/header.component.html`,
  `${SHELL}/header/elements/languages/languages.component.html`,
  `${SHELL}/header/elements/my-account/my-account.component.html`,
  `${SHELL}/header/elements/search/search.component.html`,
  `${SHELL}/header/elements/company-information/company-information.component.html`,
  `${SHELL}/bottom-navigation/bottom-navigation.component.html`,
  `${SHELL}/adaptive-navigation/adaptive-navigation.component.html`,
];
// Componentes de la plantilla Cuba que ninguna plantilla pinta (sin `<app-…>` en src/app). No se
// traducen en este bloque: se retiran en un cambio aparte (no es «solo textos»).
const SIN_USO = ['bookmark', 'cart', 'mega-menu', 'message-box', 'notification'].map(c => `${SHELL}/header/elements/${c}/`);

let informe;
const revisar = () => (informe ??= ejecutar({
  modulos: ['shared/components/header', 'shared/components/sidebar', 'shared/components/bottom-navigation',
    'shared/components/breadcrumb', 'shared/components/adaptive-navigation', 'shared/services/nav.service.ts'],
}));

// ---------------------------------------------------------------- 2.2 menú (excepción D3)

test('2.2 (D3): títulos, encabezados, rutas e insignias del menú idénticos al snapshot previo al bloque', () => {
  const { _nota, ...antes } = SNAPSHOT;
  assert.deepEqual(extraerMenu(), antes);
});

test('2.2 (D3): el código sigue comparando por el título en español', () => {
  const nav = leer('src/app/shared/services/nav.service.ts');
  assert.match(nav, /item\.title === "Mensajes"/);
  assert.match(nav, /badgeValue: "Próximamente"/, 'la insignia de los canales futuros sigue siendo el dato en español');
});

test('2.2: cada título visible del menú existe en es, en, pt y de con texto no vacío', () => {
  const claves = clavesVisibles();
  assert.ok(claves.length >= 120, `${claves.length} claves visibles`);
  for (const idioma of IDIOMAS) {
    const faltan = claves.filter(k => typeof dics[idioma][k] !== 'string' || !dics[idioma][k].trim());
    assert.deepEqual(faltan, [], `faltan en ${idioma}.json`);
  }
});

test('2.2: con el panel en inglés todo el menú visible está en inglés (i18n:check sin «igual al español»)', () => {
  const claves = new Set(clavesVisibles());
  const iguales = revisar().avisos.filter(h => h.tipo === 'igualAlEspanol' && claves.has(h.clave));
  assert.deepEqual(iguales.map(h => `${h.idioma}: ${h.clave}`), []);
  // Muestra fija del criterio: lo que más se ve del menú en inglés.
  const en = dics.en;
  assert.equal(en['Gestión Comercial'], 'Sales management');
  assert.equal(en['Venta asistida'], 'Assisted sale');
  assert.equal(en['Cotizaciones'], 'Quotes');
  assert.equal(en['Mi página web'], 'My website');
  assert.equal(en['Todos los pedidos'], 'All orders');
  assert.equal(en['Envíos y entregas'], 'Shipments and deliveries');
  assert.equal(en['Bodegas'], 'Warehouses');
  assert.equal(en['Configuración'], 'Settings');
  assert.equal(en['Próximamente'], 'Coming soon');
  assert.equal(en['NUEVO'], 'NEW');
});

test('2.2: glosario de D7 en los títulos del menú (pt-BR y de-CH)', () => {
  const { pt, de } = dics;
  assert.equal(pt['Cotizaciones'], 'Orçamentos');
  assert.equal(pt['Bodegas'], 'Depósitos');
  assert.equal(pt['Envíos y entregas'], 'Envios e entregas');
  assert.equal(pt['Inventario por bodega'], 'Estoque por depósito');
  assert.equal(de['Cotizaciones'], 'Offerten');
  assert.equal(de['Todos los pedidos'], 'Alle Bestellungen');
  assert.equal(de['Cartera (CxC)'], 'Debitoren');
  assert.equal(de['Facturación electrónica'], 'E-Rechnungen');
  for (const k of clavesVisibles()) assert.ok(!de[k].includes('ß'), `de-CH sin «ß»: ${k}`);
});

test('2.2: la ortografía se corrige solo en el valor de es.json (la clave no cambia)', () => {
  const es = dics.es;
  const esperado = {
    'Configuración Plataforma': 'Configuración plataforma',
    'Gestión Comercial': 'Gestión comercial',
    'Gestión General': 'Gestión general',
    'Inventarios y Productos': 'Inventarios y productos',
    'Central de Abastecimiento': 'Central de abastecimiento',
    'Inteligencia de Negocios': 'Inteligencia de negocios',
    'Activación Módulos': 'Activación módulos',
    'Mi Empresa': 'Mi empresa',
    'Tipos de Cliente': 'Tipos de cliente',
    'Descuentos y Promociones': 'Descuentos y promociones',
  };
  for (const [clave, valor] of Object.entries(esperado)) assert.equal(es[clave], valor, clave);
  const titulos = new Set(extraerMenu().MENUITEMS.flatMap(o => [o.title, o.headTitle1]).filter(Boolean));
  for (const clave of Object.keys(esperado)) assert.ok(titulos.has(clave), `«${clave}» sigue siendo el título en nav.service.ts`);
});

test('2.2 (receta, paso 4): en es.json el valor de cada título del menú solo cambia mayúsculas respecto de la clave', () => {
  // Solo ortografía, no redacción. Además, los buscadores del menú (sidebar y encabezado) comparan sin
  // distinguir mayúsculas contra la clave: así lo que el usuario lee en español se sigue encontrando.
  // «Dashboard» → «Tablero» ya estaba en es.json antes del bloque (lo comparten otras pantallas).
  const previos = { Dashboard: 'Tablero' };
  const es = dics.es;
  const distintos = clavesVisibles().filter(k => !(k in previos)
    && es[k].toLocaleLowerCase('es') !== k.toLocaleLowerCase('es'));
  assert.deepEqual(distintos.map(k => `${k} → ${es[k]}`), []);
  for (const [k, v] of Object.entries(previos)) assert.equal(es[k], v, k);
});

// ---------------------------------------------------------------- 2.3 plantillas del shell

test('2.3: ningún atributo arma una frase pegando español con + (claves con parámetro)', () => {
  const pegado = /(['"])[^'"]*[A-Za-zÁÉÍÓÚáéíóúñ][^'"]*\1\s*\+|\+\s*(['"])\s*\(?[A-Za-zÁÉÍÓÚáéíóúñ][^'"]*\2/;
  for (const rel of PLANTILLAS) {
    const lineas = leer(rel).split('\n');
    lineas.forEach((l, i) => {
      if (!/\[(attr\.)?[\w.-]+\]=|\{\{/.test(l)) return;
      // Concatenaciones de ids y clases (no son texto visible) quedan fuera.
      if (/\[(id|attr\.aria-controls|attr\.aria-labelledby|routerLink)\]=/.test(l)) return;
      assert.doesNotMatch(l, pegado, `${rel}:${i + 1}`);
    });
  }
  const sidebar = leer(`${SHELL}/sidebar/sidebar.component.html`);
  assert.match(sidebar, /'shell\.sidebar\.goTo' \| translate: \{ title: \(favorite\.title \| translate\) \}/);
  assert.match(sidebar, /'shell\.sidebar\.removeFavoriteNamed' \| translate/);
  assert.match(sidebar, /'shell\.sidebar\.openInMenu' \| translate/);
  assert.match(sidebar, /'shell\.sidebar\.externalLink' \| translate/);
});

test('2.3 (receta, paso 4): los textos del shell en español conservan su redacción; solo cambian tildes, mayúsculas, puntuación y plurales', () => {
  const es = dics.es;
  // Texto que mostraba la plantilla antes del bloque → valor en es.json.
  const esperado = {
    'shell.header.freePlanOrdersLeft.other': 'Plan gratuito — {{count}} pedidos restantes este mes', // «Plan Gratuito — N pedidos restantes este mes»
    'shell.header.freePlanOrdersLeft.one': 'Plan gratuito — {{count}} pedido restante este mes', // plural de D3 («1 pedidos»)
    'shell.sidebar.swipeToOpen': 'Deslizar para abrir menú',
    'shell.sidebar.hoverToShow': 'Pase el cursor para mostrar el menú',
    'shell.sidebar.goHome': 'Ir a inicio',
    'shell.sidebar.searchPlaceholder': 'Buscar menú…', // «Buscar menú...»
    'shell.sidebar.noResultsFor': 'Sin resultados para «{{term}}»', // comillas latinas
    'shell.sidebar.plan.title': 'Mi plan', // «Mi Plan»
    'shell.sidebar.plan.ordersRenew': 'Pedidos se renuevan',
    'shell.sidebar.plan.renewalDays.other': '{{date}} ({{days}} días)',
    'shell.sidebar.plan.renewalDays.one': '{{date}} ({{days}} día)', // plural de D3 («1 días»)
    'shell.adaptiveNav.backToMain': 'Volver a menú principal',
    'shell.adaptiveNav.mainMenu': 'Menú principal', // «Menú Principal»
    'shell.adaptiveNav.reportsSubtitle': 'Analytics y KPIs',
    'shell.adaptiveNav.ageSenior': 'Senior (51-70)',
  };
  for (const [clave, valor] of Object.entries(esperado)) assert.equal(es[clave], valor, clave);
});

test('2.3: el selector de idioma traduce su aria-label y no traduce los nombres de idioma', () => {
  const html = leer(`${SHELL}/header/elements/languages/languages.component.html`);
  assert.match(html, /\[attr\.aria-label\]="'shell\.languages\.selector' \| translate"/);
  assert.match(html, /'shell\.languages\.switchTo' \| translate: \{ language: lang\.language \}/);
  assert.match(html, /\{\{lang\.language\}\}/);
  assert.doesNotMatch(html, /lang\.language\s*\|\s*translate/);
  for (const idioma of IDIOMAS) assert.match(dics[idioma]['shell.languages.switchTo'], /\{\{language\}\}/, idioma);
});

test('2.3: «Próximamente» se traduce al mostrarse (plantilla y submenú flotante), no en el dato', () => {
  const html = leer(`${SHELL}/sidebar/sidebar.component.html`);
  assert.match(html, /badgeValue \| translate/);
  assert.match(html, /\{\{ 'Próximamente' \| translate \}\}/);
  assert.doesNotMatch(html, />\s*Próximamente\s*</);
  const sidebarTs = leer(`${SHELL}/sidebar/sidebar.component.ts`);
  assert.match(sidebarTs, /this\.translate\.instant\('Próximamente'\)/);
  assert.doesNotMatch(sidebarTs, /createText\('Próximamente'\)/);
});

test('2.3: las claves shell.* que usan las plantillas existen en los cuatro diccionarios con las mismas variables', () => {
  const usadas = new Set();
  const archivos = [...PLANTILLAS, ...PLANTILLAS.map(p => p.replace(/\.html$/, '.ts'))];
  for (const rel of archivos) {
    for (const m of leer(rel).matchAll(/'(shell\.[\w.]+)'/g)) usadas.add(m[1]);
  }
  assert.ok(usadas.size >= 60, `${usadas.size} claves shell.*`);
  const variables = v => [...String(v).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort();
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
});

test('2.3: cero textos sueltos en el shell de este bloque (salvo los componentes Cuba sin uso)', () => {
  const r = revisar();
  const sueltos = r.modulo.filter(s => !SIN_USO.some(c => s.archivo.startsWith(c)));
  assert.deepEqual(sueltos.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  const inexistentes = r.avisos.filter(h => h.tipo === 'claveInexistenteAbierta'
    && PLANTILLAS.some(p => h.archivo === p || h.archivo === p.replace(/\.html$/, '.ts')));
  assert.deepEqual(inexistentes.map(h => `${h.archivo}:${h.linea} ${h.clave}`), []);
  assert.deepEqual(r.errores, []);
});

test('2.3: los componentes Cuba sin uso siguen sin pintarse en ninguna plantilla', () => {
  const selectores = ['app-bookmark', 'app-cart', 'app-mega-menu', 'app-message-box', 'app-notification'];
  const encontrados = [];
  (function recorrer(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else if (/\.(html|ts)$/.test(e.name)) {
        const texto = fs.readFileSync(ruta, 'utf8');
        for (const s of selectores) if (new RegExp(`<${s}[\\s>]`).test(texto)) encontrados.push(`${path.relative(RAIZ, ruta)} ${s}`);
      }
    }
  })(path.join(RAIZ, 'src/app'));
  assert.deepEqual(encontrados, []);
});

// ---------------------------------------------------------------- submenú flotante del menú plegado (2.2)

test('2.2: el submenú flotante del menú plegado muestra los títulos y «Próximamente» en inglés, sin tocar el dato', () => {
  const archivo = path.join(RAIZ, `${SHELL}/sidebar/sidebar.component.ts`);
  const sf = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = sf.statements.find(ts.isClassDeclaration);
  const metodo = clase.members.find(m => m.name?.getText(sf) === 'showCollapsedSubmenu');
  const js = ts.transpileModule(`export class SubmenuPrueba { ${metodo.getText(sf)} }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const contexto = { exports: {}, window: { innerHeight: 900 }, document: { body: { children: [] } }, setTimeout: () => null };
  vm.runInNewContext(js, contexto);
  const sidebar = new contexto.exports.SubmenuPrueba();
  Object.assign(sidebar, {
    isMobile: () => false, closeCollapsedSubmenu() {}, getMenuIcon: () => 'fa-circle',
    rutaMenu: p => p, navigateAndCleanup() {},
    translate: { currentLang: 'en', instant: k => dics.en[k] ?? k },
    renderer: {
      createElement: tag => ({ tag, attrs: {}, children: [] }),
      createText: text => ({ text }), addClass() {}, removeClass() {}, setStyle() {},
      setAttribute: (el, key, value) => { el.attrs[key] = value; },
      appendChild: (el, child) => el.children && el.children.push(child),
      listen: () => () => {},
    },
  });
  const hijos = [
    { title: 'Todos los pedidos', path: 'ventas/pedidos', type: 'link' },
    { title: 'Cotizaciones', path: 'cotizaciones', type: 'link' },
    { title: 'TikTok', type: 'info', badgeValue: 'Próximamente' },
  ];
  const datoAntes = JSON.stringify(hijos);
  const padre = { getBoundingClientRect: () => ({ top: 100, right: 200 }) };
  sidebar.showCollapsedSubmenu({ title: 'Ventas', children: hijos }, { target: { closest: () => padre } });
  const textos = n => (n.text !== undefined ? [n.text] : (n.children || []).flatMap(textos));
  const entradas = sidebar.currentCollapsedSubmenu.children;
  assert.deepEqual(entradas.map(e => e.attrs.title), ['All orders', 'Quotes', 'TikTok']);
  assert.deepEqual(entradas.map(textos), [['All orders'], ['Quotes'], ['TikTok', 'Coming soon']]);
  assert.equal(JSON.stringify(hijos), datoAntes, 'el dato del menú sigue con la clave en español');
});

// ---------------------------------------------------------------- favoritos y secciones (criterio 2.2)

function cargarSidebar(guardado) {
  const archivo = path.join(RAIZ, `${SHELL}/sidebar/sidebar.component.ts`);
  const sf = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = sf.statements.find(ts.isClassDeclaration);
  const nombres = new Set(['toggleFavorite', 'isFavorite', 'saveFavoriteItems', 'toggleSection', 'saveSectionsState']);
  const miembros = clase.members.filter(m => nombres.has(m.name?.getText(sf)));
  assert.equal(miembros.length, nombres.size);
  const js = ts.transpileModule(`export class SidebarPrueba { ${miembros.map(m => m.getText(sf)).join('\n')} }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const contexto = { exports: {}, localStorage: { setItem: (k, v) => { guardado[k] = v; } } };
  vm.runInNewContext(js, contexto);
  return new contexto.exports.SidebarPrueba();
}

test('2.2: con el panel en inglés, favoritos y secciones plegadas se guardan por el título original', () => {
  const guardado = {};
  const sidebar = cargarSidebar(guardado);
  // Un traductor en inglés a mano: si algo guardara lo que se muestra, la prueba lo vería.
  sidebar.translate = { currentLang: 'en', instant: k => dics.en[k] ?? k };
  sidebar.favoriteItems = [];
  sidebar.toggleFavorite({ title: 'Todos los pedidos', path: 'ventas/pedidos', icon: 'list', type: 'link' });
  sidebar.toggleFavorite({ title: 'Cotizaciones', icon: 'file-text', type: 'sub', children: [{ title: 'Nueva cotización', path: 'cotizaciones/editor' }] });
  const favoritos = JSON.parse(guardado.sidebarFavoriteItems);
  assert.deepEqual(favoritos.map(f => f.title), ['Cotizaciones', 'Todos los pedidos']);
  assert.ok(sidebar.isFavorite({ title: 'Todos los pedidos', path: 'ventas/pedidos' }));

  sidebar.sections = [
    { title: 'Gestión Comercial', isHeaderSection: true, collapsed: true },
    { title: 'Operaciones', isHeaderSection: true, collapsed: true },
  ];
  sidebar.toggleSection(sidebar.sections[1]);
  assert.deepEqual(JSON.parse(guardado.sidebarSectionsState), { 'Gestión Comercial': true, Operaciones: false });
});
