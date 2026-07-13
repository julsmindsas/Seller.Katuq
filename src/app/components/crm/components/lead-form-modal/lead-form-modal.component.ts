import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { PRIORITY_OPTIONS } from '../../models/crm.models';

export interface LeadTag {
  name: string;
  color: string;
}

/**
 * Modal reutilizable con el formulario de LEAD del CRM (spec 011/CRM).
 * Fuente única del form usado tanto por el pipeline del CRM ("Nuevo lead")
 * como por el listado de Clientes Corporativos ("Nuevo corporativo"), para que
 * ambos capturen exactamente los mismos campos (crear y editar).
 *
 * No persiste: valida y devuelve el value del form via `activeModal.close(value)`.
 * Cada caller decide el endpoint (createLead/updateLead, con override corporate
 * cuando aplica).
 */
@Component({
  selector: 'app-lead-form-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    InputTextModule, InputTextareaModule, InputNumberModule, ButtonModule,
  ],
  templateUrl: './lead-form-modal.component.html',
  styleUrls: ['./lead-form-modal.component.scss'],
})
export class LeadFormModalComponent implements OnInit {
  /** true = edición (prellenar desde leadData). */
  @Input() isEdit = false;
  /** Datos del lead/corporativo a editar. */
  @Input() leadData: any = null;
  /** Catálogo de etiquetas a elegir (corporate o client según el caller). */
  @Input() tagsCatalog: LeadTag[] = [];
  /** Título del modal. */
  @Input() title = 'Nuevo corporativo';

  form: FormGroup;
  etiquetasSeleccionadas: string[] = [];

  readonly sourceOptions = [
    { label: 'Redes sociales', value: 'social_media' },
    { label: 'Referido', value: 'referral' },
    { label: 'Búsqueda web', value: 'web' },
    { label: 'Evento / Feria', value: 'event' },
    { label: 'WhatsApp / Email', value: 'whatsapp' },
    { label: 'Visita directa', value: 'direct' },
    { label: 'Otro', value: 'other' },
  ];
  readonly priorityOpts = PRIORITY_OPTIONS;
  readonly tipoDocOptions = [
    { label: 'CC — Cédula de ciudadanía', value: 'CC' },
    { label: 'NIT', value: 'NIT' },
    { label: 'TI — Tarjeta de identidad', value: 'TI' },
    { label: 'CE — Cédula de extranjería', value: 'CE' },
    { label: 'PA — Pasaporte', value: 'PA' },
    { label: 'RC — Registro civil', value: 'RC' },
    { label: 'TE — Tarjeta de extranjería', value: 'TE' },
    { label: 'PEP — Permiso Especial de Permanencia', value: 'PEP' },
    { label: 'PPT — Permiso por Protección Temporal', value: 'PPT' },
    { label: 'DIE — Doc. identificación extranjero', value: 'DIE' },
    { label: 'NIT_EXT — NIT de otro país', value: 'NIT_EXT' },
    { label: 'NUIP', value: 'NUIP' },
  ];

  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      name:           ['', Validators.required],
      tipoDocumento:  ['CC'],
      nit:            [''],
      email:          ['', Validators.email],
      phone:          [''],
      source:         ['other'],
      priority:       ['medium'],
      estimatedValue: [null],
      productoInteres:[''],
      etiquetas:      [[]],
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.leadData) {
      const d = this.leadData;
      // Acepta tanto la forma de lead (name/nit/email/phone) como la de
      // corporate_clients cruda (nombres_completos/documento/...).
      this.etiquetasSeleccionadas = Array.isArray(d.etiquetas) ? [...d.etiquetas] : [];
      this.form.patchValue({
        name:            d.name || d.nombres_completos || '',
        tipoDocumento:   d.tipoDocumento || d.tipo_documento_comprador || 'CC',
        nit:             d.nit || d.documento || '',
        email:           d.email || d.correo_electronico_comprador || '',
        phone:           d.phone || d.numero_celular_comprador || '',
        source:          d.source || 'other',
        priority:        d.priority || 'medium',
        estimatedValue:  d.estimatedValue ?? null,
        productoInteres: d.productoInteres || '',
        etiquetas:       this.etiquetasSeleccionadas,
      });
    }
  }

  toggleEtiqueta(nombre: string): void {
    const idx = this.etiquetasSeleccionadas.indexOf(nombre);
    if (idx >= 0) this.etiquetasSeleccionadas.splice(idx, 1);
    else this.etiquetasSeleccionadas.push(nombre);
    this.form.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);
  }

  tieneEtiqueta(nombre: string): boolean {
    return this.etiquetasSeleccionadas.includes(nombre);
  }

  getTagBgColor(color: string): string {
    const map: Record<string, string> = {
      violet: '#ede9fe', green: '#d1fae5', blue: '#dbeafe',
      amber: '#fef3c7', red: '#fee2e2', gray: '#f3f4f6',
    };
    return map[color] || '#ede9fe';
  }

  getTagFgColor(color: string): string {
    const map: Record<string, string> = {
      violet: '#5b21b6', green: '#065f46', blue: '#1e40af',
      amber: '#92400e', red: '#991b1b', gray: '#374151',
    };
    return map[color] || '#5b21b6';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.activeModal.close(this.form.value);
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }
}
