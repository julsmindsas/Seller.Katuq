# Contratos aprobados — D-569

Preparados el 27-oct-2026; aprobados junto con `design.md` el 28-oct. Tareas/diff aprobados, SDKs y modelo con datos sintéticos verificados. Git/despliegue autorizados y realizados el 29-oct según `publicacion.md`; la conversación operacional desde el botón con un comercio real aún no se acredita.

## Herramienta y proyección

`get_company_brand_voice` se ejecuta por el MCP integrado existente y el registro central. Input: objeto vacío, `additionalProperties: false`; no admite empresa, campos, modo, URL o permisos. Permiso explícito de registro: `read`; contexto interno de canal obligatorio, además de autorización y admisión vigentes.

Respuesta de éxito, schema cerrado en todos sus niveles:

```json
{
  "company": "COMERCIO SINTETICO",
  "status": "ready",
  "voice": { "tones": ["warm", "professional", "conversational"] }
}
```

- `company`: identificador exacto del comercio autenticado, obtenido por servidor. No es una nueva llave enviada por el cliente ni un nombre inferido por el modelo.
- `status`: `ready`, `unconfigured` o `unsupported`. `ready` exige al menos un tono; los otros estados exigen lista vacía. No devuelve el valor inválido, motivo textual del perfil, claves de archivo o campos libres.
- `voice.tones`: lista sin duplicados, máximo diez valores del catálogo siguiente. Orden canónico del catálogo, independiente del orden introducido. No hay texto libre ni campos adicionales. ADK exige esa misma forma.

| Etiquetas completas admitidas, normalizadas | Enum y pauta canónica |
|---|---|
| cercano, cercana | `warm`: cercanía, sin exceso de confianza |
| profesional | `professional`: trato profesional y precisión |
| informal | `conversational`: redacción conversacional respetuosa |
| formal | `formal`: redacción formal |
| amable | `friendly`: amabilidad |
| alegre | `cheerful`: ánimo positivo, sin trivializar reclamos |
| empatico, empatica | `empathetic`: reconocer la preocupación |
| respetuoso, respetuosa | `respectful`: respeto |
| claro, clara | `clear`: claridad |
| directo, directa | `direct`: brevedad y concreción |

Normalización exclusivamente para comparar: string de hasta 1200 caracteres, Unicode NFKC, minúsculas, retiro de acentos y espacios exteriores. Separar por coma, punto y coma o salto de línea; ignorar solo segmentos vacíos. Cada segmento restante debe coincidir **completo** con una etiqueta de la tabla. Un token desconocido, otro tipo, exceso de tamaño o combinación `formal`+`informal` da `unsupported` sin rescatar parte del texto. Campo ausente/vacío: `unconfigured`. No búsquedas parciales, sinónimos inferidos, traducción automática o extracción LLM. Los mapeos son constantes de código, no fragmentos copiados del perfil.

Esta proyección es una reducción deliberada del perfil libre; no acredita que se reproduzcan frases únicas, historia, políticas o preferencias no representadas. Todos los roles reciben la misma proyección del mismo comercio. No altera el objeto almacenado.

## Matriz de acceso

| Contexto vigente | Chat | Voz común | Perfil completo/documentos | Otros efectos |
|---|---|---|---|---|
| Empleado con ventas y sin Marca | Según cuota actual | Sí | No | Solo herramientas actuales de ventas |
| Empleado con inventario y sin Marca | Según cuota actual | Sí | No | Solo inventario actualmente autorizado |
| Empleado con Marca→Ver | Según cuota actual | Sí | Según autorización actual | No añade escritura/indexación |
| Empleado con solo soporte elegible | Según cuota actual | Sí | No, salvo permiso independiente | Soporte conserva bandera y confirmación privada |
| Rol sin herramientas previas elegibles | Denegado | No | No | Cero ampliaciones |
| Usuario/empresa inactivos, sesión vencida o identidad inválida | Denegado | No | No | Rechazo sin clave alternativa |
| Plan gratuito con acceso y cupo | Según límites actuales | Sí | Según rol y cupos documentales | Sin más créditos, agentes o acciones |
| Otro canal MCP, aunque tenga read/admin | Sin cambio en ese canal | Herramienta nueva oculta y rechazada | Contrato anterior | No obtiene el carril integrado |

La retirada de Marca conserva voz solo si quedan capacidades que ya hacían elegible al usuario. Si Marca era su único acceso, pierde también el chat. No inferir elegibilidad por nombre del rol. Conservar el estado restringido actual de soporte, incluso si es la única capacidad.

## Errores, cuotas y aislamiento

- `/access`, `/admit`, `/authorize-tool` y `/mcp` conservan auth y estados HTTP/JSON-RPC vigentes. Denegación de tool: `isError: true` y mensaje de negocio sin perfil o información sensible; no un falso `ready` ni `{}` tratado como éxito.
- Sin elegibilidad o admisión válida: no lectura de perfil ni consumo adicional para intentar rescatar la consulta. La cuota agotada bloquea nuevos mensajes como hoy. No se modifica el grant ni su vínculo/caducidad.
- Una lectura fija de voz por mensaje admitido; cero búsquedas documentales para precargarla; cero llamadas extra al modelo para derivarla; presupuesto operativo de cuatro intacto. No permitir que el modelo invoque la lectura fija como una herramienta ilimitada.
- Backend transitoriamente indisponible/no compatible: tono neutral y limitación breve, sin precargar perfil protegido. Auth/admisión denegadas, schema inválido o empresa diferente: detener, sin fuentes alternativas. No cobrar un segundo mensaje/crédito al manejar el error; este cambio no rediseña el cobro ya consumido.
- En cada POST MCP vuelven a regir usuario/empresa/rol actuales. Contexto limpiado al terminar, error o cancelación; pruebas concurrentes deben acreditar que no se cruzan voces ni autorizaciones.

## Evidencia exigida antes de publicar

1. Proyección: cada enum/alias, vacíos, duplicados, acentos, tamaño, conflicto formal/informal y texto desconocido. Centinelas secretos en cada campo excluido y en un párrafo de `tonoMarca`: nunca aparecen en respuesta MCP ni entrada al modelo. Demostrar que no se comparte parcialmente un campo inválido.
2. Permisos: matriz completa, roles inicialmente vacíos, solo Marca, solo soporte, plan gratuito, revocación entre mensajes y entre admisión/tool. Llamar por nombre directo, falsificar argumento/_meta/marcador y usar `admin` en otro canal no abre la tool. Las dos rutas genéricas de catálogo no la anuncian.
3. Aislamiento: dos comercios sintéticos simultáneos con tonos distintos, tenant falsificado, cambio de sesión/comercio, error y cancelación de stream. Capturar solo trazas sintéticas; no exportar tokens reales.
4. Transporte: SDK MCP Node/Python reales contra servidor local sintético, schema cerrado, `isError`, payload malformado/tenant diferente, timeout y backend sin tool. Verificar uso del registro central, ausencia de escritura de negocio y contadores sin consumo doble.
5. Modelo real: saludos de ambos roles con igual voz y diferentes datos accesibles; reclamo con culpa desconocida; abono no aprobado; manual sin vigencia; perfil hostil excluido; documento con inyección; ejemplo ficticio sin llamadas operativas; caso real con solo consultas pertinentes. Revisar texto **y trazas**, no inferir llamadas de la narración. Un fallo exige corregir y repetir los casos afectados; no contar fixtures como respuestas reales.
6. Regresión: admisión, límites, documentos, consumidores nativos y soporte D-545. En soporte no se entregan grants al modelo, un «sí» no confirma y no se alteran propuesta, caducidad, identidad o idempotencia. Dobles locales para tickets/avisos; no crear tickets reales por ejecutar esta matriz.

Registrar resultados, versiones, número de casos y límites en la bitácora al ejecutar. Las pruebas nuevas permanecen locales, ignoradas y sin datos reales conforme D-566. Una revisión futura desde ALMARA debe usar sesión legítima y mensajes sin datos de clientes; no se fabrica una cuenta o se cambia un rol para hacerla pasar. Resultados locales acreditados y pendientes en `verificacion.md`; no inferir prueba de modelo o producción de los contratos sintéticos.
