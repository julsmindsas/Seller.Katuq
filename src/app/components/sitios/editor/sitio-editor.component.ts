import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { environment } from "../../../../environments/environment";
import { BloqueSitio } from "../../sitio-render/sitio-render.component";
import { ContenidoSitio, Sitio, SitiosService, VentaConfig } from "../sitios.service";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";

/** Tipos de bloque que se pueden agregar, con su nombre en cristiano. */
const CATALOGO_BLOQUES: { tipo: string; nombre: string; descripcion: string; icono: string }[] = [
  {
    tipo: "hero",
    nombre: "Portada",
    descripcion: "Lo primero que ve tu cliente al entrar",
    icono: "M3 5h18v9H3zM7 19h10",
  },
  {
    tipo: "texto",
    nombre: "Sobre tu negocio",
    descripcion: "Cuenta tu historia en pocas líneas",
    icono: "M4 7h16M4 12h16M4 17h9",
  },
  {
    tipo: "galeria",
    nombre: "Galería de fotos",
    descripcion: "Muestra tu local o tus trabajos",
    icono: "M3 5h18v14H3zM8 11l3 3 3-4 5 5",
  },
  {
    tipo: "productos",
    nombre: "Tus productos",
    descripcion: "Se llenan solos desde tu catálogo",
    icono: "M3 9h18M9 21V9M3 5h18v16H3z",
  },
  {
    tipo: "whatsapp",
    nombre: "Botón de WhatsApp",
    descripcion: "Para que te escriban con un toque",
    icono: "M21 12a9 9 0 1 1-4.5-7.8L21 3l-1.2 4.5A9 9 0 0 1 21 12Z",
  },
  {
    tipo: "formulario",
    nombre: "Formulario de contacto",
    descripcion: "Recibe datos de clientes interesados",
    icono: "M4 5h16v14H4zM8 10h8M8 14h5",
  },
  {
    tipo: "faq",
    nombre: "Preguntas frecuentes",
    descripcion: "Responde dudas antes de que pregunten",
    icono: "M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.2-.9.8-.9 1.4v.3M12 17h.01M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z",
  },
  {
    tipo: "footer",
    nombre: "Pie de página",
    descripcion: "Horarios, redes y datos de contacto",
    icono: "M3 15h18M3 19h10M3 5h18v14H3z",
  },
];

/**
 * Combinaciones de color ya armadas. Existen porque elegir tres colores que
 * combinen es justo lo que un comerciante no quiere hacer; los selectores de
 * color sueltos siguen ahí, escondidos tras "elegir mis propios colores".
 */
const PALETAS: {
  id: string;
  nombre: string;
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
}[] = [
  { id: "violeta", nombre: "Violeta", colorPrimario: "#6a4dfb", colorSecundario: "#ffffff", colorTexto: "#211d33" },
  { id: "rosa", nombre: "Rosa dulce", colorPrimario: "#e8478f", colorSecundario: "#fff8fb", colorTexto: "#2b1a24" },
  { id: "verde", nombre: "Verde natural", colorPrimario: "#1f9d68", colorSecundario: "#f7fbf8", colorTexto: "#12261c" },
  { id: "noche", nombre: "Negro elegante", colorPrimario: "#211d33", colorSecundario: "#faf9f7", colorTexto: "#211d33" },
];

/**
 * Estilos de página completos. Cada uno mueve esquinas, sombra, aire, peso y
 * tracking de titulares de una vez. Los ids son los que valida el backend en
 * `normalizarTema`: mandar otro se descarta en silencio al guardar.
 */
const ESTILOS_PAGINA: { id: string; nombre: string; pista: string }[] = [
  { id: "clasico", nombre: "Clásico", pista: "Equilibrado, esquinas suaves" },
  { id: "editorial", nombre: "Editorial", pista: "Serif grande, mucho aire" },
  { id: "boutique", nombre: "Boutique", pista: "Filetes finos, versalitas, aire de sobra" },
  { id: "minimal", nombre: "Minimal", pista: "Nada sobra, medidas contenidas" },
  { id: "audaz", nombre: "Audaz", pista: "Redondo, con sombra y titulares pesados" },
];

/**
 * Fuentes disponibles. `familia` es solo para la muestra del panel; la que vale
 * es la que aplica el render. Los ids son lista blanca del backend.
 */
const TIPOGRAFIAS: { id: string; nombre: string; pista: string; familia: string; grupo: string }[] = [
  // Con carácter — pensadas para titulares.
  { id: "playfair", nombre: "Playfair", pista: "Serif de revista", familia: '"Playfair Display", Georgia, serif', grupo: "titulo" },
  { id: "cormorant", nombre: "Cormorant", pista: "Fina y elegante", familia: '"Cormorant Garamond", Georgia, serif', grupo: "titulo" },
  { id: "fraunces", nombre: "Fraunces", pista: "Serif con personalidad", familia: '"Fraunces", Georgia, serif', grupo: "titulo" },
  { id: "dmserif", nombre: "DM Serif", pista: "Contundente y clásica", familia: '"DM Serif Display", Georgia, serif', grupo: "titulo" },
  { id: "syne", nombre: "Syne", pista: "Moderna y distinta", familia: '"Syne", system-ui, sans-serif', grupo: "titulo" },
  // Neutras — cómodas para leer párrafos largos.
  { id: "jakarta", nombre: "Jakarta", pista: "Redonda y cercana", familia: '"Plus Jakarta Sans", system-ui, sans-serif', grupo: "cuerpo" },
  { id: "outfit", nombre: "Outfit", pista: "Geométrica y limpia", familia: '"Outfit", system-ui, sans-serif', grupo: "cuerpo" },
  { id: "sora", nombre: "Sora", pista: "Técnica y clara", familia: '"Sora", system-ui, sans-serif', grupo: "cuerpo" },
  { id: "inter", nombre: "Inter", pista: "La más legible en pantalla", familia: '"Inter", system-ui, sans-serif', grupo: "cuerpo" },
  // Las de siempre, sin descarga.
  { id: "sistema", nombre: "Del sistema", pista: "La del teléfono de tu cliente", familia: "system-ui, -apple-system, sans-serif", grupo: "cuerpo" },
  { id: "serif", nombre: "Serif clásica", pista: "Georgia, sin descargar nada", familia: 'Georgia, "Times New Roman", serif', grupo: "titulo" },
  { id: "sans", nombre: "Sans clásica", pista: "Sin descargar nada", familia: 'Inter, "Helvetica Neue", Arial, sans-serif', grupo: "cuerpo" },
  { id: "mono", nombre: "Máquina", pista: "De ancho fijo", familia: "ui-monospace, SFMono-Regular, Menlo, monospace", grupo: "cuerpo" },
];

/**
 * Parejas de letra ya combinadas. Elegir dos fuentes que peguen es trabajo de
 * diseñador; estas son las que se ofrecen primero y las sueltas quedan detrás
 * de "combinar a mi manera".
 */
const PAREJAS: { id: string; nombre: string; titulo: string; cuerpo: string }[] = [
  { id: "boutique", nombre: "Cormorant + Jakarta", titulo: "cormorant", cuerpo: "jakarta" },
  { id: "revista", nombre: "Playfair + Inter", titulo: "playfair", cuerpo: "inter" },
  { id: "calido", nombre: "Fraunces + Sora", titulo: "fraunces", cuerpo: "sora" },
  { id: "moderno", nombre: "Syne + Outfit", titulo: "syne", cuerpo: "outfit" },
  { id: "editorial", nombre: "DM Serif + Jakarta", titulo: "dmserif", cuerpo: "jakarta" },
  { id: "sistema", nombre: "Del sistema", titulo: "sistema", cuerpo: "sistema" },
];

/** Valores iniciales de un bloque recién agregado. */
const BLOQUE_NUEVO: { [tipo: string]: any } = {
  hero: {
    titulo: "Título principal",
    subtitulo: "",
    ctaTexto: "",
    ctaUrl: "",
    alineacion: "centro",
    imagen: "",
    altura: "normal",
    velo: 45,
    veloClaro: false,
  },
  texto: { titulo: "Título", cuerpo: "Escribe aquí." },
  galeria: { titulo: "Galería", imagenes: [] },
  productos: { titulo: "Productos destacados", productoIds: [], permitirCompra: false },
  whatsapp: { telefono: "", mensaje: "Hola, quiero más información", etiqueta: "Escríbenos por WhatsApp" },
  formulario: {
    titulo: "Déjanos tus datos",
    descripcion: "",
    pedirTelefono: true,
    pedirEmail: true,
    pedirMensaje: true,
    textoBoton: "Enviar",
  },
  faq: { titulo: "Preguntas frecuentes", preguntas: [{ pregunta: "¿Pregunta?", respuesta: "Respuesta." }] },
  footer: { texto: "", mostrarRedes: true, enlaces: [] },
};

/**
 * Editor visual de un sitio.
 *
 * Se trabaja siempre sobre el borrador; publicar es un acto aparte, explícito,
 * que copia el borrador a la versión que ve el público. Eso permite dejar algo
 * a medias sin romper la página que ya está en línea.
 *
 * La vista previa usa `app-sitio-render`, el mismo componente de la página
 * pública: lo que se ve editando es lo que se publica.
 */
@Component({
  selector: "app-sitio-editor",
  templateUrl: "./sitio-editor.component.html",
  styleUrls: ["./sitio-editor.component.scss"],
})
export class SitioEditorComponent implements OnInit {
  cargando = true;
  guardando = false;
  publicando = false;
  subiendo = false;
  error: string | null = null;

  sitio: Sitio | null = null;
  contenido: ContenidoSitio | null = null;

  /** Índice del bloque en edición. -1 = ninguno. */
  seleccionado = -1;
  dispositivo: "escritorio" | "movil" = "escritorio";
  panel: "bloques" | "diseno" | "tienda" | "pauta" | "ajustes" = "bloques";

  /** Bodegas del comercio, para el selector de despacho de la tienda. */
  bodegas: { codigo: string; nombre: string }[] = [];
  cargandoBodegas = false;

  /** Pasarela, zonas y formas de pago reales de la empresa. */
  ventaConfig: VentaConfig | null = null;
  cargandoVentaConfig = false;
  mostrandoAgregar = false;
  mostrandoSelector = false;

  /** Los selectores de color sueltos van escondidos tras las paletas. */
  coloresAvanzados = false;

  catalogoBloques = CATALOGO_BLOQUES;

  /** Hay cambios sin guardar. Se usa para avisar antes de publicar. */
  sucio = false;

  /** Bloques con los productos ya resueltos, solo para la vista previa. */
  bloquesPrevia: BloqueSitio[] = [];
  private productosPrevia = new Map<string, any>();

  // Campos de ajustes
  nombre = "";
  slug = "";

  /** Sufijo del dominio, para la barra del navegador de la previa. */
  dominioSitios = environment.dominioSitios || "katuq.com";
  slugMensaje: string | null = null;
  slugValido = true;

  private id = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: SitiosService,
    private bodegaService: BodegaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get("id") || "";
    if (!this.id) {
      this.cargando = false;
      this.error = "No encontramos esta página.";
      return;
    }

    this.service.obtener(this.id).subscribe({
      next: (res) => {
        this.cargando = false;
        if (!res || !res.success || !res.data) {
          this.error = "No encontramos esta página.";
          return;
        }
        this.sitio = res.data;
        this.contenido = this.completar(res.data.draft);
        this.nombre = res.data.nombre;
        this.slug = res.data.slug;
        this.resolverProductosDePrevia();
      },
      error: () => {
        this.cargando = false;
        this.error = "No encontramos esta página.";
      },
    });
  }

  /**
   * Rellena lo que pueda faltar en un borrador. Un sitio creado antes de que
   * existiera alguna parte del contenido llegaría sin ella, y el panel de
   * ajustes explotaría al enlazar `seo.titulo`.
   */
  private completar(draft: any): ContenidoSitio {
    const d = draft || {};
    const envio = (d.tienda && d.tienda.envio) || {};
    return {
      bloques: Array.isArray(d.bloques) ? d.bloques : [],
      // El tema se completa campo por campo, no con `d.tema || {…}`: un sitio
      // creado antes de que existieran las fuentes por separado o el estilo
      // llega con el objeto viejo, y el panel enlazaría contra `undefined`.
      tema: {
        colorPrimario: (d.tema && d.tema.colorPrimario) || "#111111",
        colorSecundario: (d.tema && d.tema.colorSecundario) || "#ffffff",
        colorTexto: (d.tema && d.tema.colorTexto) || "#222222",
        tipografia: (d.tema && d.tema.tipografia) || "sistema",
        // Sin elección propia, las dos heredan de `tipografia`, que es
        // exactamente lo que hace el backend.
        fuenteTitulo: (d.tema && (d.tema.fuenteTitulo || d.tema.tipografia)) || "sistema",
        fuenteCuerpo: (d.tema && (d.tema.fuenteCuerpo || d.tema.tipografia)) || "sistema",
        estilo: (d.tema && d.tema.estilo) || "clasico",
        animaciones: (d.tema && d.tema.animaciones) === true,
      },
      seo: d.seo || { titulo: "", descripcion: "", imagen: "" },
      // Un sitio creado antes de que existiera la tienda llega sin esto. Nace
      // apagada: nadie empieza a vender porque se desplegó una versión nueva.
      tienda: {
        habilitada: (d.tienda && d.tienda.habilitada) === true,
        bodegaId: (d.tienda && d.tienda.bodegaId) || "",
        envio: {
          modo: envio.modo === "zonas" ? "zonas" : "fijo",
          costo: Number(envio.costo) || 0,
          gratisDesde: Number(envio.gratisDesde) || 0,
          texto: envio.texto || "",
        },
        pagoEnLinea: (d.tienda && d.tienda.pagoEnLinea) !== false,
        contraEntrega: (d.tienda && d.tienda.contraEntrega) === true,
        otrasFormasPago: Array.isArray(d.tienda && d.tienda.otrasFormasPago)
          ? d.tienda.otrasFormasPago
          : [],
        minimoCompra: Number(d.tienda && d.tienda.minimoCompra) || 0,
        mensajeConfirmacion: (d.tienda && d.tienda.mensajeConfirmacion) || "",
      },
      analitica: {
        ga4: (d.analitica && d.analitica.ga4) || "",
        googleAds: (d.analitica && d.analitica.googleAds) || "",
        googleAdsConversion: (d.analitica && d.analitica.googleAdsConversion) || "",
        metaPixel: (d.analitica && d.analitica.metaPixel) || "",
        gtm: (d.analitica && d.analitica.gtm) || "",
        tiktokPixel: (d.analitica && d.analitica.tiktokPixel) || "",
        metaVerificacion: (d.analitica && d.analitica.metaVerificacion) || "",
        googleVerificacion: (d.analitica && d.analitica.googleVerificacion) || "",
        consentimiento: (d.analitica && d.analitica.consentimiento) === true,
      },
    };
  }

  /**
   * Bodegas del comercio, para elegir de dónde se despacha lo que se venda.
   * Se cargan al abrir el panel de tienda, no al entrar al editor: la mayoría
   * de las páginas son landings y no necesitan esta consulta.
   */
  cargarBodegas(): void {
    this.cargarVentaConfig();
    if (this.bodegas.length || this.cargandoBodegas) return;
    this.cargandoBodegas = true;
    this.bodegaService.getBodegas().subscribe({
      next: (lista: any[]) => {
        this.cargandoBodegas = false;
        // `idBodega` es el código de negocio ("BOD-001"), que es lo que espera
        // inventario. El id de Firestore aquí generaría movimientos huérfanos.
        this.bodegas = (lista || [])
          .filter((b) => b && (b.idBodega || b.codigo))
          .map((b) => ({
            codigo: b.idBodega || b.codigo,
            // La colección es `warehouses`; el nombre viene en `nombre`.
            nombre: b.nombre || b.name || b.idBodega || b.codigo,
          }));
      },
      error: () => {
        this.cargandoBodegas = false;
        this.toastr.error("No pudimos cargar tus bodegas.");
      },
    });
  }

  /**
   * Config de venta de la empresa: pasarela propia o no, zonas de cobro y
   * formas de pago del maestro. Sin esto el panel dejaba encender opciones que
   * no funcionan — pago en línea sin pasarela, envío por zonas sin zonas.
   */
  private cargarVentaConfig(): void {
    if (this.ventaConfig || this.cargandoVentaConfig) return;
    this.cargandoVentaConfig = true;
    this.service.ventaConfig().subscribe({
      next: (res) => {
        this.cargandoVentaConfig = false;
        this.ventaConfig = (res && res.data) || null;
      },
      error: () => {
        this.cargandoVentaConfig = false;
        // Sin la config el panel sigue sirviendo; solo pierde los avisos.
      },
    });
  }

  /** ¿Esta forma de pago del maestro está ofrecida en la tienda? */
  formaPagoActiva(cd: string): boolean {
    const t = this.contenido && this.contenido.tienda;
    return !!t && t.otrasFormasPago.some((f) => f.cd === cd);
  }

  /** Enciende o apaga una forma de pago manual del maestro. */
  alternarFormaPago(forma: { cd: string; nombre: string }): void {
    const t = this.contenido && this.contenido.tienda;
    if (!t) return;
    if (this.formaPagoActiva(forma.cd)) {
      t.otrasFormasPago = t.otrasFormasPago.filter((f) => f.cd !== forma.cd);
    } else if (t.otrasFormasPago.length >= 6) {
      this.toastr.warning("Hasta 6 formas de pago adicionales: más opciones confunden al comprador.");
      return;
    } else {
      t.otrasFormasPago = [...t.otrasFormasPago, { cd: forma.cd, nombre: forma.nombre }];
    }
    this.marcarSucio();
  }

  /**
   * ¿La tienda quedaría a medias? Se avisa antes de publicar, porque una tienda
   * encendida sin bodega rechaza los pedidos y el comerciante no se entera
   * hasta que un cliente se queja.
   */
  get avisoTienda(): string | null {
    const t = this.contenido && this.contenido.tienda;
    if (!t || !t.habilitada) return null;
    if (!t.bodegaId) return "Elige la bodega desde donde despachas: sin ella la tienda no recibe pedidos.";
    const hayCompra = this.bloques.some(
      (b) => b.tipo === "productos" && b.datos && b.datos.permitirCompra === true
    );
    if (!hayCompra) {
      return "Ningún bloque de productos tiene la compra activada, así que no se puede comprar nada.";
    }
    if (t.envio.modo === "zonas" && this.ventaConfig && this.ventaConfig.zonas === 0) {
      return "Elegiste envío por zonas pero no tienes zonas de cobro creadas: nadie podría cerrar la compra. Créalas en Maestros → Zonas de cobro.";
    }
    return null;
  }

  /**
   * El aviso de plata: con pago en línea sin pasarela PROPIA, el link de pago
   * sale con las credenciales de la plataforma y el dinero NO le llega al
   * comerciante. Es aparte del aviso general porque no bloquea la venta —
   * bloquea el recaudo, que es peor y más silencioso.
   */
  get avisoPasarela(): string | null {
    const t = this.contenido && this.contenido.tienda;
    if (!t || !t.habilitada || !t.pagoEnLinea) return null;
    if (!this.ventaConfig || this.ventaConfig.pasarela.configurada) return null;
    return "Tienes el pago en línea encendido sin una pasarela propia configurada: los pagos NO llegarían a tu cuenta. Configura Wompi o ePayco en Integraciones, o apaga el pago en línea y usa contra entrega.";
  }

  get bloques(): BloqueSitio[] {
    return (this.contenido && this.contenido.bloques) || [];
  }

  get bloqueActual(): BloqueSitio | null {
    return this.seleccionado >= 0 ? this.bloques[this.seleccionado] || null : null;
  }

  get idBloqueActivo(): string | null {
    return this.bloqueActual ? this.bloqueActual.id : null;
  }

  nombreDeTipo(tipo: string): string {
    const encontrado = CATALOGO_BLOQUES.find((b) => b.tipo === tipo);
    return encontrado ? encontrado.nombre : tipo;
  }

  descripcionDeTipo(tipo: string): string {
    const encontrado = CATALOGO_BLOQUES.find((b) => b.tipo === tipo);
    return encontrado ? encontrado.descripcion : "";
  }

  /** Trazo del ícono de la sección (atributo `d` de un <path>). */
  iconoDeTipo(tipo: string): string {
    const encontrado = CATALOGO_BLOQUES.find((b) => b.tipo === tipo);
    return encontrado ? encontrado.icono : "M4 5h16v14H4z";
  }

  // ── Estilo de la página ────────────────────────────────────────────────────

  paletas = PALETAS;
  tipografias = TIPOGRAFIAS;
  estilosPagina = ESTILOS_PAGINA;
  parejas = PAREJAS;

  /** Las fuentes sueltas van escondidas tras las parejas ya combinadas. */
  fuentesSueltas = false;

  get estiloActivo(): string {
    return (this.contenido && this.contenido.tema && this.contenido.tema.estilo) || "clasico";
  }

  elegirEstiloPagina(id: string): void {
    if (!this.contenido) return;
    this.contenido.tema = { ...this.contenido.tema, estilo: id };
    this.marcarSucio();
  }

  /** Fuente efectiva de titulares (o de cuerpo), con la herencia de `tipografia`. */
  fuenteDe(donde: "titulo" | "cuerpo"): string {
    const t = this.contenido && this.contenido.tema;
    if (!t) return "sistema";
    const propia = donde === "titulo" ? t.fuenteTitulo : t.fuenteCuerpo;
    return propia || t.tipografia || "sistema";
  }

  familiaDe(id: string): string {
    const f = TIPOGRAFIAS.find((x) => x.id === id);
    return f ? f.familia : "system-ui, sans-serif";
  }

  /** Id de la pareja que coincide con las dos fuentes actuales, o "" si es a mano. */
  get parejaActiva(): string {
    const titulo = this.fuenteDe("titulo");
    const cuerpo = this.fuenteDe("cuerpo");
    const p = PAREJAS.find((x) => x.titulo === titulo && x.cuerpo === cuerpo);
    return p ? p.id : "";
  }

  aplicarPareja(id: string): void {
    const p = PAREJAS.find((x) => x.id === id);
    if (!p || !this.contenido) return;
    this.contenido.tema = { ...this.contenido.tema, fuenteTitulo: p.titulo, fuenteCuerpo: p.cuerpo };
    this.marcarSucio();
  }

  elegirFuente(donde: "titulo" | "cuerpo", id: string): void {
    if (!this.contenido) return;
    const campo = donde === "titulo" ? "fuenteTitulo" : "fuenteCuerpo";
    this.contenido.tema = { ...this.contenido.tema, [campo]: id };
    this.marcarSucio();
  }

  alternarAnimaciones(): void {
    if (!this.contenido) return;
    const t = this.contenido.tema as any;
    this.contenido.tema = { ...t, animaciones: t.animaciones !== true };
    this.marcarSucio();
  }

  // ── Portada ────────────────────────────────────────────────────────────────

  /**
   * El velo de la portada. Los bloques guardados antes de que existiera el
   * campo no lo traen, y el backend asume 45: aquí se muestra lo mismo para que
   * el deslizador no arranque en cero mintiendo sobre lo publicado.
   */
  veloDe(datos: any): number {
    if (!datos) return 45;
    return datos.velo === undefined || datos.velo === null ? 45 : Number(datos.velo);
  }

  cambiarVelo(datos: any, valor: any): void {
    if (!datos) return;
    const n = Math.min(85, Math.max(0, Number(valor) || 0));
    datos.velo = n;
    this.marcarSucio();
  }

  /** Id de la paleta que coincide con los colores actuales, o "" si son a mano. */
  get paletaActiva(): string {
    const t = this.contenido && this.contenido.tema;
    if (!t) return "";
    const igual = PALETAS.find(
      (p) =>
        p.colorPrimario.toLowerCase() === (t.colorPrimario || "").toLowerCase() &&
        p.colorSecundario.toLowerCase() === (t.colorSecundario || "").toLowerCase() &&
        p.colorTexto.toLowerCase() === (t.colorTexto || "").toLowerCase()
    );
    return igual ? igual.id : "";
  }

  aplicarPaleta(id: string): void {
    const p = PALETAS.find((x) => x.id === id);
    if (!p || !this.contenido) return;
    this.contenido.tema = {
      ...this.contenido.tema,
      colorPrimario: p.colorPrimario,
      colorSecundario: p.colorSecundario,
      colorTexto: p.colorTexto,
    };
    this.marcarSucio();
  }

  elegirTipografia(id: string): void {
    if (!this.contenido) return;
    this.contenido.tema = { ...this.contenido.tema, tipografia: id };
    this.marcarSucio();
  }

  seleccionar(indice: number): void {
    this.seleccionado = indice;
    this.panel = "bloques";
  }

  seleccionarPorId(bloqueId: string): void {
    const i = this.bloques.findIndex((b) => b.id === bloqueId);
    if (i >= 0) this.seleccionar(i);
  }

  // ── Operaciones sobre bloques ──────────────────────────────────────────────

  agregar(tipo: string): void {
    if (!this.contenido) return;
    const datos = JSON.parse(JSON.stringify(BLOQUE_NUEVO[tipo] || {}));
    // El id local solo sirve para identificar el bloque en pantalla; el backend
    // lo normaliza al guardar.
    const id = `b_${Date.now()}_${tipo}`;
    this.contenido.bloques = [...this.bloques, { id, tipo, visible: true, datos }];
    this.seleccionado = this.contenido.bloques.length - 1;
    this.mostrandoAgregar = false;
    this.marcarSucio();
  }

  duplicar(i: number): void {
    if (!this.contenido) return;
    const copia = JSON.parse(JSON.stringify(this.bloques[i]));
    copia.id = `b_${Date.now()}_${copia.tipo}`;
    const nuevos = [...this.bloques];
    nuevos.splice(i + 1, 0, copia);
    this.contenido.bloques = nuevos;
    this.seleccionado = i + 1;
    this.marcarSucio();
  }

  eliminar(i: number): void {
    if (!this.contenido) return;
    const nuevos = [...this.bloques];
    nuevos.splice(i, 1);
    this.contenido.bloques = nuevos;
    if (this.seleccionado === i) this.seleccionado = -1;
    else if (this.seleccionado > i) this.seleccionado--;
    this.marcarSucio();
  }

  mover(i: number, direccion: -1 | 1): void {
    if (!this.contenido) return;
    const destino = i + direccion;
    if (destino < 0 || destino >= this.bloques.length) return;
    const nuevos = [...this.bloques];
    [nuevos[i], nuevos[destino]] = [nuevos[destino], nuevos[i]];
    this.contenido.bloques = nuevos;
    if (this.seleccionado === i) this.seleccionado = destino;
    this.marcarSucio();
  }

  alternarVisible(i: number): void {
    if (!this.contenido) return;
    const nuevos = [...this.bloques];
    nuevos[i] = { ...nuevos[i], visible: nuevos[i].visible === false };
    this.contenido.bloques = nuevos;
    this.marcarSucio();
  }

  // ── Campos con forma propia ────────────────────────────────────────────────

  /**
   * Teléfono y correo no se pueden apagar los dos.
   *
   * Sin ninguno de los dos queda un formulario que pide el nombre y rechaza el
   * envío pidiendo "un teléfono o un correo", sin campo donde escribirlos: el
   * visitante llena, manda y no pasa nada. Se vuelve a encender el que se acaba
   * de apagar y se explica por qué.
   */
  alCambiarCampoContacto(campo: "pedirTelefono" | "pedirEmail"): void {
    const b = this.bloqueActual;
    if (!b) return;
    if (!b.datos.pedirTelefono && !b.datos.pedirEmail) {
      b.datos[campo] = true;
      this.toastr.info(
        "Necesitas pedir al menos un teléfono o un correo, o no habría forma de responderle a quien te escriba.",
        "Ese campo tiene que quedar"
      );
    }
    this.marcarSucio();
  }

  agregarPregunta(): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.preguntas = [...(b.datos.preguntas || []), { pregunta: "", respuesta: "" }];
    this.marcarSucio();
  }

  quitarPregunta(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.preguntas.splice(i, 1);
    this.marcarSucio();
  }

  agregarEnlace(): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.enlaces = [...(b.datos.enlaces || []), { etiqueta: "", url: "" }];
    this.marcarSucio();
  }

  quitarEnlace(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.enlaces.splice(i, 1);
    this.marcarSucio();
  }

  quitarImagenGaleria(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.imagenes.splice(i, 1);
    this.marcarSucio();
  }

  // ── Selector de productos ──────────────────────────────────────────────────

  abrirSelector(): void {
    if (!this.bloqueActual) return;
    this.mostrandoSelector = true;
  }

  /** Los ids llegan ya en el orden en que el comerciante quiere mostrarlos. */
  aplicarProductos(ids: string[]): void {
    const b = this.bloqueActual;
    if (b) {
      b.datos.productoIds = ids;
      this.marcarSucio();
      this.resolverProductosDePrevia();
    }
    this.mostrandoSelector = false;
  }

  /**
   * Trae los productos elegidos para que la vista previa los muestre con foto y
   * precio, en vez de un "3 productos seleccionados".
   *
   * Es solo para ver: al guardar se manda `productoIds`, nunca estos datos. El
   * precio real lo resuelve el servidor al servir la página pública.
   */
  private resolverProductosDePrevia(): void {
    const ids = [
      ...new Set(
        this.bloques
          .filter((b) => b.tipo === "productos")
          .flatMap((b) => b.datos.productoIds || [])
      ),
    ] as string[];

    if (!ids.length) {
      this.productosPrevia.clear();
      this.recalcularPrevia();
      return;
    }

    this.service.productosPorIds(ids).subscribe({
      next: (res) => {
        this.productosPrevia.clear();
        for (const p of res.products || []) {
          const crear = p.crearProducto || {};
          const disp = p.disponibilidad || {};
          this.productosPrevia.set(p.cd, {
            productoId: p.cd,
            titulo: crear.titulo || "Producto",
            imagen: this.primeraImagen(crear),
            precioConIva: Number((p.precio || {}).precioUnitarioConIva || 0),
            disponible: disp.inventariable === false ? true : Number(disp.cantidadDisponible || 0) > 0,
          });
        }
        this.recalcularPrevia();
      },
      // Si falla, la previa cae al conteo: no vale la pena molestar al usuario.
      error: () => this.recalcularPrevia(),
    });
  }

  private primeraImagen(crear: any): string | null {
    const candidatas = [...(crear.imagenesPrincipales || []), ...(crear.imagenesSecundarias || [])];
    for (const img of candidatas) {
      const ruta = typeof img === "string" ? img : img && img.urls;
      if (!ruta || typeof ruta !== "string" || !ruta.trim()) continue;
      const limpia = ruta.trim();
      if (/^https?:\/\//i.test(limpia) || limpia.startsWith("data:") || limpia.startsWith("//")) {
        return limpia;
      }
      return `https://images2.guiacereza.com${limpia.startsWith("/") ? "" : "/"}${limpia}`;
    }
    return null;
  }

  /**
   * Bloques que se le pasan al render. Son los mismos del borrador, salvo los
   * de producto, que se clonan para inyectarles los productos resueltos —
   * el borrador nunca se contamina con esos datos.
   */
  private recalcularPrevia(): void {
    this.bloquesPrevia = this.bloques.map((b) => {
      if (b.tipo !== "productos") return b;
      const productos = (b.datos.productoIds || [])
        .map((id: string) => this.productosPrevia.get(id))
        .filter(Boolean)
        // Igual que en la página pública: los agotados no se muestran.
        .filter((p: any) => p.disponible);
      return { ...b, datos: { ...b.datos, productos } };
    });
  }

  // ── Imágenes ───────────────────────────────────────────────────────────────

  subirImagen(evento: Event, destino: "hero" | "galeria" | "seo"): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;

    this.subiendo = true;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = false;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        if (destino === "seo" && this.contenido) {
          this.contenido.seo.imagen = res.url;
        } else {
          const b = this.bloqueActual;
          if (!b) return;
          if (destino === "hero") b.datos.imagen = res.url;
          if (destino === "galeria") b.datos.imagenes = [...(b.datos.imagenes || []), { url: res.url, alt: "" }];
        }
        this.marcarSucio();
      },
      error: (e) => {
        this.subiendo = false;
        input.value = "";
        this.toastr.error((e && e.error && e.error.error) || "No pudimos subir la imagen.");
      },
    });
  }

  // ── Guardar y publicar ─────────────────────────────────────────────────────

  /**
   * Cualquier cambio del editor pasa por aquí: marca que hay trabajo sin
   * guardar y refresca lo que ve la vista previa.
   */
  marcarSucio(): void {
    this.sucio = true;
    this.recalcularPrevia();
  }

  comprobarSlug(): void {
    const slug = this.slug.trim();
    if (!slug) {
      this.slugValido = false;
      this.slugMensaje = "La dirección no puede quedar vacía.";
      return;
    }
    this.service.slugDisponible(slug, this.id).subscribe({
      next: (res) => {
        const d = res && res.data;
        this.slugValido = !!(d && d.disponible);
        this.slug = (d && d.slug) || slug;
        this.slugMensaje = this.slugValido ? "Disponible" : (d && d.motivo) || "No está disponible";
      },
      error: () => {
        this.slugMensaje = null;
      },
    });
  }

  guardar(alPublicar = false): void {
    if (!this.contenido || this.guardando) return;
    if (!this.slugValido) {
      this.toastr.warning("Corrige la dirección antes de guardar.");
      return;
    }

    this.guardando = true;
    this.service
      .guardar({
        id: this.id,
        nombre: this.nombre.trim(),
        slug: this.slug.trim(),
        contenido: this.contenido,
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          if (!res || !res.success) {
            this.toastr.error((res && res.message) || "No pudimos guardar.");
            return;
          }
          this.sucio = false;
          this.aplicarLoGuardado(res.data);
          if (res.avisos) this.toastr.info(res.avisos);
          if (!alPublicar) this.toastr.success("Cambios guardados");
          if (alPublicar) this.publicarAhora();
        },
        error: (e) => {
          this.guardando = false;
          this.toastr.error((e && e.error && e.error.message) || "No pudimos guardar.");
        },
      });
  }

  /**
   * Refleja lo que el servidor guardó de verdad.
   *
   * Al guardar, el backend descarta lo que no pasa el saneador: una dirección
   * escrita como `www.mitienda.com` (sin `https://`) se va a vacío, y un
   * WhatsApp de menos de siete dígitos también. Antes el editor seguía
   * mostrándolos puestos y el comerciante publicaba convencido de que el botón
   * estaba ahí. Ahora se ve lo que quedó, y se avisa qué se cayó.
   */
  private aplicarLoGuardado(
    data: { nombre: string; slug: string; draft: ContenidoSitio } | undefined
  ): void {
    if (!data || !data.draft) return;

    const perdidos = this.camposPerdidos(this.contenido, data.draft);

    this.contenido = this.completar(data.draft);
    if (data.slug) this.slug = data.slug;
    if (data.nombre) this.nombre = data.nombre;
    if (this.sitio) {
      this.sitio.slug = data.slug || this.sitio.slug;
      this.sitio.nombre = data.nombre || this.sitio.nombre;
    }
    this.resolverProductosDePrevia();

    if (perdidos.length) {
      this.toastr.warning(
        perdidos.join(". ") + ".",
        "Revisa estos campos: no quedaron guardados",
        { timeOut: 9000, closeButton: true }
      );
    }
  }

  /**
   * Compara lo que se mandó contra lo que volvió y arma el aviso. Solo mira los
   * campos donde el saneador puede vaciar algo sin que se note: direcciones y
   * teléfonos.
   */
  private camposPerdidos(antes: ContenidoSitio | null, despues: ContenidoSitio): string[] {
    if (!antes) return [];
    const avisos: string[] = [];
    const nuevos = despues.bloques || [];

    (antes.bloques || []).forEach((bloque, i) => {
      const guardado = nuevos[i];
      if (!guardado || guardado.tipo !== bloque.tipo) return;

      const enviado = bloque.datos || {};
      const quedo = guardado.datos || {};

      if (bloque.tipo === "hero" && enviado.ctaUrl && !quedo.ctaUrl) {
        avisos.push(
          `El destino del botón del banner ("${enviado.ctaUrl}") no es una dirección válida; ` +
            "escríbela completa, con https://, o usa #productos"
        );
      }
      if (bloque.tipo === "whatsapp" && enviado.telefono && !quedo.telefono) {
        avisos.push(
          `El número de WhatsApp ("${enviado.telefono}") no sirve; ponlo con indicativo, ` +
            "solo dígitos (ej: 573001234567)"
        );
      }
      if (bloque.tipo === "footer") {
        const perdidos = (enviado.enlaces || []).length - (quedo.enlaces || []).length;
        if (perdidos > 0) {
          avisos.push(
            `${perdidos} enlace(s) del pie se descartaron: falta el nombre o la dirección no es válida`
          );
        }
      }
    });

    return avisos;
  }

  /** Publicar guarda primero: nadie espera publicar una versión vieja. */
  publicar(): void {
    if (this.publicando) return;
    this.guardar(true);
  }

  private publicarAhora(): void {
    this.publicando = true;
    this.service.publicar(this.id).subscribe({
      next: (res) => {
        this.publicando = false;
        if (!res || !res.success) {
          this.toastr.error((res && res.message) || "No pudimos publicar.");
          return;
        }
        if (this.sitio) this.sitio.estado = "publicado";
        this.toastr.success("Tu página está en línea");
      },
      error: (e) => {
        this.publicando = false;
        this.toastr.error((e && e.error && e.error.message) || "No pudimos publicar.");
      },
    });
  }

  despublicar(): void {
    if (this.publicando) return;
    this.publicando = true;
    this.service.despublicar(this.id).subscribe({
      next: () => {
        this.publicando = false;
        if (this.sitio) this.sitio.estado = "borrador";
        this.toastr.info("Tu página ya no es visible");
      },
      error: () => {
        this.publicando = false;
        this.toastr.error("No pudimos despublicar.");
      },
    });
  }

  /**
   * Dirección pública de la página. Cada sitio se publica en su propio
   * subdominio (`flores-maria.katuq.com`), no en una ruta del panel: es el link
   * que el comerciante reparte por WhatsApp, y ahí el nombre importa.
   */
  get enlacePublico(): string {
    // El valor por defecto no sobra: los environments están en .gitignore, así
    // que una copia del repo compilada en otra máquina no trae `dominioSitios`
    // y el enlace saldría como "mi-tienda.undefined" sin que nada falle.
    return `https://${this.slug}.${environment.dominioSitios || "katuq.com"}`;
  }

  copiarEnlace(): void {
    navigator.clipboard.writeText(this.enlacePublico).then(
      () => this.toastr.success("Enlace copiado"),
      () => this.toastr.info(this.enlacePublico, "Copia el enlace")
    );
  }

  verPublicado(): void {
    window.open(this.enlacePublico, "_blank");
  }

  /**
   * Aviso del navegador al cerrar la pestaña o recargar con trabajo sin
   * guardar. El editor ya sabía que había cambios pendientes, pero no lo decía
   * en ningún lado: se cerraba la pestaña y se perdía la página a medio armar.
   */
  @HostListener("window:beforeunload", ["$event"])
  avisarAntesDeCerrar(evento: BeforeUnloadEvent): void {
    if (!this.sucio) return;
    evento.preventDefault();
    // Los navegadores muestran su propio texto; lo que importa es que el valor
    // no sea vacío para que aparezca el diálogo.
    evento.returnValue = "Tienes cambios sin guardar.";
  }

  volver(): void {
    if (this.sucio && !confirm("Tienes cambios sin guardar. ¿Salir y perderlos?")) return;
    this.router.navigate(["/sitios"]);
  }
}
