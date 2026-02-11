import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface DispatchRuleConditions {
  zonaCobro?: string[];
  ciudad?: string[];
  valorMinimo?: number;
  valorMaximo?: number;
}

export interface DispatchRuleAction {
  transportadorId: string;
  transportadorNombre: string;
  metodoEnvio?: string;
}

export interface DispatchRule {
  id: string;
  nombre: string;
  activa: boolean;
  prioridad: number;
  condiciones: DispatchRuleConditions;
  accion: DispatchRuleAction;
}

export interface DispatchRulesConfig {
  company?: string;
  autoAsignarTransportador: boolean;
  autoDespachar: boolean;
  autoImprimir: boolean;
  defaultMetodoEnvio: string;
  reglas: DispatchRule[];
  fallbackTransportadorId: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TransporterSuggestion {
  sugerido: {
    transportadorId: string;
    nombre: string;
    metodoEnvio: string;
    razon: string;
    confianza: 'alta' | 'media' | 'baja';
  } | null;
  alternativas: Array<{
    transportadorId: string;
    nombre: string;
    razon: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DispatchRulesService {
  private baseUrl = environment.urlApi;
  private rulesCache: DispatchRulesConfig | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  // ===== CRUD Operations =====

  getRules(forceRefresh = false): Observable<DispatchRulesConfig> {
    if (!forceRefresh && this.rulesCache && (Date.now() - this.cacheTimestamp < this.CACHE_TTL)) {
      return of(this.rulesCache);
    }
    return this.http.get<DispatchRulesConfig>(`${this.baseUrl}/v1/logistica/dispatch-rules`).pipe(
      tap(rules => {
        this.rulesCache = rules;
        this.cacheTimestamp = Date.now();
      })
    );
  }

  saveRules(config: Partial<DispatchRulesConfig>): Observable<{ success: boolean; data: DispatchRulesConfig }> {
    return this.http.post<{ success: boolean; data: DispatchRulesConfig }>(
      `${this.baseUrl}/v1/logistica/dispatch-rules`, config
    ).pipe(
      tap(res => {
        if (res.success) {
          this.rulesCache = res.data;
          this.cacheTimestamp = Date.now();
        }
      })
    );
  }

  clearCache(): void {
    this.rulesCache = null;
    this.cacheTimestamp = 0;
  }

  // ===== Suggestion =====

  suggestTransporter(params: { ciudad?: string; zonaCobro?: string; valor?: number }): Observable<TransporterSuggestion> {
    const queryParams = new URLSearchParams();
    if (params.ciudad) queryParams.set('ciudad', params.ciudad);
    if (params.zonaCobro) queryParams.set('zonaCobro', params.zonaCobro);
    if (params.valor != null) queryParams.set('valor', params.valor.toString());

    return this.http.get<TransporterSuggestion>(
      `${this.baseUrl}/v1/logistica/suggest-transporter?${queryParams.toString()}`
    );
  }

  // ===== Local Rule Evaluation (for UI without backend call) =====

  evaluateRulesLocally(pedido: any): DispatchRuleAction | null {
    if (!this.rulesCache || !this.rulesCache.reglas) return null;

    const reglas = this.rulesCache.reglas
      .filter(r => r.activa !== false)
      .sort((a, b) => (a.prioridad || 99) - (b.prioridad || 99));

    for (const regla of reglas) {
      const cond = regla.condiciones;
      let match = true;

      if (cond.zonaCobro?.length > 0) {
        const zona = pedido.envio?.zonaCobro || pedido.zonaCobro;
        if (!zona || !cond.zonaCobro.includes(zona)) match = false;
      }

      if (match && cond.ciudad?.length > 0) {
        const ciudad = pedido.envio?.ciudad || pedido.ciudad;
        if (!ciudad || !cond.ciudad.includes(ciudad)) match = false;
      }

      if (match && cond.valorMinimo != null) {
        const valor = pedido.totalPedidoConDescuento || 0;
        if (valor < cond.valorMinimo) match = false;
      }

      if (match && cond.valorMaximo != null) {
        const valor = pedido.totalPedidoConDescuento || 0;
        if (valor > cond.valorMaximo) match = false;
      }

      if (match) return regla.accion;
    }

    return null;
  }

  // ===== Group & Suggest for batch =====

  groupAndSuggest(pedidos: any[]): Map<string, { pedidos: any[]; sugerido: DispatchRuleAction | null }> {
    const groups = new Map<string, { pedidos: any[]; sugerido: DispatchRuleAction | null }>();

    for (const pedido of pedidos) {
      const ciudad = pedido.envio?.ciudad || pedido.ciudad || 'Sin ciudad';
      const zona = pedido.envio?.zonaCobro || pedido.zonaCobro || 'Sin zona';
      const key = `${ciudad} - ${zona}`;

      if (!groups.has(key)) {
        groups.set(key, { pedidos: [], sugerido: null });
      }
      groups.get(key)!.pedidos.push(pedido);
    }

    // Evaluate rules for each group using first pedido as representative
    for (const [key, group] of groups) {
      if (group.pedidos.length > 0) {
        group.sugerido = this.evaluateRulesLocally(group.pedidos[0]);
      }
    }

    return groups;
  }

  // ===== Batch Dispatch =====

  batchDispatch(grupos: Array<{
    pedidos: string[];
    transportadorId: string;
    transportadorNombre?: string;
    metodoEnvio?: string;
    zona?: string;
  }>): Observable<{
    success: boolean;
    ordenesCreadas: any[];
    pedidosDespachados: number;
    errores: string[];
  }> {
    return this.http.post<any>(`${this.baseUrl}/v1/logistica/shippingorders/batch-dispatch`, { grupos });
  }
}
