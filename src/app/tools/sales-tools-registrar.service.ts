import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { TOOL_ADAPTER, ToolAdapter } from '../shared/services/tools/tool-adapter';
import { ToolMetadata } from '../shared/services/tools/tool-registry.service';
import { ToolRegistrar } from '../shared/services/tools/tool-registrar';

@Injectable({ providedIn: 'root' })
export class SalesToolsRegistrarService implements ToolRegistrar {
  constructor(
    @Inject(TOOL_ADAPTER) private readonly adapter: ToolAdapter,
    private router: Router
  ) {
    this._register(this.adapter);
  }

  register(adapter: ToolAdapter): void {
    this._register(adapter);
  }

  private _register(adapter: ToolAdapter): void {
    const tools: { meta: ToolMetadata; fn: (args: any) => Promise<any> | any }[] = [
      {
        meta: {
          name: 'navigateTo',
          description: 'Navega a una ruta específica de la aplicación',
          parameters: {
            type: 'object',
            properties: {
              route: { type: 'string', description: 'Ruta destino (ej: /ventas)' }
            },
            required: ['route']
          }
        },
        fn: async (args: { route: string }) => {
          await this.router.navigate([args.route]);
          return { success: true, route: args.route };
        }
      },
      {
        meta: {
          name: 'getPageInfo',
          description: 'Devuelve URL y título de la página actual',
          parameters: { type: 'object', properties: {} }
        },
        fn: () => ({
          success: true,
          url: window.location.href,
          title: document.title
        })
      }
    ];

    tools.forEach(t => adapter.registerTool(t.meta, t.fn));
  }
} 