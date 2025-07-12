import { APP_INITIALIZER, Provider, inject } from '@angular/core';
import { TOOL_REGISTRARS, ToolRegistrar } from './tool-registrar';
import { TOOL_ADAPTER } from './tool-adapter';

function initRegistrars(): () => void {
  return () => {
    const registrars = inject(TOOL_REGISTRARS, { optional: true }) ?? [];
    const adapter = inject(TOOL_ADAPTER);
    registrars.forEach((r: ToolRegistrar) => {
      try {
        r.register(adapter);
      } catch (e) {
        console.error('Error registrando herramientas:', e);
      }
    });
  };
}

export const TOOL_REGISTRARS_INITIALIZER: Provider = {
  provide: APP_INITIALIZER,
  useFactory: initRegistrars,
  multi: true
}; 