/**
 * Transiciones de las escenas 3D de "En vivo": un motor mínimo de tweens con dueño (para cancelar
 * lo que le pasaba a una caja o a un vehículo cuando empieza otra animación) y las curvas de
 * suavizado del prototipo. Puro: sin three ni DOM, se prueba con node suelto.
 */

export const ease = {
  out: (k: number): number => 1 - Math.pow(1 - k, 3),
  inOut: (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  sine: (k: number): number => -(Math.cos(Math.PI * k) - 1) / 2,
  back: (k: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  },
  bounce: (k: number): number => {
    const n = 7.5625;
    const d = 2.75;
    if (k < 1 / d) return n * k * k;
    if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
    if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
    return n * (k -= 2.625 / d) * k + 0.984375;
  },
};

export const limitar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

interface Tween {
  t: number;
  dur: number;
  upd: (k: number) => void;
  done: (() => void) | null;
  dueno: unknown;
}

/** Con "reducir movimiento" una transición dura a lo sumo esto (s): cambia de estado sin viajar. */
export const DURACION_CORTA = 0.14;

export class Tweens {
  private readonly lista: Tween[] = [];

  /** `corto` = "reducir movimiento": toda transición se reduce a un cambio corto. */
  constructor(private corto = false) {}

  get cantidad(): number {
    return this.lista.length;
  }

  fijarCorto(corto: boolean): void {
    this.corto = corto;
  }

  get reducido(): boolean {
    return this.corto;
  }

  agregar(dur: number, upd: (k: number) => void, done?: (() => void) | null, dueno?: unknown): void {
    const d = this.corto ? Math.min(dur, DURACION_CORTA) : Math.max(0.0001, dur);
    this.lista.push({ t: 0, dur: d, upd, done: done ?? null, dueno });
  }

  /** Espera `seg` segundos y llama `fn` (sin dueño). */
  esperar(seg: number, fn: () => void, dueno?: unknown): void {
    this.agregar(this.corto ? Math.min(seg, DURACION_CORTA) : seg, () => undefined, fn, dueno);
  }

  /** Quita las transiciones de ese dueño SIN llamar su `done`. */
  cancelar(dueno: unknown): void {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      if (this.lista[i].dueno === dueno) this.lista.splice(i, 1);
    }
  }

  tieneDe(dueno: unknown): boolean {
    return this.lista.some((t) => t.dueno === dueno);
  }

  limpiar(): void {
    this.lista.length = 0;
  }

  /** Avanza `dt` segundos. Devuelve true si había algo en marcha. */
  paso(dt: number): boolean {
    if (!this.lista.length) return false;
    for (const t of this.lista.slice()) {
      if (this.lista.indexOf(t) < 0) continue;
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      t.upd(k);
      if (k >= 1) {
        const i = this.lista.indexOf(t);
        if (i >= 0) this.lista.splice(i, 1);
        if (t.done) t.done();
      }
    }
    return true;
  }
}
