# Spec 011 — Zonas de cobro como paquete (una zona = varios municipios)

> Estado: draft | in-review | **approved (v2)** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-08-05 (revisión v2 — modelo paquete; aprobada en checkpoint; ver D-051)
>
> **⚠️ Esta es la revisión v2.** La v1 (una zona = un municipio, alta en lote que crea N documentos)
> se implementó y se validó parcialmente (T-01..T-07), pero el testing la rechazó: crear una zona
> "seleccionar todos" generaba ~1078 filas (una por municipio), imposible de mantener. La v2 cambia el
> **modelo de datos**: una zona de cobro es **un paquete** con la lista de municipios adentro.
> El multi-select de municipios (chips) construido en v1 se **reutiliza**; cambia dónde se guarda.

## 1. Contexto / Por qué
En v1, cada municipio de una zona quedaba como un **documento independiente** con el mismo nombre/valor
repetido. Configurar una tarifa para un departamento o el país entero generaba decenas o cientos de filas
idénticas salvo la ciudad (el testing reportó ~1078 registros para una sola zona). Consecuencias:
- **Mantenimiento inviable:** cambiar el valor de una zona obliga a editar N documentos.
- **Lista ilegible:** la pantalla principal muestra N filas por zona en vez de una.
- **Dato redundante:** el precio, que es **uno por zona**, se repite en cada municipio.

El modelo correcto del dominio es: *una zona de cobro nombrada, con un valor, que **cubre un conjunto de
municipios***. Es decir, un paquete.

## 2. Objetivo de negocio
Un operador crea/edita una **zona de cobro como un solo registro** que agrupa muchos municipios, con un valor
único editable en un solo lugar. En la venta, el vendedor elige la zona por su nombre y el sistema resuelve la
tarifa de envío; los municipios son un detalle interno de la zona, no filas sueltas.

## 3. User stories
- Como **operador de logística** quiero **crear una zona de cobro y elegir varios municipios que quedan
  guardados dentro de esa misma zona (un solo registro)** para **no generar cientos de filas repetidas**.
- Como **operador** quiero **agregar de golpe todos los municipios de un departamento, o todos los del país**
  a una zona **para configurar coberturas amplias rápido**.
- Como **operador** quiero **cambiar el valor de una zona en un solo lugar y que aplique a todos sus
  municipios** para **mantenerla sin editar cientos de registros**.
- Como **operador** quiero **agregar o quitar municipios de una zona ya creada** para **ajustar su cobertura**.
- Como **operador** quiero **que un mismo municipio pueda pertenecer a más de una zona** para **casos como una
  promoción de envío que cubre solo algunos municipios de otra zona**.
- Como **vendedor** quiero **elegir la zona de cobro por su nombre en la venta** y que **el sistema aplique su
  tarifa de envío**, sin ver el listado completo de municipios.

## 4. Criterios de aceptación (notación EARS)

**Modelo de zona (paquete)**
- THE system SHALL representar una zona de cobro como **un único registro** por empresa, identificado por su
  **nombre de zona**, que contiene un **valor**, un **porcentaje de impuesto** y una **lista de municipios**
  (cada uno con su ciudad, código DANE y departamento).
- THE system SHALL calcular impuesto y total de la zona una sola vez (impuesto = valor × porcentaje;
  total = valor + impuesto), aplicables a toda la zona.
- THE system SHALL impedir crear dos zonas con el **mismo nombre** dentro de la misma empresa (el nombre es la
  identidad de la zona); IF el operador intenta crear una zona con un nombre ya existente, THEN THE system SHALL
  rechazarlo indicando que ya existe.

**Selección de municipios (alta y edición)**
- THE system SHALL permitir seleccionar múltiples municipios, mostrando cada uno como una etiqueta removible.
- WHEN el operador elige un municipio, THE system SHALL agregarlo a la zona solo si no está ya en **esa** zona
  (sin duplicar el mismo municipio dentro de la misma zona).
- WHERE hay un departamento elegido, THE system SHALL ofrecer agregar todos los municipios de ese departamento,
  sin duplicar los ya presentes en la zona.
- WHERE la base oficial (DANE) está activa, THE system SHALL ofrecer agregar todos los municipios disponibles,
  indicando la cantidad total.
- WHERE una acción agrega muchos municipios de golpe (todo un departamento / todos los del país), THE system
  SHALL pedir confirmación mostrando la cantidad antes de aplicarla.

**Creación / guardado (un solo registro)**
- WHEN el operador guarda una zona nueva con uno o más municipios, THE system SHALL crear **una sola** zona de
  cobro con esos municipios adentro, usando el nombre, valor e impuesto ingresados.
- THE system SHALL registrar en la zona el municipio, código DANE y departamento de **cada** municipio
  seleccionado (no los del filtro).
- THE system SHALL crear y consultar zonas únicamente dentro de la empresa activa (multi-tenant), sin confiar
  en datos del cliente para determinar la empresa.

**Edición**
- WHERE se edita una zona existente, THE system SHALL precargar su nombre, valor, impuesto y **todos** sus
  municipios, y permitir modificar cualquiera de ellos.
- WHEN el operador cambia el valor o el impuesto de la zona y guarda, THE system SHALL aplicarlo a **toda** la
  zona en una sola operación (un registro actualizado), sin necesidad de editar municipio por municipio.
- WHEN el operador agrega o quita municipios de una zona y guarda, THE system SHALL actualizar la lista de
  municipios de esa zona en consecuencia.
- THE system SHALL permitir que un mismo municipio esté presente en **varias zonas distintas** (con nombres
  distintos); crear o editar una zona NO SHALL impedirlo por el hecho de que el municipio ya esté en otra zona.

**Consumo en la venta (checkout / POS)**
- WHEN el vendedor selecciona una zona de cobro por su nombre en la venta, THE system SHALL resolver la tarifa
  de envío a partir del **valor de esa zona** (y su impuesto), no de un documento por-municipio.
- THE system SHALL mantener disponible la zona recién creada/editada para la venta sin requerir recargar la
  página (invalidar/refrescar la caché local de zonas).

**Migración de datos existentes**
- WHERE ya existen zonas creadas con el modelo anterior (un documento por municipio), THE system SHALL
  consolidarlas en zonas-paquete agrupando por nombre de zona, preservando el conjunto de municipios y el valor,
  sin pérdida de cobertura. (La estrategia y el manejo de conflictos de valor se definen en el plan; se ejecuta
  con verificación en seco previa.)

## 5. Requisitos no funcionales

### 5.1 Performance
- Crear/editar una zona con hasta el total nacional de municipios SHALL ser **una sola escritura** (un
  documento con la lista embebida) y no debe congelar la interfaz.

### 5.2 Seguridad
- Requiere autenticación y aislamiento por empresa. Validar entradas: valor ≥ 0; porcentaje entre 0 y 100;
  nombre de zona no vacío y único por empresa; al menos un municipio.

### 5.3 Observabilidad
- El resultado de crear/editar/migrar queda registrado de forma estructurada para diagnóstico, sin datos
  sensibles en claro.

### 5.4 Accesibilidad (UI)
- Las etiquetas de municipio y sus controles de remoción son operables por teclado; el selector es navegable
  por teclado; el estado no se comunica solo por color. En la lista, el detalle de municipios de una zona es
  expandible/accesible por teclado.

### 5.5 Resiliencia
- Idempotencia: reintentar un guardado no debe duplicar la zona ni sus municipios. La migración debe poder
  reejecutarse sin duplicar (agrupa por nombre; verificación en seco previa).

## 6. Out of scope (explícito)
- Tarifas por peso/valor, reglas de cobertura por transportador, o importación desde archivo.
- **Selección automática de zona por la ciudad del cliente** en el checkout: por ahora el vendedor elige la
  zona por nombre (confirmado). Deducir la zona a partir de la ciudad queda para una spec futura.
- Precio distinto **por municipio dentro de la misma zona**: una zona tiene un valor único; para cobrar
  distinto a un municipio se lo pone en **otra** zona (solapamiento permitido).
- Renombrar la colección `zonacobro`.
- Control de acceso por rol para quién puede crear/editar zonas (posible spec aparte).
- Otros gaps del módulo (lookup case-sensitive, etc.) salvo lo que exige este cambio (match por nombre de zona
  en el consumo + invalidación de caché).

## 7. Dependencias
- Módulo de zonas de cobro existente (CRUD + multi-select de municipios de v1) y la base DANE ya integrada.
- Consumidores del valor de envío: `pedidos.util.service` (checkout) y `pos-pedidos.util.service` (POS), que
  hoy emparejan por `(ciudad, nombreZonaCobro)` y deben pasar a resolver por nombre de zona.
- Datos existentes en `zonacobro` (modelo v1 por-municipio) a migrar.

## 8. Clarifications (resueltas 2026-08-05 — D-051)
- [x] **Valor por zona:** único para toda la zona, editable en un solo lugar; aplica a todos sus municipios.
- [x] **Solapamiento:** un municipio PUEDE estar en varias zonas (con nombres distintos). No se limita.
- [x] **Selección en la venta:** el vendedor elige la zona por nombre (por ahora; no auto-deducción por ciudad).

## 9. Riesgos identificados
- **R-01 (migración):** consolidar los ~1078 (testing) + 257 (OH MY STORE) documentos por-municipio en
  paquetes. Si existieran documentos con el **mismo nombre pero distinto valor**, hay conflicto a resolver.
  Mitigación: script con **verificación en seco** obligatoria (Art. constitución) que reporte conflictos antes
  de aplicar; regla de consolidación definida en el plan.
- **R-02 (consumo de envío):** cambiar el emparejamiento de `(ciudad + nombre)` a **nombre de zona** en
  checkout y POS puede afectar el cálculo de flete de pedidos en curso. Mitigación: cubrir ambos consumidores,
  pruebas de contrato del lookup, y validar en navegador antes de cerrar.
- **R-03 (reversión de decisión aprobada):** v2 revierte D-048/D-050 ya implementados. Mitigación: registrar la
  reversión (D-051), conservar la rama, y migrar en vez de borrar.

## 10. Métricas de éxito post-launch
- Una zona de cobro que cubre un departamento/país es **1 registro** en la lista (no N filas).
- Cambiar el valor de una zona es **1 edición** (antes: N).
- **0 zonas con nombre duplicado** por empresa; **0 municipios duplicados** dentro de una zona.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] Clarifications resueltas.
- [ ] **Checkpoint humano (pendiente):** aprobar esta revisión v2 antes de redactar `plan.md`.
