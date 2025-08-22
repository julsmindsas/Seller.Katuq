import { Injectable } from '@angular/core';
import { IntegrationCacheService } from './integration-cache.service';
import { IntegrationStateService } from './integration-state.service';
import { IntegrationsService } from './integrations.service';

@Injectable({
  providedIn: 'root'
})
export class IntegrationManualControlService {
  
  constructor(
    private cacheService: IntegrationCacheService,
    private stateService: IntegrationStateService,
    private integrationsService: IntegrationsService
  ) {}

  /**
   * Limpiar cache manualmente
   */
  cleanupCache(): void {
    this.cacheService.manualCleanup();
    console.log('✅ Cache limpiado manualmente');
  }

  /**
   * Actualizar estadísticas del cache manualmente
   */
  updateCacheStats(): void {
    this.cacheService.manualUpdateStats();
    console.log('✅ Estadísticas del cache actualizadas manualmente');
  }

  /**
   * Refrescar estado de integraciones manualmente
   */
  refreshIntegrationsState(): void {
    this.stateService.manualRefreshState();
    console.log('✅ Estado de integraciones refrescado manualmente');
  }

  /**
   * Realizar health check manual
   */
  performHealthCheck(): void {
    this.integrationsService.getHealthCheck().subscribe(
      health => {
        console.log('✅ Health check manual completado:', health);
      },
      error => {
        console.warn('⚠️ Health check manual falló:', error);
      }
    );
  }

  /**
   * Limpiar todo el cache
   */
  clearAllCache(): void {
    this.cacheService.clear();
    console.log('✅ Todo el cache limpiado manualmente');
  }

  /**
   * Obtener estadísticas del cache
   */
  getCacheStats(): any {
    return this.cacheService.getStats();
  }

  /**
   * Obtener información detallada del cache
   */
  getCacheInfo(): any {
    return this.cacheService.getCacheInfo();
  }

  /**
   * Invalidar cache por patrón
   */
  invalidateCachePattern(pattern: RegExp): number {
    const invalidated = this.cacheService.invalidatePattern(pattern);
    console.log(`✅ Cache invalidado por patrón: ${invalidated} entradas eliminadas`);
    return invalidated;
  }

  /**
   * Prefetch de datos comunes
   */
  prefetchCommonData(): void {
    this.cacheService.prefetchCommonData();
    console.log('✅ Prefetch de datos comunes iniciado manualmente');
  }

  /**
   * Warming del cache con datos críticos
   */
  warmUpCache(criticalData: { [key: string]: any }): void {
    this.cacheService.warmUp(criticalData);
    console.log('✅ Cache warming iniciado manualmente');
  }
}
