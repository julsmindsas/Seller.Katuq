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
  AjustesAtencion,
  CargaAsesor,
  CatalogosAtencion,
  ColaAtencion,
  EtiquetaChat,
  LineaDeCola,
  MiembroEquipo,
  RespuestaRapida,
  ResumenAtencion,
} from "../../../../../shared/services/messaging/messaging.models";
import { MAX_COLAS, paraGuardar } from "../../bandeja.colas";
import { ASESOR_SIN_ASIGNAR } from "../../bandeja.models";

/** Una fila de la tarjeta «Colas»: la cola con sus cifras del resumen. */
export interface FilaCola {
  id: string;
  nombre: string;
  activa: boolean;
  enHorario: boolean;
  enEspera: number;
  sinResponder: number;
  chats: number;
}

/**
 * Pestaña «Equipo» de la bandeja (solo quien coordina): tres cifras, la carga por asesor y, para el
 * administrador, los ajustes de atención. Solo presenta lo que le pasan y avisa lo que el usuario hace:
 * quien la aloja llama al servidor. No inventa datos: sin resumen muestra el estado de carga o de error.
 */
@Component({
  selector: "app-bandeja-equipo",
  templateUrl: "./bandeja-equipo.component.html",
  styleUrls: ["./bandeja-equipo.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaEquipoComponent implements OnChanges {
  @Input() resumen: ResumenAtencion | null = null;
  @Input() cargando = false;
  @Input() error = false;
  /** Solo el administrador cambia los ajustes. */
  @Input() esAdmin = false;
  @Input() guardando = false;
  @Input() guardadoOk = false;
  @Input() errorGuardar = false;

  // ─── Colas (D-727) ───
  /** Colas completas (quien coordina las recibe completas). */
  @Input() colas: ColaAtencion[] = [];
  /** Números y cuentas que el editor ofrece. */
  @Input() lineasCola: LineaDeCola[] = [];
  /** Personas del equipo para elegir asesores. Debe ser un campo estable, no un getter. */
  @Input() equipoCola: MiembroEquipo[] = [];
  @Input() guardandoColas = false;
  /** Pasa a true cuando el servidor guardó las colas: el editor se cierra. */
  @Input() colasGuardadoOk = false;
  /** Mensaje del servidor al fallar el guardado; vacío = el texto general. */
  @Input() errorColas = "";

  // ─── Catálogos de la fase E (D-728): campos estables de quien aloja; solo el administrador los edita ───
  @Input() motivosCierre: string[] = [];
  @Input() cierreAutoHoras = 0;
  @Input() etiquetasCat: EtiquetaChat[] = [];
  @Input() rapidos: RespuestaRapida[] = [];
  /** Tarjeta que está guardando ('motivos' | 'etiquetas' | 'rapidos'); vacío = ninguna. */
  @Input() guardandoCat = '';
  /** Tarjeta que guardó bien por última vez. */
  @Input() okCat = '';
  /** Tarjeta a la que pertenece el error 422 y su mensaje. */
  @Input() errorCatClave = '';
  @Input() errorCatMensaje = '';

  /** Correo del asesor, o `sin-asignar`: la bandeja filtra la lista y vuelve a Chats. */
  @Output() verAsesor = new EventEmitter<string>();
  @Output() reintentar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<AjustesAtencion>();
  /** Id de la cola: la bandeja filtra la lista por ella y vuelve a Chats. */
  @Output() verCola = new EventEmitter<string>();
  /** La lista completa de colas con el cambio ya hecho. */
  @Output() guardarColas = new EventEmitter<ColaAtencion[]>();
  /** Un pedazo de los catálogos con su tarjeta de origen. */
  @Output() guardarCatalogos = new EventEmitter<{ clave: string; parcial: Partial<CatalogosAtencion> }>();

  readonly minutosMax = 240;
  readonly sinAsignar = ASESOR_SIN_ASIGNAR;

  form: AjustesAtencion = { repartoAutomatico: false, minutosSinResponder: 10 };
  /** El usuario tocó el formulario: el refresco automático no le pisa lo escrito. */
  sucio = false;

  filasCola: FilaCola[] = [];
  /** Cola en edición: `null` cerrado, `{}` vacío para una nueva. */
  editando: ColaAtencion | null = null;
  abierto = false;
  /** Última lista que se mandó a guardar, para cerrar el editor solo si fue la de este editor. */
  private enviada = false;
  readonly maxColas = MAX_COLAS;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["colas"] || cambios["resumen"]) this.armarFilasCola();
    if (cambios["colasGuardadoOk"] && this.colasGuardadoOk && this.enviada) {
      this.enviada = false;
      this.cerrarEditor();
    }
    if (cambios["resumen"] && this.resumen?.ajustes && !this.sucio) {
      this.form = { ...this.resumen.ajustes };
    }
    // Guardó bien: el formulario vuelve a seguir al servidor.
    if (cambios["guardadoOk"] && this.guardadoOk) {
      this.sucio = false;
      if (this.resumen?.ajustes) this.form = { ...this.resumen.ajustes };
    }
  }

  get disponibles(): number {
    return (this.resumen?.porAsesor || []).filter((a) => a.estado !== "ausente").length;
  }

  get minutosValidos(): boolean {
    const m = this.form.minutosSinResponder;
    return typeof m === "number" && Number.isInteger(m) && m >= 0 && m <= this.minutosMax;
  }

  get puedeGuardar(): boolean {
    return this.sucio && this.minutosValidos && !this.guardando;
  }

  marcar(): void {
    this.sucio = true;
  }

  cambiarReparto(valor: boolean): void {
    this.form = { ...this.form, repartoAutomatico: !!valor };
    this.marcar();
  }

  cambiarMinutos(valor: unknown): void {
    const n = valor === "" || valor === null || valor === undefined ? NaN : Number(valor);
    this.form = { ...this.form, minutosSinResponder: n };
    this.marcar();
  }

  enviar(): void {
    if (!this.puedeGuardar) return;
    this.guardar.emit({ ...this.form });
  }

  get puedeCrearCola(): boolean {
    return this.esAdmin && this.colas.length < this.maxColas;
  }

  nuevaCola(): void {
    this.editando = null;
    this.enviada = false;
    this.abierto = true;
  }

  editarCola(id: string): void {
    this.editando = this.colas.find((c) => c.id === id) || null;
    this.enviada = false;
    this.abierto = !!this.editando;
  }

  cerrarEditor(): void {
    this.abierto = false;
    this.editando = null;
  }

  /** Reemplaza o suma la cola editada y manda la lista completa. */
  guardarCola(cola: ColaAtencion): void {
    const lista = this.colas.map(paraGuardar);
    const i = cola.id ? lista.findIndex((c) => c.id === cola.id) : -1;
    if (i >= 0) lista[i] = paraGuardar(cola);
    else lista.push(paraGuardar(cola));
    this.enviada = true;
    this.guardarColas.emit(lista);
  }

  guardarCat(clave: string, parcial: Partial<CatalogosAtencion>): void {
    this.guardarCatalogos.emit({ clave, parcial });
  }

  trackCola(_: number, f: FilaCola): string {
    return f.id;
  }

  /** Cada cola con sus cifras; una cola sin fila en el resumen cuenta cero. */
  private armarFilasCola(): void {
    const cifras = new Map((this.resumen?.porCola || []).map((c) => [c.id, c]));
    const filas: FilaCola[] = this.colas
      .filter((c) => !!c.id)
      .map((c) => {
        const r = cifras.get(c.id as string);
        cifras.delete(c.id as string);
        return {
          id: c.id as string,
          nombre: c.nombre,
          activa: c.activa,
          enHorario: r ? r.enHorario : c.enHorario !== false,
          enEspera: r?.enEspera || 0,
          sinResponder: r?.sinResponder || 0,
          chats: r?.chats || 0,
        };
      });
    // Colas que el resumen conoce y la lista aún no (entre dos refrescos).
    cifras.forEach((r) => filas.push({ ...r }));
    this.filasCola = filas;
  }

  trackAsesor(_: number, a: CargaAsesor): string {
    return a.email;
  }
}
