/**
 * Configuración de empresa/servicio para Video Agent
 * Permite personalizar la experiencia según la empresa objetivo
 */

export interface CompanyConfig {
  id: string;
  name: string;
  industry: "appliance" | "automotive" | "healthcare" | "general";

  // Branding
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    companyName: string;
  };

  // UI Configuration
  ui: {
    welcomeMessage: string;
    instructionsForElderly: string[];
    fontSize: "normal" | "large" | "extra-large";
    highContrast: boolean;
  };

  // Adapter específico
  adapterType: string;

  // Información de contacto
  contact?: {
    phone?: string;
    email?: string;
    scheduleUrl?: string;
  };
}

/**
 * Configuraciones predefinidas por empresa
 */
export const COMPANY_CONFIGS: { [key: string]: CompanyConfig } = {
  haceb: {
    id: "haceb",
    name: "Haceb",
    industry: "appliance",
    branding: {
      primaryColor: "#E31E24",
      secondaryColor: "#1A1A1A",
      companyName: "Haceb",
      logo: "assets/logos/haceb-logo.png",
    },
    ui: {
      welcomeMessage:
        "¡Hola! Soy tu asistente de Haceb. Te ayudaré a diagnosticar tu electrodoméstico.",
      instructionsForElderly: [
        "1. Acerca la cámara al electrodoméstico",
        "2. Cuéntame qué problema tiene",
        "3. Te diré si puedes resolverlo tú mismo",
      ],
      fontSize: "extra-large",
      highContrast: true,
    },
    adapterType: "HacebAdapter",
    contact: {
      phone: "#466",
      scheduleUrl: "/servicios/agendamiento",
    },
  },

  apple: {
    id: "apple",
    name: "Apple",
    industry: "appliance",
    branding: {
      primaryColor: "#000000",
      secondaryColor: "#A6AAAE",
      companyName: "Soporte Apple",
      logo: "assets/logos/apple-logo.png",
    },
    ui: {
      welcomeMessage:
        "¡Hola! Soy tu asistente de Soporte Apple. Muéstrame tu dispositivo y cuéntame qué problema tienes.",
      instructionsForElderly: [
        "Muestra tu iPhone, iPad o Mac a la cámara",
        "Cuéntame qué problema estás experimentando",
        "Te ayudaré a solucionarlo o agendaré una reparación",
      ],
      fontSize: "extra-large",
      highContrast: true,
    },
    adapterType: "AppleAdapter",
    contact: {
      phone: "1-800-MY-APPLE",
      scheduleUrl: "/servicios/agendamiento",
    },
  },

  default: {
    id: "default",
    name: "Asistente General",
    industry: "general",
    branding: {
      primaryColor: "#667eea",
      secondaryColor: "#764ba2",
      companyName: "Video Diagnóstico",
    },
    ui: {
      welcomeMessage:
        "¡Hola! Soy tu asistente. Cuéntame en qué puedo ayudarte.",
      instructionsForElderly: [
        "1. Muestra lo que necesitas ayuda",
        "2. Cuéntame el problema",
        "3. Te ayudaré a resolverlo",
      ],
      fontSize: "large",
      highContrast: false,
    },
    adapterType: "GeneralAdapter",
  },
};

/**
 * Obtiene configuración según parámetro de URL o empresa
 */
export function getCompanyConfig(companyId?: string): CompanyConfig {
  if (!companyId) {
    return COMPANY_CONFIGS["default"];
  }

  return COMPANY_CONFIGS[companyId.toLowerCase()] || COMPANY_CONFIGS["default"];
}
