# Spec 016 — Facturación electrónica DIAN directa (`dianXMLProvider`)

> **Status:** fase 1 approved (arranque ratificado por Daniel en chat 2026-07-05, "dale ponle dianXMLProvider") — fases 2+ requieren checkpoint humano por fase.
> **Decisión:** D-079 en CONTRACT.md. **Rama:** `feature/facturacion-dian-directa`.
> **Manuales de onboarding (fase 0, done):** `docs/manuales/facturacion-dian/`.

## Qué y por qué

Katuq emitirá factura electrónica colombiana integrándose **directo con la DIAN**
(sin proveedor tecnológico intermedio) mientras se evalúa marca blanca (candidato:
Factus). Modelo legal: cada empresa se habilita en modo **software propio**
("desarrollo tecnológico adquirido", Res. 000165/2023 art. 28) y firma con SU
certificado. Katuq no actúa como Proveedor Tecnológico (art. 616-4 E.T.).

El motor es una estrategia más del `AccountingManager` (patrón SIIGO/WO):
`services/accounting/providers/dianXMLProvider.js` (providerName `dian`), con la
lógica DIAN en submódulos `services/accounting/dian/*`:

| Módulo | Responsabilidad |
|---|---|
| `numbering.js` | Consecutivo del rango autorizado, en transacción Firestore |
| `cufe.js` | CUFE/CUDE (SHA-384, concatenación del anexo v1.9) + contenido QR |
| `ublBuilder.js` | XML UBL 2.1 (Invoice/CreditNote/DebitNote) + DianExtensions |
| `xadesSigner.js` | Firma XAdES-EPES con política DIAN (certificado .p12 del tenant) |
| `dianSoapClient.js` | WS DIAN: SendBillSync / SendTestSetAsync / GetStatus (hab/prod) |

Config del tenant: `integration_configs` + `integration_secrets`, provider `dian`
(canónica `integrations.dian`, Art. XV v2). Estructura documentada en
`manual-katuq.html` §4. Auditoría por documento en colección `dian_documents`
(trackId, CUFE, estado, XML) — nunca console.log.

## Criterios de aceptación (EARS)

**Fase 1 — esqueleto + determinísticos (esta fase):**
- **CA-01** — CUANDO el `AccountingManager` cargue estrategias, `dianXMLProvider`
  DEBERÁ registrarse como `dian` sin romper el arranque (require sin dependencias
  externas nuevas).
- **CA-02** — CUANDO se pida un consecutivo, `numbering.js` DEBERÁ tomarlo y
  avanzarlo en **transacción Firestore** sobre el config del tenant, rechazando si
  el rango está agotado o la resolución vencida (nunca repetir ni saltar).
- **CA-03** — CUANDO se calcule el CUFE, `cufe.js` DEBERÁ producir el SHA-384 de la
  concatenación exacta del anexo v1.9 (verificable contra los ejemplos del anexo).
- **CA-04** — CUANDO una empresa NO tenga config `dian`, el comportamiento de los
  demás proveedores DEBERÁ ser idéntico al actual (cero regresión multi-tenant).
- **CA-05** — `createInvoice` DEBERÁ orquestar el pipeline completo (consecutivo →
  UBL → firma → envío → estado → auditoría) y fallar con error explícito
  `DIAN_NOT_IMPLEMENTED:<módulo>` donde el módulo sea stub, sin efectos parciales
  (el consecutivo solo se consume si el envío a DIAN fue aceptado o quedó en cola).

**Fases siguientes (checkpoint humano antes de cada una):**
- **Fase 2** — `ublBuilder`: XML válido contra XSD UBL 2.1 + reglas del anexo para
  factura de venta con los datos reales de una orden Katuq (IVA por línea según
  `orderCalculationService`).
- **Fase 3** — `xadesSigner`: firma verificable (política DIAN) con .p12 de prueba.
- **Fase 4** — `dianSoapClient` + set de pruebas: set Aceptado en habilitación para
  el tenant piloto (Katuq mismo, escenario "facturar lo propio").
- **Fase 5** — representación gráfica (PDF QR + CUFE), AttachedDocument al
  adquiriente por email, notas crédito/débito, activación en `crear-ventas`
  (mismo gancho `generarFacturaElectronica` que SIIGO/WO).

## NFRs / guardarrailes

- Piloto = **Katuq facturando lo propio** (sin exposición de clientes) antes de
  ofrecerlo a tenants.
- Modelo de validación previa: NO se entrega factura al adquiriente sin
  aceptación DIAN.
- Secretos (certificado, PIN, clave técnica) SOLO en `integration_secrets`.
- Ambientes hab/prod separados por config; URLs solo en `dianSoapClient`.
- Sin dependencias nuevas en fase 1; las de fases 2-3 (xml builder, xades) se
  deciden en su checkpoint con su plan.md.

## Fuera de alcance

Documento equivalente POS electrónico (anexo aparte), nómina electrónica,
eventos RADIAN (van con fase 5+ si hay venta a crédito), habilitación de Katuq
como Proveedor Tecnológico.
