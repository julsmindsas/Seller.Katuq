import { Component, Input, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import { ClientConfigService, ClientTag } from "../services/client-config.service";
import { InfoIndicativos } from "../../../../../Mock/indicativosPais";
import Swal from "sweetalert2";

@Component({
  selector: "app-crear-cliente-modal",
  templateUrl: "./crear-cliente-modal.component.html",
  styleUrls: ["./crear-cliente-modal.component.scss"],
})
export class CrearClienteModalComponent implements OnInit {
  @Input() clienteData: any;
  @Input() isEdit: boolean = false;
  @Input() documentoPrellenado: string = "";

  formulario: FormGroup;
  indicativos: any[] = [];
  clientTypes: { label: string; value: string }[] = [];
  clientTagsCatalog: ClientTag[] = [];
  etiquetasSeleccionadas: string[] = [];

  constructor(
    private fb: FormBuilder,
    private maestroService: MaestroService,
    public activeModal: NgbActiveModal,
    private infoIndicativos: InfoIndicativos,
    private clientConfig: ClientConfigService,
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.indicativos = this.infoIndicativos.datos;
    this.clientConfig.loadClientTags().subscribe((tags) => {
      this.clientTagsCatalog = tags;
    });
    this.maestroService.consultarTiposClienteActivos().subscribe({
      next: (tipos: any) => {
        this.clientTypes = Array.isArray(tipos)
          ? tipos.filter((t: any) => t.active !== false).map((t: any) => ({ label: t.nombre, value: t.nombre }))
          : [];
      },
      error: () => { this.clientTypes = []; }
    });

    if (this.clienteData && this.isEdit) {
      this.formulario.patchValue(this.clienteData);
      this.etiquetasSeleccionadas = Array.isArray(this.clienteData.etiquetas)
        ? [...this.clienteData.etiquetas]
        : [];
      this.formulario.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);

      if (!this.clienteData.indicativo_celular_whatsapp && !this.clienteData.numero_celular_whatsapp) {
        this.replicarWhatsApp({ target: { checked: true } });
      }
    } else {
      this.formulario.reset();
      this.formulario.patchValue({
        tipo_documento_comprador: "CC",
        documento: this.documentoPrellenado || "",
        indicativo_celular_comprador: "57",
        indicativo_celular_whatsapp: "57",
        estado: "activo",
      });
    }
  }

  initForm() {
    this.formulario = this.fb.group({
      tipo_documento_comprador: ["CC", Validators.required],
      documento: ["", Validators.required],
      nombres_completos: ["", Validators.required],
      apellidos_completos: ["", Validators.required],
      indicativo_celular_comprador: ["57", Validators.required],
      numero_celular_comprador: ["", [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      correo_electronico_comprador: ["", [Validators.required, Validators.email]],
      indicativo_celular_whatsapp: ["57"],
      numero_celular_whatsapp: [""],
      whatsappSameAsPhone: [false],
      tipoCliente: [""],
      fechaCumpleanos: [""],
      comoNosConocio: [""],
      etiquetas: [[]],
      estado: ["activo"],
    });
  }

  validarSoloNumeros(event: any) {
    const pattern = /[0-9]/;
    if (!pattern.test(String.fromCharCode(event.charCode))) {
      event.preventDefault();
    }
  }

  replicarWhatsApp(event: any) {
    if (event.target.checked) {
      this.formulario.patchValue({
        indicativo_celular_whatsapp: this.formulario.get("indicativo_celular_comprador")?.value,
        numero_celular_whatsapp: this.formulario.get("numero_celular_comprador")?.value,
      });
      this.formulario.get("indicativo_celular_whatsapp")?.disable();
      this.formulario.get("numero_celular_whatsapp")?.disable();
    } else {
      this.formulario.get("indicativo_celular_whatsapp")?.enable();
      this.formulario.get("numero_celular_whatsapp")?.enable();
    }
  }

  toggleEtiqueta(nombre: string): void {
    const idx = this.etiquetasSeleccionadas.indexOf(nombre);
    if (idx >= 0) {
      this.etiquetasSeleccionadas.splice(idx, 1);
    } else {
      this.etiquetasSeleccionadas.push(nombre);
    }
    this.formulario.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);
  }

  tieneEtiqueta(nombre: string): boolean {
    return this.etiquetasSeleccionadas.includes(nombre);
  }

  getTagColor(tag: ClientTag): string {
    const map: Record<string, string> = {
      violet: '#ede9fe', green: '#e9f8ef', blue: '#e8f0fe',
      amber: '#fdf3e3', red: '#fdeaea', gray: '#f1eef9',
    };
    return map[tag.color] || '#f1eef9';
  }

  getTagTextColor(tag: ClientTag): string {
    const map: Record<string, string> = {
      violet: '#5b21b6', green: '#15803d', blue: '#1d4ed8',
      amber: '#b45309', red: '#b91c1c', gray: '#5a5470',
    };
    return map[tag.color] || '#5a5470';
  }

  private toTitleCase(str: string): string {
    if (!str) return str;
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  private getCamposFaltantes(): string[] {
    const labels: Record<string, string> = {
      tipo_documento_comprador:      'Tipo de Documento',
      documento:                     'Número de Documento',
      nombres_completos:             'Nombres Completos',
      apellidos_completos:           'Apellidos Completos',
      indicativo_celular_comprador:  'Indicativo Celular',
      numero_celular_comprador:      'Teléfono Celular',
      correo_electronico_comprador:  'Correo Electrónico',
    };
    return Object.entries(labels)
      .filter(([key]) => this.formulario.get(key)?.invalid)
      .map(([, label]) => label);
  }

  guardarCliente() {
    if (this.formulario.invalid) {
      this.marcarControlesComoTocados();
      const faltantes = this.getCamposFaltantes();
      const lista = faltantes.map(f => `• ${f}`).join('<br>');
      Swal.fire({
        title: 'Campos incompletos',
        html: `Por favor completa los siguientes campos:<br><br>${lista}`,
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#8b5cf6',
      });
      return;
    }

    const formValue = this.formulario.getRawValue();
    const clienteData = {
      ...formValue,
      nombres_completos: this.toTitleCase(formValue.nombres_completos),
      apellidos_completos: this.toTitleCase(formValue.apellidos_completos),
      etiquetas: Array.isArray(formValue.etiquetas)
        ? formValue.etiquetas.map((e: string) => this.toTitleCase(e))
        : formValue.etiquetas,
      numero_celular_comprador: Number(formValue.numero_celular_comprador),
      numero_celular_whatsapp: formValue.numero_celular_whatsapp
        ? Number(formValue.numero_celular_whatsapp)
        : null,
    };

    if (this.isEdit) {
      this.ejecutarEdicion(clienteData);
    } else {
      this.verificarYCrearCliente(clienteData);
    }
  }

  private ejecutarEdicion(clienteData: any) {
    const payload = { ...clienteData, cd: this.clienteData.cd || this.clienteData.id };

    this.maestroService.editClient(payload).subscribe({
      next: () => {
        const doc = { documento: payload.documento };
        this.maestroService.getClientByDocument(doc).subscribe({
          next: (clienteActualizado: any) => {
            Swal.fire({
              title: '¡Cliente actualizado!',
              text: `${clienteActualizado.nombres_completos} ${clienteActualizado.apellidos_completos || ''} fue actualizado exitosamente.`,
              icon: 'success',
              timer: 2500,
              timerProgressBar: true,
              showConfirmButton: false,
              toast: true,
              position: 'top-end'
            });
            this.activeModal.close({ cliente: clienteActualizado, action: 'updated' });
          },
          error: () => {
            this.activeModal.close({ cliente: payload, action: 'updated' });
          }
        });
      },
      error: () => {
        Swal.fire("Error", "Ocurrió un error al actualizar el cliente", "error");
      },
    });
  }

  private verificarYCrearCliente(clienteData: any) {
    this.maestroService.getClientByDocument({ documento: clienteData.documento }).subscribe({
      next: (res: any) => {
        const esArrayVacio = Array.isArray(res) && res.length === 0;
        if (res && !esArrayVacio) {
          const clienteEncontrado = Array.isArray(res) ? res[0] : res;
          Swal.fire({
            title: "Cliente ya registrado",
            html: `<p>El documento <strong>${clienteData.documento}</strong> ya está registrado.</p>
                   <p><strong>Cliente:</strong> ${clienteEncontrado.nombres_completos} ${clienteEncontrado.apellidos_completos || ""}</p>`,
            icon: "info",
            confirmButtonText: "Entendido",
          }).then(() => {
            this.activeModal.close({ cliente: clienteEncontrado, action: 'existing_found' });
          });
        } else {
          this.crearCliente(clienteData);
        }
      },
      error: () => this.crearCliente(clienteData),
    });
  }

  private crearCliente(clienteData: any) {
    this.maestroService.createClient(clienteData).subscribe({
      next: (response: any) => {
        const clienteCreado = response.cliente || response || clienteData;
        Swal.fire({
          title: '¡Cliente creado!',
          text: `${clienteCreado.nombres_completos || clienteData.nombres_completos} fue guardado exitosamente.`,
          icon: 'success',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        this.activeModal.close({ cliente: { ...clienteData, ...clienteCreado }, action: 'created' });
      },
      error: () => {
        Swal.fire("Error", "Ocurrió un error al crear el cliente", "error");
      },
    });
  }

  private marcarControlesComoTocados() {
    Object.values(this.formulario.controls).forEach(c => c.markAsTouched());
  }
}
