# Diseño: match de ciudad entre creación de direcciones y selección de productos en venta asistida

## Context

Tres piezas de estado, cada una con su propio origen de string de ciudad, deben coincidir carácter a carácter hoy para que una dirección aparezca en el listado filtrado:

1. **`empresaActual.ciudadess.ciudadesEntrega`** — lista de `{value, label}` configurada por la empresa en `crear-empresa.component.ts`. Se puede poblar desde el selector Mock legacy (`identificarCiu()`) o desde el buscador DANE (`seleccionarMunicipioDane()`, línea 553-566) — lo que haya usado el administrador la última vez que tocó esa lista. Es la fuente de `selectedCity` en el paso 1 (selección de productos) de `crear-ventas.component.ts` / `venta-asistida-unica.component.ts`.
2. **`ciudad_municipio_entrega`** en `pedido-entrega.component.ts` — hoy se fija EXCLUSIVAMENTE vía el buscador DANE (`seleccionarMunicipioDane()`) cuando se crea una dirección nueva; el selector Mock (`identificarCiu1()`/`ciudades1`) solo se ejercita al editar una dirección vieja o al heredar la ciudad inicial del formulario padre.
3. El filtro (`crear-ventas.component.ts:4760`, `pedido-entrega.component.ts:357/535`) compara (1) contra (2) con `===`/`==` estricto — sin `trim`, sin normalizar mayúsculas ni tildes.

No hay ninguna garantía hoy de que (1) y (2) usen la misma grafía para el mismo municipio, y la comparación no tolera ninguna diferencia. Confirmado con datos reales (comparación completa de los 933 municipios del catálogo Mock contra los 1099 del catálogo DANE, sin tocar Firestore): 283 coinciden en municipio pero no en grafía exacta, 54 no coinciden ni normalizando.

## Goals / Non-Goals

**Goals:**
- Que una dirección nueva para una ciudad que la empresa YA tiene configurada en `ciudadesEntrega` siempre haga match en el filtro, sin depender de qué catálogo se usó para poblar cada lado.
- Que si de todos modos hay un mismatch (empresa con configuración legacy sin migrar, o ciudad fuera de las configuradas), el vendedor entienda claramente que es un tema de ciudad distinta y no de pérdida de datos.
- Mantener la creación de direcciones desbloqueada incluso si la empresa no tiene `ciudadesEntrega` configurada.

**Non-Goals:**
- No se migra el catálogo Mock legacy a DANE en todo el resto de la app (onboarding, zonas de cobro, otros formularios) — fuera de alcance, cambio mucho más amplio que el bug reportado.
- No se reescribe retroactivamente la grafía de direcciones ya guardadas en Firestore — ninguna migración de datos en este cambio.
- No se reabre el fix D-127/128/129 (persistencia con `undefined` anidado) — se reconfirma con una prueba de regresión, no se toca `controllers/clients.js` ni el manejo de errores ya arreglado.
- No se toca `datosFacturacionElectronica` más allá de, si aplica, unificar su propio selector de ciudad por consistencia — no tiene filtro por ciudad, así que no es fuente del síntoma reportado.

## Decisions

### 1. Normalizar la comparación de ciudad (red de seguridad, aplica siempre)

Nuevo helper compartido `normalizarCiudad(s: string): string` — `trim()` + `toLowerCase()` + `normalize('NFD').replace(/[̀-ͯ]/g, '')` (fold de tildes) + strip del sufijo `" d.c."` (con o sin puntos, case-insensitive, solo al final del string). Se aplica en los 3 puntos de comparación exacta hoy existentes:
- `crear-ventas.component.ts::aplicarFiltroCiudadEntrega()` (línea 4760)
- `pedido-entrega.component.ts::guardarDatosEntrega()` (línea 357) y `editarDatosEntrega()` (línea 535)

**Por qué el strip de "D.C." y no una tabla de alias genérica ni matching por código DANE:** se escaneó el catálogo DANE completo (1099 municipios) buscando cualquier sufijo o calificador pegado al nombre (paréntesis, "D.C.", etc.) — **`"Bogotá D.C."` es el único caso en todo el catálogo**, no un patrón que se repita en decenas de ciudades. Un strip puntual de ese sufijo cubre el caso real conocido (incluye direcciones viejas ya guardadas con la grafía Mock `"Bogota"`, sin tocar datos) con el mismo bajo riesgo que el resto de la normalización. Un matching por código DANE sería más robusto en teoría, pero exigiría guardar el código (no solo el nombre) en cada selección de ciudad — nueva y ya configurada por cada empresa — y de todos modos no cubriría las direcciones ya existentes en Firestore que nunca guardaron código; se descarta para este cambio por ampliar el alcance sin resolver el caso legacy. Si en el futuro aparece un caso real de dos municipios distintos que solo se distinguen por un calificador de este tipo (hoy no existe ninguno), se evalúa entonces si vale la pena escalar a comparación por código.

Se eligió normalizar en el punto de comparación (no interceptar/reescribir el dato guardado) porque es el cambio de menor riesgo: no toca lo que se persiste en Firestore, solo cómo se comparan dos strings ya existentes. Cubre de inmediato cualquier mismatch de tildes/mayúsculas/espacios sin importar cuál de los dos catálogos originó cada lado — incluye los casos de datos legacy ya guardados con grafía Mock.

**Límite conocido:** la normalización no resuelve mismatches donde el nombre en sí es distinto, no solo la grafía (ej. `"Tolu"` vs el real `"Santiago de Tolú"`, `"Bogota"` vs `"Bogotá D.C."` con sufijo). Esos casos requieren la Decisión 2.

### 2. El selector de ciudad al crear una dirección prioriza `ciudadesEntrega` de la empresa

En `pedido-entrega.component.ts`, nuevo `@Input() ciudadesEntregaEmpresa: {value: string, label: string}[] = []`, pasado desde `crear-ventas.component.ts` (`[ciudadesEntregaEmpresa]="empresaActual?.ciudadess?.ciudadesEntrega"` en el binding de `<pedido-entrega>`, `crear-ventas.component.html:813`).

En el modal de creación (`pedido-entrega.component.html`, sección "Buscador DANE de municipios"):
- **Si `ciudadesEntregaEmpresa.length > 0`**: se muestra primero un selector con esas opciones ("Ciudades configuradas en tu empresa"), preseleccionando la ciudad si coincide (normalizada) con la del pedido. Elegir una de ahí garantiza match exacto contra `selectedCity` porque es literalmente el mismo string.
- El buscador DANE **se mantiene visible** debajo, rotulado como alternativa para una ciudad que la empresa aún no tiene configurada — con una nota visible: *"Esta ciudad no está en tu lista de ciudades de entrega; la dirección se guardará pero no aparecerá en el listado filtrado hasta que selecciones esa ciudad en el paso 1."* Así nunca se bloquea la creación de una dirección legítima fuera de las ciudades configuradas.
- Si `ciudadesEntregaEmpresa` está vacía (empresa sin configurar), el comportamiento es idéntico al actual (solo DANE), sin ningún selector nuevo.

Se descartó eliminar el buscador DANE por completo porque hay vendedores que legítimamente despachan a ciudades no precargadas por la empresa (evento puntual, cliente que recoge en otra ciudad, etc.) — bloquear la creación ahí sería una regresión peor que el bug actual.

No se toca `pedido-facturacion.component.ts` en esta decisión: no tiene filtro por ciudad, así que no hay bug que corregir ahí; se deja fuera para no ampliar el diff sin necesidad (ver Riesgos/no-objetivos de `proposal.md`).

### 3. Mensaje del aviso de "sin direcciones para esta ciudad"

Texto actual (`pedido-entrega.component.html:56-58`): *"No hay direcciones registradas para la ciudad seleccionada. Se muestran todas las direcciones disponibles. Seleccione una o cree una nueva."*

Nuevo texto, mismo componente de alerta: *"No hay direcciones de **{{ selectedCity }}** entre las de este cliente — se muestran todas sus direcciones registradas (pueden ser de otras ciudades). Si la dirección que buscas no aparece, probablemente sí se guardó pero para otra ciudad: revisa el listado completo abajo o créala de nuevo seleccionando **{{ selectedCity }}** en el formulario."* Mismo patrón en `crear-ventas.component.ts::aplicarFiltroCiudadEntrega()` (el toast de `toastrService.info`, línea 4772-4780).

Objetivo: que el vendedor entienda en el momento que la dirección probablemente SÍ se guardó, evitando el reporte de "se perdió" cuando en realidad es un filtro por ciudad distinta.

### 4. Verificación end-to-end antes de cerrar

Antes de considerar cerrado el bug reportado, reproducir en navegador real (no solo lectura de código):
1. Crear una dirección de envío para la MISMA ciudad que está seleccionada en el paso 1 → debe aparecer sin necesidad del fallback.
2. Crear una dirección de envío para OTRA ciudad → debe verse el aviso mejorado (Decisión 3), NO una lista vacía sin explicación.
3. Crear una dirección de facturación electrónica nueva → recargar el cliente → confirmar que sigue apareciendo (regresión de D-127/128/129, ya cerrado).

Si el paso 2 revela que hoy SÍ hay un camino real a lista vacía (no solo el fallback ya visto en `crear-ventas.component.ts`/`pedido-entrega.component.ts`), se documenta como hallazgo nuevo y se decide el fix en el momento (posible candidato: el `ngAfterViewInit` de `pedido-entrega.component.ts:142-159` no tiene manejador de `error` en su `getClientByDocument`, a diferencia de los métodos de guardar/editar).

## Risks / Trade-offs

- Cambiar el selector de ciudad en el modal de creación es el único cambio de UI visible al vendedor — mitigado manteniendo el buscador DANE como alternativa siempre disponible (Decisión 2), sin quitar ninguna capacidad existente.
- La normalización (Decisión 1) es puramente aditiva y de bajo riesgo: nunca puede volver más estricta una comparación que hoy ya pasa.
- Si la verificación (Decisión 4, paso 2) encuentra un camino nuevo a lista vacía, el alcance de este cambio crece — se registra como hallazgo y se decide en el momento si entra en este mismo cambio o se abre uno nuevo, siguiendo el mismo criterio que D-128 usó con D-127.

## Migration Plan

1. Helper `normalizarCiudad()` + aplicarlo en los 3 puntos de comparación (Decisión 1). Sin dependencias de UI, se puede verificar con `npx tsc --noEmit` solo.
2. `@Input() ciudadesEntregaEmpresa` en `pedido-entrega.component.ts` + binding desde `crear-ventas.component.html` + selector nuevo en `pedido-entrega.component.html` con el buscador DANE como alternativa (Decisión 2).
3. Texto del aviso en `pedido-entrega.component.html` y del toast en `crear-ventas.component.ts` (Decisión 3).
4. Verificación end-to-end en navegador (Decisión 4) — los 3 escenarios, incluida la reconfirmación de D-127/128/129.
