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
  ResumenAtencion,
} from "../../../../../shared/services/messaging/messaging.models";
import { ASESOR_SIN_ASIGNAR } from "../../bandeja.models";

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

  /** Correo del asesor, o `sin-asignar`: la bandeja filtra la lista y vuelve a Chats. */
  @Output() verAsesor = new EventEmitter<string>();
  @Output() reintentar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<AjustesAtencion>();

  readonly minutosMax = 240;
  readonly sinAsignar = ASESOR_SIN_ASIGNAR;

  form: AjustesAtencion = { repartoAutomatico: false, minutosSinResponder: 10 };
  /** El usuario tocó el formulario: el refresco automático no le pisa lo escrito. */
  sucio = false;

  ngOnChanges(cambios: SimpleChanges): void {
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

  trackAsesor(_: number, a: CargaAsesor): string {
    return a.email;
  }
}
