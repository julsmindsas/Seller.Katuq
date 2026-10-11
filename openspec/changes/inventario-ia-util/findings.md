# Findings — medición en producción (tarea 0, 11-oct-2026)

Solo lectura, script con candado de escrituras. Ventana de 30 días.

## La Central vieja no veía casi nada de lo urgente (tarea 0.2)

| Empresa | Filas de inventario | Urgentes en "Qué comprar" | "Críticos" de la Central vieja | Urgentes que la Central no marcaba |
|---|---|---|---|---|
| ALMARA FELICIDAD | 2.114 | 50 | 4 | 46 |
| OH MY STORE | 14.064 | 87 | 3 | 78 |
| ALMACEN BOMBAS | 1.493 | 9 | 0 | 9 |
| CAFE ESCOBAR | 186 | 18 | 4 | 12 |

La Central agregaba todas las bodegas y exigía "se agota en ≤ 7 días" sobre ese total; "Qué comprar" mide por bodega contra los días de entrega del proveedor. Con la misma demanda en las dos, el comercio ve hoy una sola respuesta.

## Preguntas abiertas del diseño, cerradas

1. **Precio sin IVA:** `precio.precioUnitarioSinIva` está poblado en los productos urgentes de las cuatro empresas (p. ej. 5.800, 40.000, 46.134, 1.464.064).
2. **Roles de los destinatarios:** en `users` el rol vive en **`roles`** (texto: "Administrador", "VENTAS", roles a medida como "Administrador2"); `rol` no existe en el documento. Y `companies.correo` no existe en 3 de 4 empresas: el correo es `emailNotificacionesSistema` (o `emailContacto`). Corregido en `destinatarios.js`.
3. **Umbrales:** sobrestock de 180 días da 48 / 656 / 17 / 4 productos (ALMARA / OMS / BOMBAS / CAFÉ): se mantiene. Ajustes manuales (`manual_adjustment`): 2 en 90 días en OMS, 0 en las demás; el aviso de ajuste atípico casi no se dispara hoy, y no es un problema.
4. **Tiempo de `calcularInsights` medido EN EL SERVIDOR de producción:** BOMBAS 2,3 s · CAFÉ 1,0 s · ALMARA 6,3 s · OMS 10,6 s. **Objetivo: ≤ 12 s en la empresa más grande.** (Desde un Mac en Colombia OMS tarda ~45 s: no sirve como referencia.)
5. **Preselección en "Qué comprar":** la pantalla ya marca los urgentes al abrir; basta el enlace.

## Otros datos

- Productos con existencias y sin costo: 1.750 (ALMARA), 5.147 (OMS), 189 (BOMBAS), 38 (CAFÉ). El capital parado es un piso y la pantalla lo dice.
- Saldos negativos: 95 en ALMARA (la mayoría de sus 182 avisos).
- "Explicar con Opttia" en producción (ALMACEN BOMBAS): 13–14 s con Opttia. El resumen se descartaba siempre porque Opttia escribe "18 millones"; corregido. Tono: voseo corregido a "usted".
