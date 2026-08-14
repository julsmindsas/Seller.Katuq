import { Component, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Title, Meta } from "@angular/platform-browser";
import { SitioPublicoService, SitioPublicoView } from "./sitio-publico.service";
import { DatosLead, SitioRenderComponent } from "../sitio-render/sitio-render.component";

/**
 * Página publicada de un comercio: landing, catálogo o tienda.
 *
 * La abre cualquiera desde el link, sin login. El dibujo lo hace
 * `app-sitio-render`, el mismo componente que usa la vista previa del editor;
 * aquí solo queda traer los datos, mandar el lead y poner las metas.
 */
@Component({
  selector: "app-sitio-publico",
  templateUrl: "./sitio-publico.component.html",
  styleUrls: ["./sitio-publico.component.scss"],
})
export class SitioPublicoComponent implements OnInit {
  @ViewChild(SitioRenderComponent) render?: SitioRenderComponent;

  cargando = true;
  error: string | null = null;
  sitio: SitioPublicoView | null = null;

  enviando = false;
  errorEnvio: string | null = null;
  enviado = false;

  private slug = "";

  constructor(
    private route: ActivatedRoute,
    private service: SitioPublicoService,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get("slug") || "";
    if (!this.slug) {
      this.cargando = false;
      this.error = "Este enlace no es válido.";
      return;
    }

    this.service.getPublico(this.slug).subscribe({
      next: (res) => {
        this.cargando = false;
        if (!res || !res.success || !res.data) {
          this.error = "Esta página no está disponible.";
          return;
        }
        this.sitio = res.data;
        this.aplicarSeo(res.data);
      },
      error: () => {
        this.cargando = false;
        this.error = "Esta página no está disponible.";
      },
    });
  }

  /**
   * Título y metas para compartir. Sin SSR esto no lo lee un crawler, pero sí
   * corrige la pestaña del navegador y lo que ve quien ya está en la página.
   */
  private aplicarSeo(sitio: SitioPublicoView): void {
    const titulo = (sitio.seo && sitio.seo.titulo) || sitio.nombre;
    this.title.setTitle(titulo);
    const descripcion = (sitio.seo && sitio.seo.descripcion) || "";
    if (descripcion) {
      this.meta.updateTag({ name: "description", content: descripcion });
      this.meta.updateTag({ property: "og:description", content: descripcion });
    }
    this.meta.updateTag({ property: "og:title", content: titulo });
    if (sitio.seo && sitio.seo.imagen) {
      this.meta.updateTag({ property: "og:image", content: sitio.seo.imagen });
    }
  }

  enviarLead(datos: DatosLead): void {
    if (this.enviando) return;

    if (!datos.nombre) {
      this.errorEnvio = "Necesitamos tu nombre.";
      return;
    }
    if (!datos.telefono && !datos.email) {
      this.errorEnvio = "Déjanos un teléfono o un correo para contactarte.";
      return;
    }

    this.enviando = true;
    this.errorEnvio = null;

    this.service.enviarLead(this.slug, datos).subscribe({
      next: (res) => {
        this.enviando = false;
        if (res && res.success) {
          this.enviado = true;
          if (this.render) this.render.limpiarFormulario();
        } else {
          this.errorEnvio = (res && res.message) || "No pudimos enviar tus datos.";
        }
      },
      error: (e) => {
        this.enviando = false;
        this.errorEnvio =
          (e && e.error && e.error.message) || "No pudimos enviar tus datos. Intenta de nuevo.";
      },
    });
  }

  registrarClic(evento: { destino: string; bloqueId: string }): void {
    if (!this.slug) return;
    this.service.registrarClic(this.slug, evento.destino, evento.bloqueId);
  }
}
