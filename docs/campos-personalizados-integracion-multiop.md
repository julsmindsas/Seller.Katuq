# Campos Personalizados — Guia de Integracion con MultiOp v2

## Resumen

Katuq tiene un sistema generico de **Campos Personalizados** (Modulos Variables) que permite a cada empresa configurar campos adicionales en la venta asistida. MultiOp v2 (sistema de optica) debe usar esta infraestructura para enviar los datos de prescripcion optica a Katuq en vez de manejarlos en un sistema separado.

---

## Arquitectura

```
MultiOp v2 (Angular 21)          Katuq Backend              Katuq Frontend
    |                                |                           |
    |  1. Configura campos           |                           |
    |  POST /v1/custom-fields/config |                           |
    |------------------------------->|                           |
    |                                |  2. Venta asistida        |
    |                                |  campos se renderizan     |
    |                                |  dinamicamente            |
    |                                |-------------------------->|
    |                                |                           |
    |                                |  3. Pedido creado con     |
    |                                |  camposPersonalizados     |
    |                                |<--------------------------|
    |                                |                           |
    |  4. Consulta pedidos           |                           |
    |  GET /v1/orders/{id}           |                           |
    |------------------------------->|                           |
    |  camposPersonalizados en       |                           |
    |  carrito[].configuracion       |                           |
```

---

## API de Campos Personalizados

### Base URL
```
https://back.katuq.com/v1/custom-fields
```

### Headers requeridos
```
Authorization: Bearer {token}
company: {nombreEmpresa}
Content-Type: application/json
```

### Endpoints

#### Listar grupos activos
```
GET /config/active
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "veqcEaEHEUbRXvSnTtfz",
      "nombre": "Prescripcion Optica",
      "descripcion": "Formula optica del paciente",
      "contexto": "carrito",
      "activo": true,
      "orden": 1,
      "campos": [
        {
          "id": "od_esfera",
          "etiqueta": "OD Esfera",
          "tipo": "number",
          "requerido": false,
          "grupo": "Ojo Derecho",
          "orden": 1,
          "validacion": { "min": -40, "max": 40, "step": 0.25 }
        }
      ]
    }
  ]
}
```

#### Crear grupo
```
POST /config
```
Body:
```json
{
  "nombre": "Prescripcion Optica",
  "descripcion": "Datos de formula optica del paciente",
  "contexto": "carrito",
  "activo": true,
  "orden": 1,
  "campos": [
    {
      "etiqueta": "OD Esfera",
      "tipo": "number",
      "requerido": false,
      "grupo": "Ojo Derecho",
      "orden": 1,
      "validacion": { "min": -40, "max": 40, "step": 0.25 }
    },
    {
      "etiqueta": "OD Cilindro",
      "tipo": "number",
      "requerido": false,
      "grupo": "Ojo Derecho",
      "orden": 2,
      "validacion": { "min": -20, "max": 0, "step": 0.25 }
    },
    {
      "etiqueta": "OD Eje",
      "tipo": "number",
      "requerido": false,
      "grupo": "Ojo Derecho",
      "orden": 3,
      "validacion": { "min": 0, "max": 180, "step": 1 }
    }
  ]
}
```

#### Actualizar grupo
```
PUT /config/{groupId}
```

#### Eliminar grupo
```
DELETE /config/{groupId}
```

---

## Tipos de campo soportados

| Tipo | HTML | Validaciones |
|------|------|-------------|
| `text` | `<input type="text">` | `maxLength` |
| `number` | `<input type="number">` | `min`, `max`, `step` |
| `select` | `<select>` | `opciones: [{valor, etiqueta}]` |
| `checkbox` | `<input type="checkbox">` | — |
| `date` | `<input type="date">` | — |
| `textarea` | `<textarea>` | `maxLength` |

---

## Estructura de datos en el pedido

Cuando el vendedor llena los campos y crea el pedido, los datos quedan en:

```
pedido.carrito[N].configuracion.camposPersonalizados
```

Estructura:
```json
{
  "camposPersonalizados": {
    "{grupoId}": {
      "{campoId}": "valor",
      "{campoId}": 123.45,
      "_etiquetas": {
        "{campoId}": "OD Esfera",
        "{campoId}": "OD Cilindro"
      },
      "_grupoNombre": "Prescripcion Optica"
    }
  }
}
```

Los campos que empiezan con `_` son metadata para renderizado (etiquetas legibles, nombre del grupo). Los demas son los valores reales.

---

## Mapeo MultiOp → Katuq Campos Personalizados

### Campos de MultiOp a migrar

Estos son los campos que MultiOp captura actualmente y que deben configurarse como campos personalizados en Katuq:

#### Grupo: Ojo Derecho
| Campo MultiOp | Etiqueta Katuq | Tipo | Validacion |
|---------------|---------------|------|-----------|
| `odEsfera` | OD Esfera | number | min:-40, max:40, step:0.25 |
| `odCilindro` | OD Cilindro | number | min:-20, max:0, step:0.25 |
| `odEje` | OD Eje | number | min:0, max:180, step:1 |
| `odAdicion` | OD Adicion | number | min:0.50, max:5, step:0.25 |
| `odDistanciaPupilar` | OD Dist. Pupilar | number | min:22, max:40 |
| `odAlturaPupilar` | OD Altura Pupilar | number | min:8, max:40 |

#### Grupo: Ojo Izquierdo
| Campo MultiOp | Etiqueta Katuq | Tipo | Validacion |
|---------------|---------------|------|-----------|
| `oiEsfera` | OI Esfera | number | min:-40, max:40, step:0.25 |
| `oiCilindro` | OI Cilindro | number | min:-20, max:0, step:0.25 |
| `oiEje` | OI Eje | number | min:0, max:180, step:1 |
| `oiAdicion` | OI Adicion | number | min:0.50, max:5, step:0.25 |
| `oiDistanciaPupilar` | OI Dist. Pupilar | number | min:22, max:40 |
| `oiAlturaPupilar` | OI Altura Pupilar | number | min:8, max:40 |

#### Grupo: Especificaciones del Lente
| Campo MultiOp | Etiqueta Katuq | Tipo | Opciones |
|---------------|---------------|------|---------|
| `categoria` | Categoria | select | Monofocal, Ocupacional, Bifocal, Progresivo |
| `materialLente` | Material | text | — |
| `tratamiento` | Tratamiento | text | — |
| `tipoDeLente` | Tipo de Lente | text | — |

#### Grupo: Montura
| Campo MultiOp | Etiqueta Katuq | Tipo | Validacion |
|---------------|---------------|------|-----------|
| `marca` | Marca | text | — |
| `referenciaMontura` | Referencia | text | — |
| `color` | Color | text | — |
| `horizontal` | Horizontal (mm) | number | min:25, max:60 |
| `vertical` | Vertical (mm) | number | min:20, max:60 |
| `diagonal` | Diagonal (mm) | number | min:30, max:70 |
| `nasal` | Nasal (mm) | number | min:10, max:30 |

#### Grupo: Parametros de Montaje
| Campo MultiOp | Etiqueta Katuq | Tipo | Validacion |
|---------------|---------------|------|-----------|
| `anguloPantoscopico` | Angulo Pantoscopico | number | min:0, max:20 |
| `anguloPanoramico` | Angulo Panoramico | number | min:0, max:20 |
| `distanciaVertice` | Distancia Vertice | number | min:0, max:20 |
| `bisel` | Bisel | select | Si, No |
| `antiReflejo` | Antireflejo | select | Si, No |

---

## Como configurar los campos desde MultiOp v2

MultiOp v2 puede crear la configuracion de campos automaticamente al onboarding de una optica:

```javascript
// Script de setup para una optica nueva
const campos = [
  // Ojo Derecho
  { etiqueta: 'OD Esfera', tipo: 'number', grupo: 'Ojo Derecho', orden: 1, validacion: { min: -40, max: 40, step: 0.25 } },
  { etiqueta: 'OD Cilindro', tipo: 'number', grupo: 'Ojo Derecho', orden: 2, validacion: { min: -20, max: 0, step: 0.25 } },
  { etiqueta: 'OD Eje', tipo: 'number', grupo: 'Ojo Derecho', orden: 3, validacion: { min: 0, max: 180, step: 1 } },
  { etiqueta: 'OD Adicion', tipo: 'number', grupo: 'Ojo Derecho', orden: 4, validacion: { min: 0.5, max: 5, step: 0.25 } },
  { etiqueta: 'OD Dist. Pupilar', tipo: 'number', grupo: 'Ojo Derecho', orden: 5, validacion: { min: 22, max: 40 } },
  { etiqueta: 'OD Altura Pupilar', tipo: 'number', grupo: 'Ojo Derecho', orden: 6, validacion: { min: 8, max: 40 } },
  // Ojo Izquierdo
  { etiqueta: 'OI Esfera', tipo: 'number', grupo: 'Ojo Izquierdo', orden: 7, validacion: { min: -40, max: 40, step: 0.25 } },
  { etiqueta: 'OI Cilindro', tipo: 'number', grupo: 'Ojo Izquierdo', orden: 8, validacion: { min: -20, max: 0, step: 0.25 } },
  { etiqueta: 'OI Eje', tipo: 'number', grupo: 'Ojo Izquierdo', orden: 9, validacion: { min: 0, max: 180, step: 1 } },
  { etiqueta: 'OI Adicion', tipo: 'number', grupo: 'Ojo Izquierdo', orden: 10, validacion: { min: 0.5, max: 5, step: 0.25 } },
  { etiqueta: 'OI Dist. Pupilar', tipo: 'number', grupo: 'Ojo Izquierdo', orden: 11, validacion: { min: 22, max: 40 } },
  { etiqueta: 'OI Altura Pupilar', tipo: 'number', grupo: 'Ojo Izquierdo', orden: 12, validacion: { min: 8, max: 40 } },
  // Montura
  { etiqueta: 'Marca', tipo: 'text', grupo: 'Montura', orden: 13 },
  { etiqueta: 'Referencia', tipo: 'text', grupo: 'Montura', orden: 14 },
  { etiqueta: 'Color', tipo: 'text', grupo: 'Montura', orden: 15 },
  { etiqueta: 'Horizontal (mm)', tipo: 'number', grupo: 'Montura', orden: 16, validacion: { min: 25, max: 60 } },
  { etiqueta: 'Vertical (mm)', tipo: 'number', grupo: 'Montura', orden: 17, validacion: { min: 20, max: 60 } },
];

await fetch('https://back.katuq.com/v1/custom-fields/config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'company': companyName
  },
  body: JSON.stringify({
    nombre: 'Prescripcion Optica',
    descripcion: 'Formula optica completa del paciente',
    contexto: 'carrito',
    activo: true,
    orden: 1,
    campos: campos
  })
});
```

---

## Donde aparecen los datos

| Lugar | Que se muestra |
|-------|---------------|
| **Venta Asistida** (agregar al carrito) | Panel accordion con inputs editables por sub-grupo |
| **PDF de Katuq** (Imprimir PDF) | Seccion "Prescripcion Optica" con tabla etiqueta:valor |
| **Factura World Office** | Campo `concepto` del renglon: "Prescripcion Optica - OD Esfera: -2.50, OD Cilindro: -0.75..." |
| **Firestore** | `pedido.carrito[N].configuracion.camposPersonalizados` |

---

## Firestore

### Configuracion de campos
```
empresas/{companyId}/custom_fields_config/{groupId}
```

### Datos en el pedido
```
orders/{orderId}.carrito[N].configuracion.camposPersonalizados.{groupId}.{fieldId}
```

---

## Consideraciones para MultiOp v2

1. **No hardcodear campos en Katuq** — MultiOp configura los campos via API, Katuq los renderiza dinamicamente
2. **Un grupo por tipo de formulario** — "Prescripcion Optica" es un grupo, "Montura" puede ser otro
3. **Sub-grupos para organizar visualmente** — "Ojo Derecho", "Ojo Izquierdo" son sub-grupos dentro de un grupo
4. **Validaciones por campo** — min/max/step para numeros, opciones para selects
5. **Los campos se guardan POR ITEM del carrito** — cada producto puede tener su propia prescripcion
6. **Las etiquetas se guardan con los valores** — no necesita re-consultar la config para mostrarlos
