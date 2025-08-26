import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces de Katuq
import { Empresa, Sede, Contacto, HorarioPV } from '../../models/empresa/empresa';
import { Producto } from '../../models/productos/Producto';
import { CrearProducto } from '../../models/productos/CrearProducto';
import { Precio } from '../../models/productos/Precio';
import { Categoria } from '../../models/productos/Categoria';
import { CategoriaData } from '../../models/productos/CategoriaData';
import { Data } from '../../models/productos/Data';
import { Disponibilidad } from '../../models/productos/Disponibilidad';
import { Bodega } from '../../models/inventarios/bodega.model';
import { Role, Menu } from '../../models/roles/roles';
import { Rol } from '../../models/roles/roles.type';

// Interfaces para el Quick Start
export interface DiagnosticResponse {
  responses: { [key: string]: string };
  registration: {
    nombre: string;
    nit: string;
    correo: string;
    celular: string;
  };
  aiRecommendation?: {
    modulosRecomendados: string[];
    permisos: string[];
    sector: string;
    complejidad: string;
    canales: string[];
  };
}

export interface QuickStartResult {
  success: boolean;
  empresa?: Empresa;
  rol?: Role;
  bodega?: Bodega;
  productoDemo?: Producto;
  configuraciones?: any;
  message?: string;
  error?: string;
  nextSteps?: string[];
}

export interface SectorConfig {
  categorias: string[];
  canales: string[];
  formasPago: string[];
  tiposEntrega: string[];
  productosDemo: {
    titulo: string;
    descripcion: string;
    precio: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class KatuqQuickStartService {
  
  private quickStartStatus = new BehaviorSubject<{ loading: boolean; message: string }>({
    loading: false,
    message: ''
  });

  public quickStartStatus$ = this.quickStartStatus.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Configuración principal de Quick Start
   */
  async setupQuickStart(diagnosticData: DiagnosticResponse): Promise<QuickStartResult> {
    try {
      this.updateStatus(true, 'Iniciando configuración automática...');

      // 1. Configurar empresa básica
      this.updateStatus(true, 'Configurando información de empresa...');
      const empresa = await this.setupEmpresaBasica(diagnosticData.registration);

      // 2. Crear rol administrador con permisos de IA
      this.updateStatus(true, 'Creando rol administrador...');
      const rol = await this.createRolWithAIPermissions(
        empresa.nit, // Usar NIT como ID de empresa
        diagnosticData.aiRecommendation?.permisos || this.getDefaultAdminPermissions()
      );

      // 3. Configurar bodega principal
      this.updateStatus(true, 'Configurando bodega principal...');
      const bodega = await this.setupBodegaPrincipal(empresa);

      // 4. Crear producto demo
      this.updateStatus(true, 'Creando producto de demostración...');
      const productoDemo = await this.createProductoDemo(
        diagnosticData.responses.q1 || 'Retail - Comercial',
        bodega.idBodega
      );

      // 5. Configurar módulos recomendados por IA
      this.updateStatus(true, 'Configurando módulos recomendados...');
      const configuraciones = await this.setupModulosRecomendados(
        diagnosticData.aiRecommendation?.modulosRecomendados || ['POS', 'Inventarios']
      );

      this.updateStatus(false, 'Configuración completada');

      return {
        success: true,
        empresa,
        rol,
        bodega,
        productoDemo,
        configuraciones,
        message: `¡Tu comercio ${empresa.nomComercial} está configurado y listo para operar!`,
        nextSteps: this.getNextStepsBySector(diagnosticData.responses.q1 || 'Retail - Comercial')
      };

    } catch (error) {
      this.updateStatus(false, '');
      console.error('Error en Quick Start:', error);
      return {
        success: false,
        error: error.message || 'Error en la configuración automática',
        message: 'Se produjo un error durante la configuración automática. Puedes configurar manualmente desde el panel de administración.'
      };
    }
  }

  /**
   * Configurar empresa básica con datos del diagnóstico
   */
  private async setupEmpresaBasica(registrationData: any): Promise<Empresa> {
    const empresaBasica: Empresa = {
      // Datos del formulario de registro
      nombre: registrationData.nombre,
      nomComercial: registrationData.nombre, // Usar nombre principal como nombre comercial
      nit: registrationData.nit,
      digitoVerificacion: "0", // Valor por defecto
      emailContacto: registrationData.correo,
      cel: parseInt(registrationData.celular),
      
      // Valores por defecto mínimos
      direccion: "Por configurar",
      ciudad: "Bogotá",
      departamento: "Cundinamarca", 
      pais: "Colombia",
      paisSede: "Colombia",
      ciudadSede: "Bogotá",
      dptoSede: "Cundinamarca",
      direccionSede: "Por configurar",
      
      // Configuraciones básicas obligatorias
      terminosYCondiciones: true,
      tratamientoDeDatosPersonales: true,
      
      // Arrays inicializados vacíos
      sedes: [],
      contactos: [],
      horarioPV: [],
      marketPlace: [],
      canalesComunicacion: [],
      redesSociales: [],
      
      // Campos requeridos con valores por defecto
      nombreSede: registrationData.nombre + " - Sede Principal",
      fijoContacto: "",
      emailFactuElec: registrationData.correo,
      telContacto: registrationData.celular,
      comoLlegarSede: "Por configurar",
      extensionFijo: 0,
      nomCompletoContacto: "Administrador",
      indicativoFijoContacto: "+57",
      emailNotificacionesSistema: registrationData.correo,
      fijo: 0,
      indicativoTelContacto: "+57",
      rotuloDireccionSede: "Sede Principal",
      emailContactoGeneral: registrationData.correo,
      indicativoCel: "+57",
      extensionFijoContacto: "",
      cargoContacto: "Administrador",
      indicativoFijoLocal: "+57",
      codPostal: "110111",
      codigoPostalSede: "110111",
      apeturaSac: "08:00",
      cierreSac: "18:00",
      cierrePagweb: "18:00",
      aperturaPagweb: "08:00",
      imageEmail: {
        piepagina: "",
        encabezado: ""
      },
      barrio: "Por definir",
      ciudadess: {
        ciudadesEntrega: [],
        ciudadesOrigen: []
      },
      date_edit: {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: 0
      },
      logo: ""
    };

    return empresaBasica;
  }

  /**
   * Crear rol administrador con permisos específicos de IA
   */
  private async createRolWithAIPermissions(empresaId: string, aiPermissions: string[]): Promise<Role> {
    const rolAdmin: Role = {
      rol: Rol.Administrador, // 'Administrator'
      empresa: empresaId,
      permissions: aiPermissions,
      menus: [], // Se generan dinámicamente según permisos
      date_edit: new Date(),
      user_edit: 'quickstart_system'
    };

    return rolAdmin;
  }

  /**
   * Configurar bodega principal por defecto
   */
  private async setupBodegaPrincipal(empresa: Empresa): Promise<Bodega> {
    const bodegaPrincipal: Bodega = {
      nombre: "Bodega Principal",
      idBodega: this.generateBodegaId(),
      direccion: empresa.direccion,
      ciudad: empresa.ciudad,
      departamento: empresa.departamento,
      pais: empresa.pais,
      tipo: 'Física'
    };

    return bodegaPrincipal;
  }

  /**
   * Crear producto demo según sector
   */
  private async createProductoDemo(sector: string, bodegaId: string): Promise<Producto> {
    const sectorConfig = this.getSectorConfig(sector);
    
    const productoDemo: Producto = {
      crearProducto: {
        titulo: sectorConfig.productosDemo.titulo,
        descripcion: sectorConfig.productosDemo.descripcion,
        referencia: "DEMO-001",
        garantiasProducto: "Producto de demostración - Sin garantía aplicable",
        restriccionesProducto: "Solo para fines de demostración",
        fechaInicial: new Date().toISOString().split('T')[0],
        fechaFinal: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        imagenesPrincipales: [],
        imagenesSecundarias: [],
        caracAdicionales: "Producto creado automáticamente para realizar tu primera venta",
        cuidadoConsumo: ""
      },
      precio: {
        precioUnitarioSinIva: Math.round(sectorConfig.productosDemo.precio / 1.19),
        precioUnitarioConIva: sectorConfig.productosDemo.precio,
        valorIva: 19,
        precioUnitarioIva: (sectorConfig.productosDemo.precio * 0.19).toString(),
        preciosVolumen: [],
        precioIvaPorVolumen: "0",
        precioPorVolumenSinIva: "0",
        precioTotalVolumenConIva: sectorConfig.productosDemo.precio.toString()
      },
      categorias: {
        data: {
          data: {
            posicion: 1,
            imagen: "",
            nombre: sectorConfig.categorias[0],
            activo: true
          },
          children: [],
          label: sectorConfig.categorias[0]
        },
        children: [],
        label: sectorConfig.categorias[0]
      },
      disponibilidad: {
        inventarioSeguridad: 5,
        tiempoEntrega: "24-48 horas",
        tipoEntrega: "Domicilio",
        cantidadMinVenta: 1,
        cantidadDisponible: 100,
        inventariable: true,
        cantidadReservada: 0,
        totalVentas: 0
      },
      bodegaId: bodegaId,
      cd: this.generateProductId(),
      date_edit: new Date().toISOString(),
      variableForm: "",
      rating: 5
    };

    return productoDemo;
  }

  /**
   * Configurar módulos recomendados por IA
   */
  private async setupModulosRecomendados(modulosRecomendados: string[]): Promise<any> {
    const configuraciones = {
      modulosActivos: modulosRecomendados,
      configuracionesBasicas: {}
    };

    // Configuraciones específicas por módulo
    for (const modulo of modulosRecomendados) {
      switch (modulo) {
        case 'POS':
          configuraciones.configuracionesBasicas['POS'] = {
            formasPago: ['Efectivo', 'Tarjeta'],
            consecutivos: { prefix: 'POS', start: 1 }
          };
          break;
        case 'Inventarios':
          configuraciones.configuracionesBasicas['Inventarios'] = {
            alertasStock: true,
            stockMinimo: 5
          };
          break;
        case 'Ventas':
          configuraciones.configuracionesBasicas['Ventas'] = {
            consecutivos: { prefix: 'VTA', start: 1 },
            tiposEntrega: ['Domicilio', 'Recogida en tienda']
          };
          break;
      }
    }

    return configuraciones;
  }

  /**
   * Configuración por sector
   */
  private getSectorConfig(sector: string): SectorConfig {
    const configuraciones = {
      "Retail - Comercial": {
        categorias: ["Productos Principales", "Ofertas Especiales", "Nuevos Productos"],
        canales: ["POS", "Online"],
        formasPago: ["Efectivo", "Tarjeta", "Transferencia"],
        tiposEntrega: ["Domicilio", "Recogida en tienda"],
        productosDemo: {
          titulo: "Producto de Demostración",
          descripcion: "Producto creado automáticamente para que puedas realizar tu primera venta y probar el sistema",
          precio: 25000
        }
      },
      "Manufactura": {
        categorias: ["Materia Prima", "Productos Terminados", "Productos en Proceso"],
        canales: ["B2B", "Distribuidor"],
        formasPago: ["Transferencia", "Cheque", "Crédito"],
        tiposEntrega: ["Transporte de carga", "Recogida en planta"],
        productosDemo: {
          titulo: "Producto Manufacturado Demo",
          descripcion: "Producto de demostración para manufactura - Configura tus procesos de producción",
          precio: 150000
        }
      },
      "Servicios": {
        categorias: ["Servicios Básicos", "Servicios Premium", "Consultoría"],
        canales: ["Presencial", "Online"],
        formasPago: ["Efectivo", "Tarjeta", "Transferencia"],
        tiposEntrega: ["Servicio presencial", "Servicio remoto"],
        productosDemo: {
          titulo: "Servicio de Demostración",
          descripcion: "Servicio de ejemplo para probar el sistema de facturación y gestión",
          precio: 50000
        }
      }
    };

    return configuraciones[sector] || configuraciones["Retail - Comercial"];
  }

  /**
   * Permisos por defecto para administrador
   */
  private getDefaultAdminPermissions(): string[] {
    return [
      'ver_dashboard',
      'gestionar_usuarios',
      'gestionar_roles',
      'ver_reportes',
      'gestionar_configuraciones',
      'gestionar_inventario',
      'gestionar_pedidos',
      'gestionar_productos',
      'usar_pos'
    ];
  }

  /**
   * Siguientes pasos según sector
   */
  private getNextStepsBySector(sector: string): string[] {
    const pasos = {
      "Retail - Comercial": [
        "Realizar tu primera venta en el POS",
        "Agregar más productos a tu catálogo", 
        "Configurar formas de pago adicionales",
        "Personalizar información de empresa"
      ],
      "Manufactura": [
        "Configurar procesos de producción",
        "Agregar tus productos manufacturados",
        "Configurar centros de trabajo",
        "Realizar primera orden de producción"
      ],
      "Servicios": [
        "Configurar tus servicios principales",
        "Realizar primera facturación de servicio",
        "Configurar agenda de citas",
        "Personalizar proceso de cobro"
      ]
    };

    return pasos[sector] || pasos["Retail - Comercial"];
  }

  /**
   * Métodos auxiliares
   */
  private generateBodegaId(): string {
    return 'BDG-' + Date.now().toString();
  }

  private generateProductId(): string {
    return 'PRD-' + Date.now().toString();
  }

  private updateStatus(loading: boolean, message: string): void {
    this.quickStartStatus.next({ loading, message });
  }
}