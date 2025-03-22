import { Imagen } from "./Imagen";

export interface CrearProducto {
    referencia: string;
    descripcion: string;
    garantiasProducto: string;
    restriccionesProducto: string;
    fechaInicial: string;
    imagenesSecundarias: any[];
    fechaFinal: string;
    titulo: string;
    caracAdicionales: string;
    cuidadoConsumo: string;
    imagenesPrincipales: Imagen[];
    paraProduccion?: any;
}
