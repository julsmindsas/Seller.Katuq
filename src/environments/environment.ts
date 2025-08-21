export const environment = {
  production: true,
  version: "2025.08.20.2 - 20 de Agosto 2025 (Beta)",
  firebase: {
    apiKey: "AIzaSyAmAnBBefe_f6rwSLIUK0e1JexuDGP2w_4",
    authDomain: "julsmind-katuq.firebaseapp.com",
    projectId: "julsmind-katuq",
    storageBucket: "julsmind-katuq.appspot.com",
    messagingSenderId: "262274219539",
    appId: "1:262274219539:web:bd63a33f16779c7d4689e6",
    measurementId: "G-LFYSZ78R7F",
  },
  urlPermitidas:
    "https://sellercenter.katuq.com, http://100.27.36.49:3300, http://localhost:4200",
  urlApi: "http://localhost:3300", // API Local,
  //urlApi: "https://api.katuq.com", // API AWS
  wsVoiceServiceUrl: "wss://api.tuservidor.com/voice-websocket",
  voiceWsUrl: "wss://api.katuq.com/voice-websocket",
  wompi: {
    prod_intrity: "test_integrity_gD6XzNRKmItupFPhyEj09rycF7orECGD",
    public_key_test: "pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy",
    public_key: "pub_prod_cN70rb6aXdHMiBWj9fwY26Xyh1Oz5PUf",
    event: "test_events_AaaZdg5VB8tngBhZkogbXmDpbT9nWMH5",
    redirectURL: "https://sellercenter.katuq.com/payment-callback",
    redirectURLTest: "http://localhost:4200/payment-callback",
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
  // GEMINI_API_KEY is injected at runtime via window['GEMINI_API_KEY']
  GEMINI_API_KEY: "AIzaSyAHT5s0bFQBG5a_vJGQWjC5OUIw0ZQPy_U", //s(typeof window !== 'undefined' && window['GEMINI_API_KEY']) ? window['GEMINI_API_KEY'] : '',
};
