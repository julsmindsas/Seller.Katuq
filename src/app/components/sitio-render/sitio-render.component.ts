import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";

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
  /** Fuente heredada. Sigue siendo el valor por defecto de las dos de abajo. */
  tipografia: string;
  fuenteTitulo?: string;
  fuenteCuerpo?: string;
  /** Estilo de página completo: clasico | editorial | boutique | minimal | audaz. */
  estilo?: string;
  animaciones?: boolean;
}

/**
 * ⚠️ ESPEJO DE `functions/utils/siteHtml.js` (repo katuq_admin_back_firebase).
 *
 * La página que ve el cliente NO la dibuja este componente: la arma el backend
 * como HTML plano. Este render es la vista previa del editor. Si las dos tablas
 * se desfasan, la previa le miente al comerciante sobre lo que va a publicar,
 * y eso no falla en ninguna parte: simplemente ve una cosa y publica otra.
 *
 * Al tocar aquí, tocar allá — y al revés. Los ids los valida el backend en
 * `siteBlocks.normalizarTema`; uno que no exista allá se descarta al guardar.
 */
const FAMILIAS: { [id: string]: string } = {
  sistema: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Inter, "Helvetica Neue", Arial, sans-serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  playfair: '"Playfair Display", Georgia, serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  fraunces: '"Fraunces", Georgia, serif',
  dmserif: '"DM Serif Display", Georgia, serif',
  syne: '"Syne", system-ui, sans-serif',
  outfit: '"Outfit", system-ui, sans-serif',
  sora: '"Sora", system-ui, sans-serif',
  jakarta: '"Plus Jakarta Sans", system-ui, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
};

/** Espejo de `ESTILOS` en siteHtml.js. Mismos valores, mismas claves. */
const ESTILOS: { [id: string]: { [variable: string]: string } } = {
  clasico: {
    "--sitio-radio": "12px",
    "--sitio-radio-sm": "8px",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.08)",
    "--sitio-aire": "2.5rem",
    "--sitio-aire-ancho": "3.5rem",
    "--sitio-titulo-peso": "700",
    "--sitio-titulo-track": "0",
    "--sitio-titulo-escala": "1",
    "--sitio-titulo-altura": "1.15",
    "--sitio-etiqueta-caja": "none",
    "--sitio-etiqueta-track": "0",
    "--sitio-ancho": "1100px",
  },
  editorial: {
    "--sitio-radio": "0",
    "--sitio-radio-sm": "0",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.12)",
    "--sitio-aire": "3.5rem",
    "--sitio-aire-ancho": "5.5rem",
    "--sitio-titulo-peso": "400",
    "--sitio-titulo-track": "-.01em",
    "--sitio-titulo-escala": "1.15",
    "--sitio-titulo-altura": "1.1",
    "--sitio-etiqueta-caja": "uppercase",
    "--sitio-etiqueta-track": ".12em",
    "--sitio-ancho": "1040px",
  },
  boutique: {
    "--sitio-radio": "0",
    "--sitio-radio-sm": "0",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.14)",
    "--sitio-aire": "4rem",
    "--sitio-aire-ancho": "6.5rem",
    "--sitio-titulo-peso": "300",
    "--sitio-titulo-track": ".01em",
    "--sitio-titulo-escala": "1.2",
    "--sitio-titulo-altura": "1.18",
    "--sitio-etiqueta-caja": "uppercase",
    "--sitio-etiqueta-track": ".2em",
    "--sitio-ancho": "980px",
  },
  minimal: {
    "--sitio-radio": "4px",
    "--sitio-radio-sm": "3px",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.1)",
    "--sitio-aire": "3rem",
    "--sitio-aire-ancho": "4.5rem",
    "--sitio-titulo-peso": "600",
    "--sitio-titulo-track": "-.02em",
    "--sitio-titulo-escala": "1",
    "--sitio-titulo-altura": "1.12",
    "--sitio-etiqueta-caja": "none",
    "--sitio-etiqueta-track": ".01em",
    "--sitio-ancho": "960px",
  },
  audaz: {
    "--sitio-radio": "22px",
    "--sitio-radio-sm": "14px",
    "--sitio-sombra": "0 10px 30px -12px rgba(0,0,0,.28)",
    "--sitio-borde": "rgba(0,0,0,.06)",
    "--sitio-aire": "3rem",
    "--sitio-aire-ancho": "4rem",
    "--sitio-titulo-peso": "800",
    "--sitio-titulo-track": "-.03em",
    "--sitio-titulo-escala": "1.2",
    "--sitio-titulo-altura": "1.05",
    "--sitio-etiqueta-caja": "none",
    "--sitio-etiqueta-track": "0",
    "--sitio-ancho": "1140px",
  },
};

export interface DatosLead {
  nombre: string;
  telefono?: string;
  email?: string;
  mensaje?: string;
}

/**
 * Dibuja los bloques de un sitio.
 *
 * ⚠️ Esto NO es lo que ve el cliente. La página publicada la arma el backend
 * como HTML plano (`functions/utils/siteHtml.js`), sin Angular: se sirve desde
 * el subdominio del comercio y tiene que abrir rápido en un celular con mala
 * señal. Este componente es la vista previa del editor y el render de la ruta
 * interna, y su trabajo es parecerse todo lo posible a aquel.
 *
 * O sea que sí hay dos implementaciones, a propósito, y hay que moverlas
 * juntas: si se desfasan, el comerciante ve una página y publica otra, sin que
 * nada falle en ninguna parte. Las tablas de fuentes y estilos de arriba son el
 * espejo de las de allá.
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
export class SitioRenderComponent implements OnChanges {
  @Input() bloques: BloqueSitio[] = [];
  @Input() tema: TemaSitio | null = null;

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios["tema"] || !this.tema) return;
    // Se piden las dos por separado: un tema puede tener serif de titular y
    // sans de cuerpo, y cada una es una descarga distinta.
    this.cargarFuente(this.tema.fuenteTitulo || this.tema.tipografia);
    this.cargarFuente(this.tema.fuenteCuerpo || this.tema.tipografia);
  }

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
    const t = this.tema || ({} as TemaSitio);
    const base = t.tipografia || "sistema";
    return {
      ...(ESTILOS[t.estilo || "clasico"] || ESTILOS.clasico),
      "--sitio-primario": t.colorPrimario || "#111111",
      "--sitio-secundario": t.colorSecundario || "#ffffff",
      "--sitio-texto": t.colorTexto || "#222222",
      "--sitio-fuente": this.familiaTipografica(t.fuenteCuerpo || base),
      "--sitio-fuente-titulo": this.familiaTipografica(t.fuenteTitulo || base),
    };
  }

  private familiaTipografica(clave: string): string {
    return FAMILIAS[clave] || FAMILIAS.sistema;
  }

  /**
   * Las fuentes de Google que necesita la previa, para inyectar el <link> una
   * sola vez. La página publicada las pide en su propio <head>; aquí hay que
   * meterlas en el index del panel o la previa se vería con la letra del
   * sistema y el comerciante creería que su elección no funcionó.
   */
  private static readonly DESCARGABLES: { [id: string]: string } = {
    playfair: "Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400",
    cormorant: "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300",
    fraunces: "Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300",
    dmserif: "DM+Serif+Display:ital@0;1",
    syne: "Syne:wght@400;600;700;800",
    outfit: "Outfit:wght@300;400;500;600;700",
    sora: "Sora:wght@300;400;500;600;700",
    jakarta: "Plus+Jakarta+Sans:wght@300;400;500;600;700;800",
    inter: "Inter:wght@300;400;500;600;700",
  };

  /** Ids ya pedidos, para no repetir el <link> en cada cambio del tema. */
  private static readonly yaCargadas = new Set<string>();

  private cargarFuente(id: string): void {
    const spec = SitioRenderComponent.DESCARGABLES[id];
    if (!spec || SitioRenderComponent.yaCargadas.has(id)) return;
    SitioRenderComponent.yaCargadas.add(id);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
    document.head.appendChild(link);
  }

  /** Alto del velo de la portada, en la misma escala que el backend (0–85%). */
  opacidadVelo(datos: any): number {
    if (!datos || !datos.imagen) return 0;
    const v = datos.velo === undefined || datos.velo === null ? 45 : Number(datos.velo);
    if (!isFinite(v)) return 0;
    return Math.min(85, Math.max(0, v)) / 100;
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
