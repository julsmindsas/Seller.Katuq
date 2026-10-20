'use strict';
/**
 * Atributos por categoría (D-495, ticket 1234): lógica pura de las pantallas.
 * src/app/shared/services/catalogo/atributos-editor.ts
 *
 * Qué protege:
 *  1. El modal de Maestros: clave a partir del nombre, opciones, limpieza de lo que
 *     se manda y los errores que el servidor seguro rechaza (heredado, repetido, 30).
 *  2. La pestaña «Especificaciones»: solo se manda lo que cambió (vaciar = null) y un
 *     valor que el formulario no supo mostrar no se borra.
 *  3. Los mensajes de error (409 = recargar; 400 = detalle por campo).
 *
 *   node --test tests/productos/atributos-editor.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const e = require('../../src/app/shared/services/catalogo/atributos-editor.ts');
const espejo = require('../../src/app/shared/services/catalogo/atributos-categoria.ts');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/atributos-esquemas.json'), 'utf8'));
const routers = () => espejo.esquemaEfectivo(FIXTURE.schemas, 'networking > routers');

test('clave desde el nombre: sin tildes, minúscula, empieza por letra, máximo 40 y sin chocar', () => {
  assert.equal(e.claveDesdeEtiqueta('Tecnología WiFi', []), 'tecnologia_wifi');
  assert.equal(e.claveDesdeEtiqueta('Tecnología WiFi', ['tecnologia_wifi']), 'tecnologia_wifi_2');
  assert.equal(e.claveDesdeEtiqueta('5 GHz', []), 'a_5_ghz');
  assert.equal(e.claveDesdeEtiqueta('   ', []), 'atributo');
  const larga = e.claveDesdeEtiqueta('x'.repeat(80), ['x'.repeat(40)]);
  assert.ok(larga.length <= 40 && espejo.PATRON_CLAVE.test(larga), larga);
});

test('opciones desde el texto: por coma o renglón, sin repetidas ni vacías', () => {
  assert.deepEqual(e.opcionesDesdeTexto('WiFi 5, WiFi 6,\n wifi 6 ,, WiFi 6E'), ['WiFi 5', 'WiFi 6', 'WiFi 6E']);
});

test('limpiarDefinicion: opciones solo en listas, unidad solo en números, sin campos de edición', () => {
  const lista = e.limpiarDefinicion({ ...e.nuevaDefinicion(1), key: 'wifi', label: ' WiFi ', type: 'option', opcionesTexto: 'A, B', unit: 'cm' }, 3);
  assert.deepEqual(lista, { key: 'wifi', label: 'WiFi', type: 'option', required: false, filterable: false, comparable: false, section: 'specs', order: 3, options: ['A', 'B'], multiple: false });
  const numero = e.limpiarDefinicion({ ...e.nuevaDefinicion(1), key: 'vel', label: 'Velocidad', type: 'number', unit: ' Mbps ', opcionesTexto: 'x' }, 1);
  assert.equal(numero.unit, 'Mbps');
  assert.ok(!('options' in numero) && !('nueva' in numero) && !('opcionesTexto' in numero));
});

test('erroresLocales: heredado con otro tipo, repetida, sin nombre, lista vacía y el tope de 30', () => {
  const heredadas = espejo.esquemaEfectivo(FIXTURE.schemas, 'networking > routers > wifi 6').filter((d) => d.heredado);
  const propias = [
    { ...e.nuevaDefinicion(1), key: 'tecnologia_wifi', label: 'WiFi', type: 'number' },
    { ...e.nuevaDefinicion(2), key: 'banda', label: 'Banda', type: 'option', opcionesTexto: '' },
    { ...e.nuevaDefinicion(3), key: 'banda', label: '', type: 'text' },
  ];
  const errores = e.erroresLocales(propias, heredadas).map((x) => x.mensaje);
  assert.ok(errores.some((m) => /no se puede cambiar su tipo/.test(m)));
  assert.ok(errores.some((m) => /al menos una opción/.test(m)));
  assert.ok(errores.some((m) => /repetida/.test(m)));
  assert.ok(errores.some((m) => /Ponle un nombre/.test(m)));
  const muchas = Array.from({ length: 30 }, (_, i) => ({ ...e.nuevaDefinicion(i), key: `k${i}`, label: `K${i}` }));
  assert.ok(e.erroresLocales(muchas, heredadas).some((x) => x.indice === -1 && /30/.test(x.mensaje)));
  assert.deepEqual(e.erroresLocales([{ ...e.nuevaDefinicion(1), key: 'banda', label: 'Banda', type: 'option', opcionesTexto: '2.4, 5' }], heredadas), []);
});

test('vista previa: primero lo heredado, con un ejemplo por tipo y la unidad', () => {
  const filas = e.vistaPrevia(routers().filter((d) => d.heredado), [{ ...e.nuevaDefinicion(1), key: 'mesh', label: 'Mesh', type: 'boolean', section: 'compatibility' }]);
  assert.deepEqual(filas.map((f) => [f.etiqueta, f.ejemplo, f.unidad, f.seccion, f.heredado]), [
    ['Tecnología WiFi', 'WiFi 5', '', 'Especificaciones', true],
    ['Velocidad', '10', 'Mbps', 'Especificaciones', true],
    ['Mesh', 'Sí', '', 'Compatibilidad', false],
  ]);
});

test('valores del producto: se carga lo válido y se manda solo lo que cambió (vaciar = null)', () => {
  const esquema = routers();
  const guardados = { tecnologia_wifi: 'WiFi 6', velocidad: 1200, sistemas: ['Windows', 'BeOS'], modelo: 'X', mesh: 'quizá', color_carcasa: 'Negro' };
  const iniciales = e.valoresIniciales(esquema, guardados);
  assert.deepEqual(iniciales, { tecnologia_wifi: 'WiFi 6', velocidad: 1200, puertos_lan: null, mesh: null, sistemas: ['Windows'], modelo: 'X' });
  const formulario = { ...iniciales, velocidad: '1500', modelo: '', puertos_lan: 4 };
  assert.deepEqual(e.valoresParaGuardar(esquema, formulario, iniciales), { velocidad: 1500, puertos_lan: 4, modelo: null });
  assert.deepEqual(e.valoresParaGuardar(esquema, iniciales, iniciales), {}, 'sin cambios no se manda nada');
  assert.deepEqual(e.obligatoriosFaltantes(esquema, { ...iniciales, tecnologia_wifi: '' }), ['Tecnología WiFi']);
});

test('renombres del árbol: solo los nodos que existían y cambiaron de ruta, los más profundos primero', () => {
  const arbol = JSON.parse(JSON.stringify(FIXTURE.arbol));
  const originales = new WeakMap();
  e.rutasPorNodo(arbol).forEach((ruta, nodo) => originales.set(nodo, ruta));
  // Renombrar "Networking" a "Redes" cambia la ruta de toda su rama.
  arbol[0].data.nombre = 'Redes';
  arbol[0].children[0].data.nombre = 'Enrutadores';
  // Una categoría nueva no es un renombre; cambiar solo mayúsculas tampoco.
  arbol.push({ data: { nombre: 'Ofertas' }, children: [] });
  arbol[1].data.nombre = 'ACCESORIOS';
  const r = e.renombresDelArbol(arbol, originales);
  assert.deepEqual(r[0], { de: ['Networking', 'Routers', 'WiFi 6'], a: ['Redes', 'Enrutadores', 'WiFi 6'] });
  assert.ok(r.some((x) => x.de.join('>') === 'Networking>Routers' && x.a.join('>') === 'Redes>Enrutadores'));
  assert.ok(r.some((x) => x.de.join('>') === 'Networking' && x.a.join('>') === 'Redes'));
  assert.ok(!r.some((x) => x.a.includes('Ofertas')));
  assert.ok(!r.some((x) => x.a.includes('ACCESORIOS')), 'mismas claves: no es renombre');
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].de.length >= r[i].de.length, 'más profundos primero');
});

test('mensajes de error: 409 pide recargar, 400 muestra el detalle, sin conexión', () => {
  assert.match(e.mensajeDeError({ status: 409, error: { code: 'VERSION_CONFLICT' } }), /Recarga/);
  assert.equal(e.mensajeDeError({ status: 400, error: { invalidos: [{ mensaje: '«Tecnología WiFi» debe ser una de: WiFi 5.' }] } }), '«Tecnología WiFi» debe ser una de: WiFi 5.');
  assert.equal(e.mensajeDeError({ status: 400, error: { errores: [{ mensaje: 'A.' }, { mensaje: 'B.' }] } }), 'A. B.');
  assert.match(e.mensajeDeError({ status: 0 }), /conexión/);
  assert.equal(e.mensajeDeError({ status: 403, error: { message: 'Esta función todavía no está activa.' } }), 'Esta función todavía no está activa.');
});
