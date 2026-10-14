## Why

Daniel (13-oct), al ver la pestaña "Despachos" de D-410:
- "quiero tener un apartado aquí mismo donde Opttia tenga un poco más de autonomía, como organizar despachos automáticos ... y que el usuario solo apruebe";
- "era ahí mismo en la animación que se organizara automáticamente con Opttia, no otra pestaña";
- "no solo pedí despachos, pedí también otras operaciones que demuestren el poder de Opttia".

Hoy el plan de despachos vive en una cuarta vista de En vivo. Para verlo, la persona tiene que salir de la animación, y Opttia solo avisa "armo el plan en Despachos". El backend de D-410 ya hace lo difícil: plan determinista, huella por pedido, aprobación idempotente y write-set cerrado. Lo que falta es que Opttia proponga **dentro de la escena** y que se vea que sabe hacer más que despachar.

Daniel aprobó la propuesta y el boceto el 13-oct ("dale, arranca con la fase 1").

## What Changes

- **La pestaña "Despachos" desaparece** (**BREAKING** para quien la usaba). El selector vuelve a tener Mi operación, Mi país y Pedidos. La pestaña se retira en el mismo despliegue que trae la tarjeta, no antes, porque hoy es el único lugar donde se aprueba. Quien tenía guardada la vista "despachos" cae en "Mi operación".
- **Opttia propone dentro de la escena y la persona aprueba ahí mismo.**
  - El código detecta el trabajo pendiente y arma una cola corta, ordenada por urgencia.
  - Se muestra una tarjeta a la vez, pegada a la escena, y el botón del orbe cuenta las ideas: "Opttia tiene 3 ideas · 1 urgente".
  - La escena ensaya cada propuesta con copias fantasma de las cajas, anillos del color de la moto y una línea punteada hasta ella. Las cajas reales no se mueven.
  - Aprobar pide dos toques en el mismo botón, y el segundo dice el efecto real.
  - El resultado lo anima la escena con los eventos reales del canal en vivo: si el servidor no lo hizo, no se ve.
- **Tres operaciones desde la fase 1:**
  1. **Despachar lo que está listo:** un grupo del plan de D-410 por tarjeta. Se aprueba por la misma ruta de D-410.
  2. **Arrancar la producción de lo que se entrega hoy o mañana:** en sombra ("Así lo haría Opttia · pronto podrás aprobarlo"), sin botón, y solo para la familia Administrador.
  3. **Cobrar los pedidos sin pago:** una señal del radar con "Abrir pedido". No escribe nada.
- **"Ajustar"** abre una hoja al costado, o abajo en el celular, con el grupo para cambiar el mensajero o sacar un pedido. Reutiliza las tarjetas de grupo y de "No entra al plan" de D-410.
- **Narración:** deja de decir "armo el plan en Despachos" y dice "Organicé N pedidos en M salidas; apruébalas aquí". Se calla mientras haya tarjeta.
- **TV y "Repetir el día":** se ve el ensayo, pero sin botones.
- **Backend:** una ruta nueva de solo lectura que arma la cola con la empresa de la sesión. Además, dos ajustes pequeños en D-410: el canal "escena" al aprobar y el interruptor de Opttia revisado al explicar.
- **Fases siguientes, cada una con su propio cambio y su spec:**
  - fase 2: aprobar la producción y el cobro con WhatsApp;
  - fase 3: abrir un conteo cíclico y la orden de compra;
  - fase 4: reenviar a la integración logística, y las mismas propuestas por MCP y Telegram.

## Capabilities

### New Capabilities
Ninguna. La función se reparte en capacidades que ya existen en cambios abiertos.

### Modified Capabilities
- `despachos-en-vivo` (cambio `despachos-con-opttia`): se quita la vista Despachos, el plan pasa a la escena y "Ajustar" es una hoja. La narración del plan, los casos sin aprobar, el diseño y la excepción de escritura se reescriben.
- `opttia-en-vivo` (cambio `tablero-en-vivo`): Opttia propone y la persona aprueba en la escena. Producción va en sombra y el cobro como señal. La señal del orbe queda fija mientras hay propuesta y la narración se calla con la tarjeta.
- `tablero-en-vivo` (cambio `tablero-en-vivo`): "Solo lectura" nombra su única excepción, la tarjeta de Opttia al aprobar.
- `perfil-de-despacho` (cambio `despachos-con-opttia`): la línea del perfil pasa de la vista Despachos a la hoja "Ajustar".

**Orden de archivo:** primero `tablero-en-vivo`, después `despachos-con-opttia` y por último este cambio. Los deltas modifican requisitos que todavía no están en `openspec/specs/`.

## Impact

- **Front** (`components/en-vivo/`):
  - un módulo `propuestas/`, el único de En vivo que escribe, con su servicio (`BaseService`), la tarjeta y la hoja;
  - en las escenas, una capa nueva de solo lectura para el ensayo;
  - el orbe gana un estado "propuesta";
  - la página del comercio pierde la opción Despachos.

  El contrato entre la tarjeta y la escena ya está escrito: `propuestas.modelos.ts` y `propuestas-escena.puente.ts`.
- **Backend** (`katuq_admin_back_firebase`):
  - `GET /v1/opttia/propuestas`, de solo lectura, en un motor aparte de `services/enVivo/`, para que En vivo siga sin escribir;
  - en D-410, el canal "escena" y el interruptor de Opttia en `/explicar`.
- **Datos:** no hay colecciones nuevas ni escrituras nuevas.
  - **Despachar** escribe lo mismo que D-410: `shipping_orders`, los campos de despacho de `orders` y `order_status_history`.
  - **Producción y cobro** no escriben en la fase 1.
  - **Nunca escribe:** productos, precios, inventario ni integraciones (D-134).
- **Bandera:** en la fase 1, "Opttia propone" usa la misma bandera `despachosOpttia`, con un interruptor general aparte. La bandera por operación, con modos apagado, sombra y encendido, llega en la fase 2.
- **Módulos sensibles:** `orders` y el consecutivo de órdenes de envío no cambian en la fase 1, porque la aprobación sigue por D-410.

## No-goals

- **Aprobar solo:** el recorrido automático, la TV y "Repetir el día" nunca aprueban.
- **Escrituras nuevas en la fase 1:** arrancar producción, recordatorios por WhatsApp, conteos, compras y reenvíos van en su propio cambio.
- **Operaciones que quedan fuera a propósito, por riesgo:**
  - facturación electrónica;
  - aprobar pagos de tesorería;
  - anular pedidos;
  - cerrar en lote los despachados;
  - traslados y ajustes de stock;
  - precios y promociones;
  - campañas a clientes.
- **Opttia con más permisos:** Opttia solo redacta. La acción, los ids, las cifras y la huella los arma el código.
- **La pantalla clásica de Despachos, la app del mensajero y el backend de D-410:** no cambian lo que hacen.

## Riesgos (módulos sensibles)

- **Despachar mal o dos veces:** lo cuidan las garantías de D-410 (huella por pedido releída en transacción, id determinista y write-set cerrado). La escena suma la confirmación en dos toques con el efecto real, el bloqueo de 1,5 s después de pasar sola a la siguiente propuesta y las transportadoras de a una.
- **Pedidos reales a una integración externa:** la bandera ya está encendida en comercios que envían a una integración. Por eso la fase 1 se prueba primero con pedidos de prueba de FLORECER, antes de publicar.
- **Quedarse sin dónde aprobar:** la pestaña se quita en el mismo despliegue que trae la tarjeta, no antes.
- **Ruido:** una tarjeta a la vez, lo urgente entra de siguiente sin quitarle la tarjeta a nadie, y la narración se calla.
- **Gasto:** la cola usa caché por empresa y una sola llamada en vuelo. El front pide solo con la escena visible y la frase de Opttia sigue el tope de D-410.
- **Seguridad:** está en el alcance de la función: empresa de la sesión, servidor que decide quién ve y quién aprueba, sombra solo para Administrador y cero escrituras al leer. El detalle técnico vive en el cambio privado del backend.

## Verificación contra la constitución

- **I:** esta propuesta, con sus deltas.
- **IV:** la aprobación sigue siendo idempotente por grupo (D-410).
- **VI:** el motor tiene un registro cerrado de fuentes, una por operación, sin `if` por tipo ni por proveedor.
- **VII:** el historial guarda quién aprobó y por qué canal ("escena").
- **VIII:** pruebas de contrato de la ruta nueva y de que leer no escribe.
- **IX:** servicio con `BaseService`, componentes OnPush y módulo con carga diferida.
- **XI:** a Opttia no le llegan datos de clientes. La TV y "ocultar" no muestran montos ni nombres.
- **XII:** la bandera tiene dueño (Daniel). El interruptor general se retira cuando exista la bandera por operación.
- **XIII:** cada delta cabe en 3 páginas.
- **XIV:** D-422, que reemplaza la parte "pestaña" de D-410.
- **XV:** no aplica.
