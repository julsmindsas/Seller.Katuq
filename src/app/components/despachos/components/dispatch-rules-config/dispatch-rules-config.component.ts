import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DispatchRulesService, DispatchRulesConfig, DispatchRule } from '../../services/dispatch-rules.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dispatch-rules-config',
  templateUrl: './dispatch-rules-config.component.html',
  styleUrls: ['./dispatch-rules-config.component.scss']
})
export class DispatchRulesConfigComponent implements OnInit, OnDestroy {
  @Input() vendors: any[] = [];
  @Input() visible = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  config: DispatchRulesConfig = {
    autoAsignarTransportador: false,
    autoDespachar: false,
    autoImprimir: false,
    defaultMetodoEnvio: 'mensajeroPropio',
    reglas: [],
    fallbackTransportadorId: null
  };

  editingRule: DispatchRule | null = null;
  ruleForm: FormGroup;
  loading = false;
  saving = false;
  showRuleForm = false;

  // Zone options extracted from rules + manual entry
  zonasDisponibles: string[] = [];

  metodoEnvioOptions = [
    { label: 'Mensajero Propio', value: 'mensajeroPropio' },
    { label: 'Transportadora', value: 'transportadora' },
    { label: 'Recoge en Tienda', value: 'recogeEnTienda' },
    { label: 'Enviame.io', value: 'enviame' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private dispatchRulesService: DispatchRulesService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.ruleForm = this.fb.group({
      nombre: ['', Validators.required],
      activa: [true],
      prioridad: [1, [Validators.required, Validators.min(1)]],
      zonaCobro: [[]],
      ciudad: [[]],
      valorMinimo: [null],
      valorMaximo: [null],
      transportadorId: ['', Validators.required],
      transportadorNombre: [''],
      metodoEnvio: ['mensajeroPropio']
    });
  }

  ngOnInit(): void {
    this.loadRules();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRules(): void {
    this.loading = true;
    this.dispatchRulesService.getRules(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (config) => {
        this.config = config;
        this.extractZonas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dispatch rules:', err);
        this.loading = false;
        this.toastr.error('Error al cargar reglas de despacho');
      }
    });
  }

  extractZonas(): void {
    const zonasSet = new Set<string>();
    for (const regla of this.config.reglas) {
      (regla.condiciones.zonaCobro || []).forEach(z => zonasSet.add(z));
    }
    this.zonasDisponibles = Array.from(zonasSet).sort();
  }

  saveConfig(): void {
    this.saving = true;
    this.dispatchRulesService.saveRules(this.config).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Reglas guardadas correctamente');
      },
      error: (err) => {
        this.saving = false;
        this.toastr.error('Error al guardar reglas');
        console.error(err);
      }
    });
  }

  addRule(): void {
    this.editingRule = null;
    this.ruleForm.reset({ activa: true, prioridad: this.config.reglas.length + 1, metodoEnvio: 'mensajeroPropio' });
    this.showRuleForm = true;
  }

  editRule(rule: DispatchRule): void {
    this.editingRule = rule;
    this.ruleForm.patchValue({
      nombre: rule.nombre,
      activa: rule.activa,
      prioridad: rule.prioridad,
      zonaCobro: rule.condiciones.zonaCobro || [],
      ciudad: rule.condiciones.ciudad || [],
      valorMinimo: rule.condiciones.valorMinimo,
      valorMaximo: rule.condiciones.valorMaximo,
      transportadorId: rule.accion.transportadorId,
      transportadorNombre: rule.accion.transportadorNombre,
      metodoEnvio: rule.accion.metodoEnvio || 'mensajeroPropio'
    });
    this.showRuleForm = true;
  }

  saveRule(): void {
    if (this.ruleForm.invalid) return;

    const formVal = this.ruleForm.value;
    const selectedVendor = this.vendors.find(v => (v.id || v._id) === formVal.transportadorId);
    const transportadorNombre = selectedVendor
      ? (selectedVendor.nombres || selectedVendor.nombre || '')
      : (formVal.transportadorNombre || '');

    const rule: DispatchRule = {
      id: this.editingRule?.id || 'rule_' + Date.now(),
      nombre: formVal.nombre,
      activa: formVal.activa,
      prioridad: formVal.prioridad,
      condiciones: {
        zonaCobro: formVal.zonaCobro || [],
        ciudad: formVal.ciudad || [],
        valorMinimo: formVal.valorMinimo,
        valorMaximo: formVal.valorMaximo
      },
      accion: {
        transportadorId: formVal.transportadorId,
        transportadorNombre: transportadorNombre,
        metodoEnvio: formVal.metodoEnvio
      }
    };

    if (this.editingRule) {
      const idx = this.config.reglas.findIndex(r => r.id === this.editingRule!.id);
      if (idx >= 0) this.config.reglas[idx] = rule;
    } else {
      this.config.reglas.push(rule);
    }

    this.config.reglas.sort((a, b) => a.prioridad - b.prioridad);
    this.showRuleForm = false;
    this.editingRule = null;
    this.extractZonas();
  }

  cancelRule(): void {
    this.showRuleForm = false;
    this.editingRule = null;
  }

  deleteRule(rule: DispatchRule): void {
    this.config.reglas = this.config.reglas.filter(r => r.id !== rule.id);
    // Re-number priorities
    this.config.reglas.forEach((r, i) => r.prioridad = i + 1);
  }

  onTransportadorSelect(event: any): void {
    if (event?.value) {
      this.ruleForm.patchValue({
        transportadorId: event.value.id || event.value._id,
        transportadorNombre: event.value.nombres || event.value.nombre
      });
    }
  }

  cerrar(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.onClose.emit();
  }

  getVendorName(id: string): string {
    if (!id) return 'Sin asignar';
    const v = this.vendors.find(v => v.id === id || v._id === id);
    return v ? (v.nombres || v.nombre || id) : id;
  }

  getMetodoEnvioLabel(value: string): string {
    const opt = this.metodoEnvioOptions.find(o => o.value === value);
    return opt ? opt.label : value;
  }

  moveRuleUp(index: number): void {
    if (index <= 0) return;
    const temp = this.config.reglas[index];
    this.config.reglas[index] = this.config.reglas[index - 1];
    this.config.reglas[index - 1] = temp;
    this.config.reglas.forEach((r, i) => r.prioridad = i + 1);
  }

  moveRuleDown(index: number): void {
    if (index >= this.config.reglas.length - 1) return;
    const temp = this.config.reglas[index];
    this.config.reglas[index] = this.config.reglas[index + 1];
    this.config.reglas[index + 1] = temp;
    this.config.reglas.forEach((r, i) => r.prioridad = i + 1);
  }
}
