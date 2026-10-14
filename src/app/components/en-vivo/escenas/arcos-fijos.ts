import type * as ThreeNS from 'three';
import type { Three } from '../../../shared/escena-3d/escena-base';
import type { KitEscena } from './kit-escena';
import { ease } from './tweens';

type V3 = ThreeNS.Vector3;

/** Lo que se pide dibujar: un arco `desde` → `hasta` o, sin `desde`, solo el anillo del destino. */
export interface ArcoFijoPedido {
  /** Clave estable: un arco con la misma clave no se rehace. */
  clave: string;
  desde: V3 | null;
  hasta: V3;
  /** Token de color del tema (`info`, `accent`...). */
  token: string;
}

interface ArcoVivo {
  objetos: ThreeNS.Object3D[];
  geos: ThreeNS.BufferGeometry[];
  mats: ThreeNS.MeshBasicMaterial[];
  /** Avance del trazo (0..1); 1 = completo y quieto. */
  avance: number;
  /** Pone el trazo en ese avance (null = no hay trazo que crecer). */
  trazar: ((e: number) => void) | null;
  /**
   * Dónde puede ir la etiqueta del grupo, en orden de preferencia: sobre el arco, primero pasado el
   * medio (lejos del letrero de la bodega) y luego más cerca o más lejos sobre la misma curva; si no
   * hay espacio en la curva (un arco corto en pantalla queda pegado a "Tu bodega"), encima del anillo
   * del destino a varias alturas y a los lados. Sin arco, solo esos del anillo. Se calculan una vez
   * (no por cuadro).
   */
  lugares: V3[];
}

/** Cuánto tarda el arco en dibujarse la primera vez (s). Después queda quieto, sin bucle. */
const CRECER_S = 1.1;
const GEO_ANILLO = 'anillo-arco-fijo';
/**
 * Puntos de la curva (0..1) donde puede ir la etiqueta, en orden: el primero pasado el medio, para no
 * taparle el letrero a la bodega; los demás, por si ese lugar lo ocupa un nombre real del mapa.
 */
const LUGARES_EN_ARCO = [0.62, 0.5, 0.74, 0.4, 0.84, 0.3];
/**
 * Alrededor del anillo del destino, a varias alturas y a los lados ([dx, alto]): los únicos lugares sin
 * arco (misma ciudad de la bodega) y el respaldo de un arco que en pantalla no deja espacio.
 */
const LUGARES_SIN_ARCO: ReadonlyArray<[number, number]> = [[0, 1.6], [0, 3], [0, 4.4], [1.8, 1.2], [-1.8, 1.2]];

/**
 * Arcos FIJOS de la propuesta de Opttia en "Mi país" (D-422, tarea 4.6). Es la variante persistente
 * de `EfectosEscena.arco()`: misma curva, pero no se apaga sola. La primera vez se dibuja en ~1 s con
 * un punto que la recorre; con "reducir movimiento" o calidad baja aparece completa. Después queda
 * QUIETA mientras la propuesta siga en la tarjeta, y `fijar([])` la borra.
 *
 * No vive con los efectos pasajeros: `NucleoEscena.limpiar()` (cada foto nueva) no la toca, y solo
 * la quita quien la puso. Libera sus geometrías y materiales al quitarse. Solo dibuja: no mueve nada
 * real.
 */
export class ArcosFijos {
  private readonly vivos = new Map<string, ArcoVivo>();

  constructor(
    private readonly T: Three,
    private readonly kit: KitEscena,
    private readonly geoCache: Map<string, ThreeNS.BufferGeometry>,
    private readonly escena: ThreeNS.Object3D,
  ) {}

  /** Cuántos arcos (o anillos) hay a la vista (para pruebas). */
  get cantidad(): number {
    return this.vivos.size;
  }

  /** Dónde va la etiqueta del arco de esa clave si nada la tapa (el primero de sus lugares); null si no está. */
  cima(clave: string): V3 | null {
    return this.vivos.get(clave)?.lugares[0] ?? null;
  }

  /** Todos los lugares donde puede ir la etiqueta del arco de esa clave, en orden; vacío si no está. */
  lugares(clave: string): ReadonlyArray<V3> {
    return this.vivos.get(clave)?.lugares ?? [];
  }

  /**
   * Deja exactamente estos arcos: quita los que ya no están y crea los nuevos (los que siguen no se
   * tocan). `alto` es la altura del suelo del mapa. `quieto` = sin la animación de dibujo. Devuelve
   * true si cambió algo.
   */
  fijar(lista: ReadonlyArray<ArcoFijoPedido>, alto: number, quieto: boolean): boolean {
    const quedan = new Set(lista.map((a) => a.clave));
    let cambio = false;
    this.vivos.forEach((a, clave) => {
      if (quedan.has(clave)) return;
      this.quitar(a);
      this.vivos.delete(clave);
      cambio = true;
    });
    for (const a of lista) {
      if (this.vivos.has(a.clave)) continue;
      this.vivos.set(a.clave, this.crear(a, alto, quieto));
      cambio = true;
    }
    return cambio;
  }

  /** Un cuadro: avanza los que se están dibujando. Devuelve true si alguno se movió. Sin asignar memoria. */
  paso(dt: number): boolean {
    let hay = false;
    for (const a of this.vivos.values()) {
      if (!a.trazar || a.avance >= 1) continue;
      a.avance = Math.min(1, a.avance + dt / CRECER_S);
      a.trazar(ease.inOut(a.avance));
      hay = true;
    }
    return hay;
  }

  /** Quita todo (al destruir la escena). */
  destruir(): void {
    this.vivos.forEach((a) => this.quitar(a));
    this.vivos.clear();
  }

  private crear(a: ArcoFijoPedido, alto: number, quieto: boolean): ArcoVivo {
    const T = this.T;
    const vivo: ArcoVivo = {
      objetos: [],
      geos: [],
      mats: [],
      avance: 1,
      trazar: null,
      lugares: LUGARES_SIN_ARCO.map(([dx, y]) => new T.Vector3(a.hasta.x + dx, alto + y, a.hasta.z)),
    };

    // Anillo quieto en la ciudad de destino (lo único que se ve si es la misma ciudad de la bodega).
    let gAnillo = this.geoCache.get(GEO_ANILLO);
    if (!gAnillo) {
      gAnillo = new T.RingGeometry(0.34, 0.5, 32);
      this.geoCache.set(GEO_ANILLO, gAnillo);
    }
    const mAnillo = this.kit.basico(a.token, 0.9);
    vivo.mats.push(mAnillo);
    const anillo = new T.Mesh(gAnillo, mAnillo);
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.set(a.hasta.x, alto + 0.06, a.hasta.z);
    vivo.objetos.push(anillo);

    if (a.desde) {
      // La misma curva de `EfectosEscena.arco()`, un poco más delgada y translúcida (es una idea, no una salida).
      const dist = a.desde.distanceTo(a.hasta);
      const medio = a.desde.clone().lerp(a.hasta, 0.5);
      medio.y = alto + 1.2 + dist * 0.32;
      const curva = new T.QuadraticBezierCurve3(a.desde.clone().setY(alto + 0.3), medio, a.hasta.clone().setY(alto + 0.1));
      const g = new T.TubeGeometry(curva, 64, 0.06, 6, false);
      vivo.geos.push(g);
      const m = this.kit.basico(a.token, 0.8);
      vivo.mats.push(m);
      vivo.objetos.push(new T.Mesh(g, m));
      // Primero sobre la curva; después, los del anillo del destino (ya calculados arriba).
      vivo.lugares = LUGARES_EN_ARCO.map((t) => {
        const p = curva.getPoint(t);
        p.y += 0.35;
        return p;
      }).concat(vivo.lugares);

      if (!quieto) {
        const total = g.index ? g.index.count : g.attributes['position'].count;
        const mp = this.kit.basico(a.token, 1);
        vivo.mats.push(mp);
        const punto = new T.Mesh(this.kit.gEsf(0.18), mp);
        vivo.objetos.push(punto);
        vivo.avance = 0;
        vivo.trazar = (e: number): void => {
          g.setDrawRange(0, e >= 1 ? Infinity : Math.floor((total * e) / 6) * 6);
          // Con destino: `getPoint` sin él crea un Vector3 nuevo en cada cuadro.
          curva.getPoint(e, punto.position);
          punto.visible = e < 1;
        };
        vivo.trazar(0);
      }
    }

    vivo.objetos.forEach((o) => this.escena.add(o));
    return vivo;
  }

  private quitar(a: ArcoVivo): void {
    a.objetos.forEach((o) => this.escena.remove(o));
    a.geos.forEach((g) => g.dispose());
    a.mats.forEach((m) => {
      m.dispose();
      this.kit.vivos.delete(m);
    });
  }
}
