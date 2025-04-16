import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2'
import { DataStoreService } from '../../../shared/services/dataStoreService';
import { InfoPaises } from '../../../../Mock/pais-estado-ciudad'
import { InfoIndicativos } from '../../../../Mock/indicativosPais'
import { NgbActiveModal, NgbModal, ModalDismissReasons, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { CrearClienteModalComponent } from './crear-cliente-modal/crear-cliente-modal.component';
@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit, AfterViewInit {

  @ViewChild('buscarPor') buscarPor: ElementRef
  @ViewChild('documentoBusqueda') documentoBusqueda: ElementRef
  @ViewChild('whatsapp') whatsapp: ElementRef

  @Input() clienteEdit: any;
  formulario: any;
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
  editandodato: boolean;
  idenxEntrega: any;
  idenxFacturacion: any;
  @Input() isEdit: boolean = false;
  filteredResults: any;
  allBillingZone: any;
  zona_cobro: any;
  valor_zona_cobro: any;


  constructor(private router: Router, private dataStore: DataStoreService, private modalService: NgbModal, private inforPaises: InfoPaises, private formBuilder: FormBuilder, private service: MaestroService, private infoIndicativo: InfoIndicativos) {

  }

  ngAfterViewInit(): void {
    if (this.isEdit === null || this.isEdit === undefined || this.isEdit === false) {
      const isEditFromStore = this.dataStore.get<boolean>('isEdit');
      if (isEditFromStore !== null && isEditFromStore !== undefined) {
        this.isEdit = isEditFromStore;
        this.dataStore.remove('isEdit');
      }
    }

    if (!this.clienteEdit) {
      const clienteFromStore = this.dataStore.get<any>('cliente');
      if (clienteFromStore !== null && clienteFromStore !== undefined) {
        this.clienteEdit = clienteFromStore;
        this.dataStore.remove('cliente');
      }
    }

    if (this.isEdit) {
      if (this.clienteEdit) {
        this.documentoBusqueda.nativeElement.value = this.clienteEdit.documento;
        // this.formulario.controls['documento'].disable();
        this.buscar();

      }
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

  datosFacElect(event) {
    if (this.facturacionElectronica === true) {
      this.razon_social = this.formulario.value.nombres_completos + ' ' + this.formulario.value.apellidos_completos
      this.tipo_documento_facturacion = this.formulario.value.tipo_documento_comprador
      this.numero_documento_facturacion = this.formulario.value.documento
      this.indicativo_celular_facturacion = this.formulario.value.indicativo_celular_comprador
      this.numero_celular_facturacion = this.formulario.value.numero_celular_comprador
      this.correo_electronico_facturacion = this.formulario.value.correo_electronico_comprador
    } else {
      this.razon_social = ""
      this.tipo_documento_facturacion = ""
      this.numero_documento_facturacion = ""
      this.indicativo_celular_facturacion = ""
      this.numero_celular_facturacion = ""
      this.correo_electronico_facturacion = ""
    }
  }

  buscar() {

    this.bloqueado = false
    this.formulario.reset()
    this.formularioEntrega.reset()
    this.formularioFacturacion.reset()
    if (this.buscarPor.nativeElement.value == "CC-NIT") {

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
          this.formularioFacturacion.patchValue(res.datosFacturacionElectronica)
          this.formularioEntrega.patchValue(res.datosEntrega)
          this.identificarDepto()
          this.identificarCiu()
          this.identificarDepto1()
          this.identificarCiu1()
          this.encontrado = true
          if (this.formulario.value.estado == 'bloqueado') {
            this.bloqueado = true
          }
          Swal.fire({
            title: 'Consultado!',
            text: 'Consultado con exito',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
        }

      });
    }
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
    console.log(event)
    if (this.whatsapp.nativeElement.checked === true) {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue(this.formulario.value.indicativo_celular_comprador)
      this.formulario.controls['numero_celular_whatsapp'].setValue(this.formulario.value.numero_celular_comprador)
    } else {
      this.formulario.controls['indicativo_celular_whatsapp'].setValue("")
      this.formulario.controls['numero_celular_whatsapp'].setValue("")
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
      this.nombres_entrega = ""
      this.indicativo_celular_entrega = ""
      this.numero_celular_entrega = ""

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
    // Eliminar el elemento en el índice especificado
    this.datosFacturacionElectronica.splice(index, 1);
    const data = {
      documento: this.formulario.value.documento
    }
    this.service.getClientByDocument(data).subscribe((res: any) => {


      this.formulario.controls['datosFacturacionElectronica'].setValue(this.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(res.datosEntrega);
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        console.log(r)
        Swal.fire({
          title: 'Eliminado!',
          text: 'Eliminado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
      })
    })
  }
  eliminarDato1(index: number): void {
    // Eliminar el elemento en el índice especificado
    this.datosEntregas.splice(index, 1);
    const data = {
      documento: this.formulario.value.documento
    }
    this.service.getClientByDocument(data).subscribe((res: any) => {


      this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(this.datosEntregas);
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        console.log(r)
        Swal.fire({
          title: 'Eliminado!',
          text: 'Eliminado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
      })
    })
  }
  ngOnInit(): void {
    this.getBillingZone()
    this.fecha = new Date()
    this.dateactual = this.fecha.getFullYear() + '-' + (this.fecha.getMonth() + 1).toString().padStart(2, '0') + '-' + this.fecha.getDate().toString().padStart(2, '0')
    this.paises = this.inforPaises.paises.map(x => {
      return x.Pais
    })
    this.IndicativoPlaceholder = 'indicativo'
    this.indicativos = this.infoIndicativo.datos

    this.formulario = this.formBuilder.group({
      cd: [''],
      nombres_completos: ['', Validators.required],
      apellidos_completos: ['', Validators.required],
      tipo_documento_comprador: ['', Validators.required],
      documento: ['', Validators.required],
      indicativo_celular_comprador: ['', Validators.required],
      numero_celular_comprador: ['', Validators.required],
      indicativo_celular_whatsapp: ['', Validators.required],
      numero_celular_whatsapp: ['', Validators.required],
      correo_electronico_comprador: ['', [Validators.required, Validators.email]],
      datosFacturacionElectronica: [['']],
      datosEntrega: [['']],
      notas: [['']],
      estado: ['activo']
    });

    this.formularioFacturacion = this.formBuilder.group({
      // Datos para facturación electrónica
      razon_social: ['', Validators.required],
      tipo_documento_facturacion: ['', Validators.required],
      numero_documento_facturacion: ['', Validators.required],
      indicativo_celular_facturacion: ['', Validators.required],
      numero_celular_facturacion: ['', Validators.required],
      correo_electronico_facturacion: ['', [Validators.required, Validators.email]],
      direccion_facturacion: ['', Validators.required],
      pais: ['', Validators.required],
      departamento: ['', Validators.required],
      ciudad_municipio: ['', Validators.required],
      codigo_postal: ['', Validators.required]
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
    const input = event.target as HTMLInputElement;
    // Reemplaza cualquier cosa que no sea un número (0-9) con una cadena vacía
    input.value = input.value.replace(/[^0-9]/g, '');
  }


  crearCliente() {
    this.formulario.controls['datosFacturacionElectronica'].setValue([]);
    this.formulario.controls['datosEntrega'].setValue([]);
    this.formulario.controls['notas'].setValue([])
    this.formulario.controls['estado'].setValue('activo')
    this.service.createClient(this.formulario.value).subscribe(r => {
      console.log(r)
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con exito',
        icon: 'success',
        confirmButtonText: 'Ok'
      });
      const data = {
        documento: this.formulario.value.documento
      }
      this.service.getClientByDocument(data).subscribe((res: any) => {
        console.log(res)
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
      })
    });
  }
  bloquear() {

    this.formulario.controls['estado'].setValue('bloqueado')
    this.service.editClient(this.formulario.value).subscribe(r => {
      console.log(r)
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
          this.bloqueado = false;

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
    this.indicativo_celular_facturacion = this.datosFacturacionElectronica[index].indicativoCel
    this.numero_celular_facturacion = this.datosFacturacionElectronica[index].celular
    this.correo_electronico_facturacion = this.datosFacturacionElectronica[index].correoElectronico
    this.direccion_facturacion = this.datosFacturacionElectronica[index].direccion
    this.pais = this.datosFacturacionElectronica[index].pais
    this.departamento = this.datosFacturacionElectronica[index].departamento
    this.ciudad_municipio = this.datosFacturacionElectronica[index].ciudad
    this.codigo_postal = this.datosFacturacionElectronica[index].codigoPostal
    this.identificarDepto()
    this.identificarCiu()
    this.modalService.open(modal, { size: 'lg' }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
        this.limpiarVariables();
      }
    );
  }
  editarDatosFacturacion() {
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
      indicativoCel: this.indicativo_celular_facturacion,
      celular: this.numero_celular_facturacion,
      correoElectronico: this.correo_electronico_facturacion,
      direccion: this.direccion_facturacion,
      pais: this.pais,
      departamento: this.departamento,
      ciudad: this.ciudad_municipio,
      codigoPostal: this.codigo_postal
    }
    this.datosFacturacionElectronica[this.idenxFacturacion] = datosFacturacionElec
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.formulario.controls['datosFacturacionElectronica'].setValue(this.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(res.datosEntregas);
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {

        Swal.fire({
          title: 'Editado!',
          text: 'Editado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.alias_entrega = ""
        this.nombres_entrega = ""
        this.indicativo_celular_entrega = ""
        this.numero_celular_entrega = ""
        this.otro_numero_entrega = ""
        this.direccion_entrega = ""
        this.observaciones = ""
        this.pais_entrega = ""
        this.departamento_entrega = ""
        this.ciudad_municipio_entrega = ""
        this.codigo_postal_entrega = ""
      });


    })
  }
  editarDatos(modal, index) {
    this.idenxEntrega = index
    this.editandodato = true
    this.alias_entrega = this.datosEntregas[index].alias
    this.nombres_entrega = this.datosEntregas[index].nombres
    this.apellidos_entrega = this.datosEntregas[index].apellidos
    this.indicativo_celular_entrega = this.datosEntregas[index].indicativoCel
    this.numero_celular_entrega = this.datosEntregas[index].celular
    this.indicativo_celular_entrega2 = this.datosEntregas[index].indicativoOtroNumero
    this.otro_numero_entrega = this.datosEntregas[index].otroNumero
    this.direccion_entrega = this.datosEntregas[index].direccionEntrega
    this.observaciones = this.datosEntregas[index].observaciones
    this.barrio = this.datosEntregas[index].barrio
    this.nombreUnidad = this.datosEntregas[index].nombreUnidad
    this.especificacionesInternas = this.datosEntregas[index].especificacionesInternas
    this.pais_entrega = this.datosEntregas[index].pais
    this.departamento_entrega = this.datosEntregas[index].departamento
    this.ciudad_municipio_entrega = this.datosEntregas[index].ciudad
    this.codigo_postal_entrega = this.datosEntregas[index].codigoPV

    this.identificarDepto1()
    this.identificarCiu1()
    this.zona_cobro = this.datosEntregas[index].zonaCobro
    this.modalService.open(modal, { size: 'lg' }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
        this.limpiarVariables();
      }
    );
  }
  editarDatosEntrega() {
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
      codigoPV: this.codigo_postal_entrega,

    }
    this.datosEntregas[this.idenxEntrega] = datosEntreg
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(this.datosEntregas);
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        console.log(r)
        Swal.fire({
          title: 'Editado!',
          text: 'Editado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.alias_entrega = ""
        this.nombres_entrega = ""
        this.indicativo_celular_entrega = ""
        this.numero_celular_entrega = ""
        this.otro_numero_entrega = ""
        this.direccion_entrega = ""
        this.observaciones = ""
        this.pais_entrega = ""
        this.departamento_entrega = ""
        this.ciudad_municipio_entrega = ""
        this.codigo_postal_entrega = ""
      });


    })
  }
  limpiarVariables() {
    this.editandodato = false
    this.alias_entrega = "";
    this.nombres_entrega = "";
    this.indicativo_celular_entrega = "";
    this.numero_celular_entrega = "";
    this.otro_numero_entrega = "";
    this.direccion_entrega = "";
    this.observaciones = "";
    this.pais_entrega = "";
    this.departamento_entrega = "";
    this.ciudad_municipio_entrega = "";
    this.codigo_postal_entrega = "";
    this.facturacionElectronica = false
    this.alias_facturacion = ""
    this.razon_social = ""
    this.tipo_documento_facturacion = ""
    this.numero_documento_facturacion = ""
    this.indicativo_celular_facturacion = ""
    this.numero_celular_facturacion = ""
    this.correo_electronico_facturacion = ""
    this.direccion_facturacion = ""
    this.pais = ""
    this.departamento = ""
    this.ciudad_municipio = ""
    this.codigo_postal = ""
  }
  openLg(notaAclaratoria) {
    this.modalService.open(notaAclaratoria, { size: 'lg' }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
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
        console.log(r)
        Swal.fire({
          title: 'Guardado!',
          text: 'Guardado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.notaNueva = ""
      });

    })
  }
  guardarDatosFacturacionElectronica() {

    this.datosFacturacionElectronica = []
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
      indicativoCel: this.indicativo_celular_facturacion,
      celular: this.numero_celular_facturacion,
      correoElectronico: this.correo_electronico_facturacion,
      direccion: this.direccion_facturacion,
      pais: this.pais,
      departamento: this.departamento,
      ciudad: this.ciudad_municipio,
      codigoPostal: this.codigo_postal
    }
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      res.datosFacturacionElectronica.map(x => {
        this.datosFacturacionElectronica.push(x)

      })
      this.datosFacturacionElectronica.push(datosFacturacionElec)
      this.formulario.controls['datosFacturacionElectronica'].setValue(this.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(res.datosEntrega);
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        console.log(r)
        Swal.fire({
          title: 'Guardado!',
          text: 'Guardado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.facturacionElectronica = false
        this.alias_facturacion = ""
        this.razon_social = ""
        this.tipo_documento_facturacion = ""
        this.numero_documento_facturacion = ""
        this.indicativo_celular_facturacion = ""
        this.numero_celular_facturacion = ""
        this.correo_electronico_facturacion = ""
        this.direccion_facturacion = ""
        this.pais = ""
        this.departamento = ""
        this.ciudad_municipio = ""
        this.codigo_postal = ""
      });

    })
  }
  guardarDatosEntrega() {

    this.datosEntregas = []
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
      codigoPV: this.codigo_postal_entrega,

    }
    const data = {
      documento: this.documentoBusqueda.nativeElement.value
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      res.datosEntrega.map(x => {
        this.datosEntregas.push(x)

      })
      this.datosEntregas.push(datosEntreg)
      this.formulario.controls['datosFacturacionElectronica'].setValue(res.datosFacturacionElectronica);
      this.formulario.controls['datosEntrega'].setValue(this.datosEntregas);
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        console.log(r)
        Swal.fire({
          title: 'Guardado!',
          text: 'Guardado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.alias_entrega = ""
        this.nombres_entrega = ""
        this.indicativo_celular_entrega = ""
        this.numero_celular_entrega = ""
        this.otro_numero_entrega = ""
        this.direccion_entrega = ""
        this.observaciones = ""
        this.pais_entrega = ""
        this.departamento_entrega = ""
        this.ciudad_municipio_entrega = ""
        this.codigo_postal_entrega = ""
      });

    })
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
      this.formulario.controls['notas'].setValue(res.notas)
      this.formulario.controls['estado'].setValue(res.estado)
      this.service.editClient(this.formulario.value).subscribe(r => {
        if (this.isEdit) {
          this.modalService.dismissAll(this.formulario.value);

        }
        console.log(r)
        Swal.fire({
          title: 'Editado!',
          text: 'Usuario editado con exito',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
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
          this.bloqueado = false;

        }
      })
    });


  }

}
