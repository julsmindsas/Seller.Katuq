## 1. Medición previa (solo lectura)

- [ ] 1.1 Sacar de producción, de todas las empresas y de los últimos 90 días, los textos distintos de la franja de entrega (`horarioEntrega`) y los tipos de `fechaEntrega` de los pedidos listos (texto ISO o fecha de Firestore). Registrar el resultado en design.md. Es la entrada de las pruebas de 2.1 y de la consulta por rango.
- [ ] 1.2 Comprobar en la app nativa del mensajero (rama `origin/feature/native-apps`) y en `getByTransportador` qué campos y qué formato necesita un pedido para aparecer en la lista de hoy: `transportador`, estado, `fechaEntrega` y en línea. Anotarlo en design.md como contrato del despacho.

## 2. Perfil y plan (backend, sin escrituras)

- [ ] 2.1 Pruebas de `services/despachos/franjas.js` con todos los textos de 1.1 (inicio, fin y "sin franja"); luego la implementación.
- [ ] 2.2 Pruebas de `calcularPerfil` para: comercio con mensajeros, solo con transportadora, con ambos, nuevo sin historia y con reglas guardadas. Luego la implementación, sin ninguna rama por nombre de comercio.
- [ ] 2.3 Pruebas de `armarPlan`, una por escenario de `plan-de-despachos`:
  - entrada y exclusiones con su razón;
  - fecha vencida y futura;
  - envío automático;
  - grupos por zona y franja, capacidad y zonas pequeñas;
  - orden por franja;
  - sugerencia en su orden de preferencia y "sin sugerencia";
  - app no conectada;
  - huella determinista.

  Luego la implementación, que reutiliza `claveCiudad` y la normalización de D-404.
- [ ] 2.4 `leerDatosDelPlan`, con lecturas con `select`, Realtime DB por clave calculada en las dos formas y solo la empresa de la sesión. Prueba con base simulada: 0 escrituras y ninguna consulta sin el filtro de la empresa.
- [ ] 2.5 Agregar el índice `orders (company, estadoProceso, fechaEntrega)` a `firestore.indexes.json`. Crearlo en producción con el OK de Daniel antes de desplegar 4.x.
- [ ] 2.6 `scripts/plan-despachos-ensayo.js`, de solo lectura, recibe `--empresa` y `--dias 14`. Correrlo en los comercios que hoy despachan y registrar en design.md el acuerdo de grupos, de mensajero y de transportadora. Si no pasa la compuerta (70/50/90), ajustar las reglas genéricas y repetir. Nunca reglas por comercio.

## 3. Servicio compartido de órdenes de envío (módulo sensible: un cambio a la vez, con el diff aprobado por Daniel)

- [ ] 3.1 Pruebas de caracterización de `createAndEditShippingOrder` y `dispatchShippingOrder` sobre una base simulada: escrituras, respuesta y llamadas a `updateOrderInternal`. Deben pasar con el código de hoy, sin tocarlo.
- [ ] 3.2 Extraer `crearOrdenDeEnvio` y `despacharOrdenDeEnvio` a `services/despachos/ordenesDeEnvio.js`. Los controladores quedan como envoltura y las pruebas de 3.1 pasan igual. Mostrar el diff a Daniel antes de seguir.
- [ ] 3.3 Desplegar solo la extracción. Observar 2 días que las órdenes creadas desde la pantalla de Despachos queden iguales que antes.

## 4. Aprobación, rutas y Opttia (backend)

- [ ] 4.1 Prueba de contrato del write-set de la aprobación. Solo puede escribir:
  - `shipping_orders`;
  - los campos de despacho de los pedidos del grupo;
  - `order_status_history`.

  Falla ante cualquier otra escritura: productos, precios, inventario, configuración de integraciones, mensajeros o reglas.
- [ ] 4.2 Pruebas de aprobación:
  - rol con Despachos en el menú, familia Administrador y otro rol (403);
  - pedido que cambió entre el plan y la aprobación;
  - doble aprobación, en serie y a la vez;
  - "Aprobar todo" con un grupo fallido;
  - despacho cortado a mitad y reanudado;
  - bandera y interruptor apagados;
  - `despachador` como `{ name, email }`, sin sesión.
- [ ] 4.3 Implementar `services/despachos/ejecutarPlan.js`:
  - transacción con id determinista y consecutivo;
  - `despacharOrdenDeEnvio`;
  - push `order_modified` de mejor esfuerzo;
  - auditoría en la orden y en el historial.
- [ ] 4.4 Bandera `despachosOpttia` en `services/companyFeatureFlags.js`, con su prueba, su dueño (Daniel) y su fecha de retiro. Interruptor general `DESPACHOS_OPTTIA_HABILITADO`.
- [ ] 4.5 `routers/despachosPlan.js` en `/v1/logistica/plan`, con:
  - `GET /`, `POST /explicar` y `POST /aprobar`;
  - `auth`, `requireJwtTenant`, la bandera, el interruptor y `puedeDespachar`;
  - la clasificación en `middleware/soloLectura.js`.

  Prueba de contrato de las rutas: códigos 200, 401, 403 y 404, y una sesión de otra empresa nunca ve ni toca datos ajenos.
- [ ] 4.6 Opttia: `services/ai/prompts/planDespachosPrompt.js`, validación con `frasesVerificadas`, una explicación por huella y el tope por empresa. Pruebas con Opttia simulado, sin llamar a Bedrock:
  - la frase con un número inventado se descarta;
  - no viajan datos de clientes;
  - con un timeout, el plan sale sin texto.
- [ ] 4.7 `node --check`, suites de `tests/despachos/` y de `tests/enVivo/`. Las de En vivo deben quedar igual que antes del cambio, sin escrituras nuevas en `services/enVivo/`. Después, commit en `backend-aws-security`.

## 5. Front: vista Despachos en En vivo

- [ ] 5.1 `EnVivoPlanDespachosService extends BaseService` y los modelos del plan y del perfil.
- [ ] 5.2 Componentes OnPush en `components/en-vivo/comercio/despachos/`: contenedor, grupo, fuera del plan y perfil.
  - **Estados:** cargando, vacío, listo, viejo, aplicando y resultado, con `aria-live`.
  - **Al tocar un pedido:** se abre la ficha de En vivo.
  - **Diseño:** el tema de En vivo, sin gradientes ni primarios prohibidos, y sin clases cuyo nombre contenga "p-".
- [ ] 5.3 Opción `despachos` en el selector, solo con la bandera encendida y sin sesión de solo lectura ni `soloPropias`. Botones desactivados en modo TV y en "Repetir el día". Marca "cambió" cuando llega un evento del SSE que toca un pedido del plan.
- [ ] 5.4 Aviso proactivo en `EnVivoNarracionService` y en el orbe: plantilla con el conteo de pedidos listos de hoy, una vez cada vez que cambia el número y sin cambiar de vista.
- [ ] 5.5 Bandera en `company-features.service.ts`.
- [ ] 5.6 Build de producción sin errores. El conteo de `(linear|radial)-gradient(` y de los primarios prohibidos del módulo no debe subir. Revisar la vista en 1440 y en 390 px con la API simulada (Playwright): sin scroll horizontal ni texto invisible.

## 6. MCP y ADK (cambio privado del backend: `opttia-despachos-con-aprobacion`)

- [ ] 6.1 Escribir y aprobar ese cambio en el repo privado. Cubre:
  - los alcances por rol;
  - las cuatro herramientas que hoy escriben;
  - el comprobante canjeable solo por un botón;
  - Telegram;
  - el autor real en el historial.
- [ ] 6.2 `get_dispatch_plan` y `request_dispatch_plan_approval`, sobre el mismo servicio del plan. Retirar o migrar `assign_transporter`, `create_shipping_order`, `dispatch_shipping_order` y `update_order_status`, con sus pruebas.
- [ ] 6.3 ADK:
  - las herramientas nuevas entran en las listas de escritura y de confirmación humana;
  - `dispatch_routes_hitl` pasa a usar el plan;
  - en grupos de Telegram, la aprobación queda atada a la cuenta de Katuq y a su permiso;
  - en WhatsApp, solo lectura.

## 7. Transportadora (segunda fase)

- [ ] 7.1 `capacidades()` en la capa común de proveedores (`services/logisticsManager.js`). Sin declaración, el proveedor no se ofrece. Va con su prueba.
- [ ] 7.2 Extraer el servicio que usa `POST /v1/logistics/shipments`, con la empresa de la sesión firmada y pruebas de caracterización. Módulo sensible: diff aprobado.
- [ ] 7.3 Prueba de contrato "respuesta perdida" por proveedor. Declarar `unEnvioPorPedido: true` solo donde pase; primero el proveedor que ya tiene candado.
- [ ] 7.4 Grupos por transportadora en `armarPlan`: cobertura, cotización con 10 s de espera, tarifa fija o "sin tarifa", y datos exigidos.
- [ ] 7.5 Aprobación por transportadora (una orden por pedido), con pruebas de idempotencia y del write-set.
- [ ] 7.6 Front: grupos por transportadora con la tarifa, "sin tarifa por ahora" y el cambio de transportadora.

## 8. Despliegue y encendido

- [ ] 8.1 Desplegar el backend: `git pull` local, `git merge --ff-only` en el servidor, `set -e`, HEAD verificado, `node --check`, suites y `pm2 restart katuq-api`. Si antes de lo propio hay commits ajenos sin desplegar, preguntarle a Daniel. La bandera queda apagada en todas las empresas.
- [ ] 8.2 Publicar el front: `git pull`, `npm run build:prod`, `node scripts/verify-dist-prod.js`, `firebase deploy --only hosting` y commit de `src/assets/version.json`. La versión debe quedar mayor que la viva.
- [ ] 8.3 Prueba de punta a punta en FLORECER, con la sesión de Daniel y pedidos de demo autorizados:
  1. armar el plan;
  2. cambiar un mensajero;
  3. aprobar;
  4. ver la orden en Despachos y el pedido en la app del mensajero de prueba;
  5. aprobar otra vez y ver "ya aprobado";
  6. cancelar los pedidos de demo.
- [ ] 8.4 Con el OK de Daniel, encender la bandera en el primer comercio con mensajeros que pasó el ensayo. Seguir 5 días: aprobaciones, cambios de mensajero, pedidos que quedaron fuera y errores.
- [ ] 8.5 Encender en los siguientes comercios con el mismo motor; los de transportadora, después de la fase 7.
- [ ] 8.6 Retirar la bandera 30 días después de tenerla encendida para todos (Artículo XII).
- [ ] 8.7 `openspec validate despachos-con-opttia --strict`, cierre de D-410 en `specs/CONTRACT.md` y archivo del cambio.
