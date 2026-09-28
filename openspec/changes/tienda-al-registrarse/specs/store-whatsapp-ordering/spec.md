## ADDED Requirements

### Requirement: Pedido por WhatsApp como forma de la tienda
El comercio SHALL poder elegir que su tienda reciba los pedidos por WhatsApp. En ese modo, el carrito SHALL pedir solo nombre y celular, crear el pedido en Katuq como "Por confirmar" con la forma de pago "Acordar por WhatsApp", y abrir un mensaje de WhatsApp al número del comercio con el número del pedido, los productos, las cantidades, los precios y el total. La tienda SHALL NOT pedir pago en línea. Si la tienda no tiene WhatsApp configurado, SHALL decir cómo contactar al comercio en vez de mostrar un botón roto.

#### Scenario: Pedido de un distribuidor
- **WHEN** un comprador arma un carrito en una tienda con pedido por WhatsApp y toca "Pedir por WhatsApp"
- **THEN** el pedido queda en el panel del comercio como "Por confirmar" y se abre WhatsApp con su número y detalle para el número del comercio

#### Scenario: Sin número de WhatsApp
- **WHEN** la tienda en modo WhatsApp no tiene número configurado
- **THEN** el comprador ve cómo contactar al comercio y el editor le avisa al comercio que falta el número

### Requirement: Pagos sin pasarela, sin prometer lo que no hace
Una tienda sin pasarela de pago propia del comercio SHALL NOT cobrar en línea ni en la cuenta de Katuq. SHALL mostrar los métodos que eligió el comercio (Nequi, Daviplata, transferencia, efectivo) y, al confirmar el pedido, decirle al comprador que el comercio le escribirá para acordar el pago. El cobro en línea SHALL encenderse solo cuando el comercio conecte su propia pasarela.

#### Scenario: Pago por Nequi
- **WHEN** un comprador elige Nequi en una tienda sin pasarela
- **THEN** el pedido se crea, y el comprador ve que el comercio le escribirá por WhatsApp para el pago

#### Scenario: Sin pasarela propia
- **WHEN** se crea la tienda en 1 clic de un comercio sin pasarela
- **THEN** la tienda no ofrece "pagar en línea" y ningún pago puede terminar en la cuenta de Katuq

### Requirement: Los comercios existentes no cambian
Las tiendas que ya existen SHALL seguir recibiendo pedidos como hoy. El modo WhatsApp y las reglas de pago de la tienda en 1 clic SHALL aplicar solo a las tiendas nuevas creadas así, o a quien las elija en su editor.

#### Scenario: Tienda existente con pago en línea
- **WHEN** un comprador compra en una tienda existente con pasarela
- **THEN** el checkout y el cobro funcionan exactamente como antes
