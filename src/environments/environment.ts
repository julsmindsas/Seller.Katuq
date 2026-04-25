// Entorno de desarrollo local
// Para apuntar a producción cambiar `urlApi` a https://back.katuq.com

export const environment = {
  production: false,
  version: "2026.04.22.1 - 22 de Abril 2026 (Beta)",

  // Backend Express (Lightsail / local)
  urlApi: 'http://localhost:3300',
  urlApi2: 'http://localhost:3300',
  apiUrl: 'http://localhost:3300',

  // KAI Genkit backend
  kaiBackendUrl: 'http://localhost:3890',
  kaiBackendWs: 'ws://localhost:3892',

  // ADK Python/Flask
  adkBackendApi: 'http://localhost:8080',

  // Agent Builder (ADK AG-UI)
  agentBuilderApi: 'http://localhost:8080',
  agentBuilderWs: 'ws://localhost:8080',

  // Voice/video agent
  voiceWsUrl: 'ws://localhost:3892',
  wsVoiceServiceUrl: 'ws://localhost:3892',

  // Firebase (cuenta nueva katuq-new)
  firebase: {
    apiKey: 'AIzaSyBahbMqiodjonKOLeAuLRzUGEV0sw4GUwc',
    authDomain: 'katuq-new.firebaseapp.com',
    databaseURL: 'https://katuq-new-default-rtdb.firebaseio.com',
    projectId: 'katuq-new',
    storageBucket: 'katuq-new.firebasestorage.app',
    messagingSenderId: '295918419655',
    appId: '1:295918419655:web:35ac55904bbad705a348e2',
    measurementId: 'G-K2C9EF97ML'
  },

  // API keys de terceros — reemplazar con las nuevas claves de la cuenta limpia
  GEMINI_API_KEY: '',
  googleMapsApiKey: '',
  geocoding: {
    apiKey: '',
    googleMaps: {
      apiKey: '',
      endpoint: 'gmaps-proxy'
    },
    geoBlr: {
      apiKey: '',
      origin: 'http://localhost:4200',
      baseUrl: '',
      endpoint: ''
    },
    openRouteService: {
      apiKey: '',
      endpoint: 'openroute-proxy'
    }
  },

  // Wompi / pagos — claves vacías para dev local; llenar con test keys cuando se pruebe checkout
  wompi: {
    public_key: '',
    publicKey: '',
    public_key_test: '',
    prod_intrity: '',
    integrityKey: '',
    event: '',
    redirectURL: 'http://localhost:4200/payment-callback',
    redirectURLTest: 'http://localhost:4200/payment-callback',
    subscriptions_public_key: '',
    subscriptions_integrity: ''
  },

  // Video Agent (config legacy — mantener para compatibilidad)
  videoAgent: {
    mode: 'DEMO' as 'DEMO' | 'PRODUCTION',
    autoDetectLocation: true,
    defaultAppointment: {
      time: '10:00 - 12:00',
      daysAhead: 1
    }
  },

  // Flags varios
  useModelBig: false,
  user: 'katuq_user',

  // CORS — string simple (el interceptor lo usa como header Access-Control-Allow-Origin)
  urlPermitidas: 'http://localhost:4200'
};
