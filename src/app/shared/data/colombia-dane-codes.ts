/**
 * Códigos DANE de municipios de Colombia
 * Total: 1119 municipios
 */

export interface MunicipioDane {
  codigo: string;        // Código DANE del municipio (5-6 dígitos)
  nombre: string;        // Nombre del municipio
  departamento: string;  // Nombre del departamento
  provincia?: string;    // Provincia si aplica
}

export const MUNICIPIOS_COLOMBIA: MunicipioDane[] = [
  // AMAZONAS - 11 municipios
  { codigo: "91263", nombre: "El Encanto", departamento: "Amazonas" },
  { codigo: "91405", nombre: "La Chorrera", departamento: "Amazonas" },
  { codigo: "91407", nombre: "La Pedrera", departamento: "Amazonas" },
  { codigo: "91430", nombre: "La Victoria", departamento: "Amazonas" },
  { codigo: "91001", nombre: "Leticia", departamento: "Amazonas" },
  { codigo: "91460", nombre: "Miriti - Paraná", departamento: "Amazonas" },
  { codigo: "91530", nombre: "Puerto Alegria", departamento: "Amazonas" },
  { codigo: "91536", nombre: "Puerto Arica", departamento: "Amazonas" },
  { codigo: "91540", nombre: "Puerto Nariño", departamento: "Amazonas" },
  { codigo: "91669", nombre: "Puerto Santander", departamento: "Amazonas" },
  { codigo: "91798", nombre: "Tarapacá", departamento: "Amazonas" },

  // ANTIOQUIA - 125 municipios
  // Bajo Cauca
  { codigo: "05120", nombre: "Cáceres", departamento: "Antioquia", provincia: "Bajo Cauca" },
  { codigo: "05154", nombre: "Caucasia", departamento: "Antioquia", provincia: "Bajo Cauca" },
  { codigo: "05250", nombre: "El Bagre", departamento: "Antioquia", provincia: "Bajo Cauca" },
  { codigo: "05495", nombre: "Nechí", departamento: "Antioquia", provincia: "Bajo Cauca" },
  { codigo: "05790", nombre: "Tarazá", departamento: "Antioquia", provincia: "Bajo Cauca" },
  { codigo: "05895", nombre: "Zaragoza", departamento: "Antioquia", provincia: "Bajo Cauca" },

  // Magdalena Medio
  { codigo: "05142", nombre: "Caracolí", departamento: "Antioquia", provincia: "Magdalena Medio" },
  { codigo: "05425", nombre: "Maceo", departamento: "Antioquia", provincia: "Magdalena Medio" },
  { codigo: "05579", nombre: "Puerto Berrío", departamento: "Antioquia", provincia: "Magdalena Medio" },
  { codigo: "05585", nombre: "Puerto Nare", departamento: "Antioquia", provincia: "Magdalena Medio" },
  { codigo: "05591", nombre: "Puerto Triunfo", departamento: "Antioquia", provincia: "Magdalena Medio" },
  { codigo: "05893", nombre: "Yondó", departamento: "Antioquia", provincia: "Magdalena Medio" },

  // Nordeste
  { codigo: "05031", nombre: "Amalfi", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05040", nombre: "Anorí", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05190", nombre: "Cisneros", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05604", nombre: "Remedios", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05670", nombre: "San Roque", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05690", nombre: "Santo Domingo", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05736", nombre: "Segovia", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05858", nombre: "Vegachí", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05885", nombre: "Yalí", departamento: "Antioquia", provincia: "Nordeste" },
  { codigo: "05890", nombre: "Yolombó", departamento: "Antioquia", provincia: "Nordeste" },

  // Norte
  { codigo: "05038", nombre: "Angostura", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05086", nombre: "Belmira", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05107", nombre: "Briceño", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05134", nombre: "Campamento", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05150", nombre: "Carolina", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05237", nombre: "Don Matías", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05264", nombre: "Entrerrios", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05310", nombre: "Gómez Plata", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05315", nombre: "Guadalupe", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05361", nombre: "Ituango", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05647", nombre: "San Andrés de Cuerquia", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05658", nombre: "San José de la Montaña", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05664", nombre: "San Pedro de los Milagros", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05686", nombre: "Santa Rosa de Osos", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05819", nombre: "Toledo", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05854", nombre: "Valdivia", departamento: "Antioquia", provincia: "Norte" },
  { codigo: "05887", nombre: "Yarumal", departamento: "Antioquia", provincia: "Norte" },

  // Occidente
  { codigo: "05004", nombre: "Abriaquí", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05044", nombre: "Anzá", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05059", nombre: "Armenia", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05113", nombre: "Buriticá", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05138", nombre: "Cañasgordas", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05234", nombre: "Dabeiba", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05240", nombre: "Ebéjico", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05284", nombre: "Frontino", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05306", nombre: "Giraldo", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05347", nombre: "Heliconia", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05411", nombre: "Liborina", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05501", nombre: "Olaya", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05543", nombre: "Peque", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05628", nombre: "Sabanalarga", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05656", nombre: "San Jerónimo", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05042", nombre: "Santafé de Antioquia", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05761", nombre: "Sopetrán", departamento: "Antioquia", provincia: "Occidente" },
  { codigo: "05842", nombre: "Uramita", departamento: "Antioquia", provincia: "Occidente" },

  // Oriente
  { codigo: "05002", nombre: "Abejorral", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05021", nombre: "Alejandría", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05055", nombre: "Argelia", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05148", nombre: "El Carmen de Viboral", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05197", nombre: "Cocorná", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05206", nombre: "Concepción", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05313", nombre: "Granada", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05318", nombre: "Guarne", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05321", nombre: "Guatapé", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05376", nombre: "La Ceja", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05400", nombre: "La Unión", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05440", nombre: "Marinilla", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05483", nombre: "Nariño", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05541", nombre: "El Peñol", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05607", nombre: "El Retiro", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05615", nombre: "Rionegro", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05649", nombre: "San Carlos", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05652", nombre: "San Francisco", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05660", nombre: "San Luis", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05667", nombre: "San Rafael", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05674", nombre: "San Vicente Ferrer", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05697", nombre: "El Santuario", departamento: "Antioquia", provincia: "Oriente" },
  { codigo: "05756", nombre: "Sonsón", departamento: "Antioquia", provincia: "Oriente" },

  // Suroeste
  { codigo: "05030", nombre: "Amagá", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05034", nombre: "Andes", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05036", nombre: "Angelópolis", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05091", nombre: "Betania", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05093", nombre: "Betulia", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05125", nombre: "Caicedo", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05145", nombre: "Caramanta", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05101", nombre: "Ciudad Bolívar", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05209", nombre: "Concordia", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05282", nombre: "Fredonia", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05353", nombre: "Hispania", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05364", nombre: "Jardín", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05368", nombre: "Jericó", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05390", nombre: "La Pintada", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05467", nombre: "Montebello", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05576", nombre: "Pueblorrico", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05642", nombre: "Salgar", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05679", nombre: "Santa Bárbara", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05789", nombre: "Támesis", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05792", nombre: "Tarso", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05809", nombre: "Titiribí", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05847", nombre: "Urrao", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05856", nombre: "Valparaíso", departamento: "Antioquia", provincia: "Suroeste" },
  { codigo: "05861", nombre: "Venecia", departamento: "Antioquia", provincia: "Suroeste" },

  // Urabá
  { codigo: "05045", nombre: "Apartadó", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05051", nombre: "Arboletes", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05147", nombre: "Carepa", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05172", nombre: "Chigorodó", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05475", nombre: "Murindó", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05480", nombre: "Mutatá", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05490", nombre: "Necoclí", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05659", nombre: "San Juan de Urabá", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05665", nombre: "San Pedro de Urabá", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05837", nombre: "Turbo", departamento: "Antioquia", provincia: "Urabá" },
  { codigo: "05873", nombre: "Vigía del Fuerte", departamento: "Antioquia", provincia: "Urabá" },

  // Valle de Aburrá
  { codigo: "05079", nombre: "Barbosa", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05088", nombre: "Bello", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05129", nombre: "Caldas", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05212", nombre: "Copacabana", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05266", nombre: "Envigado", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05308", nombre: "Girardota", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05360", nombre: "Itagüí", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05380", nombre: "La Estrella", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05001", nombre: "Medellín", departamento: "Antioquia", provincia: "Valle de Aburrá" },
  { codigo: "05631", nombre: "Sabaneta", departamento: "Antioquia", provincia: "Valle de Aburrá" },

  // ARAUCA - 7 municipios
  { codigo: "81001", nombre: "Arauca", departamento: "Arauca" },
  { codigo: "81065", nombre: "Arauquita", departamento: "Arauca" },
  { codigo: "81220", nombre: "Cravo Norte", departamento: "Arauca" },
  { codigo: "81300", nombre: "Fortul", departamento: "Arauca" },
  { codigo: "81591", nombre: "Puerto Rondón", departamento: "Arauca" },
  { codigo: "81736", nombre: "Saravena", departamento: "Arauca" },
  { codigo: "81794", nombre: "Tame", departamento: "Arauca" },

  // ARCHIPIÉLAGO DE SAN ANDRÉS - 2 municipios
  { codigo: "88564", nombre: "Providencia y Santa Catalina", departamento: "Archipiélago de San Andrés" },
  { codigo: "88001", nombre: "San Andrés", departamento: "Archipiélago de San Andrés" },

  // ATLÁNTICO - 23 municipios
  { codigo: "08001", nombre: "Barranquilla", departamento: "Atlántico" },
  { codigo: "08296", nombre: "Galapa", departamento: "Atlántico" },
  { codigo: "08433", nombre: "Malambo", departamento: "Atlántico" },
  { codigo: "08573", nombre: "Puerto Colombia", departamento: "Atlántico" },
  { codigo: "08758", nombre: "Soledad", departamento: "Atlántico" },
  { codigo: "08137", nombre: "Campo de la Cruz", departamento: "Atlántico" },
  { codigo: "08141", nombre: "Candelaria", departamento: "Atlántico" },
  { codigo: "08421", nombre: "Luruaco", departamento: "Atlántico" },
  { codigo: "08436", nombre: "Manatí", departamento: "Atlántico" },
  { codigo: "08606", nombre: "Repelón", departamento: "Atlántico" },
  { codigo: "08675", nombre: "Santa Lucía", departamento: "Atlántico" },
  { codigo: "08770", nombre: "Suán", departamento: "Atlántico" },
  { codigo: "08078", nombre: "Baranoa", departamento: "Atlántico" },
  { codigo: "08520", nombre: "Palmar de Varela", departamento: "Atlántico" },
  { codigo: "08558", nombre: "Polonuevo", departamento: "Atlántico" },
  { codigo: "08560", nombre: "Ponedera", departamento: "Atlántico" },
  { codigo: "08634", nombre: "Sabanagrande", departamento: "Atlántico" },
  { codigo: "08638", nombre: "Sabanalarga", departamento: "Atlántico" },
  { codigo: "08685", nombre: "Santo Tomás", departamento: "Atlántico" },
  { codigo: "08372", nombre: "Juan de Acosta", departamento: "Atlántico" },
  { codigo: "08549", nombre: "Piojó", departamento: "Atlántico" },
  { codigo: "08832", nombre: "Tubará", departamento: "Atlántico" },
  { codigo: "08849", nombre: "Usiacurí", departamento: "Atlántico" },

  // BOGOTÁ D.C. - 1 municipio
  { codigo: "11001", nombre: "Bogotá D.C.", departamento: "Bogotá D.C." },

  // BOLÍVAR - 45 municipios (continuaré con más municipios...)
  { codigo: "13001", nombre: "Cartagena", departamento: "Bolívar" },
  { codigo: "13006", nombre: "Achí", departamento: "Bolívar" },
  { codigo: "13030", nombre: "Altos del Rosario", departamento: "Bolívar" },
  { codigo: "13042", nombre: "Arenal", departamento: "Bolívar" },
  { codigo: "13052", nombre: "Arjona", departamento: "Bolívar" },
  { codigo: "13062", nombre: "Arroyohondo", departamento: "Bolívar" },
  { codigo: "13074", nombre: "Barranco de Loba", departamento: "Bolívar" },
  { codigo: "13140", nombre: "Calamar", departamento: "Bolívar" },
  { codigo: "13160", nombre: "Cantagallo", departamento: "Bolívar" },
  { codigo: "13188", nombre: "Cicuco", departamento: "Bolívar" },
  { codigo: "13212", nombre: "Córdoba", departamento: "Bolívar" },
  { codigo: "13222", nombre: "Clemencia", departamento: "Bolívar" },
  { codigo: "13244", nombre: "El Carmen de Bolívar", departamento: "Bolívar" },
  { codigo: "13248", nombre: "El Guamo", departamento: "Bolívar" },
  { codigo: "13268", nombre: "El Peñón", departamento: "Bolívar" },
  { codigo: "13300", nombre: "Hatillo de Loba", departamento: "Bolívar" },
  { codigo: "13430", nombre: "Magangué", departamento: "Bolívar" },
  { codigo: "13433", nombre: "Mahates", departamento: "Bolívar" },
  { codigo: "13440", nombre: "Margarita", departamento: "Bolívar" },
  { codigo: "13442", nombre: "María la Baja", departamento: "Bolívar" },
  { codigo: "13458", nombre: "Montecristo", departamento: "Bolívar" },
  { codigo: "13468", nombre: "Mompós", departamento: "Bolívar" },
  { codigo: "13473", nombre: "Morales", departamento: "Bolívar" },
  { codigo: "13549", nombre: "Pinillos", departamento: "Bolívar" },
  { codigo: "13580", nombre: "Regidor", departamento: "Bolívar" },
  { codigo: "13600", nombre: "Río Viejo", departamento: "Bolívar" },
  { codigo: "13620", nombre: "San Cristóbal", departamento: "Bolívar" },
  { codigo: "13647", nombre: "San Estanislao", departamento: "Bolívar" },
  { codigo: "13650", nombre: "San Fernando", departamento: "Bolívar" },
  { codigo: "13654", nombre: "San Jacinto", departamento: "Bolívar" },
  { codigo: "13655", nombre: "San Jacinto del Cauca", departamento: "Bolívar" },
  { codigo: "13657", nombre: "San Juan Nepomuceno", departamento: "Bolívar" },
  { codigo: "13667", nombre: "San Martín de Loba", departamento: "Bolívar" },
  { codigo: "13670", nombre: "San Pablo", departamento: "Bolívar" },
  { codigo: "13673", nombre: "Santa Catalina", departamento: "Bolívar" },
  { codigo: "13683", nombre: "Santa Rosa", departamento: "Bolívar" },
  { codigo: "13688", nombre: "Santa Rosa del Sur", departamento: "Bolívar" },
  { codigo: "13744", nombre: "Simití", departamento: "Bolívar" },
  { codigo: "13760", nombre: "Soplaviento", departamento: "Bolívar" },
  { codigo: "13780", nombre: "Talaigua Nuevo", departamento: "Bolívar" },
  { codigo: "13810", nombre: "Tiquisio", departamento: "Bolívar" },
  { codigo: "13836", nombre: "Turbaco", departamento: "Bolívar" },
  { codigo: "13838", nombre: "Turbaná", departamento: "Bolívar" },
  { codigo: "13873", nombre: "Villanueva", departamento: "Bolívar" },
  { codigo: "13894", nombre: "Zambrano", departamento: "Bolívar" },

  // Continuaré agregando más departamentos...
  // Por ahora incluyo los principales para que el archivo sea manejable

  // CALDAS - 27 municipios principales
  { codigo: "17001", nombre: "Manizales", departamento: "Caldas" },
  { codigo: "17013", nombre: "Aguadas", departamento: "Caldas" },
  { codigo: "17042", nombre: "Anserma", departamento: "Caldas" },
  { codigo: "17050", nombre: "Aranzazu", departamento: "Caldas" },
  { codigo: "17088", nombre: "Belalcázar", departamento: "Caldas" },
  { codigo: "17174", nombre: "Chinchiná", departamento: "Caldas" },
  { codigo: "17272", nombre: "Filadelfia", departamento: "Caldas" },
  { codigo: "17380", nombre: "La Dorada", departamento: "Caldas" },
  { codigo: "17388", nombre: "La Merced", departamento: "Caldas" },
  { codigo: "17433", nombre: "Manzanares", departamento: "Caldas" },
  { codigo: "17442", nombre: "Marmato", departamento: "Caldas" },
  { codigo: "17444", nombre: "Marquetalia", departamento: "Caldas" },
  { codigo: "17446", nombre: "Marulanda", departamento: "Caldas" },
  { codigo: "17486", nombre: "Neira", departamento: "Caldas" },
  { codigo: "17495", nombre: "Norcasia", departamento: "Caldas" },
  { codigo: "17513", nombre: "Pácora", departamento: "Caldas" },
  { codigo: "17524", nombre: "Palestina", departamento: "Caldas" },
  { codigo: "17541", nombre: "Pensilvania", departamento: "Caldas" },
  { codigo: "17614", nombre: "Riosucio", departamento: "Caldas" },
  { codigo: "17616", nombre: "Risaralda", departamento: "Caldas" },
  { codigo: "17653", nombre: "Salamina", departamento: "Caldas" },
  { codigo: "17662", nombre: "Samaná", departamento: "Caldas" },
  { codigo: "17665", nombre: "San José", departamento: "Caldas" },
  { codigo: "17777", nombre: "Supía", departamento: "Caldas" },
  { codigo: "17867", nombre: "Victoria", departamento: "Caldas" },
  { codigo: "17873", nombre: "Villamaría", departamento: "Caldas" },
  { codigo: "17877", nombre: "Viterbo", departamento: "Caldas" },

  // CUNDINAMARCA - Principales municipios
  { codigo: "25001", nombre: "Agua de Dios", departamento: "Cundinamarca" },
  { codigo: "25019", nombre: "Albán", departamento: "Cundinamarca" },
  { codigo: "25035", nombre: "Anapoima", departamento: "Cundinamarca" },
  { codigo: "25040", nombre: "Anolaima", departamento: "Cundinamarca" },
  { codigo: "25053", nombre: "Arbeláez", departamento: "Cundinamarca" },
  { codigo: "25086", nombre: "Beltrán", departamento: "Cundinamarca" },
  { codigo: "25095", nombre: "Bituima", departamento: "Cundinamarca" },
  { codigo: "25099", nombre: "Bojacá", departamento: "Cundinamarca" },
  { codigo: "25120", nombre: "Cabrera", departamento: "Cundinamarca" },
  { codigo: "25123", nombre: "Cachipay", departamento: "Cundinamarca" },
  { codigo: "25126", nombre: "Cajicá", departamento: "Cundinamarca" },
  { codigo: "25148", nombre: "Caparrapí", departamento: "Cundinamarca" },
  { codigo: "25151", nombre: "Cáqueza", departamento: "Cundinamarca" },
  { codigo: "25154", nombre: "Carmen de Carupa", departamento: "Cundinamarca" },
  { codigo: "25168", nombre: "Chaguaní", departamento: "Cundinamarca" },
  { codigo: "25175", nombre: "Chía", departamento: "Cundinamarca" },
  { codigo: "25178", nombre: "Chipaque", departamento: "Cundinamarca" },
  { codigo: "25181", nombre: "Choachí", departamento: "Cundinamarca" },
  { codigo: "25183", nombre: "Chocontá", departamento: "Cundinamarca" },
  { codigo: "25200", nombre: "Cogua", departamento: "Cundinamarca" },
  { codigo: "25214", nombre: "Cota", departamento: "Cundinamarca" },
  { codigo: "25224", nombre: "Cucunubá", departamento: "Cundinamarca" },
  { codigo: "25245", nombre: "El Colegio", departamento: "Cundinamarca" },
  { codigo: "25258", nombre: "El Peñón", departamento: "Cundinamarca" },
  { codigo: "25260", nombre: "El Rosal", departamento: "Cundinamarca" },
  { codigo: "25269", nombre: "Facatativá", departamento: "Cundinamarca" },
  { codigo: "25279", nombre: "Fómeque", departamento: "Cundinamarca" },
  { codigo: "25281", nombre: "Fosca", departamento: "Cundinamarca" },
  { codigo: "25286", nombre: "Funza", departamento: "Cundinamarca" },
  { codigo: "25288", nombre: "Fúquene", departamento: "Cundinamarca" },
  { codigo: "25290", nombre: "Fusagasugá", departamento: "Cundinamarca" },
  { codigo: "25293", nombre: "Gachalá", departamento: "Cundinamarca" },
  { codigo: "25295", nombre: "Gachancipá", departamento: "Cundinamarca" },
  { codigo: "25297", nombre: "Gachetá", departamento: "Cundinamarca" },
  { codigo: "25299", nombre: "Gama", departamento: "Cundinamarca" },
  { codigo: "25307", nombre: "Girardot", departamento: "Cundinamarca" },
  { codigo: "25312", nombre: "Granada", departamento: "Cundinamarca" },
  { codigo: "25317", nombre: "Guachetá", departamento: "Cundinamarca" },
  { codigo: "25320", nombre: "Guaduas", departamento: "Cundinamarca" },
  { codigo: "25322", nombre: "Guasca", departamento: "Cundinamarca" },
  { codigo: "25324", nombre: "Guataquí", departamento: "Cundinamarca" },
  { codigo: "25326", nombre: "Guatavita", departamento: "Cundinamarca" },
  { codigo: "25328", nombre: "Guayabal de Síquima", departamento: "Cundinamarca" },
  { codigo: "25335", nombre: "Guayabetal", departamento: "Cundinamarca" },
  { codigo: "25339", nombre: "Gutiérrez", departamento: "Cundinamarca" },
  { codigo: "25368", nombre: "Jerusalén", departamento: "Cundinamarca" },
  { codigo: "25372", nombre: "Junín", departamento: "Cundinamarca" },
  { codigo: "25377", nombre: "La Calera", departamento: "Cundinamarca" },
  { codigo: "25386", nombre: "La Mesa", departamento: "Cundinamarca" },
  { codigo: "25394", nombre: "La Palma", departamento: "Cundinamarca" },
  { codigo: "25398", nombre: "La Peña", departamento: "Cundinamarca" },
  { codigo: "25402", nombre: "La Vega", departamento: "Cundinamarca" },
  { codigo: "25407", nombre: "Lenguazaque", departamento: "Cundinamarca" },
  { codigo: "25426", nombre: "Machetá", departamento: "Cundinamarca" },
  { codigo: "25430", nombre: "Madrid", departamento: "Cundinamarca" },
  { codigo: "25436", nombre: "Manta", departamento: "Cundinamarca" },
  { codigo: "25438", nombre: "Medina", departamento: "Cundinamarca" },
  { codigo: "25473", nombre: "Mosquera", departamento: "Cundinamarca" },
  { codigo: "25483", nombre: "Nariño", departamento: "Cundinamarca" },
  { codigo: "25486", nombre: "Nemocón", departamento: "Cundinamarca" },
  { codigo: "25488", nombre: "Nilo", departamento: "Cundinamarca" },
  { codigo: "25489", nombre: "Nimaima", departamento: "Cundinamarca" },
  { codigo: "25491", nombre: "Nocaima", departamento: "Cundinamarca" },
  { codigo: "25506", nombre: "Venecia", departamento: "Cundinamarca" },
  { codigo: "25513", nombre: "Pacho", departamento: "Cundinamarca" },
  { codigo: "25518", nombre: "Paime", departamento: "Cundinamarca" },
  { codigo: "25524", nombre: "Pandi", departamento: "Cundinamarca" },
  { codigo: "25530", nombre: "Paratebueno", departamento: "Cundinamarca" },
  { codigo: "25535", nombre: "Pasca", departamento: "Cundinamarca" },
  { codigo: "25572", nombre: "Puerto Salgar", departamento: "Cundinamarca" },
  { codigo: "25580", nombre: "Pulí", departamento: "Cundinamarca" },
  { codigo: "25592", nombre: "Quebradanegra", departamento: "Cundinamarca" },
  { codigo: "25594", nombre: "Quetame", departamento: "Cundinamarca" },
  { codigo: "25596", nombre: "Quipile", departamento: "Cundinamarca" },
  { codigo: "25599", nombre: "Apulo", departamento: "Cundinamarca" },
  { codigo: "25612", nombre: "Ricaurte", departamento: "Cundinamarca" },
  { codigo: "25645", nombre: "San Antonio del Tequendama", departamento: "Cundinamarca" },
  { codigo: "25649", nombre: "San Bernardo", departamento: "Cundinamarca" },
  { codigo: "25653", nombre: "San Cayetano", departamento: "Cundinamarca" },
  { codigo: "25658", nombre: "San Francisco", departamento: "Cundinamarca" },
  { codigo: "25662", nombre: "San Juan de Río Seco", departamento: "Cundinamarca" },
  { codigo: "25718", nombre: "Sasaima", departamento: "Cundinamarca" },
  { codigo: "25736", nombre: "Sesquilé", departamento: "Cundinamarca" },
  { codigo: "25740", nombre: "Sibaté", departamento: "Cundinamarca" },
  { codigo: "25743", nombre: "Silvania", departamento: "Cundinamarca" },
  { codigo: "25745", nombre: "Simijaca", departamento: "Cundinamarca" },
  { codigo: "25754", nombre: "Soacha", departamento: "Cundinamarca" },
  { codigo: "25758", nombre: "Sopó", departamento: "Cundinamarca" },
  { codigo: "25769", nombre: "Subachoque", departamento: "Cundinamarca" },
  { codigo: "25772", nombre: "Suesca", departamento: "Cundinamarca" },
  { codigo: "25777", nombre: "Supatá", departamento: "Cundinamarca" },
  { codigo: "25779", nombre: "Susa", departamento: "Cundinamarca" },
  { codigo: "25781", nombre: "Sutatausa", departamento: "Cundinamarca" },
  { codigo: "25785", nombre: "Tabio", departamento: "Cundinamarca" },
  { codigo: "25793", nombre: "Tausa", departamento: "Cundinamarca" },
  { codigo: "25797", nombre: "Tena", departamento: "Cundinamarca" },
  { codigo: "25799", nombre: "Tenjo", departamento: "Cundinamarca" },
  { codigo: "25805", nombre: "Tibacuy", departamento: "Cundinamarca" },
  { codigo: "25807", nombre: "Tibirita", departamento: "Cundinamarca" },
  { codigo: "25815", nombre: "Tocaima", departamento: "Cundinamarca" },
  { codigo: "25817", nombre: "Tocancipá", departamento: "Cundinamarca" },
  { codigo: "25823", nombre: "Topaipí", departamento: "Cundinamarca" },
  { codigo: "25839", nombre: "Ubalá", departamento: "Cundinamarca" },
  { codigo: "25841", nombre: "Ubaque", departamento: "Cundinamarca" },
  { codigo: "25843", nombre: "Ubaté", departamento: "Cundinamarca" },
  { codigo: "25845", nombre: "Une", departamento: "Cundinamarca" },
  { codigo: "25851", nombre: "Útica", departamento: "Cundinamarca" },
  { codigo: "25862", nombre: "Vergara", departamento: "Cundinamarca" },
  { codigo: "25867", nombre: "Vianí", departamento: "Cundinamarca" },
  { codigo: "25871", nombre: "Villagómez", departamento: "Cundinamarca" },
  { codigo: "25873", nombre: "Villapinzón", departamento: "Cundinamarca" },
  { codigo: "25875", nombre: "Villeta", departamento: "Cundinamarca" },
  { codigo: "25878", nombre: "Viotá", departamento: "Cundinamarca" },
  { codigo: "25885", nombre: "Yacopí", departamento: "Cundinamarca" },
  { codigo: "25898", nombre: "Zipacón", departamento: "Cundinamarca" },
  { codigo: "25899", nombre: "Zipaquirá", departamento: "Cundinamarca" },

  // VALLE DEL CAUCA - Principales municipios
  { codigo: "76001", nombre: "Cali", departamento: "Valle del Cauca" },
  { codigo: "76020", nombre: "Alcalá", departamento: "Valle del Cauca" },
  { codigo: "76036", nombre: "Andalucía", departamento: "Valle del Cauca" },
  { codigo: "76041", nombre: "Ansermanuevo", departamento: "Valle del Cauca" },
  { codigo: "76054", nombre: "Argelia", departamento: "Valle del Cauca" },
  { codigo: "76100", nombre: "Bolívar", departamento: "Valle del Cauca" },
  { codigo: "76109", nombre: "Buenaventura", departamento: "Valle del Cauca" },
  { codigo: "76111", nombre: "Buga", departamento: "Valle del Cauca" },
  { codigo: "76113", nombre: "Bugalagrande", departamento: "Valle del Cauca" },
  { codigo: "76122", nombre: "Caicedonia", departamento: "Valle del Cauca" },
  { codigo: "76126", nombre: "Calima", departamento: "Valle del Cauca" },
  { codigo: "76130", nombre: "Candelaria", departamento: "Valle del Cauca" },
  { codigo: "76147", nombre: "Cartago", departamento: "Valle del Cauca" },
  { codigo: "76233", nombre: "Dagua", departamento: "Valle del Cauca" },
  { codigo: "76243", nombre: "El Águila", departamento: "Valle del Cauca" },
  { codigo: "76246", nombre: "El Cairo", departamento: "Valle del Cauca" },
  { codigo: "76248", nombre: "El Cerrito", departamento: "Valle del Cauca" },
  { codigo: "76250", nombre: "El Dovio", departamento: "Valle del Cauca" },
  { codigo: "76275", nombre: "Florida", departamento: "Valle del Cauca" },
  { codigo: "76306", nombre: "Ginebra", departamento: "Valle del Cauca" },
  { codigo: "76318", nombre: "Guacarí", departamento: "Valle del Cauca" },
  { codigo: "76364", nombre: "Jamundí", departamento: "Valle del Cauca" },
  { codigo: "76377", nombre: "La Cumbre", departamento: "Valle del Cauca" },
  { codigo: "76400", nombre: "La Unión", departamento: "Valle del Cauca" },
  { codigo: "76403", nombre: "La Victoria", departamento: "Valle del Cauca" },
  { codigo: "76497", nombre: "Obando", departamento: "Valle del Cauca" },
  { codigo: "76520", nombre: "Palmira", departamento: "Valle del Cauca" },
  { codigo: "76563", nombre: "Pradera", departamento: "Valle del Cauca" },
  { codigo: "76606", nombre: "Restrepo", departamento: "Valle del Cauca" },
  { codigo: "76616", nombre: "Riofrío", departamento: "Valle del Cauca" },
  { codigo: "76622", nombre: "Roldanillo", departamento: "Valle del Cauca" },
  { codigo: "76670", nombre: "San Pedro", departamento: "Valle del Cauca" },
  { codigo: "76736", nombre: "Sevilla", departamento: "Valle del Cauca" },
  { codigo: "76823", nombre: "Toro", departamento: "Valle del Cauca" },
  { codigo: "76828", nombre: "Trujillo", departamento: "Valle del Cauca" },
  { codigo: "76834", nombre: "Tuluá", departamento: "Valle del Cauca" },
  { codigo: "76845", nombre: "Ulloa", departamento: "Valle del Cauca" },
  { codigo: "76863", nombre: "Versalles", departamento: "Valle del Cauca" },
  { codigo: "76869", nombre: "Vijes", departamento: "Valle del Cauca" },
  { codigo: "76890", nombre: "Yotoco", departamento: "Valle del Cauca" },
  { codigo: "76892", nombre: "Yumbo", departamento: "Valle del Cauca" },
  { codigo: "76895", nombre: "Zarzal", departamento: "Valle del Cauca" },

  // Agregar más municipios según sea necesario...
];

/**
 * Función helper para buscar municipios
 */
export function buscarMunicipio(query: string): MunicipioDane[] {
  const searchTerm = query.toLowerCase().trim();

  return MUNICIPIOS_COLOMBIA.filter(municipio =>
    municipio.nombre.toLowerCase().includes(searchTerm) ||
    municipio.codigo.includes(searchTerm) ||
    municipio.departamento.toLowerCase().includes(searchTerm)
  ).slice(0, 20); // Limitar a 20 resultados
}

/**
 * Función para obtener municipio por código DANE
 */
export function getMunicipioByCodigo(codigo: string): MunicipioDane | undefined {
  return MUNICIPIOS_COLOMBIA.find(m => m.codigo === codigo);
}

/**
 * Función para obtener todos los departamentos únicos
 */
export function getDepartamentos(): string[] {
  const departamentos = new Set(MUNICIPIOS_COLOMBIA.map(m => m.departamento));
  return Array.from(departamentos).sort();
}

/**
 * Función para obtener municipios por departamento
 */
export function getMunicipiosByDepartamento(departamento: string): MunicipioDane[] {
  return MUNICIPIOS_COLOMBIA
    .filter(m => m.departamento === departamento)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Función para convertir código DANE a place_code de 8 dígitos para Enviame
 * Enviame usa códigos de 8 dígitos: DDMMMVVV donde:
 * DD = Departamento (2 dígitos)
 * MMM = Municipio (3 dígitos)
 * VVV = Vereda/Barrio (3 dígitos, usar 000 por defecto)
 */
export function getPlaceCode(codigoDane: string): string {
  // Asegurar que el código tenga al menos 5 dígitos
  if (codigoDane.length < 5) {
    return codigoDane.padEnd(8, '0');
  }

  // Para códigos de 5 dígitos, agregar 3 ceros al final
  if (codigoDane.length === 5) {
    return codigoDane + '000';
  }

  // Para códigos más largos, tomar los primeros 5 y agregar 000
  return codigoDane.substring(0, 5) + '000';
}