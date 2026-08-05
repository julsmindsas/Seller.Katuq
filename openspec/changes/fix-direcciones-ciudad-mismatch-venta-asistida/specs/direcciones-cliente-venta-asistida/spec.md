# Delta: direcciones-cliente-venta-asistida

## ADDED Requirements

### Requirement: Comparación de ciudad tolerante a tildes, mayúsculas, espacios y el sufijo "D.C."

Al filtrar las direcciones de envío de un cliente por la ciudad seleccionada en el paso de selección de productos, el sistema DEBERÁ (SHALL) comparar los nombres de ciudad normalizados (sin distinguir mayúsculas/minúsculas, sin tildes, sin espacios al inicio/fin, sin el sufijo "D.C." al final), no con igualdad de string estricta.

#### Scenario: Mismatch solo de grafía ya no oculta la dirección
- **GIVEN** una dirección de envío guardada con `ciudad = "Bogota"` (sin tilde) y `selectedCity = "Bogotá"` (con tilde) en el paso 1
- **WHEN** se filtran las direcciones de envío del cliente por la ciudad seleccionada
- **THEN** la dirección aparece en el listado filtrado, sin necesidad de caer al fallback de "mostrar todas"

#### Scenario: Mismatch por el sufijo "D.C." tampoco oculta la dirección
- **GIVEN** una dirección de envío guardada con `ciudad = "Bogota"` (grafía legacy, sin "D.C.") y `selectedCity = "Bogotá D.C."` (grafía DANE) en el paso 1
- **WHEN** se filtran las direcciones de envío del cliente por la ciudad seleccionada
- **THEN** la dirección aparece en el listado filtrado, sin necesidad de caer al fallback de "mostrar todas"

### Requirement: Selector de ciudad al crear una dirección de envío prioriza las ciudades configuradas por la empresa

Al crear una dirección de envío nueva, si la empresa activa tiene al menos una ciudad configurada en `ciudadess.ciudadesEntrega`, el formulario DEBERÁ (SHALL) ofrecer esas ciudades como opción prioritaria, garantizando que el valor guardado en `ciudad` sea idéntico al usado por el filtro de selección de productos. El buscador de municipios DANE existente SHALL seguir disponible como alternativa para ciudades fuera de esa lista, sin bloquear la creación de la dirección.

#### Scenario: Elegir una ciudad configurada garantiza match exacto
- **GIVEN** la empresa activa tiene `"Medellín"` en `ciudadess.ciudadesEntrega`
- **WHEN** el vendedor crea una dirección de envío y selecciona `"Medellín"` de las ciudades configuradas
- **THEN** el campo `ciudad` de la nueva dirección queda exactamente igual al valor configurado por la empresa, y la dirección aparece en el listado filtrado cuando `"Medellín"` es la ciudad seleccionada en el paso 1

#### Scenario: Ciudad no configurada sigue siendo creable
- **GIVEN** la empresa activa NO tiene la ciudad `"Turbo"` en `ciudadess.ciudadesEntrega`
- **WHEN** el vendedor busca y selecciona `"Turbo"` desde el buscador DANE al crear una dirección de envío
- **THEN** la dirección se guarda igual, y el formulario muestra una nota indicando que esa ciudad no está en la lista configurada de la empresa, por lo que la dirección no aparecerá en el listado filtrado hasta que esa ciudad se seleccione en el paso 1

### Requirement: Aviso claro cuando no hay direcciones para la ciudad seleccionada

Cuando el filtro por ciudad no encuentra ninguna dirección de envío del cliente para la ciudad seleccionada en el paso 1, el sistema DEBERÁ (SHALL) mostrar todas las direcciones del cliente igualmente (comportamiento ya existente) junto con un aviso que mencione explícitamente el nombre de la ciudad seleccionada y aclare que las direcciones mostradas pueden ser de otra ciudad, sin sugerir pérdida de datos.

#### Scenario: Aviso menciona la ciudad seleccionada
- **GIVEN** un cliente con direcciones de envío únicamente en `"Cali"`, y `"Bogotá"` es la ciudad seleccionada en el paso 1
- **WHEN** se abre el listado de direcciones de envío del cliente
- **THEN** se muestra un aviso que menciona `"Bogotá"` por nombre y aclara que las direcciones listadas pueden ser de otra ciudad, y se listan las direcciones de `"Cali"` igualmente

## MODIFIED Requirements

### Requirement: El bug de persistencia silenciosa de direcciones (D-127/128/129) permanece cerrado

EL sistema DEBERÁ (SHALL) seguir limpiando campos `undefined` anidados antes de escribir en Firestore (`cleanUndefinedProperties` en `editClient`) y seguir mostrando un error explícito al vendedor si la escritura de una dirección de envío o facturación falla — este cambio NO reabre ni modifica esa lógica, solo la reconfirma con una prueba de regresión.

#### Scenario: Crear una dirección de facturación electrónica sigue persistiendo correctamente
- **GIVEN** un cliente sin direcciones de facturación electrónica previas
- **WHEN** el vendedor crea una dirección de facturación electrónica nueva y el sistema confirma "Guardado!"
- **THEN** al recargar los datos del cliente desde el servidor, la dirección de facturación creada SIGUE apareciendo en la lista
