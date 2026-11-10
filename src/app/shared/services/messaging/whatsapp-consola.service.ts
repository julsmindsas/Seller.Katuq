import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base.service';
import {
  DetalleEnvio,
  EntradaPlantilla,
  EnvioMasivo,
  FallidoPorMotivo,
  FiltrosRegistro,
  PaginaRegistro,
  PlantillaConsola,
  RespuestaSalud,
  ResumenEnvio,
  Segmento,
} from './whatsapp-consola.models';

/**
 * Consola de WhatsApp (D-707): salud del número, plantillas completas, envíos masivos
 * y registro técnico. Todo pasa por `BaseService`, así el interceptor pone la sesión y la
 * empresa. Solo la familia Administrador y con la bandera `whatsappConsola`: quien decide
 * es el servidor (403 sin permiso).
 */
@Injectable({ providedIn: 'root' })
export class WhatsappConsolaService extends BaseService {
  private readonly base = '/v1/messaging/lines';

  constructor(http: HttpClient) {
    super(http);
  }

  private linea(lineId: string): string {
    return `${this.base}/${encodeURIComponent(lineId)}`;
  }

  // ─── Salud ────────────────────────────────────────────────────────────

  salud(lineId: string): Observable<RespuestaSalud> {
    return this.get<RespuestaSalud>(`${this.linea(lineId)}/salud`).pipe(
      map((res) => ({
        proveedor: res?.proveedor === 'meta' ? 'meta' : 'kapso',
        salud: res?.salud || null,
      })),
    );
  }

  // ─── Plantillas ───────────────────────────────────────────────────────

  plantillas(lineId: string): Observable<PlantillaConsola[]> {
    return this.get<unknown>(`${this.linea(lineId)}/templates`).pipe(
      map((res: any) => {
        const lista = Array.isArray(res) ? res : res?.plantillas || res?.items || res?.templates || [];
        return (Array.isArray(lista) ? lista : []).map((p: any) => this.plantilla(p));
      }),
    );
  }

  crearPlantilla(lineId: string, entrada: EntradaPlantilla): Observable<unknown> {
    return this.post<unknown>(`${this.linea(lineId)}/templates`, entrada);
  }

  borrarPlantilla(lineId: string, nombre: string): Observable<unknown> {
    return this.delete<unknown>(`${this.linea(lineId)}/templates/${encodeURIComponent(nombre)}`);
  }

  private plantilla(p: any): PlantillaConsola {
    return {
      id: p?.id ?? null,
      name: String(p?.name || ''),
      language: p?.language ?? null,
      category: p?.category ?? null,
      status: p?.status ?? null,
      estadoHumano: p?.estadoHumano,
      motivoHumano: p?.motivoHumano ?? p?.motivoRechazo ?? null,
      motivoRechazo: p?.motivoRechazo ?? null,
      bodyText: String(p?.bodyText || ''),
      componentes: Array.isArray(p?.componentes) ? p.componentes : Array.isArray(p?.components) ? p.components : [],
    };
  }

  // ─── Envíos masivos ───────────────────────────────────────────────────

  prepararEnvio(lineId: string, templateName: string, language: string, segmento: Segmento): Observable<ResumenEnvio> {
    return this.post<{ resumen: ResumenEnvio }>(`${this.linea(lineId)}/envios/preparar`, {
      templateName,
      language,
      segmento,
    }).pipe(map((res) => this.resumen(res?.resumen)));
  }

  crearEnvio(lineId: string, templateName: string, language: string, segmento: Segmento): Observable<string> {
    return this.post<{ campaignId: string }>(`${this.linea(lineId)}/envios`, {
      templateName,
      language,
      segmento,
      confirmar: true,
    }).pipe(map((res) => res?.campaignId || ''));
  }

  envios(lineId: string): Observable<EnvioMasivo[]> {
    return this.get<{ envios: EnvioMasivo[] }>(`${this.linea(lineId)}/envios`).pipe(
      map((res) => (Array.isArray(res?.envios) ? res.envios.map((e) => this.envio(e)) : [])),
    );
  }

  detalleEnvio(lineId: string, envioId: string): Observable<DetalleEnvio> {
    return this.get<any>(`${this.linea(lineId)}/envios/${encodeURIComponent(envioId)}`).pipe(
      map((res) => {
        const base = res?.envio || res;
        return {
          envio: this.envio(base),
          fallidosPorMotivo: this.fallidos(res?.fallidosPorMotivo ?? base?.fallidosPorMotivo),
        };
      }),
    );
  }

  pausarEnvio(lineId: string, envioId: string): Observable<unknown> {
    return this.post<unknown>(`${this.linea(lineId)}/envios/${encodeURIComponent(envioId)}/pausar`, {});
  }

  reanudarEnvio(lineId: string, envioId: string): Observable<unknown> {
    return this.post<unknown>(`${this.linea(lineId)}/envios/${encodeURIComponent(envioId)}/reanudar`, {});
  }

  private resumen(r: any): ResumenEnvio {
    return {
      total: Number(r?.total) || 0,
      aEnviar: Number(r?.aEnviar) || 0,
      excluidos: {
        sinTelefono: Number(r?.excluidos?.sinTelefono) || 0,
        noQuieren: Number(r?.excluidos?.noQuieren) || 0,
        repetidos: Number(r?.excluidos?.repetidos) || 0,
      },
      costoEstimadoCOP: Number(r?.costoEstimadoCOP) || 0,
    };
  }

  private envio(e: any): EnvioMasivo {
    const m = e?.metricas || {};
    return {
      id: String(e?.id || ''),
      templateName: String(e?.templateName || ''),
      estado: e?.estado || 'preparado',
      motivoPausa: e?.motivoPausa ?? null,
      total: Number(e?.total) || 0,
      metricas: {
        enviados: Number(m.enviados) || 0,
        entregados: Number(m.entregados) || 0,
        leidos: Number(m.leidos) || 0,
        respondidos: Number(m.respondidos) || 0,
        fallidos: Number(m.fallidos) || 0,
      },
      creadoEn: e?.creadoEn ?? null,
    };
  }

  /** Acepta una lista `[{motivo, cantidad}]` o un objeto `{ motivo: cantidad }`. */
  private fallidos(f: any): FallidoPorMotivo[] {
    if (Array.isArray(f)) {
      return f
        .map((x) => ({ motivo: String(x?.motivo || x?.motivoHumano || ''), cantidad: Number(x?.cantidad ?? x?.total ?? x?.count) || 0 }))
        .filter((x) => x.motivo);
    }
    if (f && typeof f === 'object') {
      return Object.entries(f).map(([motivo, cantidad]) => ({ motivo, cantidad: Number(cantidad) || 0 }));
    }
    return [];
  }

  // ─── Registro técnico ─────────────────────────────────────────────────

  registro(lineId: string, filtros: FiltrosRegistro = {}): Observable<PaginaRegistro> {
    const partes: string[] = [];
    if (filtros.cursor) partes.push(`cursor=${encodeURIComponent(filtros.cursor)}`);
    if (filtros.direccion) partes.push(`direccion=${encodeURIComponent(filtros.direccion)}`);
    if (filtros.estado) partes.push(`estado=${encodeURIComponent(filtros.estado)}`);
    const consulta = partes.length ? `?${partes.join('&')}` : '';
    return this.get<PaginaRegistro>(`${this.linea(lineId)}/registro${consulta}`).pipe(
      map((res) => ({
        items: Array.isArray(res?.items) ? res.items : [],
        siguiente: res?.siguiente || null,
      })),
    );
  }
}
