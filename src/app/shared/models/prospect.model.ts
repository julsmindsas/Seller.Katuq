export interface ProspectContactInfo {
  name: string;
  phone: string;
  whatsapp?: string;
  email: string;
}

export interface ProspectBasicInfo {
  city: string;
  employeeCount: number;
  website?: string;
  companyType: string;
  sector: string;
  // Propiedades adicionales
  leadSource?: string;
  budget?: string;
  interestedIn?: string;
}

export interface ProspectTimelineEvent {
  id: string;
  status: 'new' | 'contacted' | 'meeting-scheduled' | 'demo-completed' | 'started' | 'closed';
  date: Date;
  description: string;
  agentNote: string;
  // Campos adicionales para tareas
  isTask?: boolean;
  taskType?: string;
  dueDate?: string | Date;
  dueTime?: string;
  reminder?: boolean;
  completed?: boolean;
  notified?: boolean;
  overdueNotified?: boolean;
}

export interface Prospect {
  id: string;
  companyName: string;
  contactDate: Date;
  status: 'new' | 'contacted' | 'meeting-scheduled' | 'demo-completed' | 'started' | 'closed';
  contactInfo: ProspectContactInfo;
  basicInfo: ProspectBasicInfo;
  timeline: ProspectTimelineEvent[];
  // Propiedades adicionales
  priority?: string;
}

// Datos de ejemplo para la API
export const PROSPECT_JSON_EXAMPLE = {
  "prospect": {
    "id": "1",
    "companyName": "Celuespecia",
    "contactDate": "2023-02-12T00:00:00.000Z",
    "status": "new",
    "priority": "Alta",
    "contactInfo": {
      "name": "Jeider Torres",
      "phone": "+573206100323",
      "whatsapp": "+573206100323",
      "email": "celuespecialcom@gmail.com"
    },
    "basicInfo": {
      "city": "Barranquilla",
      "employeeCount": 10,
      "website": "celuespecial.com",
      "companyType": "Retail",
      "sector": "Tecnología",
      "leadSource": "Sitio Web",
      "budget": "$5M - $10M",
      "interestedIn": "Punto de Venta"
    },
    "timeline": [
      {
        "id": "101",
        "status": "new",
        "date": "2023-02-12T00:00:00.000Z",
        "description": "Nuevo prospecto desde la web",
        "agentNote": "Cliente interesado, no dejes pasar la oportunidad y contáctalo ahora."
      }
    ]
  }
};