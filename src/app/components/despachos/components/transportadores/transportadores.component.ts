import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.initForm();
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