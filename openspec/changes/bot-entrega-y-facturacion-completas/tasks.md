# Tareas — entrega y facturación completas

## 1. ADK

- [x] 1.1 Herramienta `configurar_direccion_entrega(direccion, ciudad, barrio,
      recibe, telefono_recibe)`. Tests.
- [x] 1.2 `configurar_facturacion(nombre, tipo_documento, documento, correo)`
      reemplaza a `facturar_a_nombre_de`. Tests.
- [x] 1.3 `cerrar_pedido` exige dirección y ciudad si la entrega es a
      domicilio; no las pide si es recoge. Tests de las dos ramas.
- [x] 1.4 Instrucciones: al elegir domicilio se pregunta a dónde (junto con la
      fecha); al cliente registrado se le repite su dirección para confirmar;
      la facturación se ofrece una vez. Tests.

## 2. Backend

- [x] 2.1 El cierre arma `envio` canónico (domicilio y recogida) y
      `facturacion` canónico, con los campos no preguntados vacíos. Contract
      test contra la forma de venta asistida.
- [x] 2.2 Gate de cierre: domicilio sin dirección o sin ciudad pregunta en vez
      de cerrar (mismo patrón del gate de fecha). Tests.
- [x] 2.3 El turno lleva al agente la dirección ya acordada para que no
      repregunte. Tests.

## 3. Verificación

- [x] 3.1 Suites backend + ADK en verde.
- [x] 3.2 Ensayo contra prod: pedido a domicilio (dirección y ciudad quedan en
      `envio`) y pedido de recogida (sin preguntar dirección).
- [x] 3.3 CONTRACT.md al día.
