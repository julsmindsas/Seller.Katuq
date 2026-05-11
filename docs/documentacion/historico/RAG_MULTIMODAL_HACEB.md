# RAG Multimodal con Vertex AI - Reconocimiento de Electrodomésticos Haceb

**Fecha**: 2025-10-30
**Objetivo**: Mejorar el reconocimiento de productos Haceb en el módulo video-agent usando RAG (Retrieval Augmented Generation) con embeddings multimodales de Vertex AI.

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Investigación: ¿Se puede entrenar Gemini con imágenes?](#investigación-se-puede-entrenar-gemini-con-imágenes)
4. [Arquitectura RAG Multimodal](#arquitectura-rag-multimodal)
5. [Problema: SDK de Vertex AI en Angular](#problema-sdk-de-vertex-ai-en-angular)
6. [Soluciones Propuestas](#soluciones-propuestas)
7. [Implementación Recomendada](#implementación-recomendada)
8. [Ejemplos de Código](#ejemplos-de-código)
9. [Costos Estimados](#costos-estimados)
10. [Referencias](#referencias)

---

## Resumen Ejecutivo

### Pregunta Original
¿Se puede entrenar el modelo Gemini para reconocer electrodomésticos de la marca Haceb?

### Respuesta
**NO se puede hacer fine-tuning en la API estándar de Gemini**, pero **SÍ se puede mejorar significativamente el reconocimiento** usando:

1. **Prompt Engineering** (rápido, gratis, 70-80% precisión)
2. **RAG Multimodal con Vertex AI** (1-2 días, ~$0.01/mes, 85-95% precisión) ⭐ **RECOMENDADO**
3. **Fine-Tuning Supervisado en Vertex AI** (1-2 semanas, ~$100, 95%+ precisión)

### Decisión
Implementar **RAG Multimodal** usando:
- **Vertex AI Multimodal Embeddings** (solo para convertir imágenes a vectores)
- **Gemini 2.5 Flash actual** (sin cambios, sin entrenar)
- **Firebase Functions Backend** (para llamar Vertex AI)
- **Firestore** (como vector database)

---

## Conceptos Fundamentales

### ¿Qué es RAG?

**RAG tradicional (solo texto)**:
```
Usuario pregunta → Busca en documentos → Da contexto al LLM → Responde
```

**RAG Multimodal (texto + imágenes)**:
```
Usuario muestra imagen → Busca imágenes similares en BD → Da contexto visual + textual al LLM → Responde
```

### Componentes Clave

1. **Embeddings**: Vectores numéricos que representan el contenido semántico de una imagen
   - Dimensiones: 128, 256, 512, o 1408 (mayor = más preciso)
   - Vertex AI genera vectores de 1408 dimensiones

2. **Vector Database**: Almacena embeddings + metadata de productos
   - Permite búsqueda por similitud (cosine similarity)
   - Opciones: Firestore, ChromaDB, Pinecone, Milvus

3. **Similitud Coseno**: Mide qué tan parecidas son dos imágenes
   - Score de 0.0 a 1.0
   - > 0.85 = Alta probabilidad de match
   - 0.75-0.85 = Probable match
   - < 0.75 = No hay match

---

## Investigación: ¿Se puede entrenar Gemini con imágenes?

### Estado Actual (2025)

#### ❌ Fine-Tuning en Gemini API Estándar
- **NO disponible** desde Mayo 2025
- Gemini 1.5 Flash-001 fue deprecado (tenía fine-tuning)
- Google planea traerlo de vuelta en el futuro

#### ✅ Fine-Tuning en Vertex AI (Enterprise)
- **SÍ disponible** para clientes de Google Cloud
- Modelos soportados:
  - Gemini 2.5 Flash ⭐
  - Gemini 2.5 Pro
  - Gemini 2.5 Flash-Lite
  - Gemini 2.0 Flash
  - Gemini 2.0 Flash-Lite

**Requisitos**:
- 100-500 imágenes etiquetadas por categoría
- Formato JSONL
- Costo: ~$50-100 por training job
- Tiempo: 2-6 horas de entrenamiento

#### ✅ Capacidades de Reconocimiento Nativas
Gemini 2.5 **YA reconoce objetos** sin entrenar:
- Object detection mejorado
- Segmentación avanzada
- Reconocimiento de objetos personalizados mediante prompting
- Puede leer logos y texto en imágenes

---

## Arquitectura RAG Multimodal

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: PREPARACIÓN (Una sola vez)                          │
└─────────────────────────────────────────────────────────────┘

Catálogo Haceb (5-10 fotos)
├── nevera_haceb_450l.jpg
├── lavadora_haceb_18kg.jpg
├── estufa_haceb_6_hornillas.jpg
└── ...
        ↓
Firebase Functions → Vertex AI Multimodal Embeddings
        ↓
Firestore Collection: 'haceb_products'
{
  productId: "nevera_450l",
  category: "refrigerador",
  model: "Nevera Haceb 450L Frost Free",
  embedding: [0.234, -0.123, 0.567, ...], // 1408 dims
  imageUrl: "...",
  specs: "..."
}


┌─────────────────────────────────────────────────────────────┐
│ FASE 2: RECONOCIMIENTO EN TIEMPO REAL                       │
└─────────────────────────────────────────────────────────────┘

Usuario muestra electrodoméstico en video
        ↓
Angular captura frame (base64 JPEG)
        ↓
Angular → POST /api/embeddings/generate → Firebase Functions
        ↓
Firebase Functions → Vertex AI → Genera embedding del frame
        ↓
Firebase Functions → Busca en Firestore (cosine similarity)
        ↓
Retorna top 3 productos más similares con scores
        ↓
Angular → Agrega contexto al prompt de Gemini
        ↓
Gemini 2.5 Flash (sin cambios) analiza:
  - Frame actual del usuario
  - Top 3 productos similares del catálogo
  - Metadata y specs
        ↓
"Identifico una Nevera Haceb 450L (confianza: 0.92)"
```

### Componentes por Capa

#### Frontend (Angular)
- `EmbeddingsApiService`: Llama al backend para generar embeddings
- `ProductRecognitionService`: Busca productos similares en Firestore
- `HacebAdapter`: Integra el reconocimiento con Gemini Live

#### Backend (Firebase Functions)
- Endpoint: `POST /api/embeddings/generate`
- Usa SDK `@google-cloud/vertexai`
- Genera embeddings de 1408 dimensiones
- Opcional: Cache en Firestore

#### Base de Datos (Firestore)
- Collection: `haceb_products`
- Búsqueda por similitud coseno (client-side)
- Almacena embeddings + metadata

#### AI (Vertex AI + Gemini)
- Vertex AI: Solo para embeddings (convertir imagen → vector)
- Gemini 2.5 Flash: Análisis y diálogo (sin cambios)

---

## Problema: SDK de Vertex AI en Angular

### ❌ Incompatibilidad Confirmada

El SDK `@google-cloud/vertexai` **NO funciona en Angular/Browser**:

**Razones**:
- Diseñado solo para Node.js (requiere v18+)
- Usa módulos nativos de Node: `fs`, `crypto`, `path`
- No se puede bundlear con Webpack/Angular CLI
- Deprecado desde Junio 2025 (migrar a `@google/genai`)

**Error típico**:
```
Error: Cannot find module 'fs'
Module not found: Can't resolve 'crypto'
```

### ✅ Solución: Backend Proxy

**Arquitectura correcta**:
```
Angular (Frontend) → HTTP Request → Firebase Functions (Backend) → Vertex AI SDK
```

**Beneficios**:
- ✅ Seguridad: API keys en backend
- ✅ Funciona: Node.js soporta el SDK
- ✅ Cacheable: Evita regenerar embeddings
- ✅ Escalable: Control de rate limits

---

## Soluciones Propuestas

### Opción 1: Backend Firebase Functions ⭐ **RECOMENDADO**

**Ventajas**:
- Ya existe infraestructura (`katuq_admin_back_firebase/functions/`)
- Express corriendo en port 3300
- Autenticación ya implementada
- Más seguro (API keys ocultas)
- Puedes cachear embeddings

**Implementación**:
```typescript
// ANGULAR: embeddings-api.service.ts
async generateEmbedding(base64Image: string): Promise<number[]> {
  return this.http.post<number[]>(
    'https://us-central1-tu-proyecto.cloudfunctions.net/generateEmbedding',
    { image: base64Image }
  ).toPromise();
}

// FIREBASE FUNCTIONS: services/vertexEmbeddings.js
const { VertexAI } = require('@google-cloud/vertexai');

exports.generateEmbedding = async (req, res) => {
  const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT,
    location: 'us-central1'
  });

  const model = vertexAI.preview.getGenerativeModel({
    model: 'multimodalembedding'
  });

  const result = await model.embedContent({
    contents: [{
      inlineData: {
        mimeType: 'image/jpeg',
        data: req.body.image
      }
    }]
  });

  res.json({ embedding: result.embeddings[0].values });
};
```

**Costo**: ~$0.00025 por embedding

---

### Opción 2: REST API Directo desde Angular

**Ventajas**:
- Sin backend adicional
- Llamada directa a Vertex AI

**Desventajas**:
- ⚠️ Requiere OAuth del usuario (no service account)
- ⚠️ Expone project ID en frontend
- ⚠️ Más complejo de implementar
- ⚠️ Menos seguro

**Implementación**:
```typescript
async generateEmbedding(base64Image: string): Promise<number[]> {
  const token = await this.getGoogleAuthToken(); // Usuario debe autenticarse

  const response = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/multimodalembedding@001:predict`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [{
          image: { bytesBase64Encoded: base64Image }
        }]
      })
    }
  );

  const data = await response.json();
  return data.predictions[0].imageEmbedding;
}
```

---

### Opción 3: Servicio Alternativo (OpenAI/Cohere)

**Si no quieres usar Vertex AI**:

```bash
npm install openai
```

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-...',
  dangerouslyAllowBrowser: true
});

// OpenAI no tiene embeddings de imágenes directos
// Necesitarías usar CLIP via API externa o backend
```

**Desventajas**:
- Costo adicional
- 512 dimensiones (vs 1408 de Vertex AI)
- Menor precisión

---

## Implementación Recomendada

### Arquitectura Final

```
┌──────────────────────────────────────────────────────┐
│ ANGULAR (video-agent)                                │
├──────────────────────────────────────────────────────┤
│ 1. VideoStreamService → Captura frame               │
│ 2. EmbeddingsApiService → POST a Firebase Functions │
│ 3. ProductRecognitionService → Busca en Firestore   │
│ 4. HacebAdapter → Agrega contexto a Gemini          │
│ 5. GeminiLiveService → Análisis (sin cambios)       │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ FIREBASE FUNCTIONS (katuq_admin_back_firebase)       │
├──────────────────────────────────────────────────────┤
│ POST /api/embeddings/generate                        │
│   → Llama Vertex AI Multimodal Embeddings           │
│   → Retorna vector de 1408 dimensiones              │
│                                                      │
│ POST /api/catalog/index (opcional)                   │
│   → Indexa productos del catálogo                    │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ FIRESTORE                                            │
├──────────────────────────────────────────────────────┤
│ Collection: haceb_products                           │
│   - productId, category, model                       │
│   - embedding: number[] (1408)                       │
│   - imageUrl, specs, visualFeatures                  │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ VERTEX AI + GEMINI                                   │
├──────────────────────────────────────────────────────┤
│ Vertex AI: Embeddings (imagen → vector)             │
│ Gemini 2.5 Flash: Análisis y diálogo                │
└──────────────────────────────────────────────────────┘
```

### Plan de Implementación (5-6 horas)

#### Fase 1: Backend Firebase Functions (2 horas)
1. Instalar SDK: `npm install @google-cloud/vertexai`
2. Crear `functions/services/vertexEmbeddings.js`
3. Crear endpoint `POST /api/embeddings/generate`
4. Configurar autenticación (service account)
5. Testing con Postman/curl

#### Fase 2: Angular Services (2 horas)
1. Crear `EmbeddingsApiService` (HTTP client)
2. Crear `ProductVectorDBService` (Firestore + búsqueda)
3. Crear `ProductRecognitionService` (orquestador)
4. Testing con imágenes de prueba

#### Fase 3: Integración con Video-Agent (1 hora)
1. Modificar `haceb-adapter.ts`
2. Inyectar `ProductRecognitionService`
3. Actualizar tool `analyze_appliance`
4. Mejorar system instructions con contexto

#### Fase 4: Indexación de Catálogo (30 min)
1. Crear script `scripts/index-catalog.ts`
2. Preparar JSON con productos
3. Ejecutar indexación una vez
4. Verificar en Firestore

#### Fase 5: Testing y Ajuste (1 hora)
1. Probar con diferentes ángulos
2. Ajustar threshold de confianza
3. Refinar prompts de Gemini
4. Medir precisión

---

## Ejemplos de Código

### 1. Backend: Generar Embeddings

```javascript
// katuq_admin_back_firebase/functions/services/vertexEmbeddings.js

const { VertexAI } = require('@google-cloud/vertexai');

class VertexEmbeddingsService {
  constructor() {
    this.vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: 'us-central1'
    });
    this.model = this.vertexAI.preview.getGenerativeModel({
      model: 'multimodalembedding'
    });
  }

  async generateImageEmbedding(base64Image) {
    try {
      const result = await this.model.embedContent({
        contents: [{
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }]
      });

      return result.embeddings[0].values; // Array de 1408 números
    } catch (error) {
      console.error('Error generando embedding:', error);
      throw error;
    }
  }
}

module.exports = { VertexEmbeddingsService };
```

```javascript
// katuq_admin_back_firebase/functions/controllers/embeddings.js

const { VertexEmbeddingsService } = require('../services/vertexEmbeddings');

const embeddingsService = new VertexEmbeddingsService();

exports.generateEmbedding = async (req, res) => {
  try {
    const { image } = req.body; // base64 string

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const embedding = await embeddingsService.generateImageEmbedding(image);

    res.json({
      embedding,
      dimensions: embedding.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

```javascript
// katuq_admin_back_firebase/functions/index.js

const express = require('express');
const { generateEmbedding } = require('./controllers/embeddings');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Ruta para generar embeddings
app.post('/api/embeddings/generate', generateEmbedding);

// Exportar para Firebase Functions
exports.api = functions.https.onRequest(app);
```

---

### 2. Angular: Servicio de Embeddings

```typescript
// src/app/modules/video-agent/core/services/embeddings-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmbeddingsApiService {
  private apiUrl = environment.firebaseFunctionsUrl;

  constructor(private http: HttpClient) {}

  generateEmbedding(base64Image: string): Observable<EmbeddingResponse> {
    return this.http.post<EmbeddingResponse>(
      `${this.apiUrl}/api/embeddings/generate`,
      { image: base64Image }
    );
  }
}
```

---

### 3. Angular: Base de Datos Vectorial

```typescript
// src/app/modules/video-agent/core/services/product-vector-db.service.ts

import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface HacebProduct {
  productId: string;
  category: string;
  model: string;
  specs: string;
  imageUrl: string;
  embedding: number[];
  visualFeatures: string[];
  createdAt: any;
}

export interface ProductMatch {
  product: HacebProduct;
  similarity: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductVectorDBService {
  private collection = 'haceb_products';

  constructor(private firestore: AngularFirestore) {}

  // Indexar un producto (ejecutar una vez por producto)
  async indexProduct(product: Omit<HacebProduct, 'createdAt'>): Promise<void> {
    await this.firestore.collection(this.collection).doc(product.productId).set({
      ...product,
      createdAt: new Date()
    });
  }

  // Buscar productos similares
  async searchSimilar(queryEmbedding: number[], topK: number = 3): Promise<ProductMatch[]> {
    // Obtener todos los productos
    const snapshot = await this.firestore.collection<HacebProduct>(this.collection).ref.get();

    const matches: ProductMatch[] = [];

    snapshot.forEach(doc => {
      const product = doc.data() as HacebProduct;
      const similarity = this.cosineSimilarity(queryEmbedding, product.embedding);

      matches.push({ product, similarity });
    });

    // Ordenar por similitud descendente y tomar top K
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(match => match.similarity > 0.75); // Threshold
  }

  // Calcular similitud coseno
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Obtener todos los productos
  getAllProducts(): Observable<HacebProduct[]> {
    return this.firestore
      .collection<HacebProduct>(this.collection)
      .valueChanges();
  }
}
```

---

### 4. Angular: Servicio de Reconocimiento

```typescript
// src/app/modules/video-agent/core/services/product-recognition.service.ts

import { Injectable } from '@angular/core';
import { EmbeddingsApiService } from './embeddings-api.service';
import { ProductVectorDBService, ProductMatch } from './product-vector-db.service';

export interface RecognitionResult {
  matches: ProductMatch[];
  bestMatch: ProductMatch | null;
  contextForGemini: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

@Injectable({
  providedIn: 'root'
})
export class ProductRecognitionService {
  constructor(
    private embeddingsApi: EmbeddingsApiService,
    private vectorDB: ProductVectorDBService
  ) {}

  async identifyAppliance(videoFrame: string): Promise<RecognitionResult> {
    // 1. Generar embedding del frame
    const { embedding } = await this.embeddingsApi
      .generateEmbedding(videoFrame)
      .toPromise();

    // 2. Buscar productos similares
    const matches = await this.vectorDB.searchSimilar(embedding, 3);

    // 3. Determinar mejor match
    const bestMatch = matches.length > 0 ? matches[0] : null;

    // 4. Determinar nivel de confianza
    const confidence = this.getConfidenceLevel(bestMatch?.similarity || 0);

    // 5. Construir contexto para Gemini
    const contextForGemini = this.buildGeminiContext(matches, confidence);

    return {
      matches,
      bestMatch,
      contextForGemini,
      confidence
    };
  }

  private getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' | 'none' {
    if (similarity > 0.85) return 'high';
    if (similarity > 0.75) return 'medium';
    if (similarity > 0.65) return 'low';
    return 'none';
  }

  private buildGeminiContext(matches: ProductMatch[], confidence: string): string {
    if (matches.length === 0) {
      return `
No encontré productos similares en nuestro catálogo.
Por favor, identifica la categoría general del electrodoméstico que ves.
      `.trim();
    }

    const matchesText = matches.map((m, i) => `
${i + 1}. ${m.product.model} (confianza: ${(m.similarity * 100).toFixed(1)}%)
   - Categoría: ${m.product.category}
   - Especificaciones: ${m.product.specs}
   - Características visuales: ${m.product.visualFeatures.join(', ')}
    `.trim()).join('\n\n');

    return `
IDENTIFICACIÓN CON CATÁLOGO:

Productos más similares encontrados:
${matchesText}

Nivel de confianza general: ${confidence.toUpperCase()}

INSTRUCCIONES:
- Si confianza HIGH (>85%): Alta probabilidad de match exacto
- Si confianza MEDIUM (75-85%): Probable match, confirma características con el usuario
- Si confianza LOW (<75%): Producto no está en catálogo, identifica categoría general

Basándote en estos datos y lo que ves en la imagen del usuario, identifica el electrodoméstico.
    `.trim();
  }
}
```

---

### 5. Integración con Haceb Adapter

```typescript
// src/app/modules/video-agent/adapters/haceb-adapter.ts

import { ProductRecognitionService } from '../core/services/product-recognition.service';

export class HacebAdapter implements IAgentAdapter {
  private currentFrame: string;

  constructor(
    private productRecognition: ProductRecognitionService
  ) {}

  getToolDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'analyze_appliance',
        description: `
Analiza visualmente el electrodoméstico que el usuario está mostrando.
Esta función busca en nuestro catálogo de productos Haceb y retorna coincidencias.
Úsala cuando necesites identificar el tipo de electrodoméstico o modelo.
        `.trim(),
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            visualObservations: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'Describe lo que ves en la imagen antes de buscar en el catálogo'
            }
          },
          required: ['visualObservations']
        }
      },
      // ... otros tools
    ];
  }

  async processToolCall(toolCall: any): Promise<any> {
    if (toolCall.name === 'analyze_appliance') {
      // 1. Ejecutar reconocimiento con RAG
      const recognition = await this.productRecognition.identifyAppliance(
        this.currentFrame
      );

      // 2. Preparar respuesta estructurada
      return {
        catalogMatches: recognition.matches.map(m => ({
          model: m.product.model,
          category: m.product.category,
          similarity: (m.similarity * 100).toFixed(1) + '%',
          specs: m.product.specs
        })),
        bestMatch: recognition.bestMatch ? {
          model: recognition.bestMatch.product.model,
          confidence: recognition.confidence
        } : null,
        context: recognition.contextForGemini
      };
    }

    // ... otros tools
  }

  getSystemInstruction(): string {
    return `
Eres un asistente técnico especializado en electrodomésticos Haceb.

IDENTIFICACIÓN CON CATÁLOGO:
Cuando uses la función analyze_appliance, recibirás:
1. Coincidencias del catálogo con scores de similitud
2. El mejor match identificado
3. Nivel de confianza (high/medium/low/none)

PROTOCOLO DE CONFIANZA:
- HIGH (>85%): "Identifico con alta confianza un [modelo]"
- MEDIUM (75-85%): "Parece ser un [modelo], ¿puedes confirmar si ves [característica]?"
- LOW (<75%): "No encuentro este modelo exacto en catálogo. Por características visuales, parece ser [categoría general]"
- NONE: "Este electrodoméstico no está en nuestro catálogo actual"

Siempre menciona el nivel de confianza cuando identifiques un producto.

[... resto de instrucciones existentes ...]
    `.trim();
  }

  // Método para actualizar el frame actual
  updateCurrentFrame(frame: string): void {
    this.currentFrame = frame;
  }
}
```

---

### 6. Script de Indexación de Catálogo

```typescript
// scripts/index-haceb-catalog.ts

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { VertexAI } from '@google-cloud/vertexai';

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const firestore = admin.firestore();

// Inicializar Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: 'us-central1'
});

const model = vertexAI.preview.getGenerativeModel({
  model: 'multimodalembedding'
});

interface ProductData {
  productId: string;
  category: string;
  model: string;
  specs: string;
  imagePath: string;
  visualFeatures: string[];
}

async function generateEmbedding(imagePath: string): Promise<number[]> {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  const result = await model.embedContent({
    contents: [{
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    }]
  });

  return result.embeddings[0].values;
}

async function indexProduct(product: ProductData): Promise<void> {
  console.log(`Indexando ${product.model}...`);

  // Generar embedding
  const embedding = await generateEmbedding(product.imagePath);

  // Guardar en Firestore
  await firestore.collection('haceb_products').doc(product.productId).set({
    productId: product.productId,
    category: product.category,
    model: product.model,
    specs: product.specs,
    imageUrl: product.imagePath,
    embedding: embedding,
    visualFeatures: product.visualFeatures,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✓ ${product.model} indexado (${embedding.length} dimensiones)`);
}

async function main() {
  // Cargar catálogo
  const catalogPath = path.join(__dirname, 'catalog-data.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  console.log(`Indexando ${catalog.products.length} productos...`);

  for (const product of catalog.products) {
    try {
      await indexProduct(product);
    } catch (error) {
      console.error(`Error indexando ${product.model}:`, error);
    }
  }

  console.log('✓ Indexación completa');
}

main().catch(console.error);
```

```json
// scripts/catalog-data.json

{
  "products": [
    {
      "productId": "nevera_450l",
      "category": "refrigerador",
      "model": "Nevera Haceb 450L Frost Free",
      "specs": "Capacidad 450 litros, tecnología frost free, eficiencia energética A+, color blanco",
      "imagePath": "assets/catalog/nevera_haceb_450l.jpg",
      "visualFeatures": [
        "logo Haceb azul en la parte frontal superior",
        "puertas dobles verticales",
        "color blanco mate",
        "manijas horizontales plateadas",
        "panel de control digital en puerta superior"
      ]
    },
    {
      "productId": "lavadora_18kg",
      "category": "lavadora",
      "model": "Lavadora Haceb 18kg Carga Superior",
      "specs": "Capacidad 18kg, carga superior, 10 programas de lavado, color blanco",
      "imagePath": "assets/catalog/lavadora_haceb_18kg.jpg",
      "visualFeatures": [
        "logo Haceb frontal",
        "tapa superior transparente",
        "color blanco",
        "panel de control en la parte superior frontal",
        "diseño rectangular alto"
      ]
    },
    {
      "productId": "estufa_6_hornillas",
      "category": "estufa",
      "model": "Estufa Haceb 6 Hornillas con Horno",
      "specs": "6 hornillas a gas, horno con grill, encendido eléctrico, color gris",
      "imagePath": "assets/catalog/estufa_haceb_6_hornillas.jpg",
      "visualFeatures": [
        "logo Haceb en la parte frontal",
        "6 hornillas en la superficie",
        "color gris metálico",
        "parrillas negras sobre hornillas",
        "puerta de horno con ventana de vidrio"
      ]
    }
  ]
}
```

**Comando para ejecutar**:
```bash
npm install -g ts-node
ts-node scripts/index-haceb-catalog.ts
```

---

## Costos Estimados

### Vertex AI Multimodal Embeddings

| Concepto | Cantidad | Costo Unitario | Total |
|----------|----------|----------------|-------|
| **Indexación inicial** | | | |
| 10 productos (una vez) | 10 imágenes | $0.00025/imagen | $0.0025 |
| **Uso mensual estimado** | | | |
| 1000 identificaciones/mes | 1000 requests | $0.00025/request | $0.25 |
| **Total mensual** | | | **~$0.25** |

### Firestore

| Concepto | Cantidad | Costo |
|----------|----------|-------|
| Almacenamiento (10 productos con embeddings) | ~1 MB | ~$0.00018/mes |
| Lecturas (1000/mes) | 1000 docs | ~$0.0006 |
| **Total** | | **~$0.001/mes** |

### Gemini 2.5 Flash
- Sin cambios en costos actuales
- Mismo uso que ya tienes

### **TOTAL: ~$0.25/mes**

### Comparación con Fine-Tuning

| Concepto | RAG | Fine-Tuning |
|----------|-----|-------------|
| Setup | $0 | $50-100 |
| Mensual | $0.25 | $0 (después del setup) |
| Inferencia | Normal | Normal |
| Actualización | Inmediata | Reentrenamiento |
| Tiempo setup | 1-2 días | 1-2 semanas |

---

## Referencias

### Documentación Oficial
1. [Vertex AI Multimodal Embeddings](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings)
2. [Gemini Supervised Fine-Tuning](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning)
3. [Multimodal RAG with Gemini (Codelabs)](https://codelabs.developers.google.com/multimodal-rag-gemini)
4. [Vertex AI Node.js SDK](https://cloud.google.com/nodejs/docs/reference/vertexai/latest)

### Ejemplos de Código
5. [Google Cloud Generative AI Examples](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/use-cases/retrieval-augmented-generation)
6. [Multimodal RAG Notebook](https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/use-cases/retrieval-augmented-generation/intro_multimodal_rag.ipynb)

### Artículos y Tutorías
7. [Multimodal RAG with Vertex AI & Gemini (Analytics Vidhya, 2025)](https://www.analyticsvidhya.com/blog/2025/02/multimodal-rag-with-vertex-ai-gemini/)
8. [Getting Started with Generative AI in Angular (Medium)](https://medium.com/google-cloud/getting-started-with-generative-ai-in-angular-b72737a59982)

### Vector Databases
9. [Milvus - Integrating Images into RAG](https://milvus.io/ai-quick-reference/what-are-the-best-practices-for-integrating-images-into-rag-systems)
10. [How to Choose Vector Database for RAG](https://www.digitalocean.com/community/conceptual-articles/how-to-choose-the-right-vector-database)

---

## Próximos Pasos

### Checklist de Implementación

- [ ] **Backend Setup**
  - [ ] Instalar `@google-cloud/vertexai` en Firebase Functions
  - [ ] Configurar service account con permisos de Vertex AI
  - [ ] Crear endpoint `/api/embeddings/generate`
  - [ ] Probar con Postman

- [ ] **Angular Services**
  - [ ] Crear `EmbeddingsApiService`
  - [ ] Crear `ProductVectorDBService`
  - [ ] Crear `ProductRecognitionService`
  - [ ] Testing unitario

- [ ] **Catálogo Haceb**
  - [ ] Recopilar 5-10 imágenes de productos
  - [ ] Crear `catalog-data.json` con metadata
  - [ ] Ejecutar script de indexación
  - [ ] Verificar en Firestore Console

- [ ] **Integración**
  - [ ] Modificar `haceb-adapter.ts`
  - [ ] Actualizar system instructions
  - [ ] Implementar `updateCurrentFrame()`
  - [ ] Testing end-to-end

- [ ] **Optimización**
  - [ ] Ajustar threshold de confianza
  - [ ] Implementar cache de embeddings
  - [ ] Medir latencia y optimizar
  - [ ] Documentar casos edge

---

## Notas Adicionales

### Limitaciones Conocidas
- El modelo solo puede analizar lo que ve en el frame actual
- Productos muy similares pueden tener scores cercanos
- Iluminación/ángulo afectan la precisión
- Catálogo inicial limitado a 5-10 productos

### Mejoras Futuras
- Agregar más productos al catálogo
- Implementar búsqueda híbrida (texto + imagen)
- Cache inteligente de embeddings frecuentes
- UI de gestión de catálogo para administradores
- Métricas de precisión y analytics

### Preguntas Frecuentes

**Q: ¿Puedo usar otro vector database?**
A: Sí. Puedes usar ChromaDB (local), Pinecone (cloud), o Milvus (enterprise). El código es similar.

**Q: ¿Funciona con productos que no son Haceb?**
A: Sí, la arquitectura es genérica. Solo cambia el catálogo.

**Q: ¿Qué pasa si la identificación falla?**
A: Gemini usará su conocimiento general y pedirá más información al usuario.

**Q: ¿Puedo hacer fine-tuning después?**
A: Sí, ambos enfoques son complementarios. RAG primero, fine-tuning si necesitas más precisión.

---

**Documento creado**: 2025-10-30
**Última actualización**: 2025-10-30
**Autor**: Investigación con Claude Code
**Proyecto**: Seller.Katuq - Video Agent Module
