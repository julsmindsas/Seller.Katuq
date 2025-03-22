import { CategoriaData } from "./CategoriaData";

export interface Categoria {
    data: CategoriaData;
    children: CategoriaData[];
    label: string;
}
