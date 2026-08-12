import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { PlantillaSitio, Sitio, SitiosService } from "../sitios.service";
import { environment } from "../../../../environments/environment";

/** Nombre humano de cada tipo de bloque, para los chips de la plantilla. */
const NOMBRE_BLOQUE: { [tipo: string]: string } = {
  hero: "Portada",
  texto: "Sobre tu negocio",
  galeria: "Galería",
  productos: "Productos",
  whatsapp: "WhatsApp",
  formulario: "Formulario",
  faq: "Preguntas",
  footer: "Pie",
};

/**
 * Listado de sitios del comercio y creación de uno nuevo.
 *
 * Crear tiene dos caminos, y los dos terminan en el mismo editor:
 *  - elegir una plantilla del sector y empezar a editar;
 *  - pedirle a Katuq una primera propuesta, que rellena los textos con la
 *    marca del negocio. Si la IA no responde, igual queda la plantilla.
 */
@Component({
  selector: "app-sitios-lista",
  templateUrl: "./sitios-lista.component.html",
  styleUrls: ["./sitios-lista.component.scss"],
})
export class SitiosListaComponent implements OnInit {
  cargando = true;
  sitios: Sitio[] = [];

  /**
   * Para mostrar la dirección completa en cada tarjeta. El valor por defecto
   * no sobra: los environments están en .gitignore, así que una copia del repo
   * compilada en otra máquina no lo trae y la tarjeta diría "mi-tienda.undefined".
   */
  dominioSitios = environment.dominioSitios || "katuq.com";

  /** Id del sitio cuyo enlace se acaba de copiar, para el "¡Copiado!". */
  copiadoId = "";
  private tempCopiado: any = null;

  // Asistente de creación
  mostrandoAsistente = false;
  paso: "plantilla" | "datos" = "plantilla";
  plantillas: PlantillaSitio[] = [];
  cargandoPlantillas = false;
  plantillaElegida: PlantillaSitio | null = null;

  /** Filtro de sector del selector de plantillas. "" = todas. */
  sectorFiltro = "";

  nombre = "";
  objetivo = "";
  usarIA = true;
  creando = false;

  constructor(
    private service: SitiosService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.listar().subscribe({
      next: (res) => {
        this.cargando = false;
        this.sitios = (res && res.data) || [];
      },
      error: () => {
        this.cargando = false;
        this.toastr.error("No pudimos cargar tus páginas.");
      },
    });
  }

  /**
   * URL pública del sitio: cada página vive en su propio subdominio
   * (`flores-maria.katuq.com`). Dejó de colgar del panel a propósito — el link
   * se comparte por WhatsApp y antes decía "sellercenter", que es el nombre
   * interno de la herramienta de vendedores.
   */
  enlacePublico(sitio: Sitio): string {
    return `https://${sitio.slug}.${this.dominioSitios}`;
  }

  copiarEnlace(sitio: Sitio): void {
    const url = this.enlacePublico(sitio);
    navigator.clipboard.writeText(url).then(
      () => {
        // El botón se vuelve verde un momento; es más claro que un toast que
        // tapa la tarjeta desde la esquina.
        this.copiadoId = sitio.id;
        clearTimeout(this.tempCopiado);
        this.tempCopiado = setTimeout(() => (this.copiadoId = ""), 1800);
      },
      () => this.toastr.info(url, "Copia el enlace")
    );
  }

  abrir(sitio: Sitio): void {
    this.router.navigate(["/sitios/editor", sitio.id]);
  }

  verPublicado(sitio: Sitio): void {
    window.open(this.enlacePublico(sitio), "_blank");
  }

  // ── Miniatura de la tarjeta ────────────────────────────────────────────────

  /**
   * El contenido que se muestra en la miniatura: lo publicado si existe, si no
   * el borrador. Así la tarjeta enseña lo que el cliente está viendo hoy.
   */
  private contenidoDe(sitio: Sitio): any {
    return (sitio && (sitio.published || sitio.draft)) || {};
  }

  /** Color de marca de la página, para pintar la miniatura con su look. */
  colorDe(sitio: Sitio): string {
    const tema = this.contenidoDe(sitio).tema;
    return (tema && tema.colorPrimario) || "#6a4dfb";
  }

  /** ¿La página tiene una sección de productos? Cambia el dibujo de la miniatura. */
  tieneProductos(sitio: Sitio): boolean {
    const bloques = this.contenidoDe(sitio).bloques || [];
    return bloques.some((b: any) => b && b.tipo === "productos");
  }

  // ── Asistente ──────────────────────────────────────────────────────────────

  abrirAsistente(): void {
    this.mostrandoAsistente = true;
    this.paso = "plantilla";
    this.plantillaElegida = null;
    this.sectorFiltro = "";
    this.nombre = "";
    this.objetivo = "";
    this.usarIA = true;

    if (this.plantillas.length) return;
    this.cargandoPlantillas = true;
    this.service.plantillas().subscribe({
      next: (res) => {
        this.cargandoPlantillas = false;
        this.plantillas = (res && res.data) || [];
      },
      error: () => {
        this.cargandoPlantillas = false;
        this.toastr.error("No pudimos cargar las plantillas.");
      },
    });
  }

  cerrarAsistente(): void {
    if (this.creando) return;
    this.mostrandoAsistente = false;
  }

  /** Elegir no avanza de paso: se marca y se confirma abajo, como en el diseño. */
  elegirPlantilla(p: PlantillaSitio): void {
    this.plantillaElegida = p;
  }

  continuar(): void {
    if (!this.plantillaElegida) return;
    this.paso = "datos";
  }

  crear(): void {
    if (this.creando) return;
    const nombre = this.nombre.trim();
    if (!nombre) {
      this.toastr.warning("Ponle un nombre a tu página.");
      return;
    }
    if (!this.plantillaElegida) {
      this.toastr.warning("Elige una plantilla.");
      return;
    }

    this.creando = true;

    // Con IA o sin ella se usa el mismo endpoint: `generar` con `guardar`
    // devuelve la plantilla resuelta con la marca aunque el modelo falle.
    this.service
      .generar({
        templateId: this.plantillaElegida.id,
        sector: this.plantillaElegida.sector,
        objetivo: this.usarIA ? this.objetivo.trim() : "",
        nombre,
        guardar: true,
      })
      .subscribe({
        next: (res) => {
          this.creando = false;
          const data = res && res.data;
          if (!data || !data.id) {
            this.toastr.error((res && res.message) || "No pudimos crear la página.");
            return;
          }
          if (this.usarIA && !data.generadoPorIA) {
            // Se avisa sin alarmar: la página existe igual.
            this.toastr.info(
              "Creamos tu página con la plantilla; puedes editar los textos a mano.",
              "La redacción automática no estuvo disponible"
            );
          }
          this.mostrandoAsistente = false;
          this.router.navigate(["/sitios/editor", data.id]);
        },
        error: (e) => {
          this.creando = false;
          const msg = e && e.error && e.error.message;
          this.toastr.error(msg || "No pudimos crear la página.");
        },
      });
  }

  // ── Plantillas ─────────────────────────────────────────────────────────────

  /** Sectores presentes en las plantillas, para los chips del filtro. */
  get sectores(): string[] {
    return [...new Set(this.plantillas.map((p) => p.sector))];
  }

  /**
   * Las plantillas se muestran en una sola rejilla y el sector es un filtro.
   * Antes iban agrupadas por sector, y como hay una plantilla por sector cada
   * grupo abría su propia rejilla de tres columnas para una sola tarjeta: se
   * veía una columna flaca con dos tercios de la ventana en blanco.
   */
  get plantillasVisibles(): PlantillaSitio[] {
    if (!this.sectorFiltro) return this.plantillas;
    return this.plantillas.filter((p) => p.sector === this.sectorFiltro);
  }

  etiquetaSector(sector: string): string {
    const nombres: { [k: string]: string } = {
      moda: "Moda",
      belleza: "Belleza",
      alimentos: "Alimentos",
      hogar: "Hogar",
      servicios: "Servicios",
      tecnologia: "Tecnología",
      restaurantes: "Restaurantes",
      general: "Cualquier negocio",
    };
    return nombres[sector] || sector;
  }

  /** Nombre corto del título de la plantilla: "Moda — Colección" → "Colección". */
  tituloPlantilla(p: PlantillaSitio): string {
    const partes = (p.nombre || "").split("—");
    return (partes.length > 1 ? partes.slice(1).join("—") : partes[0]).trim();
  }

  /** Secciones que trae la plantilla, en nombre humano y sin repetir. */
  seccionesDe(p: PlantillaSitio): string[] {
    const vistos = new Set<string>();
    const salida: string[] = [];
    for (const tipo of p.bloques || []) {
      const nombre = NOMBRE_BLOQUE[tipo] || tipo;
      if (vistos.has(nombre)) continue;
      vistos.add(nombre);
      salida.push(nombre);
    }
    return salida.slice(0, 4);
  }

  colorPlantilla(p: PlantillaSitio): string {
    return (p.tema && p.tema.colorPrimario) || "#6a4dfb";
  }
}
