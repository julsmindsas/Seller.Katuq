# Plan Fase 3 — xadesSigner (spec 016)

> Aprobación: Daniel en chat 2026-07-05 ("dale" tras recomendación de librerías).
> Fuente normativa: Anexo v1.9 **Suplemento A §10** (leído del PDF oficial).

## Requisitos verificados contra el anexo

- **Formato**: XMLDSig *enveloped* + XAdES-EPES (ETSI TS 101 903 v1.3.2) — §10.5.2.
- **Canon**: C14N **inclusivo** `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` — §10.7.
- **Algoritmo**: RSA-SHA256; digests SHA-256 — §10.6 y ejemplo §10.9.
- **3 referencias** (§10.9): URI="" (documento, transform enveloped), `#…-keyinfo`,
  `#…-signedprops` (Type ETSI SignedProperties). IDs patrón `xmldsig-<uuid>[-keyinfo|-signedprops]`.
- **Política (§10.10)**: Identifier = `https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf`,
  SigPolicyHash sha256. **Hash verificado descargando el PDF real**:
  `dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=` (1.272.898 bytes).
  Description literal: "Política de firma para facturas electrónicas de la República de Colombia."
- **SignerRole** = `supplier` (obligado a facturar = nuestro modelo software propio) — §10.12.
- **SigningTime** xsd:dateTime hora legal colombiana — §10.11.
- Certificado y cadena completa embebidos en `ds:X509Data` — §10.5.2.

## Decisiones

1. **Dependencias**: `xml-crypto@6` (C14N inclusivo + verificación independiente) y
   `node-forge@1` (PKCS#12, ya era transitiva — se declara directa). Nada más.
2. **Firma orquestada por nosotros, no por la librería**: xml-crypto no arma XAdES
   (ds:Object/QualifyingProperties). Flujo: (a) digest del doc SIN firma (c14n
   inclusivo = transform enveloped), (b) insertar el esqueleto ds:Signature en la
   2ª UBLExtension, (c) c14n de KeyInfo y SignedProperties EN CONTEXTO usando
   `C14nCanonicalization` + `findAncestorNs` de xml-crypto (namespaces heredados
   del Invoice — EL punto donde fallan las firmas DIAN), (d) firmar el SignedInfo
   canonicalizado con RSA-SHA256 (node:crypto + llave PEM de forge).
3. **Verificación independiente en el gate**: además de recomputar los 3 digests
   "como la DIAN" (quitando la firma), el verificador valida la firma completa con
   `SignedXml.checkSignature` de xml-crypto — motor de validación distinto al que firma.
4. Cert de prueba: **autofirmado generado con forge** en el verificador (estructura
   completa). La DIAN exige CA acreditada ONAC → la validación real de cadena la da
   el set de pruebas (fase 4) con el certificado del piloto.

## Gate de salida de fase 3

`scripts/verify-dian-xades.js` en verde: firma inyectada en la 2ª UBLExtension,
3 digests recomputados OK (doc sin firma / KeyInfo / SignedProperties), firma
RSA-SHA256 verificada con la llave pública, política DIAN exacta (URL + hash +
description), SigningCertificate == sha256 del DER, SignerRole supplier,
`checkSignature` de xml-crypto en verde, y `validateCredentials` del provider
reportando vigencia real del certificado.
