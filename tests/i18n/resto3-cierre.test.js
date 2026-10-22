'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B12c, tareas 13.2 a 13.7):
// NPS, agenda, soporte, superadmin, centro de operaciones, Kuvo, chat, provider-dashboard,
// registro (diagnostic-survey), maestros y las piezas compartidas de NPS, opinar, filtros y visor.
// Los textos de pantalla pasan al traductor; no se traducen los valores que se guardan (escala 0 a 10,
// estados, canales, preguntas por omisión de la encuesta, respuestas del diagnóstico). Node puro.

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
const CERRADAS = [
  'components/nps', 'components/agenda', 'components/soporte', 'components/superadmin', 'components/centro-operaciones',
  'components/kuvo', 'components/chat', 'components/provider-dashboard', 'components/diagnostic-survey', 'components/maestros',
  'shared/components/nps-pregunta', 'shared/components/nps-tarjeta', 'shared/components/escala-nps', 'shared/components/opinar-modal',
  'shared/components/selector-equipo', 'shared/components/filters', 'shared/components/dynamic-field', 'shared/components/visor-imagen',
  'shared/components/feather-icons',
];
const PREFIJO = /^(nps|agenda|soporte|superadmin|centroOperaciones|kuvo|chat|providerDashboard|diagnosticSurvey|maestros|npsPregunta|npsTarjeta|escalaNps|opinarModal|selectorEquipo|filters|dynamicField|visorImagen|featherIcons)\./;
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

test('13.6: cero textos sueltos y sin claves inexistentes en los módulos del bloque', () => {
  const r = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: CERRADAS });
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  assert.deepEqual(r.errores.filter(e => enCerrada(e.archivo || '')).map(e => `${e.tipo} ${e.archivo}:${e.linea}`), []);
  const abiertas = r.avisos.filter(h => h.tipo === 'claveInexistenteAbierta' && enCerrada(h.archivo));
  assert.deepEqual(abiertas.map(h => `${h.archivo}:${h.linea} ${h.clave}`), []);
});

test('13.6: las diecinueve carpetas están en modulosCerrados', () => {
  for (const c of CERRADAS) assert.ok(config.modulosCerrados.includes(c), `${c} cerrado`);
});

test('13.2/13.3: las claves que piden las pantallas existen en los cuatro idiomas con las mismas variables', () => {
  const usadas = new Set();
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/['"`]((?:[a-zA-Z]+)\.\w+\.[\w.]+)['"`]/g)) {
      if (PREFIJO.test(m[1]) && !m[1].endsWith('.')) usadas.add(m[1]);
    }
    for (const m of texto.matchAll(/['"`](comun\.\w+)['"`]/g)) {
      usadas.add(m[1]);
    }
  }
  assert.ok([...usadas].filter(k => PREFIJO.test(k)).length > 900, `${usadas.size} claves`);
  for (const clave of usadas) {
    if (/\.plural\.$/.test(clave)) continue;
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].trim().length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
  // Las claves que se arman en ejecución (prefijo + valor) existen para todos los valores posibles.
  for (const e of ['pendiente', 'haciendo', 'resuelto', 'archivado']) {
    for (const idioma of IDIOMAS) assert.ok(dics[idioma][`soporte.misTickets.plural.${e}`], `${idioma} plural ${e}`);
  }
  for (const e of ['requested', 'confirmed', 'completed', 'cancelled', 'no_show']) {
    assert.ok(leer('src/app/components/agenda/agenda.models.ts').includes(`${e}:`), e);
  }
});

test('13.4: ortografía del español en las claves nuevas', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => PREFIJO.test(k));
  assert.ok(nuevas.length > 900, `${nuevas.length} claves nuevas`);
  for (const [clave, valor] of nuevas) {
    assert.doesNotMatch(valor, /\.\.\./, `${clave}: usar «…»`);
    assert.doesNotMatch(valor, /[¡¿]\s|\s[!?]/, `${clave}: signos pegados`);
    assert.doesNotMatch(valor, /\b(querés|podés|tenés|revisá|asigná|corregí|creá|volvé|completá|elegí|escribí|mirá|avisá)\b/i, `${clave}: voseo`);
    assert.doesNotMatch(valor, /\b(configuracion|descripcion|informacion|sesion|aqui|facturacion|direccion)\b/i, `${clave}: sin tilde`);
  }
  for (const idioma of ['en', 'pt', 'de']) {
    for (const [clave, valor] of Object.entries(dics[idioma]).filter(([k]) => PREFIJO.test(k))) {
      assert.doesNotMatch(valor, /\.\.\./, `${idioma}: ${clave}`);
    }
  }
  assert.doesNotMatch(Object.entries(dics.de).filter(([k]) => PREFIJO.test(k)).map(([, v]) => v).join(' '), /ß/, 'de-CH sin eszett');
});

test('13.2: los valores que se guardan no pasan por el traductor', () => {
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    const t = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    assert.doesNotMatch(t, /\[(value|ngValue)\]="[^"]*\| translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /formControlName="[^"]*translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /\[\(ngModel\)\]="[^"]*translate/, path.relative(APP, archivo));
  }
  // Los mapas de NPS guardan la clave del texto; los valores del dato (segmento, canal, estado) no cambian.
  const nps = leer('src/app/components/nps/nps-comun.ts');
  assert.match(nps, /promotor: 'nps\.segmento\.promotor'/);
  assert.match(nps, /sin_solucion: 'nps\.estadoCaso\.sinSolucion'/);
  assert.match(nps, /ESTADOS_CASO: EstadoCaso\[\] = \['nuevo', 'contactado', 'resuelto', 'sin_solucion'\]/);
  // La pregunta por omisión de la encuesta y las respuestas del diagnóstico largo son dato: siguen en español.
  const editor = leer('src/app/components/nps/encuestas/encuesta-editor.component.ts');
  assert.match(editor, /¿qué tan probable es que le recomiendes \{comercio\} a un amigo\?/);
  const diag = leer('src/app/components/diagnostic-survey/diagnostic-survey.component.ts');
  assert.match(diag, /Opero 100% offline \(papel, Excel\)/);
  assert.match(diag, /valor: 'no_vendo'/);
  // Los estados de la agenda y los códigos de estado de los filtros no cambian.
  const agenda = leer('src/app/components/agenda/agenda.models.ts');
  assert.match(agenda, /requested: \{ texto: 'agenda\.estados\.solicitada', clase: 'ag-estado--solicitada' \}/);
  const filtros = leer('src/app/shared/components/filters/shared-filters.component.ts');
  for (const valor of ["'Pendiente'", "'Pospendiente'", "'PreAprobado'", "'SinProducir'", "'ProducidoTotalmente'", "'Despachado'"]) {
    assert.ok(filtros.includes(`value: ${valor}`), valor);
  }
});

test('13.3: servicios y modelos no usan el traductor; los componentes lo reciben como último parámetro', () => {
  for (const archivo of ARCHIVOS.filter(a => /\.service\.ts$|\.models?\.ts$/.test(a))) {
    assert.doesNotMatch(fs.readFileSync(archivo, 'utf8'), /TranslateService|translate\.instant/, path.relative(APP, archivo));
  }
  for (const archivo of ARCHIVOS.filter(a => /\.(component|guard)\.ts$/.test(a))) {
    const t = fs.readFileSync(archivo, 'utf8');
    if (!/this\.translate\.instant/.test(t)) continue;
    assert.match(t, /private translate: TranslateService,?\s*\)\s*\{/, `${path.relative(APP, archivo)} inyecta TranslateService al final`);
    assert.match(t, /import \{ TranslateService \} from '@ngx-translate\/core'/, path.relative(APP, archivo));
  }
  // Las funciones sueltas de NPS reciben el traductor como parámetro, no usan this.
  const acciones = leer('src/app/components/nps/encuestas/encuesta-acciones.ts');
  assert.doesNotMatch(acciones, /this\.translate/);
  assert.match(acciones, /tr: TranslateService/);
  // Cada módulo o componente independiente que pinta el pipe importa TranslateModule (o SharedModule).
  for (const html of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    if (!/\| translate/.test(fs.readFileSync(html, 'utf8'))) continue;
    const ts = html.replace(/\.html$/, '.ts');
    if (!fs.existsSync(ts)) continue;
    const t = fs.readFileSync(ts, 'utf8');
    if (/standalone: true/.test(t)) assert.match(t, /TranslateModule/, path.relative(APP, ts));
  }
});

test('13.2: los textos con cifras se arman con claves de parámetros, sin pegar fragmentos', () => {
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    const t = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    // «'clave' | translate) + algo» pega un fragmento sin su espacio: debe ser una clave con {{x}}.
    for (const m of t.matchAll(/\('([\w.]+)' \| translate\) \+ (?!'\s)/g)) {
      assert.fail(`${path.relative(APP, archivo)}: «${m[1]}» concatenado sin espacio`);
    }
  }
  const casos = [
    ['src/app/components/nps/encuestas/encuesta-editor.component.html', "'nps.encuestaEditor.opcionNDeLaPreguntaM' | translate:{j: (j + 1), i: (i + 1)}"],
    ['src/app/components/nps/resultados/resultados.component.html', "'nps.resultados.verLasNRespuestas' | translate:{n: a.respuestas?.length}"],
    ['src/app/components/agenda/config/agenda-config.component.html', "'agenda.agendaConfig.diaDesde' | translate:{dia: d.nombre}"],
    ['src/app/components/centro-operaciones/centro-operaciones.component.html', "'centroOperaciones.centroOperaciones.faltanN' | translate:{n: fmt(-b.saldo)}"],
    ['src/app/components/diagnostic-survey/diagnostic-survey.component.html', "'diagnosticSurvey.diagnosticSurvey.pasoNDeTotal' | translate:{n: (registrationIndex + 1), total: registrationQuestions.length}"],
    ['src/app/shared/components/filters/shared-filters.component.html', "'filters.sharedFilters.desdeFecha' | translate:{fecha: formatDateForDisplay(fechaInicialDate)}"],
  ];
  for (const [archivo, trozo] of casos) assert.ok(leer(archivo).includes(trozo), `${archivo}: ${trozo}`);
  assert.equal(dics.es['nps.resultados.verLasNRespuestas'], 'Ver las {{n}} respuestas');
  assert.equal(dics.en['nps.resultados.verLasNRespuestas'], 'See all {{n}} responses');
});

test('13.2: lo que ve el cliente final no cambia (WhatsApp al comprador, encuesta pública)', () => {
  const caso = leer('src/app/components/nps/seguimiento/caso.component.ts');
  assert.match(caso, /Hola\$\{nombre \? ' ' \+ nombre : ''\}, te escribimos/);
  assert.ok(!fs.existsSync(path.join(APP, 'components/encuesta-publica/.i18n-b12c')));
  const publica = leer('src/app/components/encuesta-publica/encuesta-publica.component.html');
  assert.doesNotMatch(publica, /nps\.|npsTarjeta\./, 'la encuesta pública no se toca en este bloque');
});

test('13.2: los listados de filtros y calendarios cambian con el idioma', () => {
  const ts = leer('src/app/shared/components/filters/shared-filters.component.ts');
  assert.match(ts, /onLangChange\.subscribe/);
  assert.match(ts, /ngOnDestroy\(\): void \{\s*this\.cambioIdioma\?\.unsubscribe\(\)/);
  assert.match(ts, /this\.translate\.instant\('primeng'\)/);
  for (const clave of ['hoy', 'manana', 'ayer', 'ultimos7Dias', 'ultimos30Dias', 'esteMes', 'mesPasado']) {
    for (const idioma of IDIOMAS) assert.ok(dics[idioma][`filters.sharedFilters.${clave}`], `${idioma} ${clave}`);
  }
  assert.equal(dics.en['filters.sharedFilters.ultimos7Dias'], 'Last 7 days');
  assert.equal(dics.pt['filters.sharedFilters.mesPasado'], 'Mês passado');
});
