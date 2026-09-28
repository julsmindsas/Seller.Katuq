## Context

- **El registro** crea la empresa, el usuario (con `onboardingProgress.draft.product.nombre`) y un producto de ejemplo (`PROD-002`, etiqueta "ejemplo"), que **no cuenta** como producto propio.
- **La tienda en 1 clic** (D-324) guarda `sites.origen = "registro"` y `companies.primeraTiendaPublicadaAt`. Los pedidos de la tienda se cuentan en `sites.pedidosCount`.
- **El filtro** (D-323) deja `accountVerification.status = "pending"` hasta que la persona confirma su correo, y `metricsExcluded` en las cuentas de prueba o sospechosas.
- **El correo actual** es nodemailer → Gmail SMTP (Google Workspace) como `notificaciones@katuq.com`.
  - Falla DMARC: el SPF no incluye a Google, no hay DKIM propio y los reportes van a `dmarcreports@lovable.dev`.
- **MailerSend** está integrado (D-318, `services/marketing/proveedorEnvio.js`) pero sin configurar: falta el dominio `novedades.katuq.com`, el token y el webhook.
- **El SES de la cuenta AWS no es una opción:** es de Red de Acopio y se aprobó solo para correo transaccional.

## Decisions

1. **Remitente: lo escoge Daniel.** Los dos pasan por un adaptador de canal único (`services/activacion/canal.js`), así que cambiar después no toca la secuencia.

   | | A. Correo actual (Workspace) | B. MailerSend |
   |---|---|---|
   | Qué falta | el DNS de katuq.com (abajo) | el DNS de katuq.com (abajo, lo necesitan igual los transaccionales), más el DNS de `novedades.katuq.com`, el token y el webhook |
   | Costo | $0 adicional. Límite de Workspace: unos 2.000 correos al día | el plan gratis alcanza para este volumen; confirmar la tarifa vigente al crear la cuenta |
   | Aperturas | no se pueden medir | sí, por webhook |
   | Reputación | la comparte con los códigos y las bienvenidas | separada de los transaccionales |

   - **Volumen esperado:** 5 a 15 registros al día, con máximo 3 correos cada uno. Menos de 1.500 al mes.
   - **Recomendación:** A para empezar. Sale ya, sin costo, y el arreglo del DNS se necesita de todos modos para que el código de verificación no caiga en Spam. Pasar a B cuando se configuren las campañas.

2. **DNS de katuq.com (paso de Daniel), para las dos opciones:**
   1. **SPF.** El TXT de `katuq.com` (hoy `v=spf1 include:spf.ipzmarketing.com include:dc-db9e4b7a04._spfm.katuq.com ~all`, verificado el 28-sep) pasa a:
      `v=spf1 include:_spf.google.com include:spf.ipzmarketing.com include:dc-db9e4b7a04._spfm.katuq.com ~all`
   2. **DKIM.**
      - En Google Admin: Apps → Google Workspace → Gmail → Autenticar correo → generar clave de 2048 bits con el selector `google`.
      - Publicar el TXT `google._domainkey.katuq.com` con el valor que da Google.
      - Tocar "Iniciar autenticación".
   3. **DMARC.** El TXT `_dmarc.katuq.com` (hoy `v=DMARC1; p=none; pct=100; rua=mailto:dmarcreports@lovable.dev`) pasa a:
      `v=DMARC1; p=none; pct=100; rua=mailto:dmarc@katuq.com`
      (crear ese buzón o alias). Pasar a `p=quarantine` tras dos semanas limpias.
   4. **Comprobar:** mandar un correo a Gmail y abrir "Mostrar original". Deben salir SPF, DKIM y DMARC en `PASS`, con `d=katuq.com`.
   5. **Solo con B:** los registros que MailerSend entrega al agregar `novedades.katuq.com` (SPF, DKIM `mlsend2._domainkey` y return-path), más `_dmarc.novedades.katuq.com`.

3. **Estado en la empresa, sin colecciones nuevas:**
   ```
   companies.activacion = {
     pasos: {
       producto|tienda|compartir: { sombraAt, enviandoAt, enviadoAt, abrioAt, clicAt, completoAt }
     },
     ultimoEnvioAt,
     baja: { at }
   }
   ```

4. **Motor:** un trabajo cada 15 min (`cronService`).
   - **Bandera** `SECUENCIA_ACTIVACION` = `apagada` | `sombra` | `envio`.
   - **Corte** `SECUENCIA_ACTIVACION_DESDE` = el momento de encenderla.
   - **Candidatas:** empresas con `date_added ≥ corte`, `canalInscripcion` "Encuesta" o "Campaña", sin `metricsExcluded`, verificadas y sin baja.
   - **Para cada una** se calcula en qué paso está (producto propio, tienda publicada, pedidos de la tienda) y cuál le toca.
   - **Envío en dos tiempos:** la marca `enviandoAt` se pone en una transacción antes de enviar, y `enviadoAt` después. Un envío que queda a medias pasa a "incierto" y no se reintenta; así nunca sale dos veces.
   - **Parada:** cuando el trabajo ve el paso cumplido, anota `completoAt` y no manda ese paso ni los anteriores.

5. **Plantillas:** `services/notifications/templates/activacion.js`, con el mismo diseño de los correos del registro.

   | Variable | Largo máximo | Qué es |
   |---|---|---|
   | `{negocio}` | 60 | nombre comercial |
   | `{producto}` | 60 | el producto que subió (si falta: "tu producto") |
   | `{urlAccion}` | — | el enlace del paso, con seguimiento |
   | `{urlVideo}` | — | opcional; sin video, el bloque no sale |
   | `{urlTienda}` | — | solo en el paso 3 |

   - **Textos:** asunto de 50 caracteres como máximo (así se lee entero en el celular), preencabezado de 90, cuerpo de 600 y botón de 25.

6. **Enlaces y baja:**
   - `GET /v1/activacion/ir?t=` anota `clicAt` y redirige a un destino de una lista cerrada.
   - `GET/POST /v1/activacion/baja?t=` da de baja con un clic.
   - Los tokens van firmados con HMAC.
   - Cada correo lleva las cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post`.

7. **Medición:** `GET /v1/activacion/metricas` (Super Admin). Por paso, y por semana de registro, muestra:
   - cuántos habrían recibido el correo en sombra;
   - enviados;
   - abiertos (solo con B);
   - clics;
   - cuántos completaron el paso en 7 días;
   - bajas.

   Todo sale de `companies.activacion`.

## Risks / Trade-offs

- **[Spam mientras el DNS no esté arreglado]** → no se pasa de sombra hasta que un correo de prueba dé `PASS` en SPF, DKIM y DMARC.
- **[Un paso equivocado, por ejemplo por el producto de ejemplo]** → dos días en sombra revisando a quién le llegaría qué.
- **[Molestar]** → un correo al día, tres en total, baja en un clic, y se detiene al dar el paso.
- **[Ley 1581]** → son mensajes sobre la cuenta que la persona creó, pero igual llevan remitente claro y baja. Revisar que la política publicada el 25-sep los cubra.

## Migration Plan

1. Daniel escoge el remitente y aplica el DNS.
2. Despliegue con la secuencia apagada. Luego sombra por dos días.
3. La sesión de videos entrega los textos finales y los tres videos.
4. Pasar a `envio`.
- **Reversa:** `SECUENCIA_ACTIVACION=apagada`, sin desplegar.
