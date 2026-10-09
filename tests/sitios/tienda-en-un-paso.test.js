'use strict';
/**
 * Tienda en minutos con IA, en UN solo paso (bandera `singleStepStore`) — front.
 *
 *   node --test tests/sitios/tienda-en-un-paso.test.js
 *
 * Tres partes:
 *  1. La lógica pura (`tienda-en-un-paso.logic.ts`): validaciones, precio, solicitud,
 *     pasos del avance, cuándo se deja de consultar y los mensajes de error.
 *  2. El componente de verdad (`tienda-en-un-paso.component.ts`), sin Angular: sus
 *     métodos se cargan con el compilador de TypeScript y corren contra un servicio y
 *     unos temporizadores de mentira. Así se prueba lo que importa del comportamiento:
 *     un solo envío por intento, la misma solicitud en los reintentos, cuándo se
 *     consulta el avance, cuándo se deja de consultar y cuándo se puede cerrar.
 *  3. Contratos de las fuentes: la bandera, el servicio por BaseService (nunca HttpClient
 *     en el componente) y el tema canónico (sin degradados ni colores fuera de la tabla).
 *
 * Qué protege:
 *  - El precio SIEMPRE lo escribe la persona: sin precio no se manda la foto.
 *  - Con la bandera ausente no se dibuja nada nuevo y la lista queda igual.
 *  - Todo texto de error es para el comercio, sin jerga.
 *  - El precio son pesos enteros (la misma regla del servidor): con decimales se rechaza.
 *  - Un formulario corregido es OTRA solicitud (otro requestId); el mismo, la misma.
 *  - La lista solo trata como "de esta función" una tarjeta si la bandera está encendida, y su
 *    sondeo se detiene al terminar y al destruir la pantalla.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { of, throwError } = require('rxjs');

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const CARPETA = path.join(RAIZ, 'src/app/components/sitios/tienda-en-un-paso');
const L = require(path.join(CARPETA, 'tienda-en-un-paso.logic.ts'));

// ── 1. La lógica pura ────────────────────────────────────────────────────────

test('parsearPrecio entiende lo que se escribe en Colombia', () => {
  const casos = [
    [45000, 45000], ['45000', 45000], ['45.000', 45000], ['45,000', 45000], ['$ 45.000', 45000],
    ['$45.000', 45000], ['1.250.000', 1250000], ['  8900 ', 8900], ['12.500', 12500], ['12,500', 12500], ['1,250,000', 1250000], [1, 1],
  ];
  for (const [entrada, esperado] of casos) assert.equal(L.parsearPrecio(entrada), esperado, JSON.stringify(entrada));
});

test('parsearPrecio: pesos enteros. Con decimales se RECHAZA, nunca se redondea (la misma regla del servidor)', () => {
  for (const conDecimales of ['12.5', '1.5', '45,5', '45,50', '12.50', '0,4', '0.5', '1.250,50', '1,250.50', 12.5, 1.5, 45000.4, 0.4]) {
    assert.equal(L.parsearPrecio(conDecimales), null, JSON.stringify(conDecimales));
    assert.deepEqual(L.analizarPrecio(conDecimales), { precio: null, motivo: 'decimales' }, JSON.stringify(conDecimales));
  }
  // El punto o la coma son de miles SOLO en grupos de 3 y con el mismo signo en todo el número.
  for (const raro of ['1.250,000', '1,250.000', '12.5000', '1.25', '0.500', '1..000', '.500', '12.', '1.2.3']) {
    assert.equal(L.parsearPrecio(raro), null, JSON.stringify(raro));
  }
  assert.deepEqual(L.analizarPrecio('12.500'), { precio: 12500, motivo: 'ok' });
  assert.deepEqual(L.analizarPrecio('gratis'), { precio: null, motivo: 'invalido' });
  assert.deepEqual(L.analizarPrecio(0), { precio: null, motivo: 'invalido' });
  assert.deepEqual(L.analizarPrecio(-3.5), { precio: null, motivo: 'invalido' });
});

const REGLA_DEL_SERVIDOR = path.resolve(RAIZ, '../katuq_admin_back_firebase/functions/services/sites/tiendaEnUnPasoContenido.js');

// Solo corre donde el repositorio del servidor está al lado de este (la máquina de desarrollo); en otro lado se salta.
test('parsearPrecio y el servidor dicen LO MISMO de cada precio (una sola regla en dos lugares)', { skip: !fs.existsSync(REGLA_DEL_SERVIDOR) && 'el repositorio del servidor no está junto a este' }, () => {
  // Se carga la regla del servidor y se compara valor por valor: si una cambia sin la otra, esto avisa.
  const servidor = require(REGLA_DEL_SERVIDOR);
  const valores = [45000, '45000', '45.000', '45,000', '$ 45.000', '1.250.000', '12.500', '12,500', '12.5', '1.5', '45,50', '1.250,50', '1.250,000',
    '0', '0,4', '', 'gratis', '1e3', '100.000.000', 99999999, 100000000, 12.5, 0, -5, NaN, null, undefined, {}, '00', '007', ' 8900 '];
  for (const v of valores) {
    const a = L.analizarPrecio(v);
    const b = servidor.analyzePrice(v);
    assert.equal(a.precio, b.price, JSON.stringify(v));
    assert.equal(a.motivo, { ok: 'ok', decimals: 'decimales', invalid: 'invalido' }[b.reason], JSON.stringify(v));
  }
});

test('parsearPrecio no inventa: cero, negativo, vacío, texto o un tope absurdo NO son un precio', () => {
  for (const malo of [0, -5, '0', '-1', '', '   ', 'gratis', 'abc', '12abc', '1e3', NaN, Infinity, null, undefined, {}, [], true, 0.4, '0,4', 100000000, '100.000.000']) {
    assert.equal(L.parsearPrecio(malo), null, JSON.stringify(malo));
  }
  assert.equal(L.parsearPrecio(99999999), 99999999);
});

test('formatearPesos pone el punto de miles sin depender de la región del navegador', () => {
  assert.equal(L.formatearPesos(45000), '$ 45.000');
  assert.equal(L.formatearPesos(1250000), '$ 1.250.000');
  assert.equal(L.formatearPesos(999), '$ 999');
  assert.equal(L.formatearPesos(0), '$ 0');
  assert.equal(L.formatearPesos(NaN), '$ 0');
  assert.equal(L.textoPlural(1, 'producto', 'productos'), '1 producto');
  assert.equal(L.textoPlural(3, 'producto', 'productos'), '3 productos');
});

test('limpiarTexto deja una línea limpia y con tope', () => {
  assert.equal(L.limpiarTexto('  <b>Flores</b>   La\nMontaña  ', 80), 'bFlores/b La Montaña');
  assert.equal(L.limpiarTexto('x'.repeat(200), 80).length, 80);
  assert.equal(L.limpiarTexto(undefined, 80), '');
  assert.equal(L.limpiarTexto(5, 80), '');
});

const foto = (id, precio = '45.000') => ({ id, nombreArchivo: `f${id}.jpg`, imagen: `data:image/jpeg;base64,${'A'.repeat(40)}`, vistaPrevia: '', precioTexto: precio });
const formulario = (extra = {}) => ({ nombre: 'Flores La Montaña', descripcion: 'Ramos y arreglos florales con entrega el mismo día', fotos: [foto(1)], ...extra });

test('validarFormulario: un formulario completo es válido', () => {
  const r = L.validarFormulario(formulario());
  assert.equal(r.valido, true);
  assert.deepEqual(r.errores, { fotos: {} });
});

test('validarFormulario: el nombre es obligatorio', () => {
  for (const nombre of ['', ' ', 'a', '<>']) {
    const r = L.validarFormulario(formulario({ nombre }));
    assert.equal(r.valido, false, JSON.stringify(nombre));
    assert.match(r.errores.nombre, /nombre de tu negocio/);
  }
});

test('validarFormulario: solo la descripción alcanza; sin descripción ni fotos, no', () => {
  assert.equal(L.validarFormulario(formulario({ fotos: [] })).valido, true);
  const r = L.validarFormulario(formulario({ fotos: [], descripcion: 'ropa' }));
  assert.equal(r.valido, false);
  assert.match(r.errores.descripcion, /una frase qué vendes/);
  // Con una foto, la descripción es opcional.
  assert.equal(L.validarFormulario(formulario({ descripcion: '' })).valido, true);
});

test('validarFormulario: cada foto trae su precio, y sin precio no se manda', () => {
  for (const precio of ['', '0', 'gratis', '-3', ' ']) {
    const r = L.validarFormulario(formulario({ fotos: [foto(1), foto(2, precio), foto(3)] }));
    assert.equal(r.valido, false, JSON.stringify(precio));
    assert.deepEqual(Object.keys(r.errores.fotos), ['2'], 'solo marca la foto 2');
    assert.match(r.errores.fotos[2], /foto 2/);
    assert.match(r.errores.fotos[2], /mayor que cero/);
  }
});

test('validarFormulario: un precio con decimales dice que se escriba en pesos, sin decimales', () => {
  for (const precio of ['12.5', '1.5', '45,50']) {
    const r = L.validarFormulario(formulario({ fotos: [foto(1), foto(2, precio)] }));
    assert.equal(r.valido, false, precio);
    assert.deepEqual(Object.keys(r.errores.fotos), ['2']);
    assert.match(r.errores.fotos[2], /foto 2/);
    assert.match(r.errores.fotos[2], /en pesos, sin decimales/);
    assert.ok(!/mayor que cero/.test(r.errores.fotos[2]), 'no es el aviso de "sin precio"');
  }
  assert.equal(L.validarFormulario(formulario({ fotos: [foto(1, '12.500'), foto(2, '1,250,000')] })).valido, true);
});

test('validarFormulario: máximo 3 fotos, y no se envía mientras se preparan', () => {
  const cuatro = L.validarFormulario(formulario({ fotos: [foto(1), foto(2), foto(3), foto(4)] }));
  assert.equal(cuatro.valido, false);
  assert.match(cuatro.errores.general, /hasta 3 fotos/);
  const preparando = L.validarFormulario(formulario(), { preparando: true });
  assert.equal(preparando.valido, false);
  assert.match(preparando.errores.general, /preparando tus fotos/);
});

test('construirSolicitud arma lo que viaja: el precio es el que escribió la persona, nada más', () => {
  const s = L.construirSolicitud(
    formulario({ nombre: '  Flores  La   Montaña ', descripcion: ' Ramos   y arreglos florales con entrega ', fotos: [foto(1, '$ 45.000'), foto(2, '80000')] }),
    'tep-abc12345'
  );
  assert.deepEqual(Object.keys(s).sort(), ['businessName', 'description', 'photos', 'requestId']);
  assert.equal(s.requestId, 'tep-abc12345');
  assert.equal(s.businessName, 'Flores La Montaña');
  assert.equal(s.description, 'Ramos y arreglos florales con entrega');
  assert.deepEqual(s.photos.map((p) => p.price), [45000, 80000]);
  assert.ok(s.photos.every((p) => Object.keys(p).sort().join() === 'image,price' && p.image.startsWith('data:image/')));
  // Nada de empresa ni usuario: eso lo pone el token en el servidor.
  assert.ok(!JSON.stringify(s).match(/company|empresa|usuario|email/i));
});

test('construirSolicitud se niega a armar una solicitud incompleta (una foto sin precio nunca viaja)', () => {
  assert.throws(() => L.construirSolicitud(formulario({ fotos: [foto(1, '')] }), 'tep-abc12345'), /no está completo/);
  assert.throws(() => L.construirSolicitud(formulario({ nombre: '' }), 'tep-abc12345'), /no está completo/);
});

test('huellaDelFormulario: el mismo contenido da la misma huella; un precio, una foto o un texto corregido, otra', () => {
  const base = formulario({ fotos: [foto(1, '45.000'), foto(2, '80000')] });
  const h = L.huellaDelFormulario(base);
  assert.equal(L.huellaDelFormulario(formulario({ nombre: '  Flores   La Montaña ', fotos: [foto(1, '45000'), foto(2, '$ 80.000')] })), h, 'espacios y 45.000 = 45000 no son un cambio');
  for (const cambiado of [
    formulario({ fotos: [foto(1, '54.000'), foto(2, '80000')] }),
    formulario({ fotos: [foto(1, '45.000')] }),
    formulario({ fotos: [foto(1, '45.000'), foto(3, '80000')] }),
    formulario({ fotos: [foto(1, '45.000'), foto(2, '80000')], descripcion: 'Otra cosa que vendemos' }),
    formulario({ fotos: [foto(1, '45.000'), foto(2, '80000')], nombre: 'Flores La Colina' }),
  ]) assert.notEqual(L.huellaDelFormulario(cambiado), h);
});

test('nuevoRequestId: un identificador por intento, con los caracteres que acepta el servidor', () => {
  const a = L.nuevoRequestId();
  const b = L.nuevoRequestId();
  assert.notEqual(a, b);
  for (const id of [a, b, L.nuevoRequestId(() => 'abc-123 ¡raro!'), L.nuevoRequestId(() => 'x'.repeat(500))]) {
    assert.match(id, /^tep-[A-Za-z0-9_-]+$/);
    assert.ok(id.length >= 8 && id.length <= 128, id.length);
  }
  assert.equal(L.nuevoRequestId(() => 'fijo'), 'tep-fijo');
});

const avance = (extra = {}) => ({
  siteId: `tep_${'a'.repeat(32)}`, requestId: 'tep-abc12345', siteName: 'Flores', slug: 'flores',
  state: 'running', step: 'photos', message: 'Leyendo la foto 1 de 3…', productsReady: 0, productsTotal: 3,
  items: [], warnings: [], published: false, missing: null, canRetry: false,
  siteUrl: '', previewUrl: '', editorUrl: '', startedAt: '', updatedAt: '', finishedAt: '', ...extra,
});
const estados = (pasos) => pasos.map((p) => p.estado);

test('pasosDelAvance: cuatro pasos en lenguaje de negocio, y el activo avanza', () => {
  const inicial = L.pasosDelAvance(null, true);
  assert.deepEqual(inicial.map((p) => p.clave), ['photos', 'texts', 'design', 'publishing']);
  assert.deepEqual(estados(inicial), ['activo', 'pendiente', 'pendiente', 'pendiente'], 'entre el clic y la primera respuesta');
  assert.deepEqual(inicial.map((p) => p.titulo), [
    'Leemos tus fotos y creamos tus productos', 'Escribimos los textos de tu tienda', 'Elegimos los colores y el diseño', 'Publicamos tu tienda',
  ]);

  const leyendo = L.pasosDelAvance(avance({ productsReady: 1 }), true);
  assert.deepEqual(estados(leyendo), ['activo', 'pendiente', 'pendiente', 'pendiente']);
  assert.equal(leyendo[0].detalle, '1 de 3 productos listos');

  assert.deepEqual(estados(L.pasosDelAvance(avance({ step: 'texts', productsReady: 3 }), true)), ['listo', 'activo', 'pendiente', 'pendiente']);
  assert.deepEqual(estados(L.pasosDelAvance(avance({ step: 'design', productsReady: 3 }), true)), ['listo', 'listo', 'activo', 'pendiente']);
  assert.deepEqual(estados(L.pasosDelAvance(avance({ step: 'publishing', productsReady: 3 }), true)), ['listo', 'listo', 'listo', 'activo']);
});

test('pasosDelAvance: terminado, sin fotos, sin publicar, interrumpido y fallido', () => {
  const publicada = L.pasosDelAvance(avance({ state: 'done', step: 'finished', published: true, productsReady: 3 }), true);
  assert.deepEqual(estados(publicada), ['listo', 'listo', 'listo', 'listo']);
  assert.equal(publicada[0].detalle, '3 de 3 productos listos');

  const borrador = L.pasosDelAvance(avance({ state: 'done', step: 'finished', published: false, productsTotal: 0, missing: 'product' }), false);
  assert.deepEqual(estados(borrador), ['omitido', 'listo', 'listo', 'omitido']);
  assert.match(borrador[0].detalle, /Sin fotos/);
  assert.match(borrador[3].detalle, /Falta un paso tuyo/);

  const sinLeer = L.pasosDelAvance(avance({ state: 'done', step: 'finished', published: false, productsReady: 0, productsTotal: 3, missing: 'product' }), true);
  assert.equal(sinLeer[0].detalle, '0 de 3 productos listos');
  assert.equal(sinLeer[3].estado, 'omitido');

  const interrumpido = L.pasosDelAvance(avance({ state: 'interrupted', step: 'design', productsReady: 3 }), true);
  assert.deepEqual(estados(interrumpido), ['listo', 'listo', 'detenido', 'pendiente']);
  const fallido = L.pasosDelAvance(avance({ state: 'failed', step: 'photos', productsReady: 1 }), true);
  assert.deepEqual(estados(fallido), ['detenido', 'pendiente', 'pendiente', 'pendiente']);
  assert.equal(fallido[0].detalle, '1 de 3 productos listos');
});

test('etapaDelAvance: qué pantalla toca', () => {
  assert.equal(L.etapaDelAvance(null), 'trabajando');
  assert.equal(L.etapaDelAvance(avance({ state: 'queued' })), 'trabajando');
  assert.equal(L.etapaDelAvance(avance({ state: 'running' })), 'trabajando');
  assert.equal(L.etapaDelAvance(avance({ state: 'done', published: true })), 'publicada');
  assert.equal(L.etapaDelAvance(avance({ state: 'done', published: false })), 'borrador');
  assert.equal(L.etapaDelAvance(avance({ state: 'interrupted' })), 'interrumpido');
  assert.equal(L.etapaDelAvance(avance({ state: 'failed' })), 'fallo');
});

test('cuándo se consulta y cuándo se deja de consultar', () => {
  assert.equal(L.esperaAntesDeConsultar(0), 3000);
  assert.equal(L.esperaAntesDeConsultar(119999), 3000);
  assert.equal(L.esperaAntesDeConsultar(120000), 5000, 'después de 2 minutos se espacia');
  assert.equal(L.debeSeguirConsultando(null, 0, 0), true);
  assert.equal(L.debeSeguirConsultando(avance({ state: 'running' }), 60000, 0), true);
  for (const estado of ['done', 'interrupted', 'failed']) assert.equal(L.debeSeguirConsultando(avance({ state: estado }), 1000, 0), false, estado);
  assert.equal(L.debeSeguirConsultando(avance({ state: 'running' }), L.MAX_ESPERA_MS + 1, 0), false, 'pasó demasiado tiempo');
  assert.equal(L.debeSeguirConsultando(avance({ state: 'running' }), 1000, L.MAX_FALLOS_SEGUIDOS), false, 'se perdió la conexión');
  assert.equal(L.debeSeguirConsultando(avance({ state: 'running' }), 1000, L.MAX_FALLOS_SEGUIDOS - 1), true);
});

test('resumenFinal: qué se le cuenta y qué botones tienen sentido', () => {
  const publicada = L.resumenFinal(avance({ state: 'done', published: true, productsReady: 3, message: '¡Tu tienda está lista y publicada!', siteUrl: 'https://flores.katuq.com/' }));
  assert.equal(publicada.tono, 'ok');
  assert.equal(publicada.titulo, '¡Tu tienda ya está publicada!');
  assert.equal(publicada.puedeVer, true);
  assert.equal(publicada.puedeAgregarProducto, false);
  assert.equal(publicada.puedeReintentar, false);
  assert.equal(publicada.productos, 3);

  const borrador = L.resumenFinal(avance({ state: 'done', published: false, missing: 'product', productsTotal: 0, message: 'Tu página quedó lista como borrador.' }));
  assert.equal(borrador.tono, 'info');
  assert.equal(borrador.puedeAgregarProducto, true, 'falta un producto con foto y precio');
  assert.equal(borrador.puedeVer, false);

  const porPlan = L.resumenFinal(avance({ state: 'done', published: false, missing: 'plan', productsReady: 2 }));
  assert.equal(porPlan.puedeAgregarProducto, false, 'el producto no es lo que falta');

  const interrumpido = L.resumenFinal(avance({ state: 'interrupted', canRetry: true }));
  assert.equal(interrumpido.tono, 'aviso');
  assert.match(interrumpido.titulo, /no perdiste nada/);
  assert.equal(interrumpido.puedeReintentar, true);
  const fallido = L.resumenFinal(avance({ state: 'failed', canRetry: true }));
  assert.equal(fallido.puedeReintentar, true);
});

test('resumenFinal junta los avisos de las fotos sin repetirlos', () => {
  const r = L.resumenFinal(
    avance({
      state: 'done',
      published: true,
      items: [
        { index: 0, state: 'ready', price: 1000, productName: 'Vela', photoUrl: '', reason: '' },
        { index: 1, state: 'skipped', price: 1000, productName: '', photoUrl: '', reason: 'La foto 2 quedó por fuera.' },
      ],
      warnings: ['La foto 2 quedó por fuera.', 'Otro aviso.'],
    })
  );
  assert.deepEqual(r.avisos, ['La foto 2 quedó por fuera.', 'Otro aviso.']);
});

test('mensajeDeError: qué pasó y qué hacer, sin jerga ni textos técnicos', () => {
  const sinConexion = L.mensajeDeError({ status: 0, error: new ProgressEvent_('error') });
  assert.match(sinConexion.texto, /Revisa tu internet/);
  assert.equal(sinConexion.reintentable, true);

  for (const err of [{ status: 408 }, { status: 504 }, { name: 'TimeoutError' }]) {
    assert.match(L.mensajeDeError(err).texto, /tardó más de lo normal/);
  }
  assert.match(L.mensajeDeError({ status: 401 }).texto, /Cierra sesión/);

  const pendiente = L.mensajeDeError({ status: 409, error: { code: 'PENDING_JOB', siteId: 'tep_x', message: 'Ya tienes una tienda a medio crear.' } });
  assert.equal(pendiente.siteIdPendiente, 'tep_x');
  assert.equal(pendiente.texto, 'Ya tienes una tienda a medio crear.');
  assert.equal(pendiente.reintentable, false);

  for (const [status, mensaje] of [[400, 'Escribe el nombre de tu negocio.'], [403, 'Tu plan permite 3 páginas con Opttia al mes.'], [413, 'La foto 2 pesa demasiado.'], [403, 'Esta función todavía no está activa para tu empresa.']]) {
    const m = L.mensajeDeError({ status, error: { success: false, code: 'X', message: mensaje } });
    assert.equal(m.texto, mensaje, 'el mensaje que redactó el servidor');
    assert.equal(m.reintentable, false, 'hay algo por corregir, no por reintentar');
  }
  const caida = L.mensajeDeError({ status: 503, error: { success: false, message: 'Esta función no está disponible en este momento.' } });
  assert.equal(caida.reintentable, true);

  // Sin un mensaje del servidor, uno genérico: nunca el texto técnico.
  for (const err of [{ status: 500, error: { error: 'TypeError: x is undefined at Object.<anonymous>' } }, { status: 500 }, null, undefined, 'texto', 42, {}]) {
    const m = L.mensajeDeError(err);
    assert.match(m.texto, /Algo salió mal al crear tu tienda/);
    assert.ok(!/TypeError|undefined|Object|stack/i.test(m.texto));
  }
});

// Un evento de red como el que trae un HttpErrorResponse sin conexión.
function ProgressEvent_(tipo) {
  return { type: tipo, isTrusted: true };
}

test('sitioSinTerminar y estadoDeTarjeta: solo los sitios de esta función; los de siempre no cambian', () => {
  const normal = { id: 'a', origen: 'plantilla' };
  const registro = { id: 'b', origen: 'registro', creationProgress: { state: 'running' } };
  const trabajando = { id: 'c', origen: 'tienda-en-un-paso', creationProgress: { state: 'running' } };
  const enCola = { id: 'd', origen: 'tienda-en-un-paso', creationProgress: { state: 'queued' } };
  const interrumpida = { id: 'e', origen: 'tienda-en-un-paso', creationProgress: { state: 'interrupted' } };
  const fallida = { id: 'f', origen: 'tienda-en-un-paso', creationProgress: { state: 'failed' } };
  const lista = { id: 'g', origen: 'tienda-en-un-paso', creationProgress: { state: 'done' } };
  const sinAvance = { id: 'h', origen: 'tienda-en-un-paso' };

  assert.equal(L.estadoDeTarjeta(normal), null);
  assert.equal(L.estadoDeTarjeta(registro), null, 'otro origen: no es de esta función');
  assert.equal(L.estadoDeTarjeta(trabajando), 'creandose');
  assert.equal(L.estadoDeTarjeta(enCola), 'creandose');
  assert.equal(L.estadoDeTarjeta(interrumpida), 'sin-terminar');
  assert.equal(L.estadoDeTarjeta(fallida), 'sin-terminar');
  assert.equal(L.estadoDeTarjeta(lista), null);
  assert.equal(L.estadoDeTarjeta(sinAvance), null);
  assert.equal(L.estadoDeTarjeta(null), null);

  // Un trabajo "en curso" sin latidos desde hace rato murió con un reinicio: no se queda girando para siempre.
  const ahora = Date.parse('2026-10-08T15:10:00.000Z');
  const conLatido = (hace, estado = 'running') => ({ id: 'z', origen: 'tienda-en-un-paso', creationProgress: { state: estado, heartbeatAt: new Date(ahora - hace).toISOString() } });
  assert.equal(L.estadoDeTarjeta(conLatido(8000), ahora), 'creandose', 'con latido reciente');
  assert.equal(L.estadoDeTarjeta(conLatido(100000), ahora), 'creandose', 'todavía dentro del margen');
  assert.equal(L.estadoDeTarjeta(conLatido(130000), ahora), 'sin-terminar', 'sin latidos por más de 2 minutos');
  assert.equal(L.estadoDeTarjeta(conLatido(130000, 'queued'), ahora), 'sin-terminar');
  assert.equal(L.estadoDeTarjeta(conLatido(999999, 'done'), ahora), null, 'lo terminado no se toca');
  assert.equal(L.estadoDeTarjeta({ id: 'y', origen: 'tienda-en-un-paso', creationProgress: { state: 'running', heartbeatAt: 'no es una fecha' } }, ahora), 'creandose');
  assert.equal(L.estadoDeTarjeta({ id: 'x', origen: 'plantilla', creationProgress: { state: 'running', heartbeatAt: new Date(ahora - 999999).toISOString() } }, ahora), null);

  assert.equal(L.sitioSinTerminar([normal, registro, lista, sinAvance]), null);
  assert.equal(L.sitioSinTerminar([normal, lista, interrumpida, trabajando]).id, 'e');
  assert.equal(L.sitioSinTerminar(null), null);
  assert.equal(L.sitioSinTerminar([]), null);
});

test('los mensajes del formulario no traen jerga', () => {
  const jerga = /\b(sku|payload|token|data ?url|base64|json|ssrf|http|firestore|endpoint|requestId|undefined|null|NaN)\b/i;
  const textos = [
    ...Object.values(L.MENSAJES).filter((v) => typeof v === 'string'),
    L.MENSAJES.fotoSinPrecio(2),
    L.MENSAJES.fotoPrecioConDecimales(2),
  ];
  assert.ok(textos.length > 8);
  for (const t of textos) assert.ok(!jerga.test(t), `con jerga: ${t}`);
});

// ── 2. El componente de verdad, sin Angular ──────────────────────────────────

const ARCHIVO_COMPONENTE = path.join(CARPETA, 'tienda-en-un-paso.component.ts');

/** Carga un .ts con el compilador de TypeScript y lo corre en un contexto con temporizadores y reloj de mentira. */
function cargarComponente() {
  const reloj = { t: 1_700_000_000_000 };
  const temporizadores = [];
  let siguienteId = 1;
  const sandbox = {
    console,
    Date: { now: () => reloj.t },
    setTimeout(fn, ms) {
      const id = siguienteId++;
      temporizadores.push({ id, fn, ms, vence: reloj.t + ms });
      return id;
    },
    clearTimeout(id) {
      const i = temporizadores.findIndex((t) => t.id === id);
      if (i >= 0) temporizadores.splice(i, 1);
    },
    window: { open: (...args) => sandbox.__abiertos.push(args) },
    navigator: undefined,
    crypto: require('node:crypto').webcrypto,
    __abiertos: [],
  };
  const contexto = vm.createContext(sandbox);
  const cache = new Map();

  class EmisorFalso {
    constructor() {
      this.valores = [];
    }
    emit(valor) {
      this.valores.push(valor);
    }
  }
  const stubs = {
    '@angular/core': {
      Component: () => (clase) => clase,
      Input: () => () => undefined,
      Output: () => () => undefined,
      HostListener: () => () => undefined,
      EventEmitter: EmisorFalso,
    },
    '@angular/router': { Router: class {} },
    'ngx-toastr': { ToastrService: class {} },
    '../../../shared/services/productos/ficha-desde-foto.service': { FichaDesdeFotoService: class {} },
    './tienda-en-un-paso.service': { TiendaEnUnPasoService: class {} },
  };

  function cargar(archivo) {
    if (cache.has(archivo)) return cache.get(archivo).exports;
    const codigo = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, importHelpers: false },
    }).outputText;
    const modulo = { exports: {} };
    cache.set(archivo, modulo);
    const requerir = (nombre) => {
      if (Object.prototype.hasOwnProperty.call(stubs, nombre)) return stubs[nombre];
      if (nombre.startsWith('.')) return cargar(path.resolve(path.dirname(archivo), `${nombre}.ts`));
      return require(nombre);
    };
    vm.runInContext(`(function (exports, require, module) {${codigo}\n})`, contexto)(modulo.exports, requerir, modulo);
    return modulo.exports;
  }

  const { TiendaEnUnPasoComponent } = cargar(ARCHIVO_COMPONENTE);

  return {
    TiendaEnUnPasoComponent,
    reloj,
    temporizadores,
    sandbox,
    /** Corre el temporizador más próximo (y mueve el reloj hasta su hora). */
    correrSiguiente() {
      temporizadores.sort((a, b) => a.vence - b.vence);
      const t = temporizadores.shift();
      assert.ok(t, 'había un temporizador pendiente');
      reloj.t = Math.max(reloj.t, t.vence);
      t.fn();
      return t;
    },
  };
}

function siguiente(cola) {
  const item = cola.length > 1 ? cola.shift() : cola[0];
  if (!item) throw new Error('la prueba no preparó una respuesta');
  return item.error ? throwError(() => item.error) : of(item.respuesta);
}

function crearComponente({ sitioPendienteId = '' } = {}) {
  const mundo = cargarComponente();
  const servicio = {
    llamadas: { iniciar: [], retomar: [], avance: [] },
    colas: { iniciar: [], retomar: [], avance: [] },
    iniciar(solicitud) {
      servicio.llamadas.iniciar.push(JSON.parse(JSON.stringify(solicitud)));
      return siguiente(servicio.colas.iniciar);
    },
    retomar(requestId) {
      servicio.llamadas.retomar.push(requestId);
      return siguiente(servicio.colas.retomar);
    },
    avance(siteId) {
      servicio.llamadas.avance.push(siteId);
      return siguiente(servicio.colas.avance);
    },
  };
  const fotos = {
    preparadas: [],
    rechazadas: new Set(),
    async prepararFoto(archivo) {
      fotos.preparadas.push(archivo.name);
      if (fotos.rechazadas.has(archivo.name)) throw Object.assign(new Error(`No pudimos abrir ${archivo.name}.`), { name: 'FotoError' });
      return { paraIA: `data:image/jpeg;base64,${'B'.repeat(30)}`, paraProducto: archivo, vistaPrevia: 'data:image/jpeg;base64,CCCC' };
    },
  };
  const router = { navegaciones: [], navigate(ruta) { router.navegaciones.push(ruta); return Promise.resolve(true); } };
  const toastr = { avisos: [], info(...a) { toastr.avisos.push(a); }, error() {}, warning() {}, success() {} };
  const c = new mundo.TiendaEnUnPasoComponent(servicio, fotos, router, toastr);
  c.sitioPendienteId = sitioPendienteId;
  return { c, servicio, fotos, router, toastr, ...mundo };
}

const ok = (data) => ({ respuesta: { success: true, data } });
const iniciada = (progress, extra = {}) => ok({ siteId: progress.siteId, reused: false, resumed: false, progress, ...extra });
const falla = (status, body) => ({ error: { status, error: body } });

function llenar(c, { fotos = 1, precio = '45.000' } = {}) {
  c.formulario.nombre = 'Flores La Montaña';
  c.formulario.descripcion = 'Ramos y arreglos florales con entrega el mismo día';
  c.formulario.fotos = Array.from({ length: fotos }, (_, i) => foto(i + 1, precio));
}

test('el componente: un formulario incompleto NO se envía y dice qué falta', () => {
  const { c, servicio } = crearComponente();
  c.ngOnInit();
  assert.equal(c.fase, 'formulario');
  c.crear();
  assert.equal(servicio.llamadas.iniciar.length, 0);
  assert.match(c.errores.nombre, /nombre de tu negocio/);
  assert.match(c.errores.descripcion, /una frase qué vendes/);

  llenar(c, { fotos: 2, precio: '' });
  c.crear();
  assert.equal(servicio.llamadas.iniciar.length, 0, 'una foto sin precio nunca viaja');
  assert.deepEqual(Object.keys(c.errores.fotos).sort(), ['1', '2']);
  assert.match(c.errores.fotos[1], /foto 1/);
  // Al corregir, el aviso se va.
  c.formulario.fotos[0].precioTexto = '45000';
  c.alEditar();
  assert.equal(c.errores.fotos[1], undefined);
  assert.match(c.errores.fotos[2], /foto 2/);
});

test('el componente: un solo envío por intento (el doble clic no manda dos) y la solicitud lleva los precios de la persona', () => {
  const { c, servicio } = crearComponente();
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued', step: 'photos' })));
  servicio.colas.avance.push(ok(avance({ state: 'running' })));
  llenar(c, { fotos: 2, precio: '$ 80.000' });
  c.formulario.fotos[1].precioTexto = '12500';

  // Un observable que no responde todavía: así el segundo clic cae mientras el primero espera.
  let respuesta;
  servicio.iniciar = (s) => {
    servicio.llamadas.iniciar.push(JSON.parse(JSON.stringify(s)));
    return { subscribe: (observador) => { respuesta = observador; return { unsubscribe() {} }; } };
  };
  c.crear();
  c.crear();
  assert.equal(c.enviando, true);
  assert.equal(servicio.llamadas.iniciar.length, 1, 'el segundo clic no manda otra solicitud');
  const s = servicio.llamadas.iniciar[0];
  assert.deepEqual(s.photos.map((p) => p.price), [80000, 12500]);
  assert.equal(s.businessName, 'Flores La Montaña');
  assert.match(s.requestId, /^tep-/);
  respuesta.next({ success: true, data: { siteId: `tep_${'a'.repeat(32)}`, reused: false, resumed: false, progress: avance({ state: 'queued' }) } });
  assert.equal(c.enviando, false);
  assert.equal(c.fase, 'avance');
});

test('el componente: la MISMA solicitud en los reintentos de red, otra cuando el servidor rechazó algo', () => {
  const { c, servicio } = crearComponente();
  llenar(c);
  servicio.colas.iniciar.push(falla(0, null), falla(504, { message: 'x' }), falla(503, { message: 'Esta función no está disponible en este momento.' }), falla(400, { code: 'PRICE_REQUIRED', message: 'Escribe el precio de la foto 1. Tiene que ser un valor mayor que cero.' }), falla(403, { code: 'AI_LIMIT_REACHED', message: 'Hoy ya usaste todas las lecturas de fotos de tu plan.' }));

  c.crear(); // sin conexión
  assert.match(c.errorGeneral, /Revisa tu internet/);
  c.crear(); // tardó demasiado
  assert.match(c.errorGeneral, /tardó más de lo normal/);
  c.crear(); // caída del servidor
  assert.match(c.errorGeneral, /no está disponible en este momento/);
  const ids = servicio.llamadas.iniciar.map((s) => s.requestId);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 1, 'sin respuesta del servidor, se reusa la misma solicitud: nunca se duplica');

  c.crear(); // el servidor la rechazó: hay algo por corregir
  assert.match(c.errorGeneral, /Escribe el precio de la foto 1/);
  c.crear();
  assert.match(c.errorGeneral, /lecturas de fotos de tu plan/);
  const despues = servicio.llamadas.iniciar.map((s) => s.requestId);
  assert.equal(despues[3], ids[0], 'el rechazo llegó con la misma solicitud');
  assert.notEqual(despues[4], ids[0], 'tras un rechazo, el próximo intento es OTRO');
  assert.equal(c.fase, 'formulario');
});

test('el componente: tras un error de red, el formulario SIN cambios reusa el requestId; con un precio corregido, uno NUEVO', () => {
  const { c, servicio } = crearComponente();
  llenar(c, { fotos: 2 });
  servicio.colas.iniciar.push(falla(0, null), falla(0, null), falla(0, null), falla(0, null));

  c.crear(); // sin conexión (el servidor pudo haber recibido la solicitud)
  c.crear(); // el mismo formulario: el mismo identificador
  c.formulario.fotos[0].precioTexto = '45000'; // otro formato del MISMO precio ('45.000')
  c.crear();
  c.formulario.fotos[1].precioTexto = '90.000'; // el comercio corrigió un precio
  c.crear();
  c.crear(); // sigue igual que el último intento: el mismo
  const ids = servicio.llamadas.iniciar.map((s) => s.requestId);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids.slice(0, 3)).size, 1, 'sin cambios reales, el mismo identificador (nunca se duplica)');
  assert.notEqual(ids[3], ids[0], 'con el precio corregido es OTRA solicitud: el servidor no reengancha la vieja en silencio');
  assert.equal(ids[4], ids[3]);
  assert.equal(servicio.llamadas.iniciar[3].photos[1].price, 90000);

  // Quitar una foto o cambiar el nombre también es otra solicitud.
  c.formulario.fotos = c.formulario.fotos.slice(0, 1);
  servicio.colas.iniciar.push(falla(0, null));
  c.crear();
  assert.notEqual(servicio.llamadas.iniciar[5].requestId, ids[4]);
});

test('el componente: si ya hay una tienda a medio crear, muestra SU avance en vez de un error', () => {
  const { c, servicio } = crearComponente();
  llenar(c);
  const pendiente = avance({ siteId: `tep_${'b'.repeat(32)}`, requestId: 'tep-del-servidor', state: 'interrupted', step: 'design', productsReady: 3, canRetry: true, message: 'Se interrumpió por una actualización de Katuq.' });
  servicio.colas.iniciar.push(falla(409, { success: false, code: 'PENDING_JOB', siteId: pendiente.siteId, message: 'Ya tienes una tienda a medio crear.' }));
  servicio.colas.avance.push(ok(pendiente));
  c.crear();
  assert.deepEqual(servicio.llamadas.avance, [pendiente.siteId]);
  assert.equal(c.fase, 'resultado');
  assert.equal(c.resumen.puedeReintentar, true);
  assert.equal(c.errorGeneral, '');
  // Reintentar usa la solicitud del servidor, no la que se generó aquí.
  servicio.colas.retomar.push(ok({ siteId: pendiente.siteId, reused: true, resumed: true, progress: avance({ siteId: pendiente.siteId, state: 'queued' }) }));
  servicio.colas.avance.length = 0;
  servicio.colas.avance.push(ok(avance({ siteId: pendiente.siteId, state: 'running' })));
  c.reintentar();
  assert.deepEqual(servicio.llamadas.retomar, ['tep-del-servidor']);
  assert.equal(c.fase, 'avance');
});

test('el componente: consulta el avance cada pocos segundos hasta que termina, y entonces avisa', () => {
  const m = crearComponente();
  const { c, servicio } = m;
  llenar(c, { fotos: 3 });
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued', step: 'photos' })));
  servicio.colas.avance.push(
    ok(avance({ state: 'running', step: 'photos', productsReady: 1 })),
    ok(avance({ state: 'running', step: 'texts', productsReady: 3 })),
    ok(avance({ state: 'done', step: 'finished', published: true, productsReady: 3, siteUrl: 'https://flores.katuq.com/', message: '¡Tu tienda está lista y publicada!' }))
  );
  c.crear();
  assert.equal(c.fase, 'avance');
  assert.equal(servicio.llamadas.avance.length, 0, 'todavía no se consultó: se espera la pausa');
  assert.equal(m.temporizadores.length, 1);
  assert.equal(m.temporizadores[0].ms, 3000);

  m.correrSiguiente();
  assert.equal(servicio.llamadas.avance.length, 1);
  assert.equal(c.avance.productsReady, 1);
  assert.equal(c.fase, 'avance');
  assert.equal(c.pasos[0].detalle, '1 de 3 productos listos');
  assert.equal(m.temporizadores.length, 1, 'sigue consultando');

  m.correrSiguiente();
  assert.equal(c.pasos[0].estado, 'listo');
  assert.equal(c.pasos[1].estado, 'activo');

  m.correrSiguiente();
  assert.equal(c.fase, 'resultado');
  assert.equal(c.resumen.tono, 'ok');
  assert.equal(c.resumen.puedeVer, true);
  assert.equal(m.temporizadores.length, 0, 'ya no se consulta');
  assert.equal(c.terminado.valores.length, 1, 'avisa a la lista para que se refresque');
  assert.equal(c.terminado.valores[0].published, true);
});

test('el componente: después de 2 minutos espacia las consultas', () => {
  const m = crearComponente();
  const { c, servicio } = m;
  llenar(c);
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  servicio.colas.avance.push(ok(avance({ state: 'running' })));
  c.crear();
  assert.equal(m.temporizadores[0].ms, 3000);
  m.reloj.t += 125000;
  m.correrSiguiente();
  assert.equal(m.temporizadores[0].ms, 5000);
});

test('el componente: si pasa demasiado tiempo, deja de consultar y lo dice (el trabajo sigue en el servidor)', () => {
  const m = crearComponente();
  const { c, servicio } = m;
  llenar(c);
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  servicio.colas.avance.push(ok(avance({ state: 'running' })));
  c.crear();
  m.reloj.t += 13 * 60 * 1000;
  m.correrSiguiente();
  assert.equal(m.temporizadores.length, 0);
  assert.equal(c.fase, 'avance');
  assert.match(c.avisoLargo, /tu tienda sigue creándose/);
});

test('el componente: unas consultas que fallan no lo tumban; muchas seguidas avisan; una tienda inexistente para de una', () => {
  const m = crearComponente();
  const { c, servicio } = m;
  llenar(c);
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  servicio.colas.avance.push(falla(0, null), falla(0, null), ok(avance({ state: 'running' })));
  c.crear();
  m.correrSiguiente(); // falla 1
  assert.equal(m.temporizadores.length, 1, 'sigue intentando');
  assert.equal(c.avisoLargo, '');
  m.correrSiguiente(); // falla 2
  m.correrSiguiente(); // responde bien: el contador de fallos vuelve a cero
  assert.equal(c.avance.state, 'running');

  // Cinco seguidas: se rinde y avisa que se perdió la conexión.
  const otro = crearComponente();
  llenar(otro.c);
  otro.servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  otro.servicio.colas.avance.push(falla(0, null));
  otro.c.crear();
  for (let i = 0; i < 5; i++) otro.correrSiguiente();
  assert.equal(otro.temporizadores.length, 0);
  assert.match(otro.c.avisoLargo, /Perdimos la conexión con tu tienda, pero sigue creándose/);

  // 404: no existe, seguir consultando no arregla nada.
  const tres = crearComponente();
  llenar(tres.c);
  tres.servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  tres.servicio.colas.avance.push(falla(404, { success: false, code: 'NOT_FOUND', message: 'No encontramos esa tienda.' }));
  tres.c.crear();
  tres.correrSiguiente();
  assert.equal(tres.temporizadores.length, 0);
  assert.equal(tres.c.avisoLargo, 'No encontramos esa tienda.');
});

test('el componente: un trabajo interrumpido se retoma con la misma solicitud y vuelve a consultarse', () => {
  const m = crearComponente();
  const { c, servicio } = m;
  llenar(c, { fotos: 2 });
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  servicio.colas.avance.push(
    ok(avance({ state: 'interrupted', step: 'design', productsReady: 2, canRetry: true, message: 'Se interrumpió por una actualización de Katuq. No perdiste nada: toca «Reintentar».' }))
  );
  c.crear();
  const requestId = servicio.llamadas.iniciar[0].requestId;
  m.correrSiguiente();
  assert.equal(c.fase, 'resultado');
  assert.equal(c.resumen.puedeReintentar, true);
  assert.match(c.resumen.texto, /No perdiste nada/);
  assert.equal(m.temporizadores.length, 0, 'un trabajo interrumpido no se consulta: la persona decide');

  servicio.colas.retomar.push(ok({ siteId: c.avance.siteId, reused: true, resumed: true, progress: avance({ state: 'queued', step: 'design' }) }));
  servicio.colas.avance.length = 0; // el último de la cola se repite: se vacía antes de la nueva secuencia
  servicio.colas.avance.push(ok(avance({ state: 'done', step: 'finished', published: true, productsReady: 2, siteUrl: 'https://flores.katuq.com/' })));
  c.reintentar();
  assert.deepEqual(servicio.llamadas.retomar, [requestId], 'la MISMA solicitud: no se repite nada');
  assert.equal(c.fase, 'avance');
  assert.equal(m.temporizadores.length, 1);
  m.correrSiguiente();
  assert.equal(c.fase, 'resultado');
  assert.equal(c.resumen.tono, 'ok');
  // Un reintento que se pulsa dos veces seguidas no manda dos.
  c.reintentar();
});

test('el componente: al abrir con una tienda a medias, muestra su avance y adopta su solicitud', () => {
  const { c, servicio } = crearComponente({ sitioPendienteId: `tep_${'c'.repeat(32)}` });
  servicio.colas.avance.push(ok(avance({ siteId: `tep_${'c'.repeat(32)}`, requestId: 'tep-guardada', state: 'failed', canRetry: true })));
  c.ngOnInit();
  assert.deepEqual(servicio.llamadas.avance, [`tep_${'c'.repeat(32)}`]);
  assert.equal(c.fase, 'resultado');
  assert.equal(c.resumen.puedeReintentar, true);
  servicio.colas.retomar.push(ok({ siteId: c.avance.siteId, reused: true, resumed: true, progress: avance({ state: 'queued' }) }));
  servicio.colas.avance.length = 0;
  servicio.colas.avance.push(ok(avance({ state: 'running' })));
  c.reintentar();
  assert.deepEqual(servicio.llamadas.retomar, ['tep-guardada']);

  // Si la tienda ya no existe, vuelve al formulario con el motivo.
  const huerfano = crearComponente({ sitioPendienteId: `tep_${'d'.repeat(32)}` });
  huerfano.servicio.colas.avance.push(falla(404, { success: false, code: 'NOT_FOUND', message: 'No encontramos esa tienda.' }));
  huerfano.c.ngOnInit();
  assert.equal(huerfano.c.fase, 'formulario');
  assert.equal(huerfano.c.errorGeneral, 'No encontramos esa tienda.');
});

test('el componente: cerrar la ventana no cancela nada y no se pierde lo escrito por un clic afuera', () => {
  const m = crearComponente();
  const { c, servicio } = m;
  // Formulario vacío: el clic afuera cierra.
  c.alClicEnVelo();
  assert.equal(c.cerrar.valores.length, 1);
  // Con algo escrito, no.
  c.formulario.nombre = 'Flores';
  c.alClicEnVelo();
  c.alEscape();
  assert.equal(c.cerrar.valores.length, 1);
  // El botón Cerrar sí cierra siempre, salvo mientras envía.
  c.cerrarVentana();
  assert.equal(c.cerrar.valores.length, 2);
  c.enviando = true;
  c.cerrarVentana();
  assert.equal(c.cerrar.valores.length, 2);
  c.enviando = false;

  // En el avance, el clic afuera NO cierra (se pierde de vista el trabajo), y cerrar deja de consultar.
  llenar(c);
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  servicio.colas.avance.push(ok(avance({ state: 'running' })));
  c.crear();
  c.alClicEnVelo();
  assert.equal(c.cerrar.valores.length, 2);
  assert.equal(m.temporizadores.length, 1);
  c.ngOnDestroy();
  assert.equal(m.temporizadores.length, 0, 'al cerrar se deja de consultar; el servidor sigue');

  // En el resultado, el clic afuera cierra.
  const r = crearComponente();
  llenar(r.c);
  r.servicio.colas.iniciar.push(iniciada(avance({ state: 'done', published: true, siteUrl: 'https://x.katuq.com/' })));
  r.c.crear();
  assert.equal(r.c.fase, 'resultado');
  r.c.alClicEnVelo();
  assert.equal(r.c.cerrar.valores.length, 1);
});

test('el componente: después de destruido no vuelve a consultar ni a emitir', () => {
  const m = crearComponente();
  const { c, servicio } = m;
  llenar(c);
  servicio.colas.iniciar.push(iniciada(avance({ state: 'queued' })));
  servicio.colas.avance.push(ok(avance({ state: 'done', published: true, siteUrl: 'https://x.katuq.com/' })));
  c.crear();
  c.ngOnDestroy();
  assert.equal(m.temporizadores.length, 0);
  assert.equal(servicio.llamadas.avance.length, 0);
  assert.equal(c.terminado.valores.length, 0);
});

test('el componente: las fotos se reducen en el navegador, caben 3, y una que no sirve se avisa sin romper nada', async () => {
  const { c, fotos } = crearComponente();
  fotos.rechazadas.add('mala.pdf');
  const archivos = (...nombres) => ({ target: { files: nombres.map((name) => ({ name })), value: 'x' } });

  const e1 = archivos('a.jpg', 'mala.pdf', 'b.jpg');
  await c.alElegirFotos(e1);
  assert.equal(e1.target.value, '', 'se limpia el campo para poder elegir el mismo archivo otra vez');
  assert.equal(c.formulario.fotos.length, 2);
  assert.match(c.avisoFotos, /No pudimos abrir mala\.pdf/);
  assert.equal(c.preparandoFotos, 0);
  assert.equal(c.cupoDeFotos, 1);
  assert.ok(c.formulario.fotos.every((f) => f.imagen.startsWith('data:image/jpeg') && f.precioTexto === ''), 'nace sin precio: lo escribe la persona');
  assert.equal(new Set(c.formulario.fotos.map((f) => f.id)).size, 2);

  await c.alElegirFotos(archivos('c.jpg', 'd.jpg', 'e.jpg'));
  assert.equal(c.formulario.fotos.length, 3, 'caben tres');
  assert.match(c.avisoFotos, /Solo caben 3 fotos en total/);
  assert.deepEqual(fotos.preparadas, ['a.jpg', 'mala.pdf', 'b.jpg', 'c.jpg'], 'las que no caben ni se preparan');
  assert.equal(c.cupoDeFotos, 0);

  const primera = c.formulario.fotos[0];
  c.quitarFoto(primera);
  assert.equal(c.formulario.fotos.length, 2);
  assert.equal(c.cupoDeFotos, 1);
  assert.equal(c.precioEntendido({ precioTexto: '45.000' }), '$ 45.000');
  assert.equal(c.precioEntendido({ precioTexto: 'gratis' }), '');
});

test('el componente: no se envía mientras se está preparando una foto', async () => {
  const { c, servicio, fotos } = crearComponente();
  llenar(c);
  let liberar;
  fotos.prepararFoto = () => new Promise((resolver) => { liberar = () => resolver({ paraIA: 'data:image/jpeg;base64,DDDD', vistaPrevia: '' }); });
  const espera = c.alElegirFotos({ target: { files: [{ name: 'lenta.jpg' }], value: '' } });
  assert.equal(c.preparandoFotos, 1);
  c.crear();
  assert.equal(servicio.llamadas.iniciar.length, 0);
  assert.match(c.errorGeneral, /preparando tus fotos/);
  liberar();
  await espera;
  assert.equal(c.preparandoFotos, 0);
});

test('el componente: ver la tienda, copiar el enlace y los atajos al terminar', () => {
  const m = crearComponente();
  const { c, servicio, router, toastr } = m;
  llenar(c);
  servicio.colas.iniciar.push(iniciada(avance({ state: 'done', published: true, siteUrl: 'https://flores.katuq.com/', previewUrl: 'https://back.katuq.com/p', productsReady: 1 })));
  c.crear();
  c.verTienda();
  assert.deepEqual(m.sandbox.__abiertos, [['https://flores.katuq.com/', '_blank', 'noopener']]);
  c.verVistaPrevia();
  assert.equal(m.sandbox.__abiertos[1][0], 'https://back.katuq.com/p');
  c.copiarEnlace(); // sin portapapeles: se muestra el enlace para copiarlo a mano
  assert.deepEqual(toastr.avisos[0], ['https://flores.katuq.com/', 'Copia el enlace']);
  c.irAlEditor();
  const plano = (x) => JSON.parse(JSON.stringify(x)); // los arreglos del componente nacen en otro contexto
  assert.deepEqual(plano(router.navegaciones[0]), ['/sitios/editor', `tep_${'a'.repeat(32)}`]);
  c.agregarProducto();
  assert.deepEqual(plano(router.navegaciones[1]), ['/productos/crear-rapido']);
  assert.equal(c.cerrar.valores.length, 2);
});

// ── 2b. La lista de "Mis páginas" (la bandera y el sondeo), sin Angular ───────

const ARCHIVO_LISTA = path.join(RAIZ, 'src/app/components/sitios/lista/sitios-lista.component.ts');

function cargarLista() {
  const reloj = { t: Date.parse('2026-10-09T15:00:00.000Z') };
  const intervalos = [];
  let siguienteId = 1;
  class FechaFalsa extends Date {
    static now() {
      return reloj.t;
    }
  }
  const sandbox = {
    console,
    Date: FechaFalsa,
    setInterval(fn, ms) {
      const id = siguienteId++;
      intervalos.push({ id, fn, ms });
      return id;
    },
    clearInterval(id) {
      const i = intervalos.findIndex((t) => t.id === id);
      if (i >= 0) intervalos.splice(i, 1);
    },
    setTimeout,
    clearTimeout,
  };
  const contexto = vm.createContext(sandbox);
  const cache = new Map();
  const stubs = {
    '@angular/core': { Component: () => (clase) => clase, HostListener: () => () => undefined },
    'sweetalert2': { default: { fire: () => Promise.resolve({}) } },
    '@angular/router': { Router: class {} },
    'ngx-toastr': { ToastrService: class {} },
    '../../../../environments/environment': { environment: { dominioSitios: 'katuq.com' } },
  };
  function cargar(archivo) {
    if (cache.has(archivo)) return cache.get(archivo).exports;
    const codigo = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, importHelpers: false },
    }).outputText;
    const modulo = { exports: {} };
    cache.set(archivo, modulo);
    const requerir = (nombre) => {
      if (Object.prototype.hasOwnProperty.call(stubs, nombre)) return stubs[nombre];
      if (nombre.startsWith('.')) return cargar(path.resolve(path.dirname(archivo), `${nombre}.ts`));
      return require(nombre);
    };
    vm.runInContext(`(function (exports, require, module) {${codigo}\n})`, contexto)(modulo.exports, requerir, modulo);
    return modulo.exports;
  }
  const { SitiosListaComponent } = cargar(ARCHIVO_LISTA);
  return {
    SitiosListaComponent,
    reloj,
    intervalos,
    /** Corre lo que el sondeo haría cuando se cumple su plazo. */
    correrSondeo() {
      assert.ok(intervalos[0], 'había un sondeo corriendo');
      intervalos[0].fn();
    },
  };
}

const sitioDeLaFuncion = (id, estado, extra = {}) => ({
  id, nombre: `Tienda ${id}`, estado: 'borrador', origen: 'tienda-en-un-paso',
  creationProgress: { state: estado, heartbeatAt: new Date(Date.parse('2026-10-09T15:00:00.000Z') - 2000).toISOString(), ...extra },
});

function crearLista({ sitios = [], bandera = true } = {}) {
  const mundo = cargarLista();
  const estado = { sitios, bandera };
  const servicio = {
    listados: 0,
    listar() {
      servicio.listados++;
      return of({ data: estado.sitios });
    },
    kitDeMarca: () => of({ data: {} }),
  };
  const features = { isEnabled: (flag) => flag === 'singleStepStore' && estado.bandera === true };
  const c = new mundo.SitiosListaComponent(servicio, {}, {}, features);
  return { c, servicio, estado, features, ...mundo };
}

test('la lista: con la bandera APAGADA una tienda de esta función se ve y se edita como cualquier otra', () => {
  const trabajando = sitioDeLaFuncion('a', 'running');
  const sinTerminar = sitioDeLaFuncion('b', 'interrupted');
  const normal = { id: 'n', nombre: 'Normal', estado: 'publicado', origen: 'plantilla' };

  const apagada = crearLista({ sitios: [trabajando, sinTerminar, normal], bandera: false });
  for (const sitio of [trabajando, sinTerminar, normal]) assert.equal(apagada.c.tarjeta(sitio), null, `${sitio.id}: sin "Retomar" ni "Creándose" que no abren nada`);

  // La misma tarjeta con la bandera encendida: la de esta función.
  const encendida = crearLista({ sitios: [trabajando, sinTerminar, normal], bandera: true });
  assert.equal(encendida.c.tarjeta(trabajando), 'creandose');
  assert.equal(encendida.c.tarjeta(sinTerminar), 'sin-terminar');
  assert.equal(encendida.c.tarjeta(normal), null);

  // Y los atajos tampoco hacen nada con la bandera apagada.
  apagada.c.abrirTiendaEnUnPaso();
  apagada.c.verAvanceDe(trabajando);
  assert.equal(apagada.c.mostrandoTiendaEnUnPaso, false);
});

test('la lista: mientras una tienda se crea, la lista se refresca sola; al terminar y al destruirla, el sondeo se detiene', () => {
  const m = crearLista({ sitios: [sitioDeLaFuncion('a', 'running')] });
  m.c.ngOnInit();
  assert.equal(m.intervalos.length, 1, 'arranca el sondeo');
  assert.equal(m.intervalos[0].ms, 8000);
  m.c.ngOnInit();
  assert.equal(m.intervalos.length, 1, 'nunca dos sondeos a la vez');

  // El plazo se cumple y la tienda sigue creándose: sigue.
  const antes = m.servicio.listados;
  m.correrSondeo();
  assert.equal(m.servicio.listados, antes + 1, 'volvió a leer la lista');
  assert.equal(m.intervalos.length, 1);

  // La tienda termina: el sondeo se detiene solo.
  m.estado.sitios = [sitioDeLaFuncion('a', 'done')];
  m.correrSondeo();
  assert.equal(m.intervalos.length, 0, 'nada se está creando: ya no se consulta');

  // Se destruye la pantalla con un sondeo corriendo: se detiene también.
  const otra = crearLista({ sitios: [sitioDeLaFuncion('b', 'queued')] });
  otra.c.ngOnInit();
  assert.equal(otra.intervalos.length, 1);
  otra.c.ngOnDestroy();
  assert.equal(otra.intervalos.length, 0, 'al destruir la pantalla se deja de consultar');
  otra.c.ngOnDestroy(); // idempotente
});

test('la lista: sin tiendas de esta función, o con la bandera apagada, NUNCA arranca un sondeo', () => {
  for (const [nombre, sitios, bandera] of [
    ['lista de siempre', [{ id: 'n', nombre: 'Normal', estado: 'publicado', origen: 'plantilla' }, { id: 'r', origen: 'registro', creationProgress: { state: 'running' } }], true],
    ['tienda de esta función ya terminada', [sitioDeLaFuncion('a', 'done')], true],
    ['sin terminar (no está corriendo)', [sitioDeLaFuncion('a', 'interrupted')], true],
    ['bandera apagada con una tienda "creándose"', [sitioDeLaFuncion('a', 'running')], false],
  ]) {
    const m = crearLista({ sitios, bandera });
    m.c.ngOnInit();
    assert.equal(m.intervalos.length, 0, nombre);
  }
  // Un trabajo "en curso" que dejó de dar latidos hace rato ya no se sondea: se muestra "sin terminar".
  const viejo = crearLista({ sitios: [sitioDeLaFuncion('a', 'running', { heartbeatAt: new Date(Date.parse('2026-10-09T15:00:00.000Z') - 300000).toISOString() })] });
  viejo.c.ngOnInit();
  assert.equal(viejo.intervalos.length, 0);
  assert.equal(viejo.c.tarjeta(viejo.c.sitios[0]), 'sin-terminar');
});

// ── 3. Contratos de las fuentes ──────────────────────────────────────────────

const leer = (relativa) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

test('contrato: solo con la bandera se ofrece y se dibuja; sin ella la lista queda igual', () => {
  const html = leer('src/app/components/sitios/lista/sitios-lista.component.html');
  const ts_ = leer('src/app/components/sitios/lista/sitios-lista.component.ts');
  // El componente y la opción de entrada, detrás de la bandera.
  assert.match(html, /<app-tienda-en-un-paso\s+\*ngIf="mostrandoTiendaEnUnPaso && features\.isEnabled\('singleStepStore'\)"/);
  assert.match(html, /opcion-grande--ia" \*ngIf="features\.isEnabled\('singleStepStore'\)"/);
  // Todo lo que menciona la función en la plantilla está detrás de una de esas condiciones
  // o es una tarjeta que solo existe para sitios de esta función (`tarjeta(s)` es null en los demás).
  for (const linea of html.split('\n').filter((l) => /abrirTiendaEnUnPaso|app-tienda-en-un-paso/.test(l))) {
    assert.ok(/singleStepStore|<\/?app-tienda-en-un-paso|\(click\)="abrirTiendaEnUnPaso/.test(linea), linea);
  }
  assert.match(ts_, /public features: CompanyFeaturesService/);
  assert.match(ts_, /if \(!this\.features\.isEnabled\("singleStepStore"\)\) return;/);
  // La bandera existe en el catálogo del front.
  assert.match(leer('src/app/shared/services/company-features.service.ts'), /'singleStepStore'/);
  // El módulo declara el componente y NO se creó ninguna ruta ni entrada de menú.
  assert.match(leer('src/app/components/sitios/sitios.module.ts'), /TiendaEnUnPasoComponent,/);
  assert.ok(!/tienda-en-un-paso/.test(leer('src/app/components/sitios/sitios-routing.module.ts')));
  assert.ok(!/tienda-en-un-paso/.test(leer('src/app/shared/services/nav.service.ts')));
  assert.ok(!/tienda-en-un-paso/.test(leer('src/app/shared/routes/routes.ts')));
});

test('contrato: el HTTP va por un servicio que extiende BaseService, nunca HttpClient en el componente', () => {
  const servicio = leer('src/app/components/sitios/tienda-en-un-paso/tienda-en-un-paso.service.ts');
  const componente = leer('src/app/components/sitios/tienda-en-un-paso/tienda-en-un-paso.component.ts');
  assert.match(servicio, /export class TiendaEnUnPasoService extends BaseService/);
  assert.match(servicio, /this\.post<RespuestaIniciar>\('\/v1\/onboarding\/tienda-en-un-paso', solicitud\)/);
  assert.match(servicio, /this\.post<RespuestaIniciar>\('\/v1\/onboarding\/tienda-en-un-paso', \{ requestId \}\)/);
  assert.match(servicio, /this\.get<RespuestaAvance>\(`\/v1\/onboarding\/tienda-en-un-paso\/\$\{encodeURIComponent\(siteId\)\}`\)/);
  assert.ok(!/HttpClient/.test(componente), 'el componente no habla HTTP directo');
  assert.ok(!/localStorage|sessionStorage/.test(componente), 'ni guarda nada en el navegador');
  // Ni empresa ni usuario viajan en la solicitud: los pone el interceptor y manda el token.
  assert.ok(!/company|empresa/i.test(servicio.replace(/\/\*[\s\S]*?\*\//g, '')));
});

test('contrato: la UI nueva respeta el tema canónico (sin degradados, sin primarios paralelos, solo colores de la tabla)', () => {
  const scss = leer('src/app/components/sitios/tienda-en-un-paso/tienda-en-un-paso.component.scss');
  assert.ok(!/-gradient\s*\(/i.test(scss), 'plano: sin gradientes');
  assert.ok(!/border-left:\s*[^;]*(solid|px)\s+(\$|#)/.test(scss), 'sin el patrón viejo de acento a la izquierda');
  for (const prohibido of ['#2196f3', '#4361ee', '#2563eb', '#5c6ac4', '#667eea']) assert.ok(!scss.toLowerCase().includes(prohibido), prohibido);
  // Toda la tabla de openspec/specs/design-system/spec.md (+ el hover del primario y el ghost, que el spec fija).
  const permitidos = new Set(
    ['#5F3FE0', '#7C5CFF', '#211F3A', '#8f8bab', '#9995b3', '#ececf4', '#f1f0f7', '#f5f4fa', '#e9e7f3', '#faf9fe', '#faf9ff', '#f3f1fb',
      '#1E874B', '#E6F7EE', '#D9820A', '#FFF1DF', '#D64545', '#FDECEC', '#1E6FD9', '#E7F1FF', '#3B82C4', '#EAF4FF', '#efe9ff', '#8E27B0',
      '#f3e9fb', '#5A6B78', '#eef0f3', '#eeecf7', '#4a2fc0', '#e4e2ef', '#5b5878', '#FF9800', '#eceaf4', '#fff'].map((c) => c.toLowerCase())
  );
  for (const color of scss.match(/#[0-9a-fA-F]{3,8}\b/g) || []) assert.ok(permitidos.has(color.toLowerCase()), `color fuera de la tabla: ${color}`);
  // Geometría del canon: paneles 16, filas 11, inputs 10, chips 20.
  for (const radio of ['16px', '11px', '10px', '20px']) assert.ok(scss.includes(`: ${radio};`), radio);
  // Nada de la UI nueva en el HTML trae estilos en línea ni HTML sin escapar.
  const html = leer('src/app/components/sitios/tienda-en-un-paso/tienda-en-un-paso.component.html');
  assert.ok(!/\[innerHTML\]|style="/.test(html));
});

test('contrato: los textos de la pantalla están en español claro, sin jerga ni códigos', () => {
  const html = leer('src/app/components/sitios/tienda-en-un-paso/tienda-en-un-paso.component.html');
  const visible = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\{\{[^}]*\}\}/g, ' ');
  assert.ok(!/\b(SKU|payload|token|JSON|SSRF|endpoint|requestId|data URL|base64)\b/i.test(visible), 'jerga en la pantalla');
  for (const frase of ['Crear mi tienda', 'Nombre de tu negocio', 'Precio de venta', 'Reintentar', 'Ver mi tienda', 'Mis páginas']) {
    assert.ok(html.includes(frase), frase);
  }
});
