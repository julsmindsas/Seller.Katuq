import type * as ThreeNS from 'three';
import { DEG, EscenaBase, VistaCamara } from '../../shared/escena-3d/escena-base';
import {
  ETAPAS_COLA, EtapaCola, FotoOperacion, MensajeroFlota, PedidoCola, ProductoCola,
} from './centro-operaciones.service';

// ==========================================================================
// Centro de operaciones 3D (D-354): bodega, muelles y salida en una sola escena.
//  - Bodega (izquierda), un edificio abierto al frente: una estantería por producto
//    de la cola viva en la bodega elegida, con cajas según su saldo; roja si está en
//    negativo, naranja si queda poco. Lo que se hace por pedido (sin inventario) va
//    como mesa de producción.
//  - Banda hacia el edificio de muelles: Producido → Empacado → Listo para despachar,
//    cada muelle una plataforma que sale de su puerta, con una caja en estiba por
//    pedido (rojo = sin unidades, cinta naranja = urgente).
//  - Patio de salida: una moto por mensajero de la empresa (Katuq Delivery = caja
//    morada; en línea = anillo verde; desconectado = gris), camiones para las
//    transportadoras externas y el patio de rezagados. Al frente, la calle.
// Solo presentación: lee la foto del backend y no escribe nada.
//
// Ids que responden al puntero: `p:<pedido>`, `s:<producto>`, `m:<etapa>`,
// `v:<mensajero>`, `t:<transportadora>` y `rez`. Anclas de etiquetas: `z:<zona>`,
// `t:<transportadora>`, `f:<pedido frenado>`, `n:<producto en negativo>`,
// `h` (lo que está bajo el puntero) y `sel` (lo elegido).
// ==========================================================================

export type NivelCentro = 'todo' | 'bodega' | 'muelles';

/** Lo que quedó dibujado y lo que no cupo (el panel lo cuenta completo). */
export interface ResultadoEscena {
  estantes: number;
  estantesOcultos: number;
  ocultosPorMuelle: Partial<Record<EtapaCola, number>>;
  camiones: string[];
  motos: number;
  motosOcultas: number;
}

const C = {
  fondo: 0xe7e2f7,
  lote: 0xf8f7fd,
  anden: 0xf2effb,
  zonaBodega: 0xf1edfc,
  muro: 0xf6f4fd,
  via: 0xd9d2f0,
  calle: 0xcfc6ee,
  linea: 0xffffff,
  acento: 0x5f3fe0,
  acento2: 0x7c5cff,
  lila: 0xd9cffb,
  lilaMedio: 0xa996ff,
  persiana: 0xc4b7f7,
  vidrio: 0xcfc6f6,
  tinta: 0x2b2550,
  oscuro: 0x3a3358,
  blanco: 0xffffff,
  carton: 0xe4bf8e,
  madera: 0xb98e63,
  error: 0xd64545,
  alerta: 0xd9820a,
  exito: 0x1e874b,
  info: 0x1e6fd9,
  apagado: 0xa7a3bd,
  patio: 0xe9e7f0,
  rezagado: 0xb9b4cc,
  montacargas: 0xffb547,
};

const ALTO_LOTE = 0.24;
const ALTO_MUELLE = 0.42; // plataforma de los muelles (altura de cargue)
const ALTO_MURO = 3.4;
const TOPE_ESTANTES = 24;
const COLS_ESTANTES = 6;
const TOPE_MUELLE = 60;
const TOPE_CAMIONES = 2;
const TOPE_MOTOS = 18;
const TOPE_ETIQUETAS = 6;

// Bodega
const BODEGA = { x0: -16.8, x1: -3.6, z0: -7.4, z1: 7.8 };
const BODEGA_X = (BODEGA.x0 + BODEGA.x1) / 2;
// Muelles: salen de las puertas del edificio (al fondo) hacia el frente
const MUELLE_X: Record<EtapaCola, number> = { ProducidoTotalmente: 1.0, Empacado: 5.4, ParaDespachar: 9.8 };
const MUELLE_Z0 = -6.3;
const MUELLE_Z1 = 6.4;
const MUELLE_LARGO = MUELLE_Z1 - MUELLE_Z0;
const MUELLE_ZC = (MUELLE_Z0 + MUELLE_Z1) / 2;
const NAVE = { x0: -1.4, x1: 12.2, z: -6.6 };
// Patio de salida (derecha): rezagados al fondo, camiones al medio, motos al frente
const SALIDA = { x0: 13.3, x1: 20.1 };
const SALIDA_X = (SALIDA.x0 + SALIDA.x1) / 2;
const REZ = { z0: -7.6, z1: -3.2 };
const CAMION_Z = [-1.7, 1.0];
const MOTO_Z = [3.6, 5.3, 7.0];
const CALLE_Z = 11.6;

const ENFOQUE: Record<NivelCentro, { x: number; z: number; zoom: number }> = {
  todo: { x: 1.6, z: 0.8, zoom: 1 },
  bodega: { x: BODEGA_X, z: 0.4, zoom: 1.7 },
  muelles: { x: 9.6, z: 0.8, zoom: 1.3 },
};

export class CentroOperacionesEscena extends EscenaBase<string> {
  protected readonly animaContinuo = true;
  protected readonly vista: VistaCamara = {
    az: 30 * DEG,
    pol: 52 * DEG,
    centro: { x: ENFOQUE.todo.x, y: 0, z: ENFOQUE.todo.z },
    mirarY: 0.9,
    limAz: [-20 * DEG, 75 * DEG],
    limPol: [36 * DEG, 64 * DEG],
    limZoom: [0.8, 2.8],
    // Cabe todo el lote con la calle (medido: ~46 de ancho y ~27 de alto en pantalla).
    // Angosto: se recorta al centro (banda y muelles); el enfoque lleva a cada zona.
    altoMundo: (util) => (util < 1.2 ? Math.max(20, 30 / Math.max(util, 0.6)) : Math.max(27.5, 46 / util)),
    bajada: 0.02,
    fondo: C.fondo,
  };

  private dinamico!: ThreeNS.Group;
  private readonly estaticos: ThreeNS.Object3D[] = [];
  private matAnillo!: ThreeNS.MeshBasicMaterial;
  private matAlarma!: ThreeNS.MeshBasicMaterial;
  private matEnLinea!: ThreeNS.MeshBasicMaterial;
  private readonly anillos = new Map<string, ThreeNS.Mesh>();
  private readonly grupos = new Map<string, ThreeNS.Group>();
  private readonly topes = new Map<string, ThreeNS.Vector3>();
  private readonly anclasFijas = new Map<string, ThreeNS.Vector3>();
  private productosDePedido = new Map<string, Set<string>>();
  private alarmas = 0;
  private bandaCajas: ThreeNS.Mesh[] = [];
  private montacargas!: ThreeNS.Group;
  private hayCola = false;
  private ultimoResalte = '';
  private centroObj = { x: ENFOQUE.todo.x, z: ENFOQUE.todo.z };

  /** Dibuja la foto. `bodega` es la bodega elegida para las estanterías (null = sin bodega). */
  ponerFoto(foto: FotoOperacion, bodega: string | null): ResultadoEscena {
    const res: ResultadoEscena = { estantes: 0, estantesOcultos: 0, ocultosPorMuelle: {}, camiones: [], motos: 0, motosOcultas: 0 };
    if (!this.scene) return res;
    this.dinamico.clear();
    this.anillos.clear();
    this.grupos.clear();
    this.topes.clear();
    this.anclasFijas.clear();
    this.productosDePedido = new Map();
    this.alarmas = 0;
    this.pickables.splice(0, this.pickables.length, ...this.estaticos);
    this.ultimoResalte = '';

    const vivos = (foto.pedidos || []).filter((p) => !p.rezagado);
    this.hayCola = vivos.length > 0;
    for (const p of vivos) this.productosDePedido.set(p.id, new Set(p.lineas.map((l) => l.productoId)));
    const mensajeros = new Set((foto.flota || []).map((m) => this.clave(m.nombre)));

    this.estanterias(foto, vivos, bodega, res);
    this.muelles(vivos, res);
    this.camiones(vivos, mensajeros, res);
    this.motos(foto.flota || [], res);
    this.patio(foto.resumen?.rezagados || 0);
    this.anclasZonas(res);
    this.aplicarResalte();
    this.sucio = true;
    return res;
  }

  /** Acerca la cámara a una zona (o vuelve a ver todo). */
  enfocar(nivel: NivelCentro): void {
    const e = ENFOQUE[nivel];
    this.centroObj = { x: e.x, z: e.z };
    this.zoomA(e.zoom);
    this.sucio = true;
  }

  // -------------------------------------------------------------- ganchos

  protected construir(): void {
    this.luces();
    this.suelo();
    this.matAnillo = new this.T.MeshBasicMaterial({ color: C.acento, transparent: true, opacity: 0.9, depthWrite: false });
    this.matAlarma = new this.T.MeshBasicMaterial({ color: C.error, transparent: true, opacity: 0.8, depthWrite: false });
    this.matEnLinea = new this.T.MeshBasicMaterial({ color: C.exito, transparent: true, opacity: 0.75, depthWrite: false });
    this.edificioBodega();
    this.banda();
    this.naveMuelles();
    this.carriles();
    this.patioSalida();
    this.dinamico = new this.T.Group();
    this.scene.add(this.dinamico);
  }

  protected cuadro(t: number, dt: number): boolean {
    let cambio = false;
    // Paneo suave hacia la zona enfocada.
    const c = this.vista.centro;
    const dx = this.centroObj.x - c.x;
    const dz = this.centroObj.z - c.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const k = Math.min(1, dt * 6);
      c.x += dx * k;
      c.z += dz * k;
      this.sucio = true;
      cambio = true;
    } else if (dx !== 0 || dz !== 0) {
      c.x = this.centroObj.x;
      c.z = this.centroObj.z;
    }
    if (this.alarmas) this.matAlarma.opacity = t ? 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4.2)) : 0.8;
    // Cajas que corren por la banda de la bodega a los muelles.
    this.bandaCajas.forEach((b, i) => {
      b.visible = this.hayCola;
      b.position.x = BODEGA.x1 - 0.1 + (((t * 0.55 + i / this.bandaCajas.length) % 1) * 3.6);
    });
    // El montacargas va y viene por el pasillo de la bodega.
    if (this.montacargas && t) {
      const v = Math.sin(t * 0.35);
      this.montacargas.position.z = 6.4 - (0.5 + 0.5 * v) * 1.6;
    }
    if (this.claveResalte() !== this.ultimoResalte) {
      this.aplicarResalte();
      cambio = true;
    }
    return cambio;
  }

  protected *anclas(): Iterable<[string, ThreeNS.Vector3]> {
    yield* this.anclasFijas;
    const h = this.hover && this.topes.get(this.hover);
    if (h) yield ['h', h];
    const s = this.resaltada && this.topes.get(this.resaltada);
    if (s) yield ['sel', s];
  }

  // ------------------------------------------------------------ escenario

  private luces(): void {
    const T = this.T;
    this.scene.add(new T.HemisphereLight(0xffffff, 0xd6cef5, 1.8));
    const sol = new T.DirectionalLight(0xffffff, 1.7);
    sol.position.set(-14, 30, 20);
    sol.target.position.set(1, 0, 0);
    this.scene.add(sol, sol.target);
    if (!this.opts.calidadBaja) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      const s = sol.shadow.camera as ThreeNS.OrthographicCamera;
      s.left = -30; s.right = 30; s.top = 22; s.bottom = -22; s.near = 1; s.far = 100;
      sol.shadow.bias = -0.0006;
      sol.shadow.normalBias = 0.02;
      sol.shadow.radius = 4;
    }
  }

  private suelo(): void {
    const T = this.T;
    const geoPiso = new T.PlaneGeometry(260, 260);
    geoPiso.rotateX(-Math.PI / 2);
    this.scene.add(new T.Mesh(geoPiso, new T.MeshBasicMaterial({ color: C.fondo })));
    if (!this.opts.calidadBaja) {
      const sombras = new T.Mesh(geoPiso, new T.ShadowMaterial({ color: 0x2b2160, opacity: 0.12 }));
      sombras.position.y = 0.01;
      sombras.receiveShadow = true;
      this.scene.add(sombras);
    }
    // Lote, andén y calle con sus rayas
    this.caja(this.scene, 38.6, ALTO_LOTE, 17.8, C.lote, 1.6, 0, 0.5, 0.14, false);
    this.caja(this.scene, 120, 0.16, 0.9, C.anden, 0, 0, 9.85, 0, false);
    this.caja(this.scene, 120, 0.05, 2.6, C.calle, 0, 0, CALLE_Z, 0, false);
    const n = 30;
    const rayas = new T.InstancedMesh(this.geoCaja(1.4, 0.02, 0.14), this.mat(C.linea), n);
    const m = new T.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(-48 + i * 3.4, 0.06, CALLE_Z);
      rayas.setMatrixAt(i, m);
    }
    this.scene.add(rayas);
    // Entrada del patio de salida a la calle
    this.caja(this.scene, 5.2, 0.03, 1.0, C.via, SALIDA_X, ALTO_LOTE - 0.01, 8.9, 0, false);
  }

  /** Bodega: piso, dos muros (fondo e izquierda), columnas y cerchas; abierta al frente para ver adentro. */
  private edificioBodega(): void {
    const { x0, x1, z0, z1 } = BODEGA;
    const w = x1 - x0, d = z1 - z0;
    const y = ALTO_LOTE;
    this.caja(this.scene, w, 0.03, d, C.zonaBodega, BODEGA_X, y, (z0 + z1) / 2, 0.08, false);
    // Muros con remate morado
    this.caja(this.scene, w + 0.3, ALTO_MURO, 0.3, C.muro, BODEGA_X, y, z0 - 0.15, 0.04);
    this.caja(this.scene, 0.3, ALTO_MURO, d, C.muro, x0 - 0.15, y, (z0 + z1) / 2, 0.04);
    this.caja(this.scene, w + 0.42, 0.22, 0.42, C.acento, BODEGA_X, y + ALTO_MURO, z0 - 0.15, 0.04, false);
    this.caja(this.scene, 0.42, 0.22, d, C.acento, x0 - 0.15, y + ALTO_MURO, (z0 + z1) / 2, 0.04, false);
    // Franja interior de color en el muro del fondo
    this.caja(this.scene, w - 0.4, 0.5, 0.04, C.lila, BODEGA_X, y + 2.2, z0 + 0.02, 0, false);
    // Muro derecho solo atrás (adelante pasa la banda)
    this.caja(this.scene, 0.3, ALTO_MURO, 4.6, C.muro, x1 + 0.15, y, z0 + 2.3, 0.04);
    this.caja(this.scene, 0.42, 0.22, 4.6, C.acento, x1 + 0.15, y + ALTO_MURO, z0 + 2.3, 0.04, false);
    // Columnas al frente y viga, para que se lea como edificio
    for (const cx of [x0 - 0.15, x1 + 0.15]) this.caja(this.scene, 0.34, ALTO_MURO, 0.34, C.oscuro, cx, y, z1, 0.03);
    this.caja(this.scene, w + 0.5, 0.2, 0.3, C.oscuro, BODEGA_X, y + ALTO_MURO - 0.2, z1, 0, false);
    // Cerchas del techo (abiertas)
    const n = 6;
    const cer = new this.T.InstancedMesh(this.geoCaja(w + 0.3, 0.12, 0.14), this.mat(C.acento2), n);
    const m = new this.T.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(BODEGA_X, y + ALTO_MURO - 0.06, z0 + 0.3 + (i * (d - 0.6)) / (n - 1));
      cer.setMatrixAt(i, m);
    }
    cer.castShadow = true;
    this.scene.add(cer);
    this.caja(this.scene, 0.14, 0.12, d, C.acento2, BODEGA_X, y + ALTO_MURO - 0.18, (z0 + z1) / 2, 0, false);
    this.montacargas = this.crearMontacargas();
  }

  private crearMontacargas(): ThreeNS.Group {
    const g = new this.T.Group();
    this.caja(g, 0.8, 0.55, 1.1, C.montacargas, 0, 0.12, 0, 0.08);
    this.caja(g, 0.7, 0.55, 0.5, C.oscuro, 0, 0.67, -0.25, 0.04);
    this.caja(g, 0.06, 1.6, 0.06, C.oscuro, -0.28, 0.1, 0.6, 0);
    this.caja(g, 0.06, 1.6, 0.06, C.oscuro, 0.28, 0.1, 0.6, 0);
    for (const fx of [-0.2, 0.2]) this.caja(g, 0.08, 0.04, 0.7, C.tinta, fx, 0.14, 0.95, 0, false);
    this.caja(g, 0.62, 0.42, 0.62, C.carton, 0, 0.2, 0.95, 0.04);
    for (const [wx, wz] of [[-0.42, 0.35], [0.42, 0.35], [-0.42, -0.35], [0.42, -0.35]]) {
      const w = this.cilindro(g, 0.15, 0.12, C.tinta, wx, 0.15, wz, 12);
      w.rotation.z = Math.PI / 2;
    }
    g.position.set(BODEGA.x1 - 1.6, ALTO_LOTE, 6.4);
    g.rotation.y = Math.PI;
    this.scene.add(g);
    return g;
  }

  private banda(): void {
    const y = ALTO_LOTE;
    const x0 = BODEGA.x1 - 0.2, x1 = NAVE.x0 + 0.6;
    const w = x1 - x0, cx = (x0 + x1) / 2, z = 0.4;
    for (const px of [x0 + 0.3, cx, x1 - 0.3]) this.caja(this.scene, 0.12, 0.5, 0.7, C.oscuro, px, y, z, 0);
    this.caja(this.scene, w, 0.12, 1.0, C.oscuro, cx, y + 0.5, z, 0.03);
    this.caja(this.scene, w, 0.04, 0.84, C.via, cx, y + 0.62, z, 0, false);
    for (let i = 0; i < 8; i++) this.caja(this.scene, 0.06, 0.02, 0.86, C.lilaMedio, x0 + 0.2 + (i * (w - 0.4)) / 7, y + 0.66, z, 0, false);
    for (let i = 0; i < 3; i++) {
      const b = this.caja(this.scene, 0.42, 0.34, 0.42, C.carton, x0, y + 0.66, z, 0.04);
      b.visible = false;
      this.bandaCajas.push(b);
    }
  }

  /** Edificio de muelles: muro con una puerta enrollable por etapa y alero. */
  private naveMuelles(): void {
    const y = ALTO_LOTE;
    const { x0, x1, z } = NAVE;
    const w = x1 - x0, cx = (x0 + x1) / 2;
    this.caja(this.scene, w, 3.8, 1.4, C.acento, cx, y, z - 0.7, 0.16);
    this.caja(this.scene, w + 0.4, 0.3, 1.8, C.acento2, cx, y + 3.8, z - 0.7, 0.08);
    for (const etapa of ETAPAS_COLA) {
      const dx = MUELLE_X[etapa];
      this.caja(this.scene, 3.4, 3.05, 0.12, C.blanco, dx, y, z + 0.03, 0.05, false);
      this.caja(this.scene, 2.9, 2.75, 0.14, C.lila, dx, y, z + 0.05, 0, false);
      for (let k = 0; k < 4; k++) this.caja(this.scene, 2.9, 0.05, 0.16, C.persiana, dx, y + 0.6 + k * 0.55, z + 0.05, 0, false);
    }
    this.caja(this.scene, w - 0.4, 0.14, 1.3, C.blanco, cx, y + 3.15, z + 0.62, 0.05);
  }

  private carriles(): void {
    for (const etapa of ETAPAS_COLA) {
      const x = MUELLE_X[etapa];
      const g = this.grupoSeleccionable(`m:${etapa}`);
      this.estaticos.push(g);
      this.caja(g, 3.9, ALTO_MUELLE, MUELLE_LARGO, C.via, x, ALTO_LOTE, MUELLE_ZC, 0.08);
      for (const dx of [-1.95, 1.95]) this.caja(g, 0.08, 0.03, MUELLE_LARGO, C.linea, x + dx, ALTO_LOTE + ALTO_MUELLE, MUELLE_ZC, 0, false);
      // Rampa al frente
      const r = this.caja(g, 3.9, 0.06, 1.1, C.via, x, ALTO_LOTE + 0.18, MUELLE_Z1 + 0.5, 0, false);
      r.rotation.x = 0.36;
    }
  }

  private patioSalida(): void {
    const y = ALTO_LOTE;
    const w = SALIDA.x1 - SALIDA.x0;
    // Rezagados: patio cercado al fondo
    const d = REZ.z1 - REZ.z0, cz = (REZ.z0 + REZ.z1) / 2;
    this.caja(this.scene, w, 0.04, d, C.patio, SALIDA_X, y, cz, 0.08, false);
    const n = 9;
    for (let i = 0; i < n; i++) this.caja(this.scene, 0.08, 0.6, 0.08, C.lilaMedio, SALIDA.x0 + (i * w) / (n - 1), y, REZ.z1, 0);
    this.caja(this.scene, w, 0.06, 0.06, C.lilaMedio, SALIDA_X, y + 0.55, REZ.z1, 0, false);
    for (const sx of [SALIDA.x0, SALIDA.x1]) this.caja(this.scene, 0.06, 0.06, d, C.lilaMedio, sx, y + 0.55, cz, 0, false);
    // Bahías de camiones y de motos
    this.caja(this.scene, w, 0.03, 5.6, C.via, SALIDA_X, y, -0.3, 0.08, false);
    this.caja(this.scene, w - 1.0, 0.02, 0.08, C.linea, SALIDA_X, y + 0.03, -0.3, 0, false);
    this.caja(this.scene, w, 0.03, 5.6, C.zonaBodega, SALIDA_X, y, 5.6, 0.08, false);
    for (let i = 0; i <= 6; i++) this.caja(this.scene, 0.06, 0.02, 4.8, C.linea, SALIDA.x0 + 0.4 + i * 1.0, y + 0.03, 5.4, 0, false);
  }

  // ------------------------------------------------------------- contenido

  private estanterias(foto: FotoOperacion, vivos: PedidoCola[], bodega: string | null, res: ResultadoEscena): void {
    const enBodega = new Set<string>();
    for (const p of vivos) if (p.bodega === bodega) p.lineas.forEach((l) => enBodega.add(l.productoId));
    const saldo = (pr: ProductoCola) => (bodega ? (pr.stockPorBodega?.[bodega] ?? 0) : (pr.stockTotal ?? 0));
    // Primero lo que está en negativo, luego lo que lleva inventario y al final lo que se hace por pedido.
    const orden = (pr: ProductoCola) => (!pr.inventariable ? 2 : saldo(pr) < 0 ? 0 : 1);
    const lista = (foto.productos || [])
      .filter((pr) => enBodega.has(pr.id))
      .sort((a, b) => orden(a) - orden(b) || b.pedidos - a.pedidos);
    const visibles = lista.slice(0, TOPE_ESTANTES);
    res.estantes = visibles.length;
    res.estantesOcultos = lista.length - visibles.length;
    let negativos = 0;
    // Filas desde el fondo; el frente queda como pasillo del montacargas.
    visibles.forEach((pr, i) => {
      const x = BODEGA_X - 5 + (i % COLS_ESTANTES) * 2.0;
      const z = BODEGA.z0 + 1.6 + Math.floor(i / COLS_ESTANTES) * 2.9;
      if (!pr.inventariable) { this.mesa(pr.id, x, z); return; }
      const s = saldo(pr);
      this.estante(pr.id, s, x, z);
      if (s < 0 && negativos++ < TOPE_ETIQUETAS) this.anclasFijas.set(`n:${pr.id}`, new this.T.Vector3(x, ALTO_LOTE + 2.55, z));
    });
  }

  private estante(productoId: string, stock: number, x: number, z: number): void {
    const id = `s:${productoId}`;
    const g = this.grupoSeleccionable(id, this.dinamico);
    g.position.set(x, ALTO_LOTE, z);
    g.userData['y0'] = ALTO_LOTE;
    const color = stock < 0 ? C.error : stock <= 2 ? C.alerta : C.acento2;
    for (const dx of [-0.82, 0.82]) for (const dz of [-0.36, 0.36]) this.caja(g, 0.08, 2.3, 0.08, C.oscuro, dx, 0, dz, 0);
    for (const h of [0.1, 0.86, 1.62]) this.caja(g, 1.74, 0.08, 0.8, color, 0, h, 0, 0, false);
    // Cajas según el saldo: 1, 3, 7, 15, 31, 63+ unidades → 1..6 cajas.
    const n = stock <= 0 ? 0 : Math.min(6, Math.ceil(Math.log2(stock + 1)));
    for (let i = 0; i < n; i++) {
      this.caja(g, 0.7, 0.52, 0.6, C.carton, i % 2 ? 0.4 : -0.4, 0.18 + Math.floor(i / 2) * 0.76, 0, 0.04);
    }
    if (stock < 0) this.anillo(g, 'alarma', 1.25, 0.03);
    this.anillo(g, id, 1.25, 0.04);
    this.grupos.set(id, g);
    this.topes.set(id, new this.T.Vector3(x, ALTO_LOTE + 2.4, z));
  }

  /** Producto sin control de inventario: mesa de producción con la pieza encima. */
  private mesa(productoId: string, x: number, z: number): void {
    const id = `s:${productoId}`;
    const g = this.grupoSeleccionable(id, this.dinamico);
    g.position.set(x, ALTO_LOTE, z);
    g.userData['y0'] = ALTO_LOTE;
    for (const dx of [-0.7, 0.7]) for (const dz of [-0.32, 0.32]) this.caja(g, 0.08, 0.78, 0.08, C.oscuro, dx, 0, dz, 0);
    this.caja(g, 1.6, 0.08, 0.8, C.lila, 0, 0.78, 0, 0.03, false);
    this.caja(g, 0.62, 0.46, 0.5, C.lilaMedio, -0.25, 0.86, 0, 0.06);
    this.caja(g, 0.36, 0.3, 0.32, C.carton, 0.42, 0.86, 0.05, 0.04);
    this.anillo(g, id, 1.15, 0.04);
    this.grupos.set(id, g);
    this.topes.set(id, new this.T.Vector3(x, ALTO_LOTE + 1.6, z));
  }

  private muelles(vivos: PedidoCola[], res: ResultadoEscena): void {
    let etiquetasFrenado = 0;
    const piso = ALTO_LOTE + ALTO_MUELLE;
    for (const etapa of ETAPAS_COLA) {
      const lista = vivos
        .filter((p) => p.etapa === etapa && !p.transportador)
        .sort((a, b) => Number(b.frenado) - Number(a.frenado) || this.peso(b) - this.peso(a) || (a.entrega || '9').localeCompare(b.entrega || '9'));
      const visibles = lista.slice(0, TOPE_MUELLE);
      if (lista.length > visibles.length) res.ocultosPorMuelle[etapa] = lista.length - visibles.length;
      const x0 = MUELLE_X[etapa];
      visibles.forEach((p, i) => {
        const capa = Math.floor(i / 30);
        const k = i % 30;
        const x = x0 + ((k % 3) - 1) * 1.15;
        const z = MUELLE_Z1 - 0.8 - Math.floor(k / 3) * 1.2;
        const y = piso + 0.12 + capa * 0.66;
        this.cajaPedido(p, x, y, z, capa === 0);
        if (p.frenado && etiquetasFrenado++ < TOPE_ETIQUETAS) this.anclasFijas.set(`f:${p.id}`, new this.T.Vector3(x, y + 0.75, z));
      });
    }
  }

  /** Urgentes primero: vencido, hoy, próximos y sin fecha. */
  private peso(p: PedidoCola): number {
    return p.urgencia === 'vencido' ? 3 : p.urgencia === 'hoy' ? 2 : p.urgencia === 'proximo' ? 1 : 0;
  }

  private cajaPedido(p: PedidoCola, x: number, y: number, z: number, aPiso: boolean): void {
    const id = `p:${p.id}`;
    // La estiba no sube con la caja al resaltar: va aparte.
    if (aPiso) this.caja(this.dinamico, 0.98, 0.12, 0.98, C.madera, x, y - 0.12, z, 0.02);
    const g = this.grupoSeleccionable(id, this.dinamico);
    g.position.set(x, y, z);
    g.userData['y0'] = y;
    const urgente = p.urgencia === 'hoy' || p.urgencia === 'vencido';
    this.caja(g, 0.86, 0.6, 0.86, p.frenado ? C.error : C.carton, 0, 0, 0, 0.05);
    this.caja(g, 0.88, 0.035, 0.2, p.frenado ? C.blanco : urgente ? C.alerta : C.acento, 0, 0.6, 0, 0, false);
    if (p.frenado && aPiso) this.anillo(g, 'alarma', 0.62, -0.1);
    this.anillo(g, id, 0.62, -0.1);
    this.grupos.set(id, g);
    this.topes.set(id, new this.T.Vector3(x, y + 0.7, z));
  }

  /** Camiones para las transportadoras externas (los mensajeros van en moto). */
  private camiones(vivos: PedidoCola[], mensajeros: Set<string>, res: ResultadoEscena): void {
    const conteo = new Map<string, number>();
    for (const p of vivos) {
      if (p.transportador && !mensajeros.has(this.clave(p.transportador))) conteo.set(p.transportador, (conteo.get(p.transportador) || 0) + 1);
    }
    const nombres = [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
    res.camiones = nombres.slice(0, TOPE_CAMIONES);
    const lugares = res.camiones.length ? res.camiones : [null];
    lugares.forEach((nombre, i) => {
      const z = CAMION_Z[i];
      const padre = nombre ? this.grupoSeleccionable(`t:${nombre}`, this.dinamico) : this.dinamico;
      const c = this.camion(padre, nombre ? C.acento : C.lilaMedio);
      c.position.set(SALIDA_X - 0.2, ALTO_LOTE, z);
      if (nombre) {
        const id = `t:${nombre}`;
        this.grupos.set(id, padre as ThreeNS.Group);
        const ancla = new this.T.Vector3(SALIDA_X, ALTO_LOTE + 2.0, z);
        this.topes.set(id, ancla);
        this.anclasFijas.set(id, ancla);
        this.anillo(c, id, 2.2, 0.04);
      }
    });
  }

  private camion(padre: ThreeNS.Object3D, color: number): ThreeNS.Group {
    const g = new this.T.Group();
    const k = new this.T.Group();
    k.rotation.y = Math.PI / 2; // mira hacia la salida (+x)
    k.scale.setScalar(0.66);
    g.add(k);
    this.caja(k, 1.8, 2.1, 3.4, C.blanco, 0, 0.42, -0.9, 0.12);
    this.caja(k, 1.84, 0.22, 3.42, color, 0, 0.9, -0.9, 0, false);
    this.caja(k, 1.7, 1.55, 1.35, color, 0, 0.42, 1.55, 0.18);
    this.caja(k, 1.5, 0.6, 0.06, C.vidrio, 0, 1.22, 2.24, 0, false);
    this.caja(k, 1.9, 0.18, 4.9, C.tinta, 0, 0.32, -0.15, 0, false);
    for (const [wx, wz] of [[-0.9, 1.5], [0.9, 1.5], [-0.9, -1.5], [0.9, -1.5], [-0.9, -2.2], [0.9, -2.2]]) {
      const w = this.cilindro(k, 0.36, 0.3, C.tinta, wx, 0.36, wz, 14);
      w.rotation.z = Math.PI / 2;
    }
    padre.add(g);
    return g;
  }

  /** Una moto por mensajero: los que están en línea primero, con anillo verde. */
  private motos(flota: MensajeroFlota[], res: ResultadoEscena): void {
    const visibles = flota.slice(0, TOPE_MOTOS);
    res.motos = visibles.length;
    res.motosOcultas = flota.length - visibles.length;
    visibles.forEach((m, i) => {
      const x = SALIDA.x0 + 0.9 + (i % 6) * 1.0;
      const z = MOTO_Z[Math.floor(i / 6)];
      this.moto(m, x, z);
    });
  }

  private moto(m: MensajeroFlota, x: number, z: number): void {
    const id = `v:${m.id}`;
    const g = this.grupoSeleccionable(id, this.dinamico);
    g.position.set(x, ALTO_LOTE, z);
    g.userData['y0'] = ALTO_LOTE;
    const cuerpo = !m.enLinea ? C.apagado : m.guia === 'katuq' ? C.acento : C.acento2;
    const baul = !m.enLinea ? C.apagado : m.guia === 'katuq' ? C.acento : m.guia === 'enviame' ? C.info : C.lilaMedio;
    // Mira hacia la calle (+z)
    for (const wz of [0.36, -0.36]) {
      const w = this.cilindro(g, 0.17, 0.08, C.tinta, 0, 0.17, wz, 14);
      w.rotation.z = Math.PI / 2;
    }
    this.caja(g, 0.24, 0.2, 0.6, cuerpo, 0, 0.2, 0.02, 0.06);
    this.caja(g, 0.22, 0.06, 0.32, C.oscuro, 0, 0.42, -0.08, 0.02);
    this.caja(g, 0.05, 0.4, 0.05, C.oscuro, 0, 0.2, 0.3, 0);
    this.caja(g, 0.44, 0.04, 0.05, C.oscuro, 0, 0.6, 0.3, 0);
    // Caja de reparto (morada = Katuq Delivery); con un paquete encima si tiene pedidos asignados
    this.caja(g, 0.4, 0.34, 0.36, baul, 0, 0.46, -0.34, 0.05);
    if (m.guia === 'katuq') this.caja(g, 0.41, 0.06, 0.37, C.blanco, 0, 0.66, -0.34, 0, false);
    if (m.pedidos > 0) this.caja(g, 0.28, 0.2, 0.26, C.carton, 0, 0.8, -0.34, 0.03);
    if (m.enLinea) this.anilloEnLinea(g);
    this.anillo(g, id, 0.6, 0.03);
    this.grupos.set(id, g);
    this.topes.set(id, new this.T.Vector3(x, ALTO_LOTE + 1.15, z));
  }

  private patio(rezagados: number): void {
    const z = (REZ.z0 + REZ.z1) / 2;
    this.anclasFijas.set('z:rez', new this.T.Vector3(SALIDA_X, ALTO_LOTE + 1.9, z));
    if (!rezagados) return;
    const g = this.grupoSeleccionable('rez', this.dinamico);
    // Una pila que crece con los rezagados (hasta 36 cajas: 6 × 3 × 2).
    const n = Math.min(36, Math.max(1, Math.ceil(Math.sqrt(rezagados) * 2)));
    for (let i = 0; i < n; i++) {
      const capa = Math.floor(i / 18);
      const k = i % 18;
      this.caja(g, 0.8, 0.55, 0.8, C.rezagado, SALIDA.x0 + 0.9 + (k % 6) * 1.0, ALTO_LOTE + 0.04 + capa * 0.58, z - 1.1 + Math.floor(k / 6) * 1.1, 0.05);
    }
    this.anillo(g, 'rez', 3.0, 0.06, SALIDA_X, z);
    this.grupos.set('rez', g);
    this.topes.set('rez', new this.T.Vector3(SALIDA_X, ALTO_LOTE + 1.9, z));
  }

  private anclasZonas(res: ResultadoEscena): void {
    this.anclasFijas.set('z:bodega', new this.T.Vector3(BODEGA_X, ALTO_LOTE + 0.1, BODEGA.z1 + 0.4));
    for (const etapa of ETAPAS_COLA) {
      // Sobre el alero de su puerta: el frente de la plataforma es de las cajas.
      this.anclasFijas.set(`z:${etapa}`, new this.T.Vector3(MUELLE_X[etapa], ALTO_LOTE + 3.35, NAVE.z + 0.7));
      this.topes.set(`m:${etapa}`, new this.T.Vector3(MUELLE_X[etapa], ALTO_LOTE + ALTO_MUELLE + 0.3, MUELLE_Z1 - 0.4));
    }
    if (res.motos) this.anclasFijas.set('z:mensajeros', new this.T.Vector3(SALIDA_X, ALTO_LOTE + 1.2, MOTO_Z[MOTO_Z.length - 1] + 1.0));
    if (!res.camiones.length) this.anclasFijas.set('z:salida', new this.T.Vector3(SALIDA_X, ALTO_LOTE + 2.0, CAMION_Z[0]));
  }

  private clave(v: string): string {
    return (v || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // -------------------------------------------------------------- resalte

  /**
   * Anillo plano bajo un objeto. `clave` = 'alarma' (rojo que titila) o el id del
   * objeto (anillo de selección, oculto hasta que se resalta).
   */
  private anillo(padre: ThreeNS.Object3D, clave: string, radio: number, y: number, x = 0, z = 0): void {
    const alarma = clave === 'alarma';
    const m = new this.T.Mesh(this.geoAnillo(radio), alarma ? this.matAlarma : this.matAnillo);
    m.position.set(x, y, z);
    m.renderOrder = 2;
    padre.add(m);
    if (alarma) this.alarmas++;
    else { m.visible = false; this.anillos.set(clave, m); }
  }

  private anilloEnLinea(padre: ThreeNS.Object3D): void {
    const m = new this.T.Mesh(this.geoAnillo(0.48), this.matEnLinea);
    m.position.set(0, 0.02, 0);
    m.renderOrder = 1;
    padre.add(m);
  }

  private geoAnillo(radio: number): ThreeNS.BufferGeometry {
    const k = `r|${radio}`;
    let geo = this.geoCache.get(k);
    if (!geo) {
      geo = new this.T.RingGeometry(radio * 0.7, radio, 44);
      geo.rotateX(-Math.PI / 2);
      this.geoCache.set(k, geo);
    }
    return geo;
  }

  private claveResalte(): string {
    return `${this.resaltada || ''}|${this.hover || ''}`;
  }

  /**
   * Resalta lo elegido y lo que está bajo el puntero. Un producto elegido ilumina
   * los pedidos que lo llevan; un pedido elegido, las estanterías de sus productos.
   */
  private aplicarResalte(): void {
    this.ultimoResalte = this.claveResalte();
    const sel = this.resaltada;
    const activos = new Set<string>();
    if (sel) activos.add(sel);
    if (this.hover) activos.add(this.hover);
    if (sel?.startsWith('s:')) {
      const pid = sel.slice(2);
      for (const [pedido, productos] of this.productosDePedido) if (productos.has(pid)) activos.add(`p:${pedido}`);
    } else if (sel?.startsWith('p:')) {
      this.productosDePedido.get(sel.slice(2))?.forEach((pid) => activos.add(`s:${pid}`));
    }
    for (const [id, anillo] of this.anillos) anillo.visible = activos.has(id);
    for (const [id, g] of this.grupos) {
      const y0 = g.userData['y0'];
      if (typeof y0 === 'number') g.position.y = y0 + (activos.has(id) ? 0.45 : 0);
    }
    this.sucio = true;
  }
}
