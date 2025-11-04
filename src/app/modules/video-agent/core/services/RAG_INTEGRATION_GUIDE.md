# 🧠 Guía de Integración RAG con Video Agent

**Fecha**: 4 de Noviembre 2025
**Objetivo**: Integrar sistema RAG multimodal con Haceb Adapter para reconocimiento mejorado de electrodomésticos

---

## 📋 Servicios Implementados

### 1. EmbeddingsApiService
**Ubicación**: `core/services/embeddings-api.service.ts`

**Función**: Genera embeddings de 1408 dimensiones para imágenes vía Firebase Functions → Vertex AI

**Métodos principales**:
- `generateEmbedding(base64Image: string): Observable<EmbeddingResponse>`
- `generateBatchEmbeddings(base64Images: string[]): Observable<EmbeddingResponse[]>`
- `isServiceAvailable(): Observable<boolean>`

**Configuración requerida**:
```typescript
// environment.ts
urlApi: "https://api.katuq.com"  // Backend Firebase Functions
```

### 2. ProductVectorDBService
**Ubicación**: `core/services/product-vector-db.service.ts`

**Función**: Almacena y busca productos en Firestore usando similitud coseno

**Métodos principales**:
- `indexProduct(product): Promise<void>`
- `searchSimilar(embedding: number[], topK: number): Promise<ProductMatch[]>`
- `getAllProducts(): Observable<HacebProduct[]>`
- `getProductCount(): Promise<number>`

**Estructura de datos**:
```typescript
interface HacebProduct {
  productId: string;
  category: string;
  model: string;
  specs: string;
  imageUrl: string;
  embedding: number[];  // 1408 dims
  visualFeatures: string[];
  createdAt: any;
}
```

**Firestore Collection**: `haceb_products`

### 3. ProductRecognitionService
**Ubicación**: `core/services/product-recognition.service.ts`

**Función**: Orquesta embeddings + vector DB + context para Gemini

**Método principal**:
```typescript
async identifyAppliance(videoFrame: string, topK: number = 3): Promise<RecognitionResult>
```

**Resultado**:
```typescript
interface RecognitionResult {
  matches: ProductMatch[];          // Top K productos similares
  bestMatch: ProductMatch | null;   // Mejor match
  contextForGemini: string;         // Contexto enriquecido para Gemini
  confidence: ConfidenceLevel;      // 'high' | 'medium' | 'low' | 'none'
  processingTimeMs: number;
}
```

---

## 🔧 Integración con Haceb Adapter

### Opción 1: Modificar el Adapter Actual

**Archivo**: `adapters/haceb-adapter.ts`

#### Paso 1: Agregar Inyección de Dependencias

El HacebAdapter es una clase simple, NO un servicio de Angular. Por lo tanto, necesita recibir el servicio en el constructor:

```typescript
import { ProductRecognitionService } from '../core/services/product-recognition.service';

export class HacebAdapter implements IAgentAdapter {
  private currentFrame: string = '';  // Almacenar frame actual

  constructor(
    private productRecognition: ProductRecognitionService  // ⭐ Inyectar aquí
  ) {}

  // ... resto del código
}
```

#### Paso 2: Actualizar el Tool `analyze_appliance`

Modificar `getToolDeclarations()` para agregar información sobre RAG:

```typescript
{
  name: "analyze_appliance",
  description: `
Analiza visualmente el electrodoméstico que el usuario está mostrando.

⭐ NUEVO: Este tool ahora usa tecnología RAG multimodal con Vertex AI:
- Genera embedding del frame de video
- Busca en catálogo de productos Haceb
- Retorna coincidencias con scores de similitud
- Proporciona contexto enriquecido

Úsala cuando necesites identificar el tipo de electrodoméstico o modelo.
  `.trim(),
  parameters: {
    // ... mismo que antes
  }
}
```

#### Paso 3: Procesar el Tool Call con RAG

Agregar método para procesar `analyze_appliance`:

```typescript
async processToolCall(toolCall: any): Promise<any> {
  if (toolCall.name === 'analyze_appliance') {
    console.log('🔍 RAG: Analyzing appliance with current frame...');

    // 1. Verificar que hay frame disponible
    if (!this.currentFrame) {
      return {
        error: 'No frame available',
        message: 'Por favor muestra el electrodoméstico a la cámara',
        catalogMatches: [],
        ragEnabled: false
      };
    }

    try {
      // 2. Ejecutar reconocimiento con RAG
      const recognition = await this.productRecognition.identifyAppliance(
        this.currentFrame,
        3  // Top 3 productos
      );

      console.log(`✅ RAG: Recognition completed in ${recognition.processingTimeMs}ms`);
      console.log(`   Confidence: ${recognition.confidence}`);
      console.log(`   Matches: ${recognition.matches.length}`);

      // 3. Preparar respuesta estructurada para Gemini
      return {
        success: true,
        ragEnabled: true,
        confidence: recognition.confidence,
        processingTimeMs: recognition.processingTimeMs,

        // Matches del catálogo
        catalogMatches: recognition.matches.map(m => ({
          model: m.product.model,
          category: m.product.category,
          similarity: (m.similarity * 100).toFixed(1) + '%',
          specs: m.product.specs,
          visualFeatures: m.product.visualFeatures
        })),

        // Mejor match (si existe)
        bestMatch: recognition.bestMatch ? {
          model: recognition.bestMatch.product.model,
          category: recognition.bestMatch.product.category,
          confidence: recognition.confidence,
          similarity: (recognition.bestMatch.similarity * 100).toFixed(1) + '%'
        } : null,

        // ⭐ CONTEXTO ENRIQUECIDO para Gemini
        // Este texto se agregará automáticamente al context de Gemini
        contextForGemini: recognition.contextForGemini,

        // Visual observations (del parámetro original del tool)
        visualObservations: toolCall.args?.visualObservations || ''
      };
    } catch (error) {
      console.error('❌ RAG: Error in product recognition:', error);

      // Fallback: continuar sin RAG
      return {
        error: error.message,
        ragEnabled: false,
        catalogMatches: [],
        message: 'Análisis RAG no disponible, continuando con análisis visual básico',
        visualObservations: toolCall.args?.visualObservations || ''
      };
    }
  }

  // ... otros tools
}
```

#### Paso 4: Actualizar System Instruction

Agregar instrucciones sobre cómo usar el contexto RAG:

```typescript
getSystemInstruction(): string {
  return `
Eres un técnico experto en electrodomésticos Haceb...

⭐ NUEVO - SISTEMA RAG MULTIMODAL:

Cuando uses la función \`analyze_appliance\`, recibirás:

1. **catalogMatches**: Productos similares del catálogo Haceb con scores
2. **bestMatch**: El producto más probable identificado por IA
3. **confidence**: Nivel de confianza (high/medium/low/none)
4. **contextForGemini**: Contexto detallado con instrucciones específicas

CÓMO USAR EL SISTEMA RAG:

✅ SI confidence = 'high' (>85%):
   - Menciona con confianza el modelo identificado
   - Usa las especificaciones del catálogo
   - Ejemplo: "Veo que tienes una Nevera Haceb 450L Frost Free (confianza 92%)"

⚠️ SI confidence = 'medium' (75-85%):
   - Menciona el modelo probable
   - Pide confirmación al usuario
   - Ejemplo: "Parece ser una Nevera Haceb 450L, ¿es correcto?"

🔸 SI confidence = 'low' (<75%) o 'none':
   - Menciona la categoría general
   - Pide detalles específicos (modelo, etiqueta)
   - Ejemplo: "Veo que es una nevera. ¿Podrías mostrarme la etiqueta con el modelo?"

SIEMPRE lee el campo \`contextForGemini\` que contiene instrucciones detalladas.

... resto del system instruction ...
  `.trim();
}
```

#### Paso 5: Método para Setear Frame Actual

Agregar método público para actualizar el frame desde el componente:

```typescript
/**
 * Establece el frame actual para análisis RAG
 * @param frameBase64 - Frame de video en base64
 */
setCurrentFrame(frameBase64: string): void {
  this.currentFrame = frameBase64;
  console.log('📸 Current frame updated for RAG analysis');
}
```

---

### Opción 2: Wrapper Service (Más Limpio)

Crear un servicio intermedio que maneje la lógica RAG:

**Archivo nuevo**: `core/services/haceb-rag-integration.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { ProductRecognitionService, RecognitionResult } from './product-recognition.service';

@Injectable({
  providedIn: 'root'
})
export class HacebRagIntegrationService {
  private currentFrame: string = '';

  constructor(private productRecognition: ProductRecognitionService) {}

  setCurrentFrame(frame: string): void {
    this.currentFrame = frame;
  }

  async analyzeAppliance(visualObservations?: string): Promise<any> {
    if (!this.currentFrame) {
      return {
        error: 'No frame available',
        ragEnabled: false
      };
    }

    const recognition = await this.productRecognition.identifyAppliance(this.currentFrame);

    return {
      success: true,
      ragEnabled: true,
      confidence: recognition.confidence,
      catalogMatches: recognition.matches.map(/* ... */),
      bestMatch: recognition.bestMatch ? /* ... */ : null,
      contextForGemini: recognition.contextForGemini,
      visualObservations
    };
  }
}
```

Luego el adapter solo necesita llamar a este servicio.

---

## 📦 Inicialización en el Componente

**Archivo**: `components/agent-session/agent-session.component.ts`

### Paso 1: Inyectar Servicios

```typescript
constructor(
  private productRecognition: ProductRecognitionService,
  // ... otros servicios
) {}
```

### Paso 2: Pasar Servicio al Adapter

```typescript
ngOnInit() {
  // Crear adapter con servicio RAG
  const hacebAdapter = new HacebAdapter(this.productRecognition);

  // Registrar adapter
  this.adapterRegistry.register(hacebAdapter);
}
```

### Paso 3: Actualizar Frame Periódicamente

```typescript
// Capturar frame cada 2 segundos durante sesión activa
private frameUpdateInterval: any;

startSession() {
  // ... iniciar sesión

  // Actualizar frame para RAG
  this.frameUpdateInterval = setInterval(() => {
    if (this.videoStreamService.isStreaming) {
      const frame = this.videoStreamService.captureFrame();
      const adapter = this.adapterRegistry.getActiveAdapter();

      if (adapter && adapter instanceof HacebAdapter) {
        adapter.setCurrentFrame(frame);
      }
    }
  }, 2000);  // Cada 2 segundos
}

stopSession() {
  // Limpiar interval
  if (this.frameUpdateInterval) {
    clearInterval(this.frameUpdateInterval);
  }

  // ... detener sesión
}
```

---

## 🗄️ Indexación del Catálogo

### Script de Indexación

Crear script para indexar productos una vez:

**Archivo**: `scripts/index-haceb-catalog.ts`

```typescript
import { ProductVectorDBService, HacebProduct } from '../core/services/product-vector-db.service';
import { EmbeddingsApiService } from '../core/services/embeddings-api.service';

/**
 * Script para indexar catálogo de productos Haceb
 * Ejecutar UNA VEZ después de deploy
 */
async function indexCatalog() {
  const vectorDB = new ProductVectorDBService(firestore);
  const embeddingsApi = new EmbeddingsApiService(httpClient);

  const productos = [
    {
      productId: 'nevera_haceb_450l',
      category: 'refrigerador',
      model: 'Nevera Haceb 450L Frost Free',
      specs: '450 litros, No Frost, Acero inoxidable, Dispensador de agua',
      imageUrl: 'https://www.haceb.com/nevera-450l.jpg',
      visualFeatures: ['color plata', 'dos puertas', 'dispensador frontal', 'acabado metalizado']
    },
    {
      productId: 'lavadora_haceb_18kg',
      category: 'lavadora',
      model: 'Lavadora Haceb 18kg Carga Superior',
      specs: '18kg capacidad, Carga superior, Digital, 12 programas',
      imageUrl: 'https://www.haceb.com/lavadora-18kg.jpg',
      visualFeatures: ['tapa superior', 'panel digital', 'color blanco', 'cilindro transparente']
    },
    // ... más productos
  ];

  console.log(`🚀 Indexing ${productos.length} products...`);

  for (const producto of productos) {
    // 1. Descargar imagen y convertir a base64
    const imageResponse = await fetch(producto.imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBase64 = await blobToBase64(imageBlob);

    // 2. Generar embedding
    const embeddingResponse = await embeddingsApi.generateEmbedding(imageBase64).toPromise();

    // 3. Indexar en Firestore
    await vectorDB.indexProduct({
      ...producto,
      embedding: embeddingResponse.embedding
    });

    console.log(`✅ Indexed: ${producto.productId}`);
  }

  console.log('🎉 Catalog indexing completed!');
}
```

### Ejecutar Indexación

```bash
# Opción 1: Desde Angular CLI
ng serve
# Navegar a /admin/index-catalog (crear ruta admin)

# Opción 2: Desde Node.js script
ts-node scripts/index-haceb-catalog.ts
```

---

## 🧪 Testing

### 1. Verificar Servicios

```typescript
// En componente o consola del navegador
const stats = await this.productRecognition.getStats();
console.log('RAG Stats:', stats);
// { productsIndexed: 10, apiAvailable: true, serviceReady: true }
```

### 2. Test de Reconocimiento

```typescript
const frame = this.videoStreamService.captureFrame();
const result = await this.productRecognition.identifyAppliance(frame);

console.log('Confidence:', result.confidence);
console.log('Best Match:', result.bestMatch?.product.model);
console.log('Context:', result.contextForGemini);
```

### 3. Test de Similitud

```typescript
const products = await this.vectorDB.getAllProducts().toPromise();
console.log('Products in DB:', products.length);

// Test cosine similarity
const embedding1 = products[0].embedding;
const embedding2 = products[1].embedding;
const similarity = cosineSimilarity(embedding1, embedding2);
console.log('Similarity between products:', similarity);
```

---

## 📊 Monitoreo

### Logs Clave

```
🧠 ProductRecognitionService initialized
📸 Generating embedding for image (length: 45678 chars)
✅ Embedding generated: 1408 dimensions
🔍 Searching similar products with embedding of 1408 dimensions
✅ Found 3 matches above threshold (0.75)
   - Nevera Haceb 450L: 92.3%
   - Nevera Haceb 380L: 78.1%
   - Nevera Haceb 550L: 76.5%
🎯 Confidence level: HIGH
✅ Product identification completed in 1234ms
```

### Métricas

- **Processing Time**: < 2 segundos ideal
- **API Availability**: > 99%
- **Products Indexed**: Mínimo 5-10 para testing
- **Confidence Distribution**: Mayoría >75%

---

## 🚨 Troubleshooting

### Error: "Failed to generate embedding"

**Causa**: Backend no disponible o error en Vertex AI

**Solución**:
1. Verificar Firebase Functions está corriendo
2. Verificar API key de Vertex AI en backend
3. Check logs de Firebase Functions

### Error: "No products found in database"

**Causa**: Catálogo no indexado

**Solución**:
1. Ejecutar script de indexación
2. Verificar Firestore collection `haceb_products`
3. Verificar permisos de Firestore

### Error: "Dimension mismatch"

**Causa**: Embeddings con diferentes dimensiones

**Solución**:
1. Re-indexar todo el catálogo con mismo modelo
2. Verificar que se usa `multimodalembedding` en backend
3. Limpiar collection y re-indexar

---

## 🎯 Siguientes Pasos

1. ✅ Implementar servicios RAG (COMPLETADO)
2. ⏳ Integrar con Haceb Adapter
3. ⏳ Crear script de indexación
4. ⏳ Indexar catálogo de productos Haceb
5. ⏳ Testing end-to-end
6. ⏳ Deploy a producción

---

## 📚 Referencias

- [RAG_MULTIMODAL_HACEB.md](../../../../../RAG_MULTIMODAL_HACEB.md) - Documentación completa
- [Vertex AI Embeddings](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-multimodal-embeddings)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
