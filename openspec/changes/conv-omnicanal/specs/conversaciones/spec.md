## Purpose

Define qué debe hacer el módulo de conversaciones de Katuq para que un comercio con muchos números atienda todos sus canales desde una sola bandeja, con varios asesores y con los usuarios de Katuq. Es el nivel paraguas (D-631): cada fase abre su propio cambio con diseño y tareas. Sin decisiones de tecnología.

## ADDED Requirements

### Requirement: Varios números y cuentas por comercio (A)

El sistema SHALL permitir conectar N números de WhatsApp, N páginas de Facebook y N cuentas de Instagram por comercio, cada una con alias y estado (conectado, desconectado o error), sin que el comercio copie credenciales. WHEN una línea se desconecta o entra en error, el sistema SHALL avisar a los administradores del comercio. El sistema SHALL mostrar el costo estimado antes de enviar un mensaje que se cobra.

#### Scenario: Conectar la tercera línea

- **WHEN** un administrador conecta el tercer número de su comercio
- **THEN** el número aparece en la lista con su alias y estado
- **AND** las líneas anteriores no cambian

#### Scenario: Línea caída

- **WHEN** Meta o el proveedor reportan una línea desconectada
- **THEN** el administrador recibe un aviso y la lista marca la línea en error

### Requirement: Bandeja única (B)

El sistema SHALL mostrar en una sola bandeja las conversaciones de todos los canales y líneas del comercio, con filtros por canal, línea, agente, estado (nueva, en curso, en bot, cerrada) y etiqueta. WHEN el asesor responde, el sistema SHALL enviar el mensaje por el canal y la línea por donde escribió el cliente. WHERE un cliente escribe por varios canales, el sistema SHALL mostrar su historial unificado en la ficha. El sistema SHALL conservar las rutas, filtros y pestañas actuales de WhatsApp, Instagram y Facebook mientras no se apruebe retirarlas.

#### Scenario: Cliente en dos canales

- **WHEN** un cliente con el mismo teléfono escribe por WhatsApp y por Instagram
- **THEN** el asesor ve dos conversaciones vinculadas a una ficha
- **AND** cada respuesta sale por el canal de su conversación

### Requirement: Multiagente (C)

El sistema SHALL usar los usuarios y roles de Katuq, con los roles administrador, supervisor y agente, y SHALL limitar en el servidor las conversaciones que cada rol ve. Cada conversación SHALL tener como máximo un responsable. WHEN dos agentes intentan tomar a la vez la misma conversación, el sistema SHALL asignarla a uno solo. El sistema SHALL permitir transferir a una persona o a un equipo con nota interna, y registrar quién respondió, transfirió o cerró. IF una conversación lleva más de X minutos sin respuesta, THEN el sistema SHALL alertar al agente y al supervisor.

#### Scenario: Agente sin permiso

- **WHEN** un agente intenta abrir por enlace directo una conversación de una línea que no tiene asignada
- **THEN** el sistema rechaza el acceso

#### Scenario: Agente se desconecta

- **WHEN** un agente con conversaciones abiertas queda desconectado
- **THEN** sus conversaciones se reasignan según la cola o quedan visibles al supervisor

### Requirement: Colas, horarios y enrutamiento (D)

El sistema SHALL permitir crear colas que agrupen líneas y agentes, con método de asignación, horario por día y mensaje fuera de horario. WHEN llega una conversación nueva, el sistema SHALL enrutarla por la línea de entrada, el tipo del primer mensaje, la opción del menú de bienvenida o el propietario del contacto, en ese orden de prioridad configurable. WHEN el bot de pedidos entrega la conversación, el sistema SHALL colocarla en la cola configurada con su contexto.

#### Scenario: Fuera de horario

- **WHEN** un cliente escribe a una línea de una cola cerrada
- **THEN** recibe el aviso configurado y la conversación queda encolada para la próxima apertura

### Requirement: Automatizaciones, cierre y consentimiento (E)

El sistema SHALL ofrecer mensajes automáticos activables uno a uno, con variables, para bienvenida, sin agentes, espera, agente asignado, fuera de horario, inactividad y cierre. WHILE la ventana de 24 h de WhatsApp esté por cerrarse, el sistema SHALL poder enviar un seguimiento configurado. El sistema SHALL exigir un motivo de cierre configurable, permitir etiquetas de conversación y de contacto por separado, y mantener respuestas rápidas por cola. El sistema SHALL registrar el consentimiento del cliente y respetar su baja. IF el saldo no alcanza, THEN el sistema SHALL omitir los envíos que cuestan y registrarlo.

#### Scenario: Cierre sin motivo

- **WHEN** un agente intenta cerrar una conversación sin motivo
- **THEN** el sistema no la cierra y pide elegir uno

#### Scenario: Cliente se da de baja

- **WHEN** un cliente responde con la palabra de baja
- **THEN** no recibe más automatizaciones ni seguimientos por esa línea

### Requirement: KAI en la atención (F)

WHERE el comercio activa KAI en una cola o línea, el sistema SHALL permitir que responda con datos reales de Katuq (catálogo, stock, estado de pedido, horarios, medios de pago) sin inventar precios ni existencias. WHEN el cliente pide un asesor, falla N veces o la intención lo exige, el sistema SHALL pasar la conversación a la cola correcta con el contexto y la fecha del desborde. El sistema SHALL poder transcribir audios, leer imágenes, ofrecer preguntas frecuentes sin IA y enviar una encuesta de satisfacción al cierre. KAI SHALL NOT escribir pedidos, precios ni inventario por sí mismo; el backend decide.

#### Scenario: Desborde

- **WHEN** el cliente escribe «quiero hablar con un asesor» mientras KAI atiende
- **THEN** la conversación pasa a la cola de ventas con el resumen y queda marcada como desbordada

### Requirement: Informes de atención (H)

El sistema SHALL ofrecer una auditoría por conversación con canal, línea, contacto, agente, etiquetas, creación, desborde, primera respuesta, último mensaje, duración, estado y motivo de cierre, con filtros y descarga. El sistema SHALL calcular tiempos de primera respuesta y resolución, conversaciones por agente, canal, línea y cola, transferencias, bot frente a asesor, satisfacción y contactos únicos. La descarga SHALL requerir permiso y quedar registrada.

#### Scenario: Cifras que cuadran

- **WHEN** el supervisor filtra un día y una línea
- **THEN** el total del informe coincide con las conversaciones visibles en la bandeja

### Requirement: Vidagas con 18 números (G)

WHEN el comercio Punto Verde Vidagas conecta sus 18 números, el sistema SHALL recibirlos en la bandeja única según sus colas y reglas. El proyecto SHALL llevar una bitácora de tiempos y problemas como base para estimar 200 números.

#### Scenario: Atención de punta a punta

- **WHEN** llega un mensaje a cualquiera de los 18 números
- **THEN** aparece en la bandeja única, en la cola correcta, y se responde por ese número

### Requirement: Canales futuros y QA (I, J, K, L, M)

El sistema SHALL mostrar TikTok, correo y llamadas como «Próximamente», sin activarlos (ya cumplido por D-509). Las investigaciones K, L y M SHALL entregar documentos con viabilidad, costo, esfuerzo y recomendación, separando lo confirmado de la hipótesis, y SHALL NOT incluir desarrollo. Ningún ticket hijo SHALL cerrarse sin que J haya ejecutado su checklist con evidencia, una prueba de carga para 200 números y la validación con Vidagas.

#### Scenario: Cierre sin QA

- **WHEN** se quiere cerrar un ticket de la lista sin evidencia de J
- **THEN** el ticket permanece abierto

### Requirement: Datos personales, webhooks y costos (transversal)

El sistema SHALL tratar teléfonos, nombres, imágenes y audios como datos personales: sin identificadores crudos en URLs ni cuerpos de mensaje en logs, con número visible solo con permiso, y con retención y borrado definidos. WHEN un webhook de un canal llega, el sistema SHALL validar la firma (rechazando si falta el secreto), reservar la idempotencia del mensaje y guardar el evento crudo antes de procesar. El sistema SHALL aplicar el aislamiento por empresa en toda consulta. El sistema SHALL encender cada capacidad nueva con bandera por comercio y poder apagarla sin afectar el número compartido, las notificaciones ni el bot piloto actuales.

#### Scenario: Webhook sin firma válida

- **WHEN** llega un evento con firma incorrecta o sin secreto configurado
- **THEN** el sistema responde con rechazo y no guarda ni procesa nada

#### Scenario: Mensaje duplicado

- **WHEN** el proveedor reenvía el mismo mensaje
- **THEN** se registra una sola vez y no se cobra dos veces

#### Scenario: Bandera apagada

- **WHEN** un comercio no tiene encendida la bandera de la bandeja única
- **THEN** sigue usando los buzones actuales sin cambios
