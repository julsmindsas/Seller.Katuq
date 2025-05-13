import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImageProxyService {
  private cache: Map<string, string> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Devuelve la URL de imagen, usando caché si está disponible
   * @param imageUrl URL de la imagen original
   * @returns Observable con la URL de la imagen (original o cacheada)
   */
  getBase64Image(imageUrl: string): Observable<string> {
    // Si ya está en caché, devolver desde caché
    if (this.cache.has(imageUrl)) {
      return of(this.cache.get(imageUrl)!);
    }

    // Para todos los demás casos, devuelve la URL original
    // La directiva SafeImage se encargará de manejar las imágenes
    return of(imageUrl);
  }

  /**
   * Guarda una imagen en caché
   * @param originalUrl URL original de la imagen
   * @param dataUrl DataURL (base64) de la imagen
   */
  cacheImage(originalUrl: string, dataUrl: string): void {
    this.cache.set(originalUrl, dataUrl);
  }

  /**
   * Limpia la caché de imágenes
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Comprueba si una imagen es accesible y válida
   * @param url URL de la imagen a verificar
   * @returns Observable<boolean> que indica si la imagen es válida
   */
  checkImageExists(url: string): Observable<boolean> {
    // Para URLs relativas o de datos, devolver true
    if (url.startsWith('data:') || url.startsWith('/') || 
        url.startsWith('./') || url.startsWith('../')) {
      return of(true);
    }

    // Para URLs externas, intentar una solicitud HEAD
    return this.http.head(url, { observe: 'response' })
      .pipe(
        map(response => {
          const contentType = response.headers.get('Content-Type');
          return contentType ? contentType.startsWith('image/') : false;
        }),
        catchError(() => of(false))
      );
  }
} 