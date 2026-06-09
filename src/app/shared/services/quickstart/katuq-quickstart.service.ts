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
  errorCode?: string; // COMERCIO_YA_EXISTE | EMAIL_YA_EXISTE | USUARIO_YA_EXISTE | VALIDATION_ERROR | REGISTRATION_BLOCKED
  pendingReview?: boolean; // 202: registro en cuarentena, pendiente de revisión humana
  nextSteps?: string[];
  adminUser?: any;
  serverResponse?: any; // Respuesta completa del servidor
  companyName?: string; // Nombre de la empresa creada en el servidor
  userEmail?: string; // Email del usuario creado en el servidor
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
   * Validar datos del diagnóstico antes de proceder
   */
  private validateDiagnosticData(diagnosticData: DiagnosticResponse): void {
    const { registration, responses } = diagnosticData;
    
    // Validar datos de registro obligatorios
    if (!registration) {
      throw new Error('Los datos de registro son obligatorios para configurar el comercio');
    }

    if (!registration.nombre || registration.nombre.trim().length < 2) {
      throw new Error('El nombre de la empresa debe tener al menos 2 caracteres');
    }

    if (!registration.nit || registration.nit.trim().length < 5) {
      throw new Error('El NIT de la empresa debe tener al menos 5 caracteres');
    }

    if (!registration.correo || !this.isValidEmail(registration.correo)) {
      throw new Error('Se requiere un correo electrónico válido');
    }

    if (!registration.celular || registration.celular.trim().length < 10) {
      throw new Error('Se requiere un número de celular válido (mínimo 10 dígitos)');
    }

    // Validar respuestas del diagnóstico
    if (!responses || Object.keys(responses).length === 0) {
      throw new Error('Se requieren respuestas del diagnóstico para configurar el comercio');
    }

    // Validar que al menos tenga la respuesta del sector
    if (!responses.q1) {
      console.warn('No se especificó el sector, usando "Retail - Comercial" por defecto');
    }

    console.log('Validación de datos completada exitosamente');
  }

  /**
   * Validar formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Configuración principal de Quick Start
   */
  async setupQuickStart(diagnosticData: DiagnosticResponse): Promise<QuickStartResult> {
    try {
      this.updateStatus(true, 'Iniciando configuración automática...');

      // 0. Validar datos antes de proceder
      this.validateDiagnosticData(diagnosticData);

      // 1. Preparar empresa básica (sin enviar al servidor)
      this.updateStatus(true, 'Preparando información de empresa...');
      const empresa = this.prepareEmpresaBasica(diagnosticData.registration);

      // 2. Preparar rol administrador con permisos de IA (sin enviar al servidor)
      this.updateStatus(true, 'Preparando rol administrador...');
      const rol = this.prepareRolWithAIPermissions(
        empresa.nit, // Usar NIT como ID de empresa
        diagnosticData.aiRecommendation?.permisos || this.getDefaultAdminPermissions()
      );

      // 3. Preparar bodega principal (sin enviar al servidor)
      this.updateStatus(true, 'Preparando bodega principal...');
      const bodega = this.prepareBodegaPrincipal(empresa);

      // 4. Preparar usuario administrador (sin enviar al servidor)
      this.updateStatus(true, 'Preparando usuario administrador...');
      const adminUser = this.prepareAdminUser(diagnosticData.registration, empresa, rol);

      // 5. Preparar producto demo (sin enviar al servidor)
      this.updateStatus(true, 'Preparando producto de demostración...');
      const productoDemo = this.prepareProductoDemo(
        diagnosticData.responses.q1 || 'Retail - Comercial',
        bodega.idBodega
      );

      // 6. Preparar configuración de módulos recomendados por IA (sin enviar al servidor)
      this.updateStatus(true, 'Preparando módulos recomendados...');
      const configuraciones = this.prepareModulosRecomendados(
        diagnosticData.aiRecommendation?.modulosRecomendados || ['POS', 'Inventarios']
      );

      // 7. Enviar SOLO los datos del diagnóstico al servidor
      this.updateStatus(true, 'Guardando diagnóstico en el servidor...');
      const serverResponse = await this.saveSurveyResponse(diagnosticData);

      this.updateStatus(false, 'Configuración completada exitosamente');

      // El backend puede responder 202 con status PENDING_REVIEW cuando el registro
      // entra en cuarentena anti-abuso: la empresa se crea inactiva y un humano la revisa.
      const pendingReview = serverResponse?.status === 'PENDING_REVIEW';

      return {
        success: true,
        pendingReview,
        empresa: empresa,
        rol: rol,
        bodega: bodega,
        adminUser: adminUser,
        productoDemo: productoDemo,
        configuraciones: configuraciones,
        serverResponse: serverResponse, // Respuesta completa del servidor
        companyName: serverResponse.companyName || empresa.nomComercial,
        userEmail: serverResponse.userEmail || diagnosticData.registration.correo,
        message: serverResponse.message || (pendingReview
          ? 'Tu registro está en revisión. Te enviaremos tus credenciales por correo al validarlo.'
          : `¡Tu comercio ${serverResponse.companyName || empresa.nomComercial} está configurado y listo para operar!`),
        nextSteps: this.getNextStepsBySector(diagnosticData.responses.q1 || 'Retail - Comercial')
      };

    } catch (error) {
      this.updateStatus(false, '');
      console.error('Error en Quick Start:', error);

      return {
        success: false,
        error: error.message || 'Error en la configuración automática',
        errorCode: error.code,
        message: 'Error durante la configuración automática. Por favor, intenta nuevamente.'
      };
    }
  }



  /**
   * Preparar empresa básica con datos del diagnóstico (sin enviar al servidor)
   */
  private prepareEmpresaBasica(registrationData: any): Empresa {
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

    // Retornar empresa preparada (será enviada al servidor junto con todos los demás datos)
    return empresaBasica;
  }

  /**
   * Preparar rol administrador con permisos específicos de IA (sin enviar al servidor)
   */
  private prepareRolWithAIPermissions(empresaId: string, aiPermissions: string[]): Role {
    const rolAdmin: Role = {
      rol: Rol.Administrador, // 'Administrator'
      empresa: empresaId,
      permissions: aiPermissions,
      menus: [], // Se generan dinámicamente según permisos
      date_edit: new Date(),
      user_edit: 'quickstart_system'
    };

    // Retornar rol preparado (será enviado al servidor junto con todos los demás datos)
    return rolAdmin;
  }

  /**
   * Preparar bodega principal por defecto (sin enviar al servidor)
   */
  private prepareBodegaPrincipal(empresa: Empresa): Bodega {
    const bodegaPrincipal: Bodega = {
      nombre: "Bodega Principal",
      idBodega: this.generateBodegaId(),
      direccion: empresa.direccion,
      ciudad: empresa.ciudad,
      departamento: empresa.departamento,
      pais: empresa.pais,
      tipo: 'Física'
      // Nota: La propiedad empresa no existe en el interface Bodega
      // Si es necesaria, debe ser manejada en la implementación del servidor
    };

    // Retornar bodega preparada (será enviada al servidor junto con todos los demás datos)
    return bodegaPrincipal;
  }

  /**
   * Preparar producto demo según sector (sin enviar al servidor)
   */
  private prepareProductoDemo(sector: string, bodegaId: string): Producto {
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

    // Retornar producto demo preparado (será enviado al servidor junto con todos los demás datos)
    return productoDemo;
  }

  /**
   * Preparar usuario administrador con los datos del diagnóstico (sin enviar al servidor)
   */
  private prepareAdminUser(registrationData: any, empresa: Empresa, rol: Role): any {
    const userData = {
      nombres: registrationData.nombre, // Usar nombre de empresa como nombre del administrador
      apellidos: "Administrador",
      email: registrationData.correo,
      celular: registrationData.celular,
      empresa: empresa.nit,
      rol: (rol as any).cd || (rol as any)._id || (rol as any).rol, // ID del rol creado
      estado: 'Activo',
      tipoUsuario: 'Administrador',
      password: this.generateTemporaryPassword(), // Contraseña temporal
      confirmPassword: this.generateTemporaryPassword(),
      fechaCreacion: new Date().toISOString(),
      creadoPor: 'quickstart_system',
      permisos: rol.permissions || this.getDefaultAdminPermissions(),
      // Datos adicionales para el usuario administrador
      cargo: 'Administrador General',
      departamento: 'Administración',
      fechaIngreso: new Date().toISOString(),
      activo: true
    };

    // Retornar datos del usuario preparados (serán enviados al servidor junto con todos los demás datos)
    return userData;
  }

  /**
   * Generar contraseña temporal para el usuario administrador
   */
  private generateTemporaryPassword(): string {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
  }

  /**
   * Guardar la respuesta del diagnóstico en el servidor
   */
  private async saveSurveyResponse(diagnosticData: DiagnosticResponse): Promise<any> {
    const surveyData = {
      timestamp: new Date().toISOString(),
      respuestas: diagnosticData.responses,
      recomendacionesIA: diagnosticData.aiRecommendation,
      registro: diagnosticData.registration,
      sector: diagnosticData.responses.q1 || 'No especificado',
      procesoCompletado: true
    };

    try {
      const response = await this.http.post(`${environment.urlApi}/v1/diagnostics/saveSurveyResponse`, surveyData).toPromise() as any;
      
      if (response && response.message) {
        console.log('Diagnóstico guardado exitosamente:', response);
        return response;
      } else {
        throw new Error('Error al guardar el diagnóstico en el servidor');
      }
    } catch (error) {
      console.error('Error al guardar diagnóstico:', error);
      // Conservar el mensaje y código del backend (ej: 409 COMERCIO_YA_EXISTE)
      const backendMessage = error?.error?.message;
      const err: any = new Error(backendMessage || `Error al guardar el diagnóstico: ${error.message || error}`);
      err.status = error?.status;
      err.code = error?.error?.error; // COMERCIO_YA_EXISTE | EMAIL_YA_EXISTE | USUARIO_YA_EXISTE
      throw err;
    }
  }

  /**
   * Preparar configuración de módulos recomendados por IA (sin enviar al servidor)
   */
  private prepareModulosRecomendados(modulosRecomendados: string[]): any {
    const configuraciones = {
      modulosActivos: modulosRecomendados,
      configuracionesBasicas: {},
      fechaConfiguracion: new Date().toISOString()
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
        case 'Produccion':
          configuraciones.configuracionesBasicas['Produccion'] = {
            centrosTrabajo: true,
            procesosPredefinidos: true
          };
          break;
        case 'CRM':
          configuraciones.configuracionesBasicas['CRM'] = {
            seguimientoClientes: true,
            notificacionesAutomaticas: true
          };
          break;
      }
    }

    // Retornar configuraciones preparadas (serán enviadas al servidor junto con todos los demás datos)
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