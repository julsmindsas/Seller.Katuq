## ADDED Requirements

### Requirement: Los webhooks activos no cambian
El sistema SHALL procesar un aviso que llega al endpoint de webhook de un flow activo con el mismo resultado que antes de este cambio: misma respuesta HTTP, mismos datos al primer paso, mismos pasos ejecutados y mismos datos entre pasos. Esto vale con la bandera `flowsMotorCorregido` apagada, en sombra o encendida, siempre que el flow solo use salidas `main`, `true`, `false` o numéricas, y `$node` por id.

#### Scenario: Pedido de Shopify de OH MY STORE
- **WHEN** llega un pedido de Shopify a `shopify-orders-to-cereza-7e6ab5a3` con su grafo real
- **THEN** el mapeador recibe el cuerpo crudo del pedido
- **AND** `$node["persist"]` y `$node["trigger"]` resuelven igual que hoy
- **AND** se ejecutan los mismos 8 pasos con las mismas salidas

#### Scenario: Flow con pasos de inicio guardados
- **WHEN** el editor guarda un flow que ya tiene `triggers`
- **THEN** los `triggers` guardados son idénticos a los que tenía, salvo el horario que la persona cambie en Ajustes

### Requirement: El catálogo avisa y nunca frena una ejecución
El motor SHALL cargar el catálogo real de pasos. WHEN una ejecución arranca por webhook, cron, polling o prueba, THEN el sistema SHALL validar solo la estructura del grafo, como hoy: ciclos, ids y pasos de inicio. Los timeouts y la idempotencia de los pasos SHALL ser los mismos de hoy.

#### Scenario: Paso con un parámetro faltante en un flow encendido
- **WHEN** un flow encendido tiene un paso al que le falta un parámetro obligatorio según el catálogo
- **THEN** la ejecución corre como hoy
- **AND** el aviso queda en la respuesta del guardado, no en la ejecución

#### Scenario: Encender un flow incompleto
- **WHEN** la persona enciende un flow con un paso al que le falta un parámetro obligatorio
- **THEN** el encendido se rechaza con el nombre del paso y del campo, en lenguaje de negocio

### Requirement: Cada salida entrega sus propios registros
WHILE la bandera está encendida para el comercio, el sistema SHALL entregar por cada salida exactamente los registros que el paso emitió por ella: "Finalizado" del paso Repetir y "Otro caso" del paso Elegir.

#### Scenario: Repetir terminado
- **WHEN** el paso Repetir procesa 3 elementos y una línea sale por "Finalizado"
- **THEN** el paso siguiente recibe el registro de cierre, no los de la iteración

#### Scenario: Elegir sin coincidencia
- **WHEN** un registro no coincide con ningún caso
- **THEN** sale solo por "Otro caso"

### Requirement: `$node` por id
El sistema SHALL exponer la salida de cada paso como `$node["<id>"]`. WHEN un paso tiene notas que no coinciden con el id de otro paso, THEN el sistema SHALL exponerlo también como `$node["<notas>"]`.

#### Scenario: Paso con notas
- **WHEN** el paso `persist` tiene la nota "Guardar pedido"
- **THEN** `{{ $node["persist"].json[0].nroPedido }}` resuelve el número del pedido

### Requirement: Rama vacía no ejecuta
WHILE la bandera está encendida, WHEN un paso que no es de inicio recibe 0 registros por todas sus entradas, THEN el sistema SHALL marcarlo "Sin datos", SHALL NOT ejecutarlo y SHALL continuar con los pasos que sí tienen datos.

#### Scenario: Condición falsa
- **WHEN** el paso "Si…" manda todo por "No" y en "Sí" hay una petición HTTP
- **THEN** la petición no sale y la ejecución termina con éxito

### Requirement: Sombra antes de encender
WHILE la bandera está en sombra para el comercio, el sistema SHALL ejecutar como hoy y SHALL anotar en el documento de la ejecución (`flow_runs`) cada diferencia que habría producido el motor corregido: paso, regla y cantidad de registros.

#### Scenario: Ejecución sin diferencias
- **WHEN** un pedido de OH MY STORE corre en sombra y nada habría cambiado
- **THEN** la ejecución registra `sombra.diferencias = []`

### Requirement: Parámetros por registro solo para quien lo declara
WHEN un paso declara en el catálogo que procesa por registro, THEN el sistema SHALL entregarle los parámetros resueltos para cada registro. Los demás pasos SHALL recibir los parámetros como hoy.

#### Scenario: Paso actual
- **WHEN** corre `katuq-inventory-adjust` con 3 registros
- **THEN** recibe los mismos parámetros que hoy

### Requirement: Esperar más de 30 segundos
WHEN el paso Esperar tiene una espera mayor al límite por defecto, THEN el sistema SHALL darle un límite de tiempo igual a la espera más un margen, y SHALL NOT reintentarlo por exceder el tiempo.

#### Scenario: Espera de 45 segundos
- **WHEN** un flow espera 45 s
- **THEN** el paso termina con éxito después de 45 s

### Requirement: Flows nuevos quedan con sus pasos de inicio
WHEN se guarda un flow sin `triggers`, THEN el sistema SHALL derivarlos de los pasos de inicio del grafo según su categoría en el catálogo. WHEN un `trigger` guardado apunta a un paso que ya no existe, THEN el sistema SHALL quitarlo al guardar y SHALL avisarlo, sin bloquear el guardado.

#### Scenario: Webhook hecho a mano
- **WHEN** la persona arma "Webhook → Petición HTTP", guarda y enciende
- **THEN** Ajustes muestra la URL del aviso
- **AND** un POST a esa URL ejecuta el flow

#### Scenario: Paso de inicio borrado
- **WHEN** la persona borra el paso de inicio de un flow de plantilla y guarda
- **THEN** el guardado funciona y avisa que la automatización no tiene con qué arrancar

### Requirement: Encender, apagar y borrar se reflejan
WHEN la persona enciende o apaga un flow, THEN el sistema SHALL devolver el flow actualizado, y la pantalla SHALL mostrar el estado real. El guardado del editor SHALL NOT cambiar el estado del flow. WHEN se borra un flow, THEN el sistema SHALL apagar sus disparadores.

#### Scenario: Encender y seguir editando
- **WHEN** la persona enciende un flow y mueve un paso
- **THEN** el flow sigue encendido

#### Scenario: Borrar un flow encendido
- **WHEN** se borra un flow de polling encendido
- **THEN** su disparador queda inactivo y no vuelve a ejecutarse

### Requirement: El horario guardado se aplica
WHEN la persona cambia "Cada cuánto arranca" en un flow encendido, THEN el sistema SHALL actualizar el disparador sin apagar y encender. El horario SHALL guardarse en el campo que lee el despachador.

#### Scenario: Cambiar el intervalo
- **WHEN** un flow encendido pasa de 15 a 30 minutos
- **THEN** la siguiente ejecución respeta 30 minutos

### Requirement: Pasos de proveedor no disponibles
WHILE un paso de proveedor no tenga su integración funcionando, el catálogo SHALL marcarlo "No disponible" y la paleta SHALL NOT ofrecerlo. WHEN un flow existente lo ejecuta, THEN el paso SHALL fallar con un mensaje que diga qué paso no está disponible y qué hacer.

#### Scenario: Flow con SIIGO factura
- **WHEN** un flow ejecuta el paso de factura SIIGO
- **THEN** falla con "La factura de SIIGO desde automatizaciones aún no está disponible. Factura el pedido desde Pedidos."
