import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';

interface ComboProductoUI {
  cd: string;
  titulo: string;
  referencia: string;
  imagen?: string | null;
  descripcion?: string | null;
}

@Component({
  selector: 'app-crear-combo',
  templateUrl: './crear-combo.component.html',
  styleUrls: ['./crear-combo.component.scss']
})
export class CrearComboComponent implements OnInit, OnDestroy {
  @Input() mostrarCrear: boolean = true;
  @Input() comboData: any;

  form: FormGroup;

  // ── Selector multi-producto (typeahead server-side) ──────────────────────
  // Mismo patrón que crear-descuento-promocion.component.ts (búsqueda por
  // producto específico), en modo ng-select[multiple] para elegir N productos.
  // `imagen`/`descripcion` se guardan solo para pintar la lista tipo "listado
  // de productos" debajo del selector — el payload que se persiste (armarPayload)
  // sigue siendo solo {productoId, referencia, nombre}, sin estos campos.
  productosBuscados: ComboProductoUI[] = [];
  productosSeleccionados: ComboProductoUI[] = [];
  productoInput$ = new Subject<string>();
  productoLoading = false;
  cargandoSeleccionados = false;
  private productoSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      id: [''],
      nombre: ['', Validators.required],
      descripcion: [''],
      activo: [true]
    });
  }

  ngOnInit(): void {
    this.initBusquedaProductos();

    if (this.comboData) {
      this.mostrarCrear = false;
      this.form.patchValue(this.comboData);

      // Prealimentar con lo guardado (nombre/referencia, sin imagen/descripción
      // — el combo no las persiste) y de inmediato resolver los productos
      // completos por id para poder pintar imagen + descripción también al
      // editar, no solo cuando se buscan de nuevo.
      const productosGuardados: ComboProductoUI[] = (this.comboData.productos || []).map((p: any) => ({
        cd: p.productoId,
        titulo: p.nombre || '(producto)',
        referencia: p.referencia || ''
      }));
      this.productosBuscados = productosGuardados;
      this.productosSeleccionados = productosGuardados;
      this.resolverProductosGuardados(productosGuardados.map(p => p.cd));
    }
  }

  /** Trae imagen + descripción reales de los productos ya guardados en el combo. */
  private resolverProductosGuardados(ids: string[]): void {
    if (ids.length === 0) return;
    this.cargandoSeleccionados = true;
    this.service.getProductsByIds(ids).subscribe({
      next: (res: any) => {
        const items = this.mapProductos(res?.products || []);
        const porId = new Map(items.map(i => [i.cd, i]));
        // Mantiene el orden guardado; completa imagen/descripción donde haya match.
        this.productosSeleccionados = this.productosSeleccionados.map(p => porId.get(p.cd) || p);
        this.productosBuscados = this.productosSeleccionados;
        this.cargandoSeleccionados = false;
      },
      error: () => { this.cargandoSeleccionados = false; }
    });
  }

  ngOnDestroy(): void {
    this.productoSub?.unsubscribe();
  }

  /** Mapea productos completos (Firestore) al shape liviano del selector, con imagen + descripción para la lista tipo "listado de productos". */
  private mapProductos(products: any[]): ComboProductoUI[] {
    return (products || []).map((p: any) => ({
      cd: p.cd,
      titulo: p.crearProducto?.titulo || p.identificacion?.referencia || '(sin título)',
      referencia: p.identificacion?.referencia || '',
      imagen: p.crearProducto?.imagenesPrincipales?.[0]?.urls || null,
      descripcion: p.crearProducto?.descripcion || null
    }));
  }

  /** Texto plano y recortado de la descripción (puede traer HTML — no se renderiza crudo). */
  descripcionPlana(item: ComboProductoUI, maxLen: number = 110): string {
    const texto = (item?.descripcion || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!texto) return '';
    return texto.length > maxLen ? `${texto.slice(0, maxLen)}…` : texto;
  }

  /** Quita un producto de la selección (usado desde la lista tipo "listado de productos"). */
  quitarProducto(item: ComboProductoUI): void {
    this.productosSeleccionados = this.productosSeleccionados.filter(p => p.cd !== item.cd);
  }

  /**
   * Comparador para ng-select: sin `bindValue`, el ngModel guarda los objetos
   * completos (no solo `cd`) para que `productosSeleccionados` ya traiga
   * imagen/descripción — compara por `cd` para que ng-select reconozca
   * correctamente qué opciones ya están seleccionadas entre búsquedas.
   */
  compararProducto = (a: ComboProductoUI, b: ComboProductoUI): boolean => a?.cd === b?.cd;

  // ── Búsqueda de productos con typeahead (server-side) ────────────────────
  private initBusquedaProductos(): void {
    this.productoSub = this.productoInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => (this.productoLoading = true)),
      switchMap((term) => {
        if (!term || term.trim().length < 2) {
          this.productoLoading = false;
          return of([]);
        }
        return this.service.quickSearchProducts(term.trim(), 20, 'all').pipe(
          map((res: any) => this.mapProductos(res?.products || [])),
          catchError(() => of([]))
        );
      }),
      tap(() => (this.productoLoading = false))
    ).subscribe((items: any[]) => {
      // Se agregan al set buscado sin perder los ya seleccionados (que pueden
      // no estar en el resultado de la búsqueda actual).
      const existentes = new Map(this.productosSeleccionados.map(p => [p.cd, p]));
      items.forEach(i => existentes.set(i.cd, i));
      this.productosBuscados = Array.from(existentes.values());
    });
  }

  guardar() {
    if (this.form.invalid || this.productosSeleccionados.length === 0) {
      this.form.markAllAsTouched();
      Swal.fire('Error', 'Completa el nombre y selecciona al menos 1 producto', 'error');
      return;
    }
    const payload = this.armarPayload();
    this.service.createCombo(payload).subscribe({
      next: () => {
        Swal.fire('¡Creado!', 'El combo fue creado exitosamente.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo crear el combo.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  editar() {
    if (this.form.invalid || this.productosSeleccionados.length === 0) {
      this.form.markAllAsTouched();
      Swal.fire('Error', 'Completa el nombre y selecciona al menos 1 producto', 'error');
      return;
    }
    const payload = this.armarPayload();
    this.service.editCombo(payload).subscribe({
      next: () => {
        Swal.fire('¡Actualizado!', 'El combo fue actualizado.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo actualizar el combo.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  // Sin campo de precio a propósito (D-147): el combo solo lleva la lista de
  // productos que lo componen — el precio siempre emerge de sumarlos en venta.
  private armarPayload(): any {
    return {
      ...this.form.value,
      productos: this.productosSeleccionados.map(p => ({
        productoId: p.cd,
        referencia: p.referencia,
        nombre: p.titulo
      }))
    };
  }
}
