import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';

@Component({
  selector: 'app-historial-redenciones',
  templateUrl: './historial-redenciones.component.html',
  styleUrls: ['./historial-redenciones.component.scss']
})
export class HistorialRedencionesComponent implements OnInit {
  /** Fila del descuento (necesita id, codigoPersonalizado, nombre). */
  @Input() descuento: any;

  cargando = false;
  redenciones: any[] = [];

  constructor(
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    if (this.descuento?.id) {
      this.cargar();
    }
  }

  cargar(): void {
    this.cargando = true;
    this.service.consultarRedenciones(this.descuento.id).subscribe({
      next: (data: any) => {
        this.redenciones = Array.isArray(data) ? data : [];
        this.cargando = false;
      },
      error: () => {
        this.redenciones = [];
        this.cargando = false;
      }
    });
  }

  get totalDescontado(): number {
    return this.redenciones.reduce((acc, r) => acc + (Number(r.montoDescuentoAplicado) || 0), 0);
  }

  /** Convierte el Timestamp de Firestore ({_seconds}) o ISO a Date legible. */
  fecha(r: any): Date | null {
    const f = r?.fechaRedencion || r?.creadoEn;
    if (!f) { return null; }
    if (f._seconds) { return new Date(f._seconds * 1000); }
    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  }

  resumenProductos(r: any): string {
    if (!Array.isArray(r?.productos) || r.productos.length === 0) { return '—'; }
    return r.productos
      .map((p: any) => `${p.cantidad || 0}× ${p.titulo || 'Producto'}`)
      .join(', ');
  }
}
