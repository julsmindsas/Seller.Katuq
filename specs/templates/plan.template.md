# Plan NNN — <Nombre de la feature>

> Estado: **draft** | in-review | approved | superseded
> Vinculado a `spec.md` (debe estar `approved`).
> Última actualización: YYYY-MM-DD

## 1. Resumen técnico
> 3-5 líneas: cómo vamos a construirlo.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí/no | |
| II — Spec captura intent | sí/no | |
| IV — Idempotencia | sí/no | |
| V — Eventos crudos antes de procesar | sí/no | |
| VI — UI no acoplada a proveedor | sí/no | |
| VII — Observabilidad | sí/no | |
| VIII — Test-first contratos | sí/no | |
| IX — Estilo Angular | sí/no | |
| X — Seguridad webhooks | sí/no | |
| XI — Datos sensibles fuera del log | sí/no | |

Cualquier "no" requiere enmienda explícita en `CONTRACT.md`.

## 3. Arquitectura

### 3.1 Componentes involucrados
- Frontend (Angular): ...
- Backend: ...
- Almacenamiento: ...
- Cola/eventos: ...

### 3.2 Diagrama (texto / mermaid)
```
…
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Usar X | Criterio EARS §4.N | A (descartado por…), B (descartado por…) |

## 4. Modelo de datos
> Mover a `data-model.md` si es extenso.

## 5. Contratos (API/eventos)
> Schemas, endpoints, status codes, headers. Mover a `contracts/` si son extensos.

### 5.1 Idempotencia
- Clave: ...
- Ventana: ...
- Comportamiento ante duplicado: ...

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 2xx | … | … |
| 4xx | … | … |
| 5xx | … | … |

## 6. Estrategia de testing
- **Contract tests** (primero): valida schemas y status codes.
- **Integration**: con doble real o sandbox del proveedor.
- **E2E**: flujo completo.
- **Unit**: lógica interna no cubierta arriba.

## 7. Fases de implementación
1. Fase A — prerequisitos / scaffolding.
2. Fase B — contract tests + endpoint vacío.
3. Fase C — happy path.
4. Fase D — error handling + idempotencia.
5. Fase E — observabilidad + alertas.
6. Fase F — UI / dashboard si aplica.
7. Fase G — rollout (feature flag, dark launch, etc.).

## 8. Plan de rollout
- Feature flag: nombre, dueño, fecha de retiro.
- Canary / dark launch / 100%.
- Rollback plan.

## 9. Riesgos técnicos
- ...

## 10. Open questions (técnicas, no de producto)
> Si hay open questions de producto, vuelven a la spec.
