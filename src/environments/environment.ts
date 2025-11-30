export const environment = {
  production: true,
  version: "2025.11.29.3 - 29 de Noviembre 2025 (Beta)",
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
  urlPermitidas:
    "https://sellercenter.katuq.com, http://100.27.36.49:3300, http://localhost:4200",
  urlApi: "http://localhost:3300", // API Local - Backend Principal Katuq,
  //urlApi: "https://back.katuq.com",
  //urlApi: "https://us-central1-katuq-new.cloudfunctions.net/api", // API GCP

  // Agent Builder Backend (KAI) - A través del backend principal (proxy)
  agentBuilderApi: "http://localhost:3300", // REST API a través del backend principal
  agentBuilderWs: "ws://localhost:3892/ws", // WebSocket directo (no puede usar proxy HTTP)

  // ADK Backend directo (Python/Flask) - Para Chat Pro streaming
  adkBackendApi: "http://localhost:8080", // ADK Flask server directo

  wsVoiceServiceUrl: "wss://api.tuservidor.com/voice-websocket",
  voiceWsUrl: "wss://api.katuq.com/voice-websocket",
  wompi: {
    // Credenciales para pagos de pedidos normales
    prod_intrity: "test_integrity_gD6XzNRKmItupFPhyEj09rycF7orECGD",
    public_key_test: "pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy",
    public_key: "pub_prod_cN70rb6aXdHMiBWj9fwY26Xyh1Oz5PUf",
    event: "test_events_AaaZdg5VB8tngBhZkogbXmDpbT9nWMH5",
    redirectURL: "https://sellercenter.katuq.com/payment-callback",
    redirectURLTest: "http://localhost:4200/payment-callback",

    // Credenciales SANDBOX para suscripciones (desarrollo/pruebas)
    subscriptions_public_key: "pub_test_ar0LwbvdFVYNCSkEgK4KlteidqCTOiub",
    subscriptions_integrity: "test_integrity_LQdnpWwH116PRZZtzYThCGIe4qKvh16E",
  },
  useModelBig: false,
  geocoding: {
    openRouteService: {
      apiKey: "5b3ce3597851110001cf6248b2c4b1e9f8dd42fc8a1b4f7d1e2bb38c", // OpenRouteService API Key
      endpoint: "openroute-proxy",
    },
    googleMaps: {
      apiKey: "AIzaSyDskNnjpps_YO0ZU7kny5tzlkv28zdVq9I", // Google Maps API Key
      endpoint: "gmaps-proxy",
    },
  },
  // GEMINI_API_KEY is injected at runtime via window['GEMINI_API_KEY']
  GEMINI_API_KEY: "AIzaSyDKYiPW1w9TBrCzSgTtMs52jJna_LqCI2o_", //s(typeof window !== 'undefined' && window['GEMINI_API_KEY']) ? window['GEMINI_API_KEY'] : '',

  // 🎯 VIDEO AGENT CONFIGURATION
  videoAgent: {
    // DEMO MODE: Solo pide nombre, auto-agenda para mañana sin validaciones
    // PRODUCTION MODE: Validaciones completas, slots disponibles, confirmación por email
    mode: "DEMO" as "DEMO" | "PRODUCTION",

    // Auto-detect location in demo mode
    autoDetectLocation: true,

    // Default appointment settings (DEMO mode)
    defaultAppointment: {
      time: "10:00 - 12:00",
      daysAhead: 1, // Tomorrow
    },
  },
};
  