import type * as ThreeNS from 'three';
import { DEG, EscenaBase, VistaCamara } from '../../shared/escena-3d/escena-base';
import { ETAPAS_COLA, EtapaCola, FotoOperacion, PedidoCola, ProductoCola } from './centro-operaciones.service';

// ==========================================================================
// Centro de operaciones 3D (D-354): bodega y muelles en una sola escena.
//  - Bodega (izquierda): una estantería por producto de la cola viva en la bodega
//    elegida, con cajas según su saldo; roja si está en negativo, naranja si queda
//    poco. Los productos sin control de inventario (se hacen por pedido) van como
//    mesas de producción, sin conteo.
//  - Banda hacia los muelles: Producido → Empacado → Listo para despachar, una caja
//    por pedido (rojo = frenado por falta de unidades, cinta naranja = urgente).
//  - Camiones por transportador y el patio de rezagados (entrega vencida hace días).
// Solo presentación: lee la foto del backend y no escribe nada.
//
// Ids que responden al puntero: `p:<pedido>`, `s:<producto>`, `m:<etapa>`,
// `t:<transportador>` y `rez`. Anclas de etiquetas: `z:<zona>`, `t:<transportador>`,
// `f:<pedido frenado>`, `n:<producto en negativo>`, `h` (lo que está bajo el puntero)
// y `sel` (lo elegido).
// ==========================================================================

export type NivelCentro = 'todo' | 'bodega' | 'muelles';

/** Lo que quedó dibujado y lo que no cupo (el panel lo cuenta completo). */
export interface ResultadoEscena {
  estantes: number;
  estantesOcultos: number;
  ocultosPorMuelle: Partial<Record<EtapaCola, number>>;
  camiones: string[];
}

const C = {
  fondo: 0xe7e2f7,
  lote: 0xf8f7fd,
  zonaBodega: 0xf1edfc,
  via: 0xd9d2f0,
  linea: 0xffffff,
  acento: 0x5f3fe0,
  acento2: 0x7c5cff,
  lila: 0xd9cffb,
  lilaMedio: 0xa996ff,
  vidrio: 0xcfc6f6,
  tinta: 0x2b2550,
  oscuro: 0x3a3358,
  blanco: 0xffffff,
  carton: 0xe4bf8e,
  error: 0xd64545,
  alerta: 0xd9820a,
  patio: 0xe9e7f0,
  rezagado: 0xb9b4cc,
};

const ALTO_LOTE = 0.24;
const TOPE_ESTANTES = 24;
const COLS_ESTANTES = 6;
const TOPE_MUELLE = 60;
const TOPE_CAMIONES = 3;
const TOPE_ETIQUETAS = 6;
const MUELLE_X: Record<EtapaCola, number> = { ProducidoTotalmente: 1.0, Empacado: 5.4, ParaDespachar: 9.8 };
const MUELLE_LARGO = 13;
const BODEGA_X = -10;
const PATIO = { x: 16.4, z: -4.6, w: 6.4, d: 5.2 };
const ENFOQUE: Record<NivelCentro, { x: number; zoom: number }> = {
  todo: { x: 1.4, zoom: 1 },
  bodega: { x: BODEGA_X, zoom: 1.75 },
  muelles: { x: 8, zoom: 1.45 },
};

export class CentroOperacionesEscena extends EscenaBase<string> {
  protected readonly animaContinuo = true;
  protected readonly vista: VistaCamara = {
    az: 9 * DEG,
    pol: 55 * DEG,
    centro: { x: 1.4, y: 0, z: 0.4 },
    mirarY: 0.6,
    limAz: [-35 * DEG, 65 * DEG],
    limPol: [35 * DEG, 66 * DEG],
    limZoom: [0.8, 2.8],
    // Angosto: se recorta al centro (banda y primeros muelles); el enfoque lleva a cada zona.
    altoMundo: (util) => Math.max(14, (util < 1.2 ? 25 : 41) / Math.max(util, 0.6)),
    bajada: 0.04,
    fondo: C.fondo,
  };

  private dinamico!: ThreeNS.Group;
  private readonly estaticos: ThreeNS.Object3D[] = [];
  private matAnillo!: ThreeNS.MeshBasicMaterial;
  private matAlarma!: ThreeNS.MeshBasicMaterial;
  private readonly anillos = new Map<string, ThreeNS.Mesh>();
  private readonly grupos = new Map<string, ThreeNS.Group>();
  private readonly topes = new Map<string, ThreeNS.Vector3>();
  private readonly anclasFijas = new Map<string, ThreeNS.Vector3>();
  private productosDePedido = new Map<string, Set<string>>();
  private alarmas = 0;
  private bandaCajas: ThreeNS.Mesh[] = [];
  private hayCola = false;
  private ultimoResalte = '';
  private centroObj = ENFOQUE.todo.x;

  /** Dibuja la foto. `bodega` es la bodega elegida para las estanterías (null = sin bodega). */
  ponerFoto(foto: FotoOperacion, bodega: string | null): ResultadoEscena {
    const res: ResultadoEscena = { estantes: 0, estantesOcultos: 0, ocultosPorMuelle: {}, camiones: [] };
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

    this.estanterias(foto, vivos, bodega, res);
    this.muelles(vivos, res);
    this.camiones(vivos, res);
    this.patio(foto.resumen?.rezagados || 0);
    this.anclasZonas();
    this.aplicarResalte();
    this.sucio = true;
    return res;
  }

  /** Acerca la cámara a una zona (o vuelve a ver todo). */
  enfocar(nivel: NivelCentro): void {
    const e = ENFOQUE[nivel];
    this.centroObj = e.x;
    this.zoomA(e.zoom);
    this.sucio = true;
  }

  // -------------------------------------------------------------- ganchos

  protected construir(): void {
    this.luces();
    this.suelo();
    this.matAnillo = new this.T.MeshBasicMaterial({ color: C.acento, transparent: true, opacity: 0.9, depthWrite: false });
    this.matAlarma = new this.T.MeshBasicMaterial({ color: C.error, transparent: true, opacity: 0.8, depthWrite: false });
    this.banda();
    this.carriles();
    this.patioBase();
    this.dinamico = new this.T.Group();
    this.scene.add(this.dinamico);
  }

  protected cuadro(t: number, dt: number): boolean {
    let cambio = false;
    // Paneo suave hacia la zona enfocada.
    const c = this.vista.centro;
    const d = this.centroObj - c.x;
    if (Math.abs(d) > 0.01) {
      c.x += d * Math.min(1, dt * 6);
      this.sucio = true;
      cambio = true;
    } else if (d !== 0) {
      c.x = this.centroObj;
    }
    if (this.alarmas) this.matAlarma.opacity = t ? 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4.2)) : 0.8;
    // Cajas que corren por la banda de la bodega a los muelles.
    this.bandaCajas.forEach((b, i) => {
      b.visible = this.hayCola;
      b.position.x = -3.5 + (((t * 0.55 + i / this.bandaCajas.length) % 1) * 2.7);
    });
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
    sol.position.set(-12, 30, 18);
    sol.target.position.set(0, 0, 0);
    this.scene.add(sol, sol.target);
    if (!this.opts.calidadBaja) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      const s = sol.shadow.camera as ThreeNS.OrthographicCamera;
      s.left = -26; s.right = 26; s.top = 18; s.bottom = -18; s.near = 1; s.far = 90;
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
    this.caja(this.scene, 38, ALTO_LOTE, 16.6, C.lote, 1.2, 0, 0.4, 0.14, false);
    this.caja(this.scene, 13.2, 0.03, 14.6, C.zonaBodega, BODEGA_X, ALTO_LOTE, 0.4, 0.1, false);
  }

  private banda(): void {
    const y = ALTO_LOTE;
    this.caja(this.scene, 3.2, 0.5, 1.0, C.oscuro, -2.15, y, 0.4, 0.06);
    this.caja(this.scene, 3.25, 0.05, 0.84, C.via, -2.15, y + 0.5, 0.4, 0, false);
    for (let i = 0; i < 6; i++) this.caja(this.scene, 0.06, 0.02, 0.86, C.lilaMedio, -3.55 + i * 0.56, y + 0.55, 0.4, 0, false);
    for (let i = 0; i < 3; i++) {
      const b = this.caja(this.scene, 0.42, 0.34, 0.42, C.carton, -3.5, y + 0.55, 0.4, 0.04);
      b.visible = false;
      this.bandaCajas.push(b);
    }
  }

  private carriles(): void {
    for (const etapa of ETAPAS_COLA) {
      const x = MUELLE_X[etapa];
      const g = this.grupoSeleccionable(`m:${etapa}`);
      this.estaticos.push(g);
      this.caja(g, 3.9, 0.05, MUELLE_LARGO, C.via, x, ALTO_LOTE, 0.4, 0.08, false);
      for (const dx of [-1.95, 1.95]) this.caja(g, 0.07, 0.02, MUELLE_LARGO, C.linea, x + dx, ALTO_LOTE + 0.05, 0.4, 0, false);
      // Topes del muelle al fondo
      this.caja(g, 3.9, 0.6, 0.3, C.acento, x, ALTO_LOTE, 0.4 - MUELLE_LARGO / 2 - 0.15, 0.06);
    }
    // Patio de salida y un camión parqueado que espera
    this.caja(this.scene, 6.4, 0.03, 9.6, C.via, PATIO.x, ALTO_LOTE, 3.9, 0.08, false);
    for (const z of [5.4, 2.4]) this.caja(this.scene, 5.4, 0.02, 0.08, C.linea, PATIO.x, ALTO_LOTE + 0.03, z - 1.5, 0, false);
  }

  private patioBase(): void {
    const { x, z, w, d } = PATIO;
    this.caja(this.scene, w, 0.04, d, C.patio, x, ALTO_LOTE, z, 0.08, false);
    // Cerca baja
    const n = 9;
    for (let i = 0; i < n; i++) {
      const fx = x - w / 2 + (i * w) / (n - 1);
      this.caja(this.scene, 0.08, 0.55, 0.08, C.lilaMedio, fx, ALTO_LOTE, z - d / 2, 0);
    }
    this.caja(this.scene, w, 0.06, 0.06, C.lilaMedio, x, ALTO_LOTE + 0.5, z - d / 2, 0, false);
    for (const sx of [-1, 1]) this.caja(this.scene, 0.06, 0.06, d, C.lilaMedio, x + (sx * w) / 2, ALTO_LOTE + 0.5, z, 0, false);
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
    // Las filas se centran en la bodega: con pocos productos no queda el frente vacío.
    const filas = Math.ceil(visibles.length / COLS_ESTANTES);
    const z0 = 0.4 - ((filas - 1) * 3.0) / 2;
    visibles.forEach((pr, i) => {
      const x = BODEGA_X - 5 + (i % COLS_ESTANTES) * 2.0;
      const z = z0 + Math.floor(i / COLS_ESTANTES) * 3.0;
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
        const z = 0.4 + MUELLE_LARGO / 2 - 0.9 - Math.floor(k / 3) * 1.2;
        const y = ALTO_LOTE + 0.05 + capa * 0.66;
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
    const g = this.grupoSeleccionable(id, this.dinamico);
    g.position.set(x, y, z);
    g.userData['y0'] = y;
    const urgente = p.urgencia === 'hoy' || p.urgencia === 'vencido';
    this.caja(g, 0.86, 0.6, 0.86, p.frenado ? C.error : C.carton, 0, 0, 0, 0.05);
    this.caja(g, 0.88, 0.035, 0.2, p.frenado ? C.blanco : urgente ? C.alerta : C.acento, 0, 0.6, 0, 0, false);
    if (p.frenado && aPiso) this.anillo(g, 'alarma', 0.62, 0.01);
    this.anillo(g, id, 0.62, 0.02);
    this.grupos.set(id, g);
    this.topes.set(id, new this.T.Vector3(x, y + 0.7, z));
  }

  private camiones(vivos: PedidoCola[], res: ResultadoEscena): void {
    const conteo = new Map<string, number>();
    for (const p of vivos) if (p.transportador) conteo.set(p.transportador, (conteo.get(p.transportador) || 0) + 1);
    const nombres = [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
    res.camiones = nombres.slice(0, TOPE_CAMIONES);
    const lugares = nombres.length ? res.camiones : [null];
    lugares.forEach((nombre, i) => {
      const z = 6.6 - i * 3.0;
      const padre = nombre ? this.grupoSeleccionable(`t:${nombre}`, this.dinamico) : this.dinamico;
      const c = this.camion(padre, nombre ? C.acento : C.lilaMedio);
      c.position.set(PATIO.x, ALTO_LOTE, z);
      if (nombre) {
        const id = `t:${nombre}`;
        this.grupos.set(id, padre as ThreeNS.Group);
        const ancla = new this.T.Vector3(PATIO.x, ALTO_LOTE + 2.1, z);
        this.topes.set(id, ancla);
        this.anclasFijas.set(id, ancla);
        this.anillo(c, id, 2.2, 0.04);
      }
    });
    if (!nombres.length) this.anclasFijas.set('z:salida', new this.T.Vector3(PATIO.x, ALTO_LOTE + 2.1, 6.6));
  }

  private camion(padre: ThreeNS.Object3D, color: number): ThreeNS.Group {
    const g = new this.T.Group();
    const k = new this.T.Group();
    k.rotation.y = Math.PI / 2; // mira hacia la salida (+x)
    k.scale.setScalar(0.72);
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

  private patio(rezagados: number): void {
    const { x, z } = PATIO;
    this.anclasFijas.set('z:rez', new this.T.Vector3(x, ALTO_LOTE + 1.9, z));
    if (!rezagados) return;
    const g = this.grupoSeleccionable('rez', this.dinamico);
    // Una pila que crece con los rezagados (hasta 36 cajas: 6 × 3 × 2).
    const n = Math.min(36, Math.max(1, Math.ceil(Math.sqrt(rezagados) * 2)));
    for (let i = 0; i < n; i++) {
      const capa = Math.floor(i / 18);
      const k = i % 18;
      this.caja(g, 0.8, 0.55, 0.8, C.rezagado, x - 2.5 + (k % 6) * 1.0, ALTO_LOTE + 0.04 + capa * 0.58, z - 1.2 + Math.floor(k / 6) * 1.1, 0.05);
    }
    this.anillo(g, 'rez', 3.1, 0.06, x, z);
    this.grupos.set('rez', g);
    this.topes.set('rez', new this.T.Vector3(x, ALTO_LOTE + 1.9, z));
  }

  private anclasZonas(): void {
    const y = ALTO_LOTE + 0.1;
    // Los rótulos de los muelles van sobre sus topes, al fondo: el frente es de las cajas.
    const fondo = 0.4 - MUELLE_LARGO / 2 - 0.15;
    this.anclasFijas.set('z:bodega', new this.T.Vector3(BODEGA_X, y, 7.9));
    for (const etapa of ETAPAS_COLA) {
      this.anclasFijas.set(`z:${etapa}`, new this.T.Vector3(MUELLE_X[etapa], ALTO_LOTE + 0.95, fondo));
      this.topes.set(`m:${etapa}`, new this.T.Vector3(MUELLE_X[etapa], ALTO_LOTE + 0.4, 0.4 + MUELLE_LARGO / 2 - 0.6));
    }
  }

  // -------------------------------------------------------------- resalte

  /**
   * Anillo plano bajo un objeto. `clave` = 'alarma' (rojo que titila) o el id del
   * objeto (anillo de selección, oculto hasta que se resalta).
   */
  private anillo(padre: ThreeNS.Object3D, clave: string, radio: number, y: number, x = 0, z = 0): void {
    const k = `r|${radio}`;
    let geo = this.geoCache.get(k);
    if (!geo) {
      geo = new this.T.RingGeometry(radio * 0.7, radio, 44);
      geo.rotateX(-Math.PI / 2);
      this.geoCache.set(k, geo);
    }
    const alarma = clave === 'alarma';
    const m = new this.T.Mesh(geo, alarma ? this.matAlarma : this.matAnillo);
    m.position.set(x, y, z);
    m.renderOrder = 2;
    padre.add(m);
    if (alarma) this.alarmas++;
    else { m.visible = false; this.anillos.set(clave, m); }
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
