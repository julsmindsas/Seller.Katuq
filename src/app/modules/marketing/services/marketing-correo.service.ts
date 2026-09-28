import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';

/** Respuesta estándar del backend. */
export interface RespuestaCorreo<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type TipoBloque = 'titulo' | 'texto' | 'imagen' | 'boton' | 'productos' | 'cupon' | 'separador';

/** Un bloque del correo. Solo se usan los campos de su tipo. */
export interface BloqueCorreo {
  tipo: TipoBloque;
  texto?: string;
  url?: string;
  alt?: string;
  enlace?: string;
  productoIds?: string[];
  titulo?: string;
  codigo?: string;
}

export interface ContenidoCorreo {
  asunto: string;
  preheader: string;
  bloques: BloqueCorreo[];
}

export type SegmentoCorreo =
  | 'suscritos'
  | 'compraron'
  | 'dormidos'
  | 'compraron_producto'
  | 'carrito'
  | 'pidieron_aviso';

export interface AudienciaCorreo {
  segmento: SegmentoCorreo;
  parametros: { dias?: number; productoId?: string };
}

export type EstadoCampana =
  | 'borrador'
  | 'programada'
  | 'enviando'
  | 'pausada'
  | 'pausada_auto'
  | 'terminada'
  | 'cancelada';

export interface TotalesCampana {
  destinatarios?: number;
  enviados?: number;
  entregados?: number;
  rebotes?: number;
  rebotesTemporales?: number;
  quejas?: number;
  aperturas?: number;
  clics?: number;
  bajas?: number;
  sinAutorizacion?: number;
  suprimidos?: number;
  fueraDeCupo?: number;
}

export interface CampanaCorreo {
  id: string;
  nombre: string;
  siteId: string;
  estado: EstadoCampana;
  asunto: string;
  audiencia: AudienciaCorreo;
  programadaPara: string | null;
  motivoPausa: string;
  totales: TotalesCampana;
  creadoEn: string;
  actualizadoEn: string;
  contenido?: ContenidoCorreo;
}

export interface MetricasCampana extends CampanaCorreo {
  aperturasAproximadas: boolean;
  ventasAtribuidas: { pedidos: number; valor: number };
}

export interface ConteoAudiencia {
  audiencia: AudienciaCorreo;
  destinatarios: number;
  sinAutorizacion: number;
  suprimidos: number;
  cupoRestante: number;
  alcance: { salen: number; quedan: number; tope: number };
}

export interface Suscriptor {
  correo: string;
  nombre: string;
  estado: 'suscrito' | 'baja' | 'suprimido';
  motivo: string;
  autorizacion: { fecha: string; origen: string; texto: string; version: string } | null;
  desde: string;
  bajaEn: string | null;
}

/**
 * Campañas de correo de las tiendas (D-318).
 *
 * Extiende BaseService: el interceptor agrega la sesión y la empresa. Todo lo
 * de envío (cupos, horario legal, autorización, baja) lo decide el servidor;
 * aquí solo se arma y se muestra.
 */
@Injectable()
export class MarketingCorreoService extends BaseService {
  private readonly base = '/v1/marketing/email';

  constructor(http: HttpClient) {
    super(http);
  }

  listar(siteId?: string): Observable<RespuestaCorreo<{ items: CampanaCorreo[] }>> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return this.get<RespuestaCorreo<{ items: CampanaCorreo[] }>>(`${this.base}/campanas${q}`);
  }

  ver(id: string): Observable<RespuestaCorreo<CampanaCorreo>> {
    return this.get<RespuestaCorreo<CampanaCorreo>>(`${this.base}/campanas/${encodeURIComponent(id)}`);
  }

  crear(datos: { siteId: string; nombre: string; audiencia: AudienciaCorreo; contenido: ContenidoCorreo }): Observable<RespuestaCorreo<CampanaCorreo>> {
    return this.post<RespuestaCorreo<CampanaCorreo>>(`${this.base}/campanas`, datos);
  }

  editar(id: string, datos: Partial<{ nombre: string; audiencia: AudienciaCorreo; contenido: ContenidoCorreo }>): Observable<RespuestaCorreo<CampanaCorreo>> {
    return this.put<RespuestaCorreo<CampanaCorreo>>(`${this.base}/campanas/${encodeURIComponent(id)}`, datos);
  }

  borrar(id: string): Observable<RespuestaCorreo<unknown>> {
    return this.delete<RespuestaCorreo<unknown>>(`${this.base}/campanas/${encodeURIComponent(id)}`);
  }

  contarAudiencia(siteId: string, audiencia: AudienciaCorreo): Observable<RespuestaCorreo<ConteoAudiencia>> {
    return this.post<RespuestaCorreo<ConteoAudiencia>>(`${this.base}/audiencia`, { siteId, audiencia });
  }

  vistaPrevia(siteId: string, contenido: ContenidoCorreo): Observable<RespuestaCorreo<{ asunto: string; html: string; problemas: string[] }>> {
    return this.post<RespuestaCorreo<{ asunto: string; html: string; problemas: string[] }>>(`${this.base}/vista-previa`, { siteId, contenido });
  }

  prueba(id: string): Observable<RespuestaCorreo<{ enviadoA: string }>> {
    return this.post<RespuestaCorreo<{ enviadoA: string }>>(`${this.base}/campanas/${encodeURIComponent(id)}/prueba`, {});
  }

  programar(id: string, datos: { cuando?: string; aceptoParcial?: boolean }): Observable<RespuestaCorreo<{ programadaPara: string }>> {
    return this.post<RespuestaCorreo<{ programadaPara: string }>>(`${this.base}/campanas/${encodeURIComponent(id)}/programar`, datos);
  }

  pausar(id: string): Observable<RespuestaCorreo<{ estado: EstadoCampana }>> {
    return this.post<RespuestaCorreo<{ estado: EstadoCampana }>>(`${this.base}/campanas/${encodeURIComponent(id)}/pausar`, {});
  }

  cancelar(id: string): Observable<RespuestaCorreo<{ estado: EstadoCampana }>> {
    return this.post<RespuestaCorreo<{ estado: EstadoCampana }>>(`${this.base}/campanas/${encodeURIComponent(id)}/cancelar`, {});
  }

  metricas(id: string): Observable<RespuestaCorreo<MetricasCampana>> {
    return this.get<RespuestaCorreo<MetricasCampana>>(`${this.base}/campanas/${encodeURIComponent(id)}/metricas`);
  }

  suscriptores(siteId: string): Observable<RespuestaCorreo<{ items: Suscriptor[]; totales: { suscritos: number; bajas: number; suprimidos: number } }>> {
    return this.get<RespuestaCorreo<{ items: Suscriptor[]; totales: { suscritos: number; bajas: number; suprimidos: number } }>>(
      `${this.base}/suscriptores?siteId=${encodeURIComponent(siteId)}`
    );
  }

  sugerir(siteId: string, idea: string, productoIds: string[]): Observable<RespuestaCorreo<{ asunto: string; preheader: string; titulo: string; texto: string }>> {
    return this.post<RespuestaCorreo<{ asunto: string; preheader: string; titulo: string; texto: string }>>(`${this.base}/sugerir`, { siteId, idea, productoIds });
  }
}
