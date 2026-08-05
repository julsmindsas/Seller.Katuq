# Tasks

## 1. Normalización de la comparación de ciudad (red de seguridad)
- [x] 1.1 Nuevo helper `normalizarCiudad(s: string): string` (trim + lowercase + fold de tildes + strip del sufijo `" d.c."` al final, con o sin puntos) — creado en `src/app/shared/utils/ciudad.util.ts`
- [x] 1.2 Aplicado en `crear-ventas.component.ts::aplicarFiltroCiudadEntrega()` y, adicionalmente (hallazgo durante implementación, ver nota abajo), en `aplicarCambioCiudad()`
- [x] 1.3 Aplicado en `pedido-entrega.component.ts::guardarDatosEntrega()` y `editarDatosEntrega()`
- [x] 1.4 `npx tsc --noEmit` limpio tras los cambios (exit 0, sin errores)

**Hallazgo durante implementación:** `crear-ventas.component.ts::aplicarCambioCiudad()` (línea ~2446, se dispara al cambiar de ciudad en el paso 1 vía el dropdown de `ciudadesEntrega`) tenía el mismo filtro exacto SIN NINGÚN fallback — a diferencia de `aplicarFiltroCiudadEntrega()`, si el filtro no encontraba nada dejaba `datosEntregas = []` literalmente vacío, sin aviso. Es la ruta más probable al síntoma reportado de "aparece vacía". Se corrigió con el mismo patrón de fallback-a-todas ya usado en su método hermano.

## 2. Unificar selector de ciudad al crear dirección con `ciudadesEntrega` de la empresa
- [x] 2.1 Releído `pedido-entrega.component.ts` y `crear-ventas.component.ts` antes de tocar
- [x] 2.2 Nuevo `@Input() ciudadesEntregaEmpresa: {value: string, label: string}[] = []` en `pedido-entrega.component.ts`
- [x] 2.3 Binding `[ciudadesEntregaEmpresa]="empresaActual?.ciudadess?.ciudadesEntrega"` agregado en **ambos** consumidores de `<pedido-entrega>`: `crear-ventas.component.html` (wizard legacy) y `venta-asistida-unica.component.html` (pantalla plana activa en la rama `feature/venta-asistida-mejorada` — no estaba en el `tasks.md` original, se agregó porque es la pantalla que realmente se usa hoy, hereda de `CrearVentasComponent` pero tiene su propio template)
- [x] 2.4 `pedido-entrega.component.html`: selector nuevo (chips) con las opciones de `ciudadesEntregaEmpresa`, visible solo dentro del modal de **creación** (`#crearEntrega`, no en el de edición) y solo cuando la lista no está vacía, antes del buscador DANE. Nuevo método `seleccionarCiudadEmpresa()` en el componente
- [x] 2.5 Nota visible junto al buscador DANE cuando la empresa sí tiene ciudades configuradas, aclarando que una ciudad fuera de esa lista no aparecerá en el filtro hasta seleccionarla en el paso 1
- [x] 2.6 Verificado por diseño: los bloques nuevos están detrás de `*ngIf="ciudadesEntregaEmpresa?.length > 0"`, y el `@Input()` default es `[]` — sin la ciudad configurada, el comportamiento es idéntico al actual
- [x] 2.7 `npx tsc --noEmit` limpio; `ng serve` (ya corriendo) recompiló "Compiled successfully" tras cada cambio

## 3. Mensaje de aviso cuando el filtro no encuentra direcciones para la ciudad
- [x] 3.1 Nuevo texto en `pedido-entrega.component.html` (alerta `datosEntregaNoEncontradosParaCiudadSeleccionada`) — interpola la ciudad real (`pedidoGral?.envio?.ciudad || ciudad`), aclara que probablemente sí se guardó
- [x] 3.2 Nuevo texto en `crear-ventas.component.ts::aplicarFiltroCiudadEntrega()` (toast `toastrService.info`), mismo mensaje aclaratorio
- [x] 3.3 `ng serve` recompiló sin errores tras el cambio de texto

## 4. Verificación end-to-end en navegador (bloqueante para cerrar)
- [ ] 4.1 Crear dirección de envío para la misma ciudad del paso 1 → aparece sin fallback — **pendiente, requiere sesión autenticada en la app** (no se puede completar sin que el usuario inicie sesión; Claude no puede introducir credenciales por política — ver mensaje al usuario)
- [ ] 4.2 Crear dirección de envío para otra ciudad → aviso claro (no lista vacía sin explicación), la dirección SÍ quedó guardada — **pendiente, mismo bloqueo**
- [ ] 4.3 Crear dirección de facturación electrónica nueva → recargar cliente → sigue apareciendo (regresión D-127/128/129) — **pendiente, mismo bloqueo**
- [ ] 4.4 Si 4.2 revela un camino real a lista vacía no cubierto por el fallback actual, documentar como adenda de D-148 — el hallazgo de la tarea 1 (`aplicarCambioCiudad` sin fallback) ya cubre el candidato más probable; confirmar en el paso 4.1/4.2 que no queda ninguno más

## 5. Cierre
- [x] 5.1 Registrado como **D-148** en `specs/CONTRACT.md` (propuesta) — pendiente actualizar con el resultado real de 4.1-4.4 una vez verificado en navegador
- [ ] 5.2 Confirmar con el usuario en navegador antes de marcar el cambio como done
