## Why

La pauta de Katuq trae registros, pero no plata. Van cerca de $1,34 M en Meta. La mejor campaña trajo 34 registros a unos $6.500 cada uno; de ellos, 10 hicieron la configuración inicial, 1 abrió tienda y ninguno recibió pedidos. La de "vendedores activos" gastó $39.000 y no trajo registros (balance del 2-oct).

Hay tres causas:

- **A Meta solo le llega el inicio del registro.** Con eso aprende a traer micronegocios que empiezan (35 de 36 se registraron con cédula), no al cliente ideal.
- **El costo se escribe a mano.** No se sabe cuánto cuesta un cliente que paga ni cuál anuncio lo trajo.
- **Después del registro nadie empuja hacia el pago.** No hay aviso cuando se acaba el plan gratis y el CRM de empresas no avanza solo.

Daniel (16-oct): "quiero automatizar todo y convertir". Esta es la fase 1 del motor de marketing de Julsmind. Usa el mismo módulo de Marketing de Katuq: Julsmind es un comercio más y sus clientes son las empresas registradas, como ya pasa en el CRM.

## What Changes

1. **El gasto de Meta se lee solo.**
   - El servidor consulta, con permiso de solo lectura, el gasto, las impresiones y los clics de la cuenta publicitaria de Katuq, por campaña y por anuncio.
   - Esos datos se cruzan con los registros por el anuncio que trajo a cada empresa (`utm_content` = id del anuncio).
   - El costo escrito a mano queda solo para campañas sin datos de Meta.
2. **Meta se entera de los pasos que valen, desde el servidor.**
   - Se avisa por la API de conversiones de tres momentos: el registro aprobado, el primer pedido real y el primer pago.
   - Cada evento sale una sola vez por empresa y con un identificador estable, así Meta no cuenta doble con el píxel.
   - Esto termina el envío que la señal de vendedores activos dejó preparado y que hoy no manda nada.
3. **Embudo de la pauta hasta el pago**, en Marketing → Pauta, solo para el Super Admin de Julsmind.
   - Muestra, por campaña y por anuncio: gasto → registros → con producto → tienda → primer pedido → pagó.
   - Muestra el costo de cada paso, el costo por cliente que paga y el ingreso de esos clientes.
   - La pestaña Pauta de la consola deja un enlace a esta pantalla.
4. **Resumen diario por correo** al equipo de Julsmind: lo de ayer y lo de los últimos 7 días.
   - Incluye gasto, registros, costo por registro, primeros pedidos y pagos.
   - Incluye los anuncios que gastan sin traer registros, con la recomendación de pausarlos. Katuq no pausa nada solo.
5. **Aviso para pasar a premium** cuando una empresa gratis usa el 80 % de sus 15 pedidos del mes, y otro cuando llega al tope.
   - Se avisa por correo y dentro de Katuq, una vez por ciclo.
   - Cada aviso lleva un enlace directo al pago.
6. **CRM de empresas que avanza solo.**
   - La etapa pasa sola de registro a activo cuando hay primer pedido real, a premium cuando paga y a perdido cuando cancela.
   - Las etapas manuales (contactado, demo, prueba) se respetan y nunca se devuelven.
   - Cada empresa tiene un puntaje de 0 a 100 con el motivo a la vista, para saber a quién llamar primero.
7. **Arreglo suelto:** el formulario de contacto del backend rechaza todo mensaje que trae texto (`controllers/landingContacts.js:9`). Primero se confirma quién lo usa.

## Capabilities

### New Capabilities
- `ad-spend-reading`: lectura automática del gasto y los resultados de la pauta por campaña y anuncio, sin depender de un proveedor en la pantalla.
- `funnel-conversion-events`: eventos de registro, primer pedido real y pago enviados desde el servidor a Meta, una sola vez y sin duplicar el píxel.
- `paid-acquisition-funnel`: el embudo de la pauta hasta el pago, por campaña y anuncio, en Marketing y en el resumen diario.
- `free-plan-upgrade-nudge`: los avisos del 80 % y del tope del plan gratis, con enlace al pago.
- `company-crm-autopilot`: etapas automáticas y puntaje en el CRM de empresas de Julsmind.

### Modified Capabilities
- Ninguna en `openspec/specs/`. Completa lo que dejó preparado `seller-volume-signal` (cambio `registro-vendedores-activos`, sin archivar): el envío por la API de conversiones.

## Impact

- **Backend:**
  - Servicios nuevos en `services/pauta/`: lectura de Meta, eventos del embudo, resumen diario y avisos del plan.
  - `services/pauta/conversiones.js` deja de ser código muerto.
  - Crones nuevos con su bandera, apagados por omisión y con modo sombra.
  - Ampliación de `GET /v1/registro/metricas-campana`.
  - Reglas automáticas en `services/crm/`.
- **Front:**
  - `/marketing/pauta`, solo para el Super Admin de Julsmind.
  - Aviso del plan gratis en el panel del comercio.
  - Puntaje y motivo en el CRM de empresas.
  - Enlace en la consola.
- **Datos:** sin colecciones nuevas.
  - En `companies`: marcas de eventos enviados (`pauta.eventos`), los avisos del plan por ciclo (`avisosPlan`) y, si Daniel lo aprueba, `pauta.fbc`.
  - En `crm_pipeline`: `score`, `scoreMotivos` y `stageAuto`.
  - El gasto de Meta no se guarda: se consulta al abrir la pantalla y al armar el resumen.
- **Secretos:** token de solo lectura de anuncios y token de la API de conversiones del píxel de Katuq, en el `.env` de producción. Nunca van al log ni al navegador.
- **Lo que pone Daniel:**
  - Un usuario del sistema en el Business Manager con `ads_read` sobre la cuenta publicitaria, y el id de la cuenta (`act_…`).
  - Un token de la API de conversiones del píxel KATUQ, generado en el Administrador de eventos.
  - Los correos que reciben el resumen diario.
- **Decisión:** se registra en `specs/CONTRACT.md` como PROPUESTA.

## Decisiones que necesita Daniel

1. **Guardar el identificador de clic de Meta (`fbc`) al registrarse.** Hoy no se guarda, por decisión de la campaña de vendedores activos. Sin él, Meta cruza peor los eventos que pasan días después del clic (primer pedido, pago). Se guardaría solo el formato que pide Meta, nada más del navegador.
2. **Canal del aviso del plan gratis.** Se propone correo desde `notificaciones@katuq.com` más un aviso dentro de Katuq. Por WhatsApp solo si Daniel dice por cuál número.
3. **Qué es "primer pedido real".** Se propone: el primer pedido de venta asistida, POS o tienda con valor mayor a cero, sin contar los de ejemplo ni los de cuentas de prueba.
4. **Destinatarios del resumen diario.**

## No-goals

- Crear, pausar o cambiar anuncios desde Katuq. Eso pide permiso de escritura (`ads_management`) y aprobación aparte; es fase 2.
- Las automatizaciones para los comercios (bienvenida, "volvió", "te extrañamos", carrito, "avísame"): fase 2.
- WhatsApp a registrados, TikTok Ads, Google Ads y los formularios instantáneos de Meta.
- Cambiar el registro general, los precios, los planes o el cobro.
- Pedir permisos a Meta que requieran revisión de la app.

## Riesgos

- **Pedidos y cobro (módulos sensibles):** este cambio solo LEE `orders`, `companies` y las suscripciones. No toca la creación de pedidos, el contador del plan, la transacción de pago de Wompi ni los consecutivos. Un contract test lo verifica.
- **Ventana de atribución de Meta:** por omisión, Meta solo le atribuye a un anuncio lo que pasa hasta 7 días después del clic. El pago suele llegar después, así que el costo por cliente que paga se calcula con nuestro origen guardado (`origenCampana`), no con lo que reporte Meta.
- **Poco volumen:** con 9 empresas premium (al 5-oct), Meta no puede optimizar por pago. La campaña debe optimizar por "primer pedido real", y por pago solo cuando pase de unos 50 a la semana.
- **Anuncios viejos sin id en el enlace:** las campañas que usaron `{{ad.name}}` o no tienen `utm_content` quedan a nivel de campaña, no de anuncio.
- **Correos en spam:** katuq.com falla DMARC. Sin el arreglo del DNS, el aviso del plan y el resumen pueden no leerse.
- **Token vencido o revocado:** la pantalla muestra "sin datos de Meta" y el costo manual. El resumen lo dice. Nada se cae.
