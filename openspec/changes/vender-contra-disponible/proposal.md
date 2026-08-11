# Propuesta: vender contra el disponible, no contra el vacío

## Why

Hoy Katuq **no impide vender lo que no tiene**. La política vigente es
negativo-visible: si el stock no alcanza, la orden se crea igual, el saldo queda
en negativo y el descuadre se registra para auditar. Eso fue una decisión
consciente —no frenar la venta— y sirvió mientras el inventario no era
confiable.

Ya no es el caso. Desde el 2026-08-10 el dominio sabe separar los tres números
que antes confundía en uno (`availabilityService`, `GET /inventory/disponibilidad`):
lo que se puede vender, lo vendido que sigue en el estante esperando despacho, y
lo que un operario contaría hoy. Con eso existe, por primera vez, un
**disponible** contra el cual una venta podría validarse.

La foto real de OH MY STORE al construirlo: 93 pedidos abiertos, y ya hay
productos vendidos sin respaldo. Cada uno de esos es una promesa a un cliente
que la bodega no puede cumplir, y hoy el sistema no dice nada en el momento en
que se comete.

Daniel dio la dirección el 2026-08-10 ("que bloquee", vía la sesión de
inventario). Esta propuesta NO asume el cómo: el cómo es lo que necesita su
checkpoint, porque cambia una regla comercial en el módulo más sensible
(ventas + inventario, POS y venta asistida a la vez).

## What Changes

- Una venta consulta el **disponible** (saldo ya descontado, nunca negativo) del
  producto en la bodega que le corresponde, antes de confirmarse.
- El resultado de esa consulta se resuelve según una **política por empresa**,
  que es justamente lo que se somete a checkpoint (ver "Decisiones abiertas").
- Todo entra **primero en sombra**: durante la ventana de observación el sistema
  no bloquea nada, solo cuenta cuántas ventas HABRÍA bloqueado y cuáles. Sin ese
  número, encender el bloqueo es apostar.
- Bandera por empresa + kill switch, como manda el Artículo de despliegue
  gobernado del proyecto. Nada global de una.
- El mensaje al vendedor dice qué hay y qué falta —no un "error de stock" seco—
  porque quien está frente al cliente necesita decidir, no adivinar.

## Capabilities

### New Capabilities
- `sale-availability-enforcement`: validación gobernada del disponible en el
  momento de vender, con sombra, bandera por empresa y kill switch.

### Modified Capabilities
Ninguna se reescribe. El descuento de inventario sigue por el camino actual: lo
que cambia es que ANTES de llegar ahí la venta puede detenerse.

## Decisiones abiertas (checkpoint de Daniel — nada se implementa sin esto)

1. **¿Bloqueo duro o aviso con permiso?** Un bloqueo duro impide la venta. Un
   aviso con permiso deja pasar a quien tenga el rol para autorizarlo y deja
   constancia de quién autorizó vender sin respaldo. La segunda opción respeta
   que a veces el vendedor SABE que la mercancía llega mañana.
2. **¿Aplica igual a POS que a venta asistida?** En POS el cliente está enfrente
   y la mercancía en la mano: bloquear ahí puede ser absurdo. En venta asistida
   se promete a futuro: bloquear ahí protege la promesa.
3. **¿Qué pasa con los productos sin registro de inventario?** Hoy se venden sin
   problema. Tratarlos como "cero disponible" bloquearía ventas que hoy
   funcionan; tratarlos como "sin límite" deja un hueco por donde se cuela todo.
4. **¿Las bodegas espejo de un WMS externo (Fullpi, Cereza) cuentan igual?** Su
   saldo es una foto de un tercero, no un conteo propio.

## Impact

- Código: ventas (POS, venta asistida, canales) e inventario. Módulo de máxima
  sensibilidad — un cambio a la vez, diff antes de aplicar, aprobación explícita.
- Config: bandera y política por empresa; sin colecciones nuevas.
- Lectura: reutiliza `availabilityService`, ya desplegado y probado (11/11).
- Contrato: el write-set de inventario NO se toca. Esta capacidad solo LEE para
  decidir; no escribe inventario, ni productos, ni precios.

## No-goals

- No implementar reservas con vencimiento (apartar stock por un tiempo y
  liberarlo). Eso es un paso posterior y necesita su propia propuesta.
- No cambiar cómo se descuenta ni cómo se reintegra.
- No encender nada al desplegar: se despliega apagado, se observa, y se enciende
  empresa por empresa con la palabra de Daniel.
- No tocar la promoción del libro contable (ventana al ~15-ago), que corre en
  paralelo y es de la otra sesión.

## Riesgos

- **El riesgo mayor no es técnico, es comercial**: una venta bloqueada por un
  dato malo es plata que no entra. Por eso la sombra va primero y por eso el
  umbral para encender debe medirse en ventas que se habrían perdido, no en
  líneas de código.
- Los productos con saldo negativo heredado bloquearían de inmediato al
  encender. Hay que contarlos y decidir si se sanean antes (hay 2 en OMS hoy).
- Las bodegas de canal se resuelven en tiempo de descuento: validar antes exige
  resolver la bodega antes, y ese camino tiene sus propias ambigüedades ya
  documentadas (4 líneas de pedidos abiertos hoy no dicen de qué bodega salen).
