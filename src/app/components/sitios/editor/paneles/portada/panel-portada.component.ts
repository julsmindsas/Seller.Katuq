import { Component } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { SitiosService } from "../../../sitios.service";
import { ICONOS_SITIO, TRAZOS_ICONO_SITIO } from "../../../iconos-sitio";
import { PanelSitioBase } from "../registro";

/** Un espacio de la portada, como lo guarda el servidor (`utils/sitioModulos/portada.js`). */
interface EspacioPortada {
  id?: string;
  imagen?: string;
  imagenMovil?: string;
  alt?: string;
  titulo?: string;
  texto?: string;
  enlaceTexto?: string;
  url?: string;
  plano?: string;
  icono?: string;
}

/** Un paso de «Cómo funciona» o un sello con ícono. */
interface SelloPortada {
  titulo?: string;
  texto?: string;
  icono?: string;
}

/** Un espacio de un plano de la página, para elegir a cuál lleva la tarjeta (`plano: "<ancla>:<espacioId>"`). */
interface DestinoPlano {
  valor: string;
  etiqueta: string;
}

/**
 * Panel de la portada «Espacios» del diseño nuevo (PLAN-V2 T07). Va debajo de los campos de siempre de la portada
 * (título, subtítulo y botón), solo con el diseño nuevo encendido: con el de siempre, nada de esto se ve en la página.
 *
 * Edita en su lugar `bloque.datos`: `composicion`, `antetitulo`, `resaltado`, `cta2Texto`, `cta2Url`, `sellosForma`,
 * `sellos` y `espacios`. El servidor los normaliza al guardar (topes, íconos y destinos); aquí se ayuda y se avisa.
 * Las fotos se suben con el mismo servicio del editor y se avisa si se quedan cortas para la tarjeta (460 px de alto en
 * computador). Nunca toca los productos ni la tienda.
 */
@Component({
  selector: "app-panel-portada",
  templateUrl: "./panel-portada.component.html",
  styleUrls: ["./panel-portada.component.scss"],
})
export class PanelPortadaComponent extends PanelSitioBase {
  static readonly MAX_ESPACIOS = 3;
  static readonly MAX_SELLOS = 4;
  /** La tarjeta mide hasta 460 px de alto y unos 240 de ancho: a doble densidad, una foto de 900×600 o más. */
  static readonly FOTO_ALTO_MINIMO = 900;
  static readonly FOTO_ANCHO_MINIMO = 600;

  readonly iconos = ICONOS_SITIO;
  readonly maxEspacios = PanelPortadaComponent.MAX_ESPACIOS;
  readonly maxSellos = PanelPortadaComponent.MAX_SELLOS;

  /** Índice del espacio cuya foto se está subiendo (-1 = ninguna). */
  subiendo = -1;
  /** Aviso de tamaño por espacio (se borra al subir otra foto). */
  avisoFoto: { [indice: number]: string } = {};

  constructor(private service: SitiosService, private toastr: ToastrService) {
    super();
  }

  get datos(): any {
    if (!this.bloque) return {};
    if (!this.bloque.datos) this.bloque.datos = {};
    return this.bloque.datos;
  }

  get conEspacios(): boolean {
    return this.datos.composicion === "espacios";
  }

  get espacios(): EspacioPortada[] {
    return Array.isArray(this.datos.espacios) ? this.datos.espacios : [];
  }

  get sellos(): SelloPortada[] {
    return Array.isArray(this.datos.sellos) ? this.datos.sellos : [];
  }

  // ── Composición ───────────────────────────────────────────────────────────

  elegirComposicion(valor: "" | "espacios"): void {
    this.datos.composicion = valor;
    // La primera vez que se elige, nacen los tres pasos del artboard: son instrucciones de la tienda, no promesas.
    if (valor === "espacios" && !this.sellos.length && !this.datos.sellosForma) {
      this.datos.sellosForma = "pasos";
      this.datos.sellos = [{ titulo: "Eliges tu espacio" }, { titulo: "Ves qué va y dónde" }, { titulo: "Agregas el kit" }];
    }
    this.avisar();
  }

  /** Cualquier campo del panel cambió: lo mismo que un campo del editor (marca, refresca y guarda). */
  cambiar(): void {
    this.avisar();
  }

  /** La palabra resaltada tiene que estar dentro del título o el servidor la vacía. */
  get resaltadoHuerfano(): boolean {
    const r = String(this.datos.resaltado || "").trim();
    return !!r && !String(this.datos.titulo || "").includes(r);
  }

  /** El botón principal va a una sección de esta página (#ancla): si no está, la página muestra «Ver productos». */
  get ctaAAncla(): boolean {
    return /^#[\w-]{1,60}$/.test(String(this.datos.ctaUrl || "").trim());
  }

  // ── Espacios ──────────────────────────────────────────────────────────────

  agregarEspacio(): void {
    if (this.espacios.length >= this.maxEspacios) return;
    this.datos.espacios = [...this.espacios, { id: this.idNuevo(), titulo: "", texto: "", alt: "" }];
    this.avisar();
  }

  quitarEspacio(i: number): void {
    const lista = [...this.espacios];
    lista.splice(i, 1);
    this.datos.espacios = lista;
    this.avisoFoto = {};
    this.avisar();
  }

  moverEspacio(i: number, paso: -1 | 1): void {
    const j = i + paso;
    const lista = [...this.espacios];
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.datos.espacios = lista;
    this.avisoFoto = {};
    this.avisar();
  }

  /** Un id corto y único dentro de la portada (el plano lo usa para abrir ese espacio). */
  private idNuevo(): string {
    const usados = new Set(this.espacios.map((e) => e.id));
    for (let k = this.espacios.length + 1; k < 50; k++) {
      const id = `espacio-${k}`;
      if (!usados.has(id)) return id;
    }
    return `espacio-${Date.now() % 1000}`;
  }

  subirFoto(evento: Event, i: number, campo: "imagen" | "imagenMovil"): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    this.subiendo = i;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = -1;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        const espacio = this.espacios[i];
        if (!espacio) return;
        espacio[campo] = res.url;
        this.avisoFoto[i] = campo === "imagen" ? this.avisoDeTamano(Number(res.ancho), Number(res.alto)) : "";
        this.avisar();
      },
      error: () => {
        this.subiendo = -1;
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  /** Qué decir si la foto se queda corta para la tarjeta. "" si sirve o si el servidor no mandó las medidas. */
  avisoDeTamano(ancho: number, alto: number): string {
    if (!(ancho > 0) || !(alto > 0)) return "";
    if (alto >= PanelPortadaComponent.FOTO_ALTO_MINIMO && ancho >= PanelPortadaComponent.FOTO_ANCHO_MINIMO) return "";
    return `Esta foto mide ${ancho}×${alto} px. La tarjeta mide hasta 460 px de alto en computador: usa una vertical de al menos ${PanelPortadaComponent.FOTO_ANCHO_MINIMO}×${PanelPortadaComponent.FOTO_ALTO_MINIMO} px para que no se vea borrosa.`;
  }

  quitarFoto(i: number, campo: "imagen" | "imagenMovil"): void {
    const espacio = this.espacios[i];
    if (!espacio) return;
    espacio[campo] = "";
    if (campo === "imagen") this.avisoFoto[i] = "";
    this.avisar();
  }

  /** Avisos de un espacio, en el orden en que el comercio los resuelve. */
  avisosDe(e: EspacioPortada): string[] {
    const avisos: string[] = [];
    if (!String(e.titulo || "").trim()) avisos.push("Ponle un nombre: sin nombre, el espacio no sale en la página.");
    if (e.imagen && !String(e.alt || "").trim()) avisos.push("Describe la foto en una frase: sin la descripción no se puede publicar.");
    if (!String(e.url || "").trim() && !String(e.plano || "").trim()) avisos.push("Elige a dónde lleva: sin destino, la tarjeta no se puede tocar.");
    else if (!String(e.url || "").trim()) avisos.push("Solo lleva al plano: si el plano está oculto, la tarjeta no lleva a ninguna parte. Ponle también un destino.");
    return avisos;
  }

  /** Si algún espacio no tiene foto, todos salen en filas con ícono. */
  get todosConFoto(): boolean {
    return this.espacios.length > 0 && this.espacios.every((e) => !!e.imagen);
  }

  /** Los espacios de los planos de la página que tienen ancla propia (el plano llega con PLAN-V2 T11). */
  get destinosDePlano(): DestinoPlano[] {
    const salida: DestinoPlano[] = [];
    const bloques = (this.contenido && this.contenido.bloques) || [];
    for (const b of bloques) {
      const ancla = String(((b as any).estilo || {}).ancla || "");
      if (b.tipo !== "plano" || !ancla) continue;
      const espacios = Array.isArray(b.datos && b.datos.espacios) ? b.datos.espacios : [];
      for (const e of espacios) {
        if (e && e.id) salida.push({ valor: `${ancla}:${e.id}`, etiqueta: `${(b.datos && b.datos.titulo) || "Plano"} · ${e.nombre || e.id}` });
      }
    }
    return salida;
  }

  trazoIcono(nombre: string | undefined): string {
    return (nombre && TRAZOS_ICONO_SITIO[nombre]) || "";
  }

  // ── Sellos («Cómo funciona») ──────────────────────────────────────────────

  elegirFormaSellos(forma: "" | "pasos"): void {
    this.datos.sellosForma = forma;
    this.avisar();
  }

  agregarSello(): void {
    if (this.sellos.length >= this.maxSellos) return;
    this.datos.sellos = [...this.sellos, { titulo: "", texto: "" }];
    this.avisar();
  }

  quitarSello(i: number): void {
    const lista = [...this.sellos];
    lista.splice(i, 1);
    this.datos.sellos = lista;
    this.avisar();
  }

  porIndice(i: number): number {
    return i;
  }
}
