import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientConfigService, ClientTag } from './services/client-config.service';
import { clientBillingProfiles } from '../../../shared/utils/client-search';
import { mayusculaInicial } from '../../../shared/utils/mayuscula-inicial';
import { TranslateService } from '@ngx-translate/core';

/**
 * Pantalla Crear cliente (`ventas/clientes`).
 *
 * D-406: el formulario de cliente (Contacto / Entrega / Facturación / Notas) es
 * `CrearClienteModalComponent` incrustado en modo inline; esta pantalla solo
 * aporta el buscador de clientes existentes (ticket 1163), la ficha 360 del
 * cliente encontrado y la configuración de etiquetas.
 */
@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit, AfterViewInit {
  billingProfiles = clientBillingProfiles;

  @ViewChild('documentoBusqueda') documentoBusqueda: ElementRef
  @ViewChild('resultadosModal') resultadosModal: any;

  encontrado = false;
  /** Documento buscado que no existe: se precarga en el formulario para crearlo. */
  documentoNoEncontrado = '';
  bloqueado: boolean = false;
  datos: any;
  notas: any;
  activarNotas: boolean;
  datosFacturacionElectronica: any[];
  activarDatosFact: boolean;
  datosEntregas: any[];
  activarDatosEntrega: boolean;
  resultadosBusqueda: any[] = [];

  // Etiquetas (catálogo para mostrar las del cliente en la ficha 360)
  clientTagsCatalog: ClientTag[] = [];
  etiquetasSeleccionadas: string[] = [];

  // Visibilidad de columnas por tabla de la ficha 360 (solo lectura: se edita en el formulario)
  colsNotas = [
    { key: 'fecha',  label: 'ventas.clientes.colFecha', visible: true },
    { key: 'nota',   label: 'ventas.clientes.colNota',  visible: true },
  ];

  colsFact = [
    { key: 'referencia',     label: 'ventas.clientes.colReferencia',           visible: true },
    { key: 'nombre',         label: 'ventas.clientes.colNombreRazonSocial', visible: true },
    { key: 'tipoDocumento',  label: 'ventas.clientes.colTipoDocumento',        visible: true },
    { key: 'documento',      label: 'ventas.clientes.colDocumento',             visible: true },
  ];

  colsEntrega = [
    { key: 'referencia', label: 'ventas.clientes.colReferencia', visible: true },
    { key: 'nombre',     label: 'ventas.clientes.colNombre',     visible: true },
    { key: 'direccion',  label: 'ventas.clientes.colDireccion',  visible: true },
  ];

  toggleCol(cols: { key: string; label: string; visible: boolean }[], key: string): void {
    const col = cols.find(c => c.key === key);
    if (col) col.visible = !col.visible;
  }

  colVisible(cols: { key: string; label: string; visible: boolean }[], key: string): boolean {
    const col = cols.find(c => c.key === key);
    return col ? col.visible : true;
  }

  visibleCount(cols: { key: string; label: string; visible: boolean }[]): number {
    return cols.filter(c => c.visible).length;
  }


  constructor(private router: Router, private modalService: NgbModal, private service: MaestroService, private cdr: ChangeDetectorRef, private clientConfig: ClientConfigService, private route: ActivatedRoute, private translate: TranslateService) {
  }

  ngAfterViewInit(): void {
    // Entrada explícita desde Nueva factura: consultar la ficha completa, nunca crear ni guardar al abrir.
    const invoiceCustomer = this.route.snapshot.queryParamMap.get('invoiceCustomer');
    if (!invoiceCustomer || invoiceCustomer.length > 50) return;
    // El buscador va plegado (ticket 1163): se abre para que exista el campo de búsqueda.
    this.buscadorAbierto = true;
    this.cdr.detectChanges();
    if (!this.documentoBusqueda?.nativeElement) return;
    this.documentoBusqueda.nativeElement.value = invoiceCustomer;
    this.buscarPorDocumento(invoiceCustomer.trim());
    this.cdr.detectChanges();
  }

  /** Documento del cliente en pantalla: el encontrado o, si no hay, el que se está buscando. */
  private documentoActual(): string {
    return this.datos?.documento || this.documentoBusqueda?.nativeElement?.value || '';
  }

  /** Deja un cliente como "encontrado": ficha 360 abajo y formulario unificado editándolo. */
  private mostrarCliente(cliente: any): void {
    sessionStorage.setItem('cliente', JSON.stringify(cliente));
    this.datos = cliente;
    this.etiquetasSeleccionadas = Array.isArray(cliente.etiquetas) ? cliente.etiquetas.map((e: string) => this.toTitleCase(e)) : [];
    this.encontrado = true;
    this.bloqueado = cliente.estado === 'bloqueado';
    this.activarNotas = false;
    this.verNotas();
  }

  buscar() {
    // Validar que el campo de búsqueda exista
    if (!this.documentoBusqueda || !this.documentoBusqueda.nativeElement) {
      console.warn('⚠️ Campo de búsqueda no está inicializado');
      return;
    }

    // El servidor pide al menos 2 caracteres.
    const term = String(this.documentoBusqueda.nativeElement.value || '').trim();
    if (term.length < 2) {
      Swal.fire({
        title: this.translate.instant('ventas.clientes.campoVacio'),
        text: this.translate.instant('ventas.clientes.campoVacioTexto'),
        icon: 'warning',
        confirmButtonText: this.translate.instant('ventas.clientes.ok')
      });
      return;
    }

    this.bloqueado = false;
    this.resultadosBusqueda = [];

    // Ticket 1326: antes había que escoger "Buscar por" (no existía celular) y
    // nombre/email bajaban todos los clientes de la empresa (69.000 en ALMARA,
    // ~40 s). Ahora va por el índice de búsqueda del servidor (D-260).
    this.service.searchClients(term, 50).subscribe((res: any) => {
      // matchClient agrega campos de búsqueda: no deben llegar al formulario que edita la ficha.
      const lista: any[] = (Array.isArray(res) ? res : [])
        .map(({ displayLabel, matchedBillingProfiles, ...cliente }: any) => cliente);
      const digitos = term.replace(/\D/g, '');
      const soloDigitos = /^[\d.\s()+-]+$/.test(term);
      // Documento exacto: se abre directo, como hacía "Buscar por Documento".
      const exactos = soloDigitos && digitos
        ? lista.filter(c => String(c.documento || '').replace(/\D/g, '') === digitos)
        : [];

      if (lista.length === 0) {
        this.encontrado = false;
        this.datos = null;
        // Si buscó un número y no existe, se precarga en el formulario para crearlo.
        this.documentoNoEncontrado = soloDigitos ? term : '';
        Swal.fire({
          title: this.translate.instant('ventas.clientes.noEncontrado'),
          text: this.translate.instant('ventas.clientes.noEncontradoTexto'),
          icon: 'warning',
          confirmButtonText: this.translate.instant('ventas.clientes.ok')
        });
      } else if (lista.length === 1 || exactos.length === 1) {
        this.mostrarCliente(lista.length === 1 ? lista[0] : exactos[0]);
      } else {
        this.encontrado = false;
        this.resultadosBusqueda = [...lista];
        this.modalService.open(this.resultadosModal, { size: 'lg', backdrop: 'static' });
      }
    }, error => {
      this.encontrado = false;
      this.datos = null;
      Swal.fire({ title: this.translate.instant('ventas.clientes.noSePudoConsultar'),
        text: this.translate.instant('ventas.clientes.noSePudoBuscar'),
        icon: 'error', confirmButtonText: this.translate.instant('comun.entendido') });
    });
  }

  /** Búsqueda exacta por documento (entrada desde Nueva factura). */
  private buscarPorDocumento(documento: string): void {
    this.bloqueado = false;
    const data = { documento };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      if (!res.company) {
        this.encontrado = false
        this.datos = null
        this.bloqueado = false
        this.documentoNoEncontrado = String(data.documento || '').trim();
        Swal.fire({
          title: this.translate.instant('ventas.clientes.noEncontrado'),
          text: this.translate.instant('ventas.clientes.noEncontradoDocumento'),
          icon: 'warning',
          confirmButtonText: this.translate.instant('ventas.clientes.ok')
        });
      } else {
        this.mostrarCliente(res);
        Swal.fire({
          title: this.translate.instant('ventas.clientes.consultado'),
          text: this.translate.instant('ventas.clientes.consultadoTexto'),
          icon: 'success',
          confirmButtonText: this.translate.instant('ventas.clientes.ok')
        });
      }
    }, error => {
      this.encontrado = false;
      this.datos = null;
      Swal.fire({ title: this.translate.instant('ventas.clientes.noSePudoConsultar'),
        text: error?.error?.error || this.translate.instant('ventas.clientes.noSePudoVerificar'),
        icon: 'error', confirmButtonText: this.translate.instant('comun.entendido') });
    });
  }

  seleccionarClienteResultado(cliente: any) {
    this.resultadosBusqueda = [];
    this.mostrarCliente(cliente);
  }

  nuevoPedido() {
    const documento = this.documentoActual();
    if (!documento) {
      Swal.fire({ title: this.translate.instant('ventas.clientes.sinCliente'), text: this.translate.instant('ventas.clientes.sinClienteTexto'), icon: 'warning', confirmButtonText: this.translate.instant('ventas.clientes.ok') });
      return;
    }
    this.router.navigate(['/ventas/crear-ventas'], { queryParams: { documento } });
  }

  bloquear() {
    this.cambiarEstadoCliente('bloqueado');
  }

  desbloquear() {
    this.cambiarEstadoCliente('activo');
  }

  /**
   * Bloquear / desbloquear desde la ficha 360. Envía solo el estado (parche):
   * `clients/edit` hace merge superficial y así no pisa entrega, facturación ni
   * notas con una copia vieja. Al recargar, `datos` cambia y el formulario
   * unificado se refresca con el estado nuevo.
   */
  private cambiarEstadoCliente(estado: 'activo' | 'bloqueado'): void {
    const documento = this.documentoActual();
    if (!documento) return;
    const parche: any = { documento, estado };
    if (this.datos?.cd) parche.cd = this.datos.cd;
    this.service.editClient(parche).subscribe({
      next: () => {
        Swal.fire(estado === 'bloqueado'
          ? { title: this.translate.instant('ventas.clientes.usuarioBloqueado'), text: this.translate.instant('ventas.clientes.usuarioBloqueadoTexto'), icon: 'error', confirmButtonText: this.translate.instant('ventas.clientes.ok') }
          : { title: this.translate.instant('ventas.clientes.usuarioDesbloqueado'), text: this.translate.instant('ventas.clientes.usuarioDesbloqueadoTexto'), icon: 'success', confirmButtonText: this.translate.instant('ventas.clientes.ok') });
        this.service.getClientByDocument({ documento }).subscribe((res: any) => {
          if (!res || !res.company) return;
          sessionStorage.setItem('cliente', JSON.stringify(res));
          this.datos = res;
          this.encontrado = true;
          this.bloqueado = res.estado === 'bloqueado';
        });
      },
      error: (error) => {
        Swal.fire({ title: this.translate.instant('comun.error'), text: error?.error?.error || this.translate.instant('ventas.clientes.errorCambiarEstado'), icon: 'error', confirmButtonText: this.translate.instant('ventas.clientes.ok') });
      }
    });
  }

  private activarTab(tab: 'notas' | 'facturacion' | 'entrega') {
    this.activarNotas = tab === 'notas';
    this.activarDatosFact = tab === 'facturacion';
    this.activarDatosEntrega = tab === 'entrega';
  }

  verNotas() {
    if (this.activarNotas) {
      this.activarNotas = false;
      return;
    }
    this.activarTab('notas');
    this.notas = [];
    const data = { documento: this.documentoActual() };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      (res?.notas || []).forEach((x: any) => this.notas.push(x));
    });
  }

  verDatosFacturacion() {
    if (this.activarDatosFact) {
      this.activarDatosFact = false;
      return;
    }
    this.activarTab('facturacion');
    this.datosFacturacionElectronica = [];
    const data = { documento: this.documentoActual() };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      (res?.datosFacturacionElectronica || []).forEach((x: any) => this.datosFacturacionElectronica.push(x));
    });
  }

  verDatosEntrega() {
    if (this.activarDatosEntrega) {
      this.activarDatosEntrega = false;
      return;
    }
    this.activarTab('entrega');
    this.datosEntregas = [];
    const data = { documento: this.documentoActual() };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      (res?.datosEntrega || []).forEach((x: any) => this.datosEntregas.push(x));
    });
  }

  ngOnInit(): void {
    this.clientConfig.loadClientTags().subscribe((tags) => {
      this.clientTagsCatalog = tags;
    });
  }

  // =============================================
  // ETIQUETAS (colores para la ficha 360)
  // =============================================
  getTagColor(tag: ClientTag): string {
    const map: Record<string, string> = {
      violet: '#ede9fe',
      green:  '#e9f8ef',
      blue:   '#e8f0fe',
      amber:  '#fdf3e3',
      red:    '#fdeaea',
      gray:   '#f1eef9',
    };
    return map[tag.color] || '#f1eef9';
  }

  getTagTextColor(tag: ClientTag): string {
    const map: Record<string, string> = {
      violet: '#5b21b6',
      green:  '#15803d',
      blue:   '#1E6FD9',
      amber:  '#b45309',
      red:    '#b91c1c',
      gray:   '#5a5470',
    };
    return map[tag.color] || '#5a5470';
  }

  getTagFromCatalog(nombre: string): ClientTag | undefined {
    return this.clientTagsCatalog.find(t => t.name === nombre);
  }

  // =============================================
  // BUSCADOR + FORMULARIO UNIFICADO INCRUSTADO
  // =============================================
  /** Ticket 1163: el buscador de clientes existentes va plegado al crear. */
  buscadorAbierto: boolean = false;

  /**
   * D-406: resultado del formulario unificado incrustado en la pantalla. El
   * cliente creado/actualizado queda como "encontrado" (ficha 360 abajo) y el
   * formulario pasa a modo edición sobre él.
   */
  onClienteGuardadoInline(resultado: { cliente: any; action: string }): void {
    if (!resultado || !resultado.cliente || resultado.action === 'draft') return;
    this.seleccionarClienteResultado(resultado.cliente);
    this.buscadorAbierto = false;
  }

  toggleBuscador(): void {
    this.buscadorAbierto = !this.buscadorAbierto;
    if (!this.buscadorAbierto) {
      this.resultadosBusqueda = [];
    }
  }

  // =============================================
  // CONFIG ETIQUETAS (modal en crear cliente)
  // =============================================
  showEtiquetasConfig: boolean = false;
  editableTagsCfg: ClientTag[] = [];
  newTagNameCfg: string = '';
  newTagColorCfg: string = 'violet';
  availableColorsCfg: string[] = [];

  abrirConfigEtiquetas(): void {
    this.editableTagsCfg = this.clientConfig.getClientTags().map(t => ({ ...t }));
    this.availableColorsCfg = this.clientConfig.getColors();
    this.newTagNameCfg = '';
    this.newTagColorCfg = 'violet';
    this.showEtiquetasConfig = true;
  }

  addTagCfg(): void {
    const name = this.toTitleCase(this.newTagNameCfg.trim());
    if (name && !this.editableTagsCfg.find(t => t.name === name)) {
      this.editableTagsCfg.push({ name, color: this.newTagColorCfg });
    }
    this.newTagNameCfg = '';
  }

  removeTagCfg(index: number): void {
    const tag = this.editableTagsCfg[index];
    Swal.fire({
      title: this.translate.instant('ventas.clientes.eliminarEtiquetaTitulo', { nombre: tag.name }),
      text: this.translate.instant('ventas.clientes.eliminarEtiquetaTexto'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D64545',
      cancelButtonColor: '#8f8bab',
      confirmButtonText: this.translate.instant('ventas.clientes.siEliminar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      didOpen: () => {
        const container = document.querySelector('.swal2-container') as HTMLElement;
        if (container) container.style.zIndex = '99999';
      }
    }).then(result => {
      if (!result.isConfirmed) return;
      this.editableTagsCfg.splice(index, 1);
      this.clientConfig.saveClientTags(this.editableTagsCfg).subscribe();
      this.clientConfig.removeTagFromClients(tag.name).subscribe(() => {
        this.clientTagsCatalog = [...this.clientConfig.getClientTags()];
        // Limpiar del cliente activo en la UI
        this.etiquetasSeleccionadas = this.etiquetasSeleccionadas.filter(e => e !== tag.name);
        if (this.datos) {
          this.datos.etiquetas = [...this.etiquetasSeleccionadas];
          const clienteSession = JSON.parse(sessionStorage.getItem('cliente') || '{}');
          clienteSession.etiquetas = this.datos.etiquetas;
          sessionStorage.setItem('cliente', JSON.stringify(clienteSession));
        }
        this.cdr.detectChanges();
        Swal.fire({
          title: this.translate.instant('ventas.clientes.etiquetaEliminada'),
          text: this.translate.instant('ventas.clientes.etiquetaEliminadaTexto', { nombre: tag.name }),
          icon: 'success',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          didOpen: () => {
            const container = document.querySelector('.swal2-container') as HTMLElement;
            if (container) container.style.zIndex = '99999';
          }
        });
      });
    });
  }

  guardarConfigEtiquetas(): void {
    this.addTagCfg();
    this.clientConfig.saveClientTags(this.editableTagsCfg).subscribe(() => {
      this.clientTagsCatalog = [...this.clientConfig.getClientTags()];
      this.showEtiquetasConfig = false;
      this.cdr.detectChanges();
    });
  }

  getTagBgColorCfg(color: string): string {
    const map: Record<string, string> = {
      violet: '#ede9fe', green: '#d1fae5', blue: '#dbeafe',
      amber: '#fef3c7', red: '#fee2e2', gray: '#f3f4f6'
    };
    return map[color] || '#f3f4f6';
  }

  getTagFgColorCfg(color: string): string {
    const map: Record<string, string> = {
      violet: '#5b21b6', green: '#065f46', blue: '#1e40af',
      amber: '#92400e', red: '#991b1b', gray: '#374151'
    };
    return map[color] || '#374151';
  }

  private toTitleCase(str: string): string {
    return mayusculaInicial(str); // Ticket 1340: respeta las tildes («Gómez», no «GóMez»)
  }

  // =============================================
  // FICHA 360° — helpers de presentación
  // =============================================
  getInitials(): string {
    if (!this.datos) return '?';
    const n = (this.datos.nombres_completos || '').trim();
    const a = (this.datos.apellidos_completos || '').trim();
    return ((n[0] || '') + (a[0] || '')).toUpperCase() || '?';
  }

}
