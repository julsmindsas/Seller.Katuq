## 0. Decisiones

- [x] 0.1 Daniel aprobó el plan (2026-10-08): cupón de pedidos de 30 al mes mientras el plan sea gratis con canje del 16 al 18 de octubre, descuento en el plan por 6 meses y medición de quién lo usó y quién pagó.
- [x] 0.2 Verificar contra el código actual (campañas, tope de pedidos, registro, cobro, medición). Hecho; ver `design.md`.
- [ ] 0.3 Daniel aprueba el diff de pedidos (`limitsService.js`, módulo sensible) y responde las preguntas abiertas de `design.md` y de `design-descuento-plan.md` (sección 8).
- [ ] 0.4 Registrar la decisión como D-??? en `specs/CONTRACT.md` (el número lo asigna quien haga el commit).

## 1. (a) Cupón de pedidos — backend (`a-pedidos-back.patch`)

- [x] 1.1 Módulo puro `utils/cuponCampana.js`: beneficio, tope del cupón, límites con cupón (devuelve el mismo objeto si no cambia nada), textos, validación de definiciones.
- [x] 1.2 `evaluarDisponibilidad`: `vigenteDesde` (nuevo, opcional), beneficio desconocido y cupón mal armado no se ofrecen ni gastan cupo.
- [x] 1.3 `canjear` con `beneficio` y `registradoEl` (la ventana de un cupón de feria se mira con la hora del registro).
- [x] 1.4 Tope de pedidos: 4 líneas en `limitsService`. Pruebas: identidad sin cupón, los cuatro sitios con y sin cupón, mes nuevo, plan de pago, mutaciones de las tres líneas.
- [x] 1.5 Registro directo y por verificar guardan `empresa.cupon`; bienvenida y aviso interno con el número correcto; la respuesta solo gana la llave `cupon` si hubo cupón.
- [x] 1.6 Panel de campañas: la lista muestra beneficio, texto y por qué no está disponible ("Aún no abre"); el cupón no se puede reescribir desde el formulario (prueba), sí apagar y encender.
- [x] 1.7 `scripts/crear-cupones-feria.js`: simulación por defecto (no abre Firestore), `--apply` crea, `--prueba` para el cupón de prueba.
- [ ] 1.8 **Mostrar el diff de `limitsService.js` a Daniel** antes de aplicar.

## 2. (a) Front — textos honestos (`a-pedidos-front.patch`)

- [x] 2.1 Landing `/promo/:codigo`, franja y pantalla de éxito del registro, y chip del panel: pintan los textos que manda el servidor (el Premium de siempre queda igual).
- [ ] 2.2 `npm run build` sin errores. **No se corrió en esta sesión** (regla: nada de builds); correrlo al aplicar.
- [ ] 2.3 Revisión visual con el servidor corriendo en `/promo/EFFIXPRUEBA` y en el registro (móvil y escritorio).

## 3. Prueba de punta a punta (con los parches aplicados y desplegados)

- [ ] 3.1 `node scripts/crear-cupones-feria.js --prueba` (simulación) y, si se ve bien, `--prueba --apply`.
- [ ] 3.2 Registrar una cuenta de prueba por `/promo/EFFIXPRUEBA`: la landing dice "30 pedidos al mes", el registro lo muestra, el correo dice "hasta 30 pedidos al mes", en Firestore queda `cupon` y `premiumOrigen` en `null`.
- [ ] 3.3 `GET /v1/subscriptions/status` de esa cuenta: `limits.orders.monthly = 30`.
- [ ] 3.4 **Pedido de punta a punta:** con el contador de la cuenta de prueba en 15 (editado a mano), un pedido de venta asistida pasa; con el contador en 30 se frena con "límite de 30 pedidos mensuales". Sin cupón (otra cuenta gratis), el pedido 16 se frena como siempre.
- [ ] 3.5 **FLORECER** (pasada a gratis desde la consola solo durante la prueba y devuelta a su plan): `asignar-cupon-a-empresa.js` en simulación, con `--apply`, el pedido 16, y `--quitar`.
- [ ] 3.6 Pedido por la tienda con el contador en 15 (con cupón pasa) y al llegar a 30 la tienda pasa a "Pídelo por WhatsApp".
- [ ] 3.7 Mirar `GET /v1/promociones/:id/resultado` del cupón de prueba (usaron = cuentas creadas, pagaron = 0).
- [ ] 3.8 Borrar la cuenta de prueba y apagar `EFFIXPRUEBA` desde el panel.

## 4. (c) Medición (`c-medicion-back.patch`, `c-medicion-front.patch`)

- [x] 4.1 `resultadoCampana`: `usaron`, `pagaron`, `siguenPagando`, `conversionUsoPago`; un cupón de pedidos se cuenta por `empresa.cupon.campanaId` y el Premium de siempre por `premiumCampanaId`, sin mezclarse; lo que ya devolvía no cambia.
- [x] 4.2 Panel: "Pagaron un plan: N (X% de los que usaron el código)" en el resumen del cupón.
- [ ] 4.3 Verificar con el primer plan que pague una cuenta con cupón (puede ser después de la feria).

## 5. (a2) Asignar a una cuenta existente — opcional (`a2-asignar-cupon-back.patch`)

- [x] 5.1 `scripts/asignar-cupon-a-empresa.js`: simulación por defecto, `--apply`, `--quitar`; una empresa un cupón; gasta cupo y respeta la ventana como el registro; a un plan de pago no le toca el tope.

## 5b. (a3) Proteger el cupón en la ficha (`a3-proteger-cupon-back.patch`) — antes de crear el cupón real

- [x] 5b.1 `cupon` en la lista de campos que la ficha no escribe + prueba (y mutación: sin la línea, la prueba falla).
- [ ] 5b.2 Cerrar `POST /v1/companies/edit` y `/create` (hallazgo previo: `/edit` reescribe cualquier campo de cualquier empresa por NIT y `/create` guarda el cuerpo entero). **Cambio aparte**, en `controllers/companies.js` / `routers/companies.js`, cuando la otra sesión que lo está editando termine.

## 6. (b) Descuento en el plan — solo diseño

- [x] 6.1 Cuentas en COP y USD, decisión recomendada sobre el 20% anual, puntos de enganche con líneas, matriz de 20 pruebas.
- [x] 6.2 Prototipo descartable que demuestra congelado, prorrateo y "sin cupón idéntico" para las renovaciones (no entregado).
- [ ] 6.3 Daniel responde las 5 decisiones (`design-descuento-plan.md` §8).
- [ ] 6.4 Implementación en 10 pasos, un cambio a la vez (`design-descuento-plan.md` §9), empezando por dejar en verde `subscriptionBillingRetrySafety.test.js`.

## 7. Despliegue (fuera del modo auto: ssh/pm2/firebase deploy los hace Daniel o una sesión con su permiso)

- [ ] 7.1 Backend a producción (EC2, leer MANUAL-EC2 y `prod-pm2-two-daemons` antes).
- [ ] 7.2 Front a Firebase Hosting.
- [ ] 7.3 **Crear el cupón real al final:** `node scripts/crear-cupones-feria.js` (simulación) y luego `--apply`.
- [ ] 7.4 Del 16 al 18: vigilar `resultado` del cupón; si algo raro, "Apagar" en el panel.
- [ ] 7.5 El 19: confirmar que el cupón cerró solo (ventana) y registrar el resultado en `specs/CONTRACT.md`.

## Avance (2026-10-08)

- Parches (a), (a2) y (c) verificados con pruebas offline; aplican limpios sobre el repo en cualquier orden y el resultado es idéntico.
- Pruebas nuevas: `cuponPedidos` 22, `cuponAsignar` 7, `cuponMedicion` 5, `cuponPedidosRegistro` (contrato). Regresión de `tests/onboarding` y `tests/subscriptions` sin cambios, salvo dos rojas de antes que no son de este cambio.
- Sin build, sin commit, sin despliegue y sin escribir en Firestore de producción.
