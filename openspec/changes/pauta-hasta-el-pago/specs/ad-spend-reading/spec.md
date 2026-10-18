## ADDED Requirements

### Requirement: El gasto de la pauta se lee solo
El sistema SHALL obtener de la plataforma de anuncios, sin que nadie lo escriba, el gasto, las impresiones y los clics de la cuenta publicitaria de Katuq, por día, campaña, conjunto y anuncio, para cualquier rango de fechas que pida el Super Admin de Julsmind.

El acceso SHALL ser de solo lectura. El sistema SHALL NOT crear, pausar ni modificar campañas, conjuntos o anuncios.

#### Scenario: Rango de los últimos 7 días
- **WHEN** el Super Admin de Julsmind abre el embudo de la pauta con los últimos 7 días
- **THEN** ve el gasto real de cada campaña y anuncio de esos días, tal como lo reporta Meta, en pesos

#### Scenario: Intento de escritura
- **WHEN** cualquier parte del sistema intenta cambiar el estado o el presupuesto de un anuncio con esta conexión
- **THEN** no existe ninguna función que lo haga y la credencial tampoco tiene ese permiso

### Requirement: Cruce del gasto con los registros por anuncio
El sistema SHALL atribuir cada empresa registrada a su anuncio con el id guardado en su origen (`utm_content`), y a su campaña con `utm_campaign` o el id de campaña.

Cuando una empresa no trae id de anuncio, el sistema SHALL atribuirla solo a nivel de campaña y SHALL marcarla así en pantalla.

#### Scenario: Registro con id de anuncio
- **WHEN** una empresa se registró desde un enlace con `utm_content=120252211339020563`
- **THEN** cuenta como registro de ese anuncio y de su campaña

#### Scenario: Campaña vieja con nombre del anuncio
- **WHEN** una empresa trae `utm_content` con el nombre del anuncio en lugar del id
- **THEN** cuenta en la campaña y aparece en "sin anuncio identificado"

### Requirement: Sin datos de Meta no se cae nada
Si la credencial falta, venció o Meta no responde, el sistema SHALL mostrar "sin datos de Meta" y usar el costo escrito a mano cuando exista. Los registros y el resto del embudo SHALL seguir mostrándose.

#### Scenario: Token vencido
- **WHEN** Meta responde que el token ya no es válido
- **THEN** el embudo muestra registros, primeros pedidos y pagos, el gasto aparece como "sin datos de Meta" y el resumen diario lo avisa

### Requirement: La pantalla no depende del proveedor
La pantalla y el resumen SHALL recibir el gasto en un formato propio de Katuq (fuente, fecha, campaña, anuncio, gasto, impresiones, clics), de modo que otra plataforma de anuncios se pueda sumar sin cambiar la pantalla.

#### Scenario: Fuente nombrada
- **WHEN** se muestra una fila de gasto
- **THEN** dice de qué plataforma viene ("Meta") y no usa nombres de campos de Meta

### Requirement: La credencial no sale del servidor
La credencial de lectura SHALL vivir solo en la configuración del servidor. SHALL NOT viajar al navegador, quedar en Firestore ni escribirse en el log, tampoco en los errores.

#### Scenario: Error de Meta en el log
- **WHEN** Meta rechaza una consulta
- **THEN** el log guarda el código y el mensaje del error, sin el token ni la URL con el token
