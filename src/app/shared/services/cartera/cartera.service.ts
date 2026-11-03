import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { environment } from '../../../../environments/environment';
import {
  CanalGestion,
  CarteraCastigadaResponse,
  CarteraEvolucionResponse,
  CarteraResponse,
  ConfigEstadoCuenta,
  CreditoVistaPrevia,
  EstadoCuentaVistaPrevia,
  EventoCobro,
  MarcarRelacionResponse,
  TipoRelacion,
} from './cartera.models';

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera).
 * Cliente HTTP de cartera. Extiende BaseService para que el interceptor adjunte
 * auth + header `company` (multi-tenant) en cada request. Vive en shared/services
 * para que otros módulos lo reusen. El endpoint reusa el dominio de tesorería.
 */
@Injectable({ providedIn: 'root' })
export class CarteraService extends BaseService {
  private readonly base = '/v1/treasury';

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * GET /cartera — cartera agrupada por cliente + KPIs + aging, todo server-side.
   * Una sola llamada trae todo; los filtros de la pantalla son client-side.
   * Ticket 1461: `incluirInternos` y `soloInternos` solo se mandan cuando son true (el servidor los ignora si la
   * empresa no tiene la cartera interna encendida). `soloInternos` es la vista «Cartera interna».
   */
  getCartera(incluirInternos = false, soloInternos = false): Observable<CarteraResponse> {
    const params: string[] = [];
    if (soloInternos) params.push('soloInternos=true');
    else if (incluirInternos) params.push('incluirInternos=true');
    return this.get<CarteraResponse>(`${this.base}/cartera${params.length ? '?' + params.join('&') : ''}`);
  }

  /** POST /cartera/relacion — Tesorería marca el tipo de relación del cliente (todas sus fichas con ese documento). */
  marcarRelacion(documento: string, relationType: TipoRelacion): Observable<MarcarRelacionResponse> {
    return this.post<MarcarRelacionResponse>(`${this.base}/cartera/relacion`, { documento, relationType });
  }

  /** GET /cartera/evolucion — fotos mensuales de cartera total y vencida (últimos 12 meses, ticket 1464). */
  getEvolucion(): Observable<CarteraEvolucionResponse> {
    return this.get<CarteraEvolucionResponse>(`${this.base}/cartera/evolucion`);
  }

  // ── Ticket 1463: acciones de cobro de la tarjeta del cliente ─────────────────
  // Siempre mandan el documento de la tarjeta (y, si se quiere, los pedidos), nunca montos: los números
  // los calcula el servidor con las mismas reglas de Cartera.

  /** POST /cartera/estado-cuenta/vista-previa — números, enlace de WhatsApp y datos del correo. */
  estadoCuentaVistaPrevia(documento: string, orderIds?: string[], confirmarInterno = false): Observable<EstadoCuentaVistaPrevia> {
    return this.postSinLoader<EstadoCuentaVistaPrevia>(`${this.base}/cartera/estado-cuenta/vista-previa`, { documento, orderIds, confirmarInterno });
  }

  /** POST /cartera/estado-cuenta/pdf — el PDF para descargar. */
  estadoCuentaPdf(documento: string, orderIds?: string[], confirmarInterno = false): Observable<Blob> {
    return this.http.post(`${environment.urlApi}${this.base}/cartera/estado-cuenta/pdf`, { documento, orderIds, confirmarInterno }, { responseType: 'blob' });
  }

  /** POST /cartera/estado-cuenta/enviar-correo — sin `confirmar` el servidor solo revisa (vista previa). */
  estadoCuentaEnviarCorreo(documento: string, orderIds: string[] | undefined, confirmar: boolean, confirmarInterno = false): Observable<{ success: boolean; enviado?: boolean; destino?: string }> {
    return this.post(`${this.base}/cartera/estado-cuenta/enviar-correo`, { documento, orderIds, confirmar, confirmarInterno });
  }

  /** POST /cartera/estado-cuenta/registrar-envio — la persona abrió WhatsApp con el mensaje listo. */
  estadoCuentaRegistrarEnvioWhatsApp(documento: string): Observable<{ success: boolean }> {
    return this.post(`${this.base}/cartera/estado-cuenta/registrar-envio`, { documento });
  }

  getConfigEstadoCuenta(): Observable<ConfigEstadoCuenta & { success: boolean }> {
    return this.get(`${this.base}/cartera/estado-cuenta/config`);
  }

  /** PUT — solo Administrador. */
  guardarConfigEstadoCuenta(config: ConfigEstadoCuenta): Observable<ConfigEstadoCuenta> {
    return this.put(`${this.base}/cartera/estado-cuenta/config`, config);
  }

  registrarCompromiso(documento: string, fecha: string, valor: number, nota: string): Observable<{ success: boolean }> {
    return this.post(`${this.base}/cartera/compromiso`, { documento, fecha, valor, nota });
  }

  registrarGestion(documento: string, canal: CanalGestion, resultado: string, nota: string): Observable<{ success: boolean }> {
    return this.post(`${this.base}/cartera/gestion`, { documento, canal, resultado, nota });
  }

  historialCobro(documento: string): Observable<{ success: boolean; eventos: EventoCobro[] }> {
    return this.getSinLoader(`${this.base}/cartera/historial?documento=${encodeURIComponent(documento)}`);
  }

  /** POST /cartera/credito — sin `confirmar` devuelve la vista previa del efecto; con él guarda. */
  cambiarCredito(documento: string, creditLimit: number, payTermDays: number, confirmar: boolean): Observable<CreditoVistaPrevia> {
    const url = `${this.base}/cartera/credito`;
    const cuerpo = { documento, creditLimit, payTermDays, confirmar };
    // La vista previa se recalcula al escribir: sin la pantalla de carga global.
    return confirmar ? this.post(url, cuerpo) : this.postSinLoader(url, cuerpo);
  }

  /** POST /cartera/castigar — solo Administrador, con la bandera `carteraCastigo`. */
  castigar(documento: string, orderIds: string[], motivo: string): Observable<{ success: boolean; castigados: number; saldo: number }> {
    return this.post(`${this.base}/cartera/castigar`, { documento, orderIds, motivo });
  }

  reactivar(documento: string, orderIds: string[]): Observable<{ success: boolean; reactivados: number }> {
    return this.post(`${this.base}/cartera/reactivar`, { documento, orderIds });
  }

  getCarteraCastigada(): Observable<CarteraCastigadaResponse> {
    return this.get<CarteraCastigadaResponse>(`${this.base}/cartera/castigada`);
  }
}
