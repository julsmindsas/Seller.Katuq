import type * as ThreeNS from 'three';
import type { Three } from '../../../shared/escena-3d/escena-base';
import { KitEscena } from './kit-escena';
import { Tweens, ease } from './tweens';

type V3 = ThreeNS.Vector3;

interface EfectoPorCuadro {
  paso: (dt: number) => boolean;
  limpiar: () => void;
}

/** Tope de arcos de envío vivos a la vez: con una ráfaga, el resto se queda en pulso. */
export const MAX_ARCOS = 10;

/**
 * Efectos de piso y de aire que comparten las escenas del mapa y de la ciudad de "En vivo":
 * pulso en el suelo, haz de luz, confeti plano y arco de envío con un punto viajero. Usan los
 * materiales planos y translúcidos del kit (se re-tiñen con el tema) y los tweens de la escena,
 * y con "reducir movimiento" no dibujan nada (la escena avisa con tarjetas). Todo lo que crean
 * se registra para que `limpiar()` lo quite sin dejar geometrías ni materiales colgando.
 */
export class EfectosEscena {
  private readonly efimeros = new Map<ThreeNS.Object3D, () => void>();
  private readonly porCuadro: EfectoPorCuadro[] = [];
  private arcos = 0;

  constructor(
    private readonly T: Three,
    private readonly kit: KitEscena,
    private readonly tw: Tweens,
    private readonly geoCache: Map<string, ThreeNS.BufferGeometry>,
    private readonly escena: ThreeNS.Object3D,
  ) {}

  get reducido(): boolean {
    return this.tw.reducido;
  }

  /** Cuántos efectos hay vivos (para pruebas y para saber si hay que seguir pintando). */
  get activos(): number {
    return this.efimeros.size + this.porCuadro.length;
  }

  get arcosVivos(): number {
    return this.arcos;
  }

  private liberarMaterial(mat: ThreeNS.MeshBasicMaterial): void {
    mat.dispose();
    this.kit.vivos.delete(mat);
  }

  private registrar(o: ThreeNS.Object3D, liberar: () => void): void {
    this.escena.add(o);
    this.efimeros.set(o, liberar);
  }

  private soltar(o: ThreeNS.Object3D): void {
    const liberar = this.efimeros.get(o);
    this.escena.remove(o);
    if (liberar) { this.efimeros.delete(o); liberar(); }
  }

  /** Anillo que crece y se apaga en el piso. */
  pulso(pos: V3, token: string, tam = 3, dur = 1.1): void {
    if (this.reducido) return;
    const k = 'ring|0.55|0.75';
    let g = this.geoCache.get(k);
    if (!g) { g = new this.T.RingGeometry(0.55, 0.75, 40); this.geoCache.set(k, g); }
    const m = this.kit.basico(token, 0.75);
    const r = new this.T.Mesh(g, m);
    r.rotation.x = -Math.PI / 2;
    r.position.copy(pos);
    this.registrar(r, () => this.liberarMaterial(m));
    this.tw.agregar(dur, (u) => { r.scale.setScalar(1 + ease.out(u) * tam); m.opacity = 0.75 * (1 - u); }, () => this.soltar(r), r);
  }

  /** Haz de luz que cae sobre un punto. */
  haz(pos: V3, token: string, alt = 12, dur = 1.2): void {
    if (this.reducido) return;
    const k = `haz|${alt}`;
    let g = this.geoCache.get(k);
    if (!g) { g = new this.T.CylinderGeometry(0.5, 0.5, alt, 24, 1, true); this.geoCache.set(k, g); }
    const m = this.kit.basico(token, 0.3);
    const c = new this.T.Mesh(g, m);
    c.position.set(pos.x, pos.y + alt / 2, pos.z);
    this.registrar(c, () => this.liberarMaterial(m));
    this.tw.agregar(dur, (u) => { m.opacity = 0.3 * (1 - u); c.scale.set(1 - u * 0.6, 1, 1 - u * 0.6); }, () => this.soltar(c), c);
  }

  /** Confeti plano con los colores de la paleta. */
  confeti(pos: V3): void {
    if (this.reducido) return;
    const T = this.T;
    const colores = ['accent', 'accent-2', 'ok', 'warn', 'info', 'pack'];
    let g = this.geoCache.get('confeti');
    if (!g) { g = new T.PlaneGeometry(0.2, 0.11); this.geoCache.set('confeti', g); }
    const piezas: ThreeNS.Mesh[] = [];
    const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
    for (let i = 0; i < 34; i++) {
      const m = this.kit.basico(colores[i % colores.length], 1);
      m.side = T.DoubleSide;
      const p = new T.Mesh(g, m);
      p.position.copy(pos);
      p.userData['v'] = new T.Vector3(rnd(-2.2, 2.2), rnd(3.5, 6.5), rnd(-2.2, 2.2));
      p.userData['r'] = new T.Vector3(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8));
      this.escena.add(p);
      piezas.push(p);
    }
    let vida = 0;
    this.porCuadro.push({
      paso: (dt) => {
        vida += dt;
        piezas.forEach((p) => {
          const v = p.userData['v'] as V3;
          const r = p.userData['r'] as V3;
          v.y -= 9.8 * dt;
          p.position.addScaledVector(v, dt);
          p.rotation.x += r.x * dt;
          p.rotation.y += r.y * dt;
          (p.material as ThreeNS.MeshBasicMaterial).opacity = Math.max(0, 1 - vida / 1.8);
        });
        return vida <= 1.8;
      },
      limpiar: () => piezas.forEach((p) => {
        this.escena.remove(p);
        this.liberarMaterial(p.material as ThreeNS.MeshBasicMaterial);
      }),
    });
  }

  /**
   * Arco de envío entre dos puntos con un punto que lo recorre; al llegar suelta un pulso y el arco se
   * apaga. Devuelve false si no se dibujó (reducir movimiento o ya hay `MAX_ARCOS`): quien lo llama
   * decide si deja un pulso.
   */
  arco(desde: V3, hasta: V3, alto: number, token: string, retraso = 0): boolean {
    if (this.reducido || this.arcos >= MAX_ARCOS) return false;
    const T = this.T;
    const dist = desde.distanceTo(hasta);
    const medio = desde.clone().lerp(hasta, 0.5);
    medio.y = alto + 1.2 + dist * 0.32;
    const curva = new T.QuadraticBezierCurve3(desde.clone().setY(alto + 0.3), medio, hasta.clone().setY(alto + 0.1));
    const g = new T.TubeGeometry(curva, 64, 0.07, 6, false);
    const m = this.kit.basico(token, 0.95);
    const tubo = new T.Mesh(g, m);
    const total = g.index ? g.index.count : g.attributes['position'].count;
    g.setDrawRange(0, 0);
    const pm = this.kit.basico(token, 1);
    const punto = new T.Mesh(this.kit.gEsf(0.2), pm);
    punto.visible = false;
    this.arcos++;
    let vivo = true;
    const cerrar = (): void => { if (vivo) { vivo = false; this.arcos = Math.max(0, this.arcos - 1); } };
    this.registrar(tubo, () => { g.dispose(); this.liberarMaterial(m); cerrar(); });
    this.registrar(punto, () => this.liberarMaterial(pm));
    const llegada = hasta.clone();
    llegada.y = Math.max(0, llegada.y - 0.01);
    this.tw.esperar(retraso, () => {
      punto.visible = true;
      this.tw.agregar(1.6, (k) => {
        const e = ease.inOut(k);
        g.setDrawRange(0, Math.floor(total * e / 6) * 6);
        punto.position.copy(curva.getPoint(e));
      }, () => {
        this.soltar(punto);
        this.pulso(llegada, token, 1.8, 1.0);
        this.tw.agregar(2.2, (k) => { m.opacity = 0.95 * (1 - k); }, () => this.soltar(tubo), tubo);
      }, tubo);
    }, tubo);
    return true;
  }

  /** Avanza los efectos que van por cuadro (confeti). Devuelve true si había alguno. */
  paso(dt: number): boolean {
    let habia = false;
    for (let i = this.porCuadro.length - 1; i >= 0; i--) {
      habia = true;
      if (!this.porCuadro[i].paso(dt)) { this.porCuadro[i].limpiar(); this.porCuadro.splice(i, 1); }
    }
    return habia;
  }

  /** Quita todo lo que sigue vivo (al reiniciar la escena o al destruirla). */
  limpiar(): void {
    this.efimeros.forEach((liberar, o) => { this.escena.remove(o); liberar(); });
    this.efimeros.clear();
    this.porCuadro.forEach((e) => e.limpiar());
    this.porCuadro.length = 0;
    this.arcos = 0;
  }
}
