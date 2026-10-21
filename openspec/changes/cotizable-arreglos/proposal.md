# Arreglos del producto cotizable publicado (D-475)

> Ticket F2-43 «Productos cotizables y productos por suscripción», **cd
> `UVaf50kn4UPbI358NGMk`**. Su nroTicket, 1235, también es el de un ticket de rótulos de
> ALMARA (`hf3oJPWE03KIMoHTREXG`), así que se cita por cd. Parte 1 de 2: el cotizable,
> publicado como D-475 (backend c77744c4, front 2026.10.17.9) sin propuesta OpenSpec propia.
> Los arreglos están **aprobados como decisión** en D-518, F2-43·6 (21-oct). Lo que falta
> aprobar son estos artefactos: propuesta, spec, diseño y tareas.
> Toca **pedidos** (el rechazo en el servidor), así que esas tareas van con diff aprobado por
> Daniel. El número de decisión lo asigna quien registre la propuesta en `specs/CONTRACT.md`.
> Revisada el 21-oct con una crítica verificada contra el código (ver «Cambios de la revisión»).

## Why

**Lo que pide el ticket** para el cotizable (descripción, punto 1, y criterio 1):
- un botón «Cotizar» **en lugar de** «Agregar al carrito», con formulario corto;
- crear la cotización en borrador con el producto, el asesor «por rotación o regla» y el
  origen del lead;
- aviso al asesor y **respuesta automática al cliente**;
- criterio: la solicitud «aparece como cotización en borrador en el listado de
  Cotizaciones **con su asesor y origen**».

**Lo publicado (D-475)** cumple el formulario, el borrador, la rotación y el correo al asesor.
Código leído el 21-oct en `wt-back-tickets-web/functions` (rama `feature/tickets-web`,
HEAD `c9e74ff0`, que ya incluye F2-41) y en `wt-front-tickets-web/src` (HEAD `c81a4c30`).
Faltan siete cosas, que D-518 F2-43·6 decidió arreglar:

1. **La compra no se bloquea en el servidor.** El cambio de botón ocurre solo en el
   navegador (`scriptCotizar`, `utils/siteHtml.js:6059`) y ningún camino de compra del
   servidor consulta la lista de productos que se cotizan. Detalle de los caminos: ver
   revisión privada del backend.
2. **El origen web no se ve en el listado.** El listado solo pinta chip para `whatsapp-bot`
   y `catalogo-digital` (`cotizaciones-lista.component.html:479-492`). La cotización web
   guarda `origen: "sitio-web"`, pero sale sin origen.
3. **No hay respuesta automática al cliente.** `cotizarProducto` responde en pantalla con un
   enlace de WhatsApp al comercio (`controllers/sites.js:1375-1383`); al cliente no le llega
   nada, aunque haya dejado su correo.
4. **Sin asesores configurados, nadie la recibe.** Queda con vendedor
   `{email: "", nombre: "Página web"}` y no sale ningún correo (`sites.js:1309-1319`,
   `:1357`). Con asesores, el nombre queda vacío y la columna Asesor muestra el correo
   (`cotizaciones-lista.component.ts:871-875`).
5. **La validez no cuadra.** La web manda `validezDias: 15` sin fecha (`sites.js:1340`) y
   `cotizaciones.create` pone la fecha a 30 días (`controllers/cotizaciones.js:262-264`). El
   listado muestra la fecha (`cotizaciones-lista.component.html:506`): 30 días.
6. **La plantilla Tecnología crea un prospecto, no una cotización.** Es la del piloto Baudio
   (TX-36, cd `Am2CZ98bvTePFdx6KYRL`). Su bloque «Cotiza para tu empresa / Pedir cotización»
   (`data/siteTemplates.js:1219`) es un `formulario` que publica a `/lead`
   (`siteHtml.js:4656`), y `crearLead` escribe en `prospects` (`sites.js:1227`).
7. **No hay prueba que ejecute el flujo.** `tests/sitios/productosCotizables.test.js` revisa
   el servidor buscando textos en el código fuente (líneas 39-51). La prueba «de punta a punta
   con Firestore falso» que cita D-475 no está en el repositorio. El arnés que ejecuta el
   código real de `sites.js` ya existe (`tests/sitios/_crearPedidoHarness.js`, D-496 tarea 2.1).

## What Changes

- **Rechazo en el servidor.** Un pedido con algún producto para cotizar no se crea, antes de
  cualquier escritura. Aplica a todos los caminos de compra que usan la tienda publicada del
  comercio: el checkout de la tienda (409 `codigo: "COTIZABLE"`, el código que ya espera
  F4-40 en su D10) y el checkout del directorio Kuvo (pregunta C10).
  - **Checkout de la tienda:** con ese código, quita esas líneas del carrito y explica por
    qué, como hoy con `TOPE_PLAN`.
  - **«Volver a pedir» y «Lo que más pides»** dejan de ofrecer cotizables.
  - **KAI de la web:** convertir su «agregar» en «Cotiza con un asesor» es de F4-40 (D21,
    tarea 14.2). Mientras llega, el rechazo del servidor lo cubre.
- **Origen «Web» en el listado** de Cotizaciones, al lado del número, como «Bot» y
  «Catálogo». Solo presentación.
- **Correo automático al cliente** si dejó correo: acuse con la marca de la tienda, una sola
  vez por cotización, con el número, el producto, la cantidad y el asesor. Sin precios y sin
  nada de lo que escribió el visitante. El comercio lo puede apagar o redactar como los demás
  correos de la tienda.
- **Administrador como asesor por defecto** cuando el comercio no configuró asesores, con su
  correo de aviso. Nunca un usuario de soporte de la plataforma (rol «Super Administrador»).
  El asesor sale con su nombre (el de su ficha), no solo el correo.
- **Validez de 15 días coherente:** la fecha de vencimiento de la cotización web es la de
  creación más 15 días. Un borrador que el asesor abre con la fecha ya pasada no se envía
  vencido (pregunta C11).
- **Formulario que crea cotización.** El bloque `formulario` gana una opción «Cada envío
  crea: prospecto | cotización», que el servidor lee del bloque publicado que se envió, en
  el inicio o en una página. La plantilla Tecnología nace con «cotización». Los formularios
  existentes no cambian (pregunta C12).
- **Prueba ejecutable** del flujo completo con el arnés: solicitud, cotización, asesor,
  validez, correos, rechazo de la compra y formulario.

## Capabilities

### New Capabilities
- `cotizable-tienda`: el producto para cotizar no se compra, la solicitud llega con asesor,
  origen y validez coherentes, el cliente recibe acuse y el formulario puede crear
  cotización.

### Modified Capabilities
_(ninguna spec vigente describe el cotizable; D-475 se implementó sin OpenSpec)_

## No-goals

- Convertir el cotizable en atributo del producto (catálogo digital, venta asistida, otras
  tiendas). Sigue como lista por sitio, sin escribir productos (D-475; pregunta C8).
- Asignación «por regla» distinta de la rotación y del administrador por defecto.
- Que KAI complete la cotización (F4-40) y el cambio del asesor KAI de la web (F4-40 D21).
- Ocultar el precio del cotizable (pregunta C5).
- Respuesta por WhatsApp al cliente (pregunta C6).
- Corregir la validez de las cotizaciones del bot y del catálogo digital (pregunta C3) y
  migrar las cotizaciones web ya creadas (pregunta C9).
- Que el comprador vea, acepte o rechace su cotización en «Mi cuenta» (FE-24, cd
  `gFfEuF7rodbxrFA897IS`).

## Riesgos

- **Pedidos (módulo sensible).** El rechazo vive en `crearPedido` y en el checkout de Kuvo.
  `crearPedido` también lo toca la extracción del núcleo de D-496. Con el rechazo no se
  escribe nada: ni pedido, ni consecutivo, ni cupo del plan, ni inventario. Hay prueba de
  caracterización antes y contract test después; con un carrito sin cotizables, el pedido
  sale idéntico al dorado (`pedidoTiendaCaracterizacion.golden.json`). Orden de unión:
  pregunta C1.
- **Write-set:**
  - escribe `cotizaciones` (documento nuevo y `correosEnviados.cotizacion_recibida`),
    `cotizaciones_counters`, `sites.cotizacionesTurno`, `sites.leadsCount` (como hoy) y
    `site_events` (como hoy, más los eventos `cotizacion_sin_asesor` y `acuse_cotizacion`,
    con ids y una huella, sin datos personales);
  - el formulario en modo cotización deja de escribir `prospects`; la autorización de correos
    (D-318) sigue igual;
  - lee `users`, `companies`, `products` y `sites`;
  - el rechazo no escribe nada.
  - **Prohibido:** `products`, precios, listas de precios, `orders`, `inventory`,
    `inventoryMovement` y `consecutives`.
- **Correo a una dirección escrita por un visitante.** El acuse no lleva texto libre del
  formulario y tiene topes. Ver revisión privada del backend.
- **Datos del administrador.** Como asesor, su nombre, celular y correo se ven en el enlace
  público de la cotización, igual que los de cualquier asesor hoy (ticket 1213). Ver revisión
  privada.
- **Plantilla en sitios ya publicados.** Cambiar el dato del sitio sería una migración. Por
  defecto no se toca (pregunta C4).
- **Unión:** F2-41 ya está unido (`c9e74ff0`). La copia de trabajo de `controllers/sites.js`
  tiene otro cambio en curso que corre las líneas; las citas son de HEAD `c9e74ff0` y se
  revalidan en la tarea 0.3.

## Cambios de la revisión (21-oct)

Una crítica revisó esta propuesta contra el código. Se aplicó lo que el código confirma:
- el checkout del directorio Kuvo era un cuarto camino de compra: entra en el rechazo (C10);
- el administrador por defecto podía ser un usuario de soporte de la plataforma: se excluye;
- un borrador enviado tarde nacía vencido: pregunta C11;
- el modo cotización del formulario se decidía por el sitio y no por el bloque, no cubría
  las páginas y cambiaba la métrica de contactos del constructor: ahora se decide por el
  bloque enviado, cubre las páginas y la métrica no cambia; la opción general es la pregunta
  C12;
- el write-set no listaba los eventos que piden los topes privados: agregados;
- el detalle de cómo se compra hoy un cotizable pasó a la revisión privada.

## Preguntas para Daniel

Cada una trae la recomendación, que se aplica si se aprueba sin cambios.

- **C1. Orden de unión del rechazo.** F2-41 ya está unido. Recomiendo: unir este cambio
  antes del grupo 3 de D-496 (extracción del núcleo), como dice el paso 3 del orden de
  trabajo de D-518. D-496 suma a su dorado el escenario del cotizable (su tarea 0.8) y la
  extracción se lleva el rechazo al núcleo, donde también lo ve el bot.
- **C2. ¿Qué administrador?** Recomiendo: el usuario activo de la empresa con rol de la
  familia Administrador, sin contar «Super Administrador», cuyo correo es el de la empresa
  (`companies.email`, el del registro). Si no hay, el primero por correo, en orden
  alfabético, para que siempre sea el mismo. Sin rotación entre administradores.
- **C3. Validez del bot y del catálogo digital.** Tienen la misma incoherencia
  (`whatsappBotCierre.js:345`, `catalogos.js:323`). Corregirla en `cotizaciones.create`
  (fecha desde `validezDias` cuando no llega fecha) arregla todo, pero las cotizaciones
  «enviadas» del catálogo vencerían a los 15 días y no a los 30. Recomiendo: sí, en un diff
  aparte con su aprobación.
- **C4. Sitios ya publicados con la plantilla Tecnología.** Recomiendo: no migrar. Un script
  de solo lectura los lista (`plantillaId: "tecnologia-catalogo"`) y a cada comercio se le
  avisa que cambie la opción en el editor.
- **C5. Precio visible del cotizable.** D-518 no lo decidió. Recomiendo: dejarlo como hoy; el
  comercio decide el precio que publica.
- **C6. ¿También WhatsApp al cliente?** Recomiendo: solo correo, como dice F2-43·6; WhatsApp
  tiene costo por mensaje.
- **C7. Asesores que no son usuarios de la empresa.** Hoy solo se valida el formato del
  correo. Recomiendo: un texto de ayuda en el editor, sin bloquear; la cotización sale con el
  correo como nombre. Validar contra los usuarios exige que el editor los consulte.
- **C8. ¿Atributo del producto?** Recomiendo: seguir con la lista por sitio. Si hace falta en
  el catálogo digital o en la venta asistida, va en un ticket propio.
- **C9. Cotizaciones web ya creadas con 30 días.** Recomiendo: no migrarlas. Son borradores,
  que no vencen, y desde el 17-oct son pocas. El script de C4 también las cuenta.
- **C10. Directorio Kuvo** (ALMARA y OH MY STORE, `config/kuvoMerchants.js`). Su checkout
  arma pedidos con la tienda publicada del comercio y no excluye los cotizables. Recomiendo:
  incluirlo en este cambio, con su propio diff [S], respondiendo con el código que la app de
  Kuvo ya maneja (`PRODUCT_UNAVAILABLE`) y el texto «Este producto se cotiza con un asesor
  en la página del comercio», para no cambiar su contrato.
- **C11. Borrador enviado después de su fecha.** «Vencida» es una cotización enviada con la
  fecha pasada (`cotizaciones.js:410`, `metricasListado.js:29`) y el editor conserva la fecha
  guardada (`cotizacion-editor.component.ts:445-448`). Si el asesor completa la cotización
  web después de 15 días, al enviarla ya sale vencida. Recomiendo: el editor, al abrir un
  borrador cuya fecha ya pasó, propone hoy + `validezDias` y lo avisa; el asesor la guarda al
  enviar. Sin cambio en el servidor.
- **C12. ¿La opción «Cada envío crea» para cualquier formulario?** D-518 solo pide la
  plantilla Tecnología. Recomiendo: la opción en el editor para cualquier bloque formulario,
  porque es la única forma de que un comercio la conserve si borra y vuelve a poner el bloque,
  o de que la ponga en un sitio publicado antes del cambio (C4).


## Aprobación (2026-10-21)

Daniel aprobó en bloque esta propuesta («dale pues y aprobado todo», 2026-10-21). Cada pregunta abierta queda resuelta con la recomendación escrita en este documento. Las tareas [S] siguen yendo con diff y pruebas de caracterización antes de unirse.
