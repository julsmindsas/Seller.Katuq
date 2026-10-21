import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "../../shared/services/base.service";
import { BloqueSitio, TemaSitio } from "../sitio-render/sitio-render.component";

/**
 * Configuración de venta del sitio. Vive aparte de los bloques porque el
 * checkout es del sitio entero: la bodega que despacha y el costo del envío
 * valen igual para todo lo que se compre en esa página.
 */
export interface TiendaSitio {
  habilitada: boolean;
  /** Business code de la bodega ("BOD-001"), nunca el id de Firestore. */
  bodegaId: string;
  /**
   * "fijo": una tarifa pareja. "zonas": el costo sale del maestro de zonas de
   * cobro según la ciudad del comprador — el mismo que usa la venta asistida.
   */
  envio: { modo: "fijo" | "zonas"; costo: number; gratisDesde: number; texto: string };
  pagoEnLinea: boolean;
  contraEntrega: boolean;
  /** Formas de pago manuales del maestro (transferencia, Nequi...). */
  otrasFormasPago: { cd: string; nombre: string; instrucciones?: string }[];
  /**
   * D-517: pago a cuotas en el checkout. Apagados por omisión; además del interruptor, el
   * servidor exige la bandera del comercio y el proveedor conectado en Integraciones.
   */
  pagoCuotas?: { addi: boolean; sistecredito: boolean };
  /** Venta cruzada (afines + sugerencias del carrito). Encendida por defecto. */
  ventaCruzada?: boolean;
  /** Ticket 1231: pedir opinión también a pedidos de venta asistida, POS y WhatsApp. Apagado por defecto. */
  resenasOtrosCanales?: boolean;
  /** Ticket 1229: categorías que no van al catálogo de Google Shopping y Meta. */
  feedCategoriasExcluidas?: string[];
  /** Al agregar: abrir el cajón (true) o solo confirmar con un aviso (por defecto). */
  abrirCarritoAlAgregar?: boolean;
  /** Ticket 1254: landing sin menú ni pie completo, un solo objetivo. */
  modoConversion?: boolean;
  /** Ticket 1241: KAI, asesor de compra en la tienda. */
  asesorKai?: boolean;
  /** Ticket 1225: cupo de pedidos por día, hora de corte (HH:mm) y días sin entregas (YYYY-MM-DD). */
  entregas?: { cupoDiario: number; horaCorte: string; diasBloqueados: string[] };
  /** Categorías del maestro que no salen en el sitio (menú, baldosas, pie, filtros). */
  categoriasOcultas?: string[];
  /** Ticket 1214: categorías de nombre interno que el comercio decidió mostrar (por defecto, ocultas). */
  categoriasMostradas?: string[];
  /** Ticket 1221: frases con condiciones de venta que el comercio confirmó que cumple. */
  promesasConfirmadas?: string[];
  minimoCompra: number;
  /** Ticket 1244: pedido mínimo de quien compra con su lista de precios. */
  minimoMayorista?: number;
  /** Ticket 1242: cuánto se encarga KAI de la web. */
  kai?: { autonomia: "sugerir" | "aprobar" | "automatico"; pausado: boolean; reporteSemanal: boolean };
  /** Ticket 1235: productos que se cotizan con un asesor en vez de ir al carrito. */
  cotizables?: { id: string; titulo: string }[];
  textoCotizar?: string;
  asesoresCotizacion?: string[];
  mensajeConfirmacion: string;

  /**
   * Recoger en tienda: puntos donde el comprador puede pasar por su pedido.
   * Sin puntos, el checkout ni siquiera muestra la opción.
   */
  retiroEnTienda?: {
    activo: boolean;
    texto: string;
    puntos: {
      id: string;
      nombre: string;
      direccion: string;
      ciudad: string;
      horario: string;
      telefono: string;
      /** Business code de la bodega que despacha ese punto. Vacío = la de la tienda. */
      bodegaId: string;
    }[];
  };

  /**
   * Cupones de descuento. La regla vive aquí, pero el descuento lo calcula
   * SIEMPRE el servidor: los códigos nunca bajan al navegador del comprador.
   */
  cupones?: CuponSitio[];
  /** Promociones que se aplican solas (D-315). Las calcula el servidor. */
  promociones?: PromocionSitio[];
  /** Los correos que la tienda le manda al comprador, personalizados (D-317). */
  correos?: CorreosTienda;
}

/** Un correo de la tienda: si sale y qué dice. Vacío = el texto de siempre. */
export interface CorreoMomento {
  activo: boolean;
  asunto: string;
  titulo: string;
  mensaje: string;
}

export interface CorreosTienda {
  diseno: { color: string; pie: string; responderA: string };
  momentos: { [momento: string]: CorreoMomento };
}

/** Lo que dice un correo por defecto, y cuándo sale. */
export interface TextoCorreo {
  nombre: string;
  cuando: string;
  asunto: string;
  titulo: string;
  mensaje: string;
}

/** Una promoción automática: 2x1, porcentaje o por volumen. */
export interface PromocionSitio {
  id: string;
  nombre: string;
  tipo: "nxm" | "porcentaje" | "volumen";
  activa: boolean;
  /** Fechas ISO "2026-12-01"; vacías = sin límite. */
  desde: string;
  hasta: string;
  alcance: { tipo: "todo" | "categorias" | "productos"; valores: string[] };
  /** nxm: lleva N, paga M. */
  lleva?: number;
  paga?: number;
  /** porcentaje y volumen: % de descuento. */
  valor?: number;
  /** volumen: desde cuántas unidades. */
  desdeUnidades?: number;
}

export interface CuponSitio {
  codigo: string;
  tipo: "porcentaje" | "monto";
  valor: number;
  activo: boolean;
  minimoCompra: number;
  /** Ticket 1218: fecha ISO desde la que sirve. Vacío = desde ya. */
  desde?: string;
  /** Fecha ISO "2026-12-31". Vacío = no vence. */
  vence: string;
  /** 0 = sin tope. */
  usosMaximos: number;
  usos: number;
  soloPrimeraCompra: boolean;
  aplicaAEnvio: boolean;
}

/** Lo que propone la IA: solo lo validado por el servidor. */
export interface PropuestaDiseno {
  tema: Partial<TemaSitio>;
  orden: string[];
  ocultar: string[];
  portada: { titulo: string; subtitulo: string; cta: string } | null;
  anuncio: string;
  razones: string[];
}

/** Una categoría de la empresa tal como la pinta la página publicada. */
export interface CategoriaSitio {
  nombre: string;
  total: number;
  imagen: string;
}

/** Lo que el panel de tienda necesita saber de la empresa para configurarse. */
/** Ticket 1232: temporada del calendario comercial colombiano. */
export interface TemporadaComercial {
  id: string;
  nombre: string;
  desde: string;
  hasta: string;
  anio: number;
}

export interface VentaConfig {
  pasarela: { configurada: boolean; proveedor: string | null };
  zonas: number;
  /** Ticket 1215: nombre público, instrucciones y si se puede ofrecer en la web. */
  formasPago: { cd: string; nombre: string; categoria: string; nombrePublico?: string; instrucciones?: string; disponibleWeb?: boolean; interna?: boolean }[];
  /** Ticket 1213: si la empresa tiene razón social y NIT (solo si están, no los valores). */
  datosLegales?: { razonSocial: boolean; nit: boolean } | null;
  /** D-517: bandera del comercio y estado de cada proveedor de pago a cuotas. */
  cuotas?: CuotasVentaConfig;
}

/** Proveedores de pago a cuotas de la tienda (D-517). */
export type ProveedorCuotas = "addi" | "sistecredito";

/** Estado de un proveedor a cuotas: si está conectado y con qué credenciales. */
export interface EstadoProveedorCuotas {
  configurada: boolean;
  entorno: "staging" | "production" | null;
}

export interface CuotasVentaConfig {
  /** `storeInstallmentPayments` del comercio. Apagada, el editor no muestra los interruptores. */
  bandera: boolean;
  addi: EstadoProveedorCuotas;
  sistecredito: EstadoProveedorCuotas;
}

/**
 * D-518 (F2-41·4): reglas propias del comercio para un proveedor a cuotas. Solo pueden
 * ser más estrictas que el proveedor; una categoría permitida incluye sus subcategorías
 * (rutas del árbol, "Tecnología > Audio"). Sin categorías, aplica a todo el catálogo.
 */
export interface ReglasCuotas {
  montoMinimo: number | null;
  montoMaximo: number | null;
  categoriasPermitidas: string[];
}

/** Un proveedor a cuotas visto desde «Cómo te pagan»: conexión, rango del proveedor y reglas. */
export interface ProveedorReglasCuotas {
  configurada: boolean;
  entorno?: "staging" | "production";
  /** Rango del proveedor (Addi: su configuración; Sistecrédito: el mínimo del convenio). null si no respondió. */
  rango?: { minimo: number | null; maximo: number | null } | null;
  reglas?: ReglasCuotas;
}

export interface ReglasCuotasRespuesta {
  bandera: boolean;
  proveedores: { addi?: ProveedorReglasCuotas; sistecredito?: ProveedorReglasCuotas };
  /** Rutas del árbol de categorías del comercio, en orden, con su nivel (1 = raíz). */
  categorias: { ruta: string; nivel: number }[];
}

/**
 * Identificadores de medición. Solo ids, nunca un fragmento de código: el
 * servidor arma las etiquetas y abre la política de seguridad para los
 * dominios que hagan falta.
 */
export interface AnaliticaSitio {
  ga4: string;
  googleAds: string;
  /** Etiqueta de conversión "AW-123/AbC-D_efG". Sin ella no hay qué optimizar. */
  googleAdsConversion: string;
  metaPixel: string;
  gtm: string;
  tiktokPixel: string;
  /** Verificaciones de propiedad del dominio (etiquetas meta). */
  metaVerificacion: string;
  googleVerificacion: string;
  /** Consent Mode v2 de Google. Encenderlo sin banner apaga la medición. */
  consentimiento: boolean;

  /**
   * Credenciales de la medición desde el servidor.
   *
   * El token de Meta y la clave de GA4 NO viajan hasta aquí: son secretos del
   * comerciante y el servidor los guarda sin devolverlos. El editor solo
   * recibe si están puestos, y los escribe cuando el comerciante pega uno
   * nuevo. Mandar la cadena vacía a propósito es como se quitan.
   */
  metaConversionsPuesto?: boolean;
  ga4SecretoPuesto?: boolean;
  metaConversionsToken?: string;
  ga4ApiSecret?: string;
  /** Código del Administrador de eventos para que la prueba no ensucie datos. */
  metaTestEventCode?: string;
  /** Ticket 1240: Events API de TikTok (el token no vuelve del servidor). */
  tiktokEventsPuesto?: boolean;
  tiktokEventsToken?: string;
  tiktokTestCode?: string;
}

/**
 * Una reseña de un comprador verificado.
 *
 * El comerciante la publica, la oculta o la responde. No puede cambiar ni el
 * texto ni las estrellas: eso la volvería un testimonio escrito por él.
 */
export interface ResenaSitio {
  id: string;
  productoId: string;
  nroPedido: string;
  estrellas: number;
  texto: string;
  autor: string;
  estado: "pendiente" | "publicada" | "oculta";
  compraVerificada: boolean;
  respuesta: string;
  createdAt: string;
}

/** El parte de una plataforma tras el evento de prueba. */
export interface ParteMedicion {
  proveedor: string;
  ok: boolean;
  estado: number;
  detalle: string | null;
}

/**
 * Una página propia del sitio: "Nosotros", "Políticas de devolución".
 *
 * Es el mismo material del inicio (los mismos bloques) con dirección y
 * metadatos propios. Vive dentro del contenido del sitio, no en una colección
 * aparte: una página sin su sitio no significa nada.
 */
export interface PaginaSitio {
  id: string;
  /** Lo que va después del dominio: "nosotros" → tutienda.katuq.com/nosotros */
  ruta: string;
  titulo: string;
  descripcion: string;
  /** Si sale en el menú del pie. Una página de campaña puede no salir. */
  enMenu: boolean;
  /** Si Google la puede indexar. */
  indexable: boolean;
  bloques: BloqueSitio[];
}

export interface ContenidoSitio {
  bloques: BloqueSitio[];
  /** Páginas además del inicio. Vacío en un sitio de una sola página. */
  paginas?: PaginaSitio[];
  tema: TemaSitio;
  seo: { titulo: string; descripcion: string; imagen: string; favicon?: string };
  tienda: TiendaSitio;
  analitica: AnaliticaSitio;
  /** Ticket 1245: redirecciones 301 desde la página anterior (rutas del sitio). */
  redirecciones?: { desde: string; hacia: string }[];
  /** Ticket 1238: enlaces cortos de campaña (`/r/<codigo>`) con sus utm. */
  enlaces?: { codigo: string; nombre: string; destino: string; utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string }[];
}

export interface Sitio {
  id: string;
  nombre: string;
  slug: string;
  tipo: "landing" | "catalogo" | "tienda";
  estado: "borrador" | "publicado";
  draft: ContenidoSitio;
  published: (ContenidoSitio & { publishedAt: string }) | null;
  vistasCount: number;
  leadsCount: number;
  pedidosCount: number;
  fechaCreacion: string;
  origen?: string;
  plantillaId?: string;
  /** Ticket 1256: página unida al sitio principal de la marca; su dirección redirige ahí. */
  redirigeA?: { siteId: string; ruta: string };
}

export interface PlantillaSitio {
  id: string;
  sector: string;
  nombre: string;
  descripcion: string;
  tema: TemaSitio;
  bloques: string[];
}

/** Un día de la serie de métricas. Los días sin tráfico llegan en cero. */
export interface DiaMetricas {
  dia: string;
  vista: number;
  lead: number;
  pedido: number;
  clic: number;
  ingresos: number;
}

/** Ticket 1239: una fila de "¿De dónde vienen tus ventas?". */
/** Ticket 1253: una versión publicada del sitio (sin su contenido). */
export interface VersionSitio {
  id: string;
  publicadaEn: string;
  por: string;
  motivo: string;
  secciones: number;
  paginas: number;
}

export interface FilaOrigen {
  fuente?: string;
  utm_campaign?: string;
  cupon?: string;
  vistas: number;
  pedidos: number;
  ventas: number;
  conversion: number | null;
  ticketPromedio: number | null;
}

export interface MetricasSitio {
  /** Cuántos días deja ver el plan (D-319): 1 en el plan gratis. */
  diasPermitidos?: number;
  sitio: { id: string; nombre: string; slug: string; estado: string };
  dias: number;
  totales: {
    vista: number;
    lead: number;
    pedido: number;
    clic: number;
    contactos: number;
    ingresos: number;
  };
  clicsPorDestino: { [destino: string]: number };
  /**
   * De dónde vienen las visitas, contadas por la baliza del navegador (los
   * bots no ejecutan JS). "sin dato" agrupa las vistas de antes de la baliza.
   */
  fuentes: { fuente: string; vistas: number }[];
  dispositivos: { dispositivo: string; vistas: number }[];
  campanas: { campana: string; vistas: number }[];
  /** Ticket 1239: visitas, pedidos y ventas por fuente ("sin dato": pedidos de antes de medir la fuente). */
  porFuente?: FilaOrigen[];
  /** Ticket 1239: lo mismo por campaña (utm_campaign). */
  porCampana?: FilaOrigen[];
  /** Ticket 1238: lo mismo por código de cupón o de influenciador. */
  porCupon?: FilaOrigen[];
  visitantesUnicos: number;
  /** Null cuando todavía no hay visitas: no es 0%, es que no hay dato. */
  conversion: number | null;
  serie: DiaMetricas[];
  historico: { vistas: number; leads: number; pedidos: number };
  truncado: boolean;
  /** Lo que trajeron de vuelta los recordatorios de pago y de carrito. */
  recuperado?: {
    pagos: number;
    carritos: number;
    valor: number;
    /** Ticket 1230: lo recuperado por cada aviso. */
    porCanal?: { correo?: { ventas: number; valor: number }; whatsapp?: { ventas: number; valor: number } };
  };
}

/** Alguien que le dejó sus datos a la tienda. */
export interface ContactoSitio {
  id: string;
  /** "boletin": se suscribió a las novedades desde el bloque de boletín (D-318). */
  tipo: "contacto" | "avisame-stock" | "carrito-abandonado" | "boletin";
  nombre: string;
  telefono: string;
  correo: string;
  nota: string;
  fecha: string;
  carrito?: { estado: string; total: number; recordado: boolean };
}

export interface KitDeMarca {
  logo: string;
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  tipografia: string;
  tono: string;
  sector: string;
  eslogan: string;
  nombreComercial?: string;
  redesSociales?: any[];
}

interface Respuesta<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: any;
  avisos?: string;
}

/**
 * Producto tal como lo devuelven los endpoints de catálogo: documento completo
 * de `products` con el stock ya resuelto contra `inventory`.
 */
export interface ProductoCatalogo {
  cd: string;
  crearProducto?: {
    titulo?: string;
    imagenesPrincipales?: any[];
    imagenesSecundarias?: any[];
  };
  identificacion?: { referencia?: string };
  precio?: { precioUnitarioConIva?: number };
  disponibilidad?: { cantidadDisponible?: number; inventariable?: boolean };
}

/** Los endpoints de productos responden `products`, no `data`. */
export interface RespuestaProductos {
  success: boolean;
  products: ProductoCatalogo[];
  pagination?: { totalItems: number; totalPages: number; page: number; pageSize: number };
  error?: string;
}

/**
 * Llamadas del editor de sitios.
 *
 * Los headers de sesión y empresa los pone el interceptor
 * (`shared/services/interceptor/http.interceptor.ts`), así que aquí no se
 * arma ninguno a mano.
 */
@Injectable({ providedIn: "root" })
export class SitiosService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  listar(): Observable<Respuesta<Sitio[]>> {
    return this.get<Respuesta<Sitio[]>>("/v1/sites/all");
  }

  obtener(id: string): Observable<Respuesta<Sitio>> {
    return this.get<Respuesta<Sitio>>(`/v1/sites/${id}`);
  }

  /** Propuesta de diseño con IA (vía KAI) sobre el contenido tal como está en el editor. */
  disenarConIA(id: string, contenido: ContenidoSitio, indicaciones: string): Observable<Respuesta<PropuestaDiseno>> {
    return this.post<Respuesta<PropuestaDiseno>>(`/v1/sites/${id}/disenar-ia`, { contenido, indicaciones });
  }

  /**
   * Dispara un evento de prueba contra las plataformas de pauta configuradas.
   *
   * Existe porque hasta ahora la única forma de saber si un píxel quedó bien
   * puesto era pautar y esperar días. El código de prueba hace que el evento
   * entre a la pestaña de pruebas de la plataforma y no a las métricas reales.
   */
  probarMedicion(
    id: string,
    testCode?: string
  ): Observable<Respuesta<{ partes: ParteMedicion[] }>> {
    return this.post<Respuesta<{ partes: ParteMedicion[] }>>(
      `/v1/sites/${id}/medicion/prueba`,
      { testCode: testCode || "" }
    );
  }

  /**
   * Borradores de las páginas legales, escritos con la configuración real de
   * la tienda. Solo devuelve: el comerciante decide si las guarda y qué ajusta.
   */
  paginasLegales(
    id: string,
    paginas?: string[]
  ): Observable<Respuesta<{ paginas: PaginaSitio[]; yaExisten: string[] }>> {
    return this.post<Respuesta<{ paginas: PaginaSitio[]; yaExisten: string[] }>>(
      `/v1/sites/${id}/paginas/legales`,
      { paginas: paginas || [] }
    );
  }

  /** Las reseñas de la tienda, para moderarlas. */
  /** Lo que dice cada correo de la tienda si el comercio no lo cambia. */
  correosPredeterminados(): Observable<Respuesta<{ momentos: { [m: string]: TextoCorreo }; variables: string[] }>> {
    return this.get<Respuesta<{ momentos: { [m: string]: TextoCorreo }; variables: string[] }>>(
      `/v1/sites/correos/predeterminados`
    );
  }

  /** El correo con lo que se está editando, con un pedido de ejemplo. */
  vistaPreviaCorreo(id: string, momento: string, correos: CorreosTienda): Observable<Respuesta<{ asunto: string; html: string }>> {
    return this.post<Respuesta<{ asunto: string; html: string }>>(`/v1/sites/${id}/correos/vista-previa`, { momento, correos });
  }

  /** Manda el correo de ejemplo al correo de quien está editando. */
  pruebaCorreo(id: string, momento: string, correos: CorreosTienda): Observable<Respuesta<{ enviadoA: string }>> {
    return this.post<Respuesta<{ enviadoA: string }>>(`/v1/sites/${id}/correos/prueba`, { momento, correos });
  }

  resenas(id: string): Observable<Respuesta<{ resenas: ResenaSitio[] }>> {
    return this.get<Respuesta<{ resenas: ResenaSitio[] }>>(`/v1/sites/${id}/resenas`);
  }

  /**
   * Publica, oculta o responde una reseña. El texto y las estrellas NO se
   * pueden cambiar: el servidor los ignora aunque se manden.
   */
  moderarResena(
    id: string,
    resenaId: string,
    cambios: { estado?: "pendiente" | "publicada" | "oculta"; respuesta?: string }
  ): Observable<Respuesta<null>> {
    return this.put<Respuesta<null>>(`/v1/sites/${id}/resenas`, { resenaId, ...cambios });
  }

  /** Categorías reales (nombre, total, foto) para la previa y el panel de tienda. */
  categorias(id: string): Observable<Respuesta<CategoriaSitio[]>> {
    return this.get<Respuesta<CategoriaSitio[]>>(`/v1/sites/${id}/categorias`);
  }

  /** Qué está pasando en una página: visitas, contactos, pedidos e ingresos. */
  metricas(id: string, dias = 30): Observable<Respuesta<MetricasSitio>> {
    return this.get<Respuesta<MetricasSitio>>(`/v1/sites/${id}/metricas?dias=${dias}`);
  }

  /** Quién le dejó sus datos a la tienda: formulario, Avísame y carritos. */
  contactos(id: string): Observable<Respuesta<{ contactos: ContactoSitio[] }>> {
    return this.get<Respuesta<{ contactos: ContactoSitio[] }>>(`/v1/sites/${id}/contactos`);
  }

  crear(body: {
    nombre: string;
    tipo?: string;
    slug?: string;
    contenido?: Partial<ContenidoSitio>;
  }): Observable<Respuesta<Sitio>> {
    return this.post<Respuesta<Sitio>>("/v1/sites/create", body);
  }

  /**
   * Guarda el borrador. Publicar es un acto aparte.
   *
   * Responde con el borrador **ya normalizado por el servidor**, no con un "ok"
   * a secas: al guardar se descarta lo que no pasa el saneador, y el editor
   * tiene que reflejarlo o el comerciante seguiría viendo un botón que en la
   * página publicada no existe.
   */
  guardar(body: {
    id: string;
    nombre?: string;
    slug?: string;
    tipo?: string;
    /** Dominio del comerciante ("mitienda.com"). Vacío = quitarlo. */
    dominioPropio?: string;
    contenido?: Partial<ContenidoSitio>;
  }): Observable<
    Respuesta<{ nombre: string; slug: string; dominioPropio?: string; draft: ContenidoSitio }>
  > {
    return this.put<
      Respuesta<{ nombre: string; slug: string; dominioPropio?: string; draft: ContenidoSitio }>
    >("/v1/sites/edit", body);
  }

  publicar(id: string): Observable<Respuesta<{ slug: string; publishedAt: string }>> {
    return this.post<Respuesta<{ slug: string; publishedAt: string }>>(
      `/v1/sites/${id}/publish`,
      {}
    );
  }

  /** ¿El DNS del dominio propio ya apunta a nuestros servidores? */
  dominioEstado(dominio: string): Observable<
    Respuesta<{
      dominio: string; subdominio?: boolean; raiz: boolean; www: boolean; raizApuntaOtroLado: boolean; listo: boolean;
    }>
  > {
    return this.get<any>(`/v1/sites/dominio-estado?dominio=${encodeURIComponent(dominio)}`);
  }

  /** Borra la página para siempre (borrador y publicado). */
  eliminar(id: string): Observable<Respuesta<null>> {
    return this.delete<Respuesta<null>>(`/v1/sites/${id}`);
  }

  /** Ticket 1254: copia en borrador de una página, con dirección propia. */
  /** Ticket 1256: une la página `id` al sitio `destinoId` de la misma marca (301 desde la dirección vieja). */
  unir(id: string, destinoId: string): Observable<Respuesta<{ url: string; ruta: string }>> {
    return this.post<Respuesta<{ url: string; ruta: string }>>(`/v1/sites/${encodeURIComponent(id)}/unir`, { destinoId });
  }

  duplicar(id: string): Observable<Respuesta<{ id: string; nombre: string; slug: string }>> {
    return this.post<Respuesta<{ id: string; nombre: string; slug: string }>>(`/v1/sites/${encodeURIComponent(id)}/duplicar`, {});
  }

  despublicar(id: string): Observable<Respuesta<null>> {
    return this.post<Respuesta<null>>(`/v1/sites/${id}/unpublish`, {});
  }

  slugDisponible(
    slug: string,
    siteId?: string
  ): Observable<Respuesta<{ slug: string; disponible: boolean; motivo?: string }>> {
    const sufijo = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return this.get<Respuesta<{ slug: string; disponible: boolean; motivo?: string }>>(
      `/v1/sites/slug-disponible/${encodeURIComponent(slug)}${sufijo}`
    );
  }

  plantillas(sector?: string): Observable<Respuesta<PlantillaSitio[]>> {
    const sufijo = sector ? `?sector=${encodeURIComponent(sector)}` : "";
    return this.get<Respuesta<PlantillaSitio[]>>(`/v1/sites/templates${sufijo}`);
  }

  /** Primera propuesta. Sin `guardar` solo previsualiza. */
  generar(body: {
    sector?: string;
    /** Descripción en una línea: va al SEO de la página. */
    objetivo?: string;
    /** Objetivo de una lista corta: elige la variante de textos de la plantilla. */
    objetivoId?: string;
    templateId?: string;
    productoIds?: string[];
    nombre?: string;
    slug?: string;
    tipo?: string;
    guardar?: boolean;
    /** Que KAI escriba los textos (opt-in; si falla, sale la plantilla). */
    conIA?: boolean;
  }): Observable<
    Respuesta<{
      contenido: ContenidoSitio;
      plantillaId: string;
      id?: string;
      slug?: string;
    }>
  > {
    return this.post<any>("/v1/sites/generar", body);
  }

  /**
   * Editar la página con IA (bandera `landingPrompt`): manda lo que pide el comercio y la página tal como
   * está en el editor (sin guardar); vuelve la página cambiada. El servidor NO guarda nada.
   */
  editarConIA(body: {
    siteId: string;
    instruccion: string;
    historial: { rol: 'comercio' | 'ia'; texto: string }[];
    contenido: { bloques: any[]; tema: any };
    /** Fotos, capturas o páginas de un PDF ya reducidas a JPEG (data URL), hasta 3. */
    referencias?: string[];
  }): Observable<
    Respuesta<{
      bloques: any[];
      tema: any;
      aplicados: number;
      ignorados: number;
      mensaje: string;
      cambios?: { icono: string; texto: string; colores?: string[] }[];
      referenciasMiradas?: number;
    }>
  > {
    // Sin la pantalla de carga global: el chat muestra su propio avance ("Mirando tu imagen…").
    return this.postSinLoader<any>("/v1/onboarding/pagina-con-ia/editar", body);
  }

  /**
   * Página con IA desde una descripción (bandera `landingPrompt`): el servidor interpreta el
   * texto, arma la página en BORRADOR y responde con su id. En producción tarda unos 5 segundos (medido el 9-oct).
   */
  crearConDescripcion(body: { descripcion: string; nombre?: string }): Observable<
    Respuesta<{ id: string; nombre: string; slug: string; tipo: string; estado: string }>
  > {
    return this.post<any>("/v1/onboarding/pagina-con-ia", body);
  }

  /**
   * Config real para el panel de tienda: si hay pasarela PROPIA (sin ella el
   * pago en línea entra a la cuenta de la plataforma, no a la del comercio),
   * cuántas zonas de cobro existen y las formas de pago activas del maestro.
   */
  ventaConfig(): Observable<Respuesta<VentaConfig>> {
    return this.get<Respuesta<VentaConfig>>("/v1/sites/venta-config");
  }

  /** D-518 (F2-41·4): rango de cada proveedor a cuotas, reglas del comercio y árbol de categorías. */
  reglasCuotas(): Observable<Respuesta<ReglasCuotasRespuesta>> {
    return this.get<Respuesta<ReglasCuotasRespuesta>>("/v1/sites/pago-cuotas/reglas");
  }

  /** D-518 (F2-41·4): guarda las reglas del comercio para un proveedor (solo administradores). */
  guardarReglasCuotas(proveedor: ProveedorCuotas, reglas: ReglasCuotas): Observable<Respuesta<{ reglas: ReglasCuotas }>> {
    return this.put<Respuesta<{ reglas: ReglasCuotas }>>(`/v1/sites/pago-cuotas/reglas/${proveedor}`, reglas);
  }

  /** Ticket 1232: próximas temporadas comerciales de Colombia con su ventana sugerida. */
  temporadas(): Observable<Respuesta<TemporadaComercial[]>> {
    return this.get<Respuesta<TemporadaComercial[]>>("/v1/sites/temporadas");
  }

  /** Ticket 1232: enlace a la vista previa del borrador tal como se verá en una fecha. */
  vistaEnFecha(id: string, fecha: string): Observable<Respuesta<{ url: string }>> {
    return this.get<Respuesta<{ url: string }>>(`/v1/sites/${encodeURIComponent(id)}/vista-en-fecha?fecha=${encodeURIComponent(fecha)}`);
  }

  /** Ticket 1253: historial de versiones publicadas, publicación programada y quién publica. */
  versiones(id: string): Observable<Respuesta<VersionSitio[]> & { programada?: { fecha: string; por: string } | null; puedePublicar?: boolean; rolesPublicar?: string[] }> {
    return this.get<any>(`/v1/sites/${encodeURIComponent(id)}/versiones`);
  }

  restaurarVersion(id: string, vid: string): Observable<Respuesta<{ slug: string; publishedAt: string }>> {
    return this.post<any>(`/v1/sites/${encodeURIComponent(id)}/versiones/${encodeURIComponent(vid)}/restaurar`, {});
  }

  programarPublicacion(id: string, cuerpo: { fecha?: string; cancelar?: boolean }): Observable<Respuesta<{ fecha: string; por: string }>> {
    return this.post<any>(`/v1/sites/${encodeURIComponent(id)}/programar`, cuerpo);
  }

  guardarRolesPublicar(id: string, rolesPublicar: string[]): Observable<Respuesta<any>> {
    return this.put<any>("/v1/sites/edit", { id, rolesPublicar });
  }

  /** Ticket 1247: enlace privado del borrador (72 h) para verlo en el celular o compartirlo. */
  vistaCompartible(id: string): Observable<Respuesta<{ url: string; horas: number }>> {
    return this.get<Respuesta<{ url: string; horas: number }>>(`/v1/sites/${encodeURIComponent(id)}/vista-compartible`);
  }

  /**
   * Genera (o rota, que es la forma de revocar) el link de acceso personal de
   * un cliente a las tiendas publicadas: con él, el cliente ve los precios de
   * SU lista en toda la tienda.
   */
  generarAccesoCliente(clienteCd: string): Observable<
    Respuesta<{
      cliente: string;
      categoria: string | null;
      links: { sitio: string; slug: string; url: string }[];
      aviso?: string;
    }>
  > {
    return this.post<any>("/v1/sites/acceso-cliente", { clienteCd });
  }

  kitDeMarca(): Observable<Respuesta<KitDeMarca>> {
    return this.get<Respuesta<KitDeMarca>>("/v1/companies/brand-kit");
  }

  guardarKitDeMarca(kit: Partial<KitDeMarca>): Observable<Respuesta<KitDeMarca>> {
    return this.put<Respuesta<KitDeMarca>>("/v1/companies/brand-kit", kit);
  }

  /**
   * Sube una imagen y devuelve su URL. Va por `/v1/media/upload`, que escribe
   * en Storage con el Admin SDK: el navegador no tiene sesión de Firebase Auth
   * y subir directo daría 403.
   */
  /**
   * Busca productos del comercio para el selector. Reusa el buscador que ya
   * existe (`/v1/productos/search/quick`), que filtra por empresa, inyecta el
   * stock real desde `inventory` y exige dos caracteres como mínimo.
   */
  buscarProductos(termino: string, pagina = 1): Observable<RespuestaProductos> {
    const params = [
      `q=${encodeURIComponent(termino)}`,
      "searchBy=general",
      "limit=24",
      `page=${pagina}`,
    ].join("&");
    return this.get<RespuestaProductos>(`/v1/productos/search/quick?${params}`);
  }

  /** Resuelve los productos ya elegidos, para mostrarlos al abrir el selector. */
  productosPorIds(ids: string[]): Observable<RespuestaProductos> {
    return this.post<RespuestaProductos>("/v1/productos/by-ids", { ids });
  }

  /** Igual que `subirImagen`, sin la pantalla de carga global (el chat "Con IA" muestra su propio avance). */
  subirImagenEnSegundoPlano(
    archivo: File,
    carpeta = "Sitios"
  ): Observable<{ success: boolean; url?: string; path?: string; error?: string; ancho?: number; alto?: number }> {
    const datos = new FormData();
    datos.append("file", archivo);
    datos.append("carpeta", carpeta);
    return this.postSinLoader<{ success: boolean; url?: string; path?: string; error?: string; ancho?: number; alto?: number }>(
      "/v1/media/upload",
      datos
    );
  }

  subirImagen(
    archivo: File,
    carpeta = "Sitios"
  ): Observable<{ success: boolean; url?: string; path?: string; error?: string; ancho?: number; alto?: number }> {
    const datos = new FormData();
    datos.append("file", archivo);
    datos.append("carpeta", carpeta);
    return this.post<{ success: boolean; url?: string; path?: string; error?: string; ancho?: number; alto?: number }>(
      "/v1/media/upload",
      datos
    );
  }
}
