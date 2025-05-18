import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InfoPaises } from 'src/Mock/pais-estado-ciudad';

@Component({
  selector: 'app-facturacion-section',
  templateUrl: './facturacion-section.component.html',
  styleUrls: ['./facturacion-section.component.scss']
})
export class FacturacionSectionComponent implements OnInit {
  @Input() facturacion: any;
  @Output() facturacionChange = new EventEmitter<any>();

  facturacionForm: FormGroup;
  paises: string[] = [];
  departamentos: string[] = [];
  ciudades: string[] = [];

  constructor(private fb: FormBuilder, private infoPaises: InfoPaises) { }

  ngOnInit(): void {
    this.paises = this.infoPaises.paises.map(x => x.Pais);
    this.facturacionForm = this.fb.group({
      razonSocial: [this.facturacion?.razonSocial || '', Validators.required],
      tipoDocumento: [this.facturacion?.tipoDocumento || '', Validators.required],
      numeroDocumento: [this.facturacion?.numeroDocumento || '', Validators.required],
      celular: [this.facturacion?.celular || '', Validators.required],
      correo: [this.facturacion?.correo || '', [Validators.required, Validators.email]],
      direccion: [this.facturacion?.direccion || '', Validators.required],
      pais: [this.facturacion?.pais || '', Validators.required],
      departamento: [this.facturacion?.departamento || '', Validators.required],
      ciudad: [this.facturacion?.ciudad || '', Validators.required],
      codigoPostal: [this.facturacion?.codigoPostal || '', Validators.required]
    });
    this.facturacionForm.valueChanges.subscribe(val => {
      this.facturacionChange.emit(val);
    });
    // Inicializar selects dependientes si ya hay valores
    if (this.facturacion?.pais) {
      this.onPaisChange(this.facturacion.pais);
    }
    if (this.facturacion?.departamento) {
      this.onDepartamentoChange(this.facturacion.departamento);
    }
  }

  onPaisChange(pais: string) {
    const paisObj = this.infoPaises.paises.find(x => x.Pais === pais);
    this.departamentos = paisObj ? paisObj.Regiones.map(r => r.departamento) : [];
    this.ciudades = [];
    this.facturacionForm.patchValue({ departamento: '', ciudad: '' });
  }

  onDepartamentoChange(departamento: string) {
    const paisObj = this.infoPaises.paises.find(x => x.Pais === this.facturacionForm.value.pais);
    const deptoObj = paisObj?.Regiones.find(r => r.departamento === departamento);
    this.ciudades = deptoObj ? deptoObj.ciudades : [];
    this.facturacionForm.patchValue({ ciudad: '' });
  }

  // Métodos para editar datos de facturación aquí
} 