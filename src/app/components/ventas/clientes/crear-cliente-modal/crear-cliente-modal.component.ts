import { Component, Input, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { map } from "rxjs/operators";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import { CorporateClientsService } from "../services/corporate-clients.service";
import { CrmService } from "../../../crm/services/crm.service";
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
   * Datos iniciales al CREAR (en edición se usa `clienteData`). Pensado para
   * promover un lead del CRM a cliente: se precarga lo que ya se sabe y el
   * usuario solo completa lo que falte (D-111). Acepta la forma cliente.
   */
  @Input() prefill: any = null;
  /**
   * `false` → el modal NO guarda: valida y devuelve el valor con
   * `action: 'draft'`, y el caller decide. Lo usa la cotización de un lead
   * (D-111): su cliente es una COPIA embebida que aún no existe en `clients`,
   * así que editarla no debe crear ni actualizar nada.
   */
  @Input() persist: boolean = true;
  /**
   * Destino de persistencia. 'client' (default) usa la colección de clientes
   * habituales; 'corporate' persiste vía CRM (corporate_clients + crm_pipeline,
   * spec 011). El formulario es idéntico en ambos casos (D-110).
   */
  @Input() target: 'client' | 'corporate' = 'client';
  /** Encabezado del modal. Por defecto habla de "Cliente". */
  @Input() title: string = "";
  /**
   * Catálogo de etiquetas a mostrar. Si el caller no lo pasa, se cargan las de
   * clientes. Corporativos tiene catálogo PROPIO y lo inyecta por aquí, para no
   * mezclar los dos catálogos (spec 011).
   */
  @Input() tagsCatalog: ClientTag[] | null = null;

  formulario: FormGroup;
  indicativos: any[] = [];
  /** "Cliente" | "Corporativo" — solo afecta textos, no los campos. */
  get entityLabel(): string {
    return this.target === 'corporate' ? 'Corporativo' : 'Cliente';
  }
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
    private crmService: CrmService,
    public activeModal: NgbActiveModal,
    private infoIndicativos: InfoIndicativos,
    private clientConfig: ClientConfigService,
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.indicativos = this.infoIndicativos.datos;
    if (this.tagsCatalog) {
      this.clientTagsCatalog = this.tagsCatalog;
    } else {
      this.clientConfig.loadClientTags().subscribe((tags) => {
        this.clientTagsCatalog = tags;
      });
    }
    this.maestroService.consultarTiposClienteActivos().subscribe({
      next: (tipos: any) => {
        this.clientTypes = Array.isArray(tipos)
          ? tipos.filter((t: any) => t.active !== false).map((t: any) => ({ label: t.nombre, value: t.nombre }))
          : [];
        // Preseleccionar el tipo de cliente actual UNA VEZ cargadas las opciones
        // (evita el race con el setTimeout de abajo, que corre antes de esta
        // respuesta HTTP). El tipo puede venir en `tipoCliente` (string) o, en
        // clientes legacy, en `categoria.nombre`.
        const origen = this.isEdit ? this.clienteData : this.prefill;
        if (origen) {
          const tipoActual = origen.tipoCliente || origen.categoria?.nombre || '';
          if (tipoActual) {
            this.formulario.controls['tipoCliente'].setValue(tipoActual);
          }
        }
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
          creditLimit: 0,
          payTermDays: 0,
        });

        // Precarga al crear (D-111): sobre los defaults, sin pisarlos con vacíos.
        if (this.prefill) {
          const limpio: any = {};
          Object.entries(this.prefill).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== "" && this.formulario.get(k)) limpio[k] = v;
          });
          this.formulario.patchValue(limpio);

          const tipoDoc = this.normalizeTipoDoc(this.prefill.tipo_documento_comprador);
          this.tipoDocSeleccionado = tipoDoc;
          this.formulario.controls['tipo_documento_comprador'].setValue(tipoDoc);

          this.etiquetasSeleccionadas = Array.isArray(this.prefill.etiquetas)
            ? [...this.prefill.etiquetas]
            : [];
          this.formulario.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);

          // Marca los campos faltantes para que el usuario vea de una qué debe
          // completar, en vez de descubrirlo al presionar Guardar.
          this.marcarControlesComoTocados();
        }
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
      // Spec 014 (CxC): cupo de crédito en COP (0 = sin cupo) y plazo de pago
      // en días (0 = contado). Los usa el aging de Cartera (payDueDate =
      // fechaEntrega + payTermDays).
      creditLimit: [0, [Validators.min(0)]],
      payTermDays: [0, [Validators.min(0)]],
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

    // Modo borrador: sin persistencia, el caller se queda con el valor.
    if (!this.persist) {
      this.activeModal.close({ cliente: clienteData, action: 'draft' });
      return;
    }

    if (this.isEdit) {
      this.ejecutarEdicion(clienteData);
    } else {
      this.verificarYCrearCliente(clienteData);
    }
  }

  // ── Persistencia según target (client | corporate) ──────────────────
  //
  // Corporativos NO usa /v1/corporate-clients/create: esa ruta solo escribe la
  // entidad, y el corporativo quedaría sin su doc en `crm_pipeline` (tarjeta
  // huérfana en el kanban). Persiste vía CRM con forceCorporate, que escribe
  // ambos. La búsqueda por documento sí usa corpService (es solo lectura).
  private lookupByDocument(documento: string) {
    return this.target === 'corporate'
      ? this.corpService.getByDocument(documento)
      : this.maestroService.getClientByDocument({ documento });
  }

  /**
   * CrmService atrapa los errores HTTP y emite `{success:false}` por el canal de
   * éxito. Sin esto, un fallo mostraría "¡Cliente creado!" y cerraría el modal.
   */
  private failOnCrmError<T>(source: any) {
    return source.pipe(
      map((res: any) => {
        if (res && res.success === false) throw new Error('crm_persist_failed');
        return res as T;
      }),
    );
  }

  private persistCreate(clienteData: any) {
    if (this.target !== 'corporate') return this.maestroService.createClient(clienteData);
    return this.failOnCrmError<any>(this.crmService.createLead(clienteData, true)).pipe(
      // Normaliza la respuesta del CRM ({success, data:{entityId}}) a la forma
      // que espera crearCliente().
      map((res: any) => ({ cliente: { ...clienteData, cd: res?.data?.entityId } })),
    );
  }

  private persistEdit(payload: any) {
    if (this.target !== 'corporate') return this.maestroService.editClient(payload);
    return this.failOnCrmError<any>(this.crmService.updateLead(payload.cd, payload, true));
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
              title: `¡${this.entityLabel} actualizado!`,
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
        Swal.fire("Error", `Ocurrió un error al actualizar el ${this.entityLabel.toLowerCase()}`, "error");
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
            title: `${this.entityLabel} ya registrado`,
            html: `<p>El documento <strong>${clienteData.documento}</strong> ya está registrado.</p>
                   <p><strong>${this.entityLabel}:</strong> ${clienteEncontrado.nombres_completos} ${clienteEncontrado.apellidos_completos || ""}</p>`,
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
          title: `¡${this.entityLabel} creado!`,
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
        Swal.fire("Error", `Ocurrió un error al crear el ${this.entityLabel.toLowerCase()}`, "error");
      },
    });
  }

  private marcarControlesComoTocados() {
    Object.values(this.formulario.controls).forEach(c => c.markAsTouched());
  }
}
