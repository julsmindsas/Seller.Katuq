# Guía rápida: cómo conectar tu tienda con Katuq

> Esta guía es para vos, comerciante. En menos de 10 minutos vas a tener tu tienda WooCommerce (o Shopify, o cualquier otra) **sincronizada automáticamente** con Katuq. Sin tecnicismos, paso a paso.

---

## 📌 Antes de empezar

Asegurate de tener a mano:
- La URL de tu tienda (ej. `https://mi-tienda.com`).
- Acceso al panel de administración de tu tienda.
- Tu usuario de Katuq con permisos de administrador.

Si te falta algo, escribinos a **soporte@katuq.com** antes de empezar.

---

## 1️⃣ Paso 1: Conectá tu tienda en Katuq

### Dónde

En el menú lateral de Katuq, hacé click en **"Integraciones"**.

![Menú lateral con Integraciones resaltada](assets/user-guide-flows/screen-01.png)

### Qué hacés

1. Hacé click en el cuadro de **WooCommerce**.
2. Te aparece una pantalla con un formulario. Lo llenamos juntos:
   - **URL de la tienda**: pegá la dirección de tu tienda (con `https://`).
   - **Consumer Key** y **Consumer Secret**: estas son dos claves que generás desde tu WooCommerce. Te explicamos cómo en el cuadro azul que aparece en pantalla — son 3 pasitos cortos.
   - **Bodega destino**: elegí en qué bodega de Katuq se va a registrar el stock que viene de WooCommerce. Si no tenés bodegas, creá una primero en **Inventario → Bodegas**.
3. Hacé click en **"Probar conexión"**. Si todo está bien, vas a ver un mensaje verde: *"Conexión exitosa con WooCommerce"*. Si te sale en rojo, revisá que copiaste bien las claves.
4. Hacé click en **"Guardar"**.

![Formulario de configuración WooCommerce completo](assets/user-guide-flows/screen-02.png)

### ⚠️ Configurá el webhook en tu tienda

En la misma pantalla vas a ver una caja que dice **"Configurar webhook entrante"** con una dirección web (URL). Esta dirección es importante: WooCommerce la usa para avisarle a Katuq cada vez que pasa algo en tu tienda (un pedido nuevo, un producto modificado).

1. Hacé click en el botón **"Copiar"** que está al lado de la URL.
2. Entrá a tu WooCommerce → **Ajustes** → **Avanzado** → **Webhooks** → **Añadir webhook**.
3. En "URL de entrega" pegá lo que copiaste.
4. Estado: **Activo**. Tema: **Pedido creado/actualizado** (y opcionalmente Producto).
5. Guardá.

![Webhook configurado en WooCommerce](assets/user-guide-flows/screen-03.png)

---

## 2️⃣ Paso 2: Activá una sincronización desde plantilla

Ya conectada tu tienda, ahora vas a decirle a Katuq **qué querés que sincronice**. Para eso usamos las **plantillas**: son sincronizaciones listas para usar, vos solo elegís cuál y la activás.

### Dónde

En el menú lateral, hacé click en **"Flujos automáticos"** (o el ícono de engranajes).

### Qué hacés

1. Hacé click en el botón **"+ Crear desde plantilla"** arriba a la derecha.
2. En el menú de chips, elegí **"WooCommerce"** (filtra solo las plantillas de tu tienda).
3. Vas a ver 2 o 3 plantillas:
   - **Sincronizar productos de WooCommerce a Katuq** — trae tu catálogo a Katuq cada cierto tiempo.
   - **Recibir pedidos de WooCommerce** — cada vez que alguien te compra en tu tienda, el pedido aparece en Katuq.
4. Elegí la que querés activar primero (sugerimos empezar con **Sincronizar productos**).
5. Te aparece un cuadro con 2 preguntas:
   - **Cada cuántos minutos sincronizar**: deslizá el slider. Si tu tienda es pequeña, 30 min está bien; si tenés muchos cambios, 5-15 min.
   - **Bodega destino del stock**: elegí la misma bodega que pusiste en el Paso 1.
6. Hacé click en **"Activar"**.

![Modal de configuración de plantilla](assets/user-guide-flows/screen-04.png)

Vas a ver un mensaje verde **"✅ Sincronización activada"**. ¡Listo! En el próximo intervalo (los minutos que pusiste) Katuq va a empezar a traer tus productos.

---

## 3️⃣ Paso 3: Cómo sé que está funcionando

### Ver el estado

En **Flujos automáticos** vas a ver tu sincronización en la lista. Cada una tiene un círculo de color:

- 🟢 **Verde**: corriendo bien, última ejecución sin errores.
- 🟡 **Amarillo**: corriendo con advertencias menores (algunos productos no se pudieron procesar, pero la mayoría sí).
- 🔴 **Rojo**: hay un problema serio. Hacé click en la sincronización para ver detalles.
- ⏸️ **Pausada**: vos la pausaste manualmente.

![Lista de sincronizaciones con estados](assets/user-guide-flows/screen-05.png)

### Ver los productos sincronizados

En el menú lateral → **Productos**. Vas a ver tu catálogo de WooCommerce reflejado. Cada producto tiene una etiqueta pequeña que dice **"WooCommerce"** si vino de ahí.

### Ver los pedidos recibidos

En **Pedidos**. Los que vinieron desde WooCommerce aparecen con una etiqueta **"WooCommerce"** y los podés filtrar por origen.

---

## 4️⃣ Paso 4: Pausar, modificar o eliminar una sincronización

### Pausar (sin perder configuración)

Si querés hacer cambios masivos en tu tienda WooCommerce y no querés que Katuq esté sincronizando mientras:

1. En **Flujos automáticos**, encontrá la sincronización.
2. Hacé click en el toggle **"Activa / Pausada"**.
3. La sincronización deja de correr inmediatamente. Cuando termines, volvé a activarla.

### Cambiar configuración (intervalo, bodega)

Por ahora, para cambiar la configuración te conviene **eliminar y volver a activar** la plantilla. (Funcionalidad de editar viene en una próxima actualización.)

### Eliminar

1. Click en los 3 puntitos al lado de la sincronización → **"Eliminar"**.
2. Confirmá. Esto borra la sincronización pero **no** los datos que ya se sincronizaron (productos, pedidos quedan en Katuq).

---

## 5️⃣ Preguntas frecuentes

### ❓ ¿Por qué no veo mis productos en Katuq?

Esperá a la próxima ejecución de la sincronización (los minutos que configuraste). Si después de 2× ese tiempo seguís sin ver productos:

1. Revisá que tu WooCommerce tenga productos en estado "Publicado" (los en borrador no se sincronizan).
2. Hacé click en la sincronización en **Flujos automáticos** y mirá si está en rojo. Si es rojo, contactá soporte con el ID que aparece.

### ❓ ¿Cómo cambio cada cuánto sincroniza?

Por ahora: eliminá la plantilla y volvé a activarla con el nuevo intervalo. (En próxima actualización podrás editar directamente.)

### ❓ ¿Cómo pauso temporalmente sin perder mi configuración?

Toggle "Activa / Pausada" en la lista de **Flujos automáticos**. Tu configuración se conserva.

### ❓ ¿Qué pasa si borro un producto en mi tienda WooCommerce?

Katuq lo **desactiva** (no lo borra). Esto significa que el producto sigue existiendo en Katuq por si hay órdenes históricas que lo referencian, pero deja de aparecer como disponible. Si después volvés a poner el mismo producto en WooCommerce, Katuq lo reactiva automáticamente.

### ❓ ¿Qué pasa si mi internet se cae justo cuando entra un pedido?

WooCommerce reintenta enviar el aviso a Katuq varias veces. Si después de unos minutos sigue sin poder, el pedido se procesa cuando vuelve la conexión — no se pierde.

### ❓ ¿Dónde veo si hubo errores?

En **Flujos automáticos**, hacé click en la sincronización en rojo o amarillo. Te muestra qué pasó la última vez (ej. "No se pudo conectar con WooCommerce a las 14:30").

### ❓ ¿Cómo agrego una nueva sincronización?

Botón **"+ Crear desde plantilla"** en **Flujos automáticos**, elegí otra plantilla y activala. Podés tener varias activas al mismo tiempo (por ejemplo, una para productos y otra para pedidos).

### ❓ ¿Cómo elimino una sincronización?

3 puntitos al lado → **Eliminar** → confirmar. Borra la sincronización pero no los datos ya traídos.

### ❓ ¿Algo se rompió y no puedo arreglarlo?

Escribinos a **soporte@katuq.com** con:
- El nombre exacto de la sincronización que falla.
- El ID que aparece en la pantalla de error (algo como `flow-id: woo-sync-products-to-katuq-a3f`).
- Una captura si podés.

No copies stacks de error largos — con el ID nosotros tenemos lo que necesitamos.

---

## 🆘 ¿Algo no encaja?

- **soporte@katuq.com** — respondemos en horario laboral.
- **WhatsApp soporte** (link en el footer de Katuq).
- **Documentación técnica avanzada**: si sos desarrollador o querés entender el motor interno, escribinos pidiendo acceso a la guía técnica.

---

*Última actualización: 2026-05-20. Para reportar errores en esta guía: soporte@katuq.com asunto "Doc: USER-GUIDE-FLOWS".*
