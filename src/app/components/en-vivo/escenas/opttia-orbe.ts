import type * as ThreeNS from 'three';
import type { Punto3, Three } from '../../../shared/escena-3d/escena-base';
import { trazosDe } from '../utilidades/iconos';
import type { Tokens } from './escena-tokens';
import { EtiquetaH, GestorEtiquetas, esc } from './etiquetas-html';
import type { ObjetivoOrbe } from './opttia-puntos';
import { ease } from './tweens';

type V3 = ThreeNS.Vector3;

/**
 * El orbe de Opttia dentro de una escena 3D (D-386, 5.14): un núcleo morado (`--pack`) con un halo
 * giratorio, tres chispas, una sombra, un anillo de marca y un rayo punteado hasta lo que señala,
 * más una burbuja HTML con la sugerencia. Se cuelga de cualquiera de las cuatro escenas (operación,
 * mapa del comercio, país de Katuq y ciudad de Katuq) por los ganchos aditivos de `EscenaBase`
 * (`raiz`, `alCuadro`, `alTocar`, `alArrastrar`, `golpea`), sin tocar el mundo de la escena.
 *
 * Esta clase solo DIBUJA y mueve: qué señalar y cuándo lo decide `GuiaOpttia` (puro) y lo ejecuta
 * `EnVivoOrbeService`. Con "reducir movimiento" el orbe aparece en el lugar, sin vuelo ni vaivén.
 * Solo lectura: no cambia pedidos ni nada del servidor.
 */

export type IdEscenaOrbe = 'operacion' | 'mapa' | 'pais' | 'ciudad';

/** Cómo se mueve el orbe en cada escena (mismas cifras del prototipo). */
export interface ConfigOrbe {
  /** Altura del piso donde se pinta la marca. */
  suelo: number;
  /** Centro y radio del paseo tranquilo. */
  cx: number;
  cz: number;
  radio: number;
  /** Altura del paseo. */
  alto: number;
  /** Altura del orbe sobre lo que señala. */
  sobre: number;
  escala: number;
  /** Tamaño del anillo de marca. */
  anillo: number;
}

export const CONFIG_ORBE: Readonly<Record<IdEscenaOrbe, ConfigOrbe>> = {
  operacion: { suelo: 0.14, cx: 0.4, cz: 0.8, radio: 9, alto: 8.6, sobre: 5.4, escala: 1.5, anillo: 1 },
  mapa: { suelo: 0.47, cx: 0.7, cz: 0.3, radio: 5, alto: 4.5, sobre: 2.4, escala: 0.55, anillo: 0.55 },
  pais: { suelo: 0.47, cx: 0.7, cz: 0.3, radio: 5, alto: 5.2, sobre: 3.8, escala: 0.55, anillo: 0.55 },
  ciudad: { suelo: 0.17, cx: 0, cz: 0.6, radio: 10, alto: 11, sobre: 9.5, escala: 1.6, anillo: 2.9 },
};

/** Lo que el orbe necesita de la escena en la que está (las cuatro lo cumplen por `EscenaBase`). */
export interface EscenaOrbitable {
  readonly raiz: ThreeNS.Scene;
  alCuadro(gancho: (t: number, dt: number) => boolean): () => void;
  alTocar(gancho: (x: number, y: number) => boolean): () => void;
  alArrastrar(gancho: () => void): () => void;
  golpea(objetos: ThreeNS.Object3D[], x: number, y: number): boolean;
  enfocarPunto(punto: Punto3, zoom?: number): void;
  soltarFoco(): void;
  marcarSucio(): void;
}

/** La escena (y su componente) que aloja al orbe. La arma el componente de cada escena. */
export interface AnfitrionOrbe {
  readonly id: IdEscenaOrbe;
  readonly T: Three;
  readonly escena: EscenaOrbitable;
  readonly etiquetas: GestorEtiquetas;
  tokens(): Tokens;
  /** "Reducir movimiento" vigente. */
  reducir(): boolean;
  /** La escena está corriendo (a la vista, con la pestaña visible y activa). */
  visible(): boolean;
  /** Dónde está, en esta escena, lo que se quiere señalar (mundo); null si no se ve. */
  lugarDe(obj: ObjetivoOrbe): V3 | null;
  /** Mientras el orbe mueve la cámara, la cámara automática del modo pantalla se queda quieta. */
  retenerCamara(retener: boolean): void;
}

export interface GanchosOrbe {
  /** Cada cuadro, antes de mover al orbe: aquí corre el cerebro (`GuiaOpttia`). `ahoraMs` = performance.now(). */
  alFrame(ahoraMs: number): void;
  /** Tocaron al orbe. */
  alTocarOrbe(): void;
  /** Arrastraron la cámara. */
  alArrastrarCamara(): void;
}

interface Efecto {
  paso: (dt: number) => boolean;
  limpiar: () => void;
}

interface OpcionesSenal {
  camara?: boolean;
  titulo?: string;
  tono?: string;
}

const COLORES_CONFETI: ReadonlyArray<string> = ['accent', 'accent-2', 'ok', 'warn', 'info', 'pack'];
/** Espera entre que el orbe sale hacia un pedido "Con Opttia" y el destello (el vuelo dura ~1 s). */
const ESPERA_DESTELLO_MS = 900;

/** Un icono de línea (el mismo de las tarjetas) como SVG para la burbuja. */
function svgIa(): string {
  const trazos = trazosDe('ia').map((d) => '<path d="' + d + '"/>').join('');
  return '<svg class="eve-ico" viewBox="0 0 24 24" aria-hidden="true">' + trazos + '</svg>';
}

export class OrbeOpttia {
  private readonly T: Three;
  private readonly cfg: ConfigOrbe;
  private readonly grupo: ThreeNS.Group;
  private readonly nucleo: ThreeNS.Mesh;
  private readonly halo: ThreeNS.Mesh;
  private readonly aura: ThreeNS.Mesh;
  private readonly chispas: ThreeNS.Mesh[] = [];
  private readonly sombra: ThreeNS.Mesh;
  private readonly marca: ThreeNS.Mesh;
  private readonly rayo: ThreeNS.Line;
  private readonly rayoGeo: ThreeNS.BufferGeometry;
  private readonly mats: Array<{ mat: ThreeNS.Material & { color: ThreeNS.Color }; token: string }> = [];
  private readonly geos: ThreeNS.BufferGeometry[] = [];
  private readonly pos: V3;
  private readonly objetivo: V3;
  private readonly lblPos: V3;
  private readonly ultimaPos: V3;
  private readonly quitarGanchos: Array<() => void> = [];
  private readonly efectos: Efecto[] = [];
  private readonly pendientes: Array<{ cuandoMs: number; fn: () => void }> = [];

  private punto: { lugar: V3; obj: ObjetivoOrbe | null } | null = null;
  private burbuja: EtiquetaH | null = null;
  private hastaMs = 0;
  private camaraPedida = false;
  private sucio = true;
  private destruido = false;

  constructor(private readonly h: AnfitrionOrbe, private readonly ganchos: GanchosOrbe) {
    const T = h.T;
    this.T = T;
    this.cfg = CONFIG_ORBE[h.id];
    const c = this.cfg;
    this.pos = new T.Vector3(c.cx + c.radio, c.alto, c.cz);
    this.objetivo = this.pos.clone();
    this.lblPos = this.pos.clone();
    this.ultimaPos = this.pos.clone();

    this.grupo = new T.Group();
    const esfera = this.geo(new T.IcosahedronGeometry(0.5, 2));
    this.nucleo = this.malla(esfera, this.lambert('pack'), this.grupo);
    this.halo = this.malla(this.geo(new T.TorusGeometry(0.85, 0.06, 8, 40)), this.basico('pack', 0.55), this.grupo);
    this.halo.rotation.x = Math.PI / 2.4;
    this.aura = this.malla(this.geo(new T.SphereGeometry(0.78, 16, 12)), this.basico('pack', 0.16), this.grupo);
    const gChispa = this.geo(new T.IcosahedronGeometry(0.09, 1));
    for (let i = 0; i < 3; i++) this.chispas.push(this.malla(gChispa, this.basico(i === 1 ? 'accent-2' : 'pack', 1), this.grupo));
    this.grupo.scale.setScalar(c.escala);

    this.sombra = new T.Mesh(this.geo(new T.CircleGeometry(0.7, 32)), this.basico('pack', 0.2));
    this.sombra.rotation.x = -Math.PI / 2;
    this.sombra.scale.setScalar(c.escala);
    this.marca = new T.Mesh(this.geo(new T.RingGeometry(0.8, 1, 40)), this.basico('pack', 0.9));
    this.marca.rotation.x = -Math.PI / 2;
    this.marca.scale.setScalar(c.anillo);
    this.marca.visible = false;

    this.rayoGeo = this.geo(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 1, 0)]));
    const mr = new T.LineDashedMaterial({ color: this.token('pack'), dashSize: 0.3, gapSize: 0.2 });
    this.mats.push({ mat: mr, token: 'pack' });
    this.rayo = new T.Line(this.rayoGeo, mr);
    this.rayo.frustumCulled = false;
    this.rayo.visible = false;

    this.grupo.position.copy(this.pos);
  }

  // ------------------------------------------------------------------ ciclo

  /** Lo agrega a la escena y se engancha a su cuadro, sus toques y su cámara. */
  iniciar(): void {
    const e = this.h.escena;
    const raiz = e.raiz;
    [this.grupo, this.sombra, this.marca, this.rayo].forEach((o) => raiz.add(o));
    this.quitarGanchos.push(e.alCuadro((t, dt) => this.cuadro(t, dt)));
    this.quitarGanchos.push(
      e.alTocar((x, y) => {
        if (!this.grupo.visible || !e.golpea([this.aura, this.nucleo], x, y)) return false;
        this.ganchos.alTocarOrbe();
        return true;
      })
    );
    this.quitarGanchos.push(e.alArrastrar(() => this.ganchos.alArrastrarCamara()));
    this.marcar();
  }

  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.quitarGanchos.forEach((q) => q());
    this.quitarGanchos.length = 0;
    this.quitarBurbuja();
    this.efectos.forEach((f) => f.limpiar());
    this.efectos.length = 0;
    this.pendientes.length = 0;
    if (this.camaraPedida) {
      this.camaraPedida = false;
      this.h.escena.soltarFoco();
      this.h.retenerCamara(false);
    }
    const raiz = this.h.escena.raiz;
    [this.grupo, this.sombra, this.marca, this.rayo].forEach((o) => raiz.remove(o));
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.mat.dispose());
    this.h.escena.marcarSucio();
  }

  /** Vuelve a leer los colores (cambió el tema del modo pantalla). */
  retemar(): void {
    const t = this.h.tokens();
    this.mats.forEach((m) => {
      try { m.mat.color.set(t[m.token] ?? '#8e27b0'); } catch { /* color raro: se queda el anterior */ }
    });
    this.marcar();
  }

  get tienePunto(): boolean {
    return this.punto !== null || this.burbuja !== null;
  }

  // -------------------------------------------------------------- señalar

  /**
   * Vuela hasta `lugar` (si hay) y lo señala con anillo, rayo y burbuja `ms` milisegundos. Devuelve
   * true si había un lugar que señalar. `op.camara`: la cámara viaja al lugar (sin "reducir movimiento").
   */
  senalar(obj: ObjetivoOrbe | null, lugar: V3 | null, texto: string, ms: number, op: OpcionesSenal = {}): boolean {
    if (this.destruido) return false;
    this.limpiarMarca();
    this.quitarBurbuja();
    const c = this.cfg;
    this.punto = lugar ? { lugar: lugar.clone(), obj } : null;
    if (lugar) {
      this.objetivo.set(lugar.x + 0.001, c.suelo + c.sobre, lugar.z + 0.001);
      this.marca.position.set(lugar.x, c.suelo + 0.03, lugar.z);
      this.marca.visible = true;
      this.rayo.visible = true;
      if (op.camara && !this.h.reducir() && this.h.visible()) {
        this.h.retenerCamara(true);
        this.h.escena.enfocarPunto({ x: lugar.x, y: 0, z: lugar.z }, 1.4);
        this.camaraPedida = true;
      }
    }
    this.hastaMs = performance.now() + ms;
    const html =
      `<span class="eve-opt__ico">${svgIa()}</span><small>${esc(op.titulo || 'Opttia')}</small><b>${esc(texto)}</b>`;
    this.burbuja = this.h.etiquetas.crear({ clase: 'eve-lbl--opt', html, pos: () => this.lblPos, tono: op.tono || 'pack' });
    if (this.h.reducir()) this.irAlObjetivo();
    this.marcar();
    return lugar !== null;
  }

  /** Quita la señal, la burbuja, la marca y suelta la cámara; el orbe vuelve a pasear. */
  soltar(): void {
    this.punto = null;
    this.limpiarMarca();
    this.quitarBurbuja();
    if (this.camaraPedida) {
      this.camaraPedida = false;
      this.h.escena.soltarFoco();
      this.h.retenerCamara(false);
    }
    this.marcar();
  }

  /** Pulso en el piso y confeti plano en `lugar` (un pedido "Con Opttia" llegó). Sin "reducir movimiento" no dibuja. */
  destello(lugar: V3): void {
    if (this.destruido || this.h.reducir()) return;
    const l = lugar.clone();
    this.pendientes.push({
      cuandoMs: performance.now() + ESPERA_DESTELLO_MS,
      fn: () => {
        this.pulso(l.clone().setY(this.cfg.suelo + 0.05), 2.4, 1.1);
        this.confeti(l.clone().setY(this.cfg.suelo + this.cfg.sobre * 0.6));
      },
    });
    this.marcar();
  }

  // ---------------------------------------------------------------- cuadro

  private cuadro(t: number, dt: number): boolean {
    if (this.destruido) return false;
    const ahora = performance.now();
    this.ganchos.alFrame(ahora);
    if (this.destruido) return false;

    let cambio = this.sucio;
    this.sucio = false;

    for (let i = this.pendientes.length - 1; i >= 0; i--) {
      if (ahora >= this.pendientes[i].cuandoMs) {
        const p = this.pendientes.splice(i, 1)[0];
        p.fn();
        cambio = true;
      }
    }
    for (let i = this.efectos.length - 1; i >= 0; i--) {
      cambio = true;
      if (!this.efectos[i].paso(dt)) {
        this.efectos[i].limpiar();
        this.efectos.splice(i, 1);
      }
    }
    // Red de seguridad: una señal que nadie soltó no se queda para siempre.
    if (this.tienePunto && ahora > this.hastaMs + 1200) this.soltar();

    const c = this.cfg;
    const reducir = this.h.reducir();
    if (!this.punto) {
      const a = reducir ? 0.4 : t * 0.12;
      this.objetivo.set(c.cx + Math.cos(a) * c.radio, c.alto, c.cz + Math.sin(a) * c.radio * 0.7);
    } else if (this.punto.obj && (this.punto.obj.tipo === 'pedido' || this.punto.obj.tipo === 'veh')) {
      // Si la caja o la moto se mueve, el orbe la sigue.
      const l = this.h.lugarDe(this.punto.obj);
      if (l) {
        this.punto.lugar.copy(l);
        this.objetivo.set(l.x, c.suelo + c.sobre, l.z);
        this.marca.position.set(l.x, c.suelo + 0.03, l.z);
      }
    }
    const k = reducir ? 1 : Math.min(1, dt * 2.4);
    this.pos.lerp(this.objetivo, k);
    this.grupo.position.copy(this.pos);
    if (!reducir) this.grupo.position.y += Math.sin(t * 2.2) * 0.18 * c.escala;
    this.halo.rotation.z = t * 1.4;
    this.chispas.forEach((s, i) => {
      const a = t * (1.6 + i * 0.4) + i * 2.1;
      s.position.set(Math.cos(a) * 1.05, Math.sin(a * 1.3) * 0.35, Math.sin(a) * 1.05);
    });
    this.nucleo.scale.setScalar(reducir ? 1 : 1 + Math.sin(t * 3) * 0.06);
    this.sombra.position.set(this.grupo.position.x, c.suelo + 0.02, this.grupo.position.z);
    this.lblPos.copy(this.grupo.position);
    this.lblPos.y += 0.9 * c.escala;

    if (this.marca.visible) {
      const m = reducir ? 0.5 : (t * 0.9) % 1;
      this.marca.scale.setScalar(c.anillo * (1 + m * 0.6));
      (this.marca.material as ThreeNS.MeshBasicMaterial).opacity = 0.9 * (1 - m);
    }
    if (this.rayo.visible && this.punto) {
      const p = this.rayoGeo.attributes['position'] as ThreeNS.BufferAttribute;
      p.setXYZ(0, this.grupo.position.x, this.grupo.position.y - 0.4 * c.escala, this.grupo.position.z);
      p.setXYZ(1, this.punto.lugar.x, c.suelo + 0.05, this.punto.lugar.z);
      p.needsUpdate = true;
      this.rayoGeo.computeBoundingSphere();
      this.rayo.computeLineDistances();
    }

    const movio = this.grupo.position.distanceToSquared(this.ultimaPos) > 1e-6;
    this.ultimaPos.copy(this.grupo.position);
    // Con movimiento el orbe pasea y se pinta en cada cuadro; con "reducir movimiento" solo si cambió algo.
    return cambio || !reducir || movio;
  }

  private irAlObjetivo(): void {
    this.pos.copy(this.objetivo);
    this.grupo.position.copy(this.pos);
  }

  private marcar(): void {
    this.sucio = true;
    this.h.escena.marcarSucio();
  }

  private limpiarMarca(): void {
    this.marca.visible = false;
    this.rayo.visible = false;
  }

  private quitarBurbuja(): void {
    if (this.burbuja) {
      this.h.etiquetas.quitar(this.burbuja);
      this.burbuja = null;
    }
  }

  // --------------------------------------------------------------- efectos

  private pulso(pos: V3, tam: number, dur: number): void {
    const T = this.T;
    const mat = this.nuevoBasico('pack', 0.75);
    const anillo = new T.Mesh(this.geoRing(), mat);
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.copy(pos);
    this.h.escena.raiz.add(anillo);
    let vida = 0;
    this.efectos.push({
      paso: (dt) => {
        vida += dt;
        const u = Math.min(1, vida / dur);
        anillo.scale.setScalar((1 + ease.out(u) * tam) * this.cfg.anillo);
        mat.opacity = 0.75 * (1 - u);
        return u < 1;
      },
      limpiar: () => { this.h.escena.raiz.remove(anillo); mat.dispose(); },
    });
  }

  private ringGeo: ThreeNS.BufferGeometry | null = null;
  private geoRing(): ThreeNS.BufferGeometry {
    if (!this.ringGeo) this.ringGeo = this.geo(new this.T.RingGeometry(0.55, 0.75, 40));
    return this.ringGeo;
  }

  private confetiGeo: ThreeNS.BufferGeometry | null = null;

  /** Confeti plano con los colores de la paleta (escala con el tamaño del orbe en cada escena). */
  private confeti(pos: V3): void {
    const T = this.T;
    if (!this.confetiGeo) this.confetiGeo = this.geo(new T.PlaneGeometry(0.2, 0.11));
    const s = this.cfg.escala / 1.5;
    const raiz = this.h.escena.raiz;
    const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
    const piezas: Array<{ m: ThreeNS.Mesh; v: V3; r: V3; mat: ThreeNS.MeshBasicMaterial }> = [];
    for (let i = 0; i < 34; i++) {
      const mat = this.nuevoBasico(COLORES_CONFETI[i % COLORES_CONFETI.length], 1);
      mat.side = T.DoubleSide;
      const m = new T.Mesh(this.confetiGeo, mat);
      m.position.copy(pos);
      m.scale.setScalar(Math.max(0.35, s));
      raiz.add(m);
      piezas.push({
        m,
        mat,
        v: new T.Vector3(rnd(-2.2, 2.2) * s, rnd(3.5, 6.5) * s, rnd(-2.2, 2.2) * s),
        r: new T.Vector3(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)),
      });
    }
    let vida = 0;
    this.efectos.push({
      paso: (dt) => {
        vida += dt;
        piezas.forEach((p) => {
          p.v.y -= 9.8 * s * dt;
          p.m.position.addScaledVector(p.v, dt);
          p.m.rotation.x += p.r.x * dt;
          p.m.rotation.y += p.r.y * dt;
          p.mat.opacity = Math.max(0, 1 - vida / 1.8);
        });
        return vida <= 1.8;
      },
      limpiar: () => piezas.forEach((p) => { raiz.remove(p.m); p.mat.dispose(); }),
    });
  }

  // ---------------------------------------------------------------- ayudas

  private token(token: string): string {
    return this.h.tokens()[token] ?? '#8e27b0';
  }

  private geo<G extends ThreeNS.BufferGeometry>(g: G): G {
    this.geos.push(g);
    return g;
  }

  private lambert(token: string): ThreeNS.MeshLambertMaterial {
    const m = new this.T.MeshLambertMaterial({ color: this.token(token) });
    this.mats.push({ mat: m, token });
    return m;
  }

  private basico(token: string, opacidad: number): ThreeNS.MeshBasicMaterial {
    const m = this.nuevoBasico(token, opacidad);
    this.mats.push({ mat: m, token });
    return m;
  }

  /** Material de un efecto pasajero: no se re-tiñe, se suelta al terminar. */
  private nuevoBasico(token: string, opacidad: number): ThreeNS.MeshBasicMaterial {
    return new this.T.MeshBasicMaterial({ color: this.token(token), transparent: true, opacity: opacidad, depthWrite: false });
  }

  private malla(g: ThreeNS.BufferGeometry, m: ThreeNS.Material, padre: ThreeNS.Object3D): ThreeNS.Mesh {
    const mesh = new this.T.Mesh(g, m);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    padre.add(mesh);
    return mesh;
  }
}
