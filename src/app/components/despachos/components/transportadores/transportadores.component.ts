import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { LogisticaServiceV2 } from '../../../../shared/services/despachos/logistica.service.v2';

@Component({
  selector: 'app-transportadores',
  templateUrl: './transportadores.component.html',
  styleUrls: ['./transportadores.component.scss']
})
export class TransportadoresComponent implements OnInit, OnChanges {
  @Input() vendors: any[] = [];
  @Input() editMode: boolean = false;
  @Input() selectedTransporter: any = null;
  @Input() zonasCobroDisponibles: string[] = [];

  zonasCobroOptions: string[] = [];

  @Output() onSave = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onClose = new EventEmitter<void>();

  transportadorForm: FormGroup;
  isLoading: boolean = false;
  showForm: boolean = false;

  /** Toma de pedidos desde la app del mensajero (null mientras carga o si no se pudo leer). */
  tomanPedidos: boolean | null = null;
  guardandoTomanPedidos = false;

  /** Pago al mensajero por entrega: 'ninguno' (no se muestra pago), 'fijo' ($) o 'porcentaje' (% del domicilio). */
  pagoTipo: 'ninguno' | 'fijo' | 'porcentaje' = 'ninguno';
  pagoValor: number | null = null;
  guardandoPago = false;
  pagoGuardado = false;
  readonly pagoFijoMax = 500000;

  constructor(private formBuilder: FormBuilder, private logistica: LogisticaServiceV2) { }

  ngOnInit(): void {
    this.initForm();
    this.logistica.getMensajerosConfig().subscribe({
      next: (r) => {
        this.tomanPedidos = r?.config?.mensajerosTomanPedidos === true;
        const pago = r?.config?.pagoMensajero;
        this.pagoTipo = pago ? pago.tipo : 'ninguno';
        this.pagoValor = pago ? pago.valor : null;
      },
      error: () => this.tomanPedidos = null,
    });
  }

  cambiarPagoTipo(tipo: string): void {
    this.pagoTipo = tipo === 'fijo' || tipo === 'porcentaje' ? tipo : 'ninguno';
    this.pagoGuardado = false;
    if (this.pagoTipo === 'ninguno') { this.pagoValor = null; }
  }

  /** El valor escrito es válido para el tipo elegido (fijo: $1 a $500.000; porcentaje: 1 a 100). */
  get pagoValorValido(): boolean {
    if (this.pagoTipo === 'ninguno') { return true; }
    const v = Number(this.pagoValor);
    if (!Number.isFinite(v) || v <= 0) { return false; }
    return this.pagoTipo === 'fijo' ? v <= this.pagoFijoMax : v <= 100;
  }

  /** Guarda lo que gana el mensajero por entrega. "Sin definir" quita el pago y la app deja de mostrarlo. */
  guardarPago(): void {
    if (!this.pagoValorValido) { return; }
    this.guardandoPago = true;
    this.pagoGuardado = false;
    const pagoMensajero = this.pagoTipo === 'ninguno' ? null : { tipo: this.pagoTipo, valor: Number(this.pagoValor) };
    this.logistica.saveMensajerosConfig({ pagoMensajero }).subscribe({
      next: () => {
        this.guardandoPago = false;
        this.pagoGuardado = true;
      },
      error: (e) => {
        this.guardandoPago = false;
        Swal.fire({
          icon: 'error',
          title: 'No se guardó el pago',
          text: e?.status === 403
            ? 'Solo un administrador de la empresa puede cambiar esto. Pídele a un administrador que lo haga.'
            : (e?.error?.error || 'No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.'),
        });
      },
    });
  }

  /**
   * Activa o apaga que los mensajeros tomen solos los pedidos listos (Empacado / Para despachar) que no
   * tienen mensajero asignado. Se confirma antes porque cambia cómo se reparten los pedidos.
   */
  async cambiarTomanPedidos(valor: boolean): Promise<void> {
    const anterior = this.tomanPedidos;
    const r = await Swal.fire({
      icon: 'question',
      title: valor ? '¿Activar pedidos para tomar?' : '¿Apagar pedidos para tomar?',
      text: valor
        ? 'Tus mensajeros en línea verán en la app los pedidos listos que no tengan mensajero y el primero que lo tome se lo lleva. No incluye los pedidos que ya asignaste.'
        : 'Tus mensajeros dejarán de ver pedidos para tomar. Los que ya tomaron siguen a su nombre.',
      showCancelButton: true,
      confirmButtonText: valor ? 'Sí, activar' : 'Sí, apagar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) {
      this.tomanPedidos = anterior;
      return;
    }
    this.guardandoTomanPedidos = true;
    this.logistica.saveMensajerosConfig({ mensajerosTomanPedidos: valor }).subscribe({
      next: () => {
        this.tomanPedidos = valor;
        this.guardandoTomanPedidos = false;
      },
      error: (e) => {
        this.tomanPedidos = anterior;
        this.guardandoTomanPedidos = false;
        Swal.fire({
          icon: 'error',
          title: 'No se guardó el cambio',
          text: e?.status === 403
            ? 'Solo un administrador de la empresa puede cambiar esto. Pídele a un administrador que lo haga.'
            : 'No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.',
        });
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['zonasCobroDisponibles'] && this.zonasCobroDisponibles) {
      this.zonasCobroOptions = this.zonasCobroDisponibles;
    }
    if (changes['selectedTransporter'] && this.selectedTransporter && this.editMode) {
      this.transportadorForm.patchValue({
        ...this.selectedTransporter,
        zonasCobertura: this.selectedTransporter.zonasCobertura || []
      });
      this.showForm = true;
    }
  }

  private initForm(): void {
    this.transportadorForm = this.formBuilder.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      cedula: ['', Validators.required],
      telefono: ['', Validators.required],
      whatsapp: [''],
      correo: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', Validators.required],
      eps: [''],
      arl: [''],
      marcaMoto: [''],
      lineaMoto: [''],
      modeloMoto: [''],
      placa: [''],
      capacidadCarga: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
      pwd: ['', Validators.required],
      zonasCobertura: [[]],
      // Origen de la guía de envío de este transportador:
      //   'katuq'   → Katuq genera el PDF de la guía (mensajeros propios).
      //   'enviame' → se usa la etiqueta real de enviame.io.
      guiaProvider: ['enviame'],
    });
  }

  onSubmit(): void {
    if (this.transportadorForm.invalid) {
      this.markFormGroupTouched(this.transportadorForm);
      return;
    }

    this.isLoading = true;
    const formData = this.transportadorForm.value;
    
    if (this.editMode && this.selectedTransporter) {
      formData.id = this.selectedTransporter.id;
      formData.date_edit = this.selectedTransporter.date_edit;
    }
    
    // Simular delay para mostrar loading
    setTimeout(() => {
      this.onSave.emit(formData);
      this.isLoading = false;
      this.hideForm();
      this.resetForm();
    }, 500);
  }

  deleteTransporter(vendor: any): void {
    this.onDelete.emit(vendor);
  }

  editTransporter(vendor: any): void {
    this.transportadorForm.patchValue(vendor);
    this.editMode = true;
    this.selectedTransporter = vendor;
    this.showForm = true;
    this.onEdit.emit(vendor);
  }

  closeModal(): void {
    this.onClose.emit();
  }

  resetForm(): void {
    this.transportadorForm.reset();
    this.editMode = false;
    this.selectedTransporter = null;
  }

  showCreateForm(): void {
    this.resetForm();
    this.showForm = true;
  }

  hideForm(): void {
    this.showForm = false;
    this.resetForm();
  }

  confirmDelete(vendor: any): void {
    if (confirm(`¿Está seguro de que desea eliminar al transportador ${vendor.nombres} ${vendor.apellidos}?`)) {
      this.deleteTransporter(vendor);
    }
  }

  // Utilidad para marcar todos los campos como touched
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
} 