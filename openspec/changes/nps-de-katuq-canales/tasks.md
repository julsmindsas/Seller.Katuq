Backend en `katuq_admin_back_firebase/functions`; front en `Seller.Katuq`. Cada grupo cierra con sus pruebas en verde.

## 0. Antes de tocar código

- [ ] 0.1 Reservar D-506 en `specs/CONTRACT.md` con el alcance de `proposal.md`
- [ ] 0.2 Crear `config/nps` en Firestore con los valores de hoy: `etapaComercios: "apagada"`, `correoComercios: false`, `compradores: true`, `responsableComercios` (el de hoy). Con `--dry-run` primero

## 1. Configuración desde Firestore (D-505)

- [ ] 1.1 `services/nps/config.js`: lector de `config/nps` con caché (60 s, 5 s si falla); sin documento, todo apagado
- [ ] 1.2 `elegibilidad.etapaComercios`, `entrega.promover` y el responsable de comercios leen de `config.js`, no del `.env`
- [ ] 1.3 Pruebas: sin documento, todo apagado; un cambio se ve después del caché
- [ ] 1.4 Después de desplegar: quitar `NPS_COMERCIOS`, `NPS_COMPRADORES` y `NPS_RESPONSABLE_COMERCIOS` del `.env` del servidor

## 2. Canal de presentación

- [ ] 2.1 `respuestas.pendiente` devuelve `presentacion` y marca `ventanaAt` en transacción
- [ ] 2.2 Pruebas: la ventana sale una sola vez por ciclo; dos llamadas simultáneas, una sola ventana

## 3. Front: ventana, Inicio y flotante cerrada

- [ ] 3.1 `nps-tarjeta`: modo ventana y modo flotante cerrada ("Califica a Katuq"); no se monta en `/welcome`
- [ ] 3.2 `nps-inicio` en la página de inicio, reutilizando `escala-nps` y `NpsFeedbackService`
- [ ] 3.3 Build de producción sin errores; revisión en el navegador a 1440 y 390 px; sin gradientes ni primarios prohibidos

## 4. Página pública para la pregunta de Katuq

- [ ] 4.1 `publica.resolver`/`ver` reconocen el ciclo de comercio y devuelven la marca de Katuq
- [ ] 4.2 `publica.responder`/`comentar` delegan en `respuestas.responder`/`comentar` con el usuario del ciclo
- [ ] 4.3 `encuesta-publica` muestra la marca de Katuq
- [ ] 4.4 Pruebas: detractor por enlace, un solo ticket; enlace vencido o ya respondido

## 5. Correo al administrador

- [ ] 5.1 Plantilla `correoNpsKatuq` en `templates/nps.js` (reutiliza las piezas del correo al comprador)
- [ ] 5.2 Cron `npsComerciosCorreo` (10:00 Colombia, `conLatido`): abre ciclos y envía a los 3 días, `correoAt` reclamado antes de enviar, tope de 200
- [ ] 5.3 Pruebas: un solo correo por ciclo; el Vendedor no recibe; con el interruptor apagado no sale nada; tope respetado

## 6. Publicar y encender

- [ ] 6.1 Publicar el backend y el front con todo apagado
- [ ] 6.2 Etapa "internos": probar la ventana, Inicio, la flotante y el enlace en FLORECER
- [ ] 6.3 Etapa "todos" en `config/nps`
- [ ] 6.4 Verificar SPF, DKIM y DMARC de katuq.com; luego encender `correoComercios`
- [ ] 6.5 Bitácora en `specs/CONTRACT.md`
