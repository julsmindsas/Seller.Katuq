import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InfoPaises } from 'src/Mock/pais-estado-ciudad';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';

@Component({
  selector: 'app-entrega-section',
  templateUrl: './entrega-section.component.html',
  styleUrls: ['./entrega-section.component.scss']
})
export class EntregaSectionComponent implements OnInit {
  @Input() entrega: any;
  @Output() entregaChange = new EventEmitter<any>();

  entregaForm: FormGroup;
  paises: string[] = [];
  departamentos: string[] = [];
  ciudades: string[] = [];
  zonasCobro: any[] = [];

  constructor(private fb: FormBuilder, private infoPaises: InfoPaises, private maestroService: MaestroService) { }

  ngOnInit(): void {
    this.paises = this.infoPaises.paises.map(x => x.Pais);
    this.entregaForm = this.fb.group({
      nombres: [this.entrega?.nombres || '', Validators.required],
      apellidos: [this.entrega?.apellidos || '', Validators.required],
      celular: [this.entrega?.celular || '', Validators.required],
      direccion: [this.entrega?.direccion || '', Validators.required],
      barrio: [this.entrega?.barrio || '', Validators.required],
      pais: [this.entrega?.pais || '', Validators.required],
      departamento: [this.entrega?.departamento || '', Validators.required],
      ciudad: [this.entrega?.ciudad || '', Validators.required],
      codigoPostal: [this.entrega?.codigoPostal || '', Validators.required],
      zonaCobro: [this.entrega?.zonaCobro || '', Validators.required]
    });
    this.entregaForm.valueChanges.subscribe(val => {
      this.entregaChange.emit(val);
    });
    if (this.entrega?.pais) {
      this.onPaisChange(this.entrega.pais);
    }
    if (this.entrega?.departamento) {
      this.onDepartamentoChange(this.entrega.departamento);
    }
    this.maestroService.getBillingZone().subscribe((res: any) => {
      this.zonasCobro = Array.isArray(res) ? res : (res?.zonas || []);
    });
  }

  onPaisChange(pais: string) {
    const paisObj = this.infoPaises.paises.find(x => x.Pais === pais);
    this.departamentos = paisObj ? paisObj.Regiones.map(r => r.departamento) : [];
    this.ciudades = [];
    this.entregaForm.patchValue({ departamento: '', ciudad: '' });
  }

  onDepartamentoChange(departamento: string) {
    const paisObj = this.infoPaises.paises.find(x => x.Pais === this.entregaForm.value.pais);
    const deptoObj = paisObj?.Regiones.find(r => r.departamento === departamento);
    this.ciudades = deptoObj ? deptoObj.ciudades : [];
    this.entregaForm.patchValue({ ciudad: '' });
  }

  // Métodos para editar datos de entrega aquí
} 