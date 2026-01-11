import { Ciudad } from "./Ciudad";

export interface Ciudades {
    ciudadesEntrega: Ciudad[];
    ciudadesOrigen: Ciudad[];
    coberturaNacionalEntrega?: boolean;
    coberturaNacionalOrigen?: boolean;
}
