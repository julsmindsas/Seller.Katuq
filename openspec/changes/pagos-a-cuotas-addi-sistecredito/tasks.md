> D-517. Backend: `katuq_admin_back_firebase/functions/`. Front: `Seller.Katuq/`. Requisitos: `specs/tienda-pago-a-cuotas` (TC) y `specs/conciliacion-pago-a-cuotas` (CC).
>
> **[S]** = módulo sensible (pagos, pedidos, consecutivos o inventario): un cambio a la vez, con su diff aprobado por Daniel antes de aplicarlo. **[P]** = paralelizable.
>
> Cada tarea lee los archivos que toca antes de editarlos y cierra con sus pruebas y el build en verde. Si el build está roto, no se avanza. Nada se despliega sin el OK de Daniel. Addi (grupos 2-4 A) puede avanzar antes que Sistecrédito (grupos 2-4 S).
>
> **Revisión del 2026-10-21 (D-518):** una tarea queda `[x]` solo si el código existe y su prueba corre en verde. Las `[S]` de código quedan `[ ]` con «listo, falta el diff aprobado» hasta que Daniel apruebe su diff (openspec/config.yaml: un cambio sensible a la vez, con aprobación antes de aplicarlo). Todo está SIN commit en `feature/tickets-web`.

## 0. Antes de programar (sin código productivo)

- [ ] 0.1 Daniel responde las preguntas 1-7 de `design.md`, aprueba la excepción acotada a los Artículos IX y X y acuerda el orden con D-496 (`crearPedidoDeTienda`). — **respondidas 2, 4 y 7 el 20-oct y 5 el 21-oct (D-518); orden con D-496 acordado en D-518 T·2. Falta: pregunta 1 (piloto y convenio), 3 y 6 siguen con valor por omisión, y la excepción al Art. IX (front) no está aprobada de forma explícita**
  - **Éxito:** respuestas anotadas en `specs/CONTRACT.md` (D-517); `design.md` y specs ajustados.
- [ ] 0.2 El comercio piloto pide a Addi (soporte_aliados@addi.com) las credenciales de staging, el `allySlug` y las credenciales de notificación; confirma montos mínimo y máximo y el kit de marca. Pedir también a Addi (activacion.aliados@addi.com) el script del widget para plataformas propias y su visto bueno para usarlo en el carrito (decisión 20).
  - **Dep.:** pregunta 1. **Éxito:** credenciales de staging cargadas en la configuración del comercio de pruebas, nunca en el repo.
- [ ] 0.3 El comercio piloto firma el convenio con Sistecrédito y obtiene las guías G-ALI-08/09/10/12 y las llaves de Staging y Production. Contrastar con la guía cada dato de la sección «Sistecrédito» de `design.md` y corregir lo que difiera.
  - **Éxito:** sección marcada «verificada con guía oficial». **Bloquea los grupos 2S-4S.**
- [ ] 0.4 Medir en staging de Addi un intento real (token, 301 con `Location`, callback con Basic) y guardar fixtures anonimizados en `tests/pagoCuotas/fixtures/`.
  - **Dep.:** 0.2. **Éxito:** fixtures de APPROVED, REJECTED, ABANDONED y 409.
- [x] 0.5 Specs delta `tienda-pago-a-cuotas` y `conciliacion-pago-a-cuotas` aprobadas por Daniel. — **aprobadas con la propuesta el 2026-10-20**
  - **Éxito:** sin esta tarea no empieza el grupo 1.
- [ ] 0.6 Abrir en el openspec privado del backend el detalle de seguridad de las rutas públicas (autenticación, limitador, superficie). No se detalla aquí porque este repo es público.
- [ ] 0.7 F2-41·3 (lo hace Daniel): pedir el kit de marca a Addi y a Sistecrédito y guardar la constancia de autorización de cada uno (precedente de F2-44).
- [ ] 0.8 Con el kit y la constancia de cada proveedor: cambiar el texto «Paga a cuotas con …» por su logo en el pie, el carrito y la ficha (`siteHtml.cuotasDeFicha`, pie en `sites.js`, `siteTienda.pintarMediosCarrito`). **Dep.:** 0.7.

## 1. Pruebas primero (rojas hasta implementar; Artículo VIII)

Cada prueba cita el requisito que cubre. **Dep.:** 0.1 y 0.5.

- [x] 1.1 [P] `tests/pagoCuotas/addiProvider.test.js` (TC «Iniciar el pago»): cuerpo del intento (montos como cadena, CC, `+57`), 301→URL sin seguir la redirección, 409→mensaje, 5xx→reintento, token pedido por intento. — **tests/pagoCuotas/**
- [x] 1.2 [P] `tests/pagoCuotas/addiCallback.test.js` (CC «Autenticidad Addi», «Una sola vez»): Basic equivocado→401 sin cambios; credenciales de otro comercio→401; monto distinto→sin aplicar y con alerta; válido→200 con el mismo cuerpo; tres callbacks iguales→un solo aprobado y un solo correo. — **tests/pagoCuotas/**
- [x] 1.3 [P] `tests/pagoCuotas/sistecreditoProvider.test.js` (TC, CC): crear y consultar hasta obtener la URL; errores 738, 739, 801 y 802; notificación en PascalCase o sin factura; estado tomado de la consulta, nunca del payload. **Dep.:** 0.3. — **contra la documentación no oficial; se revisa con 0.3**
- [x] 1.4 [P] `tests/pagoCuotas/resolucionEstricta.test.js` (TC «Credenciales propias»): sin Addi activo→`PROVEEDOR_NO_CONFIGURADO`, nunca el Wompi de la plataforma; `getPaymentCredentials` sin cambios. — **tests/pagoCuotas/**
- [x] 1.5 [S] Ampliar `tests/sitios/pedidoTiendaCaracterizacion` con los casos `credito:addi` y `credito:sistecredito`. El golden de Wompi, contra entrega y formas manuales no cambia. — **tests/pagoCuotas/pedidoTiendaCuotas.test.js; golden de Wompi, contra entrega y manual idéntico (20/20)**
- [x] 1.6 [S] Vencimiento (CC «Vencimiento»): Wompi 60 min igual que hoy; Addi 150 min; Sistecrédito consulta antes de anular; aprobación tardía revive el pedido sin un segundo descuento. — **21-oct: `tests/pagoCuotas/reservaYPagar.test.js` corre el barrido real (recordatorio y cron de sitios), la consulta previa a Sistecrédito y la revivida tardía con el `aplicarPagoDeTienda` REAL y los espías de inventario (un solo `updateByPOS`). En `servicio.test.js` la revivida usa un doble (solo cuenta llamadas) y la gracia es de la función pura**
- [x] 1.7 [P] Contract test del write-set (CC «Inventario y catálogo intactos»): ningún camino del pago a cuotas escribe `products`, precios ni listas de precios. — **tests/pagoCuotas/**

## 2. Backend: proveedores y configuración

- [x] 2.1 [P] `PROVIDER_SCHEMAS.addi` y `.sistecredito` en `integrationConfigService.js`, con campos sensibles y «Probar conexión». — **hecho en rama**
- [x] 2.2 [P] Bandera `storeInstallmentPayments` en `companyFeatureFlags.js` (dueño: Daniel; fecha de retiro) y el interruptor de la conciliación en `config/feature_flags`. — **hecho en rama**
- [x] 2.3 [P] A: `services/paymentGateway/providers/addiProvider.js` y `getStrictProvider`. **Éxito:** 1.1 y 1.4 en verde. — **hecho en rama**
- [x] 2.4 [P] S: `providers/sistecreditoProvider.js`. **Dep.:** 0.3. **Éxito:** 1.3 en verde. — **hecho en rama sobre documentación no oficial; se revisa con 0.3**
- [x] 2.5 [P] `tienda.pagoCuotas` en `utils/siteBlocks.js` y `cuotas` en `GET /v1/sites/venta-config`. — **hecho en rama**

## 3. Backend: pedido, notificaciones y ciclo

- [ ] 3.1 [S] `crearPedido`: familia `credito:<proveedor>`, validación del rango, documento obligatorio, referencia `CUO-` e intento en `pagoTienda`. **Éxito:** 1.5 en verde. Diff aprobado. — **listo y probado (con el total final, ciudad y dirección y las reglas de 7.4); falta el diff aprobado**
- [ ] 3.2 [S] A: ruta `POST /v1/sites/public/pago/addi` (crudo → auth → validar → `aplicarPagoDeTienda` → eco). **Éxito:** 1.2 en verde. — **listo y probado; falta el diff aprobado**
- [ ] 3.3 [S] S: ruta `/v1/sites/public/pago/sistecredito` y ruta de URL pendiente. **Dep.:** 2.4. — **listo y probado sobre la documentación no oficial; falta el diff aprobado y 0.3**
- [ ] 3.4 [S] `vencerReservasDeTienda` con vencimiento por proveedor. **Éxito:** 1.6 en verde. Diff aprobado. — **listo y probado (con 7.1 y 7.2); falta el diff aprobado**
- [ ] 3.5 [S] `retomarPago` y `conciliarAlVolver` respetan `pagoTienda.proveedor`; el recordatorio excluye los pedidos a cuotas. — **listo y probado (con 7.3 y 7.6); falta el diff aprobado**
- [ ] 3.6 [S] S: conciliación periódica de Sistecrédito en `cronService`, con interruptor. — **listo y probado: cron de sitios, `config/feature_flags.pagoCuotasConciliacion`, sin lease (design.md 10), marca `conciliarSistecredito` y hora de gracia (7.5); falta el diff aprobado**
- [ ] 3.7 Observabilidad (Art. VII): logs con `correlationId`, métricas y alertas de `design.md`; prueba de que no se registran documento, celular ni dirección. — **hecho y probado: `correlationId` en cada línea del intento y alertas en `pagoTienda.alertas` (monto distinto, estado desconocido, consulta que no coincide, doble aprobación, aprobado sobre anulado). Falta (tablero): métricas `pago_cuotas_inicio`/`pago_cuotas_resultado` y la alerta de credenciales repetidas**

## 4. Checkout y vitrina (backend render)

- [ ] 4.1 [S] `utils/siteTienda.js`: opción «Paga a cuotas con …», deshabilitada fuera de rango, documento obligatorio, CC para Addi y redirección o espera de la URL. — **listo y probado (8.3); falta el diff aprobado y la revisión en navegador (4.3)**
- [x] 4.2 [P] `utils/siteHtml.js` y el pie (`sites.js`): etiqueta de texto en la ficha, el carrito y el pie, solo para los medios activos. — **21-oct: ficha solo con los medios que ese precio y ese producto pueden usar (8.1); carrito con los medios en texto (8.4); pie igual. `tests/pagoCuotas/vitrinaCuotas.test.js`**
- [ ] 4.3 Revisión en el navegador a 1440 y 390 px de checkout, ficha y pie, sin texto invisible ni desplazamiento horizontal.

## 5. Seller (front)

- [x] 5.1 [P] Tarjetas «Addi» y «Sistecrédito» (grupo `cobrar`, bandera) y sus formularios con «Probar conexión». Coordinar con el trabajo en curso de facturación en Integraciones. — **hecho en rama; sin logos. «Guardar» espera la prueba exitosa: ver 8.6**
- [x] 5.2 [P] Editor de sitios → «Cómo te pagan»: interruptores, aviso si falta conectar y checklist. — **hecho en rama**
- [x] 5.3 [P] Detalle del pedido: bloque «Pago a cuotas» (proveedor, intentos, estado y aviso de anulación en el portal). — **en «Todos los pedidos» (panel y fila); POS y despachos no. Las alertas y el caso «pasó a Wompi» son la 9.8**
- [ ] 5.4 `npm run build:prod` sin errores; contar gradientes y primarios prohibidos en los módulos tocados (no deben subir). — **20-oct: build EXIT 0 y 0 → 0. 21-oct (grupo 8): `tsc --noEmit -p tsconfig.app.json` EXIT 0; gradientes y primarios igual que antes en lo tocado (editor 0 → 0, Integraciones sin cambios de estilo). Falta el build único de producción del final**

## 6. Piloto y cierre

- [ ] 6.1 A: compra completa en staging de Addi con el comercio piloto (aprobada, rechazada y abandonada).
- [ ] 6.2 S: con OK de Daniel, prueba en producción con `sandbox` y luego un pedido real de bajo valor, anulado en Credinet y documentado.
- [ ] 6.3 Encender la bandera en el comercio piloto (`scripts/set-company-feature.js`) con OK de Daniel.
- [ ] 6.4 Registrar la bitácora y el estado en `specs/CONTRACT.md` (D-517); comentario técnico y cierre del ticket 1233.
- [ ] 6.5 Retirar la bandera `storeInstallmentPayments` en su fecha (Art. XII).

## 7. Arreglos de la entrega (D-518, 2026-10-21) — servidor

Todas en `functions/`, sin commit. Pruebas: `tests/pagoCuotas/reservaYPagar.test.js` (14), `reglasComercio.test.js` (10) y `servicio.test.js` (30).

- [ ] 7.1 [S] Error 1: el barrido elige también las empresas con pedidos a cuotas vencidos (`recordarPagosPendientes`) y el cron de sitios barre las reservas de cuotas (`barrerReservasDeCuotas`, marca `pagoTienda.reservaCuotas`) aunque el recordatorio esté apagado. — **listo y probado; falta el diff aprobado**
- [ ] 7.2 [S] Error 10: Sistecrédito se consulta por cada intento sin resultado antes de anular (`consultarAntesDeAnular`). — **listo y probado; falta el diff aprobado**
- [ ] 7.3 [S] Error 3: `/pagar` lleva al intento vivo (revisión en la transacción, dos clics = una solicitud), tope de 5 intentos y reserva con tope de 2 reservas desde la creación; dos aprobaciones de intentos distintos (o cuotas + Wompi) se aplican una vez y dejan la alerta `doble_aprobacion`. — **listo y probado; falta el diff aprobado y que Daniel confirme las cifras de los topes**
- [ ] 7.4 [S] F2-41·4: reglas del comercio (mínimo, máximo, categorías con subcategorías; carrito mixto sin cuotas) en `integration_configs`, al ofrecer (`GET …/pago-cuotas?total=&ids=`) y en `crearPedido` (error 7 en el servidor: total final con envío y cupón). — **listo y probado; falta el diff aprobado. Formulario en el Seller y checkout: segundo agente**
- [ ] 7.5 [S] Error 4: la conciliación aplica la hora de gracia antes de descartar un pedido ya anulado; marca `conciliarSistecredito` que la propia conciliación quita. — **listo y probado; falta el diff aprobado**
- [ ] 7.6 [S] F2-41·5: correo de rechazo con `/pagar` (mismo proveedor o Wompi) una vez por pedido; `/pagar?medio=linea` con Wompi sobre el mismo pedido y la misma reserva; al aprobar, `formaDePago` «Pago en línea». — **listo y probado; falta el diff aprobado**
- [ ] 7.7 [S] Error 5 (servidor): ciudad y dirección obligatorias con cuotas, también con retiro en tienda; el reintento toma los datos de `facturacion` del pedido. — **listo y probado (reglasComercio.test.js y reservaYPagar.test.js); toca `crearPedido` y `/pagar`: falta el diff aprobado**
- [x] 7.8 Error 8 (servidor): `correlationId` y el estado «Esperando la respuesta de Addi» (`datosDeConfirmacion.esperaCuotas` y `pagado` en `GET …/pago-cuotas/:referencia/url`). Pintarlo en `/gracias` es de la vitrina. — **probado**
- [x] 7.9 Error 9: las dos aserciones de `scripts/test-sitios-publicacion.js` se actualizan sin perder su intención (contra entrega y formas manuales no vencen; el pago pendiente se marca). Vuelve a las 5 fallas de la base. Los arneses de `tests/sitios` que corren `crearPedido` o `aplicarPagoDeTienda` reciben el módulo `pagoCuotas` (compraAhoraPedido, pedidoRetiroCantidades, pedidoReservaDuplicada, pagoTiendaConciliacionBase).
- [x] 7.10 Vitrina, páginas legales, checklist F0-01 y Seller (errores 2, 6, 7 en el checkout, 11; F2-41·2 y ·3; formulario de reglas). — **pasa al grupo 8**

## 8. Arreglos de la entrega (D-518, 2026-10-21) — vitrina y Seller

Backend en `functions/`, front en el Seller; sin commit. Pruebas nuevas: `tests/pagoCuotas/vitrinaCuotas.test.js` (16) y `conexionProbada.test.js` (7); `reservaYPagar.test.js` sube a 15 (gracias de un pedido rechazado y de uno vencido). Front: solo type-check.

- [x] 8.1 Error 2: la ficha anuncia un medio solo si ESE precio y ESE producto caben en el rango del proveedor y en las reglas del comercio (`cuotasParaFicha` → `evaluarMedio`, tope de 3 s; sin respuesta, no sale). — **vitrinaCuotas.test.js**
- [ ] 8.2 F2-41·2: widget oficial de Addi (`<addi-product-widget>`, módulo de `cdn.addi.com`, design.md 20) en la ficha y en el carrito, solo con la bandera, Addi encendido y activo en PRODUCCIÓN; la política de la página se abre a sus dominios solo en esos sitios (`siteHtml.cspCuotas`). Sistecrédito, solo la etiqueta. — **código y pruebas sin navegador en verde (vitrinaCuotas.test.js). Queda abierta: nadie ha visto el widget pintado bajo la política (4.3), la política ya no abre Split.io (9.7) y el uso en el carrito no tiene documentación de Addi (0.2)**
- [ ] 8.3 [S] Checkout (errores 5 y 7): dirección y ciudad también con retiro al elegir cuotas; las cuotas se vuelven a revisar al cambiar la ciudad, el cupón o el retiro, con el total final y los productos (`&ids=`), y se dice qué producto queda fuera de las categorías. Arreglo nuevo: la cédula se validaba con `/^d{5,11}$/` (el `\d` se perdía dentro de la plantilla) y rechazaba toda cédula. — **listo y probado; falta el diff aprobado**
- [x] 8.4 F2-41·3: el carrito lista en texto los medios que la tienda acepta (y los a cuotas que ese carrito puede usar); sin logos hasta tener el kit de marca y la constancia. Todo el código de cuotas del script de la tienda sale SOLO con medios a cuotas: sin ellos el script es idéntico byte a byte al de antes de D-517, y `fichaEspecificaciones.test.js` vuelve a verde (los estilos de cuotas van en la página que los usa, no en `/estilos.css`).
- [x] 8.5 Error 11: las páginas legales (privacidad, devoluciones, términos y envíos) cuentan el pago a cuotas mientras esté activo; el checklist de publicación F0-01 cuenta un medio a cuotas activo como medio de pago (servidor y editor). — **21-oct (9.6): la sección ya no se guarda al generar la página; el render la pone con los medios vigentes y quita cualquier copia guardada (`conSeccionesDeCuotas`). vitrinaCuotas.test.js**
- [ ] 8.6 [S] Error 6: Addi y Sistecrédito solo quedan activos con una prueba de conexión exitosa del SERVIDOR con lo que se guarda (`IntegrationConfigService.probarAntesDeActivar`): nueva conexión, credencial cambiada o reactivación; cambiar solo las reglas no prueba; si la configuración cambia entre la prueba y la escritura, 409. `saveConfiguration` usa la empresa del token. Seller: «Guardar» espera la prueba exitosa con esos mismos datos. — **listo y probado (conexionProbada.test.js); falta el diff aprobado (toca el guardado de todas las integraciones)**
- [ ] 8.7 F2-41·4 (Seller): en «Cómo te pagan», reglas de cada proveedor conectado (mínimo y máximo propios validados contra su rango, categorías del árbol con subcategorías). Servidor: `GET /v1/sites/pago-cuotas/reglas` y `PUT …/reglas/:proveedor` (administrador; categorías del árbol; nunca devuelve credenciales). — **servidor probado (vitrinaCuotas.test.js); panel con tsc en verde; falta la revisión en navegador (4.3)**
- [ ] 8.8 [S] F2-41·5 visible: `/gracias` dice «Esperando la respuesta de Addi» y pregunta sola; si no aprobó, con la firma del pedido ofrece «Intentar de nuevo» y «Pagar con tarjeta, PSE o Nequi» (sin firma, remite al correo); el regreso del proveedor y `/pagar` llevan a `/gracias` con la firma; las páginas de parada de `/pagar` ofrecen el siguiente paso. La confirmación de un pedido a cuotas no va a cachés compartidas. — **listo y probado (vitrinaCuotas.test.js, reservaYPagar.test.js); falta el diff aprobado (toca /pagar)**

## 9. Hallazgos de la revisión (D-518, 2026-10-21)

Dos revisores volvieron al código después de los grupos 7 y 8. Todo sin commit. Pruebas: `reservaYPagar.test.js` (23), `pedidoTiendaCuotas.test.js` (9), `vitrinaCuotas.test.js` (16), `servicio.test.js` (30); golden del pedido de tienda 20/20; `tests/sitios` 54/57 (las 3 rojas de la base, con los mismos subtests); `scripts/test-sitios-publicacion.js` con las mismas 5 fallas de la base `d954a833^`.

- [ ] 9.1 [S] Error 3, Wompi y crédito a la vez: con un enlace de Wompi vigente del pedido (`enlaceDePasarelaVigente`) `/pagar?medio=cuotas` no abre otra solicitud (409 «Seguir con tarjeta, PSE o Nequi»). El intento guarda su vencimiento en `pagoTienda.cuotasVenceEn` y ya no pisa `pagoTienda.venceEn` del enlace de Wompi; el regreso de Wompi se concilia por `linkId`, no por el último medio elegido. La página de gracias de un pedido que pasó a Wompi no dice «Addi no aprobó». — **listo y probado; falta el diff aprobado (`/pagar`)**
- [ ] 9.2 [S] Error 3, Sistecrédito → Wompi: antes de abrir Wompi se consulta cada intento sin resultado (`revisarAntesDeCambiarDeMedio`): aprobado → gracias; en curso o sin confirmar → 409. La conciliación sigue consultando un pedido YA pagado con intentos de Sistecrédito abiertos (reserva de Sistecrédito + hora de gracia desde cada intento) para dejar la alerta `doble_aprobacion`. — **listo y probado; falta el diff aprobado y confirmar con G-ALI (0.3) la vida de la transacción (15 min)**
- [ ] 9.3 [S] Vencimiento de cuotas en transacción (`anularReservaDeCuotas`): se vuelve a leer el pedido y se marca anulado con `pagoTienda.devolucionReserva: "pendiente"` ANTES de devolver; un pago que entra en el medio revive sin descontar y el barrido descuenta una vez al terminar (`terminarDevolucionDeCuotas`); si la devolución falla, el pedido vuelve a quedar apartado; una devolución a medias se retoma. Wompi sigue por su camino de siempre (golden idéntico). — **listo y probado; falta el diff aprobado (D-206)**
- [ ] 9.4 [S] Error 3, reserva: `iniciarIntento` no abre una solicitud que no quepa en lo que le queda a la reserva (`SIN_TIEMPO`), ni sobre un pedido pagado o vencido; `/pagar` con la reserva vencida responde 410 aunque quede una solicitud viva. — **listo y probado; falta el diff aprobado y que Daniel confirme las cifras de los topes (7.3)**
- [ ] 9.5 [S] Error 1: `crearPedido` deja `pagoTienda.reservaCuotas` desde que nace el pedido (si el primer intento no alcanza a registrarse, el cron igual lo vence). El aviso de rechazo ya no cuenta como venta recuperada por el recordatorio (`recuperadoPorRecordatorio`). — **listo y probado; falta el diff aprobado (`crearPedido`, `aplicarPagoDeTienda`)**
- [x] 9.6 Error 11: la sección de cuotas de las páginas legales no se guarda; se pinta con los medios vigentes y se quita si se apagan o cambian (criterio c). — **vitrinaCuotas.test.js**
- [x] 9.7 F2-41·2: la política de la página abre solo dominios de Addi (sin Split.io, que no es «su dominio»); el widget no se carga con una sesión de cliente mayorista abierta ni al entrar con el enlace de acceso; la ficha evalúa los proveedores a la vez (3 s en total, no por proveedor). — **vitrinaCuotas.test.js; si en 4.3 el widget no funciona sin Split.io, decide Daniel**
- [ ] 9.8 Seller: el bloque «Pago a cuotas» muestra las alertas de pago (doble cobro, monto distinto, pago sobre pedido anulado, consulta que no coincide, estado desconocido) con dónde anular, y sigue visible si el comprador pasó a Wompi. Integraciones: reactivar un Addi o Sistecrédito desactivado también espera «Probar conexión». Gracias sin firma no promete un correo que no salió. — **`tsc` en verde; falta la revisión en navegador (4.3)**

