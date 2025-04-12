import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { InfoIndicativos } from '../../../../../Mock/indicativosPais'; // Importa el mock

@Component({
  selector: 'app-crear-cliente-modal',
  templateUrl: './crear-cliente-modal.component.html',
  styleUrls: ['./crear-cliente-modal.component.scss']
})
export class CrearClienteModalComponent implements OnInit {

  @Input() clienteData: any;
  @Input() isEdit: boolean = false;
  
  formulario: FormGroup;
  indicativos: any[] = []; // Usa directamente el mock

  constructor(
    private fb: FormBuilder,
    private maestroService: MaestroService,
    public activeModal: NgbActiveModal,
    private infoIndicativos: InfoIndicativos
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Ya no necesitamos cargarIndicativos() ya que usamos el mock directamente
    this.indicativos = this.infoIndicativos.datos;
    if (this.clienteData) {
      this.formulario.patchValue(this.clienteData);
      
      // Si estamos editando y no hay datos de WhatsApp, replicamos automáticamente
      if (!this.clienteData.indicativo_celular_whatsapp && !this.clienteData.numero_celular_whatsapp) {
        this.replicarWhatsApp({target: {checked: true}});
      }
    }
  }

  initForm() {
    this.formulario = this.fb.group({
      tipo_documento_comprador: ['', Validators.required],
      documento: ['', Validators.required],
      nombres_completos: ['', Validators.required],
      apellidos_completos: ['', Validators.required],
      indicativo_celular_comprador: ['', Validators.required],
      numero_celular_comprador: ['', [Validators.required, Validators.pattern(/^[0-9]*$/)]],
      correo_electronico_comprador: ['', [Validators.required, Validators.email]],
      indicativo_celular_whatsapp: [''],
      numero_celular_whatsapp: [''],
      estado: ['activo']
    });
  }

  // Eliminamos el método cargarIndicativos() ya que no es necesario

  validarSoloNumeros(event: any) {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode(event.charCode);
    
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }

  replicarWhatsApp(event: any) {
    if (event.target.checked) {
      this.formulario.patchValue({
        indicativo_celular_whatsapp: this.formulario.get('indicativo_celular_comprador')?.value,
        numero_celular_whatsapp: this.formulario.get('numero_celular_comprador')?.value
      });
      
      // Deshabilitamos los controles de WhatsApp cuando están replicados
      this.formulario.get('indicativo_celular_whatsapp')?.disable();
      this.formulario.get('numero_celular_whatsapp')?.disable();
    } else {
      // Habilitamos los controles si desmarcan la casilla
      this.formulario.get('indicativo_celular_whatsapp')?.enable();
      this.formulario.get('numero_celular_whatsapp')?.enable();
    }
  }

  guardarCliente() {
    if (this.formulario.invalid) {
      this.marcarControlesComoTocados();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }

    // Usamos getRawValue() para incluir los controles disabled
    const formValue = this.formulario.getRawValue();
    const clienteData = {
      ...formValue,
      // Convertimos los números de teléfono a Number
      numero_celular_comprador: Number(formValue.numero_celular_comprador),
      numero_celular_whatsapp: formValue.numero_celular_whatsapp ? Number(formValue.numero_celular_whatsapp) : null
    };

    if (this.isEdit) {
      this.editarCliente(clienteData);
    } else {
      this.crearCliente(clienteData);
    }
  }

  private crearCliente(clienteData: any) {
    this.maestroService.createClient(clienteData).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Cliente creado correctamente', 'success');
        this.activeModal.close('success');
      },
      error: (error) => {
        console.error('Error al crear cliente:', error);
        Swal.fire('Error', 'Ocurrió un error al crear el cliente', 'error');
      }
    });
  }

  private editarCliente(clienteData: any) {
    this.maestroService.editClient({
      ...clienteData,
      id: this.clienteData.id // Asegurarnos de incluir el ID
    }).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Cliente actualizado correctamente', 'success');
        this.activeModal.close('success');
      },
      error: (error) => {
        console.error('Error al actualizar cliente:', error);
        Swal.fire('Error', 'Ocurrió un error al actualizar el cliente', 'error');
      }
    });
  }

  private marcarControlesComoTocados() {
    Object.values(this.formulario.controls).forEach(control => {
      control.markAsTouched();
    });
  }
}