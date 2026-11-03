/**
 * Cuenta de «Qué comprar»: de lo que se necesita a lo que de verdad se puede pedir.
 *
 * Espejo de `services/purchasing/purchaseRounding.js` del servidor (D-626, ticket 1470,
 * mejora 3). Vive aquí para recalcular la fila al instante cuando se cambia de proveedor
 * (cada uno trae su unidad de compra, su pedido mínimo y su tiempo de entrega) sin pedirle
 * otra vez al servidor toda la sugerencia. Funciones puras: se pueden probar sin Angular.
 */

export interface EntradaCalculoCompra {
  consumoDiario: number;
  coberturaObjetivoDias: number;
  diasEntrega: number;
  saldo: number;
  yaPedido: number;
  factorCompra?: number | null;
  pedidoMinimo?: number | null;
}

export interface ResultadoCalculoCompra {
  consumoDiario: number;
  coberturaObjetivoDias: number;
  diasEntrega: number;
  horizonteDias: number;
  proyeccion: number;
  existencia: number;
  yaPedido: number;
  /** Lo que falta, redondeado hacia arriba al entero, antes del empaque. */
  necesidad: number;
  factorCompra: number;
  pedidoMinimo: number;
  /** Lo que se puede pedir: múltiplo del factor y, como mínimo, el pedido mínimo. */
  cantidad: number;
  porFactor: boolean;
  porMinimo: boolean;
}

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export function calcularCompra(e: EntradaCalculoCompra): ResultadoCalculoCompra {
  const consumo = Math.max(numero(e.consumoDiario), 0);
  const cobertura = Math.max(numero(e.coberturaObjetivoDias), 0);
  const entrega = Math.max(numero(e.diasEntrega), 0);
  const horizonteDias = cobertura + entrega;
  const proyeccion = consumo * horizonteDias;
  const existencia = Math.max(numero(e.saldo), 0);
  const yaPedido = Math.max(numero(e.yaPedido), 0);
  const faltante = consumo > 0 ? proyeccion - existencia - yaPedido : 0;
  const necesidad = faltante > 0 ? Math.ceil(faltante) : 0;

  const factor = numero(e.factorCompra) > 0 ? numero(e.factorCompra) : 1;
  const minimo = Math.max(numero(e.pedidoMinimo), 0);

  let cantidad = 0;
  let porFactor = false;
  let porMinimo = false;
  if (necesidad > 0) {
    const redondeada = Math.ceil(necesidad / factor) * factor;
    const minimoEnCajas = minimo > 0 ? Math.ceil(minimo / factor) * factor : 0;
    cantidad = Math.max(redondeada, minimoEnCajas);
    porFactor = redondeada > necesidad;
    porMinimo = minimoEnCajas > redondeada;
  }

  return {
    consumoDiario: consumo,
    coberturaObjetivoDias: cobertura,
    diasEntrega: entrega,
    horizonteDias,
    proyeccion,
    existencia,
    yaPedido,
    necesidad,
    factorCompra: factor,
    pedidoMinimo: minimo,
    cantidad,
    porFactor,
    porMinimo,
  };
}

const fmt = (n: number, max = 2) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: max });

/**
 * El cálculo escrito para pasar el mouse por encima:
 * venta diaria × (días a cubrir + días de entrega) − existencia − ya pedido.
 */
export function textoDelCalculo(c: ResultadoCalculoCompra, unidadCompra?: string | null): string {
  const partes = [
    `Se vende ${fmt(c.consumoDiario)}/día × (${fmt(c.coberturaObjetivoDias)} días a cubrir + ${fmt(c.diasEntrega)} de entrega)`
      + ` = ${fmt(c.proyeccion)}`,
    `− hay ${fmt(c.existencia)}`,
    `− ya pedido ${fmt(c.yaPedido)}`,
    `= faltan ${fmt(c.necesidad)}`,
  ];
  let texto = partes.join(' ');
  if (c.porFactor) {
    texto += `\nSe pide por ${unidadCompra || 'unidad de compra'} de ${fmt(c.factorCompra)}: ${fmt(c.cantidad)}.`;
  }
  if (c.porMinimo) {
    texto += `\nEl proveedor exige un pedido mínimo de ${fmt(c.pedidoMinimo)}: se pide ${fmt(c.cantidad)}.`;
  }
  return texto;
}
