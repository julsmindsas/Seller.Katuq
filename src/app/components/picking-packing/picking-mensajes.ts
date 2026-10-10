/**
 * Textos y conversiones del alistamiento (picking).
 *
 * Son funciones puras, sin Angular, para poder probarlas con Node
 * (tests/picking-packing/picking-mensajes.test.js).
 *
 * Regla de la casa: todo lo que ve el comercio dice qué pasó y qué hacer, nombra el
 * pedido y el producto, y no usa jerga ni códigos (nada de SKU, id, JSON ni estados HTTP).
 */

// ── Tipos mínimos (estructurales, para no depender de los modelos de Angular) ─────────

/** Línea del carrito de un pedido, tal cual la guarda el servidor. */
export interface LineaDeCarrito {
  cantidad?: number;
  producto?: {
    cd?: string;
    id?: string;
    crearProducto?: { titulo?: string; referencia?: string };
    identificacion?: { referencia?: string };
    disponibilidad?: { inventariable?: boolean };
  };
}

/** Lo que se manda a alistar por cada producto del pedido. */
export interface LineaDeAlistamiento {
  productoId: string;
  nombre: string;
  /** Referencia del producto (la que el comercio conoce). El servidor la guarda como `sku`. */
  sku: string;
  cantidad: number;
}

export type EstadoAlistamiento = 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';

/** Respuesta de GET /v1/inventory/picking/estado/:ordenId, tal cual sale del servidor. */
export interface EstadoPickingServidor {
  picking: {
    id: string;
    ordenId: string;
    bodegaId?: string;
    estado?: string;
    fechaInicio?: any;
    fechaCompletado?: any;
    productos?: {
      productoId: string;
      nombre?: string;
      sku?: string;
      ubicacion?: string;
      cantidad?: number;
      cantidadSolicitada?: number;
      cantidadRecolectada?: number;
      estado?: string;
    }[];
  };
  pedido?: { id?: string; nroPedido?: string; estadoProceso?: string };
}

// ── Estados ──────────────────────────────────────────────────────────────────────────

/** Estados del pedido en los que tiene sentido empezar a alistar. */
const ESTADOS_ALISTABLES = [
  'SinProducir',
  'EnProduccion',
  'ProducidoParcialmente',
  'ProducidoTotalmente',
  'Producido',
  'ParaDespachar',
];

export function puedeAlistarse(estadoProceso: string | null | undefined): boolean {
  return ESTADOS_ALISTABLES.indexOf(String(estadoProceso || '').trim()) !== -1;
}

const ETIQUETAS_ESTADO_PEDIDO: { [estado: string]: string } = {
  SinProducir: 'Sin producir',
  EnProduccion: 'En producción',
  ProducidoParcialmente: 'Producido parcialmente',
  ProducidoTotalmente: 'Producido totalmente',
  Producido: 'Producido',
  ParaDespachar: 'Para despachar',
  EnDespacho: 'En despacho',
  Despachado: 'Despachado',
  Entregado: 'Entregado',
  Cerrado: 'Cerrado',
  Empacado: 'Empacado',
  Rechazado: 'Rechazado',
  Cancelado: 'Cancelado',
  EnPicking: 'En alistamiento',
  ListoParaPacking: 'Listo para empacar',
  EnPacking: 'Empacando',
  ListoParaDespacho: 'Listo para despachar',
};

/** "SinProducir" -> "Sin producir". Un estado desconocido se muestra separado por palabras. */
export function textoDeEstadoPedido(estado: string | null | undefined): string {
  const valor = String(estado || '').trim();
  if (!valor) return '';
  if (ETIQUETAS_ESTADO_PEDIDO[valor]) return ETIQUETAS_ESTADO_PEDIDO[valor];
  const separado = valor.replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2').toLowerCase();
  return separado.charAt(0).toUpperCase() + separado.slice(1);
}

/** El servidor guarda "iniciado" (y a veces "en_proceso"); a la pantalla le sirve uno solo. */
export function normalizarEstadoAlistamiento(estado: string | null | undefined): EstadoAlistamiento {
  switch (String(estado || '').trim().toLowerCase()) {
    case 'completado':
      return 'completado';
    case 'cancelado':
      return 'cancelado';
    case 'pendiente':
      return 'pendiente';
    default:
      return 'en_proceso';
  }
}

export function textoDeEstadoAlistamiento(estado: string | null | undefined): string {
  switch (normalizarEstadoAlistamiento(estado)) {
    case 'completado':
      return 'Completado';
    case 'cancelado':
      return 'Cancelado';
    case 'pendiente':
      return 'Pendiente';
    default:
      return 'En proceso';
  }
}

// ── Fechas ───────────────────────────────────────────────────────────────────────────

/**
 * Las fechas de Firestore llegan por JSON como { _seconds, _nanoseconds }, y el pipe `date`
 * de Angular no las entiende. Se pasan a texto ISO.
 */
export function aFechaIso(valor: any): string | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? undefined : valor.toISOString();
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number') return new Date(valor).toISOString();
  const segundos = valor._seconds !== undefined ? valor._seconds : valor.seconds;
  if (typeof segundos === 'number') {
    const nanos = valor._nanoseconds !== undefined ? valor._nanoseconds : valor.nanoseconds || 0;
    return new Date(segundos * 1000 + Math.floor(nanos / 1e6)).toISOString();
  }
  return undefined;
}

// ── Pedido -> líneas a alistar ───────────────────────────────────────────────────────

/**
 * Las líneas a alistar salen del carrito del pedido, nunca de una lista libre.
 *  - Productos repetidos en varias líneas se suman en una sola (el servidor busca el
 *    inventario por producto).
 *  - Los que no se guardan en bodega (servicios, digitales) y las líneas sin producto o
 *    sin cantidad se dejan por fuera y se cuentan en `omitidas`.
 */
export function lineasDePicking(pedido: { carrito?: LineaDeCarrito[] } | null | undefined): {
  lineas: LineaDeAlistamiento[];
  omitidas: number;
} {
  const lineas: LineaDeAlistamiento[] = [];
  const indicePorProducto: { [productoId: string]: number } = {};
  let omitidas = 0;

  const carrito = (pedido && pedido.carrito) || [];
  for (let i = 0; i < carrito.length; i++) {
    const linea = carrito[i];
    const producto = linea && linea.producto;
    const productoId = String((producto && (producto.cd || producto.id)) || '').trim();
    const cantidad = Number(linea && linea.cantidad);

    if (!productoId || !(cantidad > 0)) {
      omitidas++;
      continue;
    }
    if (producto && producto.disponibilidad && producto.disponibilidad.inventariable === false) {
      omitidas++;
      continue;
    }

    if (indicePorProducto[productoId] !== undefined) {
      lineas[indicePorProducto[productoId]].cantidad += cantidad;
      continue;
    }
    indicePorProducto[productoId] = lineas.length;
    lineas.push({
      productoId,
      nombre: String((producto && producto.crearProducto && producto.crearProducto.titulo) || 'Producto sin nombre'),
      sku: String(
        (producto && producto.identificacion && producto.identificacion.referencia) ||
          (producto && producto.crearProducto && producto.crearProducto.referencia) ||
          '',
      ),
      cantidad,
    });
  }
  return { lineas, omitidas };
}

/**
 * Las tres rutas del detalle apuntan al mismo componente:
 *   picking/nuevo      ruta propia, SIN :id         -> hay que elegir el pedido
 *   picking/orden/:id  :id es el número del pedido
 *   picking/:id        :id es el número del pedido
 * `rutaConfigurada` es el `path` de la ruta que Angular activó (ActivatedRoute.snapshot.routeConfig.path).
 * No se decide mirando solo `:id`: en `nuevo` no existe y llegaría `undefined` (así falló la primera versión).
 */
export function destinoDelDetalle(
  rutaConfigurada: string | null | undefined,
  id: string | null | undefined,
): { eligePedido: boolean; nroPedido: string } {
  const ruta = String(rutaConfigurada || '').trim();
  const valor = String(id === undefined || id === null ? '' : id).trim();
  const eligePedido = ruta === 'nuevo' || valor === 'nuevo' || valor === '';
  return { eligePedido, nroPedido: eligePedido ? '' : valor };
}

/** La bodega con la que se vendió el pedido, si sigue entre las que se pueden escoger. */
export function bodegaSugerida(bodegas: { idBodega?: string }[] | null | undefined, idBodegaDelPedido?: string): string {
  const id = String(idBodegaDelPedido || '').trim();
  const hay = (bodegas || []).some((b) => !!b && b.idBodega === id);
  return id && hay ? id : '';
}

// ── Estado del servidor -> modelo de la pantalla ─────────────────────────────────────

export function desdeEstadoServidor(servidor: EstadoPickingServidor) {
  const picking = servidor.picking;
  const productos = (picking.productos || []).map((p) => {
    const recolectada = Number(p.cantidadRecolectada) || 0;
    return {
      productoId: p.productoId,
      nombre: p.nombre || '',
      sku: p.sku || '',
      ubicacion: p.ubicacion,
      // Antes de completar el servidor guarda `cantidad`; al completar la reescribe como `cantidadSolicitada`.
      cantidad: Number(p.cantidad !== undefined ? p.cantidad : p.cantidadSolicitada) || 0,
      cantidadRecolectada: recolectada,
      recolectado: p.estado === 'recolectado',
    };
  });
  return {
    _id: picking.id,
    ordenId: picking.ordenId,
    bodegaId: picking.bodegaId,
    estado: normalizarEstadoAlistamiento(picking.estado),
    productos,
    fechaInicio: aFechaIso(picking.fechaInicio),
    fechaCompletado: aFechaIso(picking.fechaCompletado),
    pedido: servidor.pedido,
  };
}

// ── Textos para el comercio ──────────────────────────────────────────────────────────

export type AccionPicking = 'listar' | 'consultar' | 'iniciar' | 'completar';

export interface ContextoError {
  nroPedido?: string;
  /** Nombre del producto por su identificador interno, para nombrarlo en el aviso. */
  nombresPorId?: { [productoId: string]: string };
  nombreBodega?: string;
}

export interface AvisoDeError {
  titulo: string;
  mensaje: string;
}

const TITULOS: { [accion: string]: string } = {
  listar: 'No se pudieron cargar los pedidos',
  consultar: 'No se pudo cargar el pedido',
  iniciar: 'No se pudo iniciar el alistamiento',
  completar: 'No se pudo completar el alistamiento',
};

function nombreDeProducto(productoId: string, ctx: ContextoError): string {
  const nombre = ctx.nombresPorId && ctx.nombresPorId[productoId];
  return nombre ? '«' + nombre + '»' : 'Un producto del pedido';
}

function lineasDeExistencias(detalles: any, ctx: ContextoError): string[] {
  const salida: string[] = [];
  const lista = Array.isArray(detalles) ? detalles : [];
  const enBodega = ctx.nombreBodega ? ' «' + ctx.nombreBodega + '»' : ' elegida';
  for (let i = 0; i < lista.length; i++) {
    const texto = String(lista[i]);
    const noEsta = texto.match(/^Producto con ID (.+?) no encontrado en el inventario de la bodega$/);
    const corto = texto.match(/^Stock insuficiente para el producto (.+?)\. Disponible: (-?[\d.]+), Solicitado: (-?[\d.]+)$/);
    if (noEsta) {
      salida.push('• ' + nombreDeProducto(noEsta[1], ctx) + ' no está en la bodega' + enBodega + '.');
    } else if (corto) {
      const hay = Math.max(0, Number(corto[2]) || 0);
      salida.push('• ' + nombreDeProducto(corto[1], ctx) + ': hay ' + hay + ' y el pedido pide ' + corto[3] + '.');
    }
  }
  return salida;
}

/**
 * Convierte un error del servidor en un aviso que el comercio entiende.
 * Devuelve null cuando el interceptor de la app ya avisó (sin conexión, sesión vencida,
 * permisos, cuenta en solo lectura o función apagada para la empresa, que llega como 403):
 * no se repite el aviso.
 */
export function avisoDeErrorPicking(error: any, accion: AccionPicking, ctx: ContextoError = {}): AvisoDeError | null {
  const estado = Number(error && error.status);
  if (!estado || estado === 401 || estado === 403 || estado === 423) return null;

  const titulo = TITULOS[accion];
  const pedido = ctx.nroPedido ? 'el pedido ' + ctx.nroPedido : 'el pedido';
  const delPedido = ctx.nroPedido ? 'del pedido ' + ctx.nroPedido : 'del pedido';
  const cuerpo = error && error.error;
  const texto = String(
    typeof cuerpo === 'string' ? cuerpo : (cuerpo && (cuerpo.error || cuerpo.message)) || '',
  ).toLowerCase();
  const aviso = (mensaje: string): AvisoDeError => ({ titulo, mensaje });

  if (accion === 'listar') {
    return aviso('No pudimos cargar los pedidos. Inténtalo de nuevo en unos minutos.');
  }

  if (texto.indexOf('errores de validación en productos') !== -1) {
    const lineas = lineasDeExistencias(cuerpo && cuerpo.detalles, ctx);
    const bodega = ctx.nombreBodega ? ' en la bodega «' + ctx.nombreBodega + '»' : ' en la bodega elegida';
    // Ojo: la venta del pedido YA descontó estas unidades, así que la bodega puede mostrar menos de lo
    // que hay en realidad (design.md, riesgo R10). Mandar a "corregir el inventario" lo inflaría.
    const cierre =
      'Ojo: cuando se vende un pedido, Katuq descuenta sus unidades del inventario, por eso la bodega puede mostrar ' +
      'menos de lo que hay en realidad. No cambies el inventario por este aviso: elige otra bodega o escríbenos ' +
      'por soporte con el número del pedido.';
    if (lineas.length === 0) {
      return aviso('Algunos productos ' + delPedido + ' no tienen existencias suficientes' + bodega + '. ' + cierre);
    }
    return aviso(
      'No hay existencias suficientes' + bodega + ' para alistar ' + pedido + ':\n' + lineas.join('\n') + '\n' + cierre,
    );
  }
  if (texto.indexOf('no coinciden con el pedido') !== -1) {
    return aviso('Los productos de este alistamiento no coinciden con ' + pedido + '. Recarga la página y vuelve a intentar.');
  }
  if (texto.indexOf('ya existe un proceso de picking activo') !== -1) {
    return aviso('Ya hay un alistamiento en curso para ' + pedido + '. Recarga la página para continuar donde quedó.');
  }
  if (texto.indexOf('entregado o cerrado') !== -1) {
    return aviso('Ese pedido ya fue entregado o cerrado, por eso no se puede alistar.');
  }
  if (texto.indexOf('ya alistado') !== -1) {
    return aviso('Ese pedido ya se alistó. Recarga la página para ver cómo quedó.');
  }
  if (texto.indexOf('bodega no encontrada') !== -1) {
    return aviso('No encontramos esa bodega. Elige una de la lista y vuelve a intentar.');
  }
  if (texto.indexOf('pedido no encontrado') !== -1 || texto.indexOf('no se encontró el pedido') !== -1) {
    return aviso('No encontramos ese pedido en tu empresa. Vuelve a la lista y ábrelo de nuevo.');
  }
  if (texto.indexOf('picking no encontrado') !== -1 || texto.indexOf('no se encontró proceso de picking') !== -1) {
    return aviso('No encontramos ese alistamiento. Vuelve a la lista y ábrelo de nuevo.');
  }
  if (texto.indexOf('que ya está completado') !== -1 || texto.indexOf('que ya está cancelado') !== -1) {
    return aviso('Este alistamiento ya no se puede completar porque ya estaba cerrado. Recarga la página para ver cómo quedó.');
  }
  if (texto.indexOf('no forma parte del picking original') !== -1) {
    return aviso('Uno de los productos no hace parte de este alistamiento. Recarga la página y vuelve a intentar.');
  }

  if (estado === 404) {
    return aviso('No encontramos lo que buscabas. Vuelve a la lista y ábrelo de nuevo.');
  }
  if (estado >= 500) {
    if (accion === 'completar') {
      return aviso(
        'No pudimos terminar el alistamiento ' + delPedido + '. Recarga la página para ver en qué estado quedó; ' +
          'si sigue igual, escríbenos por soporte con el número del pedido.',
      );
    }
    if (accion === 'iniciar') {
      return aviso(
        'No pudimos iniciar el alistamiento ' + delPedido + '. Inténtalo de nuevo en unos minutos; ' +
          'si sigue igual, escríbenos por soporte con el número del pedido.',
      );
    }
    return aviso('No pudimos cargar ' + pedido + '. Inténtalo de nuevo en unos minutos.');
  }
  return aviso('No pudimos continuar con el alistamiento ' + delPedido + '. Revisa los datos e inténtalo de nuevo.');
}

function plural(n: number, uno: string, varios: string): string {
  return n + ' ' + (n === 1 ? uno : varios);
}

/** Texto de la confirmación antes de completar: dice con claridad que se descuenta inventario. */
export function textoDeConfirmarCompletar(datos: {
  nroPedido: string;
  productos: number;
  unidades: number;
  bodega?: string;
}): string {
  // Opción B (D-397): completar NO mueve inventario; la venta ya descontó estas unidades.
  const bodega = datos.bodega ? ' de la bodega «' + datos.bodega + '»' : ' de la bodega';
  return (
    'Se marcan como recolectados ' + plural(datos.productos, 'producto', 'productos') +
    ' (' + plural(datos.unidades, 'unidad', 'unidades') + ') del pedido ' + datos.nroPedido + '. ' +
    'El inventario' + bodega + ' no cambia: esas unidades ya se descontaron cuando se hizo la venta. ' +
    'El pedido queda listo para empacar.'
  );
}

/** Escapa el texto antes de ponerlo dentro de HTML (los nombres de producto los escribe el comercio). */
export function escaparHtml(texto: string): string {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Texto con saltos de línea -> HTML seguro (cada salto pasa a <br>). */
export function mensajeAHtml(mensaje: string): string {
  return escaparHtml(mensaje).replace(/\n/g, '<br>');
}
