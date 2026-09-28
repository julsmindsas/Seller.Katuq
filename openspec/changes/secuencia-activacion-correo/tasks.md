## 0. Decisiones
- [x] 0.1 Daniel aprueba la propuesta y escoge el remitente (A, el correo actual, o B, MailerSend). Aprobada el 28-sep con A.
- [x] 0.2 Registrar D-325 en `specs/CONTRACT.md`.
- [ ] 0.3 Daniel aplica el DNS de katuq.com (y, con B, el de `novedades.katuq.com`). Comprobar `PASS` en SPF, DKIM y DMARC.

## 1. Contrato primero
- [x] 1.1 Pruebas de contrato:
  - cada paso con su condición;
  - el producto de ejemplo no cuenta;
  - la parada al dar el paso;
  - las exclusiones: corte, `metricsExcluded`, sin verificar y baja;
  - un correo al día;
  - nunca dos veces, con el trabajo concurrente;
  - la sombra no envía;
  - la baja en un clic;
  - el enlace con seguimiento solo redirige a destinos de la lista.

## 2. Backend
- [x] 2.1 `services/activacion/`: el cálculo del paso (puro), el motor, y el canal (`smtpKatuq` y `mailersend`).
- [x] 2.2 Plantillas en `services/notifications/templates/activacion.js` con las variables y los largos del diseño.
- [x] 2.3 Rutas públicas firmadas `/v1/activacion/ir` y `/v1/activacion/baja`.
- [x] 2.4 Trabajo en `cronService`, con `SECUENCIA_ACTIVACION` y `SECUENCIA_ACTIVACION_DESDE`.
- [x] 2.5 `GET /v1/activacion/metricas` (Super Admin).

## 3. Contenido (sesión de videos)
- [x] 3.1 Textos finales de los tres correos, dentro de los largos.
- [ ] 3.2 Tres videos de 30 a 45 s, con sus enlaces.

## 4. Despliegue (con OK de Daniel)
- [x] 4.1 Desplegar apagada, medir la rama contra producción, y luego sombra por dos días.
- [ ] 4.2 Revisar la sombra y pasar a `envio`.
- [ ] 4.3 La métrica en el panel del Super Admin.
