import { UserLogged } from "../User/UserLogged";

export interface OtrosProcesos {
    moduloComplementarios: any[]; // Define más específicamente si es necesario.
    modulosVariables: ModulosVariables;
    modulosfijos: any[]; // Define más específicamente si es necesario.
}

export interface ModulosVariables {
    produccion: Produccion[];
    dropshipping?: DropshippingModule;
}

export interface Produccion {
    estadoArticulo?: EstadoProcesoItem;
    cantidadUnitaria: number;
    titulo: string;
    procesos: Proceso[];
}

export interface Proceso {
    piezasProducidas: number;
    centrosTrabajo: CentroTrabajo[];
    nombre: string;
    piezasPorPedido: number;
    historialPiezasProducidas: PiezasProduccion[],
    estadoProceso: EstadoProcesoItem
}

export enum EstadoProcesoItem {
    ProducidasTotalmente = 'Producidas Totalmente',
    ProducidasParcialmente = 'Producidas Parcialmente',
    SinProducir = 'Sin Producir'
}

export interface PiezasProduccion {
    fecha: string,
    piezasProducidas: number,
    personaResponsable: UserLogged,
    proceso: string
}

export interface CentroTrabajo {
    cd: string;
    company: string;
    nombre: string;
}

export interface DropshippingModule {
    habilitado: boolean;
    fechaActivacion?: string;
    configuracion?: DropshippingConfig;
}

export interface DropshippingConfig {
    proveedoresPermitidos?: string[];
    margenMinimoPermitido?: number;
    automatizacionActivada?: boolean;
    notificacionesActivadas?: boolean;
    tiempoLimiteOrden?: number; // en días
}