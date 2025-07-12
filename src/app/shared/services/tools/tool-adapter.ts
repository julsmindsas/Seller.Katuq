import { InjectionToken } from '@angular/core';
import { ToolMetadata, ToolFunction } from './tool-registry.service';

export interface ToolAdapter {
  registerTool(meta: ToolMetadata, fn: ToolFunction): void;
  executeTool(name: string, args: any): Promise<any>;
  getToolsMetadata(): ToolMetadata[];
}

export const TOOL_ADAPTER = new InjectionToken<ToolAdapter>('TOOL_ADAPTER'); 