import { Injectable } from '@angular/core';

interface CachedImage {
  url: string;
  dataUrl: string;
  timestamp: number;
  size?: number; // Tamaño en bytes
}

@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private readonly CACHE_KEY = 'imageCache';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 día
  private readonly MAX_CACHE_SIZE = 200; // Número máximo de imágenes en caché
  private readonly MAX_CACHE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB máximo

  constructor() {
    this.cleanupCache();
  }

  private cleanupCache(): void {
    try {
      const cache = this.getCache();
      const now = Date.now();
      let totalSize = 0;
      let validCache = cache.filter(item => 
        now - item.timestamp < this.CACHE_DURATION
      );

      // Calcular tamaño total y ordenar por timestamp
      validCache = validCache.map(item => {
        const size = this.getDataUrlSize(item.dataUrl);
        return { ...item, size };
      }).sort((a, b) => b.timestamp - a.timestamp);

      // Mantener solo las imágenes que quepan en el límite de tamaño
      const trimmedCache: CachedImage[] = [];
      for (const item of validCache) {
        if (totalSize + (item.size || 0) <= this.MAX_CACHE_SIZE_BYTES && 
            trimmedCache.length < this.MAX_CACHE_SIZE) {
          trimmedCache.push(item);
          totalSize += item.size || 0;
        }
      }

      // Log de diagnóstico
      console.log('Diagnóstico de caché:', {
        totalImages: validCache.length,
        keptImages: trimmedCache.length,
        totalSize: this.formatBytes(totalSize),
        maxSize: this.formatBytes(this.MAX_CACHE_SIZE_BYTES),
        oldestImage: new Date(validCache[validCache.length - 1]?.timestamp).toLocaleString(),
        newestImage: new Date(validCache[0]?.timestamp).toLocaleString()
      });

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(trimmedCache));
    } catch (error) {
      console.error('Error limpiando caché:', error);
      this.clearCache();
    }
  }

  private getDataUrlSize(dataUrl: string): number {
    // Calcular tamaño aproximado de dataURL
    const base64 = dataUrl.split(',')[1];
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.ceil((base64.length * 3) / 4) - padding;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getCache(): CachedImage[] {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY);
      return cache ? JSON.parse(cache) : [];
    } catch {
      return [];
    }
  }

  async getCachedImage(url: string): Promise<string | null> {
    try {
      const cache = this.getCache();
      const cachedImage = cache.find(item => item.url === url);
      
      if (cachedImage && Date.now() - cachedImage.timestamp < this.CACHE_DURATION) {
        return cachedImage.dataUrl;
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo imagen del caché:', error);
      return null;
    }
  }

  async cacheImage(url: string, dataUrl: string): Promise<void> {
    try {
      const cache = this.getCache();
      
      // Eliminar versión anterior si existe
      const existingIndex = cache.findIndex(item => item.url === url);
      if (existingIndex !== -1) {
        cache.splice(existingIndex, 1);
      }

      // Añadir nueva imagen al caché
      cache.push({
        url,
        dataUrl,
        timestamp: Date.now()
      });

      // Limpiar caché si excede el límite
      if (cache.length > this.MAX_CACHE_SIZE) {
        cache.sort((a, b) => b.timestamp - a.timestamp);
        cache.splice(this.MAX_CACHE_SIZE);
      }

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error guardando imagen en caché:', error);
    }
  }

  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Error limpiando caché:', error);
    }
  }
} 