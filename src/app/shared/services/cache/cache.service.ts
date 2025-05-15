import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private clearCache$ = new Subject<void>();
  private DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutos por defecto

  constructor() {
    // Recuperar caché del localStorage al iniciar
    this.loadCacheFromStorage();
    
    // Guardar caché en localStorage antes de cerrar
    window.addEventListener('beforeunload', () => {
      this.saveCacheToStorage();
    });
  }

  /**
   * Obtiene un valor del caché o ejecuta la función para obtenerlo
   */
  get<T>(
    key: string,
    getFn: () => Observable<T>,
    expiryTime: number = this.DEFAULT_CACHE_TIME
  ): Observable<T> {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);
    const now = Date.now();

    if (cached && expiry && now < expiry) {
      return of(cached);
    }

    const result$ = getFn().pipe(
      shareReplay(1),
      takeUntil(this.clearCache$)
    );

    result$.subscribe(data => {
      this.cache.set(key, data);
      this.cacheExpiry.set(key, now + expiryTime);
    });

    return result$;
  }

  /**
   * Limpia una entrada específica del caché
   */
  clearCacheEntry(key: string): void {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    this.removeFromStorage(key);
  }

  /**
   * Limpia todo el caché
   */
  clearAllCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.clearCache$.next();
    localStorage.removeItem('app_cache');
    localStorage.removeItem('app_cache_expiry');
  }

  private loadCacheFromStorage(): void {
    try {
      const cachedData = localStorage.getItem('app_cache');
      const cachedExpiry = localStorage.getItem('app_cache_expiry');
      
      if (cachedData && cachedExpiry) {
        this.cache = new Map(JSON.parse(cachedData));
        this.cacheExpiry = new Map(JSON.parse(cachedExpiry));
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
      this.clearAllCache();
    }
  }

  private saveCacheToStorage(): void {
    try {
      localStorage.setItem('app_cache', JSON.stringify(Array.from(this.cache.entries())));
      localStorage.setItem('app_cache_expiry', JSON.stringify(Array.from(this.cacheExpiry.entries())));
    } catch (error) {
      console.error('Error saving cache to storage:', error);
    }
  }

  private removeFromStorage(key: string): void {
    try {
      const cachedData = localStorage.getItem('app_cache');
      const cachedExpiry = localStorage.getItem('app_cache_expiry');
      
      if (cachedData && cachedExpiry) {
        const dataMap = new Map(JSON.parse(cachedData));
        const expiryMap = new Map(JSON.parse(cachedExpiry));
        
        dataMap.delete(key);
        expiryMap.delete(key);
        
        localStorage.setItem('app_cache', JSON.stringify(Array.from(dataMap.entries())));
        localStorage.setItem('app_cache_expiry', JSON.stringify(Array.from(expiryMap.entries())));
      }
    } catch (error) {
      console.error('Error removing key from storage:', error);
    }
  }
} 