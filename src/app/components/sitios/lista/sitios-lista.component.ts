import { Component, OnInit } from "@angular/core";
import Swal from "sweetalert2";
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
 * Crear es un solo camino: se elige la plantilla del sector y qué se quiere
 * lograr con la página, y Katuq devuelve una primera propuesta ya vestida con la
 * marca del negocio y sus productos reales. No interviene ningún modelo de
 * lenguaje: los textos están escritos a mano, plantilla por plantilla y objetivo
 * por objetivo, así que la misma entrada produce siempre la misma página.
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
  paso: "tipo" | "plantilla" | "datos" = "tipo";
  plantillas: PlantillaSitio[] = [];
  cargandoPlantillas = false;
  plantillaElegida: PlantillaSitio | null = null;

  /** Filtro de sector del selector de plantillas. "" = todas. */
  sectorFiltro = "";

  /**
   * Qué quiere crear el comerciante. Antes no se preguntaba y TODO nacía como
   * landing, aunque el tipo `tienda` existiera desde el principio.
   */
  tipoElegido: "landing" | "catalogo" | "tienda" = "landing";
  tipos = [
    {
      id: "landing" as const,
      nombre: "Una página para mi negocio",
      pista: "Cuenta quién eres y recibe contactos por WhatsApp",
    },
    {
      id: "catalogo" as const,
      nombre: "Un catálogo para compartir",
      pista: "Muestra tus productos con precio, sin carrito",
    },
    {
      id: "tienda" as const,
      nombre: "Una tienda que vende",
      pista: "Con carrito, pago y el pedido entra a Katuq",
    },
  ];

  /** Objetivo de la página. Llega del servidor junto con las plantillas. */
  objetivoId = "";
  objetivos: { id: string; nombre: string; pista: string }[] = [];

  /** Productos a destacar, elegidos con el mismo selector del editor. */
  productoIds: string[] = [];
  mostrandoSelector = false;

  nombre = "";
  /** Descripción en una línea. Va al SEO de la página, no a ningún modelo. */
  objetivo = "";
  conIA = false;
  creando = false;

  constructor(
    private service: SitiosService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  /** Página cuyas métricas se están viendo. Null = ninguna. */
  sitioMetricas: Sitio | null = null;

  /** Kit de marca abierto. */
  mostrandoMarca = false;
  /** Logo de la empresa: si falta, se ofrece cargarlo antes que nada. */
  logoMarca = "";
  /** Sector del kit, para preseleccionar el filtro de plantillas. */
  sectorMarca = "";

  ngOnInit(): void {
    this.cargar();
    this.cargarMarca();
  }

  /**
   * Se lee solo para saber si ya hay logo. Si falla, no se avisa: el aviso de
   * "sube tu logo" aparecería igual y el comerciante puede entrar a la pantalla
   * de marca cuando quiera.
   */
  private cargarMarca(): void {
    this.service.kitDeMarca().subscribe({
      next: (res) => {
        const kit = res && res.data;
        this.logoMarca = (kit && kit.logo) || "";
        this.sectorMarca = (kit && kit.sector) || "";
      },
      error: () => undefined,
    });
  }

  alGuardarMarca(kit: any): void {
    this.logoMarca = (kit && kit.logo) || "";
    this.sectorMarca = (kit && kit.sector) || "";
    this.mostrandoMarca = false;
    // Si venía del asistente, se sigue donde estaba en vez de devolverlo al
    // principio: configurar la marca es un desvío, no un reinicio.
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

  eliminando = "";

  /**
   * Borrar es para siempre: se pide confirmación con el nombre de la página en
   * el mensaje, y si estaba publicada se advierte que el enlace muere.
   *
   * Con SweetAlert2, como TODO diálogo de confirmación del proyecto — nunca
   * window.confirm(), que es el recuadro crudo del navegador.
   */
  eliminarSitio(s: Sitio): void {
    const publicada =
      s.estado === "publicado"
        ? `<br /><br />Está <b>publicada</b>: <code>${s.slug}.katuq.com</code> dejará de existir.`
        : "";
    Swal.fire({
      title: `¿Eliminar "${s.nombre}"?`,
      html: `Esta acción no se puede deshacer.${publicada}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminarla",
      cancelButtonText: "Conservarla",
      confirmButtonColor: "#b42318",
      focusCancel: true,
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.confirmarEliminacion(s);
    });
  }

  private confirmarEliminacion(s: Sitio): void {
    this.eliminando = s.id;
    this.service.eliminar(s.id).subscribe({
      next: (res) => {
        this.eliminando = "";
        if (!res || !res.success) {
          this.toastr.error((res && res.message) || "No pudimos eliminar la página.");
          return;
        }
        this.sitios = this.sitios.filter((x) => x.id !== s.id);
        this.toastr.success("Página eliminada.");
      },
      error: () => {
        this.eliminando = "";
        this.toastr.error("No pudimos eliminar la página.");
      },
    });
  }

  verMetricas(sitio: Sitio): void {
    this.sitioMetricas = sitio;
  }

  // ── Asistente ──────────────────────────────────────────────────────────────

  abrirAsistente(): void {
    this.mostrandoAsistente = true;
    this.paso = "tipo";
    this.plantillaElegida = null;
    this.tipoElegido = "landing";
    this.objetivoId = "";
    this.productoIds = [];
    this.nombre = "";
    this.objetivo = "";
    // El sector del kit filtra las plantillas de entrada: quien ya dijo a qué
    // se dedica no debería tener que volver a buscarlo entre todas.
    this.sectorFiltro = this.sectorMarca;

    if (this.plantillas.length) return;
    this.cargandoPlantillas = true;
    this.service.plantillas().subscribe({
      next: (res) => {
        this.cargandoPlantillas = false;
        this.plantillas = (res && res.data) || [];
        this.objetivos = (res && res.meta && res.meta.objetivos) || [];
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

  // ── Pasos ──────────────────────────────────────────────────────────────────

  elegirTipo(id: "landing" | "catalogo" | "tienda"): void {
    this.tipoElegido = id;
    // Una tienda o un catálogo publican lo que esté marcado para Página Web:
    // ahí no se escoge lista a mano. Si el usuario ya había elegido productos
    // y se devuelve a cambiar de tipo, esa lista se suelta — si no, viajaría
    // escondida hasta la página sin que él pueda verla ni quitarla.
    if (id !== "landing") this.productoIds = [];
    // Cada tipo suele vivir en su plantilla: la tienda quiere una con productos.
    this.paso = "plantilla";
  }

  continuar(): void {
    if (!this.plantillaElegida) return;
    this.paso = "datos";
  }

  atras(): void {
    if (this.creando) return;
    this.paso = this.paso === "datos" ? "plantilla" : "tipo";
  }

  abrirSelectorProductos(): void {
    this.mostrandoSelector = true;
  }

  aplicarProductos(ids: string[]): void {
    this.productoIds = ids;
    this.mostrandoSelector = false;
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

    // `generar` con `guardar` devuelve la plantilla ya resuelta con la marca del
    // negocio. El `objetivoId` elige la variante de textos escrita a mano, que
    // es lo que hace que la página hable de lo que el comerciante quiere lograr.
    this.service
      .generar({
        templateId: this.plantillaElegida.id,
        sector: this.plantillaElegida.sector,
        objetivo: this.objetivo.trim(),
        objetivoId: this.objetivoId,
        conIA: this.conIA,
        productoIds: this.productoIds,
        tipo: this.tipoElegido,
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
