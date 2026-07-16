# Spec 024 — Fix: dirección creada no aparece de inmediato en venta asistida

> Estado: **approved**
> Autor(es): Claude + usuario
> Última actualización: 2026-07-16

## 1. Contexto / Por qué
En venta asistida, al crear una dirección de envío o de facturación electrónica durante los pasos de Entrega/Facturación, la dirección nueva muchas veces **no aparece de inmediato** en el listado seleccionable. El usuario debe devolverse al paso 1 (cliente), recargar el cliente, y avanzar de nuevo hasta el paso de direcciones para que aparezca — esto rompe el flujo de venta y genera confusión sobre si la dirección realmente se guardó.

## 2. Objetivo de negocio
Un vendedor que crea una dirección nueva durante el checkout la ve y puede seleccionarla en el mismo paso, sin retroceder ni recargar nada.

## 3. User stories
- Como **vendedor**, quiero que la dirección de envío que acabo de crear aparezca inmediatamente en el listado seleccionable, para poder continuar el pedido sin interrupciones.
- Como **vendedor**, quiero lo mismo para direcciones de facturación electrónica.

## 4. Criterios de aceptación (notación EARS)

- WHEN el vendedor crea una dirección de envío nueva y el guardado en backend es exitoso, THE system SHALL mostrar esa dirección en el listado seleccionable del paso de Entrega sin recargar el cliente ni retroceder de paso.
- WHEN el vendedor crea una dirección de facturación electrónica nueva y el guardado en backend es exitoso, THE system SHALL mostrar esa dirección en el listado seleccionable del paso de Facturación sin recargar el cliente ni retroceder de paso.
- THE system SHALL mantener el comportamiento ya correcto de edición de direcciones existentes (no debe regresar ese fix, commit `4df0972`).
- IF el guardado en backend falla THEN THE system SHALL mantener el comportamiento de error actual (sin cambios) y no debe mostrar la dirección en el listado.

## 5. Requisitos no funcionales

### 5.1 Performance
- N/A — cambio es de sincronización de estado en memoria, sin llamadas adicionales a red.

### 5.2 Seguridad
- N/A — no cambia autenticación ni datos expuestos.

### 5.3 Observabilidad
- N/A — no es una integración externa ni un webhook; no requiere logging estructurado nuevo.

### 5.4 Accesibilidad
- Sin cambios de UI visual — mismo template, mismo `*ngFor`.

### 5.5 Resiliencia
- N/A.

## 6. Out of scope (explícito)
- Limpieza de la copia muerta de esta lógica en `crear-ventas.component.ts` (líneas 2118/2185, atada a un `<ng-template>` huérfano nunca abierto) — se deja anotada pero no se toca en esta spec para no ampliar el blast radius de un bug-fix.
- Migración a signals/standalone (Artículo IX) — este es un bug-fix puntual, no un rediseño del componente.
- Cualquier cambio al backend (`editClient`, endpoints de direcciones) — el bug es 100% frontend (sincronización de estado Angular).

## 7. Dependencias
- Ninguna spec activa. Referencia informativa: commit `4df0972` (fix análogo para edición de direcciones).

## 8. [NEEDS CLARIFICATION]
Ninguna — causa raíz confirmada por investigación de código + precedente ya validado en producción para el caso de edición.

## 9. Riesgos identificados
- R-01: si el `splice()` se aplica sobre la referencia incorrecta (ej. una copia en vez del array real bindeado), el fix no tendría efecto — mitigado verificando en el navegador tras el cambio.

## 10. Métricas de éxito post-launch
- Cero reportes nuevos de "la dirección no aparece" en las próximas sesiones de venta asistida.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec (Angular ya es la plataforma del proyecto, no una elección de esta spec).
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubiertos (N/A justificado — no aplica a este bug-fix de estado local).
- [x] Out of scope explícito.
- [x] Bloque `[NEEDS CLARIFICATION]` resuelto.
