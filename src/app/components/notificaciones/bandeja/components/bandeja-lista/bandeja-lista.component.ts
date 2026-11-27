import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

import {
  LineaResumen,
  ColaAtencion,
  ColaBasica,
  EtiquetaChat,
  MessagingLine,
  MiembroAtencion,
  MiembroEquipo,
} from "../../../../../shared/services/messaging/messaging.models";
import { inicialesDe, tonoDe } from "../../../inbox-core/iniciales";
import { mapaDeEquipo, nombreConMapa } from "../../../inbox-core/chat-dueno/nombre-asesor";
import { textoHumanoDePlantilla } from "../../../whatsapp-inbox/components/whatsapp-thread-list/plantillas-humanas";
import { CANAL_BANDEJA_ICONO, CANAL_BANDEJA_LABEL } from "../../bandeja.canales";
import {
  ASESOR_SIN_ASIGNAR,
  CanalBandeja,
  ConversacionResumen,
  FILTRO_BANDEJA_VACIO,
  FiltroBandeja,
} from "../../bandeja.models";
import { MarcaEtiqueta, marcasDe } from "../../bandeja.catalogos";
import { colaIdDe, filtrar, mezclar, normalizarTexto, telefonoDe } from "../../bandeja.util";

/** Lo que la lista recuerda al volver (de un pedido, por ejemplo): sus filtros locales. */
export type FiltroListaGuardado = Partial<
  Pick<FiltroBandeja, "canal" | "lineId" | "sinResponder" | "mios" | "busqueda" | "estado" | "etiqueta">
>;

/** Una fila ya lista para pintar: se arma una vez por cambio de datos o de filtro, no en cada ciclo. */
interface FilaVista {
  conversacion: ConversacionResumen;
  /** Nombre del contacto; sin nombre, su número enmascarado (WhatsApp) o «Contacto de <canal>». */
  nombre: string;
  /** Vacío = la vista pone el ícono de persona. */
  iniciales: string;
  /** Tono del avatar (0 a 5): el mismo cliente, el mismo color. */
  tono: number;
  /** Número enmascarado bajo el nombre (solo WhatsApp con nombre: sin nombre, el número ya es el título). */
  numero: string;
  /** Quién atiende y cola, en una sola línea; vacío = no se pinta. */
  meta: string;
  /** El chat tiene dueño o está sin asignar (ícono de persona); si no, solo la cola (ícono de cola). */
  metaPersona: boolean;
  hora: string;
  resumen: string;
  canalLabel: string;
  canalIcono: string;
  /** Etiquetas del chat que siguen en el catálogo (D-728). */
  etiquetas: MarcaEtiqueta[];
  /** Motivo del cierre; vacío si el chat está abierto. */
  motivo: string;
}

const LARGO_RESUMEN = 60;

/**
 * Lista de la bandeja única (columna izquierda): una fila por conversación de cualquier canal, con su
 * distintivo de canal, el número de WhatsApp si hay varios, el dueño y los no leídos. Solo presenta y
 * filtra lo que le pasan: no llama a ningún servicio. Quien la aloja carga los datos y abre el chat.
 *
 * Filtros: canal, número, «Sin responder», «Míos» y búsqueda por nombre. Todos locales, sobre lo cargado.
 */
@Component({
  selector: "app-bandeja-lista",
  templateUrl: "./bandeja-lista.component.html",
  styleUrls: ["./bandeja-lista.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaListaComponent implements OnChanges {
  @Input() conversaciones: ConversacionResumen[] = [];
  /** Canales que el usuario puede ver y están conectados: son los chips del filtro. */
  @Input() canalesDisponibles: CanalBandeja[] = [];
  @Input() canalesCaidos: CanalBandeja[] = [];
  @Input() cargando = false;
  /** Ningún canal pedido pudo cargarse. */
  @Input() errorCarga = false;
  @Input() hayMas = false;
  @Input() cargandoMas = false;
  /** Clave de la conversación abierta. */
  @Input() claveSeleccion: string | null = null;
  /** Bandera `whatsappMultiNumero`: habilita el selector de número y el chip del número en cada fila. */
  @Input() multiNumero = false;
  @Input() lineas: MessagingLine[] = [];
  @Input() esAdministrador = false;
  @Input() miEmail = "";
  /** Bandeja con atención multiagente (D-725): «Míos» siempre visible y «Sin asignar» en cada fila. */
  @Input() atencion = false;
  /** Quien coordina ve el filtro por asesor. */
  @Input() coordina = false;
  @Input() asesores: MiembroAtencion[] = [];
  /** Asesor elegido: lo manda quien aloja la lista (también lo cambia la pestaña Equipo). */
  @Input() asesor: string | null = null;

  /** [D-727] Colas del comercio (campo estable de quien aloja la lista); sin colas no hay filtro ni nombre. */
  @Input() colas: Array<ColaBasica & Partial<ColaAtencion>> = [];
  /** Cola elegida: la manda quien aloja la lista (también la cambia la pestaña Equipo). */
  @Input() cola: string | null = null;

  /** [D-728] Catálogo de etiquetas (campo estable de quien aloja); sin él no hay filtro ni marcas. */
  @Input() etiquetasCat: EtiquetaChat[] = [];

  /** Equipo del comercio: la fila dice «Atiende Ana López» aunque el chat haya guardado el correo. */
  @Input() equipo: MiembroEquipo[] = [];

  /**
   * Resultados de la búsqueda en el servidor (WhatsApp, últimos 90 días) para `busquedaServidor`. Se suman a lo
   * cargado mientras la búsqueda sea esa misma; los demás filtros se les aplican igual.
   */
  @Input() resultadosBusqueda: ConversacionResumen[] = [];
  @Input() busquedaServidor = "";
  @Input() buscandoServidor = false;

  /** Filtros que la lista tenía al salir de la bandeja. Se aplican una vez, cuando existe cada opción. */
  @Input() filtroInicial: FiltroListaGuardado | null = null;

  @Output() colaChange = new EventEmitter<string | null>();
  @Output() asesorChange = new EventEmitter<string | null>();
  @Output() seleccionar = new EventEmitter<ConversacionResumen>();
  @Output() verMas = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();
  /** Texto de búsqueda (sin esperar): quien aloja decide si pregunta también al servidor. */
  @Output() busquedaChange = new EventEmitter<string>();
  /** Cada cambio de filtro hecho por la persona, para recordarlo al volver. */
  @Output() filtroChange = new EventEmitter<FiltroListaGuardado>();

  filtro: FiltroBandeja = { ...FILTRO_BANDEJA_VACIO };
  filas: FilaVista[] = [];
  opcionesLinea: LineaResumen[] = [];
  sinResponderCount = 0;
  hayDuenos = false;
  avisoCaidos = "";
  /** Cuántos chats cerrados hay en lo cargado; con 0 el estado vacío de «Cerrados» lo dice. */
  cerradosCount = 0;
  /** «Sin responder» cuenta solo lo cargado: con más páginas de WhatsApp por traer dice «3+». */
  sinResponderTexto = "";
  /** Puede haber chats sin cargar que cumplan los filtros (quedan páginas de WhatsApp). */
  puedeHaberMas = false;
  /** Cuántos de asesor, etiqueta, cola y número están puestos (cifra del botón «Filtros»). */
  filtrosActivos = 0;
  filtrosAbiertos = false;

  private mapaEquipo = new Map<string, string>();
  /** Filtros recordados que esperan su opción (el canal, la etiqueta o el número llegan después). */
  private restaurar: FiltroListaGuardado | null = null;
  private restaurado = false;

  constructor(private readonly translate: TranslateService) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["equipo"]) this.mapaEquipo = mapaDeEquipo(this.equipo);
    if (cambios["filtroInicial"] && this.filtroInicial && !this.restaurado) {
      this.restaurado = true;
      this.restaurar = { ...this.filtroInicial };
    }
    this.recalcular();
  }

  /** Asesor, etiqueta, cola y número van juntos en «Filtros», que se abre y se cierra. */
  get mostrarBotonFiltros(): boolean {
    return this.mostrarAsesor || this.mostrarEtiqueta || this.mostrarCola || this.mostrarLinea;
  }

  alternarFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  get mostrarCanales(): boolean {
    return this.canalesDisponibles.length > 1;
  }

  get mostrarLinea(): boolean {
    return this.multiNumero && this.opcionesLinea.length > 1;
  }

  /** «Míos» solo existe donde hay dueños de chat; si ya está activo se deja para poder apagarlo. */
  get mostrarMios(): boolean {
    return this.atencion || this.hayDuenos || this.filtro.mios;
  }

  get mostrarAsesor(): boolean {
    return this.atencion && this.coordina;
  }

  /** El filtro por cola solo existe con la atención multiagente y al menos una cola. */
  get mostrarCola(): boolean {
    return this.atencion && this.colas.length > 0;
  }

  /** Abiertos / Cerrados solo existe con la atención multiagente (D-728). */
  get mostrarEstado(): boolean {
    return this.atencion;
  }

  get mostrarEtiqueta(): boolean {
    return this.atencion && this.etiquetasCat.length > 0;
  }

  elegirEstado(estado: "abiertos" | "cerrados"): void {
    this.cambiarFiltro({ estado });
  }

  elegirEtiqueta(valor: string): void {
    this.cambiarFiltro({ etiqueta: valor || null });
  }

  elegirCola(valor: string): void {
    this.colaChange.emit(valor || null);
  }

  readonly sinAsignar = ASESOR_SIN_ASIGNAR;

  elegirAsesor(valor: string): void {
    this.asesorChange.emit(valor || null);
  }

  canalLabel(canal: CanalBandeja): string {
    return CANAL_BANDEJA_LABEL[canal];
  }

  elegirCanal(canal: CanalBandeja | null): void {
    this.cambiarFiltro({ canal });
  }

  elegirLinea(lineId: string): void {
    this.cambiarFiltro({ lineId: lineId || null });
  }

  alternarSinResponder(): void {
    this.cambiarFiltro({ sinResponder: !this.filtro.sinResponder });
  }

  alternarMios(): void {
    this.cambiarFiltro({ mios: !this.filtro.mios });
  }

  buscar(texto: string): void {
    this.cambiarFiltro({ busqueda: texto || "" });
    this.busquedaChange.emit(this.filtro.busqueda);
  }

  /** «Cargar más» del estado vacío: el mismo pedido que «Ver más». */
  cargarMas(): void {
    this.verMas.emit();
  }

  /** Un cambio de la persona: gana sobre lo recordado y se avisa para recordarlo. */
  private cambiarFiltro(cambio: Partial<FiltroBandeja>): void {
    if (this.restaurar) {
      const pendiente: FiltroListaGuardado = { ...this.restaurar };
      for (const k of Object.keys(cambio)) delete (pendiente as Record<string, unknown>)[k];
      this.restaurar = Object.keys(pendiente).length ? pendiente : null;
    }
    this.filtro = { ...this.filtro, ...cambio };
    this.recalcular();
    const f = this.filtro;
    this.filtroChange.emit({
      canal: f.canal,
      lineId: f.lineId,
      sinResponder: f.sinResponder,
      mios: f.mios,
      busqueda: f.busqueda,
      estado: f.estado,
      etiqueta: f.etiqueta,
    });
  }

  alElegir(fila: FilaVista): void {
    this.seleccionar.emit(fila.conversacion);
  }

  esSeleccionada(fila: FilaVista): boolean {
    return this.claveSeleccion === fila.conversacion.clave;
  }

  trackFila(_: number, fila: FilaVista): string {
    return fila.conversacion.clave;
  }

  /**
   * Aplica lo recordado a medida que existe su opción: la búsqueda y los interruptores enseguida; el canal, el
   * número, la etiqueta y «Cerrados» cuando llegan los canales, los números, el catálogo y la atención.
   */
  private aplicarRestaurado(todas: ConversacionResumen[]): void {
    const r = this.restaurar;
    if (!r) return;
    const listo: Partial<FiltroBandeja> = {};
    const pendiente: FiltroListaGuardado = {};
    if (typeof r.busqueda === "string") listo.busqueda = r.busqueda;
    if (typeof r.sinResponder === "boolean") listo.sinResponder = r.sinResponder;
    if (typeof r.mios === "boolean") listo.mios = r.mios;
    if (r.canal) {
      if (this.canalesDisponibles.includes(r.canal)) listo.canal = r.canal;
      else pendiente.canal = r.canal;
    }
    if (r.estado === "cerrados") {
      if (this.mostrarEstado) listo.estado = "cerrados";
      else pendiente.estado = "cerrados";
    }
    if (r.etiqueta) {
      if (this.etiquetasCat.some((e) => e.id === r.etiqueta)) listo.etiqueta = r.etiqueta;
      else pendiente.etiqueta = r.etiqueta;
    }
    if (r.lineId) {
      if (this.armarOpcionesLinea(todas).some((l) => l.id === r.lineId)) listo.lineId = r.lineId;
      else pendiente.lineId = r.lineId;
    }
    this.filtro = { ...this.filtro, ...listo };
    this.restaurar = Object.keys(pendiente).length ? pendiente : null;
  }

  private recalcular(): void {
    const todas = this.conversaciones || [];
    this.aplicarRestaurado(todas);
    this.hayDuenos = todas.some((c) => !!c.dueno);
    // El asesor elegido lo manda quien aloja la lista (null si no coordina).
    this.filtro = {
      ...this.filtro,
      asesor: this.mostrarAsesor ? this.asesor : null,
      colaId: this.mostrarCola ? this.cola : null,
    };
    // Un chat cerrado ya no cuenta como sin responder (D-728).
    this.sinResponderCount = todas.filter((c) => !c.cerrado && c.ultimaDireccion === "inbound").length;
    this.cerradosCount = todas.filter((c) => c.cerrado).length;
    // Con la bandeja apagada nadie trae `cerrado` y el filtro se queda en «Abiertos».
    if (!this.mostrarEstado && this.filtro.estado !== "abiertos") this.filtro = { ...this.filtro, estado: "abiertos" };
    if (this.filtro.etiqueta && !this.etiquetasCat.some((e) => e.id === this.filtro.etiqueta)) {
      this.filtro = { ...this.filtro, etiqueta: null };
    }
    this.opcionesLinea = this.armarOpcionesLinea(todas);
    // Si el canal o el número elegidos dejaron de estar disponibles, el filtro se suelta.
    if (this.filtro.canal && !this.canalesDisponibles.includes(this.filtro.canal)) {
      this.filtro = { ...this.filtro, canal: null };
    }
    if (this.filtro.lineId && !this.opcionesLinea.some((l) => l.id === this.filtro.lineId)) {
      this.filtro = { ...this.filtro, lineId: null };
    }
    this.filtrosActivos = [
      this.filtro.asesor,
      this.mostrarEtiqueta ? this.filtro.etiqueta : null,
      this.filtro.colaId,
      this.mostrarLinea ? this.filtro.lineId : null,
    ].filter(Boolean).length;
    // Con más páginas de WhatsApp por traer, las cifras y el vacío no pueden asegurar que no haya más.
    this.puedeHaberMas = this.hayMas && (!this.filtro.canal || this.filtro.canal === "whatsapp");
    this.sinResponderTexto = this.sinResponderCount > 0 ? `${this.sinResponderCount}${this.puedeHaberMas ? "+" : ""}` : "";
    this.filas = this.conBusquedaServidor(todas, filtrar(todas, this.filtro, this.miEmail, this.colas)).map((c) =>
      this.armarFila(c),
    );
    this.avisoCaidos = this.canalesCaidos.map((c) => CANAL_BANDEJA_LABEL[c]).join(", ");
  }

  /**
   * Suma a lo filtrado los chats que el servidor encontró para esta misma búsqueda (por número completo o por
   * el último mensaje, también en páginas sin cargar). Si el chat ya está cargado se usa la fila cargada, que es
   * la que el canal en vivo pone al día. Los demás filtros se aplican igual; sin búsqueda no cambia nada.
   */
  private conBusquedaServidor(todas: ConversacionResumen[], filtradas: ConversacionResumen[]): ConversacionResumen[] {
    const q = normalizarTexto(this.filtro.busqueda);
    if (!q || !this.resultadosBusqueda?.length || normalizarTexto(this.busquedaServidor) !== q) return filtradas;
    const yaEstan = new Set(filtradas.map((c) => c.clave));
    const cargadas = new Map(todas.map((c) => [c.clave, c]));
    const candidatas = this.resultadosBusqueda
      .filter((c) => !yaEstan.has(c.clave))
      .map((c) => cargadas.get(c.clave) ?? c);
    if (!candidatas.length) return filtradas;
    const extra = filtrar(candidatas, { ...this.filtro, busqueda: "" }, this.miEmail, this.colas);
    return extra.length ? mezclar([filtradas, extra]) : filtradas;
  }

  /**
   * Números del selector: quien administra ve todos; los demás, los que tienen asignados. A ambos se
   * suman los que aparecen en sus chats (igual que el buzón de WhatsApp). Sin la bandera, ninguno.
   */
  private armarOpcionesLinea(todas: ConversacionResumen[]): LineaResumen[] {
    if (!this.multiNumero) return [];
    const mapa = new Map<string, LineaResumen>();
    const yo = (this.miEmail || "").toLowerCase();
    for (const l of this.lineas || []) {
      const mia = (l.sellers || []).some((s) => (s.email || "").toLowerCase() === yo);
      if (this.esAdministrador || mia) {
        mapa.set(l.id, { id: l.id, displayName: l.displayName, displayPhone: l.displayPhone });
      }
    }
    for (const c of todas) {
      if (c.linea?.id && !mapa.has(c.linea.id)) mapa.set(c.linea.id, c.linea);
    }
    return Array.from(mapa.values());
  }

  private armarFila(c: ConversacionResumen): FilaVista {
    const canalLabel = CANAL_BANDEJA_LABEL[c.canal];
    const sinNombre = this.translate.instant("notificaciones.sinNombre");
    // Una respuesta vieja del servicio de WhatsApp trae «Sin nombre» como si fuera el nombre: cuenta como vacío.
    const crudo = (c.nombre || "").trim();
    const propio = crudo === sinNombre ? "" : crudo;
    const telefono = telefonoDe(c);
    const nombre =
      propio ||
      (c.canal === "whatsapp"
        ? telefono || sinNombre
        : this.translate.instant("notificaciones.meta.contactOf", { canal: canalLabel }));
    const base = (c.canal === "whatsapp" ? textoHumanoDePlantilla(c.resumen) : c.resumen) || "";
    // «Tú:» cuando el último mensaje lo mandó el comercio: se ve de un vistazo quién debe responder.
    const resumen = base && c.ultimaDireccion === "outbound"
      ? this.translate.instant("notificaciones.bandeja2.tuPrefijo") + base
      : base;
    const { meta, metaPersona } = this.metaDe(c);
    return {
      conversacion: c,
      nombre,
      iniciales: inicialesDe(propio),
      tono: tonoDe(c.clave),
      numero: propio && telefono ? telefono : "",
      meta,
      metaPersona,
      hora: this.tiempoRelativo(c.ultimoEn),
      resumen: resumen.length > LARGO_RESUMEN ? resumen.slice(0, LARGO_RESUMEN) + "…" : resumen,
      canalLabel,
      canalIcono: CANAL_BANDEJA_ICONO[c.canal],
      etiquetas: this.atencion ? marcasDe(c.etiquetas, this.etiquetasCat) : [],
      motivo: c.cerrado ? c.motivoCierre || "" : "",
    };
  }

  /** Quién atiende (o «Sin asignar») y la cola, juntos en una línea corta. */
  private metaDe(c: ConversacionResumen): { meta: string; metaPersona: boolean } {
    const partes: string[] = [];
    let metaPersona = false;
    if (c.dueno) {
      metaPersona = true;
      const nombre = nombreConMapa(c.dueno.email, c.dueno.nombre, this.mapaEquipo);
      partes.push(this.translate.instant("notificaciones.bandeja.handledBy", { nombre }));
    } else if (this.atencion && c.threadId && !c.cerrado) {
      metaPersona = true;
      partes.push(this.translate.instant("notificaciones.owner.unassigned"));
    }
    const cola = this.nombreDeCola(c);
    if (cola) partes.push(this.translate.instant("notificaciones.bandeja.colas.deCola", { nombre: cola }));
    return { meta: partes.join(" · "), metaPersona };
  }

  private nombreDeCola(c: ConversacionResumen): string {
    if (!this.mostrarCola) return "";
    const id = colaIdDe(c, this.colas);
    return id ? this.colas.find((q) => q.id === id)?.nombre || "" : "";
  }

  /** Mismo formato relativo del buzón de WhatsApp: ahora, minutos, horas, días y, después, la fecha. */
  private tiempoRelativo(iso: string): string {
    const entonces = Date.parse(iso);
    if (Number.isNaN(entonces)) return "";
    const seg = Math.floor((Date.now() - entonces) / 1000);
    if (seg < 60) return this.translate.instant("notificaciones.whatsapp.list.justNow");
    const min = Math.floor(seg / 60);
    if (min < 60) return this.translate.instant("notificaciones.whatsapp.list.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return this.translate.instant("notificaciones.whatsapp.list.hoursAgo", { n: h });
    const d = Math.floor(h / 24);
    if (d < 7) return this.translate.instant("notificaciones.whatsapp.list.daysAgo", { n: d });
    return new Date(entonces).toLocaleDateString();
  }
}
