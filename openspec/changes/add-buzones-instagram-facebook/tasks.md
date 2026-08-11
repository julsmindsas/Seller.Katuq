## 1. Trámite con Meta (arranca ya, corre en paralelo, no bloquea código)

- [ ] 1.1 Iniciar la verificación de negocio de Julsmind en el Business Manager y dejar registro de qué documentos pidió Meta
- [ ] 1.2 Registrar en la app `katuq` los usuarios de prueba y vincular la página de Facebook y la cuenta de Instagram de Julsmind para desarrollo
- [x] 1.3 Configuración de Meta creada: Login for Business "Mensajes Instagram y Facebook" (`config_id` 1358328686283049), token de usuario del SISTEMA que NO caduca, activos Páginas + Cuentas de Instagram, permisos `pages_messaging`, `pages_manage_metadata`, `pages_show_list`, `instagram_basic`, `instagram_manage_messages`. URI de retorno `https://sellercenter.katuq.com/integrations/meta/retorno` guardada y verificada (localhost se permite solo en modo desarrollo, no hay que registrarlo)
- [x] 1.6 Pasar `public_profile` a acceso avanzado — concedido el 2026-08-11. Exigió la encuesta de tratamiento de datos: encargados declarados Julsmind S.A.S. (Colombia), Google LLC / Firebase y Google Cloud (Estados Unidos) y Amazon Web Services (Estados Unidos), los tres en categoría "Soluciones y servicios de TI"; responsable de los datos Julsmind S.A.S. en Colombia. No pidió verificación de negocio
- [ ] 1.7 Enviar la comprobación de uso de datos anual de la app `katuq` antes del **29 de agosto de 2026** — es una certificación que firma un administrador de la app, no la puede hacer un asistente; si se vence, Meta restringe el acceso a la API
- [ ] 1.4 Depurar las dos apps "Opttia" en desarrollo (una sin negocio asignado) antes de la verificación de acceso
- [ ] 1.5 Al terminar la fase 4, grabar el screencast del recorrido completo y enviar a revisión `instagram_business_manage_messages` y `pages_messaging`

## 2. Backend — recepción y almacenamiento

- [x] 2.1 Definir el modelo del mensaje y del hilo de Meta con campo de canal, y documentar los índices necesarios por empresa y por fecha
- [x] 2.2 Crear el servicio de hash de identidad reutilizando el mecanismo de `whatsappPhoneHash`, incluyendo el canal en el material hasheado
- [x] 2.3 Crear el endpoint de verificación del webhook (`GET`) validando el token acordado
- [x] 2.4 Crear el endpoint de recepción (`POST`) con validación de firma, enrutando por `body.object` a `instagram` o `page` y descartando lo demás con registro
- [x] 2.5 Implementar idempotencia por identificador de mensaje, con el mismo criterio que el canal de WhatsApp
- [x] 2.6 Resolver la empresa dueña por identificador de página o de cuenta de Instagram, y descartar con registro los eventos de cuentas no conectadas
- [x] 2.7 Verificar con pruebas que el webhook de WhatsApp conserva ruta, handler y comportamiento sin ninguna modificación

## 3. Backend — conexión de cuentas y consulta

- [x] 3.1 Implementar el intercambio de código por token de Facebook Login for Business y el guardado cifrado por empresa
- [x] 3.2 Implementar la consulta de estado de canales que devuelve estado, nombre de cuenta y fecha, y nunca el token ni el identificador crudo
- [x] 3.3 Implementar la desconexión de un canal conservando los hilos ya recibidos en modo lectura
- [x] 3.4 Detectar token vencido o permiso revocado y exponer el estado "reconectar"
- [x] 3.5 Implementar el listado de hilos y el detalle de mensajes por canal y empresa, con paginación
- [x] 3.6 Implementar la vinculación manual del hilo con un cliente (guardando `origen`, hoy siempre `manual`) y, una vez vinculado, reutilizar el resolutor de contacto por cliente sin alterar su comportamiento para WhatsApp
- [x] 3.8 Exponer la búsqueda de clientes de la empresa para el selector de vinculación, y los endpoints de vincular y desvincular
- [x] 3.7 Implementar el envío de respuesta a Meta y el cálculo del tiempo restante de la ventana de mensajería

## 4. Frontend — buzones y conexión

- [x] 4.1 Agrupar la navegación bajo un único elemento "Mensajes" con WhatsApp, Instagram y Facebook como hijos, conservando la ruta actual del buzón de WhatsApp
- [x] 4.2 Crear el módulo del buzón de Instagram en `/notificaciones/instagram/inbox` calcando el patrón existente (shell, lista, detalle, panel)
- [x] 4.3 Crear el módulo del buzón de Facebook en `/notificaciones/facebook/inbox`
- [x] 4.8 En el panel de contacto, mostrar el estado "sin vincular" con buscador de cliente, y el cliente con lead y pedidos una vez vinculado
- [x] 4.4 Mostrar el tiempo restante de la ventana y deshabilitar la respuesta al expirar, con explicación en lenguaje llano y sin códigos de error
- [x] 4.5 Mostrar el estado de envío del mensaje saliente y permitir reintentar cuando falle
- [x] 4.6 Crear la pantalla de conexión de cuentas en integraciones con los tres estados legibles y un botón por canal
- [x] 4.7 Cumplir el tema visual canónico de `openspec/specs/design-system/spec.md` en todas las pantallas nuevas

## 5. Verificación y cierre

- [ ] 5.1 Probar de punta a punta con usuarios de prueba: conectar, recibir, ver panel de cliente, responder dentro y fuera de la ventana
- [ ] 5.2 Probar el aislamiento multiempresa con dos empresas y dos cuentas distintas
- [ ] 5.3 Confirmar en producción que el canal de WhatsApp sigue recibiendo, respondiendo y cobrando igual que antes del despliegue
- [ ] 5.6 Dar de alta `/notificaciones/instagram/inbox` y `/notificaciones/facebook/inbox` en el menú de los roles que deban verlos — el menú se filtra por texto EXACTO contra `authorizedMenuItems` (que viene de `userData.menu` al iniciar sesión). Sin esto el feature se despliega invisible.
- [x] 5.7 `metaAppId` y `metaLoginConfigId` presentes en `environment.ts` y `environment.prod.ts` locales. Como el frontend se compila en la máquina de quien despliega (no hay servidor de build), basta con eso — pero ojo: los dos archivos están en `.gitignore`, así que **en otra máquina hay que volver a ponerlos a mano**
- [x] 5.8 Producción configurada el 2026-08-11: `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_GRAPH_VERSION` y `META_REDIRECT_URI` en el `.env` de la instancia (con respaldo del `.env` anterior), backend desplegado y webhook `https://back.katuq.com/v1/meta/webhook` registrado y verificado por Meta en los objetos **Instagram** (campo `messages`) y **Page** (`messages` + `messaging_postbacks`). Prueba en vivo: token bueno devuelve el desafío, token malo 403, evento sin firma 403
- [ ] 5.9 El objeto Page tenía un webhook viejo hacia `https://omnichat.katuq.com/bot` (Chatwoot propio, servidor 44.211.217.53 sin puertos abiertos). Daniel autorizó reemplazarlo el 2026-08-11. Queda pendiente **decidir la suerte de omnichat**: el front todavía carga su widget en `diagnostic-survey.component.ts`, así que esa encuesta está rota mientras el servidor siga caído
- [ ] 5.4 Compilar sin errores y desplegar por partes: primero webhook y almacenamiento sin UI, luego conexión, luego los buzones
- [x] 5.5 Registrar la decisión como D-170 en `/specs/CONTRACT.md` (colección compartida con campo de canal, aprobada explícitamente por Daniel el 2026-08-10) y actualizar la bitácora
