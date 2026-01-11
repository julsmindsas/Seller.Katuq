export const environment = {
  production: true,
  version: "2026.01.11.3 - 11 de Enero 2026 (Beta)",
  firebase: {
    apiKey: "AIzaSyAmAnBBefe_f6rwSLIUK0e1JexuDGP2w_4",
    authDomain: "julsmind-katuq.firebaseapp.com",
    databaseURL: "https://julsmind-katuq-default-rtdb.firebaseio.com",
    projectId: "julsmind-katuq",
    storageBucket: "julsmind-katuq.appspot.com",
    messagingSenderId: "262274219539",
    appId: "1:262274219539:web:bd63a33f16779c7d4689e6",
    measurementId: "G-LFYSZ78R7F",
  },
  urlPermitidas: "https://sellercenter.katuq.com",
  // urlApi: 'http://127.0.0.1:5001/julsmind-katuq/us-central1/api',
  // urlApi: 'https://api-shwp4sc4vq-uc.a.run.app', // API Google Cloud Functions
  urlApi2: "https://api.katuq.com", // API AWS laighsail,
  urlApi: "https://back.katuq.com", // API AWS EC2,

  // Agent Builder Backend (KAI)
  agentBuilderApi: "https://back.katuq.com", // REST API a través del backend principal
  agentBuilderWs: "wss://back.katuq.com/ws", // WebSocket
  adkBackendApi: "https://back.katuq.com/adk", // ADK via nginx proxy
  kaiBackendUrl: "https://kai-video-agent-295918419655.us-central1.run.app", // KAI Cloud Run
  kaiBackendWs: "wss://kai-video-agent-295918419655.us-central1.run.app", // KAI WebSocket Cloud Run
  wsVoiceServiceUrl: "wss://api.tuservidor.com/voice-websocket",
  voiceWsUrl: "wss://tu-servidor-ejemplo.com",
  wompi: {
    // Credenciales para pagos de pedidos normales
    prod_intrity: "test_integrity_gD6XzNRKmItupFPhyEj09rycF7orECGD",
    public_key_test: "pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy",
    public_key: "pub_prod_cN70rb6aXdHMiBWj9fwY26Xyh1Oz5PUf",
    event: "test_events_AaaZdg5VB8tngBhZkogbXmDpbT9nWMH5",
    redirectURL: "https://sellercenter.katuq.com/payment-callback",
    redirectURLTest: "http://localhost:4200/payment-callback",

    // Credenciales PRODUCCIÓN para suscripciones (Premium/Freemium)
    subscriptions_public_key: "pub_prod_icTT5EBXwo2EoRZX0lLMlLd1EZtdYV1a",
    subscriptions_integrity: "prod_integrity_MsZnM6nMy3gPVAcMOC23LAuVeWT3rHqc",
  },
  useModelBig: false,
  geocoding: {
    openRouteService: {
      apiKey: "AIzaSyDskNnjpps_YO0ZU7kny5tzlkv28zdVq9I",
      endpoint: "openroute-proxy",
    },
    googleMaps: {
      apiKey: "AIzaSyDskNnjpps_YO0ZU7kny5tzlkv28zdVq9I",
      endpoint: "gmaps-proxy",
    },
  },
  GEMINI_API_KEY: "AIzaSyDKYiPW1w9TBrCzSgTtMs52jJna_LqCI2o_",

  // 🎯 VIDEO AGENT CONFIGURATION
  videoAgent: {
    // DEMO MODE: Solo pide nombre, auto-agenda para mañana sin validaciones
    // PRODUCTION MODE: Validaciones completas, slots disponibles, confirmación por email
    mode: "PRODUCTION" as "DEMO" | "PRODUCTION",

    // Auto-detect location in demo mode
    autoDetectLocation: false,

    // Default appointment settings (DEMO mode)
    defaultAppointment: {
      time: "10:00 - 12:00",
      daysAhead: 1, // Tomorrow
    },
  },
};
