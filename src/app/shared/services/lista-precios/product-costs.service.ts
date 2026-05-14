import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';

export interface PrindelExcelRow {
  codigo: string;
  nombre?: string;
  costoUnitario: number;
  fechaVigencia?: string;
  stocks?: {
    BOGOTA?: number;
    BUCARAMANGA?: number;
    CALI?: number;
    MEDELLIN?: number;
    PEREIRA?: number;
    Principal?: number;
    total?: number;
  };
  precios?: {
    mayorista?: number;
    modelo?: number;
    publico?: number;
  };
  alerta?: {
    tipo: string;
    descripcion: string;
    accionSugerida?: string;
  };
}

export interface CostPreviewRequest {
  fileName?: string;
  fuente?: 'prindel-excel' | 'aliaddo-api' | 'aliaddo-excel' | 'costos-excel' | 'manual';
  rows: PrindelExcelRow[];
  codeAliases?: { [from: string]: string };
}

export interface CostPreviewItem {
  status: 'matched' | 'no-change' | 'skipped' | 'unmatched';
  codigoOriginal: string;
  codigoNormalizado: string;
  productId?: string;
  referencia?: string;
  costoAnterior?: number;
  costoNuevo: number;
  delta?: number;
  deltaPct?: number | null;
  stocksFulfillment?: any;
  preciosReferencia?: any;
  reason?: string;
  aliasAplicado?: { de: string; a: string };
}

export interface CostPreviewResponse {
  success: boolean;
  previewId: string;
  fileName: string | null;
  fuente: string;
  summary: {
    totalRows: number;
    matched: number;
    noChange: number;
    skipped: number;
    unmatched: number;
    costoTotalAntes: number;
    costoTotalDespues: number;
    deltaTotal: number;
  };
  matched: CostPreviewItem[];
  noChange: CostPreviewItem[];
  skipped: CostPreviewItem[];
  unmatched: CostPreviewItem[];
  alerts: any[];
  generatedAt: string;
  generatedBy: string;
}

export interface CostApplyRequest {
  importId: string;
  fileName?: string;
  fuente?: string;
  matched: CostPreviewItem[];
  summary?: any;
  alerts?: any[];
}

@Injectable({ providedIn: 'root' })
export class ProductCostsService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  previewImport(body: CostPreviewRequest): Observable<CostPreviewResponse> {
    return this.post<CostPreviewResponse>('/v1/fulfillment/cost-import/preview', body);
  }

  applyImport(body: CostApplyRequest): Observable<{ success: boolean; importId: string; processed: number; failed: number; errors: any[]; message: string }> {
    return this.post('/v1/fulfillment/cost-import/apply', body);
  }

  listImports(limit = 20): Observable<{ success: boolean; imports: any[] }> {
    const params = new HttpParams().set('limit', String(limit));
    return this.get('/v1/fulfillment/cost-import/imports', params);
  }

  listHistoryByProduct(productId: string, limit = 20): Observable<{ success: boolean; history: any[] }> {
    const params = new HttpParams().set('limit', String(limit));
    return this.get(`/v1/fulfillment/cost-import/history/${productId}`, params);
  }
}
