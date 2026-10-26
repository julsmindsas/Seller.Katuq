## ADDED Requirements

### Requirement: Ancho del menú abierto (F1)
WHILE el menú lateral está abierto en escritorio, THE menú SHALL medir 264 px de ancho (rango permitido de 256 a 280 px). El contenido de la pantalla SHALL ocupar el resto, sin quedar debajo del menú.

#### Scenario: Pantalla de 1366 px
- **WHEN** el usuario abre Todos los pedidos en una pantalla de 1366×768 con el menú abierto
- **THEN** el menú mide 264 px y la pantalla no tiene scroll horizontal

### Requirement: Fila de tres zonas (F1)
Cada fila del menú SHALL tener, de izquierda a derecha:

- el ícono, de 20 px;
- el nombre, que toma todo el espacio que queda;
- una zona derecha de ancho fijo para la insignia, la estrella y el chevron.

En filas del mismo nivel, el nombre SHALL empezar en la misma posición y tener el mismo ancho disponible, tenga o no insignia. La insignia, la estrella, el chevron y el punto SHALL estar visibles a la vez: ninguno se esconde para darle espacio al nombre. IF el nombre no cabe en una línea, THEN SHALL pasar a una segunda línea (ticket 1334) y nunca cortarse a mitad de palabra.

#### Scenario: Ítem con insignia
- **WHEN** el usuario ve «Catálogo por link» con insignia NUEVO y la estrella
- **THEN** el nombre se lee completo, la insignia y la estrella se ven en la zona derecha y el nombre empieza alineado con «Mis sitios»

### Requirement: Insignias pequeñas (F1)
THE menú SHALL mostrar las insignias en formato pequeño: texto en MAYÚSCULA de 9 a 10 px, 16 px de alto y unos 32 px de ancho. Para que ocupe lo mismo que «NUEVO», la insignia «PRÓXIMAMENTE» SHALL decir «PRONTO» en el menú. NUEVO SHALL usar el par primario y PRONTO el par de alerta del design-system. Una insignia con fecha de vencimiento vencida SHALL ocultarse, como hoy.

#### Scenario: Canal que todavía no está
- **WHEN** el usuario ve TikTok en el menú
- **THEN** la insignia dice «PRONTO», mide lo mismo que «NUEVO» y la entrada sigue sin abrir nada, como hoy (D-509)

### Requirement: Estrella siempre visible (F1)
Cada entrada que puede ser favorita SHALL mostrar su estrella:

- rellena en el color de acento si es favorita;
- en contorno tenue si no lo es, más visible al pasar el puntero o al enfocarla con el teclado.

La estrella SHALL tener un nombre accesible («Agregar a favoritos» o «Quitar de favoritos»). Se mantiene el límite de 5 favoritos y su aviso (D-517).

#### Scenario: Marcar un favorito
- **WHEN** el usuario toca la estrella tenue de «Traslados»
- **THEN** la estrella queda rellena y «Traslados» aparece en Favoritos

### Requirement: Favoritos arriba con su grupo (F1)
THE sección Favoritos SHALL quedar fija arriba del menú. Debajo de cada favorito SHALL aparecer, en pequeño, el nombre de su grupo («Bodegas» debajo de «Ajustes»), porque varios nombres cortos se repiten en grupos distintos. Un favorito de grupo SHALL seguir mostrando sus pantallas debajo (D-517).

#### Scenario: Dos favoritos con el mismo nombre
- **WHEN** el usuario tiene como favoritos «Productos» de Inventario y «Productos» de Configuración
- **THEN** cada uno muestra su grupo debajo y se distinguen sin abrirlos

### Requirement: Punto de novedad en el ícono (F1)
THE punto de novedad SHALL ir pegado a la esquina superior del ícono del grupo, no en la fila del texto. Un grupo SHALL mostrarlo solo cuando al menos uno de sus hijos tiene una insignia NUEVO vigente. Una insignia PRONTO SHALL NOT encender el punto.

#### Scenario: Grupo con novedad
- **WHEN** el grupo Sitio web tiene «Catálogo web» con NUEVO vigente
- **THEN** el ícono de Sitio web muestra el punto en su esquina y la fila no lleva otro punto junto al texto

### Requirement: Filas compactas y tercer nivel sin ícono (F1)
Cada fila de una línea SHALL medir entre 36 y 40 px de alto, con 8 px de relleno vertical. El segundo nivel SHALL tener 16 px de sangría y el tercero 12 px más. El tercer nivel SHALL NOT llevar ícono, para devolverle ese espacio al nombre. Los títulos de sección SHALL ir en una sola línea.

#### Scenario: Grupo largo
- **WHEN** el usuario abre Bodegas, que tiene 9 ítems
- **THEN** cada ítem mide entre 36 y 40 px, ninguno lleva ícono y los nombres se leen completos

### Requirement: Un ícono propio por sección y grupo (F2)
Cada sección y cada grupo o enlace directo SHALL tener un ícono declarado para esa entrada:

- único en el menú;
- de una sola familia, en contorno, con el mismo grosor de trazo y 20 px.

Cambiar el nombre de una entrada SHALL NOT cambiar su ícono. El mapa de íconos del ticket 1337 es la referencia, con el equivalente más cercano si la familia aprobada no lo tiene.

#### Scenario: Productos e inventario
- **WHEN** el usuario ve Productos y Bodegas en la sección Inventario
- **THEN** cada uno tiene un ícono distinto, y ningún otro grupo del menú repite esos íconos

### Requirement: Modo compacto (F2)
THE menú SHALL tener un botón que alterna entre el modo abierto (264 px) y el compacto (unos 72 px). Katuq SHALL recordar la elección de cada usuario al volver a entrar. Debe quedar un solo modo colapsado: el de hoy y el «modo compacto» viejo se funden en este.

WHILE el menú está en modo compacto:

- SHALL mostrar los íconos de los grupos y enlaces directos, con una línea divisoria entre secciones;
- WHEN el usuario pasa el puntero, enfoca con el teclado o toca el ícono de un grupo, SHALL abrir un panel flotante con el nombre del grupo y sus subítems, con sus insignias y estrellas;
- WHEN el usuario pasa el puntero por un enlace directo, SHALL mostrar su nombre;
- un grupo con un hijo NUEVO o un favorito SHALL mostrarse con un punto en la esquina del ícono.

Esc o salir del panel SHALL cerrarlo.

#### Scenario: Usar el modo compacto
- **WHEN** el usuario activa el modo compacto y pasa el puntero por el ícono de Bodegas
- **THEN** se abre el panel «Bodegas» con Existencias, Detalle, Ajustes y los demás, cada uno con su estrella, y la pantalla gana el espacio del menú

#### Scenario: Preferencia recordada
- **WHEN** el usuario deja el menú en compacto, cierra sesión y vuelve a entrar
- **THEN** el menú sigue en compacto

### Requirement: Celular sin cambios de comportamiento
WHILE la pantalla mide menos de 992 px de ancho, THE menú SHALL abrirse por encima del contenido como hoy, con las filas, insignias, estrellas e íconos nuevos y sin modo compacto. No SHALL haber scroll horizontal.

#### Scenario: Celular de 390 px
- **WHEN** el usuario abre el menú en un celular de 390 px
- **THEN** el menú se abre por encima, los nombres se leen completos y no hay scroll horizontal

### Requirement: Solo presentación en F1 y F2
F1 y F2 SHALL NOT cambiar:

- el nombre, el orden, la ruta ni los permisos de ninguna entrada;
- el buscador del menú;
- los favoritos guardados.

Quien veía una entrada SHALL seguir viéndola, y nadie SHALL ver una entrada nueva.

#### Scenario: Mismo rol antes y después
- **WHEN** un usuario con el rol VENTAS de ALMARA entra antes y después de F2
- **THEN** ve las mismas entradas, abre las mismas pantallas y conserva sus favoritos

### Requirement: Regla de diseño Katuq
THE menú SHALL usar los tokens de `openspec/specs/design-system/spec.md`:

- acento `#5F3FE0`;
- insignias en par fuerte/suave;
- nada de gradientes decorativos ni primarios prohibidos;
- foco visible con el teclado y contraste AA en los nombres y las insignias.

Ninguna clase nueva SHALL contener «p-», y todo texto que aparezca de forma condicional SHALL llevar su propio color y tamaño.

#### Scenario: Revisión antes de cerrar cada fase
- **WHEN** se revisa la fase antes de publicarla
- **THEN** el conteo de gradientes y de primarios prohibidos del menú no sube, y a 1440 y 390 px no hay scroll horizontal ni texto invisible
