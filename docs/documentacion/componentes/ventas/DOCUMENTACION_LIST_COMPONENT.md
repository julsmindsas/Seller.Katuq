# Documentacion Completa: List Orders Component

## Tabla de Contenidos
1. [Resumen General](#resumen-general)
2. [Arquitectura del Componente](#arquitectura-del-componente)
3. [Flujo de Datos](#flujo-de-datos)
4. [Endpoints y Servicios](#endpoints-y-servicios)
5. [Sistema de Filtros](#sistema-de-filtros)
6. [Paginacion](#paginacion)
7. [Recalculo de Estados](#recalculo-de-estados)
8. [Permisos y Validaciones](#permisos-y-validaciones)
9. [Busqueda](#busqueda)
10. [Problemas Conocidos y Soluciones](#problemas-conocidos-y-soluciones)

---

## Resumen General

El componente `ListOrdersComponent` es la pantalla principal de gestion de pedidos en Katuq Seller. Muestra una tabla paginada de pedidos con filtros avanzados, busqueda global, y acciones contextuales.

### Archivos del Componente
```
src/app/components/ventas/list/
├── list.component.ts          # Logica principal (~4000 lineas)
├── list.component.html        # Template con tabla PrimeNG
├── list.component.scss        # Estilos
├── list-produccion.component.ts    # Variante para produccion
├── list-produccion.component.html
└── list-produccion.component.scss
```

---

## Arquitectura del Componente

### Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LIST ORDERS COMPONENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   FILTROS    │    │    TABLA     │    │   MODALES    │                  │
│  │              │    │   PrimeNG    │    │              │                  │
│  │ - Fechas    │    │              │    │ - Cambio     │                  │
│  │ - Estados   │───►│ - Paginacion │───►│   Estado     │                  │
│  │ - Busqueda  │    │ - Ordenamiento│   │ - Clientes   │                  │
│  │ - Columnas  │    │ - Lazy Load  │    │ - Entrega    │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │  VentasService   │                                    │
│                    └────────┬─────────┘                                    │
│                             │                                              │
└─────────────────────────────┼──────────────────────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │    BACKEND       │
                    │  Firebase Func.  │
                    └──────────────────┘
```

### Propiedades Principales

```typescript
// Datos de pedidos
orders: Pedido[] = [];              // Pedidos mostrados en tabla
originalOrders: Pedido[] = [];      // Copia para filtros locales
filteredOrders: Pedido[] = [];      // Resultado de filtros locales

// Paginacion
usePagination: boolean = true;      // Usar paginacion del servidor
currentPage: number = 1;            // Pagina actual
pageSize: number = 50;              // Pedidos por pagina
totalRecords: number = 0;           // Total de registros
first: number = 0;                  // Indice del primer registro

// Filtros rapidos
quickFilters = {
  estadoPago: "all",
  estadoProceso: "all"
};

// Busqueda
searchQuery: string = "";           // Termino de busqueda global
localSearchQuery: string = "";      // Busqueda local
isSearching: boolean = false;       // Indicador de busqueda en progreso

// Control de refrescos
refrescoEnProgreso: boolean = false;
ultimoRefresco: number = 0;
```

---

## Flujo de Datos

### Diagrama de Flujo: Carga de Datos

```
┌─────────────────┐
│   Usuario       │
│ Abre Pantalla   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ngAfterViewInit │
│                 │
│ Dispara carga   │
│ inicial         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   loadLazy()    │
│                 │
│ Evento PrimeNG  │
│ LazyLoadEvent   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ refrescarDatos()│
│                 │
│ - Valida tiempo │
│ - Construye     │
│   filtros       │
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Normal │ │  POS   │
│ Orders │ │ Orders │
│        │ │        │
│ /v1/   │ │ /v1/   │
│orders/ │ │orders/ │
│all/    │ │pos/    │
│filter/ │ │all/    │
│optim.  │ │filter  │
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────────────┐
│procesarRespuestaPaginada│
│                         │
│ - Combina resultados    │
│ - Calcula totales       │
│ - Recalcula estados     │
│ - Actualiza tabla       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  Tabla PrimeNG  │
│  Actualizada    │
└─────────────────┘
```

### Secuencia de Carga

```
Usuario                 Component               VentasService              Backend
  │                         │                        │                        │
  │  Abre pantalla          │                        │                        │
  ├────────────────────────►│                        │                        │
  │                         │                        │                        │
  │                    ngAfterViewInit()             │                        │
  │                         ├───────────────────────►│                        │
  │                         │  loadLazy(event)       │                        │
  │                         │                        │                        │
  │                         │  refrescarDatos()      │                        │
  │                         ├───────────────────────►│                        │
  │                         │                        │                        │
  │                         │                        │ getOrdersByFilter      │
  │                         │                        │ Optimized(filter,      │
  │                         │                        │ page, pageSize)        │
  │                         │                        ├───────────────────────►│
  │                         │                        │                        │
  │                         │                        │ POST /v1/orders/all/   │
  │                         │                        │ filter/optimized       │
  │                         │                        │◄───────────────────────┤
  │                         │                        │                        │
  │                         │                        │ getOrdersPOSByFilter   │
  │                         │                        │ (posFilter)            │
  │                         │                        ├───────────────────────►│
  │                         │                        │                        │
  │                         │                        │ POST /v1/orders/pos/   │
  │                         │                        │ all/filter             │
  │                         │                        │◄───────────────────────┤
  │                         │                        │                        │
  │                         │◄───────────────────────┤                        │
  │                         │  procesarRespuesta     │                        │
  │                         │  Paginada()            │                        │
  │                         │                        │                        │
  │   Tabla actualizada     │                        │                        │
  │◄────────────────────────┤                        │                        │
  │                         │                        │                        │
```

---

## Endpoints y Servicios

### Endpoints Utilizados

| Endpoint | Metodo | Descripcion | Usa Cache |
|----------|--------|-------------|-----------|
| `/v1/orders/all/filter/optimized` | POST | Pedidos normales con paginacion | NO* |
| `/v1/orders/pos/all/filter` | POST | Pedidos POS | NO* |
| `/v1/orders/search` | POST | Busqueda global | NO |
| `/v1/orders/byNroPedido/{nro}` | GET | Buscar por numero | NO |

*Cache desactivado temporalmente

### Payload de Filtros (Normal Orders)

```json
{
  "fechaInicial": "2024-01-01T00:00:00.000Z",
  "fechaFinal": "2024-01-31T23:59:59.999Z",
  "company": "NOMBRE_EMPRESA",
  "tipoFecha": "fechaEntrega",
  "estadoProceso": ["Todos"],
  "estadosPago": ["Pendiente", "PreAprobado", "Aprobado", "Rechazado"],
  "globalFilter": "termino busqueda",
  "columnFilters": {
    "nroPedido": "123",
    "cliente": "Juan"
  }
}
```

### Respuesta Paginada

```json
{
  "data": [ /* array de pedidos */ ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalDocs": 150,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "metrics": {
    "totalOrders": 150,
    "sinProducir": 10,
    "paraDespachar": 5,
    "porCobrar": 1500000
  }
}
```

---

## Sistema de Filtros

### Diagrama de Filtros

```
┌───────────────────────────────────────────────────────────────┐
│                    SISTEMA DE FILTROS                         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  FILTROS RAPIDOS                        │ │
│  │                                                         │ │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │ │
│  │   │ Estado   │  │ Estado   │  │      Preset de       │ │ │
│  │   │  Pago    │  │ Proceso  │  │       Fechas         │ │ │
│  │   │          │  │          │  │                      │ │ │
│  │   │ - All    │  │ - All    │  │ - Hoy                │ │ │
│  │   │-Pendiente│  │-SinProd. │  │ - Esta semana        │ │ │
│  │   │-Aprobado │  │-Producido│  │ - Este mes           │ │ │
│  │   │-PreAprob.│  │-Despach. │  │ - Personalizado      │ │ │
│  │   │-Rechazado│  │-Entregado│  │                      │ │ │
│  │   └──────────┘  └──────────┘  └──────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                FILTROS DE COLUMNA                       │ │
│  │                (Server-side)                            │ │
│  │                                                         │ │
│  │   nroPedido │ cliente │ ciudad │ transportador         │ │
│  │   ─────────────────────────────────────────────────     │ │
│  │   [_______] │[_______]│[_______]│[______________]       │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 BUSQUEDA GLOBAL                         │ │
│  │                                                         │ │
│  │   [________________________________] 🔍                 │ │
│  │                                                         │ │
│  │   Busca en: nroPedido, cliente, documento               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Tipos de Filtros

#### 1. Filtros Rapidos (QuickFilters)
```typescript
quickFilters = {
  estadoPago: "all" | "Pendiente" | "PreAprobado" | "Aprobado" | "Rechazado" | "Cancelado",
  estadoProceso: "all" | "SinProducir" | "EnProduccion" | "ProducidoTotalmente" | etc.
}
```

#### 2. Filtros de Fecha
```typescript
fechaInicial: string;  // "2024-01-01"
fechaFinal: string;    // "2024-01-31"
tipoFecha: "fechaEntrega" | "fechaCreacion";
```

#### 3. Filtros de Columna (Server-Side)
```typescript
columnFilters = {
  nroPedido: "123",
  cliente: "Juan",
  ciudad: "Bogota",
  transportador: "Express"
}
```

---

## Paginacion

### Diagrama de Paginacion

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE PAGINACION                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                        MODO SERVER-SIDE                                │
│                     (usePagination = true)                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  Frontend                         Backend                         │ │
│  │  ────────                         ───────                         │ │
│  │                                                                   │ │
│  │  currentPage: 1  ───────►  page=1, pageSize=50  ───────►         │ │
│  │  pageSize: 50              query.skip(0).limit(50)               │ │
│  │                                                                   │ │
│  │              ◄───────────  { data: [...50 items],                │ │
│  │                             pagination: {                         │ │
│  │                               totalDocs: 150,                     │ │
│  │                               totalPages: 3                       │ │
│  │                             }}                                    │ │
│  │                                                                   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      CONTROLES DE PAGINACION                      │ │
│  │                                                                   │ │
│  │  [◄ Anterior]  Pagina 1 de 3  [Siguiente ►]  [50 ▼] por pagina  │ │
│  │                                                                   │ │
│  │  Mostrando 1-50 de 150 pedidos                                   │ │
│  │                                                                   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Variables de Paginacion

```typescript
// Estado de paginacion
usePagination: boolean = true;    // Habilita paginacion server-side
currentPage: number = 1;          // Pagina actual (1-indexed)
pageSize: number = 50;            // Items por pagina
totalRecords: number = 0;         // Total de registros en BD
first: number = 0;                // Indice del primer item (0-indexed)

// Calculo de paginas
totalPages = Math.ceil(totalRecords / pageSize);
hasNextPage = currentPage < totalPages;
hasPreviousPage = currentPage > 1;
```

---

## Recalculo de Estados

### IMPORTANTE: Logica de Recalculo

El frontend recalcula el `estadoPago` basandose en los pagos realizados. Esto puede causar inconsistencias si no se maneja correctamente.

### Diagrama de Recalculo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      RECALCULO DE ESTADO DE PAGO                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Pedido llega del Backend                                               │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────┐                           │
│  │  ES ESTADO FINAL?                       │                           │
│  │                                         │                           │
│  │  estadosFinales = [                     │                           │
│  │    "Rechazado",                         │                           │
│  │    "Cancelado",                         │                           │
│  │    "Precancelado"                       │                           │
│  │  ]                                      │                           │
│  └────────────────┬────────────────────────┘                           │
│                   │                                                     │
│          ┌───────┴───────┐                                             │
│          │               │                                             │
│          ▼               ▼                                             │
│     ES FINAL         NO ES FINAL                                       │
│         │                │                                             │
│         ▼                ▼                                             │
│  ┌────────────┐   ┌─────────────────────────────────────┐             │
│  │ NO TOCAR   │   │        RECALCULAR ESTADO            │             │
│  │            │   │                                     │             │
│  │ Mantener   │   │  if (faltaPorPagar <= 0)           │             │
│  │ estado     │   │    estadoPago = "Aprobado"         │             │
│  │ original   │   │  else if (anticipo > 0)            │             │
│  │            │   │    estadoPago = "PreAprobado"      │             │
│  │            │   │  else                              │             │
│  │            │   │    estadoPago = "Pendiente"        │             │
│  └────────────┘   └─────────────────────────────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Codigo de Recalculo (Lineas ~2728-2800)

```typescript
// Estados que NUNCA se recalculan
const estadosFinales = ["Rechazado", "Cancelado", "Precancelado"];
const esEstadoFinal = estadosFinales.includes(order.estadoPago);

const debeRecalcular = !order._estadoCalculadoEnFrontend && !esEstadoFinal;

if (debeRecalcular && !esEstadoFinal) {
  // Logica de recalculo basada en pagos
  if (order.faltaPorPagar <= 0) {
    order.estadoPago = "Aprobado";
  } else if (order.faltaPorPagar < totalPedido) {
    order.estadoPago = "PreAprobado";
  } else {
    order.estadoPago = "Pendiente";
  }
}
```

---

## Permisos y Validaciones

### Matriz de Permisos por Estado

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PERMISOS POR ESTADO                                 │
├────────────────┬─────────┬──────────┬──────────┬───────────┬────────────────┤
│    ACCION      │Pendiente│PreAprob. │ Aprobado │ Rechazado │  Despachado    │
├────────────────┼─────────┼──────────┼──────────┼───────────┼────────────────┤
│ Editar Pedido  │   ✅    │    ✅    │    ✅    │    ❌     │      ❌        │
│ Eliminar       │   ✅    │    ❌    │    ❌    │    ❌     │      ❌        │
│ Agregar Prod.  │   ✅    │    ✅    │    ✅    │    ❌     │      ❌        │
│ Cambiar Estado │   ✅    │    ✅    │    ✅    │    ⚠️     │      ⚠️        │
│ Ver Historial  │   ✅    │    ✅    │    ✅    │    ✅     │      ✅        │
│ Reimprimir     │   ✅    │    ✅    │    ✅    │    ✅     │      ✅        │
└────────────────┴─────────┴──────────┴──────────┴───────────┴────────────────┘

✅ = Permitido
❌ = No permitido
⚠️ = Solo Admin
```

### Funciones de Validacion

```typescript
// Verificar si pedido esta congelado (no editable)
isPedidoCongelado(order: Pedido): boolean {
  const estadosCongelados = [
    EstadoProcesoFiltros.Despachado,
    EstadoProcesoFiltros.Entregado,
    EstadoProcesoFiltros.Rechazado
  ];
  return estadosCongelados.includes(order.estadoProceso);
}

// Verificar si puede eliminar pedido
canDeleteOrder(): boolean {
  const user = JSON.parse(sessionStorage.getItem("currentUser"));
  const isAdmin = ["admin", "empresario"].includes(user?.role);
  const isNotCongelado = !this.isPedidoCongelado(this.pedidoSeleccionado);
  return isAdmin && isNotCongelado;
}

// Verificar si puede editar productos
canModifyProducts(order: Pedido): boolean {
  return !this.isPedidoCongelado(order);
}
```

---

## Busqueda

### Diagrama de Busqueda

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE BUSQUEDA                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    BUSQUEDA GLOBAL (Server)                       │ │
│  │                                                                   │ │
│  │  Usuario escribe  ──►  Debounce 300ms  ──►  Endpoint /search     │ │
│  │                                                                   │ │
│  │  Busca en:                                                        │ │
│  │    - nroPedido (exacto y variaciones)                            │ │
│  │    - documento cliente                                            │ │
│  │    - nombre cliente                                               │ │
│  │                                                                   │ │
│  │  Retorna: Lista de coincidencias con datos completos              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                   BUSQUEDA LOCAL (Frontend)                       │ │
│  │                                                                   │ │
│  │  Filtra sobre: originalOrders[] (datos ya cargados)              │ │
│  │                                                                   │ │
│  │  Campos: nroPedido, cliente.nombres_completos,                    │ │
│  │          cliente.documento, envio.ciudad                          │ │
│  │                                                                   │ │
│  │  Ventaja: Instantaneo, sin llamada al servidor                    │ │
│  │  Desventaja: Solo busca en datos ya cargados                      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Busqueda Global

```
Usuario escribe "123"
        │
        ▼
┌───────────────┐
│ searchSubject │
│   .next()     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  debounceTime │
│   (300ms)     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ ventasService │
│  .search()    │
└───────┬───────┘
        │
        ▼
┌───────────────────────────┐
│ POST /v1/orders/search    │
│                           │
│ { query: "123",           │
│   company: "EMPRESA" }    │
└───────────────────────────┘
```

---

## Problemas Conocidos y Soluciones

### 1. Estados Incorrectos (RESUELTO)

**Problema:** El frontend recalculaba estados como "Rechazado" y los cambiaba a "Pendiente".

**Causa:** La logica de recalculo no excluia "Rechazado" de los estados que no deben modificarse.

**Solucion:** Agregar "Rechazado" a `estadosFinales`:
```typescript
const estadosFinales = ["Rechazado", "Cancelado", "Precancelado"];
```

### 2. Cache de Redis (DESACTIVADO)

**Problema:** El cache de Redis mostraba datos desactualizados.

**Solucion Temporal:** Cache desactivado en el backend.

**Archivo:** `katuq_admin_back_firebase/functions/services/redisCache.js`
```javascript
function isAvailable() {
  return false; // Cache desactivado
}
```

### 3. Refrescos Multiples

**Problema:** Multiples llamadas a `refrescarDatos()` causaban duplicacion de requests.

**Solucion:** Sistema de proteccion con flags:
```typescript
refrescoEnProgreso: boolean = false;
ultimoRefresco: number = 0;
const tiempoMinimoEntreRefrescos = isPageChange ? 500 : 5000;
```

---

## Resumen de Metodos Principales

| Metodo | Linea | Descripcion |
|--------|-------|-------------|
| `ngOnInit()` | ~1909 | Inicializacion, carga filtros guardados |
| `ngAfterViewInit()` | ~169 | Dispara primera carga de datos |
| `loadLazy()` | ~191 | Maneja paginacion lazy de PrimeNG |
| `refrescarDatos()` | ~2328 | Obtiene datos del backend |
| `procesarRespuestaPaginada()` | ~2600 | Procesa y recalcula estados |
| `onSharedEstadoPagoChange()` | ~1850 | Cambia filtro de estado pago |
| `onSharedEstadoProcesoChange()` | ~1859 | Cambia filtro de estado proceso |
| `clearSearchFilter()` | ~1598 | Limpia busqueda |
| `isPedidoCongelado()` | ~418 | Verifica si pedido es editable |
| `canDeleteOrder()` | ~398 | Verifica permiso de eliminar |

---

## Contacto y Mantenimiento

**Ultimo update:** 2024
**Lineas de codigo:** ~4000
**Complejidad:** Alta

> Este componente es critico para el flujo de ventas. Cualquier cambio debe probarse exhaustivamente antes de desplegar a produccion.
