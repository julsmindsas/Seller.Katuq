# sitios-publicacion-segura

> **NUEVA (D-518, 21-oct), pendiente de aprobación del texto.** Cambio A de esta carpeta: arregla lo publicado en D-478 y puede ir antes que todo lo demás. Cada requisito cita su fuente. «Ticket» es el 1253 (F5-29); «·N» es la decisión F5-29·N de D-518. Los detalles de seguridad están en la revisión privada del backend (P-n). **[REVISADO]** Los requisitos marcados **(A·U)** restituyen lo que D-478 ya prometía (·1, «corregir ya») y pueden implementarse antes de aprobar el resto.

## ADDED Requirements

### Requirement: Un administrador siempre puede publicar (A·U)
THE system SHALL dejar publicar, restaurar, programar, quitar de línea, unir y cambiar la dirección de un sitio publicado a todo usuario de la familia administrador, aunque la lista de quién publica no lo nombre.
Fuente: ·1; D-478 («la familia administrador siempre puede»); texto de la pantalla «Los administradores siempre pueden».

#### Scenario: Lista sin «Administrador»
- **WHEN** la lista de quién publica es solo «Marketing» y un administrador publica
- **THEN** el sitio sale y queda la versión a su nombre

### Requirement: Quién publica se decide para todo el comercio
THE system SHALL aplicar a cada sitio del comercio la lista de quién publica que defina un administrador para todo el comercio. WHERE un sitio tiene además su propia lista, THE system SHALL exigir las dos. Una lista vacía SHALL significar «todos», como hoy. Solo la familia administrador SHALL poder cambiar cualquiera de las dos listas.
Fuente: ·2; criterio del ticket «un editor no puede publicar»; P-3.

#### Scenario: Sitio nuevo, generado o creado por Opttia
- **WHEN** un usuario cuyo rol no está en la lista del comercio crea un sitio por cualquier camino y lo intenta publicar
- **THEN** el sistema lo rechaza con el mismo aviso de falta de permiso

#### Scenario: Duplicar una página restringida
- **WHEN** alguien duplica una página que tiene su propia lista
- **THEN** la copia nace con esa misma lista

#### Scenario: Opttia
- **WHEN** Opttia o una herramienta conectada intenta publicar un sitio con una lista efectiva no vacía
- **THEN** no publica, como en D-478, salvo que el pedido venga con la sesión de un usuario que sí puede publicar ese sitio

### Requirement: El autor sale de la sesión (A·U)
THE system SHALL tomar el autor de cada publicación, versión, programación, edición y creación de sitio de la sesión firmada, nunca de un dato que mande el navegador. Lo publicado por una herramienta conectada SHALL quedar a nombre de la persona que lo pidió.
Fuente: ·1 («autor tomado del token»); P-5, P-9.

#### Scenario: Cabecera con otro correo
- **WHEN** una petición manda un correo distinto al de su sesión
- **THEN** el historial, el dueño del sitio y la última edición muestran el correo de la sesión

### Requirement: Todo cambio de lo publicado deja versión y cierra lo programado (A·U)
WHEN cambia lo publicado de un sitio, porque se publica, se restaura, sale una programada, publica Opttia o se une una página, THE system SHALL guardar una versión con fecha, autor y motivo. WHEN se publica o se quita de línea por cualquier camino, THE system SHALL cancelar la publicación programada pendiente de ese sitio y, si se quitó de línea, SHALL dejar ese motivo visible.
Fuente: ·1 («versión al unir», «Opttia que limpie publicacionProgramada»); D-478 («quitar de línea es tan público como publicar»); CA4 del informe; P-8, P-9. [REVISADO]

#### Scenario: Unir a mi sitio principal
- **WHEN** se une una página a un sitio principal publicado
- **THEN** el historial del principal tiene una entrada nueva «unió la página /ruta»

#### Scenario: Opttia publica con una programada pendiente
- **WHEN** Opttia publica un sitio que tenía una publicación programada
- **THEN** la programada queda cancelada y no vuelve a publicar después

#### Scenario: Quitar de línea con una programada pendiente [REVISADO]
- **WHEN** alguien con permiso quita de línea un sitio que tenía una publicación programada
- **THEN** el sitio no vuelve a salir a la hora programada, y el editor dice que la programación se canceló por eso

### Requirement: La programada publica lo que se aprobó al programar
WHEN alguien con permiso programa una publicación, THE system SHALL guardar una copia del borrador de ese momento y SHALL publicar esa copia a la hora fijada, aunque el borrador cambie después. Al ejecutarse, THE system SHALL comprobar que quien programó sigue en el comercio y puede publicar ese sitio, y que la cuenta del comercio puede escribir. IF alguna condición falla, THEN THE system SHALL no publicar, SHALL cancelar la programación y SHALL dejar el motivo visible para el comercio en el editor. IF no puede comprobarlas, THEN THE system SHALL reintentar en la siguiente vuelta, hasta tres veces, y después cancelar con motivo. THE system SHALL publicar cada programación una sola vez, y SHALL NOT publicar una copia que ya fue reemplazada o cancelada. El motivo de una programada que no salió SHALL verse en el editor (A·U).
Fuente: ·3; ·1 («motivo de la programada fallida»); CA7 del informe; P-4. [REVISADO]

#### Scenario: Se edita después de programar
- **WHEN** un editor cambia el borrador después de que un publicador programó
- **THEN** sale lo que había al programar, y el cambio del editor sigue solo en el borrador

#### Scenario: Cuenta suspendida
- **WHEN** el comercio queda suspendido antes de la hora programada
- **THEN** no se publica, y el editor muestra «No se publicó: tu cuenta está en solo lectura»

#### Scenario: Quien programó perdió el permiso
- **WHEN** el administrador saca de la lista el rol de quien programó
- **THEN** no se publica y el editor muestra el motivo

#### Scenario: Reprogramar mientras se ejecuta [REVISADO]
- **WHEN** alguien reprograma o cancela justo cuando llega la hora de la programación anterior
- **THEN** sale a lo sumo una publicación, nunca la copia reemplazada, y la programación nueva queda intacta

#### Scenario: Programar con cambios sin guardar [REVISADO]
- **WHEN** alguien programa con cambios del editor que aún no se guardaron
- **THEN** se programa solo después de guardarlos, y si el guardado falla no se programa y se le dice

### Requirement: Dominio, pagos y pauta los cambia un administrador
THE system SHALL permitir solo a la familia administrador conectar, cambiar o quitar el dominio propio de cualquier sitio, cambiar los medios de pago de la tienda del sitio, cambiar la medición y la pauta, y enviar la prueba de medición. WHEN otro rol guarda un borrador con valores distintos en esos campos, THE system SHALL conservar los guardados y SHALL decirle que esos campos los cambia un administrador. El resto del borrador SHALL guardarse normalmente. WHERE una agencia actúa con una concesión que incluye el permiso de medición y pauta, THE system SHALL tratarla como a la familia administrador solo para la medición, la pauta y su prueba, nunca para el dominio ni los pagos (ver `sitios-acceso-agencia`).
Fuente: ·5; ·8 (medición solo si se concede); descripción del ticket («administrador: dominio, pagos, pauta»); P-7. [REVISADO]

#### Scenario: Un editor apaga el pago en línea
- **WHEN** un editor guarda el borrador con el pago en línea apagado
- **THEN** el pago en línea sigue como estaba, se guardan sus demás cambios y ve el aviso

#### Scenario: Autoguardado sin cambios
- **WHEN** el autoguardado de un editor manda el dominio, los pagos y la medición sin cambios
- **THEN** el guardado pasa sin aviso

### Requirement: Restaurar no cambia la tienda ni la pauta y no pierde el borrador
WHEN alguien restaura una versión, THE system SHALL publicar la presentación de esa versión (secciones, páginas, diseño, textos, SEO, enlaces y redirecciones) con la configuración de la tienda y la pauta que están publicadas en ese momento. Antes, THE system SHALL guardar el borrador vigente si difiere de lo publicado, y SHALL permitir devolverlo al borrador sin publicarlo. THE system SHALL restaurar solo publicaciones del historial y SHALL devolver al borrador solo borradores guardados.
Fuente: ·6; CA5 del informe; P-6. [REVISADO]

#### Scenario: Versión con otros medios de pago
- **WHEN** se restaura una versión de cuando la tienda tenía otros medios de pago y otro píxel
- **THEN** vuelve la presentación vieja y siguen los medios de pago y el píxel de hoy

#### Scenario: Borrador sin publicar
- **WHEN** había cambios en el borrador sin publicar y alguien restaura
- **THEN** esos cambios quedan guardados y se pueden recuperar al borrador con un clic

### Requirement: Las versiones no guardan secretos
THE system SHALL guardar cada versión, copia programada o borrador guardado sin los tokens de servidor de la medición, y SHALL quitarlos de las versiones existentes.
Fuente: ·6 («las versiones dejan de copiar tokens»); P-6.

#### Scenario: Historial de un sitio con conversión desde el servidor
- **WHEN** se revisan las versiones de un sitio con tokens de Meta, GA4 o TikTok
- **THEN** ninguna versión los contiene, y lo publicado sigue enviando conversiones

### Requirement: La pantalla dice la verdad sobre quién publica
THE system SHALL mostrar «Publicar», «Programar» y «Restaurar» solo a quien puede hacerlo en ese sitio, y «Quién puede publicar», dominio, pagos y medición editables solo a la familia administrador, con la misma regla del servidor y desde que se abre el editor. Quien no puede SHALL ver por qué y a quién pedirlo.
Fuente: ·1 («administrador»); D-478; P-7. La regla del servidor para «Quién puede publicar» va en A·U. [REVISADO]

#### Scenario: Rol «Administrativo»
- **WHEN** entra un usuario con el rol «Administrativo», que no es de la familia administrador
- **THEN** no ve «Quién puede publicar» como editable, igual que lo decide el servidor

### Requirement: Nada fuera de Sitios
Por estos arreglos, THE system SHALL NOT escribir pedidos, pagos, reservas, inventario, consecutivos, productos, precios, usuarios, roles ni integraciones.
Fuente: AGENTS.md, módulos sensibles; D-134.

#### Scenario: Recorrido de escrituras
- **WHEN** se ejecuta cada acción de este cambio
- **THEN** solo cambian los sitios, sus versiones y el ajuste de quién publica del comercio, más la marca de primera publicación de la empresa y su evento, que ya existían [REVISADO]
