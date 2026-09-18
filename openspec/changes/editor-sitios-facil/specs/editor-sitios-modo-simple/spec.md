# editor-sitios-modo-simple

## ADDED Requirements

### Requirement: Cada sección muestra primero lo esencial
#### Scenario: Sección recién elegida
- **WHEN** el comerciante elige una sección
- **THEN** ve como máximo sus tres controles principales y un botón "Más opciones"
- **AND** al pulsarlo aparece el resto sin perder lo escrito

### Requirement: Un solo vocabulario de estilo
#### Scenario: Panel Estilo
- **WHEN** el comerciante abre Estilo
- **THEN** los grupos se llaman Tema, Colores, Forma y Letra, sin "vestido" ni "look"

### Requirement: Herramientas avanzadas apagadas de fábrica
#### Scenario: Sitio sin lienzo ni objetos
- **WHEN** se abre un sitio que no usa lienzo ni objetos colocables
- **THEN** esos paneles no se muestran hasta encender la palanca en Ajustes
#### Scenario: Sitio que ya los usa
- **WHEN** se abre un sitio con lienzo u objetos
- **THEN** la palanca arranca encendida y nada queda escondido

### Requirement: Qué te falta
#### Scenario: Sitio incompleto
- **WHEN** al sitio le falta logo, WhatsApp, políticas, descripción, bodega o productos
- **THEN** el editor lo lista con un enlace directo a donde se arregla
#### Scenario: Sitio completo
- **WHEN** no falta nada
- **THEN** la lista dice que está listo para publicar
