# Propuesta: qué comprar, cuánto y a quién

## Why

Con el MVP de compras desplegado (2026-08-11) Katuq ya sabe **registrar** una
compra: proveedor, orden, recepción, costo, factura, pago. Pero la pregunta que
alguien se hace **antes** de todo eso sigue sin responderse: *¿qué hay que
comprar?* Hoy se contesta de memoria, mirando estantes.

El dato para contestarla ya existe y no se está usando. El informe de
indicadores calcula, por producto y bodega, el consumo diario y la cobertura en
días. Medido contra producción hoy:

| Empresa | Productos con demanda (90 días) | Se sugeriría reponer | Se agotan antes de que llegue el pedido |
|---|---|---|---|
| ALMARA FELICIDAD | 745 | 388 | 256 |
| CAFE ESCOBAR | 53 | 20 | 17 |
| OH MY STORE | 30 | 10 | 7 |

Esos 256 de ALMARA son ventas que se van a perder calladamente: productos que
rotan, con cobertura por debajo del tiempo que tarda el proveedor en entregar.
Nadie los está viendo.

Dos hallazgos de la misma medición, que la propuesta asume:

1. **Sin demanda registrada no hay sugerencia posible.** OH MY STORE tiene
   13.350 filas de inventario y solo 30 productos con demanda en 90 días: su
   venta no siempre deja movimiento. La sugerencia no lo inventa — muestra la
   cobertura de lo que sí tiene historia y dice explícitamente cuántos productos
   quedaron fuera por falta de datos.
2. **Los 388 productos sugeridos de ALMARA no tienen costo conocido.** La
   sugerencia puede decir qué y cuánto, pero no cuánto va a costar mientras el
   costo no entre por la compra. Es la misma deuda que ya está en camino de
   cerrarse.

## What Changes

**Sugerencia de reposición.** Por bodega, una lista de qué comprar y cuánto,
con su urgencia. La cuenta es:

```
necesidad = consumo diario × (días de cobertura objetivo + días de entrega del proveedor)
            − saldo disponible
            − lo que ya está pedido y no ha llegado
```

Lo que ya está pedido **se descuenta**: sin eso, la sugerencia manda a comprar
otra vez lo que viene en camino, que es la forma más cara de equivocarse.

**Urgencia, no un solo montón.** Un producto cuya cobertura es menor que el
tiempo de entrega del proveedor se agota antes de que llegue el pedido: eso se
marca aparte de lo que solo está bajo.

**Días de entrega en el maestro de proveedores.** Sin ese dato el cálculo usa un
valor por defecto de la empresa; con él, cada proveedor se mide por lo que
realmente se demora.

**De la sugerencia a la orden.** Lo seleccionado se convierte en órdenes de
compra agrupadas por proveedor, con el último costo conocido de cada producto.
Nada se compra solo: la sugerencia propone, una persona decide.

## Impact

- **Nuevo**: `services/purchasing/replenishmentService.js`, endpoint de
  sugerencia, pantalla "Qué comprar" dentro de Compras, campo `diasEntrega` en
  proveedores.
- **Se reutiliza**: `cargarInformeKpi` del informe de indicadores (una sola
  forma de calcular consumo y cobertura en todo el sistema) y `crearOrden`.
- **No cambia**: inventario no se toca — la sugerencia solo lee. Sigue vigente
  el write-set cerrado: compras escribe órdenes y el costo del producto, nada
  más.
- **Riesgo asumido**: una empresa sin demanda registrada verá pocas o ninguna
  sugerencia. Es correcto — inventar demanda sería peor — y la pantalla lo dice
  en vez de mostrar una lista vacía sin explicación.
