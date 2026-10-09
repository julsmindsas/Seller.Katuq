'use strict';
/**
 * Ficha del producto desde UNA foto — parte pura del front
 * (src/app/shared/services/productos/ficha-desde-foto.mapper.ts).
 *
 * Qué protege:
 *  1. Que se rellenen SOLO los campos vacíos; un campo con algo escrito se
 *     respeta salvo que la persona autorice reemplazarlo (una sola pregunta).
 *  2. Que NUNCA se toque un precio: ni la ficha ni el plan de relleno lo traen.
 *  3. Que la categoría solo se marque si existe de verdad en el árbol del comercio
 *     (formulario rápido: opciones planas; completo: el nodo REAL del selector).
 *  4. Que lo que el comercio lee no tenga jerga ni errores técnicos.
 *  5. Que la foto se trate bien: qué se rechaza, cuándo se usa la original y cómo
 *     se reduce.
 *
 *   node --test tests/productos/ficha-desde-foto.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const m = require('../../src/app/shared/services/productos/ficha-desde-foto.mapper.ts');

const CATEGORIA_VELAS = { nombre: 'Velas', ruta: ['Hogar', 'Velas'], etiqueta: 'Hogar › Velas' };

/** Lo que devuelve el servidor, ya normalizado. */
function ficha(extra = {}) {
  return {
    nombre: 'Vela aromática de lavanda',
    descripcion: 'Una vela suave y cálida para el hogar.\n\nEl frasco de vidrio la hace elegante.',
    categoria: CATEGORIA_VELAS,
    colores: ['lila', 'transparente'],
    material: 'vidrio y cera',
    etiquetasSeo: ['vela aromática', 'lavanda', 'decoración del hogar'],
    imagenSinFondo: null,
    ...extra,
  };
}

/** Un formulario completamente vacío. */
function formularioVacio(extra = {}) {
  return {
    titulo: '',
    descripcion: '',
    categoria: null,
    caracteristicas: '',
    etiquetas: [],
    tieneImagenPrincipal: false,
    ...extra,
  };
}

// ── normalizarFicha ──────────────────────────────────────────────────────────

test('normalizarFicha deja la respuesta del servidor en la forma de los formularios', () => {
  const n = m.normalizarFicha({
    nombre: '  Vela aromática ',
    descripcion: ' Una vela. ',
    categoria: { nombre: 'Velas', ruta: ['Hogar', 'Velas'], etiqueta: 'Hogar › Velas' },
    colores: ['lila', ' ', 7, 'azul'],
    material: ' vidrio ',
    etiquetasSeo: ['vela', null, 'lavanda'],
    imagenSinFondo: null,
  });
  assert.deepEqual(n, {
    nombre: 'Vela aromática',
    descripcion: 'Una vela.',
    categoria: CATEGORIA_VELAS,
    colores: ['lila', 'azul'],
    material: 'vidrio',
    etiquetasSeo: ['vela', 'lavanda'],
    imagenSinFondo: null,
  });
});

test('normalizarFicha sin nombre o con algo que no es un objeto no es una ficha', () => {
  for (const crudo of [null, undefined, 'texto', 42, [], {}, { nombre: '' }, { nombre: '   ' }, { nombre: 7 }]) {
    assert.equal(m.normalizarFicha(crudo), null, JSON.stringify(crudo));
  }
});

test('normalizarFicha tolera campos faltantes o de otro tipo sin romper', () => {
  const n = m.normalizarFicha({ nombre: 'Producto', descripcion: 5, categoria: 'texto', colores: 'rojo', material: 3, etiquetasSeo: {} });
  assert.deepEqual(n, {
    nombre: 'Producto',
    descripcion: '',
    categoria: null,
    colores: [],
    material: null,
    etiquetasSeo: [],
    imagenSinFondo: null,
  });
});

test('normalizarFicha completa la categoría si el servidor mandó solo la etiqueta', () => {
  const n = m.normalizarFicha({ nombre: 'P', categoria: { etiqueta: 'Hogar › Velas' } });
  assert.deepEqual(n.categoria, { nombre: 'Velas', ruta: ['Hogar', 'Velas'], etiqueta: 'Hogar › Velas' });
  assert.equal(m.normalizarFicha({ nombre: 'P', categoria: { etiqueta: '   ' } }).categoria, null);
});

test('normalizarFicha NUNCA deja pasar un precio ni nada fuera de la lista', () => {
  const n = m.normalizarFicha({ ...ficha(), precio: 59900, precioUnitarioSinIva: 50336, costo: 1, sku: 'X' });
  assert.deepEqual(Object.keys(n).sort(), ['categoria', 'colores', 'descripcion', 'etiquetasSeo', 'imagenSinFondo', 'material', 'nombre']);
  assert.ok(!/59900|50336/.test(JSON.stringify(n)));
});

test('imagenSinFondo solo se acepta si es una imagen en data URL', () => {
  assert.equal(m.normalizarFicha({ ...ficha(), imagenSinFondo: 'https://x.co/a.png' }).imagenSinFondo, null);
  assert.equal(m.normalizarFicha({ ...ficha(), imagenSinFondo: 'javascript:alert(1)' }).imagenSinFondo, null);
  assert.equal(m.normalizarFicha({ ...ficha(), imagenSinFondo: 'data:image/png;base64,QUJD' }).imagenSinFondo, 'data:image/png;base64,QUJD');
});

// ── Relleno: solo lo vacío ───────────────────────────────────────────────────

test('con el formulario vacío todo se llena sin preguntar', () => {
  const plan = m.planificarFicha(formularioVacio(), ficha());
  assert.deepEqual(plan.vacios, ['titulo', 'descripcion', 'categoria', 'caracteristicas', 'etiquetas', 'imagen']);
  assert.deepEqual(plan.conflictos, []);
  assert.deepEqual(m.camposAAplicar(plan, 'vacios'), plan.vacios);
  assert.deepEqual(m.camposAAplicar(plan, 'todo'), plan.vacios);
});

test('un campo con algo escrito se respeta: va a conflictos y NO se escribe si solo se llenan los vacíos', () => {
  const plan = m.planificarFicha(
    formularioVacio({ titulo: 'Mi vela', descripcion: 'La hice yo', tieneImagenPrincipal: true }),
    ficha(),
  );
  assert.deepEqual(plan.conflictos, ['titulo', 'descripcion', 'imagen']);
  assert.deepEqual(plan.vacios, ['categoria', 'caracteristicas', 'etiquetas']);
  assert.deepEqual(m.camposAAplicar(plan, 'vacios'), ['categoria', 'caracteristicas', 'etiquetas']);
  assert.deepEqual(m.camposAAplicar(plan, 'todo'), ['titulo', 'descripcion', 'categoria', 'caracteristicas', 'etiquetas', 'imagen']);
});

test('si el campo ya dice lo mismo (aunque cambien tildes, mayúsculas o espacios) no hay nada que cambiar', () => {
  const plan = m.planificarFicha(
    formularioVacio({
      titulo: '  VELA AROMATICA   de lavanda ',
      categoria: 'hogar > velas',
      caracteristicas: 'material: vidrio y cera. colores: lila y transparente.',
      etiquetas: ['Vela Aromática', 'LAVANDA', 'decoracion del hogar'],
    }),
    ficha(),
  );
  assert.ok(!plan.vacios.includes('titulo') && !plan.conflictos.includes('titulo'));
  assert.ok(!plan.vacios.includes('categoria') && !plan.conflictos.includes('categoria'));
  assert.ok(!plan.vacios.includes('caracteristicas') && !plan.conflictos.includes('caracteristicas'));
  assert.ok(!plan.vacios.includes('etiquetas') && !plan.conflictos.includes('etiquetas'));
});

test('lo que la ficha no trae no se menciona (ni se borra nada)', () => {
  const sinNada = ficha({ descripcion: '', categoria: null, colores: [], material: null, etiquetasSeo: [] });
  const plan = m.planificarFicha(
    formularioVacio({ titulo: 'El mío', descripcion: 'La mía', categoria: 'Ropa', caracteristicas: 'Algo', etiquetas: ['a'], tieneImagenPrincipal: true }),
    sinNada,
  );
  // Solo el título y la imagen tienen propuesta; los demás campos ni se mencionan, así que no se pueden pisar.
  assert.deepEqual(plan.vacios, []);
  assert.deepEqual(plan.conflictos, ['titulo', 'imagen']);
  assert.deepEqual(m.camposAAplicar(plan, 'vacios'), []);
  for (const campo of ['descripcion', 'categoria', 'caracteristicas', 'etiquetas']) {
    assert.ok(![...plan.vacios, ...plan.conflictos].includes(campo), `${campo} no debía mencionarse`);
  }
});

test('la descripción vacía del editor (HTML sin texto, o el marcador «Descripcion») cuenta como vacía', () => {
  for (const html of ['', '<p></p>', '<p>&nbsp;</p>', '<p><br></p>', '   ', '<p>Descripcion</p>', null, undefined]) {
    const plan = m.planificarFicha(formularioVacio({ descripcion: html }), ficha());
    assert.ok(plan.vacios.includes('descripcion'), `"${html}" debía contar como vacía`);
  }
  const plan = m.planificarFicha(formularioVacio({ descripcion: '<p>Mi texto <strong>propio</strong></p>' }), ficha());
  assert.ok(plan.conflictos.includes('descripcion'));
});

test('etiquetas: si ya hay otras se pregunta, y al aceptar se SUMAN sin quitar las de la persona', () => {
  const plan = m.planificarFicha(formularioVacio({ etiquetas: ['regalo', 'Lavanda'] }), ficha());
  assert.ok(plan.conflictos.includes('etiquetas'));
  const unidas = m.unirEtiquetas(['regalo', 'Lavanda'], plan.valores.etiquetas);
  assert.deepEqual(unidas, ['regalo', 'Lavanda', 'vela aromática', 'decoración del hogar']);
});

test('el plan trae solo lo que se escribe en el formulario: ningún precio', () => {
  const plan = m.planificarFicha(formularioVacio(), m.normalizarFicha({ ...ficha(), precio: 59900, price: 1 }));
  assert.deepEqual(Object.keys(plan.valores).sort(), ['caracteristicas', 'categoria', 'descripcion', 'etiquetas', 'titulo']);
  assert.ok(!/precio|price|valor|iva/i.test(Object.keys(plan.valores).join(',')));
  assert.deepEqual(m.ORDEN_CAMPOS, ['titulo', 'descripcion', 'categoria', 'caracteristicas', 'etiquetas', 'imagen']);
});

test('resumenDeRelleno dice qué se llenó y qué se dejó como estaba, en lenguaje de negocio', () => {
  assert.equal(
    m.resumenDeRelleno(['titulo', 'descripcion', 'categoria'], []),
    'Listo: llenamos título, descripción y categoría. Revise y corrija lo que haga falta antes de guardar.',
  );
  assert.equal(
    m.resumenDeRelleno(['titulo'], ['descripcion', 'imagen']),
    'Listo: llenamos título. Revise y corrija lo que haga falta antes de guardar. Dejamos como estaba: descripción e imagen principal.',
  );
  assert.match(m.resumenDeRelleno([], ['titulo']), /No cambiamos nada/);
  assert.equal(m.resumenDeRelleno([], []), 'La foto no trajo datos nuevos para este formulario.');
  assert.equal(m.nombresDeCampos(['etiquetas', 'imagen']), 'etiquetas de búsqueda e imagen principal');
});

test('resumenDeRelleno avisa cuando la categoría hay que elegirla a mano', () => {
  const aviso = 'No encontramos una categoría de su tienda que calce con la foto: elíjala usted.';
  assert.ok(m.resumenDeRelleno(['titulo'], [], { sinCategoria: true }).endsWith(aviso));
  assert.ok(m.resumenDeRelleno(['titulo'], [], { sinAplicar: ['categoria'] }).endsWith(aviso));
  assert.ok(m.resumenDeRelleno([], [], { sinAplicar: ['categoria'] }).endsWith(aviso), 'sin nada más que decir, igual avisa');
  assert.doesNotMatch(m.resumenDeRelleno(['titulo'], [], {}), /categoría de su tienda/);
});

test('planificarFicha marca sinCategoria solo si la ficha no trajo categoría Y el formulario no tiene una', () => {
  const sinCat = ficha({ categoria: null });
  assert.equal(m.planificarFicha(formularioVacio(), sinCat).sinCategoria, true);
  assert.equal(m.planificarFicha(formularioVacio({ categoria: 'Ropa' }), sinCat).sinCategoria, false, 'ya tiene una elegida');
  assert.equal(m.planificarFicha(formularioVacio(), ficha()).sinCategoria, false, 'la ficha trajo una');
});

// ── Textos ───────────────────────────────────────────────────────────────────

test('construirCaracteristicas junta material y colores', () => {
  assert.equal(m.construirCaracteristicas({ material: 'cuero', colores: ['negro', 'café'] }), 'Material: cuero. Colores: negro y café.');
  assert.equal(m.construirCaracteristicas({ material: null, colores: ['rojo'] }), 'Color: rojo.');
  assert.equal(m.construirCaracteristicas({ material: 'madera', colores: [] }), 'Material: madera.');
  assert.equal(m.construirCaracteristicas({ material: null, colores: [] }), '');
});

test('listaEnEspanol usa "y", y "e" delante de un sonido "i"', () => {
  assert.equal(m.listaEnEspanol([]), '');
  assert.equal(m.listaEnEspanol(['rojo']), 'rojo');
  assert.equal(m.listaEnEspanol(['rojo', 'negro']), 'rojo y negro');
  assert.equal(m.listaEnEspanol(['rojo', 'negro', 'beige']), 'rojo, negro y beige');
  assert.equal(m.listaEnEspanol(['azul', 'índigo']), 'azul e índigo');
  assert.equal(m.listaEnEspanol(['cobre', 'hierro']), 'cobre y hierro');
  assert.equal(m.listaEnEspanol(['cobre', 'hilo']), 'cobre e hilo');
});

test('textoAHtml escapa el texto: lo que escriba la IA nunca se vuelve HTML', () => {
  assert.equal(m.textoAHtml('Uno.\n\nDos.'), '<p>Uno.</p><p>Dos.</p>');
  assert.equal(
    m.textoAHtml('<script>alert(1)</script> & "comillas"'),
    '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;comillas&quot;</p>',
  );
  assert.equal(m.textoAHtml(''), '');
});

test('htmlATexto devuelve el texto visible', () => {
  assert.equal(m.htmlATexto('<p>Hola&nbsp;<strong>mundo</strong></p><p>Otra &amp; más</p>'), 'Hola mundo Otra & más');
  assert.equal(m.htmlATexto(null), '');
});

test('unirEtiquetas respeta el tope y nunca quita una etiqueta propia', () => {
  const nuevas = Array.from({ length: 20 }, (_, i) => `etiqueta ${i}`);
  assert.equal(m.unirEtiquetas([], nuevas).length, m.MAX_ETIQUETAS);
  const muchasPropias = Array.from({ length: 12 }, (_, i) => `propia ${i}`);
  assert.deepEqual(m.unirEtiquetas(muchasPropias, nuevas), muchasPropias, 'ya pasaba el tope: no se quita nada ni se agrega');
  assert.deepEqual(m.unirEtiquetas(['Vela', 'VELA', ' vela '], ['velá']), ['Vela'], 'sin repetidos aunque cambien tildes, mayúsculas o espacios');
});

test('normalizar compara sin tildes, con tildes sueltas y con espacios raros', () => {
  const tildeSuelta = String.fromCharCode(0x301); // una "´" que va aparte de la letra (texto copiado de otros programas)
  assert.equal(m.normalizar(`Decoracio${tildeSuelta}n   DEL  Hogar `), 'decoracion del hogar');
  assert.equal(m.normalizar('Decoración del hogar'), 'decoracion del hogar');
  assert.equal(m.normalizar(null), '');
  assert.equal(m.claveCategoria('Hogar  ›  Velas'), 'hogar > velas');
  assert.equal(m.claveCategoria('HOGAR → velas'), 'hogar > velas');
});

// ── Categoría: formulario rápido (opciones planas) ───────────────────────────

const OPCIONES = [
  { etiqueta: 'Hogar', nodo: { id: 1 } },
  { etiqueta: 'Hogar › Velas', nodo: { id: 2 } },
  { etiqueta: 'Ropa › Accesorios', nodo: { id: 3 } },
  { etiqueta: 'Calzado › Accesorios', nodo: { id: 4 } },
  { etiqueta: 'Ropa › Camisetas', nodo: { id: 5 } },
];

test('buscarOpcionPlana encuentra la categoría por ruta, sin importar tildes, mayúsculas ni flecha', () => {
  assert.equal(m.buscarOpcionPlana(OPCIONES, CATEGORIA_VELAS).nodo.id, 2);
  assert.equal(m.buscarOpcionPlana(OPCIONES, { nombre: 'Velas', ruta: ['HOGAR', 'VELAS'], etiqueta: 'hogar > velas' }).nodo.id, 2);
  assert.equal(m.buscarOpcionPlana(OPCIONES, { nombre: 'Camisetas', ruta: ['Ropa', 'Camisetas'], etiqueta: 'Ropa › Camisetas' }).nodo.id, 5);
});

test('buscarOpcionPlana: por el último tramo solo si identifica UNA opción; nunca inventa', () => {
  assert.equal(m.buscarOpcionPlana(OPCIONES, { nombre: 'Camisetas', ruta: ['Camisetas'], etiqueta: 'Camisetas' }).nodo.id, 5);
  assert.equal(m.buscarOpcionPlana(OPCIONES, { nombre: 'Accesorios', ruta: ['Accesorios'], etiqueta: 'Accesorios' }), null, 'ambigua');
  assert.equal(m.buscarOpcionPlana(OPCIONES, { nombre: 'Mascotas', ruta: ['Mascotas'], etiqueta: 'Mascotas' }), null);
  assert.equal(m.buscarOpcionPlana([], CATEGORIA_VELAS), null);
  assert.equal(m.buscarOpcionPlana(OPCIONES, null), null);
});

// ── Categoría: formulario completo (árbol del selector) ──────────────────────

function arbolDelSelector() {
  const hogar = { label: 'Hogar', data: { nombre: 'Hogar' }, parent: null, children: [] };
  const velas = { label: 'Velas', data: { nombre: 'Velas' }, parent: hogar, children: [] };
  const aromas = { label: 'Aromas', data: { nombre: 'Aromas' }, parent: hogar, children: [] };
  hogar.children.push(velas, aromas);

  const ropa = { label: 'Ropa', data: { nombre: 'Ropa' }, parent: null, children: [] };
  const accRopa = { label: 'Accesorios', data: { nombre: 'Accesorios' }, parent: ropa, children: [] };
  ropa.children.push(accRopa);
  const calzado = { label: 'Calzado', data: { nombre: 'Calzado' }, parent: null, children: [] };
  const accCalzado = { label: 'Accesorios', data: { nombre: 'Accesorios' }, parent: calzado, children: [] };
  calzado.children.push(accCalzado);
  return { arbol: [hogar, ropa, calzado], hogar, velas, aromas, ropa, accRopa, calzado, accCalzado };
}

test('buscarNodoEnArbol devuelve el MISMO nodo del selector (no una copia) para poder marcarlo', () => {
  const t = arbolDelSelector();
  assert.equal(m.buscarNodoEnArbol(t.arbol, CATEGORIA_VELAS), t.velas);
  assert.equal(m.buscarNodoEnArbol(t.arbol, { nombre: 'Hogar', ruta: ['Hogar'], etiqueta: 'Hogar' }), t.hogar);
  assert.equal(m.buscarNodoEnArbol(t.arbol, { nombre: 'Accesorios', ruta: ['Calzado', 'Accesorios'], etiqueta: 'Calzado › Accesorios' }), t.accCalzado);
});

test('buscarNodoEnArbol: por nombre solo si es único; si no, null; nunca inventa', () => {
  const t = arbolDelSelector();
  assert.equal(m.buscarNodoEnArbol(t.arbol, { nombre: 'Aromas', ruta: ['Aromas'], etiqueta: 'Aromas' }), t.aromas);
  assert.equal(m.buscarNodoEnArbol(t.arbol, { nombre: 'Accesorios', ruta: ['Accesorios'], etiqueta: 'Accesorios' }), null);
  assert.equal(m.buscarNodoEnArbol(t.arbol, { nombre: 'Mascotas', ruta: ['Hogar', 'Mascotas'], etiqueta: 'Hogar › Mascotas' }), null);
  assert.equal(m.buscarNodoEnArbol([], CATEGORIA_VELAS), null);
  assert.equal(m.buscarNodoEnArbol(undefined, CATEGORIA_VELAS), null);
  assert.equal(m.buscarNodoEnArbol(t.arbol, null), null);
});

test('buscarNodoEnArbol tolera nodos sin label (solo data.nombre) y nodos vacíos del tercer nivel', () => {
  const raiz = { data: { nombre: 'Hogar' }, children: [{ data: { nombre: 'Velas' }, children: [{}] }, {}] };
  assert.equal(m.buscarNodoEnArbol([raiz], CATEGORIA_VELAS), raiz.children[0]);
});

test('rutaDeNodo y etiquetaDeNodo suben por los padres y no se cuelgan con un ciclo', () => {
  const t = arbolDelSelector();
  assert.deepEqual(m.rutaDeNodo(t.velas), ['Hogar', 'Velas']);
  assert.equal(m.etiquetaDeNodo(t.velas), 'Hogar › Velas');
  assert.equal(m.etiquetaDeNodo(null), '');
  const a = { label: 'A', parent: null };
  const b = { label: 'B', parent: a };
  a.parent = b;
  assert.ok(m.rutaDeNodo(a).length <= 8, 'un ciclo de padres no cuelga la pantalla');
  const plan = m.planificarFicha(formularioVacio({ categoria: m.etiquetaDeNodo(t.velas) }), ficha());
  assert.ok(!plan.vacios.includes('categoria') && !plan.conflictos.includes('categoria'), 'ya está marcada la misma categoría');
});

// ── Categoría con emoji en el nombre ─────────────────────────────────────────

test('una categoría con emoji en su nombre calza: el servidor la devuelve con el nombre ORIGINAL, que es el que compara el formulario', () => {
  // Lo que publica el servidor para «🏠 Hogar › 🕯️ Velas» (ver tests/ai/fichaDesdeFoto.test.js del backend).
  const categoria = m.normalizarFicha({
    nombre: 'Vela',
    categoria: { nombre: '🕯️ Velas', ruta: ['🏠 Hogar', '🕯️ Velas'], etiqueta: '🏠 Hogar › 🕯️ Velas' },
  }).categoria;
  assert.deepEqual(categoria, { nombre: '🕯️ Velas', ruta: ['🏠 Hogar', '🕯️ Velas'], etiqueta: '🏠 Hogar › 🕯️ Velas' });

  // Formulario rápido: opciones planas con los nombres crudos del árbol.
  const opciones = [
    { etiqueta: '🏠 Hogar', nodo: { id: 1 } },
    { etiqueta: '🏠 Hogar › 🕯️ Velas', nodo: { id: 2 } },
    { etiqueta: 'Ropa', nodo: { id: 3 } },
  ];
  assert.equal(m.buscarOpcionPlana(opciones, categoria).nodo.id, 2);

  // Formulario completo: el árbol del selector con las mismas etiquetas crudas.
  const hogar = { label: '🏠 Hogar', data: { nombre: '🏠 Hogar' }, parent: null, children: [] };
  const velas = { label: '🕯️ Velas', data: { nombre: '🕯️ Velas' }, parent: hogar, children: [] };
  hogar.children.push(velas);
  assert.equal(m.buscarNodoEnArbol([hogar], categoria), velas);

  // Y la que ya estaba elegida se reconoce como la misma (no se pregunta de más).
  const plan = m.planificarFicha(formularioVacio({ categoria: m.etiquetaDeNodo(velas) }), ficha({ categoria }));
  assert.ok(!plan.vacios.includes('categoria') && !plan.conflictos.includes('categoria'));
});

// ── La foto ──────────────────────────────────────────────────────────────────

const MB = 1024 * 1024;

test('decidirFoto: una foto web de hasta 5 MB se usa tal cual como imagen del producto', () => {
  assert.deepEqual(m.decidirFoto('image/jpeg', 3 * MB), { aceptar: true, usarOriginal: true });
  assert.deepEqual(m.decidirFoto('image/png', 5 * MB), { aceptar: true, usarOriginal: true });
  assert.deepEqual(m.decidirFoto('image/webp', 1000), { aceptar: true, usarOriginal: true });
  assert.deepEqual(m.decidirFoto('IMAGE/JPEG', 1000), { aceptar: true, usarOriginal: true });
});

test('decidirFoto: HEIC, GIF o una foto de más de 5 MB se aceptan pero se reducen a JPG', () => {
  assert.deepEqual(m.decidirFoto('image/jpeg', 6 * MB), { aceptar: true, usarOriginal: false });
  assert.deepEqual(m.decidirFoto('image/heic', 2 * MB), { aceptar: true, usarOriginal: false });
  assert.deepEqual(m.decidirFoto('image/gif', 1000), { aceptar: true, usarOriginal: false });
  assert.deepEqual(m.decidirFoto('image/jpeg', 15 * MB), { aceptar: true, usarOriginal: false });
});

test('decidirFoto rechaza lo que no es una imagen o pesa demasiado', () => {
  for (const tipo of ['application/pdf', 'text/plain', '', undefined, null]) {
    assert.deepEqual(m.decidirFoto(tipo, 1000), { aceptar: false, motivo: 'NO_ES_IMAGEN' }, String(tipo));
  }
  assert.deepEqual(m.decidirFoto('image/jpeg', 15 * MB + 1), { aceptar: false, motivo: 'MUY_PESADA' });
});

test('medidasReducidas respeta el lado más largo, conserva la proporción y nunca agranda', () => {
  assert.deepEqual(m.medidasReducidas(4000, 3000, 1568), { ancho: 1568, alto: 1176 });
  assert.deepEqual(m.medidasReducidas(3000, 4000, 1568), { ancho: 1176, alto: 1568 });
  assert.deepEqual(m.medidasReducidas(800, 600, 1568), { ancho: 800, alto: 600 });
  assert.deepEqual(m.medidasReducidas(10000, 1, 1568), { ancho: 1568, alto: 1 }, 'una franja finita no queda en cero');
  for (const [a, b] of [[0, 100], [100, 0], [-5, 5], [NaN, 4]]) {
    assert.deepEqual(m.medidasReducidas(a, b, 1568), { ancho: 0, alto: 0 });
  }
  assert.equal(m.LADO_MAXIMO_IA, 1568);
  assert.equal(m.LADO_MAXIMO_PRODUCTO, 2048);
});

// ── Mensajes para el comercio ────────────────────────────────────────────────

const JERGA = /\b(sku|payload|token|endpoint|json|api|http|adk|opttia|firestore|stack|undefined|null|exception|TypeError)\b|\b[45]\d\d\b/i;

test('401 y 403 son silenciosos: ya los avisó el interceptor (sesión vencida, función apagada, límite del plan)', () => {
  assert.equal(m.mensajeDeErrorFicha({ status: 401 }).silencioso, true);
  assert.equal(m.mensajeDeErrorFicha({ status: 403, error: { code: 'FEATURE_DISABLED', message: 'Esta función todavía no está activa' } }).silencioso, true);
});

test('los errores del servidor muestran el mensaje que ya viene redactado para el comercio', () => {
  const a = m.mensajeDeErrorFicha({
    status: 422,
    error: { success: false, code: 'FICHA_SIN_DATOS', message: 'No logramos identificar el producto en esa foto. Pruebe con otra.' },
  });
  assert.equal(a.titulo, 'No identificamos el producto');
  assert.equal(a.texto, 'No logramos identificar el producto en esa foto. Pruebe con otra.');
  assert.equal(a.icono, 'info');
  assert.equal(a.silencioso, false);

  const b = m.mensajeDeErrorFicha({ status: 503, error: { code: 'IA_NO_DISPONIBLE', message: 'No pudimos leer la foto en este momento.' } });
  assert.equal(b.titulo, 'K.A.I. no está disponible ahora');
  assert.equal(m.mensajeDeErrorFicha({ status: 400, error: { code: 'FOTO_INVALIDA', message: 'x' } }).titulo, 'No pudimos leer la foto');
  assert.equal(m.mensajeDeErrorFicha({ status: 413, error: { code: 'FOTO_MUY_GRANDE', message: 'x' } }).titulo, 'La foto pesa demasiado');
});

test('un error desconocido o técnico NUNCA se muestra tal cual', () => {
  for (const err of [
    new TypeError("Cannot read properties of undefined (reading 'x')"),
    { status: 500, error: '<html><body>502 Bad Gateway nginx/1.18</body></html>', message: 'Http failure response for https://back.katuq.com/...: 500' },
    { status: 500, error: {} },
    { status: 500, error: { message: '   ' } },
    'texto suelto',
    null,
    undefined,
    {},
  ]) {
    const aviso = m.mensajeDeErrorFicha(err);
    assert.equal(aviso.silencioso, false);
    assert.equal(aviso.icono, 'error');
    assert.match(aviso.texto, /Intente de nuevo/);
    assert.doesNotMatch(aviso.texto + aviso.titulo, JERGA, `el aviso de ${String(err)} no debe tener jerga`);
  }
});

test('sin conexión y tiempo agotado tienen su propio aviso', () => {
  const sinRed = m.mensajeDeErrorFicha({ status: 0, message: 'Http failure response for (unknown url): 0 Unknown Error' });
  assert.equal(sinRed.titulo, 'Sin conexión');
  assert.match(sinRed.texto, /internet/);
  assert.equal(m.mensajeDeErrorFicha({ status: 504 }).titulo, 'Tardó demasiado');
  assert.equal(m.mensajeDeErrorFicha({ status: 408 }).titulo, 'Tardó demasiado');
});

test('la espera agotada del cliente (TimeoutError) se muestra como "Tardó demasiado", sin el texto técnico', () => {
  const { TimeoutError } = require('rxjs');
  for (const err of [new TimeoutError(), { name: 'TimeoutError', message: 'Timeout has occurred' }]) {
    const aviso = m.mensajeDeErrorFicha(err);
    assert.equal(aviso.titulo, 'Tardó demasiado');
    assert.equal(aviso.icono, 'warning');
    assert.equal(aviso.silencioso, false);
    assert.match(aviso.texto, /Intente de nuevo/);
    assert.doesNotMatch(aviso.titulo + aviso.texto, /timeout|has occurred|rxjs/i);
    assert.doesNotMatch(aviso.titulo + aviso.texto, JERGA);
  }
  // Otros errores sin estado HTTP siguen siendo el aviso genérico, no "tardó demasiado".
  assert.equal(m.mensajeDeErrorFicha({ name: 'SyntaxError' }).icono, 'error');
  assert.equal(m.mensajeDeErrorFicha(new TypeError('x')).icono, 'error');
});

test('el cliente espera la ficha más que el servidor (55 s) y que el proxy (60 s), pero no minutos', () => {
  assert.equal(m.TIEMPO_LIMITE_FICHA_MS, 70000);
  assert.ok(m.TIEMPO_LIMITE_FICHA_MS > 60000);
});

test('los errores de la foto elegida llevan su mensaje y son amables', () => {
  for (const codigo of ['NO_ES_IMAGEN', 'MUY_PESADA', 'NO_SE_PUDO_LEER']) {
    const error = new m.FotoError(codigo, m.MENSAJES_FOTO[codigo]);
    assert.equal(error.codigo, codigo);
    assert.ok(error instanceof Error && error.name === 'FotoError');
    const aviso = m.mensajeDeErrorFicha(error);
    assert.equal(aviso.texto, m.MENSAJES_FOTO[codigo]);
    assert.equal(aviso.silencioso, false);
    assert.doesNotMatch(aviso.texto, JERGA);
  }
  assert.match(m.MENSAJES_FOTO.MUY_PESADA, /15 MB/);
});

test('errorSinFicha tiene la forma de un 422 del servidor y se muestra como «no identificamos el producto»', () => {
  const e = m.errorSinFicha();
  assert.equal(e.status, 422);
  const aviso = m.mensajeDeErrorFicha(e);
  assert.equal(aviso.titulo, 'No identificamos el producto');
  assert.equal(aviso.texto, m.MENSAJE_SIN_FICHA);
  assert.equal(m.errorSinFicha('Otro mensaje').error.message, 'Otro mensaje');
  assert.equal(m.errorSinFicha('   ').error.message, m.MENSAJE_SIN_FICHA);
});

test('ningún texto del mapper que ve el comercio tiene jerga ni códigos', () => {
  const textos = [
    ...Object.values(m.MENSAJES_FOTO),
    ...Object.values(m.NOMBRE_DE_CAMPO),
    m.MENSAJE_SIN_FICHA,
    m.resumenDeRelleno(['titulo', 'imagen'], ['descripcion']),
    m.resumenDeRelleno([], ['titulo']),
  ];
  for (const t of textos) assert.doesNotMatch(t, JERGA, t);
});
