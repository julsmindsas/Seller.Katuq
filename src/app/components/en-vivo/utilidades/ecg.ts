import { EventoEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { instanteDeEvento } from './describir-evento';

/**
 * Pulso de la tienda: una línea tipo electrocardiograma que late con cada pedido nuevo.
 * Aquí viven la onda, los latidos sacados de los eventos y el dibujo sobre un canvas 2D,
 * todo sin Angular, para que el componente solo maneje el ciclo de cuadros.
 */

/** Cada cuánto se dibuja la rejilla de papel (como un electrocardiograma). */
const SEPARACION_REJILLA_MS = 15000;
/** Ventana a partir de la cual la rejilla se ensancha (con "Repetir el día" la ventana es de horas: sin esto sería una mancha). */
const VENTANA_REJILLA_MS = 6 * 60000;
/** Ventana de referencia con la que se diseñó la forma del latido (2 min). */
const VENTANA_REFERENCIA_MS = 120000;
/** Monto con el que el latido llega a su altura máxima. */
const MONTO_MAXIMO = 380000;

export interface Latido {
  /** Instante del pedido, en ms. */
  t: number;
  /** Monto del pedido, para la altura del pico; null con los montos ocultos. */
  monto: number | null;
  /** Pedido armado por el bot de WhatsApp de Opttia. */
  ia: boolean;
}

export interface ColoresPulso {
  linea: string;
  rejilla: string;
  pico: string;
  ia: string;
}

/** Un latido (onda P, complejo QRS y onda T) en segundos alrededor del pedido; `dt` en segundos. */
export function ondaEcg(dt: number): number {
  const g = (mu: number, s: number): number => Math.exp(-Math.pow((dt - mu) / s, 2));
  return 0.12 * g(-2.1, 0.5) - 0.18 * g(-0.55, 0.22) + g(0, 0.32) - 0.34 * g(0.6, 0.25) + 0.22 * g(2.3, 0.7);
}

/** Los pedidos nuevos que caen dentro de la ventana, listos para dibujar. */
export function latidosDeEventos(
  eventos: ReadonlyArray<EventoEnVivo>,
  pedidosPorId: ReadonlyMap<string, PedidoEnVivo>,
  desdeMs: number,
  hastaMs: number,
  ocultar: boolean
): Latido[] {
  const latidos: Latido[] = [];
  for (const evento of eventos) {
    if (evento.tipo !== 'pedido_nuevo') continue;
    const t = instanteDeEvento(evento);
    if (t === null || t < desdeMs || t > hastaMs) continue;
    const pedido = pedidosPorId.get(evento.pedidoId);
    latidos.push({
      t,
      monto: ocultar ? null : evento.monto ?? pedido?.monto ?? null,
      ia: evento.ia ?? pedido?.ia ?? false,
    });
  }
  return latidos.sort((a, b) => a.t - b.t);
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, valor));
}

/**
 * Dibuja el pulso. `ventanaMs` es lo que cabe a lo ancho (6 min en un comercio, 2 en Katuq);
 * la forma del latido se estira con la ventana para que se vea igual. `fase` mueve un
 * temblor fino de la línea; con `null` la línea queda quieta (reducir movimiento).
 */
export function dibujarPulso(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  latidos: ReadonlyArray<Latido>,
  colores: ColoresPulso,
  ahoraMs: number,
  ventanaMs: number,
  fase: number | null
): void {
  ctx.clearRect(0, 0, ancho, alto);
  const desde = ahoraMs - ventanaMs;
  const pxPorMs = ancho / ventanaMs;
  const base = alto * 0.8;
  const escala = ventanaMs / VENTANA_REFERENCIA_MS;

  // Rejilla: una línea cada 15 s, con más fuerza cada minuto.
  ctx.strokeStyle = colores.rejilla;
  ctx.lineWidth = 1;
  const separacion = SEPARACION_REJILLA_MS * Math.max(1, Math.round(ventanaMs / VENTANA_REJILLA_MS));
  const lineas = Math.ceil(ventanaMs / separacion) + 1;
  for (let k = 0; k <= lineas; k++) {
    const x = ancho - k * separacion * pxPorMs - (ahoraMs % separacion) * pxPorMs;
    if (x < 0) continue;
    ctx.globalAlpha = k % 4 === 0 ? 0.45 : 0.2;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x, alto - 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Suma de los latidos sobre la línea base.
  const ys = new Float32Array(Math.ceil(ancho) + 2);
  const picos: Array<{ x: number; y: number; ia: boolean }> = [];
  for (const latido of latidos) {
    const x0 = (latido.t - desde) * pxPorMs;
    const amplitud = alto * 0.66 * (latido.monto === null ? 0.7 : 0.34 + 0.66 * Math.min(1, latido.monto / MONTO_MAXIMO));
    const a = Math.max(0, Math.floor(x0 - 3600 * escala * pxPorMs));
    const b = Math.min(Math.ceil(ancho), Math.ceil(x0 + 4500 * escala * pxPorMs));
    for (let x = a; x <= b; x++) ys[x] += ondaEcg((x - x0) / pxPorMs / 1000 / escala) * amplitud;
    if (x0 >= 0 && x0 <= ancho) picos.push({ x: x0, y: acotar(base - amplitud, 6, alto), ia: latido.ia });
  }

  ctx.beginPath();
  for (let x = 0; x <= ancho; x++) {
    const temblor = fase === null ? 0 : Math.sin(x * 0.09 + fase * 0.004) * 0.7;
    const y = acotar(base - ys[x] + temblor, 4, alto - 2);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = colores.linea;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  for (const pico of picos) {
    ctx.fillStyle = pico.ia ? colores.ia : colores.pico;
    ctx.beginPath();
    ctx.arc(pico.x, pico.y, pico.ia ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (pico.ia) {
      ctx.strokeStyle = colores.ia;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pico.x, pico.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Punta de la línea, que brilla un momento tras cada pedido.
  const ultimo = latidos.length > 0 ? latidos[latidos.length - 1] : null;
  const brillo = ultimo ? Math.max(0, 1 - (ahoraMs - ultimo.t) / 900) : 0;
  ctx.fillStyle = colores.linea;
  ctx.globalAlpha = 0.25 + 0.5 * brillo;
  ctx.beginPath();
  ctx.arc(ancho - 4, acotar(base - (ys[Math.round(ancho)] || 0), 6, alto), 6 + brillo * 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(ancho - 4, base, 3.5, 0, Math.PI * 2);
  ctx.fill();
}
