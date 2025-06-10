export const environment = {
  production: true,
  version: "2025.06.09.1 - 9 de Junio 2025 (Beta)",
  firebase: {
    apiKey: "AIzaSyAmAnBBefe_f6rwSLIUK0e1JexuDGP2w_4",
    authDomain: "julsmind-katuq.firebaseapp.com",
    projectId: "julsmind-katuq",
    storageBucket: "julsmind-katuq.appspot.com",
    messagingSenderId: "262274219539",
    appId: "1:262274219539:web:bd63a33f16779c7d4689e6",
    measurementId: "G-LFYSZ78R7F"
  },
  urlPermitidas: 'https://sellercenter.katuq.com',
  // urlApi: 'http://127.0.0.1:5001/julsmind-katuq/us-central1/api',
  // urlApi: 'https://api-shwp4sc4vq-uc.a.run.app', // API Google Cloud Functions
  urlApi: 'https://api.katuq.com', // API AWS
  wsVoiceServiceUrl: 'wss://api.tuservidor.com/voice-websocket',
  voiceWsUrl: 'wss://tu-servidor-ejemplo.com',
  wompi: {
    prod_intrity: 'test_integrity_gD6XzNRKmItupFPhyEj09rycF7orECGD',
    public_key_test: 'pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy',
    public_key: 'pub_prod_cN70rb6aXdHMiBWj9fwY26Xyh1Oz5PUf',
    event: 'test_events_AaaZdg5VB8tngBhZkogbXmDpbT9nWMH5',
    redirectURL: 'https://sellercenter.katuq.com/payment-callback',
    redirectURLTest: 'http://localhost:4200/payment-callback',
  },
  useModelBig: false,
};
