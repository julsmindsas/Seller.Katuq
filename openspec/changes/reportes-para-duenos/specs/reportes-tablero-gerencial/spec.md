## ADDED Requirements

### Requirement: Tablero con los indicadores clave
El sistema SHALL ofrecer un tablero de una sola pantalla con los indicadores clave del negocio, todos con la definición del diccionario de métricas:
- ventas;
- margen bruto, WHERE la rentabilidad esté disponible y el rol esté autorizado;
- ticket promedio;
- pedidos;
- cartera vencida;
- productos agotados o por agotarse;
- clientes nuevos;
- clientes perdidos.

Cada indicador SHALL mostrar el valor, la variación contra el período anterior y una mini tendencia. Al hacer clic SHALL abrir el detalle.

#### Scenario: Abrir el tablero
- **WHEN** el dueño abre el tablero
- **THEN** ve los indicadores del mes con su variación y su tendencia

#### Scenario: Bajar al detalle
- **WHEN** toca "Cartera vencida"
- **THEN** ve quién debe y desde cuándo, con el mismo total del indicador

### Requirement: Filtro global
El tablero SHALL tener un filtro de período y otro de sede o canal, y ambos SHALL aplicarse a todos sus bloques.

#### Scenario: Filtrar por canal
- **WHEN** el dueño elige el canal "Almara Online"
- **THEN** todos los bloques que dependen del canal se recalculan con ese filtro, y los que no dependen lo indican

### Requirement: Tablero configurable
El administrador SHALL poder definir qué tablero ve cada rol.

Cada persona SHALL poder, dentro de lo que su rol permite:
- agregar, quitar, reordenar y cambiar el tamaño de los bloques;
- fijar reportes guardados;
- volver al tablero de su rol.

#### Scenario: Fijar un reporte
- **WHEN** una gerente fija su reporte "Ventas por vendedor · este mes"
- **THEN** aparece como bloque en su tablero, sin cambiar el tablero de los demás

### Requirement: Tablero como página de inicio
Cada persona SHALL poder elegir el tablero como su página de inicio de Katuq.

#### Scenario: Entrar a Katuq
- **WHEN** una persona con esa opción inicia sesión
- **THEN** llega al tablero y no a la bienvenida

### Requirement: Metas
El sistema SHALL permitir registrar metas de ventas por mes, para la empresa o por vendedor, canal, sede o categoría. Se cargan a mano o desde un Excel.

Las metas de ventas SHALL llamarse y mostrarse distinto de las metas de cotizaciones, que miden lo cotizado convertido.

IF el Excel trae filas inválidas, THEN el sistema SHALL decir cuáles y por qué, y SHALL NOT cargar las válidas a medias sin avisar.

#### Scenario: Cargar metas
- **WHEN** el administrador sube un Excel con la meta de octubre de cada vendedor
- **THEN** cada vendedor tiene su meta, y las filas con error quedan listadas

### Requirement: Avance y proyección
Donde haya una meta, el tablero y los reportes SHALL mostrar:
- la barra de avance;
- el porcentaje cumplido;
- la proyección de cierre de mes al ritmo actual.

El ritmo actual es lo vendido hasta hoy dividido por los días transcurridos, multiplicado por los días del mes.

#### Scenario: Meta a mitad de mes
- **WHEN** el 15 de un mes de 30 días se llevan $20 M de una meta de $50 M
- **THEN** se ve "40 % cumplido" y "proyección de cierre: $40 M, te faltarían $10 M"

### Requirement: Permisos por rol
El tablero SHALL respetar los permisos del rol:
- con "cada vendedor ve solo sus métricas", el vendedor ve solo sus ventas, sus clientes y su meta;
- la cartera y la rentabilidad solo las ven los roles de gerencia y tesorería autorizados;
- un bloque sin permiso no aparece, y si fue fijado antes, explica que el rol no tiene acceso.

#### Scenario: Vendedor
- **WHEN** un vendedor restringido abre el tablero
- **THEN** ve solo sus cifras y su meta, y no ve la cartera de la empresa

### Requirement: Compartir con permisos
El sistema SHALL permitir compartir un tablero o un reporte:
- con personas de la empresa, que lo ven con sus propios permisos;
- con un enlace de solo lectura para externos (socio, inversionista), con fecha de vencimiento obligatoria, contenido elegido por quien comparte y opción de revocarlo.

Un enlace vencido o revocado SHALL dejar de mostrar datos. El enlace externo SHALL NOT mostrar documentos, teléfonos, correos ni direcciones de clientes finales.

#### Scenario: Enlace vencido
- **WHEN** alguien abre un enlace después de su fecha de vencimiento
- **THEN** ve que el enlace venció y ningún dato

#### Scenario: Enlace revocado
- **WHEN** el administrador revoca un enlace
- **THEN** deja de funcionar de inmediato

### Requirement: Vista para el celular
En el celular, el tablero SHALL:
- mostrar los indicadores en tarjetas apiladas;
- cargar primero ventas, meta y cartera;
- usar gestos simples;
- traer la lectura en palabras del día.

#### Scenario: Aceptación del ticket
- **WHEN** el dueño abre Katuq en el celular
- **THEN** en menos de 10 segundos sabe cuánto vendió, cuánto le falta para la meta del mes y cuánto le deben
