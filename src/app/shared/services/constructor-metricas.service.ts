import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

export interface ConteoSitios { creados: number; publicados: number; activos: number; }

export interface EmpresaConstructor {
  empresa: string;
  sitios: number;
  publicados: number;
  pedidos: number;
  ventas: number;
  opttia: number;
  diasHastaPublicar: number | null;
  medidoDesde: 'registro' | 'primer sitio' | null;
}

export interface SitioConstructor {
  siteId: string;
  nombre: string;
  slug: string;
  empresa: string;
  tipo: string;
  estado: 'publicado' | 'borrador';
  origen: string;
  creado: string | null;
  publicado: string | null;
  vistas: number;
  leads: number;
  pedidos: number;
  ventas: number;
  dominioPropio: boolean;
}

export interface AlertaConstructor {
  tipo: 'sin-pedidos' | 'sin-cobro';
  empresa: string;
  sitio: string;
  siteId: string;
  detalle: string;
}

export interface MetricasConstructor {
  generadoEn: string;
  resumen: ConteoSitios & { creados7: number; publicados7: number };
  porTipo: { [tipo: string]: ConteoSitios };
  embudo: { conSitio: number; conPublicado: number; conPedidos: number };
  tiempoHastaPublicar: { medianaDias: number | null; empresasMedidas: number };
  ventasWeb: { pedidos: number; ventas: number; pedidos7: number; ventas7: number; pedidosKuvo: number };
  uso: { opttia: number; cupones: number; pauta: number; dominioPropio: number; pagoEnLinea: number; contraEntrega: number; otrasFormasPago: number };
  tiendaEnUnPaso: { [estado: string]: number };
  alertas: AlertaConstructor[];
  empresas: EmpresaConstructor[];
  sitios: SitioConstructor[];
}

/** Métricas del constructor web para la consola de plataforma (ticket 1246). Solo Julsmind. */
@Injectable({ providedIn: 'root' })
export class ConstructorMetricasService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  metricas(): Observable<MetricasConstructor> {
    return this.get<MetricasConstructor>('/v1/companies/constructor-metricas');
  }
}
