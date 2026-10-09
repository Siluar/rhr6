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

  // E-mails do Google que entram como administrador.
  googleAdminEmails: ["imc.sidnei@gmail.com"]

  // A senha inicial do administrador NÃO fica aqui. Defina-a apenas em
  // "config.local.js" (que está no .gitignore).
});
