import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { SitiosService } from "../../../sitios.service";
import { MaestroService } from "../../../../../shared/services/maestros/maestro.service";
import { PanelSitioBase } from "../panel-sitio-base";
import { primeraImagen } from "../fichas/fichas-datos";
import {
  EspacioDePlano,
  FuenteSolucion,
  TOPES_SOLUCION,
  TarjetaSolucion,
  avisosDeTextos,
  bloquesDeSuPagina,
  espaciosDePlanos,
  fuenteDe,
  hayPlanoSinAncla,
  lineasPublicables,
  nombreCortoDe,
  ponerNombreCorto,
  tieneMarcador,
} from "./tarjeta-solucion-datos";

/** Lo que el panel muestra de una pieza (nombre y foto, de referencia; no se guarda). */
interface PiezaVista {
  titulo: string;
  imagen: string | null;
}

/** Un combo de la empresa, como lo ofrece el panel. */
interface ComboVista {
  id: string;
  nombre: string;
  /** Piezas distintas (un producto repetido cuenta una vez, como en la página). */
  piezas: number;
  productoIds: string[];
}

/** Nombres y fotos ya pedidos, compartidos entre las tarjetas del editor (no se piden dos veces). */
const PIEZAS: { [id: string]: PiezaVista } = {};
/** Los combos de la empresa: se piden una vez por minuto, para todas las tarjetas. */
let combos: { cuando: number; lista: Promise<ComboVista[]> } | null = null;

/**
 * Lo propio de una tarjeta «solución» (PLAN-V2 T14; C′ «Problemas frecuentes» y «Para tu negocio»), debajo de sus campos
 * de siempre (título, texto, foto, antetítulo y botón). Lo pinta el módulo `tarjetaSolucion` del servidor, solo con el
 * diseño nuevo:
 *  - qué la resuelve: unas piezas (hasta 4) o el kit de un combo. El total lo calcula la página con el precio de hoy; si
 *    una pieza se agota, dice «Consúltalo con un asesor»;
 *  - a qué espacio del plano de ESTA página lleva (el enlace solo sale si ese espacio está en la página);
 *  - un segundo enlace, «Lo que incluye» y la versión oscura de empresas.
 * Edita la tarjeta en su lugar (`tarjeta`) y avisa al editor con `avisar()`. No escribe en productos ni en combos.
 */
@Component({
  selector: "app-panel-tarjeta-solucion",
  templateUrl: "./tarjeta-solucion-panel.component.html",
  styleUrls: ["./tarjeta-solucion-panel.component.scss"],
})
export class TarjetaSolucionPanelComponent extends PanelSitioBase implements OnChanges {
  /** La tarjeta que se edita (un ítem de `elemento.datos.items`). */
  @Input() tarjeta: TarjetaSolucion | null = null;
  /** Su posición, para los ids de los campos. */
  @Input() indice = 0;

  readonly topes = TOPES_SOLUCION;
  /** Un id propio por panel, para asociar etiquetas y campos. */
  readonly uid = `sol-${Math.random().toString(36).slice(2, 8)}`;

  eligiendo = false;
  listaCombos: ComboVista[] | null = null;
  cargandoCombos = false;
  nuevaLinea = "";

  constructor(private service: SitiosService, private maestros: MaestroService, private toastr: ToastrService) {
    super();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["tarjeta"]) {
      this.cargarPiezas(this.t.productoIds || []);
      if (this.tarjeta && this.tarjeta.comboId) this.cargarCombos();
    }
  }

  // ── Lectura ─────────────────────────────────────────────────────────────────────────────────────────────────────

  get t(): TarjetaSolucion {
    return (this.tarjeta || {}) as TarjetaSolucion;
  }

  get fuente(): FuenteSolucion {
    return fuenteDe(this.tarjeta);
  }

  /** Los espacios de los planos de la página de esta sección. */
  get espacios(): EspacioDePlano[] {
    return espaciosDePlanos(bloquesDeSuPagina(this.contenido, this.bloque));
  }

  get planoSinAncla(): boolean {
    return hayPlanoSinAncla(bloquesDeSuPagina(this.contenido, this.bloque));
  }

  /** El espacio elegido ya no está en un plano visible de la página: la página no muestra el enlace. */
  get planoPerdido(): boolean {
    return !!this.t.plano && !this.espacios.some((e) => e.valor === this.t.plano);
  }

  /** El espacio elegido arma su kit con otro combo (o sin combo): la tarjeta y el plano dirían totales distintos. */
  get kitDistintoDelPlano(): boolean {
    const e = this.espacios.find((x) => x.valor === this.t.plano);
    return !!e && !!e.comboId && this.fuente === "kit" && e.comboId !== this.t.comboId;
  }

  /** El kit del espacio elegido, para ofrecer usarlo en la tarjeta. */
  get comboDelEspacio(): string {
    const e = this.espacios.find((x) => x.valor === this.t.plano);
    return e && e.comboId && e.comboId !== this.t.comboId ? e.comboId : "";
  }

  get conEstructura(): boolean {
    return !!(this.contenido && this.contenido.tema && (this.contenido.tema as any).colorEstructura);
  }

  get oscura(): boolean {
    return this.t.superficie === "estructura";
  }

  private get confirmadas(): string[] {
    const tienda: any = this.contenido && this.contenido.tienda;
    return (tienda && tienda.promesasConfirmadas) || [];
  }

  get avisos(): string[] {
    const salida = avisosDeTextos(this.tarjeta, this.confirmadas);
    // Principio 5: sin nombre corto, la página lee el nombre del catálogo (largo, cortado con puntos suspensivos).
    const sinNombre = this.piezasDeLaTarjeta.filter((p) => p.titulo && !this.nombreCorto(p.id).trim());
    if (sinNombre.length) {
      const cuales = sinNombre.map((p) => `«${p.titulo}»`).join(", ");
      salida.push(
        this.t.nota && this.t.nota.trim()
          ? `Sin nombre corto, si una pieza se agota la tarjeta la nombra como en el catálogo: ${cuales}.`
          : `Sin nombre corto, la tarjeta muestra el nombre del catálogo, cortado: ${cuales}. Escribe el nombre corto o un resumen.`
      );
    }
    if (this.oscura && this.conEstructura) {
      const n = lineasPublicables(this.tarjeta, this.confirmadas);
      if (n < 3) salida.push(`La tarjeta oscura publica ${n === 0 ? "ninguna línea" : n === 1 ? "1 línea" : `${n} líneas`} de «Lo que incluye»: se verá vacía. Escribe al menos 3 que sean ciertas.`);
    }
    if (this.fuente === "kit" && this.comboElegido && this.comboElegido.piezas > this.topes.piezasKit) {
      salida.push(`Ese kit tiene ${this.comboElegido.piezas} piezas distintas: con más de ${this.topes.piezasKit} la tarjeta no da total y dice «Consúltalo con un asesor».`);
    }
    return salida;
  }

  get piezas(): { id: string; titulo: string; imagen: string | null }[] {
    return (this.t.productoIds || []).map((id) => ({ id, titulo: (PIEZAS[id] && PIEZAS[id].titulo) || "", imagen: (PIEZAS[id] && PIEZAS[id].imagen) || null }));
  }

  get comboElegido(): ComboVista | null {
    return (this.listaCombos || []).find((x) => x.id === this.t.comboId) || null;
  }

  get nombreDelCombo(): string {
    const c = this.comboElegido;
    return c ? c.nombre : "";
  }

  /** Las piezas que usa la tarjeta hoy: las elegidas o las del kit (para sus nombres cortos). */
  get piezasDeLaTarjeta(): { id: string; titulo: string; imagen: string | null }[] {
    const ids = this.fuente === "kit" ? (this.comboElegido ? this.comboElegido.productoIds : []) : this.fuente === "piezas" ? this.t.productoIds || [] : [];
    return ids.map((id) => ({ id, titulo: (PIEZAS[id] && PIEZAS[id].titulo) || "", imagen: (PIEZAS[id] && PIEZAS[id].imagen) || null }));
  }

  nombreCorto(id: string): string {
    return nombreCortoDe(this.tarjeta, id);
  }

  nombreCortoConMarcador(id: string): boolean {
    return tieneMarcador(this.nombreCorto(id));
  }

  // ── Cambios ─────────────────────────────────────────────────────────────────────────────────────────────────────

  cambiar(): void {
    this.avisar();
  }

  /** El nombre corto de una pieza («Tapo P110M»). Solo se guardan los de las piezas que la tarjeta usa. */
  ponerNombre(id: string, valor: string): void {
    if (!this.tarjeta) return;
    ponerNombreCorto(this.tarjeta, id, valor, this.piezasDeLaTarjeta.map((p) => p.id));
    this.avisar();
  }

  /** Al cambiar de piezas o de kit, los nombres de piezas que ya no están se quitan. */
  private podarNombres(): void {
    if (!this.tarjeta || !Array.isArray(this.tarjeta.nombres)) return;
    const vigentes = this.fuente === "kit" ? (this.comboElegido ? this.comboElegido.productoIds : null) : this.t.productoIds || [];
    if (!vigentes) return; // los combos todavía no cargan: no se borra nada a ciegas
    this.tarjeta.nombres = this.tarjeta.nombres.filter((n) => n && vigentes.includes(n.productoId));
  }

  /** Piezas, kit o nada: la página usa una sola fuente, así que al cambiar se borra la otra. */
  elegirFuente(f: FuenteSolucion): void {
    if (!this.tarjeta || f === this.fuente) return;
    if (f === "piezas") {
      this.tarjeta.comboId = "";
      this.eligiendo = true;
    } else if (f === "kit") {
      this.tarjeta.productoIds = [];
      this.cargarCombos();
    } else {
      this.tarjeta.comboId = "";
      this.tarjeta.productoIds = [];
    }
    this.podarNombres();
    this.avisar();
  }

  aplicarPiezas(ids: string[]): void {
    this.eligiendo = false;
    if (!this.tarjeta) return;
    this.tarjeta.productoIds = (ids || []).slice(0, this.topes.piezas);
    if (this.tarjeta.productoIds.length) this.tarjeta.comboId = "";
    this.cargarPiezas(this.tarjeta.productoIds);
    this.podarNombres();
    this.avisar();
  }

  quitarPieza(id: string): void {
    if (!this.tarjeta) return;
    this.tarjeta.productoIds = (this.tarjeta.productoIds || []).filter((x) => x !== id);
    this.podarNombres();
    this.avisar();
  }

  elegirCombo(id: string): void {
    if (!this.tarjeta) return;
    this.tarjeta.comboId = id || "";
    if (this.tarjeta.comboId) this.tarjeta.productoIds = [];
    const c = this.comboElegido;
    if (c) this.cargarPiezas(c.productoIds);
    this.podarNombres();
    this.avisar();
  }

  usarKitDelEspacio(): void {
    const id = this.comboDelEspacio;
    if (!id) return;
    this.cargarCombos();
    this.elegirCombo(id);
  }

  /** El destino: un espacio del plano o «Ninguno» (entonces vale el enlace de siempre). */
  elegirPlano(valor: string): void {
    if (!this.tarjeta) return;
    this.tarjeta.plano = valor || "";
    this.avisar();
  }

  alternarOscura(): void {
    if (!this.tarjeta) return;
    this.tarjeta.superficie = this.oscura ? "" : "estructura";
    this.avisar();
  }

  agregarLinea(): void {
    const texto = this.nuevaLinea.trim().slice(0, this.topes.textoIncluye);
    if (!this.tarjeta || !texto) return;
    const lista = Array.isArray(this.tarjeta.incluye) ? this.tarjeta.incluye : [];
    if (lista.length >= this.topes.incluye) return;
    this.tarjeta.incluye = [...lista, texto];
    this.nuevaLinea = "";
    this.avisar();
  }

  quitarLinea(k: number): void {
    if (!this.tarjeta || !Array.isArray(this.tarjeta.incluye)) return;
    this.tarjeta.incluye = this.tarjeta.incluye.filter((_, j) => j !== k);
    this.avisar();
  }

  porIndice(i: number): number {
    return i;
  }

  /** Las listas se arman de nuevo en cada revisión: sin esto, el <select> perdería la opción elegida al redibujarse. */
  porValor(_: number, e: EspacioDePlano): string {
    return e.valor;
  }

  porId(_: number, x: { id: string }): string {
    return x.id;
  }

  // ── Datos de referencia ─────────────────────────────────────────────────────────────────────────────────────────

  /** Nombre y foto de unas piezas (las que ya se pidieron no se vuelven a pedir). */
  private cargarPiezas(ids: string[]): void {
    const faltan = (ids || []).filter((id) => id && !PIEZAS[id]);
    if (!faltan.length) return;
    this.service.productosPorIds(faltan).subscribe({
      next: (res) => {
        for (const p of (res && res.products) || []) {
          const crear: any = p.crearProducto || {};
          PIEZAS[p.cd] = { titulo: crear.titulo || "Sin nombre", imagen: primeraImagen(crear) };
        }
        for (const id of faltan) if (!PIEZAS[id]) PIEZAS[id] = { titulo: "", imagen: null };
      },
      error: () => this.toastr.error("No pudimos cargar los nombres de las piezas."),
    });
  }

  /** Los combos activos de la empresa (los mismos del POS). Solo se leen: aquí no se crea ni se cambia ninguno. */
  cargarCombos(): void {
    if (this.listaCombos || this.cargandoCombos) return;
    if (!combos || Date.now() - combos.cuando > 60000) {
      combos = {
        cuando: Date.now(),
        lista: new Promise<ComboVista[]>((resolver) => {
          this.maestros.getCombos().subscribe({
            next: (res: any) => {
              const crudos: any[] = Array.isArray(res) ? res : (res && (res.data || res.combos)) || [];
              resolver(
                crudos
                  .filter((c) => c && c.activo !== false && c.id)
                  .map((c) => {
                    const productoIds = Array.from(
                      new Set<string>((Array.isArray(c.productos) ? c.productos : []).map((p: any) => String((p && p.productoId) || "")).filter(Boolean))
                    );
                    return { id: String(c.id), nombre: String(c.nombre || "Sin nombre"), piezas: productoIds.length, productoIds };
                  })
              );
            },
            error: () => resolver([]),
          });
        }),
      };
    }
    this.cargandoCombos = true;
    combos.lista.then((lista) => {
      this.listaCombos = lista;
      this.cargandoCombos = false;
      if (!lista.length) combos = null;
      const c = this.comboElegido;
      if (c) this.cargarPiezas(c.productoIds);
    });
  }
}
