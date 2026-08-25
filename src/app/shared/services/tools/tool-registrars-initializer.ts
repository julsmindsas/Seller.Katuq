import { APP_INITIALIZER, Provider, inject } from '@angular/core';
import { TOOL_REGISTRARS, ToolRegistrar } from './tool-registrar';
import { TOOL_ADAPTER } from './tool-adapter';
import { WebMcpBridgeService } from './webmcp-bridge.service';

function initRegistrars(): () => void {
  const registrars = inject(TOOL_REGISTRARS, { optional: true }) ?? [];
  const adapter = inject(TOOL_ADAPTER);
  const webMcpBridge = inject(WebMcpBridgeService);
  return () => {
    registrars.forEach((r: ToolRegistrar) => {
      try {
        r.register(adapter);
      } catch (e) {
        console.error('Error registrando herramientas:', e);
      }
    });
    webMcpBridge.register();
  };
}

export const TOOL_REGISTRARS_INITIALIZER: Provider = {
  provide: APP_INITIALIZER,
  useFactory: initRegistrars,
  multi: true
}; 