import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService, TreeNode } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { IntegrationsService } from '../integrations.service';

import { TranslateService } from '@ngx-translate/core';
interface LocationMapping {
  katuqWarehouseId: string;
  katuqWarehouseName: string;
  shopifyLocationId: string;
  shopifyLocationName: string;
}

@Component({
  selector: 'app-field-mapping',
  templateUrl: './field-mapping.component.html',
  styleUrls: ['./field-mapping.component.scss'],
  providers: [MessageService]
})
export class FieldMappingComponent implements OnInit, OnDestroy {
  activeTabIndex = 0;

  // Variants tree
  variantTree: TreeNode[] = [];
  loadingVariants = true;

  // Location mappings
  locationMappings: LocationMapping[] = [];
  katuqWarehouses: any[] = [];
  shopifyLocations: any[] = [];
  loadingLocations = true;
  savingLocations = false;
  autoMapping = false;

  // Status mappings (read-only) - Must match backend orderMapper.js exactly
  statusMappings = [
    // Financial status → estadoPago
    { shopifyField: 'financial_status: pending', katuqField: 'estadoPago: Pendiente', description: 'Pago pendiente' },
    { shopifyField: 'financial_status: authorized', katuqField: 'estadoPago: PreAprobado', description: 'Pago autorizado' },
    { shopifyField: 'financial_status: partially_paid', katuqField: 'estadoPago: Pospendiente', description: 'Pago parcial' },
    { shopifyField: 'financial_status: paid', katuqField: 'estadoPago: Aprobado', description: 'Orden pagada completamente' },
    { shopifyField: 'financial_status: partially_refunded', katuqField: 'estadoPago: Precancelado', description: 'Reembolso parcial' },
    { shopifyField: 'financial_status: refunded', katuqField: 'estadoPago: Cancelado', description: 'Pago reembolsado totalmente' },
    { shopifyField: 'financial_status: voided', katuqField: 'estadoPago: Rechazado', description: 'Pago anulado' },
    // Fulfillment status → estadoProceso
    { shopifyField: 'fulfillment_status: null', katuqField: 'estadoProceso: SinProducir', description: 'Sin despachar' },
    { shopifyField: 'fulfillment_status: partial', katuqField: 'estadoProceso: ProducidoParcialmente', description: 'Despacho parcial' },
    { shopifyField: 'fulfillment_status: fulfilled', katuqField: 'estadoProceso: Despachado', description: 'Orden completamente despachada' },
    { shopifyField: 'fulfillment_status: restocked', katuqField: 'estadoProceso: Rechazado', description: 'Devuelto a inventario' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private integrationsService: IntegrationsService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadFieldMappings();
    this.loadLocationMappings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFieldMappings(): void {
    this.loadingVariants = true;
    this.integrationsService.getShopifyFieldMapping()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loadingVariants = false; })
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data?.variants) {
            this.variantTree = this.buildVariantTree(response.data.variants);
          } else {
            this.variantTree = this.getDefaultVariantTree();
          }
        },
        error: () => {
          this.variantTree = this.getDefaultVariantTree();
        }
      });
  }

  loadLocationMappings(): void {
    this.loadingLocations = true;
    this.integrationsService.getShopifyLocationMappings()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loadingLocations = false; })
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.locationMappings = response.data?.mappings || [];
            this.katuqWarehouses = (response.data?.katuqWarehouses || []).map((w: any) => ({
              label: w.name || w.nombre,
              value: w.id
            }));
            this.shopifyLocations = (response.data?.shopifyLocations || []).map((l: any) => ({
              label: l.name,
              value: String(l.id)
            }));
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('comun.error'),
            detail: this.translate.instant('integrations.fieldMapping.noSePudieronCargarLos')
          });
        }
      });
  }

  saveLocationMappings(): void {
    this.savingLocations = true;
    this.integrationsService.saveShopifyLocationMapping(this.locationMappings)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.savingLocations = false; })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('integrations.fieldMapping.guardado'),
            detail: this.translate.instant('integrations.fieldMapping.mapeosDeUbicacionesGuardadosCorrectamente')
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('comun.error'),
            detail: this.translate.instant('integrations.fieldMapping.noSePudieronGuardarLos')
          });
        }
      });
  }

  autoMapLocations(): void {
    this.autoMapping = true;
    this.integrationsService.autoMapShopifyLocations()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.autoMapping = false; })
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.locationMappings = response.data?.mappings || [];
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('integrations.fieldMapping.autoMapeoCompletado'),
              detail: this.translate.instant('integrations.fieldMapping.seMapearonUbicaciones', { cantidad: this.locationMappings.length })
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('comun.error'),
            detail: this.translate.instant('integrations.fieldMapping.noSePudoRealizarEl')
          });
        }
      });
  }

  addLocationMapping(): void {
    this.locationMappings.push({
      katuqWarehouseId: '',
      katuqWarehouseName: '',
      shopifyLocationId: '',
      shopifyLocationName: ''
    });
  }

  removeLocationMapping(index: number): void {
    this.locationMappings.splice(index, 1);
  }

  onWarehouseChange(mapping: LocationMapping, event: any): void {
    const warehouse = this.katuqWarehouses.find(w => w.value === event.value);
    if (warehouse) {
      mapping.katuqWarehouseName = warehouse.label;
    }
  }

  onLocationChange(mapping: LocationMapping, event: any): void {
    const location = this.shopifyLocations.find(l => l.value === event.value);
    if (location) {
      mapping.shopifyLocationName = location.label;
    }
  }

  private buildVariantTree(variants: any[]): TreeNode[] {
    return variants.map(v => ({
      label: v.name || v.title,
      data: v,
      icon: 'pi pi-tag',
      children: (v.options || []).map((opt: any) => ({
        label: `${opt.katuqField} -> ${opt.shopifyField}`,
        data: opt,
        icon: 'pi pi-arrow-right',
        leaf: true
      }))
    }));
  }

  private getDefaultVariantTree(): TreeNode[] {
    return [
      {
        label: 'Producto Katuq',
        icon: 'pi pi-box',
        expanded: true,
        children: [
          {
            label: 'Nombre -> title',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Descripcion -> body_html',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Referencia -> sku (variante)',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Precio -> price (variante)',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Peso -> weight (variante)',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Codigo de barras -> barcode (variante)',
            icon: 'pi pi-arrow-right',
            leaf: true
          }
        ]
      },
      {
        label: 'Variantes',
        icon: 'pi pi-list',
        expanded: true,
        children: [
          {
            label: 'Talla -> option1 (Size)',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Color -> option2 (Color)',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Material -> option3 (Material)',
            icon: 'pi pi-arrow-right',
            leaf: true
          }
        ]
      },
      {
        label: 'Inventario',
        icon: 'pi pi-database',
        expanded: true,
        children: [
          {
            label: 'Stock por bodega -> inventory_level por location',
            icon: 'pi pi-arrow-right',
            leaf: true
          },
          {
            label: 'Politica -> inventory_policy',
            icon: 'pi pi-arrow-right',
            leaf: true
          }
        ]
      }
    ];
  }
}
