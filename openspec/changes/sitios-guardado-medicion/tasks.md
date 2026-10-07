# Tareas — D-363

Alcance autorizado por Daniel: corregir los fallos revisados con cuidado. Esta tanda restaura contratos existentes; no altera módulos sensibles ni reglas comerciales.

- [x] [P] Reproducir pérdida de cambios durante guardar con métodos reales del editor y petición controlada.
- [x] [P] Corregir guardado concurrente, conservar nuevas credenciales y frenar publicación de una versión anterior; verificar guardado normal y errores.
- [x] [P] Reproducir conversión falsa de enlace fallido con script real del checkout.
- [x] [P] Corregir elección del evento y marca de conversión; verificar enlace, pendiente, contra entrega, manual y compatibilidad.
- [x] Ejecutar suites offline de publicación y espejo; compilar frontend sin incrementar versión.
- [x] Revisar diff completo, anotar resultados y pendientes en D-363, inicialmente sin commits ni despliegues; autorización posterior de commit y push: «sube a git».

## Evidencia local

- Editor: `node --test tests/sitios/editor-guardado-concurrente.test.js` → 14/14. Cuatro escenarios fallaban en la reproducción previa. Una revisión independiente detectó el indicador incorrecto de credenciales confirmadas durante edición concurrente; se reprodujo, corrigió y añadieron dos casos.
- Checkout (backend `functions/`): `node --test tests/sitios/checkoutMedicion.test.js` → 15/15. Seis escenarios fallaban antes de corregir.
- Publicación existente: 304 casos correctos y las mismas cuatro pendientes previas del generador. Estas pendientes no se resolvieron ni se consideran validaciones aprobadas.
- Espejo: cuatro comprobaciones de fuentes y estilos pasan; no equivale a una validación visual completa.
- `node --check` de backend/pruebas y `git diff --check` de los archivos propios limpios. La revisión global posterior detectó whitespace en `src/app/components/integrations/integrations.component.html`, modificado por trabajo paralelo; se preservó. Sin red de pagos, datos productivos ni arranque del backend conectado a Firestore.
- Compilación Angular final: `node --max_old_space_size=8192 node_modules/@angular/cli/bin/ng build --optimization=false --source-map=false --output-path=/tmp/katuq-builder-review-dist` → exit 0; avisos Sass/CommonJS existentes. CLI directa evita `prebuild` y no incrementa versión. Log `/tmp/katuq-builder-review-build-final.log`.
- Revisión independiente del editor completa: detectó y verificó corregido el indicador de credenciales. Se conservaron los cambios ajenos de Integraciones. No se verificó la interfaz en navegador ni una compra publicada.
- Diffs sensibles separados en `revision-pendiente/`. Tras explicación y aprobación explícita posterior, se aplicó únicamente el segundo descuento confirmado bajo D-364; véase `../sitios-reserva-duplicada/tasks.md`. Retiro, cantidades y selector de variantes siguen sin aplicar.
- Cierre de Git autorizado por Daniel: commit y push de las correcciones, pruebas y documentación a `feature/venta-asistida-mejorada` (frontend) y `backend-aws-security` (backend). Regresiones antes de versionar: editor 14/14, backend 23/23. Sin despliegue a producción.
