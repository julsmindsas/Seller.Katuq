## Why

Daniel: «ningún usuario le va a hablar de PDF, debe ser capaz de resolverlo automáticamente». La persona necesita preguntar por su negocio con sus propias palabras; conocer nombres de archivos o dictar búsquedas no es un requisito aceptable.

Pruebas del 20-oct en ALMARA FELICIDAD:
- La bienvenida y la queja del chat real reflejan el perfil guardado.
- Pedir la presentación por nombre no la encontró; dictar una búsqueda por contenido sí. Esa segunda prueba demuestra conectividad, no resuelve la experiencia del usuario.
- Consulta directa del servicio productivo: «¿Qué representa Almara?» prioriza Alfajores Ellas y revisión de compra; «¿Cómo debo responder cuando un cliente está molesto?» prioriza Medios de pago. «¿Cuáles son nuestros valores de marca?» y la pregunta por tiempos de entrega sí devuelven primero la fuente esperada.

Evidencia técnica: la clasificación actual cuenta palabras en el cuerpo y no considera el nombre de la fuente; se limita a tres fragmentos. La descripción de la herramienta y la instrucción del chat mencionan políticas/manuales sin explicar suficientemente los casos cotidianos de identidad y atención. Estas son limitaciones comprobadas, no prueba de que una única modificación de instrucciones baste.

## What Changes

- Opttia identifica cuándo una pregunta requiere conocimiento propio del comercio y consulta sus fuentes automáticamente, sin que la persona mencione PDF, documentos, herramientas o palabras clave.
- Combina la personalidad guardada con el contenido pertinente y responde directamente en lenguaje cotidiano. Las referencias acompañan la respuesta cuando corresponde, sin convertirse en pasos que deba ejecutar la persona.
- Si la primera búsqueda no aporta evidencia suficiente, intenta una búsqueda alternativa dentro del presupuesto existente antes de concluir que no dispone de información. No confunde una búsqueda fallida con la inexistencia del archivo.
- La selección de fuentes debe privilegiar pertinencia al tema frente a la mera repetición del nombre del comercio. La validación incluye preguntas naturales y paráfrasis.
- Si no hay información autorizada suficiente, explica qué dato del negocio falta; no inventa políticas ni pide al colaborador identificar archivos ya disponibles.

## Capabilities

- Nueva: `opttia-brand-automatic-answers`.
- Complementa la propuesta pendiente de preguntas de negocio; no aprueba ni implementa sus cambios de ventas o seguimiento.

## No-goals

- Preparación automática de archivos, ampliación de formatos, OCR o cambios de límites del plan.
- Procesar los 68 PDF fuera del límite o los tres que superan 5 MB de ALMARA.
- Dar vigencia a precios, cuentas de pago, horarios o políticas antiguas por el solo hecho de figurar en un documento.
- Acciones sobre pedidos, clientes, inventario, pagos, envíos o mensajes a terceros.
- Crear colecciones, endpoints o memoria de conversación; rediseñar el botón o extender otros canales de Opttia.

## Riesgos y límites

- Fuentes irrelevantes: el banco de aceptación evalúa tanto fuente como respuesta, no solo que se haya usado una herramienta.
- Cobertura incompleta: un archivo pendiente, retirado o fuera del plan no se trata como evidencia consultada.
- Aislamiento: solo fuentes del comercio y permisos vigentes; cambio de empresa/rol no conserva evidencia anterior. Las instrucciones dentro de archivos no otorgan autorizaciones.
- Datos operativos: stock, precios y métricas actuales siguen obteniéndose de las consultas operativas autorizadas.
- Presupuesto: conserva cuotas, créditos y máximo de cuatro consultas operativas por mensaje. No introduce interruptores en `.env`.
- Write-set de la consulta: vacío. No toca `orders`, `inventory`, productos, precios, consecutivos ni sus integraciones.

## Gate constitucional y estado

Cumple aislamiento, protección de datos y consulta sin escrituras; no requiere excepciones constitucionales ni cambios de UI. Contratos y evaluación real deben preceder a cualquier publicación.

**D-511 — propuesta/spec, diseño y tareas aprobados por Daniel el 2026-10-20.** Tras «aprobado» y «aja», autorizó «implementa y prueba que Opttia responda automáticamente con la personalidad y los documentos de Almara». Candidato en implementación/validación; publicación separada. Se corrigió el identificador provisional D-510 porque ya pertenece a Proyectos de Support; el alcance aprobado es el mismo.
