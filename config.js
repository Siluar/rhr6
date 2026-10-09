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
  // Exemplo:
  // firebase: {
  //   apiKey: "...",
  //   authDomain: "rhr6-xxxx.firebaseapp.com",
  //   projectId: "rhr6-xxxx",
  //   storageBucket: "rhr6-xxxx.appspot.com",
  //   messagingSenderId: "...",
  //   appId: "..."
  // }
  firebase: null

  // A senha inicial do administrador NÃO fica aqui. Defina-a apenas em
  // "config.local.js" (que está no .gitignore).
});
