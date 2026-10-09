import { CifrasEnVivo, EstadoEnVivo, RadarEnVivo } from '../servicios/en-vivo.modelos';
import { horaDeColombia } from './formato';
import { entregadosDeHoy } from './tarjetas';

/**
 * Celebraciones de "En vivo": qué hitos se cruzaron (puro) y el confeti plano (canvas 2D).
 *
 * Reglas del spec: una sola vez por día por hito (lo guarda `EnVivoEstadoService.marcarCelebrado`),
 * NUNCA al cargar la pantalla ni al reconectar, y nunca durante "Repetir el día". Las cifras salen
 * del servidor: aquí solo se compara la lectura anterior con la nueva y se detecta el cruce.
 */

export interface Hito {
  /** Llave estable para guardar "ya se celebró hoy" (`primer-pedido`, `pedidos-40`...). */
  clave: string;
  texto: string;
}

/** Lo que se recuerda de la lectura anterior para detectar el cruce de un hito. */
interface Lectura {
  actualizadoEn: number | null;
  dia: string;
  cifras: CifrasEnVivo;
  entregados: number;
  radar: RadarEnVivo | null;
}

const PEDIDOS_POR_HITO = 10;
const PEDIDOS_MINIMOS_MEJOR_HORA = 3;

/** ¿Hoy esta hora ya es la de mejores ventas? Pide al menos 3 pedidos y una hora anterior con ventas. */
function esMejorHora(cifras: CifrasEnVivo, hora: number): boolean {
  const fila = cifras.porHora.find((h) => h.hora === hora);
  if (!fila || fila.pedidos < PEDIDOS_MINIMOS_MEJOR_HORA) return false;
  const mejorOtra = cifras.porHora.filter((h) => h.hora !== hora).reduce((m, h) => Math.max(m, h.ventas), 0);
  return mejorOtra > 0 && fila.ventas > mejorOtra;
}

function superoAyer(cifras: CifrasEnVivo): boolean {
  return cifras.ayer.ventas > 0 && cifras.ventas > cifras.ayer.ventas;
}

function vaAlRecord(radar: RadarEnVivo | null): boolean | null {
  const proyeccion = radar?.proyeccion;
  const record = radar?.record;
  if (!proyeccion || !record || !(record.n > 0)) return null;
  return proyeccion.pedidos > record.n;
}

/**
 * Hitos que se cruzaron entre dos lecturas de cifras. Pura: sin reloj, sin almacenamiento.
 * El orden es el de importancia para mostrar (el primero es el que se anuncia).
 */
export function hitosCruzados(previa: Lectura, actual: Lectura, horaActual: number): Hito[] {
  const hitos: Hito[] = [];
  const antes = previa.cifras;
  const ahora = actual.cifras;

  if (antes.pedidos < 1 && ahora.pedidos >= 1) hitos.push({ clave: 'primer-pedido', texto: '¡Primer pedido del día!' });
  if (previa.entregados < 1 && actual.entregados >= 1) {
    hitos.push({ clave: 'primera-entrega', texto: '¡Primera entrega del día!' });
  }

  const decenasAntes = Math.floor(antes.pedidos / PEDIDOS_POR_HITO);
  const decenasAhora = Math.floor(ahora.pedidos / PEDIDOS_POR_HITO);
  if (decenasAhora > decenasAntes) {
    // Si de golpe se cruzaron varias, se anuncia la más alta y todas quedan marcadas.
    for (let d = decenasAhora; d > decenasAntes; d--) {
      const n = d * PEDIDOS_POR_HITO;
      hitos.push({ clave: `pedidos-${n}`, texto: `¡${n} pedidos hoy!` });
    }
  }

  if (!esMejorHora(antes, horaActual) && esMejorHora(ahora, horaActual)) {
    hitos.push({ clave: `mejor-hora-${horaActual}`, texto: '¡Esta es la mejor hora del día!' });
  }
  if (!superoAyer(antes) && superoAyer(ahora)) hitos.push({ clave: 'mas-que-ayer', texto: '¡Ya vendiste más que todo ayer!' });

  // Solo si en la lectura anterior ya se conocía la proyección y NO pasaba el récord: así nunca
  // se celebra algo que ya era verdad al cargar.
  if (vaAlRecord(previa.radar) === false && vaAlRecord(actual.radar) === true) {
    hitos.push({ clave: 'record-dia', texto: '¡Vas camino a tu récord de pedidos!' });
  }
  return hitos;
}

/**
 * Detecta hitos sobre el estado de la pantalla. Recuerda la lectura anterior:
 * - la primera lectura, la de una foto nueva (cargar, reconectar, sondeo) y la de un día nuevo
 *   solo fijan la línea base y NUNCA celebran;
 * - un mensaje `cifras` o `radar` en vivo compara contra la lectura anterior.
 * Solo para la vista del comercio.
 */
export class DetectorHitos {
  private previa: Lectura | null = null;

  /** Olvida la lectura anterior (la próxima solo fija la línea base). */
  reiniciar(): void {
    this.previa = null;
  }

  /**
   * @param silencio true durante "Repetir el día": se sigue la línea base pero no se devuelve nada.
   */
  procesar(estado: EstadoEnVivo, ahoraMs: number, silencio: boolean): Hito[] {
    if (estado.vista !== 'comercio' || !estado.cargado || !estado.cifras) {
      this.previa = null;
      return [];
    }
    const actual: Lectura = {
      actualizadoEn: estado.actualizadoEn,
      dia: estado.cifras.dia,
      cifras: estado.cifras,
      entregados: entregadosDeHoy(estado.pedidos, estado.cifras.dia),
      radar: estado.radar,
    };
    const previa = this.previa;
    this.previa = actual;

    if (!previa || previa.actualizadoEn !== actual.actualizadoEn || previa.dia !== actual.dia) return [];
    if (previa.cifras === actual.cifras && previa.radar === actual.radar && previa.entregados === actual.entregados) {
      return [];
    }
    return silencio ? [] : hitosCruzados(previa, actual, horaDeColombia(ahoraMs));
  }
}

// ── Confeti ─────────────────────────────────────────────────────────────────

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  giro: number;
  vGiro: number;
  ancho: number;
  alto: number;
  color: string;
}

const DURACION_CONFETI_MS = 2600;
const PARTICULAS = 160;

/**
 * Confeti plano (rectángulos de colores de la paleta, sin gradientes) sobre un canvas 2D.
 * Una sola tanda a la vez. El que llama decide si lanzarlo (no con "reducir movimiento") y
 * lo corre fuera de la zona de Angular.
 */
export class Confeti {
  private cuadro = 0;
  private lienzo: HTMLCanvasElement | null = null;
  private ancho = 0;
  private alto = 0;

  lanzar(
    lienzo: HTMLCanvasElement,
    ancho: number,
    alto: number,
    colores: ReadonlyArray<string>,
    azar: () => number = Math.random
  ): void {
    this.detener();
    const contexto = lienzo.getContext('2d');
    if (!contexto || colores.length === 0 || ancho <= 0 || alto <= 0) return;
    this.lienzo = lienzo;
    this.ancho = ancho;
    this.alto = alto;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);

    const entre = (a: number, b: number): number => a + azar() * (b - a);
    const particulas: Particula[] = Array.from({ length: PARTICULAS }, () => ({
      x: ancho / 2 + entre(-ancho * 0.12, ancho * 0.12),
      y: alto * 0.18,
      vx: entre(-6, 6),
      vy: entre(-9, -2),
      giro: entre(0, Math.PI),
      vGiro: entre(-0.3, 0.3),
      ancho: entre(6, 11),
      alto: entre(3, 6),
      color: colores[Math.floor(azar() * colores.length)],
    }));

    const inicio = performance.now();
    const paso = (ahora: number): void => {
      const k = (ahora - inicio) / DURACION_CONFETI_MS;
      contexto.clearRect(0, 0, ancho, alto);
      if (k >= 1) {
        this.cuadro = 0;
        return;
      }
      for (const p of particulas) {
        p.vy += 0.22;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.giro += p.vGiro;
        contexto.save();
        contexto.globalAlpha = Math.max(0, 1 - k * k);
        contexto.translate(p.x, p.y);
        contexto.rotate(p.giro);
        contexto.fillStyle = p.color;
        contexto.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto * Math.abs(Math.cos(p.giro * 2)));
        contexto.restore();
      }
      this.cuadro = requestAnimationFrame(paso);
    };
    this.cuadro = requestAnimationFrame(paso);
  }

  /** Corta el confeti y limpia el lienzo. */
  detener(): void {
    if (this.cuadro) cancelAnimationFrame(this.cuadro);
    this.cuadro = 0;
    const contexto = this.lienzo?.getContext('2d');
    if (contexto) contexto.clearRect(0, 0, this.ancho, this.alto);
  }
}
