# Canales Próximamente en Mensajes e Integraciones (ticket 1313)

## Por qué

Los comercios no ven los canales de atención previstos. El ticket pide mostrar TikTok, Correo y Llamadas sin permitir activarlos. La tarjeta existente de TikTok Shop pertenece a ventas y no representa mensajes. Daniel seleccionó este ticket el 20-oct-2026.

## Qué cambia

- En «¿Cómo atiendes a tus clientes?» de Integraciones aparecen **TikTok, Correo y Llamadas**, cada una marcada **«Próximamente»**.
- En el menú Mensajes aparecen los mismos tres canales con el mismo estado, sin navegación ni activación.
- Los usuarios que ya pueden ver Mensajes podrán descubrirlos; las entradas informativas no conceden acceso al módulo a usuarios que hoy no lo ven.
- Textos propuestos: TikTok, «Atiende los mensajes que recibes en TikTok»; Correo, «Recibe y responde los correos de tus clientes»; Llamadas, «Habla con tus clientes desde Katuq». Todos acompañados de «Próximamente», sin precios, fecha de entrega o promesas de disponibilidad.
- Se conserva el comportamiento actual de WhatsApp, Instagram y Facebook y la tarjeta separada de TikTok Shop.

## Fuera de alcance

Conectar canales, recibir o enviar mensajes, hacer llamadas, registrar interés, agregar cobros o cambiar permisos. El botón opcional «Me interesa» se omite en este alcance. Sin rutas operativas, endpoints, colecciones o ajustes nuevos.

## Riesgos y validación

- Las entradas informativas no deben abrir rutas vacías ni saltarse los filtros de permisos del menú.
- No confundir TikTok mensajes con TikTok Shop; no se afirma disponibilidad actual en Colombia ni se anuncia un plazo.
- Validar correspondencia con la página comercial `/precios/comunicaciones`. Si el sitio no permite verificarla, dejar esa revisión pendiente y no afirmar conformidad. El ticket también pide revisión de textos con Jairo; preparar los textos sin enviarle mensajes no autorizados.
- UI canónica D-131/D-399/D-400, plana y accesible, con verificación a 1440/390 px y sin aumentar degradados o primarios prohibidos.
- No toca pedidos, inventario, pagos ni consecutivos. No necesita banderas ni configuración en `.env` o Firestore.

## Constitución y estado

Artículos I–III/XIII/XIV: propuesta/spec previa, alcance único y decisión D-509. VI/IX: conservar separación entre UI informativa e integración operativa; arquitectura se decide en diseño. IV–VIII/X/XI/XII/XV: no altera integraciones, contratos, datos, secretos o banderas.

**Propuesta y spec aprobadas por Daniel el 20-oct-2026:** «Apruebo ambas specs y la lista de tres IA». Diseño y adaptación Angular 14 aprobados el 20-oct-2026; tareas aprobadas e implementadas localmente; verificación documentada, sin publicación. No se implementa el módulo omnicanal ni se cierra el ticket padre.
