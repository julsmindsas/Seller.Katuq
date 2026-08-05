# Propuesta: Direcciones de envío/facturación "desaparecen" en venta asistida por mismatch de nombre de ciudad

## Why (con datos reales, no asunciones)

Origen: reporte directo del usuario (2026-08-04) — al crear una dirección de envío o de facturación electrónica en venta asistida, la app confirma "¡Guardado!" pero al volver al listado la dirección no aparece. El propio usuario ya intuyó la causa correcta: *"si una persona crea una dirección para una ciudad diferente a la que se seleccionó en la elección de productos, esta no aparece (y tiene lógica)"*, y pidió revisar **ciudad a ciudad** que el nombre usado al crear la dirección y el nombre usado en el paso de selección de productos hagan match exacto.

**Verificado en código esta sesión (solo lectura, sin cambios):**

- El filtrado de direcciones de envío por ciudad se hace con comparación exacta de string, sensible a tildes/mayúsculas y sin `trim`: `x.ciudad === this.selectedCity` (`crear-ventas.component.ts:4760`) y `x.ciudad == ciudadFiltro` (`pedido-entrega.component.ts:357`, `:535`). Ambos SÍ tienen fallback: si el filtro no encuentra nada, muestran todas las direcciones con un aviso — la lista nunca queda literalmente vacía por este camino, pero la dirección recién creada puede no aparecer en el filtro "para esta ciudad", lo cual el vendedor percibe como pérdida de datos.
- `selectedCity` (la ciudad elegida en el paso 1, selección de productos) viene de `empresaActual.ciudadess.ciudadesEntrega` — una lista **configurada por cada empresa** desde `crear-empresa.component.ts`.
- Esa lista de la empresa se puede poblar desde DOS orígenes distintos, según qué selector usó el administrador al configurarla:
  - `identificarCiu()` → nombres del catálogo legacy `src/Mock/pais-estado-ciudad.ts` (hardcodeado, sin fuente oficial).
  - `seleccionarMunicipioDane()` (`crear-empresa.component.ts:553-566`) → nombres oficiales DANE (`src/app/shared/data/colombia-dane-codes.ts`).
- Al crear una dirección de envío, el modal (`pedido-entrega.component.html`) renderiza **hoy exclusivamente el buscador DANE** (`seleccionarMunicipioDane()`) — el selector Mock legacy (`identificarCiu1()`/`ciudades1`) ya no se muestra en el formulario de creación, aunque el método sigue vivo para el flujo de **edición** de direcciones antiguas ya guardadas con grafía Mock, y para la herencia de ciudad inicial (`ngOnInit`). Es decir: toda dirección **nueva** queda con grafía DANE (ej. `"Bogotá D.C."`), sin ninguna relación con cuál de los dos catálogos usó la empresa para poblar su propia lista `ciudadesEntrega` — si esa lista se configuró hace tiempo con el selector Mock de `crear-empresa.component.ts` (`identificarCiu()`, ej. `"Bogota"`), el mismatch queda garantizado para cualquier dirección nueva de esa ciudad. El modal de dirección estructurada (geocodificación) no agrega una tercera fuente: solo hace eco de la ciudad ya elegida (`GeocodingService` retorna `ciudad: response.ciudad || ciudad`, el mismo string recibido).
- **Comparación exhaustiva de los dos catálogos** (script ad-hoc, sin tocar Firestore): de 933 ciudades únicas en el catálogo Mock legacy, **283 tienen el mismo municipio pero grafía distinta** a su equivalente DANE (ej. `"Bogota"` vs `"Bogotá D.C."`, `"Monteria"` vs `"Montería"`, `"Ibague"` vs `"Ibagué"`, `"Cordoba"` vs `"Córdoba"`) y **54 no matchean ni siquiera normalizando tildes/mayúsculas** (ej. `"Bogota"` sin ninguna variante DANE con ese nombre exacto, `"Since"` vs el real `"Sincé"`, `"Tolu"` vs `"Santiago de Tolú"`). En total, **36% de los municipios del catálogo legacy nunca podrían hacer match exacto** con el catálogo DANE.
- Las direcciones de facturación electrónica (`datosFacturacionElectronica`, `pedido-facturacion.component.ts`) **no tienen ningún filtro por ciudad** — su síntoma de "desaparece" no puede tener esta misma causa. El bug de persistencia silenciosa que sí las afectaba (campos `undefined` anidados rechazados por Firestore sin que el frontend lo mostrara) ya está **cerrado y commiteado** (D-127/D-128/D-129, `controllers/clients.js` commit `5dbcc02`, `pedido-entrega.component.ts`/`pedido-facturacion.component.ts` commit `e07ae252`) — este cambio NO reabre ese diagnóstico, solo lo reconfirma con una prueba de regresión.

## What Changes

- **A. Normalizar la comparación de ciudad en los 2 puntos de filtrado** (`crear-ventas.component.ts::aplicarFiltroCiudadEntrega`, `pedido-entrega.component.ts::guardarDatosEntrega`/`editarDatosEntrega`) — `trim` + minúsculas + eliminación de tildes en ambos lados de la comparación, como red de seguridad inmediata que funciona sin importar de qué catálogo vino cada string.
- **B. Unificar el origen de la ciudad al crear una dirección** — el selector de ciudad en `pedido-entrega.component.ts` (y su contraparte de facturación si aplica) debe ofrecer las mismas opciones que `empresaActual.ciudadess.ciudadesEntrega` de la empresa activa, en vez de los catálogos genéricos Mock/DANE. Esto evita de raíz crear una dirección con una grafía de ciudad que la empresa ni siquiera tiene configurada como zona de entrega.
- **C. Mensaje explícito cuando el filtro no encuentra direcciones para la ciudad seleccionada** — aclarar en el aviso ya existente que la dirección probablemente sí se guardó pero es para otra ciudad, no que se perdió, y ofrecer un acceso directo para verla sin cambiar de ciudad.
- **D. Verificación end-to-end en navegador** — confirmar si "aparece vacía" ocurre literalmente hoy (algún camino sin el fallback ya visto) o es la percepción generada por el aviso/fallback actual; y reconfirmar que D-127/128/129 sigue cerrado para facturación electrónica.

## Impact

- Specs afectadas: nueva capability `direcciones-cliente-venta-asistida` (no existía spec previa para este dominio en `openspec/specs/`).
- Frontend únicamente: `crear-ventas.component.ts`, `pedido-entrega.component.ts`, `pedido-entrega.component.html`, `pedido-facturacion.component.ts` (solo si la verificación D encuentra algo real que corregir), heredado automáticamente por `venta-asistida-unica.component.ts` (extiende `CrearVentasComponent`, no requiere cambios propios).
- Sin cambios de backend, sin cambios a `editClient` (ya arreglado), sin nuevas colecciones ni endpoints.
- Decisión reservada: **D-148** en `specs/CONTRACT.md` (siguiente número libre confirmado).

## Riesgos / no-objetivos

- **No** toca inventario, Shopify, Osmosis ni ningún flujo del 360 — dominio puramente ventas/clientes.
- **No** reabre el fix D-127/128/129 (persistencia con campos `undefined`) — se reconfirma con una prueba de regresión, no se re-diagnostica.
- **No** reemplaza los catálogos Mock/DANE en el resto de la app (ej. zonas de cobro, onboarding) — el cambio (B) solo acota el selector de ciudad **dentro del flujo de creación de direcciones de venta asistida** a la lista ya configurada por la empresa.
- Riesgo de que alguna empresa tenga `ciudadess.ciudadesEntrega` vacía o mal configurada — en ese caso el selector de ciudad de la dirección quedaría sin opciones; se decide en `design.md` si se mantiene un fallback a los catálogos genéricos cuando la lista de la empresa esté vacía, para no bloquear la creación de direcciones.
