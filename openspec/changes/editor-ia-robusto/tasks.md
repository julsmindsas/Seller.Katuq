## 0. Decisiones
- [x] 0.1 Daniel aprobó el 9-oct ("has el plan… intuitiva y descriptiva, lo va a usar gente sin experiencia técnica"); se tomaron las decisiones recomendadas (aplicar directo con "Esto cambié" + Deshacer; orden A→B→C).
- [ ] 0.2 Registrar la decisión (D-XXX) en `specs/CONTRACT.md`.

## 1. Fase A — Referencias visuales
- [x] 1.1 Front: botón de adjuntar en el chat (3 imágenes o 1 PDF), miniaturas, quitar adjunto; reducir a ≤1.600 px JPEG.
- [x] 1.2 Front: PDF → imágenes con `pdfjs-dist` cargado en diferido (primeras 3 páginas).
- [x] 1.3 Back: aceptar `referencias` (data URL, tope de tamaño), una consulta de análisis por imagen → ficha de diseño validada (paleta hex, estilo y fuentes de la lista, orden de secciones del catálogo).
- [x] 1.4 Back: la consulta de edición recibe las fichas; regla "inspirarse, no copiar"; "Qué cambió" en la respuesta.
- [x] 1.5 Pruebas sin red (back 17, front 12) y prueba real: foto de referencia contra Opttia (6 s) y en pantalla en FLORECER (soltar imagen → "que se vea parecida" → página oscura y dorada, "Esto cambié" con muestras de color).

## 2. Fase B — Fotos del comercio
- [x] 2.1 Subir la foto al almacenamiento de la página y ponerla en portada, mosaico o galería.

## 3. Fase C — Robustez
- [ ] 3.1 Operaciones nuevas: HECHO forma de la portada (pantalla completa, alineación, velo) y diseño por sección (aire, ancho, fondo, color de texto); FALTA tema de otra plantilla y botones internos.
- [x] 3.2 Contraste garantizado; encabezado y pie nunca se ocultan; la portada solo si se pide; nada se oculta sin pedir quitar.
- [ ] 3.3 HECHO la conversación se recuerda en el navegador por página (30 mensajes, sin imágenes); FALTA guardarla en el servidor y el registro de cambios.
- [ ] 3.4 Cupo de consultas con imagen en el plan gratis.

## 4. Cierre
- [ ] 4.1 Release del front y despliegue del back; probar en FLORECER con capturas reales.
