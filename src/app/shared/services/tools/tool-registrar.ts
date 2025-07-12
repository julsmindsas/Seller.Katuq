import { InjectionToken } from '@angular/core';
import { ToolAdapter } from './tool-adapter';

export interface ToolRegistrar {
  register(adapter: ToolAdapter): void;
}

export const TOOL_REGISTRARS = new InjectionToken<ToolRegistrar[]>('TOOL_REGISTRARS'); 