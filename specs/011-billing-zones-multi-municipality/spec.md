# Spec 011 — Alta múltiple de zonas de cobro por municipio

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-07-30 (clarifications §8 resueltas — ver D-049)

## 1. Contexto / Por qué
Hoy una zona de cobro se crea de a un municipio por vez: el operador busca UN municipio en la base DANE, lo fija en el campo "Ciudad" (solo lectura) y guarda. Configurar una tarifa de envío para muchos municipios (un departamento entero, o todo el país) obliga a repetir el formulario decenas o cientos de veces. Necesitamos crear/ajustar zonas de cobro para varios municipios en una sola acción.

## 2. Objetivo de negocio
Un operador configura zonas de cobro para muchos municipios (hasta el total nacional) en un solo guardado, reduciendo el alta de N formularios a una sola operación, sin crear duplicados y con un resumen claro de lo creado y lo omitido.

## 3. User stories
- Como **operador de logística** quiero **seleccionar varios municipios y crear una zona de cobro para cada uno con el mismo nombre, valor e impuesto en una sola acción** para **no repetir el formulario decenas de veces**.
- Como **operador** quiero **agregar de golpe todos los municipios de un departamento, o todos los del país** para **configurar tarifas planas rápido**.
- Como **operador** quiero **que no se creen zonas duplicadas y ver cuántas se crearon y cuántas se omitieron** para **confiar en el resultado del alta masiva**.
- Como **operador** quiero **ajustar después el valor o impuesto de un municipio puntual editándolo** para **casos donde una ciudad requiere una tarifa distinta**.

## 4. Criterios de aceptación (notación EARS)

**Selección de municipios**
- THE system SHALL permitir seleccionar múltiples municipios en el formulario de zona de cobro, mostrando cada municipio seleccionado como una etiqueta removible.
- WHEN el operador busca y elige un municipio, THE system SHALL agregarlo a la selección solo si no está ya presente (sin duplicar dentro de la selección).
- WHEN el operador remueve la etiqueta de un municipio, THE system SHALL quitarlo de la selección.
- WHERE hay un departamento elegido en el filtro, THE system SHALL ofrecer una acción para agregar a la selección todos los municipios de ese departamento, sin duplicar los ya presentes.
- WHERE la base oficial de municipios (DANE) está activa, THE system SHALL ofrecer una acción para agregar a la selección todos los municipios disponibles, indicando la cantidad total.

**Creación / guardado en lote**
- WHEN el operador guarda con uno o más municipios seleccionados, THE system SHALL crear una zona de cobro por cada municipio seleccionado usando el mismo nombre de zona, valor e impuesto ingresados en el formulario.
- THE system SHALL registrar en cada zona creada el municipio, su código DANE y su departamento correspondientes (los de cada municipio seleccionado, no los del filtro).
- THE system SHALL calcular el impuesto y el total de cada zona de forma idéntica a la creación individual actual (impuesto = valor × porcentaje; total = valor + impuesto).
- IF un municipio seleccionado ya tiene una zona de cobro con el mismo nombre de zona, THEN THE system SHALL omitir su creación (no sobrescribir) y contarlo como omitido.
- WHEN termina el guardado en lote, THE system SHALL informar un resumen con los conteos de zonas creadas, omitidas por ya existir y fallidas, y SHALL permitir ver el detalle de cuáles municipios se omitieron o fallaron.
- IF la creación de una o más zonas del lote falla, THEN THE system SHALL continuar con las restantes y reportar cuántas fallaron, sin abortar el lote completo por un error individual.
- WHERE el lote proviene de una acción masiva (agregar todos los municipios de un departamento, o seleccionar todos los municipios), THE system SHALL pedir confirmación mostrando la cantidad de zonas a crear antes de ejecutar. (Un alta manual de pocos municipios no requiere confirmación.)
- WHEN termina un alta o edición que crea zonas, THE system SHALL refrescar/invalidar la caché local de zonas de la sesión, de modo que las zonas recién creadas queden disponibles (p. ej. en el checkout) sin recargar la página.

**Edición**
- WHERE se edita una zona existente, THE system SHALL precargar su municipio en la selección y permitir agregar municipios adicionales.
- WHILE se edita una zona existente, THE system SHALL mantener el municipio original como no removible (para eliminar esa zona se usa la acción de borrar, no quitarlo de la selección).
- WHEN el operador guarda en modo edición, THE system SHALL actualizar la zona en edición con el nombre/valor/impuesto ingresados y crear una zona nueva para cada municipio adicional, aplicando la misma regla de omitir duplicados (mismo municipio + mismo nombre de zona).
- THE system SHALL permitir editar de forma individual el valor o impuesto de cualquier zona de cobro (una zona = un municipio), para tarifas particulares.

**Aislamiento**
- THE system SHALL crear y consultar zonas de cobro únicamente dentro de la empresa activa (multi-tenant), sin confiar en datos del cliente para determinar la empresa.

## 5. Requisitos no funcionales

### 5.1 Performance
- El alta masiva (hasta el total nacional de municipios) SHALL ejecutarse como una sola operación coordinada (no N interacciones del usuario) y no debe congelar la interfaz; debe dar retroalimentación de progreso o de finalización.

### 5.2 Seguridad
- Requiere autenticación y aislamiento por empresa. Validar entradas: valor ≥ 0; porcentaje de impuesto entre 0 y 100; nombre de zona no vacío; al menos un municipio seleccionado.

### 5.3 Observabilidad
- El resultado del lote (creadas / omitidas / fallidas) queda registrado de forma estructurada para diagnóstico, sin datos sensibles en claro.

### 5.4 Accesibilidad (UI)
- Las etiquetas de municipio y sus controles de remoción deben ser operables por teclado; el selector debe ser navegable por teclado; el estado (seleccionado/omitido) no debe comunicarse solo por color.

### 5.5 Resiliencia
- Idempotencia: reintentar un guardado no debe duplicar zonas (la regla de omitir-duplicados lo garantiza). Un fallo parcial no debe dejar la operación en un estado ambiguo: se informa qué se creó y qué no.

## 6. Out of scope (explícito)
- Cambiar el modelo de datos: una zona sigue siendo **un municipio** (el multi-select es una comodidad de alta/edición, no un cambio de esquema).
- Tarifas por peso/valor, reglas de cobertura por transportador, o importación desde archivo.
- Cambiar cómo el checkout / los pedidos / la analítica consumen las zonas de cobro.
- Renombrar la colección de zonas o migrar datos existentes.
- Control de acceso por rol para quién puede crear/editar zonas (posible spec aparte).
- Corregir el lookup case-sensitive u otros gaps detectados en el mapeo del módulo (posible spec aparte), salvo la invalidación de caché mínima que exige el criterio de que las zonas recién creadas queden disponibles.

## 7. Dependencias
- Módulo de zonas de cobro existente (CRUD actual) y la base oficial de municipios (DANE) ya integrada en el formulario.
- Ninguna spec previa bloquea; no depende de proveedores externos.

## 8. Clarifications (resueltas 2026-07-30 — D-049)
- [x] **Edición — municipio base:** NO removible. Solo se pueden agregar municipios adicionales; para eliminar la zona se usa la acción de borrar.
- [x] **Umbral de confirmación:** confirmación solo en acciones masivas (agregar todos los del departamento / seleccionar todos). Alta manual de pocos municipios sin confirmación.
- [x] **Detalle del resumen:** conteos (creadas/omitidas/fallidas) + opción de ver el detalle de cuáles.
- [x] **Disponibilidad inmediata:** SÍ, invalidar/refrescar la caché local tras el alta para que las nuevas zonas queden disponibles sin recargar.

## 9. Riesgos identificados
- **R-01:** Crear ~1122 zonas de una vez genera muchas escrituras → riesgo de lentitud, timeout o costo. Mitigación: operación por lotes del lado servidor + confirmación con conteo + feedback de progreso (se define en el plan).
- **R-02:** La caché local de zonas del navegador puede quedar desactualizada tras el alta masiva → el checkout no vería las nuevas hasta refrescar. Mitigación: invalidar/refrescar la caché tras el lote (ligado al 4º [NEEDS CLARIFICATION]).
- **R-03:** Seleccionar "todos" por error dispara un alta masiva no deseada. Mitigación: confirmación obligatoria con la cantidad.

## 10. Métricas de éxito post-launch
- El alta de zonas para una empresa nueva pasa de N formularios individuales a **1 acción** (medible en soporte/onboarding).
- **0 zonas duplicadas** (mismo municipio + mismo nombre) creadas por el flujo de lote, en el primer mes.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] Bloque `[NEEDS CLARIFICATION]` resuelto.
