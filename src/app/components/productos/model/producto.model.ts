export interface Producto {
    id: string;
    nombre: string;
    codigo: string;
    codigoBarras: string;
    descripcion?: string;
    precio?: number;
    stock?: number;
    estado?: boolean;
} 