# Delta: seller-translation-coverage (ticket cd CMNdBkVZXgYoOCvqfGZc, D-532)

> Qué significa que un módulo del panel quede traducido y con buena ortografía, cómo se verifica y quién revisa. Aprobada en bloque por Daniel el 2026-10-21 (tarea 0.2). Los doce bloques de módulo aplican estos mismos requisitos; no agregan otros.

## ADDED Requirements

### Requirement: Módulo traducido
CUANDO (WHEN) se cierra el bloque de un módulo, el sistema DEBERÁ (SHALL) mostrar en el idioma elegido todos los textos de ese módulo escritos por Katuq: títulos, etiquetas, botones, columnas, textos de ayuda, textos de accesibilidad, estados vacíos, diálogos de confirmación y avisos de éxito, advertencia o error. Los textos que llegan del servidor y los datos del comercio quedan fuera de este requisito.

#### Scenario: Diálogo de confirmación
- **GIVEN** el módulo de despachos cerrado y un usuario con el panel en inglés
- **WHEN** confirma la entrega de un despacho
- **THEN** el diálogo, sus botones y el aviso de éxito aparecen en inglés

#### Scenario: Aviso que viene del servidor
- **GIVEN** el mismo usuario
- **WHEN** el servidor rechaza la operación con un mensaje propio
- **THEN** el aviso muestra ese mensaje como llegó, en español

#### Scenario: Módulo todavía sin cerrar
- **GIVEN** un módulo cuyo bloque no se ha cerrado y un usuario en portugués
- **WHEN** abre una pantalla de ese módulo
- **THEN** la pantalla funciona igual que hoy, con los textos que aún no se migraron en español

### Requirement: Traducir sin cambiar el comportamiento
CUANDO (WHEN) se traduce un módulo, el sistema DEBERÁ (SHALL) conservar exactamente sus columnas, filtros, acciones, diálogos, validaciones, rutas, llamadas al servidor, estilos y datos guardados. SI (IF) una traducción no cabe en su espacio, ENTONCES (THEN) DEBERÁ (SHALL) acortarse el texto y no cambiarse la pantalla.

#### Scenario: Misma pantalla, otro idioma
- **GIVEN** una pantalla de un módulo cerrado
- **WHEN** se compara antes y después del bloque, en español
- **THEN** tiene las mismas columnas, filtros, botones y resultados; solo cambian textos con faltas corregidas

#### Scenario: Botón en alemán
- **GIVEN** un botón cuyo texto en alemán es más largo que en español
- **WHEN** se revisa a 390 px de ancho
- **THEN** el texto se lee completo sin desbordar, sin cambios de estilo

### Requirement: Ortografía del español
CUANDO (WHEN) se cierra el bloque de un módulo, sus textos en español DEBERÁN (SHALL) tener tildes, mayúsculas y puntuación correctas. Corregir un texto en español NO DEBERÁ (SHALL NOT) hacer que su traducción a otro idioma desaparezca o cambie.

#### Scenario: Tilde corregida
- **GIVEN** el texto «Usar Esta Direccion» con su traducción al inglés y al portugués
- **WHEN** se corrige a «Usar esta dirección»
- **THEN** en inglés y en portugués se sigue viendo la traducción correcta

### Requirement: Verificación automática de los textos
El sistema DEBERÁ (SHALL) contar con una verificación que se pueda correr antes de unir cualquier cambio y que falle cuando: a otro idioma le falta un texto que existe en español; una pantalla pide un texto que no existe; una traducción pierde o cambia una variable del texto original (por ejemplo, un nombre o una cantidad); el alemán usa la letra «ß»; o un módulo ya cerrado vuelve a tener textos escritos sin pasar por el traductor. La verificación DEBERÁ (SHALL) avisar, sin fallar, de traducciones idénticas al español y de textos que nadie usa.

#### Scenario: Falta una traducción
- **GIVEN** un texto nuevo en español sin su versión en alemán
- **WHEN** se corre la verificación
- **THEN** falla y nombra el texto y el idioma

#### Scenario: Texto suelto en un módulo cerrado
- **GIVEN** el módulo de ventas cerrado
- **WHEN** un cambio agrega un aviso con el texto escrito directamente
- **THEN** la verificación falla y señala el archivo y la línea

### Requirement: Origen y revisión de las traducciones
Las traducciones DEBERÁN (SHALL) producirse durante el desarrollo y quedar guardadas con el panel; el sistema NO DEBERÁ (SHALL NOT) generarlas mientras el usuario lo usa. El alemán NO DEBERÁ (SHALL NOT) habilitarse para todos los comercios hasta que una persona nativa haya revisado los textos del encabezado, el menú, el perfil, las páginas públicas y los módulos que use el primer comercio en alemán, y esa revisión quede registrada con fecha y responsable. Las traducciones automáticas DEBERÁN (SHALL) usar el glosario de términos aprobado y no traducir nombres propios.

#### Scenario: Borrador sin revisar
- **GIVEN** un módulo con el alemán solo en borrador
- **WHEN** alguien pide habilitar el alemán para todos
- **THEN** no se habilita hasta registrar la revisión nativa

#### Scenario: Revisión registrada
- **GIVEN** la revisión nativa de los módulos requeridos registrada con fecha y responsable
- **WHEN** Daniel ordena habilitar el alemán
- **THEN** se habilita en la configuración de la plataforma

### Requirement: Avance por bloques
El sistema DEBERÁ (SHALL) poder publicarse con cualquier número de módulos cerrados. Cerrar o revertir el bloque de un módulo NO DEBERÁ (SHALL NOT) afectar a los demás módulos.

#### Scenario: Revertir un bloque
- **GIVEN** los módulos de shell y ventas cerrados
- **WHEN** se revierte el bloque de ventas
- **THEN** el shell sigue traducido y ventas vuelve a sus textos anteriores, sin errores
