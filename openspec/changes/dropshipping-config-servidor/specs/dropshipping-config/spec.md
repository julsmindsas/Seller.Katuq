## Purpose

Guarda en el servidor, por empresa, si el módulo de dropshipping está habilitado y sus reglas de negocio. Así la configuración vale para todos los usuarios y dispositivos de la empresa, no solo para el navegador donde se guardó.

## ADDED Requirements

### Requirement: Configuración por empresa en el servidor
El sistema SHALL guardar la configuración de dropshipping de cada empresa en el servidor: si está habilitado, la fecha de activación, el margen mínimo (0 a 100 %), el tiempo límite de orden (1 a 30 días), la automatización, las notificaciones y los proveedores permitidos. La configuración SHALL ser la misma para todos los usuarios y dispositivos de la empresa.

#### Scenario: Guardar y abrir en otro dispositivo
- **WHEN** un administrador de A habilita dropshipping con margen 15 % y lo guarda, y otro usuario de A abre la pantalla en otro computador
- **THEN** ve dropshipping habilitado con margen 15 %

#### Scenario: Empresa sin configuración
- **WHEN** una empresa nunca ha guardado configuración
- **THEN** el sistema responde con dropshipping deshabilitado y los valores por defecto: margen 0, 7 días, automatización apagada y notificaciones prendidas

#### Scenario: Valores fuera de rango
- **WHEN** llega un margen de 150 % o un tiempo límite de 0 días
- **THEN** el sistema rechaza el guardado con un mensaje claro y deja la configuración anterior intacta

### Requirement: Quién puede cambiarla
Solo un administrador de la empresa con un plan que incluya dropshipping SHALL poder guardar la configuración. Cualquier usuario autenticado de la empresa SHALL poder leerla. Nadie SHALL poder leer ni escribir la de otra empresa.

#### Scenario: Usuario sin rol de administrador
- **WHEN** un usuario de A con rol Ventas intenta guardar la configuración
- **THEN** el sistema responde 403 y no cambia nada

#### Scenario: Plan sin dropshipping
- **WHEN** un administrador de una empresa en plan gratis intenta habilitar dropshipping
- **THEN** el sistema lo rechaza indicando que su plan no incluye el módulo

#### Scenario: Otra empresa
- **WHEN** un usuario de A intenta leer o guardar la configuración indicando la empresa B
- **THEN** el sistema responde 403

### Requirement: Otras ediciones de la empresa no la pisan
La configuración de dropshipping SHALL cambiar solo por su propia operación de guardado. Editar los datos generales de la empresa no SHALL modificarla.

#### Scenario: Editar Mi Empresa
- **WHEN** un administrador guarda cambios en Mi Empresa con una copia de la empresa que trae un valor viejo de dropshipping
- **THEN** la configuración de dropshipping guardada se conserva sin cambios

### Requirement: Menú y productos usan la configuración del servidor
El menú de Dropshipping y la opción de crear productos tipo dropshipping SHALL mostrarse según la configuración guardada en el servidor para la empresa activa. Ningún dato guardado solo en el navegador SHALL prender el módulo.

#### Scenario: Habilitar y ver el menú
- **WHEN** un administrador guarda dropshipping como habilitado
- **THEN** el menú de Dropshipping y la opción de producto dropshipping aparecen sin cerrar sesión

#### Scenario: Copia local sin configuración en el servidor
- **WHEN** el navegador tiene una configuración local que dice "habilitado" y el servidor dice deshabilitado
- **THEN** el menú y la opción de producto dropshipping no aparecen

### Requirement: Subir la configuración que estaba en el navegador
Cuando un administrador abra la pantalla y exista una configuración guardada solo en ese navegador, sin configuración en el servidor, el sistema SHALL ofrecer guardarla para toda la empresa. Después de aceptar o rechazar, la copia local SHALL eliminarse.

#### Scenario: Aceptar la migración
- **WHEN** el administrador acepta subir la configuración encontrada en el navegador
- **THEN** queda guardada en el servidor con sus valores y la copia local se borra

#### Scenario: El servidor ya tiene configuración
- **WHEN** existe configuración en el servidor y también una copia local
- **THEN** no se ofrece la migración, se usa la del servidor y la copia local se borra

### Requirement: Sin campos que no funcionan
La pantalla de configuración de la empresa no SHALL mostrar campos de integración por API, clave ni URL de webhook, porque no tienen efecto. Tampoco SHALL mostrar herramientas de prueba que guarden en el navegador. La conexión por API se configura en cada proveedor.

#### Scenario: Abrir la pantalla
- **WHEN** cualquier usuario abre la Configuración de Dropshipping
- **THEN** ve el interruptor, las reglas de negocio y el sistema, y no ve tipo de integración, endpoint, clave, URL de webhook ni herramientas de desarrollo
