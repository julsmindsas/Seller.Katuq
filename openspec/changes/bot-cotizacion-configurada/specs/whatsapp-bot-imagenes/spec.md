## ADDED Requirements

### Requirement: El bot recibe y entiende imágenes del cliente

Cuando el cliente manda una FOTO, el sistema SHALL descargarla del proveedor,
pasarla al agente en el mismo turno (junto con el texto que la acompañe) y el
agente SHALL interpretarla para ayudar a la venta: describir qué ve, buscar en
el catálogo lo más parecido y ofrecerlo con su precio real. La imagen NO SHALL
persistirse en Katuq (se procesa y se descarta) y el write-set del bot NO
SHALL cambiar. Los audios, stickers y documentos SHALL seguir recibiendo el
aviso cortés de siempre.

#### Scenario: Foto de un producto

- **WHEN** el cliente manda la foto de una vela y escribe "¿tienen de estas?"
- **THEN** el bot describe lo que ve, busca en el catálogo lo más parecido y ofrece las opciones reales con precio
- **AND** si nada se parece, lo dice honesto y ofrece ayuda con otra cosa

#### Scenario: Imagen demasiado pesada o formato raro

- **WHEN** la imagen excede el tope de tamaño o no es un formato soportado (jpeg/png/webp)
- **THEN** el bot pide que se la manden más liviana o que le cuenten por texto qué buscan
- **AND** nada truena: la conversación sigue

#### Scenario: Audio sigue con aviso

- **WHEN** el cliente manda un audio
- **THEN** aplica el aviso cortés único por sesión de siempre (esta capacidad es SOLO para imágenes)
