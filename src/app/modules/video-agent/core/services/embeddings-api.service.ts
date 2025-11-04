import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@environments/environment';

/**
 * Response from embeddings generation API
 */
export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  timestamp: string;
}

/**
 * Servicio para generar embeddings multimodales usando Vertex AI
 * vía Firebase Functions backend proxy
 *
 * @description
 * Este servicio NO puede llamar directamente a Vertex AI desde Angular
 * debido a incompatibilidades del SDK. En su lugar, hace POST a un
 * endpoint de Firebase Functions que actúa como proxy.
 *
 * @architecture
 * Angular → HTTP POST → Firebase Functions → Vertex AI → Embeddings
 *
 * @see RAG_MULTIMODAL_HACEB.md para detalles de arquitectura
 */
@Injectable({
  providedIn: 'root'
})
export class EmbeddingsApiService {
  /**
   * URL base del backend de Firebase Functions
   * En desarrollo: http://localhost:3300
   * En producción: https://api.katuq.com
   */
  private apiUrl = environment.urlApi || 'https://api.katuq.com';

  constructor(private http: HttpClient) {
    console.log('🧠 EmbeddingsApiService initialized with URL:', this.apiUrl);
  }

  /**
   * Genera embedding de 1408 dimensiones para una imagen
   *
   * @param base64Image - Imagen en formato base64 (sin prefijo data:image/jpeg;base64,)
   * @returns Observable con el embedding y metadata
   *
   * @example
   * ```typescript
   * const base64 = 'iVBORw0KGgoAAAANSUhEUgA...'; // Sin prefijo
   * this.embeddingsApi.generateEmbedding(base64).subscribe(
   *   result => console.log('Embedding:', result.embedding.length),
   *   error => console.error('Error:', error)
   * );
   * ```
   */
  generateEmbedding(base64Image: string): Observable<EmbeddingResponse> {
    console.log('📸 Generating embedding for image (length:', base64Image.length, 'chars)');

    // Validar que la imagen no esté vacía
    if (!base64Image || base64Image.trim().length === 0) {
      console.error('❌ Empty image provided');
      return of({
        embedding: [],
        dimensions: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Limpiar prefijo data:image si existe
    const cleanBase64 = this.cleanBase64(base64Image);

    return this.http.post<EmbeddingResponse>(
      `${this.apiUrl}/api/embeddings/generate`,
      { image: cleanBase64 }
    ).pipe(
      map(response => {
        console.log('✅ Embedding generated:', response.dimensions, 'dimensions');
        return response;
      }),
      catchError(error => {
        console.error('❌ Error generating embedding:', error);

        // Retornar embedding vacío en caso de error
        // El servicio de reconocimiento debe manejar esto apropiadamente
        return of({
          embedding: [],
          dimensions: 0,
          timestamp: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Genera embeddings para múltiples imágenes en batch
   * (Útil para indexación masiva del catálogo)
   *
   * @param base64Images - Array de imágenes en base64
   * @returns Observable con array de embeddings
   */
  generateBatchEmbeddings(base64Images: string[]): Observable<EmbeddingResponse[]> {
    console.log('📸 Generating batch embeddings for', base64Images.length, 'images');

    return this.http.post<{ embeddings: EmbeddingResponse[] }>(
      `${this.apiUrl}/api/embeddings/generate-batch`,
      { images: base64Images.map(img => this.cleanBase64(img)) }
    ).pipe(
      map(response => {
        console.log('✅ Batch embeddings generated:', response.embeddings.length);
        return response.embeddings;
      }),
      catchError(error => {
        console.error('❌ Error generating batch embeddings:', error);
        return of([]);
      })
    );
  }

  /**
   * Limpia el prefijo data:image de un string base64
   *
   * @param base64 - String que puede contener prefijo data:image/jpeg;base64,
   * @returns Base64 limpio sin prefijo
   */
  private cleanBase64(base64: string): string {
    if (base64.includes('data:image')) {
      return base64.split(',')[1];
    }
    return base64;
  }

  /**
   * Verifica si el servicio de embeddings está disponible
   *
   * @returns Observable<boolean> indicando disponibilidad
   */
  isServiceAvailable(): Observable<boolean> {
    return this.http.get<{ status: string }>(
      `${this.apiUrl}/api/embeddings/health`
    ).pipe(
      map(response => response.status === 'ok'),
      catchError(() => of(false))
    );
  }
}
