## Why

Daniel pidió: «en el traking deberiamos ver que pedidos lleva el mensajero». Hoy el panel «Mensajeros» del mapa de Despachos solo muestra el pedido al que el mensajero tocó «Navegar» y cuántos le quedan; no dice cuáles son. Además, los mensajeros independientes (D-514, D-515) no aparecen en el mapa de ningún comercio, ni en el del comercio cuyos pedidos llevan.

## What Changes

- El panel «Mensajeros» lista, bajo cada mensajero, los pedidos que sigue llevando (número, cliente y estado), y la ficha del mapa suma una fila «Pedidos». La lista sale de los pedidos que el Seller ya tiene; la app no manda nada nuevo.
- Un independiente aparece en el mapa de un comercio solo mientras lleva un pedido de ese comercio.
- La clave con la que un independiente publica su ubicación incluye el id de su ficha, para que dos con el mismo nombre no compartan punto (app v29, sin publicar).
- Arreglo de paso: el nombre del mensajero de un pedido tomado desde la app llega como texto; el mapa lo leía como objeto.

## Capabilities

### New Capabilities
- `seguimiento-pedidos-mensajero`: qué pedidos lleva cada mensajero en el mapa de Despachos y cuándo se ve un independiente.

### Modified Capabilities
- ninguna.

## Impact

- Seller: `despachos.component` (entregas asignadas), `mapa-ubicaciones` (panel y ficha), utilidad `shared/utils/entregas-mensajero.ts` con pruebas.
- App Android: `Carrier.trackingId` de los independientes.
- Backend: ninguno. Sin colecciones, rutas ni reglas nuevas.
- Decisión: D-516 en `specs/CONTRACT.md`.
