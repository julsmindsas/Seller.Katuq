## 0. Decisiones y checkpoints

- [x] 0.1 Propuesta y spec aprobadas por Daniel (2026-10-23), con las cuatro preguntas respondidas: para todos y sin bandera, «Cambiar» conserva al cliente, cupón plegado y una sola línea con «Editar precio» abierto.
- [x] 0.2 Aprobación de `design.md` y de este `tasks.md`. Sin esa aprobación no se toca código.
  - *2026-10-23:* aprobación confirmada por la sesión principal al encargar la implementación.
- [x] 0.3 Reservado como **D-540** (commit `2316a091`). Reservar **D-XXX** en `specs/CONTRACT.md`. Lo hace la sesión principal, revisando antes el contrato en `origin`, porque el local puede ir atrasado.

## 1. Verificación previa (solo lectura, antes de editar)

- [x] 1.1 Hacer `git pull` y confirmar que la punta incluye `8510a712`. Revisar con `git status` que ninguna otra sesión tenga cambios sin commitear en `src/app/components/ventas/pos2/` ni en `src/styles.scss`. Si los hay, coordinar con esa sesión y no pisarlos. **Hecho cuando:** el working copy de `pos2` está limpio, o lo que tiene está identificado y la otra sesión está avisada.
  - *2026-10-23 (implementación):* `git fetch` dejó HEAD = `origin/feature/venta-asistida-mejorada` (`1aeb910d`, 0 adelante / 0 atrás), que ya incluye `8510a712`. `git pull --rebase` no corrió por los cambios sin commitear de otra sesión en `specs/CONTRACT.md`; no se usó stash y se trabajó sobre ese HEAD. `pos2/` y `src/styles.scss` estaban limpios.
- [ ] 1.2 Medir la versión actual con `npm start` y DevTools a 1366×768 (alto de ventana de 620 y de 650 px), con cliente asociado y 5 productos. Anotar:
  - `innerHeight` y el scroll de página (`document.scrollingElement.scrollHeight − innerHeight`);
  - el alto de `.pos-shell`, de `.pos-ticket` y de cada pieza del panel.

  Guardar capturas del «antes». **Hecho cuando:** la tabla de medidas está en el scratchpad y confirma o corrige que el panel mide `H − 179` y que hoy hay scroll de página por el piso de 560 px. Si no hay scroll de página, en la tarea 2.1 se omite el cambio del piso.
- [ ] 1.3 Capturar los pedidos «antes» en la empresa demo FLORECER, con `*/v1/orders/create` bloqueado en DevTools. El front local apunta a producción, así que hay que confirmar en Network que el `create` sale como bloqueado antes de cobrar. La venta de referencia lleva 5 productos y uno de ellos con IVA 0 % o Desc. 10 % (D-536), y se cobra:
  - con Efectivo;
  - con Métodos electrónicos, en una opción que no sea Wompi;
  - con E-wallet.

  Además:
  - sin cliente, anotar el aviso de cobro («Debes buscar o crear un cliente»);
  - con facturación «Consumidor Final», anotar el resumen de facturación.

  No crear ni editar clientes. **Hecho cuando:** hay 3 payloads JSON y el monto del modal de efectivo guardados en el scratchpad, nunca en el repo.

## 2. Panel y un solo scroll

- [x] 2.1 `pos.component.scss` (D2):
  - `.pos-ticket { width: clamp(400px, 32%, 440px) }`;
  - en escritorio, `.pos-shell { min-height: 0 }`, según el resultado de 1.2;
  - barra de scroll fina en `.pos-ticket` desde 1001 px.

  **Hecho cuando:** el panel mide 400 px a 1366 y 440 px a 1920, a 390 px nada cambia y el build pasa.
  - *Desvío:* el `min-height: 0` del `.pos-shell` va en `src/styles.scss`, en el bloque `body.katuq-pos-escritorio` que ya fija su alto (por indicación de la sesión principal), y no en `pos.component.scss`. Se aplicó sin la medición de 1.2, que sigue pendiente. Las medidas del «Hecho cuando» se verifican en 6.3, 6.6 y 6.7.
- [x] 2.2 `pos-checkout.component.scss` (D6):
  - desde 1001 px, `app-cart-summary { flex: 1 1 0; min-height: 0 }`;
  - las reglas de `:host(.ticket-apretado)`;
  - el `min-height: 360px` y el `min-height: 770px` de móvil se quedan como están.

  **Hecho cuando:** en escritorio solo la lista tiene `overflow-y: auto`.
  - *Desvío:* `:host(.ticket-apretado)` lleva además `flex-shrink: 0`: sin eso el host se encogía dentro de `.pos-ticket` (tiene `min-height: 0`) y el panel no llegaba a desplazarse.
- [x] 2.3 `pos-checkout.component.ts` (D6):
  - `ResizeObserver` sobre el panel, el cliente, el título, el cupón, el TOTAL y los pagos;
  - umbral de 104 px para entrar al modo y de 128 px para salir;
  - `Renderer2` para la clase `ticket-apretado`, solo con `matchMedia('(min-width: 1001px)')`;
  - `disconnect()` en `ngOnDestroy` y nada si no existe `ResizeObserver`.

  Sin `setTimeout`. **Hecho cuando:** compila y, al achicar la ventana, el modo cambia una sola vez, sin parpadeo ni errores de `ResizeObserver` en la consola.
  - *Desvío:* el cambio de clase se aplica en el cuadro siguiente (`requestAnimationFrame`, no `setTimeout`) y el observador corre fuera de la zona de Angular. Al entrar al modo aparece la barra del panel y cambia el ancho de las piezas vigiladas; aplicado dentro del callback, el navegador avisaría «ResizeObserver loop completed with undelivered notifications». El comportamiento en navegador (una sola transición, sin parpadeo) se verifica en 6.5.
- [x] 2.4 `cart-summary.component.scss`: las reglas de `:host-context(.ticket-apretado)`, con la lista en `flex: none; overflow: visible`. **Hecho cuando:** en modo «panel completo» hay una sola barra, la del panel.
  - Además de la lista, `.card-body` y `.order-quantity` pasan a `flex: none` en ese modo, para que todo tome su alto natural.

## 3. Cliente plegable

- [x] 3.1 `customer-section.component.html` (D3):
  - agregar `.cli-linea` con `.cli-resumen` y `.cli-cambiar`;
  - agregar `.cli-nuevo`;
  - las clases `cli-oculto` y `cli-abierto`;
  - `(keydown.escape)` en el `p-autoComplete`.

  No se mueve ni se cambia ningún elemento ni binding existente. **Hecho cuando:** el diff solo agrega.
  - «Nuevo» lleva el ícono `fa-plus`, como el botón de hoy. Esc llama a `cancelarCambio(true)` (ver 3.2).
- [x] 3.2 `customer-section.component.ts` (D3):
  - `desplegado`, `cambiando` e `inicialCliente`;
  - `cambiarCliente()`, con `detectChanges` antes del foco;
  - `cancelarCambio()`;
  - `HostListener('document:click')` con `composedPath()` y `(focusout)`;
  - el reinicio de estados en la suscripción a `customer$` (`desplegado` se reinicia solo si cambia el `cd` o el cliente es `null`).

  No se llama a `setCustomer` ni a `clearCustomer` desde código nuevo. **Hecho cuando:** compila y `onClienteSelect`, `openModal`, `editarCliente`, `limpiar` y `abrirFacturacion` siguen sin cambios.
  - *Desvío menor:* `cancelarCambio(devolverFoco)`: con Esc, después de cancelar, el foco vuelve a «Cambiar» para no perderlo en un campo oculto. Clic fuera y foco fuera cancelan sin mover el foco.
- [x] 3.3 `customer-section.component.scss`: el bloque de escritorio de D3, con la línea de 47 px, el buscador de 38 px, el aviso de facturación en el par de alerta, los botones secundarios y `:focus-visible`. **Hecho cuando:** a 1366 px la línea plegada mide 47 ±3 px y a 390 px el cliente se ve igual que en la captura de 1.2.
  - *Desvío:* la tarjeta desplegada pasa en escritorio a superficie lila neutra (`#faf9fe`, borde `#ececf4`, radio 11 px) en vez del verde de hoy, porque se ocultan «Cliente asociado» y el nombre; el contacto queda en `#6b6890` con íconos acento. En móvil sigue verde. La fila del buscador mide 7 + 38 + 7 + 1 = 53 px (el diseño estimaba 54). Medidas en navegador: 6.3 y 6.7.
- [ ] 3.4 Probar a mano en escritorio:
  - asociar un cliente: aparece la línea plegada y el buscador desaparece;
  - tocar la línea: se despliegan las acciones, la facturación y el contacto; tocarla otra vez la pliega;
  - «Cambiar» + Esc: queda el mismo cliente y la misma facturación «Consumidor Final» de 1.3;
  - «Cambiar» + clic en el catálogo: también cancela;
  - «Cambiar» + escoger otro cliente: queda el nuevo y su facturación predeterminada, como hoy;
  - un cliente con facturación incompleta: el aviso se ve plegado;
  - quitar al cliente: vuelven el buscador y «Nuevo» en una fila;
  - abrir «Nuevo» y «Editar» y cerrarlos sin guardar.

  **Hecho cuando:** pasan todos los casos.

## 4. Filas compactas y editor plegado

- [x] 4.1 `cart-summary.component.html` (D4):
  - `.fila-meta` con «Editar precio» y `.fila-marca`;
  - `.fila-subtotal` y `.fila-cu`;
  - `[title]` en el nombre;
  - `[class.fila-abierta]`.

  **Hecho cuando:** el diff muestra iguales los bindings de la lista de D4: `*ngFor` con `track item`, miniatura, nombre, `precioUnitario`, `lineaEditada`, `posRemoveCartItem`, los dos `updatePOSQuantity`, `{{item.cantidad}}` y `<app-pos-linea-precio [item]="item">`.
  - Revisado en el diff: solo se agregan `[class.fila-abierta]`, `[title]`, `.fila-meta`, `.fila-subtotal`, `.fila-cu` y comentarios; los bindings de la lista quedan iguales.
- [x] 4.2 `cart-summary.component.ts`:
  - `lineaAbierta` y `alternarEditor(item, ev)`, que deja una sola abierta, llama a `detectChanges` y luego a `scrollIntoView`;
  - `subtotalLinea(item)` con `precioUnitarioPos`;
  - inyectar `ChangeDetectorRef`.

  **Hecho cuando:** compila sin tocar `CartService`.
- [x] 4.3 `cart-summary.component.scss`: la grilla de escritorio de D4, con `display: contents`; −, + y quitar de 32×32 px; el editor oculto salvo en `.fila-abierta`; `scrollbar-gutter: stable`. `pos-linea-precio` no se toca. **Hecho cuando:** a 1366 px una fila mide de 48 a 51 px (máximo 56) y a 390 px las líneas se ven como en la captura de 1.2, con el editor abierto.
  - Los −/+ van con fondo transparente dentro del contenedor lila (el diseño no lo fijaba). Se anula el `margin-bottom: 15px` heredado del bloque viejo de `.order-details-wrapper`. Se agrega `:focus-visible` a −, + y quitar para la 6.9. Medidas en navegador: 6.3 y 6.7.
- [ ] 4.4 Probar a mano:
  - 3 unidades de un producto de $12.000: la fila muestra $12.000 c/u y $36.000;
  - abrir «Editar precio» en una línea y luego en otra: la primera se cierra;
  - IVA 0 % y cerrar: la fila queda con la marca «Editado», el precio nuevo y el TOTAL actualizado;
  - escribir un precio base y tocar el «Editar precio» de otra línea: el precio queda confirmado;
  - «Restaurar» funciona igual que hoy;
  - −, + y quitar funcionan igual que hoy, y − en 1 quita la línea, como hoy;
  - dos productos con el mismo nombre se siguen sumando en una línea, como hoy.

  **Hecho cuando:** pasan todos los casos.

## 5. Pie compacto

- [x] 5.1 `cart-summary.component.html` y `.ts` (D5):
  - `tkt-unidades` y `textoUnidades`, que lee `getPOSCantidad()`;
  - la clase `fila-cantidad`;
  - los getters `descuentoTicket`, `cuponTicket` y `subtotalTicket`, con `[class.fila-cero]`;
  - «Agregar cupón» con `alternarCupon()`, `[class.cupon-abierto]` y `#cuponInput`.

  `applyCoupon()` no cambia. **Hecho cuando:** compila y en móvil las filas Cantidad, Descuento $0.00, Cupón de descuento $0.00 y Subtotal se ven como antes.
  - «Agregar cupón» va dentro de la fila del TOTAL (la última `.item-number`) para quedar debajo de «Total»; su texto no cambia al abrir, el estado lo indica `aria-expanded`.
- [x] 5.2 `cart-summary.component.scss`: el título de 30 px, el TOTAL plano de 43 px con el monto en 24 px, y el cupón oculto salvo con `.cupon-abierto`. **Hecho cuando:** se cumplen esas medidas a 1366 px.
  - Código hecho con esas medidas (6 + 20 + 4 = 30 px; 8 + 30 + 4 + 1 = 43 px). Medidas en navegador: 6.3.
- [x] 5.3 `payment-selector`:
  - en el HTML, solo `role="group" aria-label="Cobrar con"` en `.icons`;
  - en el SCSS de escritorio, «Cobrar con» visualmente oculto y los 3 botones de 42 px en una fila.

  Los handlers y `selectedMethod` no cambian. **Hecho cuando:** los pagos miden 56 ±3 px a 1366 px y a 390 px se ven como en 1.2.
  - Se agrega `:focus-visible` a los tres botones de pago para la 6.9. Medidas en navegador: 6.3 y 6.7.
- [ ] 5.4 Probar a mano:
  - 3 unidades + 2 unidades: el título dice «5 unidades»; con una sola, «1 unidad»;
  - el pie no muestra filas en $0 ni el Subtotal repetido;
  - «Agregar cupón» abre el campo con el foco puesto y «Aplicar» hace lo mismo que hoy (solo escribe en la consola);
  - cada botón de pago abre su modal de hoy.

  **Hecho cuando:** pasan todos los casos.

## 6. Verificación

- [x] 6.1 `npm run build:prod` sin errores (solo se acepta el aviso de tamaño que ya existe). Si no se va a publicar enseguida, revertir el cambio de versión de `environment.ts`, `environment.prod.ts` y `assets/version.json`. **Hecho cuando:** el build termina en verde y en el diff solo quedan los archivos de `pos2`.
  - *Desvío (indicado por la sesión principal):* en vez de `npm run build:prod` se corrió `ng build --configuration=production --output-path <scratchpad>/build-d540`, que no pasa por `prebuild:prod`: no cambia la versión, `environment*.ts`, `assets/version.json` ni `dist/`.
- [x] 6.2 Contar en `src/app/components/ventas/pos2`:
  - `(linear|radial)-gradient(`;
  - los primarios prohibidos (`#2196f3`, `#4361ee`, `#2563eb`, `#5c6ac4`, `#667eea`, `#3b82f6`, `#1d4ed8`, `#6366f1`, `#1976d2`, `#7366ff` y `rgba(102,126,234`);
  - las clases nuevas que contengan «p-».

  **Hecho cuando:** gradientes 0, primarios 0 (la base de hoy es 0 y 0) y clases con «p-» 0.
  - *2026-10-23:* antes 0 gradientes y 0 primarios en `pos2`; después 0 y 0 (también 0 en el bloque D-540 de `styles.scss`). Clases nuevas con «p-»: 0 (las únicas `.p-*` del diff son selectores de PrimeNG que ya existían en el `::ng-deep` del buscador).
- [ ] 6.3 Criterio de aceptación a 1366×768, con el alto de ventana en 620 y en 650 px: cliente con facturación y 5 productos, los cinco con nombre de dos líneas. Repetir con un ticket de $9,999,999.99. **Hecho cuando:** se ven las 5 líneas, el TOTAL y Efectivo, Métodos Electrónicos y E-wallet sin scroll de página ni del panel, nada se monta encima de nada, el catálogo no tiene scroll horizontal y las medidas quedan anotadas junto a las de 1.2.
- [ ] 6.4 Ticket de 12 productos a 1366×768. **Hecho cuando:** solo la lista se desplaza y el TOTAL y los pagos siguen visibles.
- [ ] 6.5 Ventana baja:
  - 1366×520 con el cliente plegado: la lista es la única que se desplaza;
  - 1366×520 con el cliente desplegado y el cupón abierto: se desplaza el panel completo, sin barra en la lista;
  - 1366×450 con el cliente plegado: panel completo.

  **Hecho cuando:** en los tres casos hay una sola barra en el panel y los pagos se alcanzan.
- [ ] 6.6 1440×900, 1920×1080 (panel de 440 px) y 1147×607. **Hecho cuando:** no hay scroll horizontal, no hay texto invisible y nada se monta encima.
- [ ] 6.7 390×844: comparar con las capturas de 1.2 la barra inferior, la hoja del ticket, el cliente asociado, una línea con el editor abierto, el cupón y los totales. **Hecho cuando:** se ven iguales y no hay scroll horizontal.
- [ ] 6.8 Repetir las ventas de 1.3 con la versión nueva y comparar los JSON con los campos de fecha y referencia normalizados (lista en design.md, Verificación). **Hecho cuando:** no hay ninguna diferencia, el monto del modal de efectivo es el mismo y, sin cliente, sale el mismo aviso.
- [ ] 6.9 Teclado:
  - Tab recorre el cliente, cada fila (Editar precio, −, +, quitar), «Agregar cupón» y los pagos con el foco visible;
  - Esc cancela «Cambiar»;
  - Enter en «Editar precio» abre y cierra el editor.

  **Hecho cuando:** todo responde con teclado.

## 7. Cierre (sesión principal, solo con autorización)

> **Verificación real (2026-10-23).** Daniel revisó la versión local en su pantalla con FLORECER y la aprobó («yo lo vi bien»). No se tomaron en el navegador las medidas de 1.2, 6.3-6.7 ni la prueba de teclado de 6.9. La comparación de pedidos de 1.3/6.8 se reemplazó por la revisión del diff: ningún archivo toca servicios, `CartService`, `PosCheckoutService`, el armado del pedido ni los totales (los nuevos `subtotalLinea` y `textoUnidades` solo leen). Lo que falta se revisa en producción en 7.4.

- [ ] 7.1 Registrar **D-XXX** en `specs/CONTRACT.md` con lo verificado y lo que no se pudo verificar, más la entrada de bitácora. Lo hace la sesión principal.
- [ ] 7.2 Commit con sello y solo los archivos de este cambio. Nunca `git add -A`, porque hay otras sesiones en el mismo working copy.
- [ ] 7.3 Publicar el front con el candado: `git pull`, compilar desde la punta y desplegar enseguida. Necesita autorización explícita de Daniel.
- [ ] 7.4 Ticket 1340: verificar en producción a 1366×768, subir la evidencia del antes y el después, y pasarlo a Resuelto con un comentario en lenguaje de negocio.
- [ ] 7.5 `/opsx:archive`. Al archivar, ajustar si hace falta la redacción del escenario «Ventana muy baja» (design.md, Open Questions).
