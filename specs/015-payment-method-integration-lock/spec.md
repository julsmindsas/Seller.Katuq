# Spec 015 — Amarrar la forma de pago con integración (bloqueo/vínculo)

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-08-09 (aprobada; Inhabilitar = escape deliberado → D-067)
> Rama: `feature/pagos-metodos-unificados` (misma del lote pagos). Ver D-063.
>
> Tarea 4 de 6 del lote "módulo pagos".

## 1. Contexto / Por qué
Un método de pago puede depender de una **integración** para cobrar (una **pasarela** como Wompi/ePayco, o el
flag manual **Integración = Sí** que el operador marca en la pantalla de métodos de pago). Hoy ese método se
puede **desconfigurar sueltamente**:
- Sus **switches Disponible** por canal (E-commerce/POS) se pueden apagar con un clic, dejando la pasarela
  configurada pero el método **invisible** para vender → el cobro por pasarela deja de ofrecerse sin aviso.
- El campo **Integración** se puede pasar de **Sí → No** con un clic, **rompiendo el vínculo** aunque detrás
  haya una pasarela **activa** para la empresa.

El vínculo real método↔pasarela existe (el cobro se enruta a la pasarela **por el nombre** del método) pero
**no está protegido**: nada impide que una acción casual de la pantalla deje inconsistente al método frente a
su integración. Falta un "amarre" que mantenga íntegra esa relación.

## 2. Objetivo de negocio
Cuando una forma de pago tenga **integración activa**, debe quedar **amarrada**: la pantalla y el backend
**impiden desconfigurarla sueltamente** (apagar su disponibilidad de canal o quitarle el flag de integración
mientras la integración siga activa). El operador ve **con claridad** que el método está amarrado y **por qué**,
y conserva una vía **deliberada** (no casual) para cambiarlo cuando de verdad lo necesite. Solución que **protege
la integridad** del cobro por integración sin encerrar al operador.

## 3. User stories
- Como **administrador** quiero que un método con integración activa **no se pueda desactivar por canal con un
  clic**, para **no dejar sin cobro** una pasarela que sigue configurada.
- Como **administrador** quiero que **no se pueda pasar Integración de Sí a No** mientras haya una **pasarela
  activa** detrás, para **no romper el vínculo** por accidente.
- Como **administrador** quiero **ver que el método está amarrado y por qué** (flag manual vs pasarela activa),
  para **entender qué puedo y qué no puedo cambiar**.
- Como **administrador** quiero una **vía deliberada** para liberar el método cuando corresponda (p. ej. quitar
  primero el flag manual, o desactivar la pasarela), para **mantener el control** sin bloqueos permanentes.

## 4. Criterios de aceptación (notación EARS)

**Definición de "integración activa" (amarre)**
- THE system SHALL considerar un método **amarrado por pasarela activa** WHEN su nombre corresponde a una
  **pasarela** (según las palabras clave que ya usa el enrutamiento de cobro) **y** la empresa activa tiene esa
  pasarela **configurada y activa** (integración propia de la empresa, no el respaldo de plataforma).
- THE system SHALL considerar un método **amarrado por flag manual** WHEN tiene **Integración = Sí** pero **no**
  hay una pasarela activa detrás.
- THE system SHALL tratar un método como **amarrado** si aplica **cualquiera** de los dos casos anteriores;
  en caso contrario, el método está **libre**.

**Bloqueo de desactivación por canal (aplica a todo método amarrado)**
- WHILE un método esté **amarrado**, THE system SHALL **impedir apagar** su disponibilidad **Disponible** en
  cualquier canal (E-commerce/POS) que esté encendido; el método **permanece disponible**.
- WHERE el operador intente apagar la disponibilidad de un método amarrado desde la pantalla, THE system SHALL
  **impedir la acción en la UI** (control deshabilitado o rechazo con aviso) y **explicar el motivo**.
- IF una petición de API intenta poner la disponibilidad de un canal en "no disponible" para un método
  amarrado, THEN THE system SHALL **rechazarla** con un error de conflicto y un mensaje claro, sin cambiar el
  estado.
- WHERE un método amarrado esté **encendido en un canal y apagado en otro**, THE system SHALL permitir
  **encender** el canal apagado (nunca se bloquea encender), y seguir **bloqueando apagar** los encendidos.

**Bloqueo de quitar el flag de integración (solo con pasarela activa)**
- WHILE un método esté **amarrado por pasarela activa**, THE system SHALL **impedir cambiar Integración de
  Sí → No** (en la UI y en la API), explicando que hay una pasarela activa vinculada.
- WHERE un método esté **amarrado solo por flag manual** (sin pasarela activa), THE system SHALL **permitir**
  cambiar Integración de Sí → No; ese cambio es la vía deliberada para **liberar** el método (tras liberarlo,
  se puede volver a desactivar por canal).

**Visibilidad del amarre**
- THE system SHALL indicar en la lista de métodos que un método está **amarrado** y **por qué** (flag manual o
  pasarela activa), de forma legible y accesible (no solo por color).
- WHEN el operador vea un control bloqueado por amarre, THE system SHALL mostrar el **motivo** (p. ej. en
  tooltip/aviso) y, cuando exista, **cómo liberarlo**.

**Consistencia y multi-tenant**
- THE system SHALL evaluar el amarre dentro de la **empresa activa**: la pasarela activa de una empresa no
  amarra métodos de otra.
- THE system SHALL mantener el **mismo criterio de amarre** en E-commerce y POS (un método amarrado lo está
  para ambos canales).

## 5. Requisitos no funcionales

### 5.1 Performance
- Evaluar el amarre no debe agregar latencia perceptible a la carga de la pantalla de métodos: el estado de la
  pasarela de la empresa se resuelve **una vez por carga** (no una consulta por método).

### 5.2 Seguridad
- El guardarraíl es **autoritativo en el backend** (no solo en la UI): un cliente que se salte la pantalla no
  puede desconfigurar un método amarrado. Aislado por empresa. Sin secretos de la pasarela en logs ni en la UI.

### 5.3 Observabilidad
- Los rechazos por amarre (intentos de apagar canal o quitar flag con pasarela activa) quedan registrados de
  forma estructurada, sin datos sensibles, para poder auditar por qué se bloqueó.

### 5.4 Accesibilidad (UI)
- El estado "amarrado" y el motivo se comunican con **texto** (no solo color/ícono). Los controles
  deshabilitados exponen su motivo de forma accesible.

### 5.5 Resiliencia
- IF no se puede determinar el estado de la pasarela de la empresa (error transitorio), THEN THE system SHALL
  **degradar de forma segura**: no romper la pantalla y **no** desamarrar por defecto un método marcado con
  Integración = Sí (preferir proteger la integridad; ver R-03).

## 6. Out of scope (explícito)
- **Crear el vínculo formal método↔pasarela** (un campo `provider` dedicado en el método): esta tarea usa el
  criterio de enrutamiento **ya existente** (por nombre) para decidir el amarre; formalizar el vínculo es un
  posible follow-up.
- **Configurar/activar/desactivar** la pasarela en sí (pantalla de integraciones): fuera de alcance; aquí solo
  se **lee** su estado para amarrar.
- **Bloquear Inhabilitar / Eliminar definitivamente** el método: se dejan como **acciones deliberadas y
  confirmadas** (no se bloquean en esta tarea; ver §8 y D-067).
- **Bloquear la edición de Nombre** u otros campos del método: fuera de alcance (aunque el nombre participa del
  enrutamiento; ver R-02).
- Cambiar la lógica de **selección/registro** del método en la venta (specs 012/013) o el **enrutamiento** de
  cobro por pasarela (backend de pagos).

## 7. Dependencias
- Pantalla única de métodos de pago (spec 012) y su servicio de disponibilidad por canal / config global.
- Estado de la pasarela por empresa: servicio de pagos que ya resuelve el **proveedor activo** de una empresa
  (`getProviderInfo(company)` → `isConfigured`), leyendo la configuración de integración (`status: 'active'`).
- Criterio de enrutamiento por nombre ya vigente en el checkout (palabras clave `wompi`/`epayco`/`pasarela`/
  `tarjeta online`) — es la base para saber qué método "es" una pasarela.
- Endpoints de formas de pago `/v1/pagos/*` (disponibilidad por canal y guardado de config global) donde vivirá
  el guardarraíl 409.

## 8. [NEEDS CLARIFICATION]
> Resueltas con el negocio antes de este borrador (2026-08-09):
- [x] **Qué es "integración activa":** **ambas** — el flag `Integración = Sí` **o** una **pasarela activa**
      vinculada a la empresa.
- [x] **Qué se bloquea "sueltamente":** **desactivar por canal** (mientras amarrado) **y** **quitar el flag
      Integración** (solo mientras haya una **pasarela activa** detrás).
- [x] **Dónde se hace cumplir:** **UI + guardarraíl backend (409)**.
- [x] **Confirmado en checkpoint (D-067):** **Inhabilitar/Eliminar** quedan como **escape deliberado** (no se
      bloquean). El guardarraíl de "no apagar canal" aplica al **switch por canal**, no a Inhabilitar; bajar un
      método amarrado exige el flujo deliberado y confirmado de Inhabilitar.

## 9. Riesgos identificados
- **R-01 (falso "libre" por fallback de plataforma):** todas las empresas tienen un proveedor de **respaldo de
  plataforma**; si se contara como "activo" se amarraría cualquier método tipo Wompi de toda empresa.
  Mitigación: amarrar por pasarela **solo** cuando la empresa tiene config **propia** activa (`isConfigured`),
  no el fallback.
- **R-02 (nombre participa del vínculo):** el amarre por pasarela depende del **nombre** del método; renombrarlo
  puede cambiar si es o no pasarela. Bloquear el nombre queda **fuera de alcance**, pero se documenta como
  riesgo (posible follow-up: vínculo formal por `provider`).
- **R-03 (estado de pasarela indeterminado):** si falla la consulta del proveedor activo, decidir amarre por
  defecto. Mitigación: degradar seguro — respetar el flag manual y no desproteger; nunca romper la pantalla.
- **R-04 (bypass por Inhabilitar):** Inhabilitar apaga todos los canales; si no se bloquea, es una vía de
  desactivar un método amarrado. Aceptado como **escape deliberado** (confirmado con Swal), no casual. Ver §8.
- **R-05 (caché stale de disponibilidad):** al liberar/bloquear, el checkout/POS deben reflejarlo. Mitigación:
  invalidar la caché de formas de pago del canal al mutar (patrón del lote, specs 012–014).

## 10. Métricas de éxito post-launch
- **0** métodos con pasarela activa que queden **no disponibles** por un apagado casual de canal.
- **0** casos de `Integración` pasada a **No** con una **pasarela activa** detrás (bloqueado en UI y API).
- El operador **identifica** el amarre y su motivo sin ayuda (indicador legible en la lista).
- Existe una **vía deliberada** documentada para liberar un método (quitar flag manual / desactivar pasarela).

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] `[NEEDS CLARIFICATION]` resuelto (Inhabilitar = escape deliberado → D-067).
- [x] **Checkpoint humano:** spec **aprobada** 2026-08-09 → habilitada la redacción de `plan.md`.
