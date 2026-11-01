// Ambiente local (localhost ou arquivo aberto direto do disco) = emuladores do Firebase
// com dados fictícios. Nesse caso o projeto usado é "demo-rafatournament": um projeto
// "demo-" não existe na nuvem, então mesmo que o emulador não esteja rodando nenhuma
// leitura ou escrita consegue chegar ao banco real do clube.
var AMBIENTE_TESTE = window.location.protocol === 'file:' ||
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

var config = AMBIENTE_TESTE ? {
  apiKey: "demo-api-key",
  authDomain: "demo-rafatournament.firebaseapp.com",
  projectId: "demo-rafatournament",
  appId: "demo-app"
} : {
  apiKey: "AIzaSyB02lwacq3W4GqqZ3AaMb_kSQZy_3veTqk",
  authDomain: "rafatournament.firebaseapp.com",
  projectId: "rafatournament",
  storageBucket: "rafatournament.firebasestorage.app",
  messagingSenderId: "104378685561",
  appId: "1:104378685561:web:2484c632c02e50991b9ca8"
};
// Initialize Firebase
firebase.initializeApp(config);

if (AMBIENTE_TESTE) {
  if (firebase.firestore) firebase.firestore().useEmulator('127.0.0.1', 8080);
  if (firebase.auth) firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
}
