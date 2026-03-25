import {
  Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  CrmContact,
  CONTACT_SOURCE_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from '../../models/crm.models';
import { CrmService } from '../../services/crm.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss'],
})
export class ContactFormComponent implements OnInit, OnChanges {
  @Input() contact: CrmContact | null = null;
  @Input() isEdit = false;

  @Output() saved = new EventEmitter<CrmContact>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;

  statusOptions = CONTACT_STATUS_OPTIONS;
  sourceOptions = CONTACT_SOURCE_OPTIONS;
  priorityOptions = TASK_PRIORITY_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private crmService: CrmService,
  ) {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    if (this.contact) {
      this.patchForm(this.contact);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contact'] && !changes['contact'].firstChange) {
      const value = changes['contact'].currentValue as CrmContact | null;
      if (value) {
        this.patchForm(value);
      } else {
        this.form.reset();
      }
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.value as CrmContact);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  // ── Helpers ──────────────────────────────────────────────

  private buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      whatsapp: [''],
      companyName: [''],
      position: [''],
      sector: [''],
      city: [''],
      source: ['manual'],
      priority: ['medium'],
      estimatedValue: [null],
      tags: [[]],
      summary: [''],
    });
  }

  private patchForm(contact: CrmContact): void {
    this.form.patchValue({
      name: contact.name ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      whatsapp: contact.whatsapp ?? '',
      companyName: contact.companyName ?? '',
      position: contact.position ?? '',
      sector: contact.sector ?? '',
      city: contact.city ?? '',
      source: contact.source ?? 'manual',
      priority: contact.priority ?? 'medium',
      estimatedValue: contact.estimatedValue ?? null,
      tags: contact.tags ?? [],
      summary: contact.summary ?? '',
    });
  }

  /** Convenience getter for template validation checks */
  get f() {
    return this.form.controls;
  }
}
