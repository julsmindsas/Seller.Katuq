# Instructivos MCP en Integraciones (ticket 1315)

## Por qué

El comercio no descubre desde Katuq que puede usar sus datos con una IA. La conexión se inicia en la IA, mientras las tarjetas actuales llevan a configurar el servicio dentro de Katuq. Daniel pidió trabajar este ticket el 20-oct-2026.

## Qué cambia

- Integraciones muestra inicialmente tarjetas para **ChatGPT, Claude y Codex**. Esta lista se confirma al aprobar la propuesta; no se anuncian otros clientes sin verificar su conexión.
- Cada tarjeta dice **«Desde tu IA»** y ofrece **«Ver instructivo»**. No representa una conexión ni modifica los totales de integraciones conectadas o pendientes de activar.
- El instructivo explica dónde iniciar la conexión, la dirección pública de Katuq que debe copiarse, cómo iniciar sesión con la cuenta propia de Katuq y cómo comprobar el resultado con una consulta de lectura.
- Cada guía incluye requisitos del cliente, fuentes oficiales, fecha de revisión y ejemplos de uso. Aclara que las acciones disponibles dependen de los permisos del usuario.
- La búsqueda encuentra las tarjetas por su nombre y por MCP; «Mis conexiones» conserva su significado y no las presenta como conexiones comprobadas.

## Fuera de alcance

Cambiar el servidor MCP, autenticación, permisos, suscripciones, configuración de integraciones o credenciales. No se crean conexiones desde Katuq ni se recopilan llaves. Sin nuevos endpoints, colecciones, telemetría o proveedores de IA.

## Riesgos y validación

- Los pasos de los clientes cambian: verificar documentación oficial actual y no copiar sin contrastar el manual local `docs/MCP/COMO_CONECTARSE.md` del backend.
- Una guía disponible no acredita una conexión: la interfaz no debe afirmar «Conectado» ni aumentar contadores.
- Cumplir D-131/D-399/D-400: tarjetas y superficies planas con el tema canónico, navegación por teclado, foco visible y revisión a 1440/390 px. Sin migración visual global.
- No toca `orders`, inventario ni consecutivos. No ejecuta herramientas sobre datos de negocio para demostrar la conexión.

## Constitución y estado

Artículos I–III/XIII/XIV: propuesta y spec antes del diseño, cambio acotado y decisión D-508. IV–VIII/X/XI/XV: no cambia contratos ni integración; solo direcciones públicas y uso de la sesión propia. IX/XII: no decide componentes ni introduce banderas en esta fase.

**Propuesta, spec y lista de tres IA aprobadas por Daniel el 20-oct-2026:** «Apruebo ambas specs y la lista de tres IA». Diseño y adaptación Angular 14 aprobados el 20-oct-2026; tareas aprobadas e implementadas localmente; verificación documentada, sin publicación.
