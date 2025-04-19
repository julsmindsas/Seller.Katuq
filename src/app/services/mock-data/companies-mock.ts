/**
 * Datos mock para los endpoints de companies
 * Se utilizan como respaldo cuando los endpoints reales aún no están disponibles
 */

// Mock de lista de empresas
export const companiesMock = [
  {
    id: 1,
    nombre: 'Empresa X',
    nit: '123456789-0',
    direccion: 'Calle 123 #45-67',
    ciudad: 'Bogotá',
    departamento: 'Cundinamarca',
    pais: 'Colombia',
    emailContacto: 'contacto@empresax.com',
    telContacto: '6012345678',
    nombreSede: 'Sede Principal',
    fijoContacto: '6012345678',
    emailFactuElec: 'facturacion@empresax.com',
    cel: 3001234567,
    comoLlegarSede: 'https://maps.google.com/...',
    extensionFijo: 123,
    direccionSede: 'Calle 123 #45-67',
    estado: 'Activo',
    date_edit: { _seconds: 1686737623, _nanoseconds: 0 },
    sedes: [],
    contactos: [],
    horarioPV: [],
    marketPlace: [],
    canalesComunicacion: [],
    redesSociales: []
  },
  {
    id: 2,
    nombre: 'Empresa Y',
    nit: '987654321-0',
    direccion: 'Carrera 50 #30-40',
    ciudad: 'Medellín',
    departamento: 'Antioquia',
    pais: 'Colombia',
    emailContacto: 'contacto@empresay.com',
    telContacto: '6045678901',
    nombreSede: 'Sede Principal',
    fijoContacto: '6045678901',
    emailFactuElec: 'facturacion@empresay.com',
    cel: 3001234567,
    comoLlegarSede: 'Cerca al metro',
    extensionFijo: 456,
    direccionSede: 'Carrera 50 #30-40',
    estado: 'Pendiente',
    date_edit: { _seconds: 1686137623, _nanoseconds: 0 },
    sedes: [
      {
        nombreSede: 'Sede Principal',
        rotuloDireccionSede: 'Centro Empresarial',
        ciudadSede: 'Medellín',
        direccionSede: 'Carrera 50 #30-40',
        paisSede: 'Colombia',
        comoLlegarSede: 'Cerca al metro',
        dptoSede: 'Antioquia',
        codigoPostalSede: '050001'
      }
    ],
    contactos: [
      {
        fijoContacto: '6045678901',
        extensionFijoContacto: '456',
        cargoContacto: 'Director',
        emailContacto: 'maria@empresay.com',
        telContacto: '6045678901',
        nomCompletoContacto: 'María Rodríguez',
        indicativoFijoContacto: '604',
        indicativoTelContacto: '604'
      }
    ],
    horarioPV: [],
    marketPlace: [
      {
        nombreMP: 'Mercado Libre',
        logoMP: 'assets/images/marketplace/mercadolibre.png',
        linkMP: 'https://mercadolibre.com/empresay',
        activoMp: true
      }
    ],
    canalesComunicacion: [],
    redesSociales: []
  },
  {
    id: 3,
    nombre: 'Empresa Z',
    nit: '123456789-0',
    direccion: 'Avenida 30 #12-34',
    ciudad: 'Bogotá',
    departamento: 'Cundinamarca',
    pais: 'Colombia',
    emailContacto: 'contacto@empresaz.com',
    telContacto: '6023456789',
    nombreSede: 'Sede Principal',
    fijoContacto: '6023456789',
    emailFactuElec: 'facturacion@empresaz.com',
    cel: 3009876543,
    comoLlegarSede: 'Frente al centro comercial',
    extensionFijo: 789,
    direccionSede: 'Avenida 30 #12-34',
    estado: 'Activo',
    date_edit: { _seconds: 1686037623, _nanoseconds: 0 },
    sedes: [
      {
        nombreSede: 'Sede Principal',
        rotuloDireccionSede: 'Edificio Corporativo',
        ciudadSede: 'Bogotá',
        direccionSede: 'Avenida 30 #12-34',
        paisSede: 'Colombia',
        comoLlegarSede: 'Frente al centro comercial',
        dptoSede: 'Cundinamarca',
        codigoPostalSede: '110111'
      }
    ],
    contactos: [
      {
        fijoContacto: '6023456789',
        extensionFijoContacto: '789',
        cargoContacto: 'Gerente',
        emailContacto: 'juan@empresaz.com',
        telContacto: '6023456789',
        nomCompletoContacto: 'Juan Pérez',
        indicativoFijoContacto: '602',
        indicativoTelContacto: '602'
      }
    ],
    horarioPV: [],
    marketPlace: [
      {
        nombreMP: 'Amazon',
        logoMP: 'assets/images/marketplace/amazon.png',
        linkMP: 'https://amazon.com/empresaz',
        activoMp: true
      }
    ],
    canalesComunicacion: [],
    redesSociales: []
  },
  {
    id: 4,
    nombre: 'Empresa X2',
    nit: '789123456-0',
    direccion: 'Calle 321 #67-89',
    ciudad: 'Barranquilla',
    departamento: 'Atlántico',
    pais: 'Colombia',
    emailContacto: 'contacto@empresax2.com',
    telContacto: '6056789012',
    nombreSede: 'Sede Principal',
    fijoContacto: '6056789012',
    emailFactuElec: 'facturacion@empresax2.com',
    cel: 3004567890,
    comoLlegarSede: 'Cerca al centro comercial',
    extensionFijo: 789,
    direccionSede: 'Calle 321 #67-89',
    estado: 'Bloqueado',
    date_edit: { _seconds: 1686037623, _nanoseconds: 0 },
    sedes: [],
    contactos: [],
    horarioPV: [],
    marketPlace: [],
    canalesComunicacion: [],
    redesSociales: []
  }
];

// Mock de detalle de empresa (para getCompanyById)
export const companyDetailMock = {
  id: 2,
  nombre: 'Empresa Y',
  nit: '987654321-0',
  direccion: 'Carrera 50 #30-40',
  ciudad: 'Medellín',
  departamento: 'Antioquia',
  pais: 'Colombia',
  emailContacto: 'contacto@empresay.com',
  telContacto: '6045678901',
  nombreSede: 'Sede Principal',
  fijoContacto: '6045678901',
  emailFactuElec: 'facturacion@empresay.com',
  cel: 3001234567,
  comoLlegarSede: 'Cerca al metro',
  extensionFijo: 456,
  direccionSede: 'Carrera 50 #30-40',
  estado: 'Pendiente',
  date_edit: { _seconds: 1686137623, _nanoseconds: 0 },
  sedes: [
    {
      nombreSede: 'Sede Principal',
      rotuloDireccionSede: 'Centro Empresarial',
      ciudadSede: 'Medellín',
      direccionSede: 'Carrera 50 #30-40',
      paisSede: 'Colombia',
      comoLlegarSede: 'Cerca al metro',
      dptoSede: 'Antioquia',
      codigoPostalSede: '050001'
    },
    {
      nombreSede: 'Sede Secundaria',
      rotuloDireccionSede: 'Centro Comercial',
      ciudadSede: 'Medellín',
      direccionSede: 'Calle 80 #65-45',
      paisSede: 'Colombia',
      comoLlegarSede: 'Cerca al estadio',
      dptoSede: 'Antioquia',
      codigoPostalSede: '050002'
    }
  ],
  contactos: [
    {
      fijoContacto: '6045678901',
      extensionFijoContacto: '456',
      cargoContacto: 'Director',
      emailContacto: 'maria@empresay.com',
      telContacto: '6045678901',
      nomCompletoContacto: 'María Rodríguez',
      indicativoFijoContacto: '604',
      indicativoTelContacto: '604'
    },
    {
      fijoContacto: '6045678902',
      extensionFijoContacto: '457',
      cargoContacto: 'Gerente Comercial',
      emailContacto: 'pedro@empresay.com',
      telContacto: '6045678902',
      nomCompletoContacto: 'Pedro Gómez',
      indicativoFijoContacto: '604',
      indicativoTelContacto: '604'
    }
  ],
  horarioPV: [
    {
      nombrePV: 'Principal',
      aperturaPv: '08:00',
      cierrePv: '18:00'
    },
    {
      nombrePV: 'Secundario',
      aperturaPv: '09:00',
      cierrePv: '20:00'
    }
  ],
  marketPlace: [
    {
      nombreMP: 'Mercado Libre',
      logoMP: 'assets/images/marketplace/mercadolibre.png',
      linkMP: 'https://mercadolibre.com/empresay',
      activoMp: true
    },
    {
      nombreMP: 'Amazon',
      logoMP: 'assets/images/marketplace/amazon.png',
      linkMP: 'https://amazon.com/empresay',
      activoMp: true
    }
  ],
  canalesComunicacion: [
    {
      logoCC: 'assets/images/canales/whatsapp.png',
      nombreCC: 'WhatsApp',
      linkCC: 'https://wa.me/573001234567',
      activoCc: true
    }
  ],
  redesSociales: [
    {
      logoRS: 'assets/images/redes/facebook.png',
      nombreRS: 'Facebook',
      linkRS: 'https://facebook.com/empresay',
      activoRs: true
    },
    {
      logoRS: 'assets/images/redes/instagram.png',
      nombreRS: 'Instagram',
      linkRS: 'https://instagram.com/empresay',
      activoRs: true
    }
  ]
};

// Mock de respuestas para operaciones CRUD
export const successResponseMock = {
  success: true,
  message: 'Operación completada exitosamente'
}; 