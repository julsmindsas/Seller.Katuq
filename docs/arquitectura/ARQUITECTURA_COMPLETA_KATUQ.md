# 🏗️ Arquitectura Completa de Katuq - Documento para Clase

**Autor:** Equipo de Desarrollo Katuq  
**Fecha:** Enero 2025  
**Versión:** 2.0  
**Propósito:** Documentación completa de arquitectura para presentación académica

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Visión General del Sistema](#visión-general-del-sistema)
3. [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel)
4. [Frontend - Angular 14](#frontend---angular-14)
5. [Backend - Firebase Functions](#backend---firebase-functions)
6. [KAI - Sistema de Inteligencia Artificial](#kai---sistema-de-inteligencia-artificial)
7. [Flujos de Datos Principales](#flujos-de-datos-principales)
8. [Integraciones Externas](#integraciones-externas)
9. [Seguridad y Autenticación](#seguridad-y-autenticación)
10. [Patrones de Diseño Implementados](#patrones-de-diseño-implementados)
11. [Stack Tecnológico Completo](#stack-tecnológico-completo)

---

## Resumen Ejecutivo

**Katuq** es una plataforma SaaS de e-commerce B2B con arquitectura híbrida **Firebase + AWS**, diseñada para gestionar operaciones multiempresa de pedidos, inventario, logística, producción y dropshipping. El sistema está compuesto por tres componentes principales:

1. **Frontend (Seller.Katuq)**: Aplicación Angular 14 con arquitectura modular
2. **Backend (katuq_admin_back_firebase)**: API REST con Firebase Functions y Express
3. **KAI (kai)**: Sistema de inteligencia artificial basado en Google Genkit y Gemini

### Características Principales

- ✅ **Multi-tenancy**: Soporte para múltiples empresas en una sola instancia
- ✅ **Arquitectura Modular**: Frontend con lazy-loading y backend con microservicios
- ✅ **Inteligencia Artificial**: Agentes autónomos para logística, ventas y análisis
- ✅ **Integraciones**: Shopify, WooCommerce, pasarelas de pago, logística
- ✅ **Escalabilidad**: Diseñado para manejar millones de transacciones

---

## Visión General del Sistema

### Componentes Principales

```mermaid
graph TB
    subgraph "USUARIOS"
        U1[Vendedores]
        U2[Administradores]
        U3[Clientes B2B]
        U4[Operadores Logísticos]
    end

    subgraph "FRONTEND - Angular 14"
        F1[Dashboard]
        F2[Ventas]
        F3[Inventarios]
        F4[Producción]
        F5[Despachos]
        F6[POS]
        F7[Integraciones]
    end

    subgraph "BACKEND - Firebase Functions"
        B1[API REST v1]
        B2[Controllers]
        B3[Services]
        B4[Webhooks]
    end

    subgraph "KAI - Inteligencia Artificial"
        K1[Agentes de IA]
        K2[Flows Genkit]
        K3[Tools Catalog]
        K4[Orquestadores]
    end

    subgraph "DATOS"
        D1[(Firestore)]
        D2[(Realtime DB)]
        D3[Storage]
    end

    subgraph "EXTERNOS"
        E1[Shopify]
        E2[WooCommerce]
        E3[Wompi/ePayco]
        E4[Coordinadora]
        E5[Google Maps]
    end

    U1 & U2 & U3 & U4 --> F1 & F2 & F3 & F4 & F5 & F6 & F7
    F1 & F2 & F3 & F4 & F5 & F6 & F7 --> B1
    B1 --> B2 & B3 & B4
    B2 & B3 --> D1 & D2 & D3
    B3 --> K1
    K1 --> K2 & K3 & K4
    K2 --> D1
    B4 --> E1 & E2 & E3 & E4
    K3 --> E5

    style F1 fill:#e1f5ff
    style B1 fill:#fff3e0
    style K1 fill:#f3e5f5
    style D1 fill:#e8f5e9
```

---

## Arquitectura de Alto Nivel

### Diagrama de Capas

```mermaid
graph TB
    subgraph "CAPA DE PRESENTACIÓN"
        P1[Seller Center Web]
        P2[Portal Clientes]
        P3[CRM Móvil]
        P4[Claude AI Interface]
    end

    subgraph "CAPA DE APLICACIÓN"
        A1[API Gateway REST]
        A2[Webhooks Handler]
        A3[Genkit Flows]
        A4[MCP Server]
    end

    subgraph "CAPA DE SERVICIOS"
        S1[Order Service]
        S2[Inventory Service]
        S3[Logistics Service]
        S4[AI Agents Service]
        S5[Notification Service]
    end

    subgraph "CAPA DE DATOS"
        D1[(Firestore)]
        D2[(Realtime Database)]
        D3[Firebase Storage]
        D4[AWS SQS]
    end

    subgraph "CAPA DE INTEGRACIONES"
        I1[E-commerce APIs]
        I2[Payment Gateways]
        I3[Shipping Providers]
        I4[AI Services]
    end

    P1 & P2 & P3 & P4 --> A1 & A2 & A3 & A4
    A1 & A2 & A3 & A4 --> S1 & S2 & S3 & S4 & S5
    S1 & S2 & S3 & S4 & S5 --> D1 & D2 & D3 & D4
    S1 & S2 & S3 --> I1 & I2 & I3
    S4 --> I4

    style P1 fill:#e3f2fd
    style A1 fill:#fff9c4
    style S1 fill:#f1f8e9
    style D1 fill:#e8f5e9
    style I1 fill:#fce4ec
```

---

## Frontend - Angular 14

### Estructura Modular

```mermaid
graph TB
    subgraph "APP MODULE"
        AM[app.module.ts]
        AR[app-routing.module.ts]
    end

    subgraph "FEATURE MODULES - Lazy Loaded"
        M1[Dashboard Module]
        M2[Ventas Module]
        M3[Inventarios Module]
        M4[Producción Module]
        M5[Despachos Module]
        M6[POS Module]
        M7[Empresas Module]
        M8[Integraciones Module]
    end

    subgraph "SHARED MODULE"
        SM[shared.module.ts]
        SC[Shared Components]
        SS[Shared Services]
        SD[Shared Directives]
        SP[Shared Pipes]
        SG[Guards]
    end

    subgraph "CORE SERVICES"
        CS1[BaseService]
        CS2[AuthService]
        CS3[HttpInterceptor2]
        CS4[LoaderInterceptor]
        CS5[NotificationService]
    end

    AM --> AR
    AR --> M1 & M2 & M3 & M4 & M5 & M6 & M7 & M8
    M1 & M2 & M3 & M4 & M5 & M6 & M7 & M8 --> SM
    SM --> SC & SS & SD & SP & SG
    SS --> CS1 & CS2 & CS3 & CS4 & CS5

    style AM fill:#1976d2,color:#fff
    style SM fill:#388e3c,color:#fff
    style CS1 fill:#f57c00,color:#fff
```

### Arquitectura de Componentes Frontend

```mermaid
graph LR
    subgraph "COMPONENTE"
        C[Component.ts]
        CT[Component.html]
        CS[Component.scss]
    end

    subgraph "SERVICIO"
        S[Service.ts]
        BS[BaseService]
    end

    subgraph "HTTP LAYER"
        H1[HttpClient]
        H2[HttpInterceptor2]
        H3[LoaderInterceptor]
    end

    subgraph "BACKEND API"
        API[API REST v1]
    end

    C --> S
    S --> BS
    BS --> H1
    H1 --> H2
    H2 --> H3
    H3 --> API

    style C fill:#42a5f5
    style S fill:#66bb6a
    style H1 fill:#ffa726
    style API fill:#ef5350
```

### Módulos Principales del Frontend

| Módulo | Ruta | Descripción | Componentes Principales |
|--------|------|-------------|------------------------|
| **Dashboard** | `/dashboard` | Métricas y KPIs | DashboardComponent, AnalyticsWidgets |
| **Ventas** | `/ventas` | Gestión de pedidos y clientes | CrearVentasComponent, PedidosComponent, ClientesComponent |
| **Inventarios** | `/inventario` | Catálogo y stock | InventarioCatalogoComponent, BodegasComponent, TrasladosComponent |
| **Producción** | `/produccion` | Control de producción | ProduccionDashboardComponent, TrackingComponent |
| **Despachos** | `/despachos` | Gestión de envíos | DespachosComponent, ShippingOrdersComponent |
| **POS** | `/pos` | Punto de venta | POSComponent, CashClosingComponent |
| **Empresas** | `/empresas` | Configuración multi-empresa | EmpresasComponent, ModuloVariableComponent |
| **Integraciones** | `/integrations` | Conectores externos | IntegrationsListComponent, IntegrationModalComponent |

### Patrón de Servicios Frontend

```typescript
// Estructura típica de un servicio
export class VentasService extends BaseService {
  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {
    super(http);
  }

  crearPedido(pedido: Pedido): Observable<Pedido> {
    return this.post('/v1/orders/create', pedido);
  }

  obtenerPedidos(filtros: any): Observable<Pedido[]> {
    return this.post('/v1/orders/all/filter/optimized', filtros);
  }
}
```

---

## Backend - Firebase Functions

### Arquitectura en Capas

```mermaid
graph TB
    subgraph "ENTRY POINT"
        EP[index.js]
        EX[Express Server]
    end

    subgraph "ROUTERS LAYER"
        R1[/v1/orders]
        R2[/v1/inventory]
        R3[/v1/logistica]
        R4[/v1/analytics]
        R5[/v1/katuqintelligence]
    end

    subgraph "CONTROLLERS LAYER"
        C1[orders.js]
        C2[inventory.js]
        C3[logistica.js]
        C4[analytics.js]
        C5[katuqintelligence.js]
    end

    subgraph "SERVICES LAYER"
        S1[orderService.js]
        S2[inventoryService.js]
        S3[logisticsManager.js]
        S4[notificationService.js]
    end

    subgraph "REPOSITORIES LAYER"
        REP1[orderRepository.js]
        REP2[inventoryRepository.js]
    end

    subgraph "DATA LAYER"
        DB[(Firestore)]
        SQS[AWS SQS]
    end

    EP --> EX
    EX --> R1 & R2 & R3 & R4 & R5
    R1 --> C1
    R2 --> C2
    R3 --> C3
    R4 --> C4
    R5 --> C5
    C1 --> S1
    C2 --> S2
    C3 --> S3
    C4 --> S4
    S1 --> REP1
    S2 --> REP2
    REP1 & REP2 --> DB
    S4 --> SQS

    style EP fill:#ff6f00,color:#fff
    style C1 fill:#42a5f5
    style S1 fill:#66bb6a
    style DB fill:#4caf50,color:#fff
```

### Estructura de Directorios Backend

```
katuq_admin_back_firebase/functions/
├── index.js                    # Entry point principal
├── config.js                   # Configuración global
├── routers/                    # 86+ routers de API
│   ├── orders.js
│   ├── inventory.js
│   ├── logistica.js
│   └── ...
├── controllers/                # 70+ controladores
│   ├── orders.js
│   ├── inventory.js
│   ├── logistica.js
│   └── ...
├── services/                   # Lógica de negocio
│   ├── orderService.js
│   ├── inventoryService.js
│   ├── logisticsManager.js
│   ├── notifications/
│   └── ...
├── repositories/               # Acceso a datos
│   └── orderRepository.js
├── middleware/                 # Autenticación y validación
│   ├── auth.js
│   ├── usageTracker.js
│   └── ...
├── handlers/                   # Event handlers
│   └── sqsListener.js
├── tools/                      # Herramientas MCP
│   └── ...
└── utils/                      # Utilidades
    └── ...
```

### Flujo de Request en Backend

```mermaid
sequenceDiagram
    participant C as Cliente
    participant R as Router
    participant MW as Middleware
    participant CTRL as Controller
    participant SVC as Service
    participant REPO as Repository
    participant DB as Firestore

    C->>R: HTTP Request
    R->>MW: Auth Middleware
    MW->>MW: Validate JWT
    MW->>MW: Usage Tracking
    MW->>CTRL: Request + User Context
    CTRL->>CTRL: Validate Input
    CTRL->>SVC: Business Logic Call
    SVC->>SVC: Business Rules
    SVC->>REPO: Data Access
    REPO->>DB: Firestore Query
    DB-->>REPO: Data
    REPO-->>SVC: Normalized Data
    SVC-->>CTRL: Business Result
    CTRL-->>MW: Response
    MW-->>R: Response
    R-->>C: HTTP Response
```

### Módulos Principales del Backend

| Módulo | Controlador | Endpoints Principales | Descripción |
|--------|-------------|----------------------|-------------|
| **Órdenes** | `orders.js` | `/v1/orders/*` | Gestión completa del ciclo de vida de pedidos |
| **Inventario** | `inventory.js` | `/v1/inventory/*` | Control de stock multi-bodega en tiempo real |
| **Logística** | `logistica.js` | `/v1/logistica/*` | Orquestador de envíos y rutas |
| **Analytics** | `analytics.js` | `/v1/analytics/*` | KPIs y métricas de negocio |
| **Katuq Intelligence** | `katuqintelligence.js` | `/v1/katuqintelligence/*` | Predicciones y análisis con IA |
| **Clientes** | `clients.js` | `/v1/clients/*` | Gestión de clientes B2B/B2C |
| **Pagos** | `pagos.js` | `/v1/pagos/*` | Integración con pasarelas de pago |
| **Integraciones** | `shopifyIntegration.js` | `/v1/integrations/*` | Conectores con e-commerce |

---

## KAI - Sistema de Inteligencia Artificial

### Arquitectura de Agentes

```mermaid
graph TB
    subgraph "GENKIT FLOW SERVER"
        GS[Genkit Server<br/>Port 3890]
    end

    subgraph "AGENTES DE LOGÍSTICA"
        A1[Strategic Dispatch Agent]
        A2[Route Optimization Agent]
        A3[Transporter Assignment Agent]
        A4[Exception Handling Agent]
        A5[Supervisor Agent]
    end

    subgraph "ORQUESTADORES"
        O1[Logistics Orchestrator]
        O2[Sales Orchestrator]
        O3[Inventory Orchestrator]
        O4[General Manager Orchestrator]
    end

    subgraph "TOOLS CATALOG"
        T1[Order Tools]
        T2[Route Tools]
        T3[Transporter Tools]
        T4[Context Tools]
        T5[Persistence Tools]
    end

    subgraph "EXTERNAL SERVICES"
        E1[Google Maps API]
        E2[Katuq API Client]
        E3[Firestore]
    end

    GS --> A1 & A2 & A3 & A4 & A5
    A1 & A2 & A3 & A4 & A5 --> O1
    O1 & O2 & O3 --> O4
    O1 --> T1 & T2 & T3 & T4 & T5
    T2 --> E1
    T1 & T3 --> E2
    T5 --> E3

    style GS fill:#9c27b0,color:#fff
    style A1 fill:#673ab7,color:#fff
    style O1 fill:#3f51b5,color:#fff
    style T1 fill:#2196f3
```

### Flujo Multi-Agente

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Flow
    participant SA as Strategic Agent
    participant RA as Route Agent
    participant TA as Transporter Agent
    participant EA as Exception Agent
    participant DB as Firestore

    U->>F: multiAgentDispatchFlow(company)
    F->>SA: Analizar pedidos pendientes
    SA->>DB: Obtener pedidos
    DB-->>SA: Lista de pedidos
    SA->>SA: Agrupar por estrategia
    SA->>RA: Optimizar rutas
    RA->>RA: Calcular distancias
    RA->>RA: Aplicar algoritmo TSP
    RA-->>SA: Rutas optimizadas
    SA->>TA: Asignar transportadores
    TA->>DB: Consultar transportadores
    DB-->>TA: Transportadores disponibles
    TA->>TA: Match skills + capacidad
    TA-->>SA: Asignaciones
    SA->>EA: Validar excepciones
    EA->>EA: Detectar conflictos
    EA-->>SA: Excepciones
    SA->>DB: Persistir plan
    DB-->>SA: Confirmación
    SA-->>F: Plan completo
    F-->>U: Resultado
```

### Protocolos de Comunicación

```mermaid
graph LR
    subgraph "MCP - Model Context Protocol"
        MCP[MCP Server]
        MCPT[MCP Tools]
        MCPD[Firestore Data]
    end

    subgraph "A2A - Agent to Agent"
        A2A[A2A Protocol]
        A2AR[Agent Registry]
        A2AE[Event Bus]
    end

    subgraph "AGENTES"
        AG1[Agent 1]
        AG2[Agent 2]
        AG3[Agent 3]
    end

    MCP --> MCPT
    MCPT --> MCPD
    AG1 & AG2 & AG3 --> A2A
    A2A --> A2AR
    A2A --> A2AE
    A2AE --> AG1 & AG2 & AG3

    style MCP fill:#4285f4,color:#fff
    style A2A fill:#34a853,color:#fff
```

### Agentes Implementados

| Agente | Propósito | Herramientas | Flujo |
|--------|-----------|--------------|-------|
| **Strategic Dispatch** | Planificación logística | orderTools, groupingTools, strategicTools | strategicDispatchFlow |
| **Route Optimization** | Optimización de rutas | routeTools, googleMapsService | multiAgentDispatchFlow |
| **Transporter Assignment** | Asignación de transportadores | transporterTools, assignmentTools | multiAgentDispatchFlow |
| **Exception Handling** | Manejo de excepciones | contextTools, orderTools | multiAgentDispatchFlow |
| **Supervisor** | Supervisión y coordinación | All tools | multiAgentDispatchFlow |
| **Admin Reports** | Reportes administrativos | adminKPIsTools, adminSalesTools | adminReportsFlow |

---

## Flujos de Datos Principales

### Flujo: Creación de Pedido

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant API as Backend API
    participant IV as Inventory Service
    participant DB as Firestore
    participant N as Notification Queue
    participant KAI as KAI System

    U->>F: Crear pedido
    F->>API: POST /v1/orders/create
    API->>API: Validar datos
    API->>IV: Verificar stock
    IV->>DB: Consultar inventario
    DB-->>IV: Stock disponible
    IV-->>API: Confirmación stock
    API->>DB: Crear pedido
    DB-->>API: Pedido creado
    API->>IV: Reservar stock
    IV->>DB: Actualizar inventario
    API->>N: Enviar notificación
    API->>KAI: Analizar patrón
    KAI->>KAI: Predicción demanda
    API-->>F: Respuesta éxito
    F-->>U: Confirmación
```

### Flujo: Optimización de Rutas con KAI

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant API as Backend API
    participant KAI as KAI Flow
    participant SA as Strategic Agent
    participant RA as Route Agent
    participant GM as Google Maps
    participant DB as Firestore

    U->>F: Optimizar rutas
    F->>API: POST /v1/logistica/optimize
    API->>KAI: Invocar multiAgentDispatchFlow
    KAI->>SA: Analizar pedidos pendientes
    SA->>DB: Obtener pedidos
    DB-->>SA: Lista pedidos
    SA->>SA: Agrupar estratégicamente
    SA->>RA: Optimizar rutas
    RA->>GM: Calcular distancias
    GM-->>RA: Matriz distancias
    RA->>RA: Aplicar algoritmo TSP
    RA-->>SA: Rutas optimizadas
    SA->>DB: Persistir plan
    DB-->>SA: Confirmación
    SA-->>KAI: Plan completo
    KAI-->>API: Resultado
    API-->>F: Rutas optimizadas
    F-->>U: Visualizar rutas
```

### Flujo: Sincronización con E-commerce

```mermaid
sequenceDiagram
    participant EC as E-commerce<br/>(Shopify/WooCommerce)
    participant WH as Webhook Handler
    participant API as Backend API
    participant IV as Inventory Service
    participant DB as Firestore
    participant N as Notification Service

    EC->>WH: Webhook nuevo pedido
    WH->>WH: Validar firma
    WH->>API: Normalizar datos
    API->>IV: Verificar stock
    IV->>DB: Consultar inventario
    DB-->>IV: Stock disponible
    IV-->>API: Confirmación
    API->>DB: Crear pedido sincronizado
    DB-->>API: Pedido creado
    API->>IV: Reservar stock
    API->>N: Notificar cliente
    API-->>WH: Confirmación
    WH-->>EC: 200 OK
```

---

## Integraciones Externas

### Mapa de Integraciones

```mermaid
graph TB
    subgraph "KATUQ PLATFORM"
        K[Katuq Core]
    end

    subgraph "E-COMMERCE"
        E1[Shopify]
        E2[WooCommerce]
        E3[Virtual Store]
    end

    subgraph "PAYMENT GATEWAYS"
        P1[Wompi]
        P2[ePayco]
        P3[Mercado Pago]
    end

    subgraph "LOGISTICS"
        L1[Coordinadora]
        L2[Interrapidísimo]
        L3[Enviame]
        L4[Partners Logistics]
    end

    subgraph "ACCOUNTING"
        AC1[Siigo]
        AC2[QuickBooks]
    end

    subgraph "AI SERVICES"
        AI1[Google Gemini]
        AI2[Google Maps]
        AI3[Vertex AI]
    end

    subgraph "CRM"
        CRM1[Salesforce]
        CRM2[HubSpot]
        CRM3[Zoho CRM]
    end

    K --> E1 & E2 & E3
    K --> P1 & P2 & P3
    K --> L1 & L2 & L3 & L4
    K --> AC1 & AC2
    K --> AI1 & AI2 & AI3
    K --> CRM1 & CRM2 & CRM3

    style K fill:#ff6f00,color:#fff
    style E1 fill:#96bf48
    style P1 fill:#00a8e6
    style L1 fill:#f7941d
    style AI1 fill:#4285f4,color:#fff
```

### Patrón de Integración

```mermaid
graph LR
    subgraph "INTEGRATION LAYER"
        IC[Integration Controller]
        IS[Integration Service]
        AD[Adapter Pattern]
    end

    subgraph "PROVIDERS"
        P1[Shopify Provider]
        P2[WooCommerce Provider]
        P3[Wompi Provider]
        P4[Coordinadora Provider]
    end

    subgraph "EXTERNAL APIs"
        API1[Shopify API]
        API2[WooCommerce API]
        API3[Wompi API]
        API4[Coordinadora API]
    end

    IC --> IS
    IS --> AD
    AD --> P1 & P2 & P3 & P4
    P1 --> API1
    P2 --> API2
    P3 --> API3
    P4 --> API4

    style IC fill:#42a5f5
    style AD fill:#66bb6a
    style P1 fill:#96bf48
```

---

## Seguridad y Autenticación

### Arquitectura de Seguridad

```mermaid
graph TB
    subgraph "AUTENTICACIÓN"
        A1[Firebase Auth]
        A2[JWT Tokens]
        A3[OAuth 2.0]
        A4[API Keys]
    end

    subgraph "AUTORIZACIÓN"
        AZ1[Role-Based Access Control]
        AZ2[Company Isolation]
        AZ3[Resource Permissions]
    end

    subgraph "SEGURIDAD DE RED"
        N1[HTTPS Only]
        N2[CORS Policy]
        N3[Rate Limiting]
        N4[Helmet.js]
    end

    subgraph "VALIDACIÓN"
        V1[Input Validation]
        V2[Webhook Signature]
        V3[SQL Injection Prevention]
    end

    A1 --> A2
    A2 --> AZ1
    A3 --> AZ2
    A4 --> AZ3
    N1 --> N2
    N2 --> N3
    N3 --> N4
    V1 --> V2
    V2 --> V3

    style A1 fill:#f44336,color:#fff
    style AZ1 fill:#ff9800,color:#fff
    style N1 fill:#4caf50,color:#fff
    style V1 fill:#2196f3,color:#fff
```

### Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant FA as Firebase Auth
    participant API as Backend API
    participant MW as Auth Middleware
    participant DB as Firestore

    U->>F: Login
    F->>FA: Sign in with email/password
    FA->>FA: Validar credenciales
    FA-->>F: Firebase Token
    F->>API: Request con Bearer Token
    API->>MW: Validate JWT
    MW->>FA: Verify token
    FA-->>MW: Token válido
    MW->>DB: Obtener usuario
    DB-->>MW: User data + roles
    MW->>MW: Verificar permisos
    MW-->>API: User context
    API->>API: Procesar request
    API-->>F: Response
    F-->>U: Datos
```

---

## Patrones de Diseño Implementados

### Resumen de Patrones

| Categoría | Patrón | Implementación | Ubicación |
|-----------|--------|-----------------|-----------|
| **Arquitectónicos** | Layered Architecture | Separación Router → Controller → Service → Repository | Todo el backend |
| **Arquitectónicos** | Repository Pattern | Abstracción de acceso a datos | `repositories/` |
| **Arquitectónicos** | Service Layer | Lógica de negocio encapsulada | `services/` |
| **Creacionales** | Singleton | Servicios compartidos | `orderService.js`, `inventoryService.js` |
| **Creacionales** | Factory | Creación dinámica de clientes | `ResilienceFactory` |
| **Estructurales** | Strategy | Proveedores intercambiables | `shippingProviders/` |
| **Estructurales** | Adapter | Compatibilidad legacy/moderno | `LegacyConfigAdapter` |
| **Estructurales** | Facade | Interfaz simplificada | `LogisticsManager` |
| **Comportamentales** | Observer | Sistema de eventos | Webhooks, SQS listeners |
| **Resiliencia** | Circuit Breaker | Protección contra fallos | `ResilientHttpClient` |
| **Resiliencia** | Retry Pattern | Reintentos automáticos | `ResilientHttpClient` |
| **Resiliencia** | Rate Limiting | Control de tráfico | `RateLimiter` |
| **Datos** | Cache-Aside | Cache distribuido | `DistributedCache` |
| **Datos** | Multi-tenancy | Segregación por empresa | Todas las queries |

---

## Stack Tecnológico Completo

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Angular** | 14.3.0 | Framework principal |
| **TypeScript** | 4.7.x | Lenguaje de programación |
| **PrimeNG** | 14.2.x | Componentes UI |
| **Bootstrap** | 5.2.x | Framework CSS |
| **RxJS** | 7.x | Programación reactiva |
| **Firebase SDK** | 9.17.x | Integración con Firebase |
| **ApexCharts** | Latest | Visualización de datos |
| **ngx-translate** | Latest | Internacionalización |

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 20 | Runtime |
| **Express** | 4.x | Framework web |
| **Firebase Functions** | Latest | Serverless functions |
| **Firestore** | Latest | Base de datos NoSQL |
| **AWS SDK** | 3.x | Integración AWS (SQS, X-Ray) |
| **Swagger** | Latest | Documentación API |
| **JWT** | Latest | Autenticación |

### KAI (Inteligencia Artificial)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Google Genkit** | 1.24.0 | Framework de IA |
| **Gemini AI** | Latest | Modelo de lenguaje |
| **Vertex AI** | Latest | Servicios de ML |
| **TypeScript** | 4.9.5 | Lenguaje de programación |
| **WebSocket** | 8.x | Comunicación en tiempo real |

### Infraestructura

| Servicio | Propósito |
|----------|-----------|
| **Firebase Hosting** | Hosting del frontend |
| **Firebase Functions** | Backend serverless |
| **Firestore** | Base de datos principal |
| **Firebase Storage** | Almacenamiento de archivos |
| **AWS SQS** | Cola de mensajes |
| **AWS X-Ray** | Tracing distribuido |
| **Google Cloud** | Servicios de IA |

---

## Métricas y Escalabilidad

### Capacidad del Sistema

- **Usuarios concurrentes**: 10,000+
- **Pedidos por día**: 100,000+
- **Empresas multi-tenant**: 1,000+
- **Productos por empresa**: 100,000+
- **Transacciones por segundo**: 1,000+

### Optimizaciones Implementadas

1. **Lazy Loading**: Módulos Angular cargados bajo demanda
2. **Caché Multinivel**: Frontend, backend y Firestore
3. **Paginación**: Consultas optimizadas con límites
4. **Batch Operations**: Operaciones en lote para Firestore
5. **CDN**: Firebase Hosting con CDN global
6. **Indexación**: Índices optimizados en Firestore

---

## Conclusión

Katuq es una plataforma SaaS robusta y escalable que combina:

- ✅ **Frontend moderno** con Angular 14 y arquitectura modular
- ✅ **Backend serverless** con Firebase Functions y Express
- ✅ **Inteligencia Artificial** con Google Genkit y agentes autónomos
- ✅ **Multi-tenancy** para soportar múltiples empresas
- ✅ **Integraciones extensas** con e-commerce, pagos y logística
- ✅ **Arquitectura resiliente** con patrones de diseño probados

La arquitectura está diseñada para crecer y adaptarse a las necesidades del negocio, utilizando las mejores prácticas de la industria y tecnologías de vanguardia.

---

**Última actualización**: Enero 2025  
**Versión del documento**: 2.0  
**Mantenido por**: Equipo de Desarrollo Katuq





