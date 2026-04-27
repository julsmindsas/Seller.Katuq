import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { ToastrService } from 'ngx-toastr';

interface ProductoAlerta {
  productoId: string;
  referencia: string;
  titulo: string;
  stockActual: number;
  velocidadSemanal: number;
  diasParaAgotar: number | null;
  valorEnRiesgo: number;
  /** Stock × costoUnitario (valor a costo del stock en riesgo) */
  valorEnRiesgoCosto?: number;
  costoUnitario?: number;
  precioUnitario?: number;
  ultimoMovimiento: string | null;
  bodegasDetalle: { idBodega: string; nombre: string; cantidad: number }[];
}

interface SugerenciaTraslado {
  productoId: string;
  titulo: string;
  referencia: string;
  bodegaOrigen: { id: string; nombre: string; stock: number };
  bodegaDestino: { id: string; nombre: string; stock: number };
  cantidadSugerida: number;
  razon: string;
}

interface ResumenGeneral {
  totalProductos: number;
  totalUnidades: number;
  valorTotal: number;
  /** Valor total a costo del inventario completo */
  valorTotalCosto?: number;
  /** Margen potencial: valorTotal - valorTotalCosto */
  margenPotencial?: number;
  productosCriticos: number;
  productosEnRuptura: number;
  productosDormidos: number;
  rotacionPromedio: number;
}

@Component({
  selector: 'app-central-abastecimiento',
  templateUrl: './central-abastecimiento.component.html',
  styleUrls: ['./central-abastecimiento.component.scss']
})
export class CentralAbastecimientoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  cargando = false;
  resumen: ResumenGeneral | null = null;
  alertasCriticas: ProductoAlerta[] = [];
  productosEnRuptura: ProductoAlerta[] = [];
  productosDormidos: ProductoAlerta[] = [];
  sugerenciasTraslado: SugerenciaTraslado[] = [];
  topRotacion: ProductoAlerta[] = [];

  // Filtros
  diasAnalisis = 30;

  // IA
  analizandoIA = false;
  iaResumen: string | null = null;
  iaSalud: string | null = null;
  iaSugerencias: string[] = [];

  constructor(
    private inventarioService: InventarioService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.inventarioService.getCentralAbastecimiento(this.diasAnalisis)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.resumen = data.resumen;
          this.alertasCriticas = data.alertasCriticas || [];
          this.productosEnRuptura = data.productosEnRuptura || [];
          this.productosDormidos = data.productosDormidos || [];
          this.sugerenciasTraslado = data.sugerenciasTraslado || [];
          this.topRotacion = data.topRotacion || [];
          this.cargando = false;
        },
        error: (err) => {
          this.toastr.error('Error al cargar datos de abastecimiento', 'Error');
          this.cargando = false;
        }
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  getDiasClass(dias: number | null): string {
    if (dias === null) return 'text-muted';
    if (dias <= 7) return 'text-danger fw-bold';
    if (dias <= 15) return 'text-warning fw-bold';
    return 'text-success';
  }

  getDiasLabel(dias: number | null): string {
    if (dias === null) return 'Sin datos';
    if (dias === 0) return 'Agotado';
    return `${dias} dias`;
  }

  analizarConIA(): void {
    if (!this.resumen) return;
    this.analizandoIA = true;
    this.iaResumen = null;
    this.iaSugerencias = [];

    // Enviar los datos ya calculados al ADK para análisis
    this.inventarioService.analizarAbastecimientoIA({
      resumen: this.resumen,
      criticos: this.alertasCriticas.map(p => ({ titulo: p.titulo, stock: p.stockActual, diasParaAgotar: p.diasParaAgotar, velocidad: p.velocidadSemanal })),
      dormidos: this.productosDormidos.map(p => ({ titulo: p.titulo, stock: p.stockActual, valor: p.valorEnRiesgo })),
      traslados: this.sugerenciasTraslado.map(s => ({ producto: s.titulo, origen: s.bodegaOrigen.nombre, destino: s.bodegaDestino.nombre, cantidad: s.cantidadSugerida })),
      topRotacion: this.topRotacion.slice(0, 5).map(p => ({ titulo: p.titulo, velocidad: p.velocidadSemanal, diasParaAgotar: p.diasParaAgotar })),
      diasAnalisis: this.diasAnalisis
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.iaSalud = res.salud || null;
        this.iaResumen = res.resumen || null;
        this.iaSugerencias = res.sugerencias || [];
        this.analizandoIA = false;
      },
      error: () => {
        this.toastr.error('No se pudo conectar con el servicio de IA', 'IA no disponible');
        this.analizandoIA = false;
      }
    });
  }

  getSaludClass(): string {
    switch (this.iaSalud) {
      case 'CRITICA': return 'text-danger';
      case 'REGULAR': return 'text-warning';
      case 'BUENA': return 'text-success';
      default: return 'text-muted';
    }
  }
}
