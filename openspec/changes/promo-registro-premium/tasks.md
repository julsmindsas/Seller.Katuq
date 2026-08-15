## 1. Backend — campañas dentro de `subscriptionPlans`

- [x] 1.1 Leer `controllers/subscriptionPlans.js` y `routers/subscriptionPlans.js` completos antes de tocarlos
- [x] 1.2 Excluir `tipoRegistro === 'campana'` en los seis lectores de planes (`getSubscriptionPlans`, `getActiveSubscriptionPlans`, `getSubscriptionPlanById`, `filterSubscriptionPlans`, `getSubscriptionPlansStats` y la validación de nombre único de `createSubscriptionPlan`)
- [x] 1.3 Prueba: `GET /v1/subscription-plans/active` **sin sesión** no devuelve ninguna campaña aunque exista una activa
- [x] 1.4 `POST/PUT/PATCH/GET` de campañas con `auth` y verificación de rol Super Administrador: crear, editar, activar/desactivar y listar con conteo de usos
- [x] 1.5 Validaciones al crear: código en mayúsculas sin espacios, único entre campañas y contra nombres de plan, `diasPremium > 0`, `vigenteHasta` futura, `cupoMaximo >= 0`
- [x] 1.6 `GET /v1/promociones/validar/:codigo` **público, sin auth** (con `/validar/` para no chocar con las rutas de administración): devuelve nombre, descripción y días de premium; nunca cupo, usos ni datos internos
- [x] 1.7 Prueba del endpoint público con código inexistente, inactivo, vencido y con cupo agotado — los cuatro dan la misma respuesta de "no disponible" y ninguno filtra cupo

## 2. Backend — canje en el registro

- [x] 2.1 Leer `controllers/diagnostics.js` alrededor de la creación de empresa (líneas ~890–1060) y confirmar el flujo de cuarentena y anti-abuso antes de editar
- [x] 2.2 Aceptar `codigoPromocional` opcional en `POST /v1/diagnostics/saveSurveyResponse`
- [x] 2.3 Canje en transacción Firestore: revalidar activo/vigencia/cupo e incrementar `usosConsumidos` de forma atómica
- [x] 2.4 Crear la empresa con plan premium, límites de premium, `premiumUntil = hoy + diasPremium`, `premiumOrigen: 'promocion'`, `premiumCodigo` y `premiumCampanaId` cuando el canje confirma
- [x] 2.5 Aislar todo el bloque en `try/catch`: cualquier fallo cae a freemium con el comportamiento actual y registra el motivo en `registration_security_audit`
- [x] 2.6 Devolver al frontend si el código se aplicó o no, para poder avisarlo en pantalla
- [x] 2.7 Pruebas: registro sin código (idéntico a hoy), con código válido, con código vencido, con cupo agotado, y con la campaña caída — en los cuatro últimos la empresa se crea igual
- [ ] 2.8 Prueba de concurrencia real contra Firestore: con cupo 3 y diez registros simultáneos, exactamente tres empresas quedan premium (el cupo secuencial ya está probado en `scripts/test-promociones-registro.js`; falta la carrera de verdad)

## 3. Backend — vencimiento y avisos

- [x] 3.1 `GET /v1/subscriptions/status` devuelve `premiumUntil` y `premiumOrigen`
- [x] 3.2 Leer `services/cronService.js` y elegir franja horaria libre (1:00, 2:00, 3:00 y 4:00 AM ya están ocupadas)
- [x] 3.3 Trabajo diario con modo simulación (`dryRun`) como primera capacidad, antes de que pueda escribir nada
- [x] 3.4 Degradación: empresas con `premiumOrigen == 'promocion'` y `premiumUntil <=` ahora pasan a freemium con los límites de freemium, conservando `premiumCampanaId`
- [x] 3.5 Aviso previo por correo (3 días antes) marcando `premiumAvisoPrevio`, y aviso el día del corte marcando `premiumAvisoCorte`; ninguno se repite
- [x] 3.6 ~~Índice Firestore compuesto~~ — **no hizo falta**: se consulta por igualdad simple sobre `premiumOrigen` (índice automático) y las fechas se filtran en memoria. Son cientos de empresas, no millones; si crece, ahí sí toca el índice
- [x] 3.7 Pruebas: idempotencia (correr dos veces deja el mismo resultado), premium pagado intacto, promocional vigente intacto, freemium intacto
- [ ] 3.8 Correr en producción en modo simulación y revisar la lista de candidatas **antes** de habilitar la escritura

## 4. Frontend — landing de campaña

- [x] 4.1 Servicio Angular que extiende `BaseService` para validar el código y para administrar campañas (nada de `HttpClient` en componentes)
- [x] 4.2 Módulo lazy nuevo con ruta pública `/promo/:codigo`, fuera del módulo de la encuesta
- [x] 4.3 Pantalla con el gancho: nombre de campaña, beneficio, duración y botón a registrarse — tema canónico, plano sin gradientes, par fuerte/fondo-suave de éxito
- [x] 4.4 Estado "promoción no disponible" en tono de advertencia (no error) con botón al registro normal
- [x] 4.5 Guardar el código en `localStorage` mientras dura el registro y limpiarlo al terminar

## 5. Frontend — registro y estado del plan

- [x] 5.1 Leer `diagnostic-survey.component.ts` y `katuq-quickstart.service.ts` antes de editarlos
- [x] 5.2 Mostrar el beneficio aplicado durante el registro y propagar el código al backend
- [x] 5.3 Mensaje claro cuando el backend responde que el código ya no estaba disponible, sin frenar el registro
- [x] 5.4 `subscription.model.ts` y `subscription.service.ts`: exponer `premiumUntil` y `premiumOrigen`
- [ ] 5.5 Mostrar los días restantes de premium promocional donde ya se ve el plan (el servicio ya expone `esPremiumPromocional()` y `diasRestantesPremium()`; falta pintarlo en el widget de plan)

## 6. Frontend — administración de campañas

- [x] 6.1 Ruta hija `superadmin/campanas` con `AdminGuard` en el módulo de superadmin existente
- [x] 6.2 Pantalla de crear/editar/activar/desactivar campañas y ver registros traídos, usos restantes y cuántas siguen en premium
- [x] 6.3 Botón para copiar el enlace listo para pauta
- [x] 6.4 Entrada en `nav.service.ts` lista; script de backfill de roles escrito (`scripts/agregar-menu-campanas-a-superadmin.js`, simulación por defecto) — **falta ejecutarlo**, sin eso la pantalla queda invisible
- [ ] 6.5 Verificar en la web, con sesión de Super Administrador, que la entrada aparece en el menú

## 7. Cierre

- [x] 7.1 Build de frontend en verde y sintaxis de backend verificada; 40 pruebas de reglas en verde (`scripts/test-promociones-registro.js`)
- [ ] 7.2 Ciclo completo con una campaña de prueba de cupo 1: abrir el enlace, registrarse, verificar empresa premium con fecha y cupo en cero
- [ ] 7.3 Verificar que un segundo registro con esa campaña queda en freemium
- [ ] 7.4 Adelantar la fecha de vencimiento de la empresa de prueba y correr el trabajo diario: verificar degradación y correo
- [ ] 7.5 Borrar los datos de prueba
- [ ] 7.6 Crear la campaña real `COLOMBIA2026` con **120 días de premium (4 meses)** desde la pantalla de superadmin, con su cupo y fecha límite. Son 4 y no 3 porque el video que Daniel grabó el 14-ago dice "de 3 a 4 meses": se cumple por lo alto
- [x] 7.7 Registrar la decisión en `/specs/CONTRACT.md` con fecha y razón, incluyendo el riesgo asumido de meter campañas en `subscriptionPlans`
