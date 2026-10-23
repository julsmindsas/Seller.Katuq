> **Estado:** PROPUESTA APROBADA por Daniel el 2026-10-23, con las respuestas recomendadas a las cuatro preguntas. Tickets 1335 (Menú 2/4), 1337 (Menú 4/4) y 1336 (Menú 3/4) de ALMARA FELICIDAD. Decisión: **D-546**. `design.md` y `tasks.md` están escritos y pendientes de aprobación. Sin código.

## Why

ALMARA FELICIDAD pide un menú lateral que se lea completo y se recorra rápido. Lo pide en cuatro tickets con un mapa del menú propuesto: los tres tickets de esta propuesta adjuntan el mismo HTML, PNG y PDF, y además pantallazos del menú actual. El ticket 1334 (Menú 1/4, palabras cortadas) se arregla aparte y esta propuesta parte de él: permite nombres en dos líneas.

Esto se verificó en el código el 23 de octubre:

- **El nombre no cabe.** Por fuera, el menú mide 260 px. Por dentro se van la tarjeta de la sección, las sangrías de los tres niveles, el ícono, la insignia, la estrella, el punto y el chevron. Al nombre le quedan unos 90 px, y menos en el tercer nivel. La insignia «PRÓXIMAMENTE» ocupa el doble que «NUEVO».
- **Los íconos se repiten y se adivinan por el nombre.**
  - El menú se escribe con nombres de íconos de Feather y la barra los traduce a Font Awesome 4.7 con un diccionario. Lo que no está en el diccionario cae en un círculo genérico.
  - Las secciones toman su ícono por el título.
  - Productos e Inventarios comparten el cubo, y varios subítems comparten el círculo. Con el menú colapsado no se distinguen.
- **El menú colapsado ya existe:** mide 80 px, abre un submenú flotante y recuerda la preferencia en el navegador. Además hay un «modo compacto» aparte. No hace falta inventar otro modo.
- **Los nombres son largos o repiten al padre:**
  - «Clientes › Listado de clientes»;
  - «Lista de precios › Lista de precios»;
  - «Producción › Órdenes de producción», un grupo con un solo hijo;
  - «Finanzas › Finanzas › …».
- **Cambiar un nombre rompe lo que hoy depende del texto:**
  - los favoritos se guardan en el navegador con nombre y ruta; los de una sección (D-517, ticket 1322), solo con el nombre. Con un nombre nuevo, la estrella deja de marcarse y el favorito de sección desaparece;
  - los canales «Próximamente» de D-509 se agregan al grupo que se llama exactamente «Mensajes»;
  - el editor de roles agrega «Creación rápida» al grupo que se llama «Productos». Con el mapa nuevo habría dos grupos con ese nombre;
  - según D-409, el título de cada pantalla es su nombre en el menú.
- **Los permisos no dependen del nombre.** Cada rol guarda rutas. Mientras ninguna ruta cambie, renombrar y mover no le quita ni le da acceso a nadie.
- **Landings no tiene entrada.** Las landings son un tipo de sitio dentro de «Mis sitios», igual que lo eran los catálogos antes del ticket 1175. Prospectos se quitó en el ticket 1330 porque llevaba a una página que no existe.

## What Changes

Son tres fases, en este orden, y cada una se aprueba y se publica por separado. Las tres cambian solo la presentación: ninguna ruta, permiso ni pantalla cambia su comportamiento. La única entrada nueva, Landings, abre una lista que ya existe.

### F1 — Ancho y filas (1335)

1. El menú abierto mide 264 px.
2. Cada fila tiene tres partes: ícono de 20 px, el nombre con todo el espacio que queda y una zona derecha de ancho fijo para la insignia, la estrella y el chevron.
3. Insignias pequeñas, del mismo tamaño. En el menú, «PRÓXIMAMENTE» pasa a «PRONTO».
4. La estrella se ve siempre: rellena si la entrada es favorita y en contorno tenue si no.
5. La sección Favoritos queda fija arriba. Cada favorito muestra debajo el nombre de su grupo, porque hay nombres cortos repetidos.
6. El punto de novedad va en la esquina del ícono del grupo y solo indica que algún hijo es NUEVO.
7. Filas de 36 a 40 px y sangrías cortas. El tercer nivel va sin ícono.
8. Los títulos de sección van en una sola línea.

### F2 — Íconos y modo compacto (1337)

1. Cada sección y cada grupo declara su ícono en el menú, en vez de adivinarlo por el nombre. Cada ícono es único, de una sola familia, en contorno y de 20 px. El mapa del ticket es la referencia (pregunta 2).
2. El menú colapsado de hoy pasa a ser el **modo compacto** de 72 px:
   - muestra los íconos de los grupos, con líneas entre secciones;
   - al pasar el puntero abre un panel con el nombre del grupo y sus subítems, con sus insignias y estrellas;
   - las insignias y los favoritos se ven como un punto en el ícono.
3. Un solo botón alterna entre el menú abierto y el compacto, y Katuq recuerda la preferencia de cada usuario. El «modo compacto» viejo se funde con este y no quedan dos modos.

Esta fase va antes de los nombres porque quita la dependencia de los íconos con el texto.

### F3 — Nombres y orden (1336)

1. El menú toma la estructura del mapa aprobado (tabla en la spec `sidebar-structure`).
2. Un grupo que tiene un solo hijo se muestra como enlace directo. Esto vale también cuando el grupo queda con un solo hijo después de filtrar por rol.
3. Los favoritos ya guardados se conservan con el nombre nuevo.
4. Lo que el mapa de ALMARA no menciona (Dropshipping, NPS, Agenda, Picking y packing, Katuq en vivo, entre otros) queda donde dice la spec (pregunta 3).
5. **Landings** abre «Mis sitios» con solo las landings, como Catálogos (ticket 1175). La ve quien ya ve «Mis sitios» (patrón de D-416).
6. **Prospectos** es la entrada «Clientes corporativos» con otro nombre, movida a CRM. La pantalla y la ruta son las mismas.
7. Durante 90 días, el buscador del menú encuentra cada entrada también por su nombre anterior.
8. Quedan escritas las reglas para nombrar módulos nuevos.

**Base visual:** tokens de `openspec/specs/design-system/spec.md` (D-131) y regla de diseño Katuq (D-399, D-400). Eso es acento `#5F3FE0`, superficies lila, insignias en par fuerte/suave y nada de gradientes. La única desviación posible es la familia de íconos (pregunta 2).

## Capabilities

### New Capabilities
- `sidebar-layout`: filas, insignias, favoritos, íconos y modo compacto del menú lateral (F1 y F2).
- `sidebar-structure`: nombres, orden, enlaces directos, conservación de favoritos y reglas para módulos nuevos (F3).

### Modified Capabilities
- Ninguna archivada. Conservan su comportamiento:
  - D-517: favoritos de sección y límite de 5;
  - D-509: canales Próximamente, con la palabra PRONTO en el menú;
  - D-416: Catálogos por link se ve para quien ve Cotizaciones;
  - D-409: títulos de pantalla (pregunta 4).

## Impact

- **Front:**
  - `shared/services/nav.service.ts`: nombres, orden, íconos e insignias del menú;
  - `shared/components/sidebar/*`: filas, favoritos, punto, modo compacto, panel flotante y buscador;
  - `styles.scss`: anchos del menú abierto y compacto;
  - `components/rol/roles/*`: cada entrada se muestra con su grupo y deja de depender del título «Productos»;
  - las rutas de `components/sitios`: entrada de Landings sobre la lista que ya existe.
- **Backend y datos:** nada. Sin colecciones, endpoints ni banderas nuevas. La conservación de favoritos ocurre en cada navegador.
- **Espacio de las pantallas:** con el menú abierto, el contenido pierde 4 px (260 → 264). Con el compacto gana 8 px (80 → 72).

## No-goals

- El ticket 1334 (palabras cortadas), que va aparte.
- Cambiar rutas, permisos o roles, o dar o quitar acceso.
- Lo que el 1336 pide fuera del menú (pregunta 4):
  - que Prospectos muestre solo prospectos y no clientes corporativos activos (cambia el CRM de D-058);
  - Katuq en vivo como pestaña;
  - una pantalla propia de Landings;
  - cambiar los títulos de las pantallas.
- El encabezado, el buscador global, la tarjeta Mi Plan y Configuración de empresa. Roles y Usuarios siguen ocultos en el menú, como hoy.
- El menú en el celular, salvo los nombres y los íconos nuevos.

## Riesgos

- **Favoritos perdidos.** Viven en cada navegador, así que se convierten al cargar la versión nueva, una sola vez y sin borrar nada.
  - Hoy hay nombres repetidos: dos «Logística» y, tras F3, dos «Productos». El favorito queda en el mismo grupo que hoy abre, que es el primero del menú.
  - Prueba: un navegador con favoritos de pantalla y de sección del menú viejo los ve todos después.
- **Código que depende del texto.** Antes de renombrar se cambian por identificadores estables estas tres dependencias: los canales PRONTO de «Mensajes», «Creación rápida» de «Productos» y los íconos por título. Los íconos ya quedan resueltos en F2.
- **Otros comercios.** El menú es uno solo para todos. Para no desorientar, el buscador acepta el nombre anterior durante 90 días y Novedades lo anuncia una vez (pregunta 1).
- **Textos que citan los nombres viejos:** instructivos MCP (D-508), Opttia, videos y respuestas de soporte. Antes de F3 se buscan en el repositorio y se listan.
- **Pantallas angostas.** En 1366 px se revisan Todos los pedidos, venta asistida y POS (D-540) con el menú abierto y con el compacto.
- **Trampas de CSS global** (AGENTS.md):
  - ninguna clase nueva contiene «p-»;
  - todo `span` con `*ngIf` lleva su propio color y tamaño;
  - el foco se devuelve con `:focus-visible`;
  - se neutraliza el `letter-spacing` heredado.
- **Sesiones paralelas.** El 1334 y otras decisiones (D-509, D-517) tocan los mismos archivos. F1 arranca cuando el 1334 esté publicado, después de un `git pull` y sin cambios sin commitear en el menú.

## Preguntas para Daniel

1. **¿Para quién sale el menú nuevo?** Recomendado: para todos los comercios, sin bandera, en las tres fases. El menú es uno solo, y mantener dos árboles duplica el trabajo y los errores. Para no desorientar a los demás, el buscador encuentra cada entrada por su nombre anterior durante 90 días y Novedades anuncia el cambio una vez.
2. **¿Qué familia de íconos?** El ticket pide Tabler: contorno, un solo trazo y un ícono distinto por módulo. Katuq no la tiene, y con lo instalado no se cumple la regla:
   - Font Awesome 4.7 es relleno y no tiene TikTok;
   - Feather no tiene WhatsApp, TikTok, fábrica, robot ni bodega;
   - PrimeIcons 6 no tiene TikTok.

   Recomendado: incorporar Tabler solo para el menú y, después, para las acciones del pedido, cargando únicamente los íconos que se usan. La alternativa es usar equivalentes de lo instalado y aceptar estilos mezclados.
3. **¿Apruebas dónde quedan los módulos que el mapa de ALMARA no menciona?** Están en la segunda tabla de `sidebar-structure`. Recomendado: sí. Quedan en su sección actual con nombres según las reglas, y Katuq en vivo sigue como segundo ítem de En vivo, solo para Julsmind.
4. **¿Lo que el 1336 pide fuera del menú va en cambios aparte?** Recomendado: sí.
   - Aquí Prospectos solo cambia de nombre y de lugar. Que muestre solo prospectos toca el CRM y necesita su propia spec.
   - Los títulos de las pantallas no cambian: D-409 se ajusta a «el título es el nombre completo de la pantalla y el menú usa el corto», porque «Listado» o «Detalle» solos no dicen qué pantalla es.
