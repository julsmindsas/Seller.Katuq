import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Input, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2'
import { DataStoreService } from '../../../shared/services/dataStoreService';
import { InfoPaises } from '../../../../Mock/pais-estado-ciudad'
import { InfoIndicativos } from '../../../../Mock/indicativosPais'
import { NgbActiveModal, NgbModal, ModalDismissReasons, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { CrearClienteModalComponent } from './crear-cliente-modal/crear-cliente-modal.component';
import { DireccionEstructuradaComponent } from '../entrega/direccion-estructurada/direccion-estructurada.component';
import { DaneCodesService } from '../../../shared/services/dane-codes.service';
import { MunicipioDane } from '../../../shared/data/colombia-dane-codes';
import { ClientConfigService, ClientTag } from './services/client-config.service';
@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit, AfterViewInit {

  @ViewChild('documentoBusqueda') documentoBusqueda: ElementRef
  @ViewChild('whatsapp') whatsapp: ElementRef
  @ViewChild('resultadosModal') resultadosModal: any;

  @Input() clienteEdit: any;
  formulario: any;
  tipoBusqueda: string = 'CC-NIT'; // Valor por defecto para el dropdown de búsqueda
  formularioFacturacionElectronica: any;
  formularioFacturacion: any;
  formularioEntrega: any;
  encontrado: boolean = false
  formPrincipal: any;
  facturacionElectronica: boolean = false
  formularioNotas: any;
  indicativos: { nombre: string; name: string; nom: string; iso2: string; iso3: string; phone_code: string; }[];
  IndicativoPlaceholder: string;
  departamentos: any;
  ciudades: string[];
  ciudadesOrigen: { value: string; label: string; }[];
  paises: string[];
  departamentos1: string[];
  ciudades1: string[];
  ciudadesOrigen1: { value: string; label: string; }[];
  bloqueado: boolean = false;
  nombreCliente: any;
  datos: any;
  notas: any;
  activarFacturacion: any;
  notaNueva: any;
  fecha: Date;
  activarNotas: boolean;
  dateactual: string;
  pais: string;
  departamento: string;
  razon_social: any;
  tipo_documento_facturacion: any;
  numero_documento_facturacion: any;
  indicativo_celular_facturacion: any;
  numero_celular_facturacion: any;
  correo_electronico_facturacion: any;
  datosFacturacionElectronica: any[];
  direccion_facturacion: any;
  ciudad_municipio: any;
  codigo_postal: any;
  alias_facturacion: any;
  activarDatosFact: boolean;
  codigo_postal_entrega: any;
  ciudad_municipio_entrega: any;
  departamento_entrega: string;
  pais_entrega: string;
  direccion_entrega: any;
  numero_celular_entrega: any;
  indicativo_celular_entrega: any;
  nombres_entrega: any;
  entrega: boolean;
  datosEntregas: any[];
  entregar: boolean;
  otro_numero_entrega: any;
  alias_entrega: any;
  observaciones: any;
  activarDatosEntrega: boolean;
  apellidos_entrega: any;
  indicativo_celular_entrega2: any;
  barrio: any;
  nombreUnidad: any;
  especificacionesInternas: any;
  latitud: string;
  longitud: string;
  coordenadas: string;
  departamentosDane: string[] = [];
  municipiosDane: MunicipioDane[] = [];
  searchQueryCiudadDane: string = '';
  cargandoCiudadesDane: boolean = false;
  editandodato: boolean;
  idenxEntrega: any;
  idenxFacturacion: any;
  @Input() isEdit: boolean = false;
  filteredResults: any;
  allBillingZone: any;
  zona_cobro: any;
  valor_zona_cobro: any;
  resultadosBusqueda: any[] = [];

  // Tipo de cliente y etiquetas
  clientTypes: string[] = [];
  clientTagsCatalog: ClientTag[] = [];
  etiquetasSeleccionadas: string[] = [];

  // Visibilidad de columnas por tabla
  colsCliente = [
    { key: 'cliente',   label: 'Cliente',     visible: true },
    { key: 'tipoDoc',   label: 'Tipo Doc.',   visible: true },
    { key: 'documento', label: 'Documento',   visible: true },
    { key: 'correo',    label: 'Correo',      visible: true },
    { key: 'acciones',  label: 'Acciones',    visible: true },
  ];

  colsNotas = [
    { key: 'fecha',  label: 'Fecha', visible: true },
    { key: 'nota',   label: 'Nota',  visible: true },
  ];

  colsFact = [
    { key: 'referencia',     label: 'Referencia',           visible: true },
    { key: 'nombre',         label: 'Nombre / Razón Social', visible: true },
    { key: 'tipoDocumento',  label: 'Tipo Documento',        visible: true },
    { key: 'documento',      label: 'Documento',             visible: true },
    { key: 'acciones',       label: 'Acciones',              visible: true },
  ];

  colsEntrega = [
    { key: 'referencia', label: 'Referencia', visible: true },
    { key: 'nombre',     label: 'Nombre',     visible: true },
    { key: 'direccion',  label: 'Dirección',  visible: true },
    { key: 'acciones',   label: 'Acciones',   visible: true },
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


  constructor(private router: Router, private dataStore: DataStoreService, private modalService: NgbModal, private inforPaises: InfoPaises, private formBuilder: FormBuilder, private service: MaestroService, private infoIndicativo: InfoIndicativos, private cdr: ChangeDetectorRef, private daneCodesService: DaneCodesService, private clientConfig: ClientConfigService) {
    this.daneCodesService.getDepartamentos().subscribe(deptos => {
      this.departamentosDane = deptos;
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      // Si ya tenemos clienteEdit desde el @Input, usarlo directamente
      if (this.clienteEdit && this.isEdit) {
        console.log('Cargando cliente desde @Input:', this.clienteEdit);
        // Dar más tiempo para que los ViewChild se inicialicen
        setTimeout(() => {
          if (this.documentoBusqueda && this.documentoBusqueda.nativeElement) {
            this.documentoBusqueda.nativeElement.value = this.clienteEdit.documento;
            // Asegurar que el tipo de búsqueda esté establecido
            if (!this.tipoBusqueda) {
              this.tipoBusqueda = 'CC-NIT';
            }
            this.buscar();
          }
        }, 500); // Aumentar el tiempo de espera
        return;
      }

      // Si no, intentar cargar desde IndexedDB
      // Verificar y cargar isEdit desde IndexedDB
      if (this.isEdit === null || this.isEdit === undefined || this.isEdit === false) {
        const isEditFromStore = await this.dataStore.get<boolean>('isEdit');
        if (isEditFromStore !== null && isEditFromStore !== undefined) {
          this.isEdit = isEditFromStore;
          await this.dataStore.remove('isEdit'); // Limpiar después de usar
        }
      }

      // Verificar y cargar cliente desde IndexedDB
      if (!this.clienteEdit) {
        const clienteFromStore = await this.dataStore.get<any>('cliente');
        if (clienteFromStore !== null && clienteFromStore !== undefined) {
          this.clienteEdit = clienteFromStore;
          await this.dataStore.remove('cliente'); // Limpiar después de usar
        }
      }

      // Si estamos en modo edición y tenemos datos del cliente
      if (this.isEdit && this.clienteEdit) {
        console.log('Cargando cliente desde IndexedDB:', this.clienteEdit);
        setTimeout(() => {
          if (this.documentoBusqueda && this.documentoBusqueda.nativeElement) {
            this.documentoBusqueda.nativeElement.value = this.clienteEdit.documento;
            // Asegurar que el tipo de búsqueda esté establecido
            if (!this.tipoBusqueda) {
              this.tipoBusqueda = 'CC-NIT';
            }
            this.buscar();
          }
        }, 500); // Aumentar tiempo de espera
      }
    } catch (error) {
      console.error('Error al cargar datos desde IndexedDB:', error);
      // Opcional: Mostrar mensaje al usuario
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los datos de edición',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    }
  }

  identificarDepto() {
    this.inforPaises.paises.map(x => {
      if (x.Pais == this.pais) {
        this.departamentos = x.Regiones.map(c => {
          return c.departamento
        })
      }
    })

  }
  identificarCiu() {
    this.inforPaises.paises.map(x => {
      if (x.Pais == this.pais) {
        x.Regiones.map(y => {
          if (y.departamento == this.departamento) {
            this.ciudades = y.ciudades.map(c => {
              return c
            })
            this.ciudadesOrigen = this.ciudades.map(city => ({
              value: city, label: city
            }))

          }
        })

      }
    })
  }
  identificarDepto1() {
    this.inforPaises.paises.map(x => {
      if (x.Pais == this.pais_entrega) {
        this.departamentos1 = x.Regiones.map(c => {
          return c.departamento
        })
      }
    })

  }
  identificarCiu1() {
    this.inforPaises.paises.map(x => {
      if (x.Pais == this.pais_entrega) {
        x.Regiones.map(y => {
          if (y.departamento == this.departamento_entrega) {
            this.ciudades1 = y.ciudades.map(c => {
              return c
            })
            // this.ciudadesOrigen1 = this.ciudades.map(city => ({
            //   value: city, label: city
            // }))

          }
        })

      }
    })
  }

  onPaisChange() {
    this.identificarDepto1();
    this.departamento_entrega = '';
    this.ciudad_municipio_entrega = '';
    this.ciudades1 = [];
    this.zona_cobro = '';
    this.valor_zona_cobro = '';
    this.filteredResults = [];
  }

  onDepartamentoChange() {
    this.identificarCiu1();
    this.ciudad_municipio_entrega = '';
    this.zona_cobro = '';
    this.valor_zona_cobro = '';
    this.filteredResults = [];
  }

  onCiudadChange() {
    this.zona_cobro = '';
    this.valor_zona_cobro = '';
    this.filteredResults = [];
    setTimeout(() => { this.idBillingZone(''); }, 100);
  }

  onZonaCobroSelected(): void {
    if (!this.zona_cobro || !this.filteredResults || this.filteredResults.length === 0) {
      this.valor_zona_cobro = '';
      return;
    }
    const zonaSeleccionada = this.filteredResults.find((item: any) => item.nombreZonaCobro === this.zona_cobro);
    this.valor_zona_cobro = zonaSeleccionada ? zonaSeleccionada.valorZonaCobro : '';
  }

  abrirModalDireccion() {
    const modalRef = this.modalService.open(DireccionEstructuradaComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.componentInstance.direccionActual = this.direccion_entrega || '';
    modalRef.componentInstance.ciudadActual = this.ciudad_municipio_entrega || '';
    modalRef.result.then(
      (resultado) => {
        if (typeof resultado === 'object') {
          this.direccion_entrega = resultado.direccion;
          if (resultado.ciudad && resultado.ciudad !== this.ciudad_municipio_entrega) {
            this.ciudad_municipio_entrega = resultado.ciudad;
            if (resultado.estructura && resultado.estructura.departamento) {
              this.departamento_entrega = resultado.estructura.departamento;
            }
            this.zona_cobro = '';
            this.valor_zona_cobro = '';
            this.filteredResults = [];
            setTimeout(() => { this.idBillingZone(''); }, 500);
          }
          if (resultado.coordenadas) {
            this.coordenadas = resultado.coordenadas;
            const coords = resultado.coordenadas.split(',').map((c: string) => c.trim());
            if (coords.length === 2) {
              this.latitud = coords[0];
              this.longitud = coords[1];
            }
          }
        } else {
          this.direccion_entrega = resultado;
        }
      },
      () => {}
    );
  }

  buscarMunicipioDane(query: string): void {
    if (!query || query.length < 2) {
      this.municipiosDane = [];
      return;
    }
    this.cargandoCiudadesDane = true;
    this.daneCodesService.searchMunicipios(query).subscribe(resultados => {
      this.municipiosDane = resultados;
      this.cargandoCiudadesDane = false;
    });
  }

  onDepartamentoDaneChange(departamento: string): void {
    if (!departamento) {
      this.municipiosDane = [];
      this.ciudades1 = [];
      return;
    }
    this.cargandoCiudadesDane = true;
    this.daneCodesService.getMunicipiosByDepartamento(departamento).subscribe(municipios => {
      this.municipiosDane = municipios;
      this.ciudades1 = municipios.map(m => m.nombre);
      this.cargandoCiudadesDane = false;
    });
  }

  seleccionarMunicipioDane(municipio: MunicipioDane): void {
    this.pais_entrega = 'Colombia';
    this.departamento_entrega = municipio.departamento;
    this.ciudad_municipio_entrega = municipio.nombre;
    this.ciudades1 = [municipio.nombre];
    this.daneCodesService.addMunicipioFrecuente(municipio);
    this.zona_cobro = '';
    this.valor_zona_cobro = '';
    this.filteredResults = [];
    setTimeout(() => { this.idBillingZone(''); }, 300);
    this.municipiosDane = [];
    this.searchQueryCiudadDane = '';
  }

  datosFacElect(event) {
    if (this.facturacionElectronica === true) {
      this.razon_social = this.formulario.value.nombres_completos + ' ' + this.formulario.value.apellidos_completos
      this.tipo_documento_facturacion = this.formulario.value.tipo_documento_comprador
      this.numero_documento_facturacion = this.formulario.value.documento
    } else {
      this.razon_social = ""
      this.tipo_documento_facturacion = ""
      this.numero_documento_facturacion = ""
    }
  }

  // Método auxiliar para cargar datos del cliente en modo edición
  cargarDatosCliente() {
    if (!this.clienteEdit || !this.clienteEdit.documento) {
      console.warn('⚠️ No hay cliente para cargar');
      return;
    }

    // Cargar los datos del cliente directamente desde el servidor
    const data = { documento: this.clienteEdit.documento };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      if (res && res.company) {
        try {
          this.formulario.patchValue(res);

          // Establecer valores específicos del formulario
          this.formulario.controls['tipo_documento_comprador'].setValue(res.tipo_documento_comprador);
          this.formulario.controls['indicativo_celular_comprador'].setValue(res.indicativo_celular_comprador);
          this.formulario.controls['numero_celular_comprador'].setValue(res.numero_celular_comprador);
          this.formulario.controls['indicativo_celular_whatsapp'].setValue(res.indicativo_celular_whatsapp);
          this.formulario.controls['numero_celular_whatsapp'].setValue(res.numero_celular_whatsapp);
          this.formulario.controls['apellidos_completos'].setValue(res.apellidos_completos);
          this.formulario.controls['nombres_completos'].setValue(res.nombres_completos);
          this.formulario.controls['documento'].setValue(res.documento);
          this.formulario.controls['correo_electronico_comprador'].setValue(res.correo_electronico_comprador);
          this.formulario.controls['estado'].setValue(res.estado);
          this.etiquetasSeleccionadas = Array.isArray(res.etiquetas) ? [...res.etiquetas] : [];

          this.activarNotas = false;
          this.verNotas();

          this.datos = res;
          this.formularioFacturacion.patchValue(res.datosFacturacionElectronica);
          this.formularioEntrega.patchValue(res.datosEntrega);
          this.identificarDepto();
          this.identificarCiu();
          this.identificarDepto1();
          this.identificarCiu1();
          this.encontrado = true;

          if (this.formulario.value.estado == 'bloqueado') {
          this.bloqueado = true
        } else {
          this.bloqueado = false
        }

          console.log('✅ Cliente cargado exitosamente en modo edición');
        } catch (error) {
          console.error('❌ Error cargando datos del cliente:', error);
        }
      }
    }, error => {
      console.error('❌ Error obteniendo cliente del servidor:', error);
    });
  }

  buscar() {
    // Validar que el campo de búsqueda exista
    if (!this.documentoBusqueda || !this.documentoBusqueda.nativeElement) {
      console.warn('⚠️ Campo de búsqueda no está inicializado');
      // Si estamos en modo edición y tenemos un cliente, cargar directamente
      if (this.isEdit && this.clienteEdit) {
        this.cargarDatosCliente();
      }
      return;
    }

    // Validar que se haya ingresado algo en el campo de búsqueda
    if (!this.documentoBusqueda.nativeElement.value || this.documentoBusqueda.nativeElement.value.trim() === '') {
      Swal.fire({
        title: 'Campo vacío',
        text: 'Por favor ingrese un documento para buscar',
        icon: 'warning',
        confirmButtonText: 'Ok'
      });
      return;
    }

    this.bloqueado = false
    this.formulario.reset()
    this.formularioEntrega.reset()
    this.formularioFacturacion.reset()

    if (this.tipoBusqueda == "CC-NIT") {

      const data = {
        documento: this.documentoBusqueda.nativeElement.value
      }

      this.service.getClientByDocument(data).subscribe((res: any) => {
        if (!res.company) {
          this.formulario.controls['documento'].setValue(this.documentoBusqueda.nativeElement.value)
          this.encontrado = false
          this.bloqueado = false
          Swal.fire({
            title: 'No encontrado!',
            text: 'No se encuentra el documento. Si desea crearlo llene los datos a continuacion',
            icon: 'warning',
            confirmButtonText: 'Ok'
          });
        } else {
          sessionStorage.setItem('cliente', JSON.stringify(res))
          try {
            this.formulario.patchValue(res)
            this.formulario.controls['tipo_documento_comprador'].setValue(res.tipo_documento_comprador);
            this.formulario.controls['indicativo_celular_comprador'].setValue(res.indicativo_celular_comprador);
            this.formulario.controls['numero_celular_comprador'].setValue(res.numero_celular_comprador);
            this.formulario.controls['indicativo_celular_whatsapp'].setValue(res.indicativo_celular_whatsapp);
            this.formulario.controls['numero_celular_whatsapp'].setValue(res.numero_celular_whatsapp);
            this.formulario.controls['apellidos_completos'].setValue(res.apellidos_completos);
            this.formulario.controls['nombres_completos'].setValue(res.nombres_completos);
            this.formulario.controls['documento'].setValue(res.documento);
            this.formulario.controls['correo_electronico_comprador'].setValue(res.correo_electronico_comprador);
            this.formulario.controls['estado'].setValue(res.estado);
            this.activarNotas = false;
            this.verNotas();
          } catch (error) {
            console.log(error);
          }
          this.datos = res
          this.etiquetasSeleccionadas = Array.isArray(res.etiquetas) ? [...res.etiquetas] : [];
          this.formularioFacturacion.patchValue(res.datosFacturacionElectronica)
          this.formularioEntrega.patchValue(res.datosEntrega)
          this.identificarDepto()
          this.identificarCiu()
          this.identificarDepto1()
          this.identificarCiu1()
          this.encontrado = true
          if (this.formulario.value.estado == 'bloqueado') {
          this.bloqueado = true
        } else {
          this.bloqueado = false
        }
          Swal.fire({
            title: 'Consultado!',
            text: 'Consultado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
        }
      });

    } else if (this.tipoBusqueda === 'email' || this.tipoBusqueda === 'nombre') {

      const term = this.documentoBusqueda.nativeElement.value.toLowerCase().trim();
      this.service.obtenerClientes().subscribe((res: any) => {
        const todos: any[] = Array.isArray(res) ? res : (res.data || res.clients || res.clientes || []);
        let lista: any[];
        if (this.tipoBusqueda === 'email') {
          lista = todos.filter(c =>
            (c.correo_electronico_comprador || '').toLowerCase().includes(term)
          );
        } else {
          lista = todos.filter(c => {
            const nombre = `${c.nombres_completos || ''} ${c.apellidos_completos || ''}`.toLowerCase();
            return nombre.includes(term);
          });
        }
        if (!lista || lista.length === 0) {
          this.resultadosBusqueda = [];
          this.encontrado = false;
          this.bloqueado = false;
          Swal.fire({
            title: 'No encontrado!',
            text: 'No se encontró ningún cliente con ese criterio.',
            icon: 'warning',
            confirmButtonText: 'Ok'
          });
        } else {
          this.resultadosBusqueda = [...lista];
          this.notaModalRef = this.modalService.open(this.resultadosModal, { size: 'lg', backdrop: 'static' });
        }
      });
    }
  }

  seleccionarClienteResultado(cliente: any) {
    this.resultadosBusqueda = [];
    sessionStorage.setItem('cliente', JSON.stringify(cliente));
    try {
      this.formulario.patchValue(cliente);
      this.formulario.controls['tipo_documento_comprador'].setValue(cliente.tipo_documento_comprador);
      this.formulario.controls['indicativo_celular_comprador'].setValue(cliente.indicativo_celular_comprador);
      this.formulario.controls['numero_celular_comprador'].setValue(cliente.numero_celular_comprador);
      this.formulario.controls['indicativo_celular_whatsapp'].setValue(cliente.indicativo_celular_whatsapp);
      this.formulario.controls['numero_celular_whatsapp'].setValue(cliente.numero_celular_whatsapp);
      this.formulario.controls['apellidos_completos'].setValue(cliente.apellidos_completos);
      this.formulario.controls['nombres_completos'].setValue(cliente.nombres_completos);
      this.formulario.controls['documento'].setValue(cliente.documento);
      this.formulario.controls['correo_electronico_comprador'].setValue(cliente.correo_electronico_comprador);
      this.formulario.controls['estado'].setValue(cliente.estado);
      this.activarNotas = false;
      this.verNotas();
    } catch (error) {
      console.log(error);
    }
    this.datos = cliente;
    this.etiquetasSeleccionadas = Array.isArray(cliente.etiquetas) ? [...cliente.etiquetas] : [];
    if (cliente.datosFacturacionElectronica) this.formularioFacturacion.patchValue(cliente.datosFacturacionElectronica);
    if (cliente.datosEntrega) this.formularioEntrega.patchValue(cliente.datosEntrega);
    this.identificarDepto();
    this.identificarCiu();
    this.identificarDepto1();
    this.identificarCiu1();
    this.encontrado = true;
    this.bloqueado = this.formulario.value.estado === 'bloqueado';
  }

  toggleWithGreeting(tooltip, greeting: string) {
    if (tooltip.isOpen()) {
      tooltip.close();
    } else {
      tooltip.open({ greeting });
    }
  }
  redirectToPostalCode() {
    window.open('https://visor.codigopostal.gov.co/472/visor', '_blank');
  }

  replicarWhatsApp(event) {
    const checked = event?.target?.checked ?? (this.whatsapp?.nativeElement?.checked === true);
    if (checked) {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue(this.formulario.value.indicativo_celular_comprador);
      this.formulario.controls['numero_celular_whatsapp'].setValue(this.formulario.value.numero_celular_comprador);
    } else {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue('');
      this.formulario.controls['numero_celular_whatsapp'].setValue('');
    }
  }
  getBillingZone() {
    const context = this;
    this.service.getBillingZone().subscribe({
      next(value: any) {
        context.allBillingZone = value;
      },
      error(err) {
      },
    })
  }
  datosEntregass(event) {
    if (this.entregar === true) {
      this.nombres_entrega = this.formulario.value.nombres_completos
      this.apellidos_entrega = this.formulario.value.apellidos_completos
      this.indicativo_celular_entrega = this.formulario.value.indicativo_celular_comprador
      this.numero_celular_entrega = this.formulario.value.numero_celular_comprador
    } else {
      this.nombres_entrega = "";
      this.indicativo_celular_entrega = "57";
      this.numero_celular_entrega = "";
    }
  }
  idBillingZone(zona_cobro: any) {
    console.log(this.ciudad_municipio_entrega)
    const ciudad = this.ciudad_municipio_entrega
    const context = this;
    // this.service.getBillingZone().subscribe({
    //   next(value: any) {
    // context.allBillingZone = value;
    context.filteredResults = context.allBillingZone.filter(item => item.ciudad === ciudad);
    if (zona_cobro.zonaCobro) {
      context.zona_cobro = zona_cobro.zonaCobro;
      context.valor_zona_cobro = zona_cobro.valorZonaCobro

    }
    //   },
    //   error(err) {
    //     console.log(err);
    //   },
    // })
  }

  eliminarDato(index: number): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Desea eliminar este registro de facturación?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.datosFacturacionElectronica.splice(index, 1);
      const data = { documento: this.formulario.value.documento };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        this.formulario.controls['datosFacturacionElectronica'].setValue(this.datosFacturacionElectronica);
        this.formulario.controls['datosEntrega'].setValue(res.datosEntrega);
        this.formulario.controls['notas'].setValue(res.notas);
        this.formulario.controls['estado'].setValue(res.estado);
        this.service.editClient(this.formulario.value).subscribe(r => {
          Swal.fire({ title: 'Eliminado!', text: 'Eliminado con éxito', icon: 'success', confirmButtonText: 'Ok' });
        });
      });
    });
  }
  eliminarDato1(index: number): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Desea eliminar este registro de entrega?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.datosEntregas.splice(index, 1);
      const data = { documento: this.formulario.value.documento };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
        this.formulario.controls['datosEntrega'].setValue(this.datosEntregas);
        this.formulario.controls['notas'].setValue(res.notas);
        this.formulario.controls['estado'].setValue(res.estado);
        this.service.editClient(this.formulario.value).subscribe(r => {
          Swal.fire({ title: 'Eliminado!', text: 'Eliminado con éxito', icon: 'success', confirmButtonText: 'Ok' });
        });
      });
    });
  }
  ngOnInit(): void {
    this.getBillingZone()
    this.pais = 'Colombia';
    this.pais_entrega = 'Colombia';
    this.fecha = new Date()
    this.dateactual = this.fecha.getFullYear() + '-' + (this.fecha.getMonth() + 1).toString().padStart(2, '0') + '-' + this.fecha.getDate().toString().padStart(2, '0')
    this.paises = this.inforPaises.paises.map(x => {
      return x.Pais
    })
    this.IndicativoPlaceholder = 'indicativo'
    this.indicativos = this.infoIndicativo.datos

    this.clientConfig.loadClientTags().subscribe((tags) => {
      this.clientTagsCatalog = tags;
    });
    this.service.consultarTiposClienteActivos().subscribe({
      next: (tipos: any) => {
        this.clientTypes = Array.isArray(tipos) ? tipos.filter((t: any) => t.active !== false).map((t: any) => t.nombre) : [];
      },
      error: () => { this.clientTypes = []; }
    });

    this.formulario = this.formBuilder.group({
      cd: [''],
      nombres_completos: ['', Validators.required],
      apellidos_completos: ['', Validators.required],
      tipo_documento_comprador: ['CC-NIT', Validators.required],
      documento: ['', Validators.required],
      indicativo_celular_comprador: ['57', Validators.required],
      numero_celular_comprador: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      indicativo_celular_whatsapp: ['57', Validators.required],
      numero_celular_whatsapp: ['', Validators.required],
      correo_electronico_comprador: ['', [Validators.required, Validators.email]],
      tipoCliente: [''],
      fechaCumpleanos: [''],
      comoNosConocio: [''],
      etiquetas: [[]],
      datosFacturacionElectronica: [['']],
      datosEntrega: [['']],
      notas: [['']],
      estado: ['activo']
    });

    this.formularioFacturacion = this.formBuilder.group({
      alias_facturacion: [''],
      razon_social: ['', Validators.required],
      tipo_documento_facturacion: ['', Validators.required],
      numero_documento_facturacion: ['', Validators.required],
    })

    this.formularioEntrega = this.formBuilder.group({
      // Datos de Entrega
      nombres_entrega: ['', Validators.required],
      apellidos_entrega: ['', Validators.required],
      indicativo_celular_entrega: ['', Validators.required],
      numero_celular_entrega: ['', Validators.required],
      otro_numero_entrega: [''],
      direccion_entrega: ['', Validators.required],
      observaciones: [''],
      pais_entrega: ['', Validators.required],
      departamento_entrega: ['', Validators.required],
      ciudad_municipio_entrega: ['', Validators.required],
      codigo_postal_entrega: ['', Validators.required]
    });
  }
  validarSoloNumeros(event: KeyboardEvent) {
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  }


  crearCliente() {
    // Primero verificar si el cliente ya existe
    const documentoCliente = this.formulario.value.documento;

    if (!documentoCliente) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor ingrese un número de documento',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      return;
    }

    console.log("🔍 Verificando si el cliente ya existe con documento:", documentoCliente);

    this.service.getClientByDocument({ documento: documentoCliente }).subscribe({
      next: (res: any) => {
        // Verificar si el cliente ya existe
        const clienteExiste = res && res.company;

        if (clienteExiste) {
          // Cliente ya existe - mostrar alerta informativa
          console.log("⚠️ Cliente ya existe:", res);

          Swal.fire({
            title: "Cliente ya registrado",
            html: `
              <div class="text-start">
                <p>El documento <strong>${documentoCliente}</strong> ya se encuentra registrado.</p>
                <p><strong>Cliente:</strong> ${res.nombres_completos} ${res.apellidos_completos || ""}</p>
                <p>Se cargarán los datos del cliente existente.</p>
              </div>
            `,
            icon: "info",
            confirmButtonText: "Entendido",
          }).then(() => {
            // Cargar los datos del cliente existente en el formulario
            sessionStorage.setItem('cliente', JSON.stringify(res));
            this.formulario.patchValue(res);
            this.formulario.controls['tipo_documento_comprador'].setValue(res.tipo_documento_comprador);
            this.formulario.controls['indicativo_celular_comprador'].setValue(res.indicativo_celular_comprador);
            this.formulario.controls['numero_celular_comprador'].setValue(res.numero_celular_comprador);
            this.formulario.controls['indicativo_celular_whatsapp'].setValue(res.indicativo_celular_whatsapp);
            this.formulario.controls['numero_celular_whatsapp'].setValue(res.numero_celular_whatsapp);
            this.formulario.controls['apellidos_completos'].setValue(res.apellidos_completos);
            this.formulario.controls['nombres_completos'].setValue(res.nombres_completos);
            this.formulario.controls['documento'].setValue(res.documento);
            this.formulario.controls['correo_electronico_comprador'].setValue(res.correo_electronico_comprador);
            this.formulario.controls['estado'].setValue(res.estado);

            this.datos = res;
            this.formularioFacturacion.patchValue(res.datosFacturacionElectronica);
            this.formularioEntrega.patchValue(res.datosEntrega);
            this.identificarDepto();
            this.identificarCiu();
            this.identificarDepto1();
            this.identificarCiu1();
            this.encontrado = true;

            this.bloqueado = res.estado === 'inactivo';
          });
        } else {
          // Cliente no existe - proceder con la creación
          console.log("✅ Cliente no existe, procediendo con creación");
          this.ejecutarCreacionCliente();
        }
      },
      error: (error: any) => {
        // En caso de error en la búsqueda, intentar crear el cliente de todas formas
        console.warn("⚠️ Error al verificar cliente existente, procediendo con creación:", error);
        this.ejecutarCreacionCliente();
      },
    });
  }

  private ejecutarCreacionCliente() {
    this.formulario.controls['datosFacturacionElectronica'].setValue([]);
    this.formulario.controls['datosEntrega'].setValue([]);
    this.formulario.controls['notas'].setValue([]);
    this.formulario.controls['estado'].setValue('activo');
    this.formulario.controls['etiquetas'].setValue(this.etiquetasSeleccionadas);
    this.service.createClient(this.formulario.value).subscribe(r => {
      const data = { documento: this.formulario.value.documento };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        sessionStorage.setItem('cliente', JSON.stringify(res));
        this.formulario.patchValue(res);
        this.datos = res;
        this.etiquetasSeleccionadas = Array.isArray(res.etiquetas) ? [...res.etiquetas] : [];
        this.datosFacturacionElectronica = res.datosFacturacionElectronica || [];
        this.datosEntregas = res.datosEntrega || [];
        this.notas = res.notas || [];
        this.formularioFacturacion.patchValue(res.datosFacturacionElectronica);
        this.formularioEntrega.patchValue(res.datosEntrega);
        this.identificarDepto();
        this.identificarCiu();
        this.identificarDepto1();
        this.identificarCiu1();
        this.encontrado = true;
        this.showClienteModal = false;
        Swal.fire({
          title: '¡Cliente creado!',
          text: `${res.nombres_completos} ${res.apellidos_completos || ''} fue guardado exitosamente.`,
          icon: 'success',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      });
    });
  }
  bloquear() {

    this.formulario.controls['estado'].setValue('bloqueado')
    this.service.editClient(this.formulario.value).subscribe(r => {
      Swal.fire({
        title: 'Usuario Bloqueado!',
        text: 'Usuario bloqueado con exito',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      const data = {
        documento: this.documentoBusqueda.nativeElement.value
      }
      this.service.getClientByDocument(data).subscribe((res: any) => {
        sessionStorage.setItem('cliente', JSON.stringify(res))
        this.formulario.patchValue(res)
        this.datos = res
        this.formularioFacturacion.patchValue(res.datosFacturacionElectronica)
        this.formularioEntrega.patchValue(res.datosEntrega)
        this.identificarDepto()
        this.identificarCiu()
        this.identificarDepto1()
        this.identificarCiu1()
        this.encontrado = true
        if (this.formulario.value.estado == 'bloqueado') {
          this.bloqueado = true
        } else {
          this.bloqueado = false
        }
      })
    });

  }

  editarDatos1(modal, index) {
    this.idenxFacturacion = index
    this.editandodato = true
    this.alias_facturacion = this.datosFacturacionElectronica[index].alias
    this.razon_social = this.datosFacturacionElectronica[index].nombres
    this.tipo_documento_facturacion = this.datosFacturacionElectronica[index].tipoDocumento
    this.numero_documento_facturacion = this.datosFacturacionElectronica[index].documento
    this.direccion_facturacion = this.datosFacturacionElectronica[index].direccion
    this.pais = this.datosFacturacionElectronica[index].pais
    this.departamento = this.datosFacturacionElectronica[index].departamento
    this.ciudad_municipio = this.datosFacturacionElectronica[index].ciudad
    this.codigo_postal = this.datosFacturacionElectronica[index].codigoPostal
    this.identificarDepto()
    this.identificarCiu()
    this.notaModalRef = this.modalService.open(modal, { size: 'lg' });
    this.notaModalRef.result.then(
      () => { this.limpiarVariables(); },
      () => { this.limpiarVariables(); }
    );
  }
  editarDatosFacturacion() {
    if (!this.razon_social || !this.tipo_documento_facturacion || !this.numero_documento_facturacion) {
      Swal.fire({ title: 'Error', text: 'Razón Social, Tipo de Documento y Documento son obligatorios', icon: 'error', confirmButtonText: 'Ok' });
      return;
    }
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
    }
    this.datosFacturacionElectronica[this.idenxFacturacion] = datosFacturacionElec
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.formulario.controls['datosFacturacionElectronica'].setValue(this.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(res.datosEntrega);
      this.formulario.controls['notas'].setValue(res.notas);
      this.formulario.controls['estado'].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe(r => {
        if (this.notaModalRef) { this.notaModalRef.close(); }
        Swal.fire({ title: 'Editado!', text: 'Editado con éxito', icon: 'success', confirmButtonText: 'Ok' });
      });


    })
  }
  editarDatos(modal, index) {
    this.idenxEntrega = index;
    this.editandodato = true;
    const d = this.datosEntregas[index];
    this.alias_entrega = d.alias;
    this.nombres_entrega = d.nombres;
    this.apellidos_entrega = d.apellidos;
    this.indicativo_celular_entrega = d.indicativoCel || '57';
    this.numero_celular_entrega = d.celular;
    this.indicativo_celular_entrega2 = d.indicativoOtroNumero || '57';
    this.otro_numero_entrega = d.otroNumero;
    this.direccion_entrega = d.direccionEntrega;
    this.observaciones = d.observaciones;
    this.barrio = d.barrio;
    this.nombreUnidad = d.nombreUnidad;
    this.especificacionesInternas = d.especificacionesInternas;
    this.pais_entrega = d.pais;
    this.departamento_entrega = d.departamento;
    this.ciudad_municipio_entrega = d.ciudad;
    this.zona_cobro = d.zonaCobro;
    this.valor_zona_cobro = d.valorZonaCobro;
    this.codigo_postal_entrega = d.codigoPV;
    this.latitud = d.latitud || '';
    this.longitud = d.longitud || '';
    this.coordenadas = d.coordenadas || '';
    this.identificarDepto1();
    this.identificarCiu1();
    this.notaModalRef = this.modalService.open(modal, { size: 'lg' });
    this.notaModalRef.result.then(
      () => { this.limpiarVariables(); },
      () => { this.limpiarVariables(); }
    );
  }
  editarDatosEntrega() {
    if (!this.nombres_entrega || !this.numero_celular_entrega || !this.direccion_entrega || !this.ciudad_municipio_entrega) {
      Swal.fire({ title: 'Campos obligatorios', text: 'Nombres, Celular, Dirección y Ciudad son requeridos', icon: 'warning', confirmButtonText: 'Ok' });
      return;
    }
    const datosEntreg = {
      alias: this.alias_entrega,
      nombres: this.nombres_entrega,
      apellidos: this.apellidos_entrega,
      indicativoCel: this.indicativo_celular_entrega,
      celular: this.numero_celular_entrega,
      indicativoOtroNumero: this.indicativo_celular_entrega2,
      otroNumero: this.otro_numero_entrega,
      direccionEntrega: this.direccion_entrega,
      observaciones: this.observaciones,
      barrio: this.barrio,
      nombreUnidad: this.nombreUnidad,
      especificacionesInternas: this.especificacionesInternas,
      pais: this.pais_entrega,
      departamento: this.departamento_entrega,
      ciudad: this.ciudad_municipio_entrega,
      zonaCobro: this.zona_cobro,
      valorZonaCobro: this.valor_zona_cobro,
      codigoPV: this.codigo_postal_entrega,
      latitud: this.latitud,
      longitud: this.longitud,
      coordenadas: this.coordenadas,
    };
    this.datosEntregas[this.idenxEntrega] = datosEntreg;
    const data = { documento: this.documentoBusqueda.nativeElement.value };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(this.datosEntregas);
      this.formulario.controls['notas'].setValue(res.notas);
      this.formulario.controls['estado'].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe(r => {
        if (this.notaModalRef) { this.notaModalRef.close(); }
        Swal.fire({ title: 'Editado!', text: 'Editado con éxito', icon: 'success', confirmButtonText: 'Ok' });
        this.limpiarVariablesEntrega();
      });
    });
  }
  limpiarVariablesEntrega() {
    this.alias_entrega = '';
    this.nombres_entrega = '';
    this.apellidos_entrega = '';
    this.indicativo_celular_entrega = '57';
    this.indicativo_celular_entrega2 = '57';
    this.numero_celular_entrega = '';
    this.otro_numero_entrega = '';
    this.direccion_entrega = '';
    this.observaciones = '';
    this.barrio = '';
    this.nombreUnidad = '';
    this.especificacionesInternas = '';
    this.pais_entrega = 'Colombia';
    this.departamento_entrega = '';
    this.ciudad_municipio_entrega = '';
    this.zona_cobro = '';
    this.valor_zona_cobro = '';
    this.codigo_postal_entrega = '';
    this.latitud = '';
    this.longitud = '';
    this.coordenadas = '';
    this.searchQueryCiudadDane = '';
    this.municipiosDane = [];
  }

  limpiarVariables() {
    this.editandodato = false;
    this.limpiarVariablesEntrega();
    this.facturacionElectronica = false;
    this.alias_facturacion = '';
    this.razon_social = '';
    this.tipo_documento_facturacion = 'CC-NIT';
    this.numero_documento_facturacion = '';
  }
  private notaModalRef: any;

  nuevoPedido() {
    const documento = this.documentoBusqueda?.nativeElement?.value || this.formulario?.value?.documento;
    if (!documento) {
      Swal.fire({ title: 'Sin cliente', text: 'Primero busca o crea un cliente para crear un pedido', icon: 'warning', confirmButtonText: 'Ok' });
      return;
    }
    this.router.navigate(['/ventas/crear-ventas'], { queryParams: { documento } });
  }

  abrirModalAgregarEntrega(modal: any) {
    this.editandodato = false;
    this.limpiarVariablesEntrega();
    this.notaModalRef = this.modalService.open(modal, { size: 'lg' });
    this.notaModalRef.result.then(
      () => { this.limpiarVariables(); },
      () => { this.limpiarVariables(); }
    );
  }

  openLg(notaAclaratoria) {
    this.notaModalRef = this.modalService.open(notaAclaratoria, { size: 'lg' });
    this.notaModalRef.result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        this.limpiarVariables();
      }
    );
  }

  guardarNota() {
    this.fecha = new Date()
    this.notas = []
    const nota = {
      fecha: this.fecha.getFullYear() + '-' + (this.fecha.getMonth() + 1).toString().padStart(2, '0') + '-' + this.fecha.getDate().toString().padStart(2, '0'),
      nota: this.notaNueva
    }
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      res.notas.map(x => {
        this.notas.push(x)
      })
      this.notas.push(nota)
      this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(res.datosEntrega);
      this.formulario.controls['notas'].setValue(this.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        if (this.notaModalRef) {
          this.notaModalRef.close();
        }
        Swal.fire({
          title: 'Guardado!',
          text: 'Guardado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.notaNueva = "";
      });
    })
  }
  guardarDatosFacturacionElectronica() {
    if (!this.razon_social || !this.tipo_documento_facturacion || !this.numero_documento_facturacion) {
      Swal.fire({ title: 'Error', text: 'Razón Social, Tipo de Documento y Documento son obligatorios', icon: 'error', confirmButtonText: 'Ok' });
      return;
    }

    this.datosFacturacionElectronica = []
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
    }
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      (res.datosFacturacionElectronica || []).forEach(x => {
        this.datosFacturacionElectronica.push(x)
      })
      this.datosFacturacionElectronica.push(datosFacturacionElec)
      this.formulario.controls['datosFacturacionElectronica'].setValue(this.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(res.datosEntrega);
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        if (this.notaModalRef) { this.notaModalRef.close(); }
        Swal.fire({
          title: 'Guardado!',
          text: 'Guardado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.facturacionElectronica = false
        this.alias_facturacion = ""
        this.razon_social = ""
        this.tipo_documento_facturacion = ""
        this.numero_documento_facturacion = ""
      });

    })
  }
  guardarDatosEntrega() {
    if (!this.nombres_entrega || !this.numero_celular_entrega || !this.direccion_entrega || !this.ciudad_municipio_entrega) {
      Swal.fire({ title: 'Campos obligatorios', text: 'Nombres, Celular, Dirección y Ciudad son requeridos', icon: 'warning', confirmButtonText: 'Ok' });
      return;
    }
    this.datosEntregas = [];
    const datosEntreg = {
      alias: this.alias_entrega,
      nombres: this.nombres_entrega,
      apellidos: this.apellidos_entrega,
      indicativoCel: this.indicativo_celular_entrega,
      celular: this.numero_celular_entrega,
      indicativoOtroNumero: this.indicativo_celular_entrega2,
      otroNumero: this.otro_numero_entrega,
      direccionEntrega: this.direccion_entrega,
      observaciones: this.observaciones,
      barrio: this.barrio,
      nombreUnidad: this.nombreUnidad,
      especificacionesInternas: this.especificacionesInternas,
      pais: this.pais_entrega,
      departamento: this.departamento_entrega,
      ciudad: this.ciudad_municipio_entrega,
      zonaCobro: this.zona_cobro,
      valorZonaCobro: this.valor_zona_cobro,
      codigoPV: this.codigo_postal_entrega,
      latitud: this.latitud,
      longitud: this.longitud,
      coordenadas: this.coordenadas,
    };
    const data = { documento: this.documentoBusqueda.nativeElement.value };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      (res.datosEntrega || []).forEach((x: any) => { this.datosEntregas.push(x); });
      this.datosEntregas.push(datosEntreg);
      this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(this.datosEntregas);
      this.formulario.controls['notas'].setValue(res.notas);
      this.formulario.controls['estado'].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe(r => {
        if (this.notaModalRef) { this.notaModalRef.close(); }
        Swal.fire({ title: 'Guardado!', text: 'Guardado con éxito', icon: 'success', confirmButtonText: 'Ok' });
        this.limpiarVariablesEntrega();
      });
    });
  }
  desbloquear() {

    this.formulario.controls['estado'].setValue('activo')
    this.service.editClient(this.formulario.value).subscribe(r => {
      console.log(r)
      Swal.fire({
        title: 'Usuario Desbloqueado!',
        text: 'Usuario desbloqueado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
      const data = {
        documento: this.documentoBusqueda.nativeElement.value
      }
      this.service.getClientByDocument(data).subscribe((res: any) => {
        sessionStorage.setItem('cliente', JSON.stringify(res))
        this.formulario.patchValue(res)
        this.datos = res
        this.formularioFacturacion.patchValue(res.datosFacturacionElectronica)
        this.formularioEntrega.patchValue(res.datosEntrega)
        this.identificarDepto()
        this.identificarCiu()
        this.identificarDepto1()
        this.identificarCiu1()
        this.encontrado = true
        if (this.formulario.value.estado == 'bloqueado') {
          this.bloqueado = true
        } else {
          this.bloqueado = false
        }
      })
    });
  }
  verNotas() {
    if (this.activarNotas == true) {
      this.activarNotas = false
    } else {
      this.activarNotas = true
      this.notas = []
      const data = {
        documento: this.documentoBusqueda.nativeElement.value
      }

      this.service.getClientByDocument(data).subscribe((res: any) => {
        res.notas.map(x => {
          this.notas.push(x)

        })
      })
    }
  }
  verDatosFacturacion() {
    if (this.activarDatosFact == true) {
      this.activarDatosFact = false
    } else {
      this.activarDatosFact = true
      this.datosFacturacionElectronica = []
      const data = {
        documento: this.documentoBusqueda.nativeElement.value
      }

      this.service.getClientByDocument(data).subscribe((res: any) => {
        res.datosFacturacionElectronica.map(x => {
          this.datosFacturacionElectronica.push(x)

        })
      })
    }
  }
  verDatosEntrega() {
    if (this.activarDatosEntrega == true) {
      this.activarDatosEntrega = false
    } else {
      this.activarDatosEntrega = true
      this.datosEntregas = []
      const data = {
        documento: this.documentoBusqueda.nativeElement.value
      }

      this.service.getClientByDocument(data).subscribe((res: any) => {
        res.datosEntrega.map(x => {
          this.datosEntregas.push(x)

        })
      })
    }
  }

  editarCliente() {
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(res.datosEntrega);
      this.formulario.controls['notas'].setValue(res.notas);
      this.formulario.controls['estado'].setValue(res.estado);
      // Guardar etiquetas seleccionadas en el formulario antes de enviar
      this.formulario.controls['etiquetas'].setValue(this.etiquetasSeleccionadas);
      this.service.editClient(this.formulario.value).subscribe(r => {
        if (this.isEdit) {
          this.service.getClientByDocument(data).subscribe((clienteActualizado: any) => {
            this.modalService.dismissAll(clienteActualizado);
            Swal.fire({ title: 'Editado!', text: 'Cliente actualizado con éxito', icon: 'success', confirmButtonText: 'Ok' });
          }, error => {
            this.modalService.dismissAll(this.formulario.value);
            Swal.fire({ title: 'Editado!', text: 'Cliente actualizado (con advertencia)', icon: 'warning', confirmButtonText: 'Ok' });
          });
        } else {
          // Actualizar estado local con los datos del formulario (sin request adicional)
          const datosActualizados = { ...this.datos, ...this.formulario.value };
          datosActualizados.etiquetas = this.etiquetasSeleccionadas;
          this.datos = datosActualizados;
          this.bloqueado = this.formulario.value.estado === 'bloqueado';
          this.encontrado = true;
          sessionStorage.setItem('cliente', JSON.stringify(datosActualizados));
          this.showClienteModal = false;
          Swal.fire({
            title: '¡Cliente actualizado!',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        }
      });
    })

  }

  cambiarEstado(estado: string) {

    // if (estado === 'on') {
    //   estado = 'off';
    // } else {
    //   estado = 'on';
    // }

    // if (estado !== 'on') {
    //   this.formulario.controls['estado'].setValue('activo')
    // } else {
    //   this.formulario.controls['estado'].setValue('bloqueado')
    // }

    this.formulario.controls['estado'].setValue(estado !== 'on' ? 'activo' : 'bloqueado')
    this.service.editClient(this.formulario.value).subscribe(r => {
      console.log(r)
      // Swal.fire({
      //   title: 'Usuario Bloqueado!',
      //   text: 'Usuario bloqueado con exito',
      //   icon: 'error',
      //   confirmButtonText: 'Ok'
      // });
      const data = {
        documento: this.documentoBusqueda.nativeElement.value
      }
      this.service.getClientByDocument(data).subscribe((res: any) => {
        sessionStorage.setItem('cliente', JSON.stringify(res))
        this.formulario.patchValue(res)
        this.datos = res
        this.formularioFacturacion.patchValue(res.datosFacturacionElectronica)
        this.formularioEntrega.patchValue(res.datosEntrega)
        this.identificarDepto()
        this.identificarCiu()
        this.identificarDepto1()
        this.identificarCiu1()
        this.encontrado = true
        if (this.formulario.value.estado == 'bloqueado') {
          this.bloqueado = true
        } else {
          this.bloqueado = false
        }
      })
    });


  }

  // =============================================
  // ETIQUETAS
  // =============================================
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
      blue:   '#1d4ed8',
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
  // DIALOG CREAR / EDITAR (modo standalone)
  // =============================================
  showClienteModal: boolean = false;

  abrirModalCrear(): void {
    this.encontrado = false;
    this.bloqueado = false;
    this.etiquetasSeleccionadas = [];
    this.resultadosBusqueda = [];
    if (this.formulario) {
      this.formulario.reset();
      this.formulario.patchValue({
        indicativo_celular_comprador: '57',
        indicativo_celular_whatsapp: '57',
        tipo_documento_comprador: 'CC-NIT',
        estado: 'activo'
      });
    }
    this.showClienteModal = true;
  }

  abrirModalEditar(): void {
    if (this.datos) {
      this.formulario.patchValue(this.datos);
      this.formulario.controls['tipo_documento_comprador'].setValue(this.datos.tipo_documento_comprador);
      this.formulario.controls['indicativo_celular_comprador'].setValue(this.datos.indicativo_celular_comprador);
      this.formulario.controls['numero_celular_comprador'].setValue(this.datos.numero_celular_comprador);
      this.formulario.controls['indicativo_celular_whatsapp'].setValue(this.datos.indicativo_celular_whatsapp);
      this.formulario.controls['numero_celular_whatsapp'].setValue(this.datos.numero_celular_whatsapp);
      this.formulario.controls['apellidos_completos'].setValue(this.datos.apellidos_completos);
      this.formulario.controls['nombres_completos'].setValue(this.datos.nombres_completos);
      this.formulario.controls['documento'].setValue(this.datos.documento);
      this.formulario.controls['correo_electronico_comprador'].setValue(this.datos.correo_electronico_comprador);
      this.formulario.controls['estado'].setValue(this.datos.estado);
      if (this.datos.tipoCliente) {
        this.formulario.controls['tipoCliente'].setValue(this.datos.tipoCliente);
      }
      this.etiquetasSeleccionadas = Array.isArray(this.datos.etiquetas) ? [...this.datos.etiquetas] : [];
    }
    this.showClienteModal = true;
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
    const name = this.newTagNameCfg.trim();
    if (name && !this.editableTagsCfg.find(t => t.name === name)) {
      this.editableTagsCfg.push({ name, color: this.newTagColorCfg });
    }
    this.newTagNameCfg = '';
  }

  removeTagCfg(index: number): void {
    const tag = this.editableTagsCfg[index];
    Swal.fire({
      title: `¿Eliminar etiqueta "${tag.name}"?`,
      text: 'Se quitará de todos los clientes que la tengan asignada. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
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
          title: 'Etiqueta eliminada',
          text: `La etiqueta "${tag.name}" fue eliminada del catálogo y de los clientes asignados.`,
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
