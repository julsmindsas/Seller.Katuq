import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

import {
  LineaResumen,
  MessagingLine,
  MiembroAtencion,
} from "../../../../../shared/services/messaging/messaging.models";
import { textoHumanoDePlantilla } from "../../../whatsapp-inbox/components/whatsapp-thread-list/plantillas-humanas";
import { CANAL_BANDEJA_ICONO, CANAL_BANDEJA_LABEL } from "../../bandeja.canales";
import {
  ASESOR_SIN_ASIGNAR,
  CanalBandeja,
  ConversacionResumen,
  FILTRO_BANDEJA_VACIO,
  FiltroBandeja,
} from "../../bandeja.models";
import { filtrar } from "../../bandeja.util";

/** Una fila ya lista para pintar: se arma una vez por cambio de datos o de filtro, no en cada ciclo. */
interface FilaVista {
  conversacion: ConversacionResumen;
  nombre: string;
  iniciales: string;
  hora: string;
  resumen: string;
  canalLabel: string;
  canalIcono: string;
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

  @Output() asesorChange = new EventEmitter<string | null>();
  @Output() seleccionar = new EventEmitter<ConversacionResumen>();
  @Output() verMas = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();

  filtro: FiltroBandeja = { ...FILTRO_BANDEJA_VACIO };
  filas: FilaVista[] = [];
  opcionesLinea: LineaResumen[] = [];
  sinResponderCount = 0;
  hayDuenos = false;
  avisoCaidos = "";

  constructor(private readonly translate: TranslateService) {}

  ngOnChanges(): void {
    this.recalcular();
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

  readonly sinAsignar = ASESOR_SIN_ASIGNAR;

  elegirAsesor(valor: string): void {
    this.asesorChange.emit(valor || null);
  }

  canalLabel(canal: CanalBandeja): string {
    return CANAL_BANDEJA_LABEL[canal];
  }

  elegirCanal(canal: CanalBandeja | null): void {
    this.filtro = { ...this.filtro, canal };
    this.recalcular();
  }

  elegirLinea(lineId: string): void {
    this.filtro = { ...this.filtro, lineId: lineId || null };
    this.recalcular();
  }

  alternarSinResponder(): void {
    this.filtro = { ...this.filtro, sinResponder: !this.filtro.sinResponder };
    this.recalcular();
  }

  alternarMios(): void {
    this.filtro = { ...this.filtro, mios: !this.filtro.mios };
    this.recalcular();
  }

  buscar(texto: string): void {
    this.filtro = { ...this.filtro, busqueda: texto || "" };
    this.recalcular();
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

  private recalcular(): void {
    const todas = this.conversaciones || [];
    this.hayDuenos = todas.some((c) => !!c.dueno);
    // El asesor elegido lo manda quien aloja la lista (null si no coordina).
    this.filtro = { ...this.filtro, asesor: this.mostrarAsesor ? this.asesor : null };
    this.sinResponderCount = todas.filter((c) => c.ultimaDireccion === "inbound").length;
    this.opcionesLinea = this.armarOpcionesLinea(todas);
    // Si el canal o el número elegidos dejaron de estar disponibles, el filtro se suelta.
    if (this.filtro.canal && !this.canalesDisponibles.includes(this.filtro.canal)) {
      this.filtro = { ...this.filtro, canal: null };
    }
    if (this.filtro.lineId && !this.opcionesLinea.some((l) => l.id === this.filtro.lineId)) {
      this.filtro = { ...this.filtro, lineId: null };
    }
    this.filas = filtrar(todas, this.filtro, this.miEmail).map((c) => this.armarFila(c));
    this.avisoCaidos = this.canalesCaidos.map((c) => CANAL_BANDEJA_LABEL[c]).join(", ");
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
    const nombre =
      c.nombre ||
      (c.canal === "whatsapp"
        ? this.translate.instant("notificaciones.sinNombre")
        : this.translate.instant("notificaciones.meta.contactOf", { canal: canalLabel }));
    const resumen = c.canal === "whatsapp" ? textoHumanoDePlantilla(c.resumen) : c.resumen;
    return {
      conversacion: c,
      nombre,
      iniciales: this.iniciales(nombre),
      hora: this.tiempoRelativo(c.ultimoEn),
      resumen: resumen.length > LARGO_RESUMEN ? resumen.slice(0, LARGO_RESUMEN) + "…" : resumen,
      canalLabel,
      canalIcono: CANAL_BANDEJA_ICONO[c.canal],
    };
  }

  private iniciales(nombre: string): string {
    const partes = (nombre || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return partes.length ? partes.map((p) => p.charAt(0).toUpperCase()).join("") : "?";
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
