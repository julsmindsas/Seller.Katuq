# Tareas — Informe ejecutivo mensual

Cada tarea cierra con pruebas y build sin errores. `orders` es solo lectura.

- [x] 1. Resolver las 4 decisiones abiertas de `proposal.md` y registrar el D-XXX. (D-394)
- [x] 2. Cálculo del informe en el servidor, reutilizando las métricas de pedidos existentes: contar por fecha de entrega, sin cargar todos los pedidos a memoria. Prueba contra los datos de septiembre de ALMARA (1.333 / 52 / 1.281 / $164.684.994,89).
- [x] 3. Verificación de cuadre entre desgloses y totales (requisito 5).
- [x] 4. PDF de resumen de 1–2 páginas con el tema canónico. Revisión visual con el ejemplo real.
- [x] 5. Adjuntarlo al correo del comprobante de pago de la membresía (desviación registrada en D-394) y al aviso previo si se aprueba esa alternativa; el fallo del informe no bloquea la factura (requisito 9).
- [x] 6. Interruptor por empresa y apagado por omisión hasta la aprobación de Jairo.
- [ ] 8. Botón "Informe de ventas" en la ficha de la consola: hecho y commiteado (`05f30cc8`: `shared/utils/informe-ejecutivo.ts`, `CompaniesService`, `consola-plataforma`); compila sin errores. Falta publicar el front y probarlo en el navegador con un usuario Julsmind (descargar septiembre de ALMARA y cotejar 1.333 / 52 / 1.281 / $164.684.994,89).
- [ ] 7. Ensayo en seco (PDF de ALMARA y OH MY STORE generados con `scripts/informe-ejecutivo-ensayo.js`; falta que Daniel y Jairo los vean) con ALMARA y Café Escobar: se muestra el PDF a Daniel y a Jairo antes de que salga a ningún comercio.
