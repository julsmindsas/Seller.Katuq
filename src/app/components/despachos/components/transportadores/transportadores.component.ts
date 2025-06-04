import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-transportadores',
  templateUrl: './transportadores.component.html',
  styleUrls: ['./transportadores.component.scss']
})
export class TransportadoresComponent implements OnInit {
  @Input() vendors: any[] = [];
  @Input() editMode: boolean = false;
  @Input() selectedTransporter: any = null;

  @Output() onSave = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onClose = new EventEmitter<void>();

  transportadorForm: FormGroup;

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(): void {
    if (this.selectedTransporter && this.editMode) {
      this.transportadorForm.patchValue(this.selectedTransporter);
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
    });
  }

  onSubmit(): void {
    if (this.transportadorForm.invalid) {
      this.markFormGroupTouched(this.transportadorForm);
      return;
    }

    const formData = this.transportadorForm.value;
    if (this.editMode && this.selectedTransporter) {
      formData.id = this.selectedTransporter.id;
      formData.date_edit = this.selectedTransporter.date_edit;
      this.onSave.emit(formData);
    } else {
      this.onSave.emit(formData);
    }
  }

  deleteTransporter(vendor: any): void {
    this.onDelete.emit(vendor);
  }

  editTransporter(vendor: any): void {
    this.transportadorForm.patchValue(vendor);
    this.editMode = true;
    this.selectedTransporter = vendor;
    this.onEdit.emit(vendor);
  }

  closeModal(): void {
    this.onClose.emit();
  }

  resetForm(): void {
    this.transportadorForm.reset();
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