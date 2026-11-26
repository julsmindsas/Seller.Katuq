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
  ColaAtencion,
  FranjaCola,
  LineaDeCola,
  MiembroEquipo,
  RepartoCola,
} from "../../../../../shared/services/messaging/messaging.models";
import { MAX_MENSAJE_COLA, MAX_MENSAJE_FUERA, MAX_NOMBRE_COLA, normalizarCola } from "../../bandeja.colas";

/** Un día del horario listo para pintar. `n` es la clave del servidor: "0" domingo a "6" sábado. */
export interface DiaEditor {
  n: string;
  /** Clave de traducción del nombre del día. */
  clave: string;
  abierto: boolean;
  abre: string;
  cierra: string;
}

/** Una casilla de la lista de números y cuentas. */
export interface LineaEditor {
  id: string;
  nombre: string;
  canal: string;
  /** Nombre de otra cola activa que ya la tiene; vacío si está libre. */
  ocupadaPor: string;
}

/** De lunes a domingo (el servidor numera el domingo como 0). */
const ORDEN_DIAS = ["1", "2", "3", "4", "5", "6", "0"];
const NOMBRE_DIA: Record<string, string> = {
  "0": "sun", "1": "mon", "2": "tue", "3": "wed", "4": "thu", "5": "fri", "6": "sat",
};
const ABRE_POR_DEFECTO = "08:00";
const CIERRA_POR_DEFECTO = "18:00";

/**
 * Editor de una cola de atención (D-727). Solo presenta y valida lo que el usuario escribe; quien lo
 * aloja manda la lista completa al servidor. Los datos de entrada se copian al abrir: un refresco de la
 * bandeja no le pisa lo que se está escribiendo.
 */
@Component({
  selector: "app-bandeja-cola-editor",
  templateUrl: "./bandeja-cola-editor.component.html",
  styleUrls: ["./bandeja-cola-editor.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaColaEditorComponent implements OnChanges {
  /** La cola a editar; `null` = cola nueva. */
  @Input() cola: ColaAtencion | null = null;
  /** Todas las colas actuales (para saber qué números ya están en otra cola activa). */
  @Input() colas: ColaAtencion[] = [];
  /** Números y cuentas conectados que se pueden meter en una cola. */
  @Input() lineas: LineaDeCola[] = [];
  @Input() equipo: MiembroEquipo[] = [];
  @Input() guardando = false;
  /** Mensaje del servidor (por ejemplo, un 422); vacío si no hay. */
  @Input() errorServidor = "";

  @Output() guardar = new EventEmitter<ColaAtencion>();
  @Output() cancelar = new EventEmitter<void>();

  readonly maxNombre = MAX_NOMBRE_COLA;
  readonly maxMensaje = MAX_MENSAJE_FUERA;
  readonly maxMensajeCola = MAX_MENSAJE_COLA;

  m: ColaAtencion = normalizarCola({});
  dias: DiaEditor[] = [];
  opcionesLinea: LineaEditor[] = [];
  /** El usuario ya intentó guardar: desde entonces se muestran los errores. */
  intentado = false;

  ngOnChanges(cambios: SimpleChanges): void {
    // Solo al abrir otra cola: los refrescos de la bandeja cambian `colas` sin tocar lo escrito.
    if (cambios["cola"]) {
      this.m = normalizarCola(this.cola || {});
      this.m = { ...this.m, lineas: [...this.m.lineas], asesores: [...this.m.asesores] };
      this.dias = ORDEN_DIAS.map((n) => {
        const f = this.m.horario.dias[n];
        return {
          n,
          clave: NOMBRE_DIA[n],
          abierto: !!f,
          abre: f?.abre || ABRE_POR_DEFECTO,
          cierra: f?.cierra || CIERRA_POR_DEFECTO,
        };
      });
      this.intentado = false;
    }
    if (cambios["cola"] || cambios["colas"] || cambios["lineas"]) this.armarLineas();
  }

  get esNueva(): boolean {
    return !this.cola?.id;
  }

  get restantes(): number {
    return this.maxMensaje - (this.m.mensajeFuera || "").length;
  }

  // ─── Cambios del formulario ───

  cambiarNombre(v: string): void {
    this.m = { ...this.m, nombre: v || "" };
  }

  cambiarActiva(v: boolean): void {
    this.m = { ...this.m, activa: !!v };
  }

  cambiarReparto(v: RepartoCola): void {
    this.m = { ...this.m, reparto: v };
  }

  cambiarAsesores(emails: string[]): void {
    this.m = { ...this.m, asesores: [...(emails || [])] };
  }

  cambiarHorarioActivo(v: boolean): void {
    this.m = { ...this.m, horario: { ...this.m.horario, activo: !!v } };
  }

  cambiarMensaje(v: string): void {
    this.m = { ...this.m, mensajeFuera: (v || "").slice(0, this.maxMensaje) };
  }

  /** Fase E (D-728): bienvenida y mensaje al cerrar. */
  cambiarBienvenida(v: string): void {
    this.m = { ...this.m, mensajeBienvenida: (v || "").slice(0, this.maxMensajeCola) };
  }

  cambiarCierre(v: string): void {
    this.m = { ...this.m, mensajeCierre: (v || "").slice(0, this.maxMensajeCola) };
  }

  marcarLinea(id: string, marcada: boolean): void {
    const sin = this.m.lineas.filter((l) => l !== id);
    this.m = { ...this.m, lineas: marcada ? [...sin, id] : sin };
  }

  tieneLinea(id: string): boolean {
    return this.m.lineas.includes(id);
  }

  /** Una casilla se bloquea solo si esta cola está activa y otra cola activa ya tiene el número. */
  bloqueada(l: LineaEditor): boolean {
    return !!l.ocupadaPor && this.m.activa && !this.tieneLinea(l.id);
  }

  cambiarDia(d: DiaEditor, campo: "abierto" | "abre" | "cierra", valor: unknown): void {
    this.dias = this.dias.map((x) =>
      x.n === d.n ? { ...x, [campo]: campo === "abierto" ? !!valor : String(valor || "") } : x,
    );
  }

  trackDia(_: number, d: DiaEditor): string {
    return d.n;
  }

  trackLinea(_: number, l: LineaEditor): string {
    return l.id;
  }

  // ─── Validación ───

  /** Errores en palabras sencillas (claves de traducción); vacío = se puede guardar. */
  get errores(): string[] {
    const e: string[] = [];
    const nombre = (this.m.nombre || "").trim();
    if (!nombre) e.push("notificaciones.bandeja.colas.err.nombre");
    else if (nombre.length > this.maxNombre) e.push("notificaciones.bandeja.colas.err.nombreLargo");
    else if (
      (this.colas || []).some((c) => c.id !== this.cola?.id && (c.nombre || "").trim().toLowerCase() === nombre.toLowerCase())
    ) {
      e.push("notificaciones.bandeja.colas.err.nombreRepetido");
    }
    if (this.m.activa && this.m.lineas.some((id) => this.ocupante(id))) {
      e.push("notificaciones.bandeja.colas.err.lineaOcupada");
    }
    if (this.m.horario.activo) {
      const abiertos = this.dias.filter((d) => d.abierto);
      if (!abiertos.length) e.push("notificaciones.bandeja.colas.err.sinDias");
      else if (abiertos.some((d) => !d.abre || !d.cierra)) e.push("notificaciones.bandeja.colas.err.horaVacia");
      else if (abiertos.some((d) => d.cierra <= d.abre)) e.push("notificaciones.bandeja.colas.err.horaOrden");
    }
    if ((this.m.mensajeFuera || "").length > this.maxMensaje) e.push("notificaciones.bandeja.colas.err.mensajeLargo");
    if ((this.m.mensajeBienvenida || "").length > this.maxMensajeCola || (this.m.mensajeCierre || "").length > this.maxMensajeCola) {
      e.push("notificaciones.bandeja.colas.err.mensajeLargo");
    }
    return e;
  }

  enviar(): void {
    this.intentado = true;
    if (this.errores.length || this.guardando) return;
    const dias: Record<string, FranjaCola | null> = {};
    for (const n of ORDEN_DIAS) dias[n] = null;
    for (const d of this.dias) {
      if (!d.abierto) continue;
      // Con el horario apagado los días no se validan ni se ven: solo viajan las franjas completas y en orden,
      // para que el servidor no rechace horas a medias que la persona no puede corregir.
      if (!this.m.horario.activo && (!d.abre || !d.cierra || d.cierra <= d.abre)) continue;
      dias[d.n] = { abre: d.abre, cierra: d.cierra };
    }
    this.guardar.emit({
      ...this.m,
      nombre: this.m.nombre.trim(),
      mensajeFuera: (this.m.mensajeFuera || "").trim(),
      mensajeBienvenida: (this.m.mensajeBienvenida || "").trim(),
      mensajeCierre: (this.m.mensajeCierre || "").trim(),
      horario: { activo: this.m.horario.activo, dias },
    });
  }

  // ─── Privado ───

  /** Nombre de la otra cola activa que ya tiene este número o cuenta, o vacío. */
  private ocupante(lineaId: string): string {
    const otra = (this.colas || []).find(
      (c) => c.activa && c.id !== this.cola?.id && (c.lineas || []).includes(lineaId),
    );
    return otra ? otra.nombre : "";
  }

  /** Opciones conectadas, más las que la cola ya tiene aunque ya no estén conectadas (para no perderlas en silencio). */
  private armarLineas(): void {
    const vistas = new Set<string>();
    const lista: LineaEditor[] = [];
    for (const l of this.lineas || []) {
      vistas.add(l.id);
      lista.push({ id: l.id, nombre: l.nombre || l.id, canal: l.canal, ocupadaPor: this.ocupante(l.id) });
    }
    for (const id of this.m.lineas) {
      if (vistas.has(id)) continue;
      lista.push({ id, nombre: id, canal: "", ocupadaPor: this.ocupante(id) });
    }
    this.opcionesLinea = lista;
  }
}
