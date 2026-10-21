'use strict';

// D-532 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B00c, tarea 1.3): verificación
// automática de los diccionarios y de los textos sueltos (`npm run i18n:check`, design.md D6).
// Un caso por cada fila de la tabla de D6 y un caso limpio, sobre los fixtures de
// tests/i18n/fixtures/. Node puro: no compila Angular ni llama a la red.

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const RAIZ = path.resolve(__dirname, '../..');
const SCRIPT = path.join(RAIZ, 'scripts/i18n-check.js');
const FIXTURES = path.join(__dirname, 'fixtures');
const CONFIG = path.join(FIXTURES, 'config.json');

const cargar = () => require(SCRIPT);

function revisar(caso, opciones = {}) {
  const { ejecutar } = cargar();
  return ejecutar({ raiz: path.join(FIXTURES, caso), config: CONFIG, ...opciones });
}

const porTipo = (lista, tipo) => lista.filter(h => h.tipo === tipo);
const tipos = lista => [...new Set(lista.map(h => h.tipo))].sort();

function correr(caso, ...args) {
  return spawnSync(process.execPath, [SCRIPT, '--raiz', path.join(FIXTURES, caso), '--config', CONFIG, ...args], {
    encoding: 'utf8',
  });
}

// ---------------------------------------------------------------- caso limpio

test('limpio: sin errores ni avisos', () => {
  const r = revisar('limpio');
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.sueltos, []);
});

test('limpio: la salida es 0', () => {
  const p = correr('limpio');
  assert.equal(p.status, 0, p.stdout + p.stderr);
});

// ---------------------------------------------------------------- errores de los diccionarios

test('JSON inválido: error con el archivo y la línea', () => {
  const r = revisar('json-invalido');
  const e = porTipo(r.errores, 'jsonInvalido');
  assert.equal(e.length, 1);
  assert.equal(e[0].archivo, 'src/assets/i18n/es.json');
  assert.equal(e[0].idioma, 'es');
  assert.equal(e[0].linea, 4);
});

test('clave duplicada: se detecta leyendo el texto, también dentro de un objeto', () => {
  const r = revisar('clave-duplicada');
  const e = porTipo(r.errores, 'claveDuplicada');
  assert.deepEqual(
    e.map(x => [x.idioma, x.clave, x.linea]).sort(),
    [['es', 'primeng.today', 10], ['es', 'ventas.titulo', 7]],
  );
});

test('clave de es que falta en en, pt o de: error con la clave y el idioma', () => {
  const r = revisar('clave-faltante');
  const e = porTipo(r.errores, 'claveFaltante');
  assert.deepEqual(
    e.map(x => [x.idioma, x.clave]).sort(),
    [['de', 'primeng.today'], ['en', 'ventas.titulo'], ['pt', 'comun.guardar']],
  );
});

test('variables {{x}} distintas entre idiomas: error', () => {
  const r = revisar('variables');
  const e = porTipo(r.errores, 'variablesDistintas');
  assert.deepEqual(e.map(x => [x.idioma, x.clave]).sort(), [['en', 'ventas.saludo'], ['pt', 'ventas.saludo']]);
  assert.match(e.find(x => x.idioma === 'en').mensaje, /nombre/);
});

test('«ß» en de: error; «ss» no', () => {
  const r = revisar('eszett');
  const e = porTipo(r.errores, 'eszett');
  assert.deepEqual(e.map(x => [x.idioma, x.clave]), [['de', 'ventas.titulo']]);
});

// ---------------------------------------------------------------- claves usadas en el código

test('clave literal usada en un módulo cerrado que no existe en es: error con archivo y línea (pipe, ternario sin paréntesis y directiva)', () => {
  const r = revisar('clave-inexistente');
  const e = porTipo(r.errores, 'claveInexistente');
  assert.deepEqual(
    e.map(x => `${x.archivo}:${x.linea} ${x.clave}`).sort(),
    [
      'src/app/components/cerrado/falta.component.html:2 ventas.faltaEnCerrado',
      'src/app/components/cerrado/falta.component.html:3 ventas.sinParentesis',
      'src/app/components/cerrado/falta.component.html:4 Directiva que falta',
    ].sort(),
  );
});

test('D3: la misma falta en un módulo abierto es aviso (claveInexistenteAbierta), no error', () => {
  const r = revisar('clave-inexistente');
  const a = porTipo(r.avisos, 'claveInexistenteAbierta');
  assert.deepEqual(
    a.map(x => `${x.archivo}:${x.linea} ${x.clave}`).sort(),
    [
      'src/app/components/abierto/ternario.component.html:1 Ver menos',
      'src/app/components/abierto/ternario.component.html:1 Ver más',
      'src/app/components/abierto/usa.component.html:2 ventas.noExiste',
      'src/app/components/abierto/usa.component.html:3 ventas.otroQueFalta',
      'src/app/components/abierto/usa.component.ts:5 ventas.tampoco',
      'src/app/components/abierto/usa.component.ts:6 ventas.niEsta',
      'src/app/components/abierto/usa.component.ts:7 ventas.niAquella',
      'src/app/components/abierto/usa.component.ts:8 ventas.enArreglo',
    ].sort(),
  );
  assert.ok(!r.errores.some(x => x.archivo.includes('/abierto/')));
});

test('ternario sin paréntesis antes de | translate: las dos ramas son claves', () => {
  const { clavesDePipe } = cargar();
  const { usos } = clavesDePipe("{{ editando ? 'Guardar cambios' : 'Crear Forma de Pago' | translate }} {{ x | date:'short' | translate }}");
  assert.deepEqual(usos.map(u => u.clave).sort(), ['Crear Forma de Pago', 'Guardar cambios', 'short']);
});

test('clave dinámica fuera de los prefijos permitidos: aviso, no error; form.get no es una clave', () => {
  const r = revisar('clave-inexistente');
  assert.ok(!r.errores.some(x => /nombre|estado/.test(x.clave || '')));
  const a = porTipo(r.avisos, 'claveDinamica');
  assert.deepEqual(a.map(x => `${x.archivo}:${x.linea}`), ['src/app/components/abierto/usa.component.ts:9']);
});

// ---------------------------------------------------------------- textos sueltos

const ESPERADOS_SUELTOS = [
  'suelto.component.html:3 Guardar cambios',
  'suelto.component.html:4 Buscar pedido',
  'suelto.component.html:5 Crear',
  'suelto.component.html:6 Activo',
  'suelto.component.html:6 Inactivo',
  'suelto.component.html:7 No',
  'suelto.component.html:7 Sí',
  'suelto.component.html:8 Detalle',
  'suelto.component.html:9 Cerrar',
  'suelto.component.html:12 Ir a',
  'suelto.component.html:13 Cierre',
  // Email está en igualesPermitidos y Total en igualesPermitidos.pt: pueden quedar iguales en el
  // diccionario, pero como texto suelto igual cuentan (listas separadas).
  'suelto.component.html:14 Email',
  'suelto.component.html:15 Total',
  // Atributos de texto además de los de D4.
  'suelto.component.html:16 Datos entrega',
  'suelto.component.html:17 Logo de la tienda',
  'suelto.component.html:18 Mostrando {first} a {last}',
  'suelto.component.html:19 <b>Hola</b>',
  'suelto.component.ts:10 No se pudo guardar',
  'suelto.component.ts:11 Hecho',
  'suelto.component.ts:11 Éxito',
  'suelto.component.ts:13 Nota crédito',
  'suelto.component.ts:13 Nota débito',
  // Receptores con otros nombres: swal, toast, toster y notificationService.
  'suelto.component.ts:14 Cierre de caja',
  'suelto.component.ts:15 Sin conexión',
  'suelto.component.ts:16 Correo o contraseña incorrecta.',
  'suelto.component.ts:17 Listo',
  'suelto.component.ts:17 Agente borrado',
  'suelto.component.ts:7 Listo',
  'suelto.component.ts:7 Pedido ${n} creado',
  'suelto.component.ts:8 Atención',
  'suelto.component.ts:8 Revisa los datos',
  'suelto.component.ts:9 Guardado',
  // Plantilla en línea de un componente.
  'plantilla.component.ts:7 Vista de venta',
  'plantilla.component.ts:8 Cambiar vista',
].sort();

const resumen = (lista, carpeta) => lista
  .filter(x => x.archivo.startsWith(`src/app/components/${carpeta}/`))
  .map(x => `${path.basename(x.archivo)}:${x.linea} ${x.texto}`)
  .sort();

test('texto suelto en un módulo cerrado: error por cada texto (HTML, atributos de D4, Swal, toastr y messageService)', () => {
  const r = revisar('texto-suelto');
  const e = porTipo(r.errores, 'textoSuelto');
  assert.deepEqual(resumen(e, 'cerrado'), ESPERADOS_SUELTOS);
  assert.ok(e.every(x => x.archivo.startsWith('src/app/components/cerrado/')), 'solo el módulo cerrado da error');
});

test('texto suelto en un módulo abierto: se cuenta, no es error; fuera de alcance no se cuenta', () => {
  const r = revisar('texto-suelto');
  assert.deepEqual(resumen(r.sueltos, 'abierto'), ESPERADOS_SUELTOS);
  assert.equal(r.sueltos.filter(x => x.archivo.includes('/publico/')).length, 0);
  assert.deepEqual(tipos(r.errores), ['textoSuelto']);
});

test('texto suelto: no cuentan los marcados con i18n-ignorar, los de textosIgnorados ni los nombres propios', () => {
  const r = revisar('texto-suelto');
  const textos = porTipo(r.errores, 'textoSuelto').map(x => x.texto);
  for (const t of ['cm', 'Sin traducir a propósito', 'A propósito', 'Katuq']) assert.ok(!textos.includes(t), t);
});

test('texto suelto: cada uno dice de dónde sale (texto, atributo o mensaje)', () => {
  const r = revisar('texto-suelto');
  const origen = Object.fromEntries(
    porTipo(r.errores, 'textoSuelto').map(x => [x.texto, x.origen]),
  );
  assert.equal(origen['Guardar cambios'], 'texto');
  assert.equal(origen['Buscar pedido'], 'atributo');
  assert.equal(origen['Sí'], 'interpolacion');
  assert.equal(origen.Guardado, 'mensaje');
});

test('--modulo imprime los textos sueltos con archivo y línea aunque el módulo no esté cerrado', () => {
  const p = correr('texto-suelto', '--modulo', 'abierto');
  assert.match(p.stdout, /src\/app\/components\/abierto\/suelto\.component\.html:3/);
  assert.match(p.stdout, /Guardar cambios/);
  assert.match(p.stdout, /src\/app\/components\/abierto\/suelto\.component\.ts:9/);
  assert.doesNotMatch(p.stdout, /components\/publico\//);
});

test('--modulo acepta un bloque de D10 y varias carpetas separadas por coma', () => {
  const { ejecutar } = cargar();
  const raiz = path.join(FIXTURES, 'texto-suelto');
  const porBloque = ejecutar({ raiz, config: CONFIG, modulos: ['IDI-B91'] });
  const porCarpetas = ejecutar({ raiz, config: CONFIG, modulos: ['components/abierto', 'cerrado'] });
  assert.equal(porBloque.modulo.length, ESPERADOS_SUELTOS.length);
  assert.equal(porCarpetas.modulo.length, ESPERADOS_SUELTOS.length * 2);
});

test('--modulo sobre una carpeta fuera de alcance la lista igual, sin contarla en el panel', () => {
  const { ejecutar } = cargar();
  const r = ejecutar({ raiz: path.join(FIXTURES, 'texto-suelto'), config: CONFIG, modulos: ['publico'] });
  assert.ok(r.modulo.length > 0);
  assert.ok(r.modulo.every(x => x.archivo.includes('/publico/')));
  assert.equal(r.sueltos.filter(x => x.archivo.includes('/publico/')).length, 0);
});

test('un bloque cubre su carpeta salvo las subcarpetas asignadas a otro bloque (la más específica gana)', () => {
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-check-'));
  try {
    const escribir = (rel, contenido) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), contenido);
    };
    for (const idioma of ['es', 'en', 'pt', 'de']) escribir(`src/assets/i18n/${idioma}.json`, '{}');
    escribir('src/app/components/ventas/lista.component.html', '<p>Uno</p>');
    escribir('src/app/components/ventas/clientes/form.component.html', '<p>Dos</p>');
    const config = path.join(dir, 'config.json');
    const base = { bloques: { 'IDI-B03 Ventas': ['components/ventas'], 'IDI-B05 Clientes': ['components/ventas/clientes'] } };
    escribir('config.json', JSON.stringify({ ...base, modulosCerrados: ['IDI-B03'] }));
    const { ejecutar } = cargar();
    const textos = lista => lista.map(x => x.texto).sort();
    assert.deepEqual(textos(ejecutar({ raiz: dir, config, modulos: ['IDI-B03'] }).modulo), ['Uno']);
    assert.deepEqual(textos(ejecutar({ raiz: dir, config, modulos: ['IDI-B05'] }).modulo), ['Dos']);
    assert.deepEqual(textos(ejecutar({ raiz: dir, config, modulos: ['components/ventas'] }).modulo), ['Dos', 'Uno']);
    assert.deepEqual(textos(porTipo(ejecutar({ raiz: dir, config }).errores, 'textoSuelto')), ['Uno']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--modulo con una carpeta que no existe: error de uso, salida 2', () => {
  const p = correr('texto-suelto', '--modulo', 'no-existe');
  assert.equal(p.status, 2);
  assert.match(p.stderr, /no-existe/);
});

// ---------------------------------------------------------------- avisos

test('avisos: igual al español fuera de la lista permitida, claves sobrantes y claves sin uso', () => {
  const r = revisar('avisos');
  assert.deepEqual(r.errores, []);
  // «Total» igual en pt está permitido solo para pt (igualesPermitidos.pt); en en es aviso.
  assert.deepEqual(
    porTipo(r.avisos, 'igualAlEspanol').map(x => [x.idioma, x.clave]).sort(),
    [['en', 'comun.guardar'], ['en', 'ventas.total']],
  );
  assert.deepEqual(porTipo(r.avisos, 'claveSobrante').map(x => [x.idioma, x.clave]), [['en', 'ventas.sobrante']]);
  assert.deepEqual(porTipo(r.avisos, 'claveSinUso').map(x => x.clave), ['ventas.nadieLaUsa']);
});

test('solo avisos: la salida es 0', () => {
  const p = correr('avisos');
  assert.equal(p.status, 0, p.stdout + p.stderr);
  assert.match(p.stdout, /aviso/i);
});

test('mientras de.json no exista, su falta es un aviso y no un error', () => {
  const r = revisar('sin-de');
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos.map(x => [x.tipo, x.idioma]), [['diccionarioAusente', 'de']]);
  assert.equal(correr('sin-de').status, 0);
});

test('IDI-B00f (1.14): con idiomasOpcionales vacío, como el repo, la falta de de.json es error y sale con 1', () => {
  const base = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'i18n-sin-opcionales-'));
  const config = path.join(dir, 'config.json');
  fs.writeFileSync(config, JSON.stringify({ ...base, idiomasOpcionales: [] }));
  try {
    const r = revisar('sin-de', { config });
    assert.deepEqual(r.avisos.filter(x => x.tipo === 'diccionarioAusente'), []);
    assert.deepEqual(r.errores.map(x => [x.tipo, x.idioma, x.archivo]), [['jsonInvalido', 'de', 'src/assets/i18n/de.json']]);
    const p = spawnSync(process.execPath, [SCRIPT, '--raiz', path.join(FIXTURES, 'sin-de'), '--config', config], { encoding: 'utf8' });
    assert.equal(p.status, 1, p.stdout + p.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('igualesPermitidos.<idioma> vale para el valor completo; las siglas de todos, por palabra (IDI-B00d)', () => {
  // Un cognado corto de la lista («de», «Pedidos», «Valor») no silencia una frase que sigue en
  // español; las siglas de igualesPermitidos.todos sí se quitan por palabra («Formato JSON»).
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-iguales-'));
  try {
    const dic = path.join(dir, 'src/assets/i18n');
    fs.mkdirSync(dic, { recursive: true });
    fs.mkdirSync(path.join(dir, 'src/app'), { recursive: true });
    const es = {
      'Pedidos': 'Pedidos', 'de': 'de', 'Valor': 'Valor', 'Valor de Pedidos': 'Valor de Pedidos',
      'Documento:': 'Documento:', 'Formato JSON': 'Formato JSON', 'Error 404': 'Error 404', 'IVA 19%:': 'IVA 19%:',
    };
    fs.writeFileSync(path.join(dic, 'es.json'), JSON.stringify(es, null, 4));
    fs.writeFileSync(path.join(dic, 'pt.json'), JSON.stringify(es, null, 2));
    const config = path.join(dir, 'config.json');
    fs.writeFileSync(config, JSON.stringify({
      idiomas: ['es', 'pt'],
      igualesPermitidos: { todos: ['JSON'], pt: ['Pedidos', 'de', 'Valor', 'Documento', 'Formato', 'Error', 'IVA'] },
    }));
    const r = cargar().ejecutar({ raiz: dir, config });
    assert.deepEqual(porTipo(r.avisos, 'igualAlEspanol').map(x => x.clave), ['Valor de Pedidos']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- código de salida

test('con errores la salida es 1', () => {
  for (const caso of ['json-invalido', 'clave-duplicada', 'clave-faltante', 'variables', 'eszett', 'clave-inexistente', 'texto-suelto']) {
    const p = correr(caso);
    assert.equal(p.status, 1, `${caso}: ${p.stdout}${p.stderr}`);
    assert.match(p.stdout, /error/i, caso);
  }
});

test('configuración que no es JSON válido: salida 2 (no se pudo verificar), no 1', () => {
  const p = spawnSync(process.execPath, [SCRIPT, '--raiz', path.join(FIXTURES, 'limpio'), '--config', path.join(FIXTURES, 'config-invalida.json')], { encoding: 'utf8' });
  assert.equal(p.status, 2, p.stdout + p.stderr);
  assert.match(p.stderr, /config-invalida\.json/);
});

test('--json devuelve el informe completo', () => {
  const p = correr('avisos', '--json');
  const informe = JSON.parse(p.stdout);
  assert.deepEqual(informe.errores, []);
  assert.ok(informe.avisos.length >= 3);
});

// ---------------------------------------------------------------- configuración y repo real

test('configuración del repo: lista permitida, prefijos dinámicos, módulos cerrados vacíos y bloques de D10', () => {
  const config = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/i18n-check.config.json'), 'utf8'));
  for (const v of ['POS', 'SKU', 'NIT', 'Katuq', 'Opttia', 'KAI', 'DIAN', 'Siigo', 'World Office',
    'Shopify', 'WooCommerce', 'WhatsApp', 'Wompi', 'Addi', 'Sistecrédito']) {
    assert.ok(config.nombresPropios.includes(v), v);
  }
  assert.ok(config.igualesPermitidos.todos.includes('Email'));
  assert.ok(Array.isArray(config.prefijosDinamicos));
  assert.deepEqual(config.modulosCerrados, []);
  // IDI-B00f (1.14): cuando exista de.json, 'de' sale de idiomasOpcionales y su falta pasa a error.
  const existeDe = fs.existsSync(path.join(RAIZ, 'src/assets/i18n/de.json'));
  assert.equal(config.idiomasOpcionales.includes('de'), !existeDe, 'idiomasOpcionales debe seguir a de.json');
  const bloques = Object.keys(config.bloques).map(b => b.split(' ')[0]);
  assert.deepEqual(bloques, Array.from({ length: 12 }, (_, i) => `IDI-B${String(i + 1).padStart(2, '0')}`));
  assert.ok(config.bloques[Object.keys(config.bloques)[2]].includes('components/ventas'));
  assert.ok(config.bloques[Object.keys(config.bloques)[1]].includes('auth/login'), 'el login real del panel va en IDI-B02');
  assert.ok(config.bloques[Object.keys(config.bloques)[4]].includes('components/ventas/clientes'), 'formularios de cliente en IDI-B05');
  for (const carpeta of Object.values(config.bloques).flat()) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'src/app', carpeta)), `la carpeta ${carpeta} de D10 existe`);
  }
});

test('package.json: i18n:check y test:i18n con las siete pruebas, sin engancharse a prebuild ni predeploy', () => {
  const { scripts } = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  assert.equal(scripts['i18n:check'], 'node scripts/i18n-check.js');
  assert.equal(
    scripts['test:i18n'],
    'node --test tests/i18n/app-language.test.js tests/i18n/primeng-i18n.test.js tests/i18n/i18n-check.test.js' +
      ' tests/i18n/diccionarios.test.js tests/i18n/ortografia-claves.test.js tests/i18n/aleman.test.js' +
      ' tests/i18n/menu-titulos.test.js',
  );
  for (const gancho of ['prebuild', 'prebuild:prod', 'predeploy', 'prerelease']) {
    assert.doesNotMatch(scripts[gancho] || '', /i18n/, gancho);
  }
});

test('repo real: corre sobre todo src/app en menos de 30 s', () => {
  const inicio = Date.now();
  const p = spawnSync(process.execPath, [SCRIPT, '--json'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const ms = Date.now() - inicio;
  assert.ok([0, 1].includes(p.status), p.stderr);
  const informe = JSON.parse(p.stdout);
  assert.ok(informe.archivos > 400, `revisó ${informe.archivos} archivos`);
  assert.ok(ms < 30000, `tardó ${ms} ms`);
});
