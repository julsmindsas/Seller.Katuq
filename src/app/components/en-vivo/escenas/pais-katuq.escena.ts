import type * as ThreeNS from 'three';
import { DEG, OpcionesEscena, RoundedBox, Three } from '../../../shared/escena-3d/escena-base';
import { ALTO_MAPA, IdMapa, MapaColombiaEscena } from '../../../shared/escena-3d/mapa-colombia.scene';
import {
  AlertaRadar,
  CifrasGlobalEnVivo,
  EtapaInfo,
  EventoEnVivo,
  tonoCss,
} from '../servicios/en-vivo.modelos';
import { dinero, dineroCorto } from '../utilidades/formato';
import { esOscuro } from './escena-tokens';
import { EtiquetaH, GestorEtiquetas, esc } from './etiquetas-html';
import { OpcionesEscenaMapa, ToqueMapa, aplicarLucesDeTema, hexDe, margenesBase, vistaPais } from './mapas.tipos';
import { NucleoEscena } from './nucleo-escena';
import {
  ComercioDibujo,
  MAX_TORRES,
  agruparPorCiudad,
  alertasPorComercio,
  alturaTorre,
  corrimientoEnCiudad,
  demandaPorDepartamento,
  mezclaDeDemanda,
  mezclarHex,
  nombreDeLugar,
  nombreVisible,
  ordenarPorVentas,
  prepararComercios,
  resolverDane,
  seleccionarNombresFijos,
  valorDeAltura,
} from './pais.utilidades';

// ==========================================================================
// Escena "Katuq en Colombia" (D-386, tareas 5.10 y 5.12): el mapa compartido con una torre por
// comercio que crece con lo vendido hoy, el calor de pedidos por departamento (con su leyenda), un
// disco de calor por ciudad de entrega, anillos de alerta en las torres, a lo sumo 3 tarjetas y
// nombres fijos solo de los 5 comercios líderes sin encimarse entre ciudades cercanas. Tocar una
// torre abre el tablero de ese comercio. Solo lectura. Referencia: el prototipo (`crearPaisKatuq`).
// ==========================================================================

type V3 = ThreeNS.Vector3;

interface Torre {
  c: ComercioDibujo;
  g: ThreeNS.Group;
  cuerpo: ThreeNS.Mesh;
  techo: ThreeNS.Mesh;
  alerta: ThreeNS.Mesh;
  /** Pie de la torre sobre el mapa. */
  p: V3;
  /** Punto sobre la torre para su nombre y su tarjeta (se mueve con su altura). */
  cima: V3;
  h: number;
  objetivo: number;
  bump: number;
  alertaTono: string | null;
  etq: EtiquetaH | null;
}

export interface DiagnosticoPais {
  torres: number;
  conAlerta: number;
  nombresFijos: number;
  calor: number;
  departamentosConDemanda: number;
  efectos: number;
  arcos: number;
  tweens: number;
  etiquetas: number;
  tarjetas: number;
}

const ALTO_TORRE_BASE = 0.3;

export class PaisKatuqEscena extends MapaColombiaEscena {
  protected override readonly vista = vistaPais(0xe7e2f7);

  static crear(T: Three, RB: RoundedBox, o: OpcionesEscenaMapa): PaisKatuqEscena {
    const ref: { esc: PaisKatuqEscena | null } = { esc: null };
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
    const escena = new PaisKatuqEscena(T, RB, base, o, nucleo);
    ref.esc = escena;
    return escena;
  }

  // ---- estado
  private readonly torres = new Map<string, Torre>();
  private comercios: ComercioDibujo[] = [];
  private readonly calor = new Map<string, { d: ThreeNS.Mesh; m: ThreeNS.MeshBasicMaterial }>();
  /** Pedidos de hoy por ciudad de entrega (disco de calor) y por departamento (tono del mapa). */
  private readonly entregas = new Map<string, number>();
  private demanda = new Map<string, number>();
  private claveDemanda = '';
  private alertas = new Map<string, string>();
  private nombresFijos = new Set<string>();
  private anillo: ThreeNS.Mesh | null = null;
  private empresaResaltada: string | null = null;
  private hoverEmpresa: string | null = null;
  /** Arcos de envío ya dibujados hace poco (comercio → ciudad), para no repetirlos en una ráfaga. */
  private readonly arcosRecientes = new Map<string, number>();

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

  fijarEtapas(etapas: ReadonlyArray<EtapaInfo>): void {
    this.nucleo.fijarEtapas(etapas);
  }

  /** "Ocultar comercios y montos": los nombres dicen "Comercio en <ciudad>" y las alturas siguen los pedidos, no el dinero. */
  fijarPrivado(privado: boolean): void {
    if (this.nucleo.privado === privado) return;
    this.nucleo.privado = privado;
    this.actualizarAlturas();
    this.actualizarNombres();
    this.mostrarResalte(this.empresaResaltada ?? this.hoverEmpresa);
    this.sucio = true;
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
   * Pone las torres, el calor y los anillos de alerta al día con las cifras de toda Katuq. No es un
   * reinicio: lo que ya está crece o se acomoda con suavidad. Se llama al cargar, tras una
   * reconexión y cada vez que llegan cifras nuevas.
   */
  aplicarFoto(cifras: CifrasGlobalEnVivo, alertas?: ReadonlyArray<AlertaRadar> | null): void {
    const todos = prepararComercios(this.cfg.geo, cifras.comercios ?? []);
    this.comercios = ordenarPorVentas(todos.filter((c) => c.dane)).slice(0, MAX_TORRES);
    this.entregas.clear();
    (cifras.ciudades ?? []).forEach((c) => this.entregas.set(c.dane, c.pedidos));
    const deptos = cifras.departamentos?.length ? cifras.departamentos : null;
    this.demanda = deptos
      ? new Map(deptos.map((d) => [d.dane, d.pedidos] as const))
      : demandaPorDepartamento(cifras.ciudades ?? []);
    this.alertas = alertasPorComercio(alertas, this.comercios, (t) => tonoCss(t));
    this.reconciliar();
    this.actualizarDemanda();
    this.sucio = true;
  }

  /**
   * Anima un evento de toda Katuq sobre el comercio que lo tuvo. Con `contar`, además suma el pedido
   * a su torre y a la ciudad (lo usa "Repetir el día": sus eventos simulados no pasan por las cifras).
   */
  aplicarEvento(ev: EventoEnVivo, contar = false): void {
    const empresa = ev.comercio?.empresa ?? ev.empresa ?? '';
    const t = this.torres.get(empresa);
    const ahora = performance.now();
    const ligero = this.nucleo.rafaga.registrar(ahora);
    if (contar) this.contarEvento(ev, empresa);
    if (!t) { this.sucio = true; return; }
    const fx = this.nucleo.fx;
    switch (ev.tipo) {
      case 'pedido_nuevo': this.hacerLlegada(t, ev, ligero); break;
      case 'cambio_estado': fx.pulso(this.alSuelo(t.p), this.nucleo.tonoDeEtapa(ev.etapaNueva), 0.9, 0.8); break;
      case 'salida': this.hacerSalida(t, ev, ligero); break;
      case 'entregado': this.hacerEntrega(t, ev, ligero); break;
      case 'rechazado':
      case 'cancelado': fx.pulso(this.alSuelo(t.p), 'bad', 1.2, 0.9); break;
      default: break;
    }
    this.sucio = true;
  }

  /** Resalta una torre con un anillo y su tarjeta (al pasar el puntero por su fila en la carrera o su evento). */
  override resaltar(ids: string | string[] | null): void {
    const id = ids === null ? null : Array.isArray(ids) ? ids[0] ?? null : ids;
    this.empresaResaltada = id;
    this.mostrarResalte(id ?? this.hoverEmpresa);
    this.sucio = true;
  }

  /** Quita lo que estaba animándose (efectos, tarjetas) sin tocar las torres: al volver a la pestaña. */
  soltarEfectos(): void {
    this.nucleo.limpiar();
    this.arcosRecientes.clear();
    this.mostrarResalte(this.empresaResaltada ?? this.hoverEmpresa);
    this.sucio = true;
  }

  /** Deja todo en cero (sin torres altas, calor ni nombres): el punto de partida de "Repetir el día". */
  reiniciar(): void {
    this.nucleo.limpiar();
    this.arcosRecientes.clear();
    this.torres.forEach((t) => {
      t.c = { ...t.c, n: 0, ventas: 0 };
      t.objetivo = ALTO_TORRE_BASE;
      t.bump = 0;
    });
    this.comercios = this.comercios.map((c) => ({ ...c, n: 0, ventas: 0 }));
    this.entregas.clear();
    this.demanda = new Map();
    this.alertas = new Map();
    this.torres.forEach((t) => this.ponerAlerta(t, null));
    this.actualizarDemanda();
    this.actualizarNombres();
    this.empresaResaltada = null;
    this.mostrarResalte(null);
    this.sucio = true;
  }

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

  /** Pie de la torre de un comercio (mundo); null si no tiene torre. Para el orbe y la ficha. */
  posComercio(empresa: string): V3 | null {
    const t = this.torres.get(empresa);
    return t ? t.p.clone() : null;
  }

  posCiudad(dane: string): V3 | null {
    return this.posDeCiudad(dane, 0);
  }

  /** Empresas con torre, de más a menos vendido (para recorridos guiados y pruebas). */
  empresasConTorre(): string[] {
    return this.comercios.map((c) => c.empresa).filter((e) => this.torres.has(e));
  }

  /** Alturas de las torres (para las pruebas de las escalas). */
  alturaDe(empresa: string): number | null {
    return this.torres.get(empresa)?.objetivo ?? null;
  }

  diagnostico(): DiagnosticoPais {
    let conAlerta = 0;
    this.torres.forEach((t) => { if (t.alertaTono) conAlerta++; });
    return {
      torres: this.torres.size,
      conAlerta,
      nombresFijos: this.nombresFijos.size,
      calor: this.calor.size,
      departamentosConDemanda: this.demanda.size,
      efectos: this.nucleo.fx.activos,
      arcos: this.nucleo.fx.arcosVivos,
      tweens: this.nucleo.tw.cantidad,
      etiquetas: this.nucleo.etq.cantidad,
      tarjetas: this.nucleo.etq.popsVivos,
    };
  }

  /** Empresas con nombre fijo (los líderes sin encimarse). */
  nombresFijosActuales(): string[] {
    return [...this.nombresFijos];
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
    const g = new this.T.RingGeometry(0.42, 0.56, 32);
    this.geoCache.set('anillo-torre', g);
    const a = new this.T.Mesh(g, this.nucleo.kit.basico('accent', 0.95));
    a.rotation.x = -Math.PI / 2;
    a.visible = false;
    this.scene.add(a);
    this.anillo = a;
    this.ajustarAContenido(this.puntosDeEncuadre(3.4), (ancho) => margenesBase(ancho));
    this.reconciliar();
  }

  protected override seleccionable(id: IdMapa): boolean {
    return id.startsWith('k:');
  }

  protected override colorFondoMapa(): number {
    return hexDe(this.T, this.tk('scene-bg'), 0xe7e2f7);
  }

  protected override colorTierra(): string {
    return this.tk('map-land');
  }

  protected override colorCostado(): number {
    return hexDe(this.T, this.tk('map-side'), 0xcfc5f3);
  }

  protected override colorBorde(): string {
    return this.tk('map-line');
  }

  protected override colorLineaInset(): number {
    return hexDe(this.T, this.tk('map-line'), 0xa996ff);
  }

  /** Cada departamento con demanda se tiñe de un tono plano del acento según sus pedidos de hoy. */
  protected override rellenarPais(ctx: CanvasRenderingContext2D): void {
    const tierra = this.tk('map-land');
    const acento = this.tk('accent');
    ctx.fillStyle = tierra;
    this.trazarPais(ctx);
    ctx.fill('evenodd');
    let max = 1;
    this.demanda.forEach((n) => { if (n > max) max = n; });
    for (const d of this.geo.departamentos) {
      const n = this.demanda.get(d.dane) ?? 0;
      if (n <= 0) continue;
      ctx.fillStyle = mezclarHex(tierra, acento, mezclaDeDemanda(n, max));
      this.trazarPais(ctx, d.iso);
      ctx.fill('evenodd');
    }
  }

  protected override cuadro(t: number, dt: number): boolean {
    const ahora = performance.now();
    let cambio = this.nucleo.paso(dt);
    const reducir = this.opts.reducirMovimiento;
    this.torres.forEach((torre) => {
      const h = torre.h + (torre.objetivo - torre.h) * Math.min(1, dt * 3);
      const bump = Math.max(0, torre.bump - dt * 2.2);
      if (Math.abs(h - torre.h) > 0.0005 || bump !== torre.bump || torre.bump > 0) {
        torre.h = h;
        torre.bump = bump;
        const s = 1 + Math.sin(bump * Math.PI) * 0.22;
        torre.cuerpo.scale.set(s, Math.max(0.001, h), s);
        torre.cuerpo.position.y = h / 2;
        torre.techo.position.y = h + 0.04;
        torre.techo.scale.set(s, 1, s);
        torre.cima.y = ALTO_MAPA + h;
        cambio = true;
      }
      if (torre.alerta.visible) {
        const k = reducir ? 0.5 : (t * 1.2) % 1;
        torre.alerta.scale.setScalar(1 + k * 0.9);
        (torre.alerta.material as ThreeNS.MeshBasicMaterial).opacity = 0.9 * (1 - k);
        if (!reducir) cambio = true;
      }
    });
    if (this.anillo?.visible) {
      this.anillo.scale.setScalar(1 + (reducir ? 0 : Math.sin(t * 6) * 0.08));
      if (!reducir) cambio = true;
    }
    this.nucleo.camara.paso(t, ahora, reducir);
    if (this.nucleo.etq.expirar(ahora)) cambio = true;
    return cambio;
  }

  protected override *anclas(): Iterable<[IdMapa, V3]> {
    yield* this.nucleo.etq.anclas();
  }

  // ============================================================== mundo

  private tk(token: string): string {
    return this.nucleo?.kit?.tokens[token] ?? this.cfg.tokens()[token];
  }

  private aplicarLuces(): void {
    if (this.luzHemi && this.luzSol) aplicarLucesDeTema(this.luzHemi, this.luzSol, esOscuro(this.nucleo.tokens));
  }

  private alSuelo(p: V3): V3 {
    return p.clone().setY(ALTO_MAPA + 0.03);
  }

  /** Crea, mueve y quita torres según los comercios que hay hoy. */
  private reconciliar(): void {
    if (!this.scene || !this.nucleo.kit) return;
    const vivos = new Set(this.comercios.map((c) => c.empresa));
    this.torres.forEach((t, empresa) => {
      if (vivos.has(empresa)) return;
      this.quitarTorre(t);
      this.torres.delete(empresa);
    });
    const grupos = agruparPorCiudad(this.comercios);
    grupos.forEach((lista, dane) => {
      const base = this.posDeCiudad(dane, 0);
      if (!base) return;
      lista.forEach((c, i) => {
        const o = corrimientoEnCiudad(i, lista.length);
        let t = this.torres.get(c.empresa);
        if (!t) { t = this.crearTorre(c); this.torres.set(c.empresa, t); }
        t.c = c;
        t.p.set(base.x + o.dx, ALTO_MAPA, base.z + o.dz);
        t.g.position.copy(t.p);
        t.cima.set(t.p.x, ALTO_MAPA + t.h, t.p.z);
      });
    });
    this.actualizarAlturas();
    this.torres.forEach((t) => this.ponerAlerta(t, this.alertas.get(t.c.empresa) ?? null));
    this.actualizarNombres();
  }

  private crearTorre(c: ComercioDibujo): Torre {
    const k = this.nucleo.kit;
    const g = new this.T.Group();
    this.scene.add(g);
    k.malla(k.gCil(0.33, 0.33, 0.06, 24), k.mt(c.tono + '-soft'), g, 0, 0.03, 0, false);
    const cuerpo = k.malla(k.gRbox(0.42, 1, 0.42, 0.08), k.mt(c.tono), g, 0, 0.15, 0);
    const techo = k.malla(k.gRbox(0.5, 0.08, 0.5, 0.04), k.mt('scene-wall'), g, 0, 0.34, 0, false);
    cuerpo.scale.y = ALTO_TORRE_BASE;
    cuerpo.userData['empresa'] = c.empresa;
    g.userData['zona'] = 'k:' + c.empresa;
    this.pickables.push(g);
    const geoAnillo = this.geoCache.get('alerta-torre') ?? (() => {
      const r = new this.T.RingGeometry(0.5, 0.66, 32);
      this.geoCache.set('alerta-torre', r);
      return r;
    })();
    const alerta = new this.T.Mesh(geoAnillo, k.basico('bad', 0.9));
    alerta.rotation.x = -Math.PI / 2;
    alerta.position.y = 0.09;
    alerta.visible = false;
    g.add(alerta);
    return {
      c, g, cuerpo, techo, alerta,
      p: new this.T.Vector3(), cima: new this.T.Vector3(),
      h: ALTO_TORRE_BASE, objetivo: ALTO_TORRE_BASE, bump: 0, alertaTono: null, etq: null,
    };
  }

  private quitarTorre(t: Torre): void {
    this.scene.remove(t.g);
    const i = this.pickables.indexOf(t.g);
    if (i >= 0) this.pickables.splice(i, 1);
    if (t.etq) this.nucleo.quitarFija(t.etq);
    this.nombresFijos.delete(t.c.empresa);
    const m = t.alerta.material as ThreeNS.MeshBasicMaterial;
    m.dispose();
    this.nucleo.kit.vivos.delete(m);
  }

  private actualizarAlturas(): void {
    let max = 1;
    this.torres.forEach((t) => { max = Math.max(max, valorDeAltura(t.c, this.nucleo.privado)); });
    this.torres.forEach((t) => { t.objetivo = alturaTorre(valorDeAltura(t.c, this.nucleo.privado), max); });
  }

  private ponerAlerta(t: Torre, tono: string | null): void {
    t.alertaTono = tono;
    t.alerta.visible = !!tono;
    if (!tono) return;
    const m = t.alerta.material as ThreeNS.MeshBasicMaterial;
    m.userData['token'] = tono;
    m.color.set(this.nucleo.tokens[tono] ?? '#ff00ff');
  }

  /** Nombres fijos: el que más vende de las 5 ciudades que más venden, sin encimarse entre ciudades cercanas. */
  private actualizarNombres(): void {
    const candidatos = [...this.torres.values()].map((t) => ({
      id: t.c.empresa, valor: valorDeAltura(t.c, this.nucleo.privado), dane: t.c.dane ?? '', x: t.p.x, z: t.p.z,
    }));
    const lideres = seleccionarNombresFijos(candidatos);
    const ids = new Set(lideres.map((l) => l.id));
    this.torres.forEach((t, empresa) => {
      if (ids.has(empresa) || !t.etq) return;
      this.nucleo.quitarFija(t.etq);
      t.etq = null;
    });
    this.nombresFijos = ids;
    lideres.forEach((l) => {
      const t = this.torres.get(l.id);
      if (!t) return;
      const nombre = nombreVisible(t.c.nombre, t.c.ciudad, this.nucleo.privado);
      const html = `<span class="t-${t.c.tono}"><i class="eve-dot"></i>${esc(nombre)} · <b>${t.c.n}</b></span>`;
      if (!t.etq) {
        const cima = this.cimaDe(t, 0.35);
        t.etq = this.nucleo.fija(html, () => cima(), l.valor);
      } else { this.nucleo.etq.actualizarHtml(t.etq, html); this.nucleo.prioridadDe(t.etq, l.valor); }
    });
  }

  /** Función que devuelve el punto sobre la torre (reusa un solo vector). */
  private cimaDe(t: Torre, extra: number): () => V3 {
    const v = new this.T.Vector3();
    return () => v.set(t.cima.x, t.cima.y + extra, t.cima.z);
  }

  /** Discos de calor por ciudad de entrega y el tono de cada departamento. */
  private actualizarDemanda(): void {
    const k = this.nucleo.kit;
    this.calor.forEach((c, dane) => {
      if (this.entregas.has(dane)) return;
      this.scene.remove(c.d);
      c.m.dispose();
      k.vivos.delete(c.m);
      this.calor.delete(dane);
    });
    this.entregas.forEach((n, dane) => {
      let c = this.calor.get(dane);
      if (!c) {
        const p = this.posDeCiudad(dane, 0.012);
        if (!p) return;
        const geo = this.geoCache.get('disco-calor') ?? (() => {
          const g = new this.T.CircleGeometry(1, 48);
          this.geoCache.set('disco-calor', g);
          return g;
        })();
        const m = k.basico('accent', 0.1);
        const d = new this.T.Mesh(geo, m);
        d.rotation.x = -Math.PI / 2;
        d.position.copy(p);
        this.scene.add(d);
        c = { d, m };
        this.calor.set(dane, c);
      }
      c.d.scale.setScalar(Math.min(1.7, 0.3 + Math.sqrt(n) * 0.11));
      c.m.opacity = Math.min(0.24, 0.07 + n * 0.0018);
    });
    const clave = [...this.demanda.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, n]) => d + ':' + n).join(',');
    if (clave !== this.claveDemanda && this.lienzo) {
      this.claveDemanda = clave;
      this.pintar();
    }
  }

  // ============================================================== eventos

  private contarEvento(ev: EventoEnVivo, empresa: string): void {
    if (ev.tipo !== 'pedido_nuevo') return;
    const i = this.comercios.findIndex((c) => c.empresa === empresa);
    if (i >= 0) {
      this.comercios[i] = { ...this.comercios[i], n: this.comercios[i].n + 1, ventas: this.comercios[i].ventas + (ev.monto ?? 0) };
      const t = this.torres.get(empresa);
      if (t) t.c = this.comercios[i];
      this.actualizarAlturas();
      this.actualizarNombres();
    }
    const d = resolverDane(this.cfg.geo, ev.dane, ev.ciudad);
    if (d) {
      this.entregas.set(d, (this.entregas.get(d) ?? 0) + 1);
      const dep = d.slice(0, 2);
      this.demanda.set(dep, (this.demanda.get(dep) ?? 0) + 1);
      this.actualizarDemanda();
    }
  }

  private monto(m: number | null | undefined): string {
    return this.nucleo.privado || !m ? '' : dinero(m);
  }

  /** Pedido nuevo: luz y pulso en la torre; con Opttia, un haz más alto en el tono de Opttia; tarjeta con comercio, monto y ciudad. */
  private hacerLlegada(t: Torre, ev: Extract<EventoEnVivo, { tipo: 'pedido_nuevo' }>, ligero: boolean): void {
    const fx = this.nucleo.fx;
    const tono = t.c.tono;
    fx.haz(t.p, tono, 6, 1.1);
    fx.pulso(this.alSuelo(t.p), tono, 1.6, 1.0);
    t.bump = 1;
    if (ev.ia) {
      fx.haz(t.p, 'pack', 8.5, 1.5);
      fx.pulso(this.alSuelo(t.p), 'pack', 2.8, 1.3);
    }
    if (ligero) return;
    const venta = ev.etapa === 'entregado';
    const dane = resolverDane(this.cfg.geo, ev.dane, ev.ciudad);
    const donde = venta ? 'Punto de venta' : `Cliente en ${nombreDeLugar(this.cfg.geo, dane, ev.ciudad)}`;
    const canal = ev.canal ? ` · ${ev.canal}` : '';
    const nombre = nombreVisible(t.c.nombre, t.c.ciudad, this.nucleo.privado);
    const pos = this.cimaDe(t, 0.6);
    const hizo = this.nucleo.tarjeta(
      pos,
      ev.ia ? 'pack' : tono,
      ev.ia ? 'Con Opttia' : venta ? 'Venta en tienda' : 'Nuevo pedido',
      `<span class="eve-who">${esc(nombre)}</span><span class="eve-amt">${esc(this.monto(ev.monto))}</span><small>${esc(donde + canal)}</small>`,
      3400,
    );
    if (hizo) this.nucleo.camara.enfocar(t.p.x, 0, t.p.z, 1.6, performance.now(), this.opts.reducirMovimiento);
  }

  /** Salida: un arco hasta la ciudad del cliente, o un pulso si es la misma ciudad. */
  private hacerSalida(t: Torre, ev: EventoEnVivo, ligero: boolean): void {
    const dane = resolverDane(this.cfg.geo, ev.dane, ev.ciudad);
    const d = dane ? this.posDeCiudad(dane, 0) : null;
    if (!d || !dane) return;
    const fx = this.nucleo.fx;
    if (dane === t.c.dane) { fx.pulso(this.alSuelo(t.p), 'info', 1.4, 0.9); return; }
    const clave = t.c.empresa + '>' + dane;
    const ahora = performance.now();
    const ultimo = this.arcosRecientes.get(clave) ?? -Infinity;
    if (ahora - ultimo < 1500) return;
    this.arcosRecientes.set(clave, ahora);
    if (this.arcosRecientes.size > 60) {
      this.arcosRecientes.forEach((v, key) => { if (ahora - v > 3000) this.arcosRecientes.delete(key); });
    }
    if (ligero || !fx.arco(this.alSuelo(t.p), this.alSuelo(d), ALTO_MAPA, 'info')) fx.pulso(this.alSuelo(d), 'info', 1.4, 0.9);
  }

  /** Entregado: pulso verde en la ciudad del cliente (y, a veces, confeti). */
  private hacerEntrega(t: Torre, ev: EventoEnVivo, ligero: boolean): void {
    const dane = resolverDane(this.cfg.geo, ev.dane, ev.ciudad) ?? t.c.dane;
    const d = dane ? this.posDeCiudad(dane, 0) : null;
    if (!d) return;
    this.nucleo.fx.pulso(this.alSuelo(d), 'ok', 1.8, 1.1);
    if (!ligero && Math.random() < 0.25) this.nucleo.fx.confeti(d.clone().setY(ALTO_MAPA + 0.5));
  }

  // ====================================================== puntero (toques)

  private traducir(id: IdMapa | null): ToqueMapa | null {
    return id && id.startsWith('k:') ? { tipo: 'comercio', id: id.slice(2) } : null;
  }

  private alClick(id: IdMapa): void {
    const t = this.traducir(id);
    if (t) this.cfg.onClick(t);
    else this.cfg.onVacio?.();
  }

  private alHover(id: IdMapa | null): void {
    const t = this.traducir(id);
    this.hoverEmpresa = t ? t.id : null;
    this.mostrarResalte(this.empresaResaltada ?? this.hoverEmpresa);
    this.cfg.onHover?.(t);
    this.sucio = true;
  }

  /** Anillo y tarjeta oscura de la torre señalada (por el puntero o desde fuera). */
  private mostrarResalte(empresa: string | null): void {
    const t = empresa ? this.torres.get(empresa) : null;
    if (!t || !this.anillo) {
      if (this.anillo) this.anillo.visible = false;
      this.nucleo.hover(null);
      return;
    }
    this.anillo.position.set(t.p.x, ALTO_MAPA + 0.07, t.p.z);
    this.anillo.visible = true;
    const nombre = nombreVisible(t.c.nombre, t.c.ciudad, this.nucleo.privado);
    const dinero$ = this.nucleo.privado ? 'montos ocultos' : dineroCorto(t.c.ventas);
    this.nucleo.hover(
      `<b>${esc(nombre)}</b><span>${t.c.n} ${t.c.n === 1 ? 'pedido' : 'pedidos'} · ${esc(dinero$)} · toca para ver su tablero</span>`,
      this.cimaDe(t, 0.45),
    );
  }
}
