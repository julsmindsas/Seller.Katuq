import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LogisticaServiceV2 extends BaseService {
    private apiUrl = environment.urlApi;

    constructor(public http: HttpClient) {
        super(http);
    }

    // Transportadores
    getTransportadores(): Observable<any> {
        return this.http.get(`${this.apiUrl}/v1/logistica/vendors/all`);
    }

    getTransportadora(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors`, { id });
    }

    createTrasportadora(transportadora: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors/create`, transportadora);
    }

    updateTrasportadora(transportadora: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors/update`, transportadora);
    }

    deleteTrasportadora(id: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/vendors/delete`, id);
    }

    // Órdenes de envío
    /**
     * @deprecated Usar getShippingOrdersPaginated() para mejor rendimiento.
     * Este método se mantiene para compatibilidad pero puede ser lento con muchos registros.
     */
    getShippingOrders(): Observable<any> {
        console.warn('[DEPRECADO] getShippingOrders(): Use getShippingOrdersPaginated() para mejor rendimiento');
        
        // Usar el método optimizado con una sola llamada
        // El backend ya maneja la paginación internamente si es necesario
        return this.getShippingOrdersPaginated({
            page: 1,
            limit: 1000,  // Traer muchos registros en una sola llamada
            fields: 'full'
        }).pipe(
            map(response => {
                // Si viene con formato paginado, retornar solo la data para compatibilidad
                if (response && response.data) {
                    return response.data;
                }
                // Si ya es un array, retornarlo directamente
                if (Array.isArray(response)) {
                    return response;
                }
                // Fallback
                return [];
            })
        );
    }

    // ========== NUEVOS MÉTODOS OPTIMIZADOS ==========

    /**
     * Obtiene órdenes de envío con paginación (RECOMENDADO)
     * @param params Parámetros de paginación y filtrado
     * @returns Observable con data paginada y metadata
     */
    getShippingOrdersPaginated(params?: {
        page?: number;
        limit?: number;
        fields?: 'minimal' | 'full';
        fechaInicio?: string;
        fechaFin?: string;
        estado?: string;
        transportador?: string;
        searchText?: string;
    }): Observable<{
        data: any[];
        pagination: {
            page: number;
            limit: number;
            count: number;
            hasMore: boolean;
            total?: number;
            mode: string;
        }
    }> {
        const defaultParams = {
            page: 1,
            limit: 50,
            fields: 'full'
        };
        
        const queryParams = { ...defaultParams, ...params };
        
        // Limpiar parámetros undefined
        Object.keys(queryParams).forEach(key => {
            if (queryParams[key] === undefined || queryParams[key] === null) {
                delete queryParams[key];
            }
        });
        
        return this.http.get<any>(`${this.apiUrl}/v1/logistica/shippingorders/all`, {
            params: queryParams as any
        }).pipe(
            // Si el backend devuelve array directo (versión antigua), convertir a formato paginado
            map(response => {
                if (Array.isArray(response)) {
                    console.warn('Backend devolvió formato antiguo, adaptando...');
                    return {
                        data: response,
                        pagination: {
                            page: 1,
                            limit: response.length,
                            count: response.length,
                            hasMore: false,
                            mode: 'full'
                        }
                    };
                }
                return response;
            })
        );
    }

    /**
     * Obtiene TODAS las órdenes de envío iterando páginas
     * Úselo solo cuando necesite todos los registros
     */
    async getAllShippingOrdersV2(
        fields: 'minimal' | 'full' = 'full',
        filters?: {
            fechaInicio?: string;
            fechaFin?: string;
            estado?: string;
            transportador?: string;
        }
    ): Promise<any[]> {
        let allOrders: any[] = [];
        let page = 1;
        let hasMore = true;
        const limit = 100; // Máximo permitido por el backend
        
        console.log(`Cargando todas las órdenes de envío (modo: ${fields})...`);
        
        while (hasMore) {
            try {
                const response = await this.getShippingOrdersPaginated({
                    page,
                    limit,
                    fields,
                    ...filters
                }).toPromise();
                
                if (response && response.data) {
                    allOrders = [...allOrders, ...response.data];
                    hasMore = response.pagination?.hasMore || false;
                    
                    // Log de progreso
                    if (page % 5 === 0) {
                        console.log(`Cargadas ${allOrders.length} órdenes...`);
                    }
                    
                    page++;
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error(`Error cargando página ${page}:`, error);
                // Si falla, intentar con el endpoint antiguo como fallback
                if (page === 1) {
                    console.log('Intentando con endpoint antiguo...');
                    const oldResponse = await this.http.get(`${this.apiUrl}/v1/logistica/shippingorders/all`).toPromise();
                    return Array.isArray(oldResponse) ? oldResponse : [];
                }
                hasMore = false;
            }
        }
        
        console.log(`Total de órdenes cargadas: ${allOrders.length}`);
        return allOrders;
    }

    /**
     * Obtiene órdenes con caché automático (5 minutos)
     * Ideal para datos que no cambian frecuentemente
     */
    private shippingOrdersCache: Map<string, { data: any, timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    getShippingOrdersCached(
        params?: {
            page?: number;
            limit?: number;
            fields?: 'minimal' | 'full';
            forceRefresh?: boolean;
        }
    ): Observable<any> {
        const cacheKey = JSON.stringify(params || {});
        const now = Date.now();
        const cached = this.shippingOrdersCache.get(cacheKey);
        
        // Verificar caché
        if (!params?.forceRefresh && cached && (now - cached.timestamp) < this.CACHE_DURATION) {
            console.log('Devolviendo órdenes desde caché');
            return of(cached.data);
        }
        
        // Cargar y cachear
        return this.getShippingOrdersPaginated(params).pipe(
            tap(response => {
                this.shippingOrdersCache.set(cacheKey, {
                    data: response,
                    timestamp: now
                });
                
                // Limpiar caché antiguo
                this.cleanOldCache();
            })
        );
    }
    
    /**
     * Limpia entradas de caché expiradas
     */
    private cleanOldCache(): void {
        const now = Date.now();
        this.shippingOrdersCache.forEach((value, key) => {
            if (now - value.timestamp > this.CACHE_DURATION) {
                this.shippingOrdersCache.delete(key);
            }
        });
    }
    
    /**
     * Limpia todo el caché de órdenes
     */
    clearShippingOrdersCache(): void {
        this.shippingOrdersCache.clear();
        console.log('Caché de órdenes limpiado');
    }

    getShippingOrder(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/get`, { nroShippingOrder: id });
    }

    createShippingOrder(shippingOrder: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/create`, shippingOrder).pipe(
            tap(() => this.clearShippingOrdersCache())
        );
    }

    updateShippingOrder(nroShippingOrder: number | string, shippingOrder: any): Observable<any> {
        const payload = { nroShippingOrder, ...shippingOrder };
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/update`, payload).pipe(
            tap(() => this.clearShippingOrdersCache())
        );
    }

    dispatchShippingOrder(shippingOrder: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/shippingorders/dispatch`, shippingOrder).pipe(
            tap(() => this.clearShippingOrdersCache())
        );
    }

    // Shipments (transportadoras)
    createShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments`, shipment);
    }

    findShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/find`, shipment);
    }

    updateShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/update`, shipment);
    }

    deleteShipment(shipment: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/delete`, shipment);
    }


    // Nuevo método para seguimiento de pedidos despachados
    trackDespachado(companyId: string, provider: string, order: string, options: any = {}): Observable<any> {
        const payload = { companyId, provider, order, options };
        return this.http.post(`${this.apiUrl}/v1/logistics/despachados/track`, payload);
    }

    // ========== MÉTODOS ESPECÍFICOS PARA ENVIAME.IO ==========

    /**
     * Obtener tarifas de envío para cotización
     * @param payload Datos para cotización
     */
    getRates(payload: {
        companyId: string;
        provider: string;
        origin: any;
        destination: any;
        package: any;
        options?: any;
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/rates`, payload);
    }

    /**
     * Cancelar envío creado
     * @param payload Datos para cancelación
     */
    /**
     * Cancela un envío en el proveedor logístico.
     *
     * `shipmentId` es el identificador DEL PROVEEDOR (para Enviame,
     * `pedido.shippment.shipmentId`), que es lo que el backend exige. El
     * `trackingNumber` (guía del transportador) viaja solo como referencia.
     */
    cancelShipment(payload: {
        companyId: string;
        provider: string;
        shipmentId: string | number;
        trackingNumber?: string;
        reason?: string;
        options?: any;
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/cancel`, payload);
    }

    /**
     * Rastrear envío usando el endpoint específico /track
     * @param payload Datos para tracking
     */
    trackShipment(payload: {
        companyId: string;
        provider: string;
        trackingNumber: string;
        options?: any;
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/track`, payload);
    }

    /**
     * Obtener etiqueta de envío para descarga/impresión
     * @param payload Datos para obtener etiqueta
     */
    getShipmentLabel(payload: {
        companyId: string;
        provider: string;
        trackingNumber: string;
        format?: 'pdf' | 'zpl';
        options?: any;
    }): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistics/shipments/label`, payload);
    }

    /**
     * Genera la GUÍA DE ENVÍO de una orden. El backend decide el proveedor según
     * el transportador (guiaProvider): 'katuq' devuelve el PDF propio como base64
     * (labelPdf); 'enviame' devuelve la etiqueta real del provider. Se puede forzar
     * el proveedor con `provider`.
     */
    generarGuia(orderId: string, provider?: 'katuq' | 'enviame'): Observable<any> {
        return this.http.post(`${this.apiUrl}/v1/logistica/guia`, { orderId, provider });
    }

    // ========== MÉTRICAS AGREGADAS ==========

    /**
     * Obtiene métricas agregadas de despachos calculadas en el backend
     * Esto evita cálculos en frontend y asegura métricas sobre los pedidos filtrados
     * @param params Filtros de fecha opcionales (deben coincidir con los filtros de la tabla)
     * @returns Observable con métricas precalculadas
     */
    getShippingMetrics(params?: {
        fechaInicio?: string;
        fechaFin?: string;
    }): Observable<{
        pedidosUrgentes: number;
        pedidosEnRuta: number;
        pedidosParaDespacho: number;
        pedidosEntregados: number;
        pedidosSinProducir: number;
        totalPedidosActivos: number;
        filtrosAplicados?: { fechaInicio: string | null; fechaFin: string | null };
        calculadoEn: string;
    }> {
        let url = `${this.apiUrl}/v1/logistica/shippingorders/metrics`;
        const queryParams: string[] = [];

        if (params?.fechaInicio) {
            queryParams.push(`fechaInicio=${params.fechaInicio}`);
        }
        if (params?.fechaFin) {
            queryParams.push(`fechaFin=${params.fechaFin}`);
        }

        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        return this.http.get<any>(url);
    }

    /**
     * Endpoint ultraligero: Solo nroShippingOrder + pedidoIds por orden.
     * NO hace batch fetch de pedidos — solo lee shipping_orders.
     * Costo: ~N lecturas de shipping_orders (sin lecturas de orders).
     */
    getShippingOrderPedidoRefs(params?: {
        fechaInicio?: string;
        fechaFin?: string;
    }): Observable<{ nroShippingOrder: string; pedidoIds: string[] }[]> {
        let url = `${this.apiUrl}/v1/logistica/shippingorders/pedido-refs`;
        const queryParams: string[] = [];

        if (params?.fechaInicio) {
            queryParams.push(`fechaInicio=${params.fechaInicio}`);
        }
        if (params?.fechaFin) {
            queryParams.push(`fechaFin=${params.fechaFin}`);
        }

        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        return this.http.get<{ nroShippingOrder: string; pedidoIds: string[] }[]>(url);
    }

}