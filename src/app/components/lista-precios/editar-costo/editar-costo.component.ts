import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProductCostsService } from 'src/app/shared/services/lista-precios/product-costs.service';
import { Producto } from 'src/app/shared/models/productos/Producto';

/**
 * Edición manual del costo de UN producto — botón "Editar" de la pestaña Costos
 * de Lista de Precios. Espeja el modal de Precio Unitario en estructura y tema.
 *
 * El costo se guarda por el mismo endpoint que usa el importador
 * (`/v1/fulfillment/cost-import/product/:id`), así que queda con el mismo
 * write-set y el mismo rastro en `productCostHistory`. El precio de venta se
 * muestra solo como referencia para calcular el margen: NO se edita acá, se
 * edita en la pestaña Precio unitario.
 */
@Component({
  selector: 'app-editar-costo',
  templateUrl: './editar-costo.component.html',
  styleUrls: ['./editar-costo.component.scss']
})
export class EditarCostoComponent implements OnInit {
  @Input() producto: Producto;

  costoForm: FormGroup;
  guardando = false;
  error: string | null = null;

  /** Fuente registrada hoy (importador, Prindel, etc.). Informativa. */
  fuenteActual = '-';

  constructor(
    private fb: FormBuilder,
    private costsService: ProductCostsService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    const p: any = this.producto || {};

    // Misma cascada que `obtenerCostoUnitario()` de la grilla, para que el modal
    // abra con el valor que el usuario está viendo en la fila.
    const costoActual =
      this.aNumero(p.costoUnitario) ||
      this.aNumero(p?.precio?.costoUnitario) ||
      this.aNumero(p?.costo?.costoUnitario) ||
      this.aNumero(p?.costo?.valor) || 0;

    this.fuenteActual = p.costoFuente || p?.costo?.fuente || '-';

    this.costoForm = this.fb.group({
      costoUnitario: [costoActual || '', [Validators.required, Validators.min(0)]],
      // <input type="date"> necesita exactamente yyyy-MM-dd
      fechaVigencia: [this.aFechaInput(p?.costo?.fechaVigencia || p?.fechaVigenciaCosto)]
    });
  }

  private aNumero(valor: any): number {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private aFechaInput(valor: any): string {
    if (!valor) return '';
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const d = new Date(texto);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  // ── Referencias para el margen ──

  /** Precio de venta: el mismo valor que pinta la columna PRECIO VENTA. */
  get precioVenta(): number {
    return this.producto?.precio?.precioUnitarioConIva ||
           this.producto?.precio?.precioUnitarioSinIva || 0;
  }

  get costoIngresado(): number {
    const n = Number(this.costoForm?.get('costoUnitario')?.value);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Sin precio de venta no hay margen que calcular. Es un caso REAL y frecuente:
   * de los 139 productos con costo en OH MY STORE, 80 no tienen precio de venta.
   * Mostrar "−$12.814" ahí haría creer que se vende con pérdida cuando lo que
   * pasa es que falta cargar el precio.
   */
  get hayPrecioVenta(): boolean {
    return this.precioVenta > 0;
  }

  /** Ganancia por unidad. Negativa = se está vendiendo por debajo del costo. */
  get margen(): number {
    return this.precioVenta - this.costoIngresado;
  }

  /** Margen sobre el precio de venta. Null cuando no hay precio con qué calcularlo. */
  get margenPorcentaje(): number | null {
    if (!this.hayPrecioVenta) return null;
    return (this.margen / this.precioVenta) * 100;
  }

  get margenEnRojo(): boolean {
    return this.hayPrecioVenta && this.margen < 0;
  }

  guardar(): void {
    if (this.costoForm.invalid || this.guardando) {
      this.costoForm.markAllAsTouched();
      return;
    }

    const productId = (this.producto as any)?.cd;
    if (!productId) {
      this.error = 'El producto no tiene identificador; recarga la lista e intenta de nuevo.';
      return;
    }

    this.guardando = true;
    this.error = null;

    const costo = Number(this.costoForm.get('costoUnitario').value) || 0;
    const vigencia = this.costoForm.get('fechaVigencia').value || null;

    this.costsService.updateProductCost(productId, {
      costoUnitario: costo,
      fechaVigencia: vigencia,
      fuente: 'manual'
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        const p: any = this.producto;
        // Se reconstruye el producto con la misma forma que escribió el backend
        // para que la grilla refresque la fila sin recargar la página.
        this.activeModal.close({
          success: true,
          producto: {
            ...p,
            costoUnitario: costo,
            costoFuente: 'manual',
            costo: {
              ...(p?.costo || {}),
              costoUnitario: costo,
              valor: costo,
              fechaVigencia: res?.fechaVigencia ?? vigencia,
              fuente: 'manual'
            },
            precio: { ...(p?.precio || {}), costoUnitario: costo },
            date_edit: res?.date_edit || new Date().toISOString()
          }
        });
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.error || err?.message || 'No se pudo guardar el costo.';
      }
    });
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }
}
