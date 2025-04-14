import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
@Component({
  selector: 'app-crear-bodegas',
  templateUrl: './crear-bodegas.component.html',
  styleUrls: ['./crear-bodegas.component.scss']
})
export class CrearBodegasComponent implements OnInit {

  @Input() bodegaData: any;
  @Input() isEditMode = false;

  bodegaForm: FormGroup;
  tiposBodega = ['Física', 'Transaccional'];
  paises = ['Colombia', 'Ecuador', 'Perú', 'Chile', 'Argentina'];
  departamentos: string[] = [];
  ciudades: string[] = [];

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {
    this.bodegaForm = this.fb.group({
      id: [''],
      nombre: ['', Validators.required],
      idBodega: ['', [Validators.required, Validators.pattern(/^BOD-[A-Z0-9]{3,}$/)]],
      direccion: [''],
      coordenadas: [''],
      ciudad: [''],
      departamento: [''],
      pais: [''],
      tipo: ['Física', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.bodegaData) {
      this.bodegaForm.patchValue(this.bodegaData);
    }

    this.bodegaForm.get('tipo')?.valueChanges.subscribe(tipo => {
      this.actualizarValidaciones(tipo);
    });

    this.bodegaForm.get('pais')?.valueChanges.subscribe(pais => {
      this.cargarDepartamentos(pais);
    });

    this.bodegaForm.get('departamento')?.valueChanges.subscribe(depto => {
      this.cargarCiudades(depto);
    });
  }

  actualizarValidaciones(tipo: string) {
    const controles = ['direccion', 'coordenadas', 'ciudad', 'departamento', 'pais'];
    
    controles.forEach(control => {
      const formControl = this.bodegaForm.get(control);
      if (tipo === 'Física') {
        formControl?.setValidators([Validators.required]);
      } else {
        formControl?.clearValidators();
        formControl?.setValue('');
      }
      formControl?.updateValueAndValidity();
    });
  }

  cargarDepartamentos(pais: string) {
    // Simulación de carga de departamentos
    this.departamentos = pais === 'Colombia' ? 
      ['Bogotá D.C.', 'Antioquia', 'Valle del Cauca'] : 
      ['Departamento 1', 'Departamento 2'];
    this.bodegaForm.get('departamento')?.setValue('');
  }

  cargarCiudades(departamento: string) {
    // Simulación de carga de ciudades
    this.ciudades = departamento === 'Bogotá D.C.' ? 
      ['Bogotá'] : 
      ['Ciudad 1', 'Ciudad 2'];
    this.bodegaForm.get('ciudad')?.setValue('');
  }

  guardarBodega() {
    if (this.bodegaForm.invalid) {
      this.marcarControlesComoTocados();
      return;
    }

    this.activeModal.close(this.bodegaForm.value);
  }

  cancelar() {
    this.activeModal.dismiss();
  }

  private marcarControlesComoTocados() {
    Object.values(this.bodegaForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

}
