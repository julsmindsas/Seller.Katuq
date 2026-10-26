import { HttpContextToken } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export const OPTTIA_MCP_TRANSPORT = new HttpContextToken<boolean>(() => false);

/** Solo este transporte puede conservar Accept JSON+SSE; no es una excepción de auth. */
export function isOpttiaMcpEndpoint(value: string): boolean {
  try {
    const expected = new URL(environment.urlApi.replace(/\/$/, '') + '/v1/opttia/mcp');
    const actual = new URL(value);
    return actual.origin === expected.origin && actual.pathname === expected.pathname && !actual.search && !actual.hash;
  } catch { return false; }
}
