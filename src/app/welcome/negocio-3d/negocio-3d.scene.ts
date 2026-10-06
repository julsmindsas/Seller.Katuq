import type * as ThreeNS from 'three';
import { AnclaZona, DEG, EscenaBase, OpcionesEscena, VistaCamara } from '../../shared/escena-3d/escena-base';

// ==========================================================================
// Escena 3D del welcome: una maqueta isométrica del negocio. Cada zona de la
// maqueta es una pantalla de Katuq (tienda = ventas, muelles = despachos,
// estibas = inventario, oficina = CRM, casas = clientes) y refleja el dato
// real que le pasa el componente. Sin Angular adentro: solo three.
//
// "Lite" a propósito: materiales Lambert, geometría compartida, instancias
// para lo repetido, sin sombras en equipos modestos, render a ~40 fps que se
// pausa cuando el bloque no se ve, y nada se mueve con "reducir movimiento".
// ==========================================================================

export type { AnclaZona } from '../../shared/escena-3d/escena-base';
export type ZonaId = 'ventas' | 'despachos' | 'inventario' | 'crm' | 'clientes';
export type Tono = 'accent' | 'success' | 'warning' | 'danger';

export interface EstadoEscena {
  zonas: Record<ZonaId, { visible: boolean; tono: Tono }>;
  /** Camiones esperando en los muelles (0..3) = pedidos por despachar. */
  camionesEnMuelle: number;
  /** Hay pedidos con entrega hoy o vencida: baliza naranja en el primer camión. */
  urgentes: boolean;
  /** Estibas vacías con anillo rojo (0..2) = productos sin stock. */
  estibasVacias: number;
  /** Estibas casi vacías con anillo naranja (0..2) = productos en bajo stock. */
  estibasBajas: number;
}

export type LogoId = 'katuq' | 'comercio';

/** Imagen del logo, o null para pintar las iniciales del texto. */
export interface FuenteLogo {
  imagen: CanvasImageSource & { width: number; height: number } | null;
  texto: string;
}

export type EscenaOpciones = OpcionesEscena<ZonaId>;

// Paleta canónica (openspec/specs/design-system): acento, lilas y semánticos.
const C = {
  fondo: 0xe7e2f7,
  lote: 0xf8f7fd,
  anden: 0xf2effb,
  via: 0xd9d2f0,
  linea: 0xffffff,
  acento: 0x5f3fe0,
  acento2: 0x7c5cff,
  acentoSuave: 0xefe9ff,
  lila: 0xd9cffb,
  lilaMedio: 0xa996ff,
  vidrio: 0xcfc6f6,
  tinta: 0x2b2550,
  blanco: 0xffffff,
  blancoLila: 0xfaf9fe,
  carton: 0xe4bf8e,
  carton2: 0xd7ad78,
  madera: 0xb98e63,
  follaje: 0x7fd1a1,
  follaje2: 0x5dbb86,
  tronco: 0xb9967a,
  montacargas: 0xffb547,
  oscuro: 0x3a3358,
};

const TONO: Record<Tono, number> = {
  accent: C.acento,
  success: 0x1e874b,
  warning: 0xd9820a,
  danger: 0xd64545,
};

const ALTURA_LOTE = 0.24;

interface ZonaRuntime {
  anillo: ThreeNS.Mesh;
  relleno: ThreeNS.Mesh;
  pin: ThreeNS.Group;
  pinCabeza: ThreeNS.Mesh;
  pinBase: ThreeNS.Vector3;
  ancla: ThreeNS.Vector3;
  visible: boolean;
}

export class NegocioEscena extends EscenaBase<ZonaId> {
  protected readonly animaContinuo = true;
  protected readonly vista: VistaCamara = {
    az: 38 * DEG,
    pol: 56 * DEG,
    centro: { x: 0, y: 0, z: -2.6 },
    mirarY: 1.2,
    limAz: [-25 * DEG, 100 * DEG],
    limPol: [38 * DEG, 66 * DEG],
    limZoom: [0.75, 2.2],
    // En pantallas angostas se recorta a lo central (tienda → estibas) en vez de encoger todo.
    altoMundo: (util) => Math.max(24, (util < 1.6 ? 36 : 57) / Math.max(util, 0.6)),
    bajada: 0.06,
    fondo: C.fondo,
  };

  private readonly zonas = new Map<ZonaId, ZonaRuntime>();

  // Dinámicos que cambian con los datos
  private camionesMuelle: ThreeNS.Group[] = [];
  private baliza!: ThreeNS.Mesh;
  private camionRuta!: ThreeNS.Group;
  private montacargas!: ThreeNS.Group;
  private cajas!: ThreeNS.InstancedMesh;
  private anillosEstiba: ThreeNS.Mesh[] = [];
  private estado: EstadoEscena | null = null;
  private readonly logos = new Map<LogoId, { grupo: ThreeNS.Group; cara: ThreeNS.MeshBasicMaterial; base: ThreeNS.Vector3; fase: number }>();
  private readonly logosPendientes = new Map<LogoId, FuenteLogo>();
  private readonly vAncla = new Map<ZonaId, ThreeNS.Vector3>();

  // ------------------------------------------------------------------ API

  actualizar(estado: EstadoEscena): void {
    this.estado = estado;
    if (!this.scene) return;

    const enMuelle = Math.max(0, Math.min(3, estado.camionesEnMuelle));
    this.camionesMuelle.forEach((c, i) => (c.visible = i < enMuelle));
    this.baliza.visible = estado.urgentes && enMuelle > 0;

    this.recalcularCajas(estado);

    for (const [id, z] of this.zonas) {
      const conf = estado.zonas[id];
      z.visible = !!conf?.visible;
      z.pin.visible = z.visible;
      const color = TONO[conf?.tono ?? 'accent'];
      (z.pinCabeza.material as ThreeNS.MeshLambertMaterial).color.setHex(color);
    }
    this.sucio = true;
  }

  /** Pone (o cambia) la imagen de uno de los logos flotantes. */
  ponerLogo(id: LogoId, fuente: FuenteLogo): void {
    const logo = this.logos.get(id);
    if (!logo) { this.logosPendientes.set(id, fuente); return; }
    const anterior = logo.cara.map;
    logo.cara.map = this.texturaLogo(fuente);
    logo.cara.needsUpdate = true;
    this.liberarTextura(anterior);
    this.sucio = true;
  }

  // -------------------------------------------------------------- ganchos

  protected construir(): void {
    this.luces();
    this.suelo();
    this.tienda();
    this.oficina();
    this.bodega();
    this.estibas();
    this.casas();
    this.arboles();
    this.vehiculos();
    this.pines();
    this.crearLogos();
  }

  protected seleccionable(id: ZonaId): boolean {
    return !!this.zonas.get(id)?.visible;
  }

  protected cuadro(t: number, dt: number): boolean {
    const anillos = this.animarAnillos();
    if (!this.opts.reducirMovimiento) this.animar(t, dt);
    this.moverLogos(t);
    return anillos;
  }

  protected *anclas(): Iterable<[ZonaId, ThreeNS.Vector3]> {
    for (const [id, z] of this.zonas) {
      if (!z.visible) continue;
      let v = this.vAncla.get(id);
      if (!v) { v = new this.T.Vector3(); this.vAncla.set(id, v); }
      v.copy(z.ancla);
      v.y += z.pin.position.y - z.pinBase.y;
      yield [id, v];
    }
  }

  // ------------------------------------------------------------ animación

  private animar(t: number, dt: number): void {
    // Pines: flotan suave, desfasados
    let i = 0;
    for (const z of this.zonas.values()) {
      if (!z.visible) { i++; continue; }
      z.pin.position.y = z.pinBase.y + Math.sin(t * 1.8 + i * 1.3) * 0.18;
      z.pin.rotation.y = t * 0.9 + i;
      i++;
    }
    // Camión de reparto recorriendo la vía
    const p = this.camionRuta.position;
    p.x += dt * 4.2;
    if (p.x > 34) p.x = -34;
    // Montacargas yendo y viniendo entre estibas y muelle
    const fase = (Math.sin(t * 0.55) + 1) / 2; // 0..1
    this.montacargas.position.x = 9.6 + fase * 6.2;
    this.montacargas.rotation.y = Math.cos(t * 0.55) >= 0 ? Math.PI / 2 : -Math.PI / 2;
    // Baliza de urgente
    if (this.baliza.visible) this.baliza.scale.setScalar(1 + Math.sin(t * 6) * 0.25);
    // Anillos de estiba vacía/baja: respiran
    this.anillosEstiba.forEach((r, k) => {
      if (!r.visible) return;
      (r.material as ThreeNS.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 3 + k) * 0.3;
    });
  }

  /** Los logos flotan y se balancean, siempre de frente a quien mira. */
  private moverLogos(t: number): void {
    for (const l of this.logos.values()) {
      l.grupo.position.y = l.base.y + Math.sin(t * 1.3 + l.fase) * 0.28;
      l.grupo.rotation.y = this.az + Math.sin(t * 0.8 + l.fase) * 0.32;
    }
  }

  private animarAnillos(): boolean {
    let movio = false;
    for (const [id, z] of this.zonas) {
      const objetivo = z.visible && (this.resaltada === id || this.hover === id) ? 1 : 0;
      const mat = z.anillo.material as ThreeNS.MeshBasicMaterial;
      const relleno = z.relleno.material as ThreeNS.MeshBasicMaterial;
      const actual = mat.opacity;
      const nuevo = actual + (objetivo - actual) * 0.2;
      if (Math.abs(nuevo - actual) > 0.002) movio = true;
      mat.opacity = nuevo;
      relleno.opacity = nuevo * 0.16;
      z.anillo.visible = z.relleno.visible = nuevo > 0.01;
      z.pinCabeza.scale.setScalar(1 + nuevo * 0.25);
    }
    return movio;
  }

  // ------------------------------------------------------------- utilidades

  private letrero(
    padre: ThreeNS.Object3D, texto: string, w: number, h: number,
    x: number, y: number, z: number, rotY = 0, color = '#5F3FE0', fondo = '#FFFFFF',
  ): ThreeNS.Mesh {
    const mat = new this.T.MeshBasicMaterial({ map: this.texturaTexto(texto, color, fondo) });
    const m = new this.T.Mesh(new this.T.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    padre.add(m);
    return m;
  }

  private zonaGrupo(id: ZonaId): ThreeNS.Group {
    return this.grupoSeleccionable(id);
  }

  // -------------------------------------------------------------- escenario

  private luces(): void {
    const T = this.T;
    this.scene.add(new T.HemisphereLight(0xffffff, 0xd6cef5, 1.8));
    const sol = new T.DirectionalLight(0xffffff, 1.75);
    sol.position.set(-14, 30, 18);
    sol.target.position.set(1, 0, 1);
    this.scene.add(sol, sol.target);
    if (!this.opts.calidadBaja) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      const s = sol.shadow.camera as ThreeNS.OrthographicCamera;
      s.left = -30; s.right = 30; s.top = 26; s.bottom = -26; s.near = 1; s.far = 90;
      sol.shadow.bias = -0.0006;
      sol.shadow.normalBias = 0.02;
      sol.shadow.radius = 4;
    }
  }

  private suelo(): void {
    const T = this.T;
    // Piso sin luz = mismo color del fondo (sin costura en el horizonte) y
    // una capa aparte que solo pinta las sombras.
    const geoPiso = new T.PlaneGeometry(260, 260);
    geoPiso.rotateX(-Math.PI / 2);
    this.scene.add(new T.Mesh(geoPiso, new T.MeshBasicMaterial({ color: C.fondo })));
    if (!this.opts.calidadBaja) {
      const sombras = new T.Mesh(geoPiso, new T.ShadowMaterial({ color: 0x2b2160, opacity: 0.12 }));
      sombras.position.y = 0.01;
      sombras.receiveShadow = true;
      this.scene.add(sombras);
    }

    // Lote principal y manzana de clientes al otro lado de la vía
    this.caja(this.scene, 38, ALTURA_LOTE, 18, C.lote, 0.5, 0, -3.6, 0.12, false);
    this.caja(this.scene, 34, ALTURA_LOTE, 9.5, C.lote, -3, 0, 15.6, 0.12, false);

    // Andenes + vía
    this.caja(this.scene, 260, 0.16, 1.2, C.anden, 0, 0, 5.9, 0, false);
    this.caja(this.scene, 260, 0.16, 1.2, C.anden, 0, 0, 10.9, 0, false);
    this.caja(this.scene, 260, 0.05, 3.8, C.via, 0, 0, 8.4, 0, false);

    // Rayas de la vía (una sola instancia)
    const n = 34;
    const rayas = new T.InstancedMesh(this.geoCaja(1.6, 0.02, 0.18), this.mat(C.linea), n);
    const m = new T.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(-60 + i * 3.6, 0.07, 8.4);
      rayas.setMatrixAt(i, m);
    }
    rayas.receiveShadow = true;
    this.scene.add(rayas);

    // Entrada vehicular a los muelles
    this.caja(this.scene, 11.5, 0.03, 4.4, C.via, 3.2, ALTURA_LOTE - 0.01, 3.2, 0, false);
    for (const x of [-2.5, 1.3, 5.1, 8.9]) {
      this.caja(this.scene, 0.12, 0.02, 4.2, C.linea, x, ALTURA_LOTE + 0.02, 3.1, 0, false);
    }
  }

  private tienda(): void {
    const g = this.zonaGrupo('ventas');
    const x0 = -13.2, z0 = -3.4, y0 = ALTURA_LOTE;
    this.caja(g, 6.4, 3.4, 5.2, C.blanco, x0, y0, z0, 0.18);
    this.caja(g, 6.9, 0.36, 5.7, C.acento, x0, y0 + 3.4, z0, 0.12);
    // Vitrina y puerta
    const fz = z0 + 2.62;
    this.caja(g, 3.4, 1.6, 0.08, C.vidrio, x0 - 1.1, y0 + 0.55, fz, 0, false);
    this.caja(g, 1.3, 2.2, 0.1, C.acento, x0 + 1.9, y0, fz, 0, false);
    this.caja(g, 0.1, 0.1, 0.1, C.montacargas, x0 + 1.45, y0 + 1.1, fz + 0.06, 0, false);
    // Toldo a rayas
    const toldo = new this.T.Group();
    toldo.position.set(x0, y0 + 2.75, fz + 0.55);
    toldo.rotation.x = 0.42;
    for (let i = 0; i < 6; i++) {
      this.caja(toldo, 1.08, 0.1, 1.3, i % 2 ? C.blanco : C.acento2, -2.7 + i * 1.08, 0, 0, 0, true);
    }
    g.add(toldo);
    // Letrero
    this.caja(g, 3.8, 1.1, 0.24, C.blanco, x0, y0 + 3.76, z0 + 1.6, 0.1);
    this.letrero(g, 'tienda', 3.5, 0.88, x0, y0 + 4.31, z0 + 1.73);
    // Materas
    for (const dx of [-3.6, 3.6]) {
      this.caja(g, 0.7, 0.6, 0.7, C.acentoSuave, x0 + dx, y0, fz + 0.6, 0.12);
      this.esfera(g, 0.55, C.follaje2, x0 + dx, y0 + 1.05, fz + 0.6);
    }
  }

  private oficina(): void {
    const g = this.zonaGrupo('crm');
    const x0 = -6.2, z0 = -5.6, y0 = ALTURA_LOTE;
    this.caja(g, 5.0, 3.0, 5.6, C.blancoLila, x0, y0, z0, 0.16);
    this.caja(g, 5.4, 0.3, 6.0, C.acentoSuave, x0, y0 + 3.0, z0, 0.1);
    this.caja(g, 5.42, 0.12, 6.02, C.acento2, x0, y0 + 3.0, z0, 0, false);
    const fz = z0 + 2.82;
    for (const dx of [-1.5, 0, 1.5]) this.caja(g, 1.0, 0.85, 0.06, C.vidrio, x0 + dx, y0 + 1.75, fz, 0, false);
    this.caja(g, 1.0, 1.4, 0.08, C.acento, x0 - 1.5, y0, fz, 0, false);
    this.caja(g, 2.0, 0.85, 0.06, C.vidrio, x0 + 0.75, y0 + 0.55, fz, 0, false);
    // Antena con globo de chat: es "seguimiento comercial"
    this.cilindro(g, 0.06, 1.3, C.oscuro, x0 + 1.6, y0 + 3.95, z0 - 1.2, 6);
    this.caja(g, 1.3, 0.9, 0.22, C.acento2, x0 + 1.6, y0 + 4.5, z0 - 1.2, 0.2);
    this.caja(g, 0.18, 0.18, 0.2, C.blanco, x0 + 1.25, y0 + 4.86, z0 - 1.08, 0.06, false);
    this.caja(g, 0.18, 0.18, 0.2, C.blanco, x0 + 1.6, y0 + 4.86, z0 - 1.08, 0.06, false);
    this.caja(g, 0.18, 0.18, 0.2, C.blanco, x0 + 1.95, y0 + 4.86, z0 - 1.08, 0.06, false);
  }

  private bodega(): void {
    const T = this.T;
    const g = this.zonaGrupo('despachos');
    const x0 = 3.2, z0 = -5.2, y0 = ALTURA_LOTE;
    const W = 12, H = 4.6, D = 8;
    this.caja(g, W, H, D, C.acento, x0, y0, z0, 0.22);
    this.caja(g, W + 0.5, 0.34, D + 0.5, C.acento2, x0, y0 + H, z0, 0.1);

    // Costillas del techo (instancias)
    const n = 13;
    const cost = new T.InstancedMesh(this.geoCaja(0.2, 0.16, D + 0.5), this.mat(0x9a82ff), n);
    const m = new T.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(x0 - W / 2 + 0.3 + i * ((W - 0.6) / (n - 1)), y0 + H + 0.42, z0);
      cost.setMatrixAt(i, m);
    }
    cost.castShadow = true;
    g.add(cost);

    // Muelles: marco blanco + persiana lila + topes
    const fz = z0 + D / 2;
    for (const dx of [-3.8, 0, 3.8]) {
      this.caja(g, 2.8, 3.1, 0.14, C.blanco, x0 + dx, y0, fz + 0.02, 0.06, false);
      this.caja(g, 2.3, 2.75, 0.16, C.lila, x0 + dx, y0, fz + 0.04, 0, false);
      for (let k = 0; k < 4; k++) this.caja(g, 2.3, 0.05, 0.18, 0xc4b7f7, x0 + dx, y0 + 0.5 + k * 0.6, fz + 0.04, 0, false);
      this.caja(g, 0.3, 0.4, 0.3, C.tinta, x0 + dx - 1.25, y0, fz + 0.2, 0.05);
      this.caja(g, 0.3, 0.4, 0.3, C.tinta, x0 + dx + 1.25, y0, fz + 0.2, 0.05);
    }
    // Alero de los muelles
    this.caja(g, W - 0.4, 0.16, 1.4, C.blanco, x0, y0 + 3.45, fz + 0.65, 0.06);

    // Logo de Katuq en la fachada
    this.caja(g, 3.6, 0.85, 0.12, C.blanco, x0, y0 + 3.68, fz + 0.04, 0.08, false);
    this.letrero(g, 'katuq', 3.3, 0.72, x0, y0 + 4.105, fz + 0.11);

    // Cajas moradas apiladas al costado (stock en canastas)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3 - i; j++) {
        this.caja(g, 0.9, 0.7, 0.9, i % 2 ? C.lilaMedio : C.acento2, x0 + W / 2 + 1.2 + j * 0.95, y0 + i * 0.72, z0 - 2.2, 0.06);
      }
    }
  }

  private readonly slots = [
    { x: 11.2, z: -6.4, capas: 3 }, { x: 13.8, z: -6.4, capas: 2 }, { x: 16.4, z: -6.4, capas: 3 },
    { x: 11.2, z: -3.4, capas: 2 }, { x: 13.8, z: -3.4, capas: 3 }, { x: 16.4, z: -3.4, capas: 1 },
  ];
  // Orden en que se "vacían" para pintar sin stock / bajo stock
  private readonly ordenVacias = [4, 1];
  private readonly ordenBajas = [3, 2];

  private estibas(): void {
    const T = this.T;
    const g = this.zonaGrupo('inventario');
    const y0 = ALTURA_LOTE;
    for (const s of this.slots) {
      this.caja(g, 2.1, 0.22, 2.1, C.madera, s.x, y0, s.z, 0.04);
      const anillo = new T.Mesh(
        new T.RingGeometry(1.45, 1.7, 48),
        new T.MeshBasicMaterial({ color: TONO.danger, transparent: true, opacity: 0.7, depthWrite: false }),
      );
      anillo.rotation.x = -Math.PI / 2;
      anillo.position.set(s.x, y0 + 0.03, s.z);
      anillo.visible = false;
      g.add(anillo);
      this.anillosEstiba.push(anillo);
    }
    const maxCajas = this.slots.reduce((a, s) => a + s.capas * 4, 0);
    this.cajas = new T.InstancedMesh(this.geoCaja(0.94, 0.78, 0.94, 0.05), new T.MeshLambertMaterial({ color: 0xffffff }), maxCajas);
    this.cajas.castShadow = true;
    this.cajas.receiveShadow = true;
    g.add(this.cajas);

    // Estantería al fondo
    const ex = 13.8, ez = -10.3;
    for (const dx of [-3.2, 0, 3.2]) this.caja(g, 0.16, 3.2, 1.2, C.oscuro, ex + dx, y0, ez, 0);
    for (const h of [0.9, 2.0, 3.1]) this.caja(g, 6.6, 0.1, 1.2, C.acento2, ex, y0 + h, ez, 0);
    for (const [dx, h] of [[-2.4, 0.9], [-1.4, 0.9], [1.0, 0.9], [2.2, 2.0], [-2.0, 2.0], [0.4, 2.0], [-0.8, 3.1], [1.8, 3.1]]) {
      this.caja(g, 0.85, 0.7, 0.9, C.carton, ex + dx, y0 + h + 0.1, ez, 0.04);
    }
    this.recalcularCajas(null);
  }

  private recalcularCajas(estado: EstadoEscena | null): void {
    const T = this.T;
    const vacias = new Set(this.ordenVacias.slice(0, estado?.estibasVacias ?? 0));
    const bajas = new Set(this.ordenBajas.slice(0, estado?.estibasBajas ?? 0));
    const m = new T.Matrix4();
    const col = new T.Color();
    let i = 0;
    this.slots.forEach((s, k) => {
      const capas = vacias.has(k) ? 0 : bajas.has(k) ? 1 : s.capas;
      const cuantas = bajas.has(k) ? 2 : 4;
      for (let c = 0; c < capas; c++) {
        for (let q = 0; q < cuantas; q++) {
          const ox = (q % 2 ? 0.49 : -0.49);
          const oz = (q < 2 ? -0.49 : 0.49);
          m.makeTranslation(s.x + ox, ALTURA_LOTE + 0.22 + 0.39 + c * 0.8, s.z + oz);
          this.cajas.setMatrixAt(i, m);
          this.cajas.setColorAt(i, col.setHex((q + c + k) % 3 ? C.carton : C.carton2));
          i++;
        }
      }
      const anillo = this.anillosEstiba[k];
      anillo.visible = vacias.has(k) || bajas.has(k);
      (anillo.material as ThreeNS.MeshBasicMaterial).color.setHex(vacias.has(k) ? TONO.danger : TONO.warning);
    });
    this.cajas.count = i;
    this.cajas.instanceMatrix.needsUpdate = true;
    if (this.cajas.instanceColor) this.cajas.instanceColor.needsUpdate = true;
    this.cajas.computeBoundingSphere();
  }

  private casas(): void {
    const T = this.T;
    const g = this.zonaGrupo('clientes');
    const z0 = 15.4, y0 = ALTURA_LOTE;
    const techos = [C.acento2, C.lilaMedio, C.acento, C.acento2, C.lilaMedio];
    const geoTecho = new T.CylinderGeometry(1.75, 1.75, 3.0, 3, 1, false, Math.PI / 2);
    geoTecho.rotateZ(Math.PI / 2);
    geoTecho.scale(1, 0.62, 1);
    this.geoCache.set('techo', geoTecho);
    [-16.5, -12.2, -7.9, -3.6, 0.7].forEach((x, i) => {
      const dz = i % 2 ? 0.8 : -0.4;
      this.caja(g, 2.6, 1.9, 2.5, i % 2 ? C.blancoLila : C.blanco, x, y0, z0 + dz, 0.08);
      const techo = new T.Mesh(geoTecho, this.mat(techos[i]));
      techo.position.set(x, y0 + 1.9 + 0.54, z0 + dz);
      techo.rotation.y = Math.PI / 2;
      techo.castShadow = true;
      g.add(techo);
      this.caja(g, 0.7, 1.15, 0.06, C.acento, x + 0.6, y0, z0 + dz - 1.27, 0, false);
      this.caja(g, 0.7, 0.6, 0.06, C.vidrio, x - 0.55, y0 + 0.75, z0 + dz - 1.27, 0, false);
    });
    // Un repartidor llegando: caja frente a una puerta
    this.caja(g, 0.6, 0.5, 0.6, C.carton, -7.3, y0, z0 - 2.3, 0.04);
  }

  private arboles(): void {
    const T = this.T;
    const pos: Array<[number, number, number]> = [
      [-17.5, -11, 1.1], [-14, -10.6, 0.9], [-9.8, -10.9, 1.2], [-1.6, -11.2, 1.0], [8.4, -11.6, 1.1],
      [19.6, -9.6, 1.0], [19.8, -4.8, 1.2], [19.6, 0.8, 0.9], [-18.6, -5.2, 1.0], [-18.4, 1.6, 1.2],
      [-9.4, 1.4, 0.8], [-17.6, 18.4, 1.1], [-10, 18.8, 0.9], [-5.6, 18.6, 1.2], [2.6, 18.2, 1.0],
      [6.4, 14.2, 1.2], [10.2, 15.6, 1.0], [12.6, 13.0, 0.8], [-20, 13.2, 1.0],
    ];
    const tronco = new T.InstancedMesh(new T.CylinderGeometry(0.14, 0.18, 1, 6), this.mat(C.tronco), pos.length);
    const copa = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshLambertMaterial({ color: 0xffffff }), pos.length);
    const m = new T.Matrix4();
    const q = new T.Quaternion();
    const s = new T.Vector3();
    const p = new T.Vector3();
    const col = new T.Color();
    pos.forEach(([x, z, k], i) => {
      const base = this.sobreLote(x, z) ? ALTURA_LOTE : 0;
      m.compose(p.set(x, base + 0.6 * k, z), q.identity(), s.set(k, 1.2 * k, k));
      tronco.setMatrixAt(i, m);
      m.compose(p.set(x, base + 1.2 * k + 0.75 * k, z), q.identity(), s.set(k, k * 1.08, k));
      copa.setMatrixAt(i, m);
      copa.setColorAt(i, col.setHex(i % 3 ? C.follaje : C.follaje2));
    });
    tronco.castShadow = copa.castShadow = true;
    this.scene.add(tronco, copa);
  }

  private sobreLote(x: number, z: number): boolean {
    const enPrincipal = Math.abs(x - 0.5) <= 19 && Math.abs(z + 3.6) <= 9;
    const enClientes = Math.abs(x + 3) <= 17 && Math.abs(z - 15.6) <= 4.75;
    return enPrincipal || enClientes;
  }

  private camion(padre: ThreeNS.Object3D, rotulo: boolean): ThreeNS.Group {
    const g = new this.T.Group();
    // Mirando a +z (cabina adelante)
    this.caja(g, 1.8, 2.1, 3.4, C.blanco, 0, 0.42, -0.9, 0.12);
    this.caja(g, 1.84, 0.22, 3.42, C.acento, 0, 0.9, -0.9, 0, false);
    this.caja(g, 1.7, 1.55, 1.35, C.acento, 0, 0.42, 1.55, 0.18);
    this.caja(g, 1.5, 0.6, 0.06, C.vidrio, 0, 1.22, 2.24, 0, false);
    this.caja(g, 1.9, 0.18, 4.9, C.tinta, 0, 0.32, -0.15, 0, false);
    for (const [wx, wz] of [[-0.9, 1.5], [0.9, 1.5], [-0.9, -1.5], [0.9, -1.5], [-0.9, -2.2], [0.9, -2.2]]) {
      const w = this.cilindro(g, 0.36, 0.3, C.tinta, wx, 0.36, wz, 14);
      w.rotation.z = Math.PI / 2;
    }
    if (rotulo) {
      this.letrero(g, 'katuq', 2.6, 0.62, 0.91, 1.75, -0.9, Math.PI / 2);
      this.letrero(g, 'katuq', 2.6, 0.62, -0.91, 1.75, -0.9, -Math.PI / 2);
    }
    padre.add(g);
    return g;
  }

  private vehiculos(): void {
    const T = this.T;
    // Tres camiones en muelle (se muestran según los pedidos por despachar)
    const muelle = this.scene.children.find((o) => o.userData['zona'] === 'despachos')!;
    for (const dx of [-3.8, 0, 3.8]) {
      const c = this.camion(muelle, true);
      c.position.set(3.2 + dx, ALTURA_LOTE, 2.25);
      c.visible = false;
      this.camionesMuelle.push(c);
    }
    this.baliza = new T.Mesh(new T.SphereGeometry(0.26, 16, 12), new T.MeshBasicMaterial({ color: TONO.warning }));
    this.baliza.position.set(0, 2.25, 1.55);
    this.camionesMuelle[0].add(this.baliza);
    this.baliza.visible = false;

    // Camión de reparto en la vía (ambiente)
    this.camionRuta = this.camion(this.scene, true);
    this.camionRuta.rotation.y = Math.PI / 2;
    this.camionRuta.position.set(-20, 0.05, 7.4);

    // Montacargas
    const f = new T.Group();
    this.caja(f, 1.1, 0.7, 1.5, C.montacargas, 0, 0.25, 0, 0.12);
    this.caja(f, 1.0, 0.08, 0.95, C.oscuro, 0, 1.75, -0.15, 0, true);
    for (const [px, pz] of [[-0.45, 0.3], [0.45, 0.3], [-0.45, -0.6], [0.45, -0.6]]) this.caja(f, 0.07, 0.8, 0.07, C.oscuro, px, 0.95, pz, 0, false);
    this.caja(f, 0.12, 2.0, 0.12, C.oscuro, -0.35, 0.2, 0.86, 0);
    this.caja(f, 0.12, 2.0, 0.12, C.oscuro, 0.35, 0.2, 0.86, 0);
    this.caja(f, 0.12, 0.06, 1.0, C.oscuro, -0.25, 0.32, 1.35, 0, false);
    this.caja(f, 0.12, 0.06, 1.0, C.oscuro, 0.25, 0.32, 1.35, 0, false);
    this.caja(f, 0.86, 0.66, 0.86, C.carton, 0, 0.38, 1.35, 0.04);
    for (const [wx, wz] of [[-0.58, 0.45], [0.58, 0.45], [-0.58, -0.5], [0.58, -0.5]]) {
      const w = this.cilindro(f, 0.24, 0.2, C.tinta, wx, 0.24, wz, 12);
      w.rotation.z = Math.PI / 2;
    }
    f.position.set(12, ALTURA_LOTE, -0.6);
    f.rotation.y = Math.PI / 2;
    const zonaInv = this.scene.children.find((o) => o.userData['zona'] === 'inventario')!;
    zonaInv.add(f);
    this.montacargas = f;
  }

  private crearLogos(): void {
    const T = this.T;
    const def: Array<{ id: LogoId; x: number; y: number; z: number; lado: number; fase: number }> = [
      { id: 'comercio', x: -13.2, y: 7.7, z: -4.6, lado: 3.4, fase: 0 },
      { id: 'katuq', x: 5.6, y: 9.4, z: -7.6, lado: 2.8, fase: 1.7 },
    ];
    for (const d of def) {
      const g = new T.Group();
      // Placa blanca con canto morado (dos cajas redondeadas) y la cara con el logo
      const canto = new T.Mesh(this.geoCaja(d.lado + 0.18, d.lado + 0.18, 0.26, 0.34), this.mat(C.acento));
      const placa = new T.Mesh(this.geoCaja(d.lado, d.lado, 0.36, 0.3), this.mat(C.blanco));
      canto.castShadow = placa.castShadow = true;
      const cara = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const frente = new T.Mesh(new T.PlaneGeometry(d.lado * 0.86, d.lado * 0.86), cara);
      frente.position.z = 0.185;
      const dorso = frente.clone();
      dorso.position.z = -0.185;
      dorso.rotation.y = Math.PI;
      g.add(canto, placa, frente, dorso);
      g.position.set(d.x, d.y, d.z);
      this.scene.add(g);
      this.logos.set(d.id, { grupo: g, cara, base: g.position.clone(), fase: d.fase });
      const pendiente = this.logosPendientes.get(d.id);
      if (pendiente) this.ponerLogo(d.id, pendiente);
    }
    this.logosPendientes.clear();
  }

  /** Logo centrado sin deformar sobre fondo blanco; sin imagen, iniciales en morado. */
  private texturaLogo(fuente: FuenteLogo): ThreeNS.Texture {
    const n = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, n, n);
    const img = fuente.imagen;
    if (img && img.width > 0 && img.height > 0) {
      const caja = n * 0.84;
      const k = Math.min(caja / img.width, caja / img.height);
      const w = img.width * k, h = img.height * k;
      ctx.drawImage(img, (n - w) / 2, (n - h) / 2, w, h);
    } else {
      const iniciales = (fuente.texto || 'K').trim().split(/\s+/).slice(0, 2)
        .map((p) => p.charAt(0)).join('').toUpperCase() || 'K';
      ctx.fillStyle = '#efe9ff';
      ctx.beginPath();
      ctx.arc(n / 2, n / 2, n * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5F3FE0';
      ctx.font = `800 ${iniciales.length > 1 ? n * 0.3 : n * 0.38}px Georama, "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iniciales, n / 2, n / 2 + n * 0.02);
    }
    const tex = new this.T.CanvasTexture(cv);
    tex.colorSpace = this.T.SRGBColorSpace;
    tex.anisotropy = 4;
    this.texturas.push(tex);
    return tex;
  }

  private pines(): void {
    const T = this.T;
    // (x, y, z) = pin; (rx, rz) = centro del anillo de selección en el piso
    const def: Array<{ id: ZonaId; x: number; z: number; y: number; r: number; rx?: number; rz?: number }> = [
      { id: 'ventas', x: -15.6, z: 0.4, y: 4.6, r: 5.0, rx: -13.2, rz: -3.0 },
      { id: 'crm', x: -6.2, z: -5.6, y: 6.9, r: 4.4 },
      { id: 'despachos', x: 1.4, z: 1.6, y: 5.6, r: 7.6, rx: 3.2, rz: -2.4 },
      { id: 'inventario', x: 13.8, z: -5.6, y: 5.8, r: 5.6 },
      { id: 'clientes', x: -7.9, z: 15.4, y: 5.0, r: 9.4 },
    ];
    const geoCab = new T.SphereGeometry(0.62, 24, 16);
    const geoPunta = new T.ConeGeometry(0.42, 1.0, 20);
    geoPunta.rotateX(Math.PI);
    const geoOjo = new T.SphereGeometry(0.28, 16, 12);
    for (const d of def) {
      const grupo = this.scene.children.find((o) => o.userData['zona'] === d.id)!;
      const pin = new T.Group();
      const cab = new T.Mesh(geoCab, new T.MeshLambertMaterial({ color: C.acento }));
      const punta = new T.Mesh(geoPunta, cab.material);
      punta.position.y = -0.62;
      cab.add(punta);
      const ojo = new T.Mesh(geoOjo, this.mat(C.blanco));
      ojo.position.set(0, 0.05, 0.42);
      cab.add(ojo);
      const ojo2 = ojo.clone();
      ojo2.position.z = -0.42;
      cab.add(ojo2);
      pin.add(cab);
      pin.position.set(d.x, d.y, d.z);
      grupo.add(pin);

      // Anillo de selección en el piso (como el resaltado del ejemplo)
      const anillo = new T.Mesh(
        new T.RingGeometry(d.r - 0.22, d.r, 72),
        new T.MeshBasicMaterial({ color: C.acento, transparent: true, opacity: 0, depthWrite: false }),
      );
      const relleno = new T.Mesh(
        new T.CircleGeometry(d.r - 0.22, 72),
        new T.MeshBasicMaterial({ color: C.acento, transparent: true, opacity: 0, depthWrite: false }),
      );
      for (const a of [anillo, relleno]) {
        a.rotation.x = -Math.PI / 2;
        a.position.set(d.rx ?? d.x, ALTURA_LOTE + 0.035, d.rz ?? d.z);
        a.visible = false;
        a.renderOrder = 1;
        a.raycast = () => undefined; // no tapan el clic
        this.scene.add(a);
      }
      this.zonas.set(d.id, {
        anillo, relleno, pin, pinCabeza: cab,
        pinBase: pin.position.clone(),
        ancla: new T.Vector3(d.x, d.y + 1.0, d.z),
        visible: false,
      });
      pin.visible = false;
    }
    if (this.estado) this.actualizar(this.estado);
  }
}
