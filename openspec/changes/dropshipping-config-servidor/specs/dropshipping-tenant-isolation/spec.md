## Purpose

Garantiza que cada empresa vea y modifique solo sus propios proveedores y órdenes de dropshipping, y que las claves de los proveedores nunca salgan del servidor ni queden guardadas en texto plano.

## ADDED Requirements

### Requirement: La empresa sale solo de la sesión
Toda operación sobre proveedores y órdenes de dropshipping SHALL usar como empresa la de la sesión firmada. La empresa que llegue en el body, la query o los headers no SHALL ampliar ni cambiar el alcance.

#### Scenario: Lista sin parámetro de empresa
- **WHEN** un usuario de la empresa A pide la lista de proveedores sin indicar empresa
- **THEN** el sistema devuelve solo los proveedores de A, aunque existan proveedores de otras empresas

#### Scenario: Empresa ajena en la query
- **WHEN** un usuario de A pide la lista con `company=B` en la query
- **THEN** el sistema responde 403 o devuelve solo los de A, y nunca los de B

#### Scenario: Crear con empresa ajena o vacía
- **WHEN** un usuario de A crea un proveedor o una orden sin empresa en el body, o con la empresa B
- **THEN** el registro queda asociado a A, o la petición se rechaza con 403 si el body dice B

### Requirement: Acceso por id limitado a la propia empresa
Las operaciones sobre un proveedor u orden por su id SHALL comportarse como si el registro no existiera cuando pertenece a otra empresa. Esto aplica a consultar, actualizar, borrar, activar, desactivar, cambiar la configuración API, ver el resumen y sincronizar.

#### Scenario: Leer proveedor de otra empresa
- **WHEN** un usuario de A pide el proveedor con id X, que pertenece a B
- **THEN** el sistema responde 404 y no revela ningún dato de X

#### Scenario: Modificar proveedor de otra empresa
- **WHEN** un usuario de A intenta actualizar, borrar, activar o desactivar el proveedor X de B
- **THEN** el sistema responde 404 y X queda sin cambios

#### Scenario: Órdenes por proveedor ajeno
- **WHEN** un usuario de A pide las órdenes del proveedor X de B
- **THEN** el sistema no devuelve ninguna orden de B

### Requirement: Claves de proveedor protegidas
La clave de API de un proveedor SHALL guardarse cifrada y no SHALL devolverse nunca completa en ninguna respuesta. Las respuestas SHALL indicar si el proveedor tiene clave y mostrarla enmascarada, con a lo sumo los últimos 4 caracteres visibles.

#### Scenario: Guardar una clave
- **WHEN** un administrador guarda un proveedor con una clave de API
- **THEN** en la base de datos la clave queda cifrada, no en texto plano

#### Scenario: Consultar un proveedor con clave
- **WHEN** se consulta un proveedor que tiene clave, ya sea en la lista, por id o en la búsqueda
- **THEN** la respuesta trae la clave enmascarada y la marca de que existe, nunca la clave completa

#### Scenario: Guardar sin cambiar la clave
- **WHEN** se actualiza un proveedor y la clave recibida es la enmascarada o viene vacía
- **THEN** la clave guardada se conserva sin cambios

### Requirement: Claves viejas cifradas sin perder datos
Las claves existentes en texto plano SHALL cifrarse con un proceso que primero informe lo que va a cambiar sin escribir, y que no altere ningún otro campo del proveedor.

#### Scenario: Ensayo
- **WHEN** se ejecuta el proceso en modo ensayo
- **THEN** informa cuántos proveedores hay por empresa, cuántos no tienen empresa y cuántas claves están en texto plano, sin escribir nada

#### Scenario: Ejecución repetida
- **WHEN** el proceso se ejecuta dos veces
- **THEN** la segunda vez no vuelve a cifrar las claves que ya estaban cifradas
