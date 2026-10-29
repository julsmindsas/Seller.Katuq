## Why

Daniel pidió: «sí, separa el tono de marca de los permisos de documentos y corrige lo de las quejas, que todos los empleados respondan con la personalidad de su comercio».

Actualmente el chat integrado entrega tanto personalidad como documentos solo a quien tiene Marca→Ver. Un empleado autorizado para consultar ventas o inventario puede usar Opttia, pero sin la voz de su comercio. La revisión real de ALMARA también mostró respuestas a quejas que mezclan pautas de trato, reglas de un manual cuya vigencia no consta, inferencias sobre quién se equivocó y sugerencias de compensación.

## What Changes

- Todo empleado activo con acceso vigente al chat integrado recibe la voz compartida de **su propio comercio**, sin exigir Marca→Ver ni un plan pago adicional. Esto no abre el chat a cuentas o roles que hoy no tienen acceso.
- La voz compartida comprende preferencias de redacción y trato, no una copia indiscriminada del perfil libre, adjuntos, políticas internas o condiciones comerciales. No concede acceso documental ni otras consultas.
- Los documentos, sus fragmentos, estado y gestión mantienen sus permisos actuales; tener voz de marca no permite encontrarlos o citarlos por otro camino.
- En quejas, reconocer la preocupación con respeto y separar hechos, orientaciones y acciones pendientes. No dar por vigente un manual antiguo, culpar al cliente ni prometer plazos, abonos, cambios o reembolsos sin respaldo y autorización.
- Una solicitud de redactar un ejemplo ficticio produce el borrador con la voz del comercio; no busca pedidos o datos de clientes innecesarios. Un caso real se verifica solo con sus herramientas y alcance autorizados.

## Capabilities

- `opttia-shared-brand-voice`: voz común del comercio, separada de permisos documentales.
- `opttia-brand-complaint-responses`: trato de quejas con evidencia, prudencia y límites de actuación.

## Alcance y no-goals

Solo conversación básica de Opttia dentro de Katuq. Se conserva el MCP autenticado existente, admisión, cuotas, planes, registro central y confirmación de soporte D-545. No nuevas colecciones, endpoints o módulos v2; no acceso directo a datos desde el modelo.

No modifica roles ni concede Marca→Ver; no habilita el chat para cuentas sin acceso; no publica Opttia completa, bots de clientes o canales nativos. No indexa archivos, amplía cupos, OCR ni ranking. No reescribe perfiles existentes de forma masiva. No cambia saludo estático, botón, avatar o diseño. La mejora documental pendiente de `opttia-marca-consulta-automatica` se conserva como trabajo separado: no se arrastra silenciosamente.

Write-set operativo nuevo previsto: vacío. La admisión conserva su consumo habitual; no toca pedidos, inventario, productos, precios, pagos, facturas, consecutivos, tickets o avisos. Publicar/activar o probar efectos reales conserva autorización separada.

## Riesgos y controles de aceptación

- Compartir texto libre indiscriminadamente podría revelar instrucciones o información interna: el diseño deberá delimitar el contenido compartible; la instrucción al modelo no sustituye una frontera de acceso.
- Un permiso de estilo no es autorización documental. Aislar por sesión/comercio y probar extracción indirecta, roles sin documentos, revocación y cambios de empresa.
- El estilo no acredita una política o una gestión. Perfil/documentos no pueden ampliar permisos ni afirmar actuaciones no ejecutadas.
- Backend auth y cuotas son sensibles: cualquier diff de autorización se presenta concretamente antes de aplicar, según las reglas del repositorio. Sin retirada de middleware/interceptor, claves de respaldo o cambio de proveedor/modelo.
- Pruebas nuevas locales y sin datos reales, fuera de Git (D-566); las ya versionadas pueden actualizarse sin secretos. Evidencia en contrato/commit. Si se publica un cambio visible, nota de versión sencilla conforme D-567.

## Estado y gate constitucional

**D-569**,27-oct-2026. Requisitos, diseño/contratos, tareas y diff sensible aprobados en sus checkpoints; T-01 a T-13 verificadas. El 29-oct Daniel autorizó además Git/despliegue: backend y ADK publicados, evidencia en `publicacion.md`. Pendiente solo comprobar el botón con sesión legítima; sin cambios de roles reales.

Cumple Art.I/II/XIV mediante spec y checkpoints; IV/VIII con contratos antes de código; XI con mínima exposición y evidencia sin secretos; XIII con dos capacidades de una misma función. Sin UI, inventario, integraciones de escritura ni flags nuevos en esta fase. Si el diseño necesita un flag, deberá definir dueño/retiro y configuración conforme D-505, no en `.env`. No requiere excepción constitucional.
