import { Injectable } from '@angular/core';
import { ToolAdapter } from './tool-adapter';
import { ToolRegistryService, ToolMetadata, ToolFunction } from './tool-registry.service';

@Injectable()
export class DefaultToolAdapterService implements ToolAdapter {
  constructor(private registry: ToolRegistryService) {}

  registerTool(meta: ToolMetadata, fn: ToolFunction): void {
    this.registry.registerTool(meta, fn);
  }

  async executeTool(name: string, args: any): Promise<any> {
    try {
      const result = await this.registry.executeTool(name, args);
      if (result && typeof result === 'object' && 'success' in result) {
        return result;
      }
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Unknown error' };
    }
  }

  getToolsMetadata() {
    return this.registry.getToolsMetadata();
  }
} 