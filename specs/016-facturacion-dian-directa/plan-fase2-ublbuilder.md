# Plan Fase 2 — ublBuilder (spec 016)

> Aprobación de arranque: Daniel en chat 2026-07-05 ("dale arranca la fase 2").
> Fuente normativa: Anexo Técnico FE v1.9 (PDF oficial, extraído y consultado —
> ver memoria `reference-dian-anexo-tecnico-19`).

## Decisiones

1. **Sin dependencias nuevas.** XML por template helpers con escape propio;
   verificación de well-formedness con `xml-js` (ya en package.json). La firma
   (fase 3) trabaja sobre el string XML.
2. **Dos módulos**: `ublInvoiceMapper.js` (Pedido Katuq → modelo normalizado:
   líneas, impuestos por tarifa, totales, adquiriente) y `ublBuilder.js`
   (modelo → XML UBL 2.1 + DianExtensions + CUFE + QR + SoftwareSecurityCode).
3. **Coherencia CUFE↔XML**: la DIAN recalcula el CUFE desde los XPaths del XML
   (§11.2.2) — los montos del XML usan EXACTAMENTE el mismo formateo truncado
   de `cufe.js` (`formatMoney` exportado). Un solo punto de formateo.
4. **Totales (mapa Katuq → UBL)**, validando cuadre contra los totales guardados
   cuando `_calculadoEnBackend` (tolerancia $1 COP; si no cuadra →
   `DIAN_TOTALS_MISMATCH`, mejor fallar temprano que rechazo DIAN):
   - `LineExtensionAmount` = Σ líneas sin IVA (`totalPedidoSinDescuento`)
   - `TaxExclusiveAmount` = base gravable (Σ TaxableAmount)
   - `TaxInclusiveAmount` = LineExtension + Σ IVA (`totalImpuesto`)
   - `AllowanceTotalAmount` = `totalDescuento` (descuento global, pre-IVA
     conforme al cálculo Katuq) · `ChargeTotalAmount` = `totalEnvio` (no gravado)
   - `PayableAmount` = TaxInclusive − Allowance + Charge = `totalPedididoConDescuento`+envío
5. **IVA por línea**: `producto.precio.precioUnitarioIva` es STRING porcentaje
   ("0"/"5"/"19") — regla dura del modelo. TaxTotal del documento agrupado por
   tarifa. Anticipos NO afectan PayableAmount (anexo §11.9.2).
6. **Adquiriente**: `order.facturacion` → fallback `order.cliente` → fallback
   consumidor final `222222222222` (AdditionalAccountID 2, sin DV).
7. **SoftwareSecurityCode** = SHA-384(SoftwareID + PIN + NumFac) (§11.8).
   ProfileID literal EXACTO: `DIAN 2.1: Factura Electrónica de Venta` (rechazo).
   UUID con `schemeID`=ambiente y `schemeName`="CUFE-SHA384". Segunda
   UBLExtension vacía reservada para la firma (fase 3).

## Alcance v1 (y qué NO)

Factura de venta nacional, COP, operación estándar (CustomizationID 10),
contado/crédito básico (PaymentMeans). FUERA: exportación, AIU, anticipos
detallados, retenciones, multi-moneda, notas C/D (fase 5).

## Gate de salida de fase 2

- `scripts/verify-dian-ubl.js` en verde: XML well-formed (parse xml-js), los 12
  XPaths del §11.2.2 presentes con los valores del CUFE, totales cuadrados,
  SoftwareSecurityCode y CUFE recomputados OK, literal ProfileID exacto.
- La validación XSD/reglas completa la da el **set de pruebas DIAN (fase 4)** —
  gate real del XML. Este verificador es el pre-filtro local.
