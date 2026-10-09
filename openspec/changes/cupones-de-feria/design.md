## Context

Verificado contra el código de hoy (rama `backend-aws-security` del backend y la rama compartida del front). Las líneas son aproximadas.

- **Campañas.** `services/promocionesService.js`: `esCampana` (~37), `evaluarDisponibilidad` (~96, mira `activo`, `vigenteHasta`, cupo), `canjear` (~187, transacción que revalida y suma `usosConsumidos`). Todo asume que una campaña regala Premium (`diasPremium`, `premiumUntil`).
- **Vitrina pública.** `GET /v1/subscription-plans/active` no lleva `auth`; `controllers/subscriptionPlans.js` filtra con `esPlanVendible = !esCampana(...)` (~8-18) en los lectores de planes.
- **Registro.** `controllers/diagnostics.js` (~1054-1090) canjea el código dentro de un `try/catch` y arma la empresa (~1095-1155); por verificar se aplaza a `controllers/registroVerificacion.js` `alConfirmarPorPrimeraVez` (~88-125). Esas rutas guardan `canalInscripcion`, `nombrePlan`, `premiumCampanaId`.
- **Tope de pedidos.** `config/subscriptionLimits.js:35` (`ordersPerMonth: 15`). `getLimitsForPlan` **no lee** `company.monthlyOrderLimit`: ese campo es informativo y se reescribe en cada pedido. Lo hacen cumplir cuatro sitios de `services/limitsService.js`: `getEffectiveOrderUsage` (44), `createOrderWithinLimit` (73, el candado transaccional, llamado desde `repositories/orderRepository.js:45` y `controllers/orders.js:5957`), `consumeStoreOrderSlot` (169, `controllers/sites.js:2169`) y `validateOrderLimit` (194, `middleware/subscriptionValidator.js:97`). `controllers/sites.js:5846` (tope de la tienda) y `controllers/subscriptions.js:364/455` (estado y uso) leen `getEffectiveOrderUsage`.
- **Vencimiento de Premium.** `services/premiumPromocionalService.js` solo recorre empresas con `premiumOrigen == "promocion"`. `esCortesia()` (`subscriptionBillingUtils.js`) trata `"promocion"` como "no se cobra".
- **Medición.** `controllers/promociones.js` `resultadoCampana` cuenta por `companies.premiumCampanaId`. Un pago aprobado marca la empresa con `premiumOrigen: "pago"` y `lastSubscriptionPayment` (`services/subscriptionPaymentService.js:143`).
- **Front.** La landing (`promo-campana.component.html`) y el registro (`diagnostic-survey.component.*`) escriben a mano "de Katuq Premium, gratis" y "15 pedidos al mes".
- **Pruebas ya rojas, sin este cambio** (confirmado en el repo limpio):
  - `tests/subscriptions/subscriptionBillingRetrySafety.test.js` falla en su aserción sobre `_calculateMonthlySales` (llegó `ventasPorDia` con el prorrateo) y **el resto del archivo, que prueba que un reintento no cambia el monto, no corre**. Con la aserción relajada en un experimento descartable, todo el archivo pasa: la garantía existe, la prueba está desactualizada.
  - `scripts/test-promociones-registro.js` se cae en `FieldValue.delete is not a function` (su doble de Firestore quedó atrás de `premiumPromocionalService`). Sus 40 aserciones previas dan lo mismo antes y después de este cambio.

## Goals / Non-Goals

**Goals**
- Un cupón de feria con beneficio explícito, ventana de canje exacta en hora de Bogotá y cupo que no se pasa.
- Que "30 pedidos" valga en todos los sitios donde hoy vale "15", sin tocar a nadie que no haya canjeado.
- Que el registro guarde el cupón y se pueda medir cuántos lo usaron y cuántos pagaron.

**Non-Goals**
- Descuentos (ver `design-descuento-plan.md`), comisiones, cambios a los planes pagos, panel de edición de estos cupones, canje desde la sesión de una cuenta existente.

## Decisions

1. **`beneficio` explícito en la campaña.** Ausente o `"premium"` = lo de siempre (ninguna campaña existente cambia). `"cupoPedidos"` es el único nuevo. Cualquier otro valor (por ejemplo `"descuentoPlan"`) hace que `evaluarDisponibilidad` responda `BENEFICIO_NO_DISPONIBLE`: ni se ofrece en la landing ni se canjea ni gasta cupo. Un cupón mal armado (sin `pedidosPorMes`, o que no supera el tope gratis) responde `CONFIGURACION_INVALIDA` por lo mismo.
   - *Alternativa descartada:* reutilizar `diasPremium` con un valor especial. Mezcla dos cosas distintas y el cron de vencimiento las trataría igual.

2. **Las reglas en un módulo puro (`utils/cuponCampana.js`).** Sin Firestore ni reloj propio (la hora entra por parámetro). Lo usan el registro, los límites, el panel, el script y las pruebas, así no se contradicen.

3. **El tope sube donde se resuelven los límites.** `conTopeDeCupon(limites, empresa, ahora)` devuelve **el mismo objeto** cuando el cupón no cambia nada y una copia con `ordersPerMonth` más alto cuando sí. Se usa en las 3 funciones de `limitsService` que leen el tope del plan (`consumeStoreOrderSlot` hereda por `getEffectiveOrderUsage`): son 4 líneas. Solo **sube** el tope (un cupón de 10 sobre un plan de 15 no lo baja) y no toca planes sin tope (-1) ni bloqueados (0): por eso "mientras el plan siga gratis" sale solo, sin una condición extra.
   - *Alternativas descartadas:* subir `SUBSCRIPTION_LIMITS.freemium` (afecta a todos); leer `company.monthlyOrderLimit` (el servicio lo ignora y lo reescribe en cada pedido); leer la campaña en cada pedido (lecturas extra en el camino de pedidos).

4. **El beneficio se copia a la empresa y queda congelado** (`empresa.cupon = { campanaId, codigo, beneficio, pedidosPorMes, canjeadoEl, beneficioHasta }`). Lo que se edite después en la campaña no le cambia nada a quien ya canjeó. `monthlyOrderLimit` también se escribe (30) para que "Mi plan" muestre el número correcto antes del primer pedido; el tope que cuenta sale de `conTopeDeCupon`. Ojo con el nombre: `empresa.cupon` es el cupón de **campaña de Katuq** y no tiene nada que ver con los cupones de descuento de las tiendas (`tienda.cupones`, `pedido.cupon`).

5. **Nunca `premiumOrigen: "promocion"`.** Ese origen hace que el cron de vencimiento baje a la empresa a gratis y que `esCortesia()` deje de cobrarle. La empresa con cupón de pedidos nace en freemium, con `premiumOrigen: null`, como cualquier cuenta gratis (hay prueba: el cron la deja idéntica).

6. **Ventana de canje.** `vigenteDesde` es nuevo y opcional; `vigenteHasta` es el de siempre. `evaluarDisponibilidad(data, ahora)` recibe la hora para poder evaluar otro momento. **Por verificar**, el canje se aplaza hasta confirmar el correo; para los cupones nuevos la ventana se mira con la hora del **registro** (`accountVerification.requestedAt`, nunca en el futuro), para que quien se registró el último minuto del 18 no pierda el cupón por confirmar a las 12:03. Las campañas de Premium de siempre se siguen evaluando al canjear.

7. **Fechas con el desfase escrito.** El script usa `new Date("2026-10-16T00:00:00.000-05:00")` y `...-10-18T23:59:59.999-05:00`. Un `"2026-10-18"` suelto (lo que manda el campo de fecha del panel) es medianoche UTC del 18 = el 17 a las 7 p. m. en Bogotá. Por eso el panel no edita estos cupones: su formulario exige días de Premium (falla antes de escribir; hay prueba) y relee la fecha en UTC. Sí los lista, los apaga y los enciende.

8. **Los textos los manda el servidor.** `vistaPublica` agrega `titulo`, `detalle`, `puntos` y `letraChica` solo a los cupones nuevos (la de Premium de siempre queda con las mismas cinco llaves); el registro responde `cupon.mensaje`. El front pinta lo que llega: cambiar una redacción o sumar un beneficio no pide desplegar el front.

9. **La respuesta del registro solo gana una llave cuando hubo cupón** (`cupon: { aplicado, codigo, beneficio, pedidosPorMes, mensaje }`). `promocion` conserva su forma (`{ aplicada: false }` cuando no hubo Premium) y sin cupón el documento de la empresa y la respuesta son idénticos a los de hoy.

10. **Medición sin tocar el camino del dinero.** El resultado cuenta por `empresa.cupon.campanaId` (consulta por ruta de mapa, índice automático de campo único; las de Premium siguen por `premiumCampanaId`). "Pagó" = `premiumOrigen === "pago"` o `lastSubscriptionPayment`, que el servicio de pagos escribe **solo** con un pago aprobado: el Premium regalado y el que activa un administrador a mano (`admin_manual`) no cuentan. `degradadas` queda en 0 para los cupones de pedidos (nunca subieron a nadie a Premium, no hay a quién bajar).
    - *Alternativa descartada:* marcar el cupón dentro de `processWompiTransaction`. Es la transacción más delicada del sistema para ganar un dato que ya se puede derivar.

11. **(a2) aparte.** `asignar-cupon-a-empresa.js` reutiliza `canjear` y `camposDeCupon`: hace lo mismo que el registro (gasta cupo, respeta la ventana, una empresa un cupón) y trae su reversa. Es opcional: nada más lo usa.

12. **El cupón no se escribe desde la ficha (a3).** `sanitizarActualizacion` (lista negra de `PUT /v1/companies/:id`) descarta `cupon`. Sin esto, como el tope sale de `empresa.cupon`, un administrador de comercio podría darse el número de pedidos que quisiera. Es una línea en un archivo que otra sesión está tocando (banderas por comercio); el hunk va lejos del suyo y se verificó contra el árbol de trabajo actual y contra el HEAD limpio. Los caminos viejos `POST /companies/edit` y `/create` no pasan por el sanitizador: ver "Hallazgo previo" en `proposal.md`.
13. **Sin bandera.** El interruptor es el cupón (se apaga desde el panel) y el beneficio vive en cada empresa. No hay nada que retirar (Art. XII).

## Risks / Trade-offs

- **[Pedidos]** El diff de `limitsService` es de 4 líneas pero está en el candado de pedidos. → Prueba de identidad (mismo objeto sin cupón), de los 4 sitios con y sin cupón (el pedido 16 pasa, el 31 se frena con límite 30, mes nuevo, plan de pago) y mutaciones: al revertir cualquiera de las 3 líneas la prueba falla.
- **[Registro]** Es el embudo de adquisición. → El canje sigue dentro del `try/catch` existente; pruebas: sin código, con código rechazado, con cupón, con Premium de siempre y por verificar (incluye que se canjea una sola vez y con la hora del registro).
- **[Texto equivocado]** La landing vieja diría "Premium gratis" para un cupón de pedidos. → El front va primero y el cupón se crea al final (orden de despliegue).
- **[Copias viejas de /registrarse]** Los navegadores de algunos anuncios (TikTok) guardan una copia vieja de la página: el cupón se aplica igual y el correo de bienvenida dice "hasta 30 pedidos", pero esa copia mostraría el aviso de "promoción no disponible". El stand usa QR en navegadores normales; si se pauta, hay que saberlo.
- **[Reversa]** Con el cupón vivo, el código viejo lo leería como una campaña de Premium de 0 días. → Primero "Apagar" en el panel, luego revertir.
- **[Beneficio sin vencimiento]** Los 30 pedidos no tienen fecha de fin si Daniel no la pone (`beneficioHasta` en la campaña, opcional).
- **[Autoasignación]** Con (a3) la ficha no puede escribir `cupon`; `POST /companies/edit` sí puede escribir cualquier cosa (hallazgo previo). Hasta cerrarla, el cupón no es más inseguro que `subscriptionPlan`, que ya se podía forjar por ahí.
- **[Canje sin tope]** `cupoMaximo: 0` deja canjear sin límite; el costo para Katuq es cero (15 pedidos más en una cuenta gratis) pero Daniel puede poner un número.

## Qué se probó (todo offline, Firestore en memoria, sin tocar producción)

| Prueba | Casos |
|---|---|
| `tests/subscriptions/cuponPedidos.test.js` | 22: tope con/sin cupón en los 4 sitios, identidad del objeto de límites, ventana oficial al segundo, `registradoEl`, cupo con 10 canjes simultáneos, configuración inválida, vitrina sin cupón, cron intacto, panel (listar/apagar/no reescribir), validación de definiciones |
| `tests/onboarding/cuponPedidosRegistro.contract.test.js` | registro sin cupón idéntico, con cupón (documento, respuesta, correos, auditoría), Premium de siempre, código rechazado, por verificar |
| `tests/subscriptions/cuponMedicion.test.js` (c) | 5: usaron/pagaron, sin mezclar campañas, lo de siempre intacto |
| `tests/subscriptions/cuponAsignar.test.js` (a2) | 7: simulación sin escribir, asignar, uno solo por empresa, motivos de rechazo, plan de pago, quitar |
| `tests/companies/cuponNoEscribibleDesdeLaFicha.test.js` (a3) | La ficha descarta `cupon` y deja pasar lo demás; lo ya protegido sigue protegido; falla si se quita la línea |
| Regresión | Todas las pruebas de `tests/onboarding` y `tests/subscriptions`, `test-limites-plan-contrato`, `test-limites-plan`: igual que antes (salvo las dos rojas de antes) |

Se verificó además que los parches aplican limpios en cualquier orden entre (a), (a2) y (c) y que el árbol resultante es idéntico.

## Migration Plan

1. Aprobar el diff de pedidos (módulo sensible) y aplicar (a) en backend y front. Opcional (a2).
2. `node --check`, pruebas de la lista, reinicio local sin errores.
3. Desplegar **backend primero, luego front** (el backend sin cupón no cambia nada; el front con campos opcionales funciona con el backend viejo).
4. Probar: `node scripts/crear-cupones-feria.js --prueba --apply` → registrar una cuenta de prueba por `/promo/EFFIXPRUEBA` → revisar en Firestore que quedó `cupon` y que `GET /v1/subscriptions/status` dice 30 → con el contador en 15 crear un pedido (pasa) y con el contador en 30 otro (se frena con "límite de 30"). Con FLORECER: `asignar-cupon-a-empresa.js` (solo si está en el plan gratis para la prueba) y luego `--quitar`.
5. Crear el cupón real con `crear-cupones-feria.js --apply` **al final**, apagar el de prueba y borrar la cuenta de prueba.
6. Del 16 al 18: mirar `GET /v1/promociones/:id/resultado` (usaron, pagaron).
7. **Reversa:** "Apagar" el cupón en el panel; quitar el beneficio a una empresa con `--quitar`; revertir los parches en el orden inverso. Los campos `cupon` que queden son inertes.

## Open Questions

1. ¿Los 30 pedidos valen para siempre mientras sea gratis o hasta una fecha (`beneficioHasta`)?
2. ¿Tope de canjes del cupón de pedidos o sin tope (`cupoMaximo: 0`)?
3. ¿Un mismo comercio puede tener el cupón de pedidos y el del descuento? Hoy el registro acepta **un** código.
4. ¿Las cuentas ya existentes canjean desde su sesión (endpoint nuevo) o basta el script a pedido?
5. ¿Se habilita la creación/edición de cupones de feria desde el panel (hoy por script)?
