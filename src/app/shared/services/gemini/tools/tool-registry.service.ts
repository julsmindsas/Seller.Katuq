import { Injectable } from '@angular/core';
import { ToolDeclaration } from '../models/agent-config.interface';

/**
 * Interface para definir una herramienta ejecutable
 */
export interface ExecutableTool {
  declaration: ToolDeclaration;
  execute: (args: any) => Promise<any> | any;
  category: string; // 'inventory', 'sales', 'customer', etc.
}

/**
 * Servicio de registro central para herramientas de Gemini Live API
 * Permite registrar, categorizar y ejecutar tools desde cualquier módulo
 */
@Injectable({
  providedIn: 'root'
})
export class ToolRegistryService {
  private tools: Map<string, ExecutableTool> = new Map();
  private categoryState: Map<string, boolean> = new Map();

  constructor() {
    console.log('🔧 ToolRegistryService initialized');
  }

  /**
   * Registra una herramienta en el registro
   */
  registerTool(tool: ExecutableTool): void {
    if (this.tools.has(tool.declaration.name)) {
      console.warn(`⚠️ Tool "${tool.declaration.name}" already registered, overwriting`);
    }

    this.tools.set(tool.declaration.name, tool);

    // Inicializar categoría como habilitada por defecto
    if (!this.categoryState.has(tool.category)) {
      this.categoryState.set(tool.category, true);
    }

    console.log(`✅ Tool registered: ${tool.declaration.name} (${tool.category})`);
  }

  /**
   * Registra múltiples herramientas a la vez
   */
  registerTools(tools: ExecutableTool[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  /**
   * Ejecuta una herramienta por nombre
   */
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Tool "${name}" not found in registry`);
    }

    // Verificar si la categoría está habilitada
    const categoryEnabled = this.categoryState.get(tool.category);
    if (categoryEnabled === false) {
      throw new Error(`Tool category "${tool.category}" is disabled`);
    }

    console.log(`⚙️ Executing tool: ${name}`, args);

    try {
      const result = await tool.execute(args);
      console.log(`✅ Tool execution completed: ${name}`);
      return result;
    } catch (error) {
      console.error(`❌ Tool execution failed: ${name}`, error);
      throw error;
    }
  }

  /**
   * Obtiene las declarations de herramientas filtradas por categorías
   */
  getToolDeclarationsByCategories(categories: string[]): ToolDeclaration[] {
    const declarations: ToolDeclaration[] = [];

    this.tools.forEach((tool) => {
      // Solo incluir si la categoría está en la lista Y está habilitada
      if (categories.includes(tool.category) && this.isCategoryEnabled(tool.category)) {
        declarations.push(tool.declaration);
      }
    });

    console.log(`📋 Retrieved ${declarations.length} tool declarations for categories:`, categories);
    return declarations;
  }

  /**
   * Obtiene todas las tool declarations registradas (habilitadas)
   */
  getAllToolDeclarations(): ToolDeclaration[] {
    const declarations: ToolDeclaration[] = [];

    this.tools.forEach((tool) => {
      if (this.isCategoryEnabled(tool.category)) {
        declarations.push(tool.declaration);
      }
    });

    return declarations;
  }

  /**
   * Habilita o deshabilita una categoría completa de herramientas
   */
  toggleCategory(category: string, enabled: boolean): void {
    this.categoryState.set(category, enabled);
    console.log(`🔄 Category "${category}" ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Verifica si una categoría está habilitada
   */
  isCategoryEnabled(category: string): boolean {
    return this.categoryState.get(category) ?? true; // Default true
  }

  /**
   * Obtiene todas las categorías registradas
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.tools.forEach(tool => categories.add(tool.category));
    return Array.from(categories);
  }

  /**
   * Obtiene estadísticas del registro
   */
  getStats(): {
    totalTools: number;
    enabledTools: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};
    let enabledTools = 0;

    this.tools.forEach((tool) => {
      // Contar por categoría
      categories[tool.category] = (categories[tool.category] || 0) + 1;

      // Contar habilitadas
      if (this.isCategoryEnabled(tool.category)) {
        enabledTools++;
      }
    });

    return {
      totalTools: this.tools.size,
      enabledTools,
      categories
    };
  }

  /**
   * Limpia todas las herramientas registradas
   */
  clear(): void {
    this.tools.clear();
    this.categoryState.clear();
    console.log('🧹 Tool registry cleared');
  }

  /**
   * Verifica si una herramienta está registrada
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Obtiene información de una herramienta
   */
  getTool(name: string): ExecutableTool | undefined {
    return this.tools.get(name);
  }
}
