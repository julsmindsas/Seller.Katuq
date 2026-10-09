import type * as ThreeNS from 'three';
import { DEG, OpcionesEscena, RoundedBox, Three } from '../../../shared/escena-3d/escena-base';
import { ALTO_MAPA, IdMapa, MapaColombiaEscena } from '../../../shared/escena-3d/mapa-colombia.scene';
import { EtapaInfo, EventoEnVivo, EventoSalida, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { primerNombre } from '../servicios/en-vivo-reglas';
import { dinero } from '../utilidades/formato';
import { EtiquetaH, GestorEtiquetas, esc } from './etiquetas-html';
import { esOscuro } from './escena-tokens';
import { OpcionesEscenaMapa, ToqueMapa, aplicarLucesDeTema, hexDe, margenesBase, vistaPais } from './mapas.tipos';
import { NucleoEscena, svgEscena } from './nucleo-escena';
import {
  AgrupadorSalidas,
  alturaColumna,
  ciudadConMasPedidos,
  claveDeSalida,
  contarPedidosDeHoy,
  nombreDeLugar,
  resolverDane,
} from './pais.utilidades';

// ==========================================================================
// "Mi país" del comercio (D-386, tarea 5.3): el mapa compartido de Colombia con una columna por
// ciudad que crece con los pedidos de HOY, un pulso y un haz en la ciudad de cada pedido nuevo, un
// arco desde la ciudad de la bodega hasta la del cliente cuando sale, y un pulso verde con confeti
// cuando se entrega. Los pedidos sin ciudad cuentan en las cifras pero no se dibujan. Referencia
// de look y movimiento: el prototipo publicado con la propuesta (`crearMapa`). Solo lectura.
// ==========================================================================

type V3 = ThreeNS.Vector3;

interface Columna {
  dane: string;
  m: ThreeNS.Mesh;
  h: number;
  objetivo: number;
  n: number;
  grosor: number;
  /** Punto sobre la columna donde va su nombre. */
  ancla: V3;
}

export interface DiagnosticoMapa {
  columnas: number;
  pedidosHoy: number;
  sinCiudad: number;
  origen: string | null;
  efectos: number;
  arcos: number;
  tweens: number;
  etiquetas: number;
  tarjetas: number;
}

const NOMBRES_FIJOS = 5;

export class MapaEnVivoEscena extends MapaColombiaEscena {
  protected override readonly vista = vistaPais(0xe7e2f7);

  /** Crea la escena (los callbacks de la base necesitan la instancia, por eso es una fábrica). */
  static crear(T: Three, RB: RoundedBox, o: OpcionesEscenaMapa): MapaEnVivoEscena {
    const ref: { esc: MapaEnVivoEscena | null } = { esc: null };
    const nucleo = new NucleoEscena(
      { etiquetas: o.etiquetas, reducirMovimiento: o.reducirMovimiento, tokens: o.tokens },
      {
        enfocar: (x, y, z, zoom) => ref.esc?.enfocarPunto({ x, y, z }, zoom),
        soltar: () => ref.esc?.soltarFoco(),
        girar: (rad) => ref.esc?.girar(rad / DEG),
      },
    );
    const base: OpcionesEscena<IdMapa> = {
      canvas: o.canvas,
      reducirMovimiento: o.reducirMovimiento,
      calidadBaja: o.calidadBaja,
      onHover: (id) => ref.esc?.alHover(id),
      onClick: (id) => ref.esc?.alClick(id),
      onFrame: (a) => nucleo.posicionar(a, ref.esc?.ancho ?? 1, ref.esc?.alto ?? 1),
      onVacio: () => o.onVacio?.(),
    };
    const escena = new MapaEnVivoEscena(T, RB, base, o, nucleo);
    ref.esc = escena;
    return escena;
  }

  // ---- estado
  private readonly cols = new Map<string, Columna>();
  private readonly conteo = new Map<string, number>();
  /** Pedido de hoy → ciudad donde se dibuja (para descontarlo si se cancela y para ubicarlo). */
  private readonly ciudadDePedido = new Map<string, string>();
  private readonly textoCiudad = new Map<string, string>();
  private sinCiudad = 0;
  private origen: string | null = null;
  /** La bodega la fijó quien integra la escena (si no, se toma la ciudad con más pedidos). */
  private origenFijo = false;
  private bodegaPropia = true;
  private bodega: ThreeNS.Group | null = null;
  private etqBodega: EtiquetaH | null = null;
  private readonly etqCiudades = new Map<string, EtiquetaH>();
  private readonly salidas = new AgrupadorSalidas<EventoSalida>();
  private anillos: ThreeNS.Mesh[] = [];
  private resaltadas: string[] = [];
  private hoverDane: string | null = null;

  private constructor(
    T: Three,
    RB: RoundedBox,
    base: OpcionesEscena<IdMapa>,
    private readonly cfg: OpcionesEscenaMapa,
    private readonly nucleo: NucleoEscena,
  ) {
    super(T, RB, base, cfg.geo);
  }

  // =========================================================== API pública

  /** Etapas con su tono tal como las manda el servidor. */
  fijarEtapas(etapas: ReadonlyArray<EtapaInfo>): void {
    this.nucleo.fijarEtapas(etapas);
  }

  /** "Ocultar clientes y montos": las tarjetas no muestran valores. */
  fijarPrivado(privado: boolean): void {
    this.nucleo.privado = privado;
  }

  fijarReducirMovimiento(reducir: boolean): void {
    this.opts.reducirMovimiento = reducir;
    this.nucleo.fijarReducirMovimiento(reducir);
    this.sucio = true;
  }

  /** Cámara automática del modo pantalla: vaivén lento y foco breve donde llega un pedido. */
  fijarAutomatica(activa: boolean): void {
    this.nucleo.camara.fijar(activa);
  }

  /**
   * Ciudad de la bodega (código DANE): de ahí salen los arcos. `propia` dice si es "Tu bodega" o la
   * "Bodega" de un comercio que mira Katuq. null = no se dibuja y los envíos salen como pulso.
   */
  fijarOrigen(dane: string | null, propia = true): void {
    this.origen = dane;
    this.origenFijo = dane !== null;
    this.bodegaPropia = propia;
    this.ubicarBodega();
  }

  /**
   * Deja la escena igual a los pedidos, sin animar eventos: al cargar, tras reconectar o al volver
   * a la pestaña. `dia` es el día de Colombia de la foto (`cifras.dia`). Si no se fijó la ciudad de
   * la bodega, se toma la que más pedidos tiene hoy.
   */
  aplicarFoto(pedidos: ReadonlyArray<PedidoEnVivo>, dia: string): void {
    this.salidas.limpiar();
    this.nucleo.limpiar();
    this.conteo.clear();
    this.ciudadDePedido.clear();
    const r = contarPedidosDeHoy(this.cfg.geo, pedidos, dia);
    r.porCiudad.forEach((n, d) => this.conteo.set(d, n));
    r.porPedido.forEach((d, id) => this.ciudadDePedido.set(id, d));
    this.sinCiudad = r.sinCiudad;
    pedidos.forEach((p) => {
      const d = this.ciudadDePedido.get(p.id);
      if (d && p.ciudad) this.textoCiudad.set(d, p.ciudad);
    });
    this.refrescarColumnas();
    if (!this.origenFijo) this.origen = ciudadConMasPedidos(this.conteo);
    this.ubicarBodega();
    this.sucio = true;
  }

  /** Anima un evento en vivo. */
  aplicarEvento(ev: EventoEnVivo): void {
    const ahora = performance.now();
    const ligero = this.nucleo.rafaga.registrar(ahora);
    const dane = resolverDane(this.cfg.geo, ev.dane, ev.ciudad);
    if (dane && ev.ciudad) this.textoCiudad.set(dane, ev.ciudad);
    switch (ev.tipo) {
      case 'pedido_nuevo': this.hacerLlegada(ev, dane, ligero); break;
      case 'salida': this.salidas.agregar(claveDeSalida('', ev.tipoTransportador, ev.transportador), ev, ahora); break;
      case 'entregado': this.hacerEntrega(ev, dane, ligero); break;
      case 'rechazado':
      case 'cancelado': this.hacerRechazo(ev, dane); break;
      default: break;
    }
    this.sucio = true;
  }

  /** Resalta las ciudades de estos pedidos con un anillo (al pasar el puntero por un evento de la lista). */
  override resaltar(ids: string | string[] | null): void {
    const lista = ids === null ? [] : Array.isArray(ids) ? ids : [ids];
    const danes: string[] = [];
    lista.forEach((id) => {
      const d = this.ciudadDePedido.get(id);
      if (d && danes.indexOf(d) < 0) danes.push(d);
    });
    this.resaltadas = danes.slice(0, this.anillos.length || 6);
    this.sucio = true;
  }

  /** Quita lo que estaba animándose (efectos, tarjetas, salidas en espera) sin tocar el conteo: al volver a la pestaña. */
  soltarEfectos(): void {
    this.salidas.limpiar();
    this.nucleo.limpiar();
    this.sucio = true;
  }

  /** Vacía lo animado y las columnas (la escena queda con el mapa y la bodega). */
  reiniciar(): void {
    this.salidas.limpiar();
    this.nucleo.limpiar();
    this.conteo.clear();
    this.ciudadDePedido.clear();
    this.sinCiudad = 0;
    this.refrescarColumnas();
    this.resaltadas = [];
    this.sucio = true;
  }

  /** Vuelve a leer los colores (cambió el tema: modo pantalla oscuro). */
  retema(): void {
    this.nucleo.kit.retemar();
    this.aplicarLuces();
    this.retemarMapa();
    this.sucio = true;
  }

  /** El gestor de etiquetas HTML de la escena (el orbe de Opttia pone ahí su burbuja). */
  get gestorEtiquetas(): GestorEtiquetas {
    return this.nucleo.etq;
  }

  /** Posición (mundo) de una ciudad sobre el mapa; null si no se puede ubicar. Sirve para el orbe y la ficha. */
  posCiudad(dane: string): V3 | null {
    return this.posDeCiudad(dane, 0);
  }

  /** Dónde se dibuja un pedido de hoy (su ciudad); null si no cuenta o no tiene ciudad. */
  posPedido(id: string): V3 | null {
    const d = this.ciudadDePedido.get(id);
    return d ? this.posDeCiudad(d, 0) : null;
  }

  posBodega(): V3 | null {
    return this.origen ? this.posDeCiudad(this.origen, 0) : null;
  }

  /** Para pruebas: qué hay en la escena y qué tan ocupada está. */
  diagnostico(): DiagnosticoMapa {
    let total = 0;
    this.conteo.forEach((n) => { total += n; });
    return {
      columnas: this.cols.size,
      pedidosHoy: total + this.sinCiudad,
      sinCiudad: this.sinCiudad,
      origen: this.origen,
      efectos: this.nucleo.fx.activos,
      arcos: this.nucleo.fx.arcosVivos,
      tweens: this.nucleo.tw.cantidad,
      etiquetas: this.nucleo.etq.cantidad,
      tarjetas: this.nucleo.etq.popsVivos,
    };
  }

  /** Pedidos de hoy dibujados en una ciudad (para pruebas y para el orbe). */
  pedidosEn(dane: string): number {
    return this.conteo.get(dane) ?? 0;
  }

  override destruir(): void {
    this.nucleo.destruir();
    super.destruir();
  }

  // ======================================================= ganchos de la base

  protected override construir(): void {
    this.nucleo.armar(this.T, this.geoCache, this.scene, (tex) => this.registrarTextura(tex));
    super.construir();
    this.aplicarLuces();
    this.renderer.setClearColor(this.colorFondoMapa(), 1);
    this.crearBodega();
    this.crearAnillos();
    this.ajustarAContenido(this.puntosDeEncuadre(3.4), (ancho) => margenesBase(ancho));
    this.refrescarColumnas();
    this.ubicarBodega();
  }

  protected override seleccionable(id: IdMapa): boolean {
    return !id.startsWith('d:');
  }

  protected override colorFondoMapa(): number {
    return hexDe(this.T, this.nucleo?.kit?.tokens['scene-bg'] ?? this.cfg.tokens()['scene-bg'], 0xe7e2f7);
  }

  protected override colorTierra(): string {
    return this.nucleo?.kit?.tokens['map-land'] ?? this.cfg.tokens()['map-land'];
  }

  protected override colorCostado(): number {
    return hexDe(this.T, this.nucleo?.kit?.tokens['map-side'] ?? this.cfg.tokens()['map-side'], 0xcfc5f3);
  }

  protected override colorBorde(): string {
    return this.nucleo?.kit?.tokens['map-line'] ?? this.cfg.tokens()['map-line'];
  }

  protected override colorLineaInset(): number {
    return hexDe(this.T, this.nucleo?.kit?.tokens['map-line'] ?? this.cfg.tokens()['map-line'], 0xa996ff);
  }

  protected override cuadro(t: number, dt: number): boolean {
    const ahora = performance.now();
    let cambio = this.nucleo.paso(dt);
    this.salidas.sacar(ahora).forEach((g) => this.hacerSalida(g.items));
    this.cols.forEach((c) => {
      const h = c.h + (c.objetivo - c.h) * Math.min(1, dt * 4);
      const crece = c.dane === this.hoverDane ? 1.45 : 1;
      const g = c.grosor + (crece - c.grosor) * 0.25;
      if (Math.abs(h - c.h) > 0.0005 || Math.abs(g - c.grosor) > 0.002) {
        c.h = h;
        c.grosor = g;
        c.m.scale.set(g, Math.max(0.001, h), g);
        c.m.position.y = ALTO_MAPA + h / 2;
        cambio = true;
      }
      // El nombre de la ciudad de la bodega sube para no encimarse con el letrero "Tu bodega".
      c.ancla.y = ALTO_MAPA + (c.dane === this.origen ? Math.max(c.h + 0.9, 2.2) : c.h + 0.35);
    });
    this.moverAnillos(t);
    this.nucleo.camara.paso(t, ahora, this.opts.reducirMovimiento);
    if (this.nucleo.etq.expirar(ahora)) cambio = true;
    return cambio || this.salidas.cantidad > 0;
  }

  protected override *anclas(): Iterable<[IdMapa, V3]> {
    yield* this.nucleo.etq.anclas();
  }

  // ============================================================== mundo

  private aplicarLuces(): void {
    if (this.luzHemi && this.luzSol) aplicarLucesDeTema(this.luzHemi, this.luzSol, esOscuro(this.nucleo.tokens));
  }

  private crearBodega(): void {
    const k = this.nucleo.kit;
    const g = new this.T.Group();
    k.malla(k.gRbox(0.8, 0.55, 0.8, 0.1), k.mt('accent'), g, 0, 0.28, 0);
    k.malla(k.gCaja(0.9, 0.08, 0.9), k.mt('scene-wall'), g, 0, 0.6, 0);
    g.visible = false;
    this.scene.add(g);
    this.bodega = g;
  }

  private textoBodega(): string {
    const ciudad = this.origen ? nombreDeLugar(this.cfg.geo, this.origen, this.textoCiudad.get(this.origen)) : '';
    return `${this.bodegaPropia ? 'Tu bodega' : 'Bodega'} · ${ciudad}`;
  }

  private ubicarBodega(): void {
    if (!this.bodega) return;
    const p = this.origen ? this.posDeCiudad(this.origen, 0) : null;
    this.bodega.visible = !!p;
    if (!p) {
      if (this.etqBodega) { this.nucleo.quitarFija(this.etqBodega); this.etqBodega = null; }
      return;
    }
    this.bodega.position.copy(p);
    const html = esc(this.textoBodega());
    if (!this.etqBodega) {
      const arriba = new this.T.Vector3();
      this.etqBodega = this.nucleo.fija(html, () => (this.bodega ? arriba.copy(this.bodega.position).setY(this.bodega.position.y + 1.1) : null), 1000);
    } else this.nucleo.etq.actualizarHtml(this.etqBodega, html);
    this.sucio = true;
  }

  private crearAnillos(): void {
    const g = new this.T.RingGeometry(0.42, 0.58, 32);
    this.geoCache.set('anillo-ciudad', g);
    const m = this.nucleo.kit.basico('accent', 0.95);
    for (let i = 0; i < 6; i++) {
      const a = new this.T.Mesh(g, m);
      a.rotation.x = -Math.PI / 2;
      a.visible = false;
      this.scene.add(a);
      this.anillos.push(a);
    }
  }

  private moverAnillos(t: number): void {
    const dan = this.resaltadas.slice();
    if (this.hoverDane && dan.indexOf(this.hoverDane) < 0) dan.push(this.hoverDane);
    this.anillos.forEach((a, i) => {
      const c = i < dan.length ? this.posDeCiudad(dan[i], 0) : null;
      if (!c) { a.visible = false; return; }
      a.position.set(c.x, ALTO_MAPA + 0.07, c.z);
      a.scale.setScalar(1 + (this.opts.reducirMovimiento ? 0 : Math.sin(t * 6) * 0.08));
      a.visible = true;
    });
  }

  // ============================================================== columnas

  /** Pone las columnas y los nombres de las 5 ciudades con más pedidos al día con el conteo. */
  private refrescarColumnas(): void {
    if (!this.scene) return;
    const k = this.nucleo.kit;
    const orden = [...this.conteo.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const vivas = new Set(orden.map(([d]) => d));
    this.cols.forEach((c, d) => {
      if (vivas.has(d)) return;
      this.scene.remove(c.m);
      const i = this.pickables.indexOf(c.m);
      if (i >= 0) this.pickables.splice(i, 1);
      this.cols.delete(d);
    });
    orden.forEach(([dane, n]) => {
      const p = this.posDeCiudad(dane, 0);
      if (!p) return;
      let c = this.cols.get(dane);
      if (!c) {
        const m = k.malla(k.gCil(0.2, 0.2, 1, 16), k.mt(dane === this.origen ? 'accent-2' : 'accent'), this.scene, p.x, ALTO_MAPA, p.z);
        m.scale.y = 0.001;
        m.userData['zona'] = 'c:' + dane;
        this.pickables.push(m);
        c = { dane, m, h: 0.001, objetivo: 0, n, grosor: 1, ancla: new this.T.Vector3(p.x, ALTO_MAPA + 0.35, p.z) };
        this.cols.set(dane, c);
      }
      c.n = n;
      c.objetivo = alturaColumna(n);
    });
    const top = orden.slice(0, NOMBRES_FIJOS).map(([d]) => d);
    this.etqCiudades.forEach((e, d) => {
      if (top.indexOf(d) >= 0) return;
      this.nucleo.quitarFija(e);
      this.etqCiudades.delete(d);
    });
    top.forEach((d) => {
      const c = this.cols.get(d);
      if (!c) return;
      const html = `${esc(nombreDeLugar(this.cfg.geo, d, this.textoCiudad.get(d)))} · <b>${c.n}</b>`;
      const e = this.etqCiudades.get(d);
      if (!e) this.etqCiudades.set(d, this.nucleo.fija(html, () => c.ancla, c.n));
      else { this.nucleo.etq.actualizarHtml(e, html); this.nucleo.prioridadDe(e, c.n); }
    });
    this.sucio = true;
  }

  private contar(dane: string, delta: number): void {
    this.conteo.set(dane, Math.max(0, (this.conteo.get(dane) ?? 0) + delta));
    this.refrescarColumnas();
  }

  // ============================================================== eventos

  private alSuelo(p: V3): V3 {
    return p.clone().setY(ALTO_MAPA + 0.03);
  }

  private monto(m: number | null | undefined): string {
    return this.nucleo.privado || !m ? '' : dinero(m);
  }

  private ubicacion(ev: EventoEnVivo, dane: string | null): string {
    return nombreDeLugar(this.cfg.geo, dane, ev.ciudad);
  }

  /** Pedido nuevo: haz y pulso en la ciudad del pedido, su columna crece y sale una tarjeta. */
  private hacerLlegada(ev: Extract<EventoEnVivo, { tipo: 'pedido_nuevo' }>, dane: string | null, ligero: boolean): void {
    if (this.ciudadDePedido.has(ev.pedidoId)) return;
    if (!dane) { this.sinCiudad++; return; }
    this.ciudadDePedido.set(ev.pedidoId, dane);
    this.contar(dane, 1);
    const p = this.posDeCiudad(dane, 0);
    if (!p) return;
    const fx = this.nucleo.fx;
    fx.haz(this.alSuelo(p), ev.ia ? 'pack' : 'accent', 7, 1.2);
    fx.pulso(this.alSuelo(p), ev.ia ? 'pack' : 'accent', 2.2, 1.1);
    if (ligero) return;
    const venta = ev.etapa === 'entregado';
    const pill = ev.ia ? 'Con Opttia' : venta ? 'Venta en tienda' : 'Nuevo pedido';
    const arriba = p.clone().setY(ALTO_MAPA + 1.4);
    this.nucleo.tarjeta(
      () => arriba,
      ev.ia ? 'pack' : 'accent',
      pill,
      `<span class="eve-mono">#${esc(ev.numero ?? '')}</span><span class="eve-amt">${esc(this.monto(ev.monto))}</span><small>${esc(this.ubicacion(ev, dane))}</small>`,
      3800,
    );
    this.nucleo.camara.enfocar(p.x, 0, p.z, 1.6, performance.now(), this.opts.reducirMovimiento);
  }

  /** Salida: un arco por cada ciudad de destino desde la bodega (o un pulso si es la misma ciudad). */
  private hacerSalida(evs: EventoSalida[]): void {
    if (!evs.length) return;
    const ligero = this.nucleo.rafaga.registrar(performance.now()) && evs.length < 2;
    const o = this.origen ? this.posDeCiudad(this.origen, 0) : null;
    const destinos: string[] = [];
    evs.forEach((e) => {
      const d = resolverDane(this.cfg.geo, e.dane, e.ciudad);
      if (d && destinos.indexOf(d) < 0) destinos.push(d);
    });
    if (o) {
      destinos.forEach((d, i) => {
        const p = this.posDeCiudad(d, 0);
        if (!p) return;
        const pulsoLlegada = (): void => this.nucleo.tw.esperar(i * 0.2, () => this.nucleo.fx.pulso(this.alSuelo(p), 'info', 1.8, 1.0));
        if (d === this.origen) { this.nucleo.tw.esperar(i * 0.2, () => this.nucleo.fx.pulso(this.alSuelo(o), 'info', 1.8, 1.0)); return; }
        if (ligero || !this.nucleo.fx.arco(this.alSuelo(o), this.alSuelo(p), ALTO_MAPA, 'info', i * 0.25)) pulsoLlegada();
      });
    }
    if (!o || this.nucleo.reducir) return;
    const primero = evs[0];
    const camion = primero.tipoTransportador === 'transportadora';
    const nombre = camion ? (primero.transportador || 'Transportadora') : primerNombre(primero.transportador) || 'Mensajero';
    const n = evs.length;
    const html = `${svgEscena(camion ? 'camion' : 'moto')}${esc(nombre)} · ${n} ${n === 1 ? 'pedido' : 'pedidos'}`;
    const arriba = o.clone().setY(ALTO_MAPA + 2.7);
    this.nucleo.etq.crear({ clase: 'eve-lbl--veh', html, pos: () => arriba, ms: 2600 });
  }

  /** Entregado: pulso verde en la ciudad del cliente y confeti. */
  private hacerEntrega(ev: EventoEnVivo, dane: string | null, ligero: boolean): void {
    const d = dane ?? this.ciudadDePedido.get(ev.pedidoId) ?? null;
    const p = d ? this.posDeCiudad(d, 0) : null;
    if (!d || !p) return;
    this.nucleo.fx.pulso(this.alSuelo(p), 'ok', 2.4, 1.2);
    if (ligero) return;
    this.nucleo.fx.confeti(p.clone().setY(ALTO_MAPA + 0.6));
    const arriba = p.clone().setY(ALTO_MAPA + 1.3);
    this.nucleo.tarjeta(
      () => arriba,
      'ok',
      'Entregado',
      `<span class="eve-mono">#${esc(ev.numero ?? '')}</span><small>${esc(this.ubicacion(ev, d))}</small>`,
      3200,
    );
  }

  /** Rechazado o cancelado: el pedido ya no cuenta en su ciudad y sale un pulso rojo. */
  private hacerRechazo(ev: EventoEnVivo, dane: string | null): void {
    const d = this.ciudadDePedido.get(ev.pedidoId) ?? dane;
    if (this.ciudadDePedido.has(ev.pedidoId)) {
      this.ciudadDePedido.delete(ev.pedidoId);
      if (d) this.contar(d, -1);
    }
    const p = d ? this.posDeCiudad(d, 0) : null;
    if (p) this.nucleo.fx.pulso(this.alSuelo(p), 'bad', 1.4, 0.9);
  }

  // ====================================================== puntero (toques)

  private traducir(id: IdMapa | null): ToqueMapa | null {
    return id && id.startsWith('c:') ? { tipo: 'ciudad', id: id.slice(2) } : null;
  }

  private alClick(id: IdMapa): void {
    const t = this.traducir(id);
    if (t) this.cfg.onClick(t);
    else this.cfg.onVacio?.();
  }

  private alHover(id: IdMapa | null): void {
    const t = this.traducir(id);
    this.hoverDane = t ? t.id : null;
    const c = t ? this.cols.get(t.id) : null;
    if (c && t) {
      const nombre = nombreDeLugar(this.cfg.geo, t.id, this.textoCiudad.get(t.id));
      this.nucleo.hover(
        `<b>${esc(nombre)}</b><span>${c.n} ${c.n === 1 ? 'pedido' : 'pedidos'} hoy · toca para ver la lista</span>`,
        () => c.ancla,
      );
    } else this.nucleo.hover(null);
    this.cfg.onHover?.(t);
    this.sucio = true;
  }
}
