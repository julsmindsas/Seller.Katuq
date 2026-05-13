# Tasks NNN — <Nombre de la feature>

> Estado: **draft** | in-review | approved | in-progress | done
> Vinculado a `plan.md` (debe estar `approved`).
> Última actualización: YYYY-MM-DD

## Convenciones
- `[P]` = tarea paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Cada tarea debe ser shippable de forma independiente o bloquear de forma explícita.

## Tareas

### T-01 — <título corto> `[P]`
- **Input:** ...
- **Output:** ...
- **Criterio de éxito:** ...
- **Archivos a tocar:** ...
- **Dependencias:** ninguna
- **Estimación (opcional):** ...

### T-02 — <título corto> (deps: T-01)
- **Input:** ...
- **Output:** ...
- **Criterio de éxito:** ...
- **Archivos a tocar:** ...
- **Dependencias:** T-01

### T-03 — ...

## Orden de ejecución sugerido
1. T-01 y T-04 en paralelo (`[P]`).
2. T-02 al terminar T-01.
3. T-03 al terminar T-02.
4. ...

## Definition of Done
- Todos los contract tests verdes.
- Verificación de constitución sin "no" pendientes.
- Observabilidad emitiendo en staging.
- `CONTRACT.md` actualizado con cualquier desvío.
- Spec marcada `superseded` solo si hay cambios; si no, `approved` se mantiene.
