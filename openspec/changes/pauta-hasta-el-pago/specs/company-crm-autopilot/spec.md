## ADDED Requirements

### Requirement: Las etapas avanzan solas con hechos
En el CRM de empresas de Julsmind, el sistema SHALL mover la etapa de una empresa según lo que hace:

| Hecho | Etapa |
|---|---|
| Primer pedido real | `activo` |
| Primer pago aprobado | `premium` |
| Suscripción pagada cancelada o vencida sin pago | `churned` |

El sistema SHALL registrar cada movimiento como actividad "cambio de etapa", hecha por "Automático", con el hecho que la causó.

#### Scenario: Empresa que pagó
- **WHEN** una empresa en `demo` paga su primer mes
- **THEN** su etapa pasa a `premium` y su historial dice "Automático: primer pago aprobado"

### Requirement: Nunca hacia atrás
El sistema SHALL NOT mover una empresa a una etapa anterior a la que tiene. Las etapas manuales (`contactado`, `demo`, `trial`) SHALL quedar intactas mientras no haya un hecho que lleve a una etapa posterior. La única excepción es `churned`, que viene de un hecho de cobro.

#### Scenario: Empresa en demo sin pedidos
- **WHEN** el comercial dejó una empresa en `demo` y la empresa todavía no tiene pedidos
- **THEN** su etapa sigue en `demo`

#### Scenario: Empresa premium que vende
- **WHEN** una empresa `premium` registra pedidos
- **THEN** su etapa sigue en `premium`

### Requirement: Puntaje para saber a quién llamar
Cada empresa SHALL tener un puntaje de 0 a 100, con los motivos que lo forman a la vista. Las señales son:
- pedidos por semana que dijo al registrarse;
- producto propio;
- tienda publicada;
- pedidos reales;
- uso del plan gratis;
- días sin entrar;
- llegada por pauta.

El listado del CRM SHALL poder ordenarse por puntaje.

#### Scenario: Empresa caliente
- **WHEN** una empresa dijo vender 10 a 50 pedidos por semana, tiene tienda y lleva 12 de 15 pedidos del mes
- **THEN** su puntaje es alto, aparece arriba al ordenar y los motivos dicen "vende 10-50 por semana · tienda publicada · 80 % del plan gratis"

### Requirement: Se actualiza solo y sin pisar a nadie
El puntaje y las etapas automáticas SHALL recalcularse al menos una vez al día. El sistema SHALL NOT cambiar el comercial asignado, la prioridad, las notas ni las tareas.

#### Scenario: Comercial asignado
- **WHEN** el sistema mueve una empresa a `activo`
- **THEN** el comercial asignado y la prioridad no cambian

### Requirement: Solo el CRM de Julsmind
Las reglas SHALL aplicar solo a las empresas como leads de Julsmind. El CRM de los comercios (sus clientes corporativos) SHALL funcionar igual que hoy.

#### Scenario: CRM de un comercio
- **WHEN** corre el recálculo
- **THEN** no cambia ningún lead de ningún comercio
