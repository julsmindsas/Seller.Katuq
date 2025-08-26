# Prompt: Lógica de Cálculo de Valores Monetarios con Escalas de Precios - Sistema Katuq Seller

## Contexto
El sistema Katuq Seller recalcula dinámicamente todos los valores monetarios usando escalas de precios por volumen. El backend debe implementar exactamente la misma lógica para mantener consistencia.

## Estructura del Modelo

```typescript
interface Producto {
  precio: {
    precioUnitarioSinIva: number;
    precioUnitarioConIva: number;
    valorIva: number;
    preciosVolumen: PrecioVolumen[];  // CRÍTICO: Array de escalas
  };
}

interface PrecioVolumen {
  numeroUnidadesInicial: number;        // Cantidad mínima del rango
  numeroUnidadesLimite: number;         // Cantidad máxima del rango
  valorUnitarioPorVolumenSinIVA: number; // Precio unitario sin IVA para este rango
  valorUnitarioPorVolumenIva: number;    // IVA unitario para este rango
  valorUnitarioPorVolumenConIVA: number; // Precio unitario con IVA para este rango
}

interface Carrito {
  producto: Producto;
  cantidad: number;                     // CRÍTICO: Determina qué escala usar
  configuracion: {
    adiciones: Adicion[];               // Productos adicionales
    preferencias: Preferencia[];        // Configuraciones con precio
  };
}

interface Adicion {
  referencia: {
    precioUnitario: number;             // Precio unitario de la adición
    precioIva: number;                  // IVA de la adición
  };
  cantidad: number;                     // Cantidad de esta adición
}

interface Preferencia {
  valorUnitarioSinIva: number;          // Precio sin IVA de la preferencia
  valorIva: number;                     // IVA de la preferencia
  precioTotalConIva: number;            // Precio total con IVA
}
```

## Función Crítica: Cálculo de Precios por Volumen

### 1. Cálculo de Precio Sin IVA con Escalas (checkPriceScale)

```typescript
function calculatePriceScale(pedido: Pedido): number {
  let totalPrecioSinIVA = 0;
  
  pedido.carrito.forEach((itemCarrito) => {
    let precioProducto = 0;
    
    // LÓGICA DE ESCALAS DE PRECIOS POR VOLUMEN
    if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
      let precioEncontrado = false;
      
      // Buscar el rango de volumen que aplica
      itemCarrito.producto.precio.preciosVolumen.forEach((escala) => {
        if (itemCarrito.cantidad >= escala.numeroUnidadesInicial && 
            itemCarrito.cantidad <= escala.numeroUnidadesLimite) {
          // APLICAR PRECIO POR VOLUMEN
          precioProducto = escala.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
          precioEncontrado = true;
        }
      });
      
      // Fallback si no encuentra rango de volumen
      if (!precioEncontrado) {
        precioProducto = itemCarrito.producto.precio.precioUnitarioSinIva * itemCarrito.cantidad;
      }
    } else {
      // Sin escalas de volumen - precio normal
      precioProducto = itemCarrito.producto.precio.precioUnitarioSinIva * itemCarrito.cantidad;
    }
    
    // SUMAR ADICIONES
    if (itemCarrito.configuracion?.adiciones) {
      itemCarrito.configuracion.adiciones.forEach((adicion) => {
        if (adicion.referencia?.precioUnitario) {
          precioProducto += adicion.cantidad * 
                           adicion.referencia.precioUnitario * 
                           itemCarrito.cantidad;
        }
      });
    }
    
    // SUMAR PREFERENCIAS
    if (itemCarrito.configuracion?.preferencias) {
      itemCarrito.configuracion.preferencias.forEach((preferencia) => {
        precioProducto += preferencia.valorUnitarioSinIva * itemCarrito.cantidad;
      });
    }
    
    totalPrecioSinIVA += precioProducto;
  });
  
  return totalPrecioSinIVA;
}
```

### 2. Cálculo de IVA con Escalas (checkIVAPrice)

```typescript
function calculateIVAPrice(pedido: Pedido): number {
  let totalPrecioIVA = 0;
  
  pedido.carrito.forEach((itemCarrito) => {
    let ivaProducto = 0;
    
    // LÓGICA DE ESCALAS DE IVA POR VOLUMEN
    if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
      let ivaEncontrado = false;
      
      // Buscar el rango de volumen que aplica para IVA
      itemCarrito.producto.precio.preciosVolumen.forEach((escala) => {
        if (itemCarrito.cantidad >= escala.numeroUnidadesInicial && 
            itemCarrito.cantidad <= escala.numeroUnidadesLimite) {
          // APLICAR IVA POR VOLUMEN
          ivaProducto = escala.valorUnitarioPorVolumenIva * itemCarrito.cantidad;
          ivaEncontrado = true;
        }
      });
      
      // Fallback si no encuentra rango de volumen
      if (!ivaEncontrado) {
        ivaProducto = itemCarrito.producto.precio.valorIva * itemCarrito.cantidad;
      }
    } else {
      // Sin escalas de volumen - IVA normal
      ivaProducto = itemCarrito.producto.precio.valorIva * itemCarrito.cantidad;
    }
    
    // SUMAR IVA DE ADICIONES
    if (itemCarrito.configuracion?.adiciones) {
      itemCarrito.configuracion.adiciones.forEach((adicion) => {
        if (adicion.referencia?.precioIva) {
          ivaProducto += adicion.cantidad * 
                        adicion.referencia.precioIva * 
                        itemCarrito.cantidad;
        }
      });
    }
    
    // SUMAR IVA DE PREFERENCIAS
    if (itemCarrito.configuracion?.preferencias) {
      itemCarrito.configuracion.preferencias.forEach((preferencia) => {
        ivaProducto += preferencia.valorIva * itemCarrito.cantidad;
      });
    }
    
    totalPrecioIVA += ivaProducto;
  });
  
  return totalPrecioIVA;
}
```

## Recálculo Completo de Pedido

```typescript
function recalcularPedidoCompleto(pedido: Pedido): Pedido {
  // PASO 1: Recalcular precios usando escalas de volumen
  pedido.totalPedidoSinDescuento = calculatePriceScale(pedido);
  pedido.totalImpuesto = calculateIVAPrice(pedido);
  
  // PASO 2: Calcular subtotal
  pedido.subtotal = pedido.totalPedidoSinDescuento + 
                   (pedido.totalEnvio || 0) - 
                   (pedido.totalDescuento || 0);
  
  // PASO 3: Calcular total final
  pedido.totalPedididoConDescuento = pedido.subtotal + pedido.totalImpuesto;
  
  // PASO 4: Recalcular anticipo real
  if (pedido.PagosAsentados && pedido.PagosAsentados.length > 0) {
    pedido.anticipo = pedido.PagosAsentados.reduce(
      (sum, pago) => sum + (pago.valor || 0), 0
    );
  } else if (!pedido.anticipo) {
    pedido.anticipo = 0;
  }
  
  // PASO 5: Recalcular falta por pagar
  pedido.faltaPorPagar = Math.max(0, pedido.totalPedididoConDescuento - pedido.anticipo);
  
  // PASO 6: Actualizar estado de pago automáticamente
  if (!pedido._estadoCalculadoEnFrontend && 
      pedido.estadoPago !== "Precancelado" && 
      pedido.estadoPago !== "Cancelado") {
    
    if (pedido.faltaPorPagar <= 0) {
      pedido.estadoPago = "Aprobado";
    } else if (pedido.faltaPorPagar > 0 && 
               pedido.faltaPorPagar < pedido.totalPedididoConDescuento) {
      pedido.estadoPago = "PreAprobado";
    } else if (pedido.preAprobadoManual) {
      pedido.estadoPago = "PreAprobado";
    } else {
      pedido.estadoPago = "Pendiente";
    }
  }
  
  // PASO 7: Validar validación
  if (pedido.validacion == null || pedido.validacion == undefined) {
    pedido.validacion = false;
  }
  
  return pedido;
}
```

## Reglas de Negocio Críticas

### A. Prioridad en Escalas de Precios
1. SIEMPRE verificar si existe `preciosVolumen[]` con elementos
2. Buscar el rango donde `cantidad >= numeroUnidadesInicial AND cantidad <= numeroUnidadesLimite`
3. Si encuentra rango: usar `valorUnitarioPorVolumenSinIVA` y `valorUnitarioPorVolumenIva`
4. Si NO encuentra rango: usar `precioUnitarioSinIva` y `valorIva` normales
5. Si NO hay escalas: usar precios unitarios normales

### B. Lógica de Rangos Superpuestos
- Si hay múltiples rangos que aplican, usar el primer rango encontrado
- Los rangos deben ser mutuamente excluyentes en la configuración
- Validar que no haya gaps en los rangos

### C. Manejo de Adiciones y Preferencias
- Las adiciones se multiplican por: `cantidad_adicion * precio_adicion * cantidad_producto`
- Las preferencias se multiplican por: `precio_preferencia * cantidad_producto`
- Ambos se suman DESPUÉS del cálculo de escalas

### D. Prioridad en Cálculo de Pagos
1. SIEMPRE verificar si existe `PagosAsentados[]` con elementos
2. Si existe, sumar todos los `pago.valor` del array
3. Solo usar `pedido.anticipo` como fallback si no hay `PagosAsentados`

### E. Prevención de Valores Negativos
- En `faltaPorPagar`: usar `Math.max(0, faltaPorPagar)` para evitar negativos
- Los sobrepagos deben manejarse como casos especiales

## Casos de Prueba Obligatorios

### Caso 1: Producto con Escala de Volumen
```json
{
  "producto": {
    "precio": {
      "precioUnitarioSinIva": 10000,
      "valorIva": 1900,
      "preciosVolumen": [
        {
          "numeroUnidadesInicial": 1,
          "numeroUnidadesLimite": 5,
          "valorUnitarioPorVolumenSinIVA": 10000,
          "valorUnitarioPorVolumenIva": 1900
        },
        {
          "numeroUnidadesInicial": 6,
          "numeroUnidadesLimite": 10,
          "valorUnitarioPorVolumenSinIVA": 9000,
          "valorUnitarioPorVolumenIva": 1710
        }
      ]
    }
  },
  "cantidad": 8
}
// Resultado esperado: totalSinIVA = 72000, totalIVA = 13680
```

### Caso 2: Producto con Adiciones y Escalas
```json
{
  "producto": {
    "precio": {
      "preciosVolumen": [
        {
          "numeroUnidadesInicial": 3,
          "numeroUnidadesLimite": 10,
          "valorUnitarioPorVolumenSinIVA": 8000
        }
      ]
    }
  },
  "cantidad": 5,
  "configuracion": {
    "adiciones": [
      {
        "referencia": {"precioUnitario": 2000},
        "cantidad": 2
      }
    ]
  }
}
// Resultado: (8000 * 5) + (2000 * 2 * 5) = 40000 + 20000 = 60000
```

### Caso 3: Pedido con Pagos Asentados
```json
{
  "totalPedididoConDescuento": 100000,
  "anticipo": 30000,
  "PagosAsentados": [
    {"valor": 20000, "formaPago": "Transferencia"},
    {"valor": 25000, "formaPago": "Efectivo"}
  ]
}
// Resultado esperado: anticipoReal = 45000, faltaPorPagar = 55000
```

## Validaciones Críticas

### Validaciones de Rangos
```typescript
function validarRangosDeVolumen(preciosVolumen: PrecioVolumen[]): boolean {
  // 1. No deben haber rangos superpuestos
  // 2. Rangos deben estar ordenados por numeroUnidadesInicial
  // 3. numeroUnidadesLimite >= numeroUnidadesInicial
  // 4. Precios de volumen deben ser >= 0
  return true;
}
```

### Consistencia de Cálculos
```typescript
function validarConsistenciaEscalas(pedido: Pedido): ValidationResult {
  const frontendTotal = calculatePriceScale(pedido);
  const backendTotal = pedido.totalPedidoSinDescuento;
  
  if (Math.abs(frontendTotal - backendTotal) > 0.01) {
    return {
      isValid: false,
      error: `Inconsistencia en escalas: Frontend=${frontendTotal}, Backend=${backendTotal}`
    };
  }
  
  return { isValid: true };
}
```

## Estados de Pedido que Afectan Cálculos

```typescript
// Estados que "congelan" el pedido (no se pueden modificar productos)
const ESTADOS_CONGELADOS = [
  'ProducidoParcialmente', 
  'Cerrado', 
  'Entregado'
];

// Estados de pago válidos
enum EstadoPago {
  Pendiente = "Pendiente",
  Pospendiente = "Pospendiente", 
  PreAprobado = "PreAprobado",
  Aprobado = "Aprobado",
  Rechazado = "Rechazado",
  Precancelado = "Precancelado",
  Cancelado = "Cancelado"
}
```

## Configuración de Precisión Monetaria

```typescript
// Configuración para manejo de decimales
const PRECISION_DECIMAL = 2;
const REDONDEO = 'ROUND_HALF_UP';

function formatMonetaryValue(value: number): number {
  return Math.round(value * 100) / 100;
}
```

## Endpoints de Analytics que Deben Implementar esta Lógica

```typescript
GET /v1/analytics/dashboard-core
GET /v1/analytics/dashboard-details  
GET /v1/analytics/pedidos/flujo-estados
GET /v1/analytics/pedidos/tiempos-procesamiento
GET /v1/analytics/logistica/performance-entregas
``` 