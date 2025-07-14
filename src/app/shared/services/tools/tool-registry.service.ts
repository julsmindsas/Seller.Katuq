import { Injectable } from '@angular/core';

export interface ToolMetadata {
  name: string;
  description: string;
  parameters: any;
  type?: 'function';
}

export type ToolFunction<TArgs = any, TResult = any> = (args: TArgs) => TResult | Promise<TResult>;

@Injectable({ providedIn: 'root' })
export class ToolRegistryService {
  private readonly toolFunctions = new Map<string, ToolFunction>();
  private readonly toolsMetadata: ToolMetadata[] = [];

  registerTool(meta: ToolMetadata, fn: ToolFunction): void {
    if (this.toolFunctions.has(meta.name)) {
      // No lanzamos error, simplemente advertimos para permitir recarga en caliente si fuera necesario
      console.warn(`[ToolRegistry] La herramienta '${meta.name}' ya está registrada. Se omitirá el nuevo registro.`);
      return;
    }
    console.log(`[ToolRegistry] Registrando herramienta: '${meta.name}'`);
    meta.type = meta.type || 'function';
    this.toolFunctions.set(meta.name, fn);
    this.toolsMetadata.push(meta);
  }

  async executeTool(name: string, args: any): Promise<any> {
    const fn = this.toolFunctions.get(name);
    if (!fn) throw new Error(`Herramienta '${name}' no encontrada.`);
    return await fn(args);
  }

  getToolsMetadata(): ToolMetadata[] {
    return [...this.toolsMetadata];
  }
} 