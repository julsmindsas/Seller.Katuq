# Plan 024 — Fix: dirección creada no aparece de inmediato en venta asistida

> Estado: **approved**
> Vinculado a `spec.md` (approved 2026-07-16).
> Última actualización: 2026-07-16

## 1. Resumen técnico
`datosEntregas` y `datosFacturacionElectronica` son `@Input()` bindeados en un solo sentido desde `crear-ventas.component` hacia `pedido-entrega.component` / `pedido-facturacion.component`. Los métodos de EDICIÓN ya fueron arreglados (commit `4df0972`) para mutar el array **en el lugar** (`splice(0, length, ...nuevos)`) en vez de reasignarlo — así Angular no lo pisa con la referencia vieja del padre en el siguiente ciclo de detección de cambios. Los métodos de CREACIÓN (`guardarDatosEntrega`, `guardarDatosFacturacionElectronica`) nunca recibieron ese mismo fix y siguen reasignando (`this.datosEntregas = ...`). Se aplica el mismo patrón ya validado en producción.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | `spec.md` approved antes de este plan. |
| II — Spec captura intent | sí | Sin nombrar Angular/RxJS como elección — ya es la plataforma del proyecto. |
| VII — Observabilidad | N/A | Bug de estado local en frontend, no integración externa. |
| VIII — Test-first contratos | N/A | No hay contrato HTTP nuevo — el bug es 100% de sincronización de estado Angular, sin cambios de API. |
| IX — Estilo Angular | parcial | Se sigue el patrón ya existente en el mismo archivo (RxJS + `@Input`, no standalone/signals) por consistencia con el código circundante — un bug-fix puntual no es el lugar para migrar el componente completo. |
| XI — Datos sensibles fuera del log | sí | Sin logs nuevos. |

Ningún "no" — sin enmienda requerida.

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend**: `pedido-entrega.component.ts` (`guardarDatosEntrega`), `pedido-facturacion.component.ts` (`guardarDatosFacturacionElectronica`).
- **Backend**: sin cambios.
- **Almacenamiento**: sin cambios.

### 3.2 Diagrama (flujo actual vs. arreglado)
```
Actual (bug):
  crear dirección → editClient() → refetch → this.datosEntregas = nuevoArray
                                              └─> siguiente ciclo CD: padre re-empuja su
                                                  [datosEntregas]="datosEntregas" (referencia
                                                  vieja) → pisa el array nuevo

Arreglado:
  crear dirección → editClient() → refetch → this.datosEntregas.splice(0, length, ...nuevos)
                                              └─> misma referencia de array → el binding del
                                                  padre no la pisa, Angular solo actualiza contenido
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Mutar el array en el lugar (`splice`) en vez de reasignar | §4 (criterios EARS) | Cambiar el binding a two-way (`[(datosEntregas)]`) o a un `Output` — más invasivo, cambia el contrato del componente, mayor blast radius para un bug puntual que ya tiene precedente resuelto |
| Reusar exactamente el mismo patrón de la edición (mismo archivo) | Consistencia de código, Art. IX parcial | Extraer un helper compartido — se descarta por alcance: son 2 sitios, un helper agregaría indirección sin beneficio claro en un bug-fix |

## 4. Modelo de datos
Sin cambios — mismo shape de `datosEntrega`/`datosFacturacionElectronica` en el cliente.

## 5. Contratos (API/eventos)
Sin cambios — mismos endpoints (`editClient`, `getClientByDocument`), mismos payloads.

### 5.1 Idempotencia
N/A — sin cambios de backend.

### 5.2 Errores
Sin cambios — el manejo de error de `editClient`/`getClientByDocument` no se toca.

## 6. Estrategia de testing
- **Manual E2E (navegador)**: crear una dirección de envío nueva en venta asistida y confirmar que aparece de inmediato en el listado seleccionable, sin recargar cliente ni retroceder de paso. Repetir para facturación electrónica. Confirmar que edición de direcciones existentes sigue funcionando igual (no regresión del fix de `4df0972`).
- No aplica contract/integration test — no hay contrato HTTP nuevo, es sincronización de estado puramente en frontend.

## 7. Fases de implementación
1. **Fase A** — Fix en `pedido-entrega.component.ts::guardarDatosEntrega()`: reemplazar las reasignaciones de `this.datosEntregas` por mutación en el lugar.
2. **Fase B** — Fix en `pedido-facturacion.component.ts::guardarDatosFacturacionElectronica()`: mismo tratamiento.
3. **Fase C** — Verificación manual en navegador (usuario) de ambos flujos + regresión de edición.

## 8. Plan de rollout
- Sin feature flag — fix de bug puntual, mismo patrón ya en producción para edición.
- **Rollback**: revert de commit único, cambio acotado a 2 métodos en 2 archivos.

## 9. Riesgos técnicos
- R-01 (spec.md): mitigado siguiendo el patrón ya probado línea por línea, sin introducir una variante nueva.

## 10. Open questions (técnicas)
Ninguna.
