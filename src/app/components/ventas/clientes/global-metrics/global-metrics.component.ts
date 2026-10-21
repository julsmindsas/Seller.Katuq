import { Component, OnDestroy, OnInit } from '@angular/core'; // v1
import { Subject } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';

/**
 * Panel de métricas globales de clientes — va ARRIBA del listado de clientes.
 * Solo lectura. Una sola llamada al backend (header `company` via interceptor).
 * Datos cacheados (~30 min) — `_stale` indica recálculo en segundo plano.
 */
interface GlobalCustomerMetrics {
  totalPedidos: number;
  totalFacturado: number;
  ticketPromedioGlobal: number;
  pedidosUltimos30dias: number;
  pedidosUltimos7dias: number;
  tasaCancelaciones: number;
  totalClientes: number;       // total REAL de clientes (colección clients)
  clientesConPedidos: number;  // subconjunto: con ≥1 pedido en los últimos 12m
  clientesNuevos30dias: number;
  distribucionRFM: { 'Campeón': number; Fiel: number; 'En riesgo': number; Hibernando: number; Perdido: number };
  clientesEnAlerta: number;
  canalPreferido: { canal: string; cantidad: number }[];
  topCategorias: { nombre: string; cantidad: number }[];
  topProductos: { nombre: string; cantidad: number }[];
  _stale: boolean;
  _cachedAt: number;
}

@Component({
  selector: 'app-global-metrics',
  templateUrl: './global-metrics.component.html',
  styleUrls: ['./global-metrics.component.scss'],
})
export class GlobalMetricsComponent implements OnInit, OnDestroy {
  loading = false;
  error = false;
  metrics: GlobalCustomerMetrics | null = null;
  mostrarDetalles = false;

  private destroy$ = new Subject<void>();

  /** Orden fijo de segmentos RFM para iterar en el template. */
  readonly rfmSegmentos: string[] = ['Campeón', 'Fiel', 'En riesgo', 'Hibernando', 'Perdido'];

  constructor(private ventas: VentasService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.ventas
      .getGlobalCustomerMetrics()
      .pipe(
        timeout(8000),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          this.metrics = res;
          this.loading = false;
        },
        error: () => {
          this.error = true;
          this.loading = false;
        },
      });
  }

  toggleDetalles(): void {
    this.mostrarDetalles = !this.mostrarDetalles;
  }

  /** Top 3 canales (ya ordenados por el backend, pero recortamos por seguridad). */
  get topCanales(): { canal: string; cantidad: number }[] {
    return (this.metrics?.canalPreferido || []).slice(0, 3);
  }

  get topCategorias3(): { nombre: string; cantidad: number }[] {
    return (this.metrics?.topCategorias || []).slice(0, 3);
  }

  /** "Actualizado hace X min" — solo se muestra cuando los datos están stale. */
  get staleLabel(): string {
    if (!this.metrics?._cachedAt) return '';
    const mins = Math.max(0, Math.round((Date.now() - this.metrics._cachedAt) / 60000));
    if (mins < 1) return 'Actualizado hace menos de 1 min';
    return `Actualizado hace ${mins} min`;
  }

  rfmCount(segmento: string): number {
    const dist = this.metrics?.distribucionRFM as Record<string, number> | undefined;
    return dist?.[segmento] ?? 0;
  }

  rfmColor(segmento: string): string {
    const map: Record<string, string> = {
      'Campeón': '#1E874B',
      'Fiel': '#1E6FD9',
      'En riesgo': '#D9820A',
      'Hibernando': '#5A6B78',
      'Perdido': '#D64545',
    };
    return map[segmento] ?? '#5A6B78';
  }

  rfmBg(segmento: string): string {
    const map: Record<string, string> = {
      'Campeón': '#E6F7EE',
      'Fiel': '#E7F1FF',
      'En riesgo': '#FFF1DF',
      'Hibernando': '#eef0f3',
      'Perdido': '#FDECEC',
    };
    return map[segmento] ?? '#eef0f3';
  }
}
