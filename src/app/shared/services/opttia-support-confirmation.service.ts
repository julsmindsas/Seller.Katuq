import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { BaseService } from './base.service';
import { OPTTIA_MCP_TRANSPORT } from './interceptor/opttia-mcp.context';
import { OpttiaSupportProposal, OpttiaSupportResult, parseSupportResult } from './opttia-support.types';

interface RpcResponse {
  jsonrpc?: string;
  id?: string;
  error?: unknown;
  result?: any;
}

export class OpttiaSupportError extends Error {
  constructor(public readonly state: 'revoked' | 'uncertain', message: string) { super(message); }
}

// Verificadas con el SDK de Katuq en los contratos offline. El servidor negocia.
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

@Injectable({ providedIn: 'root' })
export class OpttiaSupportConfirmationService extends BaseService {
  constructor(http: HttpClient) { super(http); }

  async confirm(proposal: OpttiaSupportProposal): Promise<OpttiaSupportResult> {
    try {
      const initialized = await this.request('initialize', { protocolVersion: PROTOCOL_VERSIONS[0],
        capabilities: {}, clientInfo: { name: 'katuq-support-confirmation', version: '1.0.0' } });
      const version = initialized?.protocolVersion;
      if (!PROTOCOL_VERSIONS.includes(version)) throw new OpttiaSupportError('revoked', 'No se pudo negociar la confirmación. Revisa una nueva propuesta.');
      await this.request('notifications/initialized', undefined, version, true);
      const response = await this.request('tools/call', {
        name: 'create_support_ticket', arguments: { asunto: proposal.display.asunto,
          descripcion: proposal.display.descripcion, adjuntos: [...proposal.display.adjuntos] },
        _meta: { katuqSupportConfirmation: { token: proposal.confirmationToken } },
      }, version);
      let payload: any;
      try { payload = JSON.parse(response?.content?.find((part: any) => part.type === 'text')?.text || 'null'); }
      catch { throw new OpttiaSupportError('uncertain', 'No se pudo comprobar el resultado. Reintenta esta misma propuesta.'); }
      if (response?.isError === true) {
        const uncertain = ['SUPPORT_RESULT_UNCERTAIN', 'SUPPORT_RATE_LIMIT'].includes(payload?.code);
        throw new OpttiaSupportError(uncertain ? 'uncertain' : 'revoked',
          uncertain ? 'No se pudo comprobar el resultado. Espera un momento y reintenta esta misma propuesta.'
            : 'La confirmación ya no está autorizada. Revisa tu acceso y prepara una nueva propuesta.');
      }
      const result = parseSupportResult(payload);
      if (!result) throw new OpttiaSupportError('uncertain', 'No se pudo comprobar el resultado. Reintenta esta misma propuesta.');
      return result;
    } catch (error: any) {
      if (error instanceof OpttiaSupportError) throw error;
      throw new OpttiaSupportError([401, 403, 423].includes(error?.status) ? 'revoked' : 'uncertain',
        [401, 403, 423].includes(error?.status) ? 'Tu sesión o acceso cambió. Revisa tu acceso antes de crear el ticket.'
          : 'No se pudo comprobar el resultado. No envíes otro reporte: reintenta esta misma propuesta.');
    }
  }

  private async request(method: string, params?: unknown, version?: string, notification = false): Promise<any> {
    const id = crypto.randomUUID();
    const body = { jsonrpc: '2.0', ...(notification ? {} : { id }), method, ...(params === undefined ? {} : { params }) };
    let headers = new HttpHeaders({ Accept: 'application/json, text/event-stream' });
    if (version) headers = headers.set('MCP-Protocol-Version', version);
    const response = await firstValueFrom(this.postSinLoader<RpcResponse>('/v1/opttia/mcp', body, {
      context: new HttpContext().set(OPTTIA_MCP_TRANSPORT, true), headers,
    }).pipe(timeout(20000)));
    if (notification) return null;
    if (response?.jsonrpc !== '2.0' || response.id !== id || response.error !== undefined || !response.result) {
      throw new OpttiaSupportError('uncertain', 'Katuq no devolvió un resultado verificable. Reintenta la misma propuesta.');
    }
    return response.result;
  }
}
