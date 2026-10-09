import type * as ThreeNS from 'three';
import { DEG, EscenaBase, OpcionesEscena, RoundedBox, Three, VistaCamara } from '../../../shared/escena-3d/escena-base';
import {
  EtapaId,
  EtapaInfo,
  EventoCambioEstado,
  EventoEnVivo,
  EventoSalida,
  MensajeroEnVivo,
  PedidoEnVivo,
  TipoTransportador,
  tonoCss,
} from '../servicios/en-vivo.modelos';
import { Director, describirEventoEnVivo, ModoTrabajo, Trabajo } from './director';
import { EtiquetaH, GestorEtiquetas, esc } from './etiquetas-html';
import { KitEscena } from './kit-escena';
import { BELT_Z, MundoOperacion, PADS, PARQUEO_CASA, PICK, SLOTS } from './operacion.mundo';
import {
  CAJAS_VISIBLES,
  ESTACIONES,
  EstacionId,
  ObjetivoCamara,
  OpcionesOperacion,
  PedidoEscena,
  ToqueEscena,
  esEstacion,
} from './operacion.tipos';
import { Tweens, ease, limitar } from './tweens';

// ==========================================================================
// Escena 3D de la operación del comercio (D-386, tareas 5.1, 5.2 y 5.4).
// Una tienda de donde caen los pedidos, una banda con una estación por estado de Katuq (Sin
// producir, En producción, Producido, Empacado, Para despachar), un garaje con motos y un camión, y
// un barrio donde se entrega: la moto del mensajero va hasta la casa del pedido, parquea al frente
// mientras está Despachado y, al marcarse Entregado, deja la caja y vuelve a la bodega. Cada pedido activo es una caja (geometría y materiales
// compartidos, a lo sumo 18 por estación y "+N"); cada evento del canal tiene su animación, que el
// DIRECTOR ordena (máximo 6 a la vez, desvanecido si hay más de 8 en cola, salidas agrupadas).
// Solo lectura: la escena no cambia nada de nadie. Referencia exacta de look y movimiento: el
// prototipo publicado con la propuesta (`crearOperacion`).
// ==========================================================================

interface Pos2 { x: number; z: number; }

const LANE_OUT = 2.8;
const LANE_BACK = 4.0;
const EXIT_X = 17.4;
const TRUCK: Pos2 = { x: 12.6, z: -2.4 };
const CHAQUETAS: ReadonlyArray<string> = ['accent', 'info', 'pack', 'ok'];

// Nombres de Katuq. El color de cada estación es fijo para que las cinco se distingan en la
// banda (el servidor puede repetir tono entre Producido y Empacado); el nombre sí viene del servidor.
const NOMBRES_ETAPA: Record<EstacionId, { nombre: string; corto: string; tono: string }> = {
  recibido: { nombre: 'Sin producir', corto: 'Sin producir', tono: 'slate' },
  produccion: { nombre: 'En producción', corto: 'En producción', tono: 'info' },
  producido: { nombre: 'Producido', corto: 'Producido', tono: 'warn' },
  empacado: { nombre: 'Empacado', corto: 'Empacado', tono: 'pack' },
  listo: { nombre: 'Para despachar', corto: 'Para despachar', tono: 'accent' },
};
const CORTO_ETAPA: Record<string, string> = {
  recibido: 'Sin producir', produccion: 'En producción', producido: 'Producido', empacado: 'Empacado', listo: 'Para despachar',
};
/** Igual que el servidor: sin tildes, mayúsculas, espacios de más, cédula delante ni teléfono detrás. */
const claveNombre = (n: string | null | undefined): string =>
  String(n ?? '')
    .replace(/^\s*\d{6,}\s*-\s*/, '')
    .replace(/\s*-\s*\d{6,}\s*$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const SVG_MOTO = '<svg class="eve-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M6 16l4-6h5l3 6M9 10 8 7H5"/></svg>';
const SVG_CAMION = '<svg class="eve-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/></svg>';

const nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const cop = (n: number): string => '$' + nf.format(Math.round(n));

/** base: en el garaje · mov: andando · casa: parqueada frente a la casa del pedido · fuera: fuera de la escena (camión). */
type Vis = 'base' | 'mov' | 'casa' | 'fuera';
type V3 = ThreeNS.Vector3;

interface Caja {
  g: ThreeNS.Group;
  cuerpo: ThreeNS.Mesh;
  viajando: boolean;
}

interface Vehiculo {
  clave: string;
  tipo: 'moto' | 'camion';
  nombre: string | null;
  slot: Pos2;
  obj: ThreeNS.Group;
  carga: ThreeNS.Group;
  headT: number;
  vis: Vis;
  pedidos: Set<string>;
  etq: EtiquetaH | null;
  uso: number;
  tmp: V3;
  /** Índice de la casa donde está (o a la que va) la moto; null en el garaje. */
  casa: number | null;
}

interface Efecto {
  paso: (dt: number) => boolean;
  limpiar: () => void;
}

export interface DiagnosticoOperacion {
  cajas: number;
  visibles: Record<EstacionId, number>;
  totales: Record<EstacionId, number>;
  vehiculosFuera: number;
  animadas: number;
  enCola: number;
  pico: number;
  desvanecidos: number;
  tweens: number;
  etiquetas: number;
  fallos: number;
}

export class OperacionEnVivoEscena extends EscenaBase<string> {
  protected readonly animaContinuo = true;
  protected readonly vista: VistaCamara = {
    az: 34 * DEG,
    pol: 52 * DEG,
    centro: { x: 0.4, y: 0, z: 0.8 },
    mirarY: 0,
    limAz: [-15 * DEG, 80 * DEG],
    limPol: [32 * DEG, 66 * DEG],
    limZoom: [0.75, 2.4],
    altoMundo: (util) => Math.max(22.5, 39 / Math.max(util, 0.55)),
    bajada: 0.1,
    fondo: 0xe9e5f8,
  };

  /** Crea la escena (el puente de eventos de la base necesita la instancia, por eso es una fábrica). */
  static crear(T: Three, RB: RoundedBox, o: OpcionesOperacion): OperacionEnVivoEscena {
    const ref: { esc: OperacionEnVivoEscena | null } = { esc: null };
    const etq = new GestorEtiquetas(o.etiquetas, o.reducirMovimiento);
    const base: OpcionesEscena<string> = {
      canvas: o.canvas,
      reducirMovimiento: o.reducirMovimiento,
      calidadBaja: o.calidadBaja,
      onHover: (id) => ref.esc?.alHover(id),
      onClick: (id) => ref.esc?.alClick(id),
      onFrame: (a) => etq.posicionar(a, ref.esc?.ancho ?? 1, ref.esc?.alto ?? 1),
      onVacio: () => o.onVacio?.(),
    };
    const esc3 = new OperacionEnVivoEscena(T, RB, base, etq, o);
    ref.esc = esc3;
    return esc3;
  }

  // ---- estado de la escena
  private kit!: KitEscena;
  private mundo!: MundoOperacion;
  private readonly tw: Tweens;
  private readonly director: Director<EventoEnVivo>;
  private readonly efimeros = new Set<ThreeNS.Object3D>();
  private readonly efectos: Efecto[] = [];

  private readonly pedidos = new Map<string, PedidoEscena>();
  private readonly listas: Record<EstacionId, string[]> = { recibido: [], produccion: [], producido: [], empacado: [], listo: [] };
  private readonly cajas = new Map<string, Caja>();
  private readonly vehiculos: Vehiculo[] = [];
  private readonly etqEstacion = new Map<EstacionId, EtiquetaH>();
  private etapas = NOMBRES_ETAPA;

  private pantallaFlash: string | null = null;
  private nombreComercio = 'TU TIENDA';
  private anillos: ThreeNS.Mesh[] = [];
  private matAnillo: ThreeNS.MeshBasicMaterial | null = null;

  private privado = false;
  private resaltadas: string[] = [];
  private hoverPedido: string | null = null;
  private etqHover: EtiquetaH | null = null;
  private seguido: ObjetivoCamara | null = null;
  private enfocando = false;
  private zoomSeguido = 1.5;
  private cargando = true;
  private fallos = 0;
  private ultimoConteo = new Map<EstacionId, number>();

  private constructor(
    T: Three,
    RB: RoundedBox,
    opts: OpcionesEscena<string>,
    private readonly etq: GestorEtiquetas,
    private readonly cfg: OpcionesOperacion,
  ) {
    super(T, RB, opts);
    this.tw = new Tweens(cfg.reducirMovimiento);
    this.director = new Director<EventoEnVivo>({
      describir: describirEventoEnVivo,
      ejecutar: (t, modo, fin) => this.ejecutar(t, modo, fin),
    });
  }

  // =========================================================== API pública

  /** Etapas con nombre y tono tal como las manda el servidor (rotula y tiñe las estaciones). */
  fijarEtapas(etapas: ReadonlyArray<EtapaInfo>): void {
    const siguiente: Record<EstacionId, { nombre: string; corto: string; tono: string }> = { ...NOMBRES_ETAPA };
    for (const e of etapas) {
      if (!esEstacion(e.id)) continue;
      siguiente[e.id] = { nombre: e.nombre || NOMBRES_ETAPA[e.id].nombre, corto: CORTO_ETAPA[e.id], tono: NOMBRES_ETAPA[e.id].tono };
    }
    this.etapas = siguiente;
    if (this.scene) this.aplicarEstacionesEstilo();
  }

  /** Nombre de la tienda que se lee en la pantalla de la fachada. */
  fijarComercio(nombre: string | null | undefined): void {
    const limpio = (nombre ?? '').trim().toUpperCase();
    this.nombreComercio = limpio ? limpio.slice(0, 22) : 'TU TIENDA';
    this.mundo.pantalla?.pintar();
    this.sucio = true;
  }

  /** "Ocultar clientes y montos": las tarjetas dicen "Cliente" y no muestran valores. */
  fijarPrivado(privado: boolean): void {
    this.privado = privado;
  }

  fijarReducirMovimiento(reducir: boolean): void {
    this.opts.reducirMovimiento = reducir;
    this.tw.fijarCorto(reducir);
    this.etq.fijarReducido(reducir);
    this.sucio = true;
  }

  /** Mensajeros propios: se estacionan con su nombre en el garaje (los que van en ruta salen de los pedidos en camino). */
  fijarFlota(flota: ReadonlyArray<MensajeroEnVivo>): void {
    for (const m of flota) {
      if (!m.nombre) continue;
      if (this.vehiculos.some((v) => v.tipo === 'moto' && this.mismoNombre(v.nombre, m.nombre))) continue;
      const libre = this.vehiculos.find((v) => v.tipo === 'moto' && v.nombre === null);
      if (!libre) break;
      libre.nombre = m.nombre;
      this.refrescarEtiquetaVeh(libre);
    }
  }

  /**
   * Deja la escena igual al estado, sin animar nada: al cargar, tras una reconexión, al volver a la
   * pestaña o al terminar una repetición. `pedidos` llega del más nuevo al más viejo (como la foto).
   */
  aplicarFoto(pedidos: ReadonlyArray<PedidoEnVivo>, flota?: ReadonlyArray<MensajeroEnVivo>): void {
    this.reiniciar();
    this.cargando = true;
    const orden = pedidos.slice().reverse();
    for (const p of orden) {
      const o = this.desdePedido(p);
      if (esEstacion(o.etapa)) {
        this.pedidos.set(o.id, o);
        this.listas[o.etapa].push(o.id);
        this.nuevaCaja(o.id);
      } else if (o.etapa === 'camino') {
        this.pedidos.set(o.id, o);
        const veh = this.vehiculoPara(o.transportador, o.tipoTransportador);
        if (veh) {
          veh.pedidos.add(o.id);
          if (veh.tipo === 'moto') this.ponerEnCarga(veh, this.nuevaCaja(o.id).g);
        }
      }
    }
    if (flota) this.fijarFlota(flota);
    ESTACIONES.forEach((st) => this.acomodar(st, false));
    this.vehiculos.forEach((v) => {
      if (!v.pedidos.size) this.refrescarEtiquetaVeh(v);
      else if (v.tipo === 'moto') this.parquearEnCasa(v, this.casaDe(v));
      else this.ponerFuera(v);
    });
    this.refrescarConteos(false);
    this.cargando = false;
    this.sucio = true;
  }

  /** Anima un evento en vivo (el director decide cuándo y cómo). */
  aplicarEvento(ev: EventoEnVivo): void {
    this.director.encolar(ev, performance.now());
    this.sucio = true;
  }

  /** Resalta cajas con un anillo (p. ej. al pasar el puntero por un evento de la lista). */
  override resaltar(ids: string | string[] | null): void {
    this.resaltadas = ids === null ? [] : Array.isArray(ids) ? ids.slice(0, 6) : [ids];
    this.sucio = true;
  }

  /** La cámara sigue a un pedido, a un vehículo o a una estación (ficha abierta); null = suelta. */
  seguir(objetivo: ObjetivoCamara | null, zoom?: number): void {
    this.seguido = objetivo;
    this.zoomSeguido = zoom ?? (objetivo?.tipo === 'estacion' ? 1.3 : 1.5);
    if (!objetivo) {
      if (this.enfocando) this.soltarFoco();
      this.enfocando = false;
    }
    this.sucio = true;
  }

  /** El gestor de etiquetas HTML de la escena (el orbe de Opttia pone ahí su burbuja). */
  get gestorEtiquetas(): GestorEtiquetas {
    return this.etq;
  }

  posCaja(id: string): V3 | null {
    const c = this.cajas.get(id);
    if (!c || !c.g.visible || !c.g.parent) return null;
    return c.g.getWorldPosition(new this.T.Vector3());
  }

  /** Posición del vehículo que lleva ese transportador (null si no se ve ahora). */
  posVeh(nombre: string): V3 | null {
    const v = this.vehiculos.find((x) => this.mismoNombre(x.nombre, nombre));
    return v && v.obj.visible ? v.obj.position.clone() : null;
  }

  posEstacion(etapa: string): V3 | null {
    if (!esEstacion(etapa)) return null;
    const p = PADS[etapa];
    return new this.T.Vector3(p.x, 0, p.z);
  }

  /** Vacía la escena (cajas, vehículos, animaciones y tarjetas) sin tocar el mundo. */
  reiniciar(): void {
    this.director.limpiar();
    this.tw.limpiar();
    this.limpiarEfimeros();
    [...this.cajas.keys()].forEach((id) => this.borrarCaja(id));
    this.pedidos.clear();
    ESTACIONES.forEach((st) => { this.listas[st].length = 0; });
    this.etq.quitarPasajeras();
    this.etqHover = null;
    this.pantallaFlash = null;
    this.mundo.pantalla?.pintar();
    for (const v of this.vehiculos) {
      v.pedidos.clear();
      [...v.carga.children].forEach((h) => v.carga.remove(h));
      v.obj.visible = true;
      v.vis = 'base';
      v.casa = null;
      v.obj.position.set(v.slot.x, 0, v.slot.z);
      v.headT = v.tipo === 'moto' ? Math.PI / 2 : 0;
      v.obj.rotation.y = v.headT;
      this.refrescarEtiquetaVeh(v);
    }
    this.refrescarConteos(false);
    this.sucio = true;
  }

  /** Para pruebas y telemetría de la propia escena: qué hay y qué tan ocupado está el director. */
  diagnostico(): DiagnosticoOperacion {
    const visibles: Record<EstacionId, number> = { recibido: 0, produccion: 0, producido: 0, empacado: 0, listo: 0 };
    const totales: Record<EstacionId, number> = { recibido: 0, produccion: 0, producido: 0, empacado: 0, listo: 0 };
    ESTACIONES.forEach((st) => {
      totales[st] = this.listas[st].length;
      visibles[st] = this.listas[st].filter((id) => this.cajas.get(id)?.g.visible).length;
    });
    return {
      cajas: this.cajas.size,
      visibles,
      totales,
      vehiculosFuera: this.vehiculos.filter((v) => v.vis === 'fuera' || v.vis === 'casa').length,
      animadas: this.director.animadas,
      enCola: this.director.enCola,
      pico: this.director.pico,
      desvanecidos: this.director.totalDesvanecidos,
      tweens: this.tw.cantidad,
      etiquetas: this.etq.cantidad,
      fallos: this.fallos,
    };
  }

  /** Vuelve a leer los colores (cambió el tema: modo pantalla oscuro). */
  retema(): void {
    this.kit.retemar();
    this.mundo.aplicarLuces();
    this.renderer.setClearColor(this.kit.tokens['scene-bg'], 1);
    this.sucio = true;
  }

  override destruir(): void {
    this.director.limpiar();
    this.tw.limpiar();
    this.limpiarEfimeros();
    this.etq.limpiar();
    super.destruir();
  }

  // ======================================================= ganchos de la base

  protected construir(): void {
    this.kit = new KitEscena(this.T, this.geoCache, this.cfg.tokens, (tex) => this.registrarTextura(tex));
    this.renderer.setClearColor(this.kit.tokens['scene-bg'], 1);
    this.mundo = new MundoOperacion(this.kit, {
      scene: this.scene,
      pickables: this.pickables,
      calidadBaja: this.opts.calidadBaja,
      tonoEtapa: (id) => this.etapas[id].tono,
      textoPantalla: () => ({ flash: this.pantallaFlash, nombre: this.nombreComercio }),
    });
    this.mundo.construir();
    this.crearVehiculos();
    this.crearAnillos();
    this.crearEtiquetasFijas();
    // encuadre automático: la plataforma completa con la tienda y el garaje
    const pts: V3[] = [];
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        pts.push(this.kit.v(x * 17.2, 0.2 + z * 9.9, -0.9), this.kit.v(x * 17.2, 0.2 + z * 9.9, 0), this.kit.v(x * 15.5, 0.2 + z * 8, 4.6));
      }
    }
    this.ajustarAContenido(pts, (ancho) => (ancho < 520 ? { t: 66, b: 100, l: 8, r: 50 } : { t: 76, b: 116, l: 18, r: 62 }));
    this.refrescarConteos(false);
  }

  protected cuadro(t: number, dt: number): boolean {
    const ahora = performance.now();
    this.director.avanzar(ahora);
    let cambio = this.tw.paso(dt);
    if (!this.cfg.reducirMovimiento) {
      if (this.mundo.cinta) this.mundo.cinta.tex.offset.x = -(t * 0.35) % 1;
      this.mundo.animados.forEach((f) => f(t));
    }
    const mov = this.vehiculos.some((v) => v.vis === 'mov');
    if (this.mundo.baliza) this.mundo.baliza.visible = mov ? this.cfg.reducirMovimiento || Math.floor(t * 3) % 2 === 0 : false;
    for (const v of this.vehiculos) {
      let d = v.headT - v.obj.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      v.obj.rotation.y += d * Math.min(1, dt * 9);
    }
    // efectos por cuadro (confeti)
    for (let i = this.efectos.length - 1; i >= 0; i--) {
      if (!this.efectos[i].paso(dt)) { this.efectos[i].limpiar(); this.efectos.splice(i, 1); }
      cambio = true;
    }
    this.moverAnillos(t);
    this.seguirObjetivo();
    if (this.etq.expirar(ahora)) cambio = true;
    return cambio || this.director.ocupado;
  }

  protected anclas(): Iterable<[string, V3]> {
    return this.etq.anclas();
  }

  // ============================================================== mundo

  private aplicarEstacionesEstilo(): void {
    ESTACIONES.forEach((id) => {
      const m = this.mundo.padsMesh.get(id);
      const tono = this.etapas[id].tono;
      if (m) { m.borde.material = this.kit.mt(tono); m.tapa.material = this.kit.mt(tono + '-soft'); }
      const e = this.etqEstacion.get(id);
      if (e) {
        ['slate', 'info', 'warn', 'accent', 'ok', 'bad', 'pack'].forEach((c) => e.el.classList.remove('t-' + c));
        e.el.classList.add('t-' + tono);
      }
    });
    this.refrescarConteos(false);
    this.sucio = true;
  }

  // ============================================================ vehículos

  private crearVehiculos(): void {
    SLOTS.forEach((s, i) => {
      const obj = this.mundo.crearMoto(CHAQUETAS[i % CHAQUETAS.length]);
      this.registrarVehiculo({ clave: 'm' + (i + 1), tipo: 'moto', slot: s, obj, headT: Math.PI / 2 });
    });
    this.registrarVehiculo({ clave: 't1', tipo: 'camion', slot: TRUCK, obj: this.mundo.crearCamion(), headT: 0 });
  }

  private registrarVehiculo(o: { clave: string; tipo: 'moto' | 'camion'; slot: Pos2; obj: ThreeNS.Group; headT: number }): void {
    o.obj.position.set(o.slot.x, 0, o.slot.z);
    o.obj.rotation.y = o.headT;
    o.obj.userData['zona'] = 'v:' + o.clave;
    this.scene.add(o.obj);
    this.pickables.push(o.obj);
    this.vehiculos.push({
      clave: o.clave, tipo: o.tipo, nombre: null, slot: o.slot, obj: o.obj,
      carga: o.obj.userData['carga'] as ThreeNS.Group, headT: o.headT, vis: 'base', pedidos: new Set(), etq: null, uso: 0,
      tmp: new this.T.Vector3(), casa: null,
    });
  }

  private mismoNombre(a: string | null, b: string | null): boolean {
    if (!a || !b) return false;
    return claveNombre(a) === claveNombre(b);
  }

  /**
   * El vehículo que atiende a ese transportador: el camión para una transportadora; para un
   * mensajero, su moto (o una libre, que toma su nombre). null si todas las motos están ocupadas.
   */
  private vehiculoPara(nombre: string | null, tipo: TipoTransportador | null): Vehiculo | null {
    if (tipo === 'transportadora') {
      const camion = this.vehiculos.find((v) => v.tipo === 'camion');
      if (camion && nombre && !this.mismoNombre(camion.nombre, nombre)) { camion.nombre = nombre; this.refrescarEtiquetaVeh(camion); }
      return camion ?? null;
    }
    const motos = this.vehiculos.filter((v) => v.tipo === 'moto');
    const propia = nombre ? motos.find((v) => this.mismoNombre(v.nombre, nombre)) : null;
    if (propia) return propia;
    const libres = motos.filter((v) => v.vis === 'base' && !v.pedidos.size);
    const libre = libres.find((v) => v.nombre === null) ?? libres.sort((a, b) => a.uso - b.uso)[0];
    if (!libre) return null;
    if (nombre) libre.nombre = nombre;
    this.refrescarEtiquetaVeh(libre);
    return libre;
  }

  private corto(v: Vehiculo): string {
    if (!v.nombre) return v.tipo === 'camion' ? 'Transportadora' : '';
    return v.tipo === 'moto' ? v.nombre.split(' ')[0] : v.nombre;
  }

  private refrescarEtiquetaVeh(v: Vehiculo): void {
    const nombre = this.corto(v);
    const n = v.pedidos.size;
    const html = `${v.tipo === 'moto' ? SVG_MOTO : SVG_CAMION}${esc(nombre)}${v.vis !== 'base' && n ? ` · ${n} ${n === 1 ? 'pedido' : 'pedidos'}` : ''}`;
    if (!v.etq) {
      v.etq = this.etq.crear({
        clase: 'eve-lbl--veh',
        html,
        pos: () => {
          if (!v.obj.visible || !this.corto(v)) return null;
          v.tmp.copy(v.obj.position);
          v.tmp.y += 2.3;
          return v.tmp;
        },
      });
    } else this.etq.actualizarHtml(v.etq, html);
  }

  private ponerFuera(v: Vehiculo): void {
    this.tw.cancelar(v.obj);
    v.obj.visible = false;
    v.vis = 'fuera';
    this.refrescarEtiquetaVeh(v);
  }

  private manejar(v: Vehiculo, pts: V3[], vel: number, done?: () => void): void {
    this.tw.cancelar(v.obj);
    const tramos: Array<{ a: V3; b: V3; l: number; L0: number }> = [];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const l = a.distanceTo(b);
      if (l < 1e-3) continue;
      tramos.push({ a, b, l, L0: L });
      L += l;
    }
    if (!tramos.length) { done?.(); return; }
    this.tw.agregar(Math.max(0.4, L / vel), (k) => {
      const d = ease.sine(k) * L;
      let s = tramos[tramos.length - 1];
      for (const tr of tramos) if (d <= tr.L0 + tr.l) { s = tr; break; }
      v.obj.position.lerpVectors(s.a, s.b, limitar((d - s.L0) / s.l, 0, 1));
      v.headT = Math.atan2(-(s.b.z - s.a.z), s.b.x - s.a.x);
    }, () => { v.obj.rotation.y = v.headT; done?.(); }, v.obj);
  }

  private volver(v: Vehiculo): void {
    if (v.vis !== 'fuera') return;
    v.vis = 'mov';
    v.obj.visible = true;
    const entrada = this.kit.v(EXIT_X, LANE_BACK);
    v.obj.position.copy(entrada);
    v.obj.rotation.y = Math.PI;
    v.headT = Math.PI;
    this.refrescarEtiquetaVeh(v);
    const ruta = v.tipo === 'moto'
      ? [entrada, this.kit.v(v.slot.x, LANE_BACK), this.kit.v(v.slot.x, v.slot.z)]
      : [entrada, this.kit.v(16.2, LANE_BACK), this.kit.v(16.2, TRUCK.z), this.kit.v(TRUCK.x, TRUCK.z)];
    this.manejar(v, ruta, 7, () => { v.vis = 'base'; v.headT = v.tipo === 'moto' ? Math.PI / 2 : 0; this.refrescarEtiquetaVeh(v); });
  }

  private salirDeEscena(v: Vehiculo): void {
    [...v.carga.children].forEach((g) => {
      const id = (g.userData['pedidoId'] as string | undefined) ?? '';
      this.borrarCaja(id);
    });
    this.ponerFuera(v);
    if (!v.pedidos.size) this.tw.esperar(1.2, () => this.volver(v));
  }

  private revisarRegreso(v: Vehiculo): void {
    if (!v.pedidos.size && v.vis === 'fuera') this.volver(v);
  }

  // ================================================================ cajas

  private slotPos(st: EstacionId, i: number): V3 {
    const p = PADS[st];
    const col = i % 3;
    const fila = Math.floor(i / 3) % 2;
    const capa = Math.floor(i / 6);
    return this.kit.v(p.x + (col - 1) * 1.02, p.z + (fila - 0.5) * 1.06, 0.14 + 0.36 + capa * 0.74);
  }

  private nuevaCaja(id: string): Caja {
    const prev = this.cajas.get(id);
    if (prev) return prev;
    const g = new this.T.Group();
    g.userData['zona'] = 'p:' + id;
    g.userData['pedidoId'] = id;
    const cuerpo = this.kit.malla(this.kit.gRbox(0.86, 0.72, 0.86, 0.12), this.kit.mt('box'), g, 0, 0, 0);
    this.kit.malla(this.kit.gCaja(0.2, 0.02, 0.88), this.kit.mt('box-tape'), g, 0, 0.37, 0, false);
    this.scene.add(g);
    this.pickables.push(g);
    const c: Caja = { g, cuerpo, viajando: false };
    this.cajas.set(id, c);
    return c;
  }

  private borrarCaja(id: string): void {
    const c = this.cajas.get(id);
    if (!c) return;
    this.tw.cancelar(c.g);
    c.g.parent?.remove(c.g);
    const i = this.pickables.indexOf(c.g);
    if (i >= 0) this.pickables.splice(i, 1);
    this.cajas.delete(id);
  }

  /** Ubica las cajas de una estación en sus lugares; las que pasan de 18 quedan ocultas ("+N"). */
  private acomodar(st: EstacionId, animar: boolean): void {
    this.listas[st].forEach((id, i) => {
      const c = this.cajas.get(id);
      if (!c || c.viajando) return;
      const destino = this.slotPos(st, Math.min(i, CAJAS_VISIBLES - 1));
      c.g.visible = i < CAJAS_VISIBLES;
      if (!animar) { c.g.position.copy(destino); return; }
      if (c.g.position.distanceTo(destino) < 0.01) return;
      const desde = c.g.position.clone();
      this.tw.cancelar(c.g);
      this.tw.agregar(0.38, (k) => { c.g.position.lerpVectors(desde, destino, ease.out(k)); }, null, c.g);
    });
  }

  private saltar(g: ThreeNS.Object3D, destino: V3, dur: number, altura: number, done?: () => void): void {
    const desde = g.position.clone();
    this.tw.cancelar(g);
    this.tw.agregar(dur, (k) => {
      g.position.lerpVectors(desde, destino, ease.sine(k));
      g.position.y += Math.sin(Math.PI * k) * altura;
    }, done, g);
  }

  private desvanecer(g: ThreeNS.Object3D, done?: () => void): void {
    this.tw.cancelar(g);
    const s0 = g.scale.x;
    this.tw.agregar(0.45, (k) => { g.scale.setScalar(s0 * (1 - ease.out(k))); g.position.y += 0.02; }, done, g);
  }

  /** Aparece con un pequeño crecimiento (llegadas y reubicaciones de la cola larga). */
  private aparecer(g: ThreeNS.Object3D, done?: () => void): void {
    this.tw.cancelar(g);
    this.tw.agregar(0.3, (k) => { g.scale.setScalar(0.6 + 0.4 * ease.out(k)); }, () => { g.scale.setScalar(1); done?.(); }, g);
  }

  private quitarDeListas(id: string): void {
    ESTACIONES.forEach((st) => {
      const i = this.listas[st].indexOf(id);
      if (i >= 0) this.listas[st].splice(i, 1);
    });
  }

  private vehiculoDe(pedidoId: string): Vehiculo | null {
    return this.vehiculos.find((v) => v.pedidos.has(pedidoId)) ?? null;
  }

  // =========================================================== etiquetas

  private crearEtiquetasFijas(): void {
    ESTACIONES.forEach((id) => {
      const p = PADS[id];
      const e = this.etq.crear({
        clase: 'eve-lbl--st',
        tono: this.etapas[id].tono,
        html: this.htmlEstacion(id, 0),
        pos: () => this.kit.v(p.x, p.z - 1.0, 2.6),
      });
      this.etqEstacion.set(id, e);
    });
    this.vehiculos.forEach((v) => this.refrescarEtiquetaVeh(v));
  }

  private htmlEstacion(id: EstacionId, n: number): string {
    const extra = n > CAJAS_VISIBLES ? `<em>+${n - CAJAS_VISIBLES}</em>` : '';
    return `<i class="eve-dot"></i><span>${esc(this.etapas[id].nombre)}</span><b>${n}</b>${extra}`;
  }

  private refrescarConteos(animar: boolean): void {
    ESTACIONES.forEach((id) => {
      const e = this.etqEstacion.get(id);
      if (!e) return;
      const n = this.listas[id].length;
      this.etq.actualizarHtml(e, this.htmlEstacion(id, n));
      if (animar && !this.cargando && this.ultimoConteo.get(id) !== n) {
        e.el.classList.remove('is-bump');
        void e.el.offsetWidth;
        e.el.classList.add('is-bump');
      }
      this.ultimoConteo.set(id, n);
    });
  }

  private quien(o: { cliente: string | null }): string {
    return this.privado ? 'Cliente' : o.cliente || 'Cliente';
  }

  private ubic(o: { ciudad: string | null; barrio: string | null }): string {
    return [o.ciudad, o.barrio].filter((x) => !!x).join(' · ');
  }

  private montoTxt(m: number): string {
    return this.privado || !m ? '' : cop(m);
  }

  private pop(pos: V3, tono: string, pill: string, cuerpo: string, ms = 4200): void {
    this.etq.crear({ clase: 'eve-lbl--pop', tono, html: `<span class="eve-pill">${esc(pill)}</span>${cuerpo}`, pos: () => pos, ms });
  }

  private cuerpoPedido(o: PedidoEscena, conMonto: boolean): string {
    const num = `<span class="eve-mono">#${esc(o.numero ?? '')}</span>`;
    const monto = conMonto ? `<span class="eve-amt">${esc(this.montoTxt(o.monto))}</span>` : '';
    const sub = [this.quien(o), this.ubic(o)].filter((x) => !!x).join(' · ');
    return `${num}${monto}<small>${esc(sub)}</small>`;
  }

  private flashPantalla(txt: string, ms = 2200): void {
    this.pantallaFlash = txt;
    this.mundo.pantalla?.pintar();
    this.tw.esperar(ms / 1000, () => { this.pantallaFlash = null; this.mundo.pantalla?.pintar(); this.sucio = true; });
  }

  // ============================================================== efectos

  private marcarEfimero(o: ThreeNS.Object3D): void {
    this.efimeros.add(o);
  }

  private soltarEfimero(o: ThreeNS.Object3D, mat?: ThreeNS.MeshBasicMaterial): void {
    this.scene.remove(o);
    this.efimeros.delete(o);
    if (mat) { mat.dispose(); this.kit.vivos.delete(mat); }
  }

  private limpiarEfimeros(): void {
    this.efimeros.forEach((o) => {
      this.scene.remove(o);
      const m = (o as ThreeNS.Mesh).material;
      if (m && !Array.isArray(m) && (m as ThreeNS.MeshBasicMaterial).isMeshBasicMaterial) {
        m.dispose();
        this.kit.vivos.delete(m as ThreeNS.MeshBasicMaterial);
      }
    });
    this.efimeros.clear();
    this.efectos.forEach((e) => e.limpiar());
    this.efectos.length = 0;
  }

  /** Anillo que crece y se apaga en el piso. Con "reducir movimiento" no se dibuja. */
  private pulso(pos: V3, token: string, tam = 3, dur = 1.1): void {
    if (this.cfg.reducirMovimiento) return;
    const k = 'ring|0.55|0.75';
    let g = this.geoCache.get(k);
    if (!g) { g = new this.T.RingGeometry(0.55, 0.75, 40); this.geoCache.set(k, g); }
    const m = this.kit.basico(token, 0.75);
    const r = new this.T.Mesh(g, m);
    r.rotation.x = -Math.PI / 2;
    r.position.copy(pos);
    this.scene.add(r);
    this.marcarEfimero(r);
    this.tw.agregar(dur, (u) => { r.scale.setScalar(1 + ease.out(u) * tam); m.opacity = 0.75 * (1 - u); }, () => this.soltarEfimero(r, m));
  }

  /** Haz de luz que cae sobre una estación al llegar un pedido. */
  private haz(pos: V3, token: string, alt = 12, dur = 1.2): void {
    if (this.cfg.reducirMovimiento) return;
    const k = `haz|${alt}`;
    let g = this.geoCache.get(k);
    if (!g) { g = new this.T.CylinderGeometry(0.5, 0.5, alt, 24, 1, true); this.geoCache.set(k, g); }
    const m = this.kit.basico(token, 0.3);
    const c = new this.T.Mesh(g, m);
    c.position.set(pos.x, pos.y + alt / 2, pos.z);
    this.scene.add(c);
    this.marcarEfimero(c);
    this.tw.agregar(dur, (u) => { m.opacity = 0.3 * (1 - u); c.scale.set(1 - u * 0.6, 1, 1 - u * 0.6); }, () => this.soltarEfimero(c, m));
  }

  /** Confeti plano (colores de la paleta). Con "reducir movimiento" no hay. */
  private confeti(pos: V3): void {
    if (this.cfg.reducirMovimiento) return;
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
      this.scene.add(p);
      piezas.push(p);
    }
    let vida = 0;
    this.efectos.push({
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
        this.scene.remove(p);
        const m = p.material as ThreeNS.MeshBasicMaterial;
        m.dispose();
        this.kit.vivos.delete(m);
      }),
    });
  }

  private crearAnillos(): void {
    this.matAnillo = this.kit.basico('accent', 0.9);
    const g = new this.T.RingGeometry(0.62, 0.8, 32);
    this.geoCache.set('anillo', g);
    for (let i = 0; i < 6; i++) {
      const a = new this.T.Mesh(g, this.matAnillo);
      a.rotation.x = -Math.PI / 2;
      a.visible = false;
      this.scene.add(a);
      this.anillos.push(a);
    }
  }

  private idsResaltados(): string[] {
    const ids = this.resaltadas.slice();
    if (this.hoverPedido && ids.indexOf(this.hoverPedido) < 0) ids.push(this.hoverPedido);
    if (this.seguido?.tipo === 'pedido' && ids.indexOf(this.seguido.id) < 0) ids.push(this.seguido.id);
    return ids.slice(0, this.anillos.length);
  }

  private moverAnillos(t: number): void {
    const ids = this.idsResaltados();
    this.anillos.forEach((a, i) => {
      const p = i < ids.length ? this.posCaja(ids[i]) : null;
      if (!p) { a.visible = false; return; }
      a.position.set(p.x, 0.2, p.z);
      a.scale.setScalar(1 + (this.cfg.reducirMovimiento ? 0 : Math.sin(t * 6) * 0.08));
      a.visible = true;
    });
  }

  // ======================================================= cámara de la ficha

  private posSeguido(): V3 | null {
    const s = this.seguido;
    if (!s) return null;
    if (s.tipo === 'estacion') { const p = this.posEstacion(s.id); if (p) p.y = 0.8; return p; }
    if (s.tipo === 'vehiculo') { const p = this.posVeh(s.id); if (p) p.y += 0.8; return p; }
    const caja = this.posCaja(s.id);
    if (caja) return caja;
    const o = this.pedidos.get(s.id);
    if (!o) return null;
    if (o.etapa === 'camino') {
      const v = this.vehiculoDe(o.id);
      return v && v.obj.visible ? v.obj.position.clone().add(new this.T.Vector3(0, 0.8, 0)) : null;
    }
    if (esEstacion(o.etapa)) { const p = this.posEstacion(o.etapa); if (p) p.y = 0.8; return p; }
    return null;
  }

  private seguirObjetivo(): void {
    if (!this.seguido) return;
    const p = this.posSeguido();
    if (p) {
      this.cT = { x: p.x, y: p.y, z: p.z };
      if (!this.enfocando) { this.enfocando = true; this.zoomA(this.zoomSeguido); }
    } else if (this.enfocando) {
      this.soltarFoco();
      this.enfocando = false;
    }
  }

  // ====================================================== puntero (toques)

  private traducir(id: string): ToqueEscena | null {
    if (id.startsWith('p:')) return { tipo: 'pedido', id: id.slice(2) };
    if (id.startsWith('e:')) return { tipo: 'estacion', id: id.slice(2) };
    if (id.startsWith('v:')) {
      const v = this.vehiculos.find((x) => x.clave === id.slice(2));
      return v && v.nombre ? { tipo: 'vehiculo', id: v.nombre } : null;
    }
    return null;
  }

  private alClick(id: string): void {
    const t = this.traducir(id);
    if (t) this.cfg.onClick(t);
    else if (!id.startsWith('v:')) this.cfg.onVacio?.(); // un vehículo sin nombre no es un lugar vacío
  }

  private alHover(id: string | null): void {
    const t = id ? this.traducir(id) : null;
    this.hoverPedido = t && t.tipo === 'pedido' ? t.id : null;
    if (this.etqHover) { this.etq.quitar(this.etqHover); this.etqHover = null; }
    const o = this.hoverPedido ? this.pedidos.get(this.hoverPedido) : null;
    if (o && this.hoverPedido) {
      const id2 = this.hoverPedido;
      const sub = [this.quien(o), CORTO_ETAPA[o.etapa] ?? ''].filter((x) => !!x).join(' · ');
      this.etqHover = this.etq.crear({
        clase: 'eve-lbl--hover',
        html: `<b>#${esc(o.numero ?? '')}</b><span>${esc(sub)}</span>`,
        pos: () => { const p = this.posCaja(id2); if (p) p.y += 0.9; return p; },
      });
    }
    this.cfg.onHover?.(t);
    this.sucio = true;
  }

  // ============================================ modelo desde datos del canal

  private desdePedido(p: PedidoEnVivo): PedidoEscena {
    return {
      id: p.id, numero: p.numero, etapa: p.etapa, cliente: p.cliente, ciudad: p.ciudad, barrio: p.barrio,
      monto: p.monto || 0, canal: p.canal, ia: !!p.ia, transportador: p.transportador,
      tipoTransportador: p.tipoTransportador === 'mensajero' || p.tipoTransportador === 'transportadora'
        ? p.tipoTransportador
        : p.transportador ? 'mensajero' : null,
    };
  }

  private desdeEvento(ev: EventoEnVivo, etapa: EtapaId): PedidoEscena {
    return {
      id: ev.pedidoId, numero: ev.numero, etapa, cliente: ev.cliente ?? null, ciudad: ev.ciudad ?? null,
      barrio: ev.barrio ?? null, monto: ev.monto ?? 0, canal: ev.canal ?? '', ia: !!ev.ia,
      transportador: ev.transportador ?? null, tipoTransportador: ev.tipoTransportador ?? null,
    };
  }

  // ================================================== director: los 8 eventos

  private ejecutar(t: Trabajo<EventoEnVivo>, modo: ModoTrabajo, fin: () => void): void {
    const ev = t.eventos[0];
    try {
      switch (ev.tipo) {
        case 'pedido_nuevo': this.hacerLlegada(ev, modo, fin); break;
        case 'cambio_estado': this.hacerCambio(ev, modo, fin); break;
        case 'salida': this.hacerSalida(t.eventos as EventoSalida[], modo, fin); break;
        case 'entregado': this.hacerEntrega(ev, modo, fin); break;
        case 'rechazado':
        case 'cancelado': this.hacerRechazo(ev, modo, fin); break;
        default: this.hacerDestello(ev, fin); break;
      }
    } catch {
      this.fallos++;
      fin();
    }
    this.sucio = true;
  }

  /** Pedido nuevo: la caja cae sobre su estación con un haz, un pulso y la tarjeta; la pantalla de la tienda lo anuncia. */
  private hacerLlegada(ev: Extract<EventoEnVivo, { tipo: 'pedido_nuevo' }>, modo: ModoTrabajo, fin: () => void): void {
    const id = ev.pedidoId;
    if (this.pedidos.has(id)) { fin(); return; }
    const o = this.desdeEvento(ev, ev.etapa);
    if (o.etapa === 'entregado') { // venta en el punto de venta: nace entregada
      this.pulso(this.kit.v(-13.1, -3.0, 0.1), 'ok', 2.6, 1.1);
      if (modo === 'animado') this.flashPantalla(this.montoTxt(o.monto) || '#' + (o.numero ?? ''));
      this.pop(this.kit.v(-13.1, -3.0, 2.2), 'ok', 'Venta en tienda', this.cuerpoPedido(o, true));
      fin();
      return;
    }
    if (!esEstacion(o.etapa)) { fin(); return; }
    const st = o.etapa;
    this.pedidos.set(id, o);
    this.listas[st].push(id);
    this.refrescarConteos(true);
    const idx = this.listas[st].length - 1;
    const destino = this.slotPos(st, Math.min(idx, CAJAS_VISIBLES - 1));
    const c = this.nuevaCaja(id);
    c.g.visible = idx < CAJAS_VISIBLES;
    if (modo === 'desvanecido' || this.tw.reducido) {
      c.g.position.copy(destino);
      this.aparecer(c.g, fin);
      if (this.tw.reducido) this.pop(this.kit.v(destino.x, destino.z, 1.4), o.ia ? 'pack' : 'accent', o.ia ? 'Con Opttia' : 'Nuevo pedido', this.cuerpoPedido(o, true));
      return;
    }
    c.g.position.set(destino.x, 11, destino.z);
    c.viajando = true;
    this.haz(this.kit.v(destino.x, destino.z, 0.15), 'accent', 12, 1.3);
    this.flashPantalla('#' + (o.numero ?? ''));
    this.tw.cancelar(c.g);
    this.tw.agregar(0.95, (k) => { c.g.position.y = 11 + (destino.y - 11) * ease.bounce(k); }, () => {
      c.viajando = false;
      this.pulso(this.kit.v(PADS[st].x, PADS[st].z, 0.17), 'accent', 2.4, 1.0);
      this.pop(this.kit.v(destino.x, destino.z, 1.4), o.ia ? 'pack' : 'accent', o.ia ? 'Con Opttia' : 'Nuevo pedido', this.cuerpoPedido(o, true));
      this.acomodar(st, true);
      fin();
    }, c.g);
  }

  /** Cambio de estado: viaja por la banda a su estación nueva; dentro de la misma estación, la caja no viaja. */
  private hacerCambio(ev: EventoCambioEstado, modo: ModoTrabajo, fin: () => void): void {
    const nueva = ev.etapaNueva;
    if (!esEstacion(nueva)) { fin(); return; } // salida, entrega o rechazo: su propio evento lo anima
    const id = ev.pedidoId;
    let o = this.pedidos.get(id);
    const desconocido = !o;
    if (!o) { o = this.desdeEvento(ev, nueva); this.pedidos.set(id, o); }
    const de = o.etapa;
    if (!desconocido && de === nueva) { this.destello(id, 'info'); fin(); return; }
    this.quitarDeListas(id);
    o.etapa = nueva;
    this.listas[nueva].push(id);
    this.refrescarConteos(true);
    const i = this.listas[nueva].indexOf(id);
    const destino = this.slotPos(nueva, Math.min(Math.max(i, 0), CAJAS_VISIBLES - 1));
    const c = this.cajas.get(id) ?? this.nuevaCaja(id);
    if (desconocido || modo === 'desvanecido' || this.tw.reducido || !esEstacion(de)) {
      this.tw.cancelar(c.g);
      c.viajando = false;
      c.g.position.copy(destino);
      if (esEstacion(de)) this.acomodar(de, true);
      this.acomodar(nueva, true);
      this.aparecer(c.g, fin);
      return;
    }
    c.viajando = true;
    c.g.visible = true; // una caja que estaba fuera de las 18 visibles también se ve viajar
    this.acomodar(de, true);
    const enBanda = this.kit.v(c.g.position.x, BELT_Z, 0.8);
    this.saltar(c.g, enBanda, 0.42, 0.9, () => {
      const idx = this.listas[nueva].indexOf(id);
      const dest = this.slotPos(nueva, Math.min(Math.max(idx, 0), CAJAS_VISIBLES - 1));
      const desde = c.g.position.clone();
      const fn = this.kit.v(dest.x, BELT_Z, 0.8);
      const dur = Math.max(0.5, Math.abs(fn.x - desde.x) / 7);
      this.tw.agregar(dur, (k) => { c.g.position.lerpVectors(desde, fn, ease.inOut(k)); }, () => {
        this.saltar(c.g, dest, 0.42, 0.9, () => {
          c.viajando = false;
          this.pulso(this.kit.v(PADS[nueva].x, PADS[nueva].z, 0.17), this.etapas[nueva].tono, 2.0, 0.9);
          this.pop(this.kit.v(dest.x, dest.z, 1.3), this.etapas[nueva].tono, this.etapas[nueva].corto,
            `<span class="eve-mono">#${esc(o?.numero ?? '')}</span><small>${esc(this.quien(o ?? { cliente: null }))}</small>`, 2600);
          this.acomodar(nueva, true);
          fin();
        });
      }, c.g);
    });
  }

  /** Salida: una moto con el nombre del mensajero (o el camión) carga las cajas y sale por la vía; las hermanas viajan juntas. */
  private hacerSalida(evs: EventoSalida[], modo: ModoTrabajo, fin: () => void): void {
    const primero = evs[0];
    const nombre = primero.transportador ?? null;
    const tipo = primero.tipoTransportador === 'transportadora' ? 'transportadora' : 'mensajero';
    const ids = [...new Set(evs.map((e) => e.pedidoId))];
    const os: PedidoEscena[] = ids.map((id) => {
      const ev = evs.find((e) => e.pedidoId === id) as EventoSalida;
      let o = this.pedidos.get(id);
      if (!o) { o = this.desdeEvento(ev, 'camino'); this.pedidos.set(id, o); }
      return o;
    });
    const veh = this.vehiculoPara(nombre, tipo);
    const gs: ThreeNS.Group[] = [];
    os.forEach((o) => {
      const c = this.cajas.get(o.id);
      if (c) gs.push(c.g);
      this.quitarDeListas(o.id);
      o.etapa = 'camino';
      o.transportador = nombre;
      o.tipoTransportador = tipo;
      veh?.pedidos.add(o.id);
    });
    if (veh) veh.uso = performance.now();
    this.refrescarConteos(true);
    // vehículo ocupado o sin vehículo libre, o cola larga: la caja sale con un desvanecido
    if (!veh || veh.vis !== 'base' || modo === 'desvanecido' || this.tw.reducido) {
      if (veh) this.refrescarEtiquetaVeh(veh);
      if (veh && veh.vis === 'base') {
        if (veh.tipo === 'moto') this.parquearEnCasa(veh, this.indiceCasa(os[0]));
        else this.ponerFuera(veh);
      }
      let pendientes = gs.length;
      const ya = (): void => { if (--pendientes <= 0) { ESTACIONES.forEach((st) => this.acomodar(st, true)); fin(); } };
      if (!gs.length) { ESTACIONES.forEach((st) => this.acomodar(st, true)); fin(); return; }
      gs.forEach((g) => this.desvanecer(g, () => { this.borrarCaja(g.userData['pedidoId'] as string); ya(); }));
      return;
    }
    veh.vis = 'mov';
    this.refrescarEtiquetaVeh(veh);
    const salir = (): void => {
      this.acomodar('listo', true);
      this.refrescarEtiquetaVeh(veh);
      if (veh.tipo === 'moto') {
        // A la casa del primer pedido: parquea al frente hasta que se marque Entregado.
        const casa = this.indiceCasa(os[0]);
        veh.casa = casa;
        this.manejar(veh, this.rutaACasa(this.kit.v(PICK.x, PICK.z), casa), 7.5, () => this.llegarACasa(veh, casa));
      } else {
        const ruta = [this.kit.v(TRUCK.x, TRUCK.z), this.kit.v(16.2, TRUCK.z), this.kit.v(16.2, LANE_OUT), this.kit.v(EXIT_X, LANE_OUT)];
        this.manejar(veh, ruta, 6, () => this.salirDeEscena(veh));
      }
      fin();
    };
    const ir = (): void => this.cargar(veh, gs, salir);
    if (veh.tipo === 'moto') {
      const s = veh.slot;
      this.manejar(veh, [this.kit.v(s.x, s.z), this.kit.v(s.x, -0.5), this.kit.v(PICK.x, PICK.z)], 6.5, ir);
    } else ir();
  }

  private cargar(veh: Vehiculo, gs: ThreeNS.Group[], done: () => void): void {
    if (!gs.length) { done(); return; }
    const carga = veh.carga;
    veh.obj.updateMatrixWorld(true);
    let i = 0;
    const siguiente = (): void => {
      if (i >= gs.length) { done(); return; }
      const g = gs[i];
      const n = carga.children.length;
      const local = veh.tipo === 'moto' ? this.kit.v(0, 0.24 + n * 0.46, 0) : this.kit.v(0, 0, 0);
      veh.obj.updateMatrixWorld(true);
      const destino = carga.localToWorld(local.clone());
      const c = this.cajas.get(g.userData['pedidoId'] as string);
      if (c) c.viajando = true;
      const s0 = g.scale.x;
      const s1 = veh.tipo === 'moto' ? 0.62 : 0.8;
      this.saltar(g, destino, 0.42, veh.tipo === 'moto' ? 1.4 : 2.6, () => {
        if (veh.tipo === 'moto') {
          carga.attach(g);
          g.position.copy(local);
          g.rotation.set(0, 0, 0);
        } else this.borrarCaja(g.userData['pedidoId'] as string);
        i++;
        siguiente();
      });
      this.tw.agregar(0.42, (k) => g.scale.setScalar(s0 + (s1 - s0) * k));
    };
    siguiente();
  }

  /** Entregado: una casa del barrio recibe la caja con un pulso verde y confeti. */
  private hacerEntrega(ev: EventoEnVivo, modo: ModoTrabajo, fin: () => void): void {
    const id = ev.pedidoId;
    const o = this.pedidos.get(id) ?? this.desdeEvento(ev, 'entregado');
    const veh = this.vehiculoDe(id);
    this.quitarDeListas(id);
    veh?.pedidos.delete(id);
    this.pedidos.delete(id);
    this.refrescarConteos(true);
    const c = this.cajas.get(id);
    const indice = this.indiceCasa(o);
    const casa = this.mundo.casas[indice] ?? this.mundo.casas[0];
    const enMoto = !!veh && veh.tipo === 'moto' && !!c && c.g.parent === veh.carga;
    if (enMoto && casa && veh && c && modo !== 'desvanecido' && !this.tw.reducido) {
      // La caja salta de la moto a la puerta de la casa.
      const puerta = this.kit.v(casa.x - 0.45, casa.z - 1.25, 0.4);
      this.scene.attach(c.g);
      c.viajando = true;
      this.saltar(c.g, puerta, 0.55, 1.6, () => this.desvanecer(c.g, () => this.borrarCaja(id)));
    } else if (c && c.g.parent) {
      this.desvanecer(c.g, () => this.borrarCaja(id));
    }
    ESTACIONES.forEach((st) => this.acomodar(st, true));
    if (veh) {
      this.refrescarEtiquetaVeh(veh);
      if (veh.tipo === 'moto') this.tw.esperar(enMoto ? 0.9 : 0, () => this.siguienteParada(veh));
      else this.revisarRegreso(veh);
    }
    if (modo === 'desvanecido') { fin(); return; }
    if (!casa) { fin(); return; }
    const T = this.T;
    const pin = new T.Group();
    let cono = this.geoCache.get('pin|cono');
    if (!cono) { cono = new T.ConeGeometry(0.3, 0.7, 16); this.geoCache.set('pin|cono', cono); }
    const punta = this.kit.malla(cono, this.kit.mt('ok'), pin, 0, 0.35, 0);
    punta.rotation.x = Math.PI;
    this.kit.malla(this.kit.gEsf(0.34), this.kit.mt('ok'), pin, 0, 0.82, 0);
    pin.position.set(casa.x, 9, casa.z);
    this.scene.add(pin);
    this.marcarEfimero(pin);
    const subtexto = `<span class="eve-mono">#${esc(o.numero ?? '')}</span><small>${esc([this.quien(o), this.ubic(o)].filter((x) => !!x).join(' · '))}</small>`;
    this.tw.agregar(0.9, (k) => { pin.position.y = 9 + (2.75 - 9) * ease.bounce(k); }, () => {
      this.pulso(this.kit.v(casa.x, casa.z - 1.5, 0.12), 'ok', 2.6, 1.1);
      this.confeti(this.kit.v(casa.x, casa.z, 3.4));
      this.pop(this.kit.v(casa.x, casa.z, 4.0), 'ok', 'Entregado', subtexto, 3600);
      this.tw.esperar(2.6, () => this.tw.agregar(0.4, (u) => pin.scale.setScalar(1 - u), () => this.soltarEfimero(pin)));
      fin();
    });
  }

  /** Recorrido de la moto: sale al carril, avanza hasta la casa y parquea al frente, junto a la puerta. */
  private rutaACasa(desde: V3, indice: number): V3[] {
    const casa = this.mundo.casas[indice] ?? this.mundo.casas[0];
    if (!casa) return [desde];
    const x = casa.x + PARQUEO_CASA.dx;
    return [desde, this.kit.v(desde.x, LANE_OUT), this.kit.v(x, LANE_OUT), this.kit.v(x, PARQUEO_CASA.z)];
  }

  /** La moto llegó a la casa: queda parqueada mirando a la casa, con su nombre y sus pedidos. */
  private llegarACasa(v: Vehiculo, indice: number): void {
    v.vis = 'casa';
    v.casa = indice;
    v.headT = -Math.PI / 2;
    this.refrescarEtiquetaVeh(v);
    this.sucio = true;
    if (!v.pedidos.size) this.siguienteParada(v); // se entregó mientras iba: vuelve
  }

  /** Sin animar (al cargar la foto): la moto aparece parqueada frente a la casa. */
  private parquearEnCasa(v: Vehiculo, indice: number): void {
    const casa = this.mundo.casas[indice] ?? this.mundo.casas[0];
    if (!casa) { this.ponerFuera(v); return; }
    this.tw.cancelar(v.obj);
    v.obj.visible = true;
    v.obj.position.set(casa.x + PARQUEO_CASA.dx, 0, PARQUEO_CASA.z);
    v.headT = -Math.PI / 2;
    v.obj.rotation.y = v.headT;
    v.vis = 'casa';
    v.casa = indice;
    this.refrescarEtiquetaVeh(v);
  }

  /** La casa del primer pedido que lleva la moto. */
  private casaDe(v: Vehiculo): number {
    for (const id of v.pedidos) {
      const o = this.pedidos.get(id);
      if (o) return this.indiceCasa(o);
    }
    return 0;
  }

  /** Después de entregar: si le quedan pedidos va a la casa del siguiente; si no, vuelve al garaje. */
  private siguienteParada(v: Vehiculo): void {
    if (v.vis === 'mov') return; // llegarACasa decide al llegar
    if (v.vis !== 'casa') { this.revisarRegreso(v); return; }
    const desde = v.obj.position.clone();
    if (v.pedidos.size) {
      const casa = this.casaDe(v);
      if (casa === v.casa) return;
      v.vis = 'mov';
      v.casa = casa;
      this.refrescarEtiquetaVeh(v);
      this.manejar(v, this.rutaACasa(desde, casa), 6.5, () => this.llegarACasa(v, casa));
      return;
    }
    v.vis = 'mov';
    v.casa = null;
    this.refrescarEtiquetaVeh(v);
    const ruta = [desde, this.kit.v(desde.x, LANE_BACK), this.kit.v(v.slot.x, LANE_BACK), this.kit.v(v.slot.x, v.slot.z)];
    this.manejar(v, ruta, 7, () => {
      v.vis = 'base';
      v.headT = Math.PI / 2;
      this.refrescarEtiquetaVeh(v);
    });
  }

  /** Pone una caja en la parrilla de la moto (sin animar). */
  private ponerEnCarga(v: Vehiculo, g: ThreeNS.Group): void {
    const n = v.carga.children.length;
    v.carga.attach(g);
    g.position.set(0, 0.24 + n * 0.46, 0);
    g.rotation.set(0, 0, 0);
    g.scale.setScalar(0.62);
    g.visible = true;
  }

  private indiceCasa(o: PedidoEscena): number {
    let h = 2166136261;
    const t = o.id;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % Math.max(1, this.mundo.casas.length);
  }

  /** Rechazado o cancelado: la caja se pone roja, se sacude y desaparece. */
  private hacerRechazo(ev: EventoEnVivo, modo: ModoTrabajo, fin: () => void): void {
    const id = ev.pedidoId;
    const o = this.pedidos.get(id) ?? this.desdeEvento(ev, ev.tipo === 'cancelado' ? 'cancelado' : 'rechazado');
    const veh = this.vehiculoDe(id);
    this.quitarDeListas(id);
    veh?.pedidos.delete(id);
    this.pedidos.delete(id);
    this.refrescarConteos(true);
    if (veh) {
      this.refrescarEtiquetaVeh(veh);
      if (veh.tipo === 'moto') this.siguienteParada(veh);
      else this.revisarRegreso(veh);
    }
    const c = this.cajas.get(id);
    const etiqueta = ev.tipo === 'cancelado' ? 'Cancelado' : 'Rechazado';
    if (!c || !c.g.visible || c.g.parent !== this.scene) {
      if (c) this.borrarCaja(id);
      ESTACIONES.forEach((st) => this.acomodar(st, true));
      fin();
      return;
    }
    c.cuerpo.material = this.kit.mt('bad');
    c.viajando = true;
    const x0 = c.g.position.x;
    if (modo === 'animado') this.pop(c.g.position.clone().add(new this.T.Vector3(0, 1.2, 0)), 'bad', etiqueta, `<span class="eve-mono">#${esc(o.numero ?? '')}</span>`, 2600);
    this.tw.cancelar(c.g);
    this.tw.agregar(0.5, (k) => { c.g.position.x = x0 + Math.sin(k * Math.PI * 8) * 0.12 * (1 - k); }, () => {
      this.desvanecer(c.g, () => {
        this.borrarCaja(id);
        ESTACIONES.forEach((st) => this.acomodar(st, true));
        fin();
      });
    }, c.g);
  }

  /** Pago confirmado y mensajero asignado: un pulso corto sobre la caja (sin mover nada). */
  private hacerDestello(ev: EventoEnVivo, fin: () => void): void {
    const o = this.pedidos.get(ev.pedidoId);
    if (o && ev.tipo === 'asignado') {
      o.transportador = ev.transportador ?? o.transportador;
      o.tipoTransportador = ev.tipoTransportador ?? o.tipoTransportador;
    }
    this.destello(ev.pedidoId, ev.tipo === 'pago_confirmado' ? 'ok' : 'info');
    fin();
  }

  private destello(id: string, token: string): void {
    const p = this.posCaja(id);
    if (p) this.pulso(this.kit.v(p.x, p.z, 0.17), token, 1.6, 0.8);
  }
}
