# Diseño — canales Próximamente (D-509)

Estado: **diseño y adaptación a Angular 14 aprobados por Daniel el 20-oct-2026:** «Apruebo ambos diseños y la adaptación». Propuesta/spec ya aprobadas. Tareas aprobadas e implementadas localmente; verificación documentada, sin publicación.

## Decisiones

1. **Una descripción compartida de canales previstos.** Un catálogo puro en `shared/data/future-message-channels.ts` contiene identificador, título, icono y descripción de TikTok, Correo y Llamadas. El directorio lo adapta a `estado: pronto`, `fuente: ninguna`, categoría marketing. No se agregan proveedores a servicios ni al backend.
2. **Integraciones.** Añadir las tres entradas al grupo `atender`, conservando el guard existente de `abrirEntrada` para `pronto`. Son artículos informativos, sin botón ni foco de control. La métrica «Próximamente» aumenta en tres; no cuentan como conexiones o pendientes de configurar. TikTok Shop conserva su entrada separada en ventas.
3. **Menú después de autorizar.** Mantener las tres rutas actuales de WhatsApp, Instagram y Facebook y sus comparaciones exactas de permisos. En `filterMenuItemsByAuthorization`, primero filtrar los hijos operativos con la lógica vigente. Sólo si el grupo Mensajes conserva al menos uno, añadir al resultado los tres informativos, con `type: info` y **sin `path`**. No introducirlos en `ALLMENUITEMS` ni en las rutas autorizables: no amplían `collectAllMenuPaths`, comodines o permisos del rol. Construir el resultado con copias para que las recargas no dupliquen entradas ni muten el catálogo fuente.
4. **Representación no navegable.** En el submenú del sidebar, representar `type: info` mediante contenido estático con nombre, icono y etiqueta «Próximamente». Semántica de elemento de menú deshabilitado (`aria-disabled`), sin `routerLink`, href, handler o tabulador de acción. Conservar la legibilidad al abrir el menú móvil y la ausencia de acción con clic/Enter/Espacio.
5. **Consumidores secundarios.** La búsqueda global y favoritos sólo aceptan entradas `type: link`; confirmar que se mantenga así. Revisar claves del sidebar para ítems sin ruta y comprobar que no intenten activarse o marcarse por URL. No se crean enlaces de reserva, rutas vacías ni destinos ficticios.

## Presentación y textos

- «TikTok — Atiende los mensajes que recibes en TikTok»; «Correo — Recibe y responde los correos de tus clientes»; «Llamadas — Habla con tus clientes desde Katuq». Todos bajo «Próximamente», sin fecha de lanzamiento, precios o anuncio de habilitación actual.
- Reutilizar la tarjeta `is-pronto` y la insignia existente. Sidebar: texto con color y tamaño explícitos, fondo suave y sin gradientes nuevos. Aplicar tokens canónicos; ninguna clase nueva contiene `p-`. No modificar presentación global del sidebar.
- En Integraciones se comparte con D-508 la incorporación acotada de `config-pagina` al marco y encabezado. No crear una base visual paralela.
- **Compatibilidad Art. IX:** las plantillas existentes permanecen con las directivas de Angular 14.3. La adaptación acotada se registra al aprobar el diseño, sin migración de framework ni extensión a otros cambios.
- La página comercial renderizada se comprobó el 20-oct-2026: muestra TikTok, Correo y «Telefonía en la nube» como Próximamente; su FAQ no compromete fecha. «Llamadas» es la etiqueta breve del ticket para esa telefonía. Evidencia en `fuentes.md`. La revisión con Jairo pedida en el ticket sigue como validación editorial explícita pendiente; no se le envían mensajes sin autorización.

## Datos, seguridad y despliegue

Flujo informativo: catálogo local → listado o menú ya autorizado → texto estático. Sin solicitudes, configuraciones o escrituras nuevas en Firestore/RTDB, sin cambios del interceptor/auth, flags, `.env`, comunicaciones o cobros. No tocar pedidos, inventario, precios, pagos o consecutivos.

Implementar en serie respecto de D-508 por compartir directorio/listado; el sidebar/nav sólo pertenecen a este cambio. Reversión mediante retirar las entradas y su renderizado; no existe migración de datos.

## Verificación

- Prueba de permisos sobre la construcción real del menú, con rol sin rutas, permiso exclusivo de WhatsApp, sólo Instagram/Facebook, administrador y comodín: la presencia de los informativos no añade un canal operativo ni mantiene Mensajes cuando no queda ninguno autorizado.
- Repetir el filtrado no duplica ni acumula entradas. Las tres nuevas carecen de ruta; buscar o guardar favoritos no produce destinos ficticios.
- Verificar guard de `pronto`: clic y teclado no llaman configuración, navegación o APIs. Las rutas de los tres canales actuales conservan su texto exacto.
- Navegador a 1440 y 390 px: listado, menú desplegado y móvil, nombres y estados legibles, sin scroll horizontal ni navegación accidental. Build de producción limpio y conteos CSS sin subir respecto de la línea base.
- Bitácora y nota técnica por MCP con resultados. Este ticket no acredita el módulo omnicanal ni el QA de sus otros hijos. No cerrarlo por escribir la spec o por compilar.

## Gate constitucional

I–III/XIII/XIV: spec/diseño aprobados, tareas aprobadas, alcance separado y registro D-509. IV–VIII/X/XI/XV: no se cambian contratos ni se escriben datos; aislamiento y permisos vigentes. VI: catálogo puro sin integración de proveedor. IX: modificación acotada compatible con Angular 14 y base visual canónica. XII: no se introducen flags.
