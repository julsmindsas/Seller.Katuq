# Evidencia para los instructivos — 20-oct-2026

## Katuq, comprobaciones públicas de solo lectura

- `GET https://api.katuq.com/.well-known/oauth-authorization-server`: 200, emisor `https://api.katuq.com`, autorización `/oauth/authorize`, token `/oauth/token`, registro `/oauth/register`. Anuncia clientes públicos (`none`) y autenticación de cliente con secreto.
- `GET https://api.katuq.com/.well-known/oauth-protected-resource`: 200 y servidor de autorización `https://api.katuq.com`.
- El manual local `katuq_admin_back_firebase/docs/MCP/COMO_CONECTARSE.md` documenta `https://api.katuq.com/mcp` (HTTP) y `/mcp/sse` (SSE), y exige OAuth para asistentes usados por personas. No repartir API keys ni parámetros para elegir otra empresa.
- Estos GET no acreditan un recorrido OAuth completo en cada cliente. La sesión MCP de esta conversación permite consultar soporte, pero eso tampoco acredita cada guía de cliente.

## Fuentes oficiales consultadas

- [MCP, OpenAI](https://learn.chatgpt.com/docs/extend/mcp?surface=cli): distingue configuración local (aplicación, CLI y extensión) de plugins en ChatGPT web; admite HTTP y OAuth. El flujo de aplicación mostrado por la documentación usa ajustes de servidores MCP, añadir servidor, reiniciar y autenticar. Verificar los rótulos de la versión objetivo antes de fijarlos en pantalla.
- [Quickstart de plugins, OpenAI](https://developers.openai.com/plugins/build/app-quickstart): documenta añadir el servidor remoto HTTPS terminado en `/mcp`, configurar autenticación, crear el plugin e instalarlo para usarlo en un chat. No trasladar sin contraste los pasos antiguos de «modo desarrollador» del manual local.
- [Conectores remotos, Claude](https://support.claude.com/es/articles/11175166-comienza-con-conectores-personalizados-usando-mcp-remoto): separa instalación individual y administración de organización; admite inicio de sesión OAuth y habilitación del conector en conversaciones. No asumir que todos los planes y organizaciones muestran las mismas opciones.

## Pendientes antes de implementar

- Aprobar propuesta/spec y lista inicial de clientes (ChatGPT, Claude y Codex).
- Verificar las superficies concretas y los requisitos de cuenta descritos en cada guía.
- Probar apertura, cierre y copia en la UI, y no atribuir estados de conexión que Katuq no puede comprobar.
