import { Component, EventEmitter, Input, Output } from "@angular/core";

/** Un bloque tal como lo entrega el backend: tipo + datos ya saneados. */
export interface BloqueSitio {
  id: string;
  tipo: string;
  visible?: boolean;
  datos: any;
}

export interface TemaSitio {
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  tipografia: string;
}

export interface DatosLead {
  nombre: string;
  telefono?: string;
  email?: string;
  mensaje?: string;
}

/**
 * Dibuja los bloques de un sitio.
 *
 * Lo usan la página pública y la vista previa del editor: si el render viviera
 * dos veces, el comerciante editaría una página distinta de la que publica.
 *
 * No hace peticiones. Emite lo que el visitante hace (`lead`, `clic`) y el
 * componente padre decide: la página pública lo manda al backend, el editor lo
 * ignora.
 */
@Component({
  selector: "app-sitio-render",
  templateUrl: "./sitio-render.component.html",
  styleUrls: ["./sitio-render.component.scss"],
})
export class SitioRenderComponent {
  @Input() bloques: BloqueSitio[] = [];
  @Input() tema: TemaSitio | null = null;

  /** En vista previa los formularios y enlaces no hacen nada. */
  @Input() previsualizacion = false;
  /** Ancho simulado en la vista previa del editor. */
  @Input() dispositivo: "escritorio" | "movil" = "escritorio";

  /** Estado del envío del lead, gobernado por el padre. */
  @Input() enviandoLead = false;
  @Input() errorLead: string | null = null;
  @Input() leadEnviado = false;

  /** Id del bloque resaltado (el que se está editando). */
  @Input() bloqueActivo: string | null = null;

  @Output() lead = new EventEmitter<DatosLead>();
  @Output() clic = new EventEmitter<{ destino: string; bloqueId: string }>();
  @Output() bloqueSeleccionado = new EventEmitter<string>();

  nombre = "";
  telefono = "";
  email = "";
  mensaje = "";

  get estiloTema(): { [clave: string]: string } {
    const t = this.tema;
    return {
      "--sitio-primario": (t && t.colorPrimario) || "#111111",
      "--sitio-secundario": (t && t.colorSecundario) || "#ffffff",
      "--sitio-texto": (t && t.colorTexto) || "#222222",
      "--sitio-fuente": this.familiaTipografica((t && t.tipografia) || "sistema"),
    };
  }

  private familiaTipografica(clave: string): string {
    switch (clave) {
      case "serif":
        return 'Georgia, "Times New Roman", serif';
      case "mono":
        return "ui-monospace, SFMono-Regular, Menlo, monospace";
      case "sans":
        return 'Inter, "Helvetica Neue", Arial, sans-serif';
      default:
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  }

  get bloquesVisibles(): BloqueSitio[] {
    // En el editor se muestran también los ocultos, atenuados, para poder
    // volver a encenderlos; el público solo ve los visibles.
    if (this.previsualizacion) return this.bloques || [];
    return (this.bloques || []).filter((b) => b.visible !== false);
  }

  enlaceWhatsapp(datos: any): string {
    const telefono = (datos && datos.telefono) || "";
    const texto = encodeURIComponent((datos && datos.mensaje) || "");
    return `https://wa.me/${telefono}${texto ? `?text=${texto}` : ""}`;
  }

  precio(valor: number): string {
    return (valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  }

  alineacion(valor: string): string {
    if (valor === "izquierda") return "left";
    if (valor === "derecha") return "right";
    return "center";
  }

  registrarClic(destino: string, bloqueId: string, evento?: Event): void {
    if (this.previsualizacion) {
      // En el editor un enlace no debe sacar al comerciante de la pantalla.
      if (evento) evento.preventDefault();
      this.bloqueSeleccionado.emit(bloqueId);
      return;
    }
    this.clic.emit({ destino, bloqueId });
  }

  seleccionar(bloqueId: string): void {
    if (this.previsualizacion) this.bloqueSeleccionado.emit(bloqueId);
  }

  enviarLead(): void {
    if (this.previsualizacion || this.enviandoLead) return;
    this.lead.emit({
      nombre: this.nombre.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim(),
      mensaje: this.mensaje.trim(),
    });
  }

  /** El padre llama a esto tras un envío exitoso. */
  limpiarFormulario(): void {
    this.nombre = this.telefono = this.email = this.mensaje = "";
  }
}
