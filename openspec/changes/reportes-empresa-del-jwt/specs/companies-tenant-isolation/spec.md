## ADDED Requirements

### Requirement: Candado de plataforma por la empresa de la sesión
El sistema SHALL permitir las operaciones reservadas al dueño de la plataforma solo si la empresa de la sesión verificada en el servidor es Julsmind. La comparación ignora mayúsculas y espacios. Esas operaciones son:
- el panorama de todas las empresas;
- los cobros del mes;
- cambiar el estado del ciclo de vida de una empresa;
- ver el historial de estados de una empresa;
- ver los pedidos excluidos de una empresa.

Lo que mande el navegador como empresa SHALL NOT abrir ni cerrar el acceso.

El rechazo SHALL ocurrir antes de leer o escribir datos.

#### Scenario: Comercio se hace pasar por Julsmind
- **WHEN** un administrador de la empresa A pide el panorama enviando `company: Julsmind`
- **THEN** recibe 403 y no se lee ninguna empresa

#### Scenario: Operador de Julsmind abre la consola
- **WHEN** un usuario cuya sesión es de Julsmind abre "Configuración de empresa" con la consola de plataforma
- **THEN** ve el panorama y los cobros de todas las empresas, igual que hoy

#### Scenario: Sesión sin empresa
- **WHEN** alguien sin empresa en la sesión, por ejemplo con la llave de servicio, pide el panorama
- **THEN** recibe 403

### Requirement: Cambiar el estado de una empresa ajena solo desde Julsmind
Cuando se pide cambiar el estado del ciclo de vida de una empresa, el sistema SHALL ejecutarlo solo si la sesión es de Julsmind, con las mismas transiciones, historial y campos de hoy.

La empresa destino SHALL poder ser cualquiera. Que la empresa destino sea distinta a la de la sesión SHALL NOT bloquear a Julsmind.

#### Scenario: Comercio intenta suspender a otro
- **WHEN** un administrador de la empresa A pide suspender la empresa B enviando `company: Julsmind`
- **THEN** recibe 403 y B queda en su estado

#### Scenario: Julsmind suspende un comercio
- **WHEN** un administrador de Julsmind suspende la empresa B desde la consola
- **THEN** B queda suspendida y el historial registra quién lo hizo, igual que hoy

### Requirement: Kit de marca y listado de empresas de la sesión
Cuando un usuario consulta o guarda el kit de marca, o pide el listado de empresas, el sistema SHALL usar la empresa de la sesión.

Si la solicitud trae otra empresa, SHALL rechazarla con 403 antes de leer o escribir.

El listado completo de empresas SHALL entregarse solo a una sesión de Julsmind. Cualquier otra sesión SHALL recibir solo su propia empresa, como hoy.

#### Scenario: Reescribir la marca de otro comercio
- **WHEN** un usuario de la empresa A guarda el kit de marca enviando la empresa B
- **THEN** recibe 403 y ni el kit ni las páginas de B cambian

#### Scenario: Comercio pide el listado diciendo ser Julsmind
- **WHEN** un usuario de la empresa A pide el listado de empresas enviando `company: Julsmind`
- **THEN** recibe 403 y no ve ninguna otra empresa

#### Scenario: Comercio edita su propia marca
- **WHEN** un usuario de la empresa A guarda su kit de marca
- **THEN** el kit de A queda guardado y sus páginas toman los colores nuevos, igual que hoy

### Requirement: Los rechazos de plataforma quedan registrados
Cada rechazo de este capítulo SHALL quedar en el registro de accesos denegados con:
- la ruta;
- el motivo;
- la empresa pedida por el navegador;
- el correo de la sesión.

El registro SHALL NOT guardar el token. Si el registro falla, el rechazo SHALL responderse igual.

#### Scenario: Intento de abrir la consola
- **WHEN** se rechaza el panorama a una sesión de la empresa A que envió `company: Julsmind`
- **THEN** queda una entrada con la ruta, el motivo, "Julsmind" como empresa pedida y el correo de la sesión
