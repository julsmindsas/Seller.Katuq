# Componente de Mapa de Ubicaciones

Este componente proporciona una visualización interactiva de las ubicaciones de pedidos en tiempo real para el módulo de despachos.

## Características

- 🗺️ **Mapa interactivo** con Leaflet
- 📍 **Marcadores personalizados** por estado de pedido
- 🔄 **Actualización en tiempo real** (simulada)
- 📱 **Diseño responsive**
- 🎨 **Interfaz intuitiva** con leyendas y controles
- 📊 **Estadísticas rápidas** de entregas
- 🚫 **Fallback** a lista cuando el mapa no está disponible

## Estados de Pedidos Soportados

| Estado | Color | Icono | Descripción |
|--------|-------|-------|-------------|
| `Despachado` | Verde | 🚚 | Pedidos en ruta hacia el cliente |
| `ParaDespachar` | Naranja | 📦 | Pedidos listos para envío |
| `Empacado` | Azul | 📋 | Pedidos empacados y preparados |
| `ProducidoTotalmente` | Morado | ✅ | Pedidos completamente producidos |

## Instalación de Dependencias (Opcional)

Para usar mapas offline o funcionalidades avanzadas, puedes instalar Leaflet localmente:

```bash
npm install leaflet @types/leaflet
```

Si prefieres usar Google Maps:

```bash
npm install @googlemaps/js-api-loader
```

## Uso Básico

```html
<app-mapa-ubicaciones 
  [configuracion]="datosMapa"
  [altura]="'400px'"
  [mostrarControles]="true"
  [tiempoReal]="true">
</app-mapa-ubicaciones>
```

## Propiedades de Entrada

### `configuracion: ConfiguracionMapa`
```typescript
interface ConfiguracionMapa {
  centroMapa: { lat: number; lng: number };
  zoom: number;
  ubicaciones: UbicacionPedido[];
}
```

### `altura: string`
- **Valor por defecto:** `'400px'`
- **Descripción:** Altura del contenedor del mapa

### `mostrarControles: boolean`
- **Valor por defecto:** `true`
- **Descripción:** Muestra/oculta controles de zoom y leyenda

### `tiempoReal: boolean`
- **Valor por defecto:** `false`
- **Descripción:** Activa la simulación de movimiento en tiempo real

## Estructura de Datos

### `UbicacionPedido`
```typescript
interface UbicacionPedido {
  nroPedido: string;           // Número único del pedido
  estado: string;              // Estado actual del pedido
  cliente: string;             // Nombre del cliente
  direccion: string;           // Dirección de entrega
  latitud?: number;            // Coordenada de latitud
  longitud?: number;           // Coordenada de longitud
  transportador?: string;      // Nombre del transportador
  fechaEntrega: string;        // Fecha programada de entrega
  horaEstimada?: string;       // Hora estimada de entrega
  distanciaRestante?: number;  // Distancia en km
  tiempoEstimado?: number;     // Tiempo estimado en minutos
}
```

## Métodos Públicos

### `actualizarConfiguracion(nuevaConfiguracion: ConfiguracionMapa)`
Actualiza la configuración del mapa con nuevos datos.

### `centrarEnUbicacion(nroPedido: string)`
Centra el mapa en un pedido específico y abre su popup.

### `obtenerEstadisticas()`
Retorna estadísticas calculadas del mapa:
```typescript
{
  totalUbicaciones: number;
  enRuta: number;
  paraDespacho: number;
  empacados: number;
  tiempoPromedioEstimado: number;
}
```

## Personalización

### Colores e Iconos
Modifica la variable `iconosEstado` en el componente:

```typescript
iconosEstado = {
  'MiEstadoCustom': {
    color: '#ff5722',
    icon: '🔥',
    animation: true
  }
};
```

### Estilos CSS
Los estilos están en `mapa-ubicaciones.component.scss` y son completamente personalizables.

## Funcionalidades Avanzadas

### Simulación de Tiempo Real
Cuando `tiempoReal` está activado, el componente simula el movimiento de pedidos despachados cada 30 segundos.

### Clustering
Para grandes cantidades de marcadores, considera implementar clustering:

```typescript
// Ejemplo con Leaflet MarkerCluster
import 'leaflet.markercluster';
```

### Rutas Optimizadas
Integración futura con servicios de routing:

```typescript
// Ejemplo para calcular rutas
private calcularRuta(origen: LatLng, destino: LatLng) {
  // Implementar con Leaflet Routing Machine
  // o Google Directions API
}
```

## Troubleshooting

### El mapa no se muestra
1. Verifica la conexión a internet (se requiere para tiles de OpenStreetMap)
2. Revisa la consola del navegador por errores de CORS
3. Asegúrate de que las coordenadas sean válidas

### Marcadores no aparecen
1. Verifica que `latitud` y `longitud` estén definidos en los datos
2. Comprueba que las coordenadas estén en el formato correcto (decimal)
3. Revisa que el zoom permita ver los marcadores

### Performance con muchos marcadores
1. Implementa clustering para +100 marcadores
2. Considera paginación o filtrado por área visible
3. Usa `ChangeDetectionStrategy.OnPush` en el componente

## Ejemplos de Uso

### Configuración Básica
```typescript
const datosMapa: ConfiguracionMapa = {
  centroMapa: { lat: 4.6097, lng: -74.0817 }, // Bogotá
  zoom: 11,
  ubicaciones: [
    {
      nroPedido: 'P-001',
      estado: 'Despachado',
      cliente: 'Juan Pérez',
      direccion: 'Calle 123 #45-67',
      latitud: 4.6234,
      longitud: -74.0654,
      transportador: 'María González',
      fechaEntrega: '2023-12-15',
      tiempoEstimado: 25
    }
  ]
};
```

### Actualización Dinámica
```typescript
// En el componente padre
actualizarUbicaciones() {
  this.datosMapa.ubicaciones = this.obtenerPedidosActualizados();
  // El componente se actualiza automáticamente
}
```

## Roadmap

- [ ] Integración con Google Maps
- [ ] Clustering automático
- [ ] Rutas optimizadas
- [ ] Notificaciones push de entrega
- [ ] Exportar mapa como imagen
- [ ] Filtros avanzados por estado/transportador
- [ ] Integración con GPS real de transportadores

## Contribución

Para agregar nuevas funcionalidades:

1. Mantén la compatibilidad con la interfaz existente
2. Agrega tests unitarios para nuevas funciones
3. Actualiza esta documentación
4. Considera el impacto en performance

## Soporte

Para problemas o mejoras, revisa:
- La documentación de [Leaflet](https://leafletjs.com/reference.html)
- [Ejemplos en CodePen](https://codepen.io/collection/DgRgVp)
- Issues del proyecto