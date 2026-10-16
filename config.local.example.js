/*
 * Modelo de configuração local.
 *
 * ATENÇÃO: as páginas NÃO carregam mais "config.local.js" (arquivo não
 * versionado, que gerava 404 no site publicado). Este modelo fica apenas como
 * referência histórica.
 *
 * O login administrativo é feito exclusivamente pelo Google (veja
 * `googleAdminEmails` em config.js); não há mais senha padrão de administrador.
 */
window.RH_CONFIG = Object.assign({}, window.RH_CONFIG, {
  // Opcional: sobrescrever valores públicos (normalmente definidos em config.js)
  // googleClientId: "SEU-CLIENT-ID.apps.googleusercontent.com",
  // googleAdminEmails: ["voce@exemplo.com"]
});
