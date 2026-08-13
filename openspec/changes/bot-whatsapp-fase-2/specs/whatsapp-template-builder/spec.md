## ADDED Requirements

### Requirement: El comercio crea sus propias plantillas desde la campaña

Desde el asistente de campañas, el comercio SHALL poder escribir su propio mensaje (título en español + texto, con el nombre del cliente como variable opcional) y el sistema SHALL crearlo como plantilla en Kapso/Meta para su aprobación, sin que el usuario vea jerga técnica. El nombre técnico SHALL generarse solo (slug del comercio + título + sufijo único) y el título escrito SHALL quedar guardado como título humano de esa plantilla.

#### Scenario: Señora escribe su propio mensaje

- **WHEN** la usuaria elige "Crear mi propio mensaje", escribe un título y el texto, y lo envía
- **THEN** el sistema lo manda a aprobación de Meta vía Kapso
- **AND** le explica en lenguaje simple que Meta lo revisa (minutos u horas) y que podrá usarlo cuando diga "Aprobado"
- **AND** el título que escribió queda como el nombre visible de la plantilla

#### Scenario: Mensaje con el nombre del cliente

- **WHEN** la usuaria inserta "el nombre del cliente" en su texto
- **THEN** el sistema lo convierte en la variable {{1}} con su texto de ejemplo (Meta lo exige)
- **AND** al enviar la campaña, la variable se llena con el nombre de cada contacto

### Requirement: El estado de la plantilla propia es visible

Las plantillas creadas por el comercio SHALL mostrarse en el selector con su estado en lenguaje humano — "En revisión de Meta", "Aprobada", "Rechazada (con el motivo)" — y solo las aprobadas SHALL poder usarse en una campaña.

#### Scenario: Plantilla pendiente

- **WHEN** la plantilla todavía está en revisión
- **THEN** aparece en la lista con "En revisión de Meta" y no se puede elegir para enviar

#### Scenario: Plantilla rechazada

- **WHEN** Meta la rechaza
- **THEN** aparece "Rechazada" con el motivo que Meta reportó, y la usuaria puede crear una nueva corrigiendo el texto
