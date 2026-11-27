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
  CifraInforme,
  ColaAtencion,
  FilaInforme,
  FiltrosInformeAtencion,
  InformeAtencion,
  LineaDeCola,
  MiembroAtencion,
} from "../../../../../shared/services/messaging/messaging.models";
import { CANAL_BANDEJA_LABEL } from "../../bandeja.canales";
import { CanalBandeja } from "../../bandeja.models";
import {
  conPorcentaje,
  construirCsv,
  construirCsvResumen,
  descargarCsv,
  diasDelRango,
  fechaCorta,
  FILAS_POR_PAGINA,
  hoyColombia,
  MAX_DIAS_INFORME,
  numeroOpcional,
  sumarDias,
  textoMinutos,
  textoSegundos,
  TotalConPorcentaje,
} from "./bandeja-informes.util";

/** Lo que se pide al pulsar «Abrir chat» en la auditoría: el chat, sin datos del cliente. */
export interface ChatDelInforme {
  threadId: string;
  canal: string;
  linea: string;
}

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
  /** Filtros aplicados (sin `pagina`): la bandeja pide `pagina=0` y arma el CSV. Solo si el informe no trae ya todas las filas. */
  @Output() descargar = new EventEmitter<FiltrosInformeAtencion>();
  /**
   * «Abrir chat» junto a «Contacto» en la auditoría. El botón solo aparece si quien aloja escucha este
   * evento; lleva el id del chat, su canal y su número, nunca nombres ni teléfonos.
   */
  @Output() abrirChat = new EventEmitter<ChatDelInforme>();

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

  /** Motivos y etiquetas con su porcentaje (se arman al llegar el informe, no en cada pintado). */
  motivos: TotalConPorcentaje[] = [];
  etiquetas: TotalConPorcentaje[] = [];

  /**
   * Auditoría a la vista. Si el informe llegó completo (`pagina` 0, hasta 5000 filas), las páginas se
   * pasan aquí sin volver a leer el servidor; si llegó por páginas, cada página se le pide a la bandeja.
   */
  filasVista: FilaInforme[] = [];
  paginaVista = 1;
  paginasVista = 1;
  totalVista = 0;
  /** El informe trae todas las filas: páginas y descarga se resuelven en el navegador. */
  completo = false;

  constructor(private translate: TranslateService) {
    this.rangoPorDefecto();
  }

  /** Nombre visible del número o cuenta de una fila (D-729); el mapa se arma al cambiar `lineas`. */
  private nombresLinea = new Map<string, string>();
  nombreLinea(id: string): string {
    return this.nombresLinea.get(id) || String(id || "").replace(/^red_/, "");
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["lineas"]) this.nombresLinea = new Map((this.lineas || []).map((l) => [l.id, l.nombre]));
    if (cambios["informe"]) this.armarVista();
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
    // Una sola lectura con todas las filas (`pagina` 0): las páginas y la descarga ya no vuelven al servidor.
    this.consultar.emit({ ...this.pedidos, pagina: 0 });
  }

  reintentar(): void {
    if (this.pedidos) this.consultar.emit({ ...this.pedidos, pagina: 0 });
    else if (this.completo || !this.informe) this.consultar.emit({ ...this.aplicados, pagina: 0 });
    else this.consultar.emit({ ...this.aplicados, pagina: this.informe.pagina || 1 });
  }

  irA(pagina: number): void {
    if (!this.informe) return;
    if (pagina < 1 || pagina > this.paginasVista) return;
    if (this.completo) {
      this.paginaVista = pagina;
      this.cortarPagina();
      return;
    }
    if (this.cargando) return;
    this.pedidos = null; // la página es del informe que se ve, no de filtros pendientes
    this.consultar.emit({ ...this.aplicados, pagina });
  }

  bajar(): void {
    if (this.descargando) return;
    // Con todas las filas en memoria el CSV se arma aquí, sin otra lectura.
    if (this.completo && this.informe) {
      const inf = this.informe;
      descargarCsv(construirCsv(inf.filas || [], this.textosAuditoria()), `informe-atencion-${inf.rango.desde}-${inf.rango.hasta}.csv`);
      return;
    }
    this.descargar.emit({ ...this.aplicados });
  }

  /** «Descargar resumen»: cifras y tablas pequeñas del informe que se ve, sin otra llamada al servidor. */
  bajarResumen(): void {
    const inf = this.informe;
    if (!inf) return;
    const t = (k: string, p?: Record<string, unknown>) => this.traducir(k, p);
    const b = "notificaciones.bandeja.informes.";
    const n = "notificaciones.informes2.";
    const csv = construirCsvResumen(inf.resumen, {
      titulo: t(n + "csvTitulo", { desde: fechaCorta(inf.rango.desde), hasta: fechaCorta(inf.rango.hasta) }),
      cifras: t(n + "csvCifras"),
      valor: t(n + "csvValor"),
      creados: t(b + "creados"),
      cerrados: t(b + "cerrados"),
      abiertos: t(b + "abiertos"),
      sinResponder: t(n + "sinResponderNuevos"),
      primeraRespuestaSeg: t(n + "csvPrimeraSeg"),
      conPrimeraRespuesta: t(n + "csvConPrimera"),
      opcionales: {
        clientesNuevos: t(n + "clientesNuevos"),
        clientesVuelven: t(n + "clientesVuelven"),
        reabiertos: t(n + "reabiertos"),
        p90Seg: t(n + "csvP90Seg"),
        dentroObjetivoPct: t(n + "csvDentroObjetivo"),
      },
      porCanal: t(b + "porCanal"),
      porCola: t(b + "porCola"),
      porAsesor: t(b + "porAsesor"),
      porMotivo: t(b + "porMotivo"),
      porEtiqueta: t(b + "porEtiqueta"),
      colCanal: t(b + "colCanal"),
      colCola: t(b + "colCola"),
      colAsesor: t(b + "colAsesor"),
      colMotivo: t(b + "colMotivo"),
      colEtiqueta: t(b + "colEtiqueta"),
      colCreados: t(b + "colCreados"),
      colCerrados: t(b + "colCerrados"),
      colTotal: t(b + "colTotal"),
      colPct: t(n + "colPct"),
      sinCola: t(b + "sinCola"),
      sinAsignar: t(b + "sinAsignar"),
      sistema: t(b + "sistema"),
      nombreCanal: (c) => this.nombreCanal(c),
    });
    descargarCsv(csv, `resumen-atencion-${inf.rango.desde}-${inf.rango.hasta}.csv`);
  }

  /** El host escucha «Abrir chat»: solo entonces se muestra el botón. */
  get puedeAbrirChat(): boolean {
    return this.abrirChat.observed;
  }

  abrir(f: FilaInforme): void {
    this.abrirChat.emit({ threadId: f.threadId, canal: f.canal, linea: f.linea });
  }

  /** Mismos textos y columnas que la descarga que arma la bandeja. */
  private textosAuditoria() {
    const b = "notificaciones.bandeja.informes.";
    return {
      cabeceras: [
        "colCanal",
        "colNumero",
        "colContacto",
        "colAsesor",
        "colCola",
        "colEtiquetas",
        "colCreacion",
        "colUltimo",
        "colEstado",
        "colMotivo",
        "colCerroPor",
        "colDuracionMin",
        "colPrimeraSeg",
      ].map((k) => this.traducir(b + k)),
      abierto: this.traducir(b + "estado.abierto"),
      cerrado: this.traducir(b + "estado.cerrado"),
      sistema: this.traducir(b + "sistema"),
      nombreCanal: (c: string) => this.nombreCanal(c),
      nombreLinea: (id: string) =>
        this.nombresLinea.get(id) || CANAL_BANDEJA_LABEL[String(id).replace(/^red_/, "") as CanalBandeja] || id,
    };
  }

  private traducir(clave: string, params?: Record<string, unknown>): string {
    const v = this.translate.instant(clave, params);
    return typeof v === "string" ? v : clave;
  }

  /** Arma lo que se ve del informe recién llegado: barras de motivos y etiquetas, y la página de la auditoría. */
  private armarVista(): void {
    const inf = this.informe;
    this.motivos = conPorcentaje(inf?.resumen?.porMotivo);
    this.etiquetas = conPorcentaje(inf?.resumen?.porEtiqueta);
    if (!inf) {
      this.completo = false;
      this.filasVista = [];
      this.paginaVista = this.paginasVista = 1;
      this.totalVista = 0;
      return;
    }
    this.completo = inf.pagina === 0;
    if (this.completo) {
      this.totalVista = (inf.filas || []).length;
      this.paginasVista = Math.max(1, Math.ceil(this.totalVista / FILAS_POR_PAGINA));
      this.paginaVista = 1;
      this.cortarPagina();
    } else {
      this.filasVista = inf.filas || [];
      this.paginaVista = inf.pagina || 1;
      this.paginasVista = inf.paginas || 1;
      this.totalVista = inf.total || 0;
    }
  }

  private cortarPagina(): void {
    const todas = this.informe?.filas || [];
    const desde = (this.paginaVista - 1) * FILAS_POR_PAGINA;
    this.filasVista = todas.slice(desde, desde + FILAS_POR_PAGINA);
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

  /** Rango en `dd/MM/yyyy`. */
  fecha(f: string): string {
    return fechaCorta(f);
  }

  /** Una cifra que el servidor puede mandar o no (nunca se inventa): null = no se muestra. */
  opcional(v: unknown): number | null {
    return numeroOpcional(v);
  }

  /** Hay más filas de las que se leyeron (la descarga o el informe completo llegaron al máximo). */
  get hayTruncado(): boolean {
    return this.truncado || (this.completo && !!this.informe?.truncado);
  }
}
