export interface ProcesoComercial {
    llevaTarjeta: boolean;
    ocasion: [];
    aceptaColorDecoracion: boolean;
    colorDecoracion: string;
    variablesForm: any;
    genero: [];
    llevaCalendario: boolean;
    llevaArchivo: boolean;
    aceptaAdiciones: boolean;
    aceptaVariable: boolean;
    pago: any[];
    aceptaComentarios: boolean;
    configProcesoComercialActivo?: boolean;
    aceptaGenero?: boolean;
    aceptaOcasion?: boolean;
}
