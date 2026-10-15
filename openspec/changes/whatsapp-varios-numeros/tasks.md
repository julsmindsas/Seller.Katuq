## 1. Contratos y fixtures (antes del código, Art. VIII)

- [ ] 1.1 Guardar como fixtures (sin teléfonos reales) los payloads de Kapso: `phone_numbers` (listado por customer), respuesta de `setup_links`, creación de webhook por número, mensaje entrante `kind: "meta"` con `metadata.phone_number_id`, y eco de coexistencia (`smb_message_echoes`). Los que no se puedan capturar todavía, marcados como pendientes de confirmar en 6.3.
- [ ] 1.2 Prueba de contrato del registro: `create()` de un número ya registrado falla; un número de otro comercio no cambia de dueño.
- [ ] 1.3 Prueba de contrato de la entrada: un mensaje a un número D1 se atribuye solo a su comercio, aunque otro comercio le haya escrito antes al mismo cliente (sin pasar por el reparto D-094); un mensaje al número compartido sigue el camino actual.
- [ ] 1.4 Prueba de contrato del dueño: dos respuestas simultáneas a un chat sin dueño → una sale y la otra recibe 409 con el nombre del dueño; un no dueño (incluida la familia Administrador) recibe 409.
- [ ] 1.5 Prueba de contrato de visibilidad: un vendedor no ve ni abre por enlace directo chats de números que no tiene asignados (403), y la familia Administrador ve todos.

## 2. Backend: números

- [ ] 2.1 `services/whatsappNumbers.js`: leer, registrar (`create`), actualizar (`label`, `sellers`, `botEnabled` con máximo uno por comercio) y desconectar en `whatsapp_phone_numbers`; banderas global y por comercio.
- [ ] 2.2 `kapsoService`: `crearCustomer`, `crearSetupLink`, `buscarNumero(customerId, phoneNumberId)`, `crearWebhookNumero` y `desactivarWebhookNumero`. Las llaves solo van en encabezados; nunca se registran en el log.
- [ ] 2.3 Rutas `GET/POST/PATCH/DELETE /v1/whatsapp/numbers*` (D8), con `auth`, tenant del JWT y la familia Administrador para escribir. `confirm` verifica contra Kapso antes de registrar.
- [ ] 2.4 Al confirmar: registrar la plantilla UTILITY de retomar conversación en el WABA del número (mecanismo de `scripts/kapso-registrar-plantillas.js`).
- [ ] 2.5 Índices nuevos (`whatsapp_phone_numbers.company`, `whatsapp_threads (company, ownerEmail)`) en un archivo con solo los nuevos, sin `--force`.

## 3. Backend: entrada, salida y chats

- [ ] 3.1 `persistInbound`: buscar primero D1 por `metadata.phone_number_id` (siempre, sin depender de la bandera) y, si existe y está conectado, fijar la empresa. Si el número tiene un solo vendedor, crear el chat D2 a su nombre.
- [ ] 3.2 Ecos de coexistencia: guardarlos como salientes en `whatsapp_usage` con `origin: "business_app"`, `phoneNumberId` y `costoCOP: 0`, sin descontar saldo.
- [ ] 3.3 `resolveCredentials(company, phoneNumberId)`: con número, exige D1 del comercio y conectado; sin número, el comportamiento actual. Propagar el parámetro a `sendText`, `sendTemplate`, `sendInteractive`, `sendImage` y `marcarLeídoYEscribiendo`.
- [ ] 3.4 `enviarTexto`: recibir `phoneNumberId`, medir la ventana por número, guardar `phoneNumberId` y `sentBy` en `whatsapp_usage`, y descontar como hoy.
- [ ] 3.5 `services/whatsappThreads.js`: transacciones `tomar`, `tomarAlResponder`, `soltar` y `pasar`, con `assignmentLog` (máximo 20 entradas).
- [ ] 3.6 `getThreads` y `getMessages`: agrupar por `(número, teléfono)`; los documentos sin número van al compartido. Devolver el número, su nombre y el dueño, y filtrar por alcance (D9). Corregir el filtro `status` frente a `statusFilter` y la paginación.
- [ ] 3.7 Rutas del chat con `?numero=`: `reply` (dueño en la transacción), `tomar`, `soltar`, `asignar`, más el chequeo de alcance en `viewed`, `profile`, `orders` y las rutas del bot.
- [ ] 3.8 Bot: para los números D1, `porNumeroPropio` sale de `botEnabled`, y si D2 tiene dueño el bot no responde.
- [ ] 3.9 Pruebas de la sección 1 en verde, más la suite de `tests/notifications` completa en verde (que el número compartido y el bot piloto no cambien).

## 4. Front

- [ ] 4.1 `WhatsappNumbersService` (`BaseService`): lista, enlace de conexión, confirmar, actualizar y desconectar.
- [ ] 4.2 Tarjeta "Números" en `whatsapp-kapso-config`: lista con estado, "Conectar número", selector múltiple de vendedores, bot (uno solo) y desconectar con confirmación. Solo se ve con `habilitado`.
- [ ] 4.3 Ruta de regreso `/integrations/whatsapp/numeros/retorno`: llama a `confirm` y vuelve a la lista con el resultado en lenguaje humano.
- [ ] 4.4 `WhatsappInboxService`: pasar `sendReply`, la lista y los llamados que hoy dan 401 a `BaseService` (interceptor), y agregar `numero` a todas las rutas del chat.
- [ ] 4.5 Buzón: chip del número en cada chat, "Atiende: …", Tomar, Soltar y Pasar (solo administradores), redactor en solo lectura para quien no es dueño (con el motivo) y filtro por número.
- [ ] 4.6 `npm run build` de producción sin errores. Conteo de gradientes y primarios prohibidos sin aumento. Revisión a 1440 y 390 px.

## 5. Despliegue con banderas apagadas

- [ ] 5.1 Backend: `ff-only`, verificar HEAD, `pm2 restart katuq-api`. Confirmar que ALMARA ve su buzón igual y que `GET /numbers` responde `habilitado: false`.
- [ ] 5.2 Front: `git pull`, versión mayor que la viva, `verify-dist-prod`, publicar.

## 6. Piloto y encendido

- [ ] 6.1 Daniel: pasar Kapso al plan Platform si se van a superar 3 números, y confirmar que el proyecto admite `meta_billing_mode: partner_managed`.
- [ ] 6.2 Encender en Julsmind. Daniel conecta dos números de prueba (él hace el inicio de sesión en Meta).
- [ ] 6.3 Prueba completa con capturas: cliente que escribe a los dos números (dos chats), un número con dos vendedores y carrera, pasar y soltar, eco desde el celular sin descuento, saldo descontado por envío, plantilla fuera de la ventana y 403 por enlace directo. Completar los fixtures pendientes de 1.1.
- [ ] 6.4 Encender en el primer comercio que indique Daniel.
- [ ] 6.5 Registrar el cierre en `specs/CONTRACT.md`. Retirar las banderas 30 días después de abrirlo a todos (Art. XII).
