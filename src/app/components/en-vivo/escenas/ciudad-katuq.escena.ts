import type * as ThreeNS from 'three';
import { DEG, EscenaBase, OpcionesEscena, RoundedBox, Three, VistaCamara } from '../../../shared/escena-3d/escena-base';
import {
  AlertaRadar,
  CifrasGlobalEnVivo,
  EtapaInfo,
  EventoEnVivo,
  EventoSalida,
  tonoCss,
} from '../servicios/en-vivo.modelos';
import { dinero, dineroCorto } from '../utilidades/formato';
import { esOscuro } from './escena-tokens';
import { EtiquetaH, GestorEtiquetas, esc } from './etiquetas-html';
import { OpcionesEscenaMapa, ToqueMapa } from './mapas.tipos';
import { NucleoEscena, svgEscena } from './nucleo-escena';
import {
  AgrupadorSalidas,
  ComercioDibujo,
  MAX_EDIFICIOS,
  alertasPorComercio,
  alturaEdificio,
  asignarLotes,
  claveDeSalida,
  letreroDe,
  nombreDeLugar,
  nombreOculto,
  nombreVisible,
  ordenarPorVentas,
  prepararComercios,
  resolverDane,
  valorDeAltura,
} from './pais.utilidades';
import { ease } from './tweens';

// ==========================================================================
// Escena "Ciudad Katuq" (D-386, tareas 5.10 y 5.12): una ciudad con un edificio por comercio (los
// 16 que más venden hoy). El edificio crece con lo vendido, lleva un letrero con "N pedidos hoy",
// recibe una caja en el techo con cada pedido nuevo, saca una moto o un camión con cada salida y
// muestra un anillo de alerta si el radar lo señala. Tocar un edificio abre el tablero de ese
// comercio. Solo lectura. Referencia exacta de look y movimiento: el prototipo (`crearCiudadKatuq`).
// ==========================================================================

type V3 = ThreeNS.Vector3;

const N = 4;
const PASO = 6.6;
const MED = (N * PASO) / 2;
const LADO = N * PASO + 1.6;
const ALTO_BASE = 2.8;
const MAX_VEHICULOS = 10;

interface Lote {
  slot: number;
  g: ThreeNS.Group;
  /** Todo lo que se ve cuando el lote tiene comercio. */
  ed: ThreeNS.Group;
  cuerpo: ThreeNS.Mesh;
  techo: ThreeNS.Mesh;
  toldo: ThreeNS.Mesh;
  alerta: ThreeNS.Mesh;
  cx: number;
  cz: number;
  c: ComercioDibujo | null;
  h: number;
  objetivo: number;
  bump: number;
  pintado: string | null;
  alertaTono: string | null;
  letrero: { pintar: () => void } | null;
}

export interface DiagnosticoCiudad {
  edificios: number;
  conAlerta: number;
  cajas: number;
  vehiculos: number;
  efectos: number;
  tweens: number;
  etiquetas: number;
  tarjetas: number;
}

export class CiudadKatuqEscena extends EscenaBase<string> {
  protected readonly animaContinuo = false;
  protected readonly vista: VistaCamara = {
    az: 38 * DEG,
    pol: 52 * DEG,
    centro: { x: 0, y: 1.4, z: 0.6 },
    mirarY: 0,
    limAz: [-10 * DEG, 85 * DEG],
    limPol: [30 * DEG, 66 * DEG],
    limZoom: [0.75, 2.4],
    altoMundo: (util) => Math.max(27, 38 / Math.max(util, 0.55)),
    bajada: 0.04,
    fondo: 0xe9e5f8,
  };

  static crear(T: Three, RB: RoundedBox, o: OpcionesEscenaMapa): CiudadKatuqEscena {
    const ref: { esc: CiudadKatuqEscena | null } = { esc: null };
    const nucleo = new NucleoEscena(
      { etiquetas: o.etiquetas, reducirMovimiento: o.reducirMovimiento, tokens: o.tokens },
      {
        enfocar: (x, y, z, zoom) => ref.esc?.enfocarPunto({ x, y, z }, zoom),
        soltar: () => ref.esc?.soltarFoco(),
        girar: (rad) => ref.esc?.girar(rad / DEG),
      },
    );
    const base: OpcionesEscena<string> = {
      canvas: o.canvas,
      reducirMovimiento: o.reducirMovimiento,
      calidadBaja: o.calidadBaja,
      onHover: (id) => ref.esc?.alHover(id),
      onClick: (id) => ref.esc?.alClick(id),
      onFrame: (a) => nucleo.posicionar(a, ref.esc?.ancho ?? 1, ref.esc?.alto ?? 1),
      onVacio: () => o.onVacio?.(),
    };
    const escena = new CiudadKatuqEscena(T, RB, base, o, nucleo);
    ref.esc = escena;
    return escena;
  }

  // ---- estado
  private readonly lotes: Lote[] = [];
  private readonly lotePorEmpresa = new Map<string, Lote>();
  private slots = new Map<string, number>();
  private comercios: ComercioDibujo[] = [];
  private alertas = new Map<string, string>();
  private readonly cajas = new Set<ThreeNS.Object3D>();
  private readonly vehiculos = new Set<ThreeNS.Group>();
  private readonly salidas = new AgrupadorSalidas<EventoSalida>();
  private anillo: ThreeNS.Mesh | null = null;
  private empresaResaltada: string | null = null;
  private hoverEmpresa: string | null = null;
  private luces: { hemi: ThreeNS.HemisphereLight; sol: ThreeNS.DirectionalLight } | null = null;

  private constructor(
    T: Three,
    RB: RoundedBox,
    base: OpcionesEscena<string>,
    private readonly cfg: OpcionesEscenaMapa,
    private readonly nucleo: NucleoEscena,
  ) {
    super(T, RB, base);
  }

  // =========================================================== API pública

  fijarEtapas(etapas: ReadonlyArray<EtapaInfo>): void {
    this.nucleo.fijarEtapas(etapas);
  }

  /** "Ocultar comercios y montos": los letreros dicen "Comercio en <ciudad>" y la altura sigue los pedidos, no el dinero. */
  fijarPrivado(privado: boolean): void {
    if (this.nucleo.privado === privado) return;
    this.nucleo.privado = privado;
    this.actualizarLotes();
    this.mostrarResalte(this.empresaResaltada ?? this.hoverEmpresa);
    this.sucio = true;
  }

  fijarReducirMovimiento(reducir: boolean): void {
    this.opts.reducirMovimiento = reducir;
    this.nucleo.fijarReducirMovimiento(reducir);
    this.sucio = true;
  }

  fijarAutomatica(activa: boolean): void {
    this.nucleo.camara.fijar(activa);
  }

  /** Pone los edificios al día con las cifras de toda Katuq (los 16 que más venden). Se llama al cargar y con cada cifra nueva. */
  aplicarFoto(cifras: CifrasGlobalEnVivo, alertas?: ReadonlyArray<AlertaRadar> | null): void {
    this.comercios = ordenarPorVentas(prepararComercios(this.cfg.geo, cifras.comercios ?? [])).slice(0, MAX_EDIFICIOS);
    this.alertas = alertasPorComercio(alertas, this.comercios, (t) => tonoCss(t));
    this.asignar();
    this.sucio = true;
  }

  /**
   * Anima un evento de toda Katuq sobre el edificio del comercio. Con `contar`, además suma el pedido
   * a su edificio (lo usa "Repetir el día": sus eventos simulados no pasan por las cifras).
   */
  aplicarEvento(ev: EventoEnVivo, contar = false): void {
    const empresa = ev.comercio?.empresa ?? ev.empresa ?? '';
    const ahora = performance.now();
    const ligero = this.nucleo.rafaga.registrar(ahora);
    if (contar && ev.tipo === 'pedido_nuevo') this.contarPedido(empresa, ev.monto ?? 0);
    const l = this.lotePorEmpresa.get(empresa);
    if (!l || !l.c) { this.sucio = true; return; }
    switch (ev.tipo) {
      case 'pedido_nuevo': this.hacerLlegada(l, ev, ligero); break;
      case 'cambio_estado': this.nucleo.fx.pulso(this.kit.v(l.cx, l.cz + 1.6, 0.16), this.nucleo.tonoDeEtapa(ev.etapaNueva), 1.0, 0.8); break;
      case 'salida': this.salidas.agregar(claveDeSalida(empresa, ev.tipoTransportador, ev.transportador), ev, ahora); break;
      case 'entregado':
        this.nucleo.fx.pulso(this.kit.v(l.cx, l.cz, 0.16), 'ok', 2.6, 1.1);
        if (!ligero && Math.random() < 0.2) this.nucleo.fx.confeti(this.cima(l, 0.4).clone());
        break;
      case 'rechazado':
      case 'cancelado': this.nucleo.fx.pulso(this.kit.v(l.cx, l.cz, 0.16), 'bad', 2.0, 0.9); break;
      default: break;
    }
    this.sucio = true;
  }

  override resaltar(ids: string | string[] | null): void {
    const id = ids === null ? null : Array.isArray(ids) ? ids[0] ?? null : ids;
    this.empresaResaltada = id;
    this.mostrarResalte(id ?? this.hoverEmpresa);
    this.sucio = true;
  }

  /** Quita lo que estaba animándose (cajas, vehículos, efectos, tarjetas) sin tocar los edificios: al volver a la pestaña. */
  soltarEfectos(): void {
    this.salidas.limpiar();
    this.nucleo.limpiar();
    this.cajas.forEach((b) => this.scene.remove(b));
    this.cajas.clear();
    this.vehiculos.forEach((v) => this.scene.remove(v));
    this.vehiculos.clear();
    this.mostrarResalte(this.empresaResaltada ?? this.hoverEmpresa);
    this.sucio = true;
  }

  /** Deja los edificios en su altura mínima y sin cajas ni vehículos: el punto de partida de "Repetir el día". */
  reiniciar(): void {
    this.soltarEfectos();
    this.comercios = this.comercios.map((c) => ({ ...c, n: 0, ventas: 0 }));
    this.alertas = new Map();
    this.asignar();
    this.empresaResaltada = null;
    this.mostrarResalte(null);
    this.sucio = true;
  }

  retema(): void {
    this.nucleo.kit.retemar();
    this.aplicarLuces();
    this.renderer.setClearColor(this.nucleo.tokens['scene-bg'], 1);
    this.lotes.forEach((l) => { this.colorearLote(l); });
    this.sucio = true;
  }

  /** El gestor de etiquetas HTML de la escena (el orbe de Opttia pone ahí su burbuja). */
  get gestorEtiquetas(): GestorEtiquetas {
    return this.nucleo.etq;
  }

  /** Centro del lote de un comercio (suelo); null si no tiene edificio. Para el orbe y la ficha. */
  posComercio(empresa: string): V3 | null {
    const l = this.lotePorEmpresa.get(empresa);
    return l ? this.kit.v(l.cx, l.cz) : null;
  }

  empresasConEdificio(): string[] {
    return this.comercios.map((c) => c.empresa).filter((e) => this.lotePorEmpresa.has(e));
  }

  diagnostico(): DiagnosticoCiudad {
    let conAlerta = 0;
    this.lotes.forEach((l) => { if (l.alertaTono) conAlerta++; });
    return {
      edificios: this.lotePorEmpresa.size,
      conAlerta,
      cajas: this.cajas.size,
      vehiculos: this.vehiculos.size,
      efectos: this.nucleo.fx.activos,
      tweens: this.nucleo.tw.cantidad,
      etiquetas: this.nucleo.etq.cantidad,
      tarjetas: this.nucleo.etq.popsVivos,
    };
  }

  /** Altura objetivo del edificio de un comercio (para las pruebas de las escalas). */
  alturaDe(empresa: string): number | null {
    return this.lotePorEmpresa.get(empresa)?.objetivo ?? null;
  }

  override destruir(): void {
    this.nucleo.destruir();
    super.destruir();
  }

  // ======================================================= ganchos de la base

  private get kit(): NucleoEscena['kit'] {
    return this.nucleo.kit;
  }

  protected construir(): void {
    this.nucleo.armar(this.T, this.geoCache, this.scene, (tex) => this.registrarTextura(tex));
    this.renderer.setClearColor(this.kit.tokens['scene-bg'], 1);
    this.crearLuces();
    this.crearPlataforma();
    this.crearLotes();
    const g = new this.T.RingGeometry(2.55, 2.8, 48);
    this.geoCache.set('anillo-lote', g);
    const a = new this.T.Mesh(g, this.kit.basico('accent', 0.95));
    a.rotation.x = -Math.PI / 2;
    a.visible = false;
    this.scene.add(a);
    this.anillo = a;
    // encuadre: la plataforma completa y los edificios en su altura máxima
    const pts: V3[] = [];
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        pts.push(
          this.kit.v(x * (LADO / 2 + 0.6), z * (LADO / 2 + 0.6), -0.9),
          this.kit.v(x * (MED - PASO / 2 + 1.8), z * (MED - PASO / 2 + 1.6), 6.9),
        );
      }
    }
    this.ajustarAContenido(pts, (ancho) => (ancho < 520 ? { t: 66, b: 100, l: 8, r: 50 } : { t: 76, b: 116, l: 18, r: 62 }));
    this.asignar();
  }

  protected cuadro(t: number, dt: number): boolean {
    const ahora = performance.now();
    let cambio = this.nucleo.paso(dt);
    this.salidas.sacar(ahora).forEach((g) => this.hacerSalida(g.items));
    const reducir = this.opts.reducirMovimiento;
    for (const l of this.lotes) {
      if (!l.c) continue;
      const h = l.h + (l.objetivo - l.h) * Math.min(1, dt * 3);
      const bump = Math.max(0, l.bump - dt * 2.2);
      if (Math.abs(h - l.h) > 0.0005 || bump !== l.bump || l.bump > 0) {
        l.h = h;
        l.bump = bump;
        const s = 1 + Math.sin(bump * Math.PI) * 0.06;
        l.cuerpo.scale.set(s, h, s);
        l.cuerpo.position.y = 0.14 + h / 2;
        l.techo.position.y = 0.14 + h + 0.15;
        l.techo.scale.set(s, 1, s);
        cambio = true;
      }
      if (l.alerta.visible) {
        const k = reducir ? 0.5 : (t * 1.1) % 1;
        l.alerta.scale.setScalar(1 + k * 0.25);
        (l.alerta.material as ThreeNS.MeshBasicMaterial).opacity = 0.95 * (1 - k);
        if (!reducir) cambio = true;
      }
    }
    if (this.anillo?.visible) {
      this.anillo.scale.setScalar(1 + (reducir ? 0 : Math.sin(t * 5) * 0.03));
      if (!reducir) cambio = true;
    }
    this.nucleo.camara.paso(t, ahora, reducir);
    if (this.nucleo.etq.expirar(ahora)) cambio = true;
    return cambio || this.salidas.cantidad > 0;
  }

  protected anclas(): Iterable<[string, V3]> {
    return this.nucleo.etq.anclas();
  }

  // ============================================================== mundo

  private crearLuces(): void {
    const T = this.T;
    const hemi = new T.HemisphereLight(0xffffff, 0xd6cef5, 1.95);
    const sol = new T.DirectionalLight(0xffffff, 1.6);
    sol.position.set(-16, 30, 20);
    if (!this.opts.calidadBaja) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      const c = sol.shadow.camera;
      c.left = -28; c.right = 28; c.top = 28; c.bottom = -28; c.near = 1; c.far = 100;
      sol.shadow.bias = -0.0006;
    }
    this.scene.add(hemi, sol, sol.target);
    this.luces = { hemi, sol };
    this.aplicarLuces();
  }

  private aplicarLuces(): void {
    if (!this.luces) return;
    const o = esOscuro(this.kit.tokens);
    this.luces.hemi.color.set(o ? '#CFC8FF' : '#FFFFFF');
    this.luces.hemi.groundColor.set(o ? '#1B1838' : '#D6CEF5');
    this.luces.hemi.intensity = o ? 1.6 : 1.95;
    this.luces.sol.intensity = o ? 1.35 : 1.6;
  }

  private crearPlataforma(): void {
    const k = this.kit;
    const sc = this.scene;
    k.malla(k.gRbox(LADO + 1.2, 0.9, LADO + 1.2, 1.1), [k.mt('scene-plat'), k.mt('scene-plat-side')], sc, 0, -0.45, 0, false);
    for (let i = 0; i <= N; i++) {
      const s = -MED + i * PASO;
      k.malla(k.gCaja(LADO, 0.05, 1.5), k.mt('scene-road'), sc, 0, 0.025, s, false);
      k.malla(k.gCaja(1.5, 0.05, LADO), k.mt('scene-road'), sc, s, 0.026, 0, false);
      for (let c = 0; c < N; c++) {
        const c0 = -MED + c * PASO;
        for (let x = c0 + 1.6; x < c0 + PASO - 1.2; x += 1.5) {
          k.malla(k.gCaja(0.7, 0.02, 0.1), k.mt('scene-mark'), sc, x, 0.06, s, false);
          k.malla(k.gCaja(0.1, 0.02, 0.7), k.mt('scene-mark'), sc, s, 0.061, x, false);
        }
      }
    }
  }

  /** Los 16 lotes: cada uno con su pasto, su árbol y su edificio (que solo se ve con un comercio asignado). */
  private crearLotes(): void {
    const k = this.kit;
    const T = this.T;
    for (let idx = 0; idx < MAX_EDIFICIOS; idx++) {
      const col = idx % N;
      const fila = Math.floor(idx / N);
      const cx = -MED + PASO / 2 + col * PASO;
      const cz = -MED + PASO / 2 + fila * PASO;
      const g = new T.Group();
      g.position.set(cx, 0, cz);
      this.scene.add(g);
      k.malla(k.gRbox(PASO - 1.7, 0.14, PASO - 1.7, 0.45), k.mt('scene-walk'), g, 0, 0.07, 0, false);
      k.malla(k.gCil(0.1, 0.12, 0.5), k.mt('scene-trunk'), g, 2.0, 0.39, 1.95);
      k.malla(k.gEsf(0.5), k.mt('scene-tree'), g, 2.0, 1.0, 1.95);
      const ed = new T.Group();
      ed.visible = false;
      g.add(ed);
      const zf = -0.35 + 1.35 + 0.03;
      const cuerpo = k.malla(k.gCaja(3.3, 1, 2.7), k.mt('scene-wall'), ed, 0, 1.54, -0.35);
      const techo = k.malla(k.gRbox(3.6, 0.3, 3.0, 0.12), k.mt('accent'), ed, 0, 3.1, -0.35);
      k.malla(k.gCaja(0.7, 1.1, 0.05), k.mt('scene-wheel'), ed, -0.95, 0.69, zf, false);
      k.malla(k.gCaja(1.5, 0.85, 0.05), k.mt('scene-glass'), ed, 0.55, 0.86, zf, false);
      const toldo = k.malla(k.gCaja(3.4, 0.12, 0.7), k.mt('accent'), ed, 0, 1.52, zf + 0.33);
      const lote: Lote = {
        slot: idx, g, ed, cuerpo, techo, toldo,
        alerta: null as unknown as ThreeNS.Mesh, cx, cz, c: null,
        h: ALTO_BASE, objetivo: ALTO_BASE, bump: 0, pintado: null, alertaTono: null, letrero: null,
      };
      const letrero = k.letrero(512, 160, (ctx, w, h) => this.dibujarLetrero(lote, ctx, w, h));
      lote.letrero = letrero;
      let geoCartel = this.geoCache.get('cartel-lote');
      if (!geoCartel) { geoCartel = new T.PlaneGeometry(3.0, 0.94); this.geoCache.set('cartel-lote', geoCartel); }
      const cartel = new T.Mesh(geoCartel, new T.MeshBasicMaterial({ map: letrero.tex }));
      cartel.position.set(0, 2.16, zf + 0.01);
      ed.add(cartel);
      let geoAlerta = this.geoCache.get('alerta-lote');
      if (!geoAlerta) { geoAlerta = new T.RingGeometry(2.62, 2.98, 48); this.geoCache.set('alerta-lote', geoAlerta); }
      const alerta = new T.Mesh(geoAlerta, k.basico('bad', 0.9));
      alerta.rotation.x = -Math.PI / 2;
      alerta.position.y = 0.19;
      alerta.visible = false;
      g.add(alerta);
      lote.alerta = alerta;
      ed.userData['zona'] = '';
      this.lotes.push(lote);
    }
  }

  private dibujarLetrero(l: Lote, ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const tokens = this.kit.tokens;
    ctx.fillStyle = l.c ? tokens[l.c.tono] ?? '#5F3FE0' : tokens['scene-trim'];
    ctx.fillRect(0, 0, w, h);
    if (!l.c) return;
    ctx.fillStyle = esOscuro(tokens) ? '#14112B' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nombre = this.nucleo.privado ? nombreOculto(l.c.ciudad).toUpperCase() : letreroDe(l.c.nombre);
    let fs = Math.round(h * 0.42);
    const fam = 'Georama, "Segoe UI", system-ui, sans-serif';
    ctx.font = `900 ${fs}px ${fam}`;
    while (ctx.measureText(nombre).width > w * 0.9 && fs > 20) { fs -= 2; ctx.font = `900 ${fs}px ${fam}`; }
    ctx.fillText(nombre, w / 2, h * 0.38);
    ctx.font = `700 ${Math.round(h * 0.21)}px ${fam}`;
    ctx.fillText(`${l.c.n} ${l.c.n === 1 ? 'pedido' : 'pedidos'} hoy`, w / 2, h * 0.77);
  }

  private cima(l: Lote, extra: number): V3 {
    return this.kit.v(l.cx, l.cz - 0.35, l.h + 0.14 + extra);
  }

  /** Tiñe el edificio con el tono de su comercio (el techo y el toldo). */
  private colorearLote(l: Lote): void {
    if (!l.c) return;
    l.techo.material = this.kit.mt(l.c.tono);
    l.toldo.material = this.kit.mt(l.c.tono);
  }

  // ============================================================== datos

  /** Reparte los comercios en los lotes y pone altura, letrero y alerta de cada uno. */
  private asignar(): void {
    if (!this.lotes.length) return;
    this.slots = asignarLotes(this.slots, this.comercios);
    const porSlot = new Map<number, ComercioDibujo>();
    this.comercios.forEach((c) => { const s = this.slots.get(c.empresa); if (s !== undefined) porSlot.set(s, c); });
    this.lotePorEmpresa.clear();
    this.lotes.forEach((l) => {
      const c = porSlot.get(l.slot) ?? null;
      const cambio = (l.c?.empresa ?? null) !== (c?.empresa ?? null);
      l.c = c;
      if (!c) {
        l.ed.visible = false;
        this.quitarPickable(l);
        l.alertaTono = null;
        l.alerta.visible = false;
        l.pintado = null;
        return;
      }
      this.lotePorEmpresa.set(c.empresa, l);
      if (cambio) {
        l.h = ALTO_BASE;
        l.pintado = null;
        l.ed.visible = true;
        l.ed.userData['zona'] = 'k:' + c.empresa;
        if (this.pickables.indexOf(l.ed) < 0) this.pickables.push(l.ed);
        this.colorearLote(l);
      }
    });
    this.actualizarLotes();
  }

  private quitarPickable(l: Lote): void {
    l.ed.userData['zona'] = '';
    const i = this.pickables.indexOf(l.ed);
    if (i >= 0) this.pickables.splice(i, 1);
  }

  /** Alturas, letreros y alertas según los comercios que hay y la privacidad. */
  private actualizarLotes(): void {
    let max = 1;
    this.lotes.forEach((l) => { if (l.c) max = Math.max(max, valorDeAltura(l.c, this.nucleo.privado)); });
    this.lotes.forEach((l) => {
      if (!l.c) return;
      l.objetivo = alturaEdificio(valorDeAltura(l.c, this.nucleo.privado), max);
      const tono = this.alertas.get(l.c.empresa) ?? null;
      l.alertaTono = tono;
      l.alerta.visible = !!tono;
      if (tono) {
        const m = l.alerta.material as ThreeNS.MeshBasicMaterial;
        m.userData['token'] = tono;
        m.color.set(this.kit.tokens[tono] ?? '#ff00ff');
      }
      const marca = `${l.c.empresa}|${l.c.n}|${this.nucleo.privado}`;
      if (l.pintado !== marca) { l.pintado = marca; l.letrero?.pintar(); }
    });
  }

  private contarPedido(empresa: string, monto: number): void {
    const i = this.comercios.findIndex((c) => c.empresa === empresa);
    if (i < 0) return;
    this.comercios[i] = { ...this.comercios[i], n: this.comercios[i].n + 1, ventas: this.comercios[i].ventas + monto };
    const l = this.lotePorEmpresa.get(empresa);
    if (l) l.c = this.comercios[i];
    this.actualizarLotes();
  }

  // ============================================================== eventos

  private monto(m: number | null | undefined): string {
    return this.nucleo.privado || !m ? '' : dinero(m);
  }

  /** Pedido nuevo: un haz cae sobre el edificio, una caja rebota en su techo y se desvanece; sale una tarjeta. */
  private hacerLlegada(l: Lote, ev: Extract<EventoEnVivo, { tipo: 'pedido_nuevo' }>, ligero: boolean): void {
    const c = l.c;
    if (!c) return;
    const k = this.kit;
    const techo = l.h + 0.14 + 0.3;
    const sobre = k.v(l.cx, l.cz - 0.35, techo);
    this.nucleo.fx.haz(sobre, c.tono, 10, 1.2);
    if (ev.ia) this.nucleo.fx.haz(sobre, 'pack', 13, 1.6);
    if (ligero) { l.bump = 1; return; }
    if (!this.nucleo.reducir) {
      const b = k.malla(k.gRbox(0.8, 0.66, 0.8, 0.1), k.mt('box'), this.scene, l.cx, 11, l.cz - 0.35);
      this.cajas.add(b);
      this.nucleo.tw.agregar(0.85, (u) => { b.position.y = 11 + (techo + 0.33 - 11) * ease.bounce(u); }, () => {
        l.bump = 1;
        this.nucleo.fx.pulso(k.v(l.cx, l.cz, 0.16), c.tono, 2.2, 1.0);
        this.nucleo.tw.agregar(0.3, (u) => { b.scale.setScalar(Math.max(0.001, 1 - u)); b.position.y -= 0.02; }, () => {
          this.scene.remove(b);
          this.cajas.delete(b);
        }, b);
      }, b);
    } else l.bump = 1;
    const venta = ev.etapa === 'entregado';
    const dane = resolverDane(this.cfg.geo, ev.dane, ev.ciudad);
    const donde = venta ? 'Punto de venta' : `Cliente en ${nombreDeLugar(this.cfg.geo, dane, ev.ciudad)}`;
    const nombre = nombreVisible(c.nombre, c.ciudad, this.nucleo.privado);
    const pos = this.cima(l, 1.0);
    const hizo = this.nucleo.tarjeta(
      () => pos,
      ev.ia ? 'pack' : c.tono,
      ev.ia ? 'Con Opttia' : venta ? 'Venta en tienda' : 'Nuevo pedido',
      `<span class="eve-who">${esc(nombre)}</span><span class="eve-amt">${esc(this.monto(ev.monto))}</span><small>${esc(donde)}</small>`,
      3400,
    );
    if (hizo) this.nucleo.camara.enfocar(l.cx, 0, l.cz, 1.35, performance.now(), this.opts.reducirMovimiento);
  }

  /** Un vehículo (moto o camión) con las salidas agrupadas sale del edificio por la calle de enfrente. */
  private hacerSalida(evs: EventoSalida[]): void {
    const primero = evs[0];
    if (!primero) return;
    const empresa = primero.comercio?.empresa ?? primero.empresa ?? '';
    const l = this.lotePorEmpresa.get(empresa);
    if (!l || !l.c || this.vehiculos.size >= MAX_VEHICULOS) return;
    const camion = primero.tipoTransportador === 'transportadora';
    const n = evs.length;
    const etiqueta = `${svgEscena(camion ? 'camion' : 'moto')}${n} ${n === 1 ? 'pedido' : 'pedidos'}`;
    const veh = this.crearVehiculo(l.c, camion);
    const z = l.cz + PASO / 2 + 0.35;
    veh.position.set(l.cx, 0.05, z);
    veh.scale.setScalar(0.001);
    this.scene.add(veh);
    this.vehiculos.add(veh);
    const x0 = l.cx;
    const x1 = MED + 2.2;
    const dur = (x1 - x0) / 6 + 0.6;
    const tmp = new this.T.Vector3();
    const e: EtiquetaH = this.nucleo.etq.crear({
      clase: 'eve-lbl--veh',
      html: etiqueta,
      pos: () => tmp.copy(veh.position).setY(veh.position.y + 1.7),
      ms: (dur + 0.9) * 1000,
    });
    const tw = this.nucleo.tw;
    tw.agregar(0.3, (u) => veh.scale.setScalar(Math.max(0.001, ease.back(u))), () => {
      tw.agregar(dur, (u) => { veh.position.x = x0 + (x1 - x0) * ease.inOut(u); }, () => {
        tw.agregar(0.35, (u) => veh.scale.setScalar(Math.max(0.001, 1 - u)), () => {
          this.scene.remove(veh);
          this.vehiculos.delete(veh);
          this.nucleo.etq.quitar(e);
        }, veh);
      }, veh);
    }, veh);
  }

  private crearVehiculo(c: ComercioDibujo, camion: boolean): ThreeNS.Group {
    const k = this.kit;
    const g = new this.T.Group();
    if (camion) {
      k.malla(k.gRbox(1.0, 0.8, 0.8, 0.12), k.mt('info'), g, 0.6, 0.62, 0);
      k.malla(k.gRbox(1.5, 1.0, 0.82, 0.1), k.mt('scene-wall'), g, -0.5, 0.72, 0);
      [[0.6, 0.42], [0.6, -0.42], [-0.8, 0.42], [-0.8, -0.42]].forEach(([x, z]) => {
        const w = k.malla(k.gCil(0.2, 0.2, 0.14, 14), k.mt('scene-wheel'), g, x, 0.2, z);
        w.rotation.x = Math.PI / 2;
      });
    } else {
      k.malla(k.gRbox(0.9, 0.3, 0.34, 0.1), k.mt(c.tono), g, 0, 0.4, 0);
      k.malla(k.gRbox(0.42, 0.42, 0.42, 0.1), k.mt('box'), g, -0.4, 0.75, 0);
      k.malla(k.gEsf(0.16), k.mt(c.tono), g, 0.08, 0.95, 0);
      [-0.36, 0.36].forEach((x) => {
        const w = k.malla(k.gCil(0.2, 0.2, 0.12, 14), k.mt('scene-wheel'), g, x, 0.2, 0);
        w.rotation.x = Math.PI / 2;
      });
    }
    return g;
  }

  // ====================================================== puntero (toques)

  private traducir(id: string | null): ToqueMapa | null {
    return id && id.startsWith('k:') ? { tipo: 'comercio', id: id.slice(2) } : null;
  }

  private alClick(id: string): void {
    const t = this.traducir(id);
    if (t) this.cfg.onClick(t);
    else this.cfg.onVacio?.();
  }

  private alHover(id: string | null): void {
    const t = this.traducir(id);
    this.hoverEmpresa = t ? t.id : null;
    this.mostrarResalte(this.empresaResaltada ?? this.hoverEmpresa);
    this.cfg.onHover?.(t);
    this.sucio = true;
  }

  private mostrarResalte(empresa: string | null): void {
    const l = empresa ? this.lotePorEmpresa.get(empresa) : null;
    if (!l || !l.c || !this.anillo) {
      if (this.anillo) this.anillo.visible = false;
      this.nucleo.hover(null);
      return;
    }
    this.anillo.position.set(l.cx, 0.17, l.cz);
    this.anillo.visible = true;
    const c = l.c;
    const nombre = nombreVisible(c.nombre, c.ciudad, this.nucleo.privado);
    const dinero$ = this.nucleo.privado ? 'montos ocultos' : dineroCorto(c.ventas);
    const lote = l;
    this.nucleo.hover(
      `<b>${esc(nombre)}</b><span>${c.n} ${c.n === 1 ? 'pedido' : 'pedidos'} · ${esc(dinero$)} · toca para ver su tablero</span>`,
      () => this.cima(lote, 0.6),
    );
  }
}
