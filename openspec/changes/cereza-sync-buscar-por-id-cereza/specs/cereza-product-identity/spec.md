## Purpose

Que un producto de Cereza tenga una sola ficha en Katuq aunque Cereza le cambie la referencia, para evitar existencias fantasma y ventas de un SKU que Cereza no reconoce.

## ADDED Requirements

### Requirement: La ficha se identifica por el id de Cereza
Al sincronizar un producto de Cereza, el sistema SHALL buscar primero la ficha de la empresa que tenga ese id de Cereza, guardado como número o como texto. Solo si no existe, SHALL buscarla por referencia. SHALL crear una ficha nueva únicamente cuando no la encuentre por ninguno de los dos caminos.

#### Scenario: Cereza cambia la referencia de un producto existente
- **WHEN** llega una actualización del producto Cereza 27311 con referencia "7708516916169", y ya existe la ficha GCC932 con id de Cereza 27311
- **THEN** se actualiza la ficha GCC932 y no se crea una ficha nueva

#### Scenario: Producto nuevo de Cereza
- **WHEN** llega un producto cuyo id de Cereza no existe en ninguna ficha, ni tampoco su referencia
- **THEN** se crea una ficha nueva

### Requirement: La referencia de una ficha existente no cambia por la sincronización
Cuando la ficha se encuentra por id de Cereza y Cereza manda otra referencia, el sistema SHALL NOT cambiar la referencia de la ficha. SHALL dejar un aviso visible en el registro de sincronización del producto.

#### Scenario: Referencia distinta
- **WHEN** la ficha existe con referencia GCC932 y Cereza manda "7708516916169"
- **THEN** la ficha conserva GCC932 y el registro de sincronización muestra el aviso con las dos referencias

### Requirement: Fichas repetidas no se tocan
Si hay más de una ficha de la empresa con el mismo id de Cereza, el sistema SHALL NOT actualizar ni crear ninguna. SHALL registrar el error para revisión humana.

#### Scenario: Dos fichas con el mismo id
- **WHEN** llega un producto cuyo id de Cereza está en dos fichas
- **THEN** no se escribe en ninguna y el error queda registrado con las dos fichas

### Requirement: El registro dice lo que pasó
El registro de cada evento de Cereza SHALL indicar si la ficha se creó o se actualizó.

#### Scenario: Evento que crea
- **WHEN** un evento de actualización termina creando una ficha
- **THEN** el registro lo muestra como creación
