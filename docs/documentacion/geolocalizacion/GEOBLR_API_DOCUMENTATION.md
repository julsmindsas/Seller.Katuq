# GEOBLR API
## GEO + Booster Lightning Results
### Geocodificacion Inteligente para Latinoamerica

---

<div align="center">

**GEOBLR** = **GEO** + **B**ooster **L**ightning **R**esults

*Resultados de geolocalizacion a la velocidad del rayo*

**Version VBACK-BLR-26.0128.2** | **Ultima actualizacion: Enero 2026**

[Sitio Web](https://geoblr.com) | [Documentacion](https://docs.geoblr.com) | [Soporte](mailto:soporte@geoblr.com)

</div>

---

## Tabla de Contenidos

1. [Introduccion](#1-introduccion)
2. [Beneficios](#2-beneficios)
3. [Planes y Precios](#3-planes-y-precios)
4. [Requisitos para Integracion](#4-requisitos-para-integracion)
5. [Guia de Inicio Rapido](#5-guia-de-inicio-rapido)
6. [Autenticacion](#6-autenticacion)
7. [Endpoints Disponibles](#7-endpoints-disponibles)
8. [Ejemplos de Codigo](#8-ejemplos-de-codigo)
9. [Codigos de Error](#9-codigos-de-error)
10. [Limites y Cuotas](#10-limites-y-cuotas)
11. [Mejores Practicas](#11-mejores-practicas)
12. [Soporte y Contacto](#12-soporte-y-contacto)
13. [Terminos y Condiciones](#13-terminos-y-condiciones)

---

## 1. Introduccion

### Que es GEOBLR?

**GEOBLR** (**GEO** + **B**ooster **L**ightning **R**esults) es una plataforma de geocodificacion inteligente disenada especificamente para Latinoamerica. Potenciamos tus aplicaciones con resultados de geolocalizacion ultrarrapidos, transformando direcciones en coordenadas geograficas precisas (latitud/longitud) utilizando tecnologia de Inteligencia Artificial avanzada.

| Componente | Significado |
|------------|-------------|
| **GEO** | Geographic / Geolocation |
| **B** | Booster - Potencia e impulso |
| **L** | Lightning - Velocidad extrema |
| **R** | Results - Resultados confiables |

### Por que GEOBLR?

| Caracteristica | Descripcion |
|---------------|-------------|
| **Precision Regional** | Algoritmos optimizados para direcciones latinoamericanas |
| **IA Avanzada** | Motor de geocodificacion con Google Gemini AI |
| **Alta Disponibilidad** | 99.9% de uptime garantizado |
| **Baja Latencia** | Respuestas en milisegundos |
| **Facil Integracion** | API RESTful simple y bien documentada |

### Paises Soportados

| Pais | Codigo ISO | Estado |
|------|------------|--------|
| Colombia | CO | Completo |
| Mexico | MX | Disponible |
| Peru | PE | Disponible |
| Chile | CL | Disponible |
| Argentina | AR | Disponible |
| Ecuador | EC | Disponible |

---

## 2. Beneficios

### Para Tu Negocio

- **Reduccion de Costos**: Optimiza rutas de entrega y reduce costos logisticos hasta un 30%
- **Mejor Experiencia de Usuario**: Autocompletado de direcciones y validacion en tiempo real
- **Datos Precisos**: Base de datos actualizada constantemente con direcciones verificadas
- **Escalabilidad**: Desde 1,000 hasta millones de solicitudes mensuales

### Para Desarrolladores

- **API RESTful**: Facil de integrar con cualquier lenguaje o framework
- **SDKs Oficiales**: JavaScript, Python, PHP disponibles
- **Documentacion Completa**: Ejemplos de codigo y guias paso a paso
- **Ambiente de Pruebas**: API keys de test para desarrollo sin costo
- **Webhooks**: Notificaciones en tiempo real de eventos

### Casos de Uso

| Industria | Aplicacion |
|-----------|------------|
| **E-commerce** | Validacion de direcciones de envio, calculo de costos |
| **Logistica** | Optimizacion de rutas, tracking de entregas |
| **Finanzas** | Verificacion de direcciones para KYC/AML |
| **Bienes Raices** | Geolocalizacion de propiedades |
| **Salud** | Ubicacion de pacientes y servicios de emergencia |
| **Marketing** | Segmentacion geografica de campanas |

---

## 3. Planes y Precios

### Comparativa de Planes

| Caracteristica | Free | Starter | Professional | Enterprise |
|----------------|------|---------|--------------|------------|
| **Precio Mensual** | $0 USD | $17 USD | $44 USD | $300 USD |
| **Solicitudes/Mes** | 500 | 5,000 | 100,000 | Ilimitadas |
| **Rate Limit** | 10/min | 60/min | 300/min | 1000/min |
| **API Keys** | 1 | 1 | 10 | Ilimitadas |
| **Geocodificacion Basica** | Si | Si | Si | Si |
| **Geocodificacion Avanzada** | - | Si | Si | Si |
| **API de Direcciones** | - | Si | Si | Si |
| **Soporte** | Email | Prioritario | 24/7 | Dedicado |
| **SLA** | - | 99% | 99.5% | 99.9% |

### Precio por Solicitud Adicional

| Plan | Costo por Solicitud Extra |
|------|--------------------------|
| Free | No disponible |
| Starter | $0.005 USD |
| Professional | $0.003 USD |
| Enterprise | $0.001 USD |

### Como Elegir tu Plan

```
Solicitudes Mensuales Estimadas:
- < 500            -> Free
- 500 - 5,000      -> Starter
- 5,000 - 100,000  -> Professional
- > 100,000        -> Enterprise
```

---

## 4. Requisitos para Integracion

### Requisitos Tecnicos

| Requisito | Especificacion |
|-----------|----------------|
| **URL Base** | `https://apibluerp-107bd.web.app/v1/` |
| **Protocolo** | HTTPS (obligatorio) |
| **Formato** | JSON (UTF-8) |
| **Metodos HTTP** | GET, POST |
| **Content-Type** | application/json |
| **Encoding** | UTF-8 |
| **Header API** | Tu API Key de autenticacion |
| **Header ORIGIN** | Dominio autorizado de tu aplicacion |

### Proceso de Registro

```
1. Crear cuenta en https://geoblr.com/register
2. Verificar email
3. Completar perfil de empresa
4. Elegir plan
5. Generar API Key
6. Comenzar a integrar
```

### Informacion Requerida para Registro

| Campo | Requerido | Descripcion |
|-------|-----------|-------------|
| Nombre de Empresa | Si | Razon social |
| NIT/RUC/RFC | Si | Identificacion fiscal |
| Email Corporativo | Si | Para comunicaciones |
| Telefono | No | Contacto de soporte |
| Direccion | No | Direccion fisica |
| Sitio Web | No | URL de la empresa |

### Ambiente de Desarrollo vs Produccion

| Ambiente | URL Base |
|----------|----------|
| **Produccion** | `https://apibluerp-107bd.web.app/v1/` |

---

## 5. Guia de Inicio Rapido

### Paso 1: Obtener tu API Key

Despues de registrarte, genera tu API Key desde el dashboard:

```
Dashboard -> API Keys -> Crear Nueva Key
```

Tu API Key tendra este formato:
```
geoblr_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**IMPORTANTE**: Guarda tu API Key de forma segura. Solo se muestra una vez.

### Paso 2: Tu Primera Solicitud

**Usando cURL:**
```bash
curl -X POST https://apibluerp-107bd.web.app/v1/geocoder \
  -H "Content-Type: application/json" \
  -H "API: tu_api_key_aqui" \
  -H "ORIGIN: https://tudominio.com" \
  -d '{
    "direccion": "Carrera 48 #37-24",
    "ciudad": "Medellin"
  }'
```

**Respuesta Exitosa:**
```json
{
  "direccion": "Carrera 48 #37-24, Medellin, Colombia",
  "ciudad": "medellin",
  "departamento": "Antioquia",
  "pais": "Colombia",
  "latitud": 6.2380892,
  "longitud": -75.5714460,
  "codigoPostal": "050001"
}
```

### Paso 3: Verificar Cuota

Revisa los headers de respuesta para monitorear tu uso:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-Quota-Limit: 10000
X-Quota-Remaining: 9999
```

---

## 6. Autenticacion

### Headers Requeridos

Todas las solicitudes a la API requieren los siguientes headers:

| Header | Descripcion | Ejemplo |
|--------|-------------|---------|
| **API** | Tu API Key de autenticacion | `tu_api_key_aqui` |
| **ORIGIN** | Dominio autorizado de tu aplicacion | `https://tudominio.com` |
| **Content-Type** | Tipo de contenido | `application/json` |

### Ejemplo de Solicitud

```http
POST /v1/geocoder HTTP/1.1
Host: apibluerp-107bd.web.app
API: tu_api_key_aqui
ORIGIN: https://tudominio.com
Content-Type: application/json
```

### Seguridad de API Keys

| Practica | Descripcion |
|----------|-------------|
| **No compartir** | Nunca expongas tu API Key en codigo frontend |
| **Variables de entorno** | Almacena keys en variables de entorno |
| **Rotacion periodica** | Regenera tus keys cada 90 dias |
| **ORIGIN autorizado** | Registra tus dominios autorizados en el dashboard |
| **Monitoreo** | Revisa el uso regularmente en el dashboard |

### Errores de Autenticacion

| Codigo | Error | Solucion |
|--------|-------|----------|
| 401 | API Key invalida | Verifica que el header API sea correcto |
| 401 | API Key expirada | Genera una nueva key |
| 403 | ORIGIN no autorizado | Verifica que tu dominio este registrado |
| 403 | Cuenta suspendida | Contacta a soporte |

---

## 7. Endpoints Disponibles

### 7.1 Geocodificacion Simple

Convierte una direccion en coordenadas geograficas.

**Endpoint:** `POST /v1/geocoder`

**Request:**
```json
{
  "direccion": "Carrera 48 #37-24",
  "ciudad": "Medellin"
}
```

**Response:**
```json
{
  "direccion": "Carrera 48 #37-24, Medellin, Colombia",
  "ciudad": "medellin",
  "departamento": "Antioquia",
  "pais": "Colombia",
  "latitud": 6.2380892,
  "longitud": -75.5714460,
  "codigoPostal": "050001"
}
```

**Parametros del Request:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| direccion | string | Si | Direccion completa o parcial |
| ciudad | string | Si | Ciudad |
| departamento | string | No | Estado/Departamento/Provincia (opcional) |
| pais | string | No | Pais (opcional, default: Colombia) |

**Campos de la Respuesta:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| direccion | string | Direccion formateada completa |
| ciudad | string | Ciudad normalizada |
| departamento | string | Departamento/Estado/Provincia |
| pais | string | Pais |
| latitud | number | Latitud en formato decimal |
| longitud | number | Longitud en formato decimal |
| codigoPostal | string | Codigo postal (si esta disponible) |

---

### 7.2 Geocodificacion Inversa

Convierte coordenadas en una direccion legible.

**Endpoint:** `POST /v1/reverse-geocode`

**Request:**
```json
{
  "lat": 4.6097,
  "lng": -74.0817,
  "radius": 100
}
```

**Response:**
```json
{
  "address": {
    "direccion": "Carrera 7 #32-16",
    "ciudad": "Bogota",
    "departamento": "Cundinamarca",
    "pais": "Colombia",
    "codigoPostal": "110311"
  },
  "distance": 15.4,
  "nearbyAddresses": [...]
}
```

**Parametros del Request:**

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| lat | number | Si | Latitud (-90 a 90) |
| lng | number | Si | Longitud (-180 a 180) |
| radius | number | No | Radio de busqueda en metros (default: 50) |

---

### 7.3 Geocodificacion por Lotes (Batch)

Procesa multiples direcciones en una sola solicitud.

**Endpoint:** `POST /v1/batch/geocode`

**Disponibilidad:** Plan Professional y superior

**Request:**
```json
{
  "addresses": [
    {
      "id": "order_001",
      "direccion": "Calle 80 #11-35",
      "ciudad": "Bogota",
      "pais": "Colombia"
    },
    {
      "id": "order_002",
      "direccion": "Carrera 43A #1Sur-100",
      "ciudad": "Medellin",
      "pais": "Colombia"
    }
  ],
  "saveToDb": false
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "order_001",
      "status": "success",
      "latitud": 4.6683,
      "longitud": -74.0567,
      "direccion": "Calle 80 #11-35, Bogota, Colombia",
      "ciudad": "bogota",
      "departamento": "Cundinamarca",
      "pais": "Colombia"
    },
    {
      "id": "order_002",
      "status": "success",
      "latitud": 6.2023,
      "longitud": -75.5716,
      "direccion": "Carrera 43A #1Sur-100, Medellin, Colombia",
      "ciudad": "medellin",
      "departamento": "Antioquia",
      "pais": "Colombia"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "successRate": 100
  }
}
```

**Limites:**

| Plan | Direcciones por Lote |
|------|---------------------|
| Professional | 100 |
| Enterprise | 1,000 |

---

### 7.4 Gestion de Direcciones

**Listar Direcciones Guardadas:**
```
GET /v1/addresses?page=1&limit=20&ciudad=bogota
```

**Crear Direccion:**
```
POST /v1/addresses
```

**Actualizar Direccion:**
```
PUT /v1/addresses/{id}
```

**Eliminar Direccion:**
```
DELETE /v1/addresses/{id}
```

---

## 8. Ejemplos de Codigo

### JavaScript / Node.js

```javascript
const axios = require('axios');

const GEOBLR_API_KEY = process.env.GEOBLR_API_KEY;
const GEOBLR_ORIGIN = process.env.GEOBLR_ORIGIN; // Tu dominio autorizado
const BASE_URL = 'https://apibluerp-107bd.web.app/v1';

async function geocode(direccion, ciudad, pais = 'Colombia') {
  try {
    const response = await axios.post(`${BASE_URL}/geocode`, {
      direccion,
      ciudad,
      pais
    }, {
      headers: {
        'API': GEOBLR_API_KEY,
        'ORIGIN': GEOBLR_ORIGIN,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
geocode('Carrera 48 #37-24', 'Medellin')
  .then(result => console.log(result))
  .catch(err => console.error(err));
```

### Python

```python
import requests
import os

GEOBLR_API_KEY = os.environ.get('GEOBLR_API_KEY')
GEOBLR_ORIGIN = os.environ.get('GEOBLR_ORIGIN')  # Tu dominio autorizado
BASE_URL = 'https://apibluerp-107bd.web.app/v1'

def geocode(direccion, ciudad, pais='Colombia'):
    headers = {
        'API': GEOBLR_API_KEY,
        'ORIGIN': GEOBLR_ORIGIN,
        'Content-Type': 'application/json'
    }

    payload = {
        'direccion': direccion,
        'ciudad': ciudad,
        'pais': pais
    }

    response = requests.post(
        f'{BASE_URL}/geocode',
        json=payload,
        headers=headers
    )

    response.raise_for_status()
    return response.json()

# Uso
if __name__ == '__main__':
    result = geocode('Carrera 48 #37-24', 'Medellin')
    print(result)
```

### PHP

```php
<?php

$apiKey = getenv('GEOBLR_API_KEY');
$origin = getenv('GEOBLR_ORIGIN'); // Tu dominio autorizado
$baseUrl = 'https://apibluerp-107bd.web.app/v1';

function geocode($direccion, $ciudad, $pais = 'Colombia') {
    global $apiKey, $origin, $baseUrl;

    $data = [
        'direccion' => $direccion,
        'ciudad' => $ciudad,
        'pais' => $pais
    ];

    $options = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/json',
                'API: ' . $apiKey,
                'ORIGIN: ' . $origin
            ],
            'content' => json_encode($data)
        ]
    ];

    $context = stream_context_create($options);
    $result = file_get_contents($baseUrl . '/geocode', false, $context);

    return json_decode($result, true);
}

// Uso
$result = geocode('Carrera 48 #37-24', 'Medellin');
print_r($result);
```

### C# / .NET

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class GeoblrClient
{
    private readonly HttpClient _client;
    private const string BaseUrl = "https://apibluerp-107bd.web.app/v1";

    public GeoblrClient(string apiKey, string origin)
    {
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Add("API", apiKey);
        _client.DefaultRequestHeaders.Add("ORIGIN", origin);
    }

    public async Task<GeocodeResponse> GeocodeAsync(
        string direccion,
        string ciudad,
        string pais = "Colombia")
    {
        var request = new
        {
            direccion,
            ciudad,
            pais
        };

        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _client.PostAsync($"{BaseUrl}/geocode", content);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<GeocodeResponse>(responseJson);
    }
}
```

---

## 9. Codigos de Error

### Errores de Geocodificacion

| Codigo | Nombre | Descripcion | Solucion |
|--------|--------|-------------|----------|
| GEO_001 | ADDRESS_NOT_FOUND | Direccion no encontrada | Verificar direccion completa |
| GEO_002 | CITY_NOT_RECOGNIZED | Ciudad no reconocida | Verificar nombre de ciudad |
| GEO_003 | COUNTRY_NOT_SUPPORTED | Pais no soportado | Usar pais disponible |
| GEO_004 | COORDINATES_OUT_OF_RANGE | Coordenadas fuera de rango | Verificar lat/lng |

### Errores de Autenticacion

| Codigo | Nombre | Descripcion | Solucion |
|--------|--------|-------------|----------|
| AUTH_001 | INVALID_API_KEY | API Key invalida | Verificar API Key |
| AUTH_002 | API_KEY_EXPIRED | API Key expirada | Regenerar API Key |
| AUTH_003 | QUOTA_EXCEEDED | Cuota mensual excedida | Actualizar plan |

### Errores de Rate Limit

| Codigo | Nombre | Descripcion | Solucion |
|--------|--------|-------------|----------|
| RATE_001 | RATE_LIMIT_EXCEEDED | Limite de velocidad excedido | Esperar segun Retry-After |

### Codigos HTTP

| Codigo | Significado |
|--------|-------------|
| 200 | Exito |
| 400 | Solicitud invalida |
| 401 | No autorizado |
| 403 | Prohibido |
| 404 | No encontrado |
| 429 | Demasiadas solicitudes |
| 500 | Error del servidor |

---

## 10. Limites y Cuotas

### Rate Limits por Plan

| Plan | Solicitudes/Minuto | Solicitudes/Mes |
|------|-------------------|-----------------|
| Free | 10 | 500 |
| Starter | 60 | 5,000 |
| Professional | 300 | 100,000 |
| Enterprise | 1,000 | Ilimitado |

### Headers de Respuesta

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642531200
X-RateLimit-Reset-After: 30
X-Quota-Limit: 10000
X-Quota-Remaining: 9500
X-Quota-Used: 500
```

### Manejo de Rate Limit

Cuando recibes un error 429, implementa backoff exponencial:

```javascript
async function geocodeWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await geocode(data);
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 30;
        console.log(`Rate limited. Retrying in ${retryAfter}s...`);
        await sleep(retryAfter * 1000 * Math.pow(2, i));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 11. Mejores Practicas

### Seguridad

- Nunca incluyas API Keys en codigo del lado del cliente
- Usa HTTPS para todas las solicitudes
- Implementa IP Whitelist si esta disponible en tu plan
- Rota tus API Keys periodicamente
- Monitorea el uso en el dashboard regularmente

### Rendimiento

- Usa geocodificacion por lotes cuando proceses multiples direcciones
- Implementa cache local para direcciones frecuentes
- Usa compresion gzip en las solicitudes
- Implementa timeout razonable (recomendado: 30 segundos)

### Manejo de Errores

- Implementa reintentos con backoff exponencial
- Registra todos los errores para depuracion
- Muestra mensajes amigables al usuario final
- Implementa fallbacks cuando sea posible

### Integracion

```javascript
// Ejemplo de cliente robusto
class GeoblrClient {
  constructor(apiKey, origin, options = {}) {
    this.apiKey = apiKey;
    this.origin = origin;
    this.baseUrl = options.baseUrl || 'https://apibluerp-107bd.web.app/v1';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 3600000; // 1 hora
  }

  getHeaders() {
    return {
      'API': this.apiKey,
      'ORIGIN': this.origin,
      'Content-Type': 'application/json'
    };
  }

  async geocode(address) {
    // Verificar cache
    const cacheKey = JSON.stringify(address);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Hacer solicitud con reintentos
    const result = await this.requestWithRetry('/geocode', address);

    // Guardar en cache
    this.cache.set(cacheKey, result);
    setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

    return result;
  }
}
```

---

## 12. Soporte y Contacto

### Canales de Soporte

| Canal | Disponibilidad | Planes |
|-------|---------------|--------|
| **Email** | 24-48h respuesta | Todos |
| **Chat** | Horario laboral | Starter+ |
| **Telefono** | 24/7 | Professional+ |
| **Slack/Teams** | Dedicado | Enterprise |

### Contacto

| Tipo | Contacto |
|------|----------|
| **Soporte Tecnico** | soporte@geoblr.com |
| **Ventas** | ventas@geoblr.com |
| **Facturacion** | facturacion@geoblr.com |
| **Telefono** | +57 (1) 234-5678 |

### Recursos

- **Documentacion**: https://docs.geoblr.com
- **Estado del Servicio**: https://status.geoblr.com
- **Changelog**: https://docs.geoblr.com/changelog
- **Blog**: https://blog.geoblr.com

### Reportar Problemas

1. Verifica el estado del servicio en https://status.geoblr.com
2. Revisa la documentacion y FAQ
3. Contacta a soporte con:
   - Tu Company ID
   - Request ID (si aplica)
   - Fecha y hora del problema
   - Mensaje de error completo
   - Pasos para reproducir

---

## 13. Terminos y Condiciones

### Uso Aceptable

- La API debe usarse solo para propositos legitimos de negocio
- No se permite el scraping masivo o abuso del servicio
- Se requiere atribucion a GEOBLR en aplicaciones publicas
- Los datos obtenidos no pueden ser revendidos

### Privacidad de Datos

- GEOBLR no almacena direcciones de forma permanente sin consentimiento
- Los datos de uso se mantienen de forma anonima para metricas
- Cumplimos con regulaciones de proteccion de datos (GDPR, CCPA)

### SLA (Service Level Agreement)

| Plan | Uptime Garantizado | Creditos por Downtime |
|------|-------------------|----------------------|
| Free | Sin garantia | - |
| Starter | 99% | - |
| Professional | 99.5% | 10% credito/1% downtime |
| Enterprise | 99.9% | 25% credito/0.1% downtime |

### Facturacion

- Facturacion mensual al inicio del periodo
- Cargos por exceso al final del periodo
- Pago via tarjeta de credito o transferencia bancaria
- Facturas disponibles en el dashboard

### Cancelacion

- Puedes cancelar en cualquier momento desde el dashboard
- El servicio continua hasta el final del periodo pagado
- No hay reembolsos por periodos parciales
- Los datos se retienen 30 dias despues de cancelacion

---

<div align="center">

## Comienza Hoy

Registrate gratis y obtiene 1,000 solicitudes mensuales sin costo.

[**Crear Cuenta Gratis**](https://geoblr.com/register)

---

**GEOBLR** - Geocodificacion Inteligente para Latinoamerica

Version VBACK-BLR-26.0128.2 | (c) 2026 GEOBLR. Todos los derechos reservados.

[Terminos de Servicio](https://geoblr.com/terms) | [Politica de Privacidad](https://geoblr.com/privacy) | [Contacto](mailto:info@geoblr.com)

</div>
