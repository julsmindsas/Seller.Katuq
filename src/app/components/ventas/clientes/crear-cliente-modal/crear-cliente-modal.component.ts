import { Component, EventEmitter, Input, OnChanges, OnInit, Optional, Output, SimpleChanges } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { map } from "rxjs/operators";
import { throwError } from "rxjs";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import { CorporateClientsService } from "../services/corporate-clients.service";
import { CrmService } from "../../../crm/services/crm.service";
import { ClientConfigService, ClientTag } from "../services/client-config.service";
import { InfoIndicativos } from "../../../../../Mock/indicativosPais";
import { DireccionEstructuradaComponent } from "../../entrega/direccion-estructurada/direccion-estructurada.component";
import { DaneCodesService } from "../../../../shared/services/dane-codes.service";
import { alMenosUnTelefono, PATRON_TELEFONO_FIJO } from "../cliente-telefonos.validator";
import { EntregaCliente, esEntregaCompleta, normalizarEntrega, normalizarEntregas, resumenEntrega } from "../../../../shared/utils/client-delivery";
import { normalizeZonasCobro, zonaCubreCiudad } from "../../../../shared/util/zona-cobro.util";
import Swal from "sweetalert2";
import { ContactoCliente } from "../../modelo/pedido";
import { mayusculaInicial } from '../../../../shared/utils/mayuscula-inicial';

/** Resultado que el formulario entrega a quien lo abrió (modal: `close()`, inline: `guardado`). */
export interface ResultadoFormularioCliente {
  cliente: any;
  action: 'created' | 'updated' | 'existing_found' | 'draft';
}

/** Perfil de facturación electrónica (`clients.datosFacturacionElectronica[]`). */
export interface PerfilFacturacion {
  alias: string;
  nombres: string;
  tipoDocumento: string;
  documento: string;
  correo: string;
  direccion?: string;
  ciudad?: string;
  predeterminado?: boolean;
  [extra: string]: any;
}

/** Nota del cliente (`clients.notas[]`). */
export interface NotaCliente {
  fecha: string;
  nota: string;
  usuario?: string;
}

/**
 * Ticket 1166: nombre de usuario de WhatsApp, sin `@`. Ticket 1206 (ALMACEN
 * BOMBAS): muchos comercios guardan aquí el nombre del contacto como aparece en
 * WhatsApp ("María Fernanda Ríos"), así que se aceptan espacios y tildes.
 */
const PATRON_WHATSAPP_USERNAME = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]{1,59}$/u;

@Component({
  selector: "app-crear-cliente-modal",
  templateUrl: "./crear-cliente-modal.component.html",
  styleUrls: ["./crear-cliente-modal.component.scss"],
})
export class CrearClienteModalComponent implements OnInit, OnChanges {
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
  /** Optional caller guard: do not save into a different commerce after a session change. */
  @Input() canPersist: () => boolean = () => true;
  /**
   * Destino de persistencia. 'client' (default) usa la colección de clientes
   * habituales; 'corporate' persiste vía CRM (corporate_clients + crm_pipeline,
   * spec 011). El formulario es idéntico en ambos casos (D-110).
   */
  @Input() target: 'client' | 'corporate' = 'client';
  /** Encabezado del modal. Por defecto habla de "Cliente". */
  @Input() title: string = "";
  /** Textos opcionales del correo; conserva el mismo campo persistido en Clientes. */
  @Input() emailLabel: string = "Correo Electrónico";
  @Input() emailHint: string = "";
  /**
   * Catálogo de etiquetas a mostrar. Si el caller no lo pasa, se cargan las de
   * clientes. Corporativos tiene catálogo PROPIO y lo inyecta por aquí, para no
   * mezclar los dos catálogos (spec 011).
   */
  @Input() tagsCatalog: ClientTag[] | null = null;
  /**
   * D-406: el mismo formulario sirve dentro de un modal (`NgbModal.open`, como
   * hasta ahora) o incrustado en una pantalla (`<app-crear-cliente-modal
   * modo="inline">`). En inline no hay `NgbActiveModal`: el resultado sale por
   * `guardado` y "cancelar" por `cancelado`.
   */
  @Input() modo: 'modal' | 'inline' = 'modal';
  @Output() guardado = new EventEmitter<ResultadoFormularioCliente>();
  @Output() cancelado = new EventEmitter<void>();

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

  // ── Pestañas (D-406) ────────────────────────────────────────────────
  /** Índice de la pestaña activa: 0 Contacto, 1 Contactos, 2 Entrega, 3 Facturación, 4 Notas. */
  pestana = 0;
  /** Las pestañas extra solo aplican a clientes habituales que se guardan (corporativos van por CRM; el borrador no persiste). */
  get permiteExtras(): boolean {
    return this.target === 'client' && this.persist;
  }
  /** Compatibilidad con la plantilla anterior (ticket 1046). */
  get permiteDireccion(): boolean {
    return this.permiteExtras;
  }

  // ── Entrega (varias direcciones) ────────────────────────────────────
  entregas: EntregaCliente[] = [];
  /** Dirección que se está escribiendo o editando. Null = ninguna abierta. */
  entregaEditando: EntregaCliente | null = null;
  /** Índice en `entregas` si se edita una existente; -1 si es nueva. */
  entregaIndex = -1;
  /** Zonas de cobro de la empresa, cargadas la primera vez que se abre Entrega. */
  private zonasCobro: any[] | null = null;
  zonasParaCiudad: any[] = [];

  // ── Facturación (varios perfiles) ───────────────────────────────────
  perfiles: PerfilFacturacion[] = [];
  perfilEditando: PerfilFacturacion | null = null;
  perfilIndex = -1;

  // ── Contactos (varias personas, ticket 1327) ────────────────────────
  contactos: ContactoCliente[] = [];
  contactoEditando: ContactoCliente | null = null;
  contactoIndex = -1;

  // ── Notas ───────────────────────────────────────────────────────────
  notas: NotaCliente[] = [];
  notaNueva = '';

  /**
   * Qué arreglos tocó el usuario. `clients/edit` hace un merge superficial, así
   * que al editar solo se envía el arreglo que cambió: si la pantalla que abrió
   * el formulario trajo el cliente sin alguno de ellos, no se borra por omisión.
   */
  private tocado = { entrega: false, facturacion: false, notas: false, contactos: false };

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
    @Optional() public activeModal: NgbActiveModal | null,
    private infoIndicativos: InfoIndicativos,
    private clientConfig: ClientConfigService,
    private modalService: NgbModal,
    private daneCodes: DaneCodesService,
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.indicativos = this.infoIndicativos.datos;
    this.cargarArreglos(this.isEdit ? this.clienteData : this.prefill);
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
        this.cargarEnFormulario(this.clienteData);
      } else {
        this.reiniciarParaCrear();
      }
    });
  }

  /**
   * En modo inline la pantalla puede cambiar `clienteData` / `isEdit` con el
   * componente ya creado (elegir otro resultado del buscador, pasar de crear a
   * editar). Se recarga igual que al abrir; el modal no pasa por aquí porque
   * recibe sus entradas antes del primer ciclo.
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Documento buscado que no existe: se precarga para crearlo (solo al crear).
    const doc = changes['documentoPrellenado'];
    if (doc && !doc.firstChange && this.formulario && !this.isEdit && this.documentoPrellenado) {
      this.formulario.controls['documento'].setValue(this.documentoPrellenado);
    }
    const cambio = changes['clienteData'] || changes['isEdit'];
    if (!cambio || cambio.firstChange || !this.formulario) return;
    this.cargarArreglos(this.isEdit ? this.clienteData : this.prefill);
    if (this.clienteData && this.isEdit) {
      this.cargarEnFormulario(this.clienteData);
    } else {
      this.reiniciarParaCrear();
    }
  }

  /** Carga un cliente existente en el formulario (edición o "ya existe"). */
  private cargarEnFormulario(cliente: any): void {
    this.formulario.patchValue(cliente);

    // Legacy: algunos clientes guardan el nombre completo en `nombres_completos`
    // con `apellidos_completos` vacío. Separar para que cada campo muestre lo suyo.
    // Ticket 1083: una empresa (NIT) no se parte: su razón social va entera en nombres.
    const tipoGuardado = this.normalizeTipoDoc(cliente.tipo_documento_comprador);
    const split = tipoGuardado === 'NIT' || tipoGuardado === 'NIT_EXT'
      ? { nombres: String(cliente.nombres_completos || '').trim(), apellidos: String(cliente.apellidos_completos || '').trim() }
      : this.splitNombreApellido(cliente.nombres_completos, cliente.apellidos_completos);
    this.formulario.controls['nombres_completos'].setValue(split.nombres);
    this.formulario.controls['apellidos_completos'].setValue(split.apellidos);

    this.etiquetasSeleccionadas = this.sinEtiquetasRepetidas(Array.isArray(cliente.etiquetas)
      ? [...cliente.etiquetas]
      : []);
    this.formulario.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);

    // tipo_documento: normaliza el valor guardado (puede venir legacy como
    // "CC-NIT" o texto completo "Cédula de ciudadanía") al código real del
    // catálogo, para que el <select> muestre el tipo correcto del cliente.
    const tipoDoc = this.normalizeTipoDoc(cliente.tipo_documento_comprador);
    this.tipoDocSeleccionado = tipoDoc;
    this.formulario.controls['tipo_documento_comprador'].setValue(tipoDoc);
    // En edición el tipo de documento no es editable (igual que el número).
    // El guardado usa getRawValue(), así que el valor se conserva.
    this.formulario.controls['tipo_documento_comprador'].disable({ emitEvent: false });

    // Normalizar indicativos a string (pueden venir como número desde Firestore)
    this.formulario.controls['indicativo_celular_comprador'].setValue(
      cliente.indicativo_celular_comprador != null ? String(cliente.indicativo_celular_comprador) : '57'
    );
    this.formulario.controls['indicativo_celular_whatsapp'].setValue(
      cliente.indicativo_celular_whatsapp != null ? String(cliente.indicativo_celular_whatsapp) : '57'
    );

    // Coercionar números de celular a string
    if (cliente.numero_celular_comprador != null) {
      this.formulario.controls['numero_celular_comprador'].setValue(String(cliente.numero_celular_comprador));
    }
    if (cliente.telefono_fijo != null) {
      this.formulario.controls['telefono_fijo'].setValue(String(cliente.telefono_fijo));
    }
    if (cliente.numero_celular_whatsapp != null) {
      this.formulario.controls['numero_celular_whatsapp'].setValue(String(cliente.numero_celular_whatsapp));
    }
    this.formulario.controls['whatsappUsername'].setValue(this.limpiarUsername(cliente.whatsappUsername));

    if (!cliente.indicativo_celular_whatsapp && !cliente.numero_celular_whatsapp) {
      this.replicarWhatsApp({ target: { checked: true } });
    }
  }

  /** Valores por defecto para crear (más la precarga D-111 si la hay). */
  private reiniciarParaCrear(): void {
    this.tipoDocSeleccionado = 'CC';
    this.formulario.reset();
    this.formulario.controls['tipo_documento_comprador'].enable({ emitEvent: false });
    this.formulario.patchValue({
      tipo_documento_comprador: "CC",
      documento: this.documentoPrellenado || "",
      indicativo_celular_comprador: "57",
      indicativo_celular_whatsapp: "57",
      estado: "activo",
      creditLimit: 0,
      payTermDays: 0,
      whatsappUsername: "",
    });
    this.etiquetasSeleccionadas = [];
    this.formulario.controls['etiquetas'].setValue([]);

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

      this.etiquetasSeleccionadas = this.sinEtiquetasRepetidas(Array.isArray(this.prefill.etiquetas)
        ? [...this.prefill.etiquetas]
        : []);
      this.formulario.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);

      // Marca los campos faltantes para que el usuario vea de una qué debe
      // completar, en vez de descubrirlo al presionar Guardar.
      this.marcarControlesComoTocados();
    }
  }

  /** Entregas, perfiles de facturación y notas tal como vienen del cliente (o de la precarga). */
  private cargarArreglos(origen: any): void {
    this.entregas = normalizarEntregas(origen?.datosEntrega);
    this.perfiles = Array.isArray(origen?.datosFacturacionElectronica)
      ? origen.datosFacturacionElectronica.filter((p: any) => p && typeof p === 'object').map((p: any) => ({ ...p }))
      : [];
    this.notas = Array.isArray(origen?.notas)
      ? origen.notas.filter((n: any) => n && typeof n === 'object').map((n: any) => ({ ...n }))
      : [];
    this.contactos = Array.isArray(origen?.contactos)
      ? origen.contactos.filter((c: any) => c && typeof c === 'object').map((c: any) => ({ ...c }))
      : [];
    this.ordenarNotas();
    this.entregaEditando = null;
    this.perfilEditando = null;
    this.contactoEditando = null;
    this.notaNueva = '';
    this.tocado = { entrega: false, facturacion: false, notas: false, contactos: false };
    this.pestana = 0;
  }

  /**
   * Modo inline: vuelve a dejar el formulario como recién abierto para crear
   * otro cliente (el botón "Limpiar" / "Nuevo cliente" de las pantallas).
   */
  limpiar(): void {
    this.isEdit = false;
    this.clienteData = null;
    this.cargarArreglos(this.prefill);
    this.reiniciarParaCrear();
  }

  onTipoDocChange(value: string): void {
    this.tipoDocSeleccionado = value;
    this.formulario.controls['tipo_documento_comprador'].setValue(value);
  }

  /** Ticket 1083: con NIT (persona jurídica) no hay apellidos, solo razón social. */
  get esPersonaJuridica(): boolean {
    const tipo = this.formulario?.getRawValue?.()?.tipo_documento_comprador;
    return tipo === 'NIT' || tipo === 'NIT_EXT';
  }

  /** Ticket 1083: "Apellidos" es obligatorio solo para persona natural. */
  private ajustarApellidosSegunTipoDoc(): void {
    const apellidos = this.formulario?.controls?.['apellidos_completos'];
    if (!apellidos) return;
    apellidos.setValidators(this.esPersonaJuridica ? null : Validators.required);
    apellidos.updateValueAndValidity({ emitEvent: false });
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
      // Ticket 1050: celular o fijo, al menos uno (validador del grupo).
      numero_celular_comprador: ["", [Validators.pattern(/^[0-9]{10}$/)]],
      telefono_fijo: ["", [Validators.pattern(PATRON_TELEFONO_FIJO)]],
      correo_electronico_comprador: ["", [Validators.required, Validators.email]],
      indicativo_celular_whatsapp: ["57"],
      numero_celular_whatsapp: [""],
      whatsappSameAsPhone: [false],
      // Ticket 1166: usuario de WhatsApp (sin @). Opcional.
      whatsappUsername: ["", [Validators.pattern(PATRON_WHATSAPP_USERNAME)]],
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
    }, { validators: alMenosUnTelefono });

    // Ticket 1083: con NIT, "Apellidos" deja de ser obligatorio.
    this.formulario.controls['tipo_documento_comprador'].valueChanges.subscribe(() => this.ajustarApellidosSegunTipoDoc());
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

  /** Ticket 1166: el usuario se guarda sin `@` ni espacios alrededor (ticket 1206: ni espacios repetidos). */
  private limpiarUsername(raw: any): string {
    return String(raw || '').trim().replace(/^@+/, '').replace(/\s+/g, ' ');
  }

  onUsernameBlur(): void {
    const c = this.formulario.controls['whatsappUsername'];
    c.setValue(this.limpiarUsername(c.value));
  }

  // Ticket 1100: el catálogo trae "CONTADO" y el cliente guarda "Contado" (se
  // guarda en formato título). Comparar exacto hacía que la etiqueta nunca se
  // viera marcada, que marcarla la repitiera y que desmarcarla no la quitara.
  private normalizarEtiqueta(nombre: any): string {
    return String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  }

  private sinEtiquetasRepetidas(etiquetas: string[]): string[] {
    const vistas = new Set<string>();
    return etiquetas.filter((e) => {
      const clave = this.normalizarEtiqueta(e);
      if (!clave || vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
  }

  toggleEtiqueta(nombre: string): void {
    const clave = this.normalizarEtiqueta(nombre);
    if (this.tieneEtiqueta(nombre)) {
      this.etiquetasSeleccionadas = this.etiquetasSeleccionadas.filter((e) => this.normalizarEtiqueta(e) !== clave);
    } else {
      this.etiquetasSeleccionadas.push(nombre);
    }
    this.formulario.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);
  }

  tieneEtiqueta(nombre: string): boolean {
    const clave = this.normalizarEtiqueta(nombre);
    return this.etiquetasSeleccionadas.some((e) => this.normalizarEtiqueta(e) === clave);
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
      violet: '#5b21b6', green: '#15803d', blue: '#1E6FD9',
      amber: '#b45309', red: '#b91c1c', gray: '#5a5470',
    };
    return map[tag.color] || '#5a5470';
  }

  private toTitleCase(str: string): string {
    return mayusculaInicial(str); // Ticket 1340: respeta las tildes («Gómez», no «GóMez»)
  }

  private getCamposFaltantes(): string[] {
    const labels: Record<string, string> = {
      tipo_documento_comprador:      'Tipo de Documento',
      documento:                     'Número de Documento',
      nombres_completos:             'Nombres Completos',
      apellidos_completos:           'Apellidos Completos',
      indicativo_celular_comprador:  'Indicativo Celular',
      numero_celular_comprador:      'Teléfono Celular (10 dígitos)',
      telefono_fijo:                 'Teléfono fijo (7 a 10 dígitos)',
      correo_electronico_comprador:  'Correo Electrónico',
      whatsappUsername:              'Usuario de WhatsApp (2 a 60 caracteres: letras, números, espacios, punto o guion)',
    };
    const faltantes = Object.entries(labels)
      .filter(([key]) => this.formulario.get(key)?.invalid)
      .map(([, label]) => label);
    if (this.formulario.hasError('sinTelefono')) faltantes.push('Un teléfono: celular o fijo');
    return faltantes;
  }

  // ── Pestañas: contadores y estado de error ─────────────────────────
  get totalEntregas(): number { return this.entregas.length; }
  get totalPerfiles(): number { return this.perfiles.length; }
  get totalNotas(): number { return this.notas.length; }
  get totalContactos(): number { return this.contactos.length; }

  /** Hay un contacto a medio escribir. */
  get contactoPendiente(): boolean {
    return !!this.contactoEditando && !this.contactoCompleto(this.contactoEditando);
  }

  /** Hay una dirección a medio escribir (bloquea el guardado hasta completarla o descartarla). */
  get entregaPendiente(): boolean {
    return !!this.entregaEditando && !esEntregaCompleta(this.entregaEditando);
  }
  /** Hay un perfil a medio escribir. */
  get perfilPendiente(): boolean {
    return !!this.perfilEditando && !this.perfilCompleto(this.perfilEditando);
  }

  // ── Entrega: varias direcciones (D-406, reemplaza el campo único del ticket 1046) ──
  resumenEntrega(e: any): string { return resumenEntrega(e); }

  nuevaEntrega(): void {
    const fv = this.formulario.getRawValue();
    this.entregaIndex = -1;
    this.entregaEditando = normalizarEntrega({
      nombres: this.toTitleCase(fv.nombres_completos || ''),
      apellidos: this.toTitleCase(fv.apellidos_completos || ''),
      indicativoCel: String(fv.indicativo_celular_comprador || '57'),
      celular: String(fv.numero_celular_comprador || ''),
    });
    this.zonasParaCiudad = [];
  }

  /** Ticket 1209: quien recibe coincide con el contacto del cliente (nombres, apellidos, celular). */
  get entregaIgualCliente(): boolean {
    const e = this.entregaEditando;
    if (!e) return false;
    const fv = this.formulario.getRawValue();
    const igual = (a: any, b: any) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    return !!String(e.nombres || '').trim()
      && igual(e.nombres, fv.nombres_completos)
      && igual(e.apellidos, fv.apellidos_completos)
      && igual(e.celular, fv.numero_celular_comprador);
  }

  /** Marcar copia el contacto del cliente en quien recibe; desmarcar lo deja en blanco para escribir otro. */
  usarDatosClienteEnEntrega(usar: boolean): void {
    if (!this.entregaEditando) return;
    const fv = this.formulario.getRawValue();
    Object.assign(this.entregaEditando, usar
      ? {
          nombres: this.toTitleCase(fv.nombres_completos || ''),
          apellidos: this.toTitleCase(fv.apellidos_completos || ''),
          indicativoCel: String(fv.indicativo_celular_comprador || '57'),
          celular: String(fv.numero_celular_comprador || ''),
        }
      : { nombres: '', apellidos: '', celular: '' });
  }

  editarEntrega(i: number): void {
    this.entregaIndex = i;
    this.entregaEditando = normalizarEntrega(this.entregas[i]);
    this.filtrarZonas();
  }

  eliminarEntrega(i: number): void {
    this.entregas.splice(i, 1);
    this.tocado.entrega = true;
    if (this.entregaIndex === i) this.descartarEntrega();
  }

  descartarEntrega(): void {
    this.entregaEditando = null;
    this.entregaIndex = -1;
  }

  confirmarEntrega(): void {
    if (!this.entregaEditando) return;
    if (!esEntregaCompleta(this.entregaEditando)) {
      Swal.fire({
        title: 'Falta completar la dirección',
        text: 'Escribe la dirección o marca la ubicación, con su ciudad, o descártala si no la vas a registrar ahora.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }
    const lista = normalizarEntrega(this.entregaEditando);
    if (this.entregaIndex >= 0) this.entregas[this.entregaIndex] = lista;
    else this.entregas.push(lista);
    this.tocado.entrega = true;
    this.descartarEntrega();
  }

  abrirModalDireccion(): void {
    if (!this.entregaEditando) this.nuevaEntrega();
    const actual = this.entregaEditando as EntregaCliente;
    const ref = this.modalService.open(DireccionEstructuradaComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
    });
    ref.componentInstance.direccionActual = actual.direccionEntrega || '';
    ref.componentInstance.ciudadActual = actual.ciudad || '';
    // D-417: el punto actual y su origen, para no perder un punto puesto a mano.
    ref.componentInstance.coordenadasActuales = actual.coordenadas || (actual.latitud && actual.longitud ? `${actual.latitud}, ${actual.longitud}` : '');
    ref.componentInstance.fuenteActual = actual.fuenteUbicacion || '';
    ref.componentInstance.enlaceActual = actual.enlaceUbicacion || '';
    ref.result.then(
      (r: any) => {
        if (!r || !this.entregaEditando) return;
        if (typeof r === 'string') {
          this.entregaEditando.direccionEntrega = r;
          return;
        }
        const [lat, lng] = String(r.coordenadas || '').split(',').map((c: string) => c.trim());
        this.entregaEditando = normalizarEntrega({
          ...this.entregaEditando,
          direccionEntrega: r.direccion || '',
          ciudad: r.ciudad || this.entregaEditando.ciudad || '',
          departamento: r.departamento || '',
          pais: 'Colombia',
          coordenadas: r.coordenadas || '',
          latitud: r.latitud || lat || '',
          longitud: r.longitud || lng || '',
          fuenteUbicacion: r.fuenteUbicacion,
          enlaceUbicacion: r.enlaceUbicacion || '',
          especificacionesInternas: r.referencias || this.entregaEditando.especificacionesInternas || '',
        });
        if (!this.entregaEditando.departamento && this.entregaEditando.ciudad) {
          this.completarDepartamento(this.entregaEditando.ciudad);
        }
        this.filtrarZonas();
      },
      () => {},
    );
  }

  /** Solo llena el departamento cuando la ciudad corresponde a UN único departamento. */
  private completarDepartamento(ciudad: string): void {
    const clave = (t: any) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    this.daneCodes.searchMunicipios(ciudad).subscribe((municipios: any[]) => {
      const exactos = (municipios || []).filter((m: any) => clave(m.nombre) === clave(ciudad));
      const departamentos = Array.from(new Set(exactos.map((m: any) => m.departamento)));
      if (departamentos.length === 1 && this.entregaEditando && !this.entregaEditando.departamento) {
        this.entregaEditando.departamento = departamentos[0];
      }
    });
  }

  /** Zonas de cobro que cubren la ciudad de la dirección en edición (spec 011 v2). */
  private filtrarZonas(): void {
    const ciudad = this.entregaEditando?.ciudad || '';
    const aplicar = () => {
      this.zonasParaCiudad = (this.zonasCobro || []).filter((z) => zonaCubreCiudad(z, ciudad));
      if (this.entregaEditando?.zonaCobro && !this.zonasParaCiudad.some((z) => z.nombreZonaCobro === this.entregaEditando?.zonaCobro)) {
        // La zona guardada ya no cubre la ciudad: se deja ver pero sin valor.
        this.zonasParaCiudad = [{ nombreZonaCobro: this.entregaEditando.zonaCobro, valorZonaCobro: this.entregaEditando.valorZonaCobro }, ...this.zonasParaCiudad];
      }
    };
    if (this.zonasCobro) { aplicar(); return; }
    if (!this.permiteExtras) { this.zonasCobro = []; aplicar(); return; }
    this.maestroService.getBillingZone().subscribe({
      next: (zonas: any) => { this.zonasCobro = normalizeZonasCobro(zonas); aplicar(); },
      error: () => { this.zonasCobro = []; aplicar(); },
    });
  }

  onZonaCobroChange(): void {
    if (!this.entregaEditando) return;
    const zona = this.zonasParaCiudad.find((z) => z.nombreZonaCobro === this.entregaEditando?.zonaCobro);
    this.entregaEditando.valorZonaCobro = zona ? zona.valorZonaCobro : '';
  }

  // ── Facturación: varios perfiles ───────────────────────────────────
  perfilCompleto(p: any): boolean {
    return !!(p && String(p.nombres || '').trim() && String(p.tipoDocumento || '').trim() && String(p.documento || '').trim());
  }

  nuevoPerfil(): void {
    this.perfilIndex = -1;
    this.perfilEditando = { alias: '', nombres: '', tipoDocumento: 'NIT', documento: '', correo: '', direccion: '', ciudad: '', predeterminado: this.perfiles.length === 0 };
  }

  /** Copia nombre, tipo y número de documento y correo desde Contacto. */
  usarDatosDelCliente(): void {
    if (!this.perfilEditando) this.nuevoPerfil();
    const fv = this.formulario.getRawValue();
    const p = this.perfilEditando as PerfilFacturacion;
    p.nombres = [fv.nombres_completos, this.esPersonaJuridica ? '' : fv.apellidos_completos].filter(Boolean).join(' ').trim();
    p.tipoDocumento = fv.tipo_documento_comprador || 'CC';
    p.documento = String(fv.documento || '');
    p.correo = fv.correo_electronico_comprador || '';
  }

  editarPerfil(i: number): void {
    this.perfilIndex = i;
    this.perfilEditando = { ...this.perfiles[i] };
  }

  eliminarPerfil(i: number): void {
    const eraPredeterminado = !!this.perfiles[i]?.predeterminado;
    this.perfiles.splice(i, 1);
    if (eraPredeterminado && this.perfiles.length) this.perfiles[0].predeterminado = true;
    this.tocado.facturacion = true;
    if (this.perfilIndex === i) this.descartarPerfil();
  }

  descartarPerfil(): void {
    this.perfilEditando = null;
    this.perfilIndex = -1;
  }

  confirmarPerfil(): void {
    if (!this.perfilEditando) return;
    if (!this.perfilCompleto(this.perfilEditando)) {
      Swal.fire({
        title: 'Falta completar el perfil',
        text: 'Razón social, tipo y número de documento son obligatorios.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }
    const p: PerfilFacturacion = {
      ...this.perfilEditando,
      alias: String(this.perfilEditando.alias || '').trim(),
      nombres: String(this.perfilEditando.nombres || '').trim(),
      documento: String(this.perfilEditando.documento || '').trim(),
      correo: String(this.perfilEditando.correo || '').trim(),
    };
    if (this.perfilIndex >= 0) this.perfiles[this.perfilIndex] = p;
    else this.perfiles.push(p);
    if (p.predeterminado) this.marcarPredeterminado(this.perfilIndex >= 0 ? this.perfilIndex : this.perfiles.length - 1);
    this.tocado.facturacion = true;
    this.descartarPerfil();
  }

  marcarPredeterminado(i: number): void {
    this.perfiles.forEach((p, idx) => { p.predeterminado = idx === i; });
    this.tocado.facturacion = true;
  }

  // ── Contactos: varias personas (ticket 1327) ──────────────────────
  contactoCompleto(c: any): boolean {
    return !!(c && String(c.nombre || '').trim() && (String(c.correo || '').trim() || String(c.celular || '').trim()));
  }

  nuevoContacto(): void {
    this.contactoIndex = -1;
    this.contactoEditando = { id: this.idContacto(), nombre: '', cargo: '', correo: '', celular: '', principal: this.contactos.length === 0 };
  }

  editarContacto(i: number): void {
    this.contactoIndex = i;
    this.contactoEditando = { ...this.contactos[i] };
  }

  eliminarContacto(i: number): void {
    const eraPrincipal = !!this.contactos[i]?.principal;
    this.contactos.splice(i, 1);
    if (eraPrincipal && this.contactos.length) this.contactos[0].principal = true;
    this.tocado.contactos = true;
    if (this.contactoIndex === i) this.descartarContacto();
  }

  descartarContacto(): void {
    this.contactoEditando = null;
    this.contactoIndex = -1;
  }

  confirmarContacto(): void {
    if (!this.contactoEditando) return;
    if (!this.contactoCompleto(this.contactoEditando)) {
      Swal.fire({
        title: 'Falta completar el contacto',
        text: 'El nombre y un correo o un celular son obligatorios.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }
    const c: ContactoCliente = {
      ...this.contactoEditando,
      id: this.contactoEditando.id || this.idContacto(),
      nombre: this.toTitleCase(String(this.contactoEditando.nombre || '').trim()),
      cargo: String(this.contactoEditando.cargo || '').trim(),
      correo: String(this.contactoEditando.correo || '').trim().toLowerCase(),
      celular: String(this.contactoEditando.celular || '').replace(/\s+/g, ''),
    };
    if (this.contactoIndex >= 0) this.contactos[this.contactoIndex] = c;
    else this.contactos.push(c);
    if (c.principal) this.marcarPrincipal(this.contactoIndex >= 0 ? this.contactoIndex : this.contactos.length - 1);
    if (!this.contactos.some((x) => x.principal)) this.contactos[0].principal = true;
    this.tocado.contactos = true;
    this.descartarContacto();
  }

  marcarPrincipal(i: number): void {
    this.contactos.forEach((c, idx) => { c.principal = idx === i; });
    this.tocado.contactos = true;
  }

  private idContacto(): string {
    return `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // ── Notas ──────────────────────────────────────────────────────────
  private usuarioActual(): string {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.email || u?.correo || '';
    } catch { return ''; }
  }

  private ordenarNotas(): void {
    this.notas.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }

  agregarNota(): void {
    const texto = String(this.notaNueva || '').trim();
    if (!texto) return;
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    this.notas.unshift({ fecha, nota: texto, usuario: this.usuarioActual() });
    this.notaNueva = '';
    this.tocado.notas = true;
  }

  eliminarNota(i: number): void {
    this.notas.splice(i, 1);
    this.tocado.notas = true;
  }

  // ── Guardar ────────────────────────────────────────────────────────
  guardarCliente() {
    if (!this.canPersist()) {
      Swal.fire('Comercio cambiado', 'Cierra este formulario y vuelve a abrir Crear cliente en el comercio correcto.', 'warning');
      return;
    }
    this.onUsernameBlur();
    if (this.formulario.invalid) {
      this.pestana = 0;
      this.marcarControlesComoTocados();
      const faltantes = this.getCamposFaltantes();
      const lista = faltantes.map(f => `• ${f}`).join('<br>');
      Swal.fire({
        title: 'Campos incompletos',
        html: `Por favor completa los siguientes campos:<br><br>${lista}`,
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }

    if (this.permiteExtras && this.contactoPendiente) {
      this.pestana = 1;
      Swal.fire({
        title: 'Hay un contacto sin terminar',
        text: 'Complétalo con "Agregar a la lista" o descártalo antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }
    if (this.permiteExtras && this.entregaPendiente) {
      this.pestana = 2;
      Swal.fire({
        title: 'Hay una dirección sin terminar',
        text: 'Complétala con "Agregar a la lista" o descártala antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }
    if (this.permiteExtras && this.perfilPendiente) {
      this.pestana = 3;
      Swal.fire({
        title: 'Hay un perfil de facturación sin terminar',
        text: 'Complétalo con "Agregar a la lista" o descártalo antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      });
      return;
    }
    // Una dirección o un perfil completos pero sin confirmar se toman como confirmados.
    if (this.permiteExtras && this.entregaEditando) this.confirmarEntrega();
    if (this.permiteExtras && this.perfilEditando) this.confirmarPerfil();
    if (this.permiteExtras && this.contactoEditando) this.confirmarContacto();
    if (this.permiteExtras && String(this.notaNueva || '').trim()) this.agregarNota();

    const formValue = this.formulario.getRawValue();
    const clienteData: any = {
      ...formValue,
      nombres_completos: this.toTitleCase(formValue.nombres_completos),
      apellidos_completos: this.toTitleCase(formValue.apellidos_completos),
      etiquetas: Array.isArray(formValue.etiquetas)
        ? this.sinEtiquetasRepetidas(formValue.etiquetas.map((e: string) => this.toTitleCase(e)))
        : formValue.etiquetas,
      numero_celular_comprador: formValue.numero_celular_comprador
        ? Number(formValue.numero_celular_comprador)
        : null,
      telefono_fijo: String(formValue.telefono_fijo || '').trim(),
      numero_celular_whatsapp: formValue.numero_celular_whatsapp
        ? Number(formValue.numero_celular_whatsapp)
        : null,
      whatsappUsername: this.limpiarUsername(formValue.whatsappUsername),
    };

    if (this.permiteExtras) {
      // Al crear van los tres arreglos (vacíos si no hay nada). Al editar solo
      // los que el usuario tocó: `clients/edit` es un merge superficial y así
      // no se pisa lo que la pantalla no trajo (ver `tocado`).
      if (!this.isEdit || this.tocado.entrega) clienteData.datosEntrega = this.entregas.map(normalizarEntrega);
      if (!this.isEdit || this.tocado.facturacion) clienteData.datosFacturacionElectronica = this.perfiles.map((p) => ({ ...p }));
      if (!this.isEdit || this.tocado.notas) clienteData.notas = this.notas.map((n) => ({ ...n }));
      if (!this.isEdit || this.tocado.contactos) clienteData.contactos = this.contactos.map((c) => ({ ...c }));
    }

    // Modo borrador: sin persistencia, el caller se queda con el valor.
    if (!this.persist) {
      this.emitirResultado({ cliente: clienteData, action: 'draft' });
      return;
    }

    if (this.isEdit) {
      this.ejecutarEdicion(clienteData);
    } else {
      this.verificarYCrearCliente(clienteData);
    }
  }

  /** Cierra el modal o emite el resultado, según el modo (D-406). */
  private emitirResultado(resultado: ResultadoFormularioCliente): void {
    if (this.modo === 'modal' && this.activeModal) {
      this.activeModal.close(resultado);
      return;
    }
    this.guardado.emit(resultado);
  }

  /** Botón Cancelar / cerrar: cierra el modal o avisa a la pantalla. */
  cerrar(): void {
    if (this.modo === 'modal' && this.activeModal) {
      this.activeModal.dismiss();
      return;
    }
    this.cancelado.emit();
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
        if (res && res.success === false) {
          throw Object.assign(new Error(res.error || 'crm_persist_failed'), { code: res.code || null });
        }
        return res as T;
      }),
    );
  }

  private persistCreate(clienteData: any) {
    if (!this.canPersist()) return throwError(() => new Error('El comercio activo cambió. Vuelve a abrir el formulario.'));
    if (this.target !== 'corporate') return this.maestroService.createClient(clienteData);
    return this.failOnCrmError<any>(this.crmService.createLead(clienteData, true)).pipe(
      // Normaliza la respuesta del CRM ({success, data:{entityId}}) a la forma
      // que espera crearCliente().
      map((res: any) => ({ cliente: { ...clienteData, cd: res?.data?.entityId } })),
    );
  }

  private persistEdit(payload: any) {
    if (!this.canPersist()) return throwError(() => new Error('El comercio activo cambió. Vuelve a abrir el formulario.'));
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
            this.tocado = { entrega: false, facturacion: false, notas: false, contactos: false };
            this.emitirResultado({ cliente: clienteActualizado, action: 'updated' });
          },
          error: () => {
            this.emitirResultado({ cliente: payload, action: 'updated' });
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
          const traeExtras = (clienteData.datosEntrega?.length || 0) + (clienteData.datosFacturacionElectronica?.length || 0) + (clienteData.notas?.length || 0) + (clienteData.contactos?.length || 0) > 0;
          Swal.fire({
            title: `${this.entityLabel} ya registrado`,
            html: `<p>El documento <strong>${clienteData.documento}</strong> ya está registrado.</p>
                   <p><strong>${this.entityLabel}:</strong> ${clienteEncontrado.nombres_completos} ${clienteEncontrado.apellidos_completos || ""}</p>
                   ${traeExtras ? '<p class="text-muted" style="font-size:0.9em;">Las direcciones, perfiles, contactos o notas que escribiste no se guardaron: se cargó el cliente existente para que las agregues ahí.</p>' : ''}`,
            icon: "info",
            confirmButtonText: "Entendido",
          }).then(() => {
            if (this.modo === 'inline') {
              // En la pantalla el formulario sigue abierto: pasa a editar el existente.
              this.isEdit = true;
              this.clienteData = clienteEncontrado;
              this.cargarArreglos(clienteEncontrado);
              this.cargarEnFormulario(clienteEncontrado);
            }
            this.emitirResultado({ cliente: clienteEncontrado, action: 'existing_found' });
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
        const base = { ...clienteData, ...clienteCreado };
        if (base.cd || this.target === 'corporate') {
          this.emitirResultado({ cliente: base, action: 'created' });
          return;
        }
        // D-406: `clients/create` responde solo {msg:'added'}, sin el id. Se relee
        // por documento para entregar el cliente con su `cd` (venta asistida lo
        // necesita para editarlo después sin crear un duplicado).
        this.lookupByDocument(clienteData.documento).subscribe({
          next: (res: any) => {
            const guardado = Array.isArray(res) ? res[0] : res;
            this.emitirResultado({ cliente: guardado && guardado.documento ? { ...base, ...guardado } : base, action: 'created' });
          },
          error: () => this.emitirResultado({ cliente: base, action: 'created' }),
        });
      },
      error: (err: any) => {
        if (err?.code === 'EXISTE_OTRO_COMERCIAL') {
          Swal.fire({
            icon: 'warning',
            title: 'Este cliente ya existe',
            text: `${clienteData.nombres_completos || 'Este cliente'} ya está registrado y lo atiende otro comercial, así que no se creó de nuevo. Si crees que debería ser tuyo, pídele al administrador que te lo asigne.`,
            confirmButtonText: 'Entendido',
          });
          return;
        }
        Swal.fire("Error", `Ocurrió un error al crear el ${this.entityLabel.toLowerCase()}`, "error");
      },
    });
  }

  private marcarControlesComoTocados() {
    Object.values(this.formulario.controls).forEach(c => c.markAsTouched());
  }
}
