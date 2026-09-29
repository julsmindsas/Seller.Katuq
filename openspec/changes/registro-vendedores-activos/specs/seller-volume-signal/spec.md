## ADDED Requirements

### Requirement: Pregunta de pedidos por semana solo en la campaña, opcional
Cuando el enlace traiga `perfil=vendedor`, el primer paso del registro SHALL mostrar "¿Cuántos pedidos recibes a la semana?" con cuatro botones (Todavía no vendo, Menos de 10, 10 a 50, Más de 50), sin agregar pantallas. Responderla SHALL ser opcional. Sin la marca, el registro y sus eventos SHALL NOT cambiar. Si hay respuesta, SHALL guardarse en la empresa con el origen de la campaña.

#### Scenario: Llega por la campaña de vendedores
- **WHEN** alguien entra con `perfil=vendedor`, escribe el nombre de su negocio y toca "10 a 50"
- **THEN** sigue al paso del correo, y la empresa queda con `pedidosSemana = "10_50"` y su origen

#### Scenario: No responde
- **WHEN** alguien con `perfil=vendedor` sigue sin tocar ninguna opción
- **THEN** se registra igual, sin error, y los eventos salen como hoy

#### Scenario: Registro general
- **WHEN** alguien entra sin `perfil=vendedor`
- **THEN** no ve la pregunta y el registro es idéntico al de hoy

### Requirement: Señal a Meta solo para registros aprobados o verificados
Al aprobarse el registro, o al confirmar el código, el sistema SHALL enviar `CompleteRegistration`, y si hubo respuesta, con los pedidos por semana, la calificación y `lead_score`. Además, SHALL enviar `VendedorActivo` si la respuesta es "10 a 50" o "Más de 50". Cada evento SHALL llevar un `event_id` estable. Un registro que no confirma su correo SHALL NOT generar ninguno de los dos.

#### Scenario: Vendedor activo aprobado
- **WHEN** un registro aprobado respondió "Más de 50"
- **THEN** Meta recibe `CompleteRegistration` con `pedidos_semana` y `VendedorActivo`, cada uno con su `event_id`

#### Scenario: Registro sin confirmar
- **WHEN** un registro queda en verificar y nunca escribe el código
- **THEN** Meta no recibe ninguno de los dos eventos

#### Scenario: Todavía no vende
- **WHEN** un registro aprobado respondió "Todavía no vendo"
- **THEN** Meta recibe `CompleteRegistration` y no recibe `VendedorActivo`

### Requirement: Métrica por campaña
El Super Admin SHALL ver por `utm_campaign`: registros, cuántos venden 10 o más a la semana, el porcentaje, el costo cargado y el costo por vendedor activo. La vista SHALL excluir las empresas de prueba y las no verificadas.

#### Scenario: Campaña de vendedores
- **WHEN** el Super Admin mira la semana del 1-oct
- **THEN** ve "registros-vendedores" con sus registros, sus vendedores activos y el costo por cada uno
