# Opttia: plan, cupo y permisos

Implementación coordinada entre Seller.Katuq, katuq_admin_back_firebase y KAI/ADK.

## Contrato

- `GET /v1/opttia/access`: consulta sin consumo; devuelve plan, límite, restante, reinicio y herramientas autorizadas.
- `POST /v1/opttia/admit`: ADK reserva un mensaje mediante la transacción existente de `aiLimitsService` antes de procesarlo. Gratis: 10 por día y usuario/empresa; pago: límite definido en `subscriptionLimits` (actualmente ilimitado).
- `POST /v1/opttia/authorize-tool`: revalida permisos sin consumir otro mensaje.
- `POST /v1/opttia/tools/call`: ejecuta el registro MCP de Katuq con el tenant y el usuario autenticados. No utiliza la API key compartida de empresa.

La identidad procede del JWT; el usuario activo y su rol se consultan en Katuq en cada llamada. El contador usa `users.identificacion`, igual al `nit` que devuelve el login. Los encabezados `user` y los roles enviados por el navegador no conceden acceso.

Los roles personalizados necesitan `permissions[modulo] = ['view', ...]`. Un menú visible no equivale a un permiso. Los roles exactos Administrador y Super Administrador habilitan las herramientas catalogadas, pero no evitan los límites del plan.

El catálogo cerrado permite consultas de ventas, inventario, productos, clientes, despachos y cartera según su módulo. Las escrituras de estado, transportador y ajuste de stock requieren sus permisos y conservan HITL. Las herramientas no mapeadas (incluidos reportes dinámicos, sitios y facturación) quedan denegadas hasta definir su autorización específica; no se habilitan por semejanza de nombre. Los cambios forzados quedan fuera de Opttia.

Las confirmaciones verifican el propietario de la sesión y revalidan permisos sin consumir un segundo mensaje. El frontend lee ahora la respuesta SSE de la confirmación. Si Katuq no puede validar, se bloquea; no hay fallback a un cupo local ni acceso directo a Firestore desde las herramientas del chat integrado.

## Alcance y despliegue

Este control diario se aplica al chat AG-UI autenticado con JWT de Katuq. Los demás canales con cuentas nativas de Opttia conservan su facturación propia; no se migraron Telegram, Flask legacy ni otros proveedores de identidad. AG-UI v2 y sus confirmaciones ahora requieren una sesión autenticada perteneciente a la empresa.

Desplegado el 7 de septiembre de 2026, en este orden: backend Katuq, ADK y Seller (Firebase Hosting, proyecto `julsmind-katuq`). Versión Seller: `2026.09.07.1`; bundle `main.f35de6b5aa2355b1.js`. Se publicaron únicamente los archivos del cambio, sin actualizar dependencias ni reemplazar configuraciones de producción.

Los originales de backend y ADK están respaldados en `/home/ubuntu/deploy-backups/opttia-20260907.0oyLVw`, archivos `backend-before.tar.gz` y `adk-before.tar.gz`. Para revertir, restaurar el archivo correspondiente en la raíz de su repositorio y reiniciar solo el servicio afectado. Los cambios locales siguen pendientes de commit.

- ADK: `KATUQ_ACCESS_API_URL` opcional; defecto `https://back.katuq.com/v1/opttia`. Sigue requiriendo `KATUQ_JWT_SECRET` para validar los JWT existentes. No registrar tokens en sesiones ni logs.
- Seller: `opttiaAccessApi` opcional en el entorno local; defecto `https://back.katuq.com/v1/opttia/access`. Los archivos de entorno permanecen ignorados y no deben subirse con secretos.
- El periodo diario sigue el día UTC que usa el identificador del contador existente. El `resetTime` se alineó con UTC para no anunciar otra hora en servidores configurados en Colombia. El navegador muestra esa fecha en la zona local, sin crear otro contador.

## Verificación

Pruebas aisladas sin datos reales: `node --test functions/tests/opttia-access.test.js` en backend y `python3 -m unittest discover -s adk_agent/tests -p test_katuq_access_policy.py -v` en KAI. Cubren concurrencia del último cupo, aislamiento de identidad, revocación de permisos, voz gratis, catálogo cerrado y gates HITL.

Se verificó además con ADK 1.39, Runner e InMemorySessionService reales, HTTP local contra Express y JWT firmado con un secreto exclusivo de prueba. El modelo, Firestore y el registro ejecutor están simulados: no hay llamadas al modelo ni escrituras productivas. Se verificaron lectura autenticada, cupo agotado, permiso revocado con confirmación pendiente, confirmación permitida sin doble consumo, bloqueo de producción gratis y contrato de ajuste de stock con clave estable por sesión/operación.

Para repetir desde `adk_agent`, configurar `KATUQ_TEST_BACKEND_ROOT` con el path del checkout backend y ejecutar `.venv-claude/bin/python -m pytest tests/test_katuq_access_integration.py tests/test_katuq_access_policy.py tests/test_katuq_jwt_auth.py tests/test_hitl_write_flow.py -q`. El servidor de pruebas usa loopback y un puerto efímero, y se cierra al terminar.

En el servidor de producción pasaron las 7 pruebas del backend y las 30 pruebas ADK con su runtime instalado (ADK 1.23.0), sin actualizarlo. Los datos y ejecutores de estas pruebas son simulados. Tras reiniciar, `/adk/health` y `/adk/agui/health` respondieron 200; `/v1/opttia/access` sin sesión respondió 401; AG-UI v2 rechazó la solicitud anónima con RUN_ERROR y su endpoint de confirmación respondió 403. No se ejecutaron pedidos, ajustes de inventario ni llamadas reales al modelo. La validación autenticada con una cuenta real queda pendiente; estas comprobaciones no sustituyen esa prueba funcional.
