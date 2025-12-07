import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  FulfillmentSyncLogsService,
  FulfillmentSyncLog,
  SyncLogFilters,
  SyncStats
} from '../../../shared/services/fulfillment/fulfillment-sync-logs.service';

@Component({
  selector: 'app-fulfillment-sync-history',
  templateUrl: './fulfillment-sync-history.component.html',
  styleUrls: ['./fulfillment-sync-history.component.scss']
})
export class FulfillmentSyncHistoryComponent implements OnInit, OnChanges {
  @Input() bodegaId: string = '';
  @Input() provider: string = '';

  logs: FulfillmentSyncLog[] = [];
  loading = false;
  loadingStats = false;

  // Filtros
  filtros: SyncLogFilters = {
    syncType: '',
    limit: 50
  };

  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;

  // Estadísticas
  stats: SyncStats = {
    totalSincronizaciones: 0,
    productosActualizados: 0,
    errores: 0,
    ultimaSincronizacion: undefined,
    syncsPorDia: []
  };

  // Opciones para dropdown de tipo de sync
  syncTypeOptions = [
    { label: 'Todos los tipos', value: '' },
    { label: 'Producto individual', value: 'producto' },
    { label: 'Bodega completa', value: 'bodega_completa' },
    { label: 'Automático', value: 'automatico' }
  ];

  // Para mostrar más detalles de un log
  logDetalleSeleccionado: FulfillmentSyncLog | null = null;
  mostrarModalDetalle: boolean = false;

  constructor(private syncLogsService: FulfillmentSyncLogsService) {}

  ngOnInit(): void {
    this.loadLogs();
    this.loadStats();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bodegaId'] && !changes['bodegaId'].firstChange) {
      this.loadLogs();
      this.loadStats();
    }
  }

  loadLogs(): void {
    this.loading = true;

    const filters: SyncLogFilters = {
      ...this.filtros,
      bodegaId: this.bodegaId || undefined,
      provider: this.provider || undefined
    };

    if (this.fechaInicio) {
      filters.fechaInicio = this.fechaInicio.toISOString();
    }
    if (this.fechaFin) {
      filters.fechaFin = this.fechaFin.toISOString();
    }

    this.syncLogsService.getSyncLogs(filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.logs = response.data.logs.map(log => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
        } else {
          this.logs = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando logs de sincronización:', error);
        this.logs = [];
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.loadingStats = true;

    this.syncLogsService.getSyncStats(this.bodegaId || undefined).subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.data;
          if (this.stats.ultimaSincronizacion) {
            this.stats.ultimaSincronizacion = new Date(this.stats.ultimaSincronizacion);
          }
        }
        this.loadingStats = false;
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        this.loadingStats = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.loadLogs();
  }

  limpiarFiltros(): void {
    this.filtros = {
      syncType: '',
      limit: 50
    };
    this.fechaInicio = null;
    this.fechaFin = null;
    this.loadLogs();
  }

  verDetalle(log: FulfillmentSyncLog): void {
    this.logDetalleSeleccionado = log;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.logDetalleSeleccionado = null;
  }

  getResultadoClass(resultado: string): string {
    switch (resultado) {
      case 'success':
        return 'badge bg-success';
      case 'error':
        return 'badge bg-danger';
      case 'warning':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }

  getResultadoLabel(resultado: string): string {
    switch (resultado) {
      case 'success':
        return 'Exitoso';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      default:
        return resultado;
    }
  }

  getSyncTypeLabel(syncType: string): string {
    switch (syncType) {
      case 'producto':
        return 'Producto';
      case 'bodega_completa':
        return 'Bodega completa';
      case 'automatico':
        return 'Automático';
      default:
        return syncType;
    }
  }

  getSyncTypeIcon(syncType: string): string {
    switch (syncType) {
      case 'producto':
        return 'pi pi-box';
      case 'bodega_completa':
        return 'pi pi-building';
      case 'automatico':
        return 'pi pi-clock';
      default:
        return 'pi pi-sync';
    }
  }

  formatDiferencia(diferencia: number | undefined): string {
    if (diferencia === null || diferencia === undefined) return '-';
    if (diferencia > 0) return `+${diferencia}`;
    return diferencia.toString();
  }

  getDiferenciaClass(diferencia: number | undefined): string {
    if (diferencia === null || diferencia === undefined) return '';
    if (diferencia > 0) return 'text-success';
    if (diferencia < 0) return 'text-danger';
    return '';
  }

  refreshData(): void {
    this.loadLogs();
    this.loadStats();
  }
}
