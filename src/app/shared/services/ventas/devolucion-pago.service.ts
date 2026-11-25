import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { BaseService } from '../base.service';
import { CompanyFeaturesService } from '../company-features.service';
import { DevolucionPagoVista } from '../../utils/devolucion-pago';

export interface DatosDevolucion {
  referencia: string;
  fechaDevolucion?: string;
  observacion?: string;
}

/** Un aviso de pago de una pasarela, ya traducido (D-725). */
export interface AvisoPago {
  id: string;
  fecha: string | null;
  pasarela: string | null;
  evento: string | null;
  estadoReportado: string | null;
  transaccion: string | null;
  referencia: string | null;
  monto: number | null;
  medio: string | null;
  firma: 'valida' | 'invalida' | 'sin_revisar';
  accion: string;
  tipo: 'aplicado' | 'ignorado' | 'rechazado' | 'fallo';
}

export interface AvisosDePedido {
  pedido: { id: string; nroPedido: string | null };
  avisos: AvisoPago[];
  resumen: { total: number; aplicados: number; ignorados: number; rechazados: number; fallidos: number };
}

/** Fila del tablero de devoluciones de Tesorería (D-724). */
export interface FilaDevolucion {
  id: string;
  nroPedido: string | null;
  cliente: string | null;
  estado: 'por_devolver' | 'devuelto';
  valor: number;
  pasarela: string | null;
  transaccion: string | null;
  fechaCancelacion: string | null;
  motivoCancelacion: string | null;
  canceladoPor: string | null;
  facturaSinNotaCredito: boolean;
  diasEsperando?: number;
  atrasada?: boolean;
  referencia?: string | null;
  fechaDevolucion?: string | null;
  observacion?: string | null;
  marcadoPor?: string | null;
  marcadoEn?: string | null;
}

export interface TableroDevoluciones {
  desde: string | null;
  diasAviso: number;
  resumen: {
    porDevolver: { cantidad: number; valor: number; atrasadas: number };
    devueltos: { cantidad: number; valor: number };
    facturasSinNotaCredito: number;
  };
  filas: FilaDevolucion[];
}

/**
 * Devoluciones de pagos de pasarela, a mano (D-723).
 *  - `desde()`: fecha desde la que el comercio marca devoluciones (null = función apagada o sin
 *    fecha). Solo se pide con la bandera `paymentRefundTracking` encendida: apagada, el servidor
 *    responde 403 y no hay nada que mostrar.
 *  - `marcarDevuelto()`: POST que valida rol, empresa y que el pedido siga por devolver.
 */
@Injectable({ providedIn: 'root' })
export class DevolucionPagoService extends BaseService {
  private features = inject(CompanyFeaturesService);
  private desde$?: Observable<string | null>;
  private desdeCargado: string | null = null;

  get activa(): boolean {
    return this.features.isEnabled('paymentRefundTracking');
  }

  /** Última fecha cargada (para las plantillas, sin suscribirse). */
  get desdeActual(): string | null {
    return this.desdeCargado;
  }

  desde(): Observable<string | null> {
    if (!this.activa) return of(null);
    if (!this.desde$) {
      this.desde$ = this.getSinLoader<any>('/v1/orders/devolucion-pago/config').pipe(
        map((r) => (r && r.data && r.data.desde) || null),
        map((d) => (this.desdeCargado = d)),
        catchError(() => of(null)),
        shareReplay(1),
      );
    }
    return this.desde$;
  }

  /** D-724: tablero de Tesorería (Administrador y Tesorería). Fechas AAAA-MM-DD para los devueltos. */
  listar(filtro: { estado?: string; desde?: string; hasta?: string } = {}): Observable<TableroDevoluciones> {
    const q = Object.entries(filtro)
      .filter(([, v]) => !!v)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return this.getSinLoader<any>(`/v1/orders/devolucion-pago/lista${q ? '?' + q : ''}`).pipe(map((r) => r.data as TableroDevoluciones));
  }

  /** D-725: historial de avisos de pago del pedido (solo lectura). */
  avisos(orderId: string): Observable<AvisosDePedido> {
    return this.getSinLoader<any>(`/v1/orders/${encodeURIComponent(orderId)}/avisos-pago`).pipe(map((r) => r.data as AvisosDePedido));
  }

  marcarDevuelto(orderId: string, datos: DatosDevolucion): Observable<DevolucionPagoVista> {
    return this.post<any>(`/v1/orders/${encodeURIComponent(orderId)}/devolucion-pago`, datos).pipe(
      map((r) => r.data as DevolucionPagoVista),
    );
  }
}
