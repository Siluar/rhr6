/*
 * Modelo de configuração local.
 *
 * Copie este arquivo para "config.local.js" e preencha os valores abaixo.
 * O arquivo "config.local.js" está no .gitignore e NÃO deve ser enviado ao
 * repositório (contém segredos).
 */
window.RH_CONFIG = {
  // Senha inicial do administrador (usuário "centralrh"):
  initialAdminPassword: "defina-uma-senha-forte",

  // Client ID do Google OAuth (tipo "Aplicativo da Web").
  // Sem ele, o botão "Entrar com Google" não aparece.
  googleClientId: "SEU-CLIENT-ID.apps.googleusercontent.com",

  // E-mails do Google que devem entrar como administrador.
  // Qualquer outro e-mail verificado entra como usuário comum.
  googleAdminEmails: ["imc.sidnei@gmail.com"]
};
