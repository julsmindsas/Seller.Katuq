## Context

Verificado contra el código real, no contra documentación:

- El plan de una empresa vive en `companies.subscriptionPlan` y `companies.subscriptionStatus`, con los límites desnormalizados en el mismo documento (`monthlyOrderLimit`, `aiLimits`). `GET /v1/subscriptions/status` (`controllers/subscriptions.js:19`) los lee de ahí y `SubscriptionGuard` (`src/app/shared/guards/subscription.guard.ts:43`) solo evalúa `plan === 'premium'`. **No existe ninguna fecha de corte**: hoy premium es para siempre.
- El registro público es `/registrarse` → `diagnostic-survey` → `POST /v1/diagnostics/saveSurveyResponse`. La empresa se crea en `controllers/diagnostics.js:981-1021`, fijando `subscriptionPlan: 'freemium'` y los límites de `getLimitsForPlan('freemium')`. Ese mismo camino ya tiene anti-abuso (cuarentena por riesgo, honeypot, velocidad por IP) que no se toca.
- Los cupones de `controllers/cupones.js` son descuentos sobre pedidos de las tiendas de los comerciantes. Dominio distinto; no se reutilizan ni se modifican.
- Los trabajos programados viven en `services/cronService.js`, arrancan desde `index.js:873` y admiten trabajos dinámicos desde Firestore con administración por `routers/cronJobsAdmin.js`.
- El sidebar filtra cada entrada contra el campo `menus` del rol en Firestore (`nav.service.ts:212`), además de `isOnlySuperAdministrador`. Una pantalla nueva sin backfill de roles queda invisible aunque esté desplegada.

## Goals / Non-Goals

**Goals:**
- Un enlace por campaña, apto para pauta, que termine en registros con premium temporal.
- Que el premium promocional caduque solo, con aviso previo y sin cobro.
- Que administrar campañas no dependa de nadie técnico.
- Que el registro normal siga funcionando exactamente igual.

**Non-Goals:**
- Descuentos parciales, precio promocional o cobro con descuento.
- Cobro automático al vencer y captura de medio de pago en el registro.
- Tocar cupones de pedidos, inventario, órdenes o consecutivos.
- Medición de pauta más allá de contar registros por campaña.

## Decisions

### 1. Los códigos van en `subscriptionPlans` con discriminador de tipo

Decisión explícita del usuario: no se crea colección nueva. Cada campaña es un documento de `subscriptionPlans` con `tipoRegistro: 'campana'`; los planes vendibles existentes se consideran `'plan'` por ausencia del campo.

Campos de la campaña: `codigo` (mayúsculas, sin espacios), `nombre`, `descripcion`, `diasPremium`, `cupoMaximo` (0 = sin tope), `usosConsumidos`, `vigenteHasta`, `activo`, `createdAt`, `createdBy`.

**Consecuencia que hay que atender sí o sí:** `GET /v1/subscription-plans/active` (`routers/subscriptionPlans.js:9`) **no lleva `auth`** y alimenta la vitrina pública de precios; `getSubscriptionPlans`, `filterSubscriptionPlans` y `getSubscriptionPlansStats` también leen la colección completa. Los seis lectores deben excluir `tipoRegistro === 'campana'` **en código**, no confiando en que `orderBy('precio')` descarte los documentos sin ese campo — ese filtrado es un efecto lateral de Firestore, no una garantía. La unicidad por `nombre` que ya valida `createSubscriptionPlan` también debe contemplar el nuevo tipo.

*Alternativa descartada:* colección `promotionCodes` propia — más limpia y sin riesgo de contaminar la vitrina, pero el usuario prefirió no abrir colección nueva.

### 2. El vencimiento vive en la empresa

Campos nuevos en `companies`: `premiumUntil` (timestamp), `premiumOrigen` (`'promocion' | 'pago'`), `premiumCodigo`, `premiumCampanaId`. El premium pagado no lleva `premiumUntil`, así que el trabajo de degradación nunca lo alcanza: la consulta filtra por `premiumOrigen == 'promocion'` **y** `premiumUntil <=` ahora.

`GET /v1/subscriptions/status` devuelve `premiumUntil` y `premiumOrigen`, y `SubscriptionPlan` en Angular los expone para poder mostrar "te quedan N días" en la interfaz. **El guard no cambia**: si el trabajo diario hace bien su trabajo, `plan` ya es la verdad. Meter la comparación de fechas también en el guard duplicaría la regla en dos lados que se desincronizan.

### 3. El canje ocurre dentro de la creación de la empresa, en transacción

En `controllers/diagnostics.js`, antes del `db.collection("companies").add(...)`, si viene código: una transacción Firestore lee el documento de campaña, verifica `activo`, `vigenteHasta` y `usosConsumidos < cupoMaximo`, e incrementa `usosConsumidos`. Solo si la transacción confirma, la empresa se crea con los límites de premium y `premiumUntil = hoy + diasPremium`.

**El código es estrictamente opcional y no puede tumbar el registro**: todo el bloque va en `try/catch`; cualquier fallo cae a freemium con el comportamiento actual y deja rastro en `registration_security_audit`, que ya existe para este camino. El registro es el embudo de adquisición completo, no solo el de campaña.

*Alternativa descartada:* validar el cupo en la landing y confiar en eso — el enlace circula por redes y el cupo se pasaría.

### 4. Un solo trabajo diario para vencer y avisar

Un trabajo nuevo en `services/cronService.js` (1:00–5:00 AM ya están ocupadas; se elige una franja libre), que en la misma pasada:
1. Avisa a las empresas cuyo `premiumUntil` cae dentro de la ventana de preaviso y aún no tienen `premiumAvisoPrevio` marcado.
2. Degrada las vencidas: `subscriptionPlan: 'freemium'`, límites de `getLimitsForPlan('freemium')`, `premiumUntil: null`, y conserva `premiumCampanaId` para poder medir la campaña después.

Idempotente por construcción: tras degradar, la empresa ya no cumple el filtro. Las marcas `premiumAvisoPrevio` y `premiumAvisoCorte` evitan correos repetidos. Admite `--dry-run` / modo simulación que reporta sin escribir, obligatorio en la primera corrida contra producción.

*Alternativa descartada:* degradar de forma perezosa cuando el usuario entra — deja empresas "premium" indefinidamente en los datos y ensucia cualquier reporte de plan.

### 5. Landing propia, módulo aparte

Ruta pública `/promo/:codigo` en un módulo lazy nuevo, fuera del módulo de la encuesta para no engordar el registro. Llama a un endpoint público de validación y pasa el código al registro. El código viaja también en `localStorage` mientras dura el registro, porque la encuesta es de varios pasos y un recargue perdería el parámetro de la URL.

UI según el tema canónico: acento `#5F3FE0`, tinta `#211F3A`, superficies lila, radios 16/11/20, plano sin gradientes. El beneficio va en el par fuerte/fondo-suave de éxito; el estado "promoción no disponible" en el de advertencia, nunca en rojo de error: no es culpa de quien entra.

HTTP siempre por un servicio Angular que extiende `BaseService`.

### 6. La pantalla de campañas cuelga de superadmin

Ruta hija `superadmin/campanas` dentro del módulo que ya existe, con `AdminGuard`. **Requiere backfill del campo `menus` del rol Super Administrador**, porque el sidebar filtra contra él (`nav.service.ts:212`): sin eso la pantalla queda desplegada e invisible, que ya pasó antes en este proyecto.

## Risks / Trade-offs

- **Una campaña aparece como plan en la vitrina pública de precios** → filtro por `tipoRegistro` en los seis lectores de `subscriptionPlans` y prueba explícita de que `/active` sin sesión no devuelve campañas.
- **El registro deja de funcionar por un error del código promocional** → el canje es opcional, aislado en `try/catch` y con caída a freemium; prueba de registro sin código, con código inválido y con la campaña caída.
- **Cupo sobrepasado por registros simultáneos desde pauta** → incremento del contador en transacción, no con lectura y escritura sueltas.
- **Premium pagado degradado por error** → el filtro exige `premiumOrigen == 'promocion'`; sin ese campo, ninguna empresa entra al trabajo. Primera corrida obligatoria en modo simulación con revisión de la lista.
- **Regalar premium ilimitado si el trabajo diario se cae en silencio** → el trabajo reporta su corrida como los demás de `cronService`; queda vigilado por la propuesta de monitoreo de trabajos programados que ya está en curso.
- **Abuso: la misma persona se registra varias veces con el mismo código** → el anti-abuso actual del registro (NIT y correo existentes, cuarentena por riesgo, velocidad por IP) ya limita esto; el cupo máximo acota el daño. No se agregan reglas nuevas en esta entrega.

## Migration Plan

1. Backend primero: campos y filtros, sin exponer nada. Los datos existentes no se tocan (las empresas sin `premiumOrigen` quedan fuera del trabajo).
2. Trabajo diario desplegado **apagado**, primera corrida en modo simulación y revisión de la lista de candidatas.
3. Pantalla de superadmin + backfill de roles; crear una campaña de prueba con cupo 1.
4. Landing y registro; probar el ciclo completo con la campaña de prueba y verificar que la empresa nace premium con fecha.
5. Encender el trabajo diario. Recién ahí se puede pautar.

Reversa: desactivar las campañas (deja de otorgarse premium a nuevos registros) y apagar el trabajo diario. Las empresas ya premium se quedan como están; no hay migración de datos que revertir.

## Campaña inicial

`COLOMBIA2026`, **120 días** de premium (4 meses). La duración se guarda en días —es la unidad con la que se calcula el corte— y se muestra en texto legible: 120 días se presentan como "4 meses", no como "120 días".

Son 4 meses y no 3 porque el video que Daniel grabó el 14-ago para redes dice "de 3 a 4 meses gratis": entre cumplir por lo bajo o por lo alto de lo que la gente va a oír, se cumple por lo alto.

## Open Questions

- Cuántos días antes conviene el preaviso (se asume 3 días hasta que se diga otra cosa).
- Si el código debe poder usarse también desde el registro normal escribiéndolo a mano, o solo por el enlace de campaña (se implementa el enlace; escribirlo a mano queda para después).
