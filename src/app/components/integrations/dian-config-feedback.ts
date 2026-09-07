export const DIAN_SECRET_FIELDS = [
  'softwareId', 'softwarePin', 'testSetId', 'technicalKey',
  'certificateP12Base64', 'certificatePassword',
];

export function dianConfigError(error: any): string {
  if (error?.status === 0 || error?.name === 'TimeoutError') {
    return 'No pudimos comunicarnos con Katuq. Tus datos siguen en esta pantalla. No se ha confirmado el guardado; revisa tu conexión y vuelve a intentar.';
  }
  let message = error?.error?.message || error?.error?.error || error?.message;
  if (typeof message !== 'string') message = 'No pudimos guardar. Tus datos siguen en esta pantalla; vuelve a intentar.';
  const labels: { [field: string]: string } = {
    certificateP12Base64: 'archivo del certificado', certificatePassword: 'contraseña del certificado',
    softwareId: 'identificación del software', softwarePin: 'PIN del software',
    technicalKey: 'clave técnica del rango', testSetId: 'identificador del set de pruebas',
    'issuer.businessName': 'razón social', 'issuer.municipalityCode': 'municipio',
    'issuer.cityName': 'ciudad', 'issuer.department': 'departamento', 'issuer.address': 'dirección',
    'issuer.dv': 'dígito de verificación', 'issuer.nit': 'NIT',
    enableAutoInvoicing: 'facturación automática', timeoutMs: 'tiempo de conexión',
  };
  for (const [field, label] of Object.entries(labels)) message = message.split(field).join(label);
  return message;
}

export function dianNumberingError(numbering: any, production: boolean): string {
  if (!numbering) return 'Completa la numeración autorizada.';
  const { from, to, current, prefix, resolutionNumber, validFrom, validTo } = numbering;
  if (![from, to, current].every(n => Number.isSafeInteger(Number(n)) && Number(n) > 0)
      || Number(from) > Number(to) || Number(current) < Number(from) || Number(current) > Number(to)) {
    return 'Revisa el rango: el siguiente número debe estar entre Desde y Hasta, sin decimales.';
  }
  if (production && (prefix === 'SETP' || resolutionNumber === '18760000001')) {
    return 'El rango SETP es de pruebas. Para producción ingresa la resolución y el prefijo autorizados para este comercio.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom || '') || !/^\d{4}-\d{2}-\d{2}$/.test(validTo || '') || validFrom > validTo) {
    return 'Revisa las fechas de vigencia de la resolución.';
  }
  return '';
}
