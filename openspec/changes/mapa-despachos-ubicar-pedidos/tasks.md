## 1. Ubicar con barrio y zona, sin aproximados (despachos.component.ts)

- [x] 1.1 Avisar a las sesiones activas que se toman `despachos.component.{ts,html}` y `mapa-ubicaciones.component.*`
- [x] 1.2 `geocodificarPedido`: pasar `{ barrio, zonaCobro, direccionEntrega: true }` desde `pedido.envio`
- [x] 1.3 Quitar el respaldo a `obtenerCoordenadasAproximadas` y eliminar el método; traducir el error a motivo de negocio ("Falta la dirección" / "No encontramos esta dirección en el mapa")
- [x] 1.4 Saltar pedidos con punto protegido (`puntoEsProtegido`, D-417) y cachear también los fallos de la sesión en `geocodingCache`
- [x] 1.5 Llevar `ubicacionAvance { total, hechos, ubicados, sinUbicar[], terminado }` y refrescar el mapa tras cada lote (no solo con despachados)
- [x] 1.6 Quitar la barra `bg-info` del encabezado (`despachos.component.html`) y las llamadas a `mostrarAnimacionGeocodificacion`, `mostrarEfectoBusqueda` y `actualizarProgresoGeocodificacion`
- [x] 1.7 Build de producción sin errores

## 2. Tarjeta de avance y lista "Sin ubicar" (mapa-ubicaciones)

- [x] 2.1 `@Input() ubicacionAvance`; eliminar el velo, pulsos, puntos flotantes, la barra inferior y los tres métodos imperativos
- [x] 2.2 Tarjeta flotante "Ubicando pedidos en el mapa · N de M" con barra; resumen "X ubicados · Y sin ubicar" que se oculta a los ~4 s
- [x] 2.3 Sección "Sin ubicar" en el panel lateral (debajo de Mensajeros; en móvil, bajo el mapa) con número, cliente, dirección y motivo; oculta si no hay
- [x] 2.4 Estilos con tokens del design-system, sin gradientes ni primarios prohibidos, clases sin "p-"; contar gradientes/prohibidos del módulo (no deben subir)
- [x] 2.5 Build de producción sin errores

## 3. Verificación y registro

- [x] 3.1 Probar en localhost:4200: avance, resumen, lista "Sin ubicar", mapa usable durante la carga a 1440 px (390 px pendiente: Chrome no redimensiona)
- [x] 3.2 Confirmar en la pestaña de red que ninguna llamada escribe en `orders`
- [x] 3.3 Registrar D-XXX en `specs/CONTRACT.md` y commitear solo los archivos del cambio
