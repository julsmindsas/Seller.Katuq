## ADDED Requirements

### Requirement: Una cuenta por verificar entra, pero con límites
Una empresa en "verificar" SHALL poder iniciar sesión, hacer el onboarding, cargar productos, configurar su tienda y guardar borradores. Hasta verificarse, el servidor SHALL impedirle:
- publicar tiendas o páginas, por cualquier camino, incluido Opttia;
- crear o activar pasarelas de pago;
- programar o probar campañas de correo, mandar correos de prueba de la tienda o correos de texto libre, y enviar WhatsApp (difusión, conversación nueva o respuesta);
- recibir el bono de saldo de WhatsApp de bienvenida.

Cada impedimento SHALL responder con un código propio que el panel reconozca y que no cierre la sesión.

#### Scenario: Publicar sin verificar
- **WHEN** una empresa sin verificar intenta publicar su tienda desde el editor o pidiéndoselo a Opttia
- **THEN** el servidor no publica, responde "Verifica tu cuenta para publicar" con el código de verificación pendiente y la sesión sigue abierta

#### Scenario: Conectar Wompi sin verificar
- **WHEN** una empresa sin verificar guarda o activa la configuración de una pasarela de pago
- **THEN** el servidor no la guarda y el panel ofrece verificar

#### Scenario: Lo demás funciona
- **WHEN** una empresa sin verificar crea un producto, edita el borrador de su tienda o completa el onboarding
- **THEN** funciona igual que para una empresa aprobada

#### Scenario: Empresa aprobada
- **WHEN** una empresa aprobada en el registro, o que existía antes de este cambio, publica, conecta una pasarela o envía una campaña
- **THEN** no encuentra ningún impedimento nuevo

### Requirement: Verificar por WhatsApp o por correo
La persona SHALL poder verificar la cuenta con un código de 6 dígitos que le llega por WhatsApp al celular que registró, o por correo si lo prefiere o si WhatsApp falla. El código SHALL vencer a los 15 minutos, SHALL admitir hasta 5 intentos y SHALL poder pedirse de nuevo después de 60 segundos. El servidor SHALL guardar el código solo con hash. Al verificar, la empresa SHALL quedar sin límites de inmediato, sin cerrar ni abrir sesión.

#### Scenario: Verifica por WhatsApp
- **WHEN** la persona pide el código por WhatsApp y escribe el que le llegó
- **THEN** la cuenta queda verificada con método WhatsApp y la franja desaparece

#### Scenario: Código vencido o equivocado
- **WHEN** escribe un código vencido o equivocado
- **THEN** ve cuántos intentos le quedan y puede pedir otro; al quinto error debe pedir un código nuevo

#### Scenario: Celular mal escrito
- **WHEN** el celular registrado no recibe WhatsApp
- **THEN** la persona puede verificar por correo

### Requirement: Aviso claro en el panel
Mientras la empresa esté sin verificar, el panel SHALL mostrar en todas las pantallas con menú una franja con el motivo en lenguaje simple ("Verifica tu cuenta para publicar tu tienda y recibir pagos") y un botón "Verificar ahora" que abre la verificación sin salir de la pantalla. La franja SHALL seguir el tema canónico.

#### Scenario: Entra por primera vez
- **WHEN** una empresa sin verificar termina el onboarding y llega al panel
- **THEN** ve la franja con el botón "Verificar ahora"

#### Scenario: Choca con un límite
- **WHEN** intenta publicar sin verificar
- **THEN** ve el mismo ofrecimiento de verificar en la ventana del error, no un error técnico

### Requirement: Los píxeles de pauta cuentan solo cuentas verificadas o aprobadas
El registro completo SHALL notificarse a Meta y a TikTok al aprobarse el registro o, si queda en "verificar", solo cuando la cuenta se verifica. SHALL notificarse una sola vez por empresa, con un identificador de evento estable para que las plataformas no lo cuenten doble. Una cuenta que nunca se verifica SHALL NOT notificarse.

#### Scenario: Registro sospechoso
- **WHEN** un registro queda en "verificar"
- **THEN** Meta y TikTok no reciben el registro completo en ese momento

#### Scenario: Verifica después
- **WHEN** esa persona verifica su cuenta desde el panel
- **THEN** Meta y TikTok reciben el registro completo una vez, con el origen de campaña guardado en el registro

#### Scenario: Recarga la página después de verificar
- **WHEN** la persona recarga el panel después de verificar
- **THEN** el registro completo no se vuelve a enviar

### Requirement: Métricas sin cuentas sospechosas ni de prueba
Cada empresa SHALL poder marcarse como excluida de métricas, con el motivo `suspicious` o `test`. Una empresa en "verificar" SHALL quedar marcada `suspicious` al registrarse, y la marca SHALL quitarse sola al verificar. Los conteos de registros y de empresas SHALL excluir las empresas marcadas. Marcar una empresa SHALL NOT borrar ni desactivar nada.

#### Scenario: Aurora
- **WHEN** se aplica la marca a "Tienda Aurora" con el script de corrección
- **THEN** deja de contar en los registros y sigue existiendo con todos sus datos

#### Scenario: Sospechoso que verifica
- **WHEN** una empresa en "verificar" confirma su celular
- **THEN** vuelve a contar en las métricas

#### Scenario: Empresa de prueba del equipo
- **WHEN** alguien del equipo marca una empresa como `test`
- **THEN** no cuenta en las métricas aunque esté verificada
