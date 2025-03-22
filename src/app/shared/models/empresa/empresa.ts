export interface Empresa {
    nombreSede: string;
    fijoContacto: string;
    emailContacto: string;
    emailFactuElec: string;
    cel: number;
    telContacto: string;
    nombre: string;
    comoLlegarSede: string;
    extensionFijo: number;
    direccionSede: string;
    nit: string;
    date_edit: Timestamp;
    logo: string;
    nomCompletoContacto: string;
    indicativoFijoContacto: string;
    dptoSede: string;
    emailNotificacionesSistema: string;
    digitoVerificacion: string;
    paisSede: string;
    fijo: number;
    indicativoTelContacto: string;
    pais: string;
    rotuloDireccionSede: string;
    ciudadSede: string;
    emailContactoGeneral: string;
    indicativoCel: string;
    extensionFijoContacto: string;
    cargoContacto: string;
    indicativoFijoLocal: string;
    departamento: string;
    codPostal: string;
    codigoPostalSede: string;
    terminosYCondiciones: boolean;
    tratamientoDeDatosPersonales: boolean;
    sedes: Sede[];
    direccion: string;
    apeturaSac: string;
    cierreSac: string;
    cierrePagweb: string;
    aperturaPagweb: string;
    contactos: Contacto[];
    horarioPV: HorarioPV[];
    nomComercial: string;
    imageEmail: ImageEmail;
    barrio: string;
    ciudad: string;
    ciudadess: Ciudades;
    marketPlace: MarketPlace[];
    canalesComunicacion: CanalComunicacion[];
    redesSociales: RedSocial[];
}

export interface Sede {
    nombreSede: string;
    rotuloDireccionSede: string;
    ciudadSede: string;
    direccionSede: string;
    paisSede: string;
    comoLlegarSede: string;
    dptoSede: string;
    codigoPostalSede: string;
}

export interface Contacto {
    fijoContacto: string;
    extensionFijoContacto: string;
    cargoContacto: string;
    emailContacto: string;
    telContacto: string;
    nomCompletoContacto: string;
    indicativoFijoContacto: string;
    indicativoTelContacto: string;
}

export interface HorarioPV {
    nombrePV: string;
    aperturaPv: string;
    cierrePv: string;
}

export interface ImageEmail {
    piepagina: string;
    encabezado: string;
}

export interface Ciudades {
    ciudadesEntrega: Ciudad[];
    ciudadesOrigen: Ciudad[];
}

export interface Ciudad {
    label: string;
    value: string;
}

export interface MarketPlace {
    nombreMP: string;
    logoMP: string;
    linkMP: string;
    activoMp: boolean;
}

export interface CanalComunicacion {
    logoCC: string;
    nombreCC: string;
    linkCC: string;
    activoCc: boolean;
}

export interface RedSocial {
    logoRS: string;
    nombreRS: string;
    linkRS: string;
    activoRs: boolean;
}

export interface Timestamp {
    _seconds: number;
    _nanoseconds: number;
}
