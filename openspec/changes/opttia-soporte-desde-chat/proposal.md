## Why

Daniel, 23-oct: «necesito que este Opttia pueda crear tickets de soporte, como se hace normalmente, ya tenemos el MCP».

Katuq ya ofrece `create_support_ticket` por MCP. Utiliza el mismo servicio de alta, contador, tablero y avisos que la creación habitual. No hace falta crear otro sistema de soporte ni dar acceso a agentes completos de Opttia.

El chat integrado no la puede usar todavía: su catálogo excluye soporte y sus controles bloquean toda escritura. La pantalla genérica de confirmación del chat apunta además a una reanudación que no implementa el endpoint básico. Habilitar solo el nombre de la herramienta no completa el recorrido ni acredita aprobación humana.

## What Changes

- Permitir que una persona autorizada para soporte describa el problema en el chat integrado y que Opttia prepare un asunto y una descripción sin inventar datos.
- Presentar dentro del chat el resumen con empresa, autor y evidencias ya disponibles, con acciones **Crear ticket** y **Cancelar**. Editar el contenido exige una propuesta nueva. No se crea por un «sí» producido por el modelo ni por una confirmación anterior.
- Al pulsar Crear ticket, ejecutar exclusivamente el MCP existente con la identidad autenticada. Mantener el servicio habitual de soporte, su numeración y avisos, sin llamar al alta pública como respaldo.
- Mostrar éxito solo con el número y referencia devueltos por el servidor; si ya existía uno equivalente, informarlo sin abrir otro. Reintentos o doble clic de una misma aprobación no deben crear tickets duplicados ni repetir avisos de creación.
- Autorizar soporte independientemente de consultas comerciales: no exigir acceso a ventas o inventario para reportar un problema, pero conservar la comprobación del usuario, rol y acceso de soporte vigentes.
- Tratarlo como una excepción cerrada al chat de solo consulta. No habilita modificar pedidos, stock, pagos, productos, tickets existentes, estados o responsables.
- Activación controlada por comercio según D-385/D-505, apagada inicialmente. No modificar permisos de los roles como efecto lateral ni considerar aprobada la propuesta D-532.

## Flujo esperado

1. Persona: «No puedo facturar el pedido X; sale este error…».
2. Opttia organiza lo recibido y pide únicamente el dato imprescindible que falte. Para este trámite acotado no depende de memoria general ni de agentes nuevos.
3. La persona revisa el resumen y pulsa Crear ticket o Cancelar.
4. El MCP confirma el ticket creado o existente. El chat muestra su número real y cómo abrirlo desde Katuq.

No son requisitos de esta entrega buscar todo el historial de soporte, asignar agentes, cerrar tickets, agregar comentarios o subir archivos nuevos. Se pueden conservar las evidencias ya disponibles y autorizadas que admita el MCP actual.

## No-goals

- No otro backend, endpoint de alta, colección de tickets, contador o proveedor de soporte.
- No acceso a notas internas, agentes del equipo ni tickets de otra empresa. La sesión operadora tampoco se usa para ampliar el reporte a otra empresa desde este chat integrado.
- No permisos generales de escritura, nuevas API keys, cambio de modelos/planes, memoria general o agentes completos de opttia.com.
- No migraciones de roles ni resolución de usuarios duplicados. No publicación conjunta del candidato de documentos de marca.
- No cambios a pedidos, inventario, productos, precios, pagos, facturación o consecutivos de pedidos.
- No prometer todos los campos del formulario web: el MCP actual acepta asunto, descripción y evidencias, y mantiene sus valores de clasificación por defecto. Prioridad y agente no se inventan ni asignan desde la conversación.

## Seguridad, UI y constitución

La confirmación debe estar vinculada a persona, sesión, empresa y contenido exacto, incluidas las evidencias. El modelo no puede aprobarse ni reutilizar un comprobante leído como dato. Revalidar acceso al confirmar; revocación, cambio de empresa, vencimiento o modificación de contenido impiden la creación.

Mantener las cuotas y el límite de consultas del chat; confirmar o cancelar la misma propuesta no exige otra respuesta del modelo ni vuelve a cobrar ese mismo mensaje. Las pruebas de creación interceptan la persistencia y los avisos; no abren tickets reales como efecto lateral.

Write-set permitido: alta habitual de soporte, su contador compartido y avisos/auditoría existentes tras aprobación; sin nuevas colecciones. Todos los dominios operativos permanecen sin escrituras. UI con el diseño canónico `#5F3FE0`, superficies planas, foco visible, texto escapado y verificación a 390 y 1440 px. Conservar el acceso actual de Opttia desde el encabezado (D-540), sin reintroducir el lanzador flotante retirado.

Aplican Artículos I/II (spec y checkpoints), IV (idempotencia), VII/VIII (trazabilidad y contratos primero), XI (sin credenciales en logs) y XIV (registro del cambio). Las guías del backend/ADK exigen reusar MCP, identidad por petición y separar aprobación de ejecución.

## Estado / checkpoint

Alcance/spec, diseño/contratos y tareas aprobados por Daniel el 2026-10-23. El diff del servicio compartido recibió además aprobación concreta: «si aprobado, aplica el diff y sigue con el MCP y el chat». Candidato local implementado y verificado en los tres repositorios; bandera apagada por defecto. Evidencia y límites: `verificacion.md`. Sin autorización de commit/push, publicación, activación o tickets reales.
