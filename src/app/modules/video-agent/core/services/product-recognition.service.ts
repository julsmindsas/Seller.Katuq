import { Injectable } from '@angular/core';
import { EmbeddingsApiService } from './embeddings-api.service';
import { ProductVectorDBService, ProductMatch } from './product-vector-db.service';

/**
 * Nivel de confianza del reconocimiento
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Resultado del reconocimiento de producto
 */
export interface RecognitionResult {
  matches: ProductMatch[];
  bestMatch: ProductMatch | null;
  contextForGemini: string;
  confidence: ConfidenceLevel;
  processingTimeMs: number;
}

/**
 * Servicio orquestador para reconocimiento de productos con RAG
 *
 * @description
 * Combina embeddings multimodales de Vertex AI con búsqueda vectorial
 * en Firestore para identificar electrodomésticos Haceb.
 *
 * @workflow
 * 1. Captura frame de video (base64)
 * 2. Genera embedding via Firebase Functions → Vertex AI
 * 3. Busca productos similares en Firestore (cosine similarity)
 * 4. Construye contexto enriquecido para Gemini
 * 5. Gemini analiza con contexto del catálogo
 *
 * @see RAG_MULTIMODAL_HACEB.md para arquitectura completa
 */
@Injectable({
  providedIn: 'root'
})
export class ProductRecognitionService {
  constructor(
    private embeddingsApi: EmbeddingsApiService,
    private vectorDB: ProductVectorDBService
  ) {
    console.log('🤖 ProductRecognitionService initialized');
  }

  /**
   * Identifica un electrodoméstico a partir de un frame de video
   *
   * @param videoFrame - Imagen en base64 (puede incluir prefijo data:image)
   * @param topK - Número de productos similares a buscar (default: 3)
   * @returns Promise con el resultado del reconocimiento
   *
   * @example
   * ```typescript
   * const frame = videoStreamService.captureFrame(); // base64
   * const result = await productRecognition.identifyAppliance(frame);
   *
   * if (result.confidence === 'high') {
   *   console.log('Producto identificado:', result.bestMatch.product.model);
   * }
   *
   * // Agregar contexto al prompt de Gemini
   * const enrichedPrompt = result.contextForGemini;
   * ```
   */
  async identifyAppliance(videoFrame: string, topK: number = 3): Promise<RecognitionResult> {
    const startTime = performance.now();

    console.log('🔍 Starting product identification...');

    try {
      // 1. Generar embedding del frame
      console.log('  📸 Step 1/3: Generating embedding...');
      const embeddingResponse = await this.embeddingsApi
        .generateEmbedding(videoFrame)
        .toPromise();

      // Validar embedding
      if (!embeddingResponse || embeddingResponse.embedding.length === 0) {
        console.error('❌ Failed to generate embedding');
        return this.buildEmptyResult(performance.now() - startTime);
      }

      console.log('  ✅ Embedding generated:', embeddingResponse.dimensions, 'dimensions');

      // 2. Buscar productos similares
      console.log('  🔍 Step 2/3: Searching similar products...');
      const matches = await this.vectorDB.searchSimilar(embeddingResponse.embedding, topK);

      console.log('  ✅ Found', matches.length, 'matches');

      // 3. Determinar mejor match
      const bestMatch = matches.length > 0 ? matches[0] : null;

      // 4. Determinar nivel de confianza
      const confidence = this.getConfidenceLevel(bestMatch?.similarity || 0);

      console.log('  🎯 Confidence level:', confidence.toUpperCase());

      // 5. Construir contexto para Gemini
      console.log('  📝 Step 3/3: Building context for Gemini...');
      const contextForGemini = this.buildGeminiContext(matches, confidence);

      const processingTimeMs = performance.now() - startTime;

      console.log(`✅ Product identification completed in ${processingTimeMs.toFixed(0)}ms`);

      return {
        matches,
        bestMatch,
        contextForGemini,
        confidence,
        processingTimeMs
      };
    } catch (error) {
      console.error('❌ Error in product identification:', error);
      return this.buildEmptyResult(performance.now() - startTime);
    }
  }

  /**
   * Determina el nivel de confianza basado en la similitud coseno
   *
   * @description
   * Thresholds:
   * - > 0.85: Alta confianza (match casi seguro)
   * - 0.75-0.85: Media confianza (probable match, confirmar con usuario)
   * - 0.65-0.75: Baja confianza (posible match, necesita validación)
   * - < 0.65: Sin confianza (no hay match)
   *
   * @param similarity - Score de similitud [0.0, 1.0]
   * @returns Nivel de confianza
   */
  private getConfidenceLevel(similarity: number): ConfidenceLevel {
    if (similarity > 0.85) return 'high';
    if (similarity > 0.75) return 'medium';
    if (similarity > 0.65) return 'low';
    return 'none';
  }

  /**
   * Construye contexto enriquecido para Gemini con información del catálogo
   *
   * @description
   * Este contexto se agrega al system instruction de Gemini para que tenga
   * conocimiento de los productos más similares del catálogo y pueda:
   * 1. Confirmar la identificación con mayor precisión
   * 2. Proporcionar especificaciones exactas
   * 3. Ofrecer información detallada del producto
   *
   * @param matches - Productos similares encontrados
   * @param confidence - Nivel de confianza general
   * @returns Texto formateado para agregar al prompt de Gemini
   */
  private buildGeminiContext(matches: ProductMatch[], confidence: ConfidenceLevel): string {
    if (matches.length === 0) {
      return `
BÚSQUEDA EN CATÁLOGO: Sin resultados

No encontré productos similares en nuestro catálogo de electrodomésticos Haceb.

INSTRUCCIONES:
- Identifica la categoría general del electrodoméstico que ves (nevera, lavadora, estufa, etc.)
- Describe sus características visuales
- Indica que no tenemos información específica de este modelo en nuestro catálogo
- Pregunta si el usuario puede proporcionar el modelo para búsqueda manual
      `.trim();
    }

    // Formatear información de los matches
    const matchesText = matches.map((m, i) => {
      const confidencePercent = (m.similarity * 100).toFixed(1);
      const confidenceIcon = this.getConfidenceIcon(m.similarity);

      return `
${i + 1}. ${m.product.model} ${confidenceIcon}
   📊 Confianza: ${confidencePercent}%
   🏷️ Categoría: ${m.product.category}
   📋 Especificaciones: ${m.product.specs}
   👁️ Características visuales: ${m.product.visualFeatures.join(', ')}
   🖼️ Imagen de referencia: ${m.product.imageUrl}
      `.trim();
    }).join('\n\n');

    // Instrucciones específicas según nivel de confianza
    const instructions = this.getConfidenceInstructions(confidence);

    return `
═══════════════════════════════════════════════════════════════
🔍 BÚSQUEDA EN CATÁLOGO HACEB - RESULTADOS DEL SISTEMA RAG
═══════════════════════════════════════════════════════════════

Encontré ${matches.length} producto(s) similares en nuestro catálogo:

${matchesText}

───────────────────────────────────────────────────────────────
📊 NIVEL DE CONFIANZA GENERAL: ${confidence.toUpperCase()}
───────────────────────────────────────────────────────────────

${instructions}

⚡ IMPORTANTE:
Basándote en estos datos del catálogo Y en lo que ves en la imagen del usuario,
identifica el electrodoméstico con la mayor precisión posible.

Si el nivel de confianza es MEDIUM o LOW, pregunta al usuario por características
específicas para confirmar el modelo exacto.
═══════════════════════════════════════════════════════════════
    `.trim();
  }

  /**
   * Obtiene instrucciones específicas según el nivel de confianza
   */
  private getConfidenceInstructions(confidence: ConfidenceLevel): string {
    switch (confidence) {
      case 'high':
        return `
✅ ALTA CONFIANZA (>85%)
El sistema identifica con alta probabilidad que el electrodoméstico corresponde al primer resultado.

INSTRUCCIONES:
- Menciona el modelo identificado con confianza
- Proporciona las especificaciones del catálogo
- Ofrece ayuda basada en el modelo específico
- Si el usuario confirma, procede con el diagnóstico
        `.trim();

      case 'medium':
        return `
⚠️ MEDIA CONFIANZA (75-85%)
El sistema encuentra similitudes pero necesita confirmación.

INSTRUCCIONES:
- Menciona que probablemente es uno de los modelos listados
- Pregunta por características distintivas para confirmar (color, tamaño, número de puertas, etc.)
- Muestra las opciones más probables
- Espera confirmación del usuario antes de proceder
        `.trim();

      case 'low':
        return `
⚠️ BAJA CONFIANZA (65-75%)
El sistema encuentra algunas similitudes pero no es concluyente.

INSTRUCCIONES:
- Informa que hay varios modelos posibles
- Pregunta características específicas (marca visible, número de modelo, etiqueta, etc.)
- Solicita que el usuario muestre etiquetas o placas del producto
- Considera que puede no estar en nuestro catálogo
        `.trim();

      case 'none':
        return `
❌ SIN CONFIANZA (<65%)
El sistema no encuentra coincidencias significativas.

INSTRUCCIONES:
- Informa que no se encuentra este modelo en el catálogo
- Pregunta por el modelo específico escrito en el electrodoméstico
- Solicita que muestre etiquetas, placas o números de serie
- Identifica solo la categoría general (nevera, lavadora, etc.)
- Ofrece ayuda general según la categoría
        `.trim();
    }
  }

  /**
   * Obtiene emoji indicador según el score de confianza
   */
  private getConfidenceIcon(similarity: number): string {
    if (similarity > 0.85) return '✅';
    if (similarity > 0.75) return '⚠️';
    if (similarity > 0.65) return '🔸';
    return '❓';
  }

  /**
   * Construye resultado vacío en caso de error o sin matches
   */
  private buildEmptyResult(processingTimeMs: number): RecognitionResult {
    return {
      matches: [],
      bestMatch: null,
      contextForGemini: this.buildGeminiContext([], 'none'),
      confidence: 'none',
      processingTimeMs
    };
  }

  /**
   * Verifica si el servicio está listo para uso
   *
   * @returns Promise<boolean> indicando si el servicio está operativo
   */
  async isServiceReady(): Promise<boolean> {
    try {
      // Verificar API de embeddings
      const apiAvailable = await this.embeddingsApi.isServiceAvailable().toPromise();

      // Verificar productos en DB
      const productCount = await this.vectorDB.getProductCount();

      const ready = apiAvailable && productCount > 0;

      if (ready) {
        console.log('✅ Product Recognition Service ready:', productCount, 'products indexed');
      } else {
        console.warn('⚠️ Product Recognition Service not ready:',
          'API available:', apiAvailable,
          'Products:', productCount);
      }

      return ready;
    } catch (error) {
      console.error('❌ Error checking service readiness:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas del servicio
   *
   * @returns Promise con estadísticas
   */
  async getStats(): Promise<{
    productsIndexed: number;
    apiAvailable: boolean;
    serviceReady: boolean;
  }> {
    const productsIndexed = await this.vectorDB.getProductCount();
    const apiAvailable = await this.embeddingsApi.isServiceAvailable().toPromise();
    const serviceReady = apiAvailable && productsIndexed > 0;

    return {
      productsIndexed,
      apiAvailable,
      serviceReady
    };
  }
}
