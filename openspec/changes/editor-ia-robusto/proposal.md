## Why

El 9-oct salió el chat "Con IA" del editor de páginas (D-385): el comercio pide cambios con palabras y la página cambia (textos, colores, letra, estilo, orden, secciones nuevas). Daniel lo quiere **robusto** y pidió poder **mostrarle a la IA cómo quiere la página**: una foto, una captura de una página que le gusta, un boceto o un PDF de diseño.

Lo verificado (9-oct): Opttia en producción entiende imágenes (la ficha desde una foto respondió en 2,7 s), pero recibe **una imagen por consulta** (`/api/ai/json`, `image_base64`, hasta 12 MB). El servidor **no puede convertir PDF a imagen** (sin poppler, ghostscript ni canvas; `sharp` sí está para reducir imágenes). El front tampoco trae lector de PDF.

## What Changes

**Fase A — Referencias visuales (lo que pidió Daniel)**
- En el chat del editor, un botón de adjuntar: hasta **3 imágenes** (foto, captura, boceto, moodboard) o **1 PDF** (sus primeras 3 páginas) por mensaje.
- El navegador reduce cada imagen a ≤1.600 px en JPEG antes de enviarla, y convierte las páginas del PDF en imágenes con pdf.js (se carga solo al usar el PDF).
- El servidor analiza cada imagen con Opttia y saca una **ficha de diseño**: paleta (3-5 colores), estilo (de la lista del editor), letra de títulos y de texto (traducida a las fuentes permitidas), orden de secciones, si la portada es foto grande, mosaico o carrusel, y tono de los textos. Luego aplica la indicación del comercio con esas fichas, usando las mismas reglas que ya tiene el chat.
- **Inspirarse, no copiar:** nunca copia textos, logos ni nombres de otras marcas que aparezcan en la referencia. Las imágenes de referencia se descartan después del análisis (no se guardan).
- Al terminar, el chat muestra **"Qué cambió"** como lista (colores, letra, portada, orden…), además de "Deshacer".

**Fase B — Usar las fotos del comercio en la página**
- "Usa esta foto en la portada / en la galería": la foto se sube al almacenamiento de la página (el mismo de las fotos del editor) y se pone en la portada, el mosaico o la galería.

**Fase C — Robustez**
- Más cosas que puede cambiar: estilo de cada sección (aire, ancho, alineación, portada a pantalla completa, velo), probarse el tema completo de otra plantilla, columnas con texto, botones que lleven al catálogo o a WhatsApp.
- **Contraste garantizado:** si la IA propone colores que no se leen (texto sobre fondo), el servidor los corrige.
- Nunca deja la página sin portada ni pie.
- **La conversación queda guardada en la página** (últimos 50 mensajes, 30 días): al volver al editor, sigue donde iba.
- Registro de cada cambio de la IA (pedido, qué cambió, si se deshizo) para medir y mejorar.
- Cupo en el plan gratis para las consultas con imagen (decisión abajo).

Todo sigue detrás de la bandera `landingPrompt` y sigue sin guardar nada hasta que el comercio toca Guardar.

## Decisiones para Daniel
1. **Cupo del plan gratis** para consultas con imagen: recomendado 10 al mes; premium sin tope.
2. **Cambios grandes desde una imagen:** aplicar directo con "Qué cambió" + Deshacer (recomendado, igual que hoy), o mostrar primero una propuesta para aceptar.
3. **Orden:** A → B → C (recomendado), o A y C antes que B.

## Impact
- Front: `sitio-editor` (adjuntar, miniaturas, "Qué cambió"), `editar-con-ia.logic.ts`, `sitios.service.ts`; dependencia nueva `pdfjs-dist` (carga diferida).
- Back: `services/sites/editarPaginaConIA.js` (análisis por imagen, ficha de diseño, operaciones nuevas, contraste), ruta con tope de tamaño; en C, subcolección de la conversación por sitio.
- Opttia: sin cambios (una imagen por consulta, como hoy).
- Tiempo: Fase A ~1 día; B ~½ día; C ~1-1½ días. Riesgos: 3-6 s por imagen (con 3, unos 15 s), costo del modelo por imagen, PDFs pesados (se limita a 3 páginas y 20 MB), referencias con marcas ajenas (regla de no copiar).
