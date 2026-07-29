# Apps nativas de Katuq — operación + marketplace

> Análisis de complejidad y propuesta de alcance. Actualizado 2026-07-28.
> Reemplaza la versión anterior. Cambios de esta revisión:
> **(1)** sale picking y packing del alcance; **(2)** nativo por plataforma — dos proyectos
> separados, iOS y Android; **(3)** entra un marketplace de consumidor final;
> **(4)** el marketplace es una **apuesta comercial** declarada: no se valida demanda antes,
> se construye para abrir mercado; **(5)** son **dos apps confirmadas** —una para el comercio
> y otra para el consumidor, tipo Rappi—; **(6)** **Katuq cobra y después liquida** al
> comercio.
> Todo lo que se afirma del código está verificado contra el repositorio.

---

## 1. Respuesta corta

Con las decisiones tomadas, esto **deja de ser un proyecto de app y pasa a ser un programa
de producto**. La cuenta cambia de forma:

- **Dos apps confirmadas**: una para el comercio (gestionar) y otra para el consumidor
  final, tipo Rappi (comprar). Son públicos opuestos y van separadas.
- **Nativo por plataforma**: cada app son dos proyectos. Total: **cuatro bases de código**.
- **Katuq cobra y después liquida al comercio.** Esta es la decisión más consecuente de
  todo el programa: saca a Katuq del rol de software y lo mete en el de intermediario
  financiero, con implicaciones legales, tributarias y de producto que no son de código.

**Complejidad global: alta.** No por dificultad técnica puntual, sino por multiplicación —
y ahora también por el frente regulatorio que abre el recaudo.

Y una noticia buena que no esperaba encontrar: **el marketplace tiene mucho más camino
andado que la app operativa**. El ruteo de inventario por canal ya existe y su propio
comentario en el código dice, textual, *"ventas web, marketplaces"*. Alguien ya lo pensó.

---

## 2. Las decisiones de alcance y lo que cuesta cada una

> El modelo de dinero —Katuq cobra y liquida— tiene sección propia por su peso: §7.

### 2.1 Sale picking y packing

Anotado, con una consecuencia que hay que tener presente.

Picking y packing era la fase piloto propuesta precisamente porque construía barato dos
cosas que después se usan en todas partes: **el escáner de código de barras y la cola de
escritura sin señal**. Al sacarlo, esos dos cimientos no desaparecen — se mudan a la fase
de bodega, donde inventario los sigue necesitando, y ahí cuestan más porque ya no hay una
superficie pequeña donde equivocarse gratis.

**Piloto de reemplazo propuesto: "cobro en calle"** — cartera más tesorería. Son 2.756
líneas en web entre las dos, usan cámara (foto del comprobante, que ya se está forzando
desde el navegador), se ven en la caja de inmediato, y validan sesión, cámara, push y el
tema visual antes de comprometer el presupuesto grande.

### 2.2 Nativo por plataforma, dos proyectos

Es tu decisión y la tomaste sabiendo el costo — no la discuto. Sí te propongo lo único que
la hace sostenible:

**Que diverjan en la interfaz, que no diverjan en la plomería.**

- **Un contrato de API definido una sola vez** y clientes generados para Swift y para
  Kotlin. Si el contrato se escribe a mano dos veces, van a divergir, y los bugs que
  produce eso son los más caros de encontrar.
- **Un archivo de tokens de diseño compartido** (colores, tipografía, radios, semánticos) —
  el tema canónico de Katuq traducido a móvil una vez, consumido por ambas.
- **Una especificación de pantallas por producto**, no dos.

Con eso, la duplicación queda donde te da diferenciación —el sentir de cada plataforma— y
no donde solo te da mantenimiento. Regla de dedo para estimar: la segunda plataforma cuesta
entre 60% y 70% de la primera, porque el diseño, las decisiones y la integración ya están
resueltos; lo que se rehace es la capa de interfaz.

### 2.3 Entra el marketplace

Aquí está el cambio de fondo, y hay que nombrarlo con claridad.

**Es otro público.** La app de operación la usa el personal de tu comercio: ve pedidos,
producción, tesorería, inventario. El marketplace lo usa un consumidor que quiere comprar.
Meterlos en el mismo binario significa una sola ficha en la tienda de aplicaciones tratando
de hablarle a los dos, calificaciones mezcladas, y un consumidor que abre la app y ve
tableros de producción.

**Decidido: el marketplace es su propia app**, tipo Rappi, separada de la de gestión. Eso
confirma los cuatro proyectos.

**Es una apuesta comercial declarada.** No se valida demanda antes de construir: la app
tiene dos trabajos —que el comercio gestione y que se venda— y el marketplace es lo que
convierte a Katuq de "el software del comercio" en "un canal que además le vende". Eso
cambia la relación con quien hoy paga, y es la jugada que se decidió hacer.

Que sea apuesta no cambia si se hace. Cambia **cómo se estructura**: una apuesta hay que
poder probarla barato y temprano, y hay que decidir de antemano con qué señales se escala
o se mata. Eso es §6, y el modelo de dinero que lo sostiene es §7.

---

## 3. Qué entra en la app de operación

Corte tomado del menú real (`nav.service.ts`, 990 líneas), ya **sin picking y packing**.
Operativo es lo que se hace todos los días, de pie, con el teléfono en la mano.

| Módulo | Peso en web (líneas ts+html) | Por qué es nativo |
|---|---|---|
| Venta asistida y pedidos | 55.941 | Tomar el pedido donde está el cliente |
| Despachos y entregas | 32.605 | Evidencia de entrega: foto, firma, ubicación |
| POS y POS V2 | 15.726 | Mostrador y tablet; POS V2 ya está aislado |
| Inventario operativo | 11.992 | Conteo, ajuste, traslado, recepción |
| Producción | 8.106 | Tablero de piso, avanzar estado |
| Conversaciones WhatsApp | 4.377 | Responder desde el teléfono |
| CRM | 4.326 | Notas de visita y tareas |
| Cotizaciones | 3.190 | Cotizar en sitio y enviar |
| Tesorería | 1.878 | Pago con foto del comprobante |
| Cartera | 878 | Saldo del cliente durante la visita |

**Fuera:** productos (9.414), integraciones (15.555), flows (6.209), empresas y usuarios
(6.601), listas de precios (3.319), maestros, superadmin, reportes, marketing. Todo eso se
configura sentado y la web ya lo resuelve.

---

## 4. El marketplace: qué hay y qué falta

Esto fue la sorpresa de la investigación. Cuatro de las siete piezas ya existen.

### Ya construido

1. **Ruteo de inventario por canal.** `inventoryService.updateByChannel()` descuenta
   existencias resolviendo canal → bodegas asociadas. El comentario del propio código dice
   *"ventas web, marketplaces"*. Está pensado para esto.
2. **Colección `channels`** por empresa, con `name`, `tipo`, `activo` y bodegas asociadas.
   **El marketplace es un tipo de canal más** — no hace falta colección nueva, que además
   es regla del proyecto.
3. **Visibilidad del producto ya modelada.** El objeto `Exposicion` tiene `activar`,
   `disponible`, `soloPos`, `destacado`, `oferta`, `nuevo`, `etiquetas` y `posicion`. Ya
   existe el concepto de "dónde se muestra este producto"; falta una bandera más.
4. **Proyección de catálogo ya existente.** `getSearchIndex` en el controlador de productos
   arma un índice liviano con exposición, disponibilidad, categorías y precio con impuesto.
   Es **exactamente la forma** que necesita un catálogo publicado — hoy es por empresa.
5. **Cobertura por ciudad.** `bodegaCoberturaService` resuelve qué bodega atiende dónde:
   es lo que decide qué comercio le aparece a cada consumidor.
6. **Pasarela por comercio.** Las credenciales de pago se resuelven por empresa con
   respaldo a las de plataforma, así que el cobro puede ir a la pasarela de cada comercio o
   a la de Katuq. Los dos caminos ya existen.

### Falta construir

1. **Catálogo entre empresas.** Es el cambio más profundo: hoy **toda consulta va filtrada
   por empresa**, y es una invariante del sistema. Un marketplace la invierte.
2. **Identidad de consumidor.** Hoy los clientes son registros, no cuentas: no existe forma
   de que un consumidor final inicie sesión.
3. **Liquidación y comisión** a los comercios.
4. **Las apps de consumidor** en sí.
5. Reseñas, moderación y soporte de la vitrina.

### La propuesta que protege la plataforma

**El marketplace nunca lee los datos operativos del comercio.** Lee una **proyección
publicada**, aparte, de solo lectura, a la que cada comercio decide entrar producto por
producto reusando `Exposicion`.

Eso resuelve tres cosas de una: la invariante de multi-empresa no se debilita en el camino
operativo, la búsqueda es rápida porque consulta un índice hecho para eso, y el comercio
mantiene el control de qué expone. El pedido entra por el canal marketplace y de ahí en
adelante recorre exactamente la tubería que ya existe.

---

## 5. Lo que sigue costando (no cambió)

| # | Obstáculo | Gravedad |
|---|---|---|
| 1 | La sesión dura 24 horas y no hay renovación — en nativo saca al usuario a media jornada | **Alta** |
| 2 | Los endpoints están hechos para pantalla grande — en 3G dentro de una bodega no cargan | **Alta** |
| 3 | La lógica de plata está espejada frontend/backend; una app nativa sería un tercer espejo, y con dos plataformas serían **cuatro** | **Alta** |
| 4 | Sin picking como piloto, el escáner y el offline se construyen más caro en la fase de bodega | Media |
| 5 | No hay diseño móvil, y conviven cuatro "primarios" distintos en la app | Media |
| 6 | Multi-país aterriza encima de todo lo que se construya | Media |

El punto 3 se agrava con tu decisión: con dos plataformas nativas, replicar el cálculo
sería mantenerlo en cuatro lugares. **Por eso la regla de que la app nunca calcula plata
pasa de recomendable a obligatoria.**

---

## 6. Cómo se prueba una apuesta sin pagarla entera

Si el marketplace es apuesta y no respuesta a una demanda medida, el peor plan posible es
el que solo se puede evaluar cuando ya está todo construido. Dos propuestas.

### 6.1 La vitrina sale primero en web, no en app

Esta es la propuesta más importante de todo el documento.

**Lo caro del marketplace no son las apps: es la espalda.** La proyección de catálogo entre
empresas, la identidad de consumidor, el checkout con ruteo de cobro y la liquidación a
comercios hay que construirlos igual, y son los mismos **sin importar si el consumidor
entra por web o por app**. Las apps nativas son la capa de presentación.

Entonces: **saca la vitrina en web primero**, contra esa misma espalda. Sirve para responder
las dos preguntas que deciden la apuesta —¿los comercios publican? ¿los consumidores
compran?— y para eso no hace falta una sola línea de Swift ni de Kotlin.

| | Probar la apuesta con web | Probar la apuesta con apps nativas |
|---|---|---|
| Tiempo hasta la primera señal real | **4 a 5 meses** | 14 a 20 meses |
| Se tira si falla | La vitrina web | Dos apps nativas completas |
| Se conserva si funciona | **Toda la espalda** | Toda la espalda |

Esto **no contradice** la decisión de nativo. La contradiría si dijera "el marketplace es
web para siempre". Dice otra cosa: el argumento de que lo nativo destaca es fuerte cuando
alguien ya usa el producto todos los días —que es el caso de la app de operación— y es
débil cuando todavía nadie sabe que la vitrina existe. Lo nativo del marketplace se
justifica **después** de la señal, no antes. Y para entonces se construye sabiendo qué
pantallas importan de verdad.

### 6.2 Definir de antemano cuándo se escala y cuándo se mata

Una apuesta sin criterio de salida no es apuesta, es un compromiso indefinido. Propuesta de
señales, a decidir con números tuyos antes de arrancar:

- **Del lado del comercio:** qué porcentaje de comercios invitados publica al menos un
  mínimo de productos en los primeros 60 días. Si los comercios no publican, no hay vitrina
  — y esa señal llega **antes** que la del consumidor, con lo cual es la primera alarma.
- **Del lado del consumidor:** pedidos por comercio publicado al mes, y recompra.
- **Del lado del negocio:** qué porcentaje de las ventas del comercio pasa por el canal
  marketplace. Es lo que dice si el canal aporta venta nueva o solo canibaliza la que ya
  existía.
- **Criterio de muerte explícito**, escrito antes de empezar y con fecha.

El riesgo real de esta apuesta no es técnico: es construir un centro comercial vacío. La
señal de comercios que publican es la que hay que vigilar desde el primer mes.

---

## 7. El modelo de dinero: Katuq cobra y liquida

Decisión tomada: **Katuq recauda del consumidor y después liquida al comercio.** Es la
decisión más consecuente de todo el programa, porque saca a Katuq del rol de software y lo
mete en el de intermediario financiero. No la discuto — la dimensiono, porque tiene tres
consecuencias que no son de código.

> Nada de esta sección reemplaza asesoría legal ni contable. Son los frentes que hay que
> poner sobre la mesa de un abogado y un contador antes de mover el primer peso.

### 7.1 La regla que evita convertirse en entidad vigilada

**El dinero nunca debe quedarse en una cuenta bancaria de Katuq.**

Si la plata de terceros pasa por cuentas propias, Katuq entra en terreno de recaudo de
dineros ajenos, con obligaciones de prevención de lavado —identificación de cliente,
monitoreo, reporte de operaciones sospechosas— que aplican a quien recibe, traslada y
entrega dinero. Ese camino existe pero es un negocio distinto al que estás construyendo.

**La forma práctica de evitarlo:** que el dinero se mueva siempre sobre los rieles de la
pasarela, que ya es entidad regulada. Katuq lleva **el libro** —quién le debe cuánto a
quién— pero no la **custodia**.

Y hay una noticia concreta: **Wompi, que ya es la pasarela del proyecto, tiene una API de
Pagos a Terceros** para dispersar pagos a cuentas bancarias en Colombia, individualmente o
por lotes, desde cuenta Wompi o desde cuentas bancarias vinculadas. Es exactamente el riel
de liquidación que hace falta, y ya está del lado del proveedor que se está usando.

### 7.2 Quién le factura al consumidor

En Colombia, un marketplace que recauda por cuenta del comercio se estructura como un
**contrato de mandato**, y eso tiene una forma de facturación definida: **la factura la
emite el mandatario** —Katuq—, pero debe **separar con claridad lo que corresponde al
mandante** —los productos del comercio— **de la comisión del mandatario**. El marco es el
Decreto 1625 de 2016 y la **Resolución DIAN 000165 de 2023**.

Dos cosas se desprenden de ahí, y las dos importan:

1. **Es la misma resolución sobre la que ya se construyó la facturación DIAN directa.** El
   trabajo de emisión propia no se bota: se extiende. Pero **facturación por mandato es un
   modo distinto** y hay que soportarlo explícitamente en la construcción del documento.
2. **Si se factura mal, se infla el ingreso de Katuq.** Si la venta del comercio entra como
   ingreso propio en vez de como recaudo por cuenta ajena, los estados financieros de Katuq
   quedan reflejando plata que no es suya, con el efecto tributario correspondiente. Es un
   error caro y silencioso.

### 7.3 Lo que hay que construir que antes no estaba

Cobrar y liquidar no es "checkout más un botón". Es un libro contable pequeño:

- **Saldo por comercio** — cuánto se le debe, acumulado por pedido cobrado.
- **Corrida de liquidación** — periodicidad, mínimo de dispersión, dispersión efectiva
  contra la API de pagos a terceros.
- **Comisión y retenciones** — cálculo, registro y su propia factura.
- **Devoluciones y contracargos** — si cobró Katuq, devuelve Katuq, y después lo descuenta
  del saldo del comercio. Es el caso que siempre se olvida y el que más duele.
- **Conciliación** entre pasarela, pedidos y liquidaciones. Sin esto no hay forma de
  responderle a un comercio que reclama.

**Hay patrón interno que copiar:** el servicio de saldo prepago de WhatsApp ya resuelve
exactamente esta forma —un documento de saldo por empresa, historial de movimientos,
transacciones atómicas para evitar carreras, y alertas por umbral—. El saldo del comercio
es el mismo patrón en sentido contrario: acumula en vez de debitar.

**Efecto en el plan:** la espalda mínima crece. No se puede salir en vivo con plata real sin
saldo y sin liquidación, porque los comercios tienen que cobrar desde el primer pedido.
**M-0 pasa de 8–12 a 12–16 semanas.**

### 7.4 Choque con el programa multi-país

Este es el punto que no se ve de entrada: **la app de operación viaja fácil entre países;
el marketplace que recauda, no.** Cobrar dinero en un país exige presencia legal y medios
de cobro locales, y en los dos mercados de la apuesta multi-país eso pesa distinto — en
Venezuela el cobro en divisas tiene su propio impuesto y su propio régimen cambiario.

Consecuencia práctica: cuando se abra otro país, es perfectamente posible entrar **primero
con la operación y sin marketplace**, o con marketplace donde el comercio cobra por su
cuenta. Conviene que el diseño permita las dos formas por país en vez de asumir que Katuq
siempre recauda.

---

## 8. Reglas propuestas

1. **Ninguna app calcula plata.** Arma el carrito, lo manda, el backend devuelve totales
   resueltos y formateados. Mata el problema de los espejos y hace que multi-país no toque
   las apps.
2. **Offline por niveles.** Solo en línea: venta asistida, cotizaciones, tesorería,
   marketplace. Lectura en caché: pedidos, cartera, producción, catálogo. Cola de
   escritura: solo movimientos de inventario, que ya son idempotentes por contrato.
3. **Capa de endpoints móviles, no una API nueva.** Lecturas que devuelven la tarjeta ya
   armada. Regla: ninguna pantalla de lista hace más de una llamada.
4. **El contrato de API se escribe una vez** y se generan los clientes de Swift y Kotlin.
5. **El marketplace lee una proyección publicada**, nunca los datos operativos del comercio.
6. **El marketplace es un canal**, no un modelo nuevo. Reusa `channels` y `Exposicion`.

---

## 9. Plan y estimación

### Vía A — Operación

| Fase | Alcance | Una plataforma | Las dos |
|---|---|---|---|
| Piloto | **Cobro en calle**: cartera + tesorería con foto | 4–6 sem | 7–10 sem |
| 1 | **El día del vendedor**: pedidos, venta asistida, cotizaciones | 10–14 sem | 17–24 sem |
| 2 | **El día de la bodega**: inventario y producción, con escáner y offline | 8–12 sem | 14–20 sem |
| 3 | **El día del despacho**: despachos, guías, entrega con evidencia | 6–8 sem | 10–14 sem |
| BE | Token de refresco, endpoints móviles, push por rol | 5–7 sem | — |

### Vía B — Marketplace, estructurada como apuesta

| Fase | Alcance | Esfuerzo |
|---|---|---|
| M-0 | **Espalda mínima**: proyección de catálogo entre empresas, identidad de consumidor, checkout, **saldo por comercio y corrida de liquidación** (§7.3) | 12–16 sem |
| M-1 | **Vitrina web**: catálogo, búsqueda, producto, carrito, pago, seguimiento. **Aquí se mide la apuesta** | 6–8 sem |
| — | **Punto de decisión: escalar o matar**, según las señales de §6.2 | — |
| M-2 | Espalda completa: comisión y retenciones, devoluciones y contracargos, conciliación, reseñas, moderación, panel del comercio | 8–12 sem |
| M-3 | Apps nativas de consumidor, las dos plataformas | 20–28 sem |

La diferencia con la versión anterior no es el total: es **dónde queda el punto de
decisión**. Antes caía después de 8-12 meses; ahora cae a los 4-5.

### Totales

- **Solo el piloto de operación (dos plataformas):** 7 a 10 semanas.
- **Operación completa, cuatro fases, dos plataformas, con backend:** 12 a 17 meses.
- **Hasta medir la apuesta del marketplace (espalda mínima + vitrina web):** 5 a 6 meses
  (creció un mes por el libro de saldos y la liquidación, que no se pueden diferir: los
  comercios tienen que cobrar desde el primer pedido).
- **Marketplace completo con apps nativas, si la apuesta pega:** 11 a 15 meses.
- **Todo el programa, en secuencia:** 24 a 33 meses. **En dos equipos paralelos:** 14 a 19.

> Supuestos: un desarrollador por plataforma a tiempo completo, medio de backend por vía,
> y contrato de API compartido. La segunda plataforma se estima al 65% de la primera. No
> incluye pruebas con usuarios en piso, publicación en tiendas, administración de
> dispositivos ni operación del marketplace. Son estimaciones de planeación, no
> compromisos.

### El orden que recomiendo

Las dos vías corren en paralelo, cada una con su propio punto de decisión temprano.

1. **Piloto de cobro en calle** (vía A) — barato, se ve en la caja, valida las cuatro bases
   de código y la forma de trabajar antes de comprometer nada grande.
2. **Backend de operación desde el día uno** — bloquea todo lo demás de la vía A.
3. **Definir el modelo de dinero con abogado y contador** (§7) — antes de escribir la
   espalda, porque condiciona cómo se factura y dónde vive la plata.
4. **Espalda mínima del marketplace** (vía B), en paralelo. Es la parte que se conserva
   pase lo que pase.
5. **Vitrina web + medición de la apuesta.** Punto de decisión a los 5-6 meses.
6. **Fase 1, el día del vendedor** (vía A) — es donde está el valor operativo.
7. **Apps nativas de consumidor** solo después de que la apuesta muestre señal.
8. Bodega y despacho al final.

---

## 10. Decisiones abiertas

> Resueltas: el marketplace es **app aparte**; **Katuq cobra y liquida**.

1. **¿Bajo qué figura legal recauda Katuq?** Es la pregunta que hay que llevarle a un
   abogado, no resolverla internamente. De ella cuelgan la estructura de facturación por
   mandato y si Katuq queda o no como sujeto de obligaciones de prevención de lavado.
2. **¿Katuq toca el dinero o solo lleva el libro?** La recomendación de §7.1 es que la
   custodia se quede en la pasarela y Katuq lleve el registro. Confirmarlo cambia el
   perfil regulatorio del proyecto entero.
3. **¿Comisión: porcentaje plano, por categoría, o por comercio?** Define el modelo de
   datos de la liquidación desde el primer día.
4. **¿Cuáles son los números de la apuesta?** Las señales de §6.2 hay que ponerles cifra y
   fecha antes de arrancar, no después.
5. **¿iOS y Android a la vez, o Android primero?** La operación de piso casi siempre es
   Android y suele ser equipo de la empresa; el consumidor final es mixto. Se puede escalonar
   distinto por producto.
6. **¿Quién administra los dispositivos** de la operación? No es código pero frena
   lanzamientos.

---

## 11. Riesgos

- **El riesgo mayor sigue siendo el alcance**, y con estas decisiones se multiplicó: dos
  productos por dos plataformas. La forma conocida de fracasar es empezar los cuatro a la
  vez.
- **El riesgo propio de la apuesta es el centro comercial vacío.** No es técnico: es que
  los comercios no publiquen. Esa señal llega antes que la del consumidor y es la primera
  que hay que vigilar. Si nadie publica, no hay vitrina que optimizar.
- **El frente regulatorio del recaudo es el que puede frenar el lanzamiento entero**, y no
  se resuelve programando. Si se descubre tarde, no se arregla con una versión nueva: se
  para la operación. Va con abogado desde el principio, en paralelo al código.
- **Facturar mal por mandato infla el ingreso de Katuq.** Si la venta del comercio entra
  como ingreso propio en vez de recaudo por cuenta ajena, los estados financieros reflejan
  plata que no es tuya, con su efecto tributario. Error caro y silencioso.
- **Devoluciones y contracargos son el caso olvidado.** Si cobró Katuq, devuelve Katuq y
  después lo descuenta del saldo del comercio. Si no está desde el diseño, aparece como
  incidente contable.
- **Canibalización.** Si el marketplace solo mueve al canal Katuq la venta que el comercio
  ya hacía por su cuenta, el canal no aporta venta nueva y sí agrega costo. Por eso está
  entre las señales de §6.2.
- **Cuatro bases de código divergen solas.** Sin contrato de API compartido y tokens de
  diseño compartidos, en un año son cuatro productos distintos con el mismo nombre.
- **El marketplace toca la invariante de multi-empresa.** Si se resuelve abriendo consultas
  entre empresas en el camino operativo en vez de con una proyección aparte, se debilita lo
  que hoy separa a un comercio de otro. No es negociable.
- **La lentitud conocida de la API se vuelve visible** en un teléfono con mala señal.
- **Multi-país aterriza encima.** Si alguna app calcula plata por su cuenta, hay que
  reescribirla — en cuatro lugares.
- **Módulos sensibles siguen sensibles.** Inventario y pedidos mantienen la regla del
  proyecto: un cambio a la vez, con aprobación explícita.
