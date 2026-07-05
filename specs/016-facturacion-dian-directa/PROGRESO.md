# PROGRESO — Facturación electrónica DIAN directa (spec 016, D-079)

> Documento de handoff para retomar el proyecto. Actualizado: **2026-07-05**.
> Ramas espejo (mismo nombre en ambos repos): `feature/facturacion-dian-directa`
> — Seller.Katuq (docs/spec/manuales) y katuq_admin_back_firebase (motor).

## TL;DR

El motor genera y **firma** facturas electrónicas válidas contra el Anexo Técnico
v1.9 (leído del PDF oficial de la DIAN, 753 págs). Faltan: el cliente SOAP (fase 4,
**bloqueada por trámite, no por código**) y la capa de entrega (fase 5). El
siguiente paso NO es programar: es arrancar el onboarding piloto de Katuq mismo
con `docs/manuales/facturacion-dian/manual-cliente.html`.

## Estado por fases

| Fase | Qué | Estado | Commit backend | Gate |
|---|---|---|---|---|
| 0 | Manuales de onboarding (cliente + runbook Katuq) | ✅ 2026-07-05 | — (Seller.Katuq `e56fa4f2`) | revisión visual |
| 1 | `dianXMLProvider` + numeración transaccional + CUFE | ✅ 2026-07-05 | `cd811a0` + fix `a49c5c8` | `verify-dian-cufe.js` 4/4 |
| 2 | `ublBuilder` — XML UBL 2.1 + DianExtensions | ✅ 2026-07-05 | `ae0d36e` | `verify-dian-ubl.js` 19/19 |
| 3 | `xadesSigner` — firma XAdES-EPES política DIAN | ✅ 2026-07-05 | `1cde08f` | `verify-dian-xades.js` 15/15 |
| 4 | `dianSoapClient` + set de pruebas habilitación | ⬜ **bloqueada por trámite** | — | set "Aceptado" en portal HAB |
| 5 | PDF/QR + AttachedDocument email + notas C/D + gancho `generarFacturaElectronica` | ⬜ | — | E2E factura real piloto |

## Cómo verificar que todo sigue en verde (backend, desde `functions/`)

```bash
node scripts/verify-dian-cufe.js    # CUFE vs ejemplo oficial anexo §11.2.1
node scripts/verify-dian-ubl.js     # XML UBL completo (--dump para verlo)
node scripts/verify-dian-xades.js   # firma: digests + RSA + política + checkSignature
```

## Arquitectura (dónde vive cada cosa)

- **Provider**: `services/accounting/providers/dianXMLProvider.js` (providerName `dian`,
  estrategia del AccountingManager igual que SIIGO/WO). Pipeline `createInvoice`:
  consecutivo transaccional → UBL → firma → envío (stub fase 4) → auditoría en
  colección `dian_documents`. Devuelve el consecutivo si falla antes de aceptación.
- **Módulos**: `services/accounting/dian/` — `numbering.js` (transacción Firestore),
  `cufe.js` (CUFE/CUDE + formatMoney truncado = ÚNICO punto de formateo CUFE↔XML),
  `ublInvoiceMapper.js` (Pedido→modelo, guardarrail DIAN_TOTALS_MISMATCH),
  `ublBuilder.js` (XML + DianExtensions), `xadesSigner.js` (firma + validateCertificate),
  `dianSoapClient.js` (STUB fase 4 con URLs reales), `errors.js`.
- **Config tenant**: `integration_configs/{companyId}_dian` (numbering, issuer,
  environment) + `integration_secrets` (p12, contraseña, softwareId/Pin, clave técnica).
  Estructura completa en `docs/manuales/facturacion-dian/manual-katuq.html` §4.
- **Deps agregadas** (fase 3): `xml-crypto@6`, `node-forge@1`. Nada más.

## Decisiones clave (contexto rápido)

- **Modelo legal**: software propio por empresa (Res. 000165/2023 art. 28) — Katuq NO
  es Proveedor Tecnológico; el responsable ante DIAN es el tenant. Marca blanca
  (candidato Factus) sigue en evaluación como alternativa. Ver D-079 en CONTRACT.md.
- **Piloto**: Katuq facturando LO PROPIO antes de ofrecer a clientes.
- Coherencia CUFE↔XML por strings compartidos; decimales **truncados** (no redondeados).
- Canon **C14N inclusivo**; canonicalización en contexto con motor de xml-crypto.
- Hash de la política de firma verificado descargando el PDF real de la DIAN.

## Para retomar (en orden)

1. **Trámite piloto Katuq** (bloqueante de fase 4, ~1-2 semanas de calendario,
   <2h de trabajo): RUT resp. 52 → comprar certificado .p12 (CA ONAC) → sesión
   en portal habilitación (Software ID + PIN + TestSetId) → resolución de
   numeración en MUISCA. Guía paso a paso: `docs/manuales/facturacion-dian/manual-cliente.html`.
2. **Fase 4** (con el .p12 y TestSetId en mano): implementar `dianSoapClient`
   (SOAP 1.2 + WS-Security, SendTestSetAsync/SendBillSync/GetStatus, endpoints ya
   documentados en el stub) + correr el set de pruebas hasta "Aceptado".
3. **Fase 5**: representación gráfica PDF (QR + CUFE), AttachedDocument por email,
   notas crédito/débito, y conectar el gancho `generarFacturaElectronica` en
   crear-ventas (mismo flujo que SIIGO/WO).

## Riesgos / pendientes abiertos

- La validación XSD completa del XML la da el set de pruebas DIAN (fase 4) — los
  gates locales son pre-filtros (estructura, XPaths, criptografía), no garantía DIAN.
- Renumeración pendiente al mergear: la spec 015 (tags Shopify, otra rama) debe usar
  **D-080** (D-078 quedó usado por reparación Almara) — nota dejada en D-079.
- Fuentes: anexo v1.9 y mapa de secciones/páginas en memoria persistente
  (`reference-dian-anexo-tecnico-19`); PDF re-descargable de dian.gov.co.
