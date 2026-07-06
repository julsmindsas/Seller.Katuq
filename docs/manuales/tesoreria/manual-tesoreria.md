# Manual de Tesorería — Gestión de Pagos

> Para el equipo del comercio: vendedores, tesoreros y administradores.
> Versión: julio 2026 · Módulo disponible en el menú **Operaciones → Tesorería** (`/tesoreria`)

---

## 1. ¿Qué es Tesorería?

Tesorería es el módulo donde se **verifican los pagos** de los pedidos. Desde que está activo, ningún pago con comprobante cuenta como plata recibida hasta que el tesorero lo revise y lo apruebe. Esto protege al negocio de:

- **Comprobantes falsos** (el "falso Nequi": pantallazos idénticos a los reales).
- **Comprobantes reciclados** (un comprobante real usado en varios pedidos).
- Errores de digitación en valores.

**Regla de oro: la única prueba de un pago es el dinero en la cuenta del banco.** Ni el pantallazo, ni el sistema — el tesorero siempre verifica en el banco antes de aprobar.

---

## 2. Los estados de pago

| Estado | Qué significa | Quién lo pone |
|---|---|---|
| **Pendiente** | Así nace el pedido. No hay ningún pago registrado. | El sistema, al crear el pedido |
| **Pospendiente** | Se subió un pago con comprobante y está **en revisión de tesorería**. Todavía no cuenta como plata recibida. | El sistema, al asentar un pago |
| **PreAprobado** | Tesorería aprobó un **pago parcial** (falta plata), o se autorizó la entrega sin pago completo (contraentrega / cliente de confianza). | Tesorería, o cambio manual |
| **Aprobado** | El pago cubre el **total** del pedido y fue verificado en el banco. Si la empresa tiene facturación electrónica automática, aquí se dispara. | Solo Tesorería |
| **Rechazado** | Tesorería rechazó el pago (comprobante ilegible, valor no coincide, duplicado…). El motivo queda visible. | Solo Tesorería |
| **Precancelado / Cancelado** | El pedido se canceló. Desaparece de la operación. | Administración |

### Las dos reglas de aprobación

- Al aprobar un pago, si **no falta nada por pagar ($0)** → el pedido queda **APROBADO**.
- Si **falta $1 o más** → el pedido queda **PREAPROBADO** con el saldo visible.

---

## 3. Flujo del vendedor (comercial)

1. En **Pedidos** (`/ventas/pedidos`), abre el pedido y usa **Asentar pago**.
2. Llena: fecha, forma de pago, valor, **número de comprobante** y adjunta el archivo (foto o PDF).
3. Al guardar: el pago queda **en revisión** y el pedido pasa a **Pospendiente** automáticamente. Aparece el aviso *"El pago quedó en revisión de tesorería"*.
4. En el historial de pagos del pedido, cada pago muestra su estado: 🟡 Pendiente (en revisión) · 🟢 Aprobado · 🔴 Rechazado.

**Lo que el vendedor NO puede hacer con tesorería activa:**
- Aprobar pagos (ni el suyo ni el de nadie) — eso es del tesorero.
- Editar o borrar pagos del historial (quedan de solo lectura).
- Cambiar el estado de un pedido que tenga un pago en revisión.

**Lo que SÍ puede:** mover un pedido *sin pagos en revisión* entre **Pendiente / Pospendiente / PreAprobado** — por ejemplo, autorizar una entrega contraentrega poniéndolo en PreAprobado.

---

## 4. Flujo del tesorero

Entra a **Operaciones → Tesorería**. La pantalla muestra:

- **Indicadores**: recaudado hoy, cartera pendiente, por revisar, sin pago, alertas activas, rechazados (todos calculados por el servidor).
- **Pestañas**: Por revisar · Sin pago · Rechazados · Historial · Alertas.

### 4.1 Revisar un pago (pestaña "Por revisar")

1. Cada pedido en la cola tiene el botón **Revisar**.
2. El modal muestra: forma de pago, referencia, fecha, valor, quién lo subió y el **comprobante** (clic para verlo).
3. **Verifica el dinero en tu banco.** Para Nequi, usa el **QR Verificador** (escanea el QR del comprobante desde la app Nequi — confirma en ~30 segundos si el pago es real).
4. Si hay **banner rojo de alerta**: el comprobante (archivo o número de referencia) ya fue usado en otro pedido. La alerta **no aprueba ni rechaza** — te dice dónde mirar. Tú decides.
5. **Aprobar** → si cubre el total queda APROBADO; si es parcial queda PREAPROBADO con el saldo (el modal te lo anticipa).
6. **Rechazar** → el motivo es **obligatorio** y queda visible para el vendedor en el pedido.

### 4.2 Registrar un pago desde cero

Para transferencias que llegaron directo al banco (sin que el vendedor las registrara): botón **Registrar pago** en las pestañas "Sin pago" o "Rechazados". Ese pago **queda aprobado de inmediato** (tú ya lo verificaste) y el pedido pasa a Aprobado o PreAprobado según el saldo.

### 4.3 Cambiar el estado manualmente

Clic en el badge de estado del pedido → eliges el nuevo estado y un **motivo** (obligatorio). Las transiciones están controladas — por ejemplo, un pedido con pagos en revisión no se puede mover: primero se decide el pago.

### 4.4 Historial y Alertas

- **Historial**: todos los pagos con su método, referencia, valor, estado, quién lo subió y quién lo revisó.
- **Alertas**: lista de posibles duplicados detectados. "Resolver" las marca como atendidas.

---

## 5. Anti-fraude: cómo funciona

El sistema detecta automáticamente, al momento de subir un pago:

1. **Archivo idéntico**: el mismo comprobante (huella digital del archivo) ya registrado en otro pedido.
2. **Referencia repetida**: el mismo número de comprobante usado en otro pedido de la empresa.

Ambos generan una **alerta de severidad alta** visible en el modal de revisión y en la pestaña Alertas. **El sistema nunca bloquea ni aprueba solo** — el tesorero decide con la información en frente.

---

## 6. Activación y permisos

- El módulo se activa **por empresa** (lo habilita Katuq). Con el módulo apagado todo funciona como antes.
- El menú **Tesorería** se asigna por rol: en **Configuración → Roles**, arrastra el ítem "Tesorería" al rol, o crea el rol con la **plantilla "Tesorero"** (ya trae Tesorería + Pedidos + Dashboards).
- Pueden **aprobar/rechazar** pagos: el rol **Tesorero**, **Administrador** y **Super Administrador**. Los vendedores nunca — está validado en el servidor, no solo en pantalla.
- Después de asignar el menú, el usuario debe **cerrar sesión y volver a entrar**.

---

## 7. Preguntas frecuentes

**"Asenté el pago y el pedido sigue en Pendiente."**
Revisa el badge: ahora dice **"Pospendiente"** (antes una etiqueta vieja mostraba "Pendiente" para ambos estados y confundía). Si acabas de registrar el pago, refresca la lista.

**"No me sale la opción PreAprobado."**
Cierra sesión, entra de nuevo y refresca con Ctrl+Shift+R (versión vieja del navegador). Los vendedores ven Pendiente/Pospendiente/PreAprobado; Aprobado es solo de tesorería.

**"El indicador 'Por revisar' dice que hay más comprobantes de los que veo en la lista."**
El contador cuenta todos los pagos en revisión; la lista muestra los pedidos en estado Pospendiente. Si un pedido salió de ese estado por fuera del flujo, su pago sigue contando — avísale al administrador del sistema.

**"¿Puedo despachar o producir un pedido Pospendiente?"**
Sí. Los pedidos en revisión de pago **se ven y operan normal** en logística, producción y despachos. Solo los cancelados desaparecen de la operación.

**"¿Cuándo se factura electrónicamente?"**
Al quedar **Aprobado** (si la empresa tiene facturación automática configurada). Un pago en revisión nunca dispara factura.

**"Rechacé un pago por error."**
El vendedor puede registrar un nuevo pago, o tesorería puede cambiar el estado manualmente con motivo. Todo queda en la auditoría.
