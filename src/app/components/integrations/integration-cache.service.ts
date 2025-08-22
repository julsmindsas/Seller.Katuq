import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, timer } from 'rxjs';
import { map, tap, catchError, switchMap, share } from 'rxjs/operators';
import { Integration } from './integrations.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  maxAge?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  hitRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Observable<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutos
  private readonly maxCacheSize = 100;
  
  // Estadísticas de cache
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    entries: 0,
    hitRate: 0
  };

  private statsSubject = new BehaviorSubject<CacheStats>(this.stats);
  public readonly stats$ = this.statsSubject.asObservable();

  constructor() {
    // DESHABILITADO: Limpieza automática cada 10 minutos
    // timer(0, 10 * 60 * 1000).subscribe(() => {
    //   this.cleanup();
    // });

    // DESHABILITADO: Reportar estadísticas cada minuto
    // timer(0, 60 * 1000).subscribe(() => {
    //   this.updateStats();
    // });
  }

  /**
   * Obtener datos del cache o ejecutar la función de fetch
   */
  get<T>(
    key: string, 
    fetchFn: () => Observable<T>, 
    ttl: number = this.defaultTTL,
    forceRefresh: boolean = false
  ): Observable<T> {
    // Si está forzando refresh, eliminar del cache
    if (forceRefresh) {
      this.delete(key);
    }

    const cached = this.getCacheEntry<T>(key);
    
    // Si está en cache y es válido, devolverlo
    if (cached && this.isValid(cached)) {
      this.recordHit();
      cached.hits++;
      return of(cached.data);
    }

    // Si ya hay una petición pendiente para esta clave, reutilizarla
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)! as Observable<T>;
    }

    // Ejecutar fetch y cachear resultado
    this.recordMiss();
    const request$ = fetchFn().pipe(
      tap(data => {
        this.set(key, data, ttl);
        this.pendingRequests.delete(key);
      }),
      catchError(error => {
        this.pendingRequests.delete(key);
        throw error;
      }),
      share()
    );

    this.pendingRequests.set(key, request$);
    return request$;
  }

  /**
   * Establecer valor en cache
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL, maxAge?: number): void {
    // Si el cache está lleno, hacer espacio
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      maxAge
    };

    this.cache.set(key, entry);
  }

  /**
   * Obtener valor del cache sin validar TTL
   */
  getRaw<T>(key: string): T | null {
    const entry = this.getCacheEntry<T>(key);
    return entry ? entry.data : null;
  }

  /**
   * Verificar si una clave existe en cache y es válida
   */
  has(key: string): boolean {
    const entry = this.getCacheEntry(key);
    return entry ? this.isValid(entry) : false;
  }

  /**
   * Eliminar entrada del cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.stats.evictions += this.stats.entries;
    this.stats.entries = 0;
  }

  /**
   * Invalidar entradas por patrón
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    this.stats.evictions += invalidated;
    return invalidated;
  }

  /**
   * Métodos específicos para integraciones
   */
  cacheIntegration(integration: Integration): void {
    if (integration.id) {
      this.set(`integration:${integration.id}`, integration);
    }
  }

  getCachedIntegration(id: string): Integration | null {
    return this.getRaw<Integration>(`integration:${id}`);
  }

  invalidateIntegration(id: string): void {
    this.delete(`integration:${id}`);
    // También invalidar listas que podrían contener esta integración
    this.invalidatePattern(/^integrations:/);
  }

  cacheIntegrationList(key: string, integrations: Integration[]): void {
    this.set(`integrations:${key}`, integrations);
    
    // También cachear individualmente cada integración
    integrations.forEach(integration => {
      if (integration.id) {
        this.cacheIntegration(integration);
      }
    });
  }

  getCachedIntegrationList(key: string): Integration[] | null {
    return this.getRaw<Integration[]>(`integrations:${key}`);
  }

  /**
   * Prefetch de datos comunes
   */
  prefetchCommonData(): void {
    const commonKeys = [
      'integrations:all',
      'integrations:active',
      'integrations:categories'
    ];

    // Prefetch solo si no están en cache
    commonKeys.forEach(key => {
      if (!this.has(key)) {
        // Aquí podrías implementar el prefetch específico
        console.log(`Prefetching: ${key}`);
      }
    });
  }

  /**
   * Warming del cache con datos críticos
   */
  warmUp(criticalData: { [key: string]: any }): void {
    Object.entries(criticalData).forEach(([key, data]) => {
      this.set(key, data, this.defaultTTL * 2); // TTL extendido para datos críticos
    });
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Obtener información detallada del cache
   */
  getCacheInfo(): {
    size: number;
    keys: string[];
    oldestEntry: string | null;
    newestEntry: string | null;
    memoryUsage: number;
  } {
    const entries = Array.from(this.cache.entries());
    const keys = entries.map(([key]) => key);
    
    let oldestEntry: string | null = null;
    let newestEntry: string | null = null;
    let oldestTime = Date.now();
    let newestTime = 0;

    entries.forEach(([key, entry]) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestEntry = key;
      }
      if (entry.timestamp > newestTime) {
        newestTime = entry.timestamp;
        newestEntry = key;
      }
    });

    return {
      size: this.cache.size,
      keys,
      oldestEntry,
      newestEntry,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Método público para limpieza manual del cache
   * (reemplaza la limpieza automática deshabilitada)
   */
  manualCleanup(): void {
    this.cleanup();
  }

  /**
   * Método público para actualizar estadísticas manualmente
   * (reemplaza la actualización automática deshabilitada)
   */
  manualUpdateStats(): void {
    this.updateStats();
  }

  /**
   * Método para limpiar todo el cache
   */
  private getCacheEntry<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key) as CacheEntry<T> | undefined;
  }

  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Verificar TTL
    if (age > entry.ttl) {
      return false;
    }

    // Verificar max age si está definido
    if (entry.maxAge && age > entry.maxAge) {
      return false;
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();
    let lruHits = Number.MAX_SAFE_INTEGER;

    // Encontrar la entrada menos recientemente usada (menor hits y timestamp más antiguo)
    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits || (entry.hits === lruHits && entry.timestamp < lruTime)) {
        lruHits = entry.hits;
        lruTime = entry.timestamp;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private recordHit(): void {
    this.stats.hits++;
  }

  private recordMiss(): void {
    this.stats.misses++;
  }

  private updateStats(): void {
    this.stats.entries = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    this.statsSubject.next({ ...this.stats });
  }

  private estimateMemoryUsage(): number {
    // Estimación simple del uso de memoria
    let usage = 0;
    for (const [key, entry] of this.cache.entries()) {
      usage += key.length * 2; // UTF-16
      usage += JSON.stringify(entry).length * 2; // Aproximación
    }
    return usage;
  }
} 