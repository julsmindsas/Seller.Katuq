# Spec 014 — Imagen visual del método de pago (consistente en todos los canales)

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-08-06 (aprobada; reutiliza `logo`, límites por defecto → D-064)
> Rama: `feature/pagos-metodos-unificados` (misma del lote pagos). Ver D-063.
>
> Tarea 3 de 6 del lote "módulo pagos".

## 1. Contexto / Por qué
Hoy la representación visual del método de pago es **inconsistente entre canales** y no se puede administrar:
- **Checkout e-commerce:** muestra un **ícono de fuente** elegido por palabras clave del nombre
  (`getPaymentMethodIcon`). No hay imagen real; métodos distintos con nombres parecidos comparten ícono.
- **POS:** intenta cargar una imagen `assets/images/payment/{slug}.svg` derivada del nombre, con fallback a un
  placeholder. Depende de que exista un archivo con ese slug en el bundle → no escala ni se mantiene.
- **Modelo:** las formas de pago ya tienen un campo de imagen (`logo`) pero **no se administra** desde ninguna
  pantalla ni se muestra de forma consistente.

El operador no puede asociar una imagen a un método, y la que se ve depende del canal y de assets estáticos.

## 2. Objetivo de negocio
Cada método de pago tiene **una imagen** que el operador **sube** desde la pantalla de métodos de pago, y esa
imagen se muestra **igual en todos los canales de venta** (e-commerce y POS). Cuando un método no tiene imagen,
el sistema muestra un respaldo neutro sin romper la interfaz. Solución **profesional** (imagen real por método),
**escalable** (no depende de archivos en el bundle) y **fácil de mantener** (una sola imagen por método,
administrada en un solo lugar).

## 3. User stories
- Como **administrador** quiero **subir una imagen para cada método de pago** desde la pantalla de métodos de
  pago, para **que el método se reconozca visualmente**.
- Como **administrador** quiero **cambiar o quitar** la imagen de un método, para **mantenerla al día**.
- Como **vendedor / cliente** quiero **ver la imagen del método de pago en el checkout y en el POS**, para
  **identificarlo de un vistazo**.
- Como **administrador** quiero **que la imagen sea la misma en todos los canales** (una sola), para **no
  gestionar imágenes duplicadas**.

## 4. Criterios de aceptación (notación EARS)

**Administración de la imagen**
- THE system SHALL permitir **subir una imagen** para un método de pago desde la pantalla de métodos de pago,
  y **persistirla** asociada al método (una sola imagen por método, compartida por todos los canales).
- WHEN el operador sube una imagen para un método, THE system SHALL guardarla y asociar su referencia al
  método, reemplazando la imagen anterior si existía.
- WHERE un método ya tiene imagen, THE system SHALL permitir **reemplazarla o quitarla**.
- THE system SHALL validar que el archivo sea una **imagen** (formatos comunes: png/jpg/webp/svg) y de un
  **tamaño razonable** (límite definido en el plan); IF el archivo no cumple, THEN THE system SHALL rechazarlo
  con un aviso claro, sin guardar.
- THE system SHALL mostrar una **miniatura** de la imagen del método en la lista/administración de métodos.

**Visualización en los canales**
- WHEN el checkout de **e-commerce** muestra un método de pago, THE system SHALL mostrar **su imagen** si la
  tiene.
- WHEN el **POS** muestra un método de pago, THE system SHALL mostrar **la misma imagen** del método.
- WHERE un método **no** tiene imagen, THE system SHALL mostrar un **respaldo neutro** (placeholder/ícono
  genérico) sin romper el diseño ni dejar imágenes rotas.
- THE system SHALL reflejar una imagen recién subida/cambiada en los canales **sin requerir recargar** la
  página completa (invalidar la caché de formas de pago del canal, como en specs previas del lote).

**Consistencia y multi-tenant**
- THE system SHALL asociar y servir la imagen dentro de la **empresa activa** (multi-tenant), sin filtrarse
  entre empresas.
- THE system SHALL mostrar **la misma** imagen del método en e-commerce y POS (no una por canal).

## 5. Requisitos no funcionales

### 5.1 Performance
- Las imágenes se sirven por **URL** (no incrustadas en el bundle ni en el documento). El checkout/POS cargan
  la miniatura de forma diferida y con respaldo si falla, sin bloquear la lista de métodos.

### 5.2 Seguridad
- Subida autenticada y aislada por empresa. Validar tipo y tamaño del archivo. No exponer rutas de otras
  empresas. Sin secretos en logs.

### 5.3 Observabilidad
- El resultado de subir/cambiar/quitar imagen queda registrado de forma estructurada, sin datos sensibles.

### 5.4 Accesibilidad (UI)
- Las imágenes llevan **texto alternativo** (el nombre del método). El respaldo neutro también es accesible;
  el estado no depende solo de la imagen.

### 5.5 Resiliencia
- Una imagen inexistente o que falla al cargar **no rompe** la pantalla: cae al respaldo neutro
  (`onImgError`-style). Reintentar subir la misma imagen no duplica ni corrompe el método.

## 6. Out of scope (explícito)
- **Imagen distinta por canal** (e-commerce vs POS): una sola imagen por método (confirmado).
- **Biblioteca de logos pre-cargados** / auto-asignación por nombre: no se construye ahora (posible follow-up).
- **Edición de la imagen** (recorte, redimensionado, filtros) dentro de la app.
- Renderizar el logo en **correos/PDF** de pago: follow-up (esta tarea cubre checkout y POS).
- Cambiar la lógica de selección/registro del método (specs 012/013).

## 7. Dependencias
- Pantalla única de métodos de pago (spec 012) para administrar la imagen.
- Consumidores de visualización: `checkout` (e-commerce) y `card-payment` (POS); hoy usan
  `getPaymentMethodIcon` (font icon) y `getPaymentIconPath` (slug/asset) respectivamente.
- Almacenamiento de archivos ya disponible en el proyecto (usado en asentar-pago-manual para comprobantes).
- Endpoints de formas de pago `/v1/pagos/*` (el doc ya admite un campo de imagen).

## 8. [NEEDS CLARIFICATION]
> Resueltas con el negocio antes de este borrador:
- [x] **Origen de la imagen:** **subir archivo** (a almacenamiento), guardando su URL en el método.
- [x] **Por canal:** **una sola imagen** para todos los canales.
- [x] **Campo de almacenamiento:** **reutilizar el campo existente `logo`** (D-064), no se añade campo nuevo.
- [x] **Límite de tamaño/formatos:** por defecto (D-064): **≤ 2 MB**, formatos **png/jpg/jpeg/webp/svg**.

## 9. Riesgos identificados
- **R-01 (assets vs URL en POS):** el POS hoy arma la ruta por slug; al pasar a la URL del método hay que
  conservar el fallback para métodos sin imagen. Mitigación: usar `imagen del método → si no, respaldo neutro`.
- **R-02 (caché stale):** una imagen nueva podría no verse hasta refrescar. Mitigación: invalidar la caché de
  formas de pago del canal al guardar (patrón del lote).
- **R-03 (multi-tenant en Storage):** las imágenes deben quedar aisladas por empresa. Mitigación: ruta de
  almacenamiento con la empresa; no confiar en datos del cliente.
- **R-04 (imágenes huérfanas):** reemplazar/quitar una imagen puede dejar archivos sin usar en Storage.
  Mitigación: aceptable por ahora (no bloquea); limpieza fuera de alcance.

## 10. Métricas de éxito post-launch
- Un método con imagen se ve **igual** en checkout y POS (misma imagen, 0 discrepancias).
- Subir/cambiar la imagen se hace en **1 lugar** (pantalla de métodos de pago) y se refleja sin recargar.
- **0 imágenes rotas** en los canales (siempre imagen o respaldo neutro).

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] `[NEEDS CLARIFICATION]` resuelto (reutilizar `logo`; ≤2 MB; png/jpg/jpeg/webp/svg — D-064).
- [x] **Checkpoint humano:** spec **aprobada** 2026-08-06 → habilitada la redacción de `plan.md`.
