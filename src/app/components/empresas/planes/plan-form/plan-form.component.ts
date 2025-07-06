import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanesService } from '../../../../shared/services/planes/planes.service';
import { SubscriptionPlan } from '../../../../shared/models/planes/plan.model';

@Component({
  selector: 'app-plan-form',
  templateUrl: './plan-form.component.html',
  styleUrls: ['./plan-form.component.scss']
})
export class PlanFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  planId: string | null = null;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private planesService: PlanesService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(0)]],
      duracion: [30, [Validators.required, Validators.min(1)]],
      tipo: ['mensual', Validators.required],
      activo: [true],
      caracteristicas: this.fb.array([]),
      limites: this.fb.group({
        maxUsuarios: [null],
        maxProductos: [null],
        maxPedidos: [null]
      }),
      fechaInicio: [new Date(), Validators.required],
      fechaVigencia: [{ value: this.calcularVigencia(new Date()), disabled: true }]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editMode = true;
        this.planId = id;
        this.cargarPlan(id);
      }
    });

    // Recalcular vigencia al cambiar fechaInicio
    this.form.get('fechaInicio')?.valueChanges.subscribe((fecha: Date) => {
      this.form.get('fechaVigencia')?.setValue(this.calcularVigencia(fecha), { emitEvent: false });
    });
  }

  get caracteristicasArr(): FormArray {
    return this.form.get('caracteristicas') as FormArray;
  }

  addCaracteristica() {
    this.caracteristicasArr.push(this.fb.control('', Validators.required));
  }

  removeCaracteristica(index: number) {
    this.caracteristicasArr.removeAt(index);
  }

  calcularVigencia(fechaInicio: Date): Date {
    const vigencia = new Date(fechaInicio);
    vigencia.setDate(vigencia.getDate() + 30);
    return vigencia;
  }

  cargarPlan(id: string) {
    this.planesService.getPlan(id).subscribe(plan => {
      this.form.patchValue({ ...plan, fechaInicio: new Date(), fechaVigencia: this.calcularVigencia(new Date()) });
      // Cargar características existing
      if (plan.caracteristicas && plan.caracteristicas.length) {
        plan.caracteristicas.forEach(car => this.caracteristicasArr.push(this.fb.control(car)));
      }
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.submitting = true;
    const payload: Partial<SubscriptionPlan> = {
      ...this.form.getRawValue(),
      fechaVigencia: undefined // No se envía al backend; solo UI
    };

    const peticion = this.editMode && this.planId ?
      this.planesService.actualizarPlan(this.planId, payload) :
      this.planesService.crearPlan(payload);

    peticion.subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['../'], { relativeTo: this.route });
      },
      error: () => { this.submitting = false; }
    });
  }

  cancelar() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
} 