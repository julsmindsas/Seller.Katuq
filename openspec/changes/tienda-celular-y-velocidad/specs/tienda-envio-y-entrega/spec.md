## Purpose

Historias de usuario (ticket TX-34, cd `Es2985T0VnVBc95LqY2D`):
- Como comprador en el celular, quiero saber cuánto me cuesta el envío a mi ciudad y cuándo me
  llega antes de dar mis datos, para no abandonar en el checkout por una sorpresa.
- Como comercio, quiero que lo que la tienda promete salga de mi configuración real.

Requisitos no funcionales: ningún texto de costo, cobertura o plazo es una promesa fija: todo
sale de las zonas, el envío fijo, los puntos de retiro o el producto (F0-09); el servidor sigue
revalidando el envío al crear el pedido. Los requisitos marcados **(provisional, Pn)** aplican la
recomendación de la pregunta Pn.

## ADDED Requirements

### Requirement: «Calcula tu envío» en la ficha y en el carrito
WHERE la tienda vende, THE system SHALL ofrecer en la ficha y en el carrito el cálculo del envío
antes del checkout:
- con envío por zonas, el comprador elige su ciudad entre las zonas que el comercio configuró y
  ve el valor de esa zona;
- con envío fijo, ve el costo configurado;
- con envío gratis desde un monto, ve si ya aplica o cuánto le falta;
- con puntos de retiro, ve que puede recoger gratis en cada punto, con su horario.

WHEN el comprador elige una ciudad, THE system SHALL recordarla y traerla elegida al checkout,
donde el costo se vuelve a revisar al crear el pedido. La transportadora no se cotiza en este
cambio.

Fuente: ticket TX-34, viñeta 4 («costo de envío visible antes del checkout ("calcula tu
envío")»); D-518 TX-34·2; F2-16 y F2-15 (dejaron fuera el envío en la ficha y la
transportadora); F0-01 (formas de envío exigidas para publicar).

#### Scenario: Zona con costo
- **WHEN** en una ficha de FLORECER el comprador elige «Pereira — Zona 1»
- **THEN** ve el valor de esa zona y, al ir al checkout, Pereira ya está elegida con el mismo valor

#### Scenario: Ciudad con varias zonas
- **WHEN** Medellín tiene «Zona 0», «Zona 1» y «Zona 2» con tarifas distintas
- **THEN** el comprador ve las tres con su nombre y no solo la más barata

#### Scenario: Envío gratis desde un monto
- **WHEN** el carrito suma menos que el monto de envío gratis
- **THEN** el cálculo dice cuánto falta para que el envío sea gratis

### Requirement: Ciudad sin zona
IF la ciudad del comprador no está entre las zonas del comercio, THEN THE system SHALL decir «Te
confirmamos el envío por WhatsApp» con el enlace al WhatsApp de la tienda, y WHERE la tienda no
tiene WhatsApp, «Escríbenos para confirmar el envío a tu ciudad» con el contacto del pie
**(provisional, P11)**. THE system SHALL NOT mostrar en ese caso un costo ni un plazo.

Fuente: D-518 TX-34·2 («Sin zona: "Te confirmamos el envío por WhatsApp"»); ticket 1141 (OH MY
STORE: faltaba la zona de Dosquebradas y el comprador quedó sin cobro de domicilio).

#### Scenario: Ciudad que no está
- **WHEN** el comprador toca «Mi ciudad no está»
- **THEN** ve «Te confirmamos el envío por WhatsApp» y ningún valor

### Requirement: Tiempo de entrega en el carrito y en el checkout
WHEN el carrito o el checkout tienen productos con tiempo de entrega configurado, THE system
SHALL mostrar el tiempo de entrega del pedido: el mayor de los plazos en días de sus productos o,
si el plazo es un texto del comercio, ese texto. IF ningún producto tiene tiempo de entrega,
THEN THE system SHALL NOT mostrar ningún plazo.

Fuente: ticket TX-34, viñeta 4 («tiempos de entrega»); D-518 TX-34·9 («El carrito y el checkout
muestran el tiempo de entrega»); plantillas que prometen «El costo y el tiempo de entrega los
ves antes de pagar» (`data/siteTemplates.js`); F2-45 (plazo en ficha y tarjeta).

#### Scenario: Dos productos con plazos distintos
- **WHEN** el carrito tiene un producto «Entrega desde 1 día» y otro «Entrega desde 3 días»
- **THEN** el carrito y el checkout dicen «Entrega desde 3 días»

#### Scenario: Sin plazos
- **WHEN** ningún producto del carrito tiene tiempo de entrega
- **THEN** no aparece ningún plazo, ni uno inventado

### Requirement: Precio con IVA visible
THE system SHALL seguir mostrando «Precio con IVA incluido» en la ficha de los productos que
llevan IVA, y SHALL mostrar «Precios con IVA incluido» en el carrito y en el resumen del
checkout cuando todas las líneas lo llevan **(provisional, P7)**.

Fuente: ticket TX-34, viñeta 4 («precio con IVA»); F2-45, D-445 (la leyenda solo está en la
ficha); crítica del 21-oct.

#### Scenario: Carrito mixto
- **WHEN** el carrito tiene un producto con IVA y otro exento
- **THEN** el carrito no dice «Precios con IVA incluido»

### Requirement: Avisar al comercio de una promesa que no puede cumplir
WHEN el comercio revisa su tienda antes de publicar, IF una sección dice que el comprador ve el
tiempo de entrega antes de pagar y ningún producto vendible tiene tiempo de entrega, THEN THE
system SHALL avisarle en la lista de lo que falta para vender **(provisional, P14)**.

Fuente: crítica del 21-oct (la regla de promesas de F0-09 no detecta esta frase); D-518 TX-34·9.

#### Scenario: Plantilla con la promesa
- **WHEN** un comercio con la plantilla «Moda — Colección destacada» no tiene plazos en sus productos
- **THEN** la revisión de publicación le dice que agregue el tiempo de entrega o cambie el texto
