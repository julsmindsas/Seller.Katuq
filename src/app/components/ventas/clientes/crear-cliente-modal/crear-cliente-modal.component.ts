import { Component, Input, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import { CorporateClientsService } from "../services/corporate-clients.service";
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
  /**
   * Destino de persistencia. 'client' (default) usa la colección de clientes
   * habituales; 'corporate' persiste en la lista de clientes corporativos que
   * alimenta el CRM (spec 011). El resto del formulario es idéntico.
   */
  @Input() target: 'client' | 'corporate' = 'client';

  formulario: FormGroup;
  indicativos: any[] = [];
  clientTypes: { label: string; value: string }[] = [];
  clientTagsCatalog: ClientTag[] = [];
  etiquetasSeleccionadas: string[] = [];
  tipoDocSeleccionado: string = 'CC';

  readonly tipoDocOptions = [
    { label: 'CC - Cédula de ciudadanía', value: 'CC' },
    { label: 'NIT', value: 'NIT' },
    { label: 'TI - Tarjeta de identidad', value: 'TI' },
    { label: 'RC - Registro civil', value: 'RC' },
    { label: 'CE - Cédula de extranjería', value: 'CE' },
    { label: 'TE - Tarjeta de extranjería', value: 'TE' },
    { label: 'PA - Pasaporte', value: 'PA' },
    { label: 'DIE - Doc. identificación extranjero', value: 'DIE' },
    { label: 'PEP - Permiso Especial de Permanencia', value: 'PEP' },
    { label: 'PPT - Permiso por Protección Temporal', value: 'PPT' },
    { label: 'NIT_EXT - NIT de otro país', value: 'NIT_EXT' },
    { label: 'NUIP', value: 'NUIP' },
  ];

  constructor(
    private fb: FormBuilder,
    private maestroService: MaestroService,
    private corpService: CorporateClientsService,
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

    // Diferir al siguiente tick para que el template (y los [options] del p-dropdown)
    // estén renderizados antes de intentar setear el valor seleccionado
    setTimeout(() => {
      if (this.clienteData && this.isEdit) {
        this.formulario.patchValue(this.clienteData);

        // Legacy: algunos clientes guardan el nombre completo en `nombres_completos`
        // con `apellidos_completos` vacío. Separar para que cada campo muestre lo suyo.
        const split = this.splitNombreApellido(
          this.clienteData.nombres_completos,
          this.clienteData.apellidos_completos,
        );
        this.formulario.controls['nombres_completos'].setValue(split.nombres);
        this.formulario.controls['apellidos_completos'].setValue(split.apellidos);

        this.etiquetasSeleccionadas = Array.isArray(this.clienteData.etiquetas)
          ? [...this.clienteData.etiquetas]
          : [];
        this.formulario.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);

        // tipo_documento: normaliza el valor guardado (puede venir legacy como
        // "CC-NIT" o texto completo "Cédula de ciudadanía") al código real del
        // catálogo, para que el <select> muestre el tipo correcto del cliente.
        const tipoDoc = this.normalizeTipoDoc(this.clienteData.tipo_documento_comprador);
        this.tipoDocSeleccionado = tipoDoc;
        this.formulario.controls['tipo_documento_comprador'].setValue(tipoDoc);
        // En edición el tipo de documento no es editable (igual que el número).
        // El guardado usa getRawValue(), así que el valor se conserva.
        this.formulario.controls['tipo_documento_comprador'].disable({ emitEvent: false });

        // Normalizar indicativos a string (pueden venir como número desde Firestore)
        this.formulario.controls['indicativo_celular_comprador'].setValue(
          this.clienteData.indicativo_celular_comprador != null
            ? String(this.clienteData.indicativo_celular_comprador) : '57'
        );
        this.formulario.controls['indicativo_celular_whatsapp'].setValue(
          this.clienteData.indicativo_celular_whatsapp != null
            ? String(this.clienteData.indicativo_celular_whatsapp) : '57'
        );

        // Coercionar números de celular a string
        if (this.clienteData.numero_celular_comprador != null) {
          this.formulario.controls['numero_celular_comprador'].setValue(
            String(this.clienteData.numero_celular_comprador)
          );
        }
        if (this.clienteData.numero_celular_whatsapp != null) {
          this.formulario.controls['numero_celular_whatsapp'].setValue(
            String(this.clienteData.numero_celular_whatsapp)
          );
        }

        if (!this.clienteData.indicativo_celular_whatsapp && !this.clienteData.numero_celular_whatsapp) {
          this.replicarWhatsApp({ target: { checked: true } });
        }
      } else {
        this.tipoDocSeleccionado = 'CC';
        this.formulario.reset();
        this.formulario.patchValue({
          tipo_documento_comprador: "CC",
          documento: this.documentoPrellenado || "",
          indicativo_celular_comprador: "57",
          indicativo_celular_whatsapp: "57",
          estado: "activo",
        });
      }
    });
  }

  onTipoDocChange(value: string): void {
    this.tipoDocSeleccionado = value;
    this.formulario.controls['tipo_documento_comprador'].setValue(value);
  }

  /**
   * Separa nombre completo en nombres + apellidos cuando los apellidos vienen
   * vacíos (datos legacy). Si ya hay apellidos, NO toca nada.
   * Heurística Colombia: 2 palabras → 1 nombre + 1 apellido; 3+ → 2 apellidos al final.
   */
  private splitNombreApellido(nombresRaw: any, apellidosRaw: any): { nombres: string; apellidos: string } {
    const nombres = String(nombresRaw || '').trim().replace(/\s+/g, ' ');
    const apellidos = String(apellidosRaw || '').trim();
    if (apellidos) return { nombres, apellidos }; // ya separados → respetar
    const words = nombres ? nombres.split(' ') : [];
    if (words.length <= 1) return { nombres, apellidos: '' };
    const nApellidos = words.length === 2 ? 1 : 2;
    return {
      nombres: words.slice(0, words.length - nApellidos).join(' '),
      apellidos: words.slice(words.length - nApellidos).join(' '),
    };
  }

  /**
   * Convierte el valor guardado (que puede ser un código válido, un combinado
   * legacy "CC-NIT" o el texto completo "Cédula de ciudadanía") al código del
   * catálogo. Cae a 'CC' solo cuando no se puede determinar.
   */
  private normalizeTipoDoc(raw: any): string {
    if (raw === null || raw === undefined || raw === '') return 'CC';
    const v = String(raw).trim();
    // Ya es un código válido del catálogo
    if (this.tipoDocOptions.some(o => o.value === v)) return v;
    // Combinado legacy → cédula por defecto
    if (v.toUpperCase() === 'CC-NIT') return 'CC';
    // Variantes en texto completo
    const lower = v.toLowerCase();
    if (lower.includes('extranjer')) {
      return (lower.includes('cédula') || lower.includes('cedula')) ? 'CE' : 'DIE';
    }
    if (lower.includes('cédula de ciudad') || lower.includes('cedula de ciudad')) return 'CC';
    if (lower.includes('tarjeta de identidad')) return 'TI';
    if (lower.includes('registro civil')) return 'RC';
    if (lower.includes('pasaporte')) return 'PA';
    if (lower.includes('permiso especial')) return 'PEP';
    if (lower.includes('protección temporal') || lower.includes('proteccion temporal')) return 'PPT';
    if (lower.includes('nit')) return 'NIT';
    if (lower.includes('cédula') || lower.includes('cedula')) return 'CC';
    return 'CC';
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

  // ── Persistencia según target (client | corporate) ──────────────────
  private lookupByDocument(documento: string) {
    return this.target === 'corporate'
      ? this.corpService.getByDocument(documento)
      : this.maestroService.getClientByDocument({ documento });
  }

  private persistCreate(clienteData: any) {
    return this.target === 'corporate'
      ? this.corpService.crear(clienteData)
      : this.maestroService.createClient(clienteData);
  }

  private persistEdit(payload: any) {
    return this.target === 'corporate'
      ? this.corpService.editar(payload)
      : this.maestroService.editClient(payload);
  }

  private ejecutarEdicion(clienteData: any) {
    const payload = { ...clienteData, cd: this.clienteData.cd || this.clienteData.id };

    this.persistEdit(payload).subscribe({
      next: () => {
        this.lookupByDocument(payload.documento).subscribe({
          next: (resultadoLookup: any) => {
            const clienteActualizado = Array.isArray(resultadoLookup)
              ? (resultadoLookup[0] || payload)
              : (resultadoLookup || payload);
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
    this.lookupByDocument(clienteData.documento).subscribe({
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
    this.persistCreate(clienteData).subscribe({
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
