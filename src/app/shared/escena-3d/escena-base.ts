import type * as ThreeNS from 'three';
import type { RoundedBoxGeometry as RoundedBoxCtor } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ==========================================================================
// Base de las escenas 3D de Katuq (bienvenida: maqueta y mapa; pedidos: recorrido).
// Pone lo que es igual en las dos: renderer, cámara orbital propia (sin rueda
// del mouse, en táctil el dedo hace scroll), selección con el puntero, etiquetas
// HTML ancladas a puntos 3D, ~40 fps con pausa fuera de pantalla y limpieza total.
// Cada escena hija solo construye su mundo y dice qué se anima.
// ==========================================================================

export type Three = typeof ThreeNS;
export type RoundedBox = typeof RoundedBoxCtor;

export interface AnclaZona { x: number; y: number; }

export interface OpcionesEscena<Id extends string> {
  canvas: HTMLCanvasElement;
  reducirMovimiento: boolean;
  calidadBaja: boolean;
  onHover: (id: Id | null) => void;
  onClick: (id: Id) => void;
  /** Posición en px (relativa al canvas) de cada etiqueta, después de cada render. */
  onFrame: (anclas: Partial<Record<Id, AnclaZona>>) => void;
  /** Opcional: tocaron un lugar vacío de la escena (sin arrastrar). Sirve para cerrar fichas. */
  onVacio?: () => void;
}

/** Espacio (px) que el contenido debe dejar libre: título, herramientas, franja de etapas, paneles flotantes. */
export interface MargenesEncuadre { t: number; b: number; l: number; r: number; }

/** Márgenes fijos o calculados según el tamaño del recuadro (se reevalúan al redimensionar). */
export type FuenteMargenes = Partial<MargenesEncuadre> | ((ancho: number, alto: number) => Partial<MargenesEncuadre>);

export interface Punto3 { x: number; y: number; z: number; }

/** Encuadre y límites de la cámara de cada escena. */
export interface VistaCamara {
  az: number;
  pol: number;
  centro: { x: number; y: number; z: number };
  /** Altura del punto al que mira la cámara sobre `centro`. */
  mirarY: number;
  limAz: [number, number];
  limPol: [number, number];
  limZoom: [number, number];
  /** Alto del mundo visible según la relación ancho/alto útil (sin el panel). */
  altoMundo: (util: number) => number;
  /** Fracción del alto que la vista se corre hacia arriba (la escena baja). */
  bajada: number;
  fondo: number;
}

export const DEG = Math.PI / 180;

export abstract class EscenaBase<Id extends string> {
  protected renderer!: ThreeNS.WebGLRenderer;
  protected scene!: ThreeNS.Scene;
  protected camera!: ThreeNS.OrthographicCamera;
  protected raycaster!: ThreeNS.Raycaster;
  protected clock!: ThreeNS.Clock;

  protected readonly geoCache = new Map<string, ThreeNS.BufferGeometry>();
  protected readonly matCache = new Map<number, ThreeNS.MeshLambertMaterial>();
  protected readonly texturas: ThreeNS.Texture[] = [];
  protected readonly pickables: ThreeNS.Object3D[] = [];

  protected az: number;
  protected pol: number;
  protected zoom = 1;
  private azObj: number;
  private polObj: number;
  private zoomObj = 1;
  /** Centro actual de la cámara (sigue a `cT` con suavidad; sin foco es `vista.centro`). */
  protected c: Punto3 = { x: 0, y: 0, z: 0 };
  /**
   * Centro objetivo: punto del mundo que la cámara debe tener en el centro del recuadro útil
   * (el que dejan libre los márgenes). null = el encuadre de la escena. Lo mueven la ficha y el
   * orbe; `soltarFoco()` vuelve al encuadre.
   */
  cT: Punto3 | null = null;
  /** Contenido medido por `ajustarAContenido` (en el espacio de la cámara inicial). */
  private ajuste: { bw: number; bh: number; cx: number; cy: number } | null = null;
  private fuenteMargenes: FuenteMargenes = {};
  /** Se soltó un foco y el centro aún regresa suavemente al de la escena. */
  private volviendoDeFoco = false;
  /** Ganchos de quien se cuelga de la escena sin ser parte de ella (el orbe de Opttia). Vacíos = la escena no cambia. */
  private readonly ganchosCuadro = new Set<(t: number, dt: number) => boolean>();
  private readonly ganchosToque = new Set<(x: number, y: number) => boolean>();
  private readonly ganchosArrastre = new Set<() => void>();

  protected ancho = 1;
  protected alto = 1;
  private margenDerecho = 0;
  private raf = 0;
  private ultimoFrame = 0;
  private pausado = false;
  /** Algo cambió fuera del loop y hay que volver a pintar. */
  protected sucio = true;
  protected resaltada: Id | null = null;
  protected hover: Id | null = null;
  private puntero: { x: number; y: number } | null = null;
  private elegirPendiente = false;
  private arrastre: { x: number; y: number; movido: boolean } | null = null;
  private readonly finoPuntero: boolean;
  private vTmp: ThreeNS.Vector3 | null = null;

  /** true = la escena tiene movimiento de ambiente y pinta en cada cuadro. */
  protected abstract readonly animaContinuo: boolean;
  protected abstract readonly vista: VistaCamara;

  constructor(
    protected readonly T: Three,
    protected readonly RoundedBox: RoundedBox,
    protected readonly opts: OpcionesEscena<Id>,
  ) {
    this.finoPuntero = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches;
    this.az = this.azObj = 0;
    this.pol = this.polObj = 0;
  }

  // ------------------------------------------------------------- ganchos

  /** Arma el mundo (luces, piso, objetos). Se llama una vez desde iniciar(). */
  protected abstract construir(): void;

  /**
   * Un cuadro: animar lo propio. `t` queda en 0 con "reducir movimiento".
   * Devuelve true si cambió algo que obliga a pintar aunque la escena no anime sola.
   */
  protected abstract cuadro(t: number, dt: number): boolean;

  /** Puntos del mundo donde van las etiquetas HTML. */
  protected abstract anclas(): Iterable<[Id, ThreeNS.Vector3]>;

  /** Si un id puede elegirse con el puntero (p. ej. zonas que el rol no ve). */
  protected seleccionable(_id: Id): boolean { return true; }

  // -------------------------------------------------------------- ciclo

  /** Crea el renderer. Lanza si el navegador no tiene WebGL. */
  iniciar(): void {
    const T = this.T;
    const v = this.vista;
    this.az = this.azObj = v.az;
    this.pol = this.polObj = v.pol;
    this.c = { x: v.centro.x, y: v.centro.y, z: v.centro.z };
    this.renderer = new T.WebGLRenderer({ canvas: this.opts.canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.opts.calidadBaja ? 1.25 : 1.75));
    this.renderer.setClearColor(v.fondo, 1);
    this.renderer.shadowMap.enabled = !this.opts.calidadBaja;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.scene = new T.Scene();
    this.camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
    this.raycaster = new T.Raycaster();
    this.clock = new T.Clock();
    this.construir();
    this.escucharPuntero();
    this.raf = requestAnimationFrame(this.loop);
  }

  resaltar(id: Id | null): void {
    this.resaltada = id;
    this.sucio = true;
  }

  redimensionar(ancho: number, alto: number, margenDerecho = 0): void {
    if (!this.renderer || ancho < 2 || alto < 2) return;
    this.ancho = ancho;
    this.alto = alto;
    this.margenDerecho = margenDerecho;
    this.renderer.setSize(ancho, alto, false);
    this.encuadrar();
    this.sucio = true;
  }

  pausar(pausado: boolean): void {
    if (this.pausado === pausado) return;
    this.pausado = pausado;
    if (!pausado) {
      this.clock?.getDelta();
      this.sucio = true;
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  acercar(factor: number): void {
    const [min, max] = this.vista.limZoom;
    this.zoomObj = Math.min(max, Math.max(min, this.zoomObj * factor));
  }

  girar(grados: number): void {
    this.azObj = this.limAz(this.azObj + grados * DEG);
  }

  /** Lleva el zoom a un valor (dentro de los límites) con la misma transición suave. */
  zoomA(z: number): void {
    const [min, max] = this.vista.limZoom;
    this.zoomObj = Math.min(max, Math.max(min, z));
  }

  centrar(): void {
    this.azObj = this.vista.az;
    this.polObj = this.vista.pol;
    this.zoomObj = 1;
    if (this.cT) this.volviendoDeFoco = true;
    this.cT = null;
  }

  /** Zoom al que va la cámara (dentro de los límites; se alcanza con la misma transición suave). */
  get zoomObjetivo(): number { return this.zoomObj; }
  set zoomObjetivo(z: number) { this.zoomA(z); }

  /** Lleva la cámara a mirar un punto del mundo (queda en el centro del recuadro útil), con ese zoom. */
  enfocarPunto(punto: Punto3, zoom?: number): void {
    this.cT = { x: punto.x, y: punto.y, z: punto.z };
    if (zoom !== undefined) this.zoomA(zoom);
    this.sucio = true;
  }

  /** Suelta el foco: la cámara vuelve al encuadre de la escena. */
  soltarFoco(): void {
    if (this.cT) this.volviendoDeFoco = true;
    this.cT = null;
    this.zoomObj = 1;
    this.sucio = true;
  }

  // ------------------------------------------------- ganchos para quien se cuelga

  /** La escena de three (para agregarle objetos propios, p. ej. el orbe de Opttia). */
  get raiz(): ThreeNS.Scene { return this.scene; }

  /** Pide pintar el siguiente cuadro (algo cambió fuera del loop). */
  marcarSucio(): void { this.sucio = true; }

  /**
   * Engancha una función al final de cada cuadro (después de `cuadro()`): recibe `t` (0 con "reducir
   * movimiento") y `dt`, y devuelve true si cambió algo que obliga a pintar. Devuelve cómo quitarla.
   */
  alCuadro(gancho: (t: number, dt: number) => boolean): () => void {
    this.ganchosCuadro.add(gancho);
    return () => { this.ganchosCuadro.delete(gancho); };
  }

  /**
   * Engancha un toque (sin arrastrar) con el punto en px del canvas, ANTES de buscar qué objeto de la
   * escena se tocó. Si devuelve true, el toque es suyo y la escena no lo atiende.
   */
  alTocar(gancho: (x: number, y: number) => boolean): () => void {
    this.ganchosToque.add(gancho);
    return () => { this.ganchosToque.delete(gancho); };
  }

  /** Avisa cuando la persona empieza a arrastrar la cámara con el mouse. */
  alArrastrar(gancho: () => void): () => void {
    this.ganchosArrastre.add(gancho);
    return () => { this.ganchosArrastre.delete(gancho); };
  }

  /** true si el punto (px del canvas) cae sobre alguno de esos objetos. */
  golpea(objetos: ThreeNS.Object3D[], x: number, y: number): boolean {
    if (!objetos.length || !this.raycaster) return false;
    const ndc = new this.T.Vector2((x / this.ancho) * 2 - 1, -(y / this.alto) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObjects(objetos, false).length > 0;
  }

  /** Cambia los márgenes del encuadre automático (p. ej. al aparecer o quitarse paneles flotantes). */
  fijarMargenes(margenes: FuenteMargenes): void {
    this.fuenteMargenes = margenes;
    if (this.renderer) this.encuadrar();
    this.sucio = true;
  }

  /**
   * Encuadre automático: mide `puntos` (el contorno de lo que debe verse, en coordenadas del mundo)
   * con la cámara en su ángulo inicial y, desde ahí, cada `redimensionar` fija el frustum para que
   * ese contenido llene el recuadro dejando `margenes` libres (px). Se llama desde `construir()`.
   * Sin llamarlo, la escena usa `vista.altoMundo` como siempre.
   */
  protected ajustarAContenido(puntos: ThreeNS.Vector3[], margenes?: FuenteMargenes): void {
    if (margenes) this.fuenteMargenes = margenes;
    if (!puntos.length) { this.ajuste = null; return; }
    const T = this.T;
    const v = this.vista;
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    const r = 120;
    cam.position.set(
      v.centro.x + r * Math.sin(v.pol) * Math.sin(v.az),
      v.centro.y + r * Math.cos(v.pol),
      v.centro.z + r * Math.sin(v.pol) * Math.cos(v.az),
    );
    cam.lookAt(v.centro.x, v.centro.y + v.mirarY, v.centro.z);
    cam.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const q = new T.Vector3();
    for (const p of puntos) {
      q.copy(p).applyMatrix4(cam.matrixWorldInverse);
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
      y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    this.ajuste = { bw: Math.max(0.01, x1 - x0), bh: Math.max(0.01, y1 - y0), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    if (this.renderer) this.encuadrar();
  }

  destruir(): void {
    cancelAnimationFrame(this.raf);
    this.pausado = true;
    const c = this.opts.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onCancel);
    c.removeEventListener('pointerleave', this.onLeave);
    const geos = new Set<ThreeNS.BufferGeometry>(this.geoCache.values());
    const mats = new Set<ThreeNS.Material>(this.matCache.values());
    this.scene?.traverse((o) => {
      const m = o as ThreeNS.Mesh;
      if (!m.isMesh) return;
      geos.add(m.geometry);
      const mat = m.material as ThreeNS.Material | ThreeNS.Material[];
      (Array.isArray(mat) ? mat : [mat]).forEach((x) => mats.add(x));
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    this.texturas.forEach((t) => t.dispose());
    if (this.renderer) {
      this.renderer.dispose();
      // Chrome limita los contextos WebGL vivos: liberar el de esta vista ya.
      this.renderer.forceContextLoss();
    }
  }

  // --------------------------------------------------------------- loop

  private readonly loop = (ahora: number): void => {
    if (this.pausado) return;
    this.raf = requestAnimationFrame(this.loop);
    if (ahora - this.ultimoFrame < 24) return; // ~40 fps alcanza
    this.ultimoFrame = ahora;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.opts.reducirMovimiento ? 0 : this.clock.elapsedTime;
    const camMovio = this.amortiguarCamara();
    let cambio = this.cuadro(t, dt);
    for (const gancho of this.ganchosCuadro) if (gancho(t, dt)) cambio = true;
    if (this.elegirPendiente && !this.arrastre) {
      this.elegirPendiente = false;
      this.cambiarHover(this.puntero ? this.idEn(this.puntero.x, this.puntero.y) : null);
    }
    const anima = this.animaContinuo && !this.opts.reducirMovimiento;
    if (anima || camMovio || cambio || this.sucio) {
      this.renderer.render(this.scene, this.camera);
      this.emitirAnclas();
      this.sucio = false;
    }
  };

  private amortiguarCamara(): boolean {
    const k = 0.14;
    const dAz = this.azObj - this.az;
    const dPol = this.polObj - this.pol;
    const dZoom = this.zoomObj - this.zoom;
    const meta = this.centroMeta();
    // Sin foco (ni regreso de un foco) el centro es el de la escena tal cual, como siempre.
    const libre = !this.cT && !this.volviendoDeFoco;
    let dCx = 0;
    let dCy = 0;
    let dCz = 0;
    if (libre) {
      this.c.x = meta.x;
      this.c.y = meta.y;
      this.c.z = meta.z;
    } else {
      dCx = meta.x - this.c.x;
      dCy = meta.y - this.c.y;
      dCz = meta.z - this.c.z;
    }
    const centroQuieto = Math.abs(dCx) < 1e-3 && Math.abs(dCy) < 1e-3 && Math.abs(dCz) < 1e-3;
    if (!this.cT && centroQuieto) this.volviendoDeFoco = false;
    const quieto = Math.abs(dAz) < 1e-4 && Math.abs(dPol) < 1e-4 && Math.abs(dZoom) < 1e-4 && centroQuieto;
    if (quieto && !this.sucio) return false;
    this.az += dAz * k;
    this.pol += dPol * k;
    this.zoom += dZoom * k;
    if (!libre) {
      this.c.x += dCx * 0.12;
      this.c.y += dCy * 0.12;
      this.c.z += dCz * 0.12;
    }
    this.posicionarCamara();
    return !quieto;
  }

  /**
   * Centro al que apunta la cámara. Sin foco, el de la escena. Con foco, el que deja el punto `cT`
   * justo en el centro del frustum (el recuadro útil), con la base de la cámara de este instante.
   */
  private centroMeta(): Punto3 {
    const base = this.vista.centro;
    const f = this.cT;
    if (!f) return base;
    const ox = (this.camera.left + this.camera.right) / 2;
    const oy = (this.camera.top + this.camera.bottom) / 2;
    // base de la cámara (lookAt de three): z = hacia la cámara, x = up × z, y = z × x
    const dx = Math.sin(this.pol) * Math.sin(this.az);
    const dy = Math.cos(this.pol);
    const dz = Math.sin(this.pol) * Math.cos(this.az);
    let rx = dz;
    let rz = -dx;
    const lr = Math.hypot(rx, rz) || 1;
    rx /= lr;
    rz /= lr;
    const ux = dy * rz;
    const uy = dz * rx - dx * rz;
    const uz = -dy * rx;
    return {
      x: f.x - ox * rx - oy * ux,
      y: f.y - oy * uy - this.vista.mirarY,
      z: f.z - ox * rz - oy * uz,
    };
  }

  private margenesActuales(): MargenesEncuadre {
    const m = typeof this.fuenteMargenes === 'function' ? this.fuenteMargenes(this.ancho, this.alto) : this.fuenteMargenes;
    return { t: m.t ?? 0, b: m.b ?? 0, l: m.l ?? 0, r: (m.r ?? 0) + this.margenDerecho };
  }

  // ------------------------------------------------------------- cámara

  private limAz(a: number): number {
    const [min, max] = this.vista.limAz;
    return Math.min(max, Math.max(min, a));
  }

  private encuadrar(): void {
    if (this.ajuste) { this.encuadrarAContenido(this.ajuste); return; }
    const aspecto = this.ancho / this.alto;
    const util = Math.max(1, this.ancho - this.margenDerecho) / this.alto;
    const altoMundo = this.vista.altoMundo(util);
    const anchoMundo = altoMundo * aspecto;
    // Correr la escena a la izquierda cuando el panel flota a la derecha.
    const corrimiento = (this.margenDerecho / 2 / this.ancho) * anchoMundo;
    const bajada = altoMundo * this.vista.bajada;
    this.camera.left = -anchoMundo / 2 + corrimiento;
    this.camera.right = anchoMundo / 2 + corrimiento;
    this.camera.top = altoMundo / 2 + bajada;
    this.camera.bottom = -altoMundo / 2 + bajada;
    this.posicionarCamara();
  }

  /** El contenido medido llena el recuadro útil: sin taparse con título, herramientas, franja ni paneles. */
  private encuadrarAContenido(A: { bw: number; bh: number; cx: number; cy: number }): void {
    const m = this.margenesActuales();
    const s = Math.max(
      A.bw / Math.max(60, this.ancho - m.l - m.r),
      A.bh / Math.max(60, this.alto - m.t - m.b),
    );
    const W = s * this.ancho;
    const H = s * this.alto;
    const ox = A.cx + ((m.r - m.l) / 2) * s;
    const oy = A.cy + ((m.t - m.b) / 2) * s;
    this.camera.left = ox - W / 2;
    this.camera.right = ox + W / 2;
    this.camera.top = oy + H / 2;
    this.camera.bottom = oy - H / 2;
    this.posicionarCamara();
  }

  private posicionarCamara(): void {
    const r = 120;
    const { x, y, z } = this.c;
    this.camera.position.set(
      x + r * Math.sin(this.pol) * Math.sin(this.az),
      y + r * Math.cos(this.pol),
      z + r * Math.sin(this.pol) * Math.cos(this.az),
    );
    this.camera.zoom = this.zoom;
    this.camera.lookAt(x, y + this.vista.mirarY, z);
    this.camera.updateProjectionMatrix();
  }

  private emitirAnclas(): void {
    const v = this.vTmp ?? (this.vTmp = new this.T.Vector3());
    const out: Partial<Record<Id, AnclaZona>> = {};
    for (const [id, p] of this.anclas()) {
      v.copy(p).project(this.camera);
      out[id] = { x: (v.x + 1) / 2 * this.ancho, y: (1 - v.y) / 2 * this.alto };
    }
    this.opts.onFrame(out);
  }

  // ------------------------------------------------------------- puntero

  private escucharPuntero(): void {
    const c = this.opts.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onCancel);
    c.addEventListener('pointerleave', this.onLeave);
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.arrastre = { x: e.clientX, y: e.clientY, movido: false };
    // Solo con mouse se gira arrastrando; en táctil el dedo hace scroll de la página.
    if (this.finoPuntero && e.pointerType === 'mouse') this.opts.canvas.setPointerCapture?.(e.pointerId);
  };

  private readonly onMove = (e: PointerEvent): void => {
    const rect = this.opts.canvas.getBoundingClientRect();
    this.puntero = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.elegirPendiente = e.pointerType === 'mouse';
    const a = this.arrastre;
    if (!a || e.pointerType !== 'mouse') return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!a.movido && Math.hypot(dx, dy) < 5) return;
    a.movido = true;
    this.ganchosArrastre.forEach((g) => g());
    this.opts.canvas.style.cursor = 'grabbing';
    const [pMin, pMax] = this.vista.limPol;
    this.azObj = this.limAz(this.azObj - dx * 0.006);
    this.polObj = Math.min(pMax, Math.max(pMin, this.polObj - dy * 0.004));
    a.x = e.clientX;
    a.y = e.clientY;
  };

  private readonly onUp = (e: PointerEvent): void => {
    const a = this.arrastre;
    this.arrastre = null;
    if (this.opts.canvas.hasPointerCapture?.(e.pointerId)) this.opts.canvas.releasePointerCapture(e.pointerId);
    if (a && !a.movido) {
      const rect = this.opts.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      let tomado = false;
      for (const gancho of this.ganchosToque) { if (gancho(px, py)) { tomado = true; break; } }
      if (!tomado) {
        const id = this.idEn(px, py);
        if (id) this.opts.onClick(id);
        else this.opts.onVacio?.();
      }
    }
    if (e.pointerType !== 'mouse') this.puntero = null; // en táctil no hay "hover" que seguir
    this.opts.canvas.style.cursor = this.hover ? 'pointer' : '';
  };

  private readonly onCancel = (): void => { this.arrastre = null; };

  private readonly onLeave = (): void => {
    this.puntero = null;
    if (!this.arrastre) this.cambiarHover(null);
  };

  /** Id del objeto bajo el punto (busca `userData.zona` subiendo por los padres). */
  private idEn(x: number, y: number): Id | null {
    const ndc = new this.T.Vector2((x / this.ancho) * 2 - 1, -(y / this.alto) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    for (const h of this.raycaster.intersectObjects(this.pickables, true)) {
      let o: ThreeNS.Object3D | null = h.object;
      while (o && !o.userData['zona']) o = o.parent;
      const id = o?.userData['zona'] as Id | undefined;
      if (id && this.seleccionable(id)) return id;
    }
    return null;
  }

  private cambiarHover(id: Id | null): void {
    if (id === this.hover) return;
    this.hover = id;
    this.opts.canvas.style.cursor = id ? 'pointer' : '';
    this.opts.onHover(id);
    this.sucio = true;
  }

  // ---------------------------------------------------------- utilidades

  protected mat(color: number): ThreeNS.MeshLambertMaterial {
    let m = this.matCache.get(color);
    if (!m) {
      m = new this.T.MeshLambertMaterial({ color });
      this.matCache.set(color, m);
    }
    return m;
  }

  protected geoCaja(w: number, h: number, d: number, r = 0): ThreeNS.BufferGeometry {
    const k = `b|${w}|${h}|${d}|${r}`;
    let g = this.geoCache.get(k);
    if (!g) {
      g = r > 0 ? new this.RoundedBox(w, h, d, 2, r) : new this.T.BoxGeometry(w, h, d);
      this.geoCache.set(k, g);
    }
    return g;
  }

  /** Caja apoyada: `y` es la base, no el centro. */
  protected caja(
    padre: ThreeNS.Object3D, w: number, h: number, d: number, color: number,
    x: number, y: number, z: number, r = 0, sombra = true,
  ): ThreeNS.Mesh {
    const m = new this.T.Mesh(this.geoCaja(w, h, d, r), this.mat(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = sombra;
    m.receiveShadow = true;
    padre.add(m);
    return m;
  }

  protected cilindro(
    padre: ThreeNS.Object3D, rad: number, h: number, color: number,
    x: number, y: number, z: number, segmentos = 16,
  ): ThreeNS.Mesh {
    const k = `c|${rad}|${h}|${segmentos}`;
    let g = this.geoCache.get(k);
    if (!g) {
      g = new this.T.CylinderGeometry(rad, rad, h, segmentos);
      this.geoCache.set(k, g);
    }
    const m = new this.T.Mesh(g, this.mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    padre.add(m);
    return m;
  }

  protected esfera(padre: ThreeNS.Object3D, r: number, color: number, x: number, y: number, z: number): ThreeNS.Mesh {
    const k = `s|${r}`;
    let geo = this.geoCache.get(k);
    if (!geo) {
      geo = new this.T.IcosahedronGeometry(r, 1);
      this.geoCache.set(k, geo);
    }
    const m = new this.T.Mesh(geo, this.mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    padre.add(m);
    return m;
  }

  protected texturaTexto(texto: string, color: string, fondo: string, w = 512, h = 128, peso = 800): ThreeNS.Texture {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = `${peso} ${Math.round(h * 0.56)}px Georama, "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, w / 2, h / 2 + h * 0.03);
    return this.registrarTextura(new this.T.CanvasTexture(cv));
  }

  protected registrarTextura<Tx extends ThreeNS.Texture>(tex: Tx): Tx {
    tex.colorSpace = this.T.SRGBColorSpace;
    tex.anisotropy = 4;
    this.texturas.push(tex);
    return tex;
  }

  /** Libera una textura que se dejó de usar (p. ej. al cambiar un logo). */
  protected liberarTextura(tex: ThreeNS.Texture | null | undefined): void {
    if (!tex) return;
    tex.dispose();
    const i = this.texturas.indexOf(tex);
    if (i >= 0) this.texturas.splice(i, 1);
  }

  /** Grupo seleccionable: todo lo que cuelgue de él responde al puntero con este id. */
  protected grupoSeleccionable(id: Id, padre?: ThreeNS.Object3D): ThreeNS.Group {
    const g = new this.T.Group();
    g.userData['zona'] = id;
    (padre ?? this.scene).add(g);
    this.pickables.push(g);
    return g;
  }
}
