/**
 * A2UI Renderer Component
 *
 * Main dispatcher component that renders A2UI surfaces.
 * Maps A2UI component types to Angular components.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';

import {
  A2UISurfaceUpdate,
  A2UIComponent,
  A2UIDataModelUpdate,
  BoundValue,
  KatuqWidgetType,
  resolveBoundValue,
  getWidgetType
} from '../models/agui-v2.model';

@Component({
  selector: 'app-a2ui-renderer',
  template: `
    <div class="a2ui-surface" [attr.data-surface-id]="surface?.surfaceId">
      <ng-container *ngFor="let component of rootComponents">
        <ng-container [ngSwitch]="getComponentType(component)">

          <!-- Standard A2UI Components -->
          <div *ngSwitchCase="'Text'" class="a2ui-text">
            {{ resolveValue(component.component['Text']?.text) }}
          </div>

          <button *ngSwitchCase="'Button'"
                  class="a2ui-button"
                  [class]="getButtonClass(component)"
                  (click)="onAction(component)">
            {{ resolveValue(component.component['Button']?.label) }}
          </button>

          <div *ngSwitchCase="'Row'" class="a2ui-row">
            <ng-container *ngFor="let childId of getChildren(component)">
              <app-a2ui-renderer
                [surface]="getChildSurface(childId)"
                [dataModel]="dataModel"
                (action)="action.emit($event)">
              </app-a2ui-renderer>
            </ng-container>
          </div>

          <div *ngSwitchCase="'Column'" class="a2ui-column">
            <ng-container *ngFor="let childId of getChildren(component)">
              <app-a2ui-renderer
                [surface]="getChildSurface(childId)"
                [dataModel]="dataModel"
                (action)="action.emit($event)">
              </app-a2ui-renderer>
            </ng-container>
          </div>

          <div *ngSwitchCase="'Card'" class="a2ui-card">
            <div class="a2ui-card-header" *ngIf="component.component['Card']?.title">
              {{ resolveValue(component.component['Card']?.title) }}
            </div>
            <div class="a2ui-card-body">
              <ng-container *ngFor="let childId of getChildren(component)">
                <app-a2ui-renderer
                  [surface]="getChildSurface(childId)"
                  [dataModel]="dataModel"
                  (action)="action.emit($event)">
                </app-a2ui-renderer>
              </ng-container>
            </div>
          </div>

          <!-- Katuq Custom Widgets -->
          <app-katuq-metric *ngSwitchCase="'KatuqMetric'"
                            [props]="component.component['KatuqMetric']"
                            [dataModel]="dataModel">
          </app-katuq-metric>

          <app-katuq-chart *ngSwitchCase="'KatuqChart'"
                           [props]="component.component['KatuqChart']"
                           [dataModel]="dataModel">
          </app-katuq-chart>

          <app-katuq-dispatch-map *ngSwitchCase="'KatuqDispatchMap'"
                                   [props]="component.component['KatuqDispatchMap']"
                                   [dataModel]="dataModel"
                                   (dispatchAction)="action.emit($event)">
          </app-katuq-dispatch-map>

          <app-katuq-stock-alert *ngSwitchCase="'KatuqStockAlert'"
                                  [props]="component.component['KatuqStockAlert']"
                                  [dataModel]="dataModel"
                                  (alertAction)="action.emit($event)">
          </app-katuq-stock-alert>

          <app-katuq-table *ngSwitchCase="'KatuqTable'"
                           [props]="component.component['KatuqTable']"
                           [dataModel]="dataModel">
          </app-katuq-table>

          <app-katuq-confirmation *ngSwitchCase="'KatuqConfirmation'"
                                   [props]="component.component['KatuqConfirmation']"
                                   [dataModel]="dataModel"
                                   (confirmationResponse)="action.emit($event)">
          </app-katuq-confirmation>

          <app-katuq-voting-panel *ngSwitchCase="'KatuqVotingPanel'"
                                   [props]="component.component['KatuqVotingPanel']"
                                   [dataModel]="dataModel">
          </app-katuq-voting-panel>

          <!-- Fallback -->
          <div *ngSwitchDefault class="a2ui-unknown">
            Unknown widget: {{ getComponentType(component) }}
          </div>

        </ng-container>
      </ng-container>
    </div>
  `,
  styles: [`
    .a2ui-surface {
      width: 100%;
    }

    .a2ui-text {
      margin: 0.25rem 0;
    }

    .a2ui-button {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .a2ui-button.primary {
      background: #6366f1;
      color: white;
    }

    .a2ui-button.primary:hover {
      background: #4f46e5;
    }

    .a2ui-button.secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .a2ui-button.secondary:hover {
      background: #d1d5db;
    }

    .a2ui-button.danger {
      background: #ef4444;
      color: white;
    }

    .a2ui-button.danger:hover {
      background: #dc2626;
    }

    .a2ui-row {
      display: flex;
      flex-direction: row;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .a2ui-column {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .a2ui-card {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .a2ui-card-header {
      padding: 0.75rem 1rem;
      font-weight: 600;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .a2ui-card-body {
      padding: 1rem;
    }

    .a2ui-unknown {
      padding: 0.5rem;
      background: #fef3c7;
      border: 1px dashed #f59e0b;
      border-radius: 0.25rem;
      color: #92400e;
      font-size: 0.875rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class A2uiRendererComponent implements OnChanges {
  @Input() surface: A2UISurfaceUpdate | null = null;
  @Input() dataModel: Record<string, any> = {};

  @Output() action = new EventEmitter<{ name: string; componentId: string; context?: any }>();

  rootComponents: A2UIComponent[] = [];
  private componentMap: Map<string, A2UIComponent> = new Map();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['surface'] && this.surface) {
      this.buildComponentMap();
    }
  }

  private buildComponentMap(): void {
    this.componentMap.clear();
    this.rootComponents = [];

    if (!this.surface?.components) return;

    // Build component lookup map
    for (const component of this.surface.components) {
      this.componentMap.set(component.id, component);
    }

    // Find root components (not referenced as children)
    const referencedIds = new Set<string>();
    for (const component of this.surface.components) {
      const children = this.getChildren(component);
      children.forEach(id => referencedIds.add(id));
    }

    this.rootComponents = this.surface.components.filter(c => !referencedIds.has(c.id));

    // If no clear roots, use all components
    if (this.rootComponents.length === 0) {
      this.rootComponents = this.surface.components;
    }
  }

  getComponentType(component: A2UIComponent): KatuqWidgetType | null {
    return getWidgetType(component);
  }

  getChildren(component: A2UIComponent): string[] {
    const componentDef = component.component;
    const type = Object.keys(componentDef)[0];

    if (!type) return [];

    const props = componentDef[type];
    const children = props?.children;

    if (!children) return [];

    if (children.explicitList) {
      return children.explicitList;
    }

    return [];
  }

  getChildSurface(childId: string): A2UISurfaceUpdate | null {
    const childComponent = this.componentMap.get(childId);
    if (!childComponent) return null;

    return {
      surfaceId: this.surface?.surfaceId || 'child',
      components: [childComponent]
    };
  }

  resolveValue(bound: BoundValue | undefined): any {
    if (!bound) return '';
    return resolveBoundValue(bound, this.dataModel);
  }

  getButtonClass(component: A2UIComponent): string {
    const variant = this.resolveValue(component.component['Button']?.variant);
    return variant || 'primary';
  }

  onAction(component: A2UIComponent): void {
    const type = this.getComponentType(component);
    if (!type) return;

    const props = component.component[type];
    const actionDef = props?.action;

    if (actionDef) {
      this.action.emit({
        name: actionDef.name || actionDef.actionName,
        componentId: component.id,
        context: this.resolveActionContext(actionDef.context)
      });
    }
  }

  private resolveActionContext(context: any): any {
    if (!context) return {};

    const resolved: Record<string, any> = {};
    for (const key in context) {
      if (typeof context[key] === 'object' && 'path' in context[key]) {
        resolved[key] = resolveBoundValue(context[key], this.dataModel);
      } else {
        resolved[key] = context[key];
      }
    }
    return resolved;
  }
}
