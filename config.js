/*
 * Configuração PÚBLICA (versionada).
 *
 * NÃO coloque segredos aqui — este arquivo vai para o repositório.
 * Use apenas valores que podem ser públicos, como o Client ID do Google
 * (que não é segredo: todo site com login Google expõe o dele).
 *
 * Valores locais/secreta podem sobrescrever estes em "config.local.js".
 */
window.RH_CONFIG = Object.assign({}, window.RH_CONFIG, {
  // Client ID do Google OAuth (tipo "Aplicativo da Web").
  googleClientId: "367687879133-t5cp1h2pgq64qqglv1405bpr3g1ikdcr.apps.googleusercontent.com",

  // E-mails do Google que entram como administrador (proprietários).
  googleAdminEmails: [
    "imc.sidnei@gmail.com",
    "sidnei@policiapenal.pr.gov.br"
  ],

  // Configuracao do Firebase (Console > Configuracoes do projeto > Seus apps > Web).
  // Enquanto estiver null, o app usa apenas o armazenamento local do navegador.
  firebase: {
    apiKey: "AIzaSyAETanh8tzlMUA3yDV-ZrEH-KTkn4cecYo",
    authDomain: "rhr6-5b275.firebaseapp.com",
    projectId: "rhr6-5b275",
    storageBucket: "rhr6-5b275.firebasestorage.app",
    messagingSenderId: "1042158027390",
    appId: "1:1042158027390:web:f8d88c64722178d9704e2f",
    measurementId: "G-VDC22YZ20F"
  }

  // A senha inicial do administrador NÃO fica aqui. Defina-a apenas em
  // "config.local.js" (que está no .gitignore).
});
