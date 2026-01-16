import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from "@angular/core";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { Pedido } from "../modelo/pedido";
import { InfoIndicativos } from "../../../../Mock/indicativosPais";
import { InfoPaises } from "../../../../Mock/pais-estado-ciudad";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { DireccionEstructuradaComponent } from "./direccion-estructurada/direccion-estructurada.component";
import { DaneCodesService } from "../../../shared/services/dane-codes.service";
import { MunicipioDane } from "../../../shared/data/colombia-dane-codes";

@Component({
  selector: "pedido-entrega",
  templateUrl: "pedido-entrega.component.html",
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
  @Input() paisInicial: string = "";
  @Input() departamentoInicial: string = "";
  @Input() ciudad: string = "";
  @Input() codigoPostal: string = "";

  //ouput override pedido emiter
  @Output() overridePedido = new EventEmitter<Pedido>();

  latitud: string;
  longitud: string;

  // Propiedades para DANE codes
  departamentosDane: string[] = [];
  municipiosDane: MunicipioDane[] = [];
  searchQueryCiudadDane: string = '';
  cargandoCiudadesDane: boolean = false;

  constructor(
    private inforPaises: InfoPaises,
    private modalService: NgbModal,
    private service: MaestroService,
    private infoIndicativo: InfoIndicativos,
    private daneCodesService: DaneCodesService
  ) {
    this.paises = this.inforPaises.paises.map((x) => {
      return x.Pais;
    });
    this.indicativos = this.infoIndicativo.datos;
    this.datosEntregas = [];

    // Cargar departamentos DANE
    this.daneCodesService.getDepartamentos().subscribe(deptos => {
      this.departamentosDane = deptos;
    });

    // Inicializar data para el Excel con plantilla
    this.data = [
      {
        RefDatEntrega: "Ejemplo_Entrega_1",
        Nombres: "Juan",
        Apellidos: "Pérez",
        IndicativoCel: "+57",
        NumCel: "3001234567",
        IndicativoOtroTel: "+57",
        NumOtroTel: "3109876543",
        Direccion: "Calle 123 # 45-67",
        ObservacionesAdicionales: "Entregar en horario de oficina",
        Barrio: "Centro",
        NombreUnidadOEdificio: "Edificio Torres",
        TorreAptoOficina: "Torre A Apto 501",
        Pais: "Colombia",
        Departamento: "Cundinamarca",
        Ciudad: "Bogotá",
        ZonaCobro: "Zona 1",
        CodigoPostal: "110111",
      },
    ];
  }
  ngAfterViewInit(): void {
    if (this.isEdit) {
      const data = {
        documento: this.documentoBusqueda,
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

  getBillingZone(): Promise<void> {
    const context = this;
    return new Promise((resolve, reject) => {
      this.service.getBillingZone().subscribe({
        next(value: any) {
          context.allBillingZone = value;
          resolve();
        },
        error(err) {
          console.log(err);
          reject(err);
        },
      });
    });
  }

  ngOnInit() {
    this.getBillingZone().then(() => {
      // Si se reciben valores por herencia y no hay datos de entrega, configurar valores iniciales
      if (
        this.paisInicial &&
        this.departamentoInicial &&
        this.ciudad &&
        this.direccionEntrega &&
        (!this.datosEntregas || this.datosEntregas.length === 0)
      ) {
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
          this.idBillingZone("");
        }
      }
    });
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
    this.datosEntregas = [];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data1 = e.target?.result;
      const workbook = XLSX.read(data1, { type: "binary" });
      const wsName = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsName];
      const json = XLSX.utils.sheet_to_json(ws);
      this.jsonData = json;
      console.log("Datos del archivo Excel:", this.jsonData);
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
          codigoPV: x.CodigoPostal,
        };
        this.datosEntregas.push(datosEntreg);
      });
      const data = {
        documento: this.documentoBusqueda,
      };
      this.service.getClientByDocument(data).subscribe((res: any) => {
        if (res && res.datosEntrega && Array.isArray(res.datosEntrega)) {
          res.datosEntrega.map((x) => {
            this.datosEntregas.push(x);
          });
        }

        // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
        this.formulario.controls["cd"].setValue(res.cd);
        this.formulario.controls["datosFacturacionElectronica"].setValue(
          res.datosFacturacionElectronica,
        );
        this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
        this.formulario.controls["notas"].setValue(res.notas);
        this.formulario.controls["estado"].setValue(res.estado);
        this.service.editClient(this.formulario.value).subscribe((r) => {
          console.log(r);
          Swal.fire({
            title: "Guardado!",
            text: "Guardado con exito",
            icon: "success",
            confirmButtonText: "Ok",
          });
        });
      });
      console.log("Datos del archivo Excel:", this.jsonData);
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
      longitud: this.longitud,
    };
    this.datosEntregas.push(datosEntreg);

    let data = {
      documento: "",
    };
    if (this.isEdit) {
      data = {
        documento: this.documentoBusqueda,
      };
    } else {
      data = {
        documento: this.documentoBusqueda,
      };
    }

    this.service.getClientByDocument(data).subscribe((res: any) => {
      if (res && res.datosEntrega && Array.isArray(res.datosEntrega)) {
        res.datosEntrega.map((x) => {
          this.datosEntregas.push(x);
        });
      }
      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        // Recargar los datos de entrega del servidor
        this.service
          .getClientByDocument({ documento: this.documentoBusqueda })
          .subscribe((clientRes: any) => {
            if (
              clientRes &&
              clientRes.datosEntrega &&
              Array.isArray(clientRes.datosEntrega)
            ) {
              this.datosEntregas = clientRes.datosEntrega.filter((x) => {
                return x.ciudad == (this.pedidoGral?.envio?.ciudad || "");
              });
            } else {
              this.datosEntregas = [];
            }

            // Verificar si hay datos de entrega para la ciudad
            if (this.datosEntregas.length == 0) {
              this.datosEntregaNoEncontradosParaCiudadSeleccionada = true;
              //informar al usuario que no se encontraron datos de entrega para la ciudad seleccionada
              Swal.fire({
                title: "Advertencia!",
                text:
                  "Se guardó con éxito, pero recuerda que debes tener una dirección de entrega para la ciudad seleccionada (" +
                  (this.pedidoGral?.envio?.ciudad || "seleccionada") +
                  ") y posiblemente la que se creó no se vea reflejada en la lista de direcciones de entrega.",
                icon: "warning",
                confirmButtonText: "Ok",
              });
            } else {
              Swal.fire({
                title: "Guardado!",
                text: "Guardado con éxito",
                icon: "success",
                confirmButtonText: "Ok",
                timer: 2000,
              });

              this.datosEntregaNoEncontradosParaCiudadSeleccionada = false;
            }
          });

        // Cambiar a la pestaña de listado (Mis Direcciones de Entrega)
        this.activeIndex = 0;

        // Limpiar TODOS los campos del formulario
        this.alias_entrega = "";
        this.nombres_entrega = "";
        this.apellidos_entrega = "";
        this.indicativo_celular_entrega = "";
        this.indicativo_celular_entrega2 = "";
        this.numero_celular_entrega = "";
        this.otro_numero_entrega = "";
        this.direccion_entrega = "";
        this.observaciones = "";
        this.barrio = "";
        this.nombreUnidad = "";
        this.especificacionesInternas = "";
        this.pais_entrega = "";
        this.departamento_entrega = "";
        this.ciudad_municipio_entrega = "";
        this.zona_cobro = "";
        this.valor_zona_cobro = "";
        this.codigo_postal_entrega = "";
        this.latitud = "";
        this.longitud = "";

        // Limpiar variables DANE
        this.searchQueryCiudadDane = "";
        this.municipiosDane = [];
        this.filteredResults = [];
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
    } else {
      this.overridePedido.emit(this.pedidoGral);
    }
  }

  /**
   * Limpia la dirección de entrega para no usar direcciones y evitar cobro de domicilio
   */
  noUsarDireccion(): void {
    this.pedidoGral.envio = undefined as any;
    this.pedidoGral = { ...this.pedidoGral };
    Swal.fire({
      title: 'Sin dirección',
      text: 'No se usará dirección para la entrega y no se cobrará domicilio.',
      icon: 'success',
      confirmButtonText: 'Ok'
    });

    if (this.isEdit) {
      this.modalService.dismissAll();
    } else {
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
      valorZonaCobro: this.valor_zona_cobro,
      codigoPV: this.codigo_postal_entrega,
    };
    this.datosEntregas[this.idenxEntrega] = datosEntreg;

    // Si la dirección editada es la que está en uso en el pedido, actualizarla
    if (this.pedidoGral?.envio && this.pedidoGral.envio.alias === datosEntreg.alias) {
      this.pedidoGral.envio = { ...datosEntreg };
      this.pedidoGral = { ...this.pedidoGral };
      this.overridePedido.emit(this.pedidoGral);
    }

    // ✅ REFACTORIZADO: Actualizar solo el array de datosEntrega en el formulario
    // El formulario ya tiene cd, datosFacturacionElectronica, notas y estado desde el paso 1
    this.formulario.controls["datosEntrega"].setValue(this.datosEntregas);

    // ✅ LLAMADA ÚNICA: Solo editClient() - el formulario ya tiene todos los datos
    this.service.editClient(this.formulario.value).subscribe({
      next: (r) => {
        // Cerrar el modal después de guardar exitosamente
        this.modalService.dismissAll();

        // Resetear el flag de edición
        this.editandodato = false;

        // Recargar los datos del servidor para actualizar la lista
        this.service
          .getClientByDocument({ documento: this.documentoBusqueda })
          .subscribe((clientRes: any) => {
            if (
              clientRes &&
              clientRes.datosEntrega &&
              Array.isArray(clientRes.datosEntrega)
            ) {
              // Filtrar por ciudad si hay un pedido con envío definido
              if (this.pedidoGral?.envio?.ciudad) {
                this.datosEntregas = clientRes.datosEntrega.filter((x) => {
                  return x.ciudad == this.pedidoGral.envio.ciudad;
                });
              } else {
                this.datosEntregas = clientRes.datosEntrega;
              }
            }
          });

        Swal.fire({
          title: "Editado!",
          text: "Editado con éxito",
          icon: "success",
          confirmButtonText: "Ok",
          timer: 2000,
        });

        // Limpiar variables
        this.alias_entrega = "";
        this.nombres_entrega = "";
        this.apellidos_entrega = "";
        this.indicativo_celular_entrega = "";
        this.indicativo_celular_entrega2 = "";
        this.numero_celular_entrega = "";
        this.otro_numero_entrega = "";
        this.direccion_entrega = "";
        this.observaciones = "";
        this.barrio = "";
        this.nombreUnidad = "";
        this.especificacionesInternas = "";
        this.pais_entrega = "";
        this.departamento_entrega = "";
        this.ciudad_municipio_entrega = "";
        this.zona_cobro = "";
        this.valor_zona_cobro = "";
        this.codigo_postal_entrega = "";
      },
      error: (err) => {
        console.error("Error al editar dirección de entrega:", err);
        Swal.fire({
          title: "Error",
          text: "No se pudo guardar la dirección. Intente nuevamente.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
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
      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica,
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

  // Método que se llama desde el evento (change) del dropdown de país
  onPaisChange() {
    console.log('🌍 onPaisChange - País seleccionado:', this.pais_entrega);
    this.identificarDepto1();
    // Limpiar campos dependientes cuando cambia el país
    this.departamento_entrega = "";
    this.ciudad_municipio_entrega = "";
    this.ciudades1 = [];
    this.zona_cobro = "";
    this.valor_zona_cobro = "";
    this.filteredResults = [];
    console.log('🌍 onPaisChange - Después de limpiar:', {
      departamento_entrega: this.departamento_entrega,
      ciudad_municipio_entrega: this.ciudad_municipio_entrega,
      zona_cobro: this.zona_cobro,
      valor_zona_cobro: this.valor_zona_cobro
    });
  }

  identificarCiu1() {
    this.inforPaises.paises.map((x) => {
      if (x.Pais == this.pais_entrega) {
        x.Regiones.map((y) => {
          if (y.departamento == this.departamento_entrega) {
            this.ciudades1 = y.ciudades.map((c) => {
              return c;
            });
          }
        });
      }
    });
  }

  // Método que se llama desde el evento (change) del dropdown de departamento
  onDepartamentoChange() {
    console.log('🏛️ onDepartamentoChange - Departamento seleccionado:', this.departamento_entrega);
    this.identificarCiu1();
    // Limpiar campos dependientes cuando cambia el departamento
    this.ciudad_municipio_entrega = "";
    this.zona_cobro = "";
    this.valor_zona_cobro = "";
    this.filteredResults = [];
    console.log('🏛️ onDepartamentoChange - Después de limpiar:', {
      ciudad_municipio_entrega: this.ciudad_municipio_entrega,
      zona_cobro: this.zona_cobro,
      valor_zona_cobro: this.valor_zona_cobro
    });
  }
  idBillingZone(zona_cobro: any) {
    console.log(this.ciudad_municipio_entrega);
    const ciudad = this.ciudad_municipio_entrega;
    const context = this;

    // Validar que allBillingZone esté disponible
    if (!context.allBillingZone || !Array.isArray(context.allBillingZone)) {
      console.warn("allBillingZone no está disponible, reintentando...");
      setTimeout(() => {
        if (context.allBillingZone && Array.isArray(context.allBillingZone)) {
          context.idBillingZone(zona_cobro);
        }
      }, 1000);
      return;
    }

    // Validar que la ciudad esté definida
    if (!ciudad || ciudad.trim() === "") {
      console.warn("Ciudad no está definida para filtrar zonas de cobro");
      context.filteredResults = [];
      return;
    }

    try {
      context.filteredResults = context.allBillingZone.filter(
        (item) =>
          item.ciudad &&
          item.ciudad.toLowerCase().trim() === ciudad.toLowerCase().trim(),
      );

      console.log(`Zonas encontradas para ${ciudad}:`, context.filteredResults);

      // Si zona_cobro es un objeto con datos (carga de dirección existente)
      if (zona_cobro && zona_cobro.zonaCobro) {
        context.zona_cobro = zona_cobro.zonaCobro;
        context.valor_zona_cobro = zona_cobro.valorZonaCobro;
      }
      // Si el usuario seleccionó del dropdown, this.zona_cobro ya tiene el nombre (por ngModel)
      // Buscar el valorZonaCobro correspondiente en filteredResults
      else if (context.zona_cobro && context.filteredResults && context.filteredResults.length > 0) {
        const zonaSeleccionada = context.filteredResults.find(
          (item) => item.nombreZonaCobro === context.zona_cobro
        );
        if (zonaSeleccionada) {
          context.valor_zona_cobro = zonaSeleccionada.valorZonaCobro;
          console.log(`Zona seleccionada: ${context.zona_cobro}, Valor: ${context.valor_zona_cobro}`);
        }
      }
    } catch (error) {
      console.error("Error al filtrar zonas de cobro:", error);
      context.filteredResults = [];
    }
  }

  datosEntregass(event) {
    console.log(event);
    if (this.entregar === true) {
      this.nombres_entrega = this.formulario.value.nombres_completos;
      this.apellidos_entrega = this.formulario.value.apellidos_completos;
      this.indicativo_celular_entrega =
        this.formulario.value.indicativo_celular_comprador;
      this.numero_celular_entrega =
        this.formulario.value.numero_celular_comprador;
      this.direccion_entrega = this.direccionEntrega;
      this.pais_entrega = this.paisInicial || "";
      this.departamento_entrega = this.departamentoInicial || "";
      this.ciudad_municipio_entrega = this.ciudad || "";
      this.codigo_postal_entrega = this.codigoPostal || "";

      // Cargar departamentos y ciudades
      this.identificarDepto1();
      this.identificarCiu1();

      // Buscar zona de cobro si la ciudad tiene este dato - con delay para asegurar que allBillingZone esté disponible
      if (this.ciudad_municipio_entrega) {
        setTimeout(() => {
          this.idBillingZone("");
        }, 500);
      }
    } else {
      this.nombres_entrega = "";
      this.apellidos_entrega = "";
      this.indicativo_celular_entrega = "";
      this.numero_celular_entrega = "";
      this.direccion_entrega = "";
    }
  }

  downloadExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    XLSX.writeFile(wb, "export.xlsx");
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

    // DEBUG: Imprimir valores al abrir el modal
    console.log('🔍 DEBUG editarDatos - Valores al abrir modal:', {
      index: index,
      datosEntrega: this.datosEntregas[index],
      pais_entrega: this.pais_entrega,
      departamento_entrega: this.departamento_entrega,
      ciudad_municipio_entrega: this.ciudad_municipio_entrega,
      zona_cobro: this.zona_cobro,
      valor_zona_cobro: this.valor_zona_cobro,
      filteredResults: this.filteredResults
    });

    // Cargar coordenadas si existen
    this.latitud = this.datosEntregas[index].latitud || "";
    this.longitud = this.datosEntregas[index].longitud || "";

    this.modalService.open(modal, { size: "lg" }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
        this.limpiarVariables();
      },
    );
  }

  limpiarVariables() {
    // Variables de control
    this.editandodato = false;
    this.idenxEntrega = null;

    // Variables de entrega básicas
    this.alias_entrega = "";
    this.nombres_entrega = "";
    this.apellidos_entrega = "";
    this.indicativo_celular_entrega = "";
    this.indicativo_celular_entrega2 = "";
    this.numero_celular_entrega = "";
    this.otro_numero_entrega = "";
    this.direccion_entrega = "";
    this.observaciones = "";
    this.barrio = "";
    this.nombreUnidad = "";
    this.especificacionesInternas = "";

    // Variables de ubicación de entrega
    this.pais_entrega = "";
    this.departamento_entrega = "";
    this.ciudad_municipio_entrega = "";
    this.zona_cobro = "";
    this.valor_zona_cobro = "";
    this.codigo_postal_entrega = "";

    // Coordenadas
    this.latitud = "";
    this.longitud = "";

    // Variables DANE
    this.searchQueryCiudadDane = "";
    this.municipiosDane = [];
    this.filteredResults = [];

    // Variables de facturación
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

  // Método para editar datos de facturación que falta
  editarDatosFacturacion() {
    const datosFacturacion = {
      alias: this.alias_facturacion,
      razonSocial: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      numeroDocumento: this.numero_documento_facturacion,
      indicativoCelular: this.indicativo_celular_facturacion,
      numeroCelular: this.numero_celular_facturacion,
      correoElectronico: this.correo_electronico_facturacion,
      direccion: this.direccion_facturacion,
      pais: this.pais,
      departamento: this.departamento,
      ciudad: this.ciudad_municipio,
      codigoPostal: this.codigo_postal,
    };

    // Obtener el cliente para actualizar sus datos
    const data = {
      documento: this.documentoBusqueda,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      // Actualizar los datos de facturación electrónica
      if (!res.datosFacturacionElectronica) {
        res.datosFacturacionElectronica = [];
      }
      res.datosFacturacionElectronica.push(datosFacturacion);

      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      // Actualizar el formulario
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        res.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(res.datosEntrega);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);

      // Guardar los cambios
      this.service.editClient(this.formulario.value).subscribe((r) => {
        console.log(r);
        Swal.fire({
          title: "Guardado!",
          text: "Datos de facturación guardados con éxito",
          icon: "success",
          confirmButtonText: "Ok",
        });

        // Limpiar los campos de facturación
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
      });
    });
  }

  // Método para manejar cambios en la selección de ciudad
  onCiudadChange() {
    console.log('🏙️ onCiudadChange - Ciudad seleccionada:', this.ciudad_municipio_entrega);
    console.log('🏙️ onCiudadChange - ANTES de limpiar zona_cobro:', this.zona_cobro);

    // Limpiar la zona de cobro cuando cambia la ciudad
    this.zona_cobro = "";
    this.valor_zona_cobro = "";
    this.filteredResults = [];

    console.log('🏙️ onCiudadChange - DESPUÉS de limpiar zona_cobro:', this.zona_cobro);

    // Cargar las nuevas zonas de cobro para la ciudad seleccionada
    setTimeout(() => {
      this.idBillingZone("");
    }, 100);
  }

  // Agregar nuevo método para abrir el modal de dirección estructurada
  abrirModalDireccion() {
    const modalRef = this.modalService.open(DireccionEstructuradaComponent, {
      size: "xl",
      backdrop: "static",
      keyboard: false,
    });

    // Pasar la dirección y ciudad actuales al componente del modal
    modalRef.componentInstance.direccionActual = this.direccion_entrega || "";
    modalRef.componentInstance.ciudadActual =
      this.ciudad_municipio_entrega || "";

    // Suscribirse al resultado del modal
    modalRef.result.then(
      (resultado) => {
        // Cuando el modal se cierra con éxito, actualizar la dirección y las coordenadas
        if (typeof resultado === "object") {
          this.direccion_entrega = resultado.direccion;

          // Actualizar la ciudad si se cambió en el modal
          if (
            resultado.ciudad &&
            resultado.ciudad !== this.ciudad_municipio_entrega
          ) {
            this.ciudad_municipio_entrega = resultado.ciudad;

            // Actualizar departamento si está disponible en los datos estructurados
            if (resultado.estructura && resultado.estructura.departamento) {
              this.departamento_entrega = resultado.estructura.departamento;
            }

            // Limpiar zona de cobro antes de cargar las nuevas opciones
            this.zona_cobro = "";
            this.valor_zona_cobro = "";
            this.filteredResults = [];

            // Recargar zonas de cobro para la nueva ciudad
            setTimeout(() => {
              this.idBillingZone("");
            }, 500);
          }

          // Guardar las coordenadas si existen
          if (resultado.coordenadas) {
            // Extraer latitud y longitud del string formato "lat, lng"
            const coords = resultado.coordenadas
              .split(",")
              .map((coord: string) => coord.trim());

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
        console.log("Modal cerrado sin aplicar cambios:", reason);
      },
    );
  }

  // ========== MÉTODOS DANE CODES ==========

  /**
   * Cambia departamento y carga sus municipios usando DANE codes
   */
  onDepartamentoDaneChange(departamento: string): void {
    if (!departamento) {
      this.municipiosDane = [];
      this.ciudades1 = [];
      return;
    }
    this.cargandoCiudadesDane = true;
    this.daneCodesService.getMunicipiosByDepartamento(departamento).subscribe(municipios => {
      this.municipiosDane = municipios;
      // También actualizar ciudades1 para compatibilidad
      this.ciudades1 = municipios.map(m => m.nombre);
      this.cargandoCiudadesDane = false;
    });
  }

  /**
   * Busca municipios por texto (nombre o código DANE)
   */
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

  /**
   * Selecciona un municipio DANE y actualiza los campos de entrega
   */
  seleccionarMunicipioDane(municipio: MunicipioDane): void {
    console.log('📍 seleccionarMunicipioDane - Municipio seleccionado:', municipio);

    this.pais_entrega = 'Colombia';
    this.departamento_entrega = municipio.departamento;
    this.ciudad_municipio_entrega = municipio.nombre;
    // Actualizar ciudades1 para que el select muestre la opción correcta
    this.ciudades1 = [municipio.nombre];
    // Guardar como frecuente
    this.daneCodesService.addMunicipioFrecuente(municipio);

    // Limpiar zona de cobro antes de cargar las nuevas opciones
    this.zona_cobro = "";
    this.valor_zona_cobro = "";
    this.filteredResults = [];

    console.log('📍 seleccionarMunicipioDane - Zona de cobro limpiada:', {
      zona_cobro: this.zona_cobro,
      valor_zona_cobro: this.valor_zona_cobro
    });

    // Actualizar zonas de cobro para la nueva ciudad
    this.idBillingZone('');
  }

  /**
   * Formatea un municipio DANE para mostrar
   */
  formatMunicipioDane(municipio: MunicipioDane): string {
    return `${municipio.nombre} - ${municipio.departamento} (${municipio.codigo})`;
  }
}
