// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.


export const environment = {
  production: true,
  version: "2025.05.02.1 - 2 de Mayo 2025 (Beta)",
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
  // urlApi: 'http://127.0.0.1:5001/julsmind-katuq/us-central1/api',
  // urlApi: "http://localhost:3400", // API Local,
  // urlApi: 'https://api-shwp4sc4vq-uc.a.run.app',
  urlApi: "http://localhost:3300", // API Local,
  //   // urlApi: 'https://api-shwp4sc4vq-uc.a.run.app',
  //  urlApi: "https://api.katuq.com", // API AWS
  wompi: {
    prod_intrity: "test_integrity_gD6XzNRKmItupFPhyEj09rycF7orECGD",
    public_key_test: "pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy",
    public_key: "pub_prod_cN70rb6aXdHMiBWj9fwY26Xyh1Oz5PUf",
    event: "test_events_AaaZdg5VB8tngBhZkogbXmDpbT9nWMH5",
    redirectURL: "https://sellercenter.katuq.com/payment-callback",
    redirectURLTest: "http://localhost:4200/payment-callback",
  },
  // Agregar la URL del servicio WebSocket de voz
  wsVoiceServiceUrl: 'ws://localhost:3300/voice-websocket',
  voiceWsUrl: 'wss://tu-servidor-ejemplo.com', // Ajustar según corresponda
  integrations: {
    shopify: {
      apiKey: '',
      secret: ''
    },
    wompi: {
      publicKey: '',
      privateKey: ''
    },
    epayco: {
      apiKey: '',
      privateKey: ''
    },
    paypal: {
      clientId: '',
      clientSecret: ''
    }
  },
  useModelBig: false
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
