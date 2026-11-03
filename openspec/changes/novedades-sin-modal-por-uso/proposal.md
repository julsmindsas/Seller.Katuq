## Why

Desde el ticket 1377 (D-567), al entrar a una versión nueva sale una ventana en el centro de la pantalla con todas las notas de la versión. Daniel (3-nov-2026): «no a todos le interesa y está muy invasivo»; las novedades deben ir en otro lado y salir según lo que el comercio usa o tiene configurado. Hoy un comercio que no factura con la DIAN se come cinco notas de facturación electrónica antes de poder trabajar.

## What Changes

- **Se quita la ventana automática de novedades.** Ya no sale nada encima de la pantalla al entrar a una versión nueva.
- **Las novedades pasan a la campana de notificaciones**, en una pestaña «Novedades» junto a los avisos de siempre. Si hay novedades nuevas para el usuario, la campana lleva un punto discreto (sin número). Al abrir la pestaña quedan vistas.
- **Cada nota dice a qué módulo pertenece** (opcional). Una nota con módulo solo se le muestra a quien tiene ese módulo en su menú (rol y banderas de la empresa) y lo ha usado en los últimos 90 días. Una nota sin módulo es general y la ven todos.
- **La pestaña muestra las novedades de los últimos 45 días**, no solo las de la última versión, para que un usuario que no entró en una versión no se las pierda.
- La píldora «Versión nueva» de la barra superior se queda igual (avisa que hay que recargar y no bloquea), pero su «Ver notas» también muestra solo las notas que le aplican; si ninguna le aplica, no ofrece el botón.
- La guía de notas de versión (D-567 en `AGENTS.md`) agrega el campo de módulo. Las notas de los últimos 45 días se etiquetan con su módulo.

## Capabilities

### New Capabilities
- `novedades-version`: cómo y a quién le llegan las notas de versión del Seller: dónde se ven, cuándo cuentan como nuevas y qué notas le aplican a cada usuario.

### Modified Capabilities
- Ninguna en `openspec/specs/`. La regla vigente (D-567) está en `AGENTS.md` y el contrato; se registra **D-581** que reemplaza la parte de la ventana automática de D-567 (se marca SUPERSEDED en esa parte, no se borra).

## No-goals

- No se usa información del backend sobre qué tiene configurado la empresa (qué integración está conectada, si ya emitió facturas). Solo lo que el front ya sabe: el menú del usuario, las banderas de la empresa y las pantallas que el usuario abre. Si hace falta más precisión, es otro cambio.
- No se crean colecciones, endpoints ni datos en el servidor. El registro de pantallas usadas queda solo en el navegador del usuario y no se envía a ningún lado.
- No cambia la píldora de «Versión nueva» ni la forma de recargar.
- No cambia cómo se escriben ni publican las notas, salvo el campo nuevo de módulo.

## Riesgos

- **Módulos sensibles:** no se tocan pedidos, inventario, pagos ni consecutivos. Es presentación del encabezado y el script que arma `version.json`.
- **Navegador nuevo o datos borrados:** sin historial de uso, el usuario solo ve las notas generales hasta que use los módulos. Se acepta: es preferible no molestar.
- **Nota mal etiquetada:** si el módulo no coincide con ninguna ruta del menú, nadie la ve. El script de versión avisa en el build cuando un módulo no existe en el menú.

## Impact

- Front: `shared/components/aviso-actualizacion/` (se retira la ventana), `shared/components/notification-center/` (pestaña y punto), un servicio nuevo de novedades en `shared/services/`, i18n es/en/pt/de.
- Build: `update-version.js` agrega `recientes` y `modulos` a `src/assets/version.json`.
- Docs: `AGENTS.md` (D-567), `specs/CONTRACT.md` (D-581), `notas-version.json` (etiquetas de módulo).
- Backend: ninguno. Se puede publicar sin desplegar backend.
