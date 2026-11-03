/**
 * Ticket 1453 (D-661 propuesta): reparto de un pago entre varios pedidos de un cliente.
 *
 * Es el MISMO algoritmo del servidor (`repartirPago` de services/treasury/pagoGrupo.js) y solo sirve para
 * mostrar el reparto en vivo mientras la persona escribe. El servidor vuelve a calcular los topes y valida el
 * reparto que llega; nunca confía en lo que calcula la pantalla.
 */

export interface PedidoParaRepartir {
  orderId: string;
  nroPedido?: string;
  fechaCreacion?: string | null;
  /** Lo máximo que puede recibir: saldo menos lo que ya está en revisión. */
  tope: number;
}

export interface ParteRepartida {
  orderId: string;
  valor: number;
}

/** Ruido de redondeo al comparar dinero (no es una tolerancia de negocio). */
export const CENTAVO = 0.005;

export function redondear2(valor: unknown): number {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function fechaMs(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const t = new Date(valor as string).getTime();
  return Number.isFinite(t) ? t : null;
}

/** «Del más viejo al más nuevo»: fecha de creación; sin fecha al final; desempate por número y por id. */
export function compararAntiguedad(a: PedidoParaRepartir, b: PedidoParaRepartir): number {
  const fa = fechaMs(a.fechaCreacion);
  const fb = fechaMs(b.fechaCreacion);
  if (fa !== fb) {
    if (fa === null) return 1;
    if (fb === null) return -1;
    return fa - fb;
  }
  const na = String(a.nroPedido ?? '');
  const nb = String(b.nroPedido ?? '');
  if (na !== nb) {
    if (/^\d+$/.test(na) && /^\d+$/.test(nb)) return Number(na) - Number(nb);
    return na < nb ? -1 : 1;
  }
  return a.orderId < b.orderId ? -1 : a.orderId > b.orderId ? 1 : 0;
}

/** Llena el tope de cada pedido, del más viejo al más nuevo, hasta agotar el valor. */
export function repartirPago(valor: number, pedidos: PedidoParaRepartir[]): { reparto: ParteRepartida[]; repartido: number; sobrante: number } {
  let restante = redondear2(valor);
  const reparto: ParteRepartida[] = [];
  if (!(restante > 0)) return { reparto, repartido: 0, sobrante: 0 };
  const ordenados = pedidos.filter((p) => p && p.orderId && Number(p.tope) > 0).slice().sort(compararAntiguedad);
  for (const p of ordenados) {
    if (restante <= CENTAVO) break;
    const parte = redondear2(Math.min(restante, Number(p.tope)));
    if (parte > 0) {
      reparto.push({ orderId: p.orderId, valor: parte });
      restante = redondear2(restante - parte);
    }
  }
  const repartido = redondear2(reparto.reduce((acc, x) => acc + x.valor, 0));
  return { reparto, repartido, sobrante: redondear2(Math.max(0, redondear2(valor) - repartido)) };
}
