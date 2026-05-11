# Sistema de Onboarding Katuq con KAI Import

## Índice
- [Visión General](#visión-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Flujo de Onboarding](#flujo-de-onboarding)
- [Integración con KAI](#integración-con-kai)
- [Detalles Técnicos](#detalles-técnicos)
- [Colecciones de Firestore](#colecciones-de-firestore)
- [Problemas Comunes y Soluciones](#problemas-comunes-y-soluciones)
- [Ejemplos de Código](#ejemplos-de-código)

---

## Visión General

El **Sistema de Onboarding** es un wizard multi-paso que permite a nuevas empresas configurar completamente su tienda en Katuq. Incluye importación inteligente de datos con IA (KAI Import), configuración de zonas de cobro, tiempos de entrega, y más.

### Características Principales

- 🤖 **Mapeo Inteligente de Columnas**: IA analiza archivos Excel/CSV y sugiere mapeos automáticos
- 📊 **Importación Masiva**: Clientes y productos desde archivos Excel/JSON
- ⚙️ **Configuración Completa**: Zonas de cobro, tiempos de entrega, consecutivos
- 🔒 **Multi-tenancy**: Aislamiento completo de datos por empresa
- ✅ **Validación en Tiempo Real**: Verificación de configuraciones requeridas

---

## Arquitectura del Sistema

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    ANGULAR FRONTEND                         │
│                      (Puerto 4200)                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Onboarding Wizard Components                       │  │
│  │   - import-customers-step.component.ts               │  │
│  │   - import-products-step.component.ts                │  │
│  │   - delivery-times-step.component.ts                 │  │
│  │   - billing-zones-step.component.ts                  │  │
│  │   - sequences-step.component.ts                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           │ HTTP Requests                   │
│                           │ Headers: { company: companyId } │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              KATUQ BACKEND (Express.js)                     │
│                    (Puerto 3300)                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Onboarding Controller                              │  │
│  │   - POST /v1/onboarding/import-customers             │  │
│  │   - POST /v1/onboarding/import-products              │  │
│  │   - GET  /v1/onboarding/delivery-times/check         │  │
│  │   - GET  /v1/onboarding/billing-zones/check          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           │ Column Mapping Request          │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Column Mapping Service                             │  │
│  │   - Envía datos a KAI para análisis semántico        │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  KAI BACKEND (Genkit)                       │
│                     (Puerto 3890)                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Column Mapping Flow                                │  │
│  │   - Modelo: Gemini 2.0 Flash Exp                     │  │
│  │   - Análisis semántico de columnas                   │  │
│  │   - Genera mapeos con confidence scores              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           │ Returns JSON                    │
│                           ▼                                 │
│  {                                                          │
│    "mappings": { "documento": {...}, "nombres": {...} },   │
│    "unmappedRequired": [],                                 │
│    "warnings": [],                                         │
│    "suggestions": []                                       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  FIREBASE FIRESTORE                         │
│                                                             │
│  Collections:                                               │
│  - companies      (Datos de empresas)                       │
│  - clients        (Clientes importados)                     │
│  - products       (Productos importados)                    │
│  - tiemposentrega (Tiempos de entrega)                      │
│  - zonacobro      (Zonas de cobro)                          │
│  - users          (Administradores)                         │
└─────────────────────────────────────────────────────────────┘
```

### Tecnologías

- **Frontend**: Angular 14, PrimeNG, XLSX.js
- **Backend Katuq**: Express.js, Firebase Admin SDK
- **Backend KAI**: Genkit, Google Gemini 2.0 Flash Exp
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Auth + JWT

---

## Flujo de Onboarding

### Paso 1: Creación de Empresa

El usuario crea una nueva empresa con información básica:
- Nombre comercial
- NIT/Documento
- Email
- Configuración inicial

```typescript
// Datos guardados en collection 'companies'
{
  cd: "unique-company-id",
  nomComercial: "Mi Tienda",
  nit: "123456789",
  email: "contacto@mitienda.com",
  date_created: Timestamp
}
```

### Paso 2: Importar Clientes (Opcional)

**Componente**: `import-customers-step.component.ts`

**Flujo**:
1. Usuario carga archivo Excel/JSON con clientes
2. Sistema parsea archivo y extrae columnas
3. Se envían columnas + 3 filas de muestra a KAI
4. KAI analiza semánticamente y sugiere mapeos
5. Usuario revisa/ajusta mapeos en UI
6. Usuario confirma mapeos
7. Sistema transforma datos según mapeos
8. Se hace POST a `/v1/onboarding/import-customers`

**Ejemplo de Archivo Excel**:
```
| DNI       | Nombre Completo | Email              | Teléfono   |
|-----------|-----------------|-------------------|------------|
| 123456789 | Juan Pérez      | juan@example.com  | 3001234567 |
| 987654321 | María García    | maria@example.com | 3009876543 |
```

**Mapeo Sugerido por KAI**:
```json
{
  "mappings": {
    "documento": {
      "sourceColumn": "DNI",
      "confidence": 95,
      "reasoning": "La columna 'DNI' coincide semánticamente con el campo requerido 'documento'"
    },
    "nombres_completos": {
      "sourceColumn": "Nombre Completo",
      "confidence": 98,
      "reasoning": "Mapeo directo: 'Nombre Completo' → 'nombres_completos'"
    },
    "correo_electronico_comprador": {
      "sourceColumn": "Email",
      "confidence": 90,
      "reasoning": "La columna 'Email' contiene direcciones de correo electrónico"
    },
    "numero_celular_comprador": {
      "sourceColumn": "Teléfono",
      "confidence": 85,
      "reasoning": "Valores numéricos de 10 dígitos sugieren números de celular"
    }
  },
  "unmappedRequired": [],
  "warnings": [],
  "suggestions": [
    "Considera agregar columnas para tipo_documento_comprador y ciudad"
  ]
}
```

### Paso 3: Importar Productos (Opcional)

**Componente**: `import-products-step.component.ts`

**Flujo**: Idéntico al de clientes, pero con campos de producto.

**Ejemplo de Archivo Excel**:
```
| SKU    | Nombre Producto  | Precio | IVA | Stock |
|--------|------------------|--------|-----|-------|
| P001   | Camiseta Básica  | 25000  | 19  | 100   |
| P002   | Pantalón Jean    | 45000  | 19  | 50    |
```

**Mapeo Sugerido**:
```json
{
  "mappings": {
    "identificacion.referencia": {
      "sourceColumn": "SKU",
      "confidence": 98,
      "reasoning": "SKU es el identificador único del producto"
    },
    "titulo": {
      "sourceColumn": "Nombre Producto",
      "confidence": 95,
      "reasoning": "Mapeo directo al título del producto"
    },
    "precio.precioUnitarioSinIva": {
      "sourceColumn": "Precio",
      "confidence": 92,
      "reasoning": "Valores numéricos positivos sin decimales"
    },
    "precio.valorIva": {
      "sourceColumn": "IVA",
      "confidence": 98,
      "reasoning": "Porcentaje de IVA colombiano estándar (19%)"
    },
    "stock.cantidadDisponible": {
      "sourceColumn": "Stock",
      "confidence": 95,
      "reasoning": "Cantidad disponible en inventario"
    }
  }
}
```

### Paso 4: Configurar Tiempos de Entrega

**Componente**: `delivery-times-step.component.ts`

El usuario configura zonas geográficas y sus tiempos de entrega:

```typescript
{
  company: "company-id",
  nombre: "Bogotá y alrededores",
  tiempo: 24,
  unidad: "horas",
  zonas: ["Bogotá", "Chía", "Cota"],
  activo: true
}
```

**Endpoint de Verificación**: `GET /v1/onboarding/delivery-times/check`

### Paso 5: Configurar Zonas de Cobro

**Componente**: `billing-zones-step.component.ts`

El usuario define costos de envío por zona:

```typescript
{
  company: "company-id",
  nombre: "Zona Urbana",
  precio: 5000,
  ciudades: ["Bogotá", "Medellín", "Cali"],
  activo: true
}
```

**Endpoint de Verificación**: `GET /v1/onboarding/billing-zones/check`

### Paso 6: Configurar Consecutivos

**Componente**: `sequences-step.component.ts`

Configuración de numeración para pedidos, facturas, etc:

```typescript
{
  company: "company-id",
  tipo: "pedido",
  prefijo: "PED-",
  siguiente: 1,
  formato: "PED-0001"
}
```

### Paso 7: Completar Setup

El sistema verifica que todas las configuraciones requeridas estén completas y activa la cuenta.

---

## Integración con KAI

### ¿Qué es KAI?

**KAI** (Katuq Artificial Intelligence) es un sistema de IA basado en Genkit y Google Gemini que proporciona capacidades de análisis semántico para el mapeo inteligente de columnas.

### Column Mapping Flow

**Archivo**: `/kai/functions/src/agents/data-import/flows/columnMappingFlow.ts`

#### Entrada del Flow

```typescript
{
  type: "customer" | "product",
  sourceColumns: ["DNI", "Nombre Completo", "Email"],
  sampleRows: [
    { "DNI": "123456789", "Nombre Completo": "Juan Pérez", "Email": "juan@example.com" },
    { "DNI": "987654321", "Nombre Completo": "María García", "Email": "maria@example.com" }
  ],
  companyId: "optional-company-id"
}
```

#### Procesamiento

1. **Construcción del Prompt**: Se construye un prompt específico según el tipo (customer/product) con:
   - Esquema de Katuq (campos disponibles)
   - Columnas detectadas en el archivo
   - Filas de ejemplo con valores reales

2. **Llamada a Gemini 2.0 Flash Exp**:
   ```typescript
   const result = await ai.generate({
     model: googleAI.model("gemini-2.0-flash-exp"),
     prompt: prompt,
     config: {
       temperature: 0.2,  // Baja temperatura para consistencia
       maxOutputTokens: 2000,
       topP: 0.95,
       topK: 40,
     },
     output: { format: "json" }
   });
   ```

3. **Análisis Semántico**: El modelo analiza:
   - Nombres de columnas (similaridad semántica)
   - Valores de ejemplo (patrones, tipos de datos)
   - Contexto del negocio (e-commerce colombiano)

4. **Generación de Mapeos**: Retorna JSON estructurado con:
   - Mapeos sugeridos con confidence scores
   - Campos obligatorios sin mapear
   - Advertencias (ambigüedades, datos faltantes)
   - Sugerencias de mejora

#### Salida del Flow

```typescript
{
  mappings: {
    "documento": {
      sourceColumn: "DNI",
      confidence: 95,
      reasoning: "La columna 'DNI' coincide semánticamente con 'documento'"
    },
    "nombres_completos": {
      sourceColumn: "Nombre Completo",
      confidence: 98,
      reasoning: "Mapeo directo al campo nombres_completos"
    }
  },
  unmappedRequired: [],  // Campos requeridos sin mapear
  warnings: [
    "No se encontró columna para tipo_documento_comprador"
  ],
  suggestions: [
    "Considera agregar una columna 'Tipo Documento' con valores CC/NIT/CE"
  ]
}
```

### Prompts Inteligentes

**Archivo**: `/kai/functions/src/agents/data-import/agents/columnMappingAgent.ts`

#### Prompt para Clientes

```typescript
export function buildCustomerMappingPrompt(
  sourceColumns: string[],
  sampleRows: any[]
): string {
  return `
Eres un experto en análisis de datos de e-commerce colombiano.
Analiza las siguientes columnas de un archivo de clientes y mapéalas
al esquema de Katuq.

ESQUEMA DE KATUQ - CLIENTE:
- documento (requerido): Número de identificación
- nombres_completos (requerido): Nombre completo del cliente
- correo_electronico_comprador (requerido): Email
- numero_celular_comprador (requerido): Celular (10 dígitos)
- tipo_documento_comprador: CC, NIT, CE, PAS
- ciudad: Ciudad de residencia
- direccion: Dirección de entrega

COLUMNAS DETECTADAS:
${sourceColumns.join(', ')}

FILAS DE MUESTRA:
${JSON.stringify(sampleRows, null, 2)}

INSTRUCCIONES:
1. Analiza semánticamente cada columna
2. Mapea a campos de Katuq con confidence (0-100)
3. Explica el razonamiento de cada mapeo
4. Identifica campos requeridos sin mapear
5. Genera warnings y suggestions

RETORNA JSON:
{
  "mappings": { "campoKatuq": { "sourceColumn", "confidence", "reasoning" } },
  "unmappedRequired": [],
  "warnings": [],
  "suggestions": []
}
`;
}
```

### Ventajas del Sistema KAI

1. **Flexibilidad**: No requiere formato exacto de archivo
2. **Inteligencia**: Reconoce variaciones ("Email", "Correo", "Mail")
3. **Transparencia**: Explica cada mapeo con reasoning
4. **Confianza**: Confidence scores ayudan a identificar mapeos dudosos
5. **Aprendizaje**: Suggestions mejoran calidad de datos futuros

---

## Detalles Técnicos

### Multi-tenancy y Headers

**Problema**: Durante el onboarding, el HTTP interceptor no siempre envía el header `company`.

**Causa**: El interceptor depende de `localStorage.getItem('user').company`, que puede no estar configurado durante onboarding.

**Solución**: Los componentes de importación envían el header explícitamente:

```typescript
// import-customers-step.component.ts (líneas 254-259)
const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
const companyId = company.cd || company._id || company.nit;

const headers = new HttpHeaders({
  'company': companyId  // Header explícito
});

const response = await this.http.post<ImportResult>(
  `${environment.urlApi}/v1/onboarding/import-customers`,
  payload,
  { headers }  // Pasar headers explícitamente
).toPromise();
```

### Transformación de Datos con Mapeos

**Función**: `transformDataWithMapping()` en ambos componentes de importación

```typescript
private transformDataWithMapping(
  data: any[],
  mappings: { [katuqField: string]: string }
): any[] {
  return data.map(row => {
    const transformedRow: any = {};

    // Aplicar mapeos
    Object.entries(mappings).forEach(([katuqField, sourceColumn]) => {
      const value = row[sourceColumn];

      // Manejar campos nested (ej: "identificacion.referencia")
      if (katuqField.includes('.')) {
        const parts = katuqField.split('.');
        let current = transformedRow;

        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = value;
      } else {
        transformedRow[katuqField] = value;
      }
    });

    return transformedRow;
  });
}
```

**Ejemplo de Transformación**:

```typescript
// Entrada:
{
  "SKU": "P001",
  "Precio": 25000
}

// Mapeos:
{
  "identificacion.referencia": "SKU",
  "precio.precioUnitarioSinIva": "Precio"
}

// Salida:
{
  "identificacion": {
    "referencia": "P001"
  },
  "precio": {
    "precioUnitarioSinIva": 25000
  }
}
```

### Validación de Configuraciones

Los componentes validan que las configuraciones estén completas antes de permitir avanzar:

```typescript
// Ejemplo de delivery-times-step.component.ts
async canProceed(): Promise<boolean> {
  const response = await this.http.get(
    `${environment.urlApi}/v1/onboarding/delivery-times/check`,
    { headers: { company: this.companyId } }
  ).toPromise();

  return response.exists && response.count > 0;
}
```

---

## Colecciones de Firestore

### companies

Datos de empresas registradas en Katuq.

```typescript
{
  cd: string,              // ID único de la empresa
  nit: string,             // NIT/Documento
  nomComercial: string,    // Nombre comercial
  email: string,           // Email de contacto
  telefono?: string,
  direccion?: string,
  ciudad?: string,
  activo: boolean,
  date_created: Timestamp,
  date_edit?: Timestamp,
  // ... otros campos de configuración
}
```

**Índices**:
- `cd` (único)
- `nit` (único)
- `activo`

### clients

Clientes importados por las empresas.

```typescript
{
  documento: string,                        // NIT/CC/CE (requerido)
  tipo_documento_comprador?: string,        // CC, NIT, CE, PAS
  nombres_completos: string,                // Nombre completo (requerido)
  correo_electronico_comprador: string,     // Email (requerido)
  numero_celular_comprador: string,         // Celular (requerido)
  ciudad?: string,
  direccion?: string,
  datosFacturacionElectronica?: {
    razonSocial?: string,
    nit?: string,
    ciudad?: string,
    direccion?: string
  },
  company: string,                          // ID de la empresa (requerido)
  date_created: Timestamp,
  date_edit?: Timestamp
}
```

**Índices**:
- `documento` + `company` (compuesto, único)
- `company`
- `correo_electronico_comprador`

### products

Productos del catálogo de cada empresa.

```typescript
{
  identificacion: {
    referencia: string,          // SKU (requerido)
    codigoBarras?: string
  },
  titulo: string,                // Nombre del producto (requerido)
  descripcion: string,           // Descripción (requerido)
  precio: {
    precioUnitarioSinIva: number,  // Precio sin IVA (requerido)
    valorIva: number,              // % IVA (requerido)
    precioConIva?: number,         // Calculado automáticamente
    descuento?: number
  },
  stock: {
    cantidadDisponible: number,    // Stock actual (requerido)
    unidadMedida?: string
  },
  caracteristicas?: {
    marca?: string,
    categoria?: string,
    pesoKg?: number,
    dimensiones?: {
      largo?: number,
      ancho?: number,
      alto?: number
    }
  },
  imagenes?: string[],
  activo: boolean,
  company: string,                 // ID de la empresa (requerido)
  date_created: Timestamp,
  date_edit?: Timestamp
}
```

**Índices**:
- `identificacion.referencia` + `company` (compuesto, único)
- `company`
- `activo` + `company` (compuesto)
- `caracteristicas.categoria` + `company` (compuesto)

### tiemposentrega

Configuración de tiempos de entrega por zona.

```typescript
{
  company: string,           // ID de la empresa (requerido)
  nombre: string,            // Nombre de la zona
  tiempo: number,            // Tiempo de entrega
  unidad: string,            // "horas", "dias"
  zonas: string[],           // Lista de ciudades/zonas
  activo: boolean,
  date_created: Timestamp
}
```

**Índices**:
- `company` + `activo` (compuesto)

### zonacobro

Configuración de zonas de cobro y costos de envío.

```typescript
{
  company: string,           // ID de la empresa (requerido)
  nombre: string,            // Nombre de la zona
  precio: number,            // Costo de envío
  ciudades: string[],        // Lista de ciudades incluidas
  activo: boolean,
  date_created: Timestamp
}
```

**Índices**:
- `company` + `activo` (compuesto)

### users

Administradores y usuarios del sistema.

```typescript
{
  uid: string,               // Firebase Auth UID
  email: string,
  nombre: string,
  company: string,           // ID de la empresa asignada
  empresa: string,           // Nombre de la empresa (legado)
  role: string,              // ID del rol
  activo: boolean,
  date_created: Timestamp
}
```

**⚠️ IMPORTANTE**: Existe un bug conocido en `roles.js:78` donde el filtro por `company` está comentado, causando que al editar roles se actualicen todos los usuarios de todas las empresas.

---

## Problemas Comunes y Soluciones

### Problema 1: "companyId es requerido" al importar

**Síntomas**:
- Error 400 al importar clientes/productos
- Backend rechaza request: "companyId es requerido"

**Causa**:
- HTTP interceptor no envía header `company`
- Durante onboarding, `user.company` no está en localStorage

**Solución**:
```typescript
// Enviar header explícitamente
const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
const headers = new HttpHeaders({
  'company': company.cd || company._id || company.nit
});

await this.http.post(endpoint, payload, { headers }).toPromise();
```

### Problema 2: Datos importados no aparecen en módulos

**Síntomas**:
- Import exitoso (mensaje de éxito)
- Datos no aparecen en listado de clientes/productos

**Causas Posibles**:

1. **Collection incorrecta**:
   - Verificar que se guarda en `'clients'` no en `'clientes'`
   - Verificar que se guarda en `'products'` no en otra colección

2. **Company ID incorrecto**:
   - Datos guardados con `company: "CompanyA"`
   - Usuario actual tiene `user.company: "CompanyB"`
   - Interceptor filtra por company, no encuentra datos

**Diagnóstico**:
```javascript
// Backend logs mostrarán:
console.log(`🔍 Clientes para ${company}: ${count} encontrado(s)`);
console.log(`🔍 Productos para ${company}: ${count} encontrado(s)`);

// Si count > 0 pero no aparecen en frontend, revisar:
// 1. ¿localStorage.getItem('user').company coincide con el company guardado?
// 2. ¿Collection name es correcta?
```

**Solución**:
```typescript
// En componentes de importación, usar currentCompany de localStorage
const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
const companyId = company.cd || company._id || company.nit;

// Asegurar que se usa este companyId para guardar datos
payload.companyId = companyId;
```

### Problema 3: 404 en endpoints de verificación

**Síntomas**:
```
GET /v1/onboarding/delivery-times/check 404
GET /v1/onboarding/billing-zones/check 404
```

**Causa**:
- Endpoints no implementados en backend

**Solución**:
1. Agregar routes en `routers/onboarding.js`:
```javascript
router.get('/delivery-times/check', auth, Controller.checkDeliveryTimesExist);
router.get('/billing-zones/check', auth, Controller.checkBillingZonesExist);
```

2. Implementar métodos en `controllers/onboarding.js`:
```javascript
exports.checkDeliveryTimesExist = async (req, res) => {
  try {
    const company = req.headers.company;

    if (!company) {
      return res.status(400).json({
        success: false,
        error: "Header 'company' es requerido"
      });
    }

    const snapshot = await db.collection('tiemposentrega')
      .where('company', '==', company)
      .get();

    return res.status(200).json({
      success: true,
      exists: !snapshot.empty,
      count: snapshot.size,
      data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error al verificar tiempos de entrega"
    });
  }
};
```

### Problema 4: KAI retorna mappings vacíos

**Síntomas**:
- Column mapping flow retorna `{ mappings: {} }`
- No hay sugerencias de mapeo

**Causas Posibles**:

1. **Modelo incorrecto**:
```typescript
// ❌ INCORRECTO
model: googleAI.model("gemini-2.5-flash"),

// ✅ CORRECTO
model: googleAI.model("gemini-2.0-flash-exp"),
```

2. **Prompt mal formateado**:
- Verificar que sourceColumns y sampleRows se pasan correctamente
- Asegurar que sampleRows tiene al menos 1 fila de datos

3. **Timeout o error de API**:
- Verificar API key de Gemini
- Revisar logs de KAI backend

**Solución**:
```typescript
// Verificar input antes de llamar al flow
console.log('sourceColumns:', sourceColumns);
console.log('sampleRows:', sampleRows);

// Asegurar modelo correcto
const result = await ai.generate({
  model: googleAI.model("gemini-2.0-flash-exp"),
  prompt: prompt,
  config: {
    temperature: 0.2,
    maxOutputTokens: 2000
  },
  output: { format: "json" }
});
```

### Problema 5: Campos nested no se mapean correctamente

**Síntomas**:
- Mapeos como `"identificacion.referencia"` no funcionan
- Datos se guardan planos en lugar de nested

**Causa**:
- Función `transformDataWithMapping` no maneja dots (`.`) en field names

**Solución**:
```typescript
// En transformDataWithMapping():
if (katuqField.includes('.')) {
  const parts = katuqField.split('.');
  let current = transformedRow;

  // Crear objetos nested
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  // Asignar valor al campo final
  current[parts[parts.length - 1]] = value;
} else {
  // Campo flat
  transformedRow[katuqField] = value;
}
```

---

## Ejemplos de Código

### Ejemplo 1: Servicio de Column Mapping

**Archivo**: `src/app/components/onboarding/services/column-mapping.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ColumnMappingRequest {
  type: 'customer' | 'product';
  sourceColumns: string[];
  sampleRows: any[];
  companyId?: string;
}

export interface ColumnMappingResult {
  mappings: {
    [katuqField: string]: {
      sourceColumn: string;
      confidence: number;
      reasoning: string;
    }
  };
  unmappedRequired: string[];
  warnings?: string[];
  suggestions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ColumnMappingService {

  constructor(private http: HttpClient) {}

  /**
   * Extrae nombres de columnas de un array de objetos
   */
  extractColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }

  /**
   * Obtiene filas de muestra (máximo 3)
   */
  getSampleRows(data: any[], maxRows: number = 3): any[] {
    return data.slice(0, maxRows);
  }

  /**
   * Llama a KAI para sugerir mapeo de columnas
   */
  suggestColumnMapping(
    request: ColumnMappingRequest,
    companyName: string
  ): Observable<ColumnMappingResult> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Endpoint del KAI backend
    const endpoint = `${environment.kaiApiUrl}/columnMapping`;

    return this.http.post<ColumnMappingResult>(
      endpoint,
      request,
      { headers }
    );
  }
}
```

### Ejemplo 2: Componente de Revisión de Mapeos

**Archivo**: `src/app/components/onboarding/components/mapping-preview/mapping-preview.component.ts`

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

interface MappingItem {
  katuqField: string;
  sourceColumn: string;
  confidence: number;
  reasoning: string;
}

@Component({
  selector: 'app-mapping-preview',
  templateUrl: './mapping-preview.component.html'
})
export class MappingPreviewComponent {
  @Input() mappingResult: any = null;
  @Input() sourceColumns: string[] = [];

  @Output() mappingsAdjusted = new EventEmitter<any>();
  @Output() mappingsConfirmed = new EventEmitter<any>();

  adjustedMappings: { [katuqField: string]: string } = {};

  ngOnInit() {
    // Inicializar mappings ajustados con sugerencias de KAI
    if (this.mappingResult?.mappings) {
      Object.entries(this.mappingResult.mappings).forEach(([katuqField, mapping]: any) => {
        this.adjustedMappings[katuqField] = mapping.sourceColumn;
      });
    }
  }

  /**
   * Usuario cambió manualmente un mapeo
   */
  onMappingChange(katuqField: string, newSourceColumn: string) {
    this.adjustedMappings[katuqField] = newSourceColumn;
    this.mappingsAdjusted.emit(this.adjustedMappings);
  }

  /**
   * Usuario confirma los mapeos
   */
  confirmMappings() {
    this.mappingsConfirmed.emit(this.adjustedMappings);
  }

  /**
   * Retorna color según confidence score
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 90) return 'green';
    if (confidence >= 70) return 'yellow';
    return 'red';
  }

  /**
   * Retorna icono según confidence score
   */
  getConfidenceIcon(confidence: number): string {
    if (confidence >= 90) return 'pi pi-check-circle';
    if (confidence >= 70) return 'pi pi-exclamation-triangle';
    return 'pi pi-times-circle';
  }
}
```

**Template HTML**:

```html
<div class="mapping-preview" *ngIf="mappingResult">

  <!-- Header -->
  <div class="preview-header">
    <h3>Mapeos Sugeridos por KAI</h3>
    <p class="text-muted">
      Revisa y ajusta los mapeos antes de confirmar
    </p>
  </div>

  <!-- Mappings Table -->
  <p-table [value]="getMappingItems()" styleClass="p-datatable-sm">
    <ng-template pTemplate="header">
      <tr>
        <th>Campo Katuq</th>
        <th>Columna Origen</th>
        <th>Confianza</th>
        <th>Razonamiento</th>
      </tr>
    </ng-template>

    <ng-template pTemplate="body" let-mapping>
      <tr>
        <!-- Campo Katuq -->
        <td>
          <strong>{{ mapping.katuqField }}</strong>
          <span *ngIf="mapping.required" class="badge badge-danger ml-2">
            Requerido
          </span>
        </td>

        <!-- Dropdown para seleccionar columna origen -->
        <td>
          <p-dropdown
            [options]="sourceColumns"
            [(ngModel)]="adjustedMappings[mapping.katuqField]"
            (onChange)="onMappingChange(mapping.katuqField, $event.value)"
            placeholder="Seleccionar columna"
            styleClass="w-100">
          </p-dropdown>
        </td>

        <!-- Confidence badge -->
        <td>
          <span [class]="'badge badge-' + getConfidenceColor(mapping.confidence)">
            <i [class]="getConfidenceIcon(mapping.confidence)"></i>
            {{ mapping.confidence }}%
          </span>
        </td>

        <!-- Reasoning -->
        <td>
          <small class="text-muted">{{ mapping.reasoning }}</small>
        </td>
      </tr>
    </ng-template>
  </p-table>

  <!-- Warnings -->
  <div class="alert alert-warning mt-3" *ngIf="mappingResult.warnings?.length > 0">
    <strong>Advertencias:</strong>
    <ul>
      <li *ngFor="let warning of mappingResult.warnings">{{ warning }}</li>
    </ul>
  </div>

  <!-- Suggestions -->
  <div class="alert alert-info mt-3" *ngIf="mappingResult.suggestions?.length > 0">
    <strong>Sugerencias:</strong>
    <ul>
      <li *ngFor="let suggestion of mappingResult.suggestions">{{ suggestion }}</li>
    </ul>
  </div>

  <!-- Unmapped Required Fields -->
  <div class="alert alert-danger mt-3" *ngIf="mappingResult.unmappedRequired?.length > 0">
    <strong>Campos requeridos sin mapear:</strong>
    <ul>
      <li *ngFor="let field of mappingResult.unmappedRequired">{{ field }}</li>
    </ul>
    <p class="mb-0">
      <small>Debes mapear estos campos manualmente antes de continuar.</small>
    </p>
  </div>

  <!-- Actions -->
  <div class="actions mt-4">
    <button
      pButton
      type="button"
      label="Confirmar Mapeos"
      icon="pi pi-check"
      class="p-button-success"
      (click)="confirmMappings()"
      [disabled]="mappingResult.unmappedRequired?.length > 0">
    </button>
  </div>

</div>
```

### Ejemplo 3: Backend Endpoint - Import Customers

**Archivo**: `katuq_admin_back_firebase/functions/controllers/onboarding.js`

```javascript
/**
 * Importa clientes desde onboarding
 *
 * POST /v1/onboarding/import-customers
 * Headers: { company: "company-id" }
 * Body: {
 *   customers: [ {...}, {...} ],
 *   companyId: "company-id",
 *   mappings: { "documento": "DNI", ... }
 * }
 */
exports.importCustomers = async (req, res) => {
  try {
    // Validar company header
    const company = req.headers.company;
    if (!company) {
      return res.status(400).json({
        success: false,
        error: "Header 'company' es requerido"
      });
    }

    // Validar body
    const { customers, companyId, mappings } = req.body;

    if (!customers || !Array.isArray(customers)) {
      return res.status(400).json({
        success: false,
        error: "Array 'customers' es requerido"
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "companyId es requerido"
      });
    }

    console.log(`🔄 Iniciando importación de ${customers.length} clientes para ${company}`);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      importedCustomers: []
    };

    // Procesar cada cliente
    for (const customer of customers) {
      try {
        // Validar campos requeridos
        if (!customer.documento || !customer.nombres_completos ||
            !customer.correo_electronico_comprador || !customer.numero_celular_comprador) {
          results.failed++;
          results.errors.push(
            `Cliente sin datos completos: ${JSON.stringify(customer).substring(0, 100)}`
          );
          continue;
        }

        // Construir objeto Katuq
        const katuqCustomer = {
          documento: customer.documento,
          tipo_documento_comprador: customer.tipo_documento_comprador || 'CC',
          nombres_completos: customer.nombres_completos,
          correo_electronico_comprador: customer.correo_electronico_comprador,
          numero_celular_comprador: customer.numero_celular_comprador,
          ciudad: customer.ciudad || '',
          direccion: customer.direccion || '',
          datosFacturacionElectronica: customer.datosFacturacionElectronica || {},
          company: companyId,
          activo: true,
          date_created: new Date()
        };

        // Verificar si ya existe (por documento + company)
        const existingCustomer = await db.collection('clients')
          .where('documento', '==', katuqCustomer.documento)
          .where('company', '==', companyId)
          .limit(1)
          .get();

        if (!existingCustomer.empty) {
          // Actualizar existente
          await db.collection('clients')
            .doc(existingCustomer.docs[0].id)
            .update({
              ...katuqCustomer,
              date_edit: new Date()
            });

          console.log(`✅ Cliente actualizado: ${katuqCustomer.documento}`);
        } else {
          // Crear nuevo
          const docRef = await db.collection('clients').add(katuqCustomer);
          console.log(`✅ Cliente creado: ${docRef.id}`);
        }

        results.success++;
        results.importedCustomers.push(katuqCustomer);

      } catch (customerError) {
        console.error(`❌ Error procesando cliente:`, customerError);
        results.failed++;
        results.errors.push(
          `Error en cliente ${customer.documento}: ${customerError.message}`
        );
      }
    }

    console.log(`✅ Importación completada: ${results.success} éxitos, ${results.failed} fallos`);

    return res.status(200).json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('❌ Error en importCustomers:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al importar clientes',
      details: error.message
    });
  }
};
```

---

## Conclusión

El sistema de onboarding de Katuq con KAI Import proporciona una experiencia fluida y inteligente para configurar nuevas tiendas. Las características clave incluyen:

- ✅ **Importación inteligente** con análisis semántico de columnas
- ✅ **Configuración completa** en un solo flujo
- ✅ **Multi-tenancy robusto** con aislamiento por empresa
- ✅ **Validaciones en tiempo real** de configuraciones requeridas
- ✅ **Flexibilidad** para omitir pasos opcionales

### Próximos Pasos

Para mejorar el sistema:

1. **Migrar a ESLint** desde TSLint (deprecado)
2. **Agregar tests unitarios** para componentes de importación
3. **Implementar retry logic** para errores de red con KAI
4. **Caché de mappings** para archivos similares
5. **Dashboard de progreso** con barra visual de pasos completados

---

## Referencias

- **Frontend**: `/src/app/components/onboarding/`
- **Backend Katuq**: `/katuq_admin_back_firebase/functions/`
- **Backend KAI**: `/kai/functions/src/agents/data-import/`
- **Documentación de Genkit**: https://firebase.google.com/docs/genkit
- **Documentación de Gemini**: https://ai.google.dev/docs

---

**Última actualización**: 2025-11-04
**Versión del sistema**: Katuq Seller v14.1.x
