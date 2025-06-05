import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { Pedido } from '../modelo/pedido';
import { InfoIndicativos } from "../../../../Mock/indicativosPais";
import { InfoPaises } from "../../../../Mock/pais-estado-ciudad";
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DireccionEstructuradaComponent } from './direccion-estructurada/direccion-estructurada.component';

@Component({
    selector: 'pedido-entrega',
    templateUrl: 'pedido-entrega.component.html'
})

export class PedidoEntregaComponent implements OnInit, AfterViewInit {
    file: File;
    @Input() datosEntregas: any[];
    @Input() documentoBusqueda: any;
    @Input() formulario: any;
    @Input() datosEntregaNoEncontradosParaCiudadSeleccionada: boolean = false;
    @Input() activeIndex: number = 0;
    @Input() direccionEntrega: string = "";
    jsonData: any;
    alias_entrega: any;
    nombres_entrega: any;
    apellidos_entrega: any;
    indicativo_celular_entrega: any;
    numero_celular_entrega: any;
    indicativo_celular_entrega2: any;
    otro_numero_entrega: any;
    direccion_entrega: any;
    observaciones: any;
    barrio: any;
    nombreUnidad: any;
    especificacionesInternas: any;
    pais_entrega: any;
    departamento_entrega: any;
    ciudad_municipio_entrega: any;
    zona_cobro: any;
    valor_zona_cobro: any;
    codigo_postal_entrega: any;
    @Input() pedidoGral: Pedido;
    idenxEntrega: any;
    filteredResults: any;
    allBillingZone: any;
    ciudades1: any;
    @Input() paises: any;
    departamentos1: any;
    ciudadesOrigen: any;
    ciudades: any;
    departamento: any;
    pais: any;
    departamentos: any;
    indicativos: any;
    entregar: boolean;
    data: unknown[];

    @Input() isEdit: boolean = false;
    editandodato: boolean;
    facturacionElectronica: boolean;
    alias_facturacion: string;
    razon_social: string;
    tipo_documento_facturacion: string;
    numero_documento_facturacion: string;
    indicativo_celular_facturacion: string;
    numero_celular_facturacion: string;
    correo_electronico_facturacion: string;
    direccion_facturacion: string;
    ciudad_municipio: string;
    codigo_postal: string;

    // Nuevos inputs para heredar datos del formulario principal
    @Input() paisInicial: string = '';
    @Input() departamentoInicial: string = '';
    @Input() ciudad: string = '';
    @Input() codigoPostal: string = '';

    //ouput override pedido emiter
    @Output() overridePedido = new EventEmitter<Pedido>();

    latitud: string;
    longitud: string;

    constructor(private inforPaises: InfoPaises, private modalService: NgbModal, private service: MaestroService, private infoIndicativo: InfoIndicativos) {

        this.paises = this.inforPaises.paises.map((x) => {
            return x.Pais;
        });
        this.indicativos = this.infoIndicativo.datos;
        this.datosEntregas = [];

    }
    ngAfterViewInit(): void {
        if (this.isEdit) {
            const data = {
                documento: this.documentoBusqueda
            };
            this.datosEntregas = [];
            this.service.getClientByDocument(data).subscribe((res: any) => {
                if (res && res.datosEntrega && Array.isArray(res.datosEntrega)) {
                    res.datosEntrega.map((x) => {
                        this.datosEntregas.push(x);
                    });
                }
            });

        }
    }

    getBillingZone() {
        const context = this;
        this.service.getBillingZone().subscribe({
            next(value: any) {
                context.allBillingZone = value;
            },
            error(err) {
                console.log(err);
            },
        })
    }

    ngOnInit() {
        this.getBillingZone();

        // Si se reciben valores por herencia y no hay datos de entrega, configurar valores iniciales
        if (this.paisInicial && this.departamentoInicial && this.ciudad && this.direccionEntrega && 
            (!this.datosEntregas || this.datosEntregas.length === 0)) {
            this.pais_entrega = this.paisInicial;
            this.departamento_entrega = this.departamentoInicial;
            this.ciudad_municipio_entrega = this.ciudad;
            this.direccion_entrega = this.direccionEntrega;
            this.codigo_postal_entrega = this.codigoPostal;
            
            // Cargar departamentos y ciudades basado en el país
            this.identificarDepto1();
            this.identificarCiu1();
            
            // Buscar zona de cobro si la ciudad tiene este dato
            if (this.ciudad_municipio_entrega) {
                this.idBillingZone('');
            }
        }
    }

    redirectToPostalCode() {
        window.open("https://visor.codigopostal.gov.co/472/visor", "_blank");
    }

    handleFileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (files && files.length) {
            this.file = files[0];
        }
    }

    readExcel(): void {
        this.datosEntregas = []
        const reader = new FileReader();
        reader.onload = (e) => {
            const data1 = e.target?.result;
            const workbook = XLSX.read(data1, { type: 'binary' });
            const wsName = workbook.SheetNames[0];
            const ws = workbook.Sheets[wsName];
            const json = XLSX.utils.sheet_to_json(ws);
            this.jsonData = json
            console.log('Datos del archivo Excel:', this.jsonData);
            this.jsonData.map((x: any) => {
                const datosEntreg = {
                    alias: x.RefDatEntrega,
                    nombres: x.Nombres,
                    apellidos: x.Apellidos,
                    indicativoCel: x.IndicativoCel,
                    celular: x.NumCel,
                    indicativoOtroNumero: x.IndicativoOtroTel,
                    otroNumero: x.NumOtroTel,
                    direccionEntrega: x.Direccion,
                    observaciones: x.ObservacionesAdicionales,
                    barrio: x.Barrio,
                    nombreUnidad: x.NombreUnidadOEdificio,
                    especificacionesInternas: x.TorreAptoOficina,
                    pais: x.Pais,
                    departamento: x.Departamento,
                    ciudad: x.Ciudad,
                    zonaCobro: x.ZonaCobro,
                    codigoPV: x.CodigoPostal
                };
                this.datosEntregas.push(datosEntreg)
            })
            const data = {
                documento: this.documentoBusqueda,
            };
            this.service.getClientByDocument(data).subscribe((res: any) => {
                res.datosEntrega.map((x) => {
                    this.datosEntregas.push(x);
                });

                this.formulario.controls["datosFacturacionElectronica"].setValue(
                    res.datosFacturacionElectronica
                );
                this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
                this.formulario.controls["notas"].setValue(res.notas); this.formulario.controls["estado"].setValue(res.estado);
                this.service.editClient(this.formulario.value).subscribe((r) => {
                    console.log(r);
                    Swal.fire({
                        title: "Guardado!",
                        text: "Guardado con exito",
                        icon: "success",
                        confirmButtonText: "Ok",
                    });
                })
            })
            console.log('Datos del archivo Excel:', this.jsonData);

        };
        reader.readAsBinaryString(this.file);
    }
    guardarDatosEntrega() {
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
            longitud: this.longitud
        };
        this.datosEntregas.push(datosEntreg);

        let data = {
            documento: ""
        };
        if (this.isEdit) {
            data = {
                documento: this.documentoBusqueda,
            };
        }
        else {
            data = {
                documento: this.documentoBusqueda,
            };
        }

        this.service.getClientByDocument(data).subscribe((res: any) => {

            res.datosEntrega.map((x) => {
                this.datosEntregas.push(x);
            });
            this.formulario.controls["datosFacturacionElectronica"].setValue(
                res.datosFacturacionElectronica
            );
            this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
            this.formulario.controls["notas"].setValue(res.notas);
            this.formulario.controls["estado"].setValue(res.estado);
            this.service.editClient(this.formulario.value).subscribe((r) => {

                this.datosEntregas = this.datosEntregas.filter((x) => {
                    return x.ciudad == (this.pedidoGral?.envio?.ciudad || '');
                });

                if (this.datosEntregas.length == 0) {
                    this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
                    //informar al usuario que no se encontraron datos de entrega para la ciudad seleccionada
                    Swal.fire({
                        title: "Advertencia!",
                        text: "Se guardo éxito, pero recuerda que debes tener una dirección de entrega para la ciudad seleccionada (" + (this.pedidoGral?.envio?.ciudad || 'seleccionada') + ") y posiblemente la que se creo no se vea reflejada en la lista de direcciones de entrega.",
                        icon: "warning",
                        confirmButtonText: "Ok",
                    });
                }
                else {
                    Swal.fire({
                        title: "Guardado!",
                        text: "Guardado con exito",
                        icon: "success",
                        confirmButtonText: "Ok",
                        timer: 2000,
                    });

                    this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
                }


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
                this.zona_cobro = "";
                this.valor_zona_cobro = "";
                this.codigo_postal_entrega = "";
            });
        });
    }

    seleccionarDireccionEntrega(index) {
        this.pedidoGral.envio = this.datosEntregas[index];
        this.pedidoGral = { ...this.pedidoGral };
        Swal.fire({
            title: "Direccion Seleccionada!",
            text: this.datosEntregas[index].direccionEntrega,
            icon: "success",
            confirmButtonText: "Ok",
        });

        if (this.isEdit) {
            this.modalService.dismissAll();
        }
        else {
            this.overridePedido.emit(this.pedidoGral);
        }
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
            zonaCobro: this.zona_cobro,
            codigoPV: this.codigo_postal_entrega,
        };
        this.datosEntregas[this.idenxEntrega] = datosEntreg;
        let data = { documento: this.documentoBusqueda };
        // data.documento = !this.isEdit ? this.documentoBusqueda.value : this.documentoBusqueda;


        this.service.getClientByDocument(data).subscribe((res: any) => {
            this.formulario.controls["datosFacturacionElectronica"].setValue(
                res.datosFacturacionElectronica
            );
            this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
            this.formulario.controls["notas"].setValue(res.notas);
            this.formulario.controls["estado"].setValue(res.estado);
            this.service.editClient(this.formulario.value).subscribe((r) => {
                console.log(r);
                Swal.fire({
                    title: "Editado!",
                    text: "Editado con exito",
                    icon: "success",
                    confirmButtonText: "Ok",
                });
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
                this.zona_cobro = "";
                this.valor_zona_cobro = "";
                this.codigo_postal_entrega = "";
            });
        });
    }

    identificarDepto() {
        this.inforPaises.paises.map((x) => {
            if (x.Pais == this.pais) {
                this.departamentos = x.Regiones.map((c) => {
                    return c.departamento;
                });
            }
        });
    }
    identificarCiu() {
        this.inforPaises.paises.map((x) => {
            if (x.Pais == this.pais) {
                x.Regiones.map((y) => {
                    if (y.departamento == this.departamento) {
                        this.ciudades = y.ciudades.map((c) => {
                            return c;
                        });
                        this.ciudadesOrigen = this.ciudades.map((city) => ({
                            value: city,
                            label: city,
                        }));
                    }
                });
            }
        });
    }
    eliminarDato1(index: number): void {
        // Eliminar el elemento en el índice especificado
        this.datosEntregas.splice(index, 1);
        const data = {
            documento: this.formulario.value.documento,
        };
        this.service.getClientByDocument(data).subscribe((res: any) => {
            this.formulario.controls["datosFacturacionElectronica"].setValue(
                res.datosFacturacionElectronica
            );
            this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
            this.formulario.controls["notas"].setValue(res.notas);
            this.formulario.controls["estado"].setValue(res.estado);
            this.service.editClient(this.formulario.value).subscribe((r) => {
                console.log(r);
                Swal.fire({
                    title: "Eliminado!",
                    text: "Eliminado con exito",
                    icon: "success",
                    confirmButtonText: "Ok",
                });
            });
        });
    }
    identificarDepto1() {
        this.inforPaises.paises.map((x) => {
            if (x.Pais == this.pais_entrega) {
                this.departamentos1 = x.Regiones.map((c) => {
                    return c.departamento;
                });
            }
        });
    }
    identificarCiu1() {
        this.inforPaises.paises.map((x) => {
            if (x.Pais == this.pais_entrega) {
                x.Regiones.map((y) => {
                    if (y.departamento == this.departamento_entrega) {
                        // .filter(c=> c == this.pedidoGral.envio?.ciudad)
                        this.ciudades1 = y.ciudades.map((c) => {
                            return c;
                        });
                    }
                });
            }
        });
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


    datosEntregass(event) {
        console.log(event);
        if (this.entregar === true) {
            this.nombres_entrega = this.formulario.value.nombres_completos;
            this.indicativo_celular_entrega =
                this.formulario.value.indicativo_celular_comprador;
            this.numero_celular_entrega =
                this.formulario.value.numero_celular_comprador;
            this.direccion_entrega = this.direccionEntrega;
            this.pais_entrega = this.paisInicial || '';
            this.departamento_entrega = this.departamentoInicial || '';
            this.ciudad_municipio_entrega = this.ciudad || '';
            this.codigo_postal_entrega = this.codigoPostal || '';
            
            // Cargar departamentos y ciudades
            this.identificarDepto1();
            this.identificarCiu1();
            
            // Buscar zona de cobro si la ciudad tiene este dato
            if (this.ciudad_municipio_entrega) {
                this.idBillingZone('');
            }
        } else {
            this.nombres_entrega = "";
            this.indicativo_celular_entrega = "";
            this.numero_celular_entrega = "";
            this.direccion_entrega = "";
        }
    }

    downloadExcel(): void {
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.data);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        XLSX.writeFile(wb, 'export.xlsx');

    }

    editarDatos(modal, index) {
        this.idenxEntrega = index;
        this.editandodato = true;
        this.alias_entrega = this.datosEntregas[index].alias;
        this.nombres_entrega = this.datosEntregas[index].nombres;
        this.apellidos_entrega = this.datosEntregas[index].apellidos;
        this.indicativo_celular_entrega = this.datosEntregas[index].indicativoCel;
        this.numero_celular_entrega = this.datosEntregas[index].celular;
        this.indicativo_celular_entrega2 =
            this.datosEntregas[index].indicativoOtroNumero;
        this.otro_numero_entrega = this.datosEntregas[index].otroNumero;
        this.direccion_entrega = this.datosEntregas[index].direccionEntrega;
        this.observaciones = this.datosEntregas[index].observaciones;
        this.barrio = this.datosEntregas[index].barrio;
        this.nombreUnidad = this.datosEntregas[index].nombreUnidad;
        this.especificacionesInternas =
            this.datosEntregas[index].especificacionesInternas;
        this.pais_entrega = this.datosEntregas[index].pais;
        this.departamento_entrega = this.datosEntregas[index].departamento;
        this.ciudad_municipio_entrega = this.datosEntregas[index].ciudad;
        this.identificarDepto1();
        this.identificarCiu1();
        this.idBillingZone(this.datosEntregas[index]);
        // this.zona_cobro = this.datosEntregas[index].zonaCobro
        this.codigo_postal_entrega = this.datosEntregas[index].codigoPV;
        
        // Cargar coordenadas si existen
        this.latitud = this.datosEntregas[index].latitud || '';
        this.longitud = this.datosEntregas[index].longitud || '';
        
        this.modalService.open(modal, { size: "lg" }).result.then(
            () => {
                this.limpiarVariables();
            },
            () => {
                // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
                this.limpiarVariables();
            }
        );
    }

    limpiarVariables() {
        this.editandodato = false;
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
        this.zona_cobro = "";
        this.valor_zona_cobro = "";
        this.codigo_postal_entrega = "";
        this.latitud = "";
        this.longitud = "";
        this.facturacionElectronica = false;
        this.alias_facturacion = "";
        this.razon_social = "";
        this.tipo_documento_facturacion = "";
        this.numero_documento_facturacion = "";
        this.indicativo_celular_facturacion = "";
        this.numero_celular_facturacion = "";
        this.correo_electronico_facturacion = "";
        this.direccion_facturacion = "";
        this.pais = "";
        this.departamento = "";
        this.ciudad_municipio = "";
        this.codigo_postal = "";
    }

    // Agregar nuevo método para abrir el modal de dirección estructurada
    abrirModalDireccion() {
        const modalRef = this.modalService.open(DireccionEstructuradaComponent, {
            size: 'xl',
            backdrop: 'static',
            keyboard: false
        });
        
        // Pasar la dirección y ciudad actuales al componente del modal
        modalRef.componentInstance.direccionActual = this.direccion_entrega || '';
        modalRef.componentInstance.ciudadActual = this.ciudad_municipio_entrega || '';
        
        // Suscribirse al resultado del modal
        modalRef.result.then(
            (resultado) => {
                // Cuando el modal se cierra con éxito, actualizar la dirección y las coordenadas
                if (typeof resultado === 'object') {
                    this.direccion_entrega = resultado.direccion;
                    
                    // Guardar las coordenadas si existen
                    if (resultado.coordenadas) {
                        // Extraer latitud y longitud del string formato "lat, lng"
                        const coords = resultado.coordenadas.split(',').map(coord => coord.trim());
                        
                        // Si se reciben coordenadas, actualizar los campos de latitud y longitud 
                        // que se usarán al crear o editar la dirección de entrega
                        if (coords.length === 2) {
                            this.latitud = coords[0];
                            this.longitud = coords[1];
                        }
                    }
                } else {
                    this.direccion_entrega = resultado;
                }
            },
            (reason) => {
                // Cuando el modal se cierra por descarte
                console.log('Modal cerrado sin aplicar cambios:', reason);
            }
        );
    }
}