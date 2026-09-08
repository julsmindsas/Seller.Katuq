const scalar = (value: any): string => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const normalize = (value: any): string => scalar(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function clientBillingProfiles(client: any): { index: number; name: string; document: string; email: string; alias: string }[] {
  const entries = Array.isArray(client?.datosFacturacionElectronica)
    ? client.datosFacturacionElectronica.map((data: any, index: number) => ({ data, index })) : [];
  if (client?.facturacion && !Array.isArray(client.facturacion)) entries.unshift({ data: client.facturacion, index: -1 });
  return entries.filter(({ data }: any) => data && typeof data === 'object' && !Array.isArray(data)).map(({ data: p, index }: any) => ({
    index, name: scalar(p.nombres || p.razon_social || p.razonSocial), alias: scalar(p.alias || p.alias_facturacion),
    document: scalar(p.documento || p.numero_documento_facturacion),
    email: scalar(p.correoElectronico || p.correo || p.correo_electronico_facturacion),
  }));
}

// Pure view filtering: no derived fields are added to records sent to the editor.
export function matchesClientSearch(client: any, term: string, field: 'all' | 'name' | 'document' | 'email' = 'all'): boolean {
  const query = normalize(term);
  if (!query) return true;
  const profiles = clientBillingProfiles(client);
  const fields = {
    name: [client.nombres_completos, client.apellidos_completos, client.razon_social, client.razonSocial, ...profiles.flatMap(p => [p.name, p.alias])],
    document: [client.documento, client.tipo_documento_comprador, ...profiles.map(p => p.document)],
    email: [client.correo_electronico_comprador, client.email, ...profiles.map(p => p.email)],
  };
  const values = field === 'all' ? [...fields.name, ...fields.document, ...fields.email, client.numero_celular_comprador, client.numero_celular_whatsapp] : fields[field];
  if (/^[\d.\s()+-]+$/.test(query) && (field === 'all' || field === 'document')) {
    const digits = query.replace(/\D/g, '');
    if (digits && values.some(v => scalar(v).replace(/\D/g, '').includes(digits))) return true;
  }
  const normalized = values.map(normalize);
  return query.split(' ').every(word => normalized.some(value => value.includes(word)));
}
