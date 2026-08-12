import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { PlantillaSitio, Sitio, SitiosService } from "../sitios.service";
import { environment } from "../../../../environments/environment";

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

  // Asistente de creación
  mostrandoAsistente = false;
  paso: "plantilla" | "datos" = "plantilla";
  plantillas: PlantillaSitio[] = [];
  cargandoPlantillas = false;
  plantillaElegida: PlantillaSitio | null = null;

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
      () => this.toastr.success("Enlace copiado"),
      () => this.toastr.info(url, "Copia el enlace")
    );
  }

  abrir(sitio: Sitio): void {
    this.router.navigate(["/sitios/editor", sitio.id]);
  }

  verPublicado(sitio: Sitio): void {
    window.open(this.enlacePublico(sitio), "_blank");
  }

  // ── Asistente ──────────────────────────────────────────────────────────────

  abrirAsistente(): void {
    this.mostrandoAsistente = true;
    this.paso = "plantilla";
    this.plantillaElegida = null;
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
    this.mostrandoAsistente = false;
  }

  elegirPlantilla(p: PlantillaSitio): void {
    this.plantillaElegida = p;
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

  /** Sectores presentes en las plantillas, para agrupar la selección. */
  get sectores(): string[] {
    return [...new Set(this.plantillas.map((p) => p.sector))];
  }

  plantillasDe(sector: string): PlantillaSitio[] {
    return this.plantillas.filter((p) => p.sector === sector);
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
}
