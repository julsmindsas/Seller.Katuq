/** Technical batch/status logs are not invoices or credit/debit notes. */
export function splitDianDocumentList(records: any): { documents: any[]; history: any[] } {
  const rows = Array.isArray(records) ? records.filter(row => row && typeof row === 'object') : [];
  const documentTypes = ['invoice', 'creditNote', 'debitNote'];
  return {
    documents: rows.filter(row => documentTypes.includes(row.type)),
    history: rows.filter(row => !documentTypes.includes(row.type)),
  };
}
