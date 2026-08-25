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
  otrasFormasPago: { cd: string; nombre: string }[];
  minimoCompra: number;
  mensajeConfirmacion: string;
}

/** Lo que el panel de tienda necesita saber de la empresa para configurarse. */
export interface VentaConfig {
  pasarela: { configurada: boolean; proveedor: string | null };
  zonas: number;
  formasPago: { cd: string; nombre: string; categoria: string }[];
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
}

export interface ContenidoSitio {
  bloques: BloqueSitio[];
  tema: TemaSitio;
  seo: { titulo: string; descripcion: string; imagen: string };
  tienda: TiendaSitio;
  analitica: AnaliticaSitio;
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

export interface MetricasSitio {
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
  visitantesUnicos: number;
  /** Null cuando todavía no hay visitas: no es 0%, es que no hay dato. */
  conversion: number | null;
  serie: DiaMetricas[];
  historico: { vistas: number; leads: number; pedidos: number };
  truncado: boolean;
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

  /** Qué está pasando en una página: visitas, contactos, pedidos e ingresos. */
  metricas(id: string, dias = 30): Observable<Respuesta<MetricasSitio>> {
    return this.get<Respuesta<MetricasSitio>>(`/v1/sites/${id}/metricas?dias=${dias}`);
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
   * Config real para el panel de tienda: si hay pasarela PROPIA (sin ella el
   * pago en línea entra a la cuenta de la plataforma, no a la del comercio),
   * cuántas zonas de cobro existen y las formas de pago activas del maestro.
   */
  ventaConfig(): Observable<Respuesta<VentaConfig>> {
    return this.get<Respuesta<VentaConfig>>("/v1/sites/venta-config");
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

  subirImagen(
    archivo: File,
    carpeta = "Sitios"
  ): Observable<{ success: boolean; url?: string; path?: string; error?: string }> {
    const datos = new FormData();
    datos.append("file", archivo);
    datos.append("carpeta", carpeta);
    return this.post<{ success: boolean; url?: string; path?: string; error?: string }>(
      "/v1/media/upload",
      datos
    );
  }
}
