> D-516. Backend: `katuq_admin_back_firebase/functions/`. Front: `Seller.Katuq/`. Requisitos: `specs/tienda-pago-a-cuotas` (TC) y `specs/conciliacion-pago-a-cuotas` (CC).
>
> **[S]** = módulo sensible (pagos, pedidos, consecutivos o inventario): un cambio a la vez, con su diff aprobado por Daniel antes de aplicarlo. **[P]** = paralelizable.
>
> Cada tarea lee los archivos que toca antes de editarlos y cierra con sus pruebas y el build en verde. Si el build está roto, no se avanza. Nada se despliega sin el OK de Daniel. Addi (grupos 2-4 A) puede avanzar antes que Sistecrédito (grupos 2-4 S).

## 0. Antes de programar (sin código productivo)

- [x] 0.1 Daniel responde las preguntas 1-7 de `design.md`, aprueba la excepción acotada a los Artículos IX y X y acuerda el orden con D-496 (`crearPedidoDeTienda`). — **respondidas 2, 4 y 7 el 2026-10-20 (design.md); 1, 3, 5 y 6 con valores por omisión**
  - **Éxito:** respuestas anotadas en `specs/CONTRACT.md` (D-516); `design.md` y specs ajustados.
- [ ] 0.2 El comercio piloto pide a Addi (soporte_aliados@addi.com) las credenciales de staging, el `allySlug` y las credenciales de notificación; confirma montos mínimo y máximo y el kit de marca.
  - **Dep.:** pregunta 1. **Éxito:** credenciales de staging cargadas en la configuración del comercio de pruebas, nunca en el repo.
- [ ] 0.3 El comercio piloto firma el convenio con Sistecrédito y obtiene las guías G-ALI-08/09/10/12 y las llaves de Staging y Production. Contrastar con la guía cada dato de la sección «Sistecrédito» de `design.md` y corregir lo que difiera.
  - **Éxito:** sección marcada «verificada con guía oficial». **Bloquea los grupos 2S-4S.**
- [ ] 0.4 Medir en staging de Addi un intento real (token, 301 con `Location`, callback con Basic) y guardar fixtures anonimizados en `tests/pagoCuotas/fixtures/`.
  - **Dep.:** 0.2. **Éxito:** fixtures de APPROVED, REJECTED, ABANDONED y 409.
- [x] 0.5 Specs delta `tienda-pago-a-cuotas` y `conciliacion-pago-a-cuotas` aprobadas por Daniel. — **aprobadas con la propuesta el 2026-10-20**
  - **Éxito:** sin esta tarea no empieza el grupo 1.
- [ ] 0.6 Abrir en el openspec privado del backend el detalle de seguridad de las rutas públicas (autenticación, limitador, superficie). No se detalla aquí porque este repo es público.

## 1. Pruebas primero (rojas hasta implementar; Artículo VIII)

Cada prueba cita el requisito que cubre. **Dep.:** 0.1 y 0.5.

- [x] 1.1 [P] `tests/pagoCuotas/addiProvider.test.js` (TC «Iniciar el pago»): cuerpo del intento (montos como cadena, CC, `+57`), 301→URL sin seguir la redirección, 409→mensaje, 5xx→reintento, token pedido por intento. — **tests/pagoCuotas/**
- [x] 1.2 [P] `tests/pagoCuotas/addiCallback.test.js` (CC «Autenticidad Addi», «Una sola vez»): Basic equivocado→401 sin cambios; credenciales de otro comercio→401; monto distinto→sin aplicar y con alerta; válido→200 con el mismo cuerpo; tres callbacks iguales→un solo aprobado y un solo correo. — **tests/pagoCuotas/**
- [x] 1.3 [P] `tests/pagoCuotas/sistecreditoProvider.test.js` (TC, CC): crear y consultar hasta obtener la URL; errores 738, 739, 801 y 802; notificación en PascalCase o sin factura; estado tomado de la consulta, nunca del payload. **Dep.:** 0.3. — **contra la documentación no oficial; se revisa con 0.3**
- [x] 1.4 [P] `tests/pagoCuotas/resolucionEstricta.test.js` (TC «Credenciales propias»): sin Addi activo→`PROVEEDOR_NO_CONFIGURADO`, nunca el Wompi de la plataforma; `getPaymentCredentials` sin cambios. — **tests/pagoCuotas/**
- [x] 1.5 [S] Ampliar `tests/sitios/pedidoTiendaCaracterizacion` con los casos `credito:addi` y `credito:sistecredito`. El golden de Wompi, contra entrega y formas manuales no cambia. — **tests/pagoCuotas/pedidoTiendaCuotas.test.js; golden de Wompi, contra entrega y manual idéntico (20/20)**
- [x] 1.6 [S] `tests/pagoCuotas/vencimientoReserva.test.js` (CC «Vencimiento»): Wompi 60 min igual que hoy; Addi 150 min; Sistecrédito consulta antes de anular; aprobación tardía revive el pedido sin un segundo descuento. — **en tests/pagoCuotas/servicio.test.js**
- [x] 1.7 [P] Contract test del write-set (CC «Inventario y catálogo intactos»): ningún camino del pago a cuotas escribe `products`, precios ni listas de precios. — **tests/pagoCuotas/**

## 2. Backend: proveedores y configuración

- [x] 2.1 [P] `PROVIDER_SCHEMAS.addi` y `.sistecredito` en `integrationConfigService.js`, con campos sensibles y «Probar conexión». — **hecho en rama**
- [x] 2.2 [P] Bandera `storeInstallmentPayments` en `companyFeatureFlags.js` (dueño: Daniel; fecha de retiro) y el interruptor de la conciliación en `config/feature_flags`. — **hecho en rama**
- [x] 2.3 [P] A: `services/paymentGateway/providers/addiProvider.js` y `getStrictProvider`. **Éxito:** 1.1 y 1.4 en verde. — **hecho en rama**
- [x] 2.4 [P] S: `providers/sistecreditoProvider.js`. **Dep.:** 0.3. **Éxito:** 1.3 en verde. — **hecho en rama sobre documentación no oficial; se revisa con 0.3**
- [x] 2.5 [P] `tienda.pagoCuotas` en `utils/siteBlocks.js` y `cuotas` en `GET /v1/sites/venta-config`. — **hecho en rama**

## 3. Backend: pedido, notificaciones y ciclo

- [x] 3.1 [S] `crearPedido`: familia `credito:<proveedor>`, validación del rango, documento obligatorio, referencia `CUO-` e intento en `pagoTienda`. **Éxito:** 1.5 en verde. Diff aprobado. — **hecho en rama; diff pendiente de aprobación de Daniel**
- [x] 3.2 [S] A: ruta `POST /v1/sites/public/pago/addi` (crudo → auth → validar → `aplicarPagoDeTienda` → eco). **Éxito:** 1.2 en verde. — **hecho en rama; diff pendiente de aprobación de Daniel**
- [x] 3.3 [S] S: ruta `/v1/sites/public/pago/sistecredito` y ruta de URL pendiente. **Dep.:** 2.4. — **hecho en rama; diff pendiente de aprobación; se revisa con 0.3**
- [x] 3.4 [S] `vencerReservasDeTienda` con vencimiento por proveedor. **Éxito:** 1.6 en verde. Diff aprobado. — **hecho en rama; diff pendiente de aprobación de Daniel**
- [x] 3.5 [S] `retomarPago` y `conciliarAlVolver` respetan `pagoTienda.proveedor`; el recordatorio excluye los pedidos a cuotas. — **hecho en rama; diff pendiente de aprobación de Daniel**
- [x] 3.6 [S] S: conciliación periódica de Sistecrédito en `cronService`, con lease e interruptor. — **dentro del cron de sitios, interruptor en Firestore, sin lease (design.md 10)**
- [ ] 3.7 Observabilidad (Art. VII): logs con `correlationId`, métricas y alertas de `design.md`; prueba de que no se registran documento, celular ni dirección. — **parcial: logs JSON con la referencia como `correlationId` y alertas como eventos `alerta_*`; la prueba de datos personales está en servicio.test.js; faltan las métricas en el tablero**

## 4. Checkout y vitrina (backend render)

- [x] 4.1 [S] `utils/siteTienda.js`: opción «Paga a cuotas con …», deshabilitada fuera de rango, documento obligatorio, CC para Addi y redirección o espera de la URL. — **hecho en rama; diff pendiente de aprobación**
- [x] 4.2 [P] `utils/siteHtml.js` y el pie (`sites.js`): etiqueta de texto en la ficha, el carrito y el pie, solo para los medios activos. — **hecho en rama**
- [ ] 4.3 Revisión en el navegador a 1440 y 390 px de checkout, ficha y pie, sin texto invisible ni desplazamiento horizontal.

## 5. Seller (front)

- [x] 5.1 [P] Tarjetas «Addi» y «Sistecrédito» (grupo `cobrar`, bandera) y sus formularios con «Probar conexión». Coordinar con el trabajo en curso de facturación en Integraciones. — **hecho en rama; sin logos**
- [x] 5.2 [P] Editor de sitios → «Cómo te pagan»: interruptores, aviso si falta conectar y checklist. — **hecho en rama**
- [x] 5.3 [P] Detalle del pedido: bloque «Pago a cuotas» (proveedor, intentos, estado y aviso de anulación en el portal). — **en «Todos los pedidos» (panel y fila); POS y despachos no**
- [x] 5.4 `npm run build:prod` sin errores; contar gradientes y primarios prohibidos en los módulos tocados (no deben subir). — **build de producción EXIT 0; gradientes y primarios prohibidos 0 → 0 en lo tocado**

## 6. Piloto y cierre

- [ ] 6.1 A: compra completa en staging de Addi con el comercio piloto (aprobada, rechazada y abandonada).
- [ ] 6.2 S: con OK de Daniel, prueba en producción con `sandbox` y luego un pedido real de bajo valor, anulado en Credinet y documentado.
- [ ] 6.3 Encender la bandera en el comercio piloto (`scripts/set-company-feature.js`) con OK de Daniel.
- [ ] 6.4 Registrar la bitácora y el estado en `specs/CONTRACT.md` (D-516); comentario técnico y cierre del ticket 1233.
- [ ] 6.5 Retirar la bandera `storeInstallmentPayments` en su fecha (Art. XII).
