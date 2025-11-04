import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Producto Haceb almacenado en Firestore con su embedding
 */
export interface HacebProduct {
  productId: string;
  category: string;
  model: string;
  specs: string;
  imageUrl: string;
  embedding: number[];
  visualFeatures: string[];
  createdAt: any;
  updatedAt?: any;
}

/**
 * Resultado de búsqueda con score de similitud
 */
export interface ProductMatch {
  product: HacebProduct;
  similarity: number;
}

/**
 * Servicio de base de datos vectorial para productos Haceb
 *
 * @description
 * Almacena embeddings de productos en Firestore y realiza búsqueda
 * por similitud coseno para reconocimiento de electrodomésticos.
 *
 * @architecture
 * - Collection: `haceb_products`
 * - Embeddings: 1408 dimensiones (Vertex AI Multimodal)
 * - Búsqueda: Client-side cosine similarity
 *
 * @see RAG_MULTIMODAL_HACEB.md para detalles de arquitectura
 */
@Injectable({
  providedIn: 'root'
})
export class ProductVectorDBService {
  private readonly COLLECTION = 'haceb_products';

  /**
   * Threshold de similitud para considerar un match válido
   * - > 0.85: Alta confianza
   * - 0.75-0.85: Media confianza
   * - < 0.75: Baja confianza (descartado)
   */
  private readonly SIMILARITY_THRESHOLD = 0.75;

  constructor(private firestore: AngularFirestore) {
    console.log('🗄️ ProductVectorDBService initialized');
  }

  /**
   * Indexa un producto en Firestore con su embedding
   *
   * @param product - Producto sin createdAt (se agrega automáticamente)
   * @returns Promise que se resuelve cuando el producto es indexado
   *
   * @example
   * ```typescript
   * const product: Omit<HacebProduct, 'createdAt'> = {
   *   productId: 'nevera_450l',
   *   category: 'refrigerador',
   *   model: 'Nevera Haceb 450L Frost Free',
   *   specs: '450L, No Frost, Acero inoxidable',
   *   imageUrl: 'https://...',
   *   embedding: [0.234, -0.123, ...], // 1408 dims
   *   visualFeatures: ['color plata', 'dos puertas', 'dispensador agua']
   * };
   * await this.vectorDB.indexProduct(product);
   * ```
   */
  async indexProduct(product: Omit<HacebProduct, 'createdAt'>): Promise<void> {
    console.log('📝 Indexing product:', product.productId);

    try {
      await this.firestore
        .collection(this.COLLECTION)
        .doc(product.productId)
        .set({
          ...product,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      console.log('✅ Product indexed successfully:', product.productId);
    } catch (error) {
      console.error('❌ Error indexing product:', error);
      throw error;
    }
  }

  /**
   * Indexa múltiples productos en batch
   *
   * @param products - Array de productos a indexar
   * @returns Promise que se resuelve cuando todos están indexados
   */
  async indexBatchProducts(products: Omit<HacebProduct, 'createdAt'>[]): Promise<void> {
    console.log('📝 Indexing batch:', products.length, 'products');

    const batch = this.firestore.firestore.batch();

    products.forEach(product => {
      const docRef = this.firestore
        .collection(this.COLLECTION)
        .doc(product.productId)
        .ref;

      batch.set(docRef, {
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    try {
      await batch.commit();
      console.log('✅ Batch indexing completed');
    } catch (error) {
      console.error('❌ Error in batch indexing:', error);
      throw error;
    }
  }

  /**
   * Busca productos similares usando similitud coseno
   *
   * @param queryEmbedding - Embedding del producto a buscar (1408 dims)
   * @param topK - Número de resultados a retornar (default: 3)
   * @returns Promise con array de productos ordenados por similitud
   *
   * @example
   * ```typescript
   * const embedding = await embeddingsApi.generateEmbedding(imageBase64);
   * const matches = await vectorDB.searchSimilar(embedding.embedding, 3);
   *
   * matches.forEach(match => {
   *   console.log(match.product.model, ':', (match.similarity * 100).toFixed(1) + '%');
   * });
   * ```
   */
  async searchSimilar(queryEmbedding: number[], topK: number = 3): Promise<ProductMatch[]> {
    console.log('🔍 Searching similar products with embedding of', queryEmbedding.length, 'dimensions');

    // Validar embedding
    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.warn('⚠️ Empty embedding provided');
      return [];
    }

    try {
      // Obtener todos los productos de Firestore
      const snapshot = await this.firestore
        .collection<HacebProduct>(this.COLLECTION)
        .ref
        .get();

      if (snapshot.empty) {
        console.warn('⚠️ No products found in database');
        return [];
      }

      const matches: ProductMatch[] = [];

      // Calcular similitud con cada producto
      snapshot.forEach(doc => {
        const product = doc.data() as HacebProduct;

        // Validar que el producto tenga embedding
        if (!product.embedding || product.embedding.length === 0) {
          console.warn('⚠️ Product without embedding:', product.productId);
          return;
        }

        // Validar dimensiones
        if (product.embedding.length !== queryEmbedding.length) {
          console.error('❌ Dimension mismatch for product:', product.productId,
            'expected:', queryEmbedding.length, 'got:', product.embedding.length);
          return;
        }

        // Calcular similitud coseno
        const similarity = this.cosineSimilarity(queryEmbedding, product.embedding);

        // Solo agregar si supera el threshold
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          matches.push({ product, similarity });
        }
      });

      // Ordenar por similitud descendente y tomar top K
      const topMatches = matches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      console.log(`✅ Found ${topMatches.length} matches above threshold (${this.SIMILARITY_THRESHOLD})`);

      topMatches.forEach(match => {
        console.log(`   - ${match.product.model}: ${(match.similarity * 100).toFixed(1)}%`);
      });

      return topMatches;
    } catch (error) {
      console.error('❌ Error searching similar products:', error);
      return [];
    }
  }

  /**
   * Calcula la similitud coseno entre dos vectores
   *
   * @description
   * Similitud coseno mide el ángulo entre dos vectores en espacio multidimensional.
   * Resultado: 0.0 (totalmente diferentes) a 1.0 (idénticos)
   *
   * Formula:
   * cos(θ) = (A · B) / (||A|| * ||B||)
   *
   * @param vecA - Vector A
   * @param vecB - Vector B
   * @returns Score de similitud [0.0, 1.0]
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Vectors must have same dimensions: ${vecA.length} vs ${vecB.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);

    // Evitar división por cero
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Obtiene todos los productos indexados
   *
   * @returns Observable con array de productos
   */
  getAllProducts(): Observable<HacebProduct[]> {
    return this.firestore
      .collection<HacebProduct>(this.COLLECTION)
      .valueChanges();
  }

  /**
   * Obtiene un producto por ID
   *
   * @param productId - ID del producto
   * @returns Observable con el producto o undefined
   */
  getProductById(productId: string): Observable<HacebProduct | undefined> {
    return this.firestore
      .collection<HacebProduct>(this.COLLECTION)
      .doc(productId)
      .valueChanges();
  }

  /**
   * Elimina un producto del índice
   *
   * @param productId - ID del producto a eliminar
   * @returns Promise que se resuelve cuando se elimina
   */
  async deleteProduct(productId: string): Promise<void> {
    console.log('🗑️ Deleting product:', productId);

    try {
      await this.firestore
        .collection(this.COLLECTION)
        .doc(productId)
        .delete();

      console.log('✅ Product deleted:', productId);
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Actualiza un producto existente
   *
   * @param productId - ID del producto
   * @param updates - Campos a actualizar
   * @returns Promise que se resuelve cuando se actualiza
   */
  async updateProduct(productId: string, updates: Partial<HacebProduct>): Promise<void> {
    console.log('🔄 Updating product:', productId);

    try {
      await this.firestore
        .collection(this.COLLECTION)
        .doc(productId)
        .update({
          ...updates,
          updatedAt: new Date()
        });

      console.log('✅ Product updated:', productId);
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  }

  /**
   * Cuenta total de productos indexados
   *
   * @returns Promise con el número de productos
   */
  async getProductCount(): Promise<number> {
    const snapshot = await this.firestore
      .collection(this.COLLECTION)
      .ref
      .get();

    return snapshot.size;
  }

  /**
   * Limpia todos los productos (⚠️ USAR CON CUIDADO)
   *
   * @returns Promise que se resuelve cuando se limpian todos
   */
  async clearAllProducts(): Promise<void> {
    console.warn('⚠️ Clearing all products from database');

    const snapshot = await this.firestore
      .collection(this.COLLECTION)
      .ref
      .get();

    const batch = this.firestore.firestore.batch();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('✅ All products cleared');
  }
}
