## ADDED Requirements

### Requirement: El catálogo distingue producto y servicio
El sistema SHALL permitir marcar cada ítem del catálogo como "Producto" o "Servicio" al crearlo o editarlo, en el formulario completo, en el rápido y en la importación masiva. Un ítem sin marca SHALL seguir siendo producto.

#### Scenario: Crear un servicio
- **WHEN** el comercio crea un ítem y elige "Servicio"
- **THEN** el ítem queda marcado como servicio y sin control de existencias
- **AND** el formulario no exige peso, dimensiones, tipo de entrega ni tiempo de entrega

#### Scenario: Ítems existentes
- **WHEN** se abre un ítem creado antes de este cambio
- **THEN** se muestra como "Producto" y conserva sus datos tal como estaban

#### Scenario: Importar servicios
- **WHEN** un archivo de importación trae la columna Tipo con el valor "Servicio"
- **THEN** el ítem se crea como servicio sin control de existencias, aunque la columna Inventariable diga "SI"

### Requirement: Un servicio nunca lleva inventario
El sistema SHALL impedir que un servicio quede con control de existencias. Marcar un ítem como servicio SHALL NOT crear, modificar ni borrar registros de inventario o movimientos.

#### Scenario: Intentar activar inventario
- **WHEN** alguien intenta activar el control de existencias de un servicio
- **THEN** el sistema lo rechaza con el mensaje "Un servicio no maneja existencias"

#### Scenario: Cambiar un producto a servicio
- **WHEN** un producto con existencias se cambia a servicio
- **THEN** el sistema pide confirmación y avisa que sus existencias dejarán de contarse
- **AND** los registros de inventario y movimientos quedan intactos

### Requirement: Datos propios del servicio
El sistema SHALL guardar, para cada servicio, su duración en minutos, dónde se presta (en el local, a domicilio o virtual) y si requiere cita. Si requiere cita y no tiene duración, SHALL usar 60 minutos.

#### Scenario: Servicio con cita
- **WHEN** el comercio marca "Requiere cita" en un servicio de 45 minutos en el local
- **THEN** el servicio se puede agendar en bloques de 45 minutos

#### Scenario: Servicio sin cita
- **WHEN** un servicio no requiere cita (por ejemplo, una recarga o una membresía)
- **THEN** se vende como hoy, sin pedir fecha ni hora

### Requirement: "Bajo pedido" no es servicio
El sistema SHALL tratar como producto físico todo ítem sin control de existencias que no esté marcado como servicio.

#### Scenario: Producto bajo pedido
- **WHEN** se vende un producto marcado sin control de existencias pero no marcado como servicio
- **THEN** el pedido sigue el camino de despacho actual

### Requirement: Precios y catálogo intactos
Marcar un ítem como servicio SHALL NOT cambiar su precio, su IVA, sus listas de precios, sus variantes, sus imágenes ni su publicación en canales.

#### Scenario: Servicio con lista de precios
- **WHEN** un producto con precio por cliente se marca como servicio
- **THEN** el precio por cliente sigue aplicándose igual
