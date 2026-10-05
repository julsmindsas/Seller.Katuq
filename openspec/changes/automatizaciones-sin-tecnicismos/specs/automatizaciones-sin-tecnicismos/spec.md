# Automatizaciones sin tecnicismos

## ADDED Requirements

### Requirement: Dedup por entrega del proveedor
WHEN el endpoint de webhook de un flow recibe un aviso con un identificador de entrega del proveedor que ya fue procesado dentro de su ventana, THEN el sistema SHALL responder éxito sin ejecutar el flow de nuevo.

#### Scenario: Shopify reintenta el mismo pedido
- WHEN llegan dos avisos con el mismo `X-Shopify-Webhook-Id` en menos de 48 h
- THEN solo el primero produce una ejecución y el segundo responde `{duplicate:true}`

#### Scenario: Aviso sin identificador
- WHEN el aviso no trae identificador de entrega
- THEN se procesa como nuevo, igual que hoy

### Requirement: Firma del proveedor en sombra antes de exigirla
WHILE la verificación esté en modo sombra, WHEN llega un aviso de un proveedor con secreto configurado, THEN el sistema SHALL registrar si la firma coincide y SHALL ejecutar el flow igual que hoy, sin rechazar.

#### Scenario: Secreto guardado no es el que firma
- WHEN el 100 % de los avisos de 7 días registran `match:false`
- THEN la verificación NO se exige y la pantalla muestra "sin proteger: revisa el secreto en Integraciones"

#### Scenario: Paso a exigida
- WHEN la empresa tiene 7 días de sombra con 100 % de coincidencias y el flag se enciende
- THEN un aviso con firma inválida responde 401 y no ejecuta el flow

### Requirement: Respuesta honesta al proveedor
WHEN una ejecución disparada por webhook termina fallida, IF la dedup está activa y el flag del flow lo permite, THEN el sistema SHALL responder un error HTTP para que el proveedor reintente.

#### Scenario: Protección contra duplicados
- WHEN el flag de respuesta honesta está encendido pero la dedup no
- THEN el sistema responde 200 como hoy y registra la inconsistencia

#### Scenario: Ejecución parcial
- WHEN la ejecución termina con pendientes (parcial)
- THEN responde 200, porque ya hubo escrituras

### Requirement: Nada cambia para los flows activos
WHEN se despliega el blindaje con todos los flags en su valor por defecto, THEN los flows activos SHALL producir las mismas ejecuciones y escrituras que antes del despliegue.

#### Scenario: Pedido real de Shopify en OH MY STORE
- WHEN llega un pedido nuevo tras el despliegue
- THEN la ejecución es `success`, el pedido existe en Katuq y en Cereza una sola vez, y la respuesta HTTP tarda menos de 4 s

### Requirement: Salud por automatización
WHEN un usuario consulta la salud de un flow de su empresa, THEN el sistema SHALL devolver cuándo fue la última señal (aviso, barrido o tick), la última ejecución con su resultado y motivo, el estado de la firma y la dirección correcta del webhook.

#### Scenario: Flow de otra empresa
- WHEN se consulta un flow que no pertenece a la empresa del usuario
- THEN responde 403

### Requirement: Prueba de conexión honesta
WHEN un usuario prueba la conexión de un conector, THEN el sistema SHALL responder verificada, fallida con el motivo, o "no verificable", y NEVER éxito sin haber verificado.

#### Scenario: Shopify con token inválido
- WHEN el token guardado no autoriza
- THEN la prueba responde fallida con "Shopify no aceptó el acceso. Revisa el token de la app."

### Requirement: Catálogo de pasos completo
WHEN el editor pide el catálogo, THEN cada paso SHALL traer qué conector necesita y cada parámetro un título y una descripción en español.

#### Scenario: Plantilla que necesita Shopify
- WHEN el asistente evalúa la plantilla "Recibir los pedidos de mi Shopify" y la empresa no tiene Shopify conectado
- THEN muestra Shopify como pendiente de conectar y no permite encender

### Requirement: Vocabulario sin jerga
WHEN un comercio usa la pantalla de automatizaciones, THEN NO SHALL ver los términos flow, run, trigger, nodo, cron, polling, webhook, payload, JSON, `$json`, rollback, edge, ni estados o motivos en inglés, fuera de la sección "Detalles técnicos" plegada y del Modo avanzado.

#### Scenario: Historial de una ejecución fallida
- WHEN un paso falló
- THEN la fila dice la fecha relativa, "Falló", "Un paso falló: <nombre del paso>" y el mensaje del error en una frase; el detalle técnico está plegado

### Requirement: Cuándo arranca, en tres modos
WHEN el usuario configura cuándo arranca una automatización, THEN SHALL poder elegir entre "cuando pase algo en la tienda", "cada cierto tiempo" y "todos los días a las…", sin escribir expresiones cron.

#### Scenario: Cuando la tienda avisa
- WHEN elige Shopify
- THEN ve la dirección correcta para pegar en Shopify, instrucciones en 4 pasos, cuándo llegó el último aviso y si está protegido

### Requirement: Tema canónico
WHEN se renderiza cualquier pantalla de automatizaciones o el canvas, THEN SHALL usar los tokens del tema canónico y NO SHALL contener los colores prohibidos ni gradientes ni acentos por `border-left`.

#### Scenario: Auditoría de estilos
- WHEN se busca `#2563eb`, `#4361ee`, `#2196f3`, `#5c6ac4`, `#667eea` o `linear-gradient` en los SCSS de flows y el CSS del canvas
- THEN no hay coincidencias
