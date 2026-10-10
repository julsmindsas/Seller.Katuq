/**
 * Alistamiento (picking): textos para el comercio y conversiones del estado.
 *
 * Carga el archivo TypeScript puro `picking-mensajes.ts` (sin Angular) con el mismo truco
 * de tests/opttia-markdown.test.js y lo prueba con Node. Correr desde la raíz del repo:
 *   node --test tests/picking-packing/picking-mensajes.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/app/components/picking-packing/picking-mensajes.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;
const target = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, target, target.exports);
const {
  aFechaIso,
  avisoDeErrorPicking,
  bodegaSugerida,
  desdeEstadoServidor,
  destinoDelDetalle,
  escaparHtml,
  lineasDePicking,
  mensajeAHtml,
  normalizarEstadoAlistamiento,
  puedeAlistarse,
  textoDeConfirmarCompletar,
  textoDeEstadoAlistamiento,
  textoDeEstadoPedido,
} = target.exports;

const linea = (cd, titulo, cantidad, extra = {}) => ({
  cantidad,
  producto: { cd, crearProducto: { titulo }, identificacion: { referencia: `REF-${cd}` }, ...extra },
});

// ── Pedido -> líneas a alistar ─────────────────────────────────────────────────────────

test('las líneas a alistar salen del carrito, con nombre y referencia', () => {
  const { lineas, omitidas } = lineasDePicking({ carrito: [linea('prodA', 'Rosa roja', 3)] });
  assert.deepEqual(lineas, [{ productoId: 'prodA', nombre: 'Rosa roja', sku: 'REF-prodA', cantidad: 3 }]);
  assert.equal(omitidas, 0);
});

test('un producto repetido en varias líneas se suma en una sola', () => {
  const { lineas } = lineasDePicking({ carrito: [linea('prodA', 'Rosa roja', 2), linea('prodB', 'Girasol', 1), linea('prodA', 'Rosa roja', 5)] });
  assert.equal(lineas.length, 2);
  assert.equal(lineas.find((l) => l.productoId === 'prodA').cantidad, 7);
});

test('servicios, líneas sin producto y líneas sin cantidad no se alistan y se cuentan', () => {
  const { lineas, omitidas } = lineasDePicking({
    carrito: [
      linea('prodA', 'Rosa roja', 1),
      linea('serv1', 'Domicilio', 1, { disponibilidad: { inventariable: false } }),
      { cantidad: 2, producto: {} },
      linea('prodC', 'Sin cantidad', 0),
      null,
    ],
  });
  assert.deepEqual(lineas.map((l) => l.productoId), ['prodA']);
  assert.equal(omitidas, 4);
});

test('sin carrito no hay nada que alistar y no se cae', () => {
  assert.deepEqual(lineasDePicking(undefined), { lineas: [], omitidas: 0 });
  assert.deepEqual(lineasDePicking({}), { lineas: [], omitidas: 0 });
});

test('la bodega sugerida es la del pedido solo si sigue entre las activas (código de negocio)', () => {
  const bodegas = [{ idBodega: 'BOD-001' }, { idBodega: 'BOD-002' }];
  assert.equal(bodegaSugerida(bodegas, 'BOD-002'), 'BOD-002');
  assert.equal(bodegaSugerida(bodegas, 'BOD-999'), '');
  assert.equal(bodegaSugerida(bodegas, undefined), '');
  assert.equal(bodegaSugerida(undefined, 'BOD-001'), '');
});

test('"picking/nuevo" no trae :id: se reconoce por la ruta y manda a elegir el pedido', () => {
  assert.deepEqual(destinoDelDetalle('nuevo', undefined), { eligePedido: true, nroPedido: '' });
  assert.deepEqual(destinoDelDetalle('nuevo', null), { eligePedido: true, nroPedido: '' });
});

test('las rutas con :id traen el número del pedido (se limpia de espacios)', () => {
  assert.deepEqual(destinoDelDetalle('orden/:id', 'FLO-000001'), { eligePedido: false, nroPedido: 'FLO-000001' });
  assert.deepEqual(destinoDelDetalle(':id', '  FLO-000002 '), { eligePedido: false, nroPedido: 'FLO-000002' });
});

test('si no hay número de pedido, se elige el pedido en vez de pedir uno vacío al servidor', () => {
  assert.deepEqual(destinoDelDetalle(undefined, undefined), { eligePedido: true, nroPedido: '' });
  assert.deepEqual(destinoDelDetalle(':id', ''), { eligePedido: true, nroPedido: '' });
  // Compatibilidad con la versión anterior, que esperaba "nuevo" como :id
  assert.deepEqual(destinoDelDetalle(':id', 'nuevo'), { eligePedido: true, nroPedido: '' });
});

// ── Estados ────────────────────────────────────────────────────────────────────────────

test('solo se empieza a alistar un pedido en un estado que lo permite', () => {
  for (const estado of ['SinProducir', 'EnProduccion', 'ParaDespachar']) assert.equal(puedeAlistarse(estado), true, estado);
  for (const estado of ['Entregado', 'Cerrado', 'Despachado', 'EnPicking', 'Cancelado', '', undefined, null]) {
    assert.equal(puedeAlistarse(estado), false, String(estado));
  }
});

test('los estados del pedido se leen en cristiano', () => {
  assert.equal(textoDeEstadoPedido('SinProducir'), 'Sin producir');
  assert.equal(textoDeEstadoPedido('EnPicking'), 'En alistamiento');
  assert.equal(textoDeEstadoPedido('ListoParaPacking'), 'Listo para empacar');
  assert.equal(textoDeEstadoPedido('AceptadoProveedor'), 'Aceptado proveedor', 'un estado nuevo se separa por palabras');
  assert.equal(textoDeEstadoPedido(undefined), '');
});

test('el servidor dice "iniciado" y la pantalla entiende "en proceso"', () => {
  assert.equal(normalizarEstadoAlistamiento('iniciado'), 'en_proceso');
  assert.equal(normalizarEstadoAlistamiento('en_proceso'), 'en_proceso');
  assert.equal(normalizarEstadoAlistamiento('completado'), 'completado');
  assert.equal(normalizarEstadoAlistamiento('cancelado'), 'cancelado');
  assert.equal(textoDeEstadoAlistamiento('iniciado'), 'En proceso');
  assert.equal(textoDeEstadoAlistamiento('completado'), 'Completado');
});

// ── Fechas y respuesta del servidor ────────────────────────────────────────────────────

test('las fechas de Firestore (JSON) se vuelven fechas que el pipe date entiende', () => {
  assert.equal(aFechaIso({ _seconds: 1760000000, _nanoseconds: 500000000 }), '2025-10-09T08:53:20.500Z');
  assert.equal(aFechaIso({ seconds: 1760000000 }), '2025-10-09T08:53:20.000Z');
  assert.equal(aFechaIso('2026-10-08T10:00:00.000Z'), '2026-10-08T10:00:00.000Z');
  assert.equal(aFechaIso(null), undefined);
  assert.equal(aFechaIso({}), undefined);
});

test('el alistamiento recién iniciado y el completado se leen bien aunque el servidor cambie las líneas', () => {
  const iniciado = desdeEstadoServidor({
    picking: {
      id: 'pk1',
      ordenId: 'ped1',
      bodegaId: 'BOD-001',
      estado: 'iniciado',
      fechaInicio: { _seconds: 1760000000, _nanoseconds: 0 },
      productos: [{ productoId: 'prodA', nombre: 'Rosa roja', sku: 'REF-A', cantidad: 3, estado: 'pendiente', cantidadRecolectada: 0 }],
    },
    pedido: { nroPedido: 'FLO-000001' },
  });
  assert.equal(iniciado._id, 'pk1');
  assert.equal(iniciado.estado, 'en_proceso');
  assert.equal(iniciado.productos[0].cantidad, 3);
  assert.equal(iniciado.productos[0].recolectado, false);
  assert.equal(iniciado.fechaInicio, '2025-10-09T08:53:20.000Z');
  assert.equal(iniciado.pedido.nroPedido, 'FLO-000001');

  // Al completar, el servidor reescribe las líneas: sin nombre, y con cantidadSolicitada
  const completado = desdeEstadoServidor({
    picking: {
      id: 'pk1',
      ordenId: 'ped1',
      estado: 'completado',
      productos: [{ productoId: 'prodA', cantidadSolicitada: 3, cantidadRecolectada: 3, estado: 'recolectado' }],
    },
  });
  assert.equal(completado.estado, 'completado');
  assert.equal(completado.productos[0].cantidad, 3);
  assert.equal(completado.productos[0].cantidadRecolectada, 3);
  assert.equal(completado.productos[0].recolectado, true);
  assert.equal(completado.productos[0].nombre, '');
});

// ── Errores para el comercio ───────────────────────────────────────────────────────────

const http = (status, cuerpo) => ({ status, error: cuerpo });
const CTX = { nroPedido: 'FLO-000001', nombresPorId: { prodA: 'Rosa roja', prodB: 'Girasol' }, nombreBodega: 'Principal' };

test('si el interceptor ya avisó (sin conexión, sesión, permisos, solo lectura) no se repite el aviso', () => {
  for (const status of [0, 401, 403, 423, undefined]) {
    assert.equal(avisoDeErrorPicking(http(status, {}), 'iniciar', CTX), null, String(status));
  }
});

test('sin existencias: nombra cada producto, dice cuánto hay y qué hacer, sin ids', () => {
  const aviso = avisoDeErrorPicking(
    http(400, {
      error: 'Errores de validación en productos para picking',
      detalles: [
        'Stock insuficiente para el producto prodA. Disponible: 2, Solicitado: 5',
        'Producto con ID prodB no encontrado en el inventario de la bodega',
        'Producto con ID zzz999 no encontrado en el inventario de la bodega',
      ],
    }),
    'iniciar',
    CTX,
  );
  assert.equal(aviso.titulo, 'No se pudo iniciar el alistamiento');
  assert.match(aviso.mensaje, /pedido FLO-000001/);
  assert.match(aviso.mensaje, /bodega «Principal»/);
  assert.match(aviso.mensaje, /«Rosa roja»: hay 2 y el pedido pide 5\./);
  assert.match(aviso.mensaje, /«Girasol» no está en la bodega «Principal»\./);
  assert.match(aviso.mensaje, /Un producto del pedido no está/);
  // R10: la venta ya descontó el pedido, así que NO se manda a "corregir el inventario" (lo inflaría)
  assert.match(aviso.mensaje, /cuando se vende un pedido, Katuq descuenta sus unidades del inventario/);
  assert.match(aviso.mensaje, /No cambies el inventario por este aviso: elige otra bodega o escríbenos por soporte con el número del pedido\.$/);
  assert.doesNotMatch(aviso.mensaje, /corrige el inventario/);
  assert.doesNotMatch(aviso.mensaje, /prodA|prodB|zzz999/, 'no se muestran identificadores internos');
});

test('existencias negativas se muestran como cero', () => {
  const aviso = avisoDeErrorPicking(
    http(400, { error: 'Errores de validación en productos para picking', detalles: ['Stock insuficiente para el producto prodA. Disponible: -3, Solicitado: 1'] }),
    'iniciar',
    CTX,
  );
  assert.match(aviso.mensaje, /hay 0 y el pedido pide 1/);
});

test('cada error conocido del servidor tiene su frase', () => {
  const casos = [
    [400, 'Ya existe un proceso de picking activo para este pedido', 'iniciar', /Ya hay un alistamiento en curso para el pedido FLO-000001\. Recarga la página/],
    [400, 'No se puede iniciar picking en un pedido ya entregado o cerrado', 'iniciar', /ya fue entregado o cerrado/],
    [400, 'No se puede iniciar picking en un pedido ya alistado (estado ListoParaPacking)', 'iniciar', /Ese pedido ya se alistó\. Recarga la página para ver cómo quedó\./],
    [404, 'Bodega no encontrada', 'iniciar', /No encontramos esa bodega\. Elige una de la lista/],
    [404, 'Pedido no encontrado', 'iniciar', /No encontramos ese pedido en tu empresa/],
    [404, 'No se encontró el pedido con número: X-1', 'consultar', /No encontramos ese pedido en tu empresa/],
    [404, 'Picking no encontrado', 'completar', /No encontramos ese alistamiento/],
    [400, 'No se puede completar un picking que ya está completado', 'completar', /ya no se puede completar porque ya estaba cerrado/],
    [400, 'El producto prodA no forma parte del picking original', 'completar', /Uno de los productos no hace parte de este alistamiento/],
  ];
  for (const [status, texto, accion, esperado] of casos) {
    const aviso = avisoDeErrorPicking(http(status, { error: texto }), accion, CTX);
    assert.match(aviso.mensaje, esperado, texto);
    assert.doesNotMatch(aviso.mensaje, /prodA/, texto);
  }
});

test('un error del servidor (500) dice qué hacer, sin repetir el texto técnico', () => {
  const tecnico = 'Firestore transactions require all reads to be executed before all writes.';
  const completar = avisoDeErrorPicking(http(500, { error: tecnico }), 'completar', CTX);
  assert.match(completar.mensaje, /No pudimos terminar el alistamiento del pedido FLO-000001\. Recarga la página para ver en qué estado quedó/);
  assert.match(completar.mensaje, /escríbenos por soporte con el número del pedido/);
  assert.doesNotMatch(completar.mensaje, /Firestore|transactions|reads/);
  const iniciar = avisoDeErrorPicking(http(500, { error: tecnico }), 'iniciar', CTX);
  assert.match(iniciar.mensaje, /No pudimos iniciar el alistamiento/);
  const consultar = avisoDeErrorPicking(http(502, '<html>Bad gateway</html>'), 'consultar', CTX);
  assert.match(consultar.mensaje, /No pudimos cargar el pedido FLO-000001\. Inténtalo de nuevo en unos minutos\./);
});

test('si falla la lista de pedidos, el aviso habla de los pedidos', () => {
  const aviso = avisoDeErrorPicking(http(500, { error: 'cualquier cosa' }), 'listar');
  assert.equal(aviso.titulo, 'No se pudieron cargar los pedidos');
  assert.equal(aviso.mensaje, 'No pudimos cargar los pedidos. Inténtalo de nuevo en unos minutos.');
  assert.equal(avisoDeErrorPicking(http(0, {}), 'listar'), null);
});

test('un error que no conocemos igual dice algo útil', () => {
  assert.match(avisoDeErrorPicking(http(409, { error: 'otra cosa' }), 'iniciar', CTX).mensaje, /Revisa los datos e inténtalo de nuevo/);
  assert.match(avisoDeErrorPicking(http(404, {}), 'consultar', {}).mensaje, /No encontramos lo que buscabas/);
});

test('ningún texto que ve el comercio usa jerga ni códigos', () => {
  const cuerpos = [
    {},
    { error: 'Errores de validación en productos para picking', detalles: ['Stock insuficiente para el producto prodA. Disponible: 2, Solicitado: 5', 'Producto con ID prodB no encontrado en el inventario de la bodega'] },
    { error: 'Ya existe un proceso de picking activo para este pedido' },
    { error: 'No se puede iniciar picking en un pedido ya entregado o cerrado' },
    { error: 'No se puede iniciar picking en un pedido ya alistado (estado EnPacking)' },
    { error: 'Bodega no encontrada' },
    { error: 'Pedido no encontrado' },
    { error: 'Picking no encontrado' },
    { error: 'No se puede completar un picking que ya está cancelado' },
    { error: 'El producto prodA no forma parte del picking original' },
    { error: 'Firestore transactions require all reads to be executed before all writes.' },
    '<html>Bad gateway</html>',
  ];
  const textos = [];
  for (const accion of ['listar', 'consultar', 'iniciar', 'completar']) {
    for (const status of [400, 404, 409, 500, 502]) {
      for (const cuerpo of cuerpos) {
        for (const ctx of [CTX, {}]) {
          const aviso = avisoDeErrorPicking(http(status, cuerpo), accion, ctx);
          textos.push(aviso.titulo, aviso.mensaje);
        }
      }
    }
  }
  textos.push(
    textoDeConfirmarCompletar({ nroPedido: 'FLO-000001', productos: 2, unidades: 5, bodega: 'Principal' }),
    textoDeConfirmarCompletar({ nroPedido: 'FLO-000001', productos: 1, unidades: 1 }),
    ...['SinProducir', 'EnPicking', 'ListoParaPacking', 'EnPacking', 'ListoParaDespacho', 'EnProduccion', 'ParaDespachar'].map(textoDeEstadoPedido),
    ...['iniciado', 'completado', 'cancelado', 'pendiente'].map(textoDeEstadoAlistamiento),
  );
  // Jerga que Daniel no quiere ver: SKU, id, JSON, tenant, HTTP/status, stock (inglés), picking/packing en los avisos.
  const jerga = /\b(sku|id|ids|json|payload|tenant|http|status|firestore|api|backend|token|stock|null|undefined|picking|packing|endpoint)\b|\[object|error \d{3}|\bBOD-\d+/i;
  for (const texto of new Set(textos)) {
    assert.doesNotMatch(texto, jerga, `jerga en: ${texto}`);
  }
});

// ── Confirmar completar ────────────────────────────────────────────────────────────────

test('antes de completar se dice con claridad que el inventario NO cambia (opción B, D-397)', () => {
  assert.equal(
    textoDeConfirmarCompletar({ nroPedido: 'FLO-000001', productos: 2, unidades: 5, bodega: 'Principal' }),
    'Se marcan como recolectados 2 productos (5 unidades) del pedido FLO-000001. ' +
      'El inventario de la bodega «Principal» no cambia: esas unidades ya se descontaron cuando se hizo la venta. ' +
      'El pedido queda listo para empacar.',
  );
  assert.match(textoDeConfirmarCompletar({ nroPedido: 'X-1', productos: 1, unidades: 1 }), /1 producto \(1 unidad\)/);
});

test('si los productos no coinciden con el pedido, se dice en palabras simples', () => {
  const aviso = avisoDeErrorPicking(
    { status: 400, error: { error: 'Los productos no coinciden con el pedido', detalles: ['El producto x no forma parte del pedido'] } },
    'iniciar',
    { nroPedido: 'FLO-000009' },
  );
  assert.ok(aviso);
  assert.match(aviso.mensaje, /no coinciden con el pedido FLO-000009\. Recarga la página/);
  assert.doesNotMatch(aviso.mensaje, /existencias|inventario/);
});

// ── Seguridad del texto ────────────────────────────────────────────────────────────────

test('el nombre de un producto con HTML no se vuelve HTML en el aviso', () => {
  assert.equal(escaparHtml('<img src=x onerror=alert(1)>"\'&'), '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;');
  const html = mensajeAHtml('«<b>Rosa</b>»: hay 2\nElige otra bodega');
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;Rosa&lt;\/b&gt;/);
  assert.match(html, /<br>/);
});
