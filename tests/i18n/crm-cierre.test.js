'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B05, tareas 6.1 a 6.7): Clientes y CRM.
// components/crm y components/prospect-manager pasan sus textos al traductor con claves crm.*,
// prospectManager.* y comun.*. Los valores que se guardan o se comparan (etapas, prioridades,
// fuentes, tipos) no cambian: solo su etiqueta. Node puro: lee plantillas, .ts y diccionarios.

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
const CERRADAS = ['components/crm', 'components/prospect-manager'];
const PREFIJOS = /^(crm|prospectManager|comun)\./;
const variables = v => [...String(v).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort();
const sinComentarios = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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

test('6.6: cero textos sueltos, sin errores y sin claves inexistentes en CRM y prospectos', () => {
  const r = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: CERRADAS });
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  assert.deepEqual(r.errores.map(e => `${e.tipo} ${e.archivo || ''}:${e.linea || ''} ${e.clave || e.mensaje}`), []);
  const inexistentes = r.avisos.filter(h => h.tipo === 'claveInexistenteAbierta'
    && CERRADAS.some(c => h.archivo.startsWith(`src/app/${c}/`)));
  assert.deepEqual(inexistentes.map(h => `${h.archivo}:${h.linea} ${h.clave}`), []);
});

test('6.6: los dos módulos están en modulosCerrados; los formularios de cliente de ventas no', () => {
  for (const c of CERRADAS) assert.ok(config.modulosCerrados.includes(c), `${c} cerrado`);
  assert.ok(!config.modulosCerrados.some(c => c.startsWith('components/ventas/clientes')), 'ventas/clientes queda en IDI-B03c');
});

test('6.2/6.3: las claves que piden las pantallas existen en los cuatro idiomas con las mismas variables', () => {
  const usadas = new Set();
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/['"`]((?:crm|prospectManager|comun)\.[\w.]+)['"`]/g)) { if (!m[1].endsWith('.') && m[1] !== 'prospectManager.prioridades') usadas.add(m[1]); }
  }
  assert.ok(usadas.size > 200, `${usadas.size} claves`);
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
});

test('6.4: ortografía del español en las claves nuevas', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => /^(crm|prospectManager)\./.test(k));
  assert.ok(nuevas.length > 400, `${nuevas.length} claves nuevas`);
  for (const [clave, valor] of nuevas) {
    assert.doesNotMatch(valor, /\.\.\./, `${clave}: «…»`);
    assert.doesNotMatch(valor, /[¡¿]\s|\s[!?]/, `${clave}: signos pegados`);
  }
});

test('6.2: los valores que se guardan no cambian; solo la etiqueta pasa por una clave', () => {
  const modelos = leer('src/app/components/crm/models/crm.models.ts');
  const parejas = [...modelos.matchAll(/label: '(crm\.opciones\.[\w.]+)', value: '(\w+)'/g)];
  assert.ok(parejas.length >= 14, `${parejas.length} opciones`);
  for (const [, clave, valor] of parejas) {
    assert.ok(clave.endsWith(`.${valor}`), `${clave} termina en el valor guardado ${valor}`);
    for (const i of IDIOMAS) assert.ok(dics[i][clave], `${i}: ${clave}`);
  }
  const valores = nombre => [...modelos.split(`export const ${nombre}`)[1].split('];')[0].matchAll(/value: '(\w+)'/g)].map(m => m[1]);
  assert.deepEqual(valores('ACTIVITY_TYPE_OPTIONS'), ['note', 'call', 'email', 'whatsapp', 'meeting']);
  assert.deepEqual(valores('TASK_TYPE_OPTIONS'), ['call', 'email', 'meeting', 'follow_up', 'other']);
  assert.deepEqual(valores('PRIORITY_OPTIONS'), ['low', 'medium', 'high', 'urgent']);
  const fuentes = leer('src/app/components/crm/components/lead-form-modal/lead-form-modal.component.ts');
  assert.deepEqual([...fuentes.matchAll(/crm\.opciones\.fuente\.\w+', value: '(\w+)'/g)].map(m => m[1]),
    ['social_media', 'referral', 'web', 'event', 'whatsapp', 'direct', 'other']);
});

test('6.2: el español que veía la persona se conserva en las claves de CRM', () => {
  const antes = {
    'crm.opciones.actividad.call': 'Llamada',
    'crm.opciones.actividad.meeting': 'Reunión',
    'crm.opciones.tarea.follow_up': 'Seguimiento',
    'crm.opciones.prioridad.urgent': 'Urgente',
    'crm.opciones.fuente.referral': 'Referido',
    'crm.opciones.fuente.web': 'Búsqueda web',
    'crm.opciones.fuente.event': 'Evento / feria',
    'crm.conversion.leadBloqueado': 'Lead bloqueado',
    'crm.conversion.ahoraEsCliente': '¡Ahora es cliente!',
    'crm.conversion.completaLosDatosDelCliente': 'Completa los datos del cliente',
    'crm.formulario.nuevoCorporativo': 'Nuevo corporativo',
  };
  for (const [clave, valor] of Object.entries(antes)) assert.equal(dics.es[clave], valor, clave);
});

test('6.2: la prioridad guardada de un prospecto (Alta, Media, Baja) se traduce al mostrarla', () => {
  for (const i of IDIOMAS) {
    for (const p of ['alta', 'media', 'baja']) assert.ok(dics[i][`prospectManager.prioridades.${p}`], `${i}: ${p}`);
  }
  assert.ok(config.prefijosDinamicos.includes('prospectManager.prioridades.'));
});
