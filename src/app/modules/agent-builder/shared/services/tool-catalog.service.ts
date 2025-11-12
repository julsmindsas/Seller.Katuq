import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from '../../../../shared/services/base.service';
import { Tool, ToolCatalog, DepartmentOption, ToolCategory } from '../models/tool.model';
import { DepartmentType } from '../models/agent.model';

@Injectable({
  providedIn: 'root'
})
export class ToolCatalogService extends BaseService {

  constructor(public http: HttpClient) {
    super(http);
  }

  /**
   * Gets the complete tool catalog from backend
   * Transforms the backend response to the ToolCatalog format expected by the UI
   * @returns Observable with tool catalog
   */
  getToolCatalog(): Observable<ToolCatalog> {
    return this.get<{ success: boolean; data: Tool[] }>('/v1/agent-builder/catalog/tools').pipe(
      map(response => {
        if (!response.success || !response.data) {
          console.error('[ToolCatalogService] Invalid response from backend:', response);
          return this.getEmptyCatalog();
        }

        return this.transformToCatalog(response.data);
      })
    );
  }

  /**
   * Gets tools filtered by department
   * @param department Department to filter
   * @returns Observable with filtered tools
   */
  getToolsByDepartment(department: DepartmentType): Observable<{ success: boolean; tools: Tool[] }> {
    return this.get<{ success: boolean; tools: Tool[] }>(`/v1/agent-builder/catalog/tools/${department}`);
  }

  /**
   * Gets department options for UI dropdowns
   * @returns Array of department options
   */
  getDepartmentOptions(): DepartmentOption[] {
    return [
      {
        label: 'Ventas',
        value: 'sales',
        icon: 'pi-shopping-cart',
        color: '#f093fb'
      },
      {
        label: 'Logística',
        value: 'logistics',
        icon: 'pi-truck',
        color: '#4facfe'
      },
      {
        label: 'Inventario',
        value: 'inventory',
        icon: 'pi-box',
        color: '#43e97b'
      }
    ];
  }

  /**
   * Gets mock tool catalog for development/testing
   * @returns Observable with mock catalog
   */
  getMockToolCatalog(): Observable<ToolCatalog> {
    const mockCatalog: ToolCatalog = {
      sales: [
        {
          name: 'get_orders',
          description: 'Obtener listado de pedidos con filtros',
          department: 'sales',
          icon: 'pi-list',
          category: 'data-access'
        },
        {
          name: 'create_order',
          description: 'Crear nuevo pedido de venta',
          department: 'sales',
          icon: 'pi-plus-circle',
          category: 'automation'
        },
        {
          name: 'get_customers',
          description: 'Obtener información de clientes',
          department: 'sales',
          icon: 'pi-users',
          category: 'data-access'
        },
        {
          name: 'analyze_sales',
          description: 'Analizar estadísticas de ventas',
          department: 'sales',
          icon: 'pi-chart-line',
          category: 'analytics'
        },
        {
          name: 'send_quote',
          description: 'Enviar cotización a cliente',
          department: 'sales',
          icon: 'pi-send',
          category: 'communication'
        }
      ],
      logistics: [
        {
          name: 'get_shipments',
          description: 'Obtener despachos programados',
          department: 'logistics',
          icon: 'pi-map-marker',
          category: 'data-access'
        },
        {
          name: 'track_shipment',
          description: 'Rastrear estado de envío',
          department: 'logistics',
          icon: 'pi-compass',
          category: 'data-access'
        },
        {
          name: 'optimize_routes',
          description: 'Optimizar rutas de entrega',
          department: 'logistics',
          icon: 'pi-directions',
          category: 'automation'
        },
        {
          name: 'update_delivery_status',
          description: 'Actualizar estado de entrega',
          department: 'logistics',
          icon: 'pi-refresh',
          category: 'automation'
        },
        {
          name: 'notify_customer',
          description: 'Notificar cliente sobre envío',
          department: 'logistics',
          icon: 'pi-bell',
          category: 'communication'
        }
      ],
      inventory: [
        {
          name: 'get_products',
          description: 'Obtener catálogo de productos',
          department: 'inventory',
          icon: 'pi-database',
          category: 'data-access'
        },
        {
          name: 'check_stock',
          description: 'Verificar disponibilidad de stock',
          department: 'inventory',
          icon: 'pi-check-square',
          category: 'data-access'
        },
        {
          name: 'update_stock',
          description: 'Actualizar inventario de productos',
          department: 'inventory',
          icon: 'pi-pencil',
          category: 'automation'
        },
        {
          name: 'analyze_inventory',
          description: 'Analizar rotación de inventario',
          department: 'inventory',
          icon: 'pi-chart-bar',
          category: 'analytics'
        },
        {
          name: 'restock_alert',
          description: 'Alertar sobre productos a reabastecer',
          department: 'inventory',
          icon: 'pi-exclamation-triangle',
          category: 'automation'
        }
      ],
      general: [
        {
          name: 'send_email',
          description: 'Enviar correo electrónico',
          department: 'general',
          icon: 'pi-envelope',
          category: 'communication'
        },
        {
          name: 'generate_report',
          description: 'Generar reporte personalizado',
          department: 'general',
          icon: 'pi-file-pdf',
          category: 'utility'
        },
        {
          name: 'schedule_task',
          description: 'Programar tarea automatizada',
          department: 'general',
          icon: 'pi-calendar',
          category: 'automation'
        }
      ]
    };

    return of(mockCatalog);
  }

  /**
   * Gets icon for department
   * @param department Department type
   * @returns PrimeNG icon class
   */
  getDepartmentIcon(department: DepartmentType): string {
    const icons: Record<DepartmentType, string> = {
      sales: 'pi pi-shopping-cart',
      logistics: 'pi pi-truck',
      inventory: 'pi pi-box'
    };
    return icons[department] || 'pi pi-cog';
  }

  /**
   * Gets color for department
   * @param department Department type
   * @returns Color hex code
   */
  getDepartmentColor(department: DepartmentType): string {
    const colors: Record<DepartmentType, string> = {
      sales: '#f093fb',
      logistics: '#4facfe',
      inventory: '#43e97b'
    };
    return colors[department] || '#667eea';
  }

  /**
   * Transforms backend tool array to ToolCatalog grouped by department
   * @param tools Array of tools from backend
   * @returns ToolCatalog grouped by department
   */
  private transformToCatalog(tools: Tool[]): ToolCatalog {
    const catalog: ToolCatalog = {
      sales: [],
      logistics: [],
      inventory: [],
      general: []
    };

    tools.forEach(tool => {
      // Enrich tool with icon and category based on name and department
      const enrichedTool: Tool = {
        ...tool,
        icon: this.getToolIcon(tool.name, tool.department),
        category: this.getToolCategory(tool.name),
        isEnabled: true
      };

      // Group by department
      if (tool.department === 'sales') {
        catalog.sales.push(enrichedTool);
      } else if (tool.department === 'logistics') {
        catalog.logistics.push(enrichedTool);
      } else if (tool.department === 'inventory') {
        catalog.inventory.push(enrichedTool);
      } else {
        catalog.general.push(enrichedTool);
      }
    });

    console.log('[ToolCatalogService] Catalog transformed:', {
      sales: catalog.sales.length,
      logistics: catalog.logistics.length,
      inventory: catalog.inventory.length,
      general: catalog.general.length
    });

    return catalog;
  }

  /**
   * Gets appropriate icon for a tool based on its name and department
   * @param toolName Name of the tool
   * @param department Department of the tool
   * @returns PrimeNG icon class
   */
  private getToolIcon(toolName: string, department: string): string {
    // Map specific tool names to icons
    const iconMap: Record<string, string> = {
      // Sales tools
      'getTotalSales': 'pi-dollar',
      'getTopProducts': 'pi-chart-line',
      'getCustomerInfo': 'pi-user',
      'getOrdersByStatus': 'pi-list',
      'getSalesStats': 'pi-chart-bar',

      // Inventory tools
      'getProductStock': 'pi-box',
      'checkLowStock': 'pi-exclamation-triangle',
      'getProductCatalog': 'pi-database',

      // Logistics tools
      'getReadyOrders': 'pi-truck',
      'getShippingStatus': 'pi-map-marker'
    };

    // Return specific icon or fallback to department icon
    return iconMap[toolName] || this.getDepartmentIcon(department as DepartmentType);
  }

  /**
   * Determines tool category based on its name
   * @param toolName Name of the tool
   * @returns Tool category
   */
  private getToolCategory(toolName: string): ToolCategory {
    // Categories based on tool naming patterns
    if (toolName.includes('get') || toolName.includes('check')) {
      return 'data-access';
    }
    if (toolName.includes('Stats') || toolName.includes('analyze') || toolName.includes('Top')) {
      return 'analytics';
    }
    if (toolName.includes('update') || toolName.includes('create') || toolName.includes('optimize')) {
      return 'automation';
    }
    if (toolName.includes('send') || toolName.includes('notify')) {
      return 'communication';
    }

    return 'utility';
  }

  /**
   * Returns empty catalog structure
   * @returns Empty ToolCatalog
   */
  private getEmptyCatalog(): ToolCatalog {
    return {
      sales: [],
      logistics: [],
      inventory: [],
      general: []
    };
  }
}
