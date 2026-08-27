import { Injectable } from '@angular/core';
import { ToolRegistryService, ToolMetadata } from './tool-registry.service';

/**
 * Puente experimental hacia WebMCP (W3C Web Model Context).
 * Expone las tools ya registradas en ToolRegistryService a los agentes
 * de IA del navegador (Chrome 146+ con flag u origin trial).
 *
 * Control por localStorage (kill switch manual, apagado por defecto):
 *   localStorage.setItem('katuq.webmcp', 'on')   → solo tools de lectura
 *   localStorage.setItem('katuq.webmcp', 'all')  → todas las tools (¡el agente actúa como el usuario logueado!)
 *   localStorage.removeItem('katuq.webmcp')      → apagado
 */
@Injectable({ providedIn: 'root' })
export class WebMcpBridgeService {
  private registered = false;

  // Tools sin efectos de escritura sobre el pedido/carrito: seguras por defecto.
  private readonly readOnlyTools = new Set<string>([
    'listWarehouses',
    'searchProducts',
    'getProductFilters',
    'getCartContents',
    'searchClient',
    'getCurrentOrder',
    'getDeliveryOptions',
    'getOrderSummary',
    'getQuickStatus',
    'getPaymentMethods',
    'validateProductStock',
    'calculateOrderTotals',
    'getProcessStatus',
    'getDeliveryCities',
    'validateOrderCompletion',
    'getAvailableSteps',
    'getCurrentStepInfo',
    'getWizardMap'
  ]);

  constructor(private registry: ToolRegistryService) {}

  private get mode(): 'off' | 'on' | 'all' {
    try {
      const v = localStorage.getItem('katuq.webmcp');
      return v === 'all' ? 'all' : v === 'on' ? 'on' : 'off';
    } catch {
      return 'off';
    }
  }

  /** El API vive en document.modelContext (spec nueva) o navigator.modelContext (Chrome 146-149). */
  private get modelContext(): any | null {
    const d = document as any;
    const n = navigator as any;
    return d?.modelContext ?? n?.modelContext ?? null;
  }

  register(): void {
    if (this.registered) return;
    const mode = this.mode;
    if (mode === 'off') return;

    const ctx = this.modelContext;
    if (!ctx) {
      console.warn('[WebMCP] API modelContext no disponible en este navegador (requiere Chrome 146+ con flag u origin trial).');
      return;
    }

    const tools = this.registry
      .getToolsMetadata()
      .filter((t) => mode === 'all' || this.readOnlyTools.has(t.name))
      .map((t) => this.toWebMcpTool(t, mode));

    try {
      if (typeof ctx.registerTool === 'function') {
        tools.forEach((t) => ctx.registerTool(t));
      } else if (typeof ctx.provideContext === 'function') {
        ctx.provideContext({ tools });
      } else {
        console.warn('[WebMCP] modelContext presente pero sin registerTool/provideContext; API desconocida.');
        return;
      }
      this.registered = true;
      console.warn(`[WebMCP] ${tools.length} herramientas expuestas al navegador (modo '${mode}').`);
    } catch (e) {
      console.error('[WebMCP] Error registrando herramientas:', e);
    }
  }

  private toWebMcpTool(meta: ToolMetadata, mode: 'on' | 'all'): any {
    const isWrite = !this.readOnlyTools.has(meta.name);
    return {
      name: meta.name,
      description: meta.description,
      inputSchema: meta.parameters ?? { type: 'object', properties: {} },
      execute: async (args: any) => {
        if (isWrite && mode === 'all' && !this.confirmWrite(meta.name)) {
          return this.asContent({ success: false, error: 'El usuario rechazó la operación.' });
        }
        try {
          const result = await this.registry.executeTool(meta.name, args ?? {});
          return this.asContent(result);
        } catch (e: any) {
          return this.asContent({ success: false, error: e?.message ?? 'Error desconocido' });
        }
      }
    };
  }

  /** Confirmación humana antes de que un agente ejecute una tool que muta el pedido. */
  private confirmWrite(toolName: string): boolean {
    return window.confirm(`Un agente de IA del navegador quiere ejecutar '${toolName}' en tu sesión. ¿Permitir?`);
  }

  /** WebMCP espera respuestas estilo MCP: { content: [{ type: 'text', text }] }. */
  private asContent(result: any): any {
    return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
  }
}
