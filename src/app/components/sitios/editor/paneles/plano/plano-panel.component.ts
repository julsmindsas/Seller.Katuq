import { Component, ElementRef, OnChanges, OnDestroy, SimpleChanges, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import Swal from "sweetalert2";
import { SitiosService } from "../../../sitios.service";
import { MaestroService } from "../../../../../shared/services/maestros/maestro.service";
import { ICONOS_SITIO, TRAZOS_ICONO_SITIO } from "../../../iconos-sitio";
import { PanelSitioBase } from "../panel-sitio-base";
import { AsesorTienda, comoSeLeeAsesor, primeraImagen, promesaSinConfirmar } from "../fichas/fichas-datos";
import { bloquesDeSuPagina } from "../tarjeta-solucion/tarjeta-solucion-datos";
import { PiezaDeVitrina, PlanoKitService } from "./plano-kit.service";
import {
  AlternativaPlano,
  ComboVista,
  DatosPlano,
  EntradaPlano,
  EspacioPlano,
  EstadoKit,
  LineaKit,
  PROPORCIONES,
  PiezaInfo,
  Proporcion,
  TOPES_PLANO,
  altoRelativo,
  anclaValida,
  avisoDeFoto,
  avisosDePuntos,
  conVitrina,
  espacioSePinta,
  espaciosPintados,
  estadosDelKit,
  idDeNombre,
  idsDelPlano,
  lineasDe,
  lineasDeCombo,
  marcoSugerido,
  motivoAlternativa,
  piezaDesdeProducto,
  piezasDelBloque,
  precioTexto,
  quitarEspacio,
  relacionDe,
  renombrarIdDeEspacio,
  sinMarcador,
  tieneMarcador,
  tituloDeEspacio,
} from "./plano-datos";

/**
 * Nombre, foto, precio de lista y si está activa, del catálogo del comercio (`by-ids`), compartidos por todos los planos
 * del editor (no se piden dos veces). `null` = el producto ya no es de la empresa o se borró.
 */
const CATALOGO: { [id: string]: PiezaInfo | null } = {};
/** Las piezas como las ve la página publicada de cada sitio (por slug). `null` = la página no la muestra. */
const VITRINA: { [slug: string]: { [id: string]: PiezaDeVitrina | null } } = {};
/** El slug de cada sitio y si tiene algo publicado (por id del sitio). */
const SITIOS: { [id: string]: Promise<{ slug: string; publicado: boolean } | null> } = {};
/** Los combos activos de la empresa: se piden una vez por minuto. */
let combosCache: { cuando: number; lista: Promise<ComboVista[] | null> } | null = null;
/** El tamaño de cada foto de plano ya medida (por URL). */
const MEDIDAS: { [url: string]: { ancho: number; alto: number; vectorial: boolean } } = {};

/** A qué se está eligiendo productos con el selector. */
type Eleccion = { para: "lineas" } | { para: "alternativa"; k: number } | { para: "instalacion" } | null;

/** Grupos plegables del panel. */
type Grupo = "seccion" | "cabecera" | "entradas" | "nombres" | "compra";

/**
 * Panel del plano y kit del diseño nuevo (PLAN-V2 T13; artboard C′ «Elige tu espacio»). Lo pinta el módulo `plano` del
 * servidor (T11), solo con el diseño nuevo. El comercio arma aquí, sin ayuda:
 *  - la cabecera de la sección, su fondo y su ancla (para que la portada y las tarjetas lleven a un espacio);
 *  - hasta 4 espacios en pestañas, cada uno con su foto del plano, su kit (un combo, el mismo del POS, o piezas
 *    sueltas), otra versión del kit (WiFi 6 o WiFi 7) y sus puntos, que se ubican en la ventana «Ubicar los puntos»;
 *  - «Empieza por lo que te pasa», el nombre corto de cada pieza, la compra, la instalación y quién revisó el kit.
 * Avisa en vivo lo que la página haría: «Falta 1 pieza…» cuando el kit no se puede vender completo (D5).
 *
 * Edita en su lugar `bloque.datos` y, solo de esta sección, `bloque.estilo.superficie` y `bloque.estilo.ancla` (el
 * editor no los ofrece todavía y sin ancla nadie puede enlazar el plano). Solo lee productos. La única escritura que
 * puede hacer es CREAR un combo cuando el comercio lo pide («Guardar como combo», `POST /v1/combos/create`, que valida
 * empresa y productos activos): nunca toca `products` (D-134) ni cambia un combo que ya existe.
 */
@Component({
  selector: "app-panel-plano",
  templateUrl: "./plano-panel.component.html",
  styleUrls: ["./plano-panel.component.scss"],
})
export class PanelPlanoComponent extends PanelSitioBase implements OnChanges, OnDestroy {
  readonly topes = TOPES_PLANO;
  readonly iconos = ICONOS_SITIO;
  readonly proporciones = PROPORCIONES;
  readonly uid = `pl-${Math.random().toString(36).slice(2, 8)}`;

  /** El espacio que se edita (su pestaña). */
  pestana = 0;
  /** Grupos abiertos: el título se abre solo si falta, y «Fondo y ancla» si falta el ancla. */
  abiertos = new Set<Grupo>();
  combos: ComboVista[] | null = null;
  cargandoCombos = false;
  /** No se pudieron leer los combos: el panel no afirma nada de los kits que usan uno. */
  combosFallaron = false;
  creandoCombo = false;
  subiendoFoto = false;
  eleccion: Eleccion = null;
  ubicando = false;
  /**
   * Ids de los espacios recién creados en este panel: su id sigue a su nombre hasta que el panel se cierra. Van por id y
   * no por objeto, porque el editor cambia los objetos por los que devuelve el servidor después de cada guardado.
   */
  private idsAuto = new Set<string>();
  private vivo = true;

  @ViewChild("botonUbicar") botonUbicar?: ElementRef<HTMLButtonElement>;

  /**
   * La página publicada de este sitio: con ella el estado del kit sale de la misma vista que usa la página. `undefined`
   * mientras se pregunta; `null` si el sitio nunca se publicó (entonces el panel no afirma existencias).
   */
  pagina: { slug: string; publicado: boolean } | null | undefined = undefined;

  constructor(
    private service: SitiosService,
    private maestros: MaestroService,
    private planoKit: PlanoKitService,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {
    super();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["bloque"]) {
      const espacios = this.espacios;
      if (this.pestana >= espacios.length) this.pestana = Math.max(0, espacios.length - 1);
      if (!this.datos.titulo) this.abiertos.add("cabecera");
      // Sin ancla nadie puede enlazar el plano: el grupo se abre solo para que se vea el aviso.
      if (!anclaValida(this.ancla)) this.abiertos.add("seccion");
      this.cargarCombos();
      this.cargarPagina();
      this.cargarPiezas();
      for (const e of espacios) this.medirFoto(e.imagen);
    }
  }

  ngOnDestroy(): void {
    this.vivo = false;
  }

  // ── Lectura ─────────────────────────────────────────────────────────────────────────────────────────────────────

  get datos(): DatosPlano {
    if (!this.bloque) return {};
    if (!this.bloque.datos) this.bloque.datos = {};
    return this.bloque.datos as DatosPlano;
  }

  get espacios(): EspacioPlano[] {
    return Array.isArray(this.datos.espacios) ? this.datos.espacios : [];
  }

  get e(): EspacioPlano | null {
    return this.espacios[this.pestana] || null;
  }

  private get estilo(): any {
    const b: any = this.bloque;
    if (!b) return {};
    if (!b.estilo) b.estilo = { fondo: "", fondoImagen: "", fondoVelo: 0, colorTexto: "", espaciado: "normal", ancho: "normal", alineacion: "" };
    return b.estilo;
  }

  get superficie(): string {
    const b: any = this.bloque;
    return (b && b.estilo && b.estilo.superficie) || "";
  }

  get ancla(): string {
    const b: any = this.bloque;
    return (b && b.estilo && b.estilo.ancla) || "";
  }

  get conEstructura(): boolean {
    return !!(this.contenido && this.contenido.tema && (this.contenido.tema as any).colorEstructura);
  }

  private get tienda(): any {
    return (this.contenido && (this.contenido.tienda as any)) || {};
  }

  private get confirmadas(): string[] {
    return this.tienda.promesasConfirmadas || [];
  }

  private get cotizables(): string[] {
    return (Array.isArray(this.tienda.cotizables) ? this.tienda.cotizables : []).map((c: any) => (c && c.id) || "").filter(Boolean);
  }

  get asesores(): AsesorTienda[] {
    return (Array.isArray(this.tienda.asesores) ? this.tienda.asesores : []).filter((a: any) => a && a.id);
  }

  get tiendaEncendida(): boolean {
    return this.tienda.habilitada === true;
  }

  /** ¿La página tiene un WhatsApp con número? Sin él no salen «Enviar a un asesor» ni «Pedir este kit a un asesor». */
  get conWhatsapp(): boolean {
    return bloquesDeSuPagina(this.contenido, this.bloque).some(
      (b: any) => b && b.visible !== false && b.tipo === "whatsapp" && b.datos && String(b.datos.telefono || "").replace(/\D/g, "").length >= 10
    );
  }

  /** El nombre con que se ve una pieza en el kit: el corto que dio el comercio o el del catálogo. */
  nombreDe = (id: string): string => {
    const corto = sinMarcador(this.nombreCorto(id));
    if (corto) return corto;
    const p = CATALOGO[id];
    if (p === undefined) return "Cargando…";
    if (p === null) return "Producto que ya no está";
    return p.titulo || "Sin nombre";
  };

  tituloCatalogo(id: string): string {
    const p = CATALOGO[id];
    return p === undefined ? "Cargando…" : p === null ? "Ya no está en tu catálogo" : p.titulo || "Sin nombre";
  }

  /**
   * Lo que el panel sabe de una pieza para decir si el kit se vende: el catálogo (nombre, foto, activa) más, si el sitio
   * está publicado, la vista de la página (precio de vitrina y disponible). `undefined` mientras carga.
   */
  pieza(id: string): PiezaInfo | null | undefined {
    const c = CATALOGO[id];
    if (c === undefined || this.pagina === undefined) return undefined;
    if (this.pagina === null) return c;
    const v = (VITRINA[this.pagina.slug] || {})[id];
    if (v === undefined) return undefined;
    if (c === null && v === null) return null;
    return conVitrina(c, v);
  }

  /** Lo que se sabe de unas piezas, para los estados del kit. */
  private infoDe(ids: string[]): { [id: string]: PiezaInfo | null | undefined } {
    const salida: { [id: string]: PiezaInfo | null | undefined } = {};
    for (const id of ids) salida[id] = this.pieza(id);
    return salida;
  }

  /** La foto de la pieza: la que muestra la página, si se conoce; si no, la del catálogo. */
  imagenDe(id: string): string | null {
    const v = this.pagina ? (VITRINA[this.pagina.slug] || {})[id] : null;
    if (v && v.imagen) return v.imagen;
    const p = CATALOGO[id];
    return (p && p.imagen) || null;
  }

  textoEstadoPieza(id: string): string {
    const p = this.pieza(id);
    if (p === undefined) return "";
    if (p === null) return "Ya no está en tu catálogo";
    if (p.estado === "agotado") return "Agotado";
    if (p.estado === "inactivo") return "Inactivo";
    if (p.estado === "sinPrecio") return "Sin precio";
    if (p.estado === "fuera") return "No se ve en tu tienda";
    return "";
  }

  precio(valor: number): string {
    return precioTexto(valor);
  }

  // ── Kit del espacio ─────────────────────────────────────────────────────────────────────────────────────────────

  fuenteDe(e: EspacioPlano): "combo" | "piezas" {
    return e.comboId || this.fuenteCombo.has(e.id) ? "combo" : "piezas";
  }
  /** Ids de los espacios en los que se eligió «Un combo» y todavía no hay uno elegido. */
  private fuenteCombo = new Set<string>();

  lineas(e: EspacioPlano): LineaKit[] {
    return lineasDe(e, this.combos).lineas;
  }

  motivoLineas(e: EspacioPlano): string {
    return lineasDe(e, this.combos).motivo;
  }

  comboDe(e: EspacioPlano): ComboVista | null {
    return (this.combos || []).find((c) => c.id === e.comboId) || null;
  }

  estados(e: EspacioPlano): EstadoKit[] {
    const lineas = this.lineas(e);
    const ids = [...lineas.map((l) => l.productoId), ...(e.alternativas || []).map((a) => (a && a.por) || "").filter(Boolean)];
    return estadosDelKit(e, lineas, this.infoDe(ids), this.cotizables);
  }

  /** El resumen en vivo del kit: listo con su total, o lo que lo frena («Falta 1 pieza…»). */
  estadoKit(e: EspacioPlano): { tono: "ok" | "aviso" | "info" | "vacio"; titulo: string; texto: string } {
    const motivo = this.motivoLineas(e);
    if (motivo === "cargando") {
      return this.combosFallaron
        ? { tono: "info", titulo: "No pudimos leer tus combos", texto: "El kit de este espacio sale de un combo: míralo en la Vista fiel o vuelve a abrir la sección." }
        : { tono: "info", titulo: "Cargando el kit…", texto: "" };
    }
    if (motivo === "combo") {
      return {
        tono: "aviso",
        titulo: "El kit no está disponible",
        texto: "Ese combo ya no está activo o no tiene piezas. La página dice «Estamos actualizando las piezas de este kit».",
      };
    }
    if (motivo === "largo") {
      return { tono: "aviso", titulo: "Se arma con un asesor", texto: `Ese combo tiene más de ${this.topes.lineas} piezas: la página no lo lleva al carrito y ofrece armarlo por WhatsApp.` };
    }
    const lineas = this.lineas(e);
    if (!lineas.length) return { tono: "vacio", titulo: "Sin kit todavía", texto: "Elige un combo o las piezas: sin kit, el espacio no sale en la página." };
    if (lineas.some((l) => this.pieza(l.productoId) === undefined)) return { tono: "info", titulo: "Revisando las piezas…", texto: "" };
    const estados = this.estados(e);
    const base = estados[0];
    const unidades = lineas.reduce((t, l) => t + (l.cantidad || 1), 0);
    const cuantas = `${lineas.length} ${lineas.length === 1 ? "producto" : "productos"}${unidades !== lineas.length ? ` · ${unidades} unidades` : ""}`;
    if (base.completo) {
      if (base.cotizar) return { tono: "info", titulo: `Kit completo · ${cuantas}`, texto: "Lleva una pieza para cotizar o más de 50 unidades de una: la página lo cotiza con un asesor, no lo lleva al carrito." };
      const sinExistencias = this.pagina === null ? " Tu página todavía no está publicada: las existencias se ven en la Vista fiel." : "";
      return {
        tono: "ok",
        titulo: `Kit completo · ${cuantas}`,
        texto: `Suma de hoy: ${this.precio(base.total)}. La página la vuelve a sumar con el precio del momento.${sinExistencias}`,
      };
    }
    const frenos = base.frenos.map((f) => `«${this.nombreDe(f.productoId)}» ${f.motivo}`);
    const n = base.frenos.length;
    const otra = estados.find((st) => st.a > 0 && st.completo);
    return {
      tono: "aviso",
      titulo: `Falta${n === 1 ? "" : "n"} ${n} ${n === 1 ? "pieza" : "piezas"}: el kit sale «no disponible»`,
      texto: `${frenos.join("; ")}. La página no vende el kit incompleto: ofrece «Pedir este kit a un asesor»${
        base.frenos.some((f) => { const x = this.pieza(f.productoId); return !!x && x.estado === "agotado"; }) ? " y «Avísame»" : ""
      }.${otra ? ` Se ve primero la versión «${otra.etiqueta}», que sí está completa (${this.precio(otra.total)}).` : ""}`,
    };
  }

  elegirFuente(e: EspacioPlano, fuente: "combo" | "piezas"): void {
    if (fuente === this.fuenteDe(e)) return;
    if (fuente === "combo") {
      this.fuenteCombo.add(e.id);
      this.cargarCombos();
      // Las piezas sueltas se conservan hasta elegir un combo: si se arrepiente, no las pierde.
    } else {
      this.fuenteCombo.delete(e.id);
      if (e.comboId) {
        // Pasa a piezas sueltas con las mismas piezas del combo, para no empezar de cero.
        e.lineas = this.lineas(e).map((l) => ({ productoId: l.productoId, cantidad: l.cantidad || 1 }));
        e.comboId = "";
      }
    }
    this.cambiar();
  }

  elegirCombo(e: EspacioPlano, id: string): void {
    e.comboId = id || "";
    if (e.comboId) e.lineas = [];
    this.cargarPiezas();
    this.cambiar();
  }

  ponerCantidad(l: LineaKit, valor: any): void {
    const n = Math.round(Number(valor));
    l.cantidad = Number.isFinite(n) ? Math.min(this.topes.cantidad, Math.max(1, n)) : 1;
    this.cambiar();
  }

  quitarLinea(e: EspacioPlano, id: string): void {
    e.lineas = (e.lineas || []).filter((l) => l.productoId !== id);
    this.cambiar();
  }

  /** Puntos del espacio que llevan una pieza (para la fila de la pieza: «Puntos 1, 2 y 3»). */
  puntosDePieza(e: EspacioPlano, id: string): number[] {
    return (e.puntos || []).map((p, k) => (p.productoId === id ? k + 1 : 0)).filter(Boolean);
  }

  /** Crea en Maestros › Combos un combo con las piezas sueltas de este espacio y lo usa (PLAN-V2 T13). */
  async guardarComoCombo(e: EspacioPlano): Promise<void> {
    const lineas = (e.lineas || []).filter((l) => l && l.productoId);
    if (!lineas.length || this.creandoCombo) return;
    const sugerido = `Kit ${tituloDeEspacio(e) || "del plano"}`.slice(0, 80);
    const r = await Swal.fire({
      title: "Guardar como combo",
      html:
        "Se crea un combo nuevo en Maestros › Combos con estas piezas y sus cantidades.<br><b>Este combo también se vende en el POS.</b> " +
        "Si después le cambias piezas allá, cambian también en este plano.",
      input: "text",
      inputLabel: "Nombre del combo",
      inputValue: sugerido,
      inputAttributes: { maxlength: "80" },
      showCancelButton: true,
      confirmButtonText: "Crear el combo",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#5f3fe0",
      inputValidator: (v) => (!String(v || "").trim() ? "Ponle un nombre" : null),
    });
    if (!r.isConfirmed) return;
    this.creandoCombo = true;
    const payload = {
      nombre: String(r.value || sugerido).trim(),
      descripcion: `Kit del plano «${tituloDeEspacio(e) || e.id}» de la página ${this.nombreSitio || ""}`.trim(),
      productos: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad || 1 })),
      activo: true,
    };
    this.maestros.createCombo(payload).subscribe({
      next: (res: any) => {
        this.creandoCombo = false;
        const id = String((res && res.id) || "");
        if (!id) {
          this.toastr.error("No pudimos crear el combo.");
          return;
        }
        combosCache = null;
        // El combo nuevo ya se conoce: se usa sin esperar la lista.
        const nuevo: ComboVista = { id, nombre: payload.nombre, lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad || 1 })) };
        this.combos = [nuevo, ...(this.combos || []).filter((c) => c.id !== id)];
        e.comboId = id;
        e.lineas = [];
        this.fuenteCombo.add(e.id);
        this.toastr.success("Listo: el plano usa el combo nuevo. También quedó en Maestros › Combos.");
        this.cambiar();
      },
      error: (err: any) => {
        this.creandoCombo = false;
        this.toastr.error((err && err.error && err.error.message) || "No pudimos crear el combo.");
      },
    });
  }

  // ── Otra versión del kit (alternativas) ─────────────────────────────────────────────────────────────────────────

  agregarAlternativa(e: EspacioPlano): void {
    const lista = Array.isArray(e.alternativas) ? e.alternativas : [];
    if (lista.length >= this.topes.alternativas) return;
    e.alternativas = [...lista, { de: "", por: "", etiqueta: "" }];
    this.cambiar();
  }

  quitarAlternativa(e: EspacioPlano, k: number): void {
    e.alternativas = (e.alternativas || []).filter((_, j) => j !== k);
    this.cambiar();
  }

  motivoAlt(e: EspacioPlano, a: AlternativaPlano): string {
    return motivoAlternativa(a, this.lineas(e));
  }

  /** El precio de la versión: la suma con la pieza cambiada, o lo que la frena. */
  resumenAlt(e: EspacioPlano, k: number): string {
    const a = (e.alternativas || [])[k];
    if (!a || this.motivoAlt(e, a)) return "";
    const st = this.estados(e).find((x) => x.a > 0 && x.etiqueta === sinMarcador(a.etiqueta));
    if (!st) return "";
    if (st.completo) return `Con esta versión el kit suma ${this.precio(st.total)}.`;
    if (st.frenos.length) return `Esta versión no está completa: «${this.nombreDe(st.frenos[0].productoId)}» ${st.frenos[0].motivo}.`;
    return "";
  }

  // ── Espacios ────────────────────────────────────────────────────────────────────────────────────────────────────

  agregarEspacio(): void {
    if (this.espacios.length >= this.topes.espacios) return;
    const usados = this.espacios.map((x) => x.id);
    const nuevo: EspacioPlano = { id: idDeNombre(`espacio-${this.espacios.length + 1}`, usados), nombre: "" };
    this.idsAuto.add(nuevo.id);
    this.datos.espacios = [...this.espacios, nuevo];
    this.pestana = this.espacios.length - 1;
    this.cambiar();
  }

  /** Al escribir el nombre de un espacio recién creado, su id lo sigue («Casa» → `casa`), para enlazarlo fácil. */
  alCambiarNombre(e: EspacioPlano): void {
    if (this.idsAuto.has(e.id) && String(e.nombre || "").trim()) {
      const otros = this.espacios.filter((x) => x !== e).map((x) => x.id);
      const nuevo = idDeNombre(String(e.nombre), otros);
      if (nuevo !== e.id) {
        renombrarIdDeEspacio(this.datos, e.id, nuevo);
        this.idsAuto.delete(e.id);
        if (this.fuenteCombo.delete(e.id)) this.fuenteCombo.add(nuevo);
        this.idsAuto.add(nuevo);
        e.id = nuevo;
      }
    }
    this.cambiar();
  }

  /** Lo que enlaza a este espacio desde la portada o las tarjetas de la página. */
  enlacesA(e: EspacioPlano): number {
    if (!this.ancla) return 0;
    const valor = `${this.ancla}:${e.id}`;
    let n = 0;
    for (const b of bloquesDeSuPagina(this.contenido, this.bloque) as any[]) {
      if (!b || !b.datos) continue;
      for (const x of b.datos.espacios || []) if (x && x.plano === valor) n++;
      for (const el of b.elementos || []) for (const t of (el && el.datos && el.datos.items) || []) if (t && t.plano === valor) n++;
    }
    return n;
  }

  async quitarEsteEspacio(k: number): Promise<void> {
    const e = this.espacios[k];
    if (!e) return;
    const enlaces = this.enlacesA(e);
    const r = await Swal.fire({
      title: `¿Quitar «${tituloDeEspacio(e) || `Espacio ${k + 1}`}»?`,
      text: `Se borran su foto, su kit y sus ${(e.puntos || []).length} puntos de este plano.${
        enlaces ? ` ${enlaces === 1 ? "Un enlace de la página lleva" : `${enlaces} enlaces de la página llevan`} a este espacio: dejará${enlaces === 1 ? "" : "n"} de abrirlo.` : ""
      } El combo, si tiene, sigue en Maestros › Combos.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Quitar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d3355c",
    });
    if (!r.isConfirmed) return;
    quitarEspacio(this.datos, k);
    this.pestana = Math.max(0, Math.min(this.pestana, this.espacios.length - 1));
    this.cambiar();
  }

  moverEspacio(k: number, paso: -1 | 1): void {
    const j = k + paso;
    const lista = [...this.espacios];
    if (j < 0 || j >= lista.length) return;
    [lista[k], lista[j]] = [lista[j], lista[k]];
    this.datos.espacios = lista;
    this.pestana = j;
    this.cambiar();
  }

  /** El espacio que se ve primero: el que dijo el comercio o el primero del selector (la regla de `render`). */
  get idInicial(): string {
    const pintados = espaciosPintados(this.datos).map(({ e }) => e);
    const enSelector = pintados.filter((e) => e.enSelector !== false);
    const elegido = enSelector.find((e) => e.id === this.datos.inicial);
    return (elegido || enSelector[0] || pintados[0] || ({} as EspacioPlano)).id || "";
  }

  hacerInicial(e: EspacioPlano): void {
    this.datos.inicial = e.id;
    if (e.enSelector === false) delete e.enSelector;
    this.cambiar();
  }

  alternarSelector(e: EspacioPlano): void {
    if (e.enSelector === false) delete e.enSelector;
    else e.enSelector = false;
    this.cambiar();
  }

  sePinta(e: EspacioPlano): boolean {
    return espacioSePinta(e);
  }

  /** Por qué un espacio no sale en la página ("" si sale). */
  motivoEspacio(e: EspacioPlano): string {
    const nombre = String(e.nombre || "").trim();
    if (!nombre) return "Ponle un nombre: sin nombre, el espacio no sale en la página.";
    if (tieneMarcador(nombre)) return "El nombre tiene un dato por llenar entre corchetes: el espacio no sale en la página.";
    if (!(e.lineas || []).length && !e.comboId) return "Elige su kit: sin piezas, el espacio no sale en la página.";
    return "";
  }

  trazoIcono(nombre: string | undefined): string {
    return (nombre && TRAZOS_ICONO_SITIO[nombre]) || "";
  }

  /** «Casa de 2 pisos», como se titula el kit en la página. */
  tituloEspacio(e: EspacioPlano): string {
    return tituloDeEspacio(e);
  }

  // ── Foto del plano ──────────────────────────────────────────────────────────────────────────────────────────────

  subirFoto(evento: Event, e: EspacioPlano): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    this.subiendoFoto = true;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendoFoto = false;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        e.imagen = res.url;
        if (Number(res.ancho) > 0 && Number(res.alto) > 0) {
          MEDIDAS[res.url] = { ancho: Number(res.ancho), alto: Number(res.alto), vectorial: /\.svg(\?|$)/i.test(res.url) };
        } else this.medirFoto(res.url);
        this.cambiar();
      },
      error: () => {
        this.subiendoFoto = false;
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  quitarFoto(e: EspacioPlano): void {
    e.imagen = "";
    this.cambiar();
  }

  /** Mide una foto ya guardada (el servidor no guarda su tamaño). */
  private medirFoto(url: string | undefined): void {
    if (!url || MEDIDAS[url]) return;
    const img = new Image();
    img.onload = () => {
      if (!this.vivo) return;
      MEDIDAS[url] = { ancho: img.naturalWidth, alto: img.naturalHeight, vectorial: /\.svg(\?|$)/i.test(url) };
    };
    img.src = url;
  }

  avisoFoto(e: EspacioPlano): string {
    const m = e.imagen ? MEDIDAS[e.imagen] : null;
    return m ? avisoDeFoto(m.ancho, m.alto, e.proporcion, m.vectorial) : "";
  }

  marcoSugerido(e: EspacioPlano): Proporcion | null {
    const m = e.imagen ? MEDIDAS[e.imagen] : null;
    return m ? marcoSugerido(m.ancho, m.alto, e.proporcion) : null;
  }

  medidaFoto(e: EspacioPlano): string {
    const m = e.imagen ? MEDIDAS[e.imagen] : null;
    return m && !m.vectorial ? `${m.ancho}×${m.alto} px` : m ? "Dibujo vectorial" : "";
  }

  elegirMarco(e: EspacioPlano, valor: Proporcion): void {
    e.proporcion = valor === "8:5" ? "" : valor;
    this.cambiar();
  }

  relacion(e: EspacioPlano): string {
    const { rx, ry } = relacionDe(e.proporcion);
    return `${rx} / ${ry}`;
  }

  alto(e: EspacioPlano): number {
    return altoRelativo(e.proporcion);
  }

  // ── Puntos ──────────────────────────────────────────────────────────────────────────────────────────────────────

  avisosPuntos(e: EspacioPlano) {
    return avisosDePuntos(e, this.lineas(e), this.nombreDe);
  }

  abrirUbicar(): void {
    if (!this.e) return;
    this.ubicando = true;
  }

  cerrarUbicar(): void {
    this.ubicando = false;
    // El foco vuelve al botón que abrió la ventana.
    Promise.resolve().then(() => this.botonUbicar && this.botonUbicar.nativeElement.focus());
  }

  // ── Entradas «Empieza por lo que te pasa» ───────────────────────────────────────────────────────────────────────

  get entradas(): EntradaPlano[] {
    return Array.isArray(this.datos.entradas) ? this.datos.entradas : [];
  }

  agregarEntrada(): void {
    if (this.entradas.length >= this.topes.entradas) return;
    this.datos.entradas = [...this.entradas, { texto: "", detalle: "", icono: "", espacio: "" }];
    this.cambiar();
  }

  quitarEntrada(k: number): void {
    this.datos.entradas = this.entradas.filter((_, j) => j !== k);
    this.cambiar();
  }

  moverEntrada(k: number, paso: -1 | 1): void {
    const j = k + paso;
    const lista = [...this.entradas];
    if (j < 0 || j >= lista.length) return;
    [lista[k], lista[j]] = [lista[j], lista[k]];
    this.datos.entradas = lista;
    this.cambiar();
  }

  elegirEspacioDeEntrada(x: EntradaPlano, id: string): void {
    x.espacio = id || "";
    x.punto = undefined;
    this.cambiar();
  }

  ponerPuntoDeEntrada(x: EntradaPlano, valor: any): void {
    const n = Number(valor);
    x.punto = n > 0 ? n : undefined;
    this.cambiar();
  }

  puntosDeEspacioId(id: string | undefined): { n: number; texto: string }[] {
    const e = this.espacios.find((x) => x.id === id);
    if (!e) return [];
    return (e.puntos || []).map((p, k) => ({ n: k + 1, texto: `${k + 1} · ${p.productoId ? this.nombreDe(p.productoId) : "sin pieza"}${p.zona ? ` · ${p.zona}` : ""}` }));
  }

  motivoEntrada(x: EntradaPlano): string {
    const texto = String(x.texto || "").trim();
    if (!texto) return "Escribe el problema («El WiFi no llega al cuarto»): sin texto no sale.";
    if (tieneMarcador(texto)) return "El texto tiene un dato por llenar entre corchetes: no sale.";
    if (promesaSinConfirmar(texto, this.confirmadas)) return "El texto promete algo que no has confirmado: no se puede publicar así.";
    const e = this.espacios.find((y) => y.id === x.espacio);
    if (!x.espacio || !e) return "Elige a qué espacio lleva: sin espacio no sale.";
    if (!espacioSePinta(e)) return `«${String(e.nombre || e.id)}» todavía no sale en la página: la entrada tampoco.`;
    if (x.punto) {
      const p = (e.puntos || [])[x.punto - 1];
      if (!p) return "Ese punto ya no existe: la entrada abre el espacio, pero ningún punto.";
      if (!p.productoId || !this.lineas(e).some((l) => l.productoId === p.productoId)) return "Ese punto no sale en la página: la entrada abre el espacio, pero ningún punto.";
    }
    if (tieneMarcador(x.detalle)) return "El detalle tiene un dato por llenar entre corchetes: sale sin detalle.";
    return "";
  }

  get entradasVisibles(): boolean {
    return espaciosPintados(this.datos).length >= 2;
  }

  // ── Nombres cortos ──────────────────────────────────────────────────────────────────────────────────────────────

  /** Las piezas que la página nombra (kits, versiones e instalación), para darles su nombre corto. */
  get piezasConNombre(): string[] {
    return piezasDelBloque(this.datos, this.combos).filter((id) => {
      for (const e of this.espacios) {
        if (this.lineas(e).some((l) => l.productoId === id)) return true;
        if ((e.alternativas || []).some((a) => a && a.por === id)) return true;
      }
      return this.datos.instalacionId === id;
    });
  }

  nombreCorto(id: string): string {
    const n = (this.datos.nombres || []).find((x) => x && x.productoId === id);
    return n ? n.nombre || "" : "";
  }

  ponerNombreCorto(id: string, valor: string): void {
    const limpio = String(valor || "").slice(0, this.topes.nombreCorto);
    const otros = (this.datos.nombres || []).filter((x) => x && x.productoId !== id && String(x.nombre || "").trim());
    this.datos.nombres = limpio.trim() ? [...otros, { productoId: id, nombre: limpio }].slice(0, this.topes.nombres) : otros;
    this.cambiar();
  }

  conMarcador(texto: string | undefined): boolean {
    return tieneMarcador(texto);
  }

  cortoConMarcador(id: string): boolean {
    return tieneMarcador(this.nombreCorto(id));
  }

  get sinNombreCorto(): number {
    return this.piezasConNombre.filter((id) => !sinMarcador(this.nombreCorto(id))).length;
  }

  // ── Compra, instalación y quién lo revisó ───────────────────────────────────────────────────────────────────────

  alternarCompra(): void {
    if (this.datos.permitirCompra === true) delete this.datos.permitirCompra;
    else this.datos.permitirCompra = true;
    this.cambiar();
  }

  alternarAsesor(): void {
    if (this.datos.enviarAsesor === false) delete this.datos.enviarAsesor;
    else this.datos.enviarAsesor = false;
    this.cambiar();
  }

  quitarInstalacion(): void {
    this.datos.instalacionId = "";
    this.cambiar();
  }

  get textoInstalacion(): string {
    const id = this.datos.instalacionId;
    if (!id) return "";
    const p = this.pieza(id);
    if (p === undefined) return "Cargando…";
    if (this.cotizables.includes(id)) return "Se cotiza con un asesor (está en tus productos para cotizar).";
    if (p === null || p.estado === "inactivo" || p.estado === "fuera") return "No se ve en tu tienda: la página no la muestra.";
    if (p.estado === "sinPrecio") return "No tiene precio ni es para cotizar: la página no la muestra.";
    if (p.estado === "agotado") return "Está agotada: la página no la muestra hasta que vuelva.";
    return `Sale como «Instalación en tu espacio · ${this.precio(p.precio)}» con «Agregarla».`;
  }

  comoSeLee(a: AsesorTienda): string {
    return comoSeLeeAsesor(a, this.nombreSitio);
  }

  elegirRevisor(id: string): void {
    this.datos.revisadoPor = id || "";
    this.cambiar();
  }

  get textoRevisado(): string {
    const a = this.asesores.find((x) => x.id === this.datos.revisadoPor);
    if (!a) return "";
    const nombre = sinMarcador(a.nombre);
    const esp = sinMarcador(a.especialidad);
    if (a.autorizado === true && nombre) return `«Lo revisó ${nombre}${esp ? `, ${esp.charAt(0).toLowerCase()}${esp.slice(1)}` : ""}»`;
    if (esp) return `«Lo revisó un ${esp.charAt(0).toLowerCase()}${esp.slice(1)}» (sin autorización no sale su nombre)`;
    return this.nombreSitio ? `«Lo revisó un técnico de ${this.nombreSitio}»` : "";
  }

  // ── Productos elegidos con el selector ──────────────────────────────────────────────────────────────────────────

  get seleccionadosEleccion(): string[] {
    const el = this.eleccion;
    if (!el || !this.e) return [];
    if (el.para === "lineas") return (this.e.lineas || []).map((l) => l.productoId);
    if (el.para === "alternativa") {
      const a = (this.e.alternativas || [])[el.k];
      return a && a.por ? [a.por] : [];
    }
    return this.datos.instalacionId ? [this.datos.instalacionId] : [];
  }

  get maximoEleccion(): number {
    return this.eleccion && this.eleccion.para === "lineas" ? this.topes.lineas : 1;
  }

  get subtituloEleccion(): string {
    const el = this.eleccion;
    if (!el) return "";
    if (el.para === "lineas") return `Hasta ${this.topes.lineas} piezas. Después pones cuántas lleva de cada una.`;
    if (el.para === "alternativa") return "La pieza que reemplaza a la del kit en esta versión (por ejemplo, el WiFi 7 en lugar del WiFi 6).";
    return "El servicio de instalación: con precio se agrega al carrito; si está en tus productos para cotizar, la página dice «se cotiza con un asesor».";
  }

  aplicarEleccion(ids: string[]): void {
    const el = this.eleccion;
    this.eleccion = null;
    const e = this.e;
    if (!el) return;
    if (el.para === "lineas" && e) {
      const antes = new Map((e.lineas || []).map((l) => [l.productoId, l.cantidad || 1]));
      e.lineas = (ids || []).slice(0, this.topes.lineas).map((id) => ({ productoId: id, cantidad: antes.get(id) || 1 }));
      if (e.lineas.length) e.comboId = "";
    } else if (el.para === "alternativa" && e) {
      const a = (e.alternativas || [])[el.k];
      if (a) a.por = (ids || [])[0] || "";
    } else if (el.para === "instalacion") {
      this.datos.instalacionId = (ids || [])[0] || "";
    }
    this.cargarPiezas();
    this.cambiar();
  }

  // ── La sección: fondo y ancla ───────────────────────────────────────────────────────────────────────────────────

  elegirSuperficie(valor: "" | "alterna" | "estructura"): void {
    this.estilo.superficie = valor;
    this.cambiar();
  }

  /** Otra sección de esta página ya usa ese ancla (el servidor vacía la segunda). */
  anclaOcupada(valor: string): boolean {
    return bloquesDeSuPagina(this.contenido, this.bloque).some((b: any) => b && b !== this.bloque && b.estilo && b.estilo.ancla === valor);
  }

  ponerAncla(valor: string): void {
    this.estilo.ancla = String(valor || "").trim().toLowerCase();
    this.cambiar();
  }

  get avisoAncla(): string {
    const a = this.ancla;
    if (!a) return "Sin ancla, ni la portada ni las tarjetas pueden llevar a un espacio de este plano.";
    if (!anclaValida(a)) return "Ese ancla no sirve: usa minúsculas, números y guiones («plano»), sin «seccion-» ni nombres que ya usa la página.";
    if (this.anclaOcupada(a)) return "Otra sección de esta página ya usa ese ancla: la página se la quita a esta.";
    return "";
  }

  get anclaSugerida(): string {
    return ["plano", "kit", "arma-tu-kit"].find((a) => !this.anclaOcupada(a)) || "";
  }

  // ── Avisos de toda la sección ───────────────────────────────────────────────────────────────────────────────────

  get avisos(): string[] {
    const salida: string[] = [];
    const d = this.datos;
    if (!espaciosPintados(d).length) salida.push("La sección no sale en la página hasta que un espacio tenga nombre y kit.");
    const ids = idsDelPlano(d, this.combos);
    if (ids.length > this.topes.ids) {
      salida.push(`Entre todos los espacios hay ${ids.length} piezas distintas y la página lee hasta ${this.topes.ids}: los kits que pasen de ahí se arman con un asesor.`);
    }
    const revisar = (texto: string | undefined, donde: string) => {
      const v = String(texto || "").trim();
      if (!v) return;
      if (tieneMarcador(v)) salida.push(`${donde}: «${v}» tiene un dato por llenar entre corchetes y no se publica.`);
      else if (promesaSinConfirmar(v, this.confirmadas)) salida.push(`${donde}: «${v}» promete algo que no has confirmado; así no se puede publicar.`);
    };
    revisar(d.etiqueta, "El antetítulo");
    revisar(d.titulo, "El título");
    revisar(d.tituloSuave, "La segunda parte del título");
    revisar(d.subtitulo, "La línea de apoyo");
    if (!d.revisadoPor) revisar(d.nota, "La línea del kit");
    for (const e of this.espacios) {
      const nombre = tituloDeEspacio(e) || e.id;
      revisar(e.detalle, `El detalle de «${nombre}»`);
      (e.puntos || []).forEach((p, k) => {
        revisar(p.zona, `${nombre}, punto ${k + 1} (zona)`);
        revisar(p.que, `${nombre}, punto ${k + 1} (qué es)`);
        revisar(p.porque, `${nombre}, punto ${k + 1} (por qué va ahí)`);
      });
    }
    if (d.permitirCompra === true && !this.tiendaEncendida) {
      salida.push("Tu tienda no está encendida (Tienda › Vender en línea): «Agregar el kit» no sale y queda «Enviar a un asesor».");
    }
    if (!this.conWhatsapp) {
      salida.push("Esta página no tiene una sección de WhatsApp con número: si tu negocio tampoco tiene uno en sus datos, no salen «Enviar a un asesor» ni «Pedir este kit a un asesor».");
    }
    return salida;
  }

  // ── Cambios y grupos ────────────────────────────────────────────────────────────────────────────────────────────

  cambiar(): void {
    this.avisar();
  }

  alternarGrupo(g: Grupo): void {
    if (this.abiertos.has(g)) this.abiertos.delete(g);
    else this.abiertos.add(g);
  }

  porIndice(i: number): number {
    return i;
  }

  porId(_: number, id: string): string {
    return id;
  }

  porObjeto<T>(_: number, x: T): T {
    return x;
  }

  porLinea(_: number, l: LineaKit): string {
    return l.productoId;
  }

  // ── Datos de referencia (solo lectura) ──────────────────────────────────────────────────────────────────────────

  /** El slug del sitio y si está publicado (una vez por sitio). Con él, el estado del kit sale de la vista de la página. */
  private cargarPagina(): void {
    if (this.pagina !== undefined) return;
    const id = (this.route && this.route.snapshot && this.route.snapshot.paramMap.get("id")) || "";
    if (!id) {
      this.pagina = null;
      return;
    }
    if (!SITIOS[id]) {
      SITIOS[id] = new Promise((resolver) => {
        this.planoKit.sitio(id).subscribe({
          next: (res) => {
            const d = (res && res.data) || {};
            resolver(d.slug ? { slug: String(d.slug), publicado: !!d.published } : null);
          },
          error: () => resolver(null),
        });
      });
    }
    SITIOS[id].then((p) => {
      if (!this.vivo) return;
      this.pagina = p && p.publicado ? p : null;
      this.cargarPiezas();
    });
  }

  /**
   * Lo que falta saber de las piezas: del catálogo (nombre, foto, activa; de a 24) y, si el sitio está publicado, de la
   * vista de la página (precio de vitrina y disponible; de a 30, el tope del servidor).
   */
  cargarPiezas(): void {
    const ids = piezasDelBloque(this.datos, this.combos).filter(Boolean);
    const faltan = ids.filter((id) => !(id in CATALOGO));
    for (let i = 0; i < faltan.length; i += 24) {
      const tanda = faltan.slice(i, i + 24);
      for (const id of tanda) CATALOGO[id] = undefined as any;
      this.planoKit.productosPorIds(tanda).subscribe({
        next: (res) => {
          const vistos = new Set<string>();
          for (const p of (res && res.products) || []) {
            vistos.add(p.cd);
            CATALOGO[p.cd] = piezaDesdeProducto(p, primeraImagen((p as any).crearProducto || {}));
          }
          for (const id of tanda) if (!vistos.has(id)) CATALOGO[id] = null;
        },
        error: () => {
          for (const id of tanda) delete CATALOGO[id];
          this.toastr.error("No pudimos cargar las piezas del kit.");
        },
      });
    }
    const pagina = this.pagina;
    if (!pagina) return;
    const vitrina = (VITRINA[pagina.slug] = VITRINA[pagina.slug] || {});
    const sinVer = ids.filter((id) => !(id in vitrina));
    for (let i = 0; i < sinVer.length; i += 30) {
      const tanda = sinVer.slice(i, i + 30);
      for (const id of tanda) vitrina[id] = undefined as any;
      this.planoKit.piezasDeLaPagina(pagina.slug, tanda).subscribe({
        next: (res) => {
          const porId = new Map(((res && res.data && res.data.productos) || []).map((v) => [v.productoId, v] as [string, PiezaDeVitrina]));
          for (const id of tanda) vitrina[id] = porId.get(id) || null;
        },
        error: () => {
          for (const id of tanda) delete vitrina[id];
          // Sin la vista de la página, el panel no afirma existencias: usa solo el catálogo.
          this.pagina = null;
        },
      });
    }
  }

  /** Los combos activos de la empresa (los mismos del POS). Solo se leen. */
  cargarCombos(): void {
    if (this.combos || this.cargandoCombos) return;
    if (!combosCache || Date.now() - combosCache.cuando > 60000) {
      combosCache = {
        cuando: Date.now(),
        lista: new Promise<ComboVista[] | null>((resolver) => {
          this.planoKit.combos().subscribe({
            next: (res: any) => {
              const crudos: any[] = Array.isArray(res) ? res : (res && (res.data || res.combos)) || [];
              resolver(
                crudos
                  .filter((c) => c && c.activo !== false && c.id)
                  .map((c) => ({ id: String(c.id), nombre: String(c.nombre || "Sin nombre"), lineas: lineasDeCombo(c.productos) }))
              );
            },
            error: () => resolver(null),
          });
        }),
      };
    }
    this.cargandoCombos = true;
    combosCache.lista.then((lista) => {
      if (!this.vivo) return;
      this.cargandoCombos = false;
      if (lista === null) {
        // Sin la lista no se sabe qué lleva un combo: los kits que usan uno quedan «sin leer», no «no disponibles».
        combosCache = null;
        this.combosFallaron = true;
        this.toastr.error("No pudimos cargar tus combos.");
        return;
      }
      this.combosFallaron = false;
      this.combos = lista;
      this.cargarPiezas();
    });
  }
}
