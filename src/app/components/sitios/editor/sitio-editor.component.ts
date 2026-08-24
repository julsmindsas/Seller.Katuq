import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { ToastrService } from "ngx-toastr";
import { environment } from "../../../../environments/environment";
import { BloqueSitio } from "../../sitio-render/sitio-render.component";
import { ContenidoSitio, Sitio, SitiosService, VentaConfig } from "../sitios.service";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";

/** Tipos de bloque que se pueden agregar, con su nombre en cristiano. */
const CATALOGO_BLOQUES: { tipo: string; nombre: string; descripcion: string; icono: string }[] = [
  {
    tipo: "encabezado",
    nombre: "Encabezado con tu logo",
    descripcion: "Tu marca arriba, siempre visible",
    icono: "M3 5h18v5H3zM6 15h6",
  },
  {
    tipo: "anuncio",
    nombre: "Barra de anuncios",
    descripcion: "Una franja arriba: envío gratis, rebajas, lo que quieras gritar",
    icono: "M3 6h18v4H3zM7 14h10",
  },
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
    tipo: "seccion",
    // Es LA sección donde se compone a mano: la única que se puede colocar
    // libremente. El nombre viejo —"Sección libre"— no lo estaba diciendo, y se
    // notaba: estaba en la paleta y en cero plantillas.
    nombre: "Componer a mano",
    descripcion: "La única que se coloca libre: arrastra cada cosa donde quieras",
    icono: "M4 5h16v14H4zM8 9l3 3-3 3M14 15h3",
  },
  {
    tipo: "columnas",
    nombre: "Columnas",
    descripcion: "Dos o tres ideas lado a lado",
    icono: "M4 5h5v14H4zM15 5h5v14h-5z",
  },
  {
    tipo: "imagen",
    nombre: "Una imagen",
    descripcion: "Una foto sola, a lo ancho si quieres",
    icono: "M3 5h18v14H3zM8 11l3 3 3-4 5 5",
  },
  {
    tipo: "botones",
    nombre: "Botones",
    descripcion: "Varios caminos: comprar, escribir, ver",
    icono: "M4 8h16v8H4zM8 12h8",
  },
  {
    tipo: "separador",
    nombre: "Espacio o línea",
    descripcion: "Aire entre secciones",
    icono: "M4 12h16",
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
    tipo: "catalogo",
    nombre: "Catálogo completo",
    descripcion: "Todo lo que vendes, con buscador y categorías",
    icono: "M4 6h16M4 12h16M4 18h10M20 16l2 2-2 2",
  },
  {
    tipo: "categorias",
    nombre: "Compra por categoría",
    descripcion: "Baldosas con tus categorías; se llenan solas desde tu catálogo",
    icono: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  },
  {
    tipo: "promo",
    nombre: "Imagen con texto",
    descripcion: "Una foto a un lado y tu argumento al otro, con botón",
    icono: "M3 5h8v14H3zM14 8h7M14 12h7M14 16h4",
  },
  {
    tipo: "destacado",
    nombre: "Producto destacado",
    descripcion: "Uno solo, con espacio para lucirse y botón de compra",
    icono: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z",
  },
  {
    tipo: "contador",
    nombre: "Cuenta regresiva",
    descripcion: "La oferta termina en… urgencia de verdad, con reloj",
    icono: "M12 8v5l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 2h6",
  },
  {
    tipo: "suscripcion",
    nombre: "Boletín",
    descripcion: "Pide solo el correo; el contacto entra a tu CRM",
    icono: "M3 6h18v12H3zM3 7l9 6 9-6",
  },
  {
    tipo: "marcas",
    nombre: "Franja de marcas",
    descripcion: "Los logos de las marcas que vendes o que confían en ti",
    icono: "M3 9h4v6H3zM10 9h4v6h-4zM17 9h4v6h-4z",
  },
  {
    tipo: "instagram",
    nombre: "Instagram",
    descripcion: "Una rejilla de fotos que lleva a tu perfil",
    icono: "M4 4h16v16H4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM16.8 7.2h.01",
  },
  {
    tipo: "video",
    nombre: "Video",
    descripcion: "De YouTube o Vimeo, para mostrar tu trabajo",
    icono: "M4 5h16v14H4zM10 9l5 3-5 3z",
  },
  {
    tipo: "resenas",
    nombre: "Lo que dicen tus clientes",
    descripcion: "Testimonios con estrellas",
    icono: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z",
  },
  {
    tipo: "ubicacion",
    nombre: "Dónde estás",
    descripcion: "Dirección, horario y cómo llegar",
    icono: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z M12 10h.01",
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

/**
 * Secciones ya armadas.
 *
 * Un comerciante no piensa en "un bloque de columnas": piensa en "quiero contar
 * cómo trabajo en tres pasos". Estas son las mismas piezas de siempre, pero con
 * el contenido y el estilo ya puestos, listas para editar encima.
 *
 * `datos` y `estilo` se copian tal cual al agregar; el backend los sanea igual
 * que cualquier otra entrada.
 */
const SECCIONES_LISTAS: {
  id: string;
  nombre: string;
  pista: string;
  grupo: string;
  tipo: string;
  datos: any;
  estilo?: any;
}[] = [
  // ── Empezar ───────────────────────────────────────────────────────────────
  {
    id: "portada-foto",
    nombre: "Portada con foto",
    pista: "Una imagen grande, tu frase y un botón",
    grupo: "Para empezar",
    tipo: "hero",
    datos: {
      titulo: "Tu marca, como se merece",
      subtitulo: "Escribe aquí lo que te hace distinto, en una línea.",
      ctaTexto: "Ver productos",
      ctaUrl: "#productos",
      alineacion: "centro",
      altura: "completa",
      velo: 45,
      imagen: "",
    },
  },
  {
    id: "portada-simple",
    nombre: "Portada sencilla",
    pista: "Sin foto, con color de fondo",
    grupo: "Para empezar",
    tipo: "hero",
    datos: {
      titulo: "Bienvenido",
      subtitulo: "Cuéntale a tu cliente qué va a encontrar aquí.",
      ctaTexto: "Escríbenos",
      ctaUrl: "#contacto",
      alineacion: "centro",
      altura: "normal",
      velo: 0,
    },
    estilo: { fondo: "#f3f0ff", espaciado: "amplio" },
  },

  // ── Contar ────────────────────────────────────────────────────────────────
  {
    id: "tres-pasos",
    nombre: "Cómo trabajamos, en 3 pasos",
    pista: "Tres columnas cortas",
    grupo: "Contar tu historia",
    tipo: "columnas",
    datos: {
      titulo: "Cómo trabajamos",
      columnas: [
        { titulo: "1. Pides", cuerpo: "Escríbenos por WhatsApp o desde esta página.", imagen: "", ctaTexto: "", ctaUrl: "" },
        { titulo: "2. Preparamos", cuerpo: "Alistamos tu pedido con cuidado.", imagen: "", ctaTexto: "", ctaUrl: "" },
        { titulo: "3. Recibes", cuerpo: "Te lo llevamos hasta la puerta.", imagen: "", ctaTexto: "", ctaUrl: "" },
      ],
    },
  },
  {
    id: "sobre-nosotros",
    nombre: "Sobre nosotros",
    pista: "Un texto con viñetas",
    grupo: "Contar tu historia",
    tipo: "texto",
    datos: {
      titulo: "Quiénes somos",
      cuerpo:
        "Cuenta tu historia en dos o tres líneas.\n\n- Lo que te hace distinto\n- Por qué confiar en ti\n- Desde cuándo estás",
    },
  },
  {
    id: "franja-frase",
    nombre: "Franja con una frase",
    pista: "Fondo oscuro, una idea fuerte",
    grupo: "Contar tu historia",
    tipo: "texto",
    datos: { titulo: "", cuerpo: "*Hecho a mano, como debe ser.*" },
    estilo: { fondo: "#211d33", colorTexto: "#ffffff", espaciado: "amplio", ancho: "completo", alineacion: "centro" },
  },

  // ── Vender ────────────────────────────────────────────────────────────────
  {
    id: "destacados",
    nombre: "Productos destacados",
    pista: "Los que tú elijas",
    grupo: "Vender",
    tipo: "productos",
    datos: { titulo: "Lo más pedido", productoIds: [], permitirCompra: false },
  },
  {
    id: "catalogo-completo",
    nombre: "Todo mi catálogo",
    pista: "Con buscador y categorías",
    grupo: "Vender",
    tipo: "catalogo",
    datos: { titulo: "Nuestra tienda", mostrarBuscador: true, mostrarCategorias: true, permitirCompra: false },
  },
  {
    id: "llamado-doble",
    nombre: "Dos caminos",
    pista: "Comprar o escribir, lado a lado",
    grupo: "Vender",
    tipo: "botones",
    datos: {
      botones: [
        { etiqueta: "Ver productos", url: "#productos", estilo: "principal" },
        { etiqueta: "Escríbenos", url: "#contacto", estilo: "secundario" },
      ],
    },
    estilo: { alineacion: "centro", espaciado: "compacto" },
  },

  // ── Confianza ─────────────────────────────────────────────────────────────
  {
    id: "resenas-tres",
    nombre: "Lo que dicen tus clientes",
    pista: "Tres testimonios",
    grupo: "Dar confianza",
    tipo: "resenas",
    datos: {
      titulo: "Lo que dicen nuestros clientes",
      items: [
        { texto: "Escribe aquí lo que te dijo un cliente.", autor: "", estrellas: 5 },
        { texto: "Otro comentario real de alguien que te compró.", autor: "", estrellas: 5 },
        { texto: "Uno más, con su nombre si te dio permiso.", autor: "", estrellas: 5 },
      ],
    },
    estilo: { fondo: "#f7f7fb", espaciado: "amplio" },
  },
  {
    id: "preguntas",
    nombre: "Preguntas frecuentes",
    pista: "Responde antes de que pregunten",
    grupo: "Dar confianza",
    tipo: "faq",
    datos: {
      titulo: "Preguntas frecuentes",
      preguntas: [
        { pregunta: "¿Hacen envíos?", respuesta: "Sí, cuéntanos a dónde y te decimos el costo." },
        { pregunta: "¿Cómo puedo pagar?", respuesta: "Escríbenos y te contamos los medios disponibles." },
      ],
    },
  },
  {
    id: "donde-estamos",
    nombre: "Dónde estamos",
    pista: "Dirección, horario y cómo llegar",
    grupo: "Dar confianza",
    tipo: "ubicacion",
    datos: { titulo: "Dónde estamos", direccion: "", ciudad: "", referencia: "", horario: "" },
  },

  // ── Contacto ──────────────────────────────────────────────────────────────
  {
    id: "boton-whatsapp",
    nombre: "Botón de WhatsApp",
    pista: "El camino más corto a una venta",
    grupo: "Que te contacten",
    tipo: "whatsapp",
    datos: { telefono: "", mensaje: "Hola, vi su página y quiero preguntar por…", etiqueta: "Escríbenos por WhatsApp" },
    estilo: { espaciado: "compacto" },
  },
  {
    id: "formulario-datos",
    nombre: "Formulario de contacto",
    pista: "Los datos llegan a tu CRM",
    grupo: "Que te contacten",
    tipo: "formulario",
    datos: {
      titulo: "Déjanos tus datos",
      descripcion: "Te contactamos hoy mismo.",
      pedirTelefono: true,
      pedirEmail: true,
      pedirMensaje: true,
      textoBoton: "Enviar",
    },
    estilo: { fondo: "#f7f7fb", espaciado: "amplio" },
  },
];
/** Valores iniciales de un bloque recién agregado. */
const BLOQUE_NUEVO: { [tipo: string]: any } = {
  // El logo no va aquí: sale del kit de marca de la empresa al renderizar.
  encabezado: { nombre: "", mostrarLogo: true, enlaces: [], ctaTexto: "", ctaUrl: "", fijo: false, mostrarCategorias: false },
  anuncio: { texto: "Envíos a todo el país", url: "", marquesina: true },
  categorias: { titulo: "Compra por categoría", maximo: 6 },
  promo: {
    etiqueta: "Nuevo",
    titulo: "Una historia que vende",
    cuerpo: "Cuenta aquí por qué esto vale la pena: qué lo hace distinto y qué gana quien lo compra.",
    imagen: "",
    lado: "izquierda",
    ctaTexto: "",
    ctaUrl: "",
  },
  destacado: { etiqueta: "Producto destacado", productoId: "", permitirCompra: true },
  contador: { titulo: "La oferta termina en", hasta: "", mensajeFin: "La oferta terminó", ctaTexto: "", ctaUrl: "" },
  suscripcion: { titulo: "Entérate primero", descripcion: "Novedades y rebajas antes que nadie, sin spam.", textoBoton: "Suscribirme" },
  marcas: { titulo: "Trabajamos con", logos: [] },
  instagram: { titulo: "Síguenos en Instagram", usuario: "", fotos: [] },
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
  columnas: {
    titulo: "Cómo trabajamos",
    columnas: [
      { imagen: "", titulo: "Pides", cuerpo: "", ctaTexto: "", ctaUrl: "" },
      { imagen: "", titulo: "Enviamos", cuerpo: "", ctaTexto: "", ctaUrl: "" },
    ],
  },
  seccion: { titulo: "", columnas: 1 },
  imagen: { url: "", alt: "", enlace: "", tamano: "normal" },
  botones: { botones: [{ etiqueta: "Comprar", url: "#productos", estilo: "principal" }] },
  separador: { linea: false, alto: "medio" },
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
  catalogo: {
    titulo: "Nuestro catálogo",
    mostrarBuscador: true,
    mostrarCategorias: true,
    permitirCompra: false,
  },
  video: { titulo: "Míranos en video", proveedor: "youtube", videoId: "" },
  resenas: {
    titulo: "Lo que dicen nuestros clientes",
    items: [{ texto: "", autor: "", estrellas: 5 }],
  },
  ubicacion: { titulo: "Dónde estamos", direccion: "", ciudad: "", referencia: "", horario: "" },
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

  /** El panel de estilo de sección arranca plegado: es para afinar, no para empezar. */
  mostrandoEstilo = false;

  /**
   * Fondos de franja sugeridos. Son grises y cremas muy claros a propósito:
   * el color fuerte de la página es el de la marca, y una franja saturada se
   * lo come.
   */
  fondosSugeridos = ["#f7f7fb", "#f3f0ff", "#fff8f0", "#f2f9f5", "#211d33"];

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

  /**
   * Logo y nombre de la empresa, para que la vista previa dibuje el encabezado
   * igual que la página publicada. No son del sitio: viven en el kit de marca.
   */
  logo = "";
  negocio = "";
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

    // Las maquetas viajan con las plantillas. Si la petición falla, el editor
    // sigue funcionando: simplemente no ofrece elegir forma, y las perillas de
    // siempre quedan ahí.
    this.service.plantillas().subscribe({
      next: (res: any) => {
        this.maquetas = (res && res.meta && res.meta.maquetas) || [];
        // Los vestidos SON los temas de las plantillas: once combinaciones de
        // color, tipografías y estilo de página que ya están hechas y que ya se
        // distinguen entre sí. No hace falta inventar otra lista.
        this.vestidos = ((res && res.data) || [])
          .filter((p: any) => p && p.tema && p.tema.estilo)
          .map((p: any) => ({ id: p.id, nombre: p.nombre, tema: p.tema }));
      },
      error: () => {
        this.maquetas = [];
        this.vestidos = [];
      },
    });

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
        this.cargarMarca();
        this.iniciarHistorial();
      },
      error: () => {
        this.cargando = false;
        this.error = "No encontramos esta página.";
      },
    });
  }

  /**
   * Kit de marca de la empresa, solo para pintar el encabezado en la vista
   * previa. Si falla no se avisa: el editor sirve igual, el encabezado se verá
   * sin logo y el propio bloque explica dónde subirlo.
   */
  private cargarMarca(): void {
    this.service.kitDeMarca().subscribe({
      next: (res) => {
        const kit = res && res.data;
        if (!kit) return;
        this.logo = kit.logo || "";
        this.negocio = kit.nombreComercial || "";
      },
      error: () => undefined,
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
    // El aviso es de la maqueta que se acaba de elegir, no del bloque: al
    // cambiar de sección deja de venir a cuento.
    this.avisoMaqueta = "";
  }

  /**
   * Un texto se editó directamente sobre la vista previa.
   *
   * El render no toca el modelo: avisa qué campo cambió y aquí se escribe. Así
   * el historial, el "hay cambios sin guardar" y el guardado siguen pasando por
   * un solo camino, el mismo que usa el panel lateral.
   */
  aplicarTextoEditado(cambio: { bloqueId: string; campo: string; valor: string; indice?: number }): void {
    const bloque = this.bloques.find((b) => b.id === cambio.bloqueId);
    if (!bloque) return;

    const destino =
      cambio.indice === undefined ? bloque.datos : (bloque.datos.columnas || [])[cambio.indice];
    if (!destino || destino[cambio.campo] === cambio.valor) return;

    destino[cambio.campo] = cambio.valor;
    // El bloque tocado pasa a ser el seleccionado: el panel muestra lo mismo
    // que se acaba de editar en la página.
    this.seleccionarPorId(cambio.bloqueId);
    this.marcarSucio();
  }

  /**
   * Un elemento se soltó en otro punto del lienzo. La previa solo avisa; el
   * modelo se escribe aquí, para que el movimiento entre al historial de
   * deshacer igual que cualquier otro cambio.
   */
  aplicarElementoMovido(cambio: { bloqueId: string; indice: number; x: number; y: number; w: number }): void {
    const bloque = this.bloques.find((b) => b.id === cambio.bloqueId);
    const elemento = bloque && (bloque.elementos || [])[cambio.indice];
    if (!elemento) return;

    const pos = this.posDe(elemento);
    if (pos.x === cambio.x && pos.y === cambio.y && pos.w === cambio.w) return;

    pos.x = cambio.x;
    pos.y = cambio.y;
    pos.w = cambio.w;
    // La lista de elementos manda el orden en celular, donde no hay lienzo:
    // se reordena por dónde quedó cada uno para que la página en el teléfono
    // se lea en el mismo orden en que se ve en el computador.
    this.ordenarPorPosicion(bloque);
    this.marcarSucio();
  }

  /** De arriba a abajo y, a igual altura, de izquierda a derecha. */
  private ordenarPorPosicion(bloque: any): void {
    if (!bloque.lienzo || !(bloque.elementos || []).length) return;
    bloque.elementos.sort((a: any, b: any) => {
      const pa = a.pos || {};
      const pb = b.pos || {};
      const ya = typeof pa.y === "number" ? pa.y : 0;
      const yb = typeof pb.y === "number" ? pb.y : 0;
      // Dos cosas a la misma altura son "la misma fila" aunque difieran un
      // pelo: sin esta tolerancia, el orden en celular cambiaría por un píxel.
      if (Math.abs(ya - yb) > 4) return ya - yb;
      return (typeof pa.x === "number" ? pa.x : 0) - (typeof pb.x === "number" ? pb.x : 0);
    });
  }

  seleccionarPorId(bloqueId: string): void {
    const i = this.bloques.findIndex((b) => b.id === bloqueId);
    if (i >= 0) this.seleccionar(i);
  }

  // ── Operaciones sobre bloques ──────────────────────────────────────────────

  // ── Secciones ya armadas ───────────────────────────────────────────────────

  seccionesListas = SECCIONES_LISTAS;
  /** Se muestran agrupadas por para qué sirven, no por tipo de bloque. */
  gruposDeSecciones = [...new Set(SECCIONES_LISTAS.map((s) => s.grupo))];
  /** El catálogo crudo de tipos queda detrás de "empezar desde cero". */
  mostrandoTiposCrudos = false;

  seccionesDelGrupo(grupo: string) {
    return this.seccionesListas.filter((s) => s.grupo === grupo);
  }

  /**
   * Agrega una sección ya armada. Es el mismo `agregar` de siempre, pero con el
   * contenido puesto: el comerciante edita encima en vez de mirar una caja
   * vacía sin saber qué escribir.
   */
  agregarSeccionLista(id: string): void {
    const preset = this.seccionesListas.find((s) => s.id === id);
    if (!preset || !this.contenido) return;

    const bloque: any = {
      id: `b_${Date.now()}_${preset.tipo}`,
      tipo: preset.tipo,
      visible: true,
      datos: JSON.parse(JSON.stringify(preset.datos)),
    };
    if (preset.estilo) bloque.estilo = JSON.parse(JSON.stringify(preset.estilo));

    this.contenido.bloques = [...this.bloques, bloque];
    this.seleccionado = this.contenido.bloques.length - 1;
    this.mostrandoAgregar = false;
    this.mostrandoTiposCrudos = false;
    this.marcarSucio();
  }

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

  /** Si la página ya tiene un bloque de este tipo (para avisos entre bloques). */
  hayBloque(tipo: string): boolean {
    return this.bloques.some((b) => b.tipo === tipo);
  }

  // ── Producto destacado: buscador de UN producto ────────────────────────────
  // Reusa el buscador del catálogo (filtra por empresa e inyecta stock). Los
  // nombres elegidos se guardan solo en memoria para mostrarlos; el bloque
  // persiste únicamente el id, como el bloque de productos.
  busquedaDestacado = "";
  buscandoDestacado = false;
  resultadosDestacado: { cd: string; titulo: string }[] = [];
  nombreDestacado: { [id: string]: string } = {};

  buscarProductoDestacado(): void {
    const termino = this.busquedaDestacado.trim();
    if (termino.length < 2) return;
    this.buscandoDestacado = true;
    this.service.buscarProductos(termino).subscribe({
      next: (res) => {
        this.buscandoDestacado = false;
        this.resultadosDestacado = (res.products || []).slice(0, 8).map((p) => ({
          cd: p.cd,
          titulo: (p.crearProducto && p.crearProducto.titulo) || p.cd,
        }));
      },
      error: () => {
        this.buscandoDestacado = false;
        this.resultadosDestacado = [];
      },
    });
  }

  elegirDestacado(bloque: any, p: { cd: string; titulo: string }): void {
    bloque.datos.productoId = p.cd;
    this.nombreDestacado[p.cd] = p.titulo;
    this.resultadosDestacado = [];
    this.busquedaDestacado = "";
    this.marcarSucio();
  }

  quitarLogoMarcas(bloque: any, i: number): void {
    bloque.datos.logos.splice(i, 1);
    this.marcarSucio();
  }

  quitarFotoCarrusel(bloque: any, i: number): void {
    bloque.datos.imagenes.splice(i, 1);
    this.marcarSucio();
  }

  quitarFotoInstagram(bloque: any, i: number): void {
    bloque.datos.fotos.splice(i, 1);
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

  /**
   * Reordenar arrastrando. Las flechas se conservan: con el teclado, o en un
   * celular, arrastrar no siempre es posible.
   */
  soltarSeccion(evento: CdkDragDrop<any>): void {
    if (!this.contenido) return;
    const desde = evento.previousIndex;
    const hasta = evento.currentIndex;
    if (desde === hasta) return;

    const nuevos = [...this.bloques];
    moveItemInArray(nuevos, desde, hasta);
    this.contenido.bloques = nuevos;

    // La selección sigue al bloque movido, no a la posición.
    if (this.seleccionado === desde) this.seleccionado = hasta;
    else if (this.seleccionado > desde && this.seleccionado <= hasta) this.seleccionado--;
    else if (this.seleccionado < desde && this.seleccionado >= hasta) this.seleccionado++;

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

  // ── Columnas y botones ─────────────────────────────────────────────────────

  // ── Elementos dentro de una sección libre ──────────────────────────────────

  /** Lo que se puede meter en una sección, con nombre entendible. */
  tiposDeElemento = [
    { tipo: "titulo", nombre: "+ Título" },
    { tipo: "texto", nombre: "+ Texto" },
    { tipo: "boton", nombre: "+ Botón" },
    { tipo: "tarjetas", nombre: "+ Tarjetas" },
    { tipo: "imagen", nombre: "+ Imagen" },
    { tipo: "espacio", nombre: "+ Espacio" },
  ];

  /** Los mismos íconos que dibujan el servidor y la vista previa. */
  iconosDisponibles = [
    "envio", "garantia", "pago", "reloj", "estrella", "corazon",
    "chat", "ubicacion", "regalo", "hoja", "escudo", "rayo",
  ];

  private static readonly TRAZOS_ICONO: { [k: string]: string } = {
    envio: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    garantia: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z M9 12l2 2 4-4",
    pago: "M2 7h20v10H2zM2 11h20M6 15h3",
    reloj: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2",
    estrella: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z",
    corazon: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z",
    chat: "M4 5h16v11H8l-4 3z",
    ubicacion: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 10h.01",
    regalo: "M3 11h18v9H3zM3 7h18v4H3zM12 7v13M8 7a2.5 2.5 0 1 1 4-2c2-2 4-1 4 1 0 1-1 1-1 1z",
    hoja: "M20 4C10 4 4 9 4 17c0 1 0 2 1 3 6-9 9-10 15-11z",
    escudo: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
    rayo: "M13 3 5 14h6l-1 7 8-11h-6z",
  };

  trazoIcono(nombre: string): string {
    return SitioEditorComponent.TRAZOS_ICONO[nombre] || "";
  }

  // ── Dónde va cada elemento ─────────────────────────────────────────────────

  /**
   * Anchos posibles, sobre una rejilla de seis columnas. No son píxeles a
   * propósito: en celular todo pasa a ancho completo, y con coordenadas habría
   * que mantener un diseño aparte para móvil.
   */
  anchos = [
    { id: "completo", nombre: "Todo el ancho", corto: "100%" },
    { id: "dosTercios", nombre: "Dos tercios", corto: "⅔" },
    { id: "mitad", nombre: "La mitad", corto: "½" },
    { id: "tercio", nombre: "Un tercio", corto: "⅓" },
  ];

  alineaciones = [
    { id: "izquierda", nombre: "A la izquierda", icono: "M4 6h16M4 12h10M4 18h13" },
    { id: "centro", nombre: "Centrado", icono: "M4 6h16M7 12h10M6 18h12" },
    { id: "derecha", nombre: "A la derecha", icono: "M4 6h16M10 12h10M7 18h13" },
  ];

  /** La posición se crea al tocarla; antes el elemento no la lleva. */
  posDe(elemento: any): any {
    if (!elemento.pos) elemento.pos = { ancho: "completo", alineacion: "izquierda" };
    return elemento.pos;
  }

  cambiarPos(elemento: any, campo: "ancho" | "alineacion", valor: string): void {
    this.posDe(elemento)[campo] = valor;
    this.marcarSucio();
  }

  // ── Lienzo: colocar cada elemento donde uno quiera ─────────────────────────

  /** Cuánto ocupa cada ancho de la rejilla, en porcentaje. */
  private static readonly ANCHO_EN_PORCENTAJE: { [id: string]: number } = {
    completo: 100,
    dosTercios: 66.6,
    mitad: 50,
    tercio: 33.3,
  };

  ALTO_LIENZO_MIN = 160;
  ALTO_LIENZO_MAX = 2000;
  /** Alto de arranque cuando se prende el lienzo en una sección todavía vacía. */
  ALTO_LIENZO_VACIO = 360;

  /**
   * Los bloques que se llenan solos contra el maestro de productos. Ahí la
   * disposición la decide el dato, no el comerciante: la vitrina, el catálogo
   * con su buscador y su paginación, el destacado, las baldosas de categoría y
   * el encabezado con su menú real y su carrito.
   *
   * Son los únicos donde NO se puede componer a mano. Todo lo demás sí.
   */
  private static readonly BLOQUES_CONECTADOS = [
    "catalogo",
    "productos",
    "destacado",
    "categorias",
    "encabezado",
  ];

  /** ¿Este bloque se puede colocar a mano? */
  permiteLienzo(bloque: any): boolean {
    return !!bloque && !SitioEditorComponent.BLOQUES_CONECTADOS.includes(bloque.tipo);
  }

  // ── Maquetas: las formas con nombre de un bloque ───────────────────────────
  // Llegan del servidor con las plantillas, igual que los objetivos, para que el
  // editor no tenga su propia copia y se desfase. No agregan capacidad: son
  // combinaciones que el bloque ya acepta, bautizadas para elegirlas mirando.

  maquetas: any[] = [];

  // ── Vestidos: el look completo de otra plantilla ───────────────────────────
  // Cada plantilla tiene su tema propio —color, tipografías y estilo de página—
  // y son once combinaciones distintas. Probárselas sobre el contenido ya
  // escrito ataca de frente el "esta página no se parece a mi marca", que es el
  // reclamo real detrás de "quiero mover las cosas".
  //
  // REGLA: el vestido es apariencia y NUNCA estructura. No toca los bloques, ni
  // su orden, ni sus textos, ni sus productos. Por eso probárselo no puede
  // hacerle perder nada a nadie, y por eso no hace falta confirmar nada.

  vestidos: { id: string; nombre: string; tema: any }[] = [];

  /** El tema tal como estaba antes de empezar a probarse vestidos. */
  temaAnterior: any = null;

  /**
   * Por defecto se respeta la marca del comercio: quien ya definió sus colores
   * no quiere que probarse una letra nueva se los borre.
   */
  conservarMisColores = true;

  /** Qué vestido lleva puesto, si es que reconoce alguno. */
  get vestidoActivo(): string {
    const t = (this.contenido && this.contenido.tema) as any;
    if (!t) return "";
    const igual = this.vestidos.find(
      (v) =>
        v.tema.estilo === t.estilo &&
        v.tema.fuenteTitulo === t.fuenteTitulo &&
        v.tema.fuenteCuerpo === t.fuenteCuerpo &&
        (this.conservarMisColores || v.tema.colorPrimario === t.colorPrimario)
    );
    return igual ? igual.id : "";
  }

  probarVestido(vestido: { id: string; nombre: string; tema: any }): void {
    // Se guarda el punto de partida la PRIMERA vez, no en cada prueba: así
    // "volver al de antes" devuelve al look con el que llegó, no al anterior
    // de la cadena de pruebas.
    if (!this.temaAnterior) this.temaAnterior = { ...(this.contenido.tema as any) };

    const v = vestido.tema || {};
    const nuevo: any = {
      ...(this.contenido.tema as any),
      estilo: v.estilo,
      fuenteTitulo: v.fuenteTitulo,
      fuenteCuerpo: v.fuenteCuerpo,
      tipografia: v.tipografia,
    };
    if (!this.conservarMisColores) {
      nuevo.colorPrimario = v.colorPrimario;
      nuevo.colorSecundario = v.colorSecundario;
      nuevo.colorTexto = v.colorTexto;
    }
    this.contenido.tema = nuevo;
    this.marcarSucio();
  }

  descartarVestido(): void {
    if (!this.temaAnterior) return;
    this.contenido.tema = { ...this.temaAnterior };
    this.temaAnterior = null;
    this.marcarSucio();
  }

  /** El nombre en cristiano de una tipografía, para la tarjeta del vestido. */
  nombreDeFuente(id: string): string {
    const encontrada = TIPOGRAFIAS.find((f) => f.id === id);
    return encontrada ? encontrada.nombre : "Del sistema";
  }

  /** Las de este bloque. Vacío en los que no tienen dónde elegir. */
  maquetasDe(bloque: any): any[] {
    if (!bloque) return [];
    return this.maquetas.filter((m) => m.bloque === bloque.tipo);
  }

  /** Qué foto lleva el bloque ahora. Misma regla que el servidor. */
  private modoDeFoto(datos: any): string {
    const d = datos || {};
    if ((d.mosaico || []).length >= 2) return "mosaico";
    if ((d.imagenes || []).length >= 2) return "carrusel";
    if (d.imagen) return "una";
    return "ninguna";
  }

  /**
   * Cuál lleva puesta. Se DEDUCE de los valores en vez de guardarse: guardar el
   * nombre obligaría a mantenerlo al día cada vez que se mueve una perilla a
   * mano, y el día que se desfasara el editor señalaría una maqueta que la
   * página ya no tiene.
   */
  maquetaActiva(bloque: any): any {
    if (!bloque) return null;
    const d = bloque.datos || {};
    const modo = this.modoDeFoto(d);
    return (
      this.maquetasDe(bloque).find(
        (m) => m.foto === modo && Object.keys(m.forma).every((c) => d[c] === m.forma[c])
      ) || null
    );
  }

  /**
   * Aplica una maqueta. Solo toca los campos de FORMA: los textos, las fotos y
   * los destinos se quedan como estén, así que probarse maquetas no puede
   * hacerle perder nada a nadie.
   */
  aplicarMaqueta(bloque: any, maqueta: any): void {
    Object.keys(maqueta.forma).forEach((campo) => {
      bloque.datos[campo] = maqueta.forma[campo];
    });
    // Si le falta la foto que esa forma necesita, se dice en el momento: si no,
    // el comerciante elige "Mosaico", no ve ningún cambio y no sabe por qué.
    this.avisoMaqueta = this.faltaParaMaqueta(bloque, maqueta);
    this.marcarSucio();
  }

  /** Lo que hay que decirle sobre la maqueta que acaba de elegir. */
  avisoMaqueta = "";

  /**
   * Qué le falta al bloque para que la maqueta se vea como promete. La maqueta
   * no sube fotos por su cuenta — son del comerciante —, así que se le dice.
   */
  faltaParaMaqueta(bloque: any, maqueta: any): string {
    if (this.modoDeFoto(bloque.datos) === maqueta.foto) return "";
    const PIDE: { [id: string]: string } = {
      una: "Sube una foto de portada para que se vea así",
      mosaico: "Sube de 2 a 4 fotos al mosaico para que se vea así",
      carrusel: "Sube 2 o más fotos al carrusel para que se vea así",
      ninguna: "Quita la foto de portada para que se vea así",
    };
    return PIDE[maqueta.foto] || "";
  }

  /**
   * Trazo del dibujito de cada maqueta. Es una miniatura, no un icono: lo que
   * tiene que transmitir es dónde queda cada cosa.
   *
   * Se dibuja con `fill-rule="evenodd"`, así que las formas interiores no se
   * pintan encima del fondo: lo perforan. Por eso los textos y los huecos se ven.
   */
  dibujoDeMaqueta(id: string): string {
    const DIBUJOS: { [id: string]: string } = {
      // ── Portada ──
      cartel: "M2 2h36v24H2z M13 12h14v2H13z M16 17h8v1.5h-8z",
      lateral: "M2 2h36v24H2z M6 11h13v2H6z M6 16h9v1.5H6z",
      clara: "M2 2h36v24H2z M9 11h22v3H9z M13 17h14v2H13z",
      banda: "M2 7h36v14H2z M23 12h13v2H23z M27 17h9v1.5h-9z",
      mosaico:
        "M2 2h17v24H2z M5 10h11v2H5z M5 15h7v1.5H5z M21 2h8v11h-8z M31 2h7v11h-7z M21 15h8v11h-8z M31 15h7v11h-7z",
      carrusel: "M2 2h36v24H2z M13 11h14v2H13z M15 21h2v2h-2z M19 21h2v2h-2z M23 21h2v2h-2z",
      tipografica: "M8 9h24v3H8z M12 15h16v2H12z M15 20h10v1.5H15z",

      // ── Encabezado ──
      // La barra de arriba con sus huecos, y debajo el cuerpo insinuado.
      "encabezado-minimo": "M2 3h36v8H2z M5 5.5h5v3H5z M7 16h26v2H7z M7 21h17v2H7z",
      "encabezado-menu":
        "M2 3h36v7H2z M5 5h4v3H5z M2 11h36v4H2z M5 12.5h6v1H5z M13 12.5h6v1h-6z M21 12.5h6v1h-6z M7 20h26v2H7z",
      "encabezado-tienda":
        "M2 3h36v7H2z M5 5h4v3H5z M20 5.5h9v2h-9z M31 5h4v3h-4z M2 11h36v4H2z M5 12.5h6v1H5z M13 12.5h6v1h-6z M21 12.5h6v1h-6z M7 20h26v2H7z",
      "encabezado-compra":
        "M2 3h36v8H2z M5 5.5h4v3H5z M18 6h10v2H18z M30 5.5h4v3h-4z M7 16h26v2H7z M7 21h17v2H7z",
      "encabezado-nombre": "M2 3h36v8H2z M5 5.5h13v3H5z M7 16h26v2H7z M7 21h17v2H7z",

      // ── Catálogo ──
      // Buscador, fila de categorías y la rejilla de productos.
      "catalogo-completo":
        "M2 2h36v5H2z M5 3.5h13v2H5z M2 9h9v3H2z M13 9h9v3h-9z M24 9h9v3h-9z M2 14h11v11H2z M14.5 14h11v11h-11z M27 14h11v11H27z",
      "catalogo-buscador":
        "M2 2h36v5H2z M5 3.5h13v2H5z M2 10h11v14H2z M14.5 10h11v14h-11z M27 10h11v14H27z",
      "catalogo-simple":
        "M2 3h11v10H2z M14.5 3h11v10h-11z M27 3h11v10H27z M2 15h11v10H2z M14.5 15h11v10h-11z M27 15h11v10H27z",
    };
    return DIBUJOS[id] || "M2 2h36v24H2z";
  }

  enLienzo(bloque: any): boolean {
    return !!(bloque && bloque.lienzo) && this.permiteLienzo(bloque);
  }

  /** Cuántos objetos caben: una sección que compone admite más. */
  topeDeElementos(bloque: any): number {
    return this.enLienzo(bloque) ? 30 : 12;
  }

  /**
   * Prende o apaga la colocación libre de una sección.
   *
   * Al prenderla, los elementos NO empiezan amontonados en una esquina: cada
   * uno arranca donde estaba en la rejilla, apilado y con su mismo ancho. Así
   * el comerciante ve lo mismo que tenía y de ahí mueve lo que quiera.
   *
   * Al apagarla, las coordenadas se conservan: si se arrepiente y vuelve a
   * prender el lienzo, encuentra su diseño intacto.
   *
   * Se puede prender en una sección VACÍA: es el caso de quien parte de una
   * plantilla y quiere empezar colocando a mano. Los objetos que agregue después
   * nacen ya con coordenadas (ver `agregarElemento`).
   */
  alternarLienzo(bloque: any): void {
    if (bloque.lienzo) {
      delete bloque.lienzo;
      this.marcarSucio();
      return;
    }

    const elementos = bloque.elementos || [];

    const alto = elementos.length
      ? Math.max(this.ALTO_LIENZO_MIN, Math.min(this.ALTO_LIENZO_MAX, elementos.length * 120))
      : this.ALTO_LIENZO_VACIO;
    bloque.lienzo = { alto };

    const paso = 100 / elementos.length;
    elementos.forEach((el: any, i: number) => {
      const pos = this.posDe(el);
      if (typeof pos.w === "number") return; // ya lo habían colocado antes
      const w = SitioEditorComponent.ANCHO_EN_PORCENTAJE[pos.ancho] || 100;
      pos.w = w;
      pos.x =
        pos.alineacion === "centro"
          ? Math.round((100 - w) / 2 * 10) / 10
          : pos.alineacion === "derecha"
          ? Math.round((100 - w) * 10) / 10
          : 0;
      pos.y = Math.round(i * paso * 10) / 10;
    });

    this.marcarSucio();
  }

  cambiarAltoLienzo(bloque: any, valor: any): void {
    if (!bloque.lienzo) return;
    const alto = Number(valor);
    if (!isFinite(alto)) return;
    bloque.lienzo.alto = Math.round(Math.min(this.ALTO_LIENZO_MAX, Math.max(this.ALTO_LIENZO_MIN, alto)));
    this.marcarSucio();
  }

  /** Lo que se muestra en el panel: "12% · 40% de ancho". */
  resumenDePosicion(elemento: any): string {
    const pos = elemento && elemento.pos;
    if (!pos || typeof pos.w !== "number") return "sin colocar";
    return `x ${pos.x}% · y ${pos.y}% · ancho ${pos.w}%`;
  }

  /** ¿Este elemento está colocado por coordenadas (y no por rejilla)? */
  estaColocado(elemento: any): boolean {
    return !!(elemento && elemento.pos && typeof elemento.pos.w === "number");
  }

  /**
   * Escribir una coordenada a mano, para cuando arrastrar no alcanza: alinear
   * dos cosas al milímetro con el mouse es una pelea que nadie tiene por qué dar.
   *
   * Se acota igual que en el backend —nada se sale de su sección— para que el
   * editor no muestre una posición que al guardar se corrige sola.
   */
  escribirCoordenada(
    bloque: any,
    elemento: any,
    campo: "x" | "y" | "w" | "h" | "angulo",
    valor: any
  ): void {
    if (!this.estaColocado(elemento)) return;
    const n = Number(valor);
    if (!isFinite(n)) return;

    const pos = this.posDe(elemento);
    const redondear = (v: number) => Math.round(v * 10) / 10;

    if (campo === "w") {
      pos.w = redondear(Math.min(100, Math.max(this.ANCHO_LIBRE_MIN, n)));
      // Al ensanchar, el elemento no puede quedar colgando por fuera.
      pos.x = Math.min(pos.x, redondear(100 - pos.w));
    } else if (campo === "x") {
      pos.x = redondear(Math.min(100 - pos.w, Math.max(0, n)));
    } else if (campo === "y") {
      pos.y = redondear(Math.min(100, Math.max(0, n)));
    } else if (campo === "h") {
      pos.h = redondear(Math.min(100, Math.max(this.ALTO_LIBRE_MIN, n)));
    } else {
      pos.angulo = Math.round(Math.min(180, Math.max(-180, n)));
    }

    this.ordenarPorPosicion(bloque);
    this.marcarSucio();
  }

  /** Devuelve el objeto a que crezca con su contenido, en vez de un alto fijo. */
  quitarAlto(elemento: any): void {
    if (elemento && elemento.pos) delete elemento.pos.h;
    this.marcarSucio();
  }

  /** Lo endereza. */
  quitarGiro(elemento: any): void {
    if (elemento && elemento.pos) delete elemento.pos.angulo;
    this.marcarSucio();
  }

  ALTO_LIBRE_MIN = 3;

  // ── Vestido del objeto: color, fondo y escala ──────────────────────────────
  // Hasta ahora el color vivía solo en la sección: se podía teñir una franja
  // entera pero no un título suelto. Al componer a mano eso se queda corto.

  escalas = [
    { id: "pequeno", nombre: "Pequeño" },
    { id: "normal", nombre: "Normal" },
    { id: "grande", nombre: "Grande" },
    { id: "enorme", nombre: "Enorme" },
  ];

  /**
   * El vestido de un OBJETO. Ojo con el nombre: `estiloDe` ya existe y es el de
   * la SECCIÓN. Son dos cosas distintas — el objeto hereda el de su sección
   * mientras no tenga uno propio.
   */
  estiloDeObjeto(elemento: any): any {
    if (!elemento.estilo) elemento.estilo = { colorTexto: "", fondo: "", escala: "normal" };
    return elemento.estilo;
  }

  cambiarEstiloElemento(elemento: any, campo: "colorTexto" | "fondo" | "escala", valor: any): void {
    this.estiloDeObjeto(elemento)[campo] = valor;
    this.marcarSucio();
  }

  /** Volver a heredar el color de la sección, en vez de tener uno propio. */
  quitarColor(elemento: any, campo: "colorTexto" | "fondo"): void {
    this.estiloDeObjeto(elemento)[campo] = "";
    this.marcarSucio();
  }

  ANCHO_LIBRE_MIN = 5;
  private static readonly Z_MAX = 99;

  /** ¿Hay más de un elemento colocado? Sin eso, la profundidad no significa nada. */
  puedeSuperponer(bloque: any): boolean {
    return (bloque.elementos || []).filter((el: any) => this.estaColocado(el)).length > 1;
  }

  /**
   * Quién tapa a quién. Va como campo propio del elemento y NO reordenando la
   * lista: el orden de la lista es el orden de LECTURA, y es el que manda en
   * celular, donde el lienzo se ignora. Si traer al frente reordenara, acomodar
   * algo en el monitor cambiaría en silencio cómo se lee en un teléfono.
   */
  traerAlFrente(bloque: any, elemento: any): void {
    if (!this.estaColocado(elemento)) return;
    const zetas = (bloque.elementos || [])
      .filter((el: any) => this.estaColocado(el))
      .map((el: any) => (typeof el.pos.z === "number" ? el.pos.z : 0));
    const tope = Math.max(...zetas, 0);
    this.posDe(elemento).z = Math.min(SitioEditorComponent.Z_MAX, tope + 1);
    this.marcarSucio();
  }

  enviarAtras(bloque: any, elemento: any): void {
    if (!this.estaColocado(elemento)) return;
    const zetas = (bloque.elementos || [])
      .filter((el: any) => this.estaColocado(el))
      .map((el: any) => (typeof el.pos.z === "number" ? el.pos.z : 0));
    const piso = Math.min(...zetas, 0);
    // Nadie baja de cero: en vez de eso, se sube a todos los demás. Así el
    // resultado visible es el mismo y no hay que guardar números negativos.
    if (piso <= 0) {
      (bloque.elementos || [])
        .filter((el: any) => this.estaColocado(el) && el !== elemento)
        .forEach((el: any) => {
          const z = typeof el.pos.z === "number" ? el.pos.z : 0;
          el.pos.z = Math.min(SitioEditorComponent.Z_MAX, z + 1);
        });
      this.posDe(elemento).z = 0;
    } else {
      this.posDe(elemento).z = piso - 1;
    }
    this.marcarSucio();
  }

  nombreDeElemento(tipo: string): string {
    const encontrado = this.tiposDeElemento.find((t) => t.tipo === tipo);
    return encontrado ? encontrado.nombre.replace("+ ", "") : tipo;
  }

  /** Valores iniciales de cada elemento. */
  private elementoNuevo(tipo: string): any {
    switch (tipo) {
      case "titulo":
        return { texto: "Un título", nivel: "mediano" };
      case "texto":
        return { cuerpo: "Escribe aquí." };
      case "boton":
        return { etiqueta: "Ver más", url: "#productos", estilo: "principal" };
      case "imagen":
        return { url: "", alt: "", enlace: "" };
      case "espacio":
        return { alto: "medio", linea: false };
      case "tarjetas":
        return {
          variante: "icono",
          porFila: 3,
          items: [
            { titulo: "Envío rápido", cuerpo: "", icono: "envio", etiqueta: "", precio: "", incluye: [], ctaTexto: "", ctaUrl: "" },
            { titulo: "Garantía", cuerpo: "", icono: "garantia", etiqueta: "", precio: "", incluye: [], ctaTexto: "", ctaUrl: "" },
            { titulo: "Pago seguro", cuerpo: "", icono: "pago", etiqueta: "", precio: "", incluye: [], ctaTexto: "", ctaUrl: "" },
          ],
        };
      default:
        return {};
    }
  }

  agregarElemento(bloque: any, tipo: string): void {
    const actuales = bloque.elementos || [];
    if (actuales.length >= this.topeDeElementos(bloque)) return;

    const nuevo: any = { id: `e_${Date.now()}_${tipo}`, tipo, datos: this.elementoNuevo(tipo) };

    // Con el lienzo prendido el objeto nace COLOCADO, no en la esquina: si
    // naciera sin coordenadas habría que arrastrarlo antes de poder usarlo, que
    // es justo el paso extra que esta capacidad viene a quitar. Se apila hacia
    // abajo a media anchura, que es fácil de ver y de agarrar.
    if (this.enLienzo(bloque)) {
      nuevo.pos = {
        x: 0,
        y: Math.min(85, actuales.length * 12),
        w: 50,
      };
    }

    bloque.elementos = [...actuales, nuevo];
    this.marcarSucio();
  }

  quitarElemento(bloque: any, i: number): void {
    bloque.elementos.splice(i, 1);
    this.marcarSucio();
  }

  duplicarElemento(bloque: any, i: number): void {
    const copia = JSON.parse(JSON.stringify(bloque.elementos[i]));
    copia.id = `e_${Date.now()}_${copia.tipo}`;
    bloque.elementos.splice(i + 1, 0, copia);
    this.marcarSucio();
  }

  soltarElemento(evento: CdkDragDrop<any>, bloque: any): void {
    if (evento.previousIndex === evento.currentIndex) return;
    moveItemInArray(bloque.elementos, evento.previousIndex, evento.currentIndex);
    this.marcarSucio();
  }

  agregarTarjeta(elemento: any): void {
    const items = elemento.datos.items || [];
    if (items.length >= 8) return;
    elemento.datos.items = [
      ...items,
      { titulo: "", cuerpo: "", imagen: "", icono: "", etiqueta: "", precio: "", incluye: [], ctaTexto: "", ctaUrl: "" },
    ];
    this.marcarSucio();
  }

  quitarTarjeta(elemento: any, j: number): void {
    elemento.datos.items.splice(j, 1);
    this.marcarSucio();
  }

  /** Sube la foto de un elemento imagen dentro de una sección. */
  subirImagenElemento(evento: Event, bloque: any, i: number): void {
    this.subirYAplicar(evento, (url) => {
      bloque.elementos[i].datos.url = url;
    });
  }

  /** Sube la foto de una tarjeta. */
  subirImagenTarjeta(evento: Event, elemento: any, j: number): void {
    this.subirYAplicar(evento, (url) => {
      elemento.datos.items[j].imagen = url;
    });
  }

  /**
   * Subida con destino variable. Las tres subidas de una sección hacen lo
   * mismo salvo dónde guardan la URL, así que el camino es uno solo.
   */
  private subirYAplicar(evento: Event, aplicar: (url: string) => void): void {
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
        aplicar(res.url);
        this.marcarSucio();
      },
      error: () => {
        this.subiendo = false;
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  agregarColumna(): void {
    const b = this.bloqueActual;
    if (!b) return;
    const cols = b.datos.columnas || [];
    if (cols.length >= 3) return;
    b.datos.columnas = [...cols, { imagen: "", titulo: "", cuerpo: "", ctaTexto: "", ctaUrl: "" }];
    this.marcarSucio();
  }

  quitarColumna(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.columnas.splice(i, 1);
    this.marcarSucio();
  }

  /** La foto de una columna: se sube igual, pero se guarda en su celda. */
  subirImagenColumna(evento: Event, indice: number): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;

    this.subiendo = true;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = false;
        input.value = "";
        const b = this.bloqueActual;
        if (!res || !res.success || !res.url || !b) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        b.datos.columnas[indice].imagen = res.url;
        this.marcarSucio();
      },
      error: () => {
        this.subiendo = false;
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  agregarBoton(): void {
    const b = this.bloqueActual;
    if (!b) return;
    const lista = b.datos.botones || [];
    if (lista.length >= 4) return;
    b.datos.botones = [...lista, { etiqueta: "", url: "", estilo: "principal" }];
    this.marcarSucio();
  }

  quitarBoton(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.botones.splice(i, 1);
    this.marcarSucio();
  }

  // ── Estilo de una sección ──────────────────────────────────────────────────

  /**
   * El estilo se crea la primera vez que se toca. Antes de eso el bloque no lo
   * lleva, para no llenar el documento de valores por defecto — el backend
   * descarta el estilo que no cambia nada.
   */
  estiloDe(bloque: any): any {
    if (!bloque.estilo) {
      bloque.estilo = {
        fondo: "",
        fondoImagen: "",
        fondoVelo: 0,
        colorTexto: "",
        espaciado: "normal",
        ancho: "normal",
        alineacion: "",
      };
    }
    return bloque.estilo;
  }

  tieneEstilo(bloque: any): boolean {
    const e = bloque && bloque.estilo;
    if (!e) return false;
    return !!(
      e.fondo ||
      e.fondoImagen ||
      e.colorTexto ||
      e.alineacion ||
      (e.espaciado && e.espaciado !== "normal") ||
      (e.ancho && e.ancho !== "normal")
    );
  }

  cambiarEstilo(bloque: any, campo: string, valor: any): void {
    this.estiloDe(bloque)[campo] = valor;
    this.marcarSucio();
  }

  ponerFondo(bloque: any, color: string): void {
    this.estiloDe(bloque).fondo = color;
    this.marcarSucio();
  }

  limpiarEstilo(bloque: any): void {
    delete bloque.estilo;
    this.marcarSucio();
  }

  agregarResena(): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.items = [...(b.datos.items || []), { texto: "", autor: "", estrellas: 5 }];
    this.marcarSucio();
  }

  quitarResena(i: number): void {
    const b = this.bloqueActual;
    if (!b) return;
    b.datos.items.splice(i, 1);
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

  subirImagen(
    evento: Event,
    destino:
      | "hero"
      | "galeria"
      | "seo"
      | "imagenBloque"
      | "fondoSeccion"
      | "promo"
      | "marcas"
      | "heroCarrusel"
      | "instagram"
  ): void {
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
          if (destino === "promo") b.datos.imagen = res.url;
          if (destino === "imagenBloque") b.datos.url = res.url;
          if (destino === "galeria") b.datos.imagenes = [...(b.datos.imagenes || []), { url: res.url, alt: "" }];
          if (destino === "marcas") b.datos.logos = [...(b.datos.logos || []), { url: res.url, alt: "" }];
          if (destino === "heroCarrusel") b.datos.imagenes = [...(b.datos.imagenes || []), res.url];
          if (destino === "instagram") b.datos.fotos = [...(b.datos.fotos || []), res.url];
          if (destino === "fondoSeccion") {
            const estilo = this.estiloDe(b);
            estilo.fondoImagen = res.url;
            // Un velo por defecto: una foto de fondo sin oscurecer deja el
            // texto ilegible, y el comerciante lo descubre ya publicado.
            if (!estilo.fondoVelo) estilo.fondoVelo = 45;
          }
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
    this.guardarEnHistorial();
  }

  // ── Deshacer y rehacer ─────────────────────────────────────────────────────

  /**
   * Historial de contenido.
   *
   * Se guardan copias completas del contenido, no diferencias: son objetos de
   * unos pocos kilobytes y treinta pasos caben de sobra en memoria. Calcular
   * diferencias sería más código para ahorrar algo que no molesta.
   *
   * Los cambios seguidos sobre el mismo campo se agrupan: escribir un título no
   * puede dejar treinta pasos de deshacer, uno por letra.
   */
  private historial: string[] = [];
  private posicionHistorial = -1;
  private relojHistorial: any = null;
  /** Al aplicar un paso del historial no se debe volver a guardar ese estado. */
  private restaurando = false;

  private guardarEnHistorial(): void {
    if (this.restaurando || !this.contenido) return;

    clearTimeout(this.relojHistorial);
    this.relojHistorial = setTimeout(() => {
      const foto = JSON.stringify(this.contenido);
      if (this.historial[this.posicionHistorial] === foto) return;

      // Si se deshizo y luego se edita, lo que estaba "adelante" deja de existir.
      this.historial = this.historial.slice(0, this.posicionHistorial + 1);
      this.historial.push(foto);

      const MAX_PASOS = 30;
      if (this.historial.length > MAX_PASOS) this.historial.shift();
      this.posicionHistorial = this.historial.length - 1;
    }, 400);
  }

  /** El estado inicial entra al historial para poder volver a él. */
  private iniciarHistorial(): void {
    this.historial = this.contenido ? [JSON.stringify(this.contenido)] : [];
    this.posicionHistorial = this.historial.length - 1;
  }

  get puedeDeshacer(): boolean {
    return this.posicionHistorial > 0;
  }

  get puedeRehacer(): boolean {
    return this.posicionHistorial >= 0 && this.posicionHistorial < this.historial.length - 1;
  }

  deshacer(): void {
    if (!this.puedeDeshacer) return;
    this.posicionHistorial--;
    this.aplicarDelHistorial();
  }

  rehacer(): void {
    if (!this.puedeRehacer) return;
    this.posicionHistorial++;
    this.aplicarDelHistorial();
  }

  private aplicarDelHistorial(): void {
    const foto = this.historial[this.posicionHistorial];
    if (!foto) return;

    this.restaurando = true;
    clearTimeout(this.relojHistorial);
    this.contenido = JSON.parse(foto);
    // El bloque que estaba seleccionado puede ya no existir.
    if (this.seleccionado >= this.bloques.length) this.seleccionado = -1;
    this.sucio = true;
    this.recalcularPrevia();
    this.restaurando = false;
  }

  /**
   * Atajos de teclado. Se ignoran mientras se escribe en un campo: ahí Ctrl+Z
   * es el deshacer del propio campo, y robárselo sería peor que no tenerlo.
   */
  @HostListener("document:keydown", ["$event"])
  atajos(evento: KeyboardEvent): void {
    if (!(evento.ctrlKey || evento.metaKey)) return;

    const destino = evento.target as HTMLElement;
    const escribiendo =
      destino &&
      (destino.tagName === "INPUT" ||
        destino.tagName === "TEXTAREA" ||
        destino.isContentEditable);
    if (escribiendo) return;

    const tecla = evento.key.toLowerCase();
    if (tecla === "z" && !evento.shiftKey) {
      evento.preventDefault();
      this.deshacer();
    } else if (tecla === "y" || (tecla === "z" && evento.shiftKey)) {
      evento.preventDefault();
      this.rehacer();
    } else if (tecla === "s") {
      // Guardar con Ctrl+S es lo que todo el mundo intenta.
      evento.preventDefault();
      this.guardar();
    }
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
