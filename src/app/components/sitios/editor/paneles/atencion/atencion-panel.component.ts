import { Component } from "@angular/core";
import { PanelSitioBase } from "../panel-sitio-base";
import { AtencionTienda, DIAS_SEMANA, HorarioAtencion, enLineaAhora, horarioValido, textoHorario } from "../barras/barras-datos";

/**
 * Tienda › Atención (PLAN-V2 T06, P30): el horario y el tiempo de respuesta reales del WhatsApp de la tienda. Los usa el
 * botón «Asesor» del encabezado del diseño nuevo: con horario dice «En línea» (hora de Colombia) y fuera de él muestra
 * el texto de «Fuera de horario». Sin horario no dice «En línea».
 *
 * Guarda `contenido.tienda.atencion = { horario, tiempoRespuesta, fueraDeHorario }`. Para borrarla deja `null` (el
 * servidor conserva una clave que el editor no manda). El número sale del bloque WhatsApp de la página o, sin él, del
 * celular de la empresa: este panel no lo pide.
 */
@Component({
  selector: "app-panel-atencion",
  templateUrl: "./atencion-panel.component.html",
  styleUrls: ["./atencion-panel.component.scss"],
})
export class AtencionPanelComponent extends PanelSitioBase {
  readonly dias = DIAS_SEMANA;

  get atencion(): AtencionTienda {
    const t: any = this.contenido && this.contenido.tienda;
    return (t && t.atencion) || {};
  }

  get horario(): HorarioAtencion | null {
    const h = this.atencion.horario;
    return h && h.activo ? h : null;
  }

  get horarioMalo(): boolean {
    return !!this.horario && !horarioValido(this.horario);
  }

  /** El bloque WhatsApp de la página (de ahí sale el número del asesor). */
  get bloqueWhatsapp(): any {
    const bloques: any[] = (this.contenido && this.contenido.bloques) || [];
    return bloques.find((b) => b && b.tipo === "whatsapp" && b.visible !== false && b.datos && b.datos.telefono) || null;
  }

  /** El horario del bloque WhatsApp, si tiene uno encendido. */
  get horarioDelBloque(): HorarioAtencion | null {
    const b = this.bloqueWhatsapp;
    const h = b && b.datos && b.datos.horario;
    return h && h.activo ? h : null;
  }

  /** El número y el horario existen en dos lugares: si difieren, se avisa (PLAN-V2 T06, riesgos). */
  get horariosDistintos(): boolean {
    const a = this.horario, b = this.horarioDelBloque;
    if (!a || !b) return false;
    const dias = (h: HorarioAtencion) => (h.dias || []).slice().sort((x, y) => x - y).join(",");
    return dias(a) !== dias(b) || a.desde !== b.desde || a.hasta !== b.hasta;
  }

  /** ¿El encabezado tiene encendido el botón del asesor? */
  get asesorEncendido(): boolean {
    const bloques: any[] = (this.contenido && this.contenido.bloques) || [];
    return bloques.some((b) => b && b.tipo === "encabezado" && b.datos && b.datos.asesor === "enlace");
  }

  get textoDelHorario(): string {
    return textoHorario(this.horario);
  }

  /** Lo que diría el botón ahora mismo (hora de Colombia). */
  get enLinea(): boolean {
    return enLineaAhora(this.horario);
  }

  get estadoAhora(): string {
    if (!this.horario) return this.atencion.tiempoRespuesta || "Sin horario: el botón no dice «En línea».";
    if (this.enLinea) return `En línea${this.atencion.tiempoRespuesta ? ` · ${this.atencion.tiempoRespuesta}` : ""}`;
    return this.atencion.fueraDeHorario || `Fuera de horario. Atendemos ${this.textoDelHorario}`;
  }

  /** Color del punto en la muestra: el principal del sitio, como en la página publicada. */
  get colorPunto(): string {
    const t: any = this.contenido && this.contenido.tema;
    return this.enLinea ? (t && t.colorPrimario) || "#5f3fe0" : "#9793ac";
  }

  alternarHorario(): void {
    if (this.horario) {
      this.guardar({ ...this.atencion, horario: null });
      return;
    }
    const base = this.horarioDelBloque;
    this.guardar({
      ...this.atencion,
      horario: { activo: true, dias: base ? base.dias.slice() : [1, 2, 3, 4, 5], desde: base ? base.desde : "08:00", hasta: base ? base.hasta : "18:00" },
    });
  }

  alternarDia(dia: number): void {
    const h = this.horario;
    if (!h) return;
    const dias = h.dias.includes(dia) ? h.dias.filter((x) => x !== dia) : [...h.dias, dia];
    this.guardar({ ...this.atencion, horario: { ...h, dias } });
  }

  cambiarHora(campo: "desde" | "hasta", valor: string): void {
    const h = this.horario;
    if (!h) return;
    this.guardar({ ...this.atencion, horario: { ...h, [campo]: valor } });
  }

  cambiarTexto(campo: "tiempoRespuesta" | "fueraDeHorario", valor: string): void {
    this.guardar({ ...this.atencion, [campo]: valor });
  }

  usarHorarioDelBloque(): void {
    const b = this.horarioDelBloque;
    if (!b) return;
    this.guardar({ ...this.atencion, horario: { activo: true, dias: b.dias.slice(), desde: b.desde, hasta: b.hasta } });
  }

  /** Escribe en su lugar; si todo quedó vacío, deja `null` para que el servidor la borre. */
  private guardar(a: AtencionTienda): void {
    const t: any = this.contenido && this.contenido.tienda;
    if (!t) return;
    const vacia = !a.horario && !String(a.tiempoRespuesta || "").trim() && !String(a.fueraDeHorario || "").trim();
    t.atencion = vacia ? null : a;
    this.avisar();
  }
}
