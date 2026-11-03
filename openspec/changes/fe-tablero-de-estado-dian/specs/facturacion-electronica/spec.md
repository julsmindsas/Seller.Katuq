## ADDED Requirements

### Requirement: Un comercio habilitado ve su estado, no el asistente
Cuando una persona abre «Configuración DIAN» y la empresa ya tiene la facturación guardada, activa y en producción, el sistema SHALL mostrar primero un tablero de estado y SHALL dejar el asistente de configuración detrás de un botón «Editar». Cuando la empresa no tiene configuración, está en pruebas o la configuración no se pudo cargar, el sistema SHALL comportarse como hoy: asistente desde el paso 1, o el aviso de error con «Volver a cargar».

#### Scenario: Comercio en producción
- **WHEN** un comercio activo en producción abre «Configuración DIAN»
- **THEN** ve el tablero y no ve «Preparemos tu facturación electrónica»

#### Scenario: Editar
- **WHEN** la persona toca «Editar»
- **THEN** se abre el asistente con los datos guardados, igual que hoy, y puede volver al tablero sin guardar

#### Scenario: Comercio nuevo o en pruebas
- **WHEN** el comercio no tiene configuración o está en pruebas
- **THEN** ve el asistente desde el paso 1, como hoy

#### Scenario: Falla la carga
- **WHEN** no se puede leer la configuración guardada
- **THEN** no se muestra el tablero con datos vacíos: se muestra el error con «Volver a cargar»

### Requirement: El tablero muestra lo que importa
El tablero SHALL mostrar el ambiente (Producción), la resolución con su prefijo y su rango autorizado, los consecutivos usados y los restantes con su porcentaje, el próximo consecutivo, la vigencia de la resolución (desde y hasta, con los días que faltan) y el vencimiento del certificado de firma (fecha y días que faltan). Los consecutivos SHALL contarse así: usados = próximo − inicio; restantes = fin − próximo + 1. Cuando un dato no exista o no sea válido, el sistema SHALL mostrar «Sin dato» y NO SHALL mostrar una cifra supuesta ni un estado verde. El tablero SHALL ser de solo lectura y NO SHALL mostrar claves ni el contenido del certificado.

#### Scenario: Rango con 48 de 1000 usados
- **WHEN** el rango es 1–1000 y el próximo consecutivo es 49
- **THEN** el tablero muestra 48 usados, 952 restantes y 5 %

#### Scenario: Certificado sin fecha guardada
- **WHEN** el certificado se guardó sin fecha de vencimiento y el servidor no la entrega
- **THEN** el tablero muestra «Sin dato» en el certificado, con la indicación de volver a cargarlo, y no lo marca como vigente

### Requirement: Las alertas se ven en pantalla, con los mismos umbrales que los avisos
El sistema SHALL marcar en el tablero, con color, texto y ícono (no solo color), el estado de la resolución y del certificado según los días que faltan: más de 30 días, vigente; 30 días o menos, por vencer; 15 días o menos, alerta; 5 días o menos, crítico; vencido, bloqueante. El sistema SHALL marcar el rango según lo usado: desde 80 %, aviso; desde 90 % (quedan 10 % o menos), alerta; desde 95 %, crítico; agotado, bloqueante. Estos umbrales SHALL ser los mismos de los avisos por correo y campana (D-448); el sistema NO SHALL cambiar esos avisos ni su frecuencia. Cuando haya alguna alerta vigente, la franja de Facturación SHALL mostrar una línea con la más grave y un enlace al tablero. Mientras la condición siga, la alerta SHALL seguir visible aunque el aviso por correo ya se haya enviado.

#### Scenario: Resolución a 14 días
- **WHEN** a la resolución le faltan 14 días
- **THEN** el tablero la marca en alerta con «vence en 14 días»
- **AND** la franja de Facturación muestra la línea con enlace al tablero

#### Scenario: Quedan menos del 10 % de consecutivos
- **WHEN** el rango va en 91 %
- **THEN** el tablero marca el rango en alerta con los consecutivos restantes

#### Scenario: Todo en orden
- **WHEN** la resolución vence en más de 30 días, el certificado también y el rango va por debajo del 80 %
- **THEN** el tablero muestra todo vigente y la franja de Facturación no muestra línea de alerta

#### Scenario: Vencido
- **WHEN** la resolución o el certificado ya vencieron
- **THEN** el tablero lo marca como bloqueante y dice que sin ella no se puede facturar

### Requirement: El encabezado del asistente se ve completo
El sistema SHALL mostrar el ícono de «DIAN directo» y los títulos de los pasos del asistente completos, sin puntos suspensivos, tanto a 1440 como a 390 px.

#### Scenario: Pasos en pantalla angosta
- **WHEN** se abre el asistente a 390 px
- **THEN** «Rango de facturas» y «Confirmar antes de guardar» se leen completos y no hay desplazamiento horizontal

#### Scenario: Ícono
- **WHEN** se abre el asistente
- **THEN** el ícono de DIAN carga; si no carga, se muestra un ícono de respaldo y nunca un recuadro vacío

### Requirement: Solo lectura, de la empresa activa y con el diseño Katuq
El tablero SHALL leer únicamente los datos de la empresa activa y NO SHALL escribir ni modificar la configuración, la numeración, la resolución ni el certificado. El tablero SHALL usar el estilo plano de Katuq (fondo lila, tarjetas blancas, acento `#5F3FE0`, semánticos con fondo suave, labels en mayúscula tenue, sin degradados) y SHALL verse sin desplazamiento horizontal ni texto invisible a 1440 y 390 px. El asistente SHALL conservar sus campos, validaciones, pasos y textos.

#### Scenario: Abrir y salir
- **WHEN** se abre el tablero y se sale sin tocar «Editar»
- **THEN** la configuración, el próximo consecutivo y la resolución quedan exactamente igual

#### Scenario: Cambio de comercio
- **WHEN** una persona cambia de comercio activo y abre «Configuración DIAN»
- **THEN** el tablero muestra los datos del comercio nuevo y nada del anterior
