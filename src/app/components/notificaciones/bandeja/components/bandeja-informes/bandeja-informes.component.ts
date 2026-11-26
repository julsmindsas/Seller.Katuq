import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";

import {
  CifraInforme,
  ColaAtencion,
  FiltrosInformeAtencion,
  InformeAtencion,
  LineaDeCola,
  MiembroAtencion,
} from "../../../../../shared/services/messaging/messaging.models";
import { CANAL_BANDEJA_LABEL } from "../../bandeja.canales";
import { CanalBandeja } from "../../bandeja.models";
import {
  diasDelRango,
  hoyColombia,
  MAX_DIAS_INFORME,
  sumarDias,
  textoMinutos,
  textoSegundos,
} from "./bandeja-informes.util";

/** Valor del filtro de asesor para lo cerrado por el sistema (cierre automático). */
const ASESOR_SISTEMA = "sistema";

/**
 * Pestaña «Informes» de la bandeja (solo quien coordina, D-729). Presentacional: recibe el informe ya
 * leído y avisa lo que la persona pide (consultar, cambiar de página, descargar); quien la aloja llama al
 * servidor. Solo lectura. Los arreglos de entrada son campos estables de quien aloja, nunca de un getter.
 */
@Component({
  selector: "app-bandeja-informes",
  templateUrl: "./bandeja-informes.component.html",
  styleUrls: ["./bandeja-informes.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaInformesComponent implements OnChanges {
  @Input() informe: InformeAtencion | null = null;
  @Input() cargando = false;
  /** Mensaje del servidor (422); vacío = el texto general. */
  @Input() error = false;
  @Input() mensajeError = "";
  @Input() descargando = false;
  @Input() errorDescarga = false;
  /** La descarga trajo el máximo y hay más chats. */
  @Input() truncado = false;

  /** Opciones de los filtros (campos estables de quien aloja). */
  @Input() canales: CanalBandeja[] = [];
  @Input() lineas: LineaDeCola[] = [];
  @Input() colas: ColaAtencion[] = [];
  @Input() asesores: MiembroAtencion[] = [];

  /** Filtros completos (con `pagina`). La bandeja lee el servidor y devuelve el informe. */
  @Output() consultar = new EventEmitter<FiltrosInformeAtencion>();
  /** Filtros aplicados (sin `pagina`): la bandeja pide `pagina=0` y arma el CSV. */
  @Output() descargar = new EventEmitter<FiltrosInformeAtencion>();

  readonly maxDias = MAX_DIAS_INFORME;
  readonly sistema = ASESOR_SISTEMA;

  /** Lo que la persona escribe en el formulario. */
  form = { desde: "", hasta: "", canal: "", lineId: "", colaId: "", asesor: "" };
  /** Los filtros con los que se leyó el informe que se ve: lo que usan las páginas y la descarga. */
  aplicados: FiltrosInformeAtencion = {};
  errorFiltro = "";
  /** La persona tocó los filtros: el informe que llega no los pisa. */
  private sucio = false;
  /** Filtros pedidos que aún no tienen su informe: pasan a `aplicados` solo cuando el informe llega. */
  private pedidos: FiltrosInformeAtencion | null = null;

  constructor() {
    this.rangoPorDefecto();
  }

  /** Nombre visible del número o cuenta de una fila (D-729); el mapa se arma al cambiar `lineas`. */
  private nombresLinea = new Map<string, string>();
  nombreLinea(id: string): string {
    return this.nombresLinea.get(id) || String(id || "").replace(/^red_/, "");
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["lineas"]) this.nombresLinea = new Map((this.lineas || []).map((l) => [l.id, l.nombre]));
    if (cambios["informe"] && this.informe && this.pedidos) {
      // Llegó el informe de los filtros pedidos: ahora sí son los de la pantalla (páginas y descarga).
      this.aplicados = this.pedidos;
      this.pedidos = null;
    } else if (cambios["informe"] && this.informe && !this.sucio) {
      // Primera lectura (rango por defecto del servidor): el formulario la sigue.
      this.form = { ...this.form, desde: this.informe.rango.desde, hasta: this.informe.rango.hasta };
      this.aplicados = { desde: this.informe.rango.desde, hasta: this.informe.rango.hasta };
    }
    if (!this.informe && !this.form.desde) this.rangoPorDefecto();
  }

  private rangoPorDefecto(): void {
    const hoy = hoyColombia();
    this.form = { ...this.form, desde: sumarDias(hoy, -6), hasta: hoy };
  }

  tocar(): void {
    this.sucio = true;
    this.errorFiltro = "";
  }

  /** «Ver informe»: valida el rango y pide la página 1. */
  ver(): void {
    const { desde, hasta } = this.form;
    const dias = diasDelRango(desde, hasta);
    if (isNaN(dias)) {
      this.errorFiltro = "notificaciones.bandeja.informes.errorFecha";
      return;
    }
    if (dias < 1) {
      this.errorFiltro = "notificaciones.bandeja.informes.errorOrden";
      return;
    }
    if (dias > MAX_DIAS_INFORME) {
      this.errorFiltro = "notificaciones.bandeja.informes.errorRango";
      return;
    }
    this.errorFiltro = "";
    this.sucio = true;
    this.pedidos = this.limpiar({ ...this.form });
    this.consultar.emit({ ...this.pedidos, pagina: 1 });
  }

  reintentar(): void {
    if (this.pedidos) this.consultar.emit({ ...this.pedidos, pagina: 1 });
    else this.consultar.emit({ ...this.aplicados, pagina: this.informe?.pagina || 1 });
  }

  irA(pagina: number): void {
    if (!this.informe || this.cargando) return;
    if (pagina < 1 || pagina > this.informe.paginas) return;
    this.pedidos = null; // la página es del informe que se ve, no de filtros pendientes
    this.consultar.emit({ ...this.aplicados, pagina });
  }

  bajar(): void {
    if (this.descargando) return;
    this.descargar.emit({ ...this.aplicados });
  }

  private limpiar(f: Record<string, string>): FiltrosInformeAtencion {
    const res: Record<string, string> = {};
    Object.keys(f).forEach((k) => {
      if (f[k]) res[k] = f[k];
    });
    return res as FiltrosInformeAtencion;
  }

  // ─── Texto de la tabla ───

  nombreCanal(canal: string): string {
    return CANAL_BANDEJA_LABEL[canal as CanalBandeja] || canal;
  }

  /** Los nombres de «sin cola», «sin asignar» y «sistema» vienen del servidor en español: se traducen por su clave. */
  claveNombre(tipo: "cola" | "asesor", f: CifraInforme): string | null {
    if (tipo === "cola" && f.clave === "") return "notificaciones.bandeja.informes.sinCola";
    if (tipo === "asesor" && f.clave === "") return "notificaciones.bandeja.informes.sinAsignar";
    if (tipo === "asesor" && f.clave === ASESOR_SISTEMA) return "notificaciones.bandeja.informes.sistema";
    return null;
  }

  seg(s: number | null | undefined): string {
    return textoSegundos(s);
  }

  min(m: number | null | undefined): string {
    return textoMinutos(m);
  }

  trackIdx(i: number): number {
    return i;
  }

  trackFila(_i: number, f: { threadId: string }): string {
    return f.threadId;
  }

  get hayDatos(): boolean {
    const r = this.informe?.resumen;
    return !!r && (r.creados > 0 || r.cerrados > 0);
  }
}
