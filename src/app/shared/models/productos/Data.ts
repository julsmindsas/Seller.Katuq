
export interface Data {
    posicion: number;
    imagen: string;
    nombre: string;
    activo: boolean;
    /** Id Categoria: consecutivo numérico enlazado a una categoría/grupo contable de SIIGO. */
    consecutivo?: number;
}
