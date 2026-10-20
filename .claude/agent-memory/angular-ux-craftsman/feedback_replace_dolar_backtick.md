---
name: replace-dolar-backtick
description: Al editar .md/.ts con scripts node, String.replace con "$`" en el texto nuevo pega el prefijo del archivo; usar split/join
metadata:
  type: feedback
---

Al editar archivos con scripts node, nunca usar `s.replace(a, b)` si `b` puede contener `$` (por ejemplo `avisos$` seguido de backtick en markdown): `` $` `` inserta todo lo anterior a la coincidencia. Usar `s.split(a).join(b)`.

**Why:** el 2026-10-14 un agente marcó tareas en `openspec/changes/opttia-propone-en-la-escena/tasks.md` y el archivo pasó de ~350 a 940 líneas con dos copias viejas del prefijo; quedó así en el commit 49d48732 y hubo que repararlo.

**How to apply:** en cualquier edición por script de tasks/specs/código con `$` (observables `x$`, plantillas), split/join. Los archivos de la escena usan CRLF: normalizar a LF antes de buscar y restaurar al escribir.
