import type * as ThreeNS from 'three';
import type { Three } from '../../../shared/escena-3d/escena-base';
import type { ColorEscena, GrupoEnEscena, PropuestaEnEscena } from '../propuestas/propuestas.modelos';
import {
  AnclasEnsayo,
  FantasmaEnsayo,
  GrupoEnsayo,
  LugaresRuta,
  MAX_FANTASMAS,
  MAX_GRUPOS_ENSAYO,
  PlanEnsayo,
  Punto2,
  RutaGrupo,
  armarEnsayo,
  avanceFantasma,
  puntosAlCamino,
  rutaACasa,
  rutaFlecha,
  rutaMonton,
} from './capa-propuesta.reglas';
import { EtiquetaH, GestorEtiquetas, esc } from './etiquetas-html';
import type { KitEscena } from './kit-escena';
import { BELT_Z, CAMION, CARRIL_SALIDA, PADS, PARQUEO_CASA, PICK, SALIDA_X } from './operacion.mundo';
import { ease } from './tweens';

type V3 = ThreeNS.Vector3;

/**
 * Capa del ENSAYO de una propuesta de Opttia sobre la escena "Mi operación" (D-422, fase 1).
 *
 * Se cuelga de la escena por los ganchos aditivos de `EscenaBase` (`raiz`, `alCuadro`, `alTocar`),
 * igual que el orbe, sin tocar el mundo. Con una propuesta dibuja:
 * - montones (despachos): copias fantasma translúcidas de las cajas del grupo que vuelan y se juntan
 *   frente al PICK (o frente al camión si es de transportadora), con un aro del color del grupo,
 *   un anillo fino bajo cada caja real, un aro bajo la moto y frente a la casa, y una línea
 *   punteada fija del montón a la moto y de ahí, por el carril, a la casa simbólica;
 * - fila (producción): copias numeradas en fila frente a la banda, con una flecha punteada por la
 *   banda hasta "En producción";
 * - moneda (cobro): un aro con "$" sobre la caja y una línea hasta su casa.
 * El resto de cajas baja al 40 % (la escena cambia a un material atenuado compartido por token).
 *
 * Las cajas REALES no se mueven: lo real lo anima el director con los eventos del canal en vivo.
 * Lee la posición de las cajas en cada cuadro con vectores reutilizados y no guarda referencias a
 * cajas ni vehículos (la escena los reconstruye en `reiniciar()`). Materiales del kit por token: el
 * tema del modo pantalla los re-tiñe. Con "reducir movimiento" aparece quieto, sin vuelo. Solo
 * lectura: no cambia pedidos ni llama al servidor.
 */

/** Lo que la capa necesita de la escena de la operación (lo cumple `OperacionEnVivoEscena`). */
export interface EscenaConPropuesta {
  readonly raiz: ThreeNS.Scene;
  readonly gestorEtiquetas: GestorEtiquetas;
  readonly kitEscena: KitEscena;
  alCuadro(gancho: (t: number, dt: number) => boolean): () => void;
  alTocar(gancho: (x: number, y: number) => boolean): () => void;
  golpea(objetos: ThreeNS.Object3D[], x: number, y: number): boolean;
  marcarSucio(): void;
  posCaja(id: string, out?: V3): V3 | null;
  posPedido(id: string, out?: V3): V3 | null;
  posVeh(nombre: string, out?: V3): V3 | null;
  posCamion(out?: V3): V3 | null;
  posCasa(pedidoId: string, out?: V3): V3 | null;
  prepararVehiculo(nombre: string | null | undefined, colorPreferido?: string | null, respetar?: ReadonlyArray<string>): string | null;
  atenuarCajas(salvo: ReadonlyArray<string> | null): void;
}

/** Lo que el componente de la escena le entrega a la capa. */
export interface AnfitrionCapa {
  readonly T: Three;
  readonly escena: EscenaConPropuesta;
  /** "Reducir movimiento" vigente. */
  reducir(): boolean;
  /** Tocaron el montón (o la fila) de un grupo: el componente avisa a la tarjeta por el puente. */
  alTocarGrupo(grupoId: string): void;
}

/** Dónde caen los montones, el de la transportadora y la fila de producción (mundo de la operación). */
const ANCLAS: AnclasEnsayo = {
  montones: { x: PICK.x - 1.6, z: PICK.z + 0.9 },
  pasoMontones: -2.8,
  camion: { x: CAMION.x - 3.0, z: CAMION.z - 0.2 },
  fila: { x: PADS.recibido.x - 0.8, z: BELT_Z + 1.65 },
  pasoFila: 0.95,
};
const LUGARES: LugaresRuta = { carrilZ: CARRIL_SALIDA, salidaX: SALIDA_X, parqueoDx: PARQUEO_CASA.dx, parqueoZ: PARQUEO_CASA.z };
/** La flecha de producción termina en el borde de "En producción" que da a la banda. */
const FIN_FLECHA_Z = PADS.produccion.z + 1.95;

const OPACIDAD_FANTASMA = 0.55;
const OPACIDAD_TRAZO = 0.85;
const Y_PUNTO = 0.12;
const Y_PUNTO_BANDA = 0.47;
const Y_ANILLO = 0.18;
const Y_ARO = 0.08;
const PASO_PUNTOS = 0.45;
const MAX_PUNTOS_RUTA = 90;
/** Varios grupos pueden compartir color (dos transportadoras, por ejemplo). */
const CAP_PUNTOS = MAX_GRUPOS_ENSAYO * MAX_PUNTOS_RUTA;
/** Aro del montón, de la moto y de la casa por grupo (o uno por caja en la moneda). */
const CAP_AROS = 3 * MAX_GRUPOS_ENSAYO;
const RADIO_MOTO = 0.95;
const RADIO_CASA = 1.75;
const RADIO_MONEDA = 0.85;
/** Las etiquetas de montones vecinos van a dos alturas (no se tapan entre sí). */
const ALTURA_ALTERNA = 1.2;
/** Altura del salto de una copia en su vuelo. */
const ARCO = 1.1;
/** Cuánto tardan en irse las copias y las líneas al retirar la propuesta (s). */
const SALIDA_S = 0.35;

interface Paquete {
  /** Material del kit por token: el tema lo re-tiñe. */
  mat: ThreeNS.MeshBasicMaterial;
  finos: ThreeNS.InstancedMesh;
  aros: ThreeNS.InstancedMesh;
  puntos: ThreeNS.InstancedMesh;
  nF: number;
  nA: number;
  nP: number;
}

interface GrupoVivo {
  g: GrupoEnsayo;
  /** Posición viva de su moto o su camión (vector reutilizado). */
  veh: V3;
  hayVeh: boolean;
  casa: V3;
  hayCasa: boolean;
  puntos: Float32Array;
}

interface FantasmaVivo {
  f: FantasmaEnsayo;
  desde: V3;
  hayDesde: boolean;
  pos: V3;
  escala: number;
  posEtq: V3;
}

/** Cómo arranca y sigue la línea de cada grupo (registro cerrado por tipo de ruta). */
type ArmarRuta = (capa: CapaPropuesta, gv: GrupoVivo) => Punto2[];

const RUTAS: Readonly<Record<RutaGrupo, ArmarRuta>> = {
  moto: (_c, gv) => (gv.g.centro ? rutaMonton(gv.g.centro, gv.hayVeh ? gv.veh : null, gv.hayCasa ? gv.casa : null, LUGARES) : []),
  camion: (_c, gv) => (gv.g.centro ? rutaMonton(gv.g.centro, gv.hayVeh ? gv.veh : null, null, LUGARES) : []),
  flecha: () => rutaFlecha(PADS.recibido, PADS.produccion, BELT_Z, FIN_FLECHA_Z),
  casa: (c, gv) => {
    const desde = gv.g.pedidoCasa ? c.vivoDe(gv.g.pedidoCasa) : null;
    return desde && gv.hayCasa ? rutaACasa(desde, gv.casa, LUGARES) : [];
  },
};

export class CapaPropuesta {
  private readonly T: Three;
  private readonly e: EscenaConPropuesta;
  private readonly kit: KitEscena;
  private readonly etiquetas: GestorEtiquetas;
  private readonly quitarGanchos: Array<() => void> = [];
  private readonly paquetes = new Map<ColorEscena, Paquete>();
  private readonly cuerpos: ThreeNS.InstancedMesh;
  private readonly cintas: ThreeNS.InstancedMesh;
  private readonly flecha: ThreeNS.Mesh;
  private readonly golpes: ThreeNS.Mesh[] = [];
  private readonly matGolpe: ThreeNS.MeshBasicMaterial;
  private readonly m4: ThreeNS.Matrix4;
  private readonly tmp: V3;
  private readonly etqs: EtiquetaH[] = [];

  private actualId: string | null = null;
  private plan: PlanEnsayo | null = null;
  private grupos: GrupoVivo[] = [];
  private fantasmas: FantasmaVivo[] = [];
  /** Posiciones vivas (x, y, z) de las cajas anilladas y luego de los vehículos de cada grupo. */
  private vivo = new Float32Array(0);
  private readonly indiceAnillado = new Map<string, number>();
  private nGolpes = 0;
  private reloj = 0;
  private quietos = true;
  private pendiente = false;
  private salida: { t: number } | null = null;
  private destruida = false;

  constructor(private readonly h: AnfitrionCapa) {
    const T = h.T;
    this.T = T;
    this.e = h.escena;
    this.kit = h.escena.kitEscena;
    this.etiquetas = h.escena.gestorEtiquetas;
    this.m4 = new T.Matrix4();
    this.tmp = new T.Vector3();
    const k = this.kit;
    this.cuerpos = this.instanciado(k.gRbox(0.86, 0.72, 0.86, 0.12), k.mtTenue('box', OPACIDAD_FANTASMA), MAX_FANTASMAS, true);
    this.cintas = this.instanciado(
      this.geo('capa|cinta', () => new T.BoxGeometry(0.2, 0.02, 0.88).translate(0, 0.37, 0)),
      k.mtTenue('box-tape', OPACIDAD_FANTASMA),
      MAX_FANTASMAS,
      true
    );
    this.flecha = new T.Mesh(this.geo('capa|flecha', () => new T.ConeGeometry(0.3, 0.7, 14).rotateX(-Math.PI / 2)), k.mtTenue('box', OPACIDAD_FANTASMA));
    this.flecha.visible = false;
    this.matGolpe = new T.MeshBasicMaterial({ visible: false });
  }

  // ------------------------------------------------------------------ ciclo

  /** Se engancha al cuadro y a los toques de la escena. */
  iniciar(): void {
    const raiz = this.e.raiz;
    raiz.add(this.cuerpos, this.cintas, this.flecha);
    this.quitarGanchos.push(this.e.alCuadro((_t, dt) => this.cuadro(dt)));
    this.quitarGanchos.push(this.e.alTocar((x, y) => this.tocar(x, y)));
  }

  /**
   * La propuesta que se ensaya ahora (null = ninguna: las copias y las líneas se van y las cajas
   * vuelven a su color). La misma propuesta (mismo id) no se vuelve a armar.
   */
  fijar(p: PropuestaEnEscena | null): void {
    if (this.destruida) return;
    const id = p ? p.id : null;
    if (id === this.actualId) return;
    this.actualId = id;
    if (!p) {
      this.retirar();
      return;
    }
    this.limpiar();
    const otros = (p.grupos ?? []).filter((g) => !g.transportadora && !!g.veh).map((g) => String(g.veh));
    const chaquetaDe = (g: GrupoEnEscena): string | null =>
      g.veh ? this.e.prepararVehiculo(g.veh, g.color, otros.filter((n) => n !== g.veh)) : null;
    const plan = armarEnsayo(p, chaquetaDe, ANCLAS);
    if (plan) this.montar(plan);
    this.e.marcarSucio();
  }

  destruir(): void {
    if (this.destruida) return;
    this.limpiar();
    this.destruida = true;
    this.quitarGanchos.forEach((q) => q());
    this.quitarGanchos.length = 0;
    const raiz = this.e.raiz;
    raiz.remove(this.cuerpos, this.cintas, this.flecha, ...this.golpes);
    this.paquetes.forEach((p) => {
      raiz.remove(p.finos, p.aros, p.puntos);
      p.finos.dispose();
      p.aros.dispose();
      p.puntos.dispose();
      p.mat.dispose();
      this.kit.vivos.delete(p.mat);
    });
    this.paquetes.clear();
    this.cuerpos.dispose();
    this.cintas.dispose();
    this.matGolpe.dispose();
    this.e.marcarSucio();
  }

  /** Posición viva (x, z) de una caja anillada (la usa la ruta del cobro); null si no se ve. */
  vivoDe(pedidoId: string): Punto2 | null {
    const i = this.indiceAnillado.get(pedidoId);
    if (i === undefined) return null;
    const x = this.vivo[i * 3];
    const z = this.vivo[i * 3 + 2];
    if (Number.isNaN(x) || Number.isNaN(z)) return null;
    return { x, z };
  }

  // ------------------------------------------------------------- montar

  private montar(plan: PlanEnsayo): void {
    const T = this.T;
    this.plan = plan;
    this.reloj = 0;
    this.e.atenuarCajas(plan.destacados);
    this.indiceAnillado.clear();
    plan.anillados.forEach((a, i) => this.indiceAnillado.set(a.pedidoId, i));
    this.vivo = new Float32Array((plan.anillados.length + plan.grupos.length) * 3).fill(Number.NaN);

    this.grupos = plan.grupos.map((g): GrupoVivo => {
      const casa = new T.Vector3();
      const hayCasa = g.pedidoCasa ? this.e.posCasa(g.pedidoCasa, casa) !== null : false;
      return { g, veh: new T.Vector3(), hayVeh: false, casa, hayCasa, puntos: new Float32Array(MAX_PUNTOS_RUTA * 2) };
    });
    this.fantasmas = plan.fantasmas.map((f): FantasmaVivo => {
      const desde = new T.Vector3();
      const hayDesde = this.e.posPedido(f.pedidoId, desde) !== null;
      return { f, desde, hayDesde, pos: new T.Vector3(f.destino.x, f.destino.y, f.destino.z), escala: 0, posEtq: new T.Vector3() };
    });

    // Etiquetas: la del montón ("Carlos · 4"), el número de cada copia de la fila y el "$" del cobro.
    // Las de montones vecinos van a dos alturas para que no se tapen (la del camión, siempre arriba:
    // queda junto al primer montón de mensajero).
    let k = 0;
    this.grupos.forEach((gv) => {
      const g = gv.g;
      if (!g.etiqueta || !g.centro) return;
      const arriba = g.transportadora ? 1 : k++ % 2;
      const pos = new T.Vector3(g.centro.x, g.alto + 0.9 + arriba * ALTURA_ALTERNA, g.centro.z);
      this.etqs.push(this.etiquetas.crear({ clase: 'eve-lbl--sug', tono: g.color, html: `<b>${esc(g.etiqueta)}</b>`, pos: () => pos }));
    });
    this.fantasmas.forEach((v) => {
      if (v.f.numero === null) return;
      const tono = plan.grupos[v.f.grupo]?.color ?? 'warn';
      this.etqs.push(this.etiquetas.crear({
        clase: 'eve-lbl--sugn',
        tono,
        html: `<b>${v.f.numero}</b>`,
        pos: () => {
          if (v.escala < 0.05) return null;
          v.posEtq.copy(v.pos);
          v.posEtq.y += (0.72 * v.escala) / 2 + 0.3;
          return v.posEtq;
        },
      }));
    });
    plan.anillados.forEach((a) => {
      if (!a.aro) return;
      const pos = new T.Vector3();
      this.etqs.push(this.etiquetas.crear({
        clase: 'eve-lbl--sug',
        tono: plan.grupos[a.grupo]?.color ?? 'warn',
        html: '<b>$</b>',
        pos: () => {
          if (!this.e.posCaja(a.pedidoId, pos)) return null;
          pos.y += 0.95;
          return pos;
        },
      }));
    });

    // Lo que se puede tocar: el montón de cada grupo y la fila de producción.
    this.nGolpes = 0;
    this.grupos.forEach(({ g }) => {
      if (g.centro && g.golpe) this.colocarGolpe(this.nGolpes++, g.centro, g.golpe.ancho, g.golpe.fondo, g.id);
    });

    this.quietos = this.fantasmas.length === 0;
    this.pendiente = true;
  }

  private colocarGolpe(i: number, c: Punto2, ancho: number, fondo: number, grupoId: string): void {
    let m = this.golpes[i];
    if (!m) {
      m = new this.T.Mesh(this.kit.gCaja(1, 1, 1), this.matGolpe);
      m.visible = false;
      this.golpes.push(m);
      this.e.raiz.add(m);
    }
    m.position.set(c.x, 0.6, c.z);
    m.scale.set(Math.max(0.8, ancho), 1.2, Math.max(0.8, fondo));
    m.userData['grupo'] = grupoId;
    m.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------- cuadro

  private cuadro(dt: number): boolean {
    if (this.destruida) return false;
    if (this.salida) return this.pasoSalida(dt);
    if (!this.plan) return false;
    this.reloj += dt;
    let cambio = this.pendiente;
    this.pendiente = false;
    if (!this.quietos) {
      this.moverFantasmas();
      cambio = true;
    }
    if (this.leerVivos() || cambio) {
      this.escribirTrazos();
      cambio = true;
    }
    return cambio;
  }

  private moverFantasmas(): void {
    const reducir = this.h.reducir();
    let todos = true;
    for (let i = 0; i < this.fantasmas.length; i++) {
      const v = this.fantasmas[i];
      const k = avanceFantasma(this.reloj, v.f.retraso, reducir);
      if (k < 1) todos = false;
      const d = v.f.destino;
      if (k >= 1) {
        v.pos.set(d.x, d.y, d.z);
        v.escala = v.f.escala;
      } else if (!v.hayDesde) {
        // Sin caja a la vista de donde salir: aparece creciendo en su lugar.
        v.pos.set(d.x, d.y, d.z);
        v.escala = v.f.escala * ease.out(k);
      } else if (k <= 0) {
        // Aún no sale: no se dibuja encima de la caja real.
        v.escala = 0;
      } else {
        // La caja real puede moverse (un evento en vivo): la copia sale de donde esté.
        if (this.e.posPedido(v.f.pedidoId, this.tmp)) v.desde.copy(this.tmp);
        const s = ease.sine(k);
        v.pos.set(
          v.desde.x + (d.x - v.desde.x) * s,
          v.desde.y + (d.y - v.desde.y) * s + Math.sin(Math.PI * k) * ARCO,
          v.desde.z + (d.z - v.desde.z) * s
        );
        v.escala = 1 + (v.f.escala - 1) * s;
      }
      this.ponerFantasma(i, v.pos, v.escala);
    }
    this.cerrar(this.cuerpos, this.fantasmas.length);
    this.cerrar(this.cintas, this.fantasmas.length);
    if (todos) this.quietos = true;
  }

  private ponerFantasma(i: number, p: V3, s: number): void {
    this.m4.makeScale(s, s, s).setPosition(p.x, p.y, p.z);
    this.cuerpos.setMatrixAt(i, this.m4);
    this.cintas.setMatrixAt(i, this.m4);
  }

  /** Lee dónde están ahora las cajas anilladas y los vehículos; true si algo se movió. */
  private leerVivos(): boolean {
    const plan = this.plan as PlanEnsayo;
    let cambio = false;
    let j = 0;
    for (const a of plan.anillados) {
      if (this.anotar(j, this.e.posCaja(a.pedidoId, this.tmp))) cambio = true;
      j += 3;
    }
    for (const gv of this.grupos) {
      const p = this.leerVeh(gv);
      gv.hayVeh = p !== null;
      if (this.anotar(j, p)) cambio = true;
      j += 3;
    }
    return cambio;
  }

  private leerVeh(gv: GrupoVivo): V3 | null {
    if (gv.g.ruta === 'camion') return this.e.posCamion(gv.veh);
    if (gv.g.ruta === 'moto' && gv.g.veh) return this.e.posVeh(gv.g.veh, gv.veh);
    return null;
  }

  private anotar(j: number, p: V3 | null): boolean {
    const a = this.vivo;
    const x = p ? p.x : Number.NaN;
    const y = p ? p.y : Number.NaN;
    const z = p ? p.z : Number.NaN;
    if (igual(a[j], x) && igual(a[j + 1], y) && igual(a[j + 2], z)) return false;
    a[j] = x;
    a[j + 1] = y;
    a[j + 2] = z;
    return true;
  }

  /** Reescribe anillos, aros, líneas y flecha con las posiciones vivas (solo cuando algo cambió). */
  private escribirTrazos(): void {
    const plan = this.plan as PlanEnsayo;
    this.paquetes.forEach((p) => { p.nF = 0; p.nA = 0; p.nP = 0; });

    // Anillo fino (o aro con "$" en el cobro) bajo cada caja real de la propuesta.
    plan.anillados.forEach((a, i) => {
      const x = this.vivo[i * 3];
      const z = this.vivo[i * 3 + 2];
      if (Number.isNaN(x)) return;
      const pq = this.paquete(plan.grupos[a.grupo].color);
      if (a.aro) this.instancia(pq.aros, pq.nA++, x, Y_ANILLO, z, RADIO_MONEDA);
      else this.instancia(pq.finos, pq.nF++, x, Y_ANILLO, z, 1);
    });

    this.flecha.visible = false;
    for (const gv of this.grupos) {
      const g = gv.g;
      const pq = this.paquete(g.color);
      if (g.centro && g.radio > 0) this.instancia(pq.aros, pq.nA++, g.centro.x, Y_ARO, g.centro.z, g.radio);
      if (gv.hayVeh) this.instancia(pq.aros, pq.nA++, gv.veh.x, Y_ARO, gv.veh.z, RADIO_MOTO);
      if (gv.hayCasa) this.instancia(pq.aros, pq.nA++, gv.casa.x, Y_ARO, gv.casa.z, RADIO_CASA);
      const ruta = RUTAS[g.ruta](this, gv);
      const n = puntosAlCamino(ruta, PASO_PUNTOS, MAX_PUNTOS_RUTA, gv.puntos);
      const y = g.ruta === 'flecha' ? Y_PUNTO_BANDA : Y_PUNTO;
      for (let i = 0; i < n; i++) this.instancia(pq.puntos, pq.nP++, gv.puntos[2 * i], y, gv.puntos[2 * i + 1], 1);
      if (g.ruta === 'flecha' && ruta.length) {
        const fin = ruta[ruta.length - 1];
        this.flecha.position.set(fin.x, Y_PUNTO_BANDA, fin.z);
        this.flecha.material = pq.mat;
        this.flecha.visible = true;
      }
    }
    this.paquetes.forEach((p) => {
      this.cerrar(p.finos, p.nF);
      this.cerrar(p.aros, p.nA);
      this.cerrar(p.puntos, p.nP);
    });
  }

  // ------------------------------------------------------------- toques

  private tocar(x: number, y: number): boolean {
    if (!this.plan || this.salida) return false;
    for (let i = 0; i < this.nGolpes; i++) {
      const m = this.golpes[i];
      if (this.e.golpea([m], x, y)) {
        this.h.alTocarGrupo(String(m.userData['grupo']));
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------- retirar

  /** Sin propuesta: las cajas vuelven a su color y las copias y líneas se van (sin animar con "reducir movimiento"). */
  private retirar(): void {
    const habia = this.plan !== null;
    this.e.atenuarCajas(null);
    this.quitarEtiquetas();
    this.nGolpes = 0;
    this.plan = null;
    if (!habia || this.h.reducir()) {
      this.limpiar();
      return;
    }
    this.salida = { t: 0 };
    this.e.marcarSucio();
  }

  private pasoSalida(dt: number): boolean {
    const s = this.salida as { t: number };
    s.t += dt;
    const k = Math.min(1, s.t / SALIDA_S);
    const f = 1 - ease.out(k);
    this.fantasmas.forEach((v, i) => this.ponerFantasma(i, v.pos, v.escala * f));
    this.cerrar(this.cuerpos, this.fantasmas.length);
    this.cerrar(this.cintas, this.fantasmas.length);
    this.paquetes.forEach((p) => { p.mat.opacity = OPACIDAD_TRAZO * f; });
    if (k >= 1) this.limpiar();
    return true;
  }

  /** Quita todo al instante y deja la capa lista para otra propuesta. */
  private limpiar(): void {
    this.salida = null;
    this.plan = null;
    this.grupos = [];
    this.fantasmas = [];
    this.indiceAnillado.clear();
    this.vivo = new Float32Array(0);
    this.quitarEtiquetas();
    this.nGolpes = 0;
    this.quietos = true;
    this.cerrar(this.cuerpos, 0);
    this.cerrar(this.cintas, 0);
    this.flecha.visible = false;
    this.paquetes.forEach((p) => {
      this.cerrar(p.finos, 0);
      this.cerrar(p.aros, 0);
      this.cerrar(p.puntos, 0);
      p.mat.opacity = OPACIDAD_TRAZO;
    });
    if (!this.destruida) this.e.atenuarCajas(null);
    this.e.marcarSucio();
  }

  private quitarEtiquetas(): void {
    this.etqs.forEach((e) => this.etiquetas.quitar(e));
    this.etqs.length = 0;
  }

  // ------------------------------------------------------------- ayudas

  /** Anillos, aros y puntos de un color: un material del kit por token y tres mallas instanciadas. */
  private paquete(token: ColorEscena): Paquete {
    let p = this.paquetes.get(token);
    if (!p) {
      const T = this.T;
      const mat = this.kit.basico(token, OPACIDAD_TRAZO);
      p = {
        mat,
        finos: this.instanciado(this.geo('capa|fino', () => new T.RingGeometry(0.56, 0.68, 28).rotateX(-Math.PI / 2)), mat, MAX_FANTASMAS, false),
        aros: this.instanciado(this.geo('capa|aro', () => new T.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2)), mat, CAP_AROS, false),
        puntos: this.instanciado(this.geo('capa|punto', () => new T.CircleGeometry(0.13, 10).rotateX(-Math.PI / 2)), mat, CAP_PUNTOS, false),
        nF: 0,
        nA: 0,
        nP: 0,
      };
      this.e.raiz.add(p.finos, p.aros, p.puntos);
      this.paquetes.set(token, p);
    }
    return p;
  }

  private instanciado(geo: ThreeNS.BufferGeometry, mat: ThreeNS.Material, cap: number, dinamico: boolean): ThreeNS.InstancedMesh {
    const m = new this.T.InstancedMesh(geo, mat, cap);
    if (dinamico) m.instanceMatrix.setUsage(this.T.DynamicDrawUsage);
    m.count = 0;
    m.visible = false;
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }

  private instancia(m: ThreeNS.InstancedMesh, i: number, x: number, y: number, z: number, s: number): void {
    if (i >= m.instanceMatrix.count) return;
    this.m4.makeScale(s, 1, s).setPosition(x, y, z);
    m.setMatrixAt(i, this.m4);
  }

  private cerrar(m: ThreeNS.InstancedMesh, n: number): void {
    const c = Math.min(n, m.instanceMatrix.count);
    m.count = c;
    m.visible = c > 0;
    m.instanceMatrix.needsUpdate = true;
  }

  /** Geometría compartida por clave (se libera con las de la escena). */
  private geo(clave: string, crear: () => ThreeNS.BufferGeometry): ThreeNS.BufferGeometry {
    let g = this.kit.geoCache.get(clave);
    if (!g) {
      g = crear();
      this.kit.geoCache.set(clave, g);
    }
    return g;
  }
}

function igual(a: number, b: number): boolean {
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b);
  return Math.abs(a - b) < 1e-3;
}
