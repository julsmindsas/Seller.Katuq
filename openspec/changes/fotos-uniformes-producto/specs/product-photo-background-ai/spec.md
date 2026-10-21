> **[D-518, pendiente de aprobación]** Fase 2 de la ampliación del 21-oct: quitar o reemplazar el fondo con IA. Diseño: `design-fase-2.md`. Se enciende solo con el OK de Daniel al costo.

## ADDED Requirements

### Requirement: Nace apagada y se enciende con el OK del costo
WHILE no esté encendida la función de quitar el fondo para la empresa, o no esté habilitado el proveedor de IA de la plataforma, el sistema SHALL NOT ofrecer «Quitar fondo» y SHALL NOT enviar ninguna foto a un proveedor de IA. El proveedor de la plataforma SHALL habilitarse solo después de que Daniel apruebe el costo por foto medido y la revisión de privacidad. Habilitar el proveedor para esta función SHALL NOT habilitarlo para otras funciones.

Fuente: D-518 TX-37·6 («Se enciende con el OK de Daniel del costo»); D-501 («Fase 2 … con otra bandera, el interruptor del servidor y el proveedor que se apruebe»); `ficha-desde-una-foto/design.md` decisión 8.

#### Scenario: Antes del OK
- **WHEN** FLORECER tiene la fase 1 encendida y Daniel no ha aprobado el costo
- **THEN** el diálogo no muestra «Quitar fondo» y ninguna foto sale a un proveedor de IA

#### Scenario: Otra función con fotos
- **WHEN** el proveedor está habilitado para uniformar fotos y alguien crea un producto desde una foto
- **THEN** esa función no le pide al proveedor quitar el fondo

### Requirement: Quitar o reemplazar el fondo
WHERE la función está encendida y la persona elige «Quitar fondo», el sistema SHALL separar el producto de su fondo y SHALL ponerlo, centrado y en la proporción elegida, sobre el fondo uniforme elegido. IF el resultado no deja un producto reconocible, THEN el sistema SHALL dejar la foto como estaba y avisarlo. IF la foto no cumple lo que el proveedor acepta, THEN el sistema SHALL omitirla sin gastar. El sistema SHALL conservar el original y permitir revertir como en la fase 1.

Fuente: ticket 1252, título («con IA: quitar o unificar fondo») y «Qué se espera» («quitar el fondo o reemplazarlo por uno uniforme»); criterio de aceptación CA2 del informe de D-518; D-501, «valida la foto antes de gastar».

#### Scenario: Fondo de color a sangre
- **WHEN** se aplica «Quitar fondo» con fondo blanco a una foto de Almara con fondo verde lima
- **THEN** el producto queda sobre blanco, centrado, en la proporción elegida, y se puede revertir

#### Scenario: Recorte fallido
- **WHEN** el proveedor devuelve una imagen sin producto reconocible
- **THEN** esa foto queda como estaba y el resumen dice que no se pudo quitar el fondo

### Requirement: Marcas sobre el fondo
WHEN se quita el fondo de una foto que tiene un logo o marca pequeña separada del producto en una esquina o borde, el sistema SHALL dejarla fuera del resultado. IF la marca está encima del producto, THEN el sistema SHALL conservarla y seguir avisándola.

Fuente: D-518 TX-37·2 («Quitarlos con IA va en la fase 2»); adjunto del ticket 1259 (cd 3UrH47Mko7eruBnF4tak).

#### Scenario: Logo en la esquina
- **WHEN** se quita el fondo de una foto con «Almara» abajo a la derecha, separado del producto
- **THEN** el resultado no trae el logo

### Requirement: Cupo por plan y una sola vez por foto
El sistema SHALL contar cada foto enviada al proveedor contra un cupo mensual por empresa que depende de su plan, y un plan sin cupo definido SHALL tener cero. WHEN se va a aplicar un lote, el sistema SHALL decir cuántos usos necesita y cuántos quedan, y IF no alcanzan, THEN SHALL rechazarlo sin procesar nada. IF el cupo se acaba mientras corre, THEN el sistema SHALL detener el lote o la serie y dejar reversible lo hecho. IF el proveedor no responde, THEN el sistema SHALL devolver el uso, y IF falla varias veces seguidas, THEN SHALL detener el lote. El sistema SHALL NOT cobrar dos veces la misma foto de origen: ni al cambiar el fondo, la proporción o el margen, ni al aplicar lo que ya pagó la vista previa, ni al volver a aplicar después de revertir.

Fuente: D-518 TX-37·6 («con costo por foto confirmado y cupo por plan»); D-501, propuesta, «Gasto: la vista previa solo cobra la muestra. Lo procesado se guarda como la foto que se aplicará … y aplicar no vuelve a pagar».

#### Scenario: Cupo insuficiente
- **WHEN** a una empresa le quedan 20 usos y quiere quitar el fondo de 60 fotos
- **THEN** recibe el aviso con los dos números y no se procesa nada

#### Scenario: Cambiar el color de fondo
- **WHEN** una categoría ya tiene el fondo quitado sobre blanco y se aplica de nuevo con el color de la marca
- **THEN** no se descuenta ningún uso

#### Scenario: Revertir y volver a aplicar
- **WHEN** se revierte un lote con el fondo quitado y se aplica otra vez a los mismos productos
- **THEN** no se descuenta ningún uso

#### Scenario: Proveedor caído
- **WHEN** el proveedor no responde a tres fotos seguidas
- **THEN** el lote se detiene, esas fotos quedan como estaban y sus usos vuelven al cupo

#### Scenario: Modo sombra
- **WHEN** el sistema está en sombra y se corre un lote con «Quitar fondo»
- **THEN** ninguna foto sale al proveedor, no se descuenta ningún uso y el registro dice cuántos usos habría costado

### Requirement: La vista previa avisa su costo y no se paga dos veces
**[→ D-518 reemplaza, solo con «Quitar fondo», el requisito aprobado «Vista previa sin escrituras» de `product-photo-uniform`]** WHEN una persona administradora pide la vista previa con «Quitar fondo», el sistema SHALL decirle antes cuántos usos puede consumir, SHALL guardar lo procesado para que aplicar no lo vuelva a cobrar y SHALL NOT cambiar ningún producto. WHILE el sistema esté en modo sombra, o la persona no sea administradora, el sistema SHALL NOT ofrecer la vista previa con «Quitar fondo».

Fuente: D-501, propuesta, «Gasto: la vista previa solo cobra la muestra … aplicar no vuelve a pagar»; valores por defecto P17 y P18 (pregunta 14).

#### Scenario: Vista previa
- **WHEN** una administradora pide la vista previa de 3 fotos con «Quitar fondo» y luego aplica el lote
- **THEN** ve antes «usa hasta 3 de tus usos del mes», ningún producto cambia con la vista previa y esas 3 fotos no se cobran otra vez al aplicar

### Requirement: Sin nombre del proveedor
El sistema SHALL presentar la función como «Quitar fondo» y SHALL NOT mostrar el nombre del modelo ni del proveedor de IA.

Fuente: constitución, Artículo VI; D-501, propuesta, «Pantalla».

#### Scenario: Diálogo
- **WHEN** una persona abre el diálogo con la fase 2 encendida
- **THEN** ve «Quitar fondo» y ningún nombre de proveedor
